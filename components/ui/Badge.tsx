import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily } from '@/theme/typography';
import { IconSizes } from '@/theme/icons';

export type BadgeVariant =
  | 'default'
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'danger'
  | 'info';

export interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

/**
 * Badge primitive for compact status, count, and notification semantics.
 * Visually subordinate to primary content.
 */
export function Badge({
  label,
  variant = 'default',
  dot = false,
  size = 'sm',
  icon,
  style,
  textStyle,
  className,
}: BadgeProps) {
  const { colors, spacing, radius, borders } = useTheme();

  const isNeutral = variant === 'default' || variant === 'neutral';

  const bgMap: Record<BadgeVariant, string> = {
    default: colors.surfaceSubtle,
    neutral: colors.surfaceSubtle,
    primary: colors.accentSoft,
    success: colors.successMuted,
    warning: colors.warningMuted,
    error: colors.errorMuted,
    danger: colors.errorMuted,
    info: colors.infoMuted,
  };

  const textMap: Record<BadgeVariant, string> = {
    default: colors.textSecondary,
    neutral: colors.textSecondary,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    danger: colors.error,
    info: colors.info,
  };

  const isSmall = size === 'sm';
  const resolvedColor = textMap[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgMap[variant],
          borderColor: isNeutral ? colors.borderSubtle : bgMap[variant],
          borderWidth: borders.standard,
          borderRadius: radius.pill,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          paddingVertical: isSmall ? 2 : spacing.xs,
        },
        style,
      ]}
      className={className}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: resolvedColor, marginRight: spacing.xs },
          ]}
        />
      )}
      {icon && (
        <Feather
          name={icon}
          size={isSmall ? 10 : IconSizes.xs}
          color={resolvedColor}
          style={{ marginRight: spacing.xxs }}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: resolvedColor,
            fontSize: isSmall ? 11 : 12,
            lineHeight: isSmall ? 15 : 16,
            fontFamily: FontFamily.medium,
            fontWeight: '500',
            textTransform: 'none', // Turkish character safety
          },
          textStyle,
        ]}
      >
        {String(label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
