// MedOS — Phase 12.6: Retrieval Domain Models
// Provider-neutral contracts for query-driven chunk retrieval over the Phase 12.5 index.
// No AI/vendor types are exposed; all fields are plain domain values.

import type { ChunkType } from './chunk';
import type { ExtractionMethod, SourceProvenance } from './ingestion';

// ---------------------------------------------------------------------------
// Scope
// ---------------------------------------------------------------------------

/**
 * Hierarchical scope filter for retrieval.
 * Narrowing is cumulative: specifying topicId implies the topic's subject and committee.
 * All fields are optional; omitting all means corpus-wide retrieval.
 */
export interface RetrievalScope {
  /** Restricts results to chunks belonging to a specific Committee. */
  committeeId?: string;
  /** Restricts results to chunks belonging to a specific Subject. */
  subjectId?: string;
  /** Restricts results to chunks belonging to a specific Topic. */
  topicId?: string;
  /** Restricts results to chunks belonging to a specific StudySource. */
  sourceId?: string;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Structured retrieval request.
 * Only `query` is mandatory; all other fields narrow the search space.
 */
export interface RetrievalQuery {
  /** Natural language or keyword query string. May be empty for scope-only listing. */
  query: string;
  /** Hierarchical scope limiting which chunks are eligible. */
  scope?: RetrievalScope;
  /** Maximum number of results to return (1–50, default 10). */
  topK?: number;
  /** Restrict results to a specific chunk type (e.g. 'paragraph', 'slide'). */
  chunkType?: ChunkType;
  /** Restrict results to a specific extraction method (e.g. 'native', 'ocr', 'visual'). */
  extractionMethod?: ExtractionMethod;
  /** Minimum score threshold to include a result (default 0, i.e. include everything). */
  minScore?: number;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/**
 * A single ranked retrieval result.
 */
export interface RetrievalResult {
  /** Unique chunk identifier. */
  chunkId: string;
  /** Text content of the matched chunk. */
  text: string;
  /** Chunk type indicating the nature of the content. */
  chunkType: ChunkType;
  /** Relevance score. Higher is more relevant. Zero means unranked/list mode. */
  score: number;
  /** The query terms that matched inside this chunk. */
  matchTerms: string[];
  /** Full provenance for grounding and citation. */
  provenance: SourceProvenance;
  /** Zero-based ordinal position of the chunk within its source. */
  ordinal: number;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

/**
 * Complete retrieval response wrapping results and diagnostics.
 */
export interface RetrievalResponse {
  /** Ordered results, best match first. */
  results: RetrievalResult[];
  /** Total number of results returned (equals results.length). */
  total: number;
  /** Effective query terms used for ranking (empty when query was empty). */
  queryTerms: string[];
  /** Scope that was applied during retrieval. */
  scope: RetrievalScope;
  /** True when the response was produced by the FTS5 lexical index. */
  usedFts: boolean;
  /** True when the response was produced by the persistent inverted term index. */
  usedTermIndex: boolean;
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type RetrievalErrorCode =
  | 'invalid_query'
  | 'scope_required'
  | 'index_unavailable'
  | 'limit_exceeded';

export class RetrievalError extends Error {
  constructor(
    public readonly code: RetrievalErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'RetrievalError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RETRIEVAL_DEFAULT_TOP_K = 10;
export const RETRIEVAL_MAX_TOP_K = 50;
export const RETRIEVAL_MIN_TOP_K = 1;
