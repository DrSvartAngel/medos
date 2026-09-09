// MedOS — Phase 12.6: Retrieval Service
// Structured, provider-neutral retrieval over the Phase 12.5 chunk index.
//
// Responsibilities:
//  - Accept a RetrievalQuery with optional hierarchical scope
//  - Delegate to sourceChunkRepo.search() (FTS5 → term index → list fallback)
//  - Map raw ChunkSearchResult[] into ranked RetrievalResult[]
//  - Apply topK clamping, minScore filtering, and deterministic tie-breaking
//  - Return a complete RetrievalResponse with diagnostics
//
// Boundaries:
//  - ZERO external network calls
//  - ZERO Gemini/OpenAI SDK usage
//  - ZERO final answer generation
//  - ZERO writes to any SQLite table
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
import { sourceChunkRepo } from '@/db/repositories/sourceChunkRepo';
import { tokenizeQuery } from '@/services/chunking/termTokenizer';

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
  };
}

/**
 * Applies subject/committee scope filtering to results in-process.
 * sourceChunkRepo.search() natively filters by topicId and sourceId;
 * subjectId and committeeId are higher-order scopes resolved here by
 * matching chunk provenance against the caller-supplied topic set.
 *
 * If committeeId or subjectId is provided without a matching topicIds set,
 * they are treated as advisory (the caller should pre-resolve topic IDs).
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

// ---------------------------------------------------------------------------
// Diagnostic helpers — determine which backend was used
// ---------------------------------------------------------------------------

/**
 * Heuristically identifies which search path was taken by sourceChunkRepo.search().
 * FTS results use negative rank (closer to 0 = better); term-index results use
 * matched_terms_count * 10 + freq (always positive > 0 when terms match).
 * List-only results have score === 1 and empty matchTerms.
 */
function detectSearchBackend(results: ChunkSearchResult[]): { usedFts: boolean; usedTermIndex: boolean } {
  if (results.length === 0) return { usedFts: false, usedTermIndex: false };
  const firstMatchTerms = results[0].matchTerms ?? [];
  const firstScore = results[0].score ?? 0;

  // FTS path: score comes from SQLite rank (small negative or converted to abs)
  // Term-index path: score is matched_terms_count * 10 + freq (typically >= 10)
  // List path: score === 1 and matchTerms empty
  if (firstMatchTerms.length === 0 && firstScore === 1) {
    return { usedFts: false, usedTermIndex: false };
  }
  // FTS raw rank values after abs() tend to be fractional or small integers
  // Term index scores tend to be >= 10 (at least 1 term * 10)
  // We use a conservative threshold: if score >= 10 it's likely term-index
  const usedFts = firstScore > 0 && firstScore < 10;
  const usedTermIndex = firstScore >= 10;
  return { usedFts, usedTermIndex: usedTermIndex && !usedFts };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const retrievalService = {
  /**
   * Executes a structured retrieval query over the Phase 12.5 chunk index.
   *
   * Scope hierarchy (cumulative narrowing):
   *   committeeId → (caller resolves topicIds) → topicId → sourceId
   *
   * For topicId and sourceId scope, filtering is delegated to SQLite.
   * For committeeId/subjectId scope, pass the resolved `allowedTopicIds` set.
   *
   * @param query          - Structured retrieval query.
   * @param allowedTopicIds - Optional pre-resolved set of topic IDs for committee/subject scope.
   *                          When provided, results are filtered to these topics in-process.
   */
  retrieve(
    query: RetrievalQuery,
    allowedTopicIds?: ReadonlySet<string>
  ): RetrievalResponse {
    // Validate
    if (!query || typeof query !== 'object') {
      throw new RetrievalError('invalid_query', 'Query object is required');
    }

    const effectiveTopK = clampTopK(query.topK);
    const scope: RetrievalScope = query.scope ?? {};
    const minScore = query.minScore ?? 0;

    // Build and execute the low-level search
    const searchOptions = buildSearchOptions(query, effectiveTopK);

    let rawResults: ChunkSearchResult[];
    try {
      rawResults = sourceChunkRepo.search(searchOptions);
    } catch {
      rawResults = [];
    }

    // Map to domain results
    let results: RetrievalResult[] = rawResults.map(mapToRetrievalResult);

    // Apply higher-order scope (committee / subject) if allowedTopicIds provided
    if (allowedTopicIds && allowedTopicIds.size > 0) {
      results = applyHigherOrderScope(results, scope, allowedTopicIds);
    }

    // Apply minScore filter (only meaningful when query terms were provided)
    const queryTerms = tokenizeQuery((query.query ?? '').trim());
    if (queryTerms.length > 0 && minScore > 0) {
      results = results.filter((r) => r.score >= minScore);
    }

    // Deterministic secondary sort: ordinal ASC within equal-score groups
    // Primary sort (score DESC) is already guaranteed by sourceChunkRepo.search()
    results.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;
      // Tie-break: source order, then ordinal
      const sourceComp = a.provenance.sourceId.localeCompare(b.provenance.sourceId);
      if (sourceComp !== 0) return sourceComp;
      return a.ordinal - b.ordinal;
    });

    // Clamp to topK after scope filtering
    results = results.slice(0, effectiveTopK);

    // Diagnostics
    const { usedFts, usedTermIndex } = detectSearchBackend(rawResults);

    return {
      results,
      total: results.length,
      queryTerms,
      scope,
      usedFts,
      usedTermIndex,
    };
  },

  /**
   * Retrieves chunks for a specific topic without a text query (listing mode).
   * Results are ordered by source, then ordinal. Useful for browsing all
   * indexed content for a topic.
   */
  listByTopic(topicId: string, limit?: number): RetrievalResponse {
    if (!topicId || !topicId.trim()) {
      throw new RetrievalError('invalid_query', 'topicId is required for listByTopic');
    }
    return this.retrieve(
      {
        query: '',
        scope: { topicId: topicId.trim() },
        topK: limit,
      }
    );
  },

  /**
   * Retrieves chunks for a specific source without a text query (listing mode).
   * Results are ordered by ordinal.
   */
  listBySource(sourceId: string, limit?: number): RetrievalResponse {
    if (!sourceId || !sourceId.trim()) {
      throw new RetrievalError('invalid_query', 'sourceId is required for listBySource');
    }
    return this.retrieve(
      {
        query: '',
        scope: { sourceId: sourceId.trim() },
        topK: limit,
      }
    );
  },

  /**
   * Full-text search within a single topic scope.
   * Convenience wrapper for the most common retrieval pattern.
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
   * Full-text search within a single source scope.
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
