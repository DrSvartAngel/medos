import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Feather } from '@expo/vector-icons';
import { Interaction } from '@/theme/interaction';

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string = string>({
  options,
  selectedId,
  onSelect,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.xxs,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;
        return (
          <TouchableOpacity
            key={option.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            activeOpacity={Interaction.pressedOpacity}
            onPress={() => onSelect(option.id)}
            style={[
              styles.segment,
              {
                borderRadius: radius.sm,
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderColor: isSelected ? colors.border : 'transparent',
                borderWidth: isSelected ? 1 : 0,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.sm,
              },
            ]}
          >
            {option.icon ? (
              <Feather
                name={option.icon}
                size={15}
                color={isSelected ? colors.primary : colors.textMuted}
                style={{ marginRight: spacing.xs }}
              />
            ) : null}
            <AppText
              variant="label"
              color={isSelected ? colors.textPrimary : colors.textSecondary}
              style={{ fontWeight: isSelected ? '600' : '400' }}
            >
              {option.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
});
