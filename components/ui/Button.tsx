import React from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
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
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.btn,
        {
          minHeight: size === 'sm' ? 36 : size === 'lg' ? 52 : Interaction.minTarget,
          backgroundColor: bgColors[variant],
          borderColor: borderColors[variant],
          borderWidth: isBordered ? borders.standard : borders.none,
          borderRadius: radius.control,
          paddingHorizontal:
            size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg,
          opacity: disabled ? Interaction.disabledOpacity : pressed ? Interaction.pressedOpacity : 1,
        },
        style,
      ]}
      className={className}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <>
          {icon ? <View style={{ marginRight: spacing.xs }}>{icon}</View> : null}
          {text ? (
            <Text
              style={[
                styles.btnText,
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
            </Text>
          ) : null}
          {iconRight ? <View style={{ marginLeft: spacing.xs }}>{iconRight}</View> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: Interaction.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
