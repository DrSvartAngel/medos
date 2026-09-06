import React, { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { useMemoryStore } from '@/store/useMemoryStore';
import { useTranslation } from '@/i18n';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';

export function MemorySchedulePanel({ deckId }: { deckId: string }) {
  const t = useTranslation();
  const [summary, setSummary] = useState<ReturnType<typeof memoryRepo.getScheduleSummary> | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      try {
        const next = memoryRepo.getScheduleSummary(deckId);
        setSummary(next); setFailed(false);
        useMemoryStore.getState().loadCards(deckId);
        if (next.nextReviewAt !== null) timer = setTimeout(refresh, Math.max(1, Math.min(2147483647, next.nextReviewAt - Date.now())));
      } catch { setSummary(null); setFailed(true); }
    };
    refresh();
    const app = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); app.remove(); };
  }, [deckId, attempt]));
  return <Section>
    {failed ? <FeedbackState kind="error" message={t.scheduling.error}
      action={{ label:t.common.retry, onPress:()=>setAttempt(n=>n+1) }} /> : summary ? <>
      <AppText>{t.scheduling.counts(summary.due,summary.newCards,summary.unscheduled)}</AppText>
      {summary.nextReviewAt !== null && <AppText>{t.scheduling.next(summary.nextReviewAt)}</AppText>}
    </> : <FeedbackState kind="loading" message={t.common.loading} />}
    <AppText>{t.scheduling.explanation}</AppText>
    <Button label={t.scheduling.reviewDue} variant="secondary"
      onPress={()=>router.push(`/decks/${encodeURIComponent(deckId)}/review?mode=due` as Href)} />
  </Section>;
}
