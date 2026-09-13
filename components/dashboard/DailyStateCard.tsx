import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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

export function DailyStateCard({
  committeeId,
  onStartSmall,
  onCheckIn,
}: DailyStateCardProps) {
  const { colors, spacing, radius } = useTheme();
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
      <Card
        elevated={!lowStimulation}
        style={[
          styles.card,
          {
            borderLeftColor: colors.primary,
            borderLeftWidth: 4,
            padding: isTablet ? spacing.xl : spacing.lg,
          },
        ]}
      >
        <VStack space="md" style={styles.stack}>
          <HStack style={styles.headerRow} space="sm">
            <Box
              style={[
                styles.iconWrap,
                {
                  backgroundColor: colors.primaryMuted,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Feather name="activity" size={18} color={colors.primary} />
            </Box>
            <GSText
              size="xs"
              style={[styles.contextLabel, { color: colors.textMuted }]}
            >
              {t.checkIn.title.toUpperCase()}
            </GSText>
            <Box style={styles.badgeWrap}>
              <Badge
                label={t.checkIn.summary(
                  t.checkIn.energy[energy],
                  t.checkIn.attention[attention]
                )}
                variant={lowStimulation ? 'default' : 'primary'}
                size="sm"
              />
            </Box>
          </HStack>

          <VStack space="xs">
            <Heading
              size={isTablet ? '2xl' : 'xl'}
              style={[styles.heading, { color: colors.textPrimary }]}
            >
              {isEntry
                ? t.recovery.smallStart
                : t.adaptiveRec.durationMin(targetSec / 60)}
            </Heading>
            <GSText
              size="sm"
              style={[styles.detail, { color: colors.textSecondary }]}
            >
              {translateStudySupportMessage(recommendation.reason, t)}
            </GSText>
          </VStack>

          <VStack space="sm" style={styles.actionContainer}>
            <Button
              label={durationLabel}
              onPress={() => handleStartAdaptive(targetSec)}
              size={isTablet ? 'lg' : 'md'}
              variant="primary"
              accessibilityLabel={durationLabel}
              style={{
                alignSelf: isTablet ? 'flex-start' : 'stretch',
                minWidth: isTablet ? 220 : undefined,
              }}
            />

            <HStack
              space="sm"
              style={[
                styles.secondaryRow,
                {
                  flexDirection: isTablet ? 'row' : 'column',
                  alignItems: isTablet ? 'center' : 'stretch',
                },
              ]}
            >
              <Button
                label={t.adaptiveRec.changeAnswers}
                accessibilityLabel={t.adaptiveRec.changeAnswers}
                onPress={handleOpenCheckIn}
                size="sm"
                variant="secondary"
                style={{
                  alignSelf: isTablet ? 'flex-start' : 'stretch',
                }}
              />
              <Button
                label={t.adaptiveRec.chooseLighterPlan}
                accessibilityLabel={t.adaptiveRec.chooseLighterPlan}
                onPress={handleOpenRecovery}
                size="sm"
                variant="ghost"
                style={{
                  alignSelf: isTablet ? 'flex-start' : 'stretch',
                }}
              />
            </HStack>
          </VStack>
        </VStack>
      </Card>
    );
  }

  // Not checked in or expired: render entry point panel
  return (
    <Card
      elevated={!lowStimulation}
      style={[
        styles.card,
        {
          borderColor: colors.border,
          padding: isTablet ? spacing.xl : spacing.lg,
        },
      ]}
    >
      <VStack space="md" style={styles.stack}>
        <HStack style={styles.headerRow} space="sm">
          <Box
            style={[
              styles.iconWrap,
              {
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Feather name="compass" size={18} color={colors.primary} />
          </Box>
          <GSText
            size="xs"
            style={[styles.contextLabel, { color: colors.textMuted }]}
          >
            {t.checkIn.title.toUpperCase()}
          </GSText>
          <Box style={styles.badgeWrap}>
            <GSText size="xs" style={{ color: colors.textMuted }}>
              {t.checkIn.optionalNotice}
            </GSText>
          </Box>
        </HStack>

        <VStack space="xs">
          <Heading
            size={isTablet ? 'xl' : 'lg'}
            style={[styles.heading, { color: colors.textPrimary }]}
          >
            {t.checkIn.energyTitle}
          </Heading>
          <GSText
            size="sm"
            style={[styles.detail, { color: colors.textSecondary }]}
          >
            {t.dashboard.checkInHint}
          </GSText>
        </VStack>

        <HStack
          space="sm"
          style={[
            styles.actionRow,
            {
              flexDirection: isTablet ? 'row' : 'column',
              alignItems: isTablet ? 'center' : 'stretch',
            },
          ]}
        >
          <Button
            label={t.dashboard.startCheckIn}
            accessibilityLabel={t.dashboard.checkInAccessibility}
            onPress={handleOpenCheckIn}
            size={isTablet ? 'md' : 'sm'}
            variant="primary"
            style={{
              alignSelf: isTablet ? 'flex-start' : 'stretch',
            }}
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
              variant="secondary"
              style={{
                alignSelf: isTablet ? 'flex-start' : 'stretch',
              }}
            />
          )}
        </HStack>
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
  },
  stack: {
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badgeWrap: {
    marginLeft: 'auto',
  },
  heading: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detail: {
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 4,
    width: '100%',
  },
  secondaryRow: {
    marginTop: 4,
  },
  actionRow: {
    marginTop: 4,
  },
});
