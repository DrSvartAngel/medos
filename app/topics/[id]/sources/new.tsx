import React, { useCallback, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { topicRepo } from '@/db/repositories/topicRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { StudySourceEditor, type StudySourceFormValues } from '@/components/study-sources/StudySourceEditor';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { topicRouteId } from '@/utils/topicRoutes';

export default function NewStudySourceScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const topicId = topicRouteId(Array.isArray(params.id) ? params.id[0] : params.id);
  const t = useTranslation();
  const { spacing } = useTheme();

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const topic = topicId ? topicRepo.getById(topicId) : null;

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

  if (!topicId || !topic) {
    return (
      <ScreenWrapper includeBottomSafeArea>
        <Section>
          <FeedbackState
            kind="empty"
            message={t.topics.missing}
            action={{ label: t.common.back, onPress: handleBack }}
          />
        </Section>
      </ScreenWrapper>
    );
  }

  async function handleSave(values: StudySourceFormValues) {
    try {
      setIsSaving(true);
      setSaveError(null);
      studySourceRepo.insert({
        topicId,
        title: values.title,
        content: values.content,
        sourceType: values.sourceType,
      });
      handleBack();
    } catch {
      setSaveError(t.studySources.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenWrapper includeBottomSafeArea>
      <Section>
        <Breadcrumb
          items={[
            { label: topic.name, onPress: handleBack },
            { label: t.studySources.addSource, isCurrent: true },
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginTop: spacing.xs,
          }}
        >
          <AppText variant="h2">{t.studySources.addSource}</AppText>
          <Button
            label={t.documentImport.importDocument}
            variant="secondary"
            size="sm"
            onPress={() =>
              router.replace(`/topics/${encodeURIComponent(topicId)}/sources/import-document` as Href)
            }
          />
        </View>
        <StudySourceEditor
          onSave={handleSave}
          onCancel={handleBack}
          isSaving={isSaving}
          saveError={saveError}
          submitLabel={t.studySources.save}
        />
      </Section>
    </ScreenWrapper>
  );
}
