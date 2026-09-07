import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { TopicLinkPicker } from '@/components/memory/TopicLinkPicker';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { translateError } from '@/i18n/errors';
import { useQBankStore } from '@/store/useQBankStore';

export default function NewQBankSessionScreen() {
  const t = useTranslation();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();

  const addSession = useQBankStore((state) => state.addSession);
  const clearStoreError = useQBankStore((state) => state.clearError);

  const [totalQuestions, setTotalQuestions] = useState('');
  const [correctCount, setCorrectCount] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);

  const [totalError, setTotalError] = useState<string | null>(null);
  const [correctError, setCorrectError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    clearStoreError();
  }, [clearStoreError]);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/memory' as Href);
    }
  }

  function validate(): {
    isValid: boolean;
    parsedTotal: number;
    parsedCorrect: number;
    parsedDurationSec: number | null;
  } {
    let isValid = true;
    setFormError(null);

    // Total questions validation
    const trimmedTotal = totalQuestions.trim();
    let parsedTotal = 0;
    if (!trimmedTotal) {
      setTotalError(t.qbank.errors.totalRequired);
      isValid = false;
    } else {
      const num = Number(trimmedTotal);
      if (!Number.isInteger(num) || num <= 0) {
        setTotalError(t.qbank.errors.totalPositive);
        isValid = false;
      } else {
        parsedTotal = num;
        setTotalError(null);
      }
    }

    // Correct count validation
    const trimmedCorrect = correctCount.trim();
    let parsedCorrect = 0;
    if (!trimmedCorrect) {
      setCorrectError(t.qbank.errors.correctRequired);
      isValid = false;
    } else {
      const num = Number(trimmedCorrect);
      if (!Number.isInteger(num) || num < 0) {
        setCorrectError(t.qbank.errors.correctNonNegative);
        isValid = false;
      } else if (parsedTotal > 0 && num > parsedTotal) {
        setCorrectError(t.qbank.errors.correctExceedsTotal);
        isValid = false;
      } else {
        parsedCorrect = num;
        setCorrectError(null);
      }
    }

    // Duration in minutes validation (optional)
    const trimmedDuration = durationMin.trim();
    let parsedDurationSec: number | null = null;
    if (trimmedDuration.length > 0) {
      const num = Number(trimmedDuration);
      if (isNaN(num) || num < 0 || !Number.isFinite(num)) {
        setDurationError(t.qbank.errors.durationNonNegative);
        isValid = false;
      } else {
        parsedDurationSec = Math.round(num * 60);
        setDurationError(null);
      }
    } else {
      setDurationError(null);
    }

    return { isValid, parsedTotal, parsedCorrect, parsedDurationSec };
  }

  function handleSave() {
    const { isValid, parsedTotal, parsedCorrect, parsedDurationSec } = validate();
    if (!isValid) return;

    setSaving(true);
    try {
      const session = addSession({
        totalQuestions: parsedTotal,
        correctCount: parsedCorrect,
        durationSec: parsedDurationSec,
        sourceName: sourceName.trim() || null,
        topicId: topicId || null,
      });

      setSaving(false);
      if (session) {
        handleBack();
      } else {
        const storeError = useQBankStore.getState().error;
        if (storeError) {
          const translated = translateError(storeError, t);
          setFormError(translated === t.sweep.operationError ? t.qbank.saveFailed : translated);
        } else {
          setFormError(t.qbank.saveFailed);
        }
      }
    } catch (err: unknown) {
      setSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      const translated = translateError(msg, t);
      setFormError(translated === t.sweep.operationError ? t.qbank.saveFailed : translated);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenWrapper includeBottomSafeArea>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.sweep.back}
            onPress={handleBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[styles.backButton, { marginRight: spacing.sm }]}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.qbank.newTitle}</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {t.qbank.newSubtitle}
            </AppText>
          </View>
        </View>

        {/* Global form error notice */}
        {formError ? (
          <View
            accessibilityRole="alert"
            style={[
              styles.errorNotice,
              {
                borderColor: colors.error,
                backgroundColor: colors.surface,
                padding: spacing.md,
                marginTop: spacing.md,
                borderRadius: 8,
              },
            ]}
          >
            <Feather name="alert-circle" size={18} color={colors.error} />
            <AppText color={colors.error} style={{ flex: 1, marginLeft: spacing.sm }}>
              {formError}
            </AppText>
          </View>
        ) : null}

        {/* Form fields */}
        <View style={[styles.formContainer, { marginTop: spacing.lg, gap: spacing.lg }]}>
          {/* Total Questions */}
          <FormField label={t.qbank.totalQuestions} error={totalError}>
            <Input
              accessibilityLabel={t.qbank.totalQuestions}
              value={totalQuestions}
              onChangeText={(text) => {
                setTotalQuestions(text);
                if (totalError) setTotalError(null);
                if (formError) setFormError(null);
              }}
              placeholder={t.qbank.totalQuestionsPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              invalid={!!totalError}
              editable={!saving}
              autoFocus
            />
          </FormField>

          {/* Correct Count */}
          <FormField label={t.qbank.correctCount} error={correctError}>
            <Input
              accessibilityLabel={t.qbank.correctCount}
              value={correctCount}
              onChangeText={(text) => {
                setCorrectCount(text);
                if (correctError) setCorrectError(null);
                if (formError) setFormError(null);
              }}
              placeholder={t.qbank.correctCountPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              invalid={!!correctError}
              editable={!saving}
            />
          </FormField>

          {/* Duration in minutes (Optional) */}
          <FormField label={t.qbank.durationMinutes} error={durationError}>
            <Input
              accessibilityLabel={t.qbank.durationMinutes}
              value={durationMin}
              onChangeText={(text) => {
                setDurationMin(text);
                if (durationError) setDurationError(null);
                if (formError) setFormError(null);
              }}
              placeholder={t.qbank.durationMinutesPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              invalid={!!durationError}
              editable={!saving}
            />
          </FormField>

          {/* Source Name (Optional) */}
          <FormField label={t.qbank.sourceName}>
            <Input
              accessibilityLabel={t.qbank.sourceName}
              value={sourceName}
              onChangeText={(text) => {
                setSourceName(text);
                if (formError) setFormError(null);
              }}
              placeholder={t.qbank.sourceNamePlaceholder}
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
          </FormField>

          {/* Topic Link (Optional) */}
          <TopicLinkPicker
            value={topicId}
            onChange={setTopicId}
            disabled={saving}
          />

          {/* Actions */}
          <View style={[styles.actions, { marginTop: spacing.md, gap: spacing.sm }]}>
            <Button
              label={t.qbank.saveSession}
              accessibilityLabel={t.qbank.saveSession}
              onPress={handleSave}
              loading={saving}
              size={isTablet ? 'lg' : 'md'}
            />
            <Button
              label={t.common.cancel}
              accessibilityLabel={t.common.cancel}
              variant="ghost"
              onPress={handleBack}
              disabled={saving}
            />
          </View>
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 8,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  headerText: {
    flex: 1,
  },
  errorNotice: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  formContainer: {
    width: '100%',
  },
  actions: {
    width: '100%',
  },
});
