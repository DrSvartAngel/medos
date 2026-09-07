import { useTranslation } from '@/i18n';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
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

  const focusValue =
    focusError !== undefined || focus === null
      ? t.dashboard.summaryUnavailable
      : focus.completedSessions === 0
      ? t.dashboard.noCompleted
      : `${t.dashboard.duration(formatDashboardDuration(focus.totalSeconds))}, ${t.dashboard.completed(focus.completedSessions)}`;
  const focusAction = focus?.completedSessions === 0 ? t.dashboard.startFocus : t.dashboard.openFocus;
  const focusA11yLabel = `${t.focus.title}: ${focusValue}. ${focusAction}`;

  const memoryValue =
    memoryError !== undefined || memory === null
      ? t.dashboard.summaryUnavailable
      : memory.reviewCount === 0
      ? t.dashboard.noReviews
      : `${t.dashboard.reviews(memory.reviewCount)}, ${t.dashboard.reviewSummary(memory.decksReviewed, attentionCount)}`;
  const memoryA11yLabel = `${t.memory.title}: ${memoryValue}. ${t.dashboard.openMemory}`;

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
    <View>
      <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
        {t.dashboard.soFar}
      </AppText>
      <View style={[styles.metrics, { gap: spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={focusA11yLabel}
          onPress={onOpenFocus}
          style={({ pressed }) => [styles.metricWrap, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.icon, { backgroundColor: colors.primaryMuted, borderRadius: radius.sm }]}>
                <Feather name="clock" size={18} color={colors.primary} />
              </View>
              <AppText variant="label" style={{ marginLeft: spacing.sm, flex: 1 }}>{t.focus.title}</AppText>
            </View>
            {focusError !== undefined || focus === null ? (
              <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
                {t.dashboard.summaryUnavailable}
              </AppText>
            ) : focus.completedSessions === 0 ? (
              <>
                <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.dashboard.ready}</AppText>
                <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                  {t.dashboard.noCompleted}
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="h2" color={colors.primary} style={{ marginTop: spacing.md }}>
                  {t.dashboard.duration(formatDashboardDuration(focus.totalSeconds))}
                </AppText>
                <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                  {t.dashboard.completed(focus.completedSessions)}
                </AppText>
              </>
            )}
            <MetricFooter
              label={focusAction}
              accessibilityLabel={t.dashboard.openFocus}
            />
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={memoryA11yLabel}
          onPress={onOpenMemory}
          style={({ pressed }) => [styles.metricWrap, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.icon, { backgroundColor: colors.accentMuted, borderRadius: radius.sm }]}>
                <Feather name="layers" size={18} color={colors.accent} />
              </View>
              <AppText variant="label" style={{ marginLeft: spacing.sm, flex: 1 }}>{t.memory.title}</AppText>
            </View>
            {memoryError !== undefined || memory === null ? (
              <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
                {t.dashboard.summaryUnavailable}
              </AppText>
            ) : memory.reviewCount === 0 ? (
              <>
                <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.dashboard.reinforce}</AppText>
                <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                  {t.dashboard.noReviews}
                </AppText>
              </>
            ) : (
              <>
                <AppText variant="h2" color={colors.accent} style={{ marginTop: spacing.md }}>
                  {t.dashboard.reviews(memory.reviewCount)}
                </AppText>
                <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                  {t.dashboard.reviewSummary(memory.decksReviewed, attentionCount)}
                </AppText>
              </>
            )}
            <MetricFooter
              label={t.dashboard.openMemory}
              accessibilityLabel={t.dashboard.openMemory}
            />
          </Card>
        </Pressable>

        {qbank !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={qbankA11yLabel}
            onPress={onOpenQBank}
            style={({ pressed }) => [styles.metricWrap, { opacity: pressed ? 0.75 : 1 }]}
          >
            <Card style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <View style={[styles.icon, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}>
                  <Feather name="help-circle" size={18} color={colors.info} />
                </View>
                <AppText variant="label" style={{ marginLeft: spacing.sm, flex: 1 }}>{t.qbank.title}</AppText>
              </View>
              {qbankError !== undefined || qbank === null ? (
                <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
                  {t.dashboard.summaryUnavailable}
                </AppText>
              ) : qbank.totalQuestions === 0 ? (
                <>
                  <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.dashboard.ready}</AppText>
                  <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                    {t.dashboard.noQuestions}
                  </AppText>
                </>
              ) : (
                <>
                  <AppText variant="h2" color={colors.info} style={{ marginTop: spacing.md }}>
                    {qbank.totalQuestions}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
                    {qbank.accuracyPercent !== null
                      ? `${t.dashboard.questionsSolved} · ${t.dashboard.qbankAccuracy(qbank.accuracyPercent)}`
                      : t.dashboard.questionsSolved}
                  </AppText>
                </>
              )}
              <MetricFooter
                label={t.qbank.logSession}
                accessibilityLabel={t.qbank.logSession}
              />
            </Card>
          </Pressable>
        )}
      </View>
    </View>
  );

  function MetricFooter({ label, accessibilityLabel }: { label: string; accessibilityLabel?: string }) {
    return (
      <View
        style={[styles.footer, { marginTop: spacing.md }]}
        accessibilityLabel={accessibilityLabel ?? label}
      >
        <AppText variant="caption" color={colors.textMuted} style={styles.footerText}>{label}</AppText>
        <Feather name="chevron-right" size={16} color={colors.textMuted} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', flexWrap: 'wrap' },
  metricWrap: { flexBasis: 160, flexGrow: 1 },
  metricCard: { flex: 1 },
  metricHeader: { alignItems: 'center', flexDirection: 'row' },
  icon: { alignItems: 'center', height: 34, justifyContent: 'center', width: 34 },
  footer: { alignItems: 'center', flexDirection: 'row' },
  footerText: { flex: 1, fontWeight: '600' },
});
