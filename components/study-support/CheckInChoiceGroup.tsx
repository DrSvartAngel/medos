import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';

interface CheckInChoice<T extends string> {
  value: T;
  label: string;
}

interface CheckInChoiceGroupProps<T extends string> {
  title: string;
  choices: readonly CheckInChoice<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
}

export function CheckInChoiceGroup<T extends string>({
  title,
  choices,
  selected,
  onSelect,
}: CheckInChoiceGroupProps<T>) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={title}>
      <AppText variant="h3">{title}</AppText>
      <View style={[styles.choices, { gap: spacing.sm, marginTop: spacing.md }]}>
        {choices.map((choice) => {
          const isSelected = choice.value === selected;
          return (
            <TouchableOpacity
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ checked: isSelected }}
              activeOpacity={0.75}
              onPress={() => onSelect(choice.value)}
              style={[
                styles.choice,
                {
                  backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.md,
                },
              ]}
            >
              <AppText
                variant="body"
                color={isSelected ? colors.textPrimary : undefined}
                style={styles.choiceLabel}
              >
                {choice.label}
              </AppText>
              {isSelected ? (
                <Feather
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  name="check-circle"
                  size={21}
                  color={colors.textPrimary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  choices: {
    width: '100%',
  },
  choice: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    width: '100%',
  },
  choiceLabel: {
    flex: 1,
    fontWeight: '600',
  },
});
