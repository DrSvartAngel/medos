import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, TouchableOpacity, View, StyleSheet } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import { focusRepo } from '@/db/repositories/focusRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { qbankRepo } from '@/db/repositories/qbankRepo';
import type { StudySource } from '@/models/studySource';
import { TopicReviewEvidence } from '@/components/memory/TopicReviewEvidence';
import { useFocusStore } from '@/store/useFocusStore';
import type { Topic, Subject } from '@/models/curriculum';
import type { Committee } from '@/store/useCommitteeStore';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Section } from '@/components/ui/Section';
import { ListRow } from '@/components/ui/ListRow';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { topicFallback, topicRouteId } from '@/utils/topicRoutes';
import { Feather } from '@expo/vector-icons';
import { Interaction } from '@/theme/interaction';

type Data =
  | { status: 'ready'; topic: Topic; subject: Subject; committee: Committee }
  | { status: 'loading' | 'missing' | 'error' };

export default function TopicDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = topicRouteId(params.id);
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const [data, setData] = useState<Data>({ status: 'loading' });
  const [deleteError, setDeleteError] = useState(false);
  const [studyEvidence, setStudyEvidence] = useState<boolean | null>(null);
  const [startError, setStartError] = useState(false);
  const [sources, setSources] = useState<StudySource[]>([]);
  const [sourcesError, setSourcesError] = useState(false);
  const [memoryEvidence, setMemoryEvidence] = useState<{ linkedCards: number; dueCards: number } | null>(null);
  const [qbankEvidence, setQBankEvidence] = useState<{ totalQuestions: number; accuracyPercent: number | null } | null>(null);
  const timerStatus = useFocusStore((state) => state.timerStatus);

  function loadEvidence() {
    try {
      setStudyEvidence(focusRepo.hasTopicStudyActivity(id));
    } catch {
      setStudyEvidence(null);
    }
  }

  function loadSources() {
    setSourcesError(false);
    try {
      setSources(studySourceRepo.getByTopic(id));
    } catch {
      setSources([]);
      setSourcesError(true);
    }
  }

  function loadTools() {
    try {
      const mem = memoryRepo.getTopicLearningEvidence(id);
      setMemoryEvidence(mem);
    } catch {
      setMemoryEvidence(null);
    }
    try {
      const qb = qbankRepo.getTopicEvidence(id);
      setQBankEvidence(qb);
    } catch {
      setQBankEvidence(null);
    }
  }

  function startFocus() {
    setStartError(false);
    if (useFocusStore.getState().timerStatus !== 'idle') {
      router.push('/(tabs)/focus');
      return;
    }
    try {
      if (useFocusStore.getState().startTopicSession(id)) router.push('/(tabs)/focus');
      else if (useFocusStore.getState().timerStatus !== 'idle') router.push('/(tabs)/focus');
      else setStartError(true);
    } catch {
      setStartError(true);
    }
  }

  const deleting = useRef(false);
  const context = useRef({ id, committeeId: '', subjectId: '' });

  const load = useCallback(() => {
    if (context.current.id !== id) context.current = { id, committeeId: '', subjectId: '' };
    setData({ status: 'loading' });
    setDeleteError(false);
    setStudyEvidence(null);
    setStartError(false);
    if (!id) {
      setData({ status: 'missing' });
      return;
    }
    try {
      const topic = topicRepo.getById(id);
      const subject = topic ? subjectRepo.getById(topic.subjectId) : null;
      if (subject) context.current = { id, committeeId: subject.committeeId, subjectId: subject.id };
      const committee = subject ? committeeRepo.getById(subject.committeeId) : null;
      setData(
        topic && subject && committee
          ? { status: 'ready', topic, subject, committee }
          : { status: 'missing' }
      );
      if (topic && subject && committee) {
        loadEvidence();
        loadSources();
        loadTools();
      }
    } catch {
      setData({ status: 'error' });
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
      const listener = AppState.addEventListener('change', (state) => {
        if (state === 'active') load();
      });
      return () => listener.remove();
    }, [load])
  );

  function target(committeeOnly = false): Href {
    try {
      return topicFallback(
        context.current.committeeId,
        committeeOnly ? '' : context.current.subjectId
      ) as Href;
    } catch {
      return '/(tabs)/committees';
    }
  }

  function remove() {
    if (data.status !== 'ready' || deleting.current) return;
    const topic = data.topic;
    Alert.alert(t.topics.removeTitle, t.topics.removeWarning(topic.name), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.topics.remove,
        style: 'destructive',
        onPress: () => {
          if (deleting.current) return;
          deleting.current = true;
          try {
            if (!topicRepo.delete(topic.id)) {
              setDeleteError(true);
              return;
            }
          } catch {
            setDeleteError(true);
            return;
          } finally {
            deleting.current = false;
          }
          router.dismissTo(target());
        },
      },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        router.dismissTo(target());
        return true;
      });
      return () => listener.remove();
    }, [id])
  );

  return (
    <ScreenWrapper includeBottomSafeArea>
      {data.status === 'loading' && (
        <FeedbackState kind="loading" message={t.common.loading} />
      )}
      {data.status === 'missing' && (
        <FeedbackState kind="empty" message={t.topics.missing} />
      )}
      {data.status === 'error' && (
        <FeedbackState
          kind="error"
          message={t.topics.loadError}
          action={{ label: t.common.retry, onPress: load }}
        />
      )}

      {data.status === 'ready' && (
        <View style={{ gap: spacing.lg }}>
          {/* ── 1. Breadcrumb Hierarchy Navigation ──────────── */}
          <Breadcrumb
            items={[
              {
                label: t.committees.title,
                onPress: () => router.dismissTo('/(tabs)/committees' as Href),
              },
              {
                label: data.committee.name,
                onPress: () => router.dismissTo(target(true)),
              },
              {
                label: data.subject.name,
                onPress: () => router.dismissTo(target(false)),
              },
              {
                label: data.topic.name,
                isCurrent: true,
              },
            ]}
          />

          {/* ── 2. Topic Overview Header ────────────────────── */}
          <Card elevated style={{ padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface }}>
            <View style={styles.titleHeader}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: 2 }}>
                  {data.committee.name} · {data.subject.name}
                </AppText>
                <AppText variant="h2">{data.topic.name}</AppText>
                {data.topic.description ? (
                  <AppText
                    variant="body"
                    color={colors.textSecondary}
                    style={{ marginTop: spacing.xs }}
                  >
                    {data.topic.description}
                  </AppText>
                ) : null}
              </View>
              <Button
                label={t.topics.edit}
                variant="secondary"
                size="sm"
                icon={<Feather name="edit-2" size={14} color={colors.primary} />}
                onPress={() =>
                  router.push(`/topics/edit/${encodeURIComponent(id)}` as Href)
                }
              />
            </View>

            {data.topic.learningObjectives.trim() !== '' && <Section title={t.topics.learningObjectives}>
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {data.topic.learningObjectives}
              </AppText>
            </Section>}
          </Card>

          {/* ── 3. Primary Action: Focus ────────────────────── */}
          <Card elevated style={{ padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="clock" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <AppText variant="label" style={{ fontWeight: '600' }}>
                  {t.focus.title.toUpperCase()}
                </AppText>
              </View>

              {studyEvidence !== null && (
                <Badge
                  label={studyEvidence ? t.topics.studyRecorded : t.topics.studyUnrecorded}
                  variant={studyEvidence ? 'success' : 'default'}
                  size="sm"
                  dot
                />
              )}
            </View>

            {studyEvidence === null ? (
              <FeedbackState
                kind="error"
                message={t.topics.studyEvidenceError}
                action={{ label: t.common.retry, onPress: loadEvidence }}
              />
            ) : (
              <AppText variant="bodySmall" color={colors.textSecondary}>
                {t.topics.studyEvidenceHelp}
              </AppText>
            )}

            <Button
              label={
                timerStatus === 'idle'
                  ? t.topics.startFocus
                  : t.topics.continueFocus
              }
              onPress={startFocus}
              size="lg"
              icon={<Feather name="play" size={18} color={colors.textInverse} />}
              style={{ marginTop: spacing.xs }}
            />
            {startError && (
              <FeedbackState kind="error" message={t.topics.focusStartError} />
            )}
          </Card>

          {/* ── 4. Study Tools (2x2 Grid) ───────────────────── */}
          <View style={{ gap: spacing.sm }}>
            <SectionHeader
              title={t.dashboard.quickStart}
            />

            <View style={styles.toolsGrid}>
              {/* Tool: Study Sources */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.studySources.title}
                onPress={() => router.push(`/topics/${encodeURIComponent(id)}/sources/new` as Href)}
                activeOpacity={0.75}
                style={[
                  styles.toolCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={styles.toolIconRow}>
                  <Feather name="file-text" size={20} color={colors.primary} />
                  <Badge label={`${sources.length}`} variant="default" size="sm" />
                </View>
                <AppText variant="subhead" style={{ fontWeight: '600', marginTop: spacing.xs }}>
                  {t.studySources.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {sources.length === 0 ? t.studySources.empty : `${sources.length} sources`}
                </AppText>
              </TouchableOpacity>

              {/* Tool: Memory / Flashcards */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.memory.title}
                onPress={() => router.push('/(tabs)/memory' as Href)}
                activeOpacity={0.75}
                style={[
                  styles.toolCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={styles.toolIconRow}>
                  <Feather name="layers" size={20} color={colors.primary} />
                  {(memoryEvidence?.dueCards ?? 0) > 0 ? (
                    <Badge label={`${memoryEvidence?.dueCards}`} variant="warning" size="sm" />
                  ) : null}
                </View>
                <AppText variant="subhead" style={{ fontWeight: '600', marginTop: spacing.xs }}>
                  {t.memory.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {(memoryEvidence?.dueCards ?? 0) > 0
                    ? t.topicEvidence.due(memoryEvidence!.dueCards)
                    : (memoryEvidence?.linkedCards ?? 0) > 0
                    ? t.topicEvidence.cards(memoryEvidence!.linkedCards)
                    : t.memory.noReviewsDue}
                </AppText>
              </TouchableOpacity>

              {/* Tool: Q-Bank */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.qbank.title}
                onPress={() => router.push('/qbank/new' as Href)}
                activeOpacity={0.75}
                style={[
                  styles.toolCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={styles.toolIconRow}>
                  <Feather name="check-circle" size={20} color={colors.primary} />
                  {(qbankEvidence?.totalQuestions ?? 0) > 0 ? (
                    <Badge label={`${qbankEvidence?.totalQuestions}`} variant="default" size="sm" />
                  ) : null}
                </View>
                <AppText variant="subhead" style={{ fontWeight: '600', marginTop: spacing.xs }}>
                  {t.qbank.title}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {(qbankEvidence?.totalQuestions ?? 0) > 0
                    ? `${t.qbank.evidence.questions(qbankEvidence!.totalQuestions)}` + (qbankEvidence?.accuracyPercent !== null ? ` · ${qbankEvidence!.accuracyPercent}%` : '')
                    : t.qbank.evidence.noPractice}
                </AppText>
              </TouchableOpacity>

              {/* Tool: AI Assistant */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.studyAi.assistant}
                onPress={() => router.push(`/topics/${encodeURIComponent(id)}/assistant` as Href)}
                activeOpacity={0.75}
                style={[
                  styles.toolCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <View style={styles.toolIconRow}>
                  <Feather name="cpu" size={20} color={colors.primary} />
                  <Badge label="AI" variant="info" size="sm" />
                </View>
                <AppText variant="subhead" style={{ fontWeight: '600', marginTop: spacing.xs }}>
                  {t.studyAi.assistant}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {t.dashboard.quickStart}
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 5. Study Sources (Phase 12 Preparation) ──────── */}
          <Card style={{ padding: spacing.lg, gap: spacing.md, backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: spacing.sm }}>
                <SectionHeader
                  title={t.studySources.title}
                  subtitle={t.studySources.description}
                />
              </View>
              <Button
                label={t.studyAi.assistant}
                variant="primary"
                size="sm"
                icon={<Feather name="cpu" size={14} color={colors.textInverse} />}
                onPress={() =>
                  router.push(`/topics/${encodeURIComponent(id)}/assistant` as Href)
                }
              />
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Button
                label={t.studySources.addSource}
                variant="secondary"
                size="sm"
                icon={<Feather name="plus" size={14} color={colors.primary} />}
                onPress={() =>
                  router.push(`/topics/${encodeURIComponent(id)}/sources/new` as Href)
                }
              />
              <Button
                label={t.studySources.importDocument}
                variant="secondary"
                size="sm"
                icon={<Feather name="upload" size={14} color={colors.primary} />}
                onPress={() =>
                  router.push(
                    `/topics/${encodeURIComponent(id)}/sources/import-document` as Href
                  )
                }
              />
            </View>

            {sourcesError ? (
              <FeedbackState
                kind="error"
                message={t.studySources.loadError}
                action={{ label: t.common.retry, onPress: loadSources }}
              />
            ) : sources.length === 0 ? (
              <FeedbackState kind="empty" message={t.studySources.empty} />
            ) : (
              <View
                style={{
                  borderRadius: radius.md,
                  borderColor: colors.border,
                  borderWidth: 1,
                  overflow: 'hidden',
                  backgroundColor: colors.surfaceElevated,
                }}
              >
                {sources.map((source, idx) => (
                  <ListRow
                    key={source.id}
                    title={source.title}
                    subtitle={t.studySources.updatedAt(
                      new Date(source.updatedAt).toLocaleDateString(t.dashboard.locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    )}
                    leading={<Feather name="file-text" size={16} color={colors.primary} />}
                    trailing={<Badge label={t.studySources[source.sourceType]} variant="default" size="sm" />}
                    chevron
                    borderBottom={idx < sources.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel={t.studySources.openSource(source.title)}
                    onPress={() =>
                      router.push(
                        `/topics/${encodeURIComponent(id)}/sources/${encodeURIComponent(
                          source.id
                        )}` as Href
                      )
                    }
                  />
                ))}
              </View>
            )}
          </Card>

          {/* ── 6. Learning Status / Activity ───────────────── */}
          <TopicReviewEvidence topicId={id} />

          {/* ── 7. Danger Zone ───────────────────────────────── */}
          <Card
            style={{
              borderColor: colors.errorMuted,
              padding: spacing.md,
              gap: spacing.sm,
              marginBottom: spacing.xl,
            }}
          >
            <AppText variant="label" color={colors.error}>
              {t.topics.removeTitle}
            </AppText>
            {deleteError && (
              <FeedbackState kind="error" message={t.topics.deleteError} />
            )}
            <Button
              label={t.topics.remove}
              variant="danger"
              size="sm"
              onPress={remove}
            />
          </Card>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  titleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 88,
    borderWidth: 1,
  },
  toolIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

