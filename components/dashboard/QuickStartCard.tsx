import { useTranslation } from '@/i18n';
import type { Strings } from '@/i18n/en';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { DashboardQuickStart } from '@/utils/dashboardRules';

interface QuickStartCardProps {
  recommendation: DashboardQuickStart;
  onAction: () => void;
  onStartSmall?: () => void;
  onCheckIn?: () => void;
}

function actionLabel(recommendation: DashboardQuickStart, t: Strings): string {
  if (recommendation.kind === 'continue_focus') return t.recovery.continueFocus;
  if (recommendation.kind === 'memory_review') return t.dashboard.reviewCards;
  return t.dashboard.start25;
}

export function QuickStartCard({
  recommendation,
  onAction,
  onStartSmall,
  onCheckIn,
}: QuickStartCardProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();
  const title = recommendation.kind === 'generic_focus' ? t.dashboard.genericTitle : recommendation.title;
  const detail = recommendation.kind === 'manual_focus' ? t.dashboard.manualDetail(recommendation.time)
    : recommendation.kind === 'committee_focus' ? t.dashboard.committeeDetail(recommendation.daysToExam)
    : recommendation.kind === 'memory_review' ? t.dashboard.memoryDetail(recommendation.attentionCount)
    : recommendation.kind === 'generic_focus' ? t.dashboard.genericDetail : recommendation.detail;
  const { isTablet } = useResponsive();
  const isMemory = recommendation.kind === 'memory_review';
  const accent = isMemory ? colors.accent : colors.primary;

  return (
    <Card
      elevated
      style={[
        styles.card,
        {
          borderLeftColor: accent,
          padding: isTablet ? spacing.lg : spacing.md,
        },
      ]}
    >
      <View style={styles.labelRow}>
        <View style={[styles.icon, { backgroundColor: colors.surface, borderRadius: radius.md }]}>
          <Feather
            name={isMemory ? 'layers' : recommendation.kind === 'continue_focus' ? 'play-circle' : 'zap'}
            size={22}
            color={accent}
          />
        </View>
        <AppText variant="label" color={colors.textMuted} style={{ marginLeft: spacing.sm }}>
          {t.dashboard.quickStart}
        </AppText>
      </View>

      <AppText variant={isTablet ? 'h2' : 'h3'} style={{ marginTop: spacing.md }}>
        {title}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
        {detail}
      </AppText>

      <Button
        label={actionLabel(recommendation, t)}
        onPress={onAction}
        size={isTablet ? 'lg' : 'md'}
        style={{ alignSelf: isTablet ? 'flex-start' : 'stretch', marginTop: spacing.lg }}
      />
      {onStartSmall ? (
        <Button
          label={t.recovery.smallStart}
          accessibilityLabel={t.dashboard.smallStartHint}
          onPress={onStartSmall}
          size="sm"
          variant="secondary"
          style={{
            alignSelf: isTablet ? 'flex-start' : 'stretch',
            marginTop: spacing.sm,
          }}
        />
      ) : null}
      {onCheckIn ? (
        <Button
          label={t.dashboard.checkInLink}
          accessibilityLabel={t.dashboard.checkInHint}
          onPress={onCheckIn}
          size="sm"
          variant="ghost"
          style={{
            alignSelf: isTablet ? 'flex-start' : 'stretch',
            marginTop: spacing.xs,
          }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderLeftWidth: 4, width: '100%' },
  labelRow: { alignItems: 'center', flexDirection: 'row' },
  icon: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
});
