import React from 'react';
import { View, ViewStyle, StyleProp, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';

export type CardVariant =
  | 'default'
  | 'elevated'
  | 'highlight'
  | 'outlined'
  | 'interactive'
  | 'subtle'
  | 'selected';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
  variant?: CardVariant;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
  className?: string;
}

/**
 * Card primitive: Modular grouped content surface or interactive container.
 * Restrained Neutral Zen character: subtle borders, zero heavy elevation shadows.
 */
export function Card({
  children,
  style,
  elevated = false,
  padded = true,
  variant,
  selected = false,
  onPress,
  accessibilityLabel,
  accessibilityRole,
  className,
}: CardProps) {
  const { colors, radius, spacing, borders } = useTheme();

  const resolvedVariant: CardVariant =
    variant ??
    (selected
      ? 'selected'
      : onPress
      ? 'interactive'
      : elevated
      ? 'elevated'
      : 'default');

  const bgColors: Record<CardVariant, string> = {
    default: colors.surface,
    elevated: colors.surfaceRaised,
    interactive: colors.surface,
    subtle: colors.surfaceSubtle,
    highlight: colors.surfaceSubtle,
    outlined: 'transparent',
    selected: colors.accentSoft,
  };

  const borderColors: Record<CardVariant, string> = {
    default: colors.borderSubtle,
    elevated: colors.borderSubtle,
    interactive: colors.borderSubtle,
    subtle: colors.borderSubtle,
    highlight: colors.borderSubtle,
    outlined: colors.borderSubtle,
    selected: colors.accentMoss,
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: bgColors[resolvedVariant],
      borderColor: borderColors[resolvedVariant],
      borderWidth: borders.standard,
      borderRadius: radius.card,
      padding: padded ? spacing.md : 0,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          cardStyle,
          { opacity: pressed ? Interaction.pressedOpacity : 1 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={cardStyle}
      accessibilityRole={accessibilityRole ?? 'none'}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
