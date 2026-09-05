import React, { useCallback, useState } from 'react';
import { AppState, BackHandler } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import { buildExamPlan, type ExamPlan } from '@/utils/examPlanRules';
import { subjectRouteId, subjectFallback } from '@/utils/subjectRoutes';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useTranslation } from '@/i18n';

type Data = { status: 'ready'; name: string; plan: ExamPlan } | { status: 'loading' | 'missing' | 'error' };
export default function ExamPlanScreen() {
  const id = subjectRouteId(useLocalSearchParams<{ id?: string | string[] }>().id);
  const t = useTranslation();
  const [data, setData] = useState<Data>({ status: 'loading' });
  const [visibleDays, setVisibleDays] = useState(14);
  const back = useCallback(() => {
    try { router.dismissTo(subjectFallback(id) as Href); }
    catch { router.dismissTo('/(tabs)/committees'); }
  }, [id]);
  const load = useCallback(() => {
    setVisibleDays(14);
    if (!id) { setData({ status: 'missing' }); return; }
    try {
      const committee = committeeRepo.getById(id);
      if (!committee) { setData({ status: 'missing' }); return; }
      const topics = topicRepo.listForExamPlan(id);
      setData({ status: 'ready', name: committee.name, plan: buildExamPlan(committee.examDate, topics) });
    } catch { setData({ status: 'error' }); }
  }, [id]);
  useFocusEffect(useCallback(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timeout); load();
      const now = new Date(); const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timeout = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime()));
    };
    refresh();
    const app = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const hardware = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => { clearTimeout(timeout); app.remove(); hardware.remove(); };
  }, [load, back]));
  const plan = data.status === 'ready' ? data.plan : null;
  return <ScreenWrapper includeBottomSafeArea><Section>
    <Button label={t.common.back} variant="ghost" onPress={back} />
    <AppText variant="h2">{t.examPlan.title}</AppText>
    {data.status === 'loading' && <FeedbackState kind="loading" message={t.common.loading} />}
    {data.status === 'missing' && <FeedbackState kind="empty" message={t.examPlan.missing} />}
    {data.status === 'error' && <FeedbackState kind="error" message={t.examPlan.error}
      action={{ label: t.common.retry, onPress: load }} />}
    {data.status === 'ready' && <AppText variant="h3">{data.name}</AppText>}
    {plan && plan.status !== 'ready' && <FeedbackState kind="empty" message={t.examPlan.states[plan.status]}
      action={{ label: t.examPlan.backToCommittee, onPress: back }} />}
    {plan?.status === 'ready' && <>
      <AppText>{t.examPlan.examDate(plan.examDate)}</AppText>
      <AppText>{t.examPlan.summary(plan.studyDays, plan.totalTopics)}</AppText>
      <AppText>{t.examPlan.explanation}</AppText>
      {plan.days.slice(0, visibleDays).map(day => <Card key={day.date}><Section
        title={day.date === plan.today ? t.examPlan.today : t.examPlan.date(day.date)}>
        <AppText>{t.examPlan.topicCount(day.topics.length)}</AppText>
        {day.topics.map(topic => <Button key={topic.id} variant="ghost"
          label={t.examPlan.openTopic(topic.name, topic.subjectName)}
          onPress={() => router.push(`/topics/${encodeURIComponent(topic.id)}` as Href)} />)}
      </Section></Card>)}
      {visibleDays < plan.days.length && <Button label={t.examPlan.more} variant="secondary"
        onPress={() => setVisibleDays(value => value + 14)} />}
      {plan.unassignedDays > 0 && <AppText>{t.examPlan.unassigned(plan.unassignedDays)}</AppText>}
    </>}
  </Section></ScreenWrapper>;
}
