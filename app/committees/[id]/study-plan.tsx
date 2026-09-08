import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import type { Committee } from '@/store/useCommitteeStore';
import type { TopicAnalyticsEvidence } from '@/models/analytics';
import type {
  AIStudyPlanAction,
  AIStudyPlanDraft,
  AIStudyPlanItem,
} from '@/models/ai';
import { AIServiceError } from '@/models/ai';
import { getStudyAIService } from '@/services/ai/studyAIClient';
import { buildPlanningContext } from '@/services/ai/planningContext';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { subjectRouteId } from '@/utils/subjectRoutes';

const ALLOWED_ACTIONS: AIStudyPlanAction[] = ['review', 'memory', 'qbank', 'focus'];

export default function CommitteeStudyPlanScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const committeeId = subjectRouteId(params.id);
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const [committee, setCommittee] = useState<Committee | null>(null);
  const [topicEvidences, setTopicEvidences] = useState<TopicAnalyticsEvidence[]>([]);
  const [subjectMap, setSubjectMap] = useState<Map<string, string>>(new Map());
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Local React draft state — zero DB persistence, zero automated side effects
  const [planDraft, setPlanDraft] = useState<AIStudyPlanDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const back = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/committees');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => listener.remove();
    }, [back])
  );

  const loadInitialData = useCallback(() => {
    if (!committeeId) {
      setNotFound(true);
      setIsLoadingInitial(false);
      return;
    }

    setIsLoadingInitial(true);
    setNotFound(false);

    try {
      const com = committeeRepo.getById(committeeId);
      if (!com) {
        setNotFound(true);
        setCommittee(null);
        setTopicEvidences([]);
        setIsLoadingInitial(false);
        return;
      }

      setCommittee(com);

      const subjects = subjectRepo.listByCommittee(committeeId, { limit: 500 });
      const sMap = new Map<string, string>();
      for (const s of subjects) {
        sMap.set(s.id, s.name);
      }
      setSubjectMap(sMap);

      const evidences = analyticsRepo.getCommitteeTopicAnalytics(committeeId);
      setTopicEvidences(evidences);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [committeeId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Evidence snapshot metrics
  const snapshot = useMemo(() => {
    const weakCount = topicEvidences.filter((ev) => ev.masteryStatus === 'needs_attention').length;
    const neglectedCount = topicEvidences.filter(
      (ev) => ev.neglectStatus === 'never_studied' || ev.neglectStatus === 'stale'
    ).length;
    const dueCount = topicEvidences.reduce((sum, ev) => sum + ev.dueCardCount, 0);

    let totalQuestions = 0;
    let totalCorrect = 0;
    for (const ev of topicEvidences) {
      totalQuestions += ev.questionCount;
      totalCorrect += ev.correctCount;
    }
    const qbankAccuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : null;

    return {
      totalTopics: topicEvidences.length,
      weakCount,
      neglectedCount,
      dueCount,
      totalQuestions,
      qbankAccuracy,
    };
  }, [topicEvidences]);

  // Generate study plan
  const handleGeneratePlan = async () => {
    if (!committee) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const context = buildPlanningContext(
        { id: committee.id, name: committee.name, examDate: committee.examDate },
        topicEvidences,
        subjectMap
      );

      if (context.topics.length === 0) {
        setGenerationError(t.studyPlan.noTopics);
        setIsGenerating(false);
        return;
      }

      const service = getStudyAIService();
      const draft = await service.generateStudyPlan(context);
      setPlanDraft(draft);
    } catch (err: unknown) {
      if (err instanceof AIServiceError) {
        if (err.code === 'provider_unavailable') {
          setGenerationError(t.studyPlan.planFailed);
        } else if (err.code === 'invalid_response') {
          setGenerationError(t.studyPlan.invalidPlan);
        } else {
          setGenerationError(t.studyPlan.planFailed);
        }
      } else {
        setGenerationError(t.studyPlan.planFailed);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Local editing handlers (strictly local state)
  const handleActionChange = (itemId: string, newAction: AIStudyPlanAction) => {
    if (!planDraft) return;
    setPlanDraft({
      ...planDraft,
      items: planDraft.items.map((it) => (it.id === itemId ? { ...it, action: newAction } : it)),
    });
  };

  const handleDurationChange = (itemId: string, delta: number) => {
    if (!planDraft) return;
    setPlanDraft({
      ...planDraft,
      items: planDraft.items.map((it) => {
        if (it.id !== itemId) return it;
        const updated = Math.min(90, Math.max(10, it.estimatedMinutes + delta));
        return { ...it, estimatedMinutes: updated };
      }),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!planDraft) return;
    setPlanDraft({
      ...planDraft,
      items: planDraft.items.filter((it) => it.id !== itemId),
    });
  };

  const handleClearPlan = () => {
    setPlanDraft(null);
    setGenerationError(null);
  };

  if (isLoadingInitial) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          {t.common.loading}
        </AppText>
      </ScreenWrapper>
    );
  }

  if (notFound || !committee) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <Feather name="alert-circle" size={32} color={colors.warning} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          {t.studyPlan.committeeNotFound}
        </AppText>
        <Button
          label={t.common.back}
          variant="secondary"
          onPress={back}
          style={{ marginTop: spacing.md }}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper includeBottomSafeArea>
      <View style={{ maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: committee.name, onPress: back },
            { label: t.studyPlan.title, isCurrent: true },
          ]}
          style={{ marginBottom: spacing.xs }}
        />

        {/* Top Header */}
        <View style={{ marginBottom: spacing.md }}>
          <AppText variant="h2">{t.studyPlan.title}</AppText>
          <AppText color={colors.textSecondary} variant="bodySmall" style={{ marginTop: spacing.xxs }}>
            {t.studyPlan.subtitle(committee.name)}
          </AppText>
        </View>

        {/* Advisory Banner */}
        <Card
          elevated={false}
          style={[
            styles.advisoryBanner,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
            },
          ]}
        >
          <View style={styles.bannerRow}>
            <Feather name="info" size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: spacing.sm, gap: 2 }}>
              <AppText color={colors.textPrimary} variant="label">
                {t.studyPlan.suggestedPlanNote}
              </AppText>
              <AppText color={colors.textSecondary} variant="bodySmall">
                {t.studyPlan.advisoryNote}
              </AppText>
            </View>
          </View>
        </Card>

      {/* Evidence Snapshot */}
      <Card
        elevated
        style={[
          styles.evidenceCard,
          {
            borderColor: colors.border,
            marginBottom: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
          },
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <AppText variant="h3">{t.studyPlan.evidenceSnapshot}</AppText>
          <Badge
            label={`${snapshot.totalTopics} ${t.topics.title.toLowerCase()}`}
            variant="default"
          />
        </View>
        <AppText
          color={colors.textMuted}
          variant="caption"
          style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}
        >
          {t.studyPlan.evidenceSnapshotNote}
        </AppText>

        <View style={styles.metricsGrid}>
          <View
            style={[
              styles.metricBox,
              { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={16}
              color={snapshot.weakCount > 0 ? colors.error : colors.textMuted}
            />
            <AppText
              variant="bodySmall"
              color={snapshot.weakCount > 0 ? colors.error : colors.textPrimary}
              style={{ marginTop: 4 }}
            >
              {t.studyPlan.weakTopicsCount(snapshot.weakCount)}
            </AppText>
          </View>

          <View
            style={[
              styles.metricBox,
              { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm },
            ]}
          >
            <Feather
              name="clock"
              size={16}
              color={snapshot.neglectedCount > 0 ? colors.warning : colors.textMuted}
            />
            <AppText
              variant="bodySmall"
              color={snapshot.neglectedCount > 0 ? colors.warning : colors.textPrimary}
              style={{ marginTop: 4 }}
            >
              {t.studyPlan.neglectedTopicsCount(snapshot.neglectedCount)}
            </AppText>
          </View>

          <View
            style={[
              styles.metricBox,
              { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm },
            ]}
          >
            <Feather
              name="layers"
              size={16}
              color={snapshot.dueCount > 0 ? colors.primary : colors.textMuted}
            />
            <AppText
              variant="bodySmall"
              color={snapshot.dueCount > 0 ? colors.primary : colors.textPrimary}
              style={{ marginTop: 4 }}
            >
              {t.studyPlan.dueCardsCount(snapshot.dueCount)}
            </AppText>
          </View>

          <View
            style={[
              styles.metricBox,
              { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm },
            ]}
          >
            <Feather name="help-circle" size={16} color={colors.textSecondary} />
            <AppText variant="bodySmall" color={colors.textPrimary} style={{ marginTop: 4 }}>
              {snapshot.qbankAccuracy !== null
                ? t.studyPlan.qbankAccuracyLabel(snapshot.qbankAccuracy)
                : t.studyPlan.qbankNoData}
            </AppText>
          </View>
        </View>

        {snapshot.weakCount === 0 && snapshot.neglectedCount === 0 && snapshot.dueCount === 0 ? (
          <AppText
            color={colors.textMuted}
            variant="caption"
            style={{ marginTop: spacing.sm, fontStyle: 'italic' }}
          >
            {t.studyPlan.insufficientEvidence}
          </AppText>
        ) : null}
      </Card>

      {/* Generation Error notice */}
      {generationError ? (
        <View
          accessibilityRole="alert"
          style={[
            styles.errorNotice,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.error,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.md,
            },
          ]}
        >
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText color={colors.error} style={{ flex: 1, marginLeft: spacing.sm }}>
            {generationError}
          </AppText>
        </View>
      ) : null}

      {/* Generation CTA (when no plan or regenerating) */}
      {!planDraft && (
        <View style={{ marginBottom: spacing.lg }}>
          <Button
            label={isGenerating ? t.studyPlan.generatingPlan : t.studyPlan.generatePlan}
            onPress={handleGeneratePlan}
            disabled={isGenerating || snapshot.totalTopics === 0}
            accessibilityLabel={t.studyPlan.generatePlan}
          />
        </View>
      )}

      {/* Plan Draft Display */}
      {planDraft && (
        <View style={{ marginBottom: spacing.xl }}>
          {/* Summary & Controls Header */}
          <Card
            elevated
            style={[
              styles.planSummaryCard,
              {
                borderColor: colors.border,
                marginBottom: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <AppText variant="h3">{t.studyPlan.planSummary}</AppText>
                <Badge label={t.studyPlan.planDraftNotice} variant="info" />
              </View>
              <Badge label={t.studyPlan.itemCount(planDraft.items.length)} variant="default" />
            </View>

            <AppText
              variant="body"
              color={colors.textPrimary}
              style={{ marginTop: spacing.sm, marginBottom: spacing.md }}
            >
              {planDraft.summary}
            </AppText>

            {/* Plan Action Buttons: Regenerate & Clear */}
            <View style={styles.planButtonGroup}>
              <Button
                label={isGenerating ? t.studyPlan.generatingPlan : t.studyPlan.regeneratePlan}
                variant="secondary"
                onPress={handleGeneratePlan}
                disabled={isGenerating}
                accessibilityLabel={t.studyPlan.regeneratePlan}
                style={{ flex: 1 }}
              />
              <Button
                label={t.studyPlan.clearPlan}
                variant="danger"
                onPress={handleClearPlan}
                accessibilityLabel={t.studyPlan.clearPlan}
                style={{ flex: 1 }}
              />
            </View>
          </Card>

          {/* Plan Items List */}
          {planDraft.items.map((item: AIStudyPlanItem, index: number) => (
            <Card
              key={item.id}
              elevated
              style={[
                styles.itemCard,
                {
                  borderColor: colors.border,
                  marginBottom: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.md,
                },
              ]}
            >
              {/* Item Header */}
              <View style={styles.itemHeader}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <AppText variant="label" color={colors.textMuted}>
                    #{index + 1}
                  </AppText>
                  <AppText variant="body" style={{ fontWeight: '600' }} color={colors.textPrimary}>
                    {item.topicName}
                  </AppText>
                </View>

                {/* Remove item button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t.studyPlan.removeItemNumbered(index + 1)}
                  onPress={() => handleRemoveItem(item.id)}
                  style={styles.removeIconButton}
                >
                  <Feather name="trash-2" size={16} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Factual Reason */}
              <View
                style={[
                  styles.reasonBox,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderRadius: radius.sm,
                    marginTop: spacing.sm,
                    padding: spacing.sm,
                  },
                ]}
              >
                <AppText variant="caption" color={colors.textSecondary}>
                  {item.reason}
                </AppText>
              </View>

              {/* Editable Controls: Action Selector & Duration Stepper */}
              <View style={[styles.itemControls, { marginTop: spacing.md }]}>
                {/* Action Selector */}
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: 4 }}>
                    {t.studyPlan.action}
                  </AppText>
                  <View style={styles.actionPillRow}>
                    {ALLOWED_ACTIONS.map((act) => {
                      const isSelected = item.action === act;
                      const label = t.studyPlan.actions[act];
                      return (
                        <TouchableOpacity
                          key={act}
                          accessibilityRole="button"
                          accessibilityLabel={`${t.studyPlan.action}: ${label}`}
                          onPress={() => handleActionChange(item.id, act)}
                          style={[
                            styles.actionPill,
                            {
                              backgroundColor: isSelected ? colors.primary : colors.surfaceElevated,
                              borderColor: isSelected ? colors.primary : colors.border,
                              borderRadius: radius.full,
                            },
                          ]}
                        >
                          <AppText
                            variant="caption"
                            color={isSelected ? colors.textInverse : colors.textSecondary}
                            style={{ fontWeight: isSelected ? '600' : '400' }}
                          >
                            {label}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Duration Stepper */}
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: 4 }}>
                    {t.studyPlan.estimatedMinutes}
                  </AppText>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t.studyPlan.decreaseDuration}
                      onPress={() => handleDurationChange(item.id, -5)}
                      disabled={item.estimatedMinutes <= 10}
                      style={[
                        styles.stepperBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceElevated,
                          borderRadius: radius.sm,
                          opacity: item.estimatedMinutes <= 10 ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Feather name="minus" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <AppText
                      variant="bodySmall"
                      color={colors.textPrimary}
                      style={[styles.durationText, { fontWeight: '600' }]}
                    >
                      {t.studyPlan.minutesShort(item.estimatedMinutes)}
                    </AppText>

                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t.studyPlan.increaseDuration}
                      onPress={() => handleDurationChange(item.id, 5)}
                      disabled={item.estimatedMinutes >= 90}
                      style={[
                        styles.stepperBtn,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surfaceElevated,
                          borderRadius: radius.sm,
                          opacity: item.estimatedMinutes >= 90 ? 0.4 : 1,
                        },
                      ]}
                    >
                      <Feather name="plus" size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryBanner: {
    borderWidth: 1,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  evidenceCard: {
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  metricBox: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 10,
    alignItems: 'center',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  planSummaryCard: {
    borderWidth: 1,
  },
  planButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  itemCard: {
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  removeIconButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonBox: {},
  itemControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  actionPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  stepperBtn: {
    minWidth: 30,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  durationText: {
    minWidth: 46,
    textAlign: 'center',
  },
});
