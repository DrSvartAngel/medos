import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Interaction } from '@/theme/interaction';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
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
  icon,
  iconRight,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, spacing, radius } = useTheme();

  const bgColors: Record<ButtonVariant, string> = {
    primary:   colors.primary,
    secondary: colors.surface,
    ghost:     'transparent',
    danger:    colors.error,
    outline:   'transparent',
  };

  const textColors: Record<ButtonVariant, string> = {
    primary:   colors.textInverse,
    secondary: colors.textPrimary,
    ghost:     colors.textSecondary,
    danger:    colors.textInverse,
    outline:   colors.textPrimary,
  };

  const borderColors: Record<ButtonVariant, string> = {
    primary:   'transparent',
    secondary: colors.border,
    ghost:     'transparent',
    danger:    'transparent',
    outline:   colors.border,
  };

  const paddings: Record<ButtonSize, { horizontal: number; vertical: number }> = {
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
      activeOpacity={Interaction.pressedOpacity}
      style={[
        styles.btn,
        {
          backgroundColor: bgColors[variant],
          paddingHorizontal: p.horizontal,
          paddingVertical: p.vertical,
          borderRadius: radius.md,
          borderColor: borderColors[variant],
          borderWidth: variant === 'secondary' || variant === 'outline' ? 1 : 0,
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: spacing.sm }}>{icon}</View> : null}
          <AppText
            variant={size === 'sm' ? 'label' : 'body'}
            color={textColors[variant]}
            style={StyleSheet.flatten([{ fontWeight: '600' as const }, textStyle])}
          >
            {label}
          </AppText>
          {iconRight ? <View style={{ marginLeft: spacing.sm }}>{iconRight}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: Interaction.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});
