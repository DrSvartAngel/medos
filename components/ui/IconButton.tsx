import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Pressable as GSPressable } from './gluestack';
import { useTheme } from '@/hooks/useTheme';
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
  style?: StyleProp<ViewStyle>;
  className?: string;
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
  className,
}: IconButtonProps) {
  const { colors, radius } = useTheme();

  const sizeDimensions: Record<IconButtonSize, { button: number; icon: number }> = {
    sm: { button: 44, icon: 16 },
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
    <GSPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        {
          width: currentSize.button,
          height: currentSize.button,
          borderRadius: radius.md,
          backgroundColor: bgMap[variant],
          borderColor: variant === 'ghost' ? 'transparent' : colors.cardBorder,
          borderWidth: variant === 'ghost' ? 0 : 1,
          opacity: disabled
            ? Interaction.disabledOpacity
            : pressed
            ? Interaction.pressedOpacity
            : 1,
        },
        style,
      ]}
      className={className}
    >
      <Feather name={icon} size={currentSize.icon} color={resolvedIconColor} />
    </GSPressable>
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
