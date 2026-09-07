// MedOS — Phase 10 Step 1: Deterministic Mock AI Provider
// Zero-network, zero-credential test provider supporting multiple deterministic test modes.

import {
  AIGenerateStructuredRequest,
  AIGenerateTextRequest,
  AIGenerateTextResult,
  AIProvider,
  AIProviderHealth,
  AIProviderId,
} from '@/models/ai';

export type MockProviderMode =
  | 'normal'
  | 'malformed'
  | 'bad_grounding'
  | 'unavailable'
  | 'invalid_correct_index'
  | 'empty_options'
  | 'empty_result';

export class MockAIProvider implements AIProvider {
  readonly id: AIProviderId = 'mock';
  readonly name = 'Mock AI Provider';

  private mode: MockProviderMode;

  constructor(initialMode: MockProviderMode = 'normal') {
    this.mode = initialMode;
  }

  setMode(mode: MockProviderMode): void {
    this.mode = mode;
  }

  getMode(): MockProviderMode {
    return this.mode;
  }

  async generateText(request: AIGenerateTextRequest): Promise<AIGenerateTextResult> {
    if (this.mode === 'unavailable') {
      throw new Error('Mock AI provider connection failed: 503 Service Unavailable');
    }

    if (this.mode === 'malformed') {
      return { text: '', providerId: 'mock' };
    }

    const source = request.sources?.[0];
    const sourceTitle = source ? source.sourceTitle : 'Supplied Source';
    const topicName = source ? source.topicName : 'Medical Topic';

    const text = `[Mock Grounded Answer] Based strictly on "${sourceTitle}" for topic "${topicName}": ` +
      `The study material states that cellular and molecular mechanisms proceed according to physiological principles.`;

    return {
      text,
      providerId: 'mock',
    };
  }

  async generateStructured<T>(request: AIGenerateStructuredRequest): Promise<T> {
    if (this.mode === 'unavailable') {
      throw new Error('Mock AI provider connection failed: 503 Service Unavailable');
    }

    if (this.mode === 'malformed') {
      // Returns non-array / invalid payload
      return { invalid: true } as unknown as T;
    }

    if (this.mode === 'empty_result') {
      return [] as unknown as T;
    }

    const source = request.sources?.[0];
    const isQuestionRequest =
      request.schemaDescription.includes('correctOptionIndex') ||
      request.userPrompt.toLowerCase().includes('question draft') ||
      request.userPrompt.toLowerCase().includes('practice question');

    if (isQuestionRequest) {
      if (this.mode === 'invalid_correct_index') {
        return [
          {
            question: 'Which mechanism is correct?',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctOptionIndex: 99, // Out of bounds
            explanation: 'Invalid index test explanation.',
            sourceExcerpt: source?.content?.slice(0, 30) || 'Medical study excerpt.',
          },
        ] as unknown as T;
      }

      if (this.mode === 'empty_options') {
        return [
          {
            question: 'Which option is missing?',
            options: ['Option A', '', 'Option C', 'Option D'],
            correctOptionIndex: 0,
            explanation: 'Empty option test explanation.',
            sourceExcerpt: source?.content?.slice(0, 30) || 'Medical study excerpt.',
          },
        ] as unknown as T;
      }

      if (this.mode === 'bad_grounding') {
        return [
          {
            question: 'What is the ungrounded question?',
            options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correctOptionIndex: 0,
            explanation: 'Ungrounded test explanation.',
            sourceExcerpt: 'This exact sentence does not appear anywhere in the student lecture notes 98765.',
          },
        ] as unknown as T;
      }

      // Normal mode: produce 2 deterministic question drafts with verbatim excerpts
      const content = source?.content || 'Default medical study notes.';
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 5);

      const excerpt1 = lines[0] || content.slice(0, Math.min(content.length, 60));
      const excerpt2 = lines.length > 1 ? lines[1] : excerpt1;

      const questions = [
        {
          question: `According to ${source?.sourceTitle || 'the notes'}, which statement is correct?`,
          options: [
            `Finding confirmed: "${excerpt1.slice(0, 30)}..."`,
            'Plausible distractor mechanism A',
            'Plausible distractor mechanism B',
            'Plausible distractor mechanism C',
          ],
          correctOptionIndex: 0,
          explanation: `The source material directly confirms this: "${excerpt1}".`,
          sourceExcerpt: excerpt1,
        },
        {
          question: `What secondary characteristic is noted in ${source?.topicName || 'the curriculum'}?`,
          options: [
            'Unrelated physiological response',
            `Finding confirmed: "${excerpt2.slice(0, 30)}..."`,
            'Incorrect clinical parameter',
            'Opposite physiological effect',
          ],
          correctOptionIndex: 1,
          explanation: `Directly supported by the text: "${excerpt2}".`,
          sourceExcerpt: excerpt2,
        },
      ];

      return questions as unknown as T;
    }

    // Flashcard structured generation
    if (this.mode === 'bad_grounding') {
      // Returns drafts with fabricated source excerpts not in source.content
      const fakeDrafts = [
        {
          front: 'What is the fabricated mechanism of disease?',
          back: 'This is an ungrounded hallucination.',
          sourceExcerpt: 'This exact sentence does not appear anywhere in the student lecture notes 98765.',
        },
      ];
      return fakeDrafts as unknown as T;
    }

    // Normal mode: produce 2 deterministic drafts with verbatim source excerpts
    const content = source?.content || 'Default medical study notes.';
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    // Pick real excerpts from the source
    const excerpt1 = lines[0] || content.slice(0, Math.min(content.length, 60));
    const excerpt2 = lines.length > 1 ? lines[1] : excerpt1;

    const drafts = [
      {
        front: `What is the key mechanism described in ${source?.sourceTitle || 'the notes'}?`,
        back: `Primary physiological process outlined in topic ${source?.topicName || 'curriculum'}.`,
        sourceExcerpt: excerpt1,
      },
      {
        front: `What secondary characteristic is noted in ${source?.topicName || 'the topic'}?`,
        back: `Associated clinical feature confirmed by source material.`,
        sourceExcerpt: excerpt2,
      },
    ];

    return drafts as unknown as T;
  }

  async healthCheck(): Promise<AIProviderHealth> {
    if (this.mode === 'unavailable') {
      return { ok: false, message: 'Mock provider offline' };
    }
    return { ok: true, message: 'Mock provider healthy' };
  }
}
