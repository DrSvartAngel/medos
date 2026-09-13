import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { getDB } from '@/db/client';
import {
  formatDashboardDuration,
  type DashboardFocusSummary,
  type DashboardMemorySummary,
  type DashboardQBankSummary,
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

/**
 * Scientific Data Editorial Metrics Ledger.
 * Open canvas feel, tabular numerals, strong number / quiet label hierarchy,
 * hairline separators, truthful neutral zero state.
 */
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
  const { colors, spacing, borders, radius } = useTheme();
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

  const totalFocusSeconds = focus?.totalSeconds ?? 0;
  const focusSessions = focus?.completedSessions ?? 0;
  const reviewedToday = memory?.reviewCount ?? 0;
  const questionsToday = qbank?.totalQuestions ?? 0;
  const accuracy = qbank?.accuracyPercent ?? null;

  const hasAnyError = Boolean(focusError || memoryError || qbankError);

  // Truthful neutral states
  const qbankValue =
    accuracy !== null
      ? `${accuracy}%`
      : questionsToday > 0
      ? `${questionsToday}`
      : '—';

  const qbankSubtitle =
    accuracy !== null
      ? t.dashboard.accuracy
      : questionsToday > 0
      ? `${questionsToday} solved`
      : t.dashboard.questionsSolved;

  return (
    <View
      style={[
        styles.ledgerContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: borders.hairline,
          borderRadius: radius.md,
        },
      ]}
    >
      {/* Ledger Header */}
      <View
        style={[
          styles.ledgerHeader,
          {
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderBottomWidth: borders.hairline,
            borderBottomColor: colors.borderSubtle,
          },
        ]}
      >
        <AppText
          variant="labelS"
          style={[styles.headerLabel, { color: colors.textMuted }]}
        >
          {t.dashboard.soFar.toUpperCase()}
        </AppText>
      </View>

      {/* 3-Column Tabular Numerical Grid */}
      <View style={styles.gridRow}>
        {/* Cell 1: Focus Time */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.tabs.focus}: ${formatDashboardDuration(totalFocusSeconds)}, ${t.dashboard.completed(focusSessions)}`}
          onPress={onOpenFocus}
          style={({ pressed }) => [
            styles.cell,
            {
              borderRightWidth: borders.hairline,
              borderRightColor: colors.borderSubtle,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText
            variant="labelS"
            style={[styles.cellCategory, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {t.tabs.focus.toUpperCase()}
          </AppText>
          <AppText
            variant="headingL"
            style={[styles.metricValue, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {formatDashboardDuration(totalFocusSeconds)}
          </AppText>
          <AppText
            variant="labelS"
            style={[styles.cellMeta, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {focusSessions > 0
              ? t.dashboard.completed(focusSessions)
              : t.dashboard.noCompleted}
          </AppText>
        </Pressable>

        {/* Cell 2: Memory / Due Cards */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.tabs.memory}: ${t.dashboard.cardsDue(dueCardCount)}, ${t.dashboard.reviewedToday(reviewedToday)}`}
          onPress={onOpenMemory}
          style={({ pressed }) => [
            styles.cell,
            {
              borderRightWidth: borders.hairline,
              borderRightColor: colors.borderSubtle,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText
            variant="labelS"
            style={[styles.cellCategory, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {t.tabs.memory.toUpperCase()}
          </AppText>
          <AppText
            variant="headingL"
            style={[styles.metricValue, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {dueCardCount}
          </AppText>
          <AppText
            variant="labelS"
            style={[styles.cellMeta, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {dueCardCount > 0
              ? t.dashboard.cardsDue(dueCardCount)
              : t.dashboard.reviewedToday(reviewedToday)}
          </AppText>
        </Pressable>

        {/* Cell 3: Q-Bank Accuracy */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t.dashboard.qbankAnalytics}: ${qbankValue}`}
          onPress={onOpenQBank ?? onOpenMemory}
          style={({ pressed }) => [
            styles.cell,
            {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <AppText
            variant="labelS"
            style={[styles.cellCategory, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {t.dashboard.qbankAnalytics.toUpperCase()}
          </AppText>
          <AppText
            variant="headingL"
            style={[styles.metricValue, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {qbankValue}
          </AppText>
          <AppText
            variant="labelS"
            style={[styles.cellMeta, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {qbankSubtitle}
          </AppText>
        </Pressable>
      </View>

      {/* Restrained Error Note if partial loading failed */}
      {hasAnyError && (
        <View
          style={[
            styles.errorRow,
            {
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderTopWidth: borders.hairline,
              borderTopColor: colors.borderSubtle,
              gap: spacing.xs,
            },
          ]}
        >
          <Feather name="alert-circle" size={12} color={colors.textMuted} />
          <AppText variant="labelS" style={{ color: colors.textMuted }}>
            {t.dashboard.partialError}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ledgerContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  ledgerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  gridRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cell: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  cellCategory: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricValue: {
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginVertical: 2,
  },
  cellMeta: {
    marginTop: 2,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
