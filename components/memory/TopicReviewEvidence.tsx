import React, { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { qbankRepo } from '@/db/repositories/qbankRepo';
import type { QBankEvidenceSummary } from '@/models/qbank';
import { useTranslation } from '@/i18n';
import { topicReviewEvidenceState } from '@/utils/topicEvidenceRules';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { FeedbackState } from '@/components/ui/FeedbackState';

export function TopicReviewEvidence({ topicId }: { topicId: string }) {
  const t = useTranslation();
  const [evidence, setEvidence] = useState<ReturnType<typeof memoryRepo.getTopicLearningEvidence> | null | undefined>(undefined);
  const [qbankEvidence, setQBankEvidence] = useState<QBankEvidenceSummary | null>(null);
  const [qbankError, setQBankError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      try {
        const next = memoryRepo.getTopicLearningEvidence(topicId);
        setEvidence(next);
        if (next.nextReviewAt !== null) timer = setTimeout(refresh,
          Math.max(1, Math.min(2147483647, next.nextReviewAt - Date.now())));
      } catch { setEvidence(null); }
      try {
        setQBankEvidence(qbankRepo.getTopicEvidence(topicId));
        setQBankError(false);
      } catch {
        setQBankEvidence(null);
        setQBankError(true);
      }
    };
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [topicId, attempt]));
  return <Section title={t.topicEvidence.title}>
    {evidence === undefined ? <FeedbackState kind="loading" message={t.common.loading} />
      : evidence === null ? <FeedbackState kind="error" message={t.memoryTopic.evidenceError}
      action={{label:t.common.retry,onPress:()=>setAttempt(n=>n+1)}} />
      : <>
        <AppText>{t.topicEvidence[topicReviewEvidenceState(evidence)]}</AppText>
        <AppText>{t.topicEvidence.cards(evidence.linkedCards)}</AppText>
        <AppText>{t.topicEvidence.reviews(evidence.linkedReviews)}</AppText>
        <AppText>{t.topicEvidence.due(evidence.dueCards)}</AppText>
        {qbankError ? (
          <FeedbackState
            kind="error"
            message={t.qbank.evidence.error}
            action={{ label: t.common.retry, onPress: () => setAttempt(n => n + 1) }}
          />
        ) : qbankEvidence && qbankEvidence.totalQuestions > 0 ? (
          <>
            <AppText>{t.qbank.evidence.questions(qbankEvidence.totalQuestions)}</AppText>
            <AppText>{t.qbank.evidence.accuracy(qbankEvidence.accuracyPercent ?? 0)}</AppText>
          </>
        ) : (
          <AppText>{t.qbank.evidence.noPractice}</AppText>
        )}
      </>}
    <AppText>{t.topicEvidence.help}</AppText>
  </Section>;
}

