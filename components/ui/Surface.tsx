import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type SurfaceVariant = 'default' | 'subtle' | 'raised';

export interface SurfaceProps {
  children?: React.ReactNode;
  variant?: SurfaceVariant;
  padded?: boolean;
  paddingSize?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * Surface primitive: Generic restrained visual container.
 * Establishes tonal separation without heavy shadows or card clutter.
 */
export function Surface({
  children,
  variant = 'default',
  padded = true,
  paddingSize = 'md',
  bordered = true,
  style,
  className,
}: SurfaceProps) {
  const { colors, radius, spacing, borders } = useTheme();

  const bgMap: Record<SurfaceVariant, string> = {
    default: colors.surface,
    subtle: colors.surfaceSubtle,
    raised: colors.surfaceRaised,
  };

  const paddingMap = {
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: bgMap[variant],
          borderColor: bordered ? colors.borderSubtle : 'transparent',
          borderWidth: bordered ? borders.standard : borders.none,
          borderRadius: radius.card,
          padding: padded ? paddingMap[paddingSize] : 0,
        },
        style,
      ]}
      className={className}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    width: '100%',
  },
});
