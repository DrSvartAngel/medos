import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Feather } from '@expo/vector-icons';
import { Interaction } from '@/theme/interaction';

export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'surface';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'default',
  size = 'md',
  color,
  disabled = false,
  style,
}: IconButtonProps) {
  const { colors, radius } = useTheme();

  const sizeDimensions: Record<IconButtonSize, { button: number; icon: number }> = {
    sm: { button: 36, icon: 16 },
    md: { button: 44, icon: 20 },
    lg: { button: 52, icon: 24 },
  };

  const currentSize = sizeDimensions[size];

  const bgMap: Record<IconButtonVariant, string> = {
    default: colors.surfaceElevated,
    primary: colors.primary,
    ghost: 'transparent',
    danger: colors.errorMuted,
    surface: colors.surface,
  };

  const defaultIconColor: Record<IconButtonVariant, string> = {
    default: colors.textPrimary,
    primary: colors.textInverse,
    ghost: colors.textSecondary,
    danger: colors.error,
    surface: colors.textPrimary,
  };

  const resolvedIconColor = color ?? defaultIconColor[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      activeOpacity={Interaction.pressedOpacity}
      style={[
        styles.button,
        {
          width: currentSize.button,
          height: currentSize.button,
          borderRadius: radius.md,
          backgroundColor: bgMap[variant],
          borderColor: variant === 'ghost' ? 'transparent' : colors.border,
          borderWidth: variant === 'ghost' ? 0 : 1,
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
    >
      <Feather name={icon} size={currentSize.icon} color={resolvedIconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Interaction.minTarget,
    minHeight: Interaction.minTarget,
  },
});
