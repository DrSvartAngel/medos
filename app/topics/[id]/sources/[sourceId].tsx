import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, ScrollView, StyleSheet, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { topicRepo } from '@/db/repositories/topicRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
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
  const deleting = useRef(false);

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
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Badge label={t.studySources[source.sourceType]} variant="default" />
                {source.metadata?.canonicalType === 'image' || source.content.includes('[OCR') ? (
                  <Badge label="OCR" variant="primary" />
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
              </Card>
            )}

            {/* Visual Assets Section if present in metadata */}
            {source.metadata?.visualAssets && source.metadata.visualAssets.length > 0 ? (
              <View style={{ marginTop: spacing.lg }}>
                <AppText variant="h3" style={{ marginBottom: spacing.sm }}>
                  Visuals & Figures ({source.metadata.visualAssets.length})
                </AppText>
                <View style={{ gap: spacing.sm }}>
                  {source.metadata.visualAssets.map((asset, idx) => (
                    <Card
                      key={asset.id || idx}
                      style={[
                        styles.contentCard,
                        { backgroundColor: colors.surfaceElevated, borderColor: colors.cardBorder, borderWidth: 1, padding: spacing.sm },
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
                        <AppText variant="caption" style={{ marginTop: 4, fontStyle: 'italic' }}>
                          "{asset.ocrText.slice(0, 100)}{asset.ocrText.length > 100 ? '...' : ''}"
                        </AppText>
                      ) : null}
                    </Card>
                  ))}
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
