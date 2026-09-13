import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  AppState,
  BackHandler,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { AdaptiveRecommendationCard } from '@/components/study-support/AdaptiveRecommendationCard';
import { CheckInChoiceGroup } from '@/components/study-support/CheckInChoiceGroup';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useFocusStore } from '@/store/useFocusStore';
import { useAppStore } from '@/store/useAppStore';
import { useStudySupportStore } from '@/store/useStudySupportStore';
import {
  getCheckInExpiresAt,
  getAdaptiveRecommendation,
  isStandardAdaptiveDurationSec,
  type CheckInAttention,
  type CheckInEnergy,
} from '@/utils/studySupportRules';
import { useTranslation, translateStudySupportMessage } from '@/i18n';

type CheckInStep = 'energy' | 'attention' | 'recommendation';

function firstParam(value: string | string[] | undefined): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = candidate?.trim();
  return normalized ? normalized : null;
}

export default function StudyCheckInScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const lowStimulationMode = useAppStore((state) => state.lowStimulationMode);
  const params = useLocalSearchParams<{ committeeId?: string | string[] }>();
  const committeeHint = firstParam(params.committeeId);
  const [step, setStep] = useState<CheckInStep>('energy');
  const [initialized, setInitialized] = useState(false);

  const ENERGY_CHOICES_L: ReadonlyArray<{ value: CheckInEnergy; label: string }> = [
    { value: 'low',    label: t.checkIn.energy.low },
    { value: 'steady', label: t.checkIn.energy.steady },
    { value: 'good',   label: t.checkIn.energy.good },
  ];
  const ATTENTION_CHOICES_L: ReadonlyArray<{ value: CheckInAttention; label: string }> = [
    { value: 'scattered', label: t.checkIn.attention.scattered },
    { value: 'okay',      label: t.checkIn.attention.okay },
    { value: 'focused',   label: t.checkIn.attention.focused },
  ];
  const [startError, setStartError] = useState<string | null>(null);
  const announcedRecommendation = useRef(false);

  const timerStatus = useFocusStore((state) => state.timerStatus);
  const energy = useStudySupportStore((state) => state.energy);
  const attention = useStudySupportStore((state) => state.attention);
  const selectedDurationSec = useStudySupportStore(
    (state) => state.selectedDurationSec
  );
  const capturedAt = useStudySupportStore((state) => state.capturedAt);
  const localDateKey = useStudySupportStore((state) => state.localDateKey);
  const committeeId = useStudySupportStore((state) => state.committeeId);
  const committeeName = useStudySupportStore((state) => state.committeeName);
  const contextError = useStudySupportStore((state) => state.contextError);
  const setEnergy = useStudySupportStore((state) => state.setEnergy);
  const setAttention = useStudySupportStore((state) => state.setAttention);
  const selectDuration = useStudySupportStore((state) => state.selectDuration);
  const setCommitteeContext = useStudySupportStore(
    (state) => state.setCommitteeContext
  );
  const clearCommitteeContext = useStudySupportStore(
    (state) => state.clearCommitteeContext
  );
  const setContextError = useStudySupportStore((state) => state.setContextError);
  const clearIfExpired = useStudySupportStore((state) => state.clearIfExpired);
  const resetCheckIn = useStudySupportStore((state) => state.resetCheckIn);

  const recommendation = useMemo(
    () => getAdaptiveRecommendation(energy, attention),
    [attention, energy]
  );

  const loadCommitteeContext = useCallback(() => {
    if (committeeHint === null) {
      clearCommitteeContext();
      return;
    }

    try {
      const committee = committeeRepo.getById(committeeHint);
      if (committee === null) {
        clearCommitteeContext();
        setContextError(
          'This Committee is no longer available. You can continue without it.'
        );
        return;
      }
      setCommitteeContext(committee.id, committee.name);
    } catch {
      clearCommitteeContext();
      setContextError(
        'Committee context could not be checked. Retry or continue without it.'
      );
    }
  }, [clearCommitteeContext, committeeHint, setCommitteeContext, setContextError]);

  const handleClose = useCallback(() => {
    if (step !== 'recommendation') {
      resetCheckIn();
    }
    router.replace('/(tabs)' as Href);
  }, [resetCheckIn, step]);

  const handleOpenFocusSetup = useCallback(() => {
    resetCheckIn();
    router.replace('/(tabs)/focus' as Href);
  }, [resetCheckIn]);

  const handleOpenRecovery = useCallback(() => {
    const supportState = useStudySupportStore.getState();
    const validatedCommitteeId =
      supportState.contextError === null ? supportState.committeeId : null;

    router.push(
      validatedCommitteeId === null
        ? ('/study-support/recovery' as Href)
        : ({
            pathname: '/study-support/recovery',
            params: { committeeId: validatedCommitteeId },
          } as Href)
    );
  }, []);

  useEffect(() => {
    resetCheckIn();
    loadCommitteeContext();
    setInitialized(true);
  }, [loadCommitteeContext, resetCheckIn]);

  useEffect(() => {
    clearIfExpired();
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && clearIfExpired()) {
        setStep('energy');
        setStartError(null);
        announcedRecommendation.current = false;
      }
    });
    return () => appStateSubscription.remove();
  }, [clearIfExpired]);

  useEffect(() => {
    const expiresAt = getCheckInExpiresAt({ capturedAt, localDateKey });
    if (expiresAt === null) return;

    const timeout = setTimeout(() => {
      if (clearIfExpired()) {
        setStep('energy');
        setStartError(null);
        announcedRecommendation.current = false;
      }
    }, Math.max(0, expiresAt - Date.now()) + 25);
    return () => clearTimeout(timeout);
  }, [capturedAt, clearIfExpired, localDateKey]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleClose();
        return true;
      }
    );
    return () => backSubscription.remove();
  }, [handleClose]);

  useEffect(() => {
    if (timerStatus !== 'idle') {
      resetCheckIn();
      setStartError('A Focus session is already active.');
    }
  }, [resetCheckIn, timerStatus]);

  useEffect(() => {
    if (
      step === 'recommendation' &&
      recommendation !== null &&
      !announcedRecommendation.current
    ) {
      announcedRecommendation.current = true;
      AccessibilityInfo.announceForAccessibility(
        t.checkIn.suggestionReady(recommendation.durationSec / 60)
      );
    }
  }, [recommendation, step, t]);

  function handleEnergy(value: CheckInEnergy) {
    clearIfExpired();
    setEnergy(value);
    setStartError(null);
    setStep('attention');
  }

  function handleAttention(value: CheckInAttention) {
    if (clearIfExpired()) {
      setStep('energy');
      setStartError('This check-in expired. Start again when you are ready.');
      announcedRecommendation.current = false;
      return;
    }
    setAttention(value);
    setStartError(null);
    setStep('recommendation');
  }

  function handleStart() {
    const focusState = useFocusStore.getState();
    const supportState = useStudySupportStore.getState();

    if (focusState.timerStatus !== 'idle') {
      setStartError('A Focus session is already active.');
      return;
    }
    if (supportState.clearIfExpired()) {
      setStep('energy');
      setStartError('This suggestion expired. Check in again when you are ready.');
      announcedRecommendation.current = false;
      return;
    }
    if (supportState.contextError !== null) return;

    let verifiedCommitteeId = supportState.committeeId;
    if (verifiedCommitteeId !== null) {
      try {
        const committee = committeeRepo.getById(verifiedCommitteeId);
        if (committee === null) {
          supportState.clearCommitteeContext();
          verifiedCommitteeId = null;
        } else {
          supportState.setCommitteeContext(committee.id, committee.name);
        }
      } catch {
        supportState.setContextError(
          'Committee context could not be checked. Retry or continue without it.'
        );
        return;
      }
    }

    const durationSec = useStudySupportStore.getState().selectedDurationSec;
    const started =
      durationSec === 120
        ? focusState.startEntrySession({ committeeId: verifiedCommitteeId })
        : isStandardAdaptiveDurationSec(durationSec)
          ? focusState.startAdaptiveSession({
              durationSec,
              committeeId: verifiedCommitteeId,
            })
          : false;

    if (!started) {
      setStartError(
        useFocusStore.getState().timerStatus === 'idle'
          ? 'This suggestion could not start. Try again.'
          : 'A Focus session is already active.'
      );
      return;
    }

    useStudySupportStore.getState().resetCheckIn();
    router.replace('/(tabs)/focus' as Href);
  }

  if (!initialized) {
    return (
      <ScreenWrapper scrollable={false} includeBottomSafeArea>
        <View />
      </ScreenWrapper>
    );
  }

  if (timerStatus !== 'idle') {
    return (
      <ScreenWrapper
        scrollable={false}
        includeBottomSafeArea
        contentStyle={styles.centered}
      >
        <Card elevated style={[styles.panel, { padding: isTablet ? spacing.xl : spacing.lg }]}>
          <Feather name="play-circle" size={32} color={colors.primary} />
          <AppText variant={isTablet ? 'h1' : 'h2'} style={{ marginTop: spacing.md }}>
            {t.recovery.continueFocus}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {translateStudySupportMessage(startError ?? 'A Focus session is already active.', t)}
          </AppText>
          <Button
            label={t.recovery.continueFocus}
            onPress={() => router.replace('/(tabs)/focus' as Href)}
            size={isTablet ? 'lg' : 'md'}
            style={{ marginTop: spacing.lg }}
          />
          <Button
            label={t.recovery.backToDashboard}
            variant="ghost"
            onPress={handleClose}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper includeBottomSafeArea contentStyle={styles.screenContent}>
      <View style={styles.panel}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.checkIn.closeToDashboard}
            onPress={handleClose}
            style={[styles.closeButton, { marginRight: spacing.sm }]}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.checkIn.title}</AppText>
            <AppText variant="bodySmall" color={colors.textMuted} style={{ marginTop: spacing.xs }}>
              {t.checkIn.optionalNotice}
            </AppText>
          </View>
        </View>

        {startError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.notice,
              {
                borderColor: colors.border,
                borderRadius: radius.md,
                marginTop: spacing.md,
                padding: spacing.md,
              },
            ]}
          >
            <AppText variant="bodySmall" color={colors.textSecondary}>
              {translateStudySupportMessage(startError, t)}
            </AppText>
          </View>
        ) : null}

        {step === 'energy' ? (
          <View style={{ marginTop: spacing.xl }}>
            <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t.checkIn.step(1)}
            </AppText>
            <CheckInChoiceGroup
              title={t.checkIn.energyTitle}
              choices={ENERGY_CHOICES_L}
              selected={energy}
              onSelect={handleEnergy}
            />
          </View>
        ) : null}

        {step === 'attention' ? (
          <View style={{ marginTop: spacing.xl }}>
            <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
              {t.checkIn.step(2)}
            </AppText>
            <CheckInChoiceGroup
              title={t.checkIn.attentionTitle}
              choices={ATTENTION_CHOICES_L}
              selected={attention}
              onSelect={handleAttention}
            />
            <Button
              label={t.checkIn.back}
              variant="ghost"
              onPress={() => setStep('energy')}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : null}

        {step === 'recommendation' &&
        energy !== null &&
        attention !== null &&
        recommendation !== null &&
        selectedDurationSec !== null ? (
          <View style={{ marginTop: spacing.xl }}>
            <AdaptiveRecommendationCard
              lowStimulation={lowStimulationMode}
              energy={energy}
              attention={attention}
              recommendation={recommendation}
              selectedDurationSec={selectedDurationSec}
              committeeName={committeeName}
              contextError={contextError}
              onSelectDuration={selectDuration}
              onStart={handleStart}
              onChangeAnswers={() => setStep('energy')}
              onRemoveCommittee={clearCommitteeContext}
              onRetryContext={loadCommitteeContext}
              onContinueWithoutCommittee={clearCommitteeContext}
              onOpenFocusSetup={handleOpenFocusSetup}
              onOpenRecovery={handleOpenRecovery}
            />
          </View>
        ) : null}

        {step !== 'recommendation' ? (
          <Button
            label={t.checkIn.skipCheckIn}
            accessibilityLabel={t.checkIn.skipCheckIn}
            variant="ghost"
            onPress={handleOpenFocusSetup}
            style={{ marginTop: spacing.xl }}
          />
        ) : null}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenContent: {
    alignItems: 'center',
  },
  panel: {
    alignSelf: 'center',
    maxWidth: 620,
    width: '100%',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    paddingTop: 8,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  notice: {
    borderWidth: 1,
  },
});
