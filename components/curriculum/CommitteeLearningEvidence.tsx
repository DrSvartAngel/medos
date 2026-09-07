import React, { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { qbankRepo } from '@/db/repositories/qbankRepo';
import type { QBankEvidenceSummary } from '@/models/qbank';
import { filterCommitteeEvidence, summarizeCommitteeEvidence, type CommitteeSubjectEvidence } from '@/utils/committeeEvidenceRules';
import { useTranslation } from '@/i18n';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';

export function CommitteeLearningEvidence({ committeeId }: { committeeId: string }) {
  const t = useTranslation();
  const [rows, setRows] = useState<CommitteeSubjectEvidence[] | null | undefined>(undefined);
  const [qbankEvidence, setQBankEvidence] = useState<QBankEvidenceSummary | null>(null);
  const [qbankError, setQBankError] = useState(false);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [visible, setVisible] = useState(50);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    setVisible(50);
    const refresh = () => {
      clearTimeout(timer);
      try {
        const next = memoryRepo.getCommitteeLearningEvidence(committeeId);
        setRows(next);
        const deadline = summarizeCommitteeEvidence(next).nextReviewAt;
        if (deadline !== null) timer = setTimeout(refresh, Math.max(1, Math.min(2147483647, deadline - Date.now())));
      } catch { setRows(null); }
      try {
        setQBankEvidence(qbankRepo.getCommitteeEvidence(committeeId));
        setQBankError(false);
      } catch {
        setQBankEvidence(null);
        setQBankError(true);
      }
    };
    refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); listener.remove(); };
  }, [committeeId, attempt]));
  const totals = rows ? summarizeCommitteeEvidence(rows) : null;
  const filtered = rows ? filterCommitteeEvidence(rows, attentionOnly) : [];
  return <Section title={t.topicEvidence.title}>
    {rows === undefined ? <FeedbackState kind="loading" message={t.common.loading} />
      : rows === null ? <FeedbackState kind="error" message={t.memoryTopic.evidenceError}
        action={{label:t.common.retry,onPress:()=>setAttempt(n=>n+1)}} />
      : totals && <>
        <AppText>{t.committeeEvidence.subjects(totals.subjects)}</AppText>
        <AppText>{t.subjectEvidence.topics(totals.topics)}</AppText>
        <AppText>{t.subjectEvidence.studied(totals.studiedTopics)}</AppText>
        <AppText>{t.topicEvidence.cards(totals.linkedCards)}</AppText>
        <AppText>{t.committeeEvidence.reviews(totals.linkedReviews)}</AppText>
        <AppText>{t.topicEvidence.due(totals.dueCards)}</AppText>
        <AppText>{t.subjectEvidence.attention(totals.attentionTopics)}</AppText>
        <AppText>{t.committeeEvidence.attentionSubjects(totals.attentionSubjects)}</AppText>
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
        <AppText>{t.committeeEvidence.help}</AppText>

        <Button label={attentionOnly ? t.committeeEvidence.all : t.subjectEvidence.selected(t.committeeEvidence.all)} variant="secondary"
          onPress={()=>{setAttentionOnly(false);setVisible(50);}} />
        <Button label={attentionOnly ? t.subjectEvidence.selected(t.subjectEvidence.filter) : t.subjectEvidence.filter} variant="secondary"
          onPress={()=>{setAttentionOnly(true);setVisible(50);}} />
        {filtered.length === 0 && <FeedbackState kind="empty" message={attentionOnly ? t.committeeEvidence.noneAttention : t.committeeEvidence.empty} />}
        {filtered.slice(0,visible).map(row => <Section key={row.id}>
          <Button label={row.name} accessibilityLabel={t.committeeEvidence.open(row.name)} variant="ghost"
            onPress={()=>router.push(`/subjects/${encodeURIComponent(row.id)}` as Href)} />
          <AppText>{t.subjectEvidence.topics(row.topics)}</AppText>
          <AppText>{t.subjectEvidence.studied(row.studiedTopics)}</AppText>
          <AppText>{t.subjectEvidence.row(row.linkedCards,row.linkedReviews,row.dueCards)}</AppText>
          <AppText>{t.subjectEvidence.attention(row.attentionTopics)}</AppText>
        </Section>)}
        {filtered.length > visible && <Button label={t.committeeEvidence.more} variant="secondary" onPress={()=>setVisible(n=>n+50)} />}
      </>}
  </Section>;
}
