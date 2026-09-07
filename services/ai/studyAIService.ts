// MedOS — Phase 10 Step 1: Study AI Service Foundation
// Vendor-neutral, source-grounded orchestration service for study assistance and active recall drafts.

import {
  AIFlashcardDraft,
  AIQuestionDraft,
  AIExplanationResult,
  AIProvider,
  AIServiceError,
  AISourceContext,
  AISummaryResult,
  AIStudyPlanDraft,
  AIStudyPlanItem,
  AIStudyPlanAction,
  AIStudyPlanningContext,
} from '@/models/ai';
import {
  buildExplainPrompt,
  buildFlashcardDraftPrompt,
  buildQuestionDraftPrompt,
  buildStudyPlanPrompt,
  buildSummarizePrompt,
  isExcerptGrounded,
} from './prompts';

export const MAX_FLASHCARD_DRAFTS = 5;
export const MAX_QUESTION_DRAFTS = 5;
export const MAX_PLAN_ITEMS = 5;

export interface RawDraftItem {
  front: string;
  back: string;
  sourceExcerpt: string;
}

export interface RawQuestionDraftItem {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  sourceExcerpt: string;
}

export interface RawStudyPlanItem {
  id?: string;
  topicId: string;
  topicName?: string;
  action: AIStudyPlanAction;
  reason: string;
  estimatedMinutes: number;
}

export interface RawStudyPlanDraft {
  summary?: string;
  items?: RawStudyPlanItem[];
}

export interface StudyAIService {
  explainConcept(concept: string, source: AISourceContext): Promise<AIExplanationResult>;
  summarizeSource(source: AISourceContext): Promise<AISummaryResult>;
  generateFlashcardDrafts(source: AISourceContext, count?: number): Promise<AIFlashcardDraft[]>;
  generateQuestionDrafts(source: AISourceContext, count?: number): Promise<AIQuestionDraft[]>;
  generateStudyPlan(context: AIStudyPlanningContext): Promise<AIStudyPlanDraft>;
}

function validateSourceContext(source: AISourceContext): void {
  if (!source || typeof source !== 'object') {
    throw new AIServiceError('source_not_supported', 'Source context is missing.');
  }
  if (!source.sourceId || typeof source.sourceId !== 'string' || !source.sourceId.trim()) {
    throw new AIServiceError('source_not_supported', 'Source context missing sourceId.');
  }
  if (!source.topicId || typeof source.topicId !== 'string' || !source.topicId.trim()) {
    throw new AIServiceError('source_not_supported', 'Source context missing topicId.');
  }
  if (!source.content || typeof source.content !== 'string' || !source.content.trim()) {
    throw new AIServiceError('source_not_supported', 'Study material content cannot be empty.');
  }
}

/**
 * Creates an instance of StudyAIService using the provided AIProvider implementation.
 * All operations enforce source grounding, valid provenance, and safety invariants.
 */
export function createStudyAIService(provider: AIProvider): StudyAIService {
  return {
    async explainConcept(concept: string, source: AISourceContext): Promise<AIExplanationResult> {
      validateSourceContext(source);
      if (!concept || typeof concept !== 'string' || !concept.trim()) {
        throw new AIServiceError('invalid_response', 'Concept to explain cannot be empty.');
      }

      const prompt = buildExplainPrompt(concept, source);

      try {
        const result = await provider.generateText({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          sources: [source],
        });

        if (!result || typeof result.text !== 'string' || !result.text.trim()) {
          throw new AIServiceError('invalid_response', 'AI provider returned an empty response.');
        }

        return {
          text: result.text.trim(),
          sourceId: source.sourceId,
          sourceTitle: source.sourceTitle,
        };
      } catch (err: unknown) {
        if (err instanceof AIServiceError) throw err;
        const msg = err instanceof Error ? err.message : 'Provider request failed';
        throw new AIServiceError('provider_unavailable', msg);
      }
    },

    async summarizeSource(source: AISourceContext): Promise<AISummaryResult> {
      validateSourceContext(source);

      const prompt = buildSummarizePrompt(source);

      try {
        const result = await provider.generateText({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          sources: [source],
        });

        if (!result || typeof result.text !== 'string' || !result.text.trim()) {
          throw new AIServiceError('invalid_response', 'AI provider returned an empty response.');
        }

        return {
          text: result.text.trim(),
          sourceId: source.sourceId,
          sourceTitle: source.sourceTitle,
        };
      } catch (err: unknown) {
        if (err instanceof AIServiceError) throw err;
        const msg = err instanceof Error ? err.message : 'Provider request failed';
        throw new AIServiceError('provider_unavailable', msg);
      }
    },

    async generateFlashcardDrafts(
      source: AISourceContext,
      count = MAX_FLASHCARD_DRAFTS
    ): Promise<AIFlashcardDraft[]> {
      validateSourceContext(source);

      if (typeof count !== 'number' || count <= 0) {
        throw new AIServiceError('invalid_response', 'Requested count must be greater than 0.');
      }

      if (count > MAX_FLASHCARD_DRAFTS) {
        throw new AIServiceError(
          'generation_limit_exceeded',
          `Cannot request more than ${MAX_FLASHCARD_DRAFTS} flashcards in a single batch.`
        );
      }

      const prompt = buildFlashcardDraftPrompt(source, count);

      let rawItems: RawDraftItem[];
      try {
        rawItems = await provider.generateStructured<RawDraftItem[]>({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          schemaDescription: prompt.schemaDescription,
          sources: [source],
        });
      } catch (err: unknown) {
        if (err instanceof AIServiceError) throw err;
        const msg = err instanceof Error ? err.message : 'Provider request failed';
        throw new AIServiceError('provider_unavailable', msg);
      }

      if (!Array.isArray(rawItems)) {
        throw new AIServiceError(
          'invalid_response',
          'AI provider failed to return a valid array of flashcard drafts.'
        );
      }

      if (rawItems.length === 0) {
        throw new AIServiceError(
          'invalid_response',
          'AI provider returned an empty list of flashcards.'
        );
      }

      // Enforce batch ceiling
      const boundedItems = rawItems.slice(0, MAX_FLASHCARD_DRAFTS);
      const validatedDrafts: AIFlashcardDraft[] = [];

      for (let i = 0; i < boundedItems.length; i++) {
        const item = boundedItems[i];
        if (!item || typeof item !== 'object') {
          throw new AIServiceError('invalid_response', `Draft at index ${i} is malformed.`);
        }

        const front = typeof item.front === 'string' ? item.front.trim() : '';
        const back = typeof item.back === 'string' ? item.back.trim() : '';
        const sourceExcerpt =
          typeof item.sourceExcerpt === 'string' ? item.sourceExcerpt.trim() : '';

        if (!front || !back || !sourceExcerpt) {
          throw new AIServiceError(
            'invalid_response',
            `Draft at index ${i} is missing front, back, or sourceExcerpt.`
          );
        }

        // Strict grounding verification: excerpt MUST exist in the supplied source content
        if (!isExcerptGrounded(sourceExcerpt, source.content)) {
          throw new AIServiceError(
            'grounding_failed',
            `Draft at index ${i} contains an unverified source excerpt not found in the study material.`
          );
        }

        validatedDrafts.push({
          id: `${source.sourceId}-draft-${i + 1}-${Date.now()}`,
          front,
          back,
          sourceExcerpt,
          sourceId: source.sourceId,
          sourceTitle: source.sourceTitle,
          topicId: source.topicId,
          edited: false,
        });
      }

      return validatedDrafts;
    },

    async generateQuestionDrafts(
      source: AISourceContext,
      count = MAX_QUESTION_DRAFTS
    ): Promise<AIQuestionDraft[]> {
      validateSourceContext(source);

      if (typeof count !== 'number' || count <= 0) {
        throw new AIServiceError('invalid_response', 'Requested count must be greater than 0.');
      }

      if (count > MAX_QUESTION_DRAFTS) {
        throw new AIServiceError(
          'generation_limit_exceeded',
          `Cannot request more than ${MAX_QUESTION_DRAFTS} questions in a single batch.`
        );
      }

      const prompt = buildQuestionDraftPrompt(source, count);

      let rawItems: RawQuestionDraftItem[];
      try {
        rawItems = await provider.generateStructured<RawQuestionDraftItem[]>({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          schemaDescription: prompt.schemaDescription,
          sources: [source],
        });
      } catch (err: unknown) {
        if (err instanceof AIServiceError) throw err;
        const msg = err instanceof Error ? err.message : 'Provider request failed';
        throw new AIServiceError('provider_unavailable', msg);
      }

      if (!Array.isArray(rawItems)) {
        throw new AIServiceError(
          'invalid_response',
          'AI provider failed to return a valid array of question drafts.'
        );
      }

      if (rawItems.length === 0) {
        throw new AIServiceError(
          'invalid_response',
          'AI provider returned an empty list of questions.'
        );
      }

      // Enforce batch ceiling
      const boundedItems = rawItems.slice(0, MAX_QUESTION_DRAFTS);
      const validatedDrafts: AIQuestionDraft[] = [];

      for (let i = 0; i < boundedItems.length; i++) {
        const item = boundedItems[i];
        if (!item || typeof item !== 'object') {
          throw new AIServiceError('invalid_response', `Question draft at index ${i} is malformed.`);
        }

        const question = typeof item.question === 'string' ? item.question.trim() : '';
        if (!question) {
          throw new AIServiceError(
            'invalid_response',
            `Question draft at index ${i} has empty question.`
          );
        }

        if (!Array.isArray(item.options) || item.options.length !== 4) {
          throw new AIServiceError(
            'invalid_response',
            `Question draft at index ${i} must have exactly 4 options.`
          );
        }

        const cleanOptions = item.options.map((o) => (typeof o === 'string' ? o.trim() : ''));
        if (cleanOptions.some((o) => !o)) {
          throw new AIServiceError(
            'invalid_response',
            `Question draft at index ${i} contains empty option(s).`
          );
        }

        if (
          typeof item.correctOptionIndex !== 'number' ||
          !Number.isInteger(item.correctOptionIndex) ||
          item.correctOptionIndex < 0 ||
          item.correctOptionIndex >= 4
        ) {
          throw new AIServiceError(
            'invalid_response',
            `Question draft at index ${i} has invalid correctOptionIndex.`
          );
        }

        const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
        if (!explanation) {
          throw new AIServiceError(
            'invalid_response',
            `Question draft at index ${i} has empty explanation.`
          );
        }

        const sourceExcerpt =
          typeof item.sourceExcerpt === 'string' ? item.sourceExcerpt.trim() : '';
        if (!sourceExcerpt) {
          throw new AIServiceError(
            'invalid_response',
            `Question draft at index ${i} is missing sourceExcerpt.`
          );
        }

        // Strict grounding verification: excerpt MUST exist in the supplied source content
        if (!isExcerptGrounded(sourceExcerpt, source.content)) {
          throw new AIServiceError(
            'grounding_failed',
            `Question draft at index ${i} contains an unverified source excerpt not found in the study material.`
          );
        }

        validatedDrafts.push({
          id: `${source.sourceId}-q-draft-${i + 1}-${Date.now()}`,
          question,
          options: cleanOptions,
          correctOptionIndex: item.correctOptionIndex,
          explanation,
          sourceExcerpt,
          sourceId: source.sourceId,
          sourceTitle: source.sourceTitle,
          topicId: source.topicId,
          edited: false,
        });
      }

      return validatedDrafts;
    },

    async generateStudyPlan(context: AIStudyPlanningContext): Promise<AIStudyPlanDraft> {
      if (!context || typeof context !== 'object') {
        throw new AIServiceError('invalid_response', 'Planning context is missing.');
      }

      if (
        !context.committeeId ||
        typeof context.committeeId !== 'string' ||
        !context.committeeId.trim()
      ) {
        throw new AIServiceError(
          'invalid_response',
          'Committee ID is missing in planning context.'
        );
      }

      if (!Array.isArray(context.topics) || context.topics.length === 0) {
        throw new AIServiceError(
          'invalid_response',
          'Planning context requires at least one topic.'
        );
      }

      const validTopicMap = new Map<string, string>();
      for (const t of context.topics) {
        if (t && t.topicId && typeof t.topicId === 'string') {
          validTopicMap.set(t.topicId.trim(), t.topicName?.trim() || 'Untitled Topic');
        }
      }

      const prompt = buildStudyPlanPrompt(context);

      let rawPayload: unknown;
      try {
        rawPayload = await provider.generateStructured<unknown>({
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          schemaDescription: prompt.schemaDescription,
        });
      } catch (err: unknown) {
        if (err instanceof AIServiceError) throw err;
        const msg = err instanceof Error ? err.message : 'Provider request failed';
        throw new AIServiceError('provider_unavailable', msg);
      }

      let summary = 'Prioritized study plan based on current learning evidence.';
      let rawItems: unknown[] = [];

      if (rawPayload && typeof rawPayload === 'object') {
        if (Array.isArray(rawPayload)) {
          rawItems = rawPayload;
        } else {
          const dict = rawPayload as Record<string, unknown>;
          if (Array.isArray(dict.items)) {
            rawItems = dict.items;
          }
          if (typeof dict.summary === 'string' && dict.summary.trim()) {
            summary = dict.summary.trim();
          }
        }
      } else {
        throw new AIServiceError('invalid_response', 'AI provider failed to return a study plan.');
      }

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        throw new AIServiceError(
          'invalid_response',
          'AI provider returned an empty study plan.'
        );
      }

      const validActions: Set<AIStudyPlanAction> = new Set(['review', 'memory', 'qbank', 'focus']);
      const boundedItems = rawItems.slice(0, MAX_PLAN_ITEMS);
      const validatedItems: AIStudyPlanItem[] = [];

      for (let i = 0; i < boundedItems.length; i++) {
        const item = boundedItems[i] as Record<string, unknown>;
        if (!item || typeof item !== 'object') {
          throw new AIServiceError('invalid_response', `Plan item at index ${i} is malformed.`);
        }

        const topicId = typeof item.topicId === 'string' ? item.topicId.trim() : '';
        if (!topicId || !validTopicMap.has(topicId)) {
          throw new AIServiceError(
            'invalid_response',
            `Plan item at index ${i} references unknown topic ID: ${topicId || 'missing'}`
          );
        }

        const canonicalTopicName = validTopicMap.get(topicId)!;
        if (typeof item.topicName === 'string' && item.topicName.trim().length > 0) {
          if (item.topicName.trim().toLowerCase() !== canonicalTopicName.toLowerCase()) {
            throw new AIServiceError(
              'invalid_response',
              `Plan item at index ${i} has mismatched topicName "${item.topicName}" (expected "${canonicalTopicName}").`
            );
          }
        }

        const action = item.action as AIStudyPlanAction;
        if (!validActions.has(action)) {
          throw new AIServiceError(
            'invalid_response',
            `Plan item at index ${i} has invalid action "${String(item.action)}".`
          );
        }

        const estimatedMinutes = item.estimatedMinutes;
        if (
          typeof estimatedMinutes !== 'number' ||
          !Number.isInteger(estimatedMinutes) ||
          estimatedMinutes < 10 ||
          estimatedMinutes > 90
        ) {
          throw new AIServiceError(
            'invalid_response',
            `Plan item at index ${i} has invalid duration "${String(
              estimatedMinutes
            )}". Must be integer between 10 and 90.`
          );
        }

        const reason = typeof item.reason === 'string' ? item.reason.trim() : '';
        if (!reason) {
          throw new AIServiceError(
            'invalid_response',
            `Plan item at index ${i} has empty reason.`
          );
        }

        validatedItems.push({
          id:
            typeof item.id === 'string' && item.id.trim()
              ? item.id.trim()
              : `plan-item-${topicId}-${i + 1}-${Date.now()}`,
          topicId,
          topicName: canonicalTopicName,
          action,
          reason,
          estimatedMinutes,
        });
      }

      return {
        summary,
        items: validatedItems,
      };
    },
  };
}
