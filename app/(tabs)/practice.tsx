/**
 * Practice Tab — Phase 14.6F Canonical Destination
 *
 * Dedicated primary workspace for all learning and practice modalities:
 * 1. Continue Session Hero (active/recent topic)
 * 2. Practice Modes (Questions, Flashcards, Topic Review, Focus Session)
 * 3. Needs Attention (Weak topics from curriculum analytics)
 * 4. Performance & Activity (Questions Answered — Last 7 Days, Recent Sessions)
 *
 * Responsive Shell:
 * - Phone: Vertically scrollable single-column workspace (Figma 39:20)
 * - Tablet: Two-column layout — left practice workspace (Figma 39:193) + right performance area
 *
 * Preserves 100% existing business logic, stores, repos, and offline SQLite data.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { TabTopHeader } from '@/components/layout/TabTopHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ListRow } from '@/components/ui/ListRow';
import { AppText } from '@/components/ui/Typography';
import { WeakTopicsList } from '@/components/analytics/WeakTopicsList';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { useMemoryStore } from '@/store/useMemoryStore';
import { useFocusStore } from '@/store/useFocusStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { qbankRepo } from '@/db/repositories/qbankRepo';
import { focusRepo } from '@/db/repositories/focusRepo';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import { getWeakTopics } from '@/utils/analyticsPriorityRules';
import type { WeakTopicItem } from '@/models/analytics';
import type { QBankSession } from '@/models/qbank';
import type { FocusSession } from '@/store/useFocusStore';

export default function PracticeScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isTablet, isLargeTablet, isLandscape } = useResponsive();
  const t = useTranslation();

  const isDBReady = useAppStore((s) => s.isDBReady);
  const decks = useMemoryStore((s) => s.decks);
  const loadDecks = useMemoryStore((s) => s.loadDecks);
  const timerStatus = useFocusStore((s) => s.timerStatus);
  const selectedTopicName = useFocusStore((s) => s.selectedTopicName);
  const committees = useCommitteeStore((s) => s.committees);
  const loadCommittees = useCommitteeStore((s) => s.loadCommittees);

  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [recentQBank, setRecentQBank] = useState<QBankSession[]>([]);
  const [recentFocus, setRecentFocus] = useState<FocusSession[]>([]);

  useEffect(() => {
    if (!isDBReady) return;
    loadDecks();
    loadCommittees();

    // Query factual evidence from SQLite repos
    try {
      setRecentQBank(qbankRepo.getRecent(20));
    } catch {
      setRecentQBank([]);
    }

    try {
      setRecentFocus(focusRepo.getRecent(10));
    } catch {
      setRecentFocus([]);
    }
  }, [isDBReady, loadDecks, loadCommittees]);

  // Compute weak topics across committees using pure deterministic rules
  useEffect(() => {
    if (!isDBReady || committees.length === 0) return;
    try {
      const allEvidences = committees.flatMap((c) => {
        try {
          return analyticsRepo.getCommitteeTopicAnalytics(c.id);
        } catch {
          return [];
        }
      });
      setWeakTopics(getWeakTopics(allEvidences, 3));
    } catch {
      setWeakTopics([]);
    }
  }, [isDBReady, committees]);

  // Compute due counts per deck
  const deckSchedules = useMemo(() => {
    if (!isDBReady || decks.length === 0) return [];
    return decks.map((deck) => {
      try {
        const summary = memoryRepo.getScheduleSummary(deck.id);
        return { deck, due: summary.due, total: deck.cardCount };
      } catch {
        return { deck, due: 0, total: deck.cardCount };
      }
    });
  }, [decks, isDBReady]);

  const totalDue = useMemo(
    () => deckSchedules.reduce((sum, d) => sum + d.due, 0),
    [deckSchedules]
  );

  // Compute Last 7 Days metrics
  const last7DaysStats = useMemo(() => {
    const cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const qb7 = recentQBank.filter((s) => s.createdAt >= cutoffMs);
    const totalQuestions = qb7.reduce((sum, s) => sum + s.totalQuestions, 0);
    const correctQuestions = qb7.reduce((sum, s) => sum + s.correctCount, 0);
    const accuracy =
      totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : null;

    const focus7 = recentFocus.filter((s) => s.startedAt >= cutoffMs);
    const totalFocusMinutes = Math.round(
      focus7.reduce((sum, s) => sum + s.actualSec, 0) / 60
    );

    return { totalQuestions, correctQuestions, accuracy, totalFocusMinutes };
  }, [recentQBank, recentFocus]);

  const focusIsActive = timerStatus !== 'idle';

  // Determine featured / continue session topic
  const featuredTopicName = useMemo(() => {
    if (selectedTopicName) return selectedTopicName;
    if (weakTopics.length > 0) return weakTopics[0].topicName;
    return 'Cardiac Electrophysiology';
  }, [selectedTopicName, weakTopics]);

  // ── Navigation handlers ─────────────────────────────────────────────────
  function handleContinueSession() {
    router.push('/(tabs)/focus?returnTo=%2F%28tabs%29%2Fpractice' as Href);
  }

  function handleQuestions() {
    router.push('/qbank/new' as Href);
  }

  function handleFlashcards() {
    router.push('/(tabs)/memory' as Href);
  }

  function handleTopicReview() {
    router.push('/(tabs)/committees' as Href);
  }

  function handleFocusSession() {
    router.push('/(tabs)/focus?returnTo=%2F%28tabs%29%2Fpractice' as Href);
  }

  if (!isDBReady) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenWrapper>
    );
  }

  const isWide = isLargeTablet || (isTablet && isLandscape);

  // ── 1. Continue Session Hero ───────────────────────────────────────────
  const heroCard = (
    <Card
      elevated
      style={{
        padding: spacing.lg,
        backgroundColor: colors.surfaceElevated,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        borderRadius: radius.lg,
        gap: spacing.md,
      }}
    >
      <View style={styles.heroTopRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Badge
              label={focusIsActive ? t.dashboard.committeeStatuses.active : 'Recommended'}
              variant={focusIsActive ? 'success' : 'default'}
              size="sm"
              dot={focusIsActive}
            />
            {totalDue > 0 && (
              <Badge
                label={t.practice.cardsDue(totalDue)}
                variant="warning"
                size="sm"
              />
            )}
          </View>
          <AppText variant="h2" style={{ marginTop: spacing.xs }}>
            {featuredTopicName}
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
            Cardiovascular · Physiology
          </AppText>
        </View>
      </View>

      <Button
        label={
          focusIsActive
            ? t.topics.continueFocus ?? 'Continue Focus'
            : t.practice.continueSession
        }
        variant="primary"
        size="lg"
        icon={<Feather name="play" size={18} color={colors.textInverse} />}
        onPress={handleContinueSession}
      />
    </Card>
  );

  // ── 2. Practice Modes (4 Primary Modalities) ───────────────────────────
  const practiceModes = (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t.practice.modesTitle} />
      <View style={styles.modesGrid}>
        {/* Mode 1: Questions */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.practice.questionsTitle}
          onPress={handleQuestions}
          style={({ pressed }) => [styles.modeTile, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Card
            style={[
              styles.modeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            <View style={[styles.modeIconWell, { backgroundColor: colors.accentSoft }]}>
              <Feather name="edit-3" size={20} color={colors.accentMoss} />
            </View>
            <AppText variant="label" style={{ fontWeight: '600', marginTop: spacing.xs }}>
              {t.practice.questionsTitle}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {t.practice.questionsDesc}
            </AppText>
          </Card>
        </Pressable>

        {/* Mode 2: Flashcards */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.practice.flashcardsTitle}
          onPress={handleFlashcards}
          style={({ pressed }) => [styles.modeTile, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Card
            style={[
              styles.modeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            <View style={styles.modeIconRow}>
              <View style={[styles.modeIconWell, { backgroundColor: colors.accentSoft }]}>
                <Feather name="layers" size={20} color={colors.accentMoss} />
              </View>
              {totalDue > 0 && (
                <Badge label={`${totalDue}`} variant="warning" size="sm" />
              )}
            </View>
            <AppText variant="label" style={{ fontWeight: '600', marginTop: spacing.xs }}>
              {t.practice.flashcardsTitle}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {totalDue > 0 ? t.practice.cardsDue(totalDue) : t.practice.flashcardsDesc}
            </AppText>
          </Card>
        </Pressable>

        {/* Mode 3: Topic Review */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.practice.topicReviewTitle}
          onPress={handleTopicReview}
          style={({ pressed }) => [styles.modeTile, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Card
            style={[
              styles.modeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            <View style={[styles.modeIconWell, { backgroundColor: colors.surfaceSubtle }]}>
              <Feather name="map" size={20} color={colors.textPrimary} />
            </View>
            <AppText variant="label" style={{ fontWeight: '600', marginTop: spacing.xs }}>
              {t.practice.topicReviewTitle}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {t.practice.topicReviewDesc}
            </AppText>
          </Card>
        </Pressable>

        {/* Mode 4: Focus Session */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.practice.focusSessionTitle}
          onPress={handleFocusSession}
          style={({ pressed }) => [styles.modeTile, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Card
            style={[
              styles.modeCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderSubtle,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
          >
            <View style={[styles.modeIconWell, { backgroundColor: colors.surfaceSubtle }]}>
              <Feather name="clock" size={20} color={colors.textPrimary} />
            </View>
            <AppText variant="label" style={{ fontWeight: '600', marginTop: spacing.xs }}>
              {t.practice.focusSessionTitle}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {t.practice.focusSessionDesc}
            </AppText>
          </Card>
        </Pressable>
      </View>
    </View>
  );

  // ── 3. Needs Attention Section ─────────────────────────────────────────
  const attentionSection = (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t.practice.needsAttentionTitle} />
      {weakTopics.length > 0 ? (
        <WeakTopicsList topics={weakTopics} />
      ) : (
        <Card
          style={{
            padding: spacing.lg,
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: radius.md,
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <Feather name="check-circle" size={28} color={colors.success} />
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center', marginTop: 4 }}>
            {t.practice.noAttentionNeeded}
          </AppText>
        </Card>
      )}
    </View>
  );

  // ── 4. Questions Answered — Last 7 Days & Recent Sessions ──────────────
  const performanceSection = (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t.practice.last7Days} />
      <Card
        style={{
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: 1,
          borderRadius: radius.md,
          gap: spacing.sm,
        }}
      >
        <View style={styles.statRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={colors.textMuted}>
              {t.practice.questionsAnswered}
            </AppText>
            <AppText variant="h2" style={{ marginTop: 2 }}>
              {last7DaysStats.totalQuestions}
            </AppText>
          </View>
          {last7DaysStats.accuracy !== null && (
            <Badge
              label={t.practice.accuracy(last7DaysStats.accuracy)}
              variant={last7DaysStats.accuracy >= 70 ? 'success' : 'warning'}
              size="sm"
            />
          )}
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />

        <View style={styles.miniStatsRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={colors.textMuted}>
              Focus Time
            </AppText>
            <AppText variant="label" style={{ fontWeight: '600', marginTop: 2 }}>
              {last7DaysStats.totalFocusMinutes} min
            </AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" color={colors.textMuted}>
              Flashcards Due
            </AppText>
            <AppText variant="label" style={{ fontWeight: '600', marginTop: 2 }}>
              {totalDue}
            </AppText>
          </View>
        </View>
      </Card>

      {/* Recent Activity List */}
      <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
        <AppText variant="subhead" style={{ fontWeight: '600' }}>
          {t.practice.recentSessions}
        </AppText>

        {recentQBank.length === 0 && recentFocus.length === 0 ? (
          <Card style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm }}>
            <AppText variant="caption" color={colors.textMuted}>
              {t.practice.noRecentSessions}
            </AppText>
          </Card>
        ) : (
          <Card
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              borderRadius: radius.md,
              overflow: 'hidden',
            }}
          >
            {recentQBank.slice(0, 3).map((session, index) => (
              <ListRow
                key={session.id}
                title={session.sourceName || 'Q-Bank Drill'}
                subtitle={`${session.totalQuestions} questions · ${session.correctCount} correct`}
                leading={<Feather name="edit-3" size={16} color={colors.accentMoss} />}
                trailing={
                  <Badge
                    label={`${Math.round((session.correctCount / session.totalQuestions) * 100)}%`}
                    variant="default"
                    size="sm"
                  />
                }
                borderBottom={index < Math.min(recentQBank.length, 3) - 1}
              />
            ))}
          </Card>
        )}
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable contentStyle={styles.scrollContent}>
      <TabTopHeader />

      {/* Workspace Page Header */}
      <View style={styles.header}>
        <AppText variant={isTablet ? 'h1' : 'h2'}>
          {t.practice.title}
        </AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
          {t.practice.subtitle}
        </AppText>
      </View>

      {/* Responsive Composition */}
      {isWide ? (
        // TABLET — 39:162: left workspace (39:193) + right performance area
        <View style={[styles.tabletLayout, { gap: spacing.xl }]}>
          <View style={[styles.leftWorkspace, { gap: spacing.xl }]}>
            {heroCard}
            {practiceModes}
            {attentionSection}
          </View>
          <View style={[styles.rightPerformanceArea, { gap: spacing.xl }]}>
            {performanceSection}
          </View>
        </View>
      ) : (
        // PHONE — 39:5: single scrollable column (39:20)
        <View style={[styles.phoneLayout, { gap: spacing.xl }]}>
          {heroCard}
          {practiceModes}
          {attentionSection}
          {performanceSection}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  header: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modeTile: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
  modeCard: {
    borderWidth: 1,
    gap: 6,
    minHeight: 110,
    justifyContent: 'center',
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeIconWell: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statDivider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneLayout: {
    width: '100%',
  },
  tabletLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  leftWorkspace: {
    flex: 3,
    minWidth: 0,
  },
  rightPerformanceArea: {
    flex: 2,
    minWidth: 280,
  },
});
