import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { formatDashboardDuration } from '@/utils/dashboardRules';
import type {
  DashboardFocusSummary,
  DashboardMemorySummary,
  DashboardQBankSummary,
} from '@/utils/dashboardRules';

interface TodayMetricsProps {
  focus: DashboardFocusSummary | null;
  memory: DashboardMemorySummary | null;
  qbank?: DashboardQBankSummary | null;
  focusError?: string;
  memoryError?: string;
  qbankError?: string;
  onOpenFocus: () => void;
  onOpenMemory: () => void;
  onOpenQBank?: () => void;
}

export function TodayMetrics({
  focus,
  memory,
  qbank,
  focusError,
  memoryError,
  qbankError,
  onOpenFocus,
  onOpenMemory,
  onOpenQBank,
}: TodayMetricsProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();
  const attentionCount = memory ? memory.againCount + memory.hardCount : 0;

  // 1. Focus
  const focusValue =
    focusError !== undefined || focus === null
      ? t.dashboard.summaryUnavailable
      : focus.completedSessions === 0
      ? t.dashboard.noCompleted
      : `${t.dashboard.duration(formatDashboardDuration(focus.totalSeconds))}, ${t.dashboard.completed(focus.completedSessions)}`;
  const focusAction = focus?.completedSessions === 0 ? t.dashboard.startFocus : t.dashboard.openFocus;
  const focusA11yLabel = `${t.focus.title}: ${focusValue}. ${focusAction}`;

  // 2. Memory
  const memoryValue =
    memoryError !== undefined || memory === null
      ? t.dashboard.summaryUnavailable
      : memory.reviewCount === 0
      ? t.dashboard.noReviews
      : `${t.dashboard.reviews(memory.reviewCount)}, ${t.dashboard.reviewSummary(memory.decksReviewed, attentionCount)}`;
  const memoryA11yLabel = `${t.memory.title}: ${memoryValue}. ${t.dashboard.openMemory}`;

  // 3. Q-Bank
  const qbankValue =
    qbankError !== undefined || qbank === null
      ? t.dashboard.summaryUnavailable
      : qbank?.totalQuestions === 0
      ? t.dashboard.noQuestions
      : `${qbank?.totalQuestions ?? 0} ${t.dashboard.questionsSolved}${
          qbank?.accuracyPercent !== null && qbank?.accuracyPercent !== undefined
            ? `, ${t.dashboard.qbankAccuracy(qbank.accuracyPercent)}`
            : ''
        }`;
  const qbankA11yLabel = `${t.qbank.title}: ${qbankValue}. ${t.qbank.logSession}`;

  return (
    <VStack space="sm" style={styles.container}>
      {/* Section Subtitle */}
      <GSText
        size="xs"
        style={[
          styles.sectionLabel,
          {
            color: colors.textMuted,
          },
        ]}
      >
        {t.dashboard.soFar.toUpperCase()}
      </GSText>

      {/* Grouped 3-Metric Surface / Responsive Row */}
      <View style={[styles.metricGrid, { gap: spacing.sm }]}>
        {/* Metric 1: Focus */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={focusA11yLabel}
          onPress={onOpenFocus}
          style={({ pressed }) => [
            styles.metricTileWrapper,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Card
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: radius.lg,
                padding: spacing.md,
              },
            ]}
          >
            <VStack space="xs" style={styles.tileStack}>
              <HStack style={styles.metricHeader}>
                <Box
                  style={[
                    styles.metricIconWrap,
                    {
                      backgroundColor: colors.primaryMuted,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Feather name="clock" size={16} color={colors.primary} />
                </Box>
                <GSText
                  size="xs"
                  style={[styles.tileLabel, { color: colors.textSecondary }]}
                >
                  {t.focus.title}
                </GSText>
              </HStack>

              {focusError !== undefined || focus === null ? (
                <GSText size="xs" style={{ color: colors.textMuted, marginTop: 4 }}>
                  {t.dashboard.summaryUnavailable}
                </GSText>
              ) : focus.completedSessions === 0 ? (
                <VStack space="xs" style={styles.valueGroup}>
                  <Heading size="md" style={{ color: colors.textPrimary }}>
                    {t.dashboard.ready}
                  </Heading>
                  <GSText size="xs" style={{ color: colors.textMuted }}>
                    {t.dashboard.noCompleted}
                  </GSText>
                </VStack>
              ) : (
                <VStack space="xs" style={styles.valueGroup}>
                  <Heading size="md" style={{ color: colors.primary }}>
                    {t.dashboard.duration(formatDashboardDuration(focus.totalSeconds))}
                  </Heading>
                  <GSText size="xs" style={{ color: colors.textSecondary }}>
                    {t.dashboard.completed(focus.completedSessions)}
                  </GSText>
                </VStack>
              )}

              <HStack style={styles.tileFooter}>
                <GSText size="xs" style={[styles.footerText, { color: colors.textMuted }]}>
                  {focusAction}
                </GSText>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </HStack>
            </VStack>
          </Card>
        </Pressable>

        {/* Metric 2: Memory */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={memoryA11yLabel}
          onPress={onOpenMemory}
          style={({ pressed }) => [
            styles.metricTileWrapper,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Card
            style={[
              styles.metricCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
                borderRadius: radius.lg,
                padding: spacing.md,
              },
            ]}
          >
            <VStack space="xs" style={styles.tileStack}>
              <HStack style={styles.metricHeader}>
                <Box
                  style={[
                    styles.metricIconWrap,
                    {
                      backgroundColor: colors.primaryMuted,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Feather name="layers" size={16} color={colors.primary} />
                </Box>
                <GSText
                  size="xs"
                  style={[styles.tileLabel, { color: colors.textSecondary }]}
                >
                  {t.memory.title}
                </GSText>
              </HStack>

              {memoryError !== undefined || memory === null ? (
                <GSText size="xs" style={{ color: colors.textMuted, marginTop: 4 }}>
                  {t.dashboard.summaryUnavailable}
                </GSText>
              ) : memory.reviewCount === 0 ? (
                <VStack space="xs" style={styles.valueGroup}>
                  <Heading size="md" style={{ color: colors.textPrimary }}>
                    {t.dashboard.reinforce}
                  </Heading>
                  <GSText size="xs" style={{ color: colors.textMuted }}>
                    {t.dashboard.noReviews}
                  </GSText>
                </VStack>
              ) : (
                <VStack space="xs" style={styles.valueGroup}>
                  <Heading size="md" style={{ color: colors.primary }}>
                    {t.dashboard.reviews(memory.reviewCount)}
                  </Heading>
                  <GSText size="xs" style={{ color: colors.textSecondary }}>
                    {t.dashboard.reviewSummary(memory.decksReviewed, attentionCount)}
                  </GSText>
                </VStack>
              )}

              <HStack style={styles.tileFooter}>
                <GSText size="xs" style={[styles.footerText, { color: colors.textMuted }]}>
                  {t.dashboard.openMemory}
                </GSText>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </HStack>
            </VStack>
          </Card>
        </Pressable>

        {/* Metric 3: Q-Bank */}
        {qbank !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={qbankA11yLabel}
            onPress={onOpenQBank}
            style={({ pressed }) => [
              styles.metricTileWrapper,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Card
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.cardBorder,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                },
              ]}
            >
              <VStack space="xs" style={styles.tileStack}>
                <HStack style={styles.metricHeader}>
                  <Box
                    style={[
                      styles.metricIconWrap,
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Feather name="help-circle" size={16} color={colors.info} />
                  </Box>
                  <GSText
                    size="xs"
                    style={[styles.tileLabel, { color: colors.textSecondary }]}
                  >
                    {t.qbank.title}
                  </GSText>
                </HStack>

                {qbankError !== undefined || qbank === null ? (
                  <GSText size="xs" style={{ color: colors.textMuted, marginTop: 4 }}>
                    {t.dashboard.summaryUnavailable}
                  </GSText>
                ) : qbank.totalQuestions === 0 ? (
                  <VStack space="xs" style={styles.valueGroup}>
                    <Heading size="md" style={{ color: colors.textPrimary }}>
                      {t.dashboard.ready}
                    </Heading>
                    <GSText size="xs" style={{ color: colors.textMuted }}>
                      {t.dashboard.noQuestions}
                    </GSText>
                  </VStack>
                ) : (
                  <VStack space="xs" style={styles.valueGroup}>
                    <Heading size="md" style={{ color: colors.info }}>
                      {qbank.totalQuestions}
                    </Heading>
                    <GSText size="xs" style={{ color: colors.textSecondary }}>
                      {qbank.accuracyPercent !== null
                        ? `${t.dashboard.questionsSolved} · ${t.dashboard.qbankAccuracy(qbank.accuracyPercent)}`
                        : t.dashboard.questionsSolved}
                    </GSText>
                  </VStack>
                )}

                <HStack style={styles.tileFooter}>
                  <GSText size="xs" style={[styles.footerText, { color: colors.textMuted }]}>
                    {t.qbank.logSession}
                  </GSText>
                  <Feather name="chevron-right" size={14} color={colors.textMuted} />
                </HStack>
              </VStack>
            </Card>
          </Pressable>
        )}
      </View>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  metricTileWrapper: {
    flexBasis: 140,
    flexGrow: 1,
    minWidth: 100,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
  },
  tileStack: {
    justifyContent: 'space-between',
    minHeight: 110,
  },
  metricHeader: {
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontWeight: '600',
    flex: 1,
  },
  valueGroup: {
    marginTop: 2,
    marginBottom: 4,
  },
  tileFooter: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  footerText: {
    fontWeight: '600',
  },
});
