import React, { useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import type { Committee, CommitteeStatus } from '@/store/useCommitteeStore';
import {
  getCommitteeDateStatus,
  getCommitteeDaysToExam,
} from '@/utils/committeeDate';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CommitteeCardProps {
  committee: Committee;
  onPress: () => void;
  style?: ViewStyle;
}

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

const STATUS_CONFIG: Record<CommitteeStatus, { variant: BadgeVariant }> = {
  upcoming:  { variant: 'info' },
  active:    { variant: 'success' },
  completed: { variant: 'default' },
};

function formatExamDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysColor(
  days: number,
  status: CommitteeStatus,
  colors: { success: string; warning: string; error: string; textMuted: string }
): string {
  if (status === 'completed') return colors.textMuted;
  if (days > 14) return colors.success;
  if (days > 7)  return colors.warning;
  return colors.error;
}

export function CommitteeCard({ committee, onPress, style }: CommitteeCardProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const currentStatus = getCommitteeDateStatus(committee.startDate, committee.examDate);
  const days = getCommitteeDaysToExam(committee.examDate);
  const daysLabel = currentStatus === 'completed' ? t.sweep.statuses.completed : t.sweep.daysLeft(days);
  const daysColor = getDaysColor(days, currentStatus, colors);
  const badgeConfig = STATUS_CONFIG[currentStatus];

  const analytics = useMemo(() => {
    try {
      return analyticsRepo.getCommitteeAnalytics(committee.id);
    } catch {
      return null;
    }
  }, [committee.id]);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={t.sweep.openCommittee(committee.name, t.sweep.statuses[currentStatus], daysLabel)}
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          borderLeftColor: committee.color || colors.primary,
        },
        style,
      ]}
    >
      {/* Name + chevron */}
      <View style={styles.nameRow}>
        <AppText variant="h3" numberOfLines={1} style={styles.name}>
          {committee.name}
        </AppText>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </View>

      {/* Status badge + days */}
      <View style={[styles.badgeRow, { marginTop: spacing.xs }]}>
        <Badge
          label={t.sweep.statuses[currentStatus]}
          variant={badgeConfig.variant}
          dot
        />
        <AppText
          variant="bodySmall"
          color={daysColor}
          style={[styles.daysText, { marginLeft: spacing.sm }]}
        >
          {daysLabel}
        </AppText>
      </View>

      {/* Exam date */}
      <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
        <Feather name="calendar" size={13} color={colors.textMuted} />
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={{ marginLeft: 4 }}
        >
          {formatExamDate(committee.examDate, t.dashboard.locale)}
        </AppText>
      </View>

      {/* Factual Progress if topics exist */}
      {analytics && analytics.totalTopics > 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <ProgressBar
            value={analytics.practicedTopics}
            max={analytics.totalTopics}
            label={t.dashboard.topicsComplete(analytics.practicedTopics, analytics.totalTopics)}
            showPercentage
            height={5}
            color={colors.primary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 48,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysText: {
    fontWeight: '600',
  },
});

