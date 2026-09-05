import { getDB } from '../client';
import type { Topic, CurriculumListOptions } from '@/models/curriculum';
import { assertCurriculumIdentity, curriculumPage, validateCurriculum } from '@/utils/curriculumValidation';

interface Row {
  id: string;
  subject_id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
}

function fromRow(row: Row): Topic {
  return { id: row.id, subjectId: row.subject_id, name: row.name,
    description: row.description, createdAt: row.created_at, updatedAt: row.updated_at };
}

const SELECT = 'SELECT id, subject_id, name, description, created_at, updated_at FROM topics';

function validate(record: Topic) {
  assertCurriculumIdentity(record.id, record.subjectId, record.createdAt, record.updatedAt);
  const result = validateCurriculum(record);
  if (!result.valid) throw new Error(result.error);
  if (!getDB().getFirstSync('SELECT id FROM subjects WHERE id = ?', [record.subjectId])) {
    throw new Error('subject_not_found');
  }
  return result;
}

export const topicRepo = {
  countBySubject(subjectId: string): number {
    if (typeof subjectId !== 'string' || !subjectId.trim()) throw new Error('subject_id_required');
    const row = getDB().getFirstSync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM topics WHERE subject_id = ?', [subjectId]
    );
    if (!row || !Number.isSafeInteger(row.count) || row.count < 0) throw new Error('topic_count_unavailable');
    return row.count;
  },

  getById(id: string): Topic | null {
    const row = getDB().getFirstSync<Row>(`${SELECT} WHERE id = ?`, [id]);
    return row ? fromRow(row) : null;
  },

  listBySubject(subjectId: string, options?: CurriculumListOptions): Topic[] {
    const { limit, offset } = curriculumPage(options);
    return getDB().getAllSync<Row>(
      `${SELECT} WHERE subject_id = ? ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?`,
      [subjectId, limit, offset]
    ).map(fromRow);
  },

  insert(record: Topic): void {
    const value = validate(record);
    getDB().runSync(
      'INSERT INTO topics (id, subject_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [record.id, record.subjectId, value.name, value.description, record.createdAt, record.updatedAt]
    );
  },

  /** Parent and creation time are immutable; a mismatched/missing row returns false. */
  update(record: Topic): boolean {
    const value = validate(record);
    return getDB().runSync(
      'UPDATE topics SET name = ?, description = ?, updated_at = ? WHERE id = ? AND subject_id = ?',
      [value.name, value.description, record.updatedAt, record.id, record.subjectId]
    ).changes > 0;
  },

  delete(id: string): boolean {
    return getDB().runSync('DELETE FROM topics WHERE id = ?', [id]).changes > 0;
  },
};
