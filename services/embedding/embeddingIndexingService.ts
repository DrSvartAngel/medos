// MedOS — Phase 12.9: Embedding Indexing Service
// Generates and manages embeddings for Phase 12.5 chunks.
// Ensures idempotent indexing, fingerprint cache validation, and bounded batching.

import type { SourceChunk } from '@/models/chunk';
import type { ChunkEmbeddingRecord, EmbeddingProvider, VectorIndexStatus } from '@/models/embedding';
import type { RetrievalScope } from '@/models/retrieval';
import { sourceChunkRepo } from '@/db/repositories/sourceChunkRepo';
import { chunkEmbeddingRepo } from '@/db/repositories/chunkEmbeddingRepo';
import { getActiveEmbeddingProvider } from './embeddingClient';

export interface IndexChunksResult {
  indexed: number;
  skipped: number;
  errors: number;
}

export const embeddingIndexingService = {
  /**
   * Generates and stores embeddings for the provided chunks.
   * Skips chunks that already have valid embeddings with matching content fingerprint and model.
   */
  async indexChunks(
    chunks: SourceChunk[],
    providerOverride?: EmbeddingProvider
  ): Promise<IndexChunksResult> {
    if (!chunks || chunks.length === 0) {
      return { indexed: 0, skipped: 0, errors: 0 };
    }

    const provider = providerOverride ?? getActiveEmbeddingProvider();
    const model = provider.defaultModel;
    const recordsToSave: ChunkEmbeddingRecord[] = [];
    let skipped = 0;
    let errors = 0;

    for (const chunk of chunks) {
      // 1. Check if valid embedding already exists for this fingerprint + model
      const isValid = chunkEmbeddingRepo.hasValidEmbedding(chunk.id, chunk.fingerprint, model);
      if (isValid) {
        skipped++;
        continue;
      }

      // 2. Generate embedding
      try {
        let embedResult;
        if (provider.embedTextSync) {
          embedResult = provider.embedTextSync(chunk.text, model);
        } else {
          embedResult = await provider.embedText(chunk.text, model);
        }

        const now = Date.now();
        recordsToSave.push({
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          topicId: chunk.topicId,
          embedding: embedResult.vector,
          dimensions: embedResult.dimensions,
          model,
          contentHash: chunk.fingerprint,
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        errors++;
      }
    }

    // 3. Batch persist
    if (recordsToSave.length > 0) {
      chunkEmbeddingRepo.upsertBatch(recordsToSave);
    }

    return {
      indexed: recordsToSave.length,
      skipped,
      errors,
    };
  },

  /**
   * Synchronously indexes chunks using a synchronous-capable provider (e.g. MockEmbeddingProvider).
   */
  indexChunksSync(
    chunks: SourceChunk[],
    providerOverride?: EmbeddingProvider
  ): IndexChunksResult {
    if (!chunks || chunks.length === 0) {
      return { indexed: 0, skipped: 0, errors: 0 };
    }

    const provider = providerOverride ?? getActiveEmbeddingProvider();
    if (!provider.embedTextSync) {
      throw new Error('Provider does not support synchronous embedding generation');
    }

    const model = provider.defaultModel;
    const recordsToSave: ChunkEmbeddingRecord[] = [];
    let skipped = 0;
    let errors = 0;

    for (const chunk of chunks) {
      const isValid = chunkEmbeddingRepo.hasValidEmbedding(chunk.id, chunk.fingerprint, model);
      if (isValid) {
        skipped++;
        continue;
      }

      try {
        const embedResult = provider.embedTextSync(chunk.text, model);
        const now = Date.now();
        recordsToSave.push({
          chunkId: chunk.id,
          sourceId: chunk.sourceId,
          topicId: chunk.topicId,
          embedding: embedResult.vector,
          dimensions: embedResult.dimensions,
          model,
          contentHash: chunk.fingerprint,
          createdAt: now,
          updatedAt: now,
        });
      } catch {
        errors++;
      }
    }

    if (recordsToSave.length > 0) {
      chunkEmbeddingRepo.upsertBatch(recordsToSave);
    }

    return {
      indexed: recordsToSave.length,
      skipped,
      errors,
    };
  },

  /**
   * Indexes all chunks for a specific StudySource.
   */
  async indexSource(sourceId: string, provider?: EmbeddingProvider): Promise<IndexChunksResult> {
    const chunks = sourceChunkRepo.getBySourceId(sourceId);
    return this.indexChunks(chunks, provider);
  },

  /**
   * Indexes all chunks for a specific Topic.
   */
  async indexTopic(topicId: string, provider?: EmbeddingProvider): Promise<IndexChunksResult> {
    const chunks = sourceChunkRepo.getByTopicId(topicId);
    return this.indexChunks(chunks, provider);
  },

  /**
   * Removes all embeddings for a source.
   */
  removeSourceEmbeddings(sourceId: string): void {
    chunkEmbeddingRepo.deleteBySourceId(sourceId);
  },

  /**
   * Gets the current vector index status for a given scope and model.
   */
  getIndexStatus(scope?: RetrievalScope, model?: string): VectorIndexStatus {
    const provider = getActiveEmbeddingProvider();
    return chunkEmbeddingRepo.getIndexStatus(scope, model ?? provider.defaultModel);
  },
};
