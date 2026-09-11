import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Feather } from '@expo/vector-icons';
import { Interaction } from '@/theme/interaction';
import { FontFamily } from '@/theme/typography';
import { IconSizes } from '@/theme/icons';

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

/**
 * SegmentedControl primitive: Local filter and view-mode selector.
 * Restrained academic aesthetic with clear active state and touch targets.
 */
export function SegmentedControl<T extends string = string>({
  options,
  selectedId,
  onSelect,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const { colors, spacing, radius, borders } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceSubtle,
          borderColor: colors.borderSubtle,
          borderWidth: borders.standard,
          borderRadius: radius.control,
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
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            accessibilityLabel={option.label}
            activeOpacity={Interaction.pressedOpacity}
            onPress={() => onSelect(option.id)}
            style={[
              styles.segment,
              {
                borderRadius: radius.controlSmall,
                backgroundColor: isSelected ? colors.surface : 'transparent',
                borderColor: isSelected ? colors.borderSubtle : 'transparent',
                borderWidth: isSelected ? borders.standard : borders.none,
                paddingVertical: spacing.xs + 2,
                paddingHorizontal: spacing.sm,
              },
            ]}
          >
            {option.icon ? (
              <Feather
                name={option.icon}
                size={IconSizes.sm}
                color={isSelected ? colors.accentMoss : colors.textMuted}
                style={{ marginRight: spacing.xs }}
              />
            ) : null}
            <AppText
              variant="labelM"
              color={isSelected ? colors.textPrimary : colors.textSecondary}
              style={{
                fontFamily: isSelected ? FontFamily.semibold : FontFamily.medium,
                fontWeight: isSelected ? '600' : '500',
              }}
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
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Interaction.minTarget,
  },
});
