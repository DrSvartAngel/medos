import React from 'react';
import { ViewStyle, StyleProp, Pressable } from 'react-native';
import { Card as GSCard } from './card/index';

export type CardVariant = 'default' | 'elevated' | 'highlight' | 'outlined';

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
  const resolvedVariant: CardVariant = variant ?? (elevated ? 'elevated' : 'default');

  const variantClass =
    resolvedVariant === 'outlined'
      ? 'bg-transparent border border-border'
      : resolvedVariant === 'highlight'
      ? 'bg-secondary border border-border'
      : resolvedVariant === 'elevated'
      ? 'bg-card border border-border shadow-md'
      : 'bg-card border border-border shadow-sm';

  const paddingClass = padded ? 'p-4' : 'p-0';

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          { opacity: pressed ? 0.85 : 1 },
          style,
        ]}
      >
        <GSCard
          className={`rounded-xl overflow-hidden ${variantClass} ${paddingClass} ${className ?? ''}`}
        >
          {children}
        </GSCard>
      </Pressable>
    );
  }

  return (
    <GSCard
      className={`rounded-xl overflow-hidden ${variantClass} ${paddingClass} ${className ?? ''}`}
      style={style}
    >
      {children}
    </GSCard>
  );
}
