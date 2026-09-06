import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CommitteeOverviewCard } from '@/components/dashboard/CommitteeOverviewCard';
import { QuickStartCard } from '@/components/dashboard/QuickStartCard';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { TodayMetrics } from '@/components/dashboard/TodayMetrics';
import { MomentumCard } from '@/components/dashboard/MomentumCard';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useDashboardStore } from '@/store/useDashboardStore';
import { DEFAULT_FOCUS_SEC, useFocusStore } from '@/store/useFocusStore';
import { getLocalDayRange } from '@/utils/calendarDate';
import {
  getDashboardGreeting,
  type DashboardAgendaItem,
  type DashboardQuickStart,
} from '@/utils/dashboardRules';
import { useTranslation } from '@/i18n';

export default function DashboardScreen() {
  const { colors, spacing } = useTheme();
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
    return snapshot?.quickStart ?? {
      kind: 'generic_focus',
      title: t.dashboard.genericTitle,
      detail: t.dashboard.genericDetail,
    };
  }, [snapshot?.quickStart, timerStatus, t]);

  function handleQuickStart() {
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle' || recommendation.kind === 'continue_focus') {
      router.push('/(tabs)/focus' as Href);
      return;
    }

    if (recommendation.kind === 'memory_review') {
      router.push(`/decks/${recommendation.deckId}/review` as Href);
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
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
      </ScreenWrapper>
    );
  }

  const partialErrorCount = Object.keys(sectionErrors).length;
  const headerStatus =
    t.dashboard.plannedToday(snapshot.agendaTotal);

  const quickStart = (
    <QuickStartCard
      recommendation={recommendation}
      onAction={handleQuickStart}
      onStartSmall={timerStatus === 'idle' ? handleStartSmall : undefined}
      onCheckIn={timerStatus === 'idle' ? handleCheckIn : undefined}
    />
  );
  const committee = (
    <CommitteeOverviewCard
      committee={snapshot.committee}
      error={sectionErrors.committee}
      onOpen={(id) => router.push(`/committees/${id}` as Href)}
      onCreate={() => router.push('/committees/new' as Href)}
    />
  );
  const metrics = (
    <TodayMetrics
      focus={snapshot.focus}
      memory={snapshot.memory}
      focusError={sectionErrors.focus}
      memoryError={sectionErrors.memory}
      onOpenFocus={() => router.push('/(tabs)/focus' as Href)}
      onOpenMemory={() => router.push('/(tabs)/memory' as Href)}
    />
  );
  const agenda = (
    <TodayAgenda
      items={snapshot.agenda}
      total={snapshot.agendaTotal}
      error={sectionErrors.agenda}
      onOpenItem={openAgendaItem}
      onOpenCalendar={() => router.push('/(tabs)/calendar' as Href)}
    />
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant="caption" color={colors.textMuted}>
          {new Date(getLocalDayRange(snapshot.date).startMs).toLocaleDateString(t.dashboard.locale, { weekday: 'long', month: 'long', day: 'numeric' })}
        </AppText>
        <AppText variant={isTablet ? 'h1' : 'h2'} style={{ marginTop: spacing.xs }}>
          {t.dashboard.greeting(getDashboardGreeting())}
        </AppText>
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          {headerStatus}
        </AppText>
      </View>

      {partialErrorCount > 0 && (
        <View style={[styles.partialError, { borderColor: colors.border, marginTop: spacing.md, padding: spacing.sm }]}>
          <Feather name="alert-circle" size={17} color={colors.textMuted} />
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.partialErrorText}>
            {t.dashboard.partialError}
          </AppText>
          <Button label={t.common.retry} variant="ghost" size="sm" onPress={refresh} loading={isRefreshing} />
        </View>
      )}

      {isLargeTablet ? (
        <View style={[styles.twoPane, { gap: spacing.lg, marginTop: spacing.lg }]}>
          <View style={[styles.column, { gap: spacing.lg }]}>
            {quickStart}
            <MomentumCard />
            {committee}
          </View>
          <View style={[styles.column, { gap: spacing.lg }]}>
            {metrics}
            {agenda}
          </View>
        </View>
      ) : (
        <View style={[styles.stacked, { gap: spacing.lg, marginTop: spacing.lg }]}>
          {quickStart}
          <MomentumCard />
          {committee}
          {metrics}
          {agenda}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingBottom: 4, paddingTop: 8 },
  partialError: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row' },
  partialErrorText: { flex: 1, marginLeft: 8 },
  stacked: { width: '100%' },
  twoPane: { alignItems: 'flex-start', flexDirection: 'row', width: '100%' },
  column: { flex: 1, minWidth: 0 },
});
