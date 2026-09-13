import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import type { DashboardCommittee } from '@/utils/dashboardRules';

interface CommitteeOverviewCardProps {
  committee: DashboardCommittee | null;
  error?: string;
  onOpen: (id: string) => void;
  onCreate: () => void;
}

/**
 * Restrained academic-context status strip.
 * Factual and non-competing with the primary study intention.
 */
export function CommitteeOverviewCard({
  committee,
  error,
  onOpen,
  onCreate,
}: CommitteeOverviewCardProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const t = useTranslation();

  const analytics = useMemo(() => {
    if (!committee) return null;
    try {
      return analyticsRepo.getCommitteeAnalytics(committee.id);
    } catch {
      return null;
    }
  }, [committee]);

  if (error !== undefined) {
    return (
      <View
        style={[
          styles.strip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            borderWidth: borders.hairline,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: spacing.sm,
          },
        ]}
      >
        <Feather name="alert-circle" size={14} color={colors.textMuted} />
        <AppText variant="bodyS" style={{ color: colors.textSecondary, flex: 1 }}>
          {t.dashboard.committeeError}
        </AppText>
      </View>
    );
  }

  if (committee === null) {
    return (
      <View
        style={[
          styles.strip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderSubtle,
            borderWidth: borders.hairline,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            gap: spacing.sm,
          },
        ]}
      >
        <Feather name="book-open" size={14} color={colors.textMuted} />
        <AppText variant="bodyS" style={{ color: colors.textSecondary, flex: 1 }}>
          {t.dashboard.firstCommittee}
        </AppText>
        <Button
          label={t.dashboard.createCommittee}
          variant="ghost"
          size="sm"
          onPress={onCreate}
        />
      </View>
    );
  }

  const topicCountText =
    analytics && analytics.totalTopics > 0
      ? `${analytics.practicedTopics}/${analytics.totalTopics} topics · ${analytics.coveragePercent ?? 0}%`
      : t.dashboard.committeeStatuses[committee.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.dashboard.openCommittee(committee.name)}
      onPress={() => onOpen(committee.id)}
      style={({ pressed }) => [
        styles.strip,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderWidth: borders.hairline,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.contentRow, { gap: spacing.sm }]}>
        <Feather name="book-open" size={14} color={colors.accent} style={{ marginTop: 2 }} />
        <View style={styles.textColumn}>
          <AppText
            variant="bodyM"
            numberOfLines={1}
            style={{ color: colors.textPrimary, fontWeight: '600' }}
          >
            {committee.name}
          </AppText>
          <AppText
            variant="labelS"
            numberOfLines={1}
            style={{ color: colors.textSecondary }}
          >
            {topicCountText}
          </AppText>
        </View>
        <Feather name="chevron-right" size={14} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  textColumn: {
    flex: 1,
  },
});
