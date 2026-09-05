import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { FocusSessionMode, TimerStatus } from '@/store/useFocusStore';
import { useTranslation } from '@/i18n';
import type { Strings } from '@/i18n/en';

interface TimerDisplayProps {
  status: TimerStatus;
  displaySec: number;
  isOvertime: boolean;
  committeeName?: string;
  active?: boolean;
  sessionMode?: FocusSessionMode;
  lowStimulation?: boolean;
}

function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function formatSpokenDuration(seconds: number, t: Strings): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(t.time.hours(hours));
  if (minutes > 0) parts.push(t.time.minutes(minutes));
  if (remainder > 0 || parts.length === 0) {
    parts.push(t.time.seconds(remainder));
  }

  return parts.join(', ');
}

function getTimerAccessibilityLabel(
  status: TimerStatus,
  displaySec: number,
  isOvertime: boolean,
  t: Strings
): string {
  const duration = formatSpokenDuration(displaySec, t);

  if (status === 'idle') return t.focus.timerReady(duration);
  if (status === 'paused') {
    return isOvertime
      ? t.focus.timerPausedOvertime(duration)
      : t.focus.timerPaused(duration);
  }
  if (isOvertime || status === 'overtime') return t.focus.timerOvertime(duration);
  return t.focus.timerRunning(duration);
}

export function TimerDisplay({
  status,
  displaySec,
  isOvertime,
  committeeName,
  active = false,
  sessionMode = 'standard',
  lowStimulation = false,
}: TimerDisplayProps) {
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const usesHours = displaySec >= 3600;
  const isLowStimulationActive = active && lowStimulation;
  const timerFontSize = isLowStimulationActive
    ? isTablet
      ? usesHours
        ? 72
        : 88
      : usesHours
        ? 48
        : 64
    : isTablet
      ? active
        ? usesHours
          ? 84
          : 112
        : usesHours
          ? 72
          : 88
      : active
        ? usesHours
          ? 52
          : 76
        : usesHours
          ? 48
          : 64;

  const badge =
    status === 'idle'
      ? { label: t.focus.ready, variant: 'default' as const, dot: false }
      : status === 'paused'
        ? {
            label: isOvertime ? t.focus.status.overtimePaused : t.focus.status.paused,
            variant: 'warning' as const,
            dot: false,
          }
        : status === 'overtime'
          ? { label: t.focus.status.overtime, variant: 'success' as const, dot: true }
          : sessionMode === 'entry'
            ? { label: t.focus.status.smallStart, variant: 'primary' as const, dot: true }
          : { label: t.focus.status.focusing, variant: 'primary' as const, dot: true };
  const displayedBadge = isLowStimulationActive
    ? { ...badge, variant: 'default' as const, dot: false }
    : badge;

  return (
    <Card
      elevated={!isLowStimulationActive}
      style={[
        styles.card,
        active && styles.activeCard,
        isLowStimulationActive && styles.lowStimulationActiveCard,
      ]}
    >
      <Badge
        label={displayedBadge.label}
        variant={displayedBadge.variant}
        dot={displayedBadge.dot}
        style={{ alignSelf: 'center' }}
      />

      <AppText
        variant="h1"
        numberOfLines={1}
        accessibilityLabel={getTimerAccessibilityLabel(status, displaySec, isOvertime, t)}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        color={
          isLowStimulationActive
            ? colors.textPrimary
            : isOvertime
              ? colors.success
              : colors.primary
        }
        style={[
          styles.time,
          {
            fontSize: timerFontSize,
            lineHeight: Math.round(timerFontSize * 1.12),
            marginTop: active ? spacing.xl : spacing.lg,
          },
        ]}
      >
        {isOvertime ? '+' : ''}
        {formatTimer(displaySec)}
      </AppText>

      {committeeName !== undefined && (
        <View style={{ marginTop: active ? spacing.lg : spacing.md }}>
          <AppText variant="label" color={colors.textSecondary} style={styles.context}>
            {committeeName}
          </AppText>
        </View>
      )}

      {active && status === 'running' && !isLowStimulationActive && (
        <AppText
          variant="caption"
          color={colors.textMuted}
          style={[styles.context, { marginTop: spacing.sm }]}
        >
          {t.focus.timerGuide}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
  },
  activeCard: {
    borderWidth: 0,
    justifyContent: 'center',
    minHeight: 280,
  },
  lowStimulationActiveCard: {
    borderWidth: 1,
    minHeight: 220,
  },
  time: {
    alignSelf: 'stretch',
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: -2,
    textAlign: 'center',
  },
  context: {
    textAlign: 'center',
  },
});
