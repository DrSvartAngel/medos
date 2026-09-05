import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

interface EntryMilestoneProps {
  defaultFocusSec: number;
  onFinish: () => void;
  onKeepGoing: () => void;
  onContinueToDefault: () => void;
  lowStimulation?: boolean;
}

export function EntryMilestone({
  defaultFocusSec,
  onFinish,
  onKeepGoing,
  onContinueToDefault,
  lowStimulation = false,
}: EntryMilestoneProps) {
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const defaultMinutes = Math.round(defaultFocusSec / 60);

  return (
    <Card
      elevated={!lowStimulation}
      style={[styles.card, !lowStimulation && { borderColor: colors.success }]}
    >
      <View style={styles.headingRow}>
        {!lowStimulation ? (
          <Feather name="check-circle" size={24} color={colors.success} />
        ) : null}
        <View
          style={[
            styles.headingText,
            !lowStimulation && { marginLeft: spacing.sm },
          ]}
        >
          <AppText variant="h3">{t.focus.milestone.title}</AppText>
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            style={{ marginTop: spacing.xs }}
          >
            {t.focus.milestone.body}
          </AppText>
        </View>
      </View>

      <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.lg }]}>
        <Button
          label={t.focus.milestone.finishHere}
          accessibilityLabel={t.focus.milestone.finishHere}
          size={isTablet ? 'lg' : 'md'}
          onPress={onFinish}
        />
        <Button
          label={t.focus.milestone.continueToDefault(defaultMinutes)}
          accessibilityLabel={t.focus.milestone.continueToDefault(defaultMinutes)}
          size={isTablet ? 'lg' : 'md'}
          variant="secondary"
          onPress={onContinueToDefault}
        />
        <Button
          label={t.focus.milestone.keepGoing}
          accessibilityLabel={t.focus.milestone.keepGoing}
          size={isTablet ? 'lg' : 'md'}
          variant="ghost"
          onPress={onKeepGoing}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: '100%',
  },
  card: {
    borderWidth: 1,
    width: '100%',
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  headingText: {
    flex: 1,
  },
});
