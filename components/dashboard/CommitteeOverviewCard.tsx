import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
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

  const analytics = useMemo(() => {
    if (!committee) return null;
    try {
      return analyticsRepo.getCommitteeAnalytics(committee.id);
    } catch {
      return null;
    }
  }, [committee]);

  return (
    <VStack space="xs" style={styles.container}>
      <GSText
        size="xs"
        style={[
          styles.sectionLabel,
          {
            color: colors.textMuted,
          },
        ]}
      >
        {t.dashboard.committeeProgress.toUpperCase()}
      </GSText>

      {error !== undefined ? (
        <Card>
          <HStack space="sm" style={styles.messageRow}>
            <Feather name="alert-circle" size={18} color={colors.textMuted} />
            <GSText size="sm" style={{ color: colors.textSecondary, flex: 1 }}>
              {t.dashboard.committeeError}
            </GSText>
          </HStack>
        </Card>
      ) : committee === null ? (
        <Card
          style={[
            styles.empty,
            {
              padding: spacing.lg,
            },
          ]}
        >
          <Feather name="book-open" size={28} color={colors.primary} />
          <Heading size="sm" style={{ color: colors.textPrimary, marginTop: spacing.sm }}>
            {t.dashboard.firstCommittee}
          </Heading>
          <GSText
            size="xs"
            style={[styles.emptyText, { color: colors.textSecondary, marginTop: 4 }]}
          >
            {t.dashboard.firstCommitteeDetail}
          </GSText>
          <Button
            label={t.dashboard.createCommittee}
            variant="secondary"
            onPress={onCreate}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.dashboard.openCommittee(committee.name)}
          onPress={() => onOpen(committee.id)}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <Card
            style={[
              styles.committeeCard,
              {
                borderLeftColor: committee.color || colors.primary,
                borderLeftWidth: 4,
                padding: spacing.md,
              },
            ]}
          >
            <VStack space="xs">
              <HStack style={styles.topRow}>
                <HStack space="sm" style={styles.headerInfo}>
                  <Badge
                    label={t.dashboard.committeeStatuses[committee.status]}
                    variant={STATUS[committee.status].variant}
                    dot
                  />
                  <GSText size="xs" style={{ color: colors.textMuted }}>
                    {t.dashboard.examTiming(committee.daysToExam, committee.status === 'recently_completed')}
                  </GSText>
                </HStack>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </HStack>

              <Heading
                size="md"
                numberOfLines={2}
                style={{ color: colors.textPrimary, marginTop: 2 }}
              >
                {committee.name}
              </Heading>

              {/* Factual Progress Bar */}
              {analytics && analytics.totalTopics > 0 && (
                <VStack space="xs" style={{ marginTop: 6 }}>
                  <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <GSText size="xs" style={{ color: colors.textSecondary }}>
                      {t.dashboard.topicsComplete(analytics.practicedTopics, analytics.totalTopics)}
                    </GSText>
                    <GSText size="xs" style={{ color: colors.primary, fontWeight: '700' }}>
                      {analytics.coveragePercent !== null ? `${analytics.coveragePercent}%` : '0%'}
                    </GSText>
                  </HStack>
                  <View style={[styles.progressTrack, { backgroundColor: colors.surfaceElevated, borderRadius: radius.xs }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${analytics.coveragePercent ?? 0}%`,
                          backgroundColor: colors.primary,
                          borderRadius: radius.xs,
                        },
                      ]}
                    />
                  </View>
                </VStack>
              )}
            </VStack>
          </Card>
        </Pressable>
      )}
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
  committeeCard: {
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerInfo: {
    alignItems: 'center',
  },
  messageRow: {
    alignItems: 'center',
    padding: 12,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
});
