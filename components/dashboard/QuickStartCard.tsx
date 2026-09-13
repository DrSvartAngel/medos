import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import {
  AcademicContextSelector,
  type AcademicContextValue,
  type AcademicContextResult,
} from '@/components/curriculum/AcademicContextSelector';
import { useTranslation } from '@/i18n';
import type { Strings } from '@/i18n/en';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { DashboardQuickStart } from '@/utils/dashboardRules';

interface QuickStartCardProps {
  recommendation: DashboardQuickStart;
  onAction: () => void;
  onStartSmall?: () => void;
  onCheckIn?: () => void;
  academicContext?: AcademicContextValue;
  onAcademicContextChange?: (result: AcademicContextResult) => void;
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
  academicContext,
  onAcademicContextChange,
}: QuickStartCardProps) {
  const { colors, spacing } = useTheme();
  const t = useTranslation();
  const { isTablet } = useResponsive();

  const title =
    recommendation.kind === 'generic_focus'
      ? t.dashboard.genericTitle
      : recommendation.title;

  const detail =
    recommendation.kind === 'manual_focus'
      ? t.dashboard.manualDetail(recommendation.time)
      : recommendation.kind === 'committee_focus'
      ? t.dashboard.committeeDetail(recommendation.daysToExam)
      : recommendation.kind === 'memory_review'
      ? t.dashboard.memoryDetail(recommendation.attentionCount)
      : recommendation.kind === 'generic_focus'
      ? t.dashboard.genericDetail
      : recommendation.detail;

  const isMemory = recommendation.kind === 'memory_review';
  const isContinue = recommendation.kind === 'continue_focus';
  const accent = isMemory ? colors.accentMoss : colors.primary;

  const iconName: React.ComponentProps<typeof Feather>['name'] = isMemory
    ? 'layers'
    : isContinue
    ? 'play-circle'
    : 'zap';

  return (
    <Card
      variant="default"
      style={[
        styles.heroSurface,
        {
          padding: isTablet ? spacing.xl : spacing.lg,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={[styles.contentStack, { gap: spacing.md }]}>
        {/* Context Label Row */}
        <View style={[styles.labelRow, { gap: spacing.xs }]}>
          <Feather name={iconName} size={14} color={accent} />
          <AppText
            variant="labelS"
            style={[
              styles.contextLabel,
              {
                color: colors.textMuted,
              },
            ]}
          >
            {t.dashboard.nextBestStep.toUpperCase()}
          </AppText>
        </View>

        {/* Dominant Headline & Calm Context */}
        <View style={{ gap: spacing.xxs }}>
          <AppText
            variant={isTablet ? 'displayXL' : 'headingL'}
            style={[
              styles.heroTitle,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {title}
          </AppText>

          <AppText
            variant="bodyM"
            style={[
              styles.heroDetail,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {detail}
          </AppText>
        </View>

        {/* Compact Academic Context Selector */}
        {onAcademicContextChange && (
          <AcademicContextSelector
            compact
            maxDepth="topic"
            requiredDepth="none"
            value={academicContext ?? { committeeId: null, subjectId: null, topicId: null }}
            onChange={onAcademicContextChange}
          />
        )}

        {/* Primary Action */}
        <View style={[styles.actionContainer, { gap: spacing.sm }]}>
          <Button
            label={actionLabel(recommendation, t)}
            onPress={onAction}
            size={isTablet ? 'lg' : 'md'}
            variant="primary"
            accessibilityLabel={`${t.dashboard.quickStart}: ${actionLabel(recommendation, t)}`}
            style={{
              alignSelf: isTablet ? 'flex-start' : 'stretch',
              minWidth: isTablet ? 220 : undefined,
            }}
          />

          {/* Secondary Options Row */}
          {(onStartSmall || onCheckIn) && (
            <View
              style={[
                styles.secondaryActions,
                {
                  flexDirection: isTablet ? 'row' : 'column',
                  flexWrap: 'wrap',
                  alignItems: isTablet ? 'center' : 'stretch',
                  gap: spacing.xs,
                },
              ]}
            >
              {onStartSmall ? (
                <Button
                  label={t.recovery.smallStart}
                  accessibilityLabel={t.dashboard.smallStartHint}
                  onPress={onStartSmall}
                  size="sm"
                  variant="secondary"
                  style={{
                    alignSelf: isTablet ? 'flex-start' : 'stretch',
                    maxWidth: '100%',
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
                    maxWidth: '100%',
                  }}
                />
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroSurface: {
    width: '100%',
  },
  contentStack: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroDetail: {
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 4,
    width: '100%',
  },
  secondaryActions: {
    marginTop: 2,
  },
});
