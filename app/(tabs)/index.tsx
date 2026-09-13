import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CommitteeOverviewCard } from '@/components/dashboard/CommitteeOverviewCard';
import { DailyStateCard } from '@/components/dashboard/DailyStateCard';
import { QuickStartCard } from '@/components/dashboard/QuickStartCard';
import { TodayAgenda } from '@/components/dashboard/TodayAgenda';
import { TodayMetrics } from '@/components/dashboard/TodayMetrics';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
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
  const { colors, spacing, radius, borders } = useTheme();
  const { isTablet, isLargeTablet, isLandscape, width } = useResponsive();
  const t = useTranslation();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const snapshot = useDashboardStore((state) => state.snapshot);
  const isInitialLoading = useDashboardStore((state) => state.isInitialLoading);
  const isRefreshing = useDashboardStore((state) => state.isRefreshing);
  const sectionErrors = useDashboardStore((state) => state.sectionErrors);
  const refresh = useDashboardStore((state) => state.refresh);
  const timerStatus = useFocusStore((state) => state.timerStatus);
  const selectedCommitteeId = useFocusStore((state) => state.selectedCommitteeId);
  const selectedSubjectId = useFocusStore((state) => state.selectedSubjectId);
  const selectedTopicId = useFocusStore((state) => state.selectedTopicId);
  const setAcademicContext = useFocusStore((state) => state.setAcademicContext);

  useDashboardRefresh(isDBReady, refresh);

  // Prefill active committee into focus store if idle and no context selected yet
  useEffect(() => {
    if (timerStatus === 'idle' && snapshot?.committee?.id && !selectedCommitteeId) {
      setAcademicContext({
        committeeId: snapshot.committee.id,
      });
    }
  }, [timerStatus, snapshot?.committee?.id, selectedCommitteeId, setAcademicContext]);

  // Pure analytics priority reference for weak topics
  const weakTopics = useMemo(() => {
    try {
      if (!snapshot?.committee?.id) return [];
      const evidences = analyticsRepo.getCommitteeTopicAnalytics(snapshot.committee.id);
      return getWeakTopics(evidences);
    } catch {
      return [];
    }
  }, [snapshot?.committee?.id]);

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

    focusState.setPlannedSec(DEFAULT_FOCUS_SEC);

    // If context was not selected, fallback to recommendation/active committee
    if (!focusState.selectedCommitteeId) {
      const fallbackCommitteeId =
        recommendation.kind === 'manual_focus' || recommendation.kind === 'committee_focus'
          ? recommendation.committeeId
          : snapshot?.committee?.id ?? null;
      if (fallbackCommitteeId) {
        focusState.setSelectedCommittee(fallbackCommitteeId);
      }
    }

    focusState.startTimer();
    router.push('/(tabs)/focus' as Href);
  }

  function handleStartSmall() {
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle') {
      router.push('/(tabs)/focus' as Href);
      return;
    }

    const fallbackCommitteeId =
      recommendation.kind === 'manual_focus' || recommendation.kind === 'committee_focus'
        ? recommendation.committeeId
        : snapshot?.committee?.id ?? null;

    const started = focusState.startEntrySession({
      committeeId: focusState.selectedCommitteeId ?? fallbackCommitteeId,
      subjectId: focusState.selectedSubjectId,
      topicId: focusState.selectedTopicId,
    });
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
        <AppText variant="bodyS" style={{ color: colors.textSecondary, marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
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

  const dailyState = (
    <DailyStateCard
      committeeId={snapshot.committee?.id ?? null}
      onStartSmall={timerStatus === 'idle' ? handleStartSmall : undefined}
      onCheckIn={timerStatus === 'idle' ? handleCheckIn : undefined}
    />
  );

  const quickStart = (
    <QuickStartCard
      recommendation={recommendation}
      onAction={handleQuickStart}
      onStartSmall={timerStatus === 'idle' ? handleStartSmall : undefined}
      onCheckIn={timerStatus === 'idle' ? handleCheckIn : undefined}
      academicContext={{
        committeeId: selectedCommitteeId,
        subjectId: selectedSubjectId,
        topicId: selectedTopicId,
      }}
      onAcademicContextChange={timerStatus === 'idle' ? setAcademicContext : undefined}
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

  const agenda = (
    <TodayAgenda
      items={snapshot.agenda}
      total={snapshot.agendaTotal}
      error={sectionErrors.agenda}
      onOpenItem={openAgendaItem}
      onOpenCalendar={() => router.push('/(tabs)/calendar' as Href)}
    />
  );

  const aiContextual = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.dashboard.aiAssistant}
      onPress={() => {
        if (snapshot.committee) {
          router.push(`/committees/${snapshot.committee.id}/study-plan` as Href);
        } else {
          router.push('/(tabs)/ai' as Href);
        }
      }}
      style={({ pressed }) => [
        styles.aiStrip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: borders.hairline,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.aiRow, { gap: spacing.sm }]}>
        <Feather name="cpu" size={14} color={colors.accent} />
        <View style={styles.aiText}>
          <AppText
            variant="labelS"
            style={{
              color: colors.textPrimary,
              fontWeight: '600',
            }}
          >
            {snapshot.committee ? t.studyPlan.studyPlanButton : t.dashboard.aiAssistant}
          </AppText>
          <AppText variant="labelS" style={{ color: colors.textSecondary }}>
            {snapshot.committee ? snapshot.committee.name : t.dashboard.aiAssistantDesc}
          </AppText>
        </View>
        <Feather name="chevron-right" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );

  const isTwoPane =
    isLargeTablet ||
    (isTablet && isLandscape) ||
    (isTablet && width >= 680);

  const twoPaneGap = isLandscape || isLargeTablet ? spacing.xl : spacing.md;

  return (
    <ScreenWrapper maxWidth={isTablet ? (isLandscape || isLargeTablet ? 'workspace' : 'wide') : undefined}>
      {/* Editorial ScreenHeader with Greeting, Date, Committee Timing, and Add Topic */}
      <ScreenHeader
        title={t.dashboard.greeting(getDashboardGreeting())}
        eyebrow={new Date(getLocalDayRange(snapshot.date).startMs).toLocaleDateString(
          t.dashboard.locale,
          { weekday: 'long', month: 'short', day: 'numeric' }
        )}
        subtitle={
          snapshot.committee
            ? `${snapshot.committee.name} · ${t.dashboard.examTiming(snapshot.committee.daysToExam, snapshot.committee.status === 'recently_completed')}`
            : headerStatus
        }
        trailing={
          <Button
            label={t.dashboard.addTopic}
            variant="secondary"
            size="sm"
            icon={<Feather name="plus" size={14} color={colors.textSecondary} />}
            onPress={() => router.push('/topics/new' as Href)}
            accessibilityLabel={t.dashboard.addTopic}
          />
        }
      />

      {partialErrorCount > 0 && (
        <Card
          variant="default"
          style={[
            styles.partialError,
            {
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surfaceElevated,
              marginTop: spacing.md,
              padding: spacing.sm,
            },
          ]}
        >
          <View style={[styles.partialErrorRow, { gap: spacing.sm }]}>
            <Feather name="alert-circle" size={16} color={colors.textMuted} />
            <AppText variant="bodyS" style={[styles.partialErrorText, { color: colors.textSecondary }]}>
              {t.dashboard.partialError}
            </AppText>
            <Button
              label={t.common.retry}
              variant="ghost"
              size="sm"
              onPress={refresh}
              loading={isRefreshing}
            />
          </View>
        </Card>
      )}

      {/* Responsive Editorial Composition: Tablet 2-Pane (Figma 23:110) vs Phone Single Column (Figma 23:7) */}
      {isTwoPane ? (
        <View style={[styles.twoPane, { gap: twoPaneGap, marginTop: spacing.md }]}>
          {/* LEFT / PRIMARY: Screen context, study intention, daily state, committee */}
          <View
            style={[
              styles.primaryColumn,
              {
                flex: isLandscape || isLargeTablet ? 1.15 : 1,
                gap: spacing.md,
              },
            ]}
          >
            {quickStart}
            {dailyState}
            {committee}
          </View>

          {/* RIGHT / EVIDENCE: Agenda, metrics ledger, contextual action */}
          <View
            style={[
              styles.evidenceColumn,
              {
                flex: 1,
                gap: spacing.md,
              },
            ]}
          >
            {agenda}
            {metrics}
            {aiContextual}
          </View>
        </View>
      ) : (
        /* PHONE / COMPACT (Figma 23:7): Single continuous editorial flow */
        <View style={[styles.stacked, { gap: spacing.md, marginTop: spacing.md }]}>
          {quickStart}
          {dailyState}
          {committee}
          {metrics}
          {agenda}
          {aiContextual}
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
  partialError: {
    width: '100%',
  },
  partialErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
  primaryColumn: {
    minWidth: 290,
  },
  evidenceColumn: {
    minWidth: 280,
  },
  aiStrip: {
    width: '100%',
  },
  aiRow: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  aiText: {
    flex: 1,
  },
});
