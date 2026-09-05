import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  router,
  type Href,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { RecoveryActionCard } from '@/components/study-support/RecoveryActionCard';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { calendarRepo } from '@/db/repositories/calendarRepo';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { dashboardRepo } from '@/db/repositories/dashboardRepo';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useFocusStore } from '@/store/useFocusStore';
import { useStudySupportStore } from '@/store/useStudySupportStore';
import {
  shiftLocalDateKey,
  todayLocalDateKey,
} from '@/utils/calendarDate';
import { getDashboardDayWindow } from '@/utils/dashboardRules';
import {
  buildIdleRecoveryActions,
  getNextRecoveryCalendarRefreshAt,
  RECOVERY_REVIEW_LIMIT,
  selectRecoveryCalendarCandidate,
  type RecoveryAction,
  type RecoveryCalendarCandidate,
  type RecoveryCommitteeContext,
  type RecoveryMemoryCandidate,
} from '@/utils/recoveryRules';
import { useTranslation, translateStudySupportMessage } from '@/i18n';
import type { Strings } from '@/i18n/en';

type CommitteeState =
  | { kind: 'none'; notice: string | null }
  | { kind: 'ready'; context: RecoveryCommitteeContext }
  | { kind: 'error'; message: string };

interface OptionalErrors {
  memory: boolean;
  calendar: boolean;
}

const NO_OPTIONAL_ERRORS: OptionalErrors = {
  memory: false,
  calendar: false,
};

function firstParam(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized ? normalized : null;
}

function memoryDetail(candidate: RecoveryMemoryCandidate, t: Strings): string {
  const count = Math.min(candidate.availableCardCount, RECOVERY_REVIEW_LIMIT);
  const source =
    candidate.selectionReason === 'recent_again_hard'
      ? t.recovery.recentResponses
      : t.recovery.recentDeck;
  return `${candidate.deckName} · ${source} · ${t.recovery.cards(count)}`;
}

function calendarDetail(candidate: RecoveryCalendarCandidate, t: Strings): string {
  const timing =
    candidate.timingKind === 'ongoing'
      ? t.recovery.happeningNow
      : candidate.timingKind === 'all_day'
        ? t.recovery.allDay
        : candidate.displayedTime
          ? t.recovery.todayAt(candidate.displayedTime)
          : t.recovery.laterToday;
  return `${candidate.title} · ${timing}`;
}

export default function RecoveryScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isTablet, isLargeTablet, isLandscape } = useResponsive();
  const { fontScale } = useWindowDimensions();
  const t = useTranslation();
  const params = useLocalSearchParams<{ committeeId?: string | string[] }>();
  const committeeHint = firstParam(params.committeeId);
  const timerStatus = useFocusStore((state) => state.timerStatus);
  const resetCheckIn = useStudySupportStore((state) => state.resetCheckIn);

  const [committeeState, setCommitteeState] = useState<CommitteeState>({
    kind: 'none',
    notice: null,
  });
  const [committeeOptedOut, setCommitteeOptedOut] = useState(false);
  const [memoryCandidate, setMemoryCandidate] =
    useState<RecoveryMemoryCandidate | null>(null);
  const [calendarCandidate, setCalendarCandidate] =
    useState<RecoveryCalendarCandidate | null>(null);
  const [calendarRefreshAt, setCalendarRefreshAt] = useState<number | null>(null);
  const [optionalErrors, setOptionalErrors] =
    useState<OptionalErrors>(NO_OPTIONAL_ERRORS);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isStartingFocus, setIsStartingFocus] = useState(false);

  const loadCommittee = useCallback(
    (force = false) => {
      if (committeeHint === null || (committeeOptedOut && !force)) {
        setCommitteeState({ kind: 'none', notice: null });
        return;
      }

      try {
        const committee = committeeRepo.getById(committeeHint);
        if (committee === null) {
          setCommitteeState({
            kind: 'none',
            notice: 'This Committee is no longer available. Start small without it.',
          });
          return;
        }
        setCommitteeOptedOut(false);
        setCommitteeState({
          kind: 'ready',
          context: { id: committee.id, name: committee.name },
        });
      } catch {
        setCommitteeState({
          kind: 'error',
          message:
            'Committee context could not be checked. Retry or continue without it.',
        });
      }
    },
    [committeeHint, committeeOptedOut]
  );

  const loadOptionalActions = useCallback(() => {
    if (useFocusStore.getState().timerStatus !== 'idle') {
      setMemoryCandidate(null);
      setCalendarCandidate(null);
      setCalendarRefreshAt(null);
      setOptionalErrors(NO_OPTIONAL_ERRORS);
      setIsLoadingOptions(false);
      return;
    }

    setIsLoadingOptions(true);
    const nextErrors: OptionalErrors = { ...NO_OPTIONAL_ERRORS };
    const now = Date.now();
    const today = todayLocalDateKey();
    const dayWindow = getDashboardDayWindow(today);

    try {
      const recentCandidate = dashboardRepo.getWeakDeck(
        dayWindow.attentionStartMs,
        dayWindow.dayEndMs
      );
      let nextMemory: RecoveryMemoryCandidate | null = null;

      if (recentCandidate !== null) {
        const deck = memoryRepo.getDeckById(recentCandidate.deckId);
        if (deck !== null && deck.cardCount > 0) {
          nextMemory = {
            deckId: deck.id,
            deckName: deck.name,
            availableCardCount: deck.cardCount,
            selectionReason: 'recent_again_hard',
          };
        }
      }

      if (nextMemory === null) {
        const deck = memoryRepo.getMostRecentlyUpdatedNonEmptyDeck();
        if (deck !== null) {
          nextMemory = {
            deckId: deck.id,
            deckName: deck.name,
            availableCardCount: deck.cardCount,
            selectionReason: 'recently_updated',
          };
        }
      }
      setMemoryCandidate(nextMemory);
    } catch {
      nextErrors.memory = true;
      setMemoryCandidate(null);
    }

    try {
      const sources = calendarRepo.getByDateRange(
        today,
        shiftLocalDateKey(today, 1)
      );
      const events = sources.map((source) => source.event);
      setCalendarCandidate(selectRecoveryCalendarCandidate(events, today, now));
      setCalendarRefreshAt(
        getNextRecoveryCalendarRefreshAt(events, today, now)
      );
    } catch {
      nextErrors.calendar = true;
      setCalendarCandidate(null);
      setCalendarRefreshAt(null);
    }

    setOptionalErrors(nextErrors);
    setIsLoadingOptions(false);
  }, []);

  const refresh = useCallback(() => {
    setActionNotice(null);
    if (useFocusStore.getState().timerStatus !== 'idle') {
      loadOptionalActions();
      return;
    }
    loadCommittee();
    loadOptionalActions();
  }, [loadCommittee, loadOptionalActions]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') refresh();
      });
      return () => subscription.remove();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      if (calendarRefreshAt === null || timerStatus !== 'idle') return undefined;
      const timeout = setTimeout(
        loadOptionalActions,
        Math.max(0, calendarRefreshAt - Date.now()) + 25
      );
      return () => clearTimeout(timeout);
    }, [calendarRefreshAt, loadOptionalActions, timerStatus])
  );

  useEffect(() => {
    if (timerStatus === 'idle') return;
    setMemoryCandidate(null);
    setCalendarCandidate(null);
    setCalendarRefreshAt(null);
    setOptionalErrors(NO_OPTIONAL_ERRORS);
    setActionNotice(null);
  }, [timerStatus]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    resetCheckIn();
    router.dismissTo('/(tabs)' as Href);
  }, [resetCheckIn]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack])
  );

  const handleClose = useCallback(() => {
    resetCheckIn();
    router.dismissTo('/(tabs)' as Href);
  }, [resetCheckIn]);

  const handleContinueFocus = useCallback(() => {
    resetCheckIn();
    router.replace('/(tabs)/focus' as Href);
  }, [resetCheckIn]);

  const handleStartFocus = useCallback(() => {
    if (isStartingFocus) return;
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle') return;
    if (committeeState.kind === 'error') return;

    setIsStartingFocus(true);
    setActionNotice(null);
    let verifiedCommitteeId: string | null = null;

    if (committeeState.kind === 'ready') {
      try {
        const committee = committeeRepo.getById(committeeState.context.id);
        if (committee === null) {
          setCommitteeState({
            kind: 'none',
            notice: 'This Committee is no longer available. Start small without it.',
          });
        } else {
          verifiedCommitteeId = committee.id;
          setCommitteeState({
            kind: 'ready',
            context: { id: committee.id, name: committee.name },
          });
        }
      } catch {
        setCommitteeState({
          kind: 'error',
          message:
            'Committee context could not be checked. Retry or continue without it.',
        });
        setIsStartingFocus(false);
        return;
      }
    }

    const started = useFocusStore
      .getState()
      .startEntrySession({ committeeId: verifiedCommitteeId });
    setIsStartingFocus(false);
    if (!started) {
      setActionNotice(
        useFocusStore.getState().timerStatus === 'idle'
          ? 'Start small could not begin. Try again.'
          : null
      );
      return;
    }

    useStudySupportStore.getState().resetCheckIn();
    router.replace('/(tabs)/focus' as Href);
  }, [committeeState, isStartingFocus]);

  const handleOpenMemory = useCallback((action: Extract<RecoveryAction, { type: 'memory' }>) => {
    setActionNotice(null);
    try {
      const deck = memoryRepo.getDeckById(action.deckId);
      if (deck === null || deck.cardCount === 0) {
        setMemoryCandidate(null);
        setActionNotice('That deck is no longer available. Choose another small step.');
        return;
      }
      router.push({
        pathname: '/decks/[id]/review',
        params: { id: deck.id, mode: 'recovery' },
      });
    } catch {
      setActionNotice('That deck could not be checked. Retry when you are ready.');
    }
  }, []);

  const handleOpenCalendar = useCallback(
    (action: Extract<RecoveryAction, { type: 'calendar' }>) => {
      setActionNotice(null);
      try {
        const now = Date.now();
        const today = todayLocalDateKey();
        const sources = calendarRepo.getByDateRange(
          today,
          shiftLocalDateKey(today, 1)
        );
        const events = sources.map((source) => source.event);
        const currentCandidate = selectRecoveryCalendarCandidate(events, today, now);
        setCalendarCandidate(currentCandidate);
        setCalendarRefreshAt(
          getNextRecoveryCalendarRefreshAt(events, today, now)
        );

        if (currentCandidate?.eventId !== action.eventId) {
          setActionNotice(
            currentCandidate === null
              ? 'That study event is no longer available today.'
              : 'Today’s next study event changed. The plan has been refreshed.'
          );
          return;
        }
        router.push(`/calendar/${action.eventId}` as Href);
      } catch {
        setActionNotice('That study event could not be checked. Retry when you are ready.');
      }
    },
    []
  );

  const committee =
    committeeState.kind === 'ready' ? committeeState.context : null;
  const actions = useMemo(
    () =>
      buildIdleRecoveryActions({
        committee,
        memory: memoryCandidate,
        calendar: calendarCandidate,
      }),
    [calendarCandidate, committee, memoryCandidate]
  );
  const focusAction = actions.find(
    (action): action is Extract<RecoveryAction, { type: 'focus' }> =>
      action.type === 'focus'
  );
  const memoryAction = actions.find(
    (action): action is Extract<RecoveryAction, { type: 'memory' }> =>
      action.type === 'memory'
  );
  const calendarAction = actions.find(
    (action): action is Extract<RecoveryAction, { type: 'calendar' }> =>
      action.type === 'calendar'
  );
  const showOptionalGrid =
    isLargeTablet &&
    isLandscape &&
    fontScale <= 1.3 &&
    memoryAction !== undefined &&
    calendarAction !== undefined;
  const hasOptionalError = optionalErrors.memory || optionalErrors.calendar;

  return (
    <ScreenWrapper includeBottomSafeArea contentStyle={styles.screenContent}>
      <View
        style={[
          styles.workspace,
          {
            maxWidth: isTablet ? 720 : 560,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.recovery.backAccessibility}
            onPress={handleBack}
            style={[styles.headerButton, { marginRight: spacing.sm }]}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.recovery.title}</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
              {t.recovery.subtitle}
            </AppText>
            <AppText variant="bodySmall" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              {t.recovery.tip}
            </AppText>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.recovery.closeAccessibility}
            onPress={handleClose}
            style={[styles.headerButton, { marginLeft: spacing.sm }]}
          >
            <Feather name="x" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {actionNotice !== null ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.notice,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                marginTop: spacing.lg,
                padding: spacing.md,
              },
            ]}
          >
            <Feather name="info" size={19} color={colors.textMuted} />
            <AppText
              variant="bodySmall"
              color={colors.textSecondary}
              style={{ flex: 1, marginLeft: spacing.sm }}
            >
              {translateStudySupportMessage(actionNotice, t)}
            </AppText>
          </View>
        ) : null}

        {timerStatus !== 'idle' ? (
          <View style={{ marginTop: spacing.xl }}>
            <RecoveryActionCard
              icon="play-circle"
              title={t.recovery.continueFocus}
              detail={t.recovery.continueDetail}
              actionLabel={t.recovery.continueFocus}
              accessibilityLabel={t.recovery.continueAccessibility}
              onAction={handleContinueFocus}
              elevated
            />
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl }}>
            {focusAction ? (
              <RecoveryActionCard
                icon="zap"
                title={t.recovery.smallStart}
                detail={
                  focusAction.committee
                    ? t.recovery.linkedFocus(focusAction.committee.name)
                    : t.recovery.smallStartDesc
                }
                actionLabel={t.recovery.smallStart}
                accessibilityLabel={
                  focusAction.committee
                    ? t.recovery.startLinkedFocus(focusAction.committee.name)
                    : t.recovery.startTwoMin
                }
                onAction={handleStartFocus}
                disabled={committeeState.kind === 'error' || isStartingFocus}
                elevated
              >
                {committeeState.kind === 'ready' ? (
                  <View
                    style={[
                      styles.contextRow,
                      {
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        marginTop: spacing.md,
                        padding: spacing.sm,
                      },
                    ]}
                  >
                    <View style={styles.contextCopy}>
                      <AppText variant="caption" color={colors.textMuted}>{t.focus.committeeLabel}</AppText>
                      <AppText variant="bodySmall" style={{ marginTop: 2 }}>
                        {committeeState.context.name}
                      </AppText>
                    </View>
                    <Button
                      label={t.adaptiveRec.removeCommittee}
                      accessibilityLabel={t.recovery.withoutCommittee(committeeState.context.name)}
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setCommitteeOptedOut(true);
                        setCommitteeState({ kind: 'none', notice: null });
                      }}
                    />
                  </View>
                ) : null}

                {committeeState.kind === 'error' ? (
                  <View
                    accessibilityRole="alert"
                    style={[
                      styles.contextError,
                      {
                        borderColor: colors.border,
                        borderRadius: radius.md,
                        marginTop: spacing.md,
                        padding: spacing.sm,
                      },
                    ]}
                  >
                    <AppText variant="bodySmall" color={colors.textSecondary}>
                      {translateStudySupportMessage(committeeState.message, t)}
                    </AppText>
                    <View style={[styles.contextActions, { gap: spacing.xs, marginTop: spacing.sm }]}>
                      <Button
                        label={t.common.retry}
                        accessibilityLabel={t.recovery.retryCommittee}
                        variant="secondary"
                        size="sm"
                        onPress={() => loadCommittee(true)}
                      />
                      <Button
                        label={t.adaptiveRec.continueWithoutCommittee}
                        variant="ghost"
                        size="sm"
                        onPress={() => {
                          setCommitteeOptedOut(true);
                          setCommitteeState({ kind: 'none', notice: null });
                        }}
                      />
                    </View>
                  </View>
                ) : null}

                {committeeState.kind === 'none' && committeeState.notice ? (
                  <AppText
                    variant="bodySmall"
                    color={colors.textMuted}
                    style={{ marginTop: spacing.md }}
                  >
                    {translateStudySupportMessage(committeeState.notice, t)}
                  </AppText>
                ) : null}
              </RecoveryActionCard>
            ) : null}

            {showOptionalGrid ? (
              <View style={[styles.optionalGrid, { gap: spacing.md, marginTop: spacing.md }]}>
                <RecoveryActionCard
                  icon="layers"
                  title={t.recovery.reviewFive}
                  detail={memoryDetail(memoryAction, t)}
                  actionLabel={t.recovery.reviewFive}
                  accessibilityLabel={t.recovery.reviewAccessibility(memoryAction.deckName)}
                  onAction={() => handleOpenMemory(memoryAction)}
                  style={styles.gridCard}
                />
                <RecoveryActionCard
                  icon="calendar"
                  title={t.recovery.openEvent}
                  detail={calendarDetail(calendarAction, t)}
                  actionLabel={t.recovery.openEvent}
                  accessibilityLabel={t.recovery.eventAccessibility(calendarAction.title)}
                  onAction={() => handleOpenCalendar(calendarAction)}
                  style={styles.gridCard}
                />
              </View>
            ) : (
              <>
                {memoryAction ? (
                  <RecoveryActionCard
                    icon="layers"
                    title={t.recovery.reviewFive}
                    detail={memoryDetail(memoryAction, t)}
                    actionLabel={t.recovery.reviewFive}
                    accessibilityLabel={t.recovery.reviewAccessibility(memoryAction.deckName)}
                    onAction={() => handleOpenMemory(memoryAction)}
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}
                {calendarAction ? (
                  <RecoveryActionCard
                    icon="calendar"
                    title={t.recovery.openEvent}
                    detail={calendarDetail(calendarAction, t)}
                    actionLabel={t.recovery.openEvent}
                    accessibilityLabel={t.recovery.eventAccessibility(calendarAction.title)}
                    onAction={() => handleOpenCalendar(calendarAction)}
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}
              </>
            )}

            {isLoadingOptions ? (
              <View
                accessibilityLabel={t.recovery.checkingAccessibility}
                style={[styles.loadingRow, { marginTop: spacing.md }]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText variant="bodySmall" color={colors.textMuted} style={{ marginLeft: spacing.sm }}>
                  {t.recovery.checking}
                </AppText>
              </View>
            ) : null}

            {hasOptionalError ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.optionalError,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    marginTop: spacing.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <AppText variant="bodySmall" color={colors.textSecondary}>
                  {optionalErrors.memory && optionalErrors.calendar
                    ? t.recovery.bothUnavailable
                    : optionalErrors.memory
                      ? t.recovery.memoryUnavailable
                      : t.recovery.calendarUnavailable}
                </AppText>
                <Button
                  label={t.recovery.retryOptions}
                  variant="ghost"
                  size="sm"
                  onPress={loadOptionalActions}
                  style={{ alignSelf: 'flex-start', marginTop: spacing.xs }}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    alignItems: 'center',
  },
  workspace: {
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingTop: 8,
  },
  headerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  notice: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
  },
  contextRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contextCopy: {
    flex: 1,
    minWidth: 150,
  },
  contextError: {
    borderWidth: 1,
  },
  contextActions: {
    alignItems: 'flex-start',
  },
  optionalGrid: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  gridCard: {
    flex: 1,
    minWidth: 0,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 44,
  },
  optionalError: {
    borderWidth: 1,
  },
});
