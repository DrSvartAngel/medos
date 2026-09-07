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

export type MockProviderMode = 'normal' | 'malformed' | 'bad_grounding' | 'unavailable';

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

    const source = request.sources?.[0];

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

    // Normal mode: produce 3 deterministic drafts with verbatim source excerpts
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
