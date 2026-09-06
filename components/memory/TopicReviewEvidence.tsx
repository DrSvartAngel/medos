import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { useTranslation } from '@/i18n';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { FeedbackState } from '@/components/ui/FeedbackState';

export function TopicReviewEvidence({ topicId }: { topicId: string }) {
  const t = useTranslation();
  const [recorded, setRecorded] = useState<boolean | null | undefined>(undefined);
  const refresh = useCallback(() => {
    try { setRecorded(memoryRepo.hasTopicReviewActivity(topicId)); }
    catch { setRecorded(null); }
  }, [topicId]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return <Section title={t.memoryTopic.evidenceTitle}>
    {recorded === undefined ? <FeedbackState kind="loading" message={t.common.loading} />
      : recorded === null ? <FeedbackState kind="error" message={t.memoryTopic.evidenceError}
      action={{label:t.common.retry,onPress:refresh}} />
      : <AppText>{recorded ? t.memoryTopic.recorded : t.memoryTopic.unrecorded}</AppText>}
    <AppText>{t.memoryTopic.evidenceHelp}</AppText>
  </Section>;
}
