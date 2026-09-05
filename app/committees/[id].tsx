import { SubjectList } from '@/components/curriculum/SubjectList';
import { useTranslation } from '@/i18n';
import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore, type CommitteeStatus } from '@/store/useCommitteeStore';
import { formatAgendaDate, formatLocalDateKey } from '@/utils/calendarDate';
import {
  getCommitteeCountdownLabel,
  getCommitteeDateStatus,
  getCommitteeDaysToExam,
} from '@/utils/committeeDate';

const STATUS_BADGE: Record<
  CommitteeStatus,
  { variant: 'info' | 'success' | 'default'; label: string }
> = {
  upcoming: { variant: 'info', label: 'Upcoming' },
  active: { variant: 'success', label: 'Active' },
  completed: { variant: 'default', label: 'Completed' },
};

function formatCommitteeDate(timestamp: number): string {
  return formatAgendaDate(formatLocalDateKey(timestamp));
}

export default function CommitteeDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  function back() {
    if (router.canGoBack()) router.back(); else router.replace('/(tabs)/committees');
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

  useEffect(() => {
    setError(null);
    if (id) loadCommittee(id);
  }, [id, loadCommittee, setError]);

  const retry = () => {
    if (id) loadCommittee(id);
  };
  const requestMatches = committeeRequestId === id;

  if (!id || (requestMatches && committeeNotFound)) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centeredState}>
        <Feather name="search" size={30} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          Committee not found
        </AppText>
        <AppText color={colors.textMuted} style={styles.centeredText}>
          It may have been removed from this device.
        </AppText>
        <Button label="Back to Committees" onPress={() => router.replace('/(tabs)/committees')} />
      </ScreenWrapper>
    );
  }

  if (requestMatches && committeeLoadError) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centeredState}>
        <Feather name="alert-circle" size={30} color={colors.warning} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          Committee needs another try
        </AppText>
        <AppText color={colors.textMuted} style={styles.centeredText}>
          The committee could not be loaded from local storage.
        </AppText>
        <View style={[styles.stateActions, { gap: spacing.sm }]}>
          <Button label="Retry committee" onPress={retry} />
          <Button
            label="Back"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/committees')}
          />
        </View>
      </ScreenWrapper>
    );
  }

  if (!requestMatches || isLoadingCommittee || !committee) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Loading committee…
        </AppText>
      </ScreenWrapper>
    );
  }

  const daysToExam = getCommitteeDaysToExam(committee.examDate);
  const currentStatus = getCommitteeDateStatus(committee.startDate, committee.examDate);
  const countdownLabel = getCommitteeCountdownLabel(
    committee.startDate,
    committee.examDate
  );
  const badge = STATUS_BADGE[currentStatus];
  const committeeId = committee.id;
  const committeeName = committee.name;

  function handleDelete() {
    Alert.alert(
      'Remove Committee?',
      t.subjects.committeeDeleteWarning(committeeName),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
      <View style={[styles.topBar, { marginBottom: spacing.lg }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={back}
          style={styles.iconButton}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Edit ${committee.name}`}
          onPress={() => router.push(`/committees/edit/${committee.id}` as Href)}
          style={[
            styles.editButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
          <AppText variant="label" color={colors.primary} style={{ marginLeft: 6 }}>
            Edit
          </AppText>
        </TouchableOpacity>
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
            The committee was not removed. Please try again.
          </AppText>
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
          <Badge label={badge.label} variant={badge.variant} dot />
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
              Starts {formatCommitteeDate(committee.startDate)}
            </AppText>
          </View>
          <View style={[styles.dateRow, { marginTop: spacing.xs }]}>
            <Feather name="flag" size={14} color={colors.textMuted} />
            <AppText color={colors.textSecondary} style={{ marginLeft: spacing.xs, flex: 1 }}>
              Exam {formatCommitteeDate(committee.examDate)}
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
            {countdownLabel}
          </AppText>
        </View>
      </Card>

      <SubjectList key={committee.id} committeeId={committee.id} />

      <Button
        label="Remove Committee"
        accessibilityLabel={`Remove ${committee.name}`}
        variant="danger"
        onPress={handleDelete}
        style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
      />
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
