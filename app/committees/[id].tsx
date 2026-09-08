import { SubjectList } from '@/components/curriculum/SubjectList';
import { CommitteeLearningEvidence } from '@/components/curriculum/CommitteeLearningEvidence';
import { CommitteeAnalyticsSummary } from '@/components/analytics/CommitteeAnalyticsSummary';
import { WeakTopicsList } from '@/components/analytics/WeakTopicsList';
import { NeglectedTopicsList } from '@/components/analytics/NeglectedTopicsList';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import { getWeakTopics, getNeglectedTopics } from '@/utils/analyticsPriorityRules';
import type {
  CommitteeAnalyticsSummary as CommitteeAnalyticsSummaryData,
  WeakTopicItem,
  NeglectedTopicItem,
} from '@/models/analytics';
import { useTranslation } from '@/i18n';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { subjectRouteId } from '@/utils/subjectRoutes';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore, type CommitteeStatus } from '@/store/useCommitteeStore';
import { formatAgendaDate, formatLocalDateKey } from '@/utils/calendarDate';
import {
  getCommitteeDateStatus,
  getCommitteeDaysToExam,
} from '@/utils/committeeDate';

const STATUS_BADGE: Record<
  CommitteeStatus,
  { variant: 'info' | 'success' | 'default' }
> = {
  upcoming: { variant: 'info', },
  active: { variant: 'success', },
  completed: { variant: 'default', },
};

function formatCommitteeDate(timestamp: number, locale: string): string {
  return formatAgendaDate(formatLocalDateKey(timestamp), locale);
}

export default function CommitteeDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = subjectRouteId(params.id);
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  function back() {
    router.dismissTo('/(tabs)/committees');
  }

  const committee = useCommitteeStore((state) =>
    state.committees.find((item) => item.id === id)
  );
  const isLoadingCommittee = useCommitteeStore((state) => state.isLoadingCommittee);
  const committeeRequestId = useCommitteeStore((state) => state.committeeRequestId);
  const committeeLoadError = useCommitteeStore((state) => state.committeeLoadError);
  const committeeNotFound = useCommitteeStore((state) => state.committeeNotFound);
  const mutationError = useCommitteeStore((state) => state.error);
  const loadCommittee = useCommitteeStore((state) => state.loadCommittee);
  const deleteCommittee = useCommitteeStore((state) => state.deleteCommittee);
  const setError = useCommitteeStore((state) => state.setError);

  const [analyticsSummary, setAnalyticsSummary] = useState<CommitteeAnalyticsSummaryData | null>(null);
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>([]);
  const [neglectedTopics, setNeglectedTopics] = useState<NeglectedTopicItem[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);

  const loadAnalytics = useCallback(() => {
    if (!id) return;
    setAnalyticsLoading(true);
    setAnalyticsError(false);
    try {
      const topicEvidences = analyticsRepo.getCommitteeTopicAnalytics(id);
      const summary = analyticsRepo.getCommitteeAnalytics(id, Date.now(), topicEvidences);
      setAnalyticsSummary(summary);
      setWeakTopics(getWeakTopics(topicEvidences, 5));
      setNeglectedTopics(getNeglectedTopics(topicEvidences, 5));
    } catch {
      setAnalyticsError(true);
      setAnalyticsSummary(null);
      setWeakTopics([]);
      setNeglectedTopics([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    setError(null);
    if (id) loadCommittee(id);
    if (id) loadAnalytics();
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [id, loadCommittee, setError, loadAnalytics]));

  const retry = () => {
    if (id) {
      loadCommittee(id);
      loadAnalytics();
    }
  };
  const requestMatches = committeeRequestId === id;

  if (!id || (requestMatches && committeeNotFound)) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <Feather name="search" size={30} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          {t.sweep.committeeMissing}</AppText>
        <AppText color={colors.textMuted} style={styles.centeredText}>
          {t.sweep.removed}</AppText>
        <Button label={t.sweep.backCommittees} onPress={() => router.replace('/(tabs)/committees')} />
      </ScreenWrapper>
    );
  }

  if (requestMatches && committeeLoadError) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <Feather name="alert-circle" size={30} color={colors.warning} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          {t.sweep.committeeRetryTitle}</AppText>
        <AppText color={colors.textMuted} style={styles.centeredText}>
          {t.sweep.committeeLoadFailed}</AppText>
        <View style={[styles.stateActions, { gap: spacing.sm }]}>
          <Button label={t.sweep.retryCommittee} onPress={retry} />
          <Button
            label={t.common.back}
            variant="secondary"
            onPress={() => router.replace('/(tabs)/committees')}
          />
        </View>
      </ScreenWrapper>
    );
  }

  if (!requestMatches || isLoadingCommittee || !committee) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          {t.sweep.loadingCommittee}</AppText>
      </ScreenWrapper>
    );
  }

  const daysToExam = getCommitteeDaysToExam(committee.examDate);
  const currentStatus = getCommitteeDateStatus(committee.startDate, committee.examDate);
  const badge = STATUS_BADGE[currentStatus];
  const committeeId = committee.id;
  const committeeName = committee.name;

  function handleDelete() {
    Alert.alert(
      t.subjects.committeeDeleteTitle,
      t.subjects.committeeDeleteWarning(committeeName),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.subjects.committeeDeleteAction,
          style: 'destructive',
          onPress: () => {
            if (deleteCommittee(committeeId)) router.dismissTo('/(tabs)/committees');
          },
        },
      ]
    );
  }

  return (
    <ScreenWrapper includeBottomSafeArea>
      <View style={[styles.topBar, { marginBottom: spacing.md }]}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Breadcrumb
            items={[
              {
                label: t.committees.title,
                onPress: back,
              },
              {
                label: committee.name,
                isCurrent: true,
              },
            ]}
          />
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            onPress={back}
            style={styles.iconButton}
          >
            <Feather name="arrow-left" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.sweep.editNamed(committee.name)}
            onPress={() => router.push(`/committees/edit/${encodeURIComponent(committee.id)}` as Href)}
            style={[
              styles.editButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
            <AppText variant="label" color={colors.primary} style={{ marginLeft: 6 }}>
              {t.sweep.edit}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>

      {mutationError ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorNotice,
            {
              borderColor: colors.error,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText color={colors.error} style={{ flex: 1, marginLeft: spacing.sm }}>
            {t.sweep.committeeRemoveFailed}</AppText>
        </View>
      ) : null}

      <Card
        elevated
        style={[styles.heroCard, { borderLeftColor: committee.color, marginBottom: spacing.lg }]}
      >
        <View style={styles.heroTop}>
          <AppText
            variant={isTablet ? 'h1' : 'h2'}
            style={{ flex: 1, marginRight: spacing.sm }}
          >
            {committee.name}
          </AppText>
          <Badge label={t.sweep.statuses[currentStatus]} variant={badge.variant} dot />
        </View>

        {committee.description ? (
          <AppText color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
            {committee.description}
          </AppText>
        ) : null}

        <View style={{ marginTop: spacing.md }}>
          <View style={styles.dateRow}>
            <Feather name="play" size={14} color={colors.textMuted} />
            <AppText color={colors.textSecondary} style={{ marginLeft: spacing.xs, flex: 1 }}>
              {t.sweep.starts}{' '}{formatCommitteeDate(committee.startDate, t.dashboard.locale)}
            </AppText>
          </View>
          <View style={[styles.dateRow, { marginTop: spacing.xs }]}>
            <Feather name="flag" size={14} color={colors.textMuted} />
            <AppText color={colors.textSecondary} style={{ marginLeft: spacing.xs, flex: 1 }}>
              {t.sweep.exam}{' '}{formatCommitteeDate(committee.examDate, t.dashboard.locale)}
            </AppText>
          </View>
        </View>

        <View
          style={[
            styles.countdown,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: radius.md,
              marginTop: spacing.md,
              padding: spacing.md,
            },
          ]}
        >
          <AppText
            variant={isTablet ? 'h2' : 'h3'}
            color={
              currentStatus === 'completed'
                ? colors.textMuted
                : daysToExam > 14
                  ? colors.success
                  : daysToExam > 7
                    ? colors.warning
                    : colors.error
            }
            style={{ textAlign: 'center' }}
          >
            {t.sweep.countdown(daysToExam)}
          </AppText>
        </View>
      </Card>

      <SubjectList key={committee.id} committeeId={committee.id} />
      <CommitteeAnalyticsSummary
        summary={analyticsSummary}
        loading={analyticsLoading}
        error={analyticsError}
        onRetry={loadAnalytics}
      />
      <WeakTopicsList topics={weakTopics} />
      <NeglectedTopicsList topics={neglectedTopics} />
      <CommitteeLearningEvidence key={`evidence-${committee.id}`} committeeId={committee.id} />
      <Card style={{ marginTop: spacing.md, gap: spacing.sm }}>
        <AppText variant="subhead">{t.studyPlan.studyPlanButton}</AppText>
        <Button
          label={t.examPlan.title}
          variant="secondary"
          onPress={() => router.push(`/committees/exam-plan/${encodeURIComponent(committee.id)}` as Href)}
        />
        <Button
          label={t.studyPlan.studyPlanButton}
          variant="secondary"
          onPress={() => router.push(`/committees/${encodeURIComponent(committee.id)}/study-plan` as Href)}
        />
      </Card>

      <Card style={{ marginTop: spacing.md, marginBottom: spacing.xl, borderColor: colors.errorMuted, borderWidth: 1 }}>
        <AppText variant="label" color={colors.error} style={{ marginBottom: spacing.xs }}>
          {t.subjects.committeeDeleteTitle}
        </AppText>
        <Button
          label={t.sweep.removeCommittee}
          accessibilityLabel={t.sweep.removeNamed(committee.name)}
          variant="danger"
          onPress={handleDelete}
        />
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  stateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  errorNotice: {
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
  },
  heroCard: {
    borderLeftWidth: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdown: {
    alignItems: 'center',
  },
});
