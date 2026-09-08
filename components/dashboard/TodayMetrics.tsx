import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { getDB } from '@/db/client';
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
  const { isTablet } = useResponsive();
  const t = useTranslation();

  // Factual count of currently due cards from SQLite
  const dueCardCount = useMemo(() => {
    try {
      const row = getDB().getFirstSync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM flashcards
         WHERE schedule_state != 'unscheduled' AND next_review <= ?`,
        [Date.now()]
      );
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  }, []);

  // Factual count of weekly Q-Bank questions from SQLite
  const weeklyQBankCount = useMemo(() => {
    try {
      const weekStartMs = Date.now() - 7 * 86400000;
      const row = getDB().getFirstSync<{ count: number }>(
        `SELECT COALESCE(SUM(total_questions), 0) AS count
         FROM qbank_sessions WHERE created_at >= ?`,
        [weekStartMs]
      );
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  }, []);

  const reviewedToday = memory?.reviewCount ?? 0;
  const againCount = memory ? memory.againCount + memory.hardCount : 0;
  const questionsToday = qbank?.totalQuestions ?? 0;
  const accuracy = qbank?.accuracyPercent ?? null;

  return (
    <VStack space="sm" style={styles.container}>
      {/* Paired Analytics Surface: Memory + Q-Bank */}
      <View style={[styles.pairRow, { gap: spacing.sm }]}>
        {/* Surface 1: Memory Analytics */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.tabs.memory}: ${t.dashboard.cardsDue(dueCardCount)}, ${t.dashboard.reviewedToday(reviewedToday)}`}
          onPress={onOpenMemory}
          style={({ pressed }) => [styles.tileWrap, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Card style={styles.tileCard}>
            <VStack space="sm">
              {/* Tile Header */}
              <HStack style={styles.tileHeader}>
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <Box
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.primaryMuted, borderRadius: radius.xs },
                    ]}
                  >
                    <Feather name="layers" size={14} color={colors.primary} />
                  </Box>
                  <GSText size="xs" style={[styles.tileCategory, { color: colors.textMuted }]}>
                    {t.tabs.memory.toUpperCase()}
                  </GSText>
                </HStack>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </HStack>

              {/* Memory Metrics Headline */}
              <VStack space="xs">
                <HStack style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Heading size="md" style={{ color: dueCardCount > 0 ? colors.warning : colors.textPrimary }}>
                    {dueCardCount}
                  </Heading>
                  <GSText size="xs" style={{ color: colors.textSecondary }}>
                    {t.dashboard.cardsDue(dueCardCount)}
                  </GSText>
                </HStack>

                {/* Progress bar representing completed vs total active */}
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated, borderRadius: radius.xs }]}>
                  {dueCardCount + reviewedToday > 0 && (
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(100, Math.round((reviewedToday / (dueCardCount + reviewedToday)) * 100))}%`,
                          backgroundColor: colors.primary,
                          borderRadius: radius.xs,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Supporting text */}
                <HStack style={{ justifyContent: 'space-between', marginTop: 2 }}>
                  <GSText size="xs" style={{ color: colors.textMuted }}>
                    {t.dashboard.reviewedToday(reviewedToday)}
                  </GSText>
                  {againCount > 0 && (
                    <GSText size="xs" style={{ color: colors.warning }}>
                      {againCount} Again/Hard
                    </GSText>
                  )}
                </HStack>
              </VStack>
            </VStack>
          </Card>
        </Pressable>

        {/* Surface 2: Q-Bank Analytics */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.dashboard.qbankAnalytics}: ${accuracy !== null ? `${accuracy}%` : `${questionsToday} questions`}`}
          onPress={onOpenQBank ?? onOpenMemory}
          style={({ pressed }) => [styles.tileWrap, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Card style={styles.tileCard}>
            <VStack space="sm">
              {/* Tile Header */}
              <HStack style={styles.tileHeader}>
                <HStack space="xs" style={{ alignItems: 'center' }}>
                  <Box
                    style={[
                      styles.iconWrap,
                      { backgroundColor: colors.primaryMuted, borderRadius: radius.xs },
                    ]}
                  >
                    <Feather name="help-circle" size={14} color={colors.primary} />
                  </Box>
                  <GSText size="xs" style={[styles.tileCategory, { color: colors.textMuted }]}>
                    {t.dashboard.qbankAnalytics.toUpperCase()}
                  </GSText>
                </HStack>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </HStack>

              {/* Q-Bank Headline */}
              <VStack space="xs">
                <HStack style={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Heading size="md" style={{ color: colors.primary }}>
                    {accuracy !== null ? `${accuracy}%` : `${questionsToday}`}
                  </Heading>
                  <GSText size="xs" style={{ color: colors.textSecondary }}>
                    {accuracy !== null ? t.dashboard.accuracy : t.dashboard.questionsSolved}
                  </GSText>
                </HStack>

                {/* Accuracy track */}
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated, borderRadius: radius.xs }]}>
                  {accuracy !== null && (
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${accuracy}%`,
                          backgroundColor: colors.primary,
                          borderRadius: radius.xs,
                        },
                      ]}
                    />
                  )}
                </View>

                {/* Supporting text */}
                <HStack style={{ justifyContent: 'space-between', marginTop: 2 }}>
                  <GSText size="xs" style={{ color: colors.textMuted }}>
                    {questionsToday > 0 ? `${questionsToday} today` : t.dashboard.noQuestions}
                  </GSText>
                  {weeklyQBankCount > 0 && (
                    <GSText size="xs" style={{ color: colors.textSecondary }}>
                      {weeklyQBankCount} {t.dashboard.thisWeek.toLowerCase()}
                    </GSText>
                  )}
                </HStack>
              </VStack>
            </VStack>
          </Card>
        </Pressable>
      </View>
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pairRow: {
    flexDirection: 'row',
    width: '100%',
  },
  tileWrap: {
    flex: 1,
    minWidth: 0,
  },
  tileCard: {
    padding: 14,
    width: '100%',
  },
  tileHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  tileCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  progressTrack: {
    height: 5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
});
