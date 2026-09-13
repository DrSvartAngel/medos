import { getDB } from '../client';
import type { Topic, CurriculumListOptions } from '@/models/curriculum';
import type { ExamPlanTopic } from '@/utils/examPlanRules';
import { assertCurriculumIdentity, curriculumPage, validateCurriculum, validateLearningObjectives } from '@/utils/curriculumValidation';

interface Row {
  id: string;
  subject_id: string;
  name: string;
  description: string;
  learning_objectives: string;
  created_at: number;
  updated_at: number;
}

function fromRow(row: Row): Topic {
  return { id: row.id, subjectId: row.subject_id, name: row.name,
    description: row.description, learningObjectives: row.learning_objectives, createdAt: row.created_at, updatedAt: row.updated_at };
}

const SELECT = 'SELECT id, subject_id, name, description, learning_objectives, created_at, updated_at FROM topics';

function validate(record: Topic) {
  assertCurriculumIdentity(record.id, record.subjectId, record.createdAt, record.updatedAt);
  const result = validateCurriculum(record);
  if (!result.valid) throw new Error(result.error);
  const objectives = validateLearningObjectives(record.learningObjectives);
  if (!objectives.valid) throw new Error(objectives.error);
  if (!getDB().getFirstSync('SELECT id FROM subjects WHERE id = ?', [record.subjectId])) {
    throw new Error('subject_not_found');
  }
  return { ...result, learningObjectives: objectives.learningObjectives };
}

export const topicRepo = {
  /** Complete Committee scope, names only; never infer total workload from a paginated list. */
  listForExamPlan(committeeId: string): ExamPlanTopic[] {
    if (typeof committeeId !== 'string' || !committeeId.trim()) throw new Error('committee_id_required');
    return getDB().getAllSync<ExamPlanTopic>(
      `SELECT t.id, t.name, s.name AS subjectName FROM topics t
       JOIN subjects s ON s.id = t.subject_id WHERE s.committee_id = ?
       ORDER BY s.created_at ASC, s.id ASC, t.created_at ASC, t.id ASC`, [committeeId]
    );
  },
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
      'INSERT INTO topics (id, subject_id, name, description, learning_objectives, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [record.id, record.subjectId, value.name, value.description, value.learningObjectives, record.createdAt, record.updatedAt]
    );
  },

  /** Creation time is immutable; subjectId can change if destination subject exists. */
  update(record: Topic): boolean {
    const value = validate(record);
    return getDB().runSync(
      'UPDATE topics SET subject_id = ?, name = ?, description = ?, learning_objectives = ?, updated_at = ? WHERE id = ?',
      [record.subjectId, value.name, value.description, value.learningObjectives, record.updatedAt, record.id]
    ).changes > 0;
  },

  delete(id: string): boolean {
    return getDB().runSync('DELETE FROM topics WHERE id = ?', [id]).changes > 0;
  },
};
