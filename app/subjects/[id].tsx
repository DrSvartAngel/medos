import React, { useCallback, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { TopicList } from '@/components/curriculum/TopicList';
import { SubjectLearningEvidence } from '@/components/curriculum/SubjectLearningEvidence';
import { Section } from '@/components/ui/Section';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import type { Subject } from '@/models/curriculum';
import type { Committee } from '@/store/useCommitteeStore';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useTranslation } from '@/i18n';
import { subjectFallback, subjectRouteId } from '@/utils/subjectRoutes';

type Data = { status: 'ready'; subject: Subject; committee: Committee }
  | { status: 'loading' | 'missing' | 'error' };
export default function SubjectDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = subjectRouteId(params.id);
  const t = useTranslation();
  const [data, setData] = useState<Data>({ status: 'loading' });
  const [count, setCount] = useState<number | null>(null);
  const [countError, setCountError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const deleting = useRef(false);
  const context = useRef({ id, committeeId: '' });
  const loadCount = useCallback(() => {
    setCount(null); setCountError(false);
    try { setCount(topicRepo.countBySubject(id)); } catch { setCountError(true); }
  }, [id]);
  const load = useCallback(() => {
    if (context.current.id !== id) context.current = { id, committeeId: '' };
    setData({ status: 'loading' }); setDeleteError(false);
    if (!id) { setData({ status: 'missing' }); return; }
    try {
      const subject = subjectRepo.getById(id);
      const committee = subject ? committeeRepo.getById(subject.committeeId) : null;
      if (committee) context.current.committeeId = committee.id;
      if (!subject || !committee) { setData({ status: 'missing' }); return; }
      setData({ status: 'ready', subject, committee });
      loadCount();
    } catch { setData({ status: 'error' }); }
  }, [id, loadCount]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  function parentTarget(): Href {
    try { return subjectFallback(context.current.committeeId) as Href; }
    catch { return '/(tabs)/committees'; }
  }
  function back() {
    router.dismissTo(parentTarget());
  }
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [id]));
  function remove() {
    if (data.status !== 'ready' || deleting.current) return;
    const subject = data.subject;
    Alert.alert(t.subjects.removeTitle, t.subjects.removeWarning(subject.name), [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.subjects.remove, style: 'destructive', onPress: () => {
        if (deleting.current) return;
        deleting.current = true;
        try {
          if (!subjectRepo.delete(subject.id)) { setDeleteError(true); return; }
        } catch { setDeleteError(true); return; }
        finally { deleting.current = false; }
        // Never back into the deleted Subject, including direct-route entry.
        router.dismissTo(parentTarget());
      } },
    ]);
  }
  return <ScreenWrapper includeBottomSafeArea>
    <Section>
      <Button label={t.common.back} variant="ghost" onPress={back} />
      {data.status === 'loading' && <FeedbackState kind="loading" message={t.common.loading} />}
      {data.status === 'missing' && <FeedbackState kind="empty" message={t.subjects.missing} />}
      {data.status === 'error' && <FeedbackState kind="error" message={t.subjects.loadError}
        action={{ label: t.common.retry, onPress: load }} />}
      {data.status === 'ready' && <>
        <AppText variant="h2">{data.subject.name}</AppText>
        <Button label={t.subjects.parent(data.committee.name)} variant="ghost" onPress={() => router.dismissTo(parentTarget())} />
        {data.subject.description ? <AppText>{data.subject.description}</AppText> : null}
        {count !== null && <AppText>{t.subjects.topicCount(count)}</AppText>}
        {countError && <FeedbackState kind="error" message={t.subjects.countError}
          action={{ label: t.common.retry, onPress: loadCount }} />}
        <Button label={t.subjects.edit} variant="secondary" onPress={() => router.push(`/subjects/edit/${encodeURIComponent(id)}` as Href)} />
        {deleteError && <FeedbackState kind="error" message={t.subjects.deleteError} />}
        <Button label={t.subjects.remove} variant="danger" onPress={remove} />
        <TopicList key={data.subject.id} subjectId={data.subject.id} />
        <SubjectLearningEvidence key={`evidence-${data.subject.id}`} subjectId={data.subject.id} />
      </>}
    </Section>
  </ScreenWrapper>;
}
