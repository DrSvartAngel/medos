import { translateError } from '@/i18n/errors';
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { UpdateCardInput } from '@/store/useMemoryStore';
import { TopicLinkPicker } from './TopicLinkPicker';
import { useTranslation } from '@/i18n';

interface FlashcardFormProps {
  initialFront?: string;
  initialBack?: string;
  initialTopicId?: string | null;
  submitLabel: string;
  error?: string | null;
  onSubmit: (input: UpdateCardInput) => boolean;
  onCancel: () => void;
}

export function FlashcardForm({
  initialFront = '',
  initialBack = '',
  initialTopicId = null,
  submitLabel,
  error,
  onSubmit,
  onCancel,
}: FlashcardFormProps) {
  const t = useTranslation();
  const { colors, spacing, radius, typography } = useTheme();
  const { isTablet } = useResponsive();
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const [topicId, setTopicId] = useState(initialTopicId);
  const [frontError, setFrontError] = useState('');
  const [backError, setBackError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleSubmit() {
    if (saving) return;
    const nextFrontError = front.trim().length === 0 ? t.sweep.frontRequired : '';
    const nextBackError = back.trim().length === 0 ? t.sweep.backRequired : '';
    setFrontError(nextFrontError);
    setBackError(nextBackError);
    if (nextFrontError || nextBackError) return;

    setSaving(true);
    const saved = onSubmit({ front: front.trim(), back: back.trim(), topicId });
    if (!saved) setSaving(false);
  }

  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.size.base,
    minHeight: isTablet ? 170 : 140,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  };

  return (
    <View style={[styles.form, { gap: spacing.lg }]}> 
      {error !== null && error !== undefined && (
        <View style={[styles.error, { borderColor: colors.error, padding: spacing.md }]}> 
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
            {error === 'memory_topic_unavailable' ? t.memoryTopic.missing : translateError(error, t)}
          </AppText>
        </View>
      )}

      <View>
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>
          {t.sweep.front}</AppText>
        <TextInput
          value={front}
          accessibilityLabel={t.sweep.front}
          onChangeText={(value) => {
            setFront(value);
            if (frontError) setFrontError('');
          }}
          placeholder={t.sweep.frontExample}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          autoFocus={initialFront.length === 0}
          maxLength={2000}
          style={inputStyle}
        />
        {frontError.length > 0 && (
          <AppText variant="caption" color={colors.error} style={styles.fieldError}>
            {translateError(frontError, t)}
          </AppText>
        )}
      </View>

      <View>
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>
          {t.sweep.backAnswer}</AppText>
        <TextInput
          value={back}
          accessibilityLabel={t.sweep.backAnswer}
          onChangeText={(value) => {
            setBack(value);
            if (backError) setBackError('');
          }}
          placeholder={t.sweep.answerPlaceholder}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={4000}
          style={inputStyle}
        />
        {backError.length > 0 && (
          <AppText variant="caption" color={colors.error} style={styles.fieldError}>
            {translateError(backError, t)}
          </AppText>
        )}
      </View>

      <TopicLinkPicker value={topicId} onChange={setTopicId} disabled={saving} />
      <View style={[styles.actions, isTablet && styles.actionsTablet, { gap: spacing.sm }]}>
        <Button
          label={t.sweep.cancel}
          variant="secondary"
          onPress={onCancel}
          disabled={saving}
          style={styles.action}
        />
        <Button label={submitLabel} onPress={handleSubmit} loading={saving} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  fieldError: {
    marginTop: 4,
  },
  error: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'column-reverse',
  },
  actionsTablet: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  action: {
    minWidth: 160,
  },
});
