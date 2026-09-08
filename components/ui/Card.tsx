import React from 'react';
import { ViewStyle, StyleProp, Pressable } from 'react-native';
import { Card as GSCard } from './card/index';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';

export type CardVariant = 'default' | 'elevated' | 'highlight' | 'outlined' | 'interactive' | 'subtle';

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
  variant?: CardVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
  className?: string;
}

export function Card({
  children,
  style,
  elevated = false,
  padded = true,
  variant,
  onPress,
  accessibilityLabel,
  accessibilityRole,
  className,
}: CardProps) {
  const { colors, radius, spacing } = useTheme();

  const resolvedVariant: CardVariant =
    variant ?? (onPress ? 'interactive' : elevated ? 'elevated' : 'default');

  const bgColors: Record<CardVariant, string> = {
    default: colors.surface,
    elevated: colors.surface,
    interactive: colors.surface,
    subtle: colors.surfaceElevated,
    highlight: colors.surfaceHighlight,
    outlined: 'transparent',
  };

  const borderColors: Record<CardVariant, string> = {
    default: colors.cardBorder,
    elevated: colors.cardBorder,
    interactive: colors.cardBorder,
    subtle: colors.cardBorder,
    highlight: colors.cardBorder,
    outlined: colors.cardBorder,
  };

  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: bgColors[resolvedVariant],
      borderColor: borderColors[resolvedVariant],
      borderWidth: 1,
      borderRadius: radius.lg,
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
        style={({ pressed }) => [
          { opacity: pressed ? Interaction.pressedOpacity : 1 },
        ]}
      >
        <GSCard
          className={`overflow-hidden ${className ?? ''}`}
          style={cardStyle}
        >
          {children}
        </GSCard>
      </Pressable>
    );
  }

  return (
    <GSCard
      className={`overflow-hidden ${className ?? ''}`}
      style={cardStyle}
    >
      {children}
    </GSCard>
  );
}
