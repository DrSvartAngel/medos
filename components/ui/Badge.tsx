import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', dot = false, size = 'sm', style }: BadgeProps) {
  const { colors, spacing, radius } = useTheme();

  const bgMap: Record<BadgeVariant, string> = {
    default: colors.surfaceHighlight,
    primary: colors.primaryMuted,
    success: colors.successMuted,
    warning: colors.warningMuted,
    error:   colors.errorMuted,
    info:    colors.infoMuted,
  };

  const textMap: Record<BadgeVariant, string> = {
    default: colors.textSecondary,
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    error:   colors.error,
    info:    colors.info,
  };

  const borderMap: Record<BadgeVariant, string> = {
    default: colors.border,
    primary: colors.primaryMuted,
    success: colors.successMuted,
    warning: colors.warningMuted,
    error:   colors.errorMuted,
    info:    colors.infoMuted,
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
          borderRadius: radius.full,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          paddingVertical: isSmall ? 3 : 5,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            { backgroundColor: textMap[variant], marginRight: spacing.xs },
          ]}
        />
      )}
      <AppText
        variant={isSmall ? 'caption' : 'label'}
        color={textMap[variant]}
        style={{ fontWeight: '600' }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
