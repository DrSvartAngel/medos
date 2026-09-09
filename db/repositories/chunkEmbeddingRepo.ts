// MedOS — Phase 12.9: Chunk Embedding SQLite Repository
// Manages vector embeddings persistence, cosine similarity search, and index status.

import { getDB } from '../client';
import type {
  ChunkEmbeddingRecord,
  VectorIndexStatus,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStore,
} from '@/models/embedding';
import type { RetrievalScope } from '@/models/retrieval';
import type { ChunkType } from '@/models/chunk';
import type { ExtractionMethod, SourceProvenance } from '@/models/ingestion';

interface RawEmbeddingRow {
  chunk_id: string;
  source_id: string;
  topic_id: string;
  embedding: string;
  dimensions: number;
  model: string;
  content_hash: string;
  created_at: number;
  updated_at: number;
}

interface RawChunkWithEmbeddingRow extends RawEmbeddingRow {
  source_title: string;
  ordinal: number;
  chunk_type: string;
  text: string;
  page_number: number | null;
  slide_number: number | null;
  section_title: string | null;
  media_id: string | null;
  image_index: number | null;
  extraction_method: string;
  char_start: number | null;
  char_end: number | null;
}

let _overrideDb: ReturnType<typeof getDB> | null = null;

export function setChunkEmbeddingDbOverride(db: ReturnType<typeof getDB> | null): void {
  _overrideDb = db;
}

function getDatabase(): ReturnType<typeof getDB> | null {
  if (_overrideDb) {
    return _overrideDb;
  }
  try {
    const db = getDB();
    if (!db || typeof db.execSync !== 'function') return null;
    return db;
  } catch {
    return null;
  }
}

/**
 * Computes deterministic cosine similarity between two numeric vectors.
 * Returns value in [-1, 1], or 0 if either vector has zero magnitude or invalid values.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    const ai = a[i];
    const bi = b[i];
    if (Number.isNaN(ai) || Number.isNaN(bi) || !Number.isFinite(ai) || !Number.isFinite(bi)) {
      return 0;
    }
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  if (normA <= 0 || normB <= 0) return 0;
  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
  if (Number.isNaN(sim) || !Number.isFinite(sim)) return 0;
  // Numerical clamp
  if (sim > 1) return 1;
  if (sim < -1) return -1;
  return sim;
}

export const chunkEmbeddingRepo: VectorStore = {
  upsert(record: ChunkEmbeddingRecord): void {
    const db = getDatabase();
    if (!db) return;
    const jsonVector = JSON.stringify(record.embedding);
    db.runSync(
      `INSERT INTO chunk_embeddings (
        chunk_id, source_id, topic_id, embedding, dimensions, model, content_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chunk_id) DO UPDATE SET
        embedding = excluded.embedding,
        dimensions = excluded.dimensions,
        model = excluded.model,
        content_hash = excluded.content_hash,
        updated_at = excluded.updated_at;`,
      [
        record.chunkId,
        record.sourceId,
        record.topicId,
        jsonVector,
        record.dimensions,
        record.model,
        record.contentHash,
        record.createdAt,
        record.updatedAt,
      ]
    );
  },

  upsertBatch(records: ChunkEmbeddingRecord[]): void {
    if (!records || records.length === 0) return;
    const db = getDatabase();
    if (!db) return;
    db.withTransactionSync(() => {
      for (const record of records) {
        this.upsert(record);
      }
    });
  },

  deleteByChunkId(chunkId: string): void {
    if (!chunkId) return;
    const db = getDatabase();
    if (!db) return;
    db.runSync('DELETE FROM chunk_embeddings WHERE chunk_id = ?;', [chunkId]);
  },

  deleteBySourceId(sourceId: string): void {
    if (!sourceId) return;
    const db = getDatabase();
    if (!db) return;
    db.runSync('DELETE FROM chunk_embeddings WHERE source_id = ?;', [sourceId]);
  },

  deleteByTopicId(topicId: string): void {
    if (!topicId) return;
    const db = getDatabase();
    if (!db) return;
    db.runSync('DELETE FROM chunk_embeddings WHERE topic_id = ?;', [topicId]);
  },

  getByChunkId(chunkId: string): ChunkEmbeddingRecord | null {
    if (!chunkId) return null;
    const db = getDatabase();
    if (!db) return null;
    try {
      const row = db.getFirstSync<RawEmbeddingRow>(
        'SELECT * FROM chunk_embeddings WHERE chunk_id = ? LIMIT 1;',
        [chunkId]
      );
      if (!row) return null;
      const embedding = JSON.parse(row.embedding) as number[];
      return {
        chunkId: row.chunk_id,
        sourceId: row.source_id,
        topicId: row.topic_id,
        embedding,
        dimensions: row.dimensions,
        model: row.model,
        contentHash: row.content_hash,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch {
      return null;
    }
  },

  hasValidEmbedding(chunkId: string, contentHash: string, model: string): boolean {
    if (!chunkId || !contentHash || !model) return false;
    const db = getDatabase();
    if (!db) return false;
    try {
      const row = db.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM chunk_embeddings
         WHERE chunk_id = ? AND content_hash = ? AND model = ? LIMIT 1;`,
        [chunkId, contentHash, model]
      );
      return (row?.count ?? 0) > 0;
    } catch {
      return false;
    }
  },

  searchNearest(queryVector: number[], options?: VectorSearchOptions): VectorSearchResult[] {
    if (!queryVector || queryVector.length === 0) return [];
    const db = getDatabase();
    if (!db) return [];

    const scope = options?.scope ?? {};
    const limit = Math.max(1, Math.min(50, options?.limit ?? 10));
    const minSimilarity = options?.minSimilarity ?? 0;
    const model = options?.model;

    // Build bounded query joining chunk_embeddings with source_chunks
    const conditions: string[] = ['sc.id IS NOT NULL'];
    const params: (string | number)[] = [];

    if (scope.topicId) {
      conditions.push('ce.topic_id = ?');
      params.push(scope.topicId);
    }
    if (scope.sourceId) {
      conditions.push('ce.source_id = ?');
      params.push(scope.sourceId);
    }
    if (model) {
      conditions.push('ce.model = ?');
      params.push(model);
    }

    const sql = `
      SELECT
        ce.chunk_id,
        ce.source_id,
        ce.topic_id,
        ce.embedding,
        ce.dimensions,
        ce.model,
        ce.content_hash,
        ce.created_at,
        ce.updated_at,
        sc.source_title,
        sc.ordinal,
        sc.chunk_type,
        sc.text,
        sc.page_number,
        sc.slide_number,
        sc.section_title,
        sc.media_id,
        sc.image_index,
        sc.extraction_method,
        sc.char_start,
        sc.char_end
      FROM chunk_embeddings ce
      INNER JOIN source_chunks sc ON ce.chunk_id = sc.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ce.chunk_id ASC
      LIMIT 1000;
    `;

    let rows: RawChunkWithEmbeddingRow[];
    try {
      rows = db.getAllSync<RawChunkWithEmbeddingRow>(sql, params);
    } catch {
      return [];
    }

    const scoredResults: VectorSearchResult[] = [];

    for (const row of rows) {
      if (row.dimensions !== queryVector.length) {
        continue; // Dimension mismatch, skip
      }

      let parsedVec: number[];
      try {
        parsedVec = JSON.parse(row.embedding);
      } catch {
        continue;
      }

      if (!Array.isArray(parsedVec) || parsedVec.length !== queryVector.length) {
        continue;
      }

      const similarity = cosineSimilarity(queryVector, parsedVec);
      if (similarity < minSimilarity) {
        continue;
      }

      const provenance: SourceProvenance = {
        sourceId: row.source_id,
        sourceTitle: row.source_title,
        topicId: row.topic_id,
        pageNumber: row.page_number ?? undefined,
        slideNumber: row.slide_number ?? undefined,
        mediaId: row.media_id ?? undefined,
        imageIndex: row.image_index ?? undefined,
        sectionTitle: row.section_title ?? undefined,
        excerpt: row.text.slice(0, 160).trim(),
        charStart: row.char_start ?? undefined,
        charEnd: row.char_end ?? undefined,
        extractionMethod: row.extraction_method as ExtractionMethod,
      };

      scoredResults.push({
        chunkId: row.chunk_id,
        similarity,
        provenance,
        ordinal: row.ordinal,
        text: row.text,
        chunkType: row.chunk_type as ChunkType,
        dimensions: row.dimensions,
        model: row.model,
      });
    }

    // Sort by similarity DESC, then chunkId ASC (deterministic tie-break)
    scoredResults.sort((a, b) => {
      const diff = b.similarity - a.similarity;
      if (diff !== 0) return diff;
      return a.chunkId.localeCompare(b.chunkId);
    });

    return scoredResults.slice(0, limit);
  },

  countEmbeddings(scope?: RetrievalScope, model?: string): number {
    const db = getDatabase();
    if (!db) return 0;
    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];
    if (scope?.topicId) {
      conditions.push('topic_id = ?');
      params.push(scope.topicId);
    }
    if (scope?.sourceId) {
      conditions.push('source_id = ?');
      params.push(scope.sourceId);
    }
    if (model) {
      conditions.push('model = ?');
      params.push(model);
    }
    const sql = `SELECT COUNT(*) as count FROM chunk_embeddings WHERE ${conditions.join(' AND ')};`;
    try {
      const row = db.getFirstSync<{ count: number }>(sql, params);
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  },

  getIndexStatus(scope?: RetrievalScope, model?: string): VectorIndexStatus {
    const db = getDatabase();
    if (!db) {
      return { status: 'unavailable', totalChunks: 0, indexedChunks: 0, model };
    }
    try {
      let totalChunks = 0;
      if (scope?.sourceId) {
        const row = db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM source_chunks WHERE source_id = ?;',
          [scope.sourceId]
        );
        totalChunks = row?.count ?? 0;
      } else if (scope?.topicId) {
        const row = db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM source_chunks WHERE topic_id = ?;',
          [scope.topicId]
        );
        totalChunks = row?.count ?? 0;
      } else {
        const row = db.getFirstSync<{ count: number }>(
          'SELECT COUNT(*) as count FROM source_chunks;'
        );
        totalChunks = row?.count ?? 0;
      }

      const indexedChunks = this.countEmbeddings(scope, model);

      if (totalChunks === 0) {
        return { status: 'not_indexed', totalChunks: 0, indexedChunks: 0, model };
      }
      if (indexedChunks === 0) {
        return { status: 'not_indexed', totalChunks, indexedChunks: 0, model };
      }
      if (indexedChunks < totalChunks) {
        return { status: 'partially_indexed', totalChunks, indexedChunks, model };
      }
      return { status: 'ready', totalChunks, indexedChunks, model };
    } catch {
      return { status: 'unavailable', totalChunks: 0, indexedChunks: 0, model };
    }
  },
};
