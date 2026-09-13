import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { TopicForm } from './TopicForm';
import { AcademicContextSelector } from './AcademicContextSelector';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import type { Subject, Topic } from '@/models/curriculum';
import type { Committee } from '@/store/useCommitteeStore';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { topicFallback } from '@/utils/topicRoutes';

type Loaded = { status: 'ready'; subject: Subject | null; committee: Committee | null; topic: Topic | null }
  | { status: 'loading' | 'missing' | 'error' };

export function TopicEditor({ id, mode }: { id: string; mode: 'create' | 'edit' }) {
  const t = useTranslation();
  const { spacing } = useTheme();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedCommittee, setSelectedCommittee] = useState<Committee | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [createdTopicId, setCreatedTopicId] = useState<string | null>(null);
  const [showPostCreateModal, setShowPostCreateModal] = useState(false);
  const context = useRef({ key: `${mode}:${id}`, committeeId: '', subjectId: '' });

  useEffect(() => {
    const key = `${mode}:${id}`;
    if (context.current.key !== key) context.current = { key, committeeId: '', subjectId: '' };
    setLoaded({ status: 'loading' });
    setSaveError(null);
    setSubjectError(null);

    if (!id && mode === 'edit') {
      setLoaded({ status: 'missing' });
      return;
    }

    try {
      if (mode === 'create') {
        if (!id) {
          // Creating from Today without pre-supplied subject
          setLoaded({ status: 'ready', subject: null, committee: null, topic: null });
          setSelectedSubject(null);
          setSelectedCommittee(null);
          return;
        }
        // Creating with pre-supplied subjectId
        const subject = subjectRepo.getById(id);
        if (!subject) { setLoaded({ status: 'missing' }); return; }
        context.current = { key, committeeId: subject.committeeId, subjectId: subject.id };
        const committee = committeeRepo.getById(subject.committeeId);
        if (!committee) { setLoaded({ status: 'missing' }); return; }
        setLoaded({ status: 'ready', subject, committee, topic: null });
        setSelectedSubject(subject);
        setSelectedCommittee(committee);
        return;
      }

      // mode === 'edit'
      const topic = topicRepo.getById(id);
      if (!topic) { setLoaded({ status: 'missing' }); return; }
      const subject = subjectRepo.getById(topic.subjectId);
      if (!subject) { setLoaded({ status: 'missing' }); return; }
      context.current = { key, committeeId: subject.committeeId, subjectId: subject.id };
      const committee = committeeRepo.getById(subject.committeeId);
      if (!committee) { setLoaded({ status: 'missing' }); return; }
      setLoaded({ status: 'ready', subject, committee, topic });
      setSelectedSubject(subject);
      setSelectedCommittee(committee);
    } catch {
      setLoaded({ status: 'error' });
    }
  }, [id, mode, attempt]);

  function destination(includeTopic: boolean): Href {
    try {
      const committeeId = selectedCommittee?.id || context.current.committeeId;
      const subjectId = selectedSubject?.id || context.current.subjectId;
      if (!committeeId || !subjectId) {
        return '/(tabs)' as Href;
      }
      return topicFallback(committeeId, subjectId,
        includeTopic ? id : undefined) as Href;
    } catch {
      return '/(tabs)';
    }
  }

  function save(value: { name: string; description: string; learningObjectives: string }): boolean {
    if (loaded.status !== 'ready') return false;
    const currentSubject = selectedSubject ?? loaded.subject;
    if (!currentSubject) {
      setSubjectError(t.topics.subjectRequired);
      return false;
    }

    try {
      const subject = subjectRepo.getById(currentSubject.id);
      if (!subject || !committeeRepo.getById(subject.committeeId)) {
        setSaveError(t.topics.parentMissing);
        return false;
      }
      const now = Date.now();
      if (mode === 'create') {
        const createdTopicId = now.toString(36) + Math.random().toString(36).slice(2, 10);
        topicRepo.insert({
          ...value,
          id: createdTopicId,
          subjectId: subject.id,
          createdAt: now,
          updatedAt: now,
        });
        setCreatedTopicId(createdTopicId);
        setShowPostCreateModal(true);
        return true;
      } else {
        const current = topicRepo.getById(id);
        if (!current) {
          setSaveError(t.topics.missing);
          return false;
        }
        if (current.subjectId !== subject.id) {
          // Ancestry changed: topic reparented to new Subject and Committee
        }
        if (!topicRepo.update({ ...current, ...value, subjectId: subject.id, updatedAt: now })) {
          setSaveError(t.topics.missing);
          return false;
        }
        router.dismissTo(destination(true));
        return true;
      }
    } catch {
      setSaveError(t.topics.saveError);
      return false;
    }
  }

  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showPostCreateModal && createdTopicId) {
        setShowPostCreateModal(false);
        router.replace(`/topics/${createdTopicId}` as Href);
        return true;
      }
      router.dismissTo(destination(mode === 'edit'));
      return true;
    });
    return () => listener.remove();
  }, [id, mode, showPostCreateModal, createdTopicId, selectedSubject, selectedCommittee]));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenWrapper includeBottomSafeArea>
        <Section>
          <Button label={t.common.back} variant="ghost" onPress={() => router.dismissTo(destination(mode === 'edit'))} />
          <AppText variant="h2">{mode === 'create' ? t.topics.add : t.topics.edit}</AppText>
          {loaded.status === 'loading' && <FeedbackState kind="loading" message={t.common.loading} />}
          {loaded.status === 'missing' && <FeedbackState kind="empty" message={mode === 'create' ? t.topics.parentMissing : t.topics.missing} />}
          {loaded.status === 'error' && <FeedbackState kind="error" message={t.topics.loadError}
            action={{ label: t.common.retry, onPress: () => setAttempt(value => value + 1) }} />}
          {loaded.status === 'ready' && (
            <>
              <View style={{ marginVertical: spacing.sm }}>
                <AcademicContextSelector
                  maxDepth="subject"
                  requiredDepth="subject"
                  value={{
                    committeeId: selectedCommittee?.id ?? null,
                    subjectId: selectedSubject?.id ?? null,
                  }}
                  error={subjectError}
                  onChange={(ctx) => {
                    if (ctx.subjectId) {
                      const subj = subjectRepo.getById(ctx.subjectId);
                      if (subj) {
                        const comm = committeeRepo.getById(subj.committeeId);
                        setSelectedSubject(subj);
                        setSelectedCommittee(comm);
                        setSubjectError(null);
                        context.current.subjectId = subj.id;
                        context.current.committeeId = subj.committeeId;
                      }
                    } else if (ctx.committeeId) {
                      const comm = committeeRepo.getById(ctx.committeeId);
                      setSelectedCommittee(comm);
                      setSelectedSubject(null);
                      context.current.committeeId = ctx.committeeId;
                      context.current.subjectId = '';
                    } else {
                      setSelectedCommittee(null);
                      setSelectedSubject(null);
                      context.current.committeeId = '';
                      context.current.subjectId = '';
                    }
                  }}
                />
              </View>

              <TopicForm
                key={`${mode}:${id}`}
                initialName={loaded.topic?.name}
                initialDescription={loaded.topic?.description}
                initialLearningObjectives={loaded.topic?.learningObjectives}
                error={saveError}
                submitLabel={mode === 'create' ? t.topics.create : t.common.save}
                onSubmit={save}
              />
            </>
          )}
        </Section>
      </ScreenWrapper>

      {/* Post-creation Material Import Choice Modal */}
      {showPostCreateModal && createdTopicId && (
        <Modal
          visible={showPostCreateModal}
          onClose={() => {
            setShowPostCreateModal(false);
            router.replace(`/topics/${createdTopicId}` as Href);
          }}
          title={t.topics.topicCreated}
          subtitle={t.topics.topicCreatedDetail}
          presentation="auto"
        >
          <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
            <Button
              label={t.topics.importMaterials}
              variant="primary"
              onPress={() => {
                setShowPostCreateModal(false);
                router.replace(`/topics/${createdTopicId}/sources/import-document` as Href);
              }}
            />
            <Button
              label={t.topics.goToTopic}
              variant="secondary"
              onPress={() => {
                setShowPostCreateModal(false);
                router.replace(`/topics/${createdTopicId}` as Href);
              }}
            />
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}
