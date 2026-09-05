import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  accessibilityLabel,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, spacing, radius } = useTheme();

  const bgColors: Record<Variant, string> = {
    primary:   colors.primary,
    secondary: colors.surface,
    ghost:     'transparent',
    danger:    colors.error,
  };

  const textColors: Record<Variant, string> = {
    primary:   colors.textInverse,
    secondary: colors.textPrimary,
    ghost:     colors.textSecondary,
    danger:    '#fff',
  };

  const paddings: Record<Size, { horizontal: number; vertical: number }> = {
    sm: { horizontal: spacing.md,  vertical: spacing.xs },
    md: { horizontal: spacing.lg,  vertical: spacing.sm + 2 },
    lg: { horizontal: spacing.xl,  vertical: spacing.md },
  };

  const p = paddings[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      activeOpacity={0.75}
      style={[
        styles.btn,
        {
          backgroundColor: bgColors[variant],
          paddingHorizontal: p.horizontal,
          paddingVertical: p.vertical,
          borderRadius: radius.md,
          borderColor: variant === 'secondary' ? colors.border : 'transparent',
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <AppText
          variant={size === 'sm' ? 'label' : 'body'}
          color={textColors[variant]}
          style={StyleSheet.flatten([{ fontWeight: '600' as const }, textStyle])}
        >
          {label}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
