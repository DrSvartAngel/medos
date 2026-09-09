// MedOS — Phase 12.9: Retrieval Service (Lexical + Semantic Hybrid)
// Structured, provider-neutral retrieval over the Phase 12.5 chunk index and Phase 12.9 vector store.
//
// Responsibilities:
//  - Accept a RetrievalQuery with optional hierarchical scope
//  - Delegate lexical search to sourceChunkRepo.search() (FTS5 → term index → list fallback)
//  - Delegate semantic search to chunkEmbeddingRepo.searchNearest()
//  - Deterministically merge candidates via hybridRanker
//  - Safe fallback: if vector retrieval fails or is unavailable, continue with lexical results
//  - Return a complete RetrievalResponse with diagnostics (usedFts, usedTermIndex, usedVector)
//
// Boundaries:
//  - ZERO external network calls inside synchronous retrieve()
//  - ZERO direct Gemini/OpenAI SDK imports
//  - ZERO final answer generation
//  - ZERO writes to any SQLite table (no write ops in this file)
//  - Schema v13 unchanged

import type {
  RetrievalError as _RetrievalError,
  RetrievalQuery,
  RetrievalResponse,
  RetrievalResult,
  RetrievalScope,
} from '@/models/retrieval';
import {
  RETRIEVAL_DEFAULT_TOP_K,
  RETRIEVAL_MAX_TOP_K,
  RETRIEVAL_MIN_TOP_K,
  RetrievalError,
} from '@/models/retrieval';
import type { ChunkSearchOptions, ChunkSearchResult } from '@/models/chunk';
import type { VectorSearchResult } from '@/models/embedding';
import { sourceChunkRepo } from '@/db/repositories/sourceChunkRepo';
import { chunkEmbeddingRepo } from '@/db/repositories/chunkEmbeddingRepo';
import { getActiveEmbeddingProvider } from '@/services/embedding/embeddingClient';
import { tokenizeQuery } from '@/services/chunking/termTokenizer';
import { rankHybrid } from './hybridRanker';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clampTopK(topK: number | undefined): number {
  if (topK === undefined || topK === null) return RETRIEVAL_DEFAULT_TOP_K;
  if (topK < RETRIEVAL_MIN_TOP_K) return RETRIEVAL_MIN_TOP_K;
  if (topK > RETRIEVAL_MAX_TOP_K) return RETRIEVAL_MAX_TOP_K;
  return Math.floor(topK);
}

function buildSearchOptions(query: RetrievalQuery, effectiveTopK: number): ChunkSearchOptions {
  const scope = query.scope ?? {};
  return {
    query: (query.query ?? '').trim(),
    topicId: scope.topicId,
    sourceId: scope.sourceId,
    chunkType: query.chunkType,
    extractionMethod: query.extractionMethod,
    limit: effectiveTopK,
  };
}

function mapToRetrievalResult(r: ChunkSearchResult): RetrievalResult {
  return {
    chunkId: r.chunk.id,
    text: r.chunk.text,
    chunkType: r.chunk.chunkType,
    score: r.score ?? 0,
    matchTerms: r.matchTerms ?? [],
    provenance: r.provenance,
    ordinal: r.chunk.ordinal,
    lexicalScore: r.score ?? 0,
    retrievalMode: 'lexical',
  };
}

/**
 * Applies subject/committee scope filtering to results in-process.
 */
function applyHigherOrderScope(
  results: RetrievalResult[],
  scope: RetrievalScope,
  allowedTopicIds?: ReadonlySet<string>
): RetrievalResult[] {
  if (!allowedTopicIds || allowedTopicIds.size === 0) {
    return results;
  }
  return results.filter((r) => allowedTopicIds.has(r.provenance.topicId));
}

/**
 * Heuristically identifies which lexical search path was taken by sourceChunkRepo.search().
 */
function detectSearchBackend(results: ChunkSearchResult[]): { usedFts: boolean; usedTermIndex: boolean } {
  if (results.length === 0) return { usedFts: false, usedTermIndex: false };
  const firstMatchTerms = results[0].matchTerms ?? [];
  const firstScore = results[0].score ?? 0;

  if (firstMatchTerms.length === 0 && firstScore === 1) {
    return { usedFts: false, usedTermIndex: false };
  }
  const usedFts = firstScore > 0 && firstScore < 10;
  const usedTermIndex = firstScore >= 10;
  return { usedFts, usedTermIndex: usedTermIndex && !usedFts };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const retrievalService = {
  /**
   * Synchronously executes retrieval over the chunk index and vector store.
   * If synchronous vector embedding is available or query.vector is provided, performs hybrid retrieval.
   * Otherwise returns deterministic lexical results without failing.
   */
  retrieve(
    query: RetrievalQuery,
    allowedTopicIds?: ReadonlySet<string>
  ): RetrievalResponse {
    if (!query || typeof query !== 'object') {
      throw new RetrievalError('invalid_query', 'Query object is required');
    }

    const effectiveTopK = clampTopK(query.topK);
    const scope: RetrievalScope = query.scope ?? {};
    const minScore = query.minScore ?? 0;
    const mode = query.mode ?? 'hybrid';
    const trimmedQuery = (query.query ?? '').trim();

    // 1. Lexical retrieval
    let rawResults: ChunkSearchResult[] = [];
    if (mode !== 'semantic') {
      const searchOptions = buildSearchOptions(query, effectiveTopK);
      try {
        rawResults = sourceChunkRepo.search(searchOptions);
      } catch {
        rawResults = [];
      }
    }

    let lexicalResults: RetrievalResult[] = rawResults.map(mapToRetrievalResult);

    if (allowedTopicIds && allowedTopicIds.size > 0) {
      lexicalResults = applyHigherOrderScope(lexicalResults, scope, allowedTopicIds);
    }

    const queryTerms = tokenizeQuery(trimmedQuery);
    if (queryTerms.length > 0 && minScore > 0) {
      lexicalResults = lexicalResults.filter((r) => r.score >= minScore);
    }

    lexicalResults.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      const sourceComp = a.provenance.sourceId.localeCompare(b.provenance.sourceId);
      if (sourceComp !== 0) return sourceComp;
      return a.ordinal - b.ordinal;
    });

    const { usedFts, usedTermIndex } = detectSearchBackend(rawResults);

    // 2. Vector retrieval (synchronous attempt if query.vector or sync provider available)
    let usedVector = false;
    let vectorResults: VectorSearchResult[] = [];

    if (mode !== 'lexical' && trimmedQuery.length > 0) {
      try {
        let queryVec = query.vector;
        const provider = getActiveEmbeddingProvider();
        if (!queryVec && provider.embedTextSync) {
          const res = provider.embedTextSync(trimmedQuery);
          queryVec = res.vector;
        }

        if (queryVec && Array.isArray(queryVec) && queryVec.length > 0) {
          vectorResults = chunkEmbeddingRepo.searchNearest(queryVec, {
            scope,
            limit: effectiveTopK * 2,
            model: provider.defaultModel,
          });

          if (allowedTopicIds && allowedTopicIds.size > 0) {
            vectorResults = vectorResults.filter((v) => allowedTopicIds.has(v.provenance.topicId));
          }

          if (vectorResults.length > 0) {
            usedVector = true;
          }
        }
      } catch {
        // Safe fallback: never fail overall retrieval due to vector lookup error
        usedVector = false;
      }
    }

    // 3. Combine results
    let finalResults: RetrievalResult[];
    if (usedVector && mode !== 'lexical') {
      finalResults = rankHybrid(lexicalResults, vectorResults, {
        lexicalWeight: query.lexicalWeight,
        semanticWeight: query.semanticWeight,
        topK: effectiveTopK,
        mode,
      });
    } else {
      finalResults = lexicalResults.slice(0, effectiveTopK);
    }

    if (scope.topicId) {
      finalResults = finalResults.filter((r) => r.provenance.topicId === scope.topicId);
    }
    if (scope.sourceId) {
      finalResults = finalResults.filter((r) => r.provenance.sourceId === scope.sourceId);
    }

    const vectorStatus = chunkEmbeddingRepo.getIndexStatus(scope).status;

    return {
      results: finalResults,
      total: finalResults.length,
      queryTerms,
      scope,
      usedFts,
      usedTermIndex,
      usedVector,
      vectorStatus,
    };
  },

  /**
   * Asynchronously executes retrieval, awaiting query embedding generation if required.
   * Full hybrid ranking pipeline with graceful lexical fallback.
   */
  async retrieveAsync(
    query: RetrievalQuery,
    allowedTopicIds?: ReadonlySet<string>
  ): Promise<RetrievalResponse> {
    if (!query || typeof query !== 'object') {
      throw new RetrievalError('invalid_query', 'Query object is required');
    }

    const effectiveTopK = clampTopK(query.topK);
    const scope: RetrievalScope = query.scope ?? {};
    const minScore = query.minScore ?? 0;
    const mode = query.mode ?? 'hybrid';
    const trimmedQuery = (query.query ?? '').trim();

    // 1. Lexical retrieval
    let rawResults: ChunkSearchResult[] = [];
    if (mode !== 'semantic') {
      const searchOptions = buildSearchOptions(query, effectiveTopK);
      try {
        rawResults = sourceChunkRepo.search(searchOptions);
      } catch {
        rawResults = [];
      }
    }

    let lexicalResults: RetrievalResult[] = rawResults.map(mapToRetrievalResult);

    if (allowedTopicIds && allowedTopicIds.size > 0) {
      lexicalResults = applyHigherOrderScope(lexicalResults, scope, allowedTopicIds);
    }

    const queryTerms = tokenizeQuery(trimmedQuery);
    if (queryTerms.length > 0 && minScore > 0) {
      lexicalResults = lexicalResults.filter((r) => r.score >= minScore);
    }

    lexicalResults.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      const sourceComp = a.provenance.sourceId.localeCompare(b.provenance.sourceId);
      if (sourceComp !== 0) return sourceComp;
      return a.ordinal - b.ordinal;
    });

    const { usedFts, usedTermIndex } = detectSearchBackend(rawResults);

    // 2. Vector retrieval (asynchronous)
    let usedVector = false;
    let vectorResults: VectorSearchResult[] = [];

    if (mode !== 'lexical' && trimmedQuery.length > 0) {
      try {
        let queryVec = query.vector;
        const provider = getActiveEmbeddingProvider();
        if (!queryVec) {
          const res = await provider.embedText(trimmedQuery);
          queryVec = res.vector;
        }

        if (queryVec && Array.isArray(queryVec) && queryVec.length > 0) {
          vectorResults = chunkEmbeddingRepo.searchNearest(queryVec, {
            scope,
            limit: effectiveTopK * 2,
            model: provider.defaultModel,
          });

          if (allowedTopicIds && allowedTopicIds.size > 0) {
            vectorResults = vectorResults.filter((v) => allowedTopicIds.has(v.provenance.topicId));
          }

          if (vectorResults.length > 0) {
            usedVector = true;
          }
        }
      } catch {
        // Safe fallback: never fail overall retrieval due to vector lookup error
        usedVector = false;
      }
    }

    // 3. Combine results
    let finalResults: RetrievalResult[];
    if (usedVector && mode !== 'lexical') {
      finalResults = rankHybrid(lexicalResults, vectorResults, {
        lexicalWeight: query.lexicalWeight,
        semanticWeight: query.semanticWeight,
        topK: effectiveTopK,
        mode,
      });
    } else {
      finalResults = lexicalResults.slice(0, effectiveTopK);
    }

    if (scope.topicId) {
      finalResults = finalResults.filter((r) => r.provenance.topicId === scope.topicId);
    }
    if (scope.sourceId) {
      finalResults = finalResults.filter((r) => r.provenance.sourceId === scope.sourceId);
    }

    const vectorStatus = chunkEmbeddingRepo.getIndexStatus(scope).status;

    return {
      results: finalResults,
      total: finalResults.length,
      queryTerms,
      scope,
      usedFts,
      usedTermIndex,
      usedVector,
      vectorStatus,
    };
  },

  /**
   * Retrieves chunks for a specific topic without a text query (listing mode).
   */
  listByTopic(topicId: string, limit?: number): RetrievalResponse {
    if (!topicId || !topicId.trim()) {
      throw new RetrievalError('invalid_query', 'topicId is required for listByTopic');
    }
    return this.retrieve({
      query: '',
      scope: { topicId: topicId.trim() },
      topK: limit,
      mode: 'lexical',
    });
  },

  /**
   * Retrieves chunks for a specific source without a text query (listing mode).
   */
  listBySource(sourceId: string, limit?: number): RetrievalResponse {
    if (!sourceId || !sourceId.trim()) {
      throw new RetrievalError('invalid_query', 'sourceId is required for listBySource');
    }
    return this.retrieve({
      query: '',
      scope: { sourceId: sourceId.trim() },
      topK: limit,
      mode: 'lexical',
    });
  },

  /**
   * Full-text / hybrid search within a single topic scope.
   */
  searchInTopic(topicId: string, queryText: string, topK?: number): RetrievalResponse {
    if (!topicId || !topicId.trim()) {
      throw new RetrievalError('invalid_query', 'topicId is required for searchInTopic');
    }
    return this.retrieve({
      query: queryText,
      scope: { topicId: topicId.trim() },
      topK,
    });
  },

  /**
   * Full-text / hybrid search within a single source scope.
   */
  searchInSource(sourceId: string, queryText: string, topK?: number): RetrievalResponse {
    if (!sourceId || !sourceId.trim()) {
      throw new RetrievalError('invalid_query', 'sourceId is required for searchInSource');
    }
    return this.retrieve({
      query: queryText,
      scope: { sourceId: sourceId.trim() },
      topK,
    });
  },
};
