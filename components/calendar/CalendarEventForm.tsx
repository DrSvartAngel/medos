import { translateError } from '@/i18n/errors';
import { useTranslation } from '@/i18n';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
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
  const t = useTranslation();
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

    const nextTitleError = trimmedTitle.length === 0 ? t.sweep.eventRequired : '';
    const nextDateError = !isValidLocalDateKey(trimmedDate)
      ? t.sweep.dateValid
      : '';
    let nextTimeError = '';

    if (trimmedStart.length > 0 && !parseLocalTime(trimmedStart)) {
      nextTimeError = t.sweep.startTimeValid;
    } else if (trimmedEnd.length > 0 && !parseLocalTime(trimmedEnd)) {
      nextTimeError = t.sweep.endTimeValid;
    } else if (trimmedEnd.length > 0 && trimmedStart.length === 0) {
      nextTimeError = t.sweep.startFirst;
    } else if (
      trimmedStart.length > 0 &&
      trimmedEnd.length > 0 &&
      (localTimeToMinutes(trimmedEnd) ?? 0) <= (localTimeToMinutes(trimmedStart) ?? 0)
    ) {
      nextTimeError = t.sweep.endAfter;
    } else if (
      trimmedStart.length > 0 &&
      isValidLocalDateKey(trimmedDate) &&
      localDateTimeToTimestamp(trimmedDate, trimmedStart) === null
    ) {
      nextTimeError = t.sweep.localTimeInvalid;
    } else if (
      trimmedEnd.length > 0 &&
      isValidLocalDateKey(trimmedDate) &&
      localDateTimeToTimestamp(trimmedDate, trimmedEnd) === null
    ) {
      nextTimeError = t.sweep.localEndInvalid;
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
            {translateError(error, t)}
          </AppText>
        </View>
      )}

      <FormField label={t.sweep.titleRequired} error={titleError ? translateError(titleError, t) : undefined}>
        <Input
          value={title}
          accessibilityLabel={t.sweep.titleRequired}
          onChangeText={(value) => { setTitle(value); if (titleError) setTitleError(''); }}
          placeholder={t.sweep.eventExample}
          placeholderTextColor={colors.textMuted}
          autoFocus={initialTitle.length === 0}
          maxLength={140}
          invalid={titleError.length > 0}
        />
      </FormField>

      <FormField label={t.sweep.dateRequired} error={dateError ? translateError(dateError, t) : undefined}>
        <Input
          value={date}
          accessibilityLabel={t.sweep.dateRequired}
          onChangeText={(value) => { setDate(value); if (dateError) setDateError(''); }}
          placeholder={t.sweep.datePlaceholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          maxLength={10}
          invalid={dateError.length > 0}
        />
      </FormField>

      <View style={[styles.timeRow, { gap: spacing.sm }]}> 
        <View style={styles.timeField}>
          <FormField label={t.sweep.optionalStart} error={timeError ? translateError(timeError, t) : undefined}>
            <Input
              value={startTime}
              accessibilityLabel={t.sweep.optionalStart}
              onChangeText={(value) => {
                setStartTime(value);
                if (value.trim().length === 0) setEndTime('');
                if (timeError) setTimeError('');
              }}
              placeholder={t.sweep.timePlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              invalid={timeError.length > 0}
            />
          </FormField>
        </View>
        {startTime.trim().length > 0 && (
          <View style={styles.timeField}>
            <FormField label={t.sweep.optionalEnd}>
              <Input
                value={endTime}
                accessibilityLabel={t.sweep.optionalEnd}
                onChangeText={(value) => { setEndTime(value); if (timeError) setTimeError(''); }}
                placeholder={t.sweep.timePlaceholder}
                placeholderTextColor={colors.textMuted}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </FormField>
          </View>
        )}
      </View>

      <FormField label={t.sweep.optionalDescription}>
        <Input
          value={description}
          accessibilityLabel={t.sweep.optionalDescription}
          onChangeText={setDescription}
          placeholder={t.sweep.intentionPlaceholder}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          maxLength={600}
        />
      </FormField>

      <Card>
        <AppText variant="label">{t.sweep.optionalCommittee}</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.options, { gap: spacing.sm, paddingTop: spacing.md }]}
        >
          <CommitteeOption label={t.sweep.noCommittee} selected={committeeId === null} onPress={() => setCommitteeId(null)} />
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
            {t.sweep.missingCommitteeHelp}
          </AppText>
        )}
      </Card>

      <View style={[styles.actions, isTablet && styles.actionsTablet, { gap: spacing.sm }]}> 
        <Button label={submitLabel} onPress={handleSubmit} loading={saving} size={isTablet ? 'lg' : 'md'} style={styles.action} />
        <Button label={t.sweep.cancel} variant="ghost" onPress={onCancel} disabled={saving} size={isTablet ? 'lg' : 'md'} style={styles.action} />
      </View>
    </View>
  );

  function FieldError({ message }: { message: string }) {
    return (
      <AppText variant="caption" color={colors.error} style={styles.fieldError}>
        {translateError(message, t)}
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
  actions: { flexDirection: 'column' },
  actionsTablet: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  action: { flex: 1 },
});
