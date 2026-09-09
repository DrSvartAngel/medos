// MedOS — Phase 12.9: Embedding and Vector Store Domain Models
// Provider-neutral contracts for chunk embeddings, semantic vectors, and hybrid retrieval.

import type { ChunkType } from './chunk';
import type { SourceProvenance } from './ingestion';
import type { RetrievalScope } from './retrieval';

export interface EmbeddingRequest {
  text: string;
  model?: string;
  metadata?: Record<string, unknown>;
}

export interface EmbeddingVector {
  vector: number[];
  dimensions: number;
  model: string;
  provider: string;
}

export interface ChunkEmbeddingRecord {
  chunkId: string;
  sourceId: string;
  topicId: string;
  embedding: number[];
  dimensions: number;
  model: string;
  contentHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface VectorSearchOptions {
  scope?: RetrievalScope;
  limit?: number;
  minSimilarity?: number;
  model?: string;
}

export interface VectorSearchResult {
  chunkId: string;
  similarity: number;
  provenance: SourceProvenance;
  ordinal: number;
  text: string;
  chunkType: ChunkType;
  dimensions?: number;
  model?: string;
}

export type VectorIndexState =
  | 'unavailable'
  | 'not_indexed'
  | 'partially_indexed'
  | 'ready'
  | 'failed';

export interface VectorIndexStatus {
  status: VectorIndexState;
  totalChunks: number;
  indexedChunks: number;
  model?: string;
}

export type EmbeddingErrorCode =
  | 'invalid_input'
  | 'provider_unavailable'
  | 'provider_error'
  | 'dimension_mismatch'
  | 'malformed_vector'
  | 'rate_limited'
  | 'timeout'
  | 'store_error';

export class EmbeddingError extends Error {
  constructor(
    public readonly code: EmbeddingErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly name: string;
  readonly defaultModel: string;
  readonly dimensions: number;

  embedText(text: string, model?: string): Promise<EmbeddingVector>;
  embedTextSync?(text: string, model?: string): EmbeddingVector;
  embedBatch?(texts: string[], model?: string): Promise<EmbeddingVector[]>;
  healthCheck?(): Promise<{ ok: boolean; message?: string }>;
}

export interface VectorStore {
  upsert(record: ChunkEmbeddingRecord): void;
  upsertBatch(records: ChunkEmbeddingRecord[]): void;
  deleteByChunkId(chunkId: string): void;
  deleteBySourceId(sourceId: string): void;
  deleteByTopicId(topicId: string): void;
  getByChunkId(chunkId: string): ChunkEmbeddingRecord | null;
  hasValidEmbedding(chunkId: string, contentHash: string, model: string): boolean;
  searchNearest(queryVector: number[], options?: VectorSearchOptions): VectorSearchResult[];
  getIndexStatus(scope?: RetrievalScope, model?: string): VectorIndexStatus;
  countEmbeddings(scope?: RetrievalScope, model?: string): number;
}
