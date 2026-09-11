import React from 'react';
import { View, StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import {
  Button as GSButton,
  ButtonText,
  ButtonSpinner,
} from './button/index';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';
import { FontFamily } from '@/theme/typography';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'destructive'
  | 'outline'
  | 'text'
  | 'quiet';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label?: string;
  title?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

/**
 * Button primitive: Primary, secondary, ghost, and destructive actions.
 * Restrained Neutral Zen character: Deep moss primary CTA, subtle secondary borders, stable layout.
 */
export function Button({
  label,
  title,
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
  className,
}: ButtonProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const text = label ?? title ?? '';

  // Map MedOS variant to Gluestack Button variant
  const gsVariant =
    variant === 'primary'
      ? 'default'
      : variant === 'danger' || variant === 'destructive'
      ? 'destructive'
      : variant === 'secondary'
      ? 'secondary'
      : variant === 'outline'
      ? 'outline'
      : 'ghost';

  // Map MedOS size to Gluestack Button size
  const gsSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default';

  // Explicit semantic color overrides for exact Light/Dark parity
  const bgColors: Record<ButtonVariant, string> = {
    primary: colors.primary,
    secondary: colors.surfaceSubtle,
    outline: 'transparent',
    ghost: 'transparent',
    text: 'transparent',
    quiet: 'transparent',
    danger: colors.error,
    destructive: colors.error,
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: colors.textInverse,
    secondary: colors.textPrimary,
    outline: colors.textPrimary,
    ghost: colors.textSecondary,
    text: colors.textSecondary,
    quiet: colors.textSecondary,
    danger: colors.textInverse,
    destructive: colors.textInverse,
  };

  const borderColors: Record<ButtonVariant, string> = {
    primary: 'transparent',
    secondary: colors.borderSubtle,
    outline: colors.borderSubtle,
    ghost: 'transparent',
    text: 'transparent',
    quiet: 'transparent',
    danger: 'transparent',
    destructive: 'transparent',
  };

  const isBordered = variant === 'secondary' || variant === 'outline';

  return (
    <GSButton
      onPress={onPress}
      disabled={disabled || loading}
      variant={gsVariant}
      size={gsSize}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.btn,
        {
          minHeight: Interaction.minTarget,
          backgroundColor: bgColors[variant],
          borderColor: borderColors[variant],
          borderWidth: isBordered ? borders.standard : borders.none,
          borderRadius: radius.control,
          paddingHorizontal:
            size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg,
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
      className={className}
    >
      {loading ? (
        <ButtonSpinner color={textColors[variant]} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
          <ButtonText
            style={[
              {
                color: textColors[variant],
                fontFamily: FontFamily.semibold,
                fontWeight: '600',
                fontSize: size === 'sm' ? 13 : 14,
                lineHeight: size === 'sm' ? 18 : 20,
              },
              textStyle,
            ]}
          >
            {text}
          </ButtonText>
          {iconRight ? <View style={{ marginLeft: spacing.xs }}>{iconRight}</View> : null}
        </>
      )}
    </GSButton>
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
