import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import type { StudySourceType } from '@/models/studySource';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FeedbackState } from '@/components/ui/FeedbackState';

const SOURCE_TYPES: readonly StudySourceType[] = ['text', 'note', 'document'];

export interface StudySourceFormValues {
  title: string;
  content: string;
  sourceType: StudySourceType;
}

export interface StudySourceEditorProps {
  initialValues?: Partial<StudySourceFormValues>;
  onSave: (values: StudySourceFormValues) => Promise<void> | void;
  onCancel?: () => void;
  isSaving?: boolean;
  saveError?: string | null;
  submitLabel?: string;
}

export function StudySourceEditor({
  initialValues,
  onSave,
  onCancel,
  isSaving = false,
  saveError = null,
  submitLabel,
}: StudySourceEditorProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [sourceType, setSourceType] = useState<StudySourceType>(
    initialValues?.sourceType ?? 'text'
  );

  const [titleError, setTitleError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    let valid = true;

    if (!trimmedTitle) {
      setTitleError(t.studySources.titleRequired);
      valid = false;
    } else {
      setTitleError(null);
    }

    if (!trimmedContent) {
      setContentError(t.studySources.contentRequired);
      valid = false;
    } else {
      setContentError(null);
    }

    if (!valid) return;

    onSave({
      title: trimmedTitle,
      content: trimmedContent,
      sourceType,
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {saveError ? (
          <FeedbackState kind="error" message={saveError} />
        ) : null}

        {/* Title */}
        <FormField label={t.studySources.sourceTitle} error={titleError}>
          <Input
            accessibilityLabel={t.studySources.sourceTitle}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (titleError) setTitleError(null);
            }}
            placeholder={t.studySources.sourceTitlePlaceholder}
            placeholderTextColor={colors.textMuted}
            invalid={!!titleError}
            editable={!isSaving}
          />
        </FormField>

        {/* Source Type Selector */}
        <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
          <AppText variant="label">{t.studySources.sourceType}</AppText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t.studySources.sourceType}
            style={[styles.typeRow, { gap: spacing.sm }]}
          >
            {SOURCE_TYPES.map((type) => {
              const isSelected = sourceType === type;
              return (
                <TouchableOpacity
                  key={type}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled: isSaving }}
                  accessibilityLabel={t.studySources[type]}
                  disabled={isSaving}
                  onPress={() => setSourceType(type)}
                  style={[
                    styles.typeOption,
                    {
                      borderColor: isSelected ? colors.primary : colors.border,
                      backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.radioIndicator,
                      {
                        borderColor: isSelected ? colors.primary : colors.textMuted,
                        backgroundColor: isSelected ? colors.primary : 'transparent',
                      },
                    ]}
                  />
                  <AppText
                    variant="body"
                    color={isSelected ? colors.textPrimary : colors.textSecondary}
                    style={isSelected ? styles.selectedText : undefined}
                  >
                    {t.studySources[type]}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Content */}
        <View style={{ marginTop: spacing.md }}>
          <FormField label={t.studySources.content} error={contentError}>
            <Input
              accessibilityLabel={t.studySources.content}
              value={content}
              onChangeText={(text) => {
                setContent(text);
                if (contentError) setContentError(null);
              }}
              placeholder={t.studySources.contentPlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
              scrollEnabled={false}
              invalid={!!contentError}
              editable={!isSaving}
              style={[styles.contentInput, { minHeight: 200 }]}
            />
          </FormField>
        </View>

        {/* Actions */}
        <View style={[styles.actionRow, { gap: spacing.md, marginTop: spacing.xl }]}>
          <Button
            label={submitLabel ?? t.studySources.save}
            onPress={handleSubmit}
            disabled={isSaving}
          />
          {onCancel ? (
            <Button
              label={t.common.cancel}
              variant="ghost"
              onPress={onCancel}
              disabled={isSaving}
            />
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  radioIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 8,
  },
  selectedText: {
    fontWeight: '600',
  },
  contentInput: {
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
