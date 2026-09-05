import { useTranslation } from '@/i18n';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import type { DashboardCommittee, DashboardCommitteeStatus } from '@/utils/dashboardRules';

interface CommitteeOverviewCardProps {
  committee: DashboardCommittee | null;
  error?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
}

const STATUS: Record<
  DashboardCommitteeStatus,
  { variant: 'success' | 'info' | 'default' }
> = {
  active: { variant: 'success' },
  upcoming: { variant: 'info' },
  recently_completed: { variant: 'default' },
};

export function CommitteeOverviewCard({
  committee,
  error,
  onOpen,
  onCreate,
}: CommitteeOverviewCardProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  return (
    <View>
      <AppText variant="label" color={colors.textMuted} style={{ marginBottom: spacing.sm }}>
        {t.dashboard.committee}
      </AppText>

      {error !== undefined ? (
        <Card>
          <View style={styles.messageRow}>
            <Feather name="alert-circle" size={19} color={colors.textMuted} />
            <AppText variant="bodySmall" color={colors.textSecondary} style={styles.messageText}>
              {t.dashboard.committeeError}
            </AppText>
          </View>
        </Card>
      ) : committee === null ? (
        <Card elevated style={styles.empty}>
          <Feather name="book-open" size={30} color={colors.info} />
          <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.dashboard.firstCommittee}</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.emptyText}>
            {t.dashboard.firstCommitteeDetail}
          </AppText>
          <Button label={t.dashboard.createCommittee} variant="secondary" onPress={onCreate} style={{ marginTop: spacing.md }} />
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dashboard.openCommittee(committee.name)}
          onPress={() => onOpen(committee.id)}
          style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
        >
          <Card
            style={[
              styles.committeeCard,
              { borderLeftColor: committee.color, borderRadius: radius.md },
            ]}
          >
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Badge label={t.dashboard.committeeStatuses[committee.status]} variant={STATUS[committee.status].variant} dot />
                <AppText variant="h3" numberOfLines={2} style={{ marginTop: spacing.sm }}>
                  {committee.name}
                </AppText>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </View>

            <View style={[styles.metaRow, { marginTop: spacing.md }]}>
              <Feather name="calendar" size={16} color={colors.textMuted} />
              <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: spacing.sm }}>
                {new Date(committee.examDate).toLocaleDateString(t.dashboard.locale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </AppText>
            </View>
            <AppText
              variant="body"
              color={committee.status === 'active' ? colors.textPrimary : colors.textSecondary}
              style={{ fontWeight: '600', marginTop: spacing.xs }}
            >
              {t.dashboard.examTiming(committee.daysToExam, committee.status === 'recently_completed')}
            </AppText>
          </Card>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  committeeCard: { borderLeftWidth: 4 },
  titleRow: { alignItems: 'center', flexDirection: 'row' },
  titleText: { flex: 1, marginRight: 12 },
  metaRow: { alignItems: 'center', flexDirection: 'row' },
  empty: { alignItems: 'center' },
  emptyText: { marginTop: 6, maxWidth: 420, textAlign: 'center' },
  messageRow: { alignItems: 'center', flexDirection: 'row' },
  messageText: { flex: 1, marginLeft: 10 },
});
