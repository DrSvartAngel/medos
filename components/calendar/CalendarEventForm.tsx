import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import {
  isValidLocalDateKey,
  localDateTimeToTimestamp,
  localTimeToMinutes,
  parseLocalTime,
} from '@/utils/calendarDate';
import type { Committee } from '@/store/useCommitteeStore';
import type { CalendarEventInput } from '@/store/useCalendarStore';

interface CalendarEventFormProps {
  initialTitle?: string;
  initialDescription?: string;
  initialDate: string;
  initialStartTime?: string | null;
  initialEndTime?: string | null;
  initialCommitteeId?: string | null;
  committees: Committee[];
  submitLabel: string;
  error?: string | null;
  onSubmit: (input: CalendarEventInput) => boolean;
  onCancel: () => void;
}

export function CalendarEventForm({
  initialTitle = '',
  initialDescription = '',
  initialDate,
  initialStartTime = null,
  initialEndTime = null,
  initialCommitteeId = null,
  committees,
  submitLabel,
  error,
  onSubmit,
  onCancel,
}: CalendarEventFormProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { isTablet } = useResponsive();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime ?? '');
  const [endTime, setEndTime] = useState(initialEndTime ?? '');
  const [committeeId, setCommitteeId] = useState<string | null>(initialCommitteeId);
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');
  const [saving, setSaving] = useState(false);

  const missingCommittee =
    committeeId !== null && !committees.some((committee) => committee.id === committeeId);

  function handleSubmit() {
    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();

    const nextTitleError = trimmedTitle.length === 0 ? 'Event title is required.' : '';
    const nextDateError = !isValidLocalDateKey(trimmedDate)
      ? 'Enter a valid date as YYYY-MM-DD.'
      : '';
    let nextTimeError = '';

    if (trimmedStart.length > 0 && !parseLocalTime(trimmedStart)) {
      nextTimeError = 'Enter start time as HH:mm.';
    } else if (trimmedEnd.length > 0 && !parseLocalTime(trimmedEnd)) {
      nextTimeError = 'Enter end time as HH:mm.';
    } else if (trimmedEnd.length > 0 && trimmedStart.length === 0) {
      nextTimeError = 'Add a start time before an end time.';
    } else if (
      trimmedStart.length > 0 &&
      trimmedEnd.length > 0 &&
      (localTimeToMinutes(trimmedEnd) ?? 0) <= (localTimeToMinutes(trimmedStart) ?? 0)
    ) {
      nextTimeError = 'End time must be later than start time.';
    } else if (
      trimmedStart.length > 0 &&
      isValidLocalDateKey(trimmedDate) &&
      localDateTimeToTimestamp(trimmedDate, trimmedStart) === null
    ) {
      nextTimeError = 'That local date and time is not available.';
    } else if (
      trimmedEnd.length > 0 &&
      isValidLocalDateKey(trimmedDate) &&
      localDateTimeToTimestamp(trimmedDate, trimmedEnd) === null
    ) {
      nextTimeError = 'That local end time is not available.';
    }

    setTitleError(nextTitleError);
    setDateError(nextDateError);
    setTimeError(nextTimeError);
    if (nextTitleError || nextDateError || nextTimeError) return;

    setSaving(true);
    const saved = onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      date: trimmedDate,
      startTime: trimmedStart.length > 0 ? trimmedStart : null,
      endTime: trimmedEnd.length > 0 ? trimmedEnd : null,
      committeeId,
    });
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  };

  return (
    <View style={[styles.form, { gap: spacing.md }]}> 
      {error !== null && error !== undefined && (
        <View style={[styles.error, { borderColor: colors.error, padding: spacing.md }]}> 
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
            {error}
          </AppText>
        </View>
      )}

      <View>
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>Title *</AppText>
        <TextInput
          value={title}
          onChangeText={(value) => { setTitle(value); if (titleError) setTitleError(''); }}
          placeholder="e.g. Review pharmacology"
          placeholderTextColor={colors.textMuted}
          autoFocus={initialTitle.length === 0}
          maxLength={140}
          style={inputStyle}
        />
        {titleError.length > 0 && <FieldError message={titleError} />}
      </View>

      <View>
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>Date *</AppText>
        <TextInput
          value={date}
          onChangeText={(value) => { setDate(value); if (dateError) setDateError(''); }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={10}
          style={inputStyle}
        />
        {dateError.length > 0 && <FieldError message={dateError} />}
      </View>

      <View style={[styles.timeRow, { gap: spacing.sm }]}> 
        <View style={styles.timeField}>
          <AppText variant="label" color={colors.textSecondary} style={styles.label}>Start time · optional</AppText>
          <TextInput
            value={startTime}
            onChangeText={(value) => {
              setStartTime(value);
              if (value.trim().length === 0) setEndTime('');
              if (timeError) setTimeError('');
            }}
            placeholder="HH:mm"
            placeholderTextColor={colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            style={inputStyle}
          />
        </View>
        {startTime.trim().length > 0 && (
          <View style={styles.timeField}>
            <AppText variant="label" color={colors.textSecondary} style={styles.label}>End time · optional</AppText>
            <TextInput
              value={endTime}
              onChangeText={(value) => { setEndTime(value); if (timeError) setTimeError(''); }}
              placeholder="HH:mm"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={inputStyle}
            />
          </View>
        )}
      </View>
      {timeError.length > 0 && <FieldError message={timeError} />}

      <View>
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>Description · optional</AppText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="A short intention or target"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={600}
          style={[inputStyle, styles.descriptionInput]}
        />
      </View>

      <Card>
        <AppText variant="label">Committee · optional</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.options, { gap: spacing.sm, paddingTop: spacing.md }]}
        >
          <CommitteeOption label="No committee" selected={committeeId === null} onPress={() => setCommitteeId(null)} />
          {committees.map((committee) => (
            <CommitteeOption
              key={committee.id}
              label={committee.name}
              color={committee.color}
              selected={committeeId === committee.id}
              onPress={() => setCommitteeId(committee.id)}
            />
          ))}
        </ScrollView>
        {missingCommittee && (
          <AppText variant="caption" color={colors.warning} style={{ marginTop: spacing.sm }}>
            The linked committee was removed. Choose another or select No committee.
          </AppText>
        )}
      </Card>

      <View style={[styles.actions, isTablet && styles.actionsTablet, { gap: spacing.sm }]}> 
        <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={saving} style={styles.action} />
        <Button label={submitLabel} onPress={handleSubmit} loading={saving} style={styles.action} />
      </View>
    </View>
  );

  function FieldError({ message }: { message: string }) {
    return (
      <AppText variant="caption" color={colors.error} style={styles.fieldError}>
        {message}
      </AppText>
    );
  }

  function CommitteeOption({
    label,
    color,
    selected,
    onPress,
  }: {
    label: string;
    color?: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.option,
          {
            backgroundColor: selected ? colors.primaryMuted : colors.surfaceElevated,
            borderColor: selected ? colors.primary : colors.border,
            borderRadius: radius.full,
            opacity: pressed ? 0.75 : 1,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
          },
        ]}
      >
        {color !== undefined && <View style={[styles.colorDot, { backgroundColor: color }]} />}
        <AppText
          variant="bodySmall"
          color={colors.textPrimary}
          numberOfLines={1}
          style={styles.optionText}
        >
          {label}
        </AppText>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  form: { alignSelf: 'center', maxWidth: 720, width: '100%' },
  label: { marginBottom: 6 },
  timeRow: { alignItems: 'flex-start', flexDirection: 'row' },
  timeField: { flex: 1 },
  descriptionInput: { minHeight: 92 },
  fieldError: { marginTop: 4 },
  error: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row' },
  errorText: { flex: 1, marginLeft: 8 },
  options: { alignItems: 'center' },
  option: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', maxWidth: 240 },
  optionText: { fontWeight: '600' },
  colorDot: { borderRadius: 5, height: 10, marginRight: 8, width: 10 },
  actions: { flexDirection: 'column-reverse' },
  actionsTablet: { flexDirection: 'row', justifyContent: 'flex-end' },
  action: { minWidth: 160 },
});
