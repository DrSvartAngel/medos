import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { topicRepo } from '@/db/repositories/topicRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
import { sourceChunkRepo } from '@/db/repositories/sourceChunkRepo';
import { indexingService } from '@/services/chunking/indexingService';
import type { StudySource } from '@/models/studySource';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { StudySourceEditor, type StudySourceFormValues } from '@/components/study-sources/StudySourceEditor';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { topicRouteId } from '@/utils/topicRoutes';
import { visualUnderstandingService } from '@/services/ai/visualUnderstandingService';
import type { VisualAnalysisResult } from '@/models/visualUnderstanding';

export default function StudySourceDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; sourceId?: string | string[] }>();
  const topicId = topicRouteId(Array.isArray(params.id) ? params.id[0] : params.id);
  const sourceId = topicRouteId(Array.isArray(params.sourceId) ? params.sourceId[0] : params.sourceId);
  const t = useTranslation();
  const { colors, spacing } = useTheme();

  const topic = topicId ? topicRepo.getById(topicId) : null;

  const [source, setSource] = useState<StudySource | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [analyzingAssetKey, setAnalyzingAssetKey] = useState<string | null>(null);
  const [visualResults, setVisualResults] = useState<Record<string, VisualAnalysisResult>>({});
  const [visualErrors, setVisualErrors] = useState<Record<string, string>>({});
  const deleting = useRef(false);
  const chunkCount = source ? sourceChunkRepo.countBySourceId(source.id) : 0;

  const loadSource = useCallback(() => {
    setLoading(true);
    setDeleteError(null);
    setSaveError(null);
    if (!sourceId) {
      setSource(null);
      setLoading(false);
      return;
    }
    try {
      const item = studySourceRepo.getById(sourceId);
      if (!item || (topicId && item.topicId !== topicId)) {
        setSource(null);
      } else {
        setSource(item);
      }
    } catch {
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [sourceId, topicId]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  const handleBack = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else if (topicId) {
      router.replace(`/topics/${encodeURIComponent(topicId)}` as Href);
    } else {
      router.replace('/(tabs)/committees' as Href);
    }
  }, [isEditing, topicId]);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => listener.remove();
    }, [handleBack])
  );

  async function handleSave(values: StudySourceFormValues) {
    if (!source) return;
    try {
      setIsSaving(true);
      setSaveError(null);
      const updated = studySourceRepo.update(source.id, {
        title: values.title,
        content: values.content,
        sourceType: values.sourceType,
      });
      if (updated) {
        try {
          indexingService.reindexSourceSync(updated);
        } catch {
          // Re-indexing failure shouldn't block saving source content
        }
        setSource(updated);
        setIsEditing(false);
      } else {
        setSaveError(t.studySources.saveError);
      }
    } catch {
      setSaveError(t.studySources.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAnalyzeVisual(
    assetKey: string,
    params: {
      pageNumber?: number;
      slideNumber?: number;
      imageIndex?: number;
      mediaId?: string;
      ocrText?: string;
      imageBase64?: string;
      imageUri?: string;
    }
  ) {
    if (!source) return;
    setAnalyzingAssetKey(assetKey);
    setVisualErrors((prev) => ({ ...prev, [assetKey]: '' }));

    try {
      const res = await visualUnderstandingService.analyzeVisual({
        task: 'explain_diagram',
        mimeType: 'image/png',
        imageBase64: params.imageBase64,
        imageUri: params.imageUri,
        ocrText: params.ocrText,
        surroundingText: source.content.slice(0, 500),
        sourceMetadata: {
          sourceId: source.id,
          sourceTitle: source.title,
          topicName: topic?.name || '',
          pageNumber: params.pageNumber,
          slideNumber: params.slideNumber,
          mediaId: params.mediaId,
          imageIndex: params.imageIndex || 1,
        },
      });

      if (
        res.status === 'visual_provider_not_configured' ||
        res.status === 'blocked_by_provider_configuration'
      ) {
        setVisualErrors((prev) => ({
          ...prev,
          [assetKey]: 'Visual intelligence provider is not configured (requires server GEMINI_API_KEY).',
        }));
      } else if (res.status === 'network_unavailable') {
        setVisualErrors((prev) => ({
          ...prev,
          [assetKey]: 'Unable to connect to extraction server. Please check connection.',
        }));
      } else if (res.status === 'failed' || res.status === 'analysis_failed') {
        setVisualErrors((prev) => ({
          ...prev,
          [assetKey]: res.uncertaintyWarnings?.[0] || 'Visual analysis failed.',
        }));
      } else {
        setVisualResults((prev) => ({ ...prev, [assetKey]: res }));
      }
    } catch (err) {
      setVisualErrors((prev) => ({
        ...prev,
        [assetKey]: err instanceof Error ? err.message : 'Visual analysis failed.',
      }));
    } finally {
      setAnalyzingAssetKey(null);
    }
  }

  function handleDelete() {
    if (!source || deleting.current) return;
    Alert.alert(
      t.studySources.deleteTitle,
      t.studySources.deleteConfirm(source.title),
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.studySources.delete,
          style: 'destructive',
          onPress: () => {
            if (deleting.current) return;
            deleting.current = true;
            try {
              try {
                indexingService.removeSourceIndex(source.id);
              } catch {
                // Ignore cleanup error if already removed
              }
              const success = studySourceRepo.delete(source.id);
              if (success) {
                if (router.canGoBack()) {
                  router.back();
                } else if (topicId) {
                  router.replace(`/topics/${encodeURIComponent(topicId)}` as Href);
                } else {
                  router.replace('/(tabs)/committees' as Href);
                }
              } else {
                setDeleteError(t.studySources.deleteError);
              }
            } catch {
              setDeleteError(t.studySources.deleteError);
            } finally {
              deleting.current = false;
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <ScreenWrapper includeBottomSafeArea>
        <Section>
          <FeedbackState kind="loading" message={t.common.loading} />
        </Section>
      </ScreenWrapper>
    );
  }

  if (!source) {
    return (
      <ScreenWrapper includeBottomSafeArea>
        <Section>
          <FeedbackState
            kind="empty"
            message={t.studySources.notFound}
            action={{ label: t.common.back, onPress: handleBack }}
          />
        </Section>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper includeBottomSafeArea>
      <Section style={{ maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <Breadcrumb
          items={[
            { label: topic?.name ?? t.studySources.title, onPress: handleBack },
            { label: source.title, isCurrent: true },
          ]}
        />

        {isEditing ? (
          <>
            <AppText variant="h2" style={{ marginTop: spacing.xs, marginBottom: spacing.sm }}>
              {t.studySources.editSource}
            </AppText>
            <StudySourceEditor
              initialValues={{
                title: source.title,
                content: source.content,
                sourceType: source.sourceType,
              }}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
              isSaving={isSaving}
              saveError={saveError}
              submitLabel={t.studySources.save}
            />
          </>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.headerRow, { marginTop: spacing.xs, marginBottom: spacing.sm }]}>
              <AppText variant="h2" style={{ flex: 1, marginRight: spacing.sm }}>
                {source.title}
              </AppText>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Badge label={t.studySources[source.sourceType]} variant="default" />
                {source.metadata?.canonicalType === 'image' || source.content.includes('[OCR') ? (
                  <Badge label="OCR" variant="primary" />
                ) : null}
                {chunkCount > 0 ? (
                  <Badge
                    label={chunkCount === 1 ? '1 chunk' : `${chunkCount} chunks`}
                    variant="neutral"
                  />
                ) : null}
              </View>
            </View>

            <AppText variant="caption" color={colors.textSecondary} style={{ marginBottom: spacing.md }}>
              {t.studySources.updatedAt(
                new Date(source.updatedAt).toLocaleDateString(t.dashboard.locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              )}
            </AppText>

            {/* Content Display with Layer Distinction */}
            {source.content.includes('[OCR') ? (
              <View style={{ gap: spacing.md }}>
                {source.content.split(/(?=\[OCR)/g).map((section, idx) => {
                  const isOcr = section.trim().startsWith('[OCR');
                  const lines = section.trim().split('\n');
                  const header = isOcr ? lines[0].replace(/[\[\]]/g, '') : 'Extracted Text';
                  const body = isOcr ? lines.slice(1).join('\n').trim() : section.trim();

                  if (!body) return null;

                  return (
                    <Card
                      key={idx}
                      style={[
                        styles.contentCard,
                        {
                          backgroundColor: isOcr ? colors.surfaceElevated : colors.surface,
                          borderColor: isOcr ? colors.cardBorder : 'transparent',
                          borderWidth: isOcr ? 1 : 0,
                          padding: spacing.md,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
                        <Badge label={isOcr ? 'OCR' : 'Native Text'} variant={isOcr ? 'primary' : 'default'} />
                        {isOcr && header ? (
                          <AppText variant="caption" color={colors.textSecondary} style={{ marginLeft: spacing.sm }}>
                            {header}
                          </AppText>
                        ) : null}
                      </View>
                      <AppText variant="body" style={styles.contentText}>
                        {body}
                      </AppText>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <Card style={[styles.contentCard, { backgroundColor: colors.surface, padding: spacing.md }]}>
                {source.metadata?.canonicalType === 'image' ? (
                  <View style={{ marginBottom: spacing.xs }}>
                    <Badge label="OCR Extracted Text" variant="primary" />
                  </View>
                ) : null}
                <AppText variant="body" style={styles.contentText}>
                  {source.content}
                </AppText>

                {source.metadata?.canonicalType === 'image' ? (
                  <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText variant="label">Visual Explanation</AppText>
                      {!visualResults['standalone-image'] ? (
                        <Button
                          label={analyzingAssetKey === 'standalone-image' ? 'Analyzing...' : 'Analyze visual'}
                          variant="secondary"
                          size="sm"
                          disabled={analyzingAssetKey === 'standalone-image'}
                          onPress={() =>
                            handleAnalyzeVisual('standalone-image', {
                              imageIndex: 1,
                              ocrText: source.content,
                            })
                          }
                        />
                      ) : null}
                    </View>

                    {visualErrors['standalone-image'] ? (
                      <AppText variant="caption" color={colors.error} style={{ marginTop: 4 }}>
                        {visualErrors['standalone-image']}
                      </AppText>
                    ) : null}

                    {visualResults['standalone-image'] ? (
                      <View style={{ marginTop: spacing.xs, gap: 4 }}>
                        {visualResults['standalone-image'].description ? (
                          <AppText variant="bodySmall">
                            <AppText variant="caption" style={{ fontWeight: '600' }}>Description: </AppText>
                            {visualResults['standalone-image'].description}
                          </AppText>
                        ) : null}
                        {visualResults['standalone-image'].visibleLabels &&
                        visualResults['standalone-image'].visibleLabels!.length > 0 ? (
                          <AppText variant="bodySmall">
                            <AppText variant="caption" style={{ fontWeight: '600' }}>Labels: </AppText>
                            {visualResults['standalone-image'].visibleLabels!.join(', ')}
                          </AppText>
                        ) : null}
                        {visualResults['standalone-image'].relationships ? (
                          <AppText variant="bodySmall">
                            <AppText variant="caption" style={{ fontWeight: '600' }}>Relationships: </AppText>
                            {visualResults['standalone-image'].relationships}
                          </AppText>
                        ) : null}
                        {visualResults['standalone-image'].educationalExplanation ? (
                          <AppText variant="bodySmall">
                            <AppText variant="caption" style={{ fontWeight: '600' }}>Explanation: </AppText>
                            {visualResults['standalone-image'].educationalExplanation}
                          </AppText>
                        ) : null}
                        {visualResults['standalone-image'].uncertaintyWarnings &&
                        visualResults['standalone-image'].uncertaintyWarnings!.length > 0 ? (
                          <AppText variant="caption" color={colors.warning} style={{ marginTop: 2 }}>
                            ⚠️ {visualResults['standalone-image'].uncertaintyWarnings!.join('; ')}
                          </AppText>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </Card>
            )}

            {/* Visual Assets Section if present in metadata */}
            {source.metadata?.visualAssets && source.metadata.visualAssets.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <AppText variant="h3" style={{ marginBottom: spacing.sm }}>
                  Visuals & Figures ({source.metadata.visualAssets.length})
                </AppText>
                <View style={{ gap: spacing.sm }}>
                  {source.metadata.visualAssets.map((asset, idx) => {
                    const assetKey = asset.id || `asset-${asset.slideNumber || asset.pageNumber || idx + 1}-${asset.imageIndex || 1}`;
                    const isAnalyzing = analyzingAssetKey === assetKey;
                    const visualResult = visualResults[assetKey];
                    const visualError = visualErrors[assetKey];

                    return (
                      <Card
                        key={assetKey}
                        style={[
                          styles.contentCard,
                          {
                            backgroundColor: colors.surfaceElevated,
                            borderColor: colors.cardBorder,
                            borderWidth: 1,
                            padding: spacing.md,
                          },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <AppText variant="label">
                            {asset.slideNumber ? `Slide ${asset.slideNumber}` : asset.pageNumber ? `Page ${asset.pageNumber}` : `Figure ${idx + 1}`}
                            {asset.imageIndex ? ` • Image ${asset.imageIndex}` : ''}
                          </AppText>
                          <Badge label={asset.ocrText ? 'OCR available' : 'Visual figure'} variant="default" />
                        </View>
                        {asset.altText ? (
                          <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                            {asset.altText}
                          </AppText>
                        ) : null}
                        {asset.ocrText ? (
                          <View style={{ marginTop: spacing.xs }}>
                            <AppText variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
                              OCR
                            </AppText>
                            <AppText variant="caption" style={{ marginTop: 2, fontStyle: 'italic' }}>
                              "{asset.ocrText.slice(0, 150)}{asset.ocrText.length > 150 ? '...' : ''}"
                            </AppText>
                          </View>
                        ) : null}

                        {/* On-Demand Visual Understanding Section */}
                        <View style={{ marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.xs }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <AppText variant="caption" color={colors.textSecondary} style={{ fontWeight: '600' }}>
                              Visual Explanation
                            </AppText>
                            {!visualResult ? (
                              <Button
                                label={isAnalyzing ? 'Analyzing...' : 'Analyze visual'}
                                variant="secondary"
                                size="sm"
                                disabled={isAnalyzing}
                                onPress={() => handleAnalyzeVisual(assetKey, asset)}
                              />
                            ) : null}
                          </View>

                          {visualError ? (
                            <AppText variant="caption" color={colors.error} style={{ marginTop: 4 }}>
                              {visualError}
                            </AppText>
                          ) : null}

                          {visualResult ? (
                            <View style={{ marginTop: spacing.xs, gap: 4 }}>
                              {visualResult.description ? (
                                <AppText variant="bodySmall">
                                  <AppText variant="caption" style={{ fontWeight: '600' }}>Description: </AppText>
                                  {visualResult.description}
                                </AppText>
                              ) : null}
                              {visualResult.visibleLabels && visualResult.visibleLabels.length > 0 ? (
                                <AppText variant="bodySmall">
                                  <AppText variant="caption" style={{ fontWeight: '600' }}>Labels: </AppText>
                                  {visualResult.visibleLabels.join(', ')}
                                </AppText>
                              ) : null}
                              {visualResult.relationships ? (
                                <AppText variant="bodySmall">
                                  <AppText variant="caption" style={{ fontWeight: '600' }}>Relationships: </AppText>
                                  {visualResult.relationships}
                                </AppText>
                              ) : null}
                              {visualResult.educationalExplanation ? (
                                <AppText variant="bodySmall">
                                  <AppText variant="caption" style={{ fontWeight: '600' }}>Explanation: </AppText>
                                  {visualResult.educationalExplanation}
                                </AppText>
                              ) : null}
                              {visualResult.uncertaintyWarnings && visualResult.uncertaintyWarnings.length > 0 ? (
                                <AppText variant="caption" color={colors.warning} style={{ marginTop: 2 }}>
                                  ⚠️ {visualResult.uncertaintyWarnings.join('; ')}
                                </AppText>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {deleteError ? (
              <View style={{ marginTop: spacing.md }}>
                <FeedbackState kind="error" message={deleteError} />
              </View>
            ) : null}

            <View style={[styles.actions, { marginTop: spacing.xl, gap: spacing.md }]}>
              <Button
                label={t.common.edit}
                variant="secondary"
                onPress={() => setIsEditing(true)}
              />
              <Button
                label={t.studySources.delete}
                variant="danger"
                onPress={handleDelete}
              />
            </View>
          </ScrollView>
        )}
      </Section>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentCard: {
    borderRadius: 8,
  },
  contentText: {
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
