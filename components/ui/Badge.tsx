import React from 'react';
import { View, StyleSheet, type ViewStyle, type TextStyle, type StyleProp } from 'react-native';
import { Badge as GSBadge, BadgeText } from './badge/index';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

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
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ComponentProps<typeof Feather>['name'];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  className?: string;
}

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
  const { colors, spacing, radius } = useTheme();

  const isNeutral = variant === 'default' || variant === 'neutral';
  const isDanger = variant === 'error' || variant === 'danger';

  const bgMap: Record<BadgeVariant, string> = {
    default: colors.surfaceHighlight,
    neutral: colors.surfaceHighlight,
    primary: colors.primaryMuted,
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
    <GSBadge
      style={[
        styles.badge,
        {
          backgroundColor: bgMap[variant],
          borderColor: isNeutral ? colors.cardBorder : bgMap[variant],
          borderWidth: 1,
          borderRadius: radius.full,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          paddingVertical: isSmall ? 2 : 4,
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
          size={isSmall ? 10 : 12}
          color={resolvedColor}
          style={{ marginRight: spacing.xxs }}
        />
      )}
      <BadgeText
        style={[
          styles.text,
          {
            color: resolvedColor,
            fontSize: isSmall ? 11 : 12,
            lineHeight: isSmall ? 14 : 16,
            fontWeight: '600',
            textTransform: 'none', // Turkish character safety
          },
          textStyle,
        ]}
      >
        {label}
      </BadgeText>
    </GSBadge>
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
  },
});
