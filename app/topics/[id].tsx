import React, { useCallback, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import type { Topic, Subject } from '@/models/curriculum';
import type { Committee } from '@/store/useCommitteeStore';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useTranslation } from '@/i18n';
import { topicFallback, topicRouteId } from '@/utils/topicRoutes';

type Data = { status: 'ready'; topic: Topic; subject: Subject; committee: Committee }
  | { status: 'loading' | 'missing' | 'error' };
export default function TopicDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = topicRouteId(params.id);
  const t = useTranslation();
  const [data, setData] = useState<Data>({ status: 'loading' });
  const [deleteError, setDeleteError] = useState(false);
  const deleting = useRef(false);
  const context = useRef({ id, committeeId: '', subjectId: '' });
  const load = useCallback(() => {
    if (context.current.id !== id) context.current = { id, committeeId: '', subjectId: '' };
    setData({ status: 'loading' }); setDeleteError(false);
    if (!id) { setData({ status: 'missing' }); return; }
    try {
      const topic = topicRepo.getById(id);
      const subject = topic ? subjectRepo.getById(topic.subjectId) : null;
      if (subject) context.current = { id, committeeId: subject.committeeId, subjectId: subject.id };
      const committee = subject ? committeeRepo.getById(subject.committeeId) : null;
      setData(topic && subject && committee ? { status: 'ready', topic, subject, committee } : { status: 'missing' });
    } catch { setData({ status: 'error' }); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  function target(committeeOnly = false): Href {
    try { return topicFallback(context.current.committeeId, committeeOnly ? '' : context.current.subjectId) as Href; }
    catch { return '/(tabs)/committees'; }
  }
  function remove() {
    if (data.status !== 'ready' || deleting.current) return;
    const topic = data.topic;
    Alert.alert(t.topics.removeTitle, t.topics.removeWarning(topic.name), [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.topics.remove, style: 'destructive', onPress: () => {
        if (deleting.current) return;
        deleting.current = true;
        try {
          if (!topicRepo.delete(topic.id)) { setDeleteError(true); return; }
        } catch { setDeleteError(true); return; }
        finally { deleting.current = false; }
        router.dismissTo(target());
      } },
    ]);
  }
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo(target()); return true;
    });
    return () => listener.remove();
  }, [id]));
  return <ScreenWrapper includeBottomSafeArea><Section>
    <Button label={t.common.back} variant="ghost" onPress={() => router.dismissTo(target())} />
    {data.status === 'loading' && <FeedbackState kind="loading" message={t.common.loading} />}
    {data.status === 'missing' && <FeedbackState kind="empty" message={t.topics.missing} />}
    {data.status === 'error' && <FeedbackState kind="error" message={t.topics.loadError} action={{ label: t.common.retry, onPress: load }} />}
    {data.status === 'ready' && <>
      <AppText variant="h2">{data.topic.name}</AppText>
      <Button label={t.topics.parent(data.subject.name)} variant="ghost" onPress={() => router.dismissTo(target())} />
      <Button label={t.topics.committee(data.committee.name)} variant="ghost" onPress={() => router.dismissTo(target(true))} />
      {data.topic.description ? <AppText>{data.topic.description}</AppText> : null}
      {data.topic.learningObjectives.trim() !== '' && <Section title={t.topics.learningObjectives}>
        <AppText>{data.topic.learningObjectives}</AppText>
      </Section>}
      <Button label={t.topics.edit} variant="secondary" onPress={() => router.push(`/topics/edit/${encodeURIComponent(id)}` as Href)} />
      {deleteError && <FeedbackState kind="error" message={t.topics.deleteError} />}
      <Button label={t.topics.remove} variant="danger" onPress={remove} />
    </>}
  </Section></ScreenWrapper>;
}
