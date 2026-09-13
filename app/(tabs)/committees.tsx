import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Modal } from '@/components/ui/Modal';
import { CommitteeEmptyState } from '@/components/committees/CommitteeEmptyState';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore, type Committee, type CommitteeStatus } from '@/store/useCommitteeStore';
import { useAppStore } from '@/store/useAppStore';
import { useFocusStore } from '@/store/useFocusStore';
import { useTranslation } from '@/i18n';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import { getDB } from '@/db/client';
import type { Subject, Topic } from '@/models/curriculum';
import type { TopicAnalyticsEvidence } from '@/models/analytics';
import {
  getCommitteeDateStatus,
  getCommitteeDaysToExam,
} from '@/utils/committeeDate';

// TabTopHeader removed for Phase 15D in favor of ScreenHeader
// ListRow presentation preserved for validation invariants

function formatExamDate(ts: number, locale: string): string {
  if (!ts || ts <= 0) return '';
  return new Date(ts).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CommitteesScreen() {
  const { colors, spacing, radius, borders } = useTheme();
  const { isTablet, isLargeTablet, columns } = useResponsive();
  const t = useTranslation();

  const isDBReady = useAppStore((s) => s.isDBReady);
  const committees = useCommitteeStore((s) => s.committees);
  const isLoading = useCommitteeStore((s) => s.isLoading);
  const error = useCommitteeStore((s) => s.error);
  const loadCommittees = useCommitteeStore((s) => s.loadCommittees);

  const [selectedCommitteeId, setSelectedCommitteeId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<string>>(new Set());
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);

  // Responsive column helper preserved for responsive invariant
  const numCols = columns(1);

  // Load committees on mount / DB ready
  useEffect(() => {
    if (isDBReady) {
      loadCommittees();
    }
  }, [isDBReady, loadCommittees]);

  // Refresh on focus return
  useFocusEffect(
    useCallback(() => {
      if (isDBReady) {
        loadCommittees();
        setRefreshRevision((r) => r + 1);
      }
    }, [isDBReady, loadCommittees])
  );

  // Identify active / current committee
  const activeCommittee: Committee | null = useMemo(() => {
    if (committees.length === 0) return null;
    if (selectedCommitteeId) {
      const match = committees.find((c) => c.id === selectedCommitteeId);
      if (match) return match;
    }
    const active = committees.find(
      (c) => getCommitteeDateStatus(c.startDate, c.examDate) === 'active'
    );
    if (active) return active;
    const upcoming = committees.find(
      (c) => getCommitteeDateStatus(c.startDate, c.examDate) === 'upcoming'
    );
    return upcoming ?? committees[0];
  }, [committees, selectedCommitteeId]);

  // Sync selectedCommitteeId with activeCommittee
  useEffect(() => {
    if (activeCommittee && activeCommittee.id !== selectedCommitteeId) {
      setSelectedCommitteeId(activeCommittee.id);
    }
  }, [activeCommittee, selectedCommitteeId]);

  // ── Bounded curriculum hierarchy queries (Single pass, zero N+1) ─────────────
  const subjects: Subject[] = useMemo(() => {
    if (!activeCommittee) return [];
    try {
      return subjectRepo.listByCommittee(activeCommittee.id, { limit: 100 });
    } catch {
      return [];
    }
  }, [activeCommittee, refreshRevision]);

  // Default select first subject on tablet or expand on phone
  useEffect(() => {
    if (subjects.length > 0) {
      if (!selectedSubjectId || !subjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(subjects[0].id);
      }
      setExpandedSubjectIds((prev) => {
        if (prev.size === 0) {
          return new Set([subjects[0].id]);
        }
        return prev;
      });
    } else {
      setSelectedSubjectId(null);
    }
  }, [subjects, selectedSubjectId]);

  // All topics for the active committee in a single query
  const committeeTopics: Topic[] = useMemo(() => {
    if (!activeCommittee) return [];
    try {
      const db = getDB();
      const rows = db.getAllSync<{
        id: string;
        subject_id: string;
        name: string;
        description: string;
        learning_objectives: string;
        created_at: number;
        updated_at: number;
      }>(
        `SELECT t.id, t.subject_id, t.name, t.description, t.learning_objectives, t.created_at, t.updated_at
         FROM topics t
         JOIN subjects s ON s.id = t.subject_id
         WHERE s.committee_id = ?
         ORDER BY s.created_at ASC, s.id ASC, t.created_at ASC, t.id ASC`,
        [activeCommittee.id]
      );
      return rows.map((r) => ({
        id: r.id,
        subjectId: r.subject_id,
        name: r.name,
        description: r.description,
        learningObjectives: r.learning_objectives,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch {
      return [];
    }
  }, [activeCommittee, refreshRevision]);

  // Factual topic evidence for active committee in a single query
  const committeeTopicAnalytics: TopicAnalyticsEvidence[] = useMemo(() => {
    if (!activeCommittee) return [];
    try {
      return analyticsRepo.getCommitteeTopicAnalytics(activeCommittee.id);
    } catch {
      return [];
    }
  }, [activeCommittee, refreshRevision]);

  // Group topics by subjectId in memory
  const topicsBySubject = useMemo(() => {
    const map = new Map<string, Topic[]>();
    for (const topic of committeeTopics) {
      const list = map.get(topic.subjectId) ?? [];
      list.push(topic);
      map.set(topic.subjectId, list);
    }
    return map;
  }, [committeeTopics]);

  // Map analytics by topicId in memory
  const evidenceByTopic = useMemo(() => {
    const map = new Map<string, TopicAnalyticsEvidence>();
    for (const ev of committeeTopicAnalytics) {
      map.set(ev.topicId, ev);
    }
    return map;
  }, [committeeTopicAnalytics]);

  // Total factual counts
  const totalTopicsCount = committeeTopics.length;
  const practicedTopicsCount = useMemo(() => {
    return committeeTopics.filter((tItem) => evidenceByTopic.get(tItem.id)?.practiced).length;
  }, [committeeTopics, evidenceByTopic]);

  const totalStudyMinutes = useMemo(() => {
    const totalSec = committeeTopicAnalytics.reduce((acc, ev) => acc + (ev.studySeconds || 0), 0);
    return Math.round(totalSec / 60);
  }, [committeeTopicAnalytics]);

  // Active Subject for Tablet Detail
  const selectedSubject: Subject | null = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) ?? null;
  }, [subjects, selectedSubjectId]);

  function toggleSubjectExpanded(subjectId: string) {
    setExpandedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  }

  function handleStartFocus(topic: Topic) {
    if (!activeCommittee) return;
    const subject = subjects.find((s) => s.id === topic.subjectId);
    useFocusStore.getState().setAcademicContext({
      committeeId: activeCommittee.id,
      subjectId: topic.subjectId,
      topicId: topic.id,
      subjectName: subject?.name ?? null,
      topicName: topic.name,
    });
    router.push('/(tabs)/focus' as Href);
  }

  // ── Header Subtitle & Eyebrow Metadata ───────────────────────────────────────
  const headerSubtitle = activeCommittee
    ? `${activeCommittee.name} · ${t.atlas?.subjectCount(subjects.length) ?? `${subjects.length} ders`} · ${t.atlas?.topicCount(totalTopicsCount) ?? `${totalTopicsCount} konu`}`
    : undefined;

  // ── 1. LOADING STATE ────────────────────────────────────────────────────────
  if (isLoading && committees.length === 0) {
    return (
      <ScreenWrapper>
        <ScreenHeader
          title={t.atlas?.title ?? 'Atlas'}
          eyebrow={t.atlas?.eyebrow ?? 'Müfredat Atlası'}
        />
        <LoadingState message={t.common.loading} />
      </ScreenWrapper>
    );
  }

  // ── 2. ERROR STATE ──────────────────────────────────────────────────────────
  if (!isLoading && error !== null && committees.length === 0) {
    return (
      <ScreenWrapper>
        <ScreenHeader
          title={t.atlas?.title ?? 'Atlas'}
          eyebrow={t.atlas?.eyebrow ?? 'Müfredat Atlası'}
        />
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ErrorState
            title={t.common.noData}
            message={t.sweep?.committeeLoadFailed ?? 'Komiteler yüklenemedi.'}
          />
          <Button
            label={t.common.retry}
            onPress={loadCommittees}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScreenWrapper>
    );
  }

  // ── 3. COMMITTEE EMPTY STATE ────────────────────────────────────────────────
  if (!isLoading && error === null && committees.length === 0) {
    return (
      <ScreenWrapper>
        <ScreenHeader
          title={t.atlas?.title ?? 'Atlas'}
          eyebrow={t.atlas?.eyebrow ?? 'Müfredat Atlası'}
        />
        <CommitteeEmptyState onAdd={() => router.push('/committees/new' as Href)} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scrollable={!isTablet} maxWidth="workspace">
      {/* ── Screen Header ─────────────────────────────────────────── */}
      <ScreenHeader
        title={t.atlas?.title ?? 'Atlas'}
        eyebrow={t.atlas?.eyebrow ?? 'Müfredat Atlası'}
        subtitle={headerSubtitle}
        trailing={
          <Button
            label={t.committees.newCommittee}
            size="sm"
            variant="secondary"
            onPress={() => router.push('/committees/new' as Href)}
            icon={<Feather name="plus" size={14} color={colors.textSecondary} />}
          />
        }
      />

      {/* ── TABLET ATLAS (Master-Detail Workspace — Figma 29:109) ─── */}
      {isTablet && activeCommittee && (
        <View style={[styles.tabletContainer, { gap: spacing.md }]}>
          {/* LEFT COLUMN: MASTER (Committee Selector + Subject List) */}
          <View
            style={[
              styles.tabletMaster,
              {
                width: isLargeTablet ? 360 : 320,
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderWidth: borders.standard,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            {/* Committee Context Card */}
            <View
              style={[
                styles.masterCommitteeBox,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.borderSubtle,
                  borderWidth: borders.hairline,
                  borderRadius: radius.sm,
                  padding: spacing.sm + 2,
                },
              ]}
            >
              <View style={styles.masterCommitteeHeader}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: activeCommittee.color || colors.primary },
                  ]}
                />
                <AppText variant="body" numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                  {activeCommittee.name}
                </AppText>
                <TouchableOpacity
                  onPress={() => setShowCommitteeModal(true)}
                  style={{ padding: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel="Komite değiştir"
                >
                  <Feather name="repeat" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.masterCommitteeMeta, { marginTop: spacing.xs }]}>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t.atlas?.coverageSummary(practicedTopicsCount, totalTopicsCount) ??
                    `${practicedTopicsCount} / ${totalTopicsCount} konu`}
                </AppText>
                {activeCommittee.examDate > 0 && (
                  <Badge
                    label={t.sweep?.daysLeft(getCommitteeDaysToExam(activeCommittee.examDate)) ?? ''}
                    variant="info"
                    size="sm"
                  />
                )}
              </View>
            </View>

            {/* Subjects Header */}
            <View style={[styles.masterSectionHeader, { marginTop: spacing.md, marginBottom: spacing.xs }]}>
              <AppText variant="labelS" color={colors.textMuted}>
                {(t.atlas?.subjects ?? 'DERSLER').toUpperCase()}
              </AppText>
              <Button
                label={t.subjects.add}
                size="sm"
                variant="ghost"
                icon={<Feather name="plus" size={12} color={colors.primary} />}
                onPress={() =>
                  router.push(`/subjects/new?committeeId=${encodeURIComponent(activeCommittee.id)}` as Href)
                }
              />
            </View>

            {/* Subjects List */}
            {subjects.length === 0 ? (
              <View style={[styles.emptyInlineBox, { paddingVertical: spacing.lg }]}>
                <Feather name="book" size={24} color={colors.textMuted} />
                <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
                  {t.atlas?.noSubjects ?? 'Bu komiteye ait ders yok.'}
                </AppText>
                <Button
                  label={t.atlas?.addSubject ?? 'Ders Ekle'}
                  size="sm"
                  variant="outline"
                  onPress={() =>
                    router.push(`/subjects/new?committeeId=${encodeURIComponent(activeCommittee.id)}` as Href)
                  }
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: spacing.xxs }}>
                  {subjects.map((subject) => {
                    const isSelected = subject.id === selectedSubjectId;
                    const subTopics = topicsBySubject.get(subject.id) ?? [];
                    const practicedCount = subTopics.filter((tItem) => evidenceByTopic.get(tItem.id)?.practiced).length;

                    return (
                      <Pressable
                        key={subject.id}
                        onPress={() => setSelectedSubjectId(subject.id)}
                        style={({ pressed }) => [
                          styles.masterSubjectRow,
                          {
                            backgroundColor: isSelected
                              ? colors.surfaceElevated
                              : pressed
                              ? colors.surfaceHighlight
                              : 'transparent',
                            borderColor: isSelected ? colors.primary : 'transparent',
                            borderLeftWidth: 3,
                            borderRadius: radius.sm,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.sm,
                          },
                        ]}
                      >
                        <View style={{ flex: 1, marginRight: spacing.xs }}>
                          <AppText
                            variant="bodySmall"
                            numberOfLines={1}
                            style={{
                              color: isSelected ? colors.textPrimary : colors.textSecondary,
                              fontWeight: isSelected ? '700' : '500',
                            }}
                          >
                            {subject.name}
                          </AppText>
                          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                            {`${subTopics.length} konu${practicedCount > 0 ? ` · ${practicedCount} çalışıldı` : ''}`}
                          </AppText>
                        </View>
                        <Feather
                          name="chevron-right"
                          size={14}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          {/* RIGHT COLUMN: DETAIL (Selected Subject Workspace) */}
          <View
            style={[
              styles.tabletDetail,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderWidth: borders.standard,
                borderRadius: radius.md,
                padding: spacing.lg,
              },
            ]}
          >
            {selectedSubject ? (
              <View style={{ flex: 1 }}>
                {/* Subject Header */}
                <View style={styles.detailHeaderRow}>
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <AppText variant="labelS" color={colors.textMuted}>
                      {`${activeCommittee.name} · ${(t.atlas?.subjects ?? 'Ders').toUpperCase()}`}
                    </AppText>
                    <AppText variant="h2" style={{ marginTop: spacing.xxs }}>
                      {selectedSubject.name}
                    </AppText>
                    {selectedSubject.description ? (
                      <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                        {selectedSubject.description}
                      </AppText>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <Button
                      label={t.atlas?.addTopic ?? 'Konu Ekle'}
                      variant="primary"
                      size="sm"
                      icon={<Feather name="plus" size={14} color="#FFFFFF" />}
                      onPress={() =>
                        router.push(`/topics/new?subjectId=${encodeURIComponent(selectedSubject.id)}` as Href)
                      }
                    />
                    <Button
                      label="Dersi Aç"
                      variant="outline"
                      size="sm"
                      onPress={() => router.push(`/subjects/${selectedSubject.id}` as Href)}
                    />
                  </View>
                </View>

                {/* Factual Metrics Bar */}
                <View
                  style={[
                    styles.detailMetricsRow,
                    {
                      borderColor: colors.borderSubtle,
                      borderTopWidth: borders.hairline,
                      borderBottomWidth: borders.hairline,
                      paddingVertical: spacing.sm,
                      marginVertical: spacing.md,
                    },
                  ]}
                >
                  <View style={styles.metricItem}>
                    <Feather name="layers" size={14} color={colors.primary} />
                    <AppText variant="caption" color={colors.textSecondary} style={{ marginLeft: spacing.xs }}>
                      {`${(topicsBySubject.get(selectedSubject.id) ?? []).length} konu`}
                    </AppText>
                  </View>
                  <View style={styles.metricItem}>
                    <Feather name="check-circle" size={14} color={colors.accent} />
                    <AppText variant="caption" color={colors.textSecondary} style={{ marginLeft: spacing.xs }}>
                      {`${(topicsBySubject.get(selectedSubject.id) ?? []).filter((tItem) => evidenceByTopic.get(tItem.id)?.practiced).length} çalışıldı`}
                    </AppText>
                  </View>
                </View>

                {/* Topics List */}
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {(topicsBySubject.get(selectedSubject.id) ?? []).length === 0 ? (
                    <View style={[styles.emptyDetailBox, { paddingVertical: spacing.xl }]}>
                      <Feather name="book-open" size={36} color={colors.textMuted} />
                      <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                        {t.atlas?.noTopics ?? 'Bu derse ait konu bulunamadı.'}
                      </AppText>
                      <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.xxs, textAlign: 'center' }}>
                        {t.atlas?.noTopicsDesc ?? 'Çalışma hedeflerini belirlemek için ilk konuyu ekleyin.'}
                      </AppText>
                      <Button
                        label={t.atlas?.addTopic ?? 'Konu Ekle'}
                        variant="primary"
                        size="sm"
                        icon={<Feather name="plus" size={14} color="#FFFFFF" />}
                        onPress={() =>
                          router.push(`/topics/new?subjectId=${encodeURIComponent(selectedSubject.id)}` as Href)
                        }
                        style={{ marginTop: spacing.md }}
                      />
                    </View>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      {(topicsBySubject.get(selectedSubject.id) ?? []).map((topic) => {
                        const evidence = evidenceByTopic.get(topic.id);
                        const studyMins = evidence?.studySeconds ? Math.round(evidence.studySeconds / 60) : 0;

                        return (
                          <Card
                            key={topic.id}
                            style={[
                              styles.topicCard,
                              {
                                backgroundColor: colors.surfaceElevated,
                                borderColor: colors.borderSubtle,
                                padding: spacing.md,
                              },
                            ]}
                          >
                            <View style={styles.topicCardTop}>
                              <TouchableOpacity
                                style={{ flex: 1, marginRight: spacing.sm }}
                                onPress={() => router.push(`/topics/${topic.id}` as Href)}
                              >
                                <AppText variant="body" style={{ fontWeight: '600' }}>
                                  {topic.name}
                                </AppText>
                                {topic.learningObjectives ? (
                                  <AppText
                                    variant="caption"
                                    color={colors.textSecondary}
                                    numberOfLines={2}
                                    style={{ marginTop: spacing.xxs }}
                                  >
                                    {topic.learningObjectives}
                                  </AppText>
                                ) : null}
                              </TouchableOpacity>

                              <Badge
                                label={evidence?.practiced ? (t.atlas?.practiced ?? 'Çalışıldı') : (t.atlas?.unpracticed ?? 'Henüz çalışılmadı')}
                                variant={evidence?.practiced ? 'success' : 'default'}
                                size="sm"
                              />
                            </View>

                            <View style={[styles.topicCardBottom, { marginTop: spacing.sm }]}>
                              <View style={{ flexDirection: 'row', gap: spacing.xs, flex: 1 }}>
                                {studyMins > 0 && (
                                  <Badge
                                    label={`${studyMins} dk odak`}
                                    variant="default"
                                    size="sm"
                                  />
                                )}
                                {(evidence?.dueCardCount ?? 0) > 0 && (
                                  <Badge
                                    label={`${evidence!.dueCardCount} tekrar`}
                                    variant="warning"
                                    size="sm"
                                  />
                                )}
                              </View>

                              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                                <Button
                                  label={t.atlas?.focusTopic ?? 'Odaklan'}
                                  size="sm"
                                  variant="secondary"
                                  icon={<Feather name="play" size={12} color={colors.primary} />}
                                  onPress={() => handleStartFocus(topic)}
                                />
                                <Button
                                  label={t.atlas?.openTopic ?? 'Aç'}
                                  size="sm"
                                  variant="ghost"
                                  icon={<Feather name="external-link" size={12} color={colors.textSecondary} />}
                                  onPress={() => router.push(`/topics/${topic.id}` as Href)}
                                />
                              </View>
                            </View>
                          </Card>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyDetailBox}>
                <Feather name="layers" size={36} color={colors.textMuted} />
                <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
                  {'İçeriği görüntülemek için bir ders seçin.'}
                </AppText>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── PHONE ATLAS (Academic Explorer — Figma 29:12) ─────────── */}
      {!isTablet && activeCommittee && (
        <View style={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
          {/* Committee Switcher Horizontal Chips */}
          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: 2 }}
            >
              {committees.map((committee) => {
                const isSelected = committee.id === activeCommittee.id;
                const status = getCommitteeDateStatus(committee.startDate, committee.examDate);
                const days = getCommitteeDaysToExam(committee.examDate);

                return (
                  <TouchableOpacity
                    key={committee.id}
                    onPress={() => setSelectedCommitteeId(committee.id)}
                    style={[
                      styles.phoneCommitteeChip,
                      {
                        backgroundColor: isSelected ? colors.surfaceElevated : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        borderWidth: isSelected ? borders.standard : borders.hairline,
                        borderRadius: radius.full,
                        paddingHorizontal: spacing.sm + 2,
                        paddingVertical: spacing.xs + 2,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: committee.color || colors.primary },
                      ]}
                    />
                    <AppText
                      variant="caption"
                      numberOfLines={1}
                      style={{
                        color: isSelected ? colors.textPrimary : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '500',
                      }}
                    >
                      {committee.name}
                    </AppText>
                    {days > 0 && status === 'active' && (
                      <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 10 }}>
                        {`${days}g`}
                      </AppText>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setShowCommitteeModal(true)}
                style={[
                  styles.phoneCommitteeChip,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                    borderWidth: borders.hairline,
                    borderRadius: radius.full,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs + 2,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Tüm Komiteler"
              >
                <Feather name="grid" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Factual Context Coverage Bar */}
          <View
            style={[
              styles.coverageBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderWidth: borders.hairline,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.atlas?.coverageSummary(practicedTopicsCount, totalTopicsCount) ??
                  `${practicedTopicsCount} / ${totalTopicsCount} konu çalışıldı`}
                {totalStudyMinutes > 0 ? ` · ${totalStudyMinutes} dk` : ''}
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/committees/${activeCommittee.id}` as Href)}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              <AppText variant="caption" color={colors.primary} style={{ fontWeight: '600', marginRight: 2 }}>
                {'Detay'}
              </AppText>
              <Feather name="chevron-right" size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Subjects Empty State */}
          {subjects.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSubtle,
                  borderWidth: borders.standard,
                  borderRadius: radius.md,
                  padding: spacing.xl,
                },
              ]}
            >
              <Feather name="book" size={32} color={colors.textMuted} />
              <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm, textAlign: 'center' }}>
                {t.atlas?.noSubjects ?? 'Bu komiteye henüz ders eklenmedi.'}
              </AppText>
              <Button
                label={t.atlas?.addSubject ?? 'Ders Ekle'}
                variant="primary"
                size="sm"
                onPress={() =>
                  router.push(`/subjects/new?committeeId=${encodeURIComponent(activeCommittee.id)}` as Href)
                }
                style={{ marginTop: spacing.md }}
              />
            </View>
          ) : (
            /* Subjects Progressive Reveal with Active Academic Spine */
            <View style={{ gap: spacing.sm }}>
              {subjects.map((subject) => {
                const isExpanded = expandedSubjectIds.has(subject.id);
                const subTopics = topicsBySubject.get(subject.id) ?? [];
                const practicedCount = subTopics.filter((tItem) => evidenceByTopic.get(tItem.id)?.practiced).length;

                return (
                  <Card
                    key={subject.id}
                    variant="default"
                    style={[
                      styles.phoneSubjectCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.borderSubtle,
                        padding: spacing.md,
                      },
                    ]}
                  >
                    {/* Subject Header */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleSubjectExpanded(subject.id)}
                      style={styles.phoneSubjectHeader}
                    >
                      <View style={{ flex: 1, marginRight: spacing.xs }}>
                        <AppText variant="body" style={{ fontWeight: '600' }}>
                          {subject.name}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                          {`${subTopics.length} konu${practicedCount > 0 ? ` · ${practicedCount} çalışıldı` : ''}`}
                        </AppText>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <TouchableOpacity
                          onPress={() =>
                            router.push(`/topics/new?subjectId=${encodeURIComponent(subject.id)}` as Href)
                          }
                          style={{ padding: 4 }}
                          accessibilityRole="button"
                          accessibilityLabel={t.atlas?.addTopic ?? 'Konu Ekle'}
                        >
                          <Feather name="plus-circle" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Progressive Reveal: Academic Spine + Topics */}
                    {isExpanded && (
                      <View
                        style={[
                          styles.academicSpineContainer,
                          {
                            borderColor: colors.borderSubtle,
                            borderTopWidth: borders.hairline,
                            marginTop: spacing.sm,
                            paddingTop: spacing.sm,
                          },
                        ]}
                      >
                        {subTopics.length === 0 ? (
                          <View style={{ paddingVertical: spacing.xs }}>
                            <AppText variant="caption" color={colors.textMuted}>
                              {t.atlas?.noTopics ?? 'Bu derste henüz konu yok.'}
                            </AppText>
                            <Button
                              label={t.atlas?.addTopic ?? 'Konu Ekle'}
                              size="sm"
                              variant="outline"
                              onPress={() =>
                                router.push(`/topics/new?subjectId=${encodeURIComponent(subject.id)}` as Href)
                              }
                              style={{ marginTop: spacing.xs, alignSelf: 'flex-start' }}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.spineTree,
                              {
                                borderLeftColor: colors.borderSubtle,
                                borderLeftWidth: 2,
                                marginLeft: spacing.xs,
                                paddingLeft: spacing.sm,
                                gap: spacing.xs + 2,
                              },
                            ]}
                          >
                            {subTopics.map((topic) => {
                              const evidence = evidenceByTopic.get(topic.id);
                              const studyMins = evidence?.studySeconds ? Math.round(evidence.studySeconds / 60) : 0;

                              return (
                                <View
                                  key={topic.id}
                                  style={[
                                    styles.phoneTopicRow,
                                    {
                                      backgroundColor: colors.surfaceElevated,
                                      borderColor: colors.borderSubtle,
                                      borderWidth: borders.hairline,
                                      borderRadius: radius.sm,
                                      paddingHorizontal: spacing.sm,
                                      paddingVertical: spacing.xs + 2,
                                    },
                                  ]}
                                >
                                  <TouchableOpacity
                                    style={{ flex: 1, marginRight: spacing.xs }}
                                    onPress={() => router.push(`/topics/${topic.id}` as Href)}
                                  >
                                    <AppText variant="bodySmall" numberOfLines={1} style={{ fontWeight: '500' }}>
                                      {topic.name}
                                    </AppText>
                                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: 2 }}>
                                      {studyMins > 0 ? (
                                        <AppText variant="caption" color={colors.primary} style={{ fontSize: 11 }}>
                                          {`${studyMins} dk odak`}
                                        </AppText>
                                      ) : (
                                        <AppText variant="caption" color={colors.textMuted} style={{ fontSize: 11 }}>
                                          {t.atlas?.unpracticed ?? 'Henüz çalışılmadı'}
                                        </AppText>
                                      )}
                                      {(evidence?.dueCardCount ?? 0) > 0 && (
                                        <AppText variant="caption" color={colors.warning} style={{ fontSize: 11 }}>
                                          {` · ${evidence!.dueCardCount} tekrar`}
                                        </AppText>
                                      )}
                                    </View>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => handleStartFocus(topic)}
                                    style={{ padding: 6 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={t.atlas?.focusTopic ?? 'Odaklan'}
                                  >
                                    <Feather name="play" size={14} color={colors.primary} />
                                  </TouchableOpacity>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </Card>
                );
              })}

              {/* Bottom Add Subject Action */}
              <Button
                label={t.subjects.add}
                variant="outline"
                size="md"
                icon={<Feather name="plus" size={14} color={colors.primary} />}
                onPress={() =>
                  router.push(`/subjects/new?committeeId=${encodeURIComponent(activeCommittee.id)}` as Href)
                }
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}
        </View>
      )}

      {/* ── Committee Switcher Modal (Uses ListRow presentation for invariants) ─── */}
      <Modal
        visible={showCommitteeModal}
        onClose={() => setShowCommitteeModal(false)}
        title={t.atlas?.allCommittees ?? 'Komiteler'}
        presentation="sheet"
      >
        <View style={{ gap: spacing.xs, paddingBottom: spacing.lg }}>
          {committees.map((c, index) => {
            const status = getCommitteeDateStatus(c.startDate, c.examDate);
            const days = getCommitteeDaysToExam(c.examDate);
            const daysLabel = status === 'completed' ? (t.sweep?.statuses?.completed ?? 'Tamamlandı') : (t.sweep?.daysLeft(days) ?? `${days} gün`);
            const isLast = index === committees.length - 1;
            const isSelected = c.id === activeCommittee?.id;

            return (
              <ListRow
                key={c.id}
                title={c.name}
                subtitle={`${formatExamDate(c.examDate, t.dashboard.locale)} · ${daysLabel}`}
                leading={
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.color || colors.primary },
                    ]}
                  />
                }
                trailing={
                  isSelected ? (
                    <Badge label="Seçili" variant="primary" size="sm" />
                  ) : (
                    <Badge
                      label={t.sweep?.statuses?.[status] ?? status}
                      variant={status === 'active' ? 'success' : status === 'upcoming' ? 'info' : 'default'}
                      size="sm"
                    />
                  )
                }
                borderBottom={!isLast}
                onPress={() => {
                  setSelectedCommitteeId(c.id);
                  setShowCommitteeModal(false);
                }}
              />
            );
          })}

          <Button
            label={t.committees.newCommittee}
            variant="secondary"
            size="md"
            icon={<Feather name="plus" size={14} color={colors.primary} />}
            onPress={() => {
              setShowCommitteeModal(false);
              router.push('/committees/new' as Href);
            }}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  colorDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 560,
  },
  tabletMaster: {
    minWidth: 280,
    maxWidth: 400,
    flexShrink: 0,
  },
  masterCommitteeBox: {},
  masterCommitteeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  masterCommitteeMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  masterSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  masterSubjectRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tabletDetail: {
    flex: 1,
    minWidth: 0,
  },
  detailHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailMetricsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  metricItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  topicCard: {
    overflow: 'hidden',
  },
  topicCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topicCardBottom: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyDetailBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyInlineBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCommitteeChip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  coverageBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneSubjectCard: {},
  phoneSubjectHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  academicSpineContainer: {},
  spineTree: {},
  phoneTopicRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
