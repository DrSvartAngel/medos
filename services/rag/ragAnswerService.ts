// MedOS — Phase 12.7: RAG Answer Service
// Orchestrates the full RAG pipeline:
//   RetrievalService → contextBuilder → ragPrompts → AIProvider → RagAnswer
//
// Responsibilities:
//  - Accept a RagAnswerRequest
//  - Delegate retrieval to retrievalService (Phase 12.6)
//  - Build bounded, injection-resistant grounding context
//  - Detect insufficient evidence and skip provider call when appropriate
//  - Call AI provider through the AIProvider interface (no SDK imports)
//  - Resolve citations from generated answer
//  - Return a structured RagAnswer
//
// Boundaries:
//  - ZERO direct Gemini/OpenAI SDK imports
//  - ZERO hardcoded credentials
//  - ZERO writes to any SQLite table
//  - Schema v13 unchanged

import type { AIProvider } from '@/models/ai';
import type { RetrievalResult, RetrievalScope } from '@/models/retrieval';
import type { RagAnswer, RagAnswerRequest } from '@/models/rag';
import {
  RAG_DEFAULT_TOP_K,
  RAG_MAX_TOP_K,
  RAG_MIN_TOP_K,
  RAG_MIN_USABLE_CHUNKS,
  RagError,
} from '@/models/rag';
import { retrievalService } from '@/services/retrieval/retrievalService';
import { buildGroundingContext, resolveCitations } from './contextBuilder';
import {
  buildInsufficientEvidenceText,
  buildRagSystemPrompt,
  buildRagUserPrompt,
} from './ragPrompts';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clampTopK(topK: number | undefined): number {
  if (topK === undefined || topK === null) return RAG_DEFAULT_TOP_K;
  if (topK < RAG_MIN_TOP_K) return RAG_MIN_TOP_K;
  if (topK > RAG_MAX_TOP_K) return RAG_MAX_TOP_K;
  return Math.floor(topK);
}

/**
 * Filters out chunks that have no usable text content.
 * Preserves retrieval rank order.
 */
function filterUsableChunks(results: RetrievalResult[]): RetrievalResult[] {
  return results.filter(
    (r) => typeof r.text === 'string' && r.text.trim().length > 0
  );
}

/**
 * Determines the answer language from the request or falls back to a
 * deterministic heuristic based on the query text.
 *
 * Heuristic: if the query contains Turkish-specific characters (ş, ğ, ı, ç, ö, ü),
 * default to Turkish; otherwise default to English.
 */
function resolveAnswerLanguage(request: { answerLanguage?: 'tr' | 'en'; query?: string; question?: string }): 'tr' | 'en' {
  if (request.answerLanguage === 'tr' || request.answerLanguage === 'en') {
    return request.answerLanguage;
  }
  const query = (request.query ?? request.question ?? '').toLowerCase();
  if (/[şğıçöü]/.test(query)) return 'tr';
  return 'en';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RagAnswerServiceDeps {
  /** AI provider instance to use for answer generation. */
  provider: AIProvider;
  /**
   * Optional model ID to report in the answer.
   * Populated from the active provider config when available.
   */
  modelId?: string;
}

export type FlexibleRagRequest =
  | RagAnswerRequest
  | {
      query?: string;
      question?: string;
      scope?: RetrievalScope;
      topK?: number;
      answerLanguage?: 'tr' | 'en';
      deps?: RagAnswerServiceDeps;
    };

export const ragAnswerService = {
  /**
   * Generates a grounded RAG answer for a user query.
   *
   * Pipeline:
   *   1. Validate request
   *   2. Retrieve chunks via retrievalService
   *   3. Filter usable chunks
   *   4. If insufficient evidence → return without calling provider
   *   5. Build bounded grounding context
   *   6. Build system + user prompts
   *   7. Call AI provider via generateText
   *   8. Resolve citations from answer text
   *   9. Return structured RagAnswer
   *
   * @param request - Structured RAG request.
   * @param deps    - Provider and optional model ID.
   * @param allowedTopicIds - Optional set for committee/subject scope filtering.
   */
  async generate(
    request: FlexibleRagRequest,
    deps?: RagAnswerServiceDeps,
    allowedTopicIds?: ReadonlySet<string>
  ): Promise<RagAnswer> {
    // 1. Validate
    if (!request || typeof request !== 'object') {
      throw new RagError('invalid_request', 'RagAnswerRequest is required');
    }
    const rawReq = request as { question?: string; query?: string; deps?: RagAnswerServiceDeps };
    const queryText = (rawReq.query ?? rawReq.question ?? '').trim();
    if (!queryText) {
      throw new RagError('invalid_request', 'query is required and must not be empty');
    }
    const resolvedDeps = deps ?? rawReq.deps;
    if (!resolvedDeps || !resolvedDeps.provider) {
      throw new RagError('invalid_request', 'AIProvider is required');
    }

    const effectiveTopK = clampTopK(request.topK);
    const answerLanguage = resolveAnswerLanguage(request);

    // 2. Retrieve chunks (hybrid retrieval when async retrieval is available)
    let retrievalResults: RetrievalResult[];
    try {
      const retrievalResp = await (retrievalService.retrieveAsync
        ? retrievalService.retrieveAsync(
            {
              query: queryText,
              scope: request.scope,
              topK: effectiveTopK,
            },
            allowedTopicIds
          )
        : Promise.resolve(
            retrievalService.retrieve(
              {
                query: queryText,
                scope: request.scope,
                topK: effectiveTopK,
              },
              allowedTopicIds
            )
          ));
      retrievalResults = retrievalResp.results;
    } catch (err) {
      throw new RagError(
        'retrieval_failed',
        `Retrieval failed: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }

    // 3. Filter unusable chunks
    const usableChunks = filterUsableChunks(retrievalResults);

    // 4. Insufficient evidence guard
    if (usableChunks.length < RAG_MIN_USABLE_CHUNKS) {
      return {
        answerText: buildInsufficientEvidenceText(answerLanguage),
        evidenceState: 'insufficient',
        citations: [],
        retrievedChunks: retrievalResults,
        contextChunkCount: 0,
        providerId: resolvedDeps.provider.id,
        modelId: resolvedDeps.modelId,
        providerCallPerformed: false,
        generatedAt: Date.now(),
      };
    }

    // 5. Build grounding context
    let builtContext;
    try {
      builtContext = buildGroundingContext(usableChunks);
    } catch (err) {
      throw new RagError(
        'context_build_failed',
        `Context builder failed: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }

    // If context builder produced nothing (edge case), return insufficient
    if (builtContext.includedCount === 0) {
      return {
        answerText: buildInsufficientEvidenceText(answerLanguage),
        evidenceState: 'insufficient',
        citations: [],
        retrievedChunks: retrievalResults,
        contextChunkCount: 0,
        providerId: resolvedDeps.provider.id,
        modelId: resolvedDeps.modelId,
        providerCallPerformed: false,
        generatedAt: Date.now(),
      };
    }

    // 6. Build prompts
    const systemPrompt = buildRagSystemPrompt(answerLanguage);
    const userPrompt = buildRagUserPrompt(
      queryText,
      builtContext.contextText,
      answerLanguage
    );

    // 7. Call AI provider
    let answerText: string;
    try {
      const result = await resolvedDeps.provider.generateText({
        systemPrompt,
        userPrompt,
        options: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      });
      answerText = (result.text ?? '').trim();
    } catch (err) {
      throw new RagError(
        'provider_failed',
        `AI provider call failed: ${err instanceof Error ? err.message : 'unknown error'}`
      );
    }

    // 8. Validate answer text
    if (!answerText) {
      throw new RagError(
        'malformed_response',
        'AI provider returned an empty answer text.'
      );
    }

    // 9. Resolve citations
    const citations = resolveCitations(answerText, builtContext.citationMap);

    // 10. Determine evidence state
    const hasInsufficientMarker =
      answerText.toLowerCase().includes('does not contain sufficient information') ||
      answerText.toLowerCase().includes('yeterli bilgi içermiyor');

    let evidenceState: RagAnswer['evidenceState'];
    if (hasInsufficientMarker && citations.length === 0) {
      evidenceState = 'insufficient';
    } else if (citations.length === 0) {
      // Provider answered but cited nothing — partial at best
      evidenceState = 'partial';
    } else {
      evidenceState = 'supported';
    }

    return {
      answerText,
      evidenceState,
      citations,
      retrievedChunks: retrievalResults,
      contextChunkCount: builtContext.includedCount,
      providerId: resolvedDeps.provider.id,
      modelId: resolvedDeps.modelId,
      providerCallPerformed: true,
      generatedAt: Date.now(),
    };
  },

  /**
   * Alias for generate(), preserving API backwards compatibility.
   */
  async generateAnswer(
    request: RagAnswerRequest,
    deps: RagAnswerServiceDeps,
    allowedTopicIds?: ReadonlySet<string>
  ): Promise<RagAnswer> {
    return this.generate(request, deps, allowedTopicIds);
  },
};
