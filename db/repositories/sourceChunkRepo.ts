// MedOS — Phase 12.5: Source Chunk SQLite Repository
// Canonical CRUD, FTS5 search, and persistent inverted term index (source_chunk_terms).

import { getDB } from '../client';
import { tokenizeQuery, tokenizeText } from '@/services/chunking/termTokenizer';
import type {
  ChunkSearchOptions,
  ChunkSearchResult,
  ChunkType,
  CreateSourceChunkInput,
  SourceChunk,
} from '@/models/chunk';
import type { ExtractionMethod, SourceProvenance } from '@/models/ingestion';

interface RawSourceChunkRow {
  id: string;
  source_id: string;
  topic_id: string;
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
  token_estimate: number;
  word_count: number;
  fingerprint: string;
  created_at: number;
  updated_at: number;
}

function rowToSourceChunk(row: RawSourceChunkRow): SourceChunk {
  return {
    id: row.id,
    sourceId: row.source_id,
    topicId: row.topic_id,
    sourceTitle: row.source_title,
    ordinal: row.ordinal,
    chunkType: row.chunk_type as ChunkType,
    text: row.text,
    pageNumber: row.page_number ?? undefined,
    slideNumber: row.slide_number ?? undefined,
    sectionTitle: row.section_title ?? undefined,
    mediaId: row.media_id ?? undefined,
    imageIndex: row.image_index ?? undefined,
    extractionMethod: row.extraction_method as ExtractionMethod,
    charStart: row.char_start ?? undefined,
    charEnd: row.char_end ?? undefined,
    tokenEstimate: row.token_estimate,
    wordCount: row.word_count,
    fingerprint: row.fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function chunkToProvenance(chunk: SourceChunk): SourceProvenance {
  return {
    sourceId: chunk.sourceId,
    sourceTitle: chunk.sourceTitle,
    topicId: chunk.topicId,
    pageNumber: chunk.pageNumber,
    slideNumber: chunk.slideNumber,
    mediaId: chunk.mediaId,
    imageIndex: chunk.imageIndex,
    sectionTitle: chunk.sectionTitle,
    excerpt: chunk.text.slice(0, 160).trim(),
    charStart: chunk.charStart,
    charEnd: chunk.charEnd,
    extractionMethod: chunk.extractionMethod,
  };
}

let _hasFts5Checked = false;
let _hasFts5 = false;

function checkFts5Supported(db: ReturnType<typeof getDB>): boolean {
  if (_hasFts5Checked) return _hasFts5;
  try {
    const row = db.getFirstSync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='source_chunks_fts'"
    );
    _hasFts5 = Boolean(row);
  } catch {
    _hasFts5 = false;
  }
  _hasFts5Checked = true;
  return _hasFts5;
}

export const sourceChunkRepo = {
  getById(id: string): SourceChunk | null {
    if (!id || !id.trim()) return null;
    const db = getDB();
    const row = db.getFirstSync<RawSourceChunkRow>(
      'SELECT * FROM source_chunks WHERE id = ?',
      [id.trim()]
    );
    return row ? rowToSourceChunk(row) : null;
  },

  getBySourceId(sourceId: string): SourceChunk[] {
    if (!sourceId || !sourceId.trim()) return [];
    const db = getDB();
    const rows = db.getAllSync<RawSourceChunkRow>(
      'SELECT * FROM source_chunks WHERE source_id = ? ORDER BY ordinal ASC',
      [sourceId.trim()]
    );
    return rows.map(rowToSourceChunk);
  },

  getByTopicId(topicId: string): SourceChunk[] {
    if (!topicId || !topicId.trim()) return [];
    const db = getDB();
    const rows = db.getAllSync<RawSourceChunkRow>(
      'SELECT * FROM source_chunks WHERE topic_id = ? ORDER BY source_id ASC, ordinal ASC',
      [topicId.trim()]
    );
    return rows.map(rowToSourceChunk);
  },

  countBySourceId(sourceId: string): number {
    if (!sourceId || !sourceId.trim()) return 0;
    const db = getDB();
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM source_chunks WHERE source_id = ?',
      [sourceId.trim()]
    );
    return row?.count ?? 0;
  },

  countByTopicId(topicId: string): number {
    if (!topicId || !topicId.trim()) return 0;
    const db = getDB();
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM source_chunks WHERE topic_id = ?',
      [topicId.trim()]
    );
    return row?.count ?? 0;
  },

  deleteBySourceId(sourceId: string): number {
    if (!sourceId || !sourceId.trim()) return 0;
    const db = getDB();
    const cleanSourceId = sourceId.trim();
    const ftsSupported = checkFts5Supported(db);

    let deletedCount = 0;
    db.withTransactionSync(() => {
      if (ftsSupported) {
        try {
          db.runSync('DELETE FROM source_chunks_fts WHERE source_id = ?', [cleanSourceId]);
        } catch {
          // ignore FTS cleanup error
        }
      }
      try {
        db.runSync('DELETE FROM source_chunk_terms WHERE source_id = ?', [cleanSourceId]);
      } catch {
        // ignore terms cleanup error if table not yet created
      }
      const res = db.runSync('DELETE FROM source_chunks WHERE source_id = ?', [cleanSourceId]);
      deletedCount = res.changes;
    });

    return deletedCount;
  },

  insertBatch(chunks: CreateSourceChunkInput[]): void {
    if (!chunks || chunks.length === 0) return;
    const db = getDB();
    const ftsSupported = checkFts5Supported(db);
    const now = Date.now();

    db.withTransactionSync(() => {
      for (const c of chunks) {
        const id = c.id || `${c.sourceId}_chk_${c.ordinal}`;
        const createdAt = c.createdAt ?? now;
        const updatedAt = c.updatedAt ?? now;
        const extractionMethod = c.extractionMethod ?? 'native';
        const tokenEstimate = c.tokenEstimate ?? 0;
        const wordCount = c.wordCount ?? 0;
        const fingerprint = c.fingerprint || id;

        db.runSync(
          `INSERT OR REPLACE INTO source_chunks (
            id, source_id, topic_id, source_title, ordinal, chunk_type, text,
            page_number, slide_number, section_title, media_id, image_index,
            extraction_method, char_start, char_end, token_estimate, word_count,
            fingerprint, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            c.sourceId,
            c.topicId,
            c.sourceTitle,
            c.ordinal,
            c.chunkType,
            c.text,
            c.pageNumber ?? null,
            c.slideNumber ?? null,
            c.sectionTitle ?? null,
            c.mediaId ?? null,
            c.imageIndex ?? null,
            extractionMethod,
            c.charStart ?? null,
            c.charEnd ?? null,
            tokenEstimate,
            wordCount,
            fingerprint,
            createdAt,
            updatedAt,
          ]
        );

        // Persistent inverted index insertion
        const termFreqs = tokenizeText(`${c.text} ${c.sourceTitle} ${c.sectionTitle || ''}`);
        for (const [term, freq] of termFreqs.entries()) {
          try {
            db.runSync(
              `INSERT OR REPLACE INTO source_chunk_terms (term, chunk_id, source_id, topic_id, term_frequency)
               VALUES (?, ?, ?, ?, ?)`,
              [term, id, c.sourceId, c.topicId, freq]
            );
          } catch {
            // ignore if table not present in legacy contexts
          }
        }

        if (ftsSupported) {
          try {
            db.runSync(
              `INSERT INTO source_chunks_fts (chunk_id, text, source_title, section_title, topic_id, source_id)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [id, c.text, c.sourceTitle, c.sectionTitle ?? '', c.topicId, c.sourceId]
            );
          } catch {
            // Ignore FTS insert failure
          }
        }
      }
    });
  },

  replaceForSource(sourceId: string, chunks: SourceChunk[]): void {
    if (!sourceId || !sourceId.trim()) return;
    const db = getDB();
    const ftsSupported = checkFts5Supported(db);
    const sId = sourceId.trim();

    db.withTransactionSync(() => {
      // 1. Clean existing chunks and terms for this source
      if (ftsSupported) {
        try {
          db.runSync('DELETE FROM source_chunks_fts WHERE source_id = ?', [sId]);
        } catch {
          // ignore
        }
      }
      try {
        db.runSync('DELETE FROM source_chunk_terms WHERE source_id = ?', [sId]);
      } catch {
        // ignore
      }
      db.runSync('DELETE FROM source_chunks WHERE source_id = ?', [sId]);

      // 2. Insert new chunks and populate index terms
      for (const c of chunks) {
        db.runSync(
          `INSERT INTO source_chunks (
            id, source_id, topic_id, source_title, ordinal, chunk_type, text,
            page_number, slide_number, section_title, media_id, image_index,
            extraction_method, char_start, char_end, token_estimate, word_count,
            fingerprint, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id,
            c.sourceId,
            c.topicId,
            c.sourceTitle,
            c.ordinal,
            c.chunkType,
            c.text,
            c.pageNumber ?? null,
            c.slideNumber ?? null,
            c.sectionTitle ?? null,
            c.mediaId ?? null,
            c.imageIndex ?? null,
            c.extractionMethod,
            c.charStart ?? null,
            c.charEnd ?? null,
            c.tokenEstimate,
            c.wordCount,
            c.fingerprint,
            c.createdAt,
            c.updatedAt,
          ]
        );

        // Persistent inverted index insertion
        const termFreqs = tokenizeText(`${c.text} ${c.sourceTitle} ${c.sectionTitle || ''}`);
        for (const [term, freq] of termFreqs.entries()) {
          try {
            db.runSync(
              `INSERT OR REPLACE INTO source_chunk_terms (term, chunk_id, source_id, topic_id, term_frequency)
               VALUES (?, ?, ?, ?, ?)`,
              [term, c.id, c.sourceId, c.topicId, freq]
            );
          } catch {
            // ignore
          }
        }

        if (ftsSupported) {
          try {
            db.runSync(
              `INSERT INTO source_chunks_fts (chunk_id, text, source_title, section_title, topic_id, source_id)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [c.id, c.text, c.sourceTitle, c.sectionTitle ?? '', c.topicId, c.sourceId]
            );
          } catch {
            // ignore
          }
        }
      }
    });
  },

  search(options: ChunkSearchOptions): ChunkSearchResult[] {
    const rawQuery = (options.query || '').trim();
    const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
    const db = getDB();
    const ftsSupported = checkFts5Supported(db);

    const filterClauses: string[] = [];
    const filterParams: (string | number)[] = [];

    if (options.topicId && options.topicId.trim()) {
      filterClauses.push('sc.topic_id = ?');
      filterParams.push(options.topicId.trim());
    }

    if (options.sourceId && options.sourceId.trim()) {
      filterClauses.push('sc.source_id = ?');
      filterParams.push(options.sourceId.trim());
    }

    if (options.extractionMethod) {
      filterClauses.push('sc.extraction_method = ?');
      filterParams.push(options.extractionMethod);
    }

    if (options.chunkType) {
      filterClauses.push('sc.chunk_type = ?');
      filterParams.push(options.chunkType);
    }

    // A. Attempt FTS5 if supported and query is non-empty
    if (ftsSupported && rawQuery.length > 0) {
      try {
        const sanitizedTokens = rawQuery
          .replace(/["'*+\-^:()]/g, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 0)
          .map((t) => `"${t}"*`);

        if (sanitizedTokens.length > 0) {
          const matchExpr = sanitizedTokens.join(' AND ');
          let sql = `
            SELECT sc.*, rank as fts_score
            FROM source_chunks_fts fts
            JOIN source_chunks sc ON sc.id = fts.chunk_id
            WHERE source_chunks_fts MATCH ?
          `;
          const params: (string | number)[] = [matchExpr];

          if (filterClauses.length > 0) {
            sql += ` AND ${filterClauses.join(' AND ')}`;
            params.push(...filterParams);
          }

          sql += ` ORDER BY fts_score ASC LIMIT ?`;
          params.push(limit);

          const rows = db.getAllSync<RawSourceChunkRow & { fts_score?: number }>(sql, params);
          if (rows.length > 0) {
            return rows.map((r) => {
              const chunk = rowToSourceChunk(r);
              return {
                chunk,
                score: r.fts_score !== undefined ? Math.abs(r.fts_score) : 1,
                matchTerms: rawQuery.split(/\s+/).filter(Boolean),
                provenance: chunkToProvenance(chunk),
              };
            });
          }
        }
      } catch {
        // Fall back to persistent source_chunk_terms inverted index
      }
    }

    // B. Real SQLite-backed Inverted Term Index (source_chunk_terms)
    const queryTerms = tokenizeQuery(rawQuery);

    if (queryTerms.length > 0) {
      try {
        const placeholders = queryTerms.map(() => '?').join(', ');
        let sql = `
          SELECT
            sc.*,
            COUNT(DISTINCT sct.term) AS matched_terms_count,
            SUM(sct.term_frequency) AS total_term_freq
          FROM source_chunk_terms sct
          JOIN source_chunks sc ON sc.id = sct.chunk_id
          WHERE sct.term IN (${placeholders})
        `;
        const params: (string | number)[] = [...queryTerms];

        if (filterClauses.length > 0) {
          sql += ` AND ${filterClauses.join(' AND ')}`;
          params.push(...filterParams);
        }

        sql += `
          GROUP BY sc.id
          ORDER BY matched_terms_count DESC, total_term_freq DESC, sc.ordinal ASC
          LIMIT ?
        `;
        params.push(limit);

        const rows = db.getAllSync<
          RawSourceChunkRow & { matched_terms_count: number; total_term_freq: number }
        >(sql, params);

        if (rows.length > 0) {
          return rows.map((r) => {
            const chunk = rowToSourceChunk(r);
            const score = r.matched_terms_count * 10 + r.total_term_freq;
            return {
              chunk,
              score,
              matchTerms: queryTerms,
              provenance: chunkToProvenance(chunk),
            };
          });
        }
      } catch {
        // Fall back to direct query if terms table is absent in legacy test fixtures
      }
    }

    // C. Direct filtered retrieval ONLY when query is empty
    if (queryTerms.length === 0) {
      let sql = 'SELECT sc.* FROM source_chunks sc';
      const params: (string | number)[] = [];

      if (filterClauses.length > 0) {
        sql += ` WHERE ${filterClauses.join(' AND ')}`;
        params.push(...filterParams);
      }

      sql += ' ORDER BY sc.source_id ASC, sc.ordinal ASC LIMIT ?';
      params.push(limit);

      const rows = db.getAllSync<RawSourceChunkRow>(sql, params);
      return rows.map((r) => {
        const chunk = rowToSourceChunk(r);
        return {
          chunk,
          score: 1,
          matchTerms: [],
          provenance: chunkToProvenance(chunk),
        };
      });
    }

    return [];
  },
};
