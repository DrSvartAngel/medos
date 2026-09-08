import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  const accent = isMemory ? colors.accent : colors.primary;

  const iconName: React.ComponentProps<typeof Feather>['name'] = isMemory
    ? 'layers'
    : isContinue
    ? 'play-circle'
    : 'zap';

  return (
    <Card
      elevated
      style={[
        styles.heroSurface,
        {
          borderLeftColor: accent,
          borderLeftWidth: 4,
          padding: isTablet ? spacing.xl : spacing.lg,
        },
      ]}
    >
      <VStack space="md" style={styles.contentStack}>
        {/* Context Label Row with Gluestack HStack & Box */}
        <HStack space="sm" style={styles.labelRow}>
          <Box
            style={[
              styles.iconWrap,
              {
                backgroundColor: colors.primaryMuted,
                borderRadius: radius.sm,
              },
            ]}
          >
            <Feather name={iconName} size={18} color={accent} />
          </Box>
          <GSText
            size="xs"
            style={[
              styles.contextLabel,
              {
                color: colors.textMuted,
              },
            ]}
          >
            {t.dashboard.nextBestStep.toUpperCase()}
          </GSText>
        </HStack>

        {/* Dominant Headline using Gluestack Heading */}
        <VStack space="xs">
          <Heading
            size={isTablet ? '2xl' : 'xl'}
            style={[
              styles.heroTitle,
              {
                color: colors.textPrimary,
              },
            ]}
          >
            {title}
          </Heading>

          {/* Calm supporting context using GSText */}
          <GSText
            size="sm"
            style={[
              styles.heroDetail,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {detail}
          </GSText>
        </VStack>

        {/* Primary Teal Action */}
        <VStack space="sm" style={styles.actionContainer}>
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
            <HStack
              space="sm"
              style={[
                styles.secondaryActions,
                {
                  flexDirection: isTablet ? 'row' : 'column',
                  alignItems: isTablet ? 'center' : 'stretch',
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
                  }}
                />
              ) : null}
            </HStack>
          )}
        </VStack>
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  heroSurface: {
    width: '100%',
    borderWidth: 1,
  },
  contentStack: {
    width: '100%',
  },
  labelRow: {
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
  heroTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroDetail: {
    lineHeight: 20,
  },
  actionContainer: {
    marginTop: 6,
    width: '100%',
  },
  secondaryActions: {
    marginTop: 2,
  },
});
