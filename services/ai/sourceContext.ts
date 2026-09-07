// MedOS — Phase 10 Step 2: AI Source Context Adapter
// Pure converter from persisted study material entities to provider-neutral AI context.

import type { AISourceContext } from '@/models/ai';
import type { Topic } from '@/models/curriculum';
import type { StudySource } from '@/models/studySource';

/**
 * Converts a persistent StudySource and Topic entity into a provider-neutral AISourceContext.
 * Pure mapping helper; executes zero database queries and references zero AI vendor SDKs.
 */
export function toAISourceContext(
  source: StudySource,
  topic: Topic
): AISourceContext {
  return {
    sourceId: source.id,
    sourceTitle: source.title,
    topicId: topic.id,
    topicName: topic.name,
    content: source.content,
  };
}
