import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type CardVariant = 'default' | 'elevated' | 'highlight' | 'outlined';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  padded?: boolean;
  variant?: CardVariant;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'none';
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
}: CardProps) {
  const { colors, spacing, radius, shadows } = useTheme();

  const resolvedVariant: CardVariant = variant ?? (elevated ? 'elevated' : 'default');

  const bgMap: Record<CardVariant, string> = {
    default: colors.surface,
    elevated: colors.surfaceElevated,
    highlight: colors.surfaceHighlight,
    outlined: 'transparent',
  };

  const cardStyle: ViewStyle = {
    backgroundColor: bgMap[resolvedVariant],
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    padding: padded ? spacing.md : 0,
    ...(elevated ? shadows.subtle : shadows.none),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.card,
          cardStyle,
          { opacity: pressed ? 0.85 : 1 },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, cardStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
});
