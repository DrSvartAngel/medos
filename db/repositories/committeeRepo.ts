import { getDB } from '../client';
import type { Committee } from '@/store/useCommitteeStore';
import { getCommitteeDateStatus } from '@/utils/committeeDate';

// ---------------------------------------------------------------------------
// Internal DB row shape (matches the committees table after v2 migration)
// ---------------------------------------------------------------------------
interface CommitteeRow {
  id: string;
  name: string;
  description: string | null;
  color: string;
  start_date: number;
  exam_date: number;
  created_at: number;
  updated_at: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function rowToCommittee(row: CommitteeRow): Committee {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    color: row.color,
    startDate: row.start_date,
    examDate: row.exam_date,
    status: getCommitteeDateStatus(row.start_date, row.exam_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Repository — all operations use parameterized SQL
// ---------------------------------------------------------------------------
export const committeeRepo = {
  /** Returns all committees ordered by exam date (soonest first). */
  getAll(): Committee[] {
    const db = getDB();
    const rows = db.getAllSync<CommitteeRow>(
      `SELECT id, name, description, color, start_date, exam_date, created_at, updated_at
       FROM committees
       ORDER BY exam_date ASC`
    );
    return rows.map(rowToCommittee);
  },

  /** Returns a single committee by id, or null if not found. */
  getById(id: string): Committee | null {
    const db = getDB();
    const row = db.getFirstSync<CommitteeRow>(
      `SELECT id, name, description, color, start_date, exam_date, created_at, updated_at
       FROM committees
       WHERE id = ?`,
      [id]
    );
    return row ? rowToCommittee(row) : null;
  },

  /** Inserts a new committee row. `subject` is set to '' to satisfy the legacy NOT NULL constraint. */
  insert(c: Committee): void {
    const db = getDB();
    db.runSync(
      `INSERT INTO committees
         (id, name, subject, description, color, start_date, exam_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, '', c.description, c.color, c.startDate, c.examDate, c.createdAt, c.updatedAt]
    );
  },

  /** Updates mutable fields on an existing committee row. */
  update(c: Committee): boolean {
    const db = getDB();
    const result = db.runSync(
      `UPDATE committees
       SET name = ?, description = ?, color = ?, start_date = ?, exam_date = ?, updated_at = ?
       WHERE id = ?`,
      [c.name, c.description, c.color, c.startDate, c.examDate, c.updatedAt, c.id]
    );
    return result.changes > 0;
  },

  /** Deletes a committee row by id. */
  delete(id: string): boolean {
    const db = getDB();
    const result = db.runSync('DELETE FROM committees WHERE id = ?', [id]);
    return result.changes > 0;
  },
};
