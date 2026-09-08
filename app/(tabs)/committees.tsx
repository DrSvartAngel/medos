import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { TabTopHeader } from '@/components/layout/TabTopHeader';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { CommitteeEmptyState } from '@/components/committees/CommitteeEmptyState';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore, type Committee, type CommitteeStatus } from '@/store/useCommitteeStore';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/i18n';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import {
  getCommitteeDateStatus,
  getCommitteeDaysToExam,
} from '@/utils/committeeDate';

function formatExamDate(ts: number, locale: string): string {
  return new Date(ts).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CommitteesScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isTablet, columns } = useResponsive();
  const t = useTranslation();

  const isDBReady       = useAppStore((s) => s.isDBReady);
  const committees      = useCommitteeStore((s) => s.committees);
  const isLoading       = useCommitteeStore((s) => s.isLoading);
  const error           = useCommitteeStore((s) => s.error);
  const loadCommittees  = useCommitteeStore((s) => s.loadCommittees);

  // Load committees once the DB is ready
  useEffect(() => {
    if (isDBReady) {
      loadCommittees();
    }
  }, [isDBReady, loadCommittees]);

  // Responsive column helper preserved for responsive invariant
  const numCols = columns(1);

  function handleAdd() {
    router.push('/committees/new' as Href);
  }

  function handleOpen(id: string) {
    router.push(`/committees/${id}` as Href);
  }

  // Identify active / current committee
  const activeCommittee: Committee | null = useMemo(() => {
    if (committees.length === 0) return null;
    const active = committees.find(
      (c) => getCommitteeDateStatus(c.startDate, c.examDate) === 'active'
    );
    if (active) return active;
    const upcoming = committees.find(
      (c) => getCommitteeDateStatus(c.startDate, c.examDate) === 'upcoming'
    );
    return upcoming ?? committees[0];
  }, [committees]);

  // Factual topic progress for active committee
  const activeAnalytics = useMemo(() => {
    if (!activeCommittee) return null;
    try {
      return analyticsRepo.getCommitteeAnalytics(activeCommittee.id);
    } catch {
      return null;
    }
  }, [activeCommittee]);

  return (
    <ScreenWrapper>
      <TabTopHeader />

      {/* ── Title & Context Header ──────────────────────────── */}
      <View style={[styles.header, { marginBottom: spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.committees.title}</AppText>
            <AppText
              variant="body"
              color={colors.textSecondary}
              style={{ marginTop: 2 }}
            >
              {committees.length > 0
                ? t.committees.count(committees.length)
                : t.committees.subtitle}
            </AppText>
          </View>

          {committees.length > 0 && (
            <Button
              label={t.committees.newCommittee}
              size="sm"
              variant="secondary"
              onPress={handleAdd}
              icon={<Feather name="plus" size={16} color={colors.primary} />}
            />
          )}
        </View>
      </View>

      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && (
        <LoadingState message={t.common.loading} />
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {!isLoading && error !== null && (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ErrorState
            title={t.common.noData}
            message={t.sweep.committeeLoadFailed}
          />
          <Button
            label={t.common.retry}
            onPress={loadCommittees}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!isLoading && error === null && committees.length === 0 && (
        <CommitteeEmptyState onAdd={handleAdd} />
      )}

      {/* ── Curriculum Content ──────────────────────────────── */}
      {!isLoading && error === null && committees.length > 0 && (
        <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
          {/* ── Current Committee Highlight ───────────────────── */}
          {activeCommittee && (
            <View style={{ gap: spacing.xs }}>
              <AppText
                variant="label"
                color={colors.textMuted}
                style={styles.sectionLabel}
              >
                {t.dashboard.committeeStatuses.active.toUpperCase()}
              </AppText>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t.sweep.openCommittee(
                  activeCommittee.name,
                  t.sweep.statuses[getCommitteeDateStatus(activeCommittee.startDate, activeCommittee.examDate)],
                  t.sweep.daysLeft(getCommitteeDaysToExam(activeCommittee.examDate))
                )}
                onPress={() => handleOpen(activeCommittee.id)}
                activeOpacity={0.75}
              >
                <Card
                  elevated
                  style={[
                    styles.currentCard,
                    {
                      borderLeftColor: activeCommittee.color || colors.primary,
                      borderLeftWidth: 4,
                      padding: spacing.md,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <View style={styles.currentRow}>
                    <View style={styles.currentInfo}>
                      <View style={styles.currentBadgeRow}>
                        <Badge
                          label={t.dashboard.committeeStatuses.active.toUpperCase()}
                          variant="success"
                          size="sm"
                          dot
                        />
                        <AppText
                          variant="bodySmall"
                          color={colors.textSecondary}
                          style={{ marginLeft: spacing.sm }}
                        >
                          {t.sweep.daysLeft(getCommitteeDaysToExam(activeCommittee.examDate))}
                        </AppText>
                      </View>

                      <AppText
                        variant="h3"
                        numberOfLines={1}
                        style={{ marginTop: spacing.xs }}
                      >
                        {activeCommittee.name}
                      </AppText>

                      <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
                        <Feather name="calendar" size={13} color={colors.textMuted} />
                        <AppText
                          variant="bodySmall"
                          color={colors.textSecondary}
                          style={{ marginLeft: 4 }}
                        >
                          {formatExamDate(activeCommittee.examDate, t.dashboard.locale)}
                        </AppText>
                      </View>
                    </View>

                    <Feather name="chevron-right" size={20} color={colors.textMuted} />
                  </View>

                  {/* Factual Topic Progress if topics exist */}
                  {activeAnalytics && activeAnalytics.totalTopics > 0 && (
                    <View style={{ marginTop: spacing.sm }}>
                      <ProgressBar
                        value={activeAnalytics.practicedTopics}
                        max={activeAnalytics.totalTopics}
                        label={t.dashboard.topicsComplete(
                          activeAnalytics.practicedTopics,
                          activeAnalytics.totalTopics
                        )}
                        showPercentage
                        height={6}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            </View>
          )}

          {/* ── All Committees List ───────────────────────────── */}
          <View style={{ gap: spacing.xs }}>
            <SectionHeader
              title={t.committees.title}
              badge={`${committees.length}`}
              badgeVariant="default"
            />

            <View
              style={[
                styles.listContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}
            >
              {committees.map((committee, index) => {
                const status = getCommitteeDateStatus(committee.startDate, committee.examDate);
                const days = getCommitteeDaysToExam(committee.examDate);
                const daysLabel = status === 'completed' ? t.sweep.statuses.completed : t.sweep.daysLeft(days);
                const isLast = index === committees.length - 1;

                return (
                  <ListRow
                    key={committee.id}
                    title={committee.name}
                    subtitle={`${formatExamDate(committee.examDate, t.dashboard.locale)} · ${daysLabel}`}
                    leading={
                      <View
                        style={[
                          styles.colorIndicator,
                          {
                            backgroundColor: committee.color || colors.primary,
                            borderRadius: radius.xs,
                          },
                        ]}
                      />
                    }
                    trailing={
                      <Badge
                        label={t.sweep.statuses[status]}
                        variant={status === 'active' ? 'success' : status === 'upcoming' ? 'info' : 'default'}
                        size="sm"
                      />
                    }
                    chevron
                    borderBottom={!isLast}
                    accessibilityRole="button"
                    accessibilityLabel={t.sweep.openCommittee(committee.name, t.sweep.statuses[status], daysLabel)}
                    onPress={() => handleOpen(committee.id)}
                  />
                );
              })}
            </View>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentCard: {
    overflow: 'hidden',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currentInfo: {
    flex: 1,
    marginRight: 8,
  },
  currentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listContainer: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorIndicator: {
    width: 10,
    height: 10,
  },
});

