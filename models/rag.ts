// MedOS — Phase 12.7: RAG Answer Generation Domain Models
// Provider-neutral contracts for grounded answer generation over Phase 12.6 retrieval results.
// Zero provider SDK types exposed to consumers.

import type { RetrievalResult, RetrievalScope } from './retrieval';
import type { AIProviderId } from './ai';

// ---------------------------------------------------------------------------
// Citation / Source Reference
// ---------------------------------------------------------------------------

/**
 * Machine-usable citation reference mapping an answer claim back to an actual
 * retrieved chunk.  Never fabricated — only chunks that were part of the retrieval
 * result set can produce a citation.
 */
export interface RagCitation {
  /** Unique identifier of the source chunk this citation refers to. */
  chunkId: string;
  /** The StudySource this chunk belongs to. */
  sourceId: string;
  /** Human-readable display name of the source (never truncated for UI use). */
  sourceTitle: string;
  /** Page number when available in the chunk's provenance metadata. */
  pageNumber?: number;
  /** Slide number when available. */
  slideNumber?: number;
  /** Section or heading title when available. */
  sectionTitle?: string;
  /** Zero-based ordinal position of the chunk within its source. */
  chunkOrdinal: number;
  /** Short excerpt (first 200 chars) of the chunk text, for reference display. */
  excerpt: string;
}

// ---------------------------------------------------------------------------
// RAG Answer State
// ---------------------------------------------------------------------------

/**
 * Evidence state of the generated answer.
 * - 'supported': answer is grounded in retrieved chunks.
 * - 'partial': answer is grounded but evidence is limited or incomplete.
 * - 'insufficient': retrieval returned no usable evidence; AI was not called.
 */
export type RagEvidenceState = 'supported' | 'partial' | 'insufficient';

// ---------------------------------------------------------------------------
// RAG Request
// ---------------------------------------------------------------------------

/**
 * User-facing request to the RAG Answer Service.
 */
export interface RagAnswerRequest {
  /** Natural language question from the user. */
  query: string;
  /** Retrieval scope: limits which chunks are eligible (topic, source, etc.). */
  scope?: RetrievalScope;
  /**
   * Maximum number of chunks to retrieve and include in the grounding context.
   * Clamped to 1–20 (default 8). Larger values increase context but also cost.
   */
  topK?: number;
  /**
   * Optional BCP-47 language tag for the desired answer language.
   * When provided, the model is instructed to answer in that language.
   * Supported: 'tr', 'en'. When absent, language follows query heuristic.
   */
  answerLanguage?: 'tr' | 'en';
}

// ---------------------------------------------------------------------------
// RAG Answer
// ---------------------------------------------------------------------------

/**
 * Structured grounded answer returned by the RAG Answer Service.
 * Never exposes raw provider SDK response objects.
 */
export interface RagAnswer {
  /** The generated answer text. */
  answerText: string;
  /**
   * Evidence state of the answer.  Consumers must check this before treating
   * answerText as factual.
   */
  evidenceState: RagEvidenceState;
  /**
   * Citations mapping answer claims back to actual retrieved chunks.
   * Empty when evidenceState is 'insufficient'.
   */
  citations: RagCitation[];
  /**
   * The retrieval results that were used to build the grounding context.
   * Provided for debugging / transparency; do not display raw to users.
   */
  retrievedChunks: RetrievalResult[];
  /**
   * Number of chunks included in the grounding context sent to the provider.
   * May be less than topK if fewer chunks were available.
   */
  contextChunkCount: number;
  /** AI provider that generated the answer. */
  providerId: AIProviderId;
  /**
   * Model identifier reported by the provider or configured at call time.
   * May be undefined for mock providers.
   */
  modelId?: string;
  /**
   * Whether a real provider call was performed.
   * False when evidenceState is 'insufficient' and the call was skipped.
   */
  providerCallPerformed: boolean;
  /** Timestamp (ms since epoch) when the answer was generated. */
  generatedAt: number;
}

// ---------------------------------------------------------------------------
// RAG Error
// ---------------------------------------------------------------------------

export type RagErrorCode =
  | 'invalid_request'
  | 'retrieval_failed'
  | 'provider_failed'
  | 'insufficient_evidence'
  | 'malformed_response'
  | 'context_build_failed';

export class RagError extends Error {
  constructor(
    public readonly code: RagErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RagError';
  }
}

// ---------------------------------------------------------------------------
// Context constants
// ---------------------------------------------------------------------------

/** Default number of chunks to retrieve for grounding. */
export const RAG_DEFAULT_TOP_K = 8;
/** Maximum number of chunks allowed in a single RAG context. */
export const RAG_MAX_TOP_K = 20;
/** Minimum required. */
export const RAG_MIN_TOP_K = 1;
/** Hard character budget for the combined grounding context. */
export const RAG_MAX_CONTEXT_CHARS = 12000;
/** Minimum score a chunk must have to be included (when query has terms). */
export const RAG_MIN_CHUNK_SCORE = 0;
/** Maximum excerpt length included in a citation object. */
export const CITATION_MAX_EXCERPT_CHARS = 200;

// ---------------------------------------------------------------------------
// Insufficient evidence detection
// ---------------------------------------------------------------------------

/**
 * Minimum number of usable chunks required before calling the AI provider.
 * If fewer chunks pass filters, the service returns INSUFFICIENT_EVIDENCE.
 */
export const RAG_MIN_USABLE_CHUNKS = 1;
