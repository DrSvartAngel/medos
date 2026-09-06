import { translateError } from '@/i18n/errors';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { TimerStatus } from '@/store/useFocusStore';
import {
  GENTLE_BREAK_DURATION_SEC,
  getGentleBreakRemainingSec,
} from '@/utils/gentleReturnRules';
import { useTranslation } from '@/i18n';

interface GentleReturnCardProps {
  status: TimerStatus;
  breakStartedAt: number | null;
  error: string | null;
  onReturn: () => void;
  onStartBreak: () => void;
  onStayPaused: () => void;
  onDismiss: () => void;
  lowStimulation?: boolean;
}

function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function GentleReturnCard({
  status,
  breakStartedAt,
  error,
  onReturn,
  onStartBreak,
  onStayPaused,
  onDismiss,
  lowStimulation = false,
}: GentleReturnCardProps) {
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const [now, setNow] = useState(Date.now());
  const announcedBreakRef = useRef<number | null>(null);
  const isBreak = breakStartedAt !== null;
  const remainingSec = isBreak
    ? getGentleBreakRemainingSec(breakStartedAt, now)
    : GENTLE_BREAK_DURATION_SEC;
  const breakComplete = isBreak && remainingSec <= 0;

  useEffect(() => {
    if (breakStartedAt === null) return;

    const deadline = breakStartedAt + GENTLE_BREAK_DURATION_SEC * 1000;
    let interval: ReturnType<typeof setInterval> | null = null;

    const updateNow = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    updateNow();
    if (Date.now() < deadline) {
      interval = setInterval(updateNow, 500);
    }
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') updateNow();
    });

    return () => {
      if (interval !== null) clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [breakStartedAt]);

  useEffect(() => {
    if (
      breakStartedAt !== null &&
      breakComplete &&
      announcedBreakRef.current !== breakStartedAt
    ) {
      announcedBreakRef.current = breakStartedAt;
      AccessibilityInfo.announceForAccessibility(
        t.gentleReturn.breakAnnouncement
      );
    }
  }, [breakComplete, breakStartedAt, t]);

  if (isBreak) {
    return (
      <Card elevated={!lowStimulation} style={styles.card}>
        <View style={styles.headingRow}>
          {!lowStimulation ? (
            <Feather name="coffee" size={24} color={colors.primary} />
          ) : null}
          <View
            style={[
              styles.headingCopy,
              !lowStimulation && { marginLeft: spacing.sm },
            ]}
          >
            <AppText variant="h3">{t.gentleReturn.breakLabel}</AppText>
            <AppText
              variant="bodySmall"
              color={colors.textSecondary}
              style={{ marginTop: spacing.xs }}
            >
              {t.gentleReturn.breakOverBody}
            </AppText>
          </View>
        </View>

        <View
          accessible
          accessibilityLabel={breakComplete
            ? t.gentleReturn.breakAnnouncement
            : t.gentleReturn.breakCountdown(remainingSec)}
          style={{ marginTop: spacing.lg }}
        >
          <AppText
            variant="h1"
            color={
              lowStimulation
                ? colors.textPrimary
                : breakComplete
                  ? colors.success
                  : colors.primary
            }
            style={styles.countdown}
          >
            {formatCountdown(remainingSec)}
          </AppText>
        </View>
        {breakComplete ? (
          <AppText
            variant="body"
            color={colors.textSecondary}
            style={[styles.centeredCopy, { marginTop: spacing.sm }]}
          >
          {t.gentleReturn.breakOver}
          </AppText>
        ) : null}

        {error !== null ? <GentleReturnError message={error} /> : null}

        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          <Button
            label={t.gentleReturn.returnToFocus}
            accessibilityLabel={t.gentleReturn.returnToFocus}
            size={isTablet ? 'lg' : 'md'}
            onPress={onReturn}
          />
          <Button
            label={t.gentleReturn.stayPaused}
            accessibilityLabel={t.gentleReturn.stayPaused}
            variant="secondary"
            size={isTablet ? 'lg' : 'md'}
            onPress={onStayPaused}
          />
        </View>
      </Card>
    );
  }

  const isPaused = status === 'paused';
  return (
    <Card elevated={!lowStimulation} style={styles.card}>
      <View style={styles.headingRow}>
        {!lowStimulation ? (
          <Feather name="corner-up-left" size={24} color={colors.primary} />
        ) : null}
        <View
          style={[
            styles.headingCopy,
            !lowStimulation && { marginLeft: spacing.sm },
          ]}
        >
          <AppText variant="h3">{t.gentleReturn.distractedTitle}</AppText>
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            style={{ marginTop: spacing.xs }}
          >
            {isPaused ? t.gentleReturn.pausedBody : t.gentleReturn.distractedBody}
          </AppText>
          <AppText
            variant="bodySmall"
            color={colors.textMuted}
            style={{ marginTop: spacing.sm }}
          >
            {t.gentleReturn.cue}
          </AppText>
        </View>
      </View>

      {error !== null ? <GentleReturnError message={error} /> : null}

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Button
          label={t.gentleReturn.returnToFocus}
          accessibilityLabel={t.gentleReturn.returnToFocus}
          size={isTablet ? 'lg' : 'md'}
          onPress={onReturn}
        />
        {isPaused ? (
          <Button
            label={t.gentleReturn.stayPaused}
            accessibilityLabel={t.gentleReturn.stayPaused}
            variant="secondary"
            size={isTablet ? 'lg' : 'md'}
            onPress={onStayPaused}
          />
        ) : (
          <>
            <Button
              label={t.gentleReturn.takeTwoMinBreak}
              accessibilityLabel={t.gentleReturn.takeTwoMinBreak}
              variant="secondary"
              size={isTablet ? 'lg' : 'md'}
              onPress={onStartBreak}
            />
            <Button
              label={t.gentleReturn.notNow}
              accessibilityLabel={t.gentleReturn.notNow}
              variant="ghost"
              size="sm"
              onPress={onDismiss}
            />
          </>
        )}
      </View>
    </Card>
  );
}

function GentleReturnError({ message }: { message: string }) {
  const t = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.error,
        { borderColor: colors.border, marginTop: spacing.md, padding: spacing.sm },
      ]}
    >
      <Feather name="info" size={18} color={colors.textMuted} />
      <AppText
        variant="bodySmall"
        color={colors.textSecondary}
        style={{ flex: 1, marginLeft: spacing.sm }}
      >
        {translateError(message, t)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  countdown: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  centeredCopy: {
    textAlign: 'center',
  },
  error: {
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
  },
});
