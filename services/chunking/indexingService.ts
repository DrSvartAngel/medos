// MedOS — Phase 12.5: Source Indexing Service
// Orchestrates semantic chunking, SQLite chunk persistence, and lexical search indexing.

import type { ChunkSearchOptions, ChunkSearchResult, SourceChunk } from '@/models/chunk';
import type { StudySource } from '@/models/studySource';
import { chunkStudySource } from './semanticChunker';
import { sourceChunkRepo } from '@/db/repositories/sourceChunkRepo';
import { chunkEmbeddingRepo } from '@/db/repositories/chunkEmbeddingRepo';
import { embeddingIndexingService } from '@/services/embedding/embeddingIndexingService';
import { getActiveEmbeddingProvider } from '@/services/embedding/embeddingClient';

export interface IndexingResult {
  sourceId: string;
  chunkCount: number;
  chunks: SourceChunk[];
}

export const indexingService = {
  /**
   * Synchronously chunks a StudySource entity and saves its chunks into SQLite.
   * If an active synchronous embedding provider is available, generates embeddings as well.
   */
  indexSourceSync(source: StudySource): IndexingResult {
    if (!source || !source.id) {
      throw new Error('source_required');
    }

    const chunks = chunkStudySource(source);
    sourceChunkRepo.replaceForSource(source.id, chunks);

    // Phase 12.9: Trigger synchronous embedding indexing if provider is available
    try {
      const provider = getActiveEmbeddingProvider();
      if (provider && provider.embedTextSync) {
        embeddingIndexingService.indexChunksSync(chunks, provider);
      }
    } catch {
      // Safe fallback: lexical chunks are already persisted; never block source ingestion
    }

    return {
      sourceId: source.id,
      chunkCount: chunks.length,
      chunks,
    };
  },

  /**
   * Chunks a StudySource entity and saves its chunks into the SQLite database and textual index.
   * Asynchronously generates embeddings for new/changed chunks.
   */
  async indexSource(source: StudySource): Promise<IndexingResult> {
    if (!source || !source.id) {
      throw new Error('source_required');
    }

    const chunks = chunkStudySource(source);
    sourceChunkRepo.replaceForSource(source.id, chunks);

    // Phase 12.9: Trigger asynchronous embedding generation
    try {
      await embeddingIndexingService.indexChunks(chunks);
    } catch {
      // Safe fallback: never block source ingestion if embedding provider fails
    }

    return {
      sourceId: source.id,
      chunkCount: chunks.length,
      chunks,
    };
  },

  /**
   * Re-indexes an existing source synchronously.
   */
  reindexSourceSync(source: StudySource): IndexingResult {
    return this.indexSourceSync(source);
  },

  /**
   * Re-indexes an existing source when its content or metadata changes.
   * Purges old/stale chunks and replaces them with the new chunk set transactionally.
   */
  async reindexSource(source: StudySource): Promise<IndexingResult> {
    return this.indexSource(source);
  },

  /**
   * Removes all indexed chunks and associated vector embeddings for a StudySource.
   */
  async removeSourceIndex(sourceId: string): Promise<number> {
    if (!sourceId || !sourceId.trim()) return 0;
    const cleanId = sourceId.trim();
    try {
      chunkEmbeddingRepo.deleteBySourceId(cleanId);
    } catch {
      // Best-effort vector cleanup (foreign key cascade handles database-level deletion)
    }
    return sourceChunkRepo.deleteBySourceId(cleanId);
  },

  /**
   * Retrieves all persisted chunks for a specific source in ordinal order.
   */
  getChunksForSource(sourceId: string): SourceChunk[] {
    if (!sourceId || !sourceId.trim()) return [];
    return sourceChunkRepo.getBySourceId(sourceId.trim());
  },

  /**
   * Retrieves all persisted chunks for a topic across all its sources.
   */
  getChunksForTopic(topicId: string): SourceChunk[] {
    if (!topicId || !topicId.trim()) return [];
    return sourceChunkRepo.getByTopicId(topicId.trim());
  },

  /**
   * Queries the textual index over source chunks.
   */
  search(options: ChunkSearchOptions): ChunkSearchResult[] {
    return sourceChunkRepo.search(options);
  },
};
