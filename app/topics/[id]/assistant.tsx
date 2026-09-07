import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, TouchableOpacity, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { topicRepo } from '@/db/repositories/topicRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
import type { Topic } from '@/models/curriculum';
import type { StudySource } from '@/models/studySource';
import { type AIFlashcardDraft, AIServiceError } from '@/models/ai';
import { getStudyAIService } from '@/services/ai/studyAIClient';
import { toAISourceContext } from '@/services/ai/sourceContext';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { topicRouteId } from '@/utils/topicRoutes';

type ActionMode = 'explain' | 'summarize' | 'flashcards';

type ResultState =
  | { status: 'idle' }
  | { status: 'loading'; kind: ActionMode }
  | {
      status: 'success';
      kind: 'explain' | 'summarize';
      text: string;
      sourceId: string;
      sourceTitle: string;
    }
  | { status: 'error'; errorMessage: string };

function mapErrorToMessage(err: unknown, t: ReturnType<typeof useTranslation>): string {
  if (err instanceof AIServiceError) {
    switch (err.code) {
      case 'provider_unavailable':
        return t.studyAi.providerUnavailable;
      case 'invalid_response':
        return t.studyAi.invalidResponse;
      case 'source_not_supported':
        return t.studyAi.sourceNotSupported;
      case 'grounding_failed':
        return t.studyAi.groundingFailed;
      case 'generation_limit_exceeded':
        return t.studyAi.generationFailed;
      default:
        return t.studyAi.genericError;
    }
  }
  return t.studyAi.genericError;
}

export default function StudyAssistantScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const topicId = topicRouteId(Array.isArray(params.id) ? params.id[0] : params.id);
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [sources, setSources] = useState<StudySource[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ActionMode>('explain');
  const [conceptQuery, setConceptQuery] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultState, setResultState] = useState<ResultState>({ status: 'idle' });
  const [drafts, setDrafts] = useState<AIFlashcardDraft[]>([]);

  const loadData = useCallback(() => {
    setLoadingInitial(true);
    setLoadError(false);
    if (!topicId) {
      setTopic(null);
      setSources([]);
      setLoadingInitial(false);
      return;
    }

    try {
      const topicItem = topicRepo.getById(topicId);
      if (!topicItem) {
        setTopic(null);
        setSources([]);
      } else {
        setTopic(topicItem);
        const sourceItems = studySourceRepo.getByTopic(topicId);
        setSources(sourceItems);
        // Auto-select if exactly one source exists
        if (sourceItems.length === 1) {
          setSelectedSourceId(sourceItems[0].id);
        }
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoadingInitial(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (topicId) {
      router.replace(`/topics/${encodeURIComponent(topicId)}` as Href);
    } else {
      router.replace('/(tabs)/committees' as Href);
    }
  }, [topicId]);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => listener.remove();
    }, [handleBack])
  );

  const handleSelectSource = (id: string) => {
    if (id !== selectedSourceId) {
      setSelectedSourceId(id);
      // Changing source clears previous result and drafts to avoid provenance confusion
      setResultState({ status: 'idle' });
      setDrafts([]);
      setQueryError(null);
    }
  };

  const handleModeChange = (mode: ActionMode) => {
    if (mode !== activeMode) {
      setActiveMode(mode);
      setResultState({ status: 'idle' });
      setQueryError(null);
    }
  };

  const selectedSource = sources.find((s) => s.id === selectedSourceId);
  const isSourceStale = selectedSourceId !== null && !selectedSource;

  const handleExplain = async () => {
    if (!selectedSourceId) return;

    const trimmedQuery = conceptQuery.trim();
    if (!trimmedQuery) {
      setQueryError(t.studyAi.conceptRequired);
      return;
    }

    setQueryError(null);
    setResultState({ status: 'loading', kind: 'explain' });

    try {
      // Truthful check: ensure source and topic still exist in DB
      const freshSource = studySourceRepo.getById(selectedSourceId);
      if (!freshSource) {
        setResultState({ status: 'error', errorMessage: t.studyAi.sourceMissing });
        return;
      }
      const freshTopic = topicRepo.getById(topicId);
      if (!freshTopic) {
        setResultState({ status: 'error', errorMessage: t.topics.missing });
        return;
      }

      const service = getStudyAIService();
      const context = toAISourceContext(freshSource, freshTopic);
      const result = await service.explainConcept(trimmedQuery, context);

      setResultState({
        status: 'success',
        kind: 'explain',
        text: result.text,
        sourceId: result.sourceId,
        sourceTitle: result.sourceTitle,
      });
    } catch (err: unknown) {
      setResultState({
        status: 'error',
        errorMessage: mapErrorToMessage(err, t),
      });
    }
  };

  const handleSummarize = async () => {
    if (!selectedSourceId) return;

    setResultState({ status: 'loading', kind: 'summarize' });

    try {
      // Truthful check: ensure source and topic still exist in DB
      const freshSource = studySourceRepo.getById(selectedSourceId);
      if (!freshSource) {
        setResultState({ status: 'error', errorMessage: t.studyAi.sourceMissing });
        return;
      }
      const freshTopic = topicRepo.getById(topicId);
      if (!freshTopic) {
        setResultState({ status: 'error', errorMessage: t.topics.missing });
        return;
      }

      const service = getStudyAIService();
      const context = toAISourceContext(freshSource, freshTopic);
      const result = await service.summarizeSource(context);

      setResultState({
        status: 'success',
        kind: 'summarize',
        text: result.text,
        sourceId: result.sourceId,
        sourceTitle: result.sourceTitle,
      });
    } catch (err: unknown) {
      setResultState({
        status: 'error',
        errorMessage: mapErrorToMessage(err, t),
      });
    }
  };

  const handleGenerateDrafts = async () => {
    if (!selectedSourceId) return;

    setResultState({ status: 'loading', kind: 'flashcards' });

    try {
      // Truthful check: ensure source and topic still exist in DB
      const freshSource = studySourceRepo.getById(selectedSourceId);
      if (!freshSource) {
        setResultState({ status: 'error', errorMessage: t.studyAi.sourceMissing });
        return;
      }
      const freshTopic = topicRepo.getById(topicId);
      if (!freshTopic) {
        setResultState({ status: 'error', errorMessage: t.topics.missing });
        return;
      }

      const service = getStudyAIService();
      const context = toAISourceContext(freshSource, freshTopic);
      const generated = await service.generateFlashcardDrafts(context);

      setDrafts(generated);
      setResultState({ status: 'idle' });
    } catch (err: unknown) {
      setResultState({
        status: 'error',
        errorMessage: mapErrorToMessage(err, t),
      });
    }
  };

  const handleEditDraft = (draftId: string, field: 'front' | 'back', value: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, [field]: value, edited: true } : d))
    );
  };

  const handleRemoveDraft = (draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  };

  const handleClearDrafts = () => {
    setDrafts([]);
    setResultState({ status: 'idle' });
  };

  const handleRetry = () => {
    if (activeMode === 'explain') {
      void handleExplain();
    } else if (activeMode === 'summarize') {
      void handleSummarize();
    } else {
      void handleGenerateDrafts();
    }
  };

  return (
    <ScreenWrapper includeBottomSafeArea>
      <Section>
        <Button label={t.common.back} variant="ghost" onPress={handleBack} />

        {loadingInitial && <FeedbackState kind="loading" message={t.common.loading} />}

        {!loadingInitial && loadError && (
          <FeedbackState
            kind="error"
            message={t.studySources.loadError}
            action={{ label: t.common.retry, onPress: loadData }}
          />
        )}

        {!loadingInitial && !loadError && !topic && (
          <FeedbackState kind="empty" message={t.topics.missing} />
        )}

        {!loadingInitial && !loadError && topic && sources.length === 0 && (
          <FeedbackState
            kind="empty"
            message={t.studyAi.noSources}
            action={{
              label: t.studyAi.addSource,
              onPress: () =>
                router.push(`/topics/${encodeURIComponent(topicId)}/sources/new` as Href),
            }}
          />
        )}

        {!loadingInitial && !loadError && topic && sources.length > 0 && (
          <>
            <View style={{ gap: spacing.xs }}>
              <AppText variant="h2">{t.studyAi.assistant}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {topic.name}
              </AppText>
            </View>

            {/* Source Selection */}
            <Section title={t.studyAi.selectSource}>
              {isSourceStale && (
                <FeedbackState kind="error" message={t.studyAi.sourceMissing} />
              )}
              <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
                {sources.map((source) => {
                  const isSelected = source.id === selectedSourceId;
                  return (
                    <TouchableOpacity
                      key={source.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${source.title}, ${t.studySources[source.sourceType]}${
                        isSelected ? `, ${t.studyAi.selectedSource}` : ''
                      }`}
                      onPress={() => handleSelectSource(source.id)}
                      style={{
                        borderWidth: 2,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        backgroundColor: isSelected ? colors.surfaceElevated : colors.surface,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <AppText
                          variant="label"
                          color={isSelected ? colors.primary : colors.textPrimary}
                          numberOfLines={2}
                        >
                          {source.title}
                        </AppText>
                      </View>
                      <Badge label={t.studySources[source.sourceType]} variant="default" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            {/* Action Tabs */}
            {selectedSource && (
              <Section>
                <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                  <Button
                    label={t.studyAi.explainTab}
                    variant={activeMode === 'explain' ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => handleModeChange('explain')}
                    style={{ flex: 1, minWidth: 95 }}
                  />
                  <Button
                    label={t.studyAi.summarizeTab}
                    variant={activeMode === 'summarize' ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => handleModeChange('summarize')}
                    style={{ flex: 1, minWidth: 95 }}
                  />
                  <Button
                    label={t.studyAi.flashcardsTab}
                    variant={activeMode === 'flashcards' ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => handleModeChange('flashcards')}
                    style={{ flex: 1, minWidth: 95 }}
                  />
                </View>

                {activeMode === 'explain' && (
                  <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                    <View style={{ gap: spacing.xs }}>
                      <AppText variant="label">{t.studyAi.conceptLabel}</AppText>
                      <Input
                        value={conceptQuery}
                        onChangeText={(val) => {
                          setConceptQuery(val);
                          if (queryError) setQueryError(null);
                        }}
                        placeholder={t.studyAi.conceptPlaceholder}
                        placeholderTextColor={colors.textSecondary}
                        invalid={Boolean(queryError)}
                        accessibilityLabel={t.studyAi.conceptLabel}
                        returnKeyType="search"
                        onSubmitEditing={handleExplain}
                      />
                      {queryError ? (
                        <AppText variant="caption" color={colors.error}>
                          {queryError}
                        </AppText>
                      ) : null}
                    </View>

                    <Button
                      label={t.studyAi.explainAction}
                      onPress={handleExplain}
                      loading={resultState.status === 'loading' && resultState.kind === 'explain'}
                      disabled={resultState.status === 'loading'}
                    />
                  </View>
                )}

                {activeMode === 'summarize' && (
                  <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                    <Button
                      label={t.studyAi.summarizeAction}
                      onPress={handleSummarize}
                      loading={resultState.status === 'loading' && resultState.kind === 'summarize'}
                      disabled={resultState.status === 'loading'}
                    />
                  </View>
                )}

                {activeMode === 'flashcards' && (
                  <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
                    {drafts.length === 0 ? (
                      <Button
                        label={t.studyAi.generateFlashcards}
                        onPress={handleGenerateDrafts}
                        loading={
                          resultState.status === 'loading' && resultState.kind === 'flashcards'
                        }
                        disabled={resultState.status === 'loading'}
                      />
                    ) : (
                      <Card elevated style={{ gap: spacing.md }}>
                        {/* Header with Title, Count, Clear, Regenerate */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: spacing.xs,
                          }}
                        >
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
                          >
                            <AppText variant="h3">{t.studyAi.flashcardDrafts}</AppText>
                            <Badge label={t.studyAi.draftCount(drafts.length)} variant="default" />
                          </View>
                          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                            <Button
                              label={t.studyAi.regenerate}
                              variant="ghost"
                              size="sm"
                              onPress={handleGenerateDrafts}
                              loading={
                                resultState.status === 'loading' &&
                                resultState.kind === 'flashcards'
                              }
                              disabled={resultState.status === 'loading'}
                            />
                            <Button
                              label={t.studyAi.clearDrafts}
                              variant="ghost"
                              size="sm"
                              onPress={handleClearDrafts}
                              disabled={resultState.status === 'loading'}
                            />
                          </View>
                        </View>

                        {/* Provenance Box */}
                        <View
                          style={{
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth: 1,
                            borderRadius: radius.sm,
                            padding: spacing.sm,
                            gap: 4,
                          }}
                        >
                          <AppText variant="label" color={colors.primary}>
                            {t.studyAi.basedOnSource(selectedSource.title)}
                          </AppText>
                          <AppText variant="caption" color={colors.textSecondary}>
                            {t.studyAi.sourceOnlyNote}
                          </AppText>
                          <AppText variant="caption" color={colors.warning}>
                            {t.studyAi.draftReviewNotice}
                          </AppText>
                        </View>

                        {/* Draft Cards */}
                        <View style={{ gap: spacing.md }}>
                          {drafts.map((draft, index) => (
                            <View
                              key={draft.id}
                              style={{
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: radius.md,
                                padding: spacing.md,
                                backgroundColor: colors.surface,
                                gap: spacing.sm,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: spacing.xs,
                                  }}
                                >
                                  <AppText variant="label">#{index + 1}</AppText>
                                  {draft.edited ? (
                                    <Badge label={t.studyAi.editedBadge} variant="default" />
                                  ) : null}
                                </View>
                                <Button
                                  label={t.studyAi.removeDraft}
                                  variant="ghost"
                                  size="sm"
                                  accessibilityLabel={t.studyAi.removeDraftNumbered(index + 1)}
                                  onPress={() => handleRemoveDraft(draft.id)}
                                />
                              </View>

                              {/* Front Input */}
                              <View style={{ gap: spacing.xs }}>
                                <AppText variant="caption" color={colors.textSecondary}>
                                  {t.studyAi.front}
                                </AppText>
                                <Input
                                  multiline
                                  value={draft.front}
                                  onChangeText={(text) => handleEditDraft(draft.id, 'front', text)}
                                  accessibilityLabel={`${t.studyAi.front} ${index + 1}`}
                                  style={{ minHeight: 60 }}
                                />
                              </View>

                              {/* Back Input */}
                              <View style={{ gap: spacing.xs }}>
                                <AppText variant="caption" color={colors.textSecondary}>
                                  {t.studyAi.back}
                                </AppText>
                                <Input
                                  multiline
                                  value={draft.back}
                                  onChangeText={(text) => handleEditDraft(draft.id, 'back', text)}
                                  accessibilityLabel={`${t.studyAi.back} ${index + 1}`}
                                  style={{ minHeight: 60 }}
                                />
                              </View>

                              {/* Source Excerpt */}
                              {draft.sourceExcerpt ? (
                                <View
                                  style={{
                                    backgroundColor: colors.surfaceElevated,
                                    padding: spacing.xs,
                                    borderRadius: radius.sm,
                                  }}
                                >
                                  <AppText variant="caption" color={colors.textSecondary}>
                                    {t.studyAi.sourceExcerpt}: “{draft.sourceExcerpt}”
                                  </AppText>
                                </View>
                              ) : null}
                            </View>
                          ))}
                        </View>

                        {/* Academic Safety Note */}
                        <View
                          style={{
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                            paddingTop: spacing.sm,
                          }}
                        >
                          <AppText variant="caption" color={colors.textSecondary}>
                            {t.studyAi.studyUseNote}
                          </AppText>
                        </View>
                      </Card>
                    )}
                  </View>
                )}
              </Section>
            )}

            {/* Result Area (for Explain / Summarize) */}
            {resultState.status === 'loading' && (
              <Section>
                <FeedbackState
                  kind="loading"
                  message={
                    resultState.kind === 'explain'
                      ? t.studyAi.loadingExplain
                      : resultState.kind === 'summarize'
                      ? t.studyAi.loadingSummarize
                      : t.studyAi.generatingDrafts
                  }
                />
              </Section>
            )}

            {resultState.status === 'error' && (
              <Section>
                <FeedbackState
                  kind="error"
                  message={resultState.errorMessage}
                  action={{ label: t.studyAi.retry, onPress: handleRetry }}
                />
              </Section>
            )}

            {resultState.status === 'success' && (
              <Section>
                <Card elevated style={{ gap: spacing.md }}>
                  {/* Header & Mode */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <AppText variant="h3">
                      {resultState.kind === 'explain'
                        ? t.studyAi.explanationTitle
                        : t.studyAi.summaryTitle}
                    </AppText>
                    <Button
                      label={t.studyAi.clearResult}
                      variant="ghost"
                      size="sm"
                      onPress={() => setResultState({ status: 'idle' })}
                    />
                  </View>

                  {/* Provenance Badge / Label */}
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      padding: spacing.sm,
                      gap: 2,
                    }}
                  >
                    <AppText variant="label" color={colors.primary}>
                      {t.studyAi.basedOnSource(resultState.sourceTitle)}
                    </AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {t.studyAi.sourceOnlyNote}
                    </AppText>
                  </View>

                  {/* Body Text */}
                  <AppText variant="body" style={{ lineHeight: 22 }}>
                    {resultState.text}
                  </AppText>

                  {/* Academic Safety Note */}
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      paddingTop: spacing.sm,
                    }}
                  >
                    <AppText variant="caption" color={colors.textSecondary}>
                      {t.studyAi.studyUseNote}
                    </AppText>
                  </View>
                </Card>
              </Section>
            )}
          </>
        )}
      </Section>
    </ScreenWrapper>
  );
}
