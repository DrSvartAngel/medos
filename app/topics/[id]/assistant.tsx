import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, TouchableOpacity, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { topicRepo } from '@/db/repositories/topicRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
import type { Topic } from '@/models/curriculum';
import type { StudySource } from '@/models/studySource';
import { AIServiceError } from '@/models/ai';
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

type ActionMode = 'explain' | 'summarize';

type ResultState =
  | { status: 'idle' }
  | { status: 'loading'; kind: ActionMode }
  | {
      status: 'success';
      kind: ActionMode;
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
      // Changing source clears previous result to avoid provenance confusion
      setResultState({ status: 'idle' });
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

  const handleRetry = () => {
    if (activeMode === 'explain') {
      void handleExplain();
    } else {
      void handleSummarize();
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
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Button
                    label={t.studyAi.explainTab}
                    variant={activeMode === 'explain' ? 'primary' : 'secondary'}
                    onPress={() => handleModeChange('explain')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={t.studyAi.summarizeTab}
                    variant={activeMode === 'summarize' ? 'primary' : 'secondary'}
                    onPress={() => handleModeChange('summarize')}
                    style={{ flex: 1 }}
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
              </Section>
            )}

            {/* Result Area */}
            {resultState.status === 'loading' && (
              <Section>
                <FeedbackState
                  kind="loading"
                  message={
                    resultState.kind === 'explain'
                      ? t.studyAi.loadingExplain
                      : t.studyAi.loadingSummarize
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
