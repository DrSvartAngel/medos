import { translateError } from '@/i18n/errors';
import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { MiniVictory } from '@/components/ui/MiniVictory';
import {
  AccessibilityInfo,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CommitteePicker } from '@/components/focus/CommitteePicker';
import { DurationPicker } from '@/components/focus/DurationPicker';
import { EntryMilestone } from '@/components/focus/EntryMilestone';
import { GentleReturnCard } from '@/components/focus/GentleReturnCard';
import { SessionControls } from '@/components/focus/SessionControls';
import { SessionHistoryList } from '@/components/focus/SessionHistoryList';
import { TimerDisplay } from '@/components/focus/TimerDisplay';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useTimer } from '@/hooks/useTimer';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { isEntryMilestoneVisible, useFocusStore } from '@/store/useFocusStore';
import { normalizeFocusDurationSec } from '@/utils/preferences';
import { useTranslation } from '@/i18n';

export default function FocusScreen() {
  const { colors, spacing } = useTheme();
  const { isTablet, isLargeTablet } = useResponsive();
  const t = useTranslation();
  const [gentleReturnOpen, setGentleReturnOpen] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  useFocusEffect(useCallback(() => () => setShowVictory(false), []));
  const [gentleReturnError, setGentleReturnError] = useState<string | null>(null);
  const isDBReady = useAppStore((state) => state.isDBReady);
  const defaultFocusSec = useAppStore((state) => state.defaultFocusSec);
  const lowStimulationMode = useAppStore(
    (state) => state.lowStimulationMode
  );
  const isPreferencesHydrated = useAppStore((state) => state.isPreferencesHydrated);

  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);

  const timerStatus = useFocusStore((state) => state.timerStatus);
  const plannedSec = useFocusStore((state) => state.plannedSec);
  const sessionMode = useFocusStore((state) => state.sessionMode);
  const entryMilestoneDismissed = useFocusStore(
    (state) => state.entryMilestoneDismissed
  );
  const entryMilestoneAnnounced = useFocusStore(
    (state) => state.entryMilestoneAnnounced
  );
  const selectedCommitteeId = useFocusStore((state) => state.selectedCommitteeId);
  const selectedTopicName = useFocusStore((state) => state.selectedTopicName);
  const gentleBreakStartedAt = useFocusStore(
    (state) => state.gentleBreakStartedAt
  );
  const recentSessions = useFocusStore((state) => state.recentSessions);
  const isLoadingHistory = useFocusStore((state) => state.isLoadingHistory);
  const error = useFocusStore((state) => state.error);
  const setPlannedSec = useFocusStore((state) => state.setPlannedSec);
  const setSelectedCommittee = useFocusStore((state) => state.setSelectedCommittee);
  const startTimer = useFocusStore((state) => state.startTimer);
  const pauseTimer = useFocusStore((state) => state.pauseTimer);
  const clearGentleBreak = useFocusStore((state) => state.clearGentleBreak);
  const resumeTimer = useFocusStore((state) => state.resumeTimer);
  const finishSession = useFocusStore((state) => state.finishSession);
  const cancelSession = useFocusStore((state) => state.cancelSession);
  const resetTimer = useFocusStore((state) => state.resetTimer);
  const keepGoingFromEntry = useFocusStore((state) => state.keepGoingFromEntry);
  const continueEntryToDefault = useFocusStore(
    (state) => state.continueEntryToDefault
  );
  const markEntryMilestoneAnnounced = useFocusStore(
    (state) => state.markEntryMilestoneAnnounced
  );
  const loadRecentSessions = useFocusStore((state) => state.loadRecentSessions);

  const { displaySec, elapsedSec, isOvertime } = useTimer();
  const isActive = timerStatus !== 'idle';
  const showGentleReturn = gentleReturnOpen || gentleBreakStartedAt !== null;
  const normalizedDefaultFocusSec = normalizeFocusDurationSec(defaultFocusSec);
  const showEntryMilestone = isEntryMilestoneVisible(
    sessionMode,
    entryMilestoneDismissed,
    elapsedSec
  );
  const selectedCommittee = committees.find(
    (committee) => committee.id === selectedCommitteeId
  );
  const committeeName =
    selectedCommitteeId === null
      ? undefined
      : selectedCommittee?.name ?? t.focus.committeeUnavailable;

  useEffect(() => {
    if (!isDBReady) return;
    loadCommittees();
    loadRecentSessions();
  }, [isDBReady, loadCommittees, loadRecentSessions]);

  useEffect(() => {
    if (isPreferencesHydrated && timerStatus === 'idle') {
      setPlannedSec(normalizedDefaultFocusSec);
    }
  }, [isPreferencesHydrated, normalizedDefaultFocusSec, setPlannedSec, timerStatus]);

  useEffect(() => {
    if (!showEntryMilestone || entryMilestoneAnnounced) return;
    AccessibilityInfo.announceForAccessibility(
      t.focus.milestone.title + ' ' + t.focus.milestone.body
    );
    markEntryMilestoneAnnounced();
  }, [entryMilestoneAnnounced, markEntryMilestoneAnnounced, showEntryMilestone, t.focus.milestone.body, t.focus.milestone.title]);

  useEffect(() => {
    if (timerStatus !== 'idle') return;

    setGentleReturnOpen(false);
    setGentleReturnError(null);
    if (gentleBreakStartedAt !== null) {
      clearGentleBreak();
    }
  }, [clearGentleBreak, gentleBreakStartedAt, timerStatus]);

  const handleOpenGentleReturn = () => {
    if (useFocusStore.getState().timerStatus === 'idle') return;
    setGentleReturnError(null);
    setGentleReturnOpen(true);
  };

  const handleReturnToFocus = () => {
    const state = useFocusStore.getState();
    if (state.timerStatus === 'idle') {
      setGentleReturnOpen(false);
      setGentleReturnError(null);
      return;
    }

    if (state.timerStatus === 'paused') {
      state.resumeTimer();
      const resumedState = useFocusStore.getState();
      if (
        resumedState.timerStatus !== 'running' &&
        resumedState.timerStatus !== 'overtime'
      ) {
        setGentleReturnError(t.gentleReturn.resumeFailed);
        return;
      }
    }

    setGentleReturnOpen(false);
    setGentleReturnError(null);
  };

  const handleStartGentleBreak = () => {
    const started = useFocusStore.getState().startGentleBreak();
    const currentState = useFocusStore.getState();

    if (started || currentState.gentleBreakStartedAt !== null) {
      setGentleReturnOpen(true);
      setGentleReturnError(null);
      return;
    }

    if (currentState.timerStatus === 'idle') {
      setGentleReturnOpen(false);
      setGentleReturnError(null);
      return;
    }

    setGentleReturnError(t.gentleReturn.startFailed);
  };

  const handleStayPaused = () => {
    const state = useFocusStore.getState();
    if (state.timerStatus === 'paused') {
      state.clearGentleBreak();
    }
    setGentleReturnOpen(false);
    setGentleReturnError(null);
  };

  const handleFinish = () => {
    const receipt = finishSession();
    setShowVictory(receipt !== null && receipt.completed && !receipt.cancelled && receipt.actualSec > 0);
  };

  useEffect(() => {
    if (isActive) setShowVictory(false);
  }, [isActive]);

  const handleDismissGentleReturn = () => {
    setGentleReturnOpen(false);
    setGentleReturnError(null);
  };

  if (!isDBReady) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
      </ScreenWrapper>
    );
  }

  if (isActive) {
    return (
      <ScreenWrapper contentStyle={styles.activeScreen}>
        <View
          style={[
            styles.activeShell,
            {
              gap: isTablet ? spacing.xl : spacing.lg,
              maxWidth: isTablet ? 600 : undefined,
            },
          ]}
        >
          <TimerDisplay
            status={timerStatus}
            displaySec={displaySec}
            isOvertime={isOvertime}
            committeeName={committeeName}
            active
            sessionMode={sessionMode}
            lowStimulation={lowStimulationMode}
          />
          {selectedTopicName !== null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                backgroundColor: colors.surfaceElevated,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: 20,
                alignSelf: 'center',
              }}
            >
              <Feather name="book-open" size={14} color={colors.primary} />
              <AppText variant="caption" color={colors.textSecondary}>
                {t.topics.focusContext(selectedTopicName)}
              </AppText>
            </View>
          )}

          {error !== null && <FocusError message={error} />}

          {showGentleReturn ? (
            <GentleReturnCard
              status={timerStatus}
              breakStartedAt={gentleBreakStartedAt}
              error={gentleReturnError}
              onReturn={handleReturnToFocus}
              onStartBreak={handleStartGentleBreak}
              onStayPaused={handleStayPaused}
              onDismiss={handleDismissGentleReturn}
              lowStimulation={lowStimulationMode}
            />
          ) : (
            <>
              {showEntryMilestone ? (
                <EntryMilestone
                  defaultFocusSec={normalizedDefaultFocusSec}
                  onFinish={handleFinish}
                  onKeepGoing={keepGoingFromEntry}
                  onContinueToDefault={continueEntryToDefault}
                  lowStimulation={lowStimulationMode}
                />
              ) : (
                <SessionControls
                  status={timerStatus}
                  onStart={startTimer}
                  onPause={pauseTimer}
                  onResume={resumeTimer}
                  onFinish={handleFinish}
                  onCancel={cancelSession}
                  onReset={resetTimer}
                />
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.focus.controls.iGotDistracted}
                activeOpacity={0.7}
                onPress={handleOpenGentleReturn}
                style={[
                  styles.gentleReturnEntry,
                  {
                    borderColor: colors.border,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              >
                <Feather name="corner-up-left" size={18} color={colors.textSecondary} />
                <AppText
                  variant="bodySmall"
                  color={colors.textSecondary}
                  style={{ marginLeft: spacing.sm }}
                >
                  {t.focus.controls.iGotDistracted}
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant={isTablet ? 'h1' : 'h2'}>{t.focus.title}</AppText>
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          {t.focus.subtitle}
        </AppText>
      </View>

      {error !== null && (
        <View style={{ marginTop: spacing.md }}>
          <FocusError message={error} onRetry={loadRecentSessions} />
        </View>
      )}

      <View
        style={[
          styles.idleLayout,
          isLargeTablet && styles.idleLayoutLargeTablet,
          { gap: isLargeTablet ? spacing.lg : spacing.md, marginTop: spacing.lg },
        ]}
      >
        <View style={[styles.workspace, { gap: spacing.md }]}>
          {showVictory && <MiniVictory kind="focus" lowStimulation={lowStimulationMode} />}
          {selectedTopicName !== null && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border,
                borderWidth: 1,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs + 2,
                borderRadius: 20,
                alignSelf: 'flex-start',
              }}
            >
              <Feather name="book-open" size={14} color={colors.primary} />
              <AppText variant="caption" color={colors.textSecondary}>
                {t.topics.focusContext(selectedTopicName)}
              </AppText>
            </View>
          )}
          <DurationPicker plannedSec={plannedSec} onSelect={setPlannedSec} />
          <CommitteePicker
            committees={committees}
            selectedId={selectedCommitteeId}
            onSelect={setSelectedCommittee}
          />
          <TimerDisplay
            status={timerStatus}
            displaySec={displaySec}
            isOvertime={isOvertime}
            committeeName={committeeName}
            sessionMode={sessionMode}
          />
          <SessionControls
            status={timerStatus}
            onStart={startTimer}
            onPause={pauseTimer}
            onResume={resumeTimer}
            onFinish={finishSession}
            onCancel={cancelSession}
            onReset={resetTimer}
          />
        </View>

        <View style={styles.historyPane}>
          {isLoadingHistory ? (
            <View style={[styles.historyLoading, { paddingVertical: spacing.xl }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <AppText
                variant="bodySmall"
                color={colors.textSecondary}
                style={{ marginTop: spacing.sm }}
              >
                {t.common.loading}
              </AppText>
            </View>
          ) : (
            <SessionHistoryList sessions={recentSessions} committees={committees} />
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
}

function FocusError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors, spacing } = useTheme();
  const t = useTranslation();

  return (
    <View style={[styles.error, { borderColor: colors.error, padding: spacing.md }]}>
      <Feather name="alert-circle" size={18} color={colors.error} />
      <AppText
        variant="bodySmall"
        color={colors.error}
        style={{ flex: 1, marginLeft: spacing.sm }}
      >
        {translateError(message, t)}
      </AppText>
      {onRetry ? (
        <Button
          label={t.common.retry}
          accessibilityLabel={t.common.retry}
          size="sm"
          variant="secondary"
          onPress={onRetry}
          style={{ marginLeft: spacing.sm }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeScreen: {
    justifyContent: 'center',
  },
  activeShell: {
    alignSelf: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  gentleReturnEntry: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
  },
  header: {
    paddingBottom: 4,
    paddingTop: 8,
  },
  idleLayout: {
    flexDirection: 'column',
  },
  idleLayoutLargeTablet: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  workspace: {
    flex: 1,
    width: '100%',
  },
  historyPane: {
    flex: 1,
    width: '100%',
  },
  historyLoading: {
    alignItems: 'center',
  },
  error: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
  },
});
