import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import {
  localDateTimeToTimestamp,
  shiftLocalDateKey,
  todayLocalDateKey,
} from '@/utils/calendarDate';

function parseDateInput(value: string): number | null {
  return localDateTimeToTimestamp(value.trim(), null);
}

function todayString(): string {
  return todayLocalDateKey();
}

function thirtyDaysLaterString(): string {
  return shiftLocalDateKey(todayLocalDateKey(), 30);
}

// Default color for new committees
const DEFAULT_COLOR = '#6C63FF';

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function NewCommitteeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { isTablet } = useResponsive();
  const addCommittee = useCommitteeStore((s) => s.addCommittee);
  const mutationError = useCommitteeStore((s) => s.error);
  const setError = useCommitteeStore((s) => s.setError);

  const [name, setName]             = useState('');
  const [description, setDesc]      = useState('');
  const [startDate, setStartDate]   = useState(todayString());
  const [examDate, setExamDate]     = useState(thirtyDaysLaterString());

  const [nameError, setNameError]   = useState('');
  const [dateError, setDateError]   = useState('');
  const [saving, setSaving]         = useState(false);

  useEffect(() => {
    setError(null);
  }, [setError]);

  function validate(): boolean {
    let valid = true;

    if (name.trim().length === 0) {
      setNameError('Committee name is required.');
      valid = false;
    } else {
      setNameError('');
    }

    const start = parseDateInput(startDate);
    const exam  = parseDateInput(examDate);

    if (!start || !exam) {
      setDateError('Please enter dates in YYYY-MM-DD format.');
      valid = false;
    } else if (exam < start) {
      setDateError('Exam date cannot be before the start date.');
      valid = false;
    } else {
      setDateError('');
    }

    return valid;
  }

  function handleSave() {
    if (!validate()) return;

    const start = parseDateInput(startDate)!;
    const exam  = parseDateInput(examDate)!;

    setSaving(true);
    const succeeded = addCommittee({
      name: name.trim(),
      description: description.trim(),
      startDate: start,
      examDate: exam,
      color: DEFAULT_COLOR,
    });
    setSaving(false);
    if (succeeded) router.back();
  }

  // Shared input style
  const inputStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.textPrimary,
    fontSize: typography.size.base,
    fontFamily: typography.fontFamily,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenWrapper>
        {/* ── Back + Title ─────────────────────────────────── */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backButton, { marginRight: spacing.sm }]}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppText variant={isTablet ? 'h1' : 'h2'}>New Committee</AppText>
        </View>

        <AppText
          variant="body"
          color={colors.textSecondary}
          style={{ marginBottom: spacing.xl }}
        >
          Fill in the details below to create your committee.
        </AppText>

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
              The committee was not created. Check your local data and try again.
            </AppText>
          </View>
        ) : null}

        {/* ── Name ─────────────────────────────────────────── */}
        <View style={[styles.field, { marginBottom: spacing.md }]}>
          <AppText variant="label" color={colors.textSecondary} style={styles.label}>
            Committee Name *
          </AppText>
          <TextInput
            accessibilityLabel="Committee name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (nameError) setNameError('');
              if (mutationError) setError(null);
            }}
            placeholder="e.g. Cardiology Block 3"
            placeholderTextColor={colors.textMuted}
            autoFocus
            returnKeyType="next"
            style={inputStyle}
          />
          {nameError.length > 0 && (
            <AppText variant="caption" color={colors.error} style={styles.errorText}>
              {nameError}
            </AppText>
          )}
        </View>

        {/* ── Description ──────────────────────────────────── */}
        <View style={[styles.field, { marginBottom: spacing.md }]}>
          <AppText variant="label" color={colors.textSecondary} style={styles.label}>
            Description
          </AppText>
          <TextInput
            accessibilityLabel="Committee description"
            value={description}
            onChangeText={(value) => {
              setDesc(value);
              if (mutationError) setError(null);
            }}
            placeholder="Optional — e.g. Focus areas, notes…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[inputStyle, { minHeight: 80 }]}
          />
        </View>

        {/* ── Dates ────────────────────────────────────────── */}
        <View style={[styles.datesRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
          <View style={[styles.field, styles.dateField]}>
            <AppText variant="label" color={colors.textSecondary} style={styles.label}>
              Start Date *
            </AppText>
            <TextInput
              accessibilityLabel="Committee start date in year month day format"
              value={startDate}
              onChangeText={(t) => {
                setStartDate(t);
                if (dateError) setDateError('');
                if (mutationError) setError(null);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={10}
              style={inputStyle}
            />
          </View>

          <View style={[styles.field, styles.dateField]}>
            <AppText variant="label" color={colors.textSecondary} style={styles.label}>
              Exam Date *
            </AppText>
            <TextInput
              accessibilityLabel="Committee exam date in year month day format"
              value={examDate}
              onChangeText={(t) => {
                setExamDate(t);
                if (dateError) setDateError('');
                if (mutationError) setError(null);
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={10}
              style={inputStyle}
            />
          </View>
        </View>

        {dateError.length > 0 && (
          <AppText
            variant="caption"
            color={colors.error}
            style={[styles.errorText, { marginBottom: spacing.md }]}
          >
            {dateError}
          </AppText>
        )}

        <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xl }}>
          Enter dates as YYYY-MM-DD (e.g. 2026-11-15)
        </AppText>

        {/* ── Save ─────────────────────────────────────────── */}
        <Button
          label="Create Committee"
          onPress={handleSave}
          loading={saving}
          size={isTablet ? 'lg' : 'md'}
          style={{ marginBottom: spacing.lg }}
        />
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingTop: 8,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    // container for label + input
  },
  label: {
    marginBottom: 6,
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateField: {
    flex: 1,
    minWidth: 220,
  },
  errorNotice: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  errorText: {
    marginTop: 4,
  },
});
