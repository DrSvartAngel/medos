import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { TopicForm } from './TopicForm';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import type { Subject, Topic } from '@/models/curriculum';
import type { Committee } from '@/store/useCommitteeStore';
import { useTranslation } from '@/i18n';
import { topicFallback } from '@/utils/topicRoutes';

type Loaded = { status: 'ready'; subject: Subject; committee: Committee; topic: Topic | null }
  | { status: 'loading' | 'missing' | 'error' };

export function TopicEditor({ id, mode }: { id: string; mode: 'create' | 'edit' }) {
  const t = useTranslation();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const context = useRef({ key: `${mode}:${id}`, committeeId: '', subjectId: '' });
  useEffect(() => {
    const key = `${mode}:${id}`;
    if (context.current.key !== key) context.current = { key, committeeId: '', subjectId: '' };
    setLoaded({ status: 'loading' }); setSaveError(null);
    if (!id) { setLoaded({ status: 'missing' }); return; }
    try {
      const topic = mode === 'edit' ? topicRepo.getById(id) : null;
      if (mode === 'edit' && !topic) { setLoaded({ status: 'missing' }); return; }
      const subject = subjectRepo.getById(topic?.subjectId ?? id);
      if (!subject) { setLoaded({ status: 'missing' }); return; }
      context.current = { key, committeeId: subject.committeeId, subjectId: subject.id };
      const committee = committeeRepo.getById(subject.committeeId);
      setLoaded(committee ? { status: 'ready', subject, committee, topic } : { status: 'missing' });
    } catch { setLoaded({ status: 'error' }); }
  }, [id, mode, attempt]);

  function destination(includeTopic: boolean): Href {
    try { return topicFallback(context.current.committeeId, context.current.subjectId,
      includeTopic ? id : undefined) as Href; }
    catch { return '/(tabs)/committees'; }
  }
  function save(value: { name: string; description: string; learningObjectives: string }): boolean {
    if (loaded.status !== 'ready') return false;
    try {
      const subject = subjectRepo.getById(loaded.subject.id);
      if (!subject || subject.committeeId !== loaded.committee.id || !committeeRepo.getById(subject.committeeId)) {
        setSaveError(t.topics.parentMissing); return false;
      }
      const now = Date.now();
      if (mode === 'create') {
        topicRepo.insert({ ...value, id: now.toString(36) + Math.random().toString(36).slice(2, 10),
          subjectId: subject.id, createdAt: now, updatedAt: now });
      } else {
        const current = topicRepo.getById(id);
        if (!current || current.subjectId !== subject.id || !topicRepo.update({ ...current, ...value, updatedAt: now })) {
          setSaveError(t.topics.missing); return false;
        }
      }
    } catch { setSaveError(t.topics.saveError); return false; }
    // The write succeeded; a fallback lookup must not masquerade as a failed save.
    router.dismissTo(destination(mode === 'edit'));
    return true;
  }
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      router.dismissTo(destination(mode === 'edit')); return true;
    });
    return () => listener.remove();
  }, [id, mode]));
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScreenWrapper includeBottomSafeArea><Section>
      <Button label={t.common.back} variant="ghost" onPress={() => router.dismissTo(destination(mode === 'edit'))} />
      <AppText variant="h2">{mode === 'create' ? t.topics.add : t.topics.edit}</AppText>
      {loaded.status === 'loading' && <FeedbackState kind="loading" message={t.common.loading} />}
      {loaded.status === 'missing' && <FeedbackState kind="empty" message={mode === 'create' ? t.topics.parentMissing : t.topics.missing} />}
      {loaded.status === 'error' && <FeedbackState kind="error" message={t.topics.loadError}
        action={{ label: t.common.retry, onPress: () => setAttempt(value => value + 1) }} />}
      {loaded.status === 'ready' && <>
        <AppText>{t.topics.parent(loaded.subject.name)}</AppText>
        <AppText>{t.topics.committee(loaded.committee.name)}</AppText>
        <TopicForm key={`${mode}:${id}`} initialName={loaded.topic?.name} initialDescription={loaded.topic?.description}
          initialLearningObjectives={loaded.topic?.learningObjectives}
          error={saveError} submitLabel={mode === 'create' ? t.topics.create : t.common.save} onSubmit={save} />
      </>}
    </Section></ScreenWrapper>
  </KeyboardAvoidingView>;
}
