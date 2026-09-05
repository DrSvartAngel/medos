import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

const PRESET_MINUTES = [15, 25, 45, 60] as const;

interface DurationPickerProps {
  plannedSec: number;
  onSelect: (seconds: number) => void;
}

export function DurationPicker({ plannedSec, onSelect }: DurationPickerProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  return (
    <Card>
      <AppText variant="label">{t.focus.durationLabel}</AppText>
      <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
        {t.focus.durationDesc}
      </AppText>

      <View style={[styles.options, { marginTop: spacing.md, gap: spacing.sm }]}>
        {PRESET_MINUTES.map((minutes) => {
          const selected = plannedSec === minutes * 60;
          return (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(minutes * 60)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? colors.primaryMuted : colors.surfaceElevated,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.75 : 1,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.md,
                },
              ]}
            >
              <AppText
                variant="body"
                color={colors.textPrimary}
                style={styles.optionText}
              >
                {t.adaptiveRec.durationMin(minutes)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    alignItems: 'center',
    borderWidth: 1,
    flexGrow: 1,
    minWidth: '45%',
  },
  optionText: {
    fontWeight: '600',
  },
});
