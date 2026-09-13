import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AppText } from '@/components/ui/Typography';
import { useTranslation, translateStudySupportMessage } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAppStore } from '@/store/useAppStore';
import { useFocusStore } from '@/store/useFocusStore';
import { useStudySupportStore } from '@/store/useStudySupportStore';
import {
  getAdaptiveRecommendation,
  isCheckInFresh,
  type AdaptiveDurationSec,
} from '@/utils/studySupportRules';

interface DailyStateCardProps {
  committeeId?: string | null;
  onStartSmall?: () => void;
  onCheckIn?: () => void;
}

/**
 * Integrated Daily State component.
 * Subtle, non-dominant presentation preserving all Phase 14.6G / adaptive logic.
 */
export function DailyStateCard({
  committeeId,
  onStartSmall,
  onCheckIn,
}: DailyStateCardProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const lowStimulation = useAppStore((state) => state.lowStimulationMode);
  const timerStatus = useFocusStore((state) => state.timerStatus);

  const energy = useStudySupportStore((state) => state.energy);
  const attention = useStudySupportStore((state) => state.attention);
  const capturedAt = useStudySupportStore((state) => state.capturedAt);
  const localDateKey = useStudySupportStore((state) => state.localDateKey);
  const selectedDurationSec = useStudySupportStore(
    (state) => state.selectedDurationSec
  );
  const clearIfExpired = useStudySupportStore((state) => state.clearIfExpired);

  useEffect(() => {
    clearIfExpired();
  }, [clearIfExpired]);

  const isFresh =
    isCheckInFresh({ capturedAt, localDateKey }) &&
    energy !== null &&
    attention !== null;

  const recommendation = isFresh
    ? getAdaptiveRecommendation(energy, attention)
    : null;

  function handleStartAdaptive(durationSec: AdaptiveDurationSec) {
    const focusState = useFocusStore.getState();
    if (focusState.timerStatus !== 'idle') {
      router.push('/(tabs)/focus' as Href);
      return;
    }

    if (durationSec === 120) {
      focusState.startEntrySession({ committeeId: committeeId ?? null });
    } else {
      focusState.setPlannedSec(durationSec);
      focusState.setSelectedCommittee(committeeId ?? null);
      focusState.startTimer();
    }
    router.push('/(tabs)/focus' as Href);
  }

  function handleOpenCheckIn() {
    if (onCheckIn) {
      onCheckIn();
    } else {
      router.push(
        committeeId
          ? ({
              pathname: '/study-support/check-in',
              params: { committeeId },
            } as Href)
          : ('/study-support/check-in' as Href)
      );
    }
  }

  function handleOpenRecovery() {
    router.push(
      committeeId
        ? ({
            pathname: '/study-support/recovery',
            params: { committeeId },
          } as Href)
        : ('/study-support/recovery' as Href)
    );
  }

  if (isFresh && recommendation && energy && attention) {
    const targetSec: AdaptiveDurationSec =
      selectedDurationSec ?? recommendation.durationSec;
    const isEntry = targetSec === 120;
    const durationLabel = isEntry
      ? t.recovery.smallStart
      : t.adaptiveRec.startFocus(targetSec / 60);

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            borderWidth: borders.hairline,
            borderRadius: radius.md,
            padding: spacing.md,
          },
        ]}
      >
        <View style={{ gap: spacing.xs }}>
          {/* Subtle State Summary Header */}
          <View style={styles.headerRow}>
            <View style={[styles.inlineLabelRow, { gap: spacing.xs }]}>
              <Feather name="activity" size={13} color={colors.accent} />
              <AppText
                variant="labelS"
                style={[styles.contextLabel, { color: colors.textMuted }]}
              >
                {t.checkIn.title.toUpperCase()}
              </AppText>
            </View>
            <Badge
              label={t.checkIn.summary(
                t.checkIn.energy[energy],
                t.checkIn.attention[attention]
              )}
              variant={lowStimulation ? 'default' : 'primary'}
              size="sm"
            />
          </View>

          {/* Context Note */}
          <View style={{ gap: 2 }}>
            <AppText
              variant="bodyM"
              style={{ color: colors.textPrimary, fontWeight: '600' }}
            >
              {isEntry
                ? t.recovery.smallStart
                : t.adaptiveRec.durationMin(targetSec / 60)}
            </AppText>
            <AppText
              variant="bodyS"
              style={{ color: colors.textSecondary, lineHeight: 18 }}
            >
              {translateStudySupportMessage(recommendation.reason, t)}
            </AppText>
          </View>

          {/* Restrained Actions */}
          <View
            style={[
              styles.actionRow,
              {
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: spacing.xs,
                marginTop: 4,
              },
            ]}
          >
            <Button
              label={durationLabel}
              onPress={() => handleStartAdaptive(targetSec)}
              size="sm"
              variant="secondary"
              accessibilityLabel={durationLabel}
            />
            <Button
              label={t.adaptiveRec.changeAnswers}
              accessibilityLabel={t.adaptiveRec.changeAnswers}
              onPress={handleOpenCheckIn}
              size="sm"
              variant="ghost"
            />
            <Button
              label={t.adaptiveRec.chooseLighterPlan}
              accessibilityLabel={t.adaptiveRec.chooseLighterPlan}
              onPress={handleOpenRecovery}
              size="sm"
              variant="ghost"
            />
          </View>
        </View>
      </View>
    );
  }

  // Not checked in or expired: render compact low-stimulation prompt
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: borders.hairline,
          borderRadius: radius.md,
          padding: spacing.md,
        },
      ]}
    >
      <View style={{ gap: spacing.xs, width: '100%' }}>
        {/* Subtle State Summary Header */}
        <View style={[styles.inlineLabelRow, { gap: spacing.xs }]}>
          <Feather name="compass" size={13} color={colors.textMuted} />
          <AppText
            variant="labelS"
            style={[styles.contextLabel, { color: colors.textMuted }]}
          >
            {t.checkIn.title.toUpperCase()}
          </AppText>
        </View>

        {/* Prompt Question and Hint */}
        <View style={{ gap: 2, minWidth: 0 }}>
          <AppText
            variant="bodyM"
            style={{ color: colors.textPrimary, fontWeight: '600' }}
          >
            {t.checkIn.energyTitle}
          </AppText>
          <AppText
            variant="bodyS"
            style={{ color: colors.textSecondary }}
          >
            {t.dashboard.checkInHint}
          </AppText>
        </View>

        {/* Restrained Actions (never steal horizontal space from text) */}
        <View
          style={[
            styles.promptActions,
            {
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: spacing.xs,
              marginTop: 4,
            },
          ]}
        >
          <Button
            label={t.dashboard.startCheckIn}
            accessibilityLabel={t.dashboard.checkInAccessibility}
            onPress={handleOpenCheckIn}
            size="sm"
            variant="secondary"
          />
          {timerStatus === 'idle' && (
            <Button
              label={t.recovery.smallStart}
              accessibilityLabel={t.dashboard.smallStartHint}
              onPress={() => {
                if (onStartSmall) {
                  onStartSmall();
                } else {
                  const focusState = useFocusStore.getState();
                  focusState.startEntrySession({
                    committeeId: committeeId ?? null,
                  });
                  router.push('/(tabs)/focus' as Href);
                }
              }}
              size="sm"
              variant="ghost"
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 0,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  actionRow: {
    marginTop: 2,
  },
  promptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
