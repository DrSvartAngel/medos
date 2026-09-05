import { useTranslation } from '@/i18n';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { formatDashboardDuration } from '@/utils/dashboardRules';
import type { DashboardFocusSummary, DashboardMemorySummary } from '@/utils/dashboardRules';

interface TodayMetricsProps {
  focus: DashboardFocusSummary | null;
  memory: DashboardMemorySummary | null;
  focusError?: string;
  memoryError?: string;
  onOpenFocus: () => void;
  onOpenMemory: () => void;
}

export function TodayMetrics({
  focus,
  memory,
  focusError,
  memoryError,
  onOpenFocus,
  onOpenMemory,
}: TodayMetricsProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();
  const attentionCount = memory ? memory.againCount + memory.hardCount : 0;

  return (
    <View>
      <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
        {t.dashboard.soFar}
      </AppText>
      <View style={[styles.metrics, { gap: spacing.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dashboard.openFocus}
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
            <MetricFooter label={focus?.completedSessions === 0 ? t.dashboard.startFocus : t.dashboard.openFocus} />
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dashboard.openMemory}
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
            <MetricFooter label={t.dashboard.openMemory} />
          </Card>
        </Pressable>
      </View>
    </View>
  );

  function MetricFooter({ label }: { label: string }) {
    return (
      <View style={[styles.footer, { marginTop: spacing.md }]}>
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
