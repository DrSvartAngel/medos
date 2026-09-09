import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ReviewSession } from '@/components/memory/ReviewSession';

export default function MemoryReviewScreen() {
  const { topicId, deckId, mode, returnTo } = useLocalSearchParams<{
    topicId?: string;
    deckId?: string;
    mode?: string | string[];
    returnTo?: string;
  }>();

  if (topicId) {
    return (
      <ReviewSession
        scope={{ type: 'topic', topicId }}
        mode={mode}
        returnTo={returnTo}
      />
    );
  }

  if (deckId) {
    return (
      <ReviewSession
        scope={{ type: 'deck', deckId }}
        mode={mode}
        returnTo={returnTo}
      />
    );
  }

  return null;
}
