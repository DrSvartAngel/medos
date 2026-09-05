import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import {
  ADAPTIVE_DURATION_OPTIONS,
  type AdaptiveDurationSec,
  type AdaptiveRecommendation,
  type CheckInAttention,
  type CheckInEnergy,
} from '@/utils/studySupportRules';
import { useTranslation, translateStudySupportMessage } from '@/i18n';

interface AdaptiveRecommendationCardProps {
  energy: CheckInEnergy;
  attention: CheckInAttention;
  recommendation: AdaptiveRecommendation;
  selectedDurationSec: AdaptiveDurationSec;
  committeeName: string | null;
  contextError: string | null;
  onSelectDuration: (durationSec: AdaptiveDurationSec) => void;
  onStart: () => void;
  onChangeAnswers: () => void;
  onRemoveCommittee: () => void;
  onRetryContext: () => void;
  onContinueWithoutCommittee: () => void;
  onOpenFocusSetup: () => void;
  onOpenRecovery: () => void;
}

export function AdaptiveRecommendationCard({
  energy,
  attention,
  recommendation,
  selectedDurationSec,
  committeeName,
  contextError,
  onSelectDuration,
  onStart,
  onChangeAnswers,
  onRemoveCommittee,
  onRetryContext,
  onContinueWithoutCommittee,
  onOpenFocusSetup,
  onOpenRecovery,
}: AdaptiveRecommendationCardProps) {
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();

  return (
    <Card elevated style={{ padding: isTablet ? spacing.lg : spacing.md }}>
      <Badge label={t.adaptiveRec.recommended} variant="primary" />
      <AppText variant={isTablet ? 'h1' : 'h2'} style={{ marginTop: spacing.md }}>
        {t.adaptiveRec.durationMin(recommendation.durationSec / 60)}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
        {translateStudySupportMessage(recommendation.reason, t)}
      </AppText>
      <AppText variant="bodySmall" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
        {t.checkIn.summary(t.checkIn.energy[energy], t.checkIn.attention[attention])}
      </AppText>

      {committeeName ? (
        <View
          style={[
            styles.context,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              marginTop: spacing.lg,
              padding: spacing.md,
            },
          ]}
        >
          <View style={styles.contextCopy}>
            <AppText variant="caption" color={colors.textMuted}>
              {t.focus.committeeLabel}
            </AppText>
            <AppText variant="body" style={{ marginTop: spacing.xs }}>
              {committeeName}
            </AppText>
          </View>
          <Button
            label={t.adaptiveRec.removeCommittee}
            accessibilityLabel={t.adaptiveRec.removeCommittee}
            variant="ghost"
            size="sm"
            onPress={onRemoveCommittee}
          />
        </View>
      ) : null}

      {contextError ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.contextError,
            {
              borderColor: colors.border,
              borderRadius: radius.md,
              marginTop: spacing.lg,
              padding: spacing.md,
            },
          ]}
        >
          <Feather name="info" size={19} color={colors.textMuted} />
          <View style={[styles.contextErrorCopy, { marginLeft: spacing.sm }]}>
            <AppText variant="bodySmall" color={colors.textSecondary}>
              {translateStudySupportMessage(contextError, t)}
            </AppText>
            <View style={[styles.contextActions, { gap: spacing.xs, marginTop: spacing.sm }]}>
              <Button
                label={t.common.retry}
                variant="secondary"
                size="sm"
                onPress={onRetryContext}
              />
              <Button
                label={t.adaptiveRec.continueWithoutCommittee}
                variant="ghost"
                size="sm"
                onPress={onContinueWithoutCommittee}
              />
            </View>
          </View>
        </View>
      ) : null}

      <AppText variant="label" color={colors.textSecondary} style={{ marginTop: spacing.xl }}>
        {t.adaptiveRec.chooseSession}
      </AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t.adaptiveRec.durationChoices}
        style={[styles.durationGrid, { gap: spacing.sm, marginTop: spacing.sm }]}
      >
        {ADAPTIVE_DURATION_OPTIONS.map((durationSec) => {
          const isSelected = selectedDurationSec === durationSec;
          const isRecommended = recommendation.durationSec === durationSec;
          const label = t.adaptiveRec.durationMin(durationSec / 60);
          return (
            <TouchableOpacity
              key={durationSec}
              accessibilityRole="radio"
              accessibilityLabel={`${label}${isRecommended ? `, ${t.adaptiveRec.recommended}` : ''}`}
              accessibilityState={{ checked: isSelected }}
              activeOpacity={0.75}
              onPress={() => onSelectDuration(durationSec)}
              style={[
                styles.duration,
                {
                  backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
            >
              <View style={styles.durationLabelRow}>
                <AppText
                  variant="body"
                  color={isSelected ? colors.textPrimary : undefined}
                  style={styles.durationLabel}
                >
                  {label}
                </AppText>
                {isSelected ? (
                  <Feather
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    name="check"
                    size={18}
                    color={colors.textPrimary}
                  />
                ) : null}
              </View>
              {isRecommended ? (
                <AppText
                  variant="caption"
                  color={isSelected ? colors.textPrimary : colors.primary}
                  style={{ marginTop: spacing.xs }}
                >
                  {t.adaptiveRec.recommended}
                </AppText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Button
        label={selectedDurationSec === 120
          ? t.recovery.smallStart
          : t.adaptiveRec.startFocus(selectedDurationSec / 60)}
        accessibilityLabel={selectedDurationSec === 120
          ? t.recovery.startTwoMin
          : t.adaptiveRec.startFocus(selectedDurationSec / 60)}
        onPress={onStart}
        disabled={contextError !== null}
        size={isTablet ? 'lg' : 'md'}
        style={{ marginTop: spacing.lg }}
      />
      <Button
        label={t.adaptiveRec.openFocusSetup}
        accessibilityLabel={t.adaptiveRec.openFocusSetup}
        onPress={onOpenFocusSetup}
        variant="secondary"
        style={{ marginTop: spacing.sm }}
      />
      <Button
        label={t.adaptiveRec.changeAnswers}
        onPress={onChangeAnswers}
        variant="ghost"
        size="sm"
        style={{ marginTop: spacing.xs }}
      />
      <View
        style={[
          styles.lighterPlan,
          { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm },
        ]}
      >
        <Button
          label={t.adaptiveRec.chooseLighterPlan}
          accessibilityLabel={t.adaptiveRec.chooseLighterPlan}
          onPress={onOpenRecovery}
          variant="ghost"
          size="sm"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  context: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contextCopy: {
    flex: 1,
    minWidth: 160,
  },
  contextError: {
    alignItems: 'flex-start',
    borderWidth: 1,
    flexDirection: 'row',
  },
  contextErrorCopy: {
    flex: 1,
  },
  contextActions: {
    alignItems: 'flex-start',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  duration: {
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 68,
    minWidth: 120,
  },
  durationLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  durationLabel: {
    flex: 1,
    fontWeight: '600',
  },
  lighterPlan: {
    alignItems: 'center',
    borderTopWidth: 1,
  },
});
