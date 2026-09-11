import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from './Typography';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';
import { IconSizes } from '@/theme/icons';
import { FontFamily } from '@/theme/typography';

export type TagVariant =
  | 'neutral'
  | 'selected'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error';

export type TagSize = 'sm' | 'md';

export interface TagProps {
  label: string;
  variant?: TagVariant;
  size?: TagSize;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/**
 * Tag / Chip primitive for academic context, filter chips, and lightweight metadata.
 * Restrained Neutral Zen styling with pill radius and optional interactive states.
 */
export function Tag({
  label,
  variant = 'neutral',
  size = 'md',
  selected = false,
  onPress,
  onRemove,
  icon,
  style,
  textStyle,
  className,
  accessibilityLabel,
  disabled = false,
}: TagProps) {
  const { colors, spacing, radius, borders } = useTheme();

  const isInteractive = Boolean(onPress && !disabled);
  const isSelected = selected || variant === 'selected';

  const bgMap: Record<TagVariant, string> = {
    neutral: isSelected ? colors.accentSoft : colors.surfaceSubtle,
    selected: colors.accentSoft,
    accent: colors.accentSoft,
    success: colors.successMuted,
    warning: colors.warningMuted,
    error: colors.errorMuted,
  };

  const borderMap: Record<TagVariant, string> = {
    neutral: isSelected ? colors.accentMoss : colors.borderSubtle,
    selected: colors.accentMoss,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  const textMap: Record<TagVariant, string> = {
    neutral: isSelected ? colors.accentMoss : colors.textSecondary,
    selected: colors.accentMoss,
    accent: colors.accentMoss,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  };

  const isSmall = size === 'sm';
  const resolvedTextColor = textMap[variant];
  const iconSize = isSmall ? IconSizes.xs : 14;

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
          borderWidth: borders.standard,
          borderRadius: radius.pill,
          paddingHorizontal: isSmall ? spacing.sm : spacing.smd,
          paddingVertical: isSmall ? spacing.xxs : spacing.xs,
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
      className={className}
    >
      {icon ? (
        <Feather
          name={icon}
          size={iconSize}
          color={resolvedTextColor}
          style={{ marginRight: spacing.xs }}
        />
      ) : null}

      <AppText
        variant="labelS"
        color={resolvedTextColor}
        style={[
          styles.text,
          {
            fontFamily: isSelected ? FontFamily.semibold : FontFamily.medium,
            fontWeight: isSelected ? '600' : '500',
            fontSize: isSmall ? 11 : 12,
            lineHeight: isSmall ? 15 : 16,
          },
          textStyle,
        ]}
      >
        {label}
      </AppText>

      {onRemove ? (
        <TouchableOpacity
          onPress={onRemove}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={{ marginLeft: spacing.xs }}
        >
          <Feather name="x" size={iconSize} color={resolvedTextColor} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (isInteractive) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected: isSelected, disabled }}
        activeOpacity={Interaction.pressedOpacity}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

/** Chip is a canonical alias for Tag */
export function Chip(props: TagProps) {
  return <Tag {...props} />;
}
export type ChipProps = TagProps;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    letterSpacing: 0.1,
  },
});
