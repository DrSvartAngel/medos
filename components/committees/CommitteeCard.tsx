import React from 'react';
import { useTranslation } from '@/i18n';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
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

// Badge variant type matches Badge component's BadgeVariant
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<CommitteeStatus, { variant: BadgeVariant }> = {
  upcoming:  { variant: 'info',    },
  active:    { variant: 'success', },
  completed: { variant: 'default', },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function CommitteeCard({ committee, onPress, style }: CommitteeCardProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const currentStatus = getCommitteeDateStatus(committee.startDate, committee.examDate);
  const days = getCommitteeDaysToExam(committee.examDate);
  const daysLabel = currentStatus === 'completed' ? t.sweep.statuses.completed : t.sweep.daysLeft(days);
  const daysColor = getDaysColor(days, currentStatus, colors);
  const badgeConfig = STATUS_CONFIG[currentStatus];

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
          borderLeftColor: committee.color,
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

      {/* Status badge */}
      <Badge
        label={t.sweep.statuses[currentStatus]}
        variant={badgeConfig.variant}
        dot
        style={{ marginTop: spacing.xs }}
      />

      {/* Exam date + days remaining */}
      <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
        <Feather name="calendar" size={13} color={colors.textMuted} />
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={{ marginLeft: 4 }}
        >
          {formatExamDate(committee.examDate, t.dashboard.locale)}
        </AppText>
        <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
        <AppText
          variant="bodySmall"
          color={daysColor}
          style={styles.daysText}
        >
          {daysLabel}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  card: {
    minHeight: 44,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 6,
  },
  daysText: {
    fontWeight: '600',
  },
});
