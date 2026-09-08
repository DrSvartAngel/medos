import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { CommitteeOverviewCard } from '@/components/dashboard/CommitteeOverviewCard';
import { QuickStartCard } from '@/components/dashboard/QuickStartCard';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { TodayMetrics } from '@/components/dashboard/TodayMetrics';
import { MomentumCard } from '@/components/dashboard/MomentumCard';
import { WeakTopicsList } from '@/components/analytics/WeakTopicsList';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { DEFAULT_FOCUS_SEC, useFocusStore } from '@/store/useFocusStore';
import { getLocalDayRange } from '@/utils/calendarDate';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import { getWeakTopics } from '@/utils/analyticsPriorityRules';
import {
  getDashboardGreeting,
  type DashboardAgendaItem,
  type DashboardQuickStart,
} from '@/utils/dashboardRules';
import { useTranslation } from '@/i18n';

export default function DashboardScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isTablet, isLargeTablet } = useResponsive();
  const t = useTranslation();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const snapshot = useDashboardStore((state) => state.snapshot);
  const isInitialLoading = useDashboardStore((state) => state.isInitialLoading);
  const isRefreshing = useDashboardStore((state) => state.isRefreshing);
  const sectionErrors = useDashboardStore((state) => state.sectionErrors);
  const refresh = useDashboardStore((state) => state.refresh);
  const timerStatus = useFocusStore((state) => state.timerStatus);

  useDashboardRefresh(isDBReady, refresh);

  const recommendation = useMemo<DashboardQuickStart>(() => {
    if (timerStatus !== 'idle') {
      return {
        kind: 'continue_focus',
        title: timerStatus === 'paused' ? t.dashboard.pausedTitle : t.dashboard.activeTitle,
        detail:
          timerStatus === 'paused'
            ? t.dashboard.pausedDetail
            : t.dashboard.activeDetail,
      };
    }
    return (
      snapshot?.quickStart ?? {
        kind: 'generic_focus',
        title: t.dashboard.genericTitle,
        detail: t.dashboard.genericDetail,
      }
    );
  }, [snapshot?.quickStart, timerStatus, t]);

  const needsAttentionTopics = useMemo(() => {
    if (!isDBReady || !snapshot?.committee?.id) return [];
    try {
      const topicEvidences = analyticsRepo.getCommitteeTopicAnalytics(snapshot.committee.id);
      return getWeakTopics(topicEvidences, 3);
    } catch {
      return [];
    }
  }, [isDBReady, snapshot?.committee?.id]);

  function handleQuickStart() {
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle' || recommendation.kind === 'continue_focus') {
      router.push('/(tabs)/focus' as Href);
      return;
    }

    if (recommendation.kind === 'memory_review') {
      router.push(`/decks/${recommendation.deckId}/review?mode=due` as Href);
      return;
    }

    const committeeId =
      recommendation.kind === 'manual_focus' || recommendation.kind === 'committee_focus'
        ? recommendation.committeeId
        : null;
    focusState.setPlannedSec(DEFAULT_FOCUS_SEC);
    focusState.setSelectedCommittee(committeeId);
    focusState.startTimer();
    router.push('/(tabs)/focus' as Href);
  }

  function handleStartSmall() {
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle') {
      router.push('/(tabs)/focus' as Href);
      return;
    }

    const committeeId =
      recommendation.kind === 'manual_focus' || recommendation.kind === 'committee_focus'
        ? recommendation.committeeId
        : null;
    const started = focusState.startEntrySession({ committeeId });
    if (!started) {
      router.push('/(tabs)/focus' as Href);
      return;
    }
    router.push('/(tabs)/focus' as Href);
  }

  function handleCheckIn() {
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle') {
      router.push('/(tabs)/focus' as Href);
      return;
    }

    const committeeId =
      recommendation.kind === 'manual_focus' || recommendation.kind === 'committee_focus'
        ? recommendation.committeeId
        : null;
    router.push(
      committeeId
        ? ({
            pathname: '/study-support/check-in',
            params: { committeeId },
          } as Href)
        : ('/study-support/check-in' as Href)
    );
  }

  function openAgendaItem(item: DashboardAgendaItem) {
    if (item.type === 'manual') {
      router.push(`/calendar/${item.sourceId}` as Href);
    } else {
      router.push(`/committees/${item.sourceId}` as Href);
    }
  }

  if (!isDBReady || isInitialLoading || snapshot === null) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <GSText size="sm" style={{ color: colors.textSecondary, marginTop: spacing.md }}>
          {t.common.loading}
        </GSText>
      </ScreenWrapper>
    );
  }

  const partialErrorCount = Object.keys(sectionErrors).length;
  const headerStatus = t.dashboard.plannedToday(snapshot.agendaTotal);

  const committee = (
    <CommitteeOverviewCard
      committee={snapshot.committee}
      error={sectionErrors.committee}
      onOpen={(id) => router.push(`/committees/${id}` as Href)}
      onCreate={() => router.push('/committees/new' as Href)}
    />
  );

  const quickStart = (
    <QuickStartCard
      recommendation={recommendation}
      onAction={handleQuickStart}
      onStartSmall={timerStatus === 'idle' ? handleStartSmall : undefined}
      onCheckIn={timerStatus === 'idle' ? handleCheckIn : undefined}
    />
  );

  const metrics = (
    <TodayMetrics
      focus={snapshot.focus}
      memory={snapshot.memory}
      qbank={snapshot.qbank}
      focusError={sectionErrors.focus}
      memoryError={sectionErrors.memory}
      qbankError={sectionErrors.qbank}
      onOpenFocus={() => router.push('/(tabs)/focus' as Href)}
      onOpenMemory={() => router.push('/(tabs)/memory' as Href)}
      onOpenQBank={() => router.push('/qbank/new' as Href)}
    />
  );

  const needsAttention =
    needsAttentionTopics.length > 0 ? (
      <WeakTopicsList topics={needsAttentionTopics} />
    ) : null;

  const agenda = (
    <TodayAgenda
      items={snapshot.agenda}
      total={snapshot.agendaTotal}
      error={sectionErrors.agenda}
      onOpenItem={openAgendaItem}
      onOpenCalendar={() => router.push('/(tabs)/calendar' as Href)}
    />
  );

  const aiContextual = snapshot.committee ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.studyPlan.subtitle(snapshot.committee.name)}
      onPress={() => router.push(`/committees/${snapshot.committee!.id}/study-plan` as Href)}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <Card style={styles.aiCard}>
        <HStack style={styles.aiRow}>
          <Box
            style={[
              styles.aiIcon,
              {
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Feather name="cpu" size={16} color={colors.primary} />
          </Box>
          <VStack space="xs" style={styles.aiText}>
            <GSText
              size="sm"
              style={{
                color: colors.primary,
                fontWeight: '600',
              }}
            >
              {t.studyPlan.studyPlanButton}
            </GSText>
            <GSText size="xs" style={{ color: colors.textSecondary }}>
              {snapshot.committee.name}
            </GSText>
          </VStack>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </HStack>
      </Card>
    </Pressable>
  ) : null;

  return (
    <ScreenWrapper>
      {/* Top Context with Gluestack Typography & Hierarchy */}
      <VStack space="xs" style={styles.header}>
        <GSText
          size="xs"
          style={[
            styles.dateLabel,
            {
              color: colors.textMuted,
            },
          ]}
        >
          {new Date(getLocalDayRange(snapshot.date).startMs).toLocaleDateString(
            t.dashboard.locale,
            { weekday: 'long', month: 'long', day: 'numeric' }
          ).toUpperCase()}
        </GSText>

        <Heading
          size={isTablet ? '2xl' : 'xl'}
          style={[styles.greetingHeading, { color: colors.textPrimary }]}
        >
          {t.dashboard.greeting(getDashboardGreeting())}
        </Heading>

        <GSText size="sm" style={{ color: colors.textSecondary }}>
          {headerStatus}
        </GSText>
      </VStack>

      {partialErrorCount > 0 && (
        <Card
          style={[
            styles.partialError,
            {
              borderColor: colors.cardBorder,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceElevated,
              marginTop: spacing.md,
              padding: spacing.sm,
            },
          ]}
        >
          <HStack space="sm" style={{ alignItems: 'center' }}>
            <Feather name="alert-circle" size={16} color={colors.textMuted} />
            <GSText size="xs" style={[styles.partialErrorText, { color: colors.textSecondary }]}>
              {t.dashboard.partialError}
            </GSText>
            <Button
              label={t.common.retry}
              variant="ghost"
              size="sm"
              onPress={refresh}
              loading={isRefreshing}
            />
          </HStack>
        </Card>
      )}

      {/* Responsive Composition */}
      {isLargeTablet ? (
        <View style={[styles.twoPane, { gap: spacing.xl, marginTop: spacing.lg }]}>
          <View style={[styles.column, { gap: spacing.lg }]}>
            {committee}
            {quickStart}
            {needsAttention}
            {aiContextual}
          </View>
          <View style={[styles.column, { gap: spacing.lg }]}>
            {metrics}
            <MomentumCard />
            {agenda}
          </View>
        </View>
      ) : (
        <View style={[styles.stacked, { gap: spacing.lg, marginTop: spacing.lg }]}>
          {committee}
          {quickStart}
          {metrics}
          {needsAttention}
          <MomentumCard />
          {agenda}
          {aiContextual}
        </View>
      )}

      {/* TODO: Temporary diagnostic marker for physical acceptance — remove after verification */}
      <View style={styles.diagnosticMarker}>
        <GSText size="xs" style={[styles.diagnosticText, { color: colors.textMuted }]}>
          V2 GLUESTACK ACTIVE — 56db301
        </GSText>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  dateLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  greetingHeading: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  partialError: {
    borderWidth: 1,
  },
  partialErrorText: {
    flex: 1,
  },
  stacked: {
    width: '100%',
  },
  twoPane: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    width: '100%',
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  aiCard: {
    borderWidth: 1,
    padding: 12,
  },
  aiRow: {
    alignItems: 'center',
    width: '100%',
  },
  aiIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginRight: 10,
    width: 32,
  },
  aiText: {
    flex: 1,
  },
  diagnosticMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  diagnosticText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
