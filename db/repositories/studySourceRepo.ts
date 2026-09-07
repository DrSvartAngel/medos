// MedOS — Phase 10 Step 2: Study Source SQLite Repository
// Factual CRUD persistence for topic-linked study materials.

import { getDB } from '../client';
import type {
  CreateStudySourceInput,
  StudySource,
  StudySourceType,
  UpdateStudySourceInput,
} from '@/models/studySource';

interface RawStudySourceRow {
  id: string;
  topic_id: string;
  title: string;
  content: string;
  source_type: string;
  created_at: number;
  updated_at: number;
}

const VALID_SOURCE_TYPES: readonly StudySourceType[] = ['text', 'note', 'document'];

let lastTimestamp = 0;

function getMonotonicNow(): number {
  const now = Date.now();
  if (now <= lastTimestamp) {
    lastTimestamp += 1;
    return lastTimestamp;
  }
  lastTimestamp = now;
  return now;
}

function generateId(timestamp: number): string {
  return timestamp.toString(36) + Math.random().toString(36).slice(2, 8);
}

function rowToStudySource(row: RawStudySourceRow): StudySource {
  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    content: row.content,
    sourceType: row.source_type as StudySourceType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const studySourceRepo = {
  insert(input: CreateStudySourceInput): StudySource {
    if (!input || typeof input !== 'object') {
      throw new Error('input_required');
    }
    if (typeof input.topicId !== 'string' || !input.topicId.trim()) {
      throw new Error('topic_id_required');
    }
    const topicId = input.topicId.trim();

    if (typeof input.title !== 'string' || !input.title.trim()) {
      throw new Error('title_required');
    }
    const title = input.title.trim();

    if (typeof input.content !== 'string' || !input.content.trim()) {
      throw new Error('content_required');
    }
    const content = input.content.trim();

    const sourceType: StudySourceType = input.sourceType ?? 'text';
    if (!VALID_SOURCE_TYPES.includes(sourceType)) {
      throw new Error('invalid_source_type');
    }

    const db = getDB();
    const topicExists = db.getFirstSync<{ id: string }>(
      'SELECT id FROM topics WHERE id = ?',
      [topicId]
    );
    if (!topicExists) {
      throw new Error('topic_not_found');
    }

    const now = getMonotonicNow();
    const id = generateId(now);

    db.runSync(
      `INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, topicId, title, content, sourceType, now, now]
    );

    return {
      id,
      topicId,
      title,
      content,
      sourceType,
      createdAt: now,
      updatedAt: now,
    };
  },

  update(id: string, input: UpdateStudySourceInput): StudySource | null {
    if (typeof id !== 'string' || !id.trim()) return null;
    if (!input || typeof input !== 'object') return null;

    const db = getDB();
    const existing = db.getFirstSync<RawStudySourceRow>(
      `SELECT id, topic_id, title, content, source_type, created_at, updated_at
       FROM study_sources WHERE id = ?`,
      [id.trim()]
    );
    if (!existing) return null;

    let title = existing.title;
    if (input.title !== undefined) {
      if (typeof input.title !== 'string' || !input.title.trim()) {
        throw new Error('title_required');
      }
      title = input.title.trim();
    }

    let content = existing.content;
    if (input.content !== undefined) {
      if (typeof input.content !== 'string' || !input.content.trim()) {
        throw new Error('content_required');
      }
      content = input.content.trim();
    }

    let sourceType = existing.source_type as StudySourceType;
    if (input.sourceType !== undefined) {
      if (!VALID_SOURCE_TYPES.includes(input.sourceType)) {
        throw new Error('invalid_source_type');
      }
      sourceType = input.sourceType;
    }

    const now = Date.now();
    db.runSync(
      `UPDATE study_sources
       SET title = ?, content = ?, source_type = ?, updated_at = ?
       WHERE id = ?`,
      [title, content, sourceType, now, existing.id]
    );

    return {
      id: existing.id,
      topicId: existing.topic_id,
      title,
      content,
      sourceType,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  },

  delete(id: string): boolean {
    if (typeof id !== 'string' || !id.trim()) return false;
    const db = getDB();
    const result = db.runSync('DELETE FROM study_sources WHERE id = ?', [id.trim()]);
    return result.changes > 0;
  },

  getById(id: string): StudySource | null {
    if (typeof id !== 'string' || !id.trim()) return null;
    const db = getDB();
    const row = db.getFirstSync<RawStudySourceRow>(
      `SELECT id, topic_id, title, content, source_type, created_at, updated_at
       FROM study_sources WHERE id = ?`,
      [id.trim()]
    );
    return row ? rowToStudySource(row) : null;
  },

  getByTopic(topicId: string): StudySource[] {
    if (typeof topicId !== 'string' || !topicId.trim()) return [];
    const db = getDB();
    const rows = db.getAllSync<RawStudySourceRow>(
      `SELECT id, topic_id, title, content, source_type, created_at, updated_at
       FROM study_sources WHERE topic_id = ?
       ORDER BY created_at DESC, id DESC`,
      [topicId.trim()]
    );
    return rows.map(rowToStudySource);
  },

  countByTopic(topicId: string): number {
    if (typeof topicId !== 'string' || !topicId.trim()) return 0;
    const db = getDB();
    const row = db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM study_sources WHERE topic_id = ?',
      [topicId.trim()]
    );
    return row?.count ?? 0;
  },
};
