// MedOS — Phase 12.5: Source Indexing Service
// Orchestrates semantic chunking, SQLite chunk persistence, and lexical search indexing.

import type { ChunkSearchOptions, ChunkSearchResult, SourceChunk } from '@/models/chunk';
import type { StudySource } from '@/models/studySource';
import { chunkStudySource } from './semanticChunker';
import { sourceChunkRepo } from '@/db/repositories/sourceChunkRepo';

export interface IndexingResult {
  sourceId: string;
  chunkCount: number;
  chunks: SourceChunk[];
}

export const indexingService = {
  /**
   * Synchronously chunks a StudySource entity and saves its chunks into SQLite.
   */
  indexSourceSync(source: StudySource): IndexingResult {
    if (!source || !source.id) {
      throw new Error('source_required');
    }

    const chunks = chunkStudySource(source);
    sourceChunkRepo.replaceForSource(source.id, chunks);

    return {
      sourceId: source.id,
      chunkCount: chunks.length,
      chunks,
    };
  },

  /**
   * Chunks a StudySource entity and saves its chunks into the SQLite database and textual index.
   * Atomic and idempotent: executing multiple times replaces existing chunks cleanly.
   */
  async indexSource(source: StudySource): Promise<IndexingResult> {
    return this.indexSourceSync(source);
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
    return this.indexSourceSync(source);
  },

  /**
   * Removes all indexed chunks for a StudySource.
   */
  async removeSourceIndex(sourceId: string): Promise<number> {
    if (!sourceId || !sourceId.trim()) return 0;
    return sourceChunkRepo.deleteBySourceId(sourceId.trim());
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
