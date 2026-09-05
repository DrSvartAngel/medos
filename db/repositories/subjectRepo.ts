import { getDB } from '../client';
import type { Subject, CurriculumListOptions } from '@/models/curriculum';
import { assertCurriculumIdentity, curriculumPage, validateCurriculum } from '@/utils/curriculumValidation';

interface Row {
  id: string;
  committee_id: string;
  name: string;
  description: string;
  created_at: number;
  updated_at: number;
}

function fromRow(row: Row): Subject {
  return { id: row.id, committeeId: row.committee_id, name: row.name,
    description: row.description, createdAt: row.created_at, updatedAt: row.updated_at };
}

const SELECT = 'SELECT id, committee_id, name, description, created_at, updated_at FROM subjects';

function validate(record: Subject) {
  assertCurriculumIdentity(record.id, record.committeeId, record.createdAt, record.updatedAt);
  const result = validateCurriculum(record);
  if (!result.valid) throw new Error(result.error);
  if (!getDB().getFirstSync('SELECT id FROM committees WHERE id = ?', [record.committeeId])) {
    throw new Error('committee_not_found');
  }
  return result;
}

export const subjectRepo = {
  getById(id: string): Subject | null {
    const row = getDB().getFirstSync<Row>(`${SELECT} WHERE id = ?`, [id]);
    return row ? fromRow(row) : null;
  },

  listByCommittee(committeeId: string, options?: CurriculumListOptions): Subject[] {
    const { limit, offset } = curriculumPage(options);
    return getDB().getAllSync<Row>(
      `${SELECT} WHERE committee_id = ? ORDER BY created_at ASC, id ASC LIMIT ? OFFSET ?`,
      [committeeId, limit, offset]
    ).map(fromRow);
  },

  insert(record: Subject): void {
    const value = validate(record);
    getDB().runSync(
      'INSERT INTO subjects (id, committee_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [record.id, record.committeeId, value.name, value.description, record.createdAt, record.updatedAt]
    );
  },

  /** Parent and creation time are immutable; a mismatched/missing row returns false. */
  update(record: Subject): boolean {
    const value = validate(record);
    return getDB().runSync(
      'UPDATE subjects SET name = ?, description = ?, updated_at = ? WHERE id = ? AND committee_id = ?',
      [value.name, value.description, record.updatedAt, record.id, record.committeeId]
    ).changes > 0;
  },

  delete(id: string): boolean {
    return getDB().runSync('DELETE FROM subjects WHERE id = ?', [id]).changes > 0;
  },
};
