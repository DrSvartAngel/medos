import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import type { Committee } from '@/store/useCommitteeStore';
import { useTranslation } from '@/i18n';

interface CommitteePickerProps {
  committees: Committee[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function CommitteePicker({ committees, selectedId, onSelect }: CommitteePickerProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  return (
    <Card>
      <AppText variant="label">{t.focus.committeeOptional}</AppText>
      <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
        {t.focus.committeeDesc}
      </AppText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.options, { gap: spacing.sm, paddingTop: spacing.md }]}
      >
        <CommitteeOption
          label={t.focus.noCommittee}
          selected={selectedId === null}
          onPress={() => onSelect(null)}
        />
        {committees.map((committee) => (
          <CommitteeOption
            key={committee.id}
            label={committee.name}
            color={committee.color}
            muted={committee.status === 'completed'}
            selected={selectedId === committee.id}
            onPress={() => onSelect(committee.id)}
          />
        ))}
      </ScrollView>

      {committees.length === 0 && (
        <View style={{ marginTop: spacing.sm }}>
          <AppText variant="caption" color={colors.textMuted}>
            {t.focus.noCommitteeEmpty}
          </AppText>
        </View>
      )}
    </Card>
  );

  function CommitteeOption({
    label,
    color,
    selected,
    muted = false,
    onPress,
  }: {
    label: string;
    color?: string;
    selected: boolean;
    muted?: boolean;
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
            opacity: pressed ? 0.75 : muted ? 0.6 : 1,
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
  options: {
    alignItems: 'center',
  },
  option: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: 220,
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
});
