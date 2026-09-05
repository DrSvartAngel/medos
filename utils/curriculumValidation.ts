import type { CurriculumListOptions } from '@/models/curriculum';

export const CURRICULUM_NAME_MAX = 120;
export const CURRICULUM_DESCRIPTION_MAX = 2000;
export const TOPIC_LEARNING_OBJECTIVES_MAX = 2000;

export function validateLearningObjectives(value: unknown):
  | { valid: true; learningObjectives: string }
  | { valid: false; error: 'learning_objectives_invalid' | 'learning_objectives_too_long' } {
  if (value !== undefined && typeof value !== 'string') {
    return { valid: false, error: 'learning_objectives_invalid' };
  }
  const learningObjectives = typeof value === 'string' ? value.trim() : '';
  if (learningObjectives.length > TOPIC_LEARNING_OBJECTIVES_MAX) {
    return { valid: false, error: 'learning_objectives_too_long' };
  }
  return { valid: true, learningObjectives };
}

export type CurriculumValidationResult =
  | { valid: true; name: string; description: string }
  | { valid: false; error: 'name_required' | 'name_too_long' | 'description_invalid' | 'description_too_long' };

/** Pure shared boundary for repositories and future forms. Lengths use JS UTF-16 units. */
export function validateCurriculum(input: { name: unknown; description?: unknown }): CurriculumValidationResult {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name) return { valid: false, error: 'name_required' };
  if (name.length > CURRICULUM_NAME_MAX) return { valid: false, error: 'name_too_long' };
  if (input.description != null && typeof input.description !== 'string') {
    return { valid: false, error: 'description_invalid' };
  }
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length > CURRICULUM_DESCRIPTION_MAX) return { valid: false, error: 'description_too_long' };
  return { valid: true, name, description };
}

export function assertCurriculumIdentity(id: string, parentId: string, createdAt: number, updatedAt: number): void {
  if (typeof id !== 'string' || !id.trim() || typeof parentId !== 'string' || !parentId.trim()) {
    throw new Error('curriculum_id_required');
  }
  if (![createdAt, updatedAt].every(value => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('curriculum_timestamp_invalid');
  }
}

export function curriculumPage(options: CurriculumListOptions = {}): { limit: number; offset: number } {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200 || !Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('curriculum_page_invalid');
  }
  return { limit, offset };
}
