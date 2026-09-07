import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CommitteeAnalyticsSummary as CommitteeAnalyticsSummaryData } from '@/models/analytics';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { FeedbackState } from '@/components/ui/FeedbackState';

export interface CommitteeAnalyticsSummaryProps {
  summary: CommitteeAnalyticsSummaryData | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function CommitteeAnalyticsSummary({
  summary,
  loading = false,
  error = false,
  onRetry,
}: CommitteeAnalyticsSummaryProps) {
  const t = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <Section title={t.analytics.examEvidenceTitle}>
      {loading ? (
        <FeedbackState kind="loading" message={t.analytics.loading} />
      ) : error ? (
        <FeedbackState
          kind="error"
          message={t.analytics.loadError}
          action={onRetry ? { label: t.analytics.retry, onPress: onRetry } : undefined}
        />
      ) : !summary ? (
        <FeedbackState kind="empty" message={t.analytics.noTopics} />
      ) : (
        <Card elevated style={{ gap: spacing.md }}>
          {/* Coverage row */}
          <View
            style={styles.metricRow}
            accessible
            accessibilityRole="text"
            accessibilityLabel={
              summary.totalTopics === 0
                ? t.analytics.noTopics
                : t.analytics.coverageA11y(
                    summary.practicedTopics,
                    summary.totalTopics,
                    summary.coveragePercent ?? 0
                  )
            }
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.surface }]}>
              <Feather name="book-open" size={18} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.analytics.coverageLabel}
              </AppText>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {summary.totalTopics === 0
                  ? t.analytics.noTopics
                  : t.analytics.coverage(
                      summary.practicedTopics,
                      summary.totalTopics,
                      summary.coveragePercent ?? 0
                    )}
              </AppText>
            </View>
          </View>

          {/* Q-Bank row */}
          <View
            style={styles.metricRow}
            accessible
            accessibilityRole="text"
            accessibilityLabel={
              summary.totalQuestions === 0 || summary.qbankAccuracyPercent === null
                ? t.analytics.noQBank
                : t.analytics.qbankA11y(
                    summary.totalQuestions,
                    summary.qbankAccuracyPercent
                  )
            }
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.surface }]}>
              <Feather name="help-circle" size={18} color={colors.info} />
            </View>
            <View style={styles.textContainer}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.analytics.qbankLabel}
              </AppText>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {summary.totalQuestions === 0 || summary.qbankAccuracyPercent === null
                  ? t.analytics.noQBank
                  : t.analytics.qbankStats(
                      summary.totalQuestions,
                      summary.qbankAccuracyPercent
                    )}
              </AppText>
            </View>
          </View>

          {/* Memory row */}
          <View
            style={styles.metricRow}
            accessible
            accessibilityRole="text"
            accessibilityLabel={
              summary.memoryRetentionPercent === null
                ? summary.dueCardCount > 0
                  ? t.analytics.memoryDueOnly(summary.dueCardCount)
                  : t.analytics.noMemoryReviews
                : t.analytics.memoryStatsA11y(
                    summary.memoryRetentionPercent,
                    summary.dueCardCount
                  )
            }
          >
            <View style={[styles.iconWrapper, { backgroundColor: colors.surface }]}>
              <Feather name="layers" size={18} color={colors.success} />
            </View>
            <View style={styles.textContainer}>
              <AppText variant="caption" color={colors.textSecondary}>
                {t.analytics.memoryLabel}
              </AppText>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {summary.memoryRetentionPercent === null
                  ? summary.dueCardCount > 0
                    ? t.analytics.memoryDueOnly(summary.dueCardCount)
                    : t.analytics.noMemoryReviews
                  : t.analytics.memoryStats(
                      summary.memoryRetentionPercent,
                      summary.dueCardCount
                    )}
              </AppText>
            </View>
          </View>

          {/* Topic State Counts */}
          <View style={[styles.badgeRow, { gap: spacing.xs }]}>
            <Badge
              label={t.analytics.needsAttentionCount(summary.needsAttentionTopicCount)}
              variant={summary.needsAttentionTopicCount > 0 ? 'warning' : 'default'}
            />
            <Badge
              label={t.analytics.staleCount(summary.staleTopicCount)}
              variant="default"
            />
            <Badge
              label={t.analytics.neverStudiedCount(summary.neverStudiedTopicCount)}
              variant="default"
            />
          </View>
        </Card>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 4,
  },
});
