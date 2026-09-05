import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', dot = false, style }: BadgeProps) {
  const { colors, spacing, radius } = useTheme();

  const bgMap: Record<BadgeVariant, string> = {
    default: colors.border,
    primary: colors.primaryMuted,
    success: '#166534',
    warning: '#713F12',
    error:   '#7F1D1D',
    info:    '#1E3A5F',
  };

  const textMap: Record<BadgeVariant, string> = {
    default: colors.textSecondary,
    primary: colors.textPrimary,
    success: colors.success,
    warning: colors.warning,
    error:   colors.error,
    info:    colors.info,
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgMap[variant],
          borderRadius: radius.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: 2,
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
      <AppText variant="caption" color={textMap[variant]} style={{ fontWeight: '600' }}>
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
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
