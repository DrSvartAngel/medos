import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { Committee } from '@/store/useCommitteeStore';
import type { CreateDeckInput } from '@/store/useMemoryStore';

interface DeckFormProps {
  initialName?: string;
  initialDescription?: string;
  initialCommitteeId?: string | null;
  committees: Committee[];
  submitLabel: string;
  error?: string | null;
  onSubmit: (input: CreateDeckInput) => boolean;
  onCancel: () => void;
}

export function DeckForm({
  initialName = '',
  initialDescription = '',
  initialCommitteeId = null,
  committees,
  submitLabel,
  error,
  onSubmit,
  onCancel,
}: DeckFormProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { isTablet } = useResponsive();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [committeeId, setCommitteeId] = useState<string | null>(initialCommitteeId);
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  const missingCommittee =
    committeeId !== null && !committees.some((committee) => committee.id === committeeId);

  function handleSubmit() {
    if (name.trim().length === 0) {
      setNameError('Deck name is required.');
      return;
    }

    setSaving(true);
    const saved = onSubmit({
      name: name.trim(),
      description: description.trim(),
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
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>
          Deck name *
        </AppText>
        <TextInput
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (nameError) setNameError('');
          }}
          placeholder="e.g. Cardiac physiology"
          placeholderTextColor={colors.textMuted}
          autoFocus={initialName.length === 0}
          returnKeyType="next"
          maxLength={120}
          style={inputStyle}
        />
        {nameError.length > 0 && (
          <AppText variant="caption" color={colors.error} style={styles.fieldError}>
            {nameError}
          </AppText>
        )}
      </View>

      <View>
        <AppText variant="label" color={colors.textSecondary} style={styles.label}>
          Description · optional
        </AppText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What will this deck help you recall?"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={500}
          style={[inputStyle, styles.descriptionInput]}
        />
      </View>

      <Card>
        <AppText variant="label">Committee · optional</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
          Keep the deck general, or place it inside an existing committee.
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.options, { gap: spacing.sm, paddingTop: spacing.md }]}
        >
          <CommitteeOption
            label="No committee"
            selected={committeeId === null}
            onPress={() => setCommitteeId(null)}
          />
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
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          disabled={saving}
          style={styles.action}
        />
        <Button
          label={submitLabel}
          onPress={handleSubmit}
          loading={saving}
          style={styles.action}
        />
      </View>
    </View>
  );

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
            backgroundColor: selected ? colors.accentMuted : colors.surfaceElevated,
            borderColor: selected ? colors.accent : colors.border,
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
          color={selected ? colors.accent : colors.textPrimary}
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
  form: {
    alignSelf: 'center',
    maxWidth: 720,
    width: '100%',
  },
  label: {
    marginBottom: 6,
  },
  descriptionInput: {
    minHeight: 112,
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
  options: {
    alignItems: 'center',
  },
  option: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: 240,
  },
  optionText: {
    fontWeight: '600',
  },
  colorDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
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
