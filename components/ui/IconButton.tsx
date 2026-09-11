import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Pressable as GSPressable } from './gluestack';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';
import { IconSizes } from '@/theme/icons';

export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger' | 'surface';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  color?: string;
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * IconButton primitive: Restrained single-icon interactive control.
 * Features 44pt minimum hit target, canonical icon sizes, and selected/active state support.
 */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'default',
  size = 'md',
  color,
  selected = false,
  disabled = false,
  style,
  className,
}: IconButtonProps) {
  const { colors, radius, borders } = useTheme();

  const sizeDimensions: Record<IconButtonSize, { button: number; icon: number }> = {
    sm: { button: 44, icon: IconSizes.sm },
    md: { button: 44, icon: IconSizes.md },
    lg: { button: 52, icon: IconSizes.lg },
  };

  const currentSize = sizeDimensions[size];

  const bgMap: Record<IconButtonVariant, string> = {
    default: selected ? colors.accentSoft : colors.surfaceSubtle,
    primary: colors.primary,
    ghost: selected ? colors.accentSoft : 'transparent',
    danger: colors.errorMuted,
    surface: selected ? colors.accentSoft : colors.surface,
  };

  const defaultIconColor: Record<IconButtonVariant, string> = {
    default: selected ? colors.accentMoss : colors.textPrimary,
    primary: colors.textInverse,
    ghost: selected ? colors.accentMoss : colors.textSecondary,
    danger: colors.error,
    surface: selected ? colors.accentMoss : colors.textPrimary,
  };

  const resolvedIconColor = color ?? defaultIconColor[variant];
  const isBordered = variant !== 'ghost' || selected;

  return (
    <GSPressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      hitSlop={4}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        {
          width: currentSize.button,
          height: currentSize.button,
          borderRadius: radius.control,
          backgroundColor: bgMap[variant],
          borderColor: selected
            ? colors.accentMoss
            : isBordered
            ? colors.borderSubtle
            : 'transparent',
          borderWidth: isBordered ? borders.standard : borders.none,
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
