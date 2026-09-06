import React, { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { filterSubjectEvidence, summarizeSubjectEvidence, type SubjectTopicEvidence } from '@/utils/subjectEvidenceRules';
import { topicReviewEvidenceState } from '@/utils/topicEvidenceRules';
import { useTranslation } from '@/i18n';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';

export function SubjectLearningEvidence({ subjectId }: { subjectId: string }) {
  const t = useTranslation();
  const [rows, setRows] = useState<SubjectTopicEvidence[] | null | undefined>(undefined);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [visible, setVisible] = useState(50);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setVisible(50);
    const refresh = () => {
      clearTimeout(timer);
      try {
        const next = memoryRepo.getSubjectLearningEvidence(subjectId);
        setRows(next);
        const deadline = summarizeSubjectEvidence(next).nextReviewAt;
        if (deadline !== null) timer = setTimeout(refresh, Math.max(1, Math.min(2147483647, deadline - Date.now())));
      } catch { setRows(null); }
    };
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [subjectId, attempt]));
  const totals = rows ? summarizeSubjectEvidence(rows) : null;
  const filtered = rows ? filterSubjectEvidence(rows, attentionOnly) : [];
  return <Section title={t.topicEvidence.title}>
    {rows === undefined ? <FeedbackState kind="loading" message={t.common.loading} />
      : rows === null ? <FeedbackState kind="error" message={t.memoryTopic.evidenceError}
        action={{label:t.common.retry,onPress:()=>setAttempt(n=>n+1)}} />
      : totals && <>
        <AppText>{t.subjectEvidence.topics(totals.topics)}</AppText>
        <AppText>{t.subjectEvidence.studied(totals.studiedTopics)}</AppText>
        <AppText>{t.topicEvidence.cards(totals.linkedCards)}</AppText>
        <AppText>{t.subjectEvidence.reviews(totals.linkedReviews)}</AppText>
        <AppText>{t.topicEvidence.due(totals.dueCards)}</AppText>
        <AppText>{t.subjectEvidence.attention(totals.attentionTopics)}</AppText>
        <AppText>{t.subjectEvidence.help}</AppText>
        <Button label={attentionOnly ? t.subjectEvidence.all : t.subjectEvidence.selected(t.subjectEvidence.all)} variant="secondary"
          onPress={()=>{setAttentionOnly(false);setVisible(50);}} />
        <Button label={attentionOnly ? t.subjectEvidence.selected(t.subjectEvidence.filter) : t.subjectEvidence.filter} variant="secondary"
          onPress={()=>{setAttentionOnly(true);setVisible(50);}} />
        {filtered.length === 0 && <FeedbackState kind="empty" message={attentionOnly ? t.subjectEvidence.noneAttention : t.subjectEvidence.empty} />}
        {filtered.slice(0,visible).map(row => <Section key={row.id}>
          <Button label={row.name} accessibilityLabel={t.subjectEvidence.open(row.name)} variant="ghost"
            onPress={()=>router.push(`/topics/${encodeURIComponent(row.id)}` as Href)} />
          <AppText>{row.studyRecorded === 1 ? t.topics.studyRecorded : t.topics.studyUnrecorded}</AppText>
          <AppText>{t.subjectEvidence.row(row.linkedCards,row.linkedReviews,row.dueCards)}</AppText>
          <AppText>{t.topicEvidence[topicReviewEvidenceState(row)]}</AppText>
        </Section>)}
        {filtered.length > visible && <Button label={t.subjectEvidence.more} variant="secondary" onPress={()=>setVisible(n=>n+50)} />}
      </>}
  </Section>;
}
