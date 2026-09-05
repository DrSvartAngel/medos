import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { subjectFallback, subjectRouteId } from '@/utils/subjectRoutes';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore, type Committee } from '@/store/useCommitteeStore';
import { formatLocalDateKey, localDateTimeToTimestamp } from '@/utils/calendarDate';

import { useTranslation } from '@/i18n';

function committeeExit(id: string): void {
  let target: Href = '/(tabs)/committees';
  try { target = subjectFallback(id) as Href; } catch { /* safe tab fallback */ }
  router.dismissTo(target);
}

function EditCommitteeForm({ committee }: { committee: Committee }) {
  const t = useTranslation();
  const { colors, spacing, radius, typography } = useTheme();
  const { isTablet } = useResponsive();
  const updateCommittee = useCommitteeStore((state) => state.updateCommittee);
  const mutationError = useCommitteeStore((state) => state.error);
  const setError = useCommitteeStore((state) => state.setError);

  const [name, setName] = useState(committee.name);
  const [description, setDescription] = useState(committee.description);
  const [startDate, setStartDate] = useState(formatLocalDateKey(committee.startDate));
  const [examDate, setExamDate] = useState(formatLocalDateKey(committee.examDate));
  const [nameError, setNameError] = useState('');
  const [dateError, setDateError] = useState('');
  const [saving, setSaving] = useState(false);

  function validate(): { start: number; exam: number } | null {
    const start = localDateTimeToTimestamp(startDate.trim(), null);
    const exam = localDateTimeToTimestamp(examDate.trim(), null);
    let valid = true;

    if (!name.trim()) {
      setNameError('Committee name is required.');
      valid = false;
    } else {
      setNameError('');
    }

    if (start === null || exam === null) {
      setDateError('Please enter valid dates in YYYY-MM-DD format.');
      valid = false;
    } else if (exam < start) {
      setDateError('Exam date cannot be before the start date.');
      valid = false;
    } else {
      setDateError('');
    }

    return valid && start !== null && exam !== null ? { start, exam } : null;
  }

  function handleSave() {
    const dates = validate();
    if (!dates) return;

    setSaving(true);
    const succeeded = updateCommittee(committee.id, {
      name: name.trim(),
      description: description.trim(),
      startDate: dates.start,
      examDate: dates.exam,
    });
    setSaving(false);
    if (succeeded) committeeExit(committee.id);
  }

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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenWrapper includeBottomSafeArea>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
            onPress={() => committeeExit(committee.id)}
            style={[styles.backButton, { marginRight: spacing.sm }]}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <AppText style={{ flex: 1 }} variant={isTablet ? 'h1' : 'h2'}>Edit Committee</AppText>
        </View>

        <AppText color={colors.textSecondary} style={{ marginBottom: spacing.xl }}>
          Update the details for this committee.
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
              Changes were not saved. Check your local data and try again.
            </AppText>
          </View>
        ) : null}

        <View style={{ marginBottom: spacing.md }}>
          <AppText variant="label" color={colors.textSecondary} style={styles.label}>
            Committee Name *
          </AppText>
          <TextInput
            accessibilityLabel="Committee name"
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (nameError) setNameError('');
              if (mutationError) setError(null);
            }}
            placeholder="e.g. Cardiology Block 3"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            style={inputStyle}
          />
          {nameError ? (
            <AppText variant="caption" color={colors.error} style={styles.errorText}>
              {nameError}
            </AppText>
          ) : null}
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <AppText variant="label" color={colors.textSecondary} style={styles.label}>
            Description
          </AppText>
          <TextInput
            accessibilityLabel="Committee description"
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              if (mutationError) setError(null);
            }}
            placeholder="Optional — e.g. Focus areas, notes…"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={[inputStyle, styles.descriptionInput]}
          />
        </View>

        <View style={[styles.datesRow, { gap: spacing.sm, marginBottom: spacing.md }]}>
          <View style={styles.dateField}>
            <AppText variant="label" color={colors.textSecondary} style={styles.label}>
              Start Date *
            </AppText>
            <TextInput
              accessibilityLabel="Committee start date in year month day format"
              value={startDate}
              onChangeText={(value) => {
                setStartDate(value);
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
          <View style={styles.dateField}>
            <AppText variant="label" color={colors.textSecondary} style={styles.label}>
              Exam Date *
            </AppText>
            <TextInput
              accessibilityLabel="Committee exam date in year month day format"
              value={examDate}
              onChangeText={(value) => {
                setExamDate(value);
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

        {dateError ? (
          <AppText
            variant="caption"
            color={colors.error}
            style={[styles.errorText, { marginBottom: spacing.md }]}
          >
            {dateError}
          </AppText>
        ) : null}

        <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: spacing.xl }}>
          Enter dates as YYYY-MM-DD (e.g. 2026-11-15)
        </AppText>

        <Button
          label="Save Changes"
          onPress={handleSave}
          loading={saving}
          size={isTablet ? 'lg' : 'md'}
          style={{ marginBottom: spacing.lg }}
        />
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

export default function EditCommitteeScreen() {
  const t = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = subjectRouteId(params.id);
  const { colors, spacing } = useTheme();

  const committee = useCommitteeStore((state) =>
    state.committees.find((item) => item.id === id)
  );
  const isLoadingCommittee = useCommitteeStore((state) => state.isLoadingCommittee);
  const committeeRequestId = useCommitteeStore((state) => state.committeeRequestId);
  const committeeLoadError = useCommitteeStore((state) => state.committeeLoadError);
  const committeeNotFound = useCommitteeStore((state) => state.committeeNotFound);
  const loadCommittee = useCommitteeStore((state) => state.loadCommittee);
  const setError = useCommitteeStore((state) => state.setError);

  useEffect(() => {
    setError(null);
    if (id) loadCommittee(id);
  }, [id, loadCommittee, setError]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { committeeExit(id); return true; });
    return () => listener.remove();
  }, [id]));
  const requestMatches = committeeRequestId === id;

  if (!id || (requestMatches && committeeNotFound)) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <Feather name="search" size={30} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          Committee not found
        </AppText>
        <AppText color={colors.textMuted} style={styles.centeredText}>
          It may have been removed from this device.
        </AppText>
        <Button label={t.common.back} onPress={() => router.dismissTo('/(tabs)/committees')} />
      </ScreenWrapper>
    );
  }

  if (requestMatches && committeeLoadError) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <Feather name="alert-circle" size={30} color={colors.warning} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          Committee needs another try
        </AppText>
        <AppText color={colors.textMuted} style={styles.centeredText}>
          The committee could not be loaded from local storage.
        </AppText>
        <Button label="Retry committee" onPress={() => loadCommittee(id)} />
        <Button label={t.common.back} variant="ghost" onPress={() => committeeExit(id)} />
      </ScreenWrapper>
    );
  }

  if (!requestMatches || isLoadingCommittee || !committee) {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.centeredState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          Loading committee…
        </AppText>
      </ScreenWrapper>
    );
  }

  return <EditCommitteeForm key={committee.id} committee={committee} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
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
  label: {
    marginBottom: 6,
  },
  errorText: {
    marginTop: 4,
  },
  errorNotice: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  descriptionInput: {
    minHeight: 88,
  },
  datesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dateField: {
    flex: 1,
    minWidth: 220,
  },
});
