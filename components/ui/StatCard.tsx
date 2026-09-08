import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Card } from './Card';
import { Feather } from '@expo/vector-icons';

export interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  iconColor?: string;
  iconBg?: string;
  actionLabel?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function StatCard({
  label,
  value,
  subvalue,
  icon,
  iconColor,
  iconBg,
  actionLabel,
  onPress,
  accessibilityLabel,
  style,
}: StatCardProps) {
  const { colors, spacing, radius } = useTheme();

  const resolvedIconColor = iconColor ?? colors.primary;
  const resolvedIconBg = iconBg ?? colors.primaryMuted;

  const content = (
    <Card style={[styles.card, style]}>
      <View style={styles.headerRow}>
        {icon ? (
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: resolvedIconBg,
                borderRadius: radius.sm,
                marginRight: spacing.sm,
              },
            ]}
          >
            <Feather name={icon} size={18} color={resolvedIconColor} />
          </View>
        ) : null}
        <AppText variant="label" color={colors.textSecondary} style={{ flex: 1 }}>
          {label}
        </AppText>
      </View>

      <AppText variant="stat" color={colors.textPrimary} style={{ marginTop: spacing.sm }}>
        {value}
      </AppText>

      {subvalue ? (
        <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xxs }}>
          {subvalue}
        </AppText>
      ) : null}

      {actionLabel ? (
        <View style={[styles.footer, { marginTop: spacing.md, borderTopColor: colors.borderFaint }]}>
          <AppText variant="caption" color={colors.textMuted} style={styles.footerText}>
            {actionLabel}
          </AppText>
          <Feather name="chevron-right" size={14} color={colors.textMuted} />
        </View>
      ) : null}
    </Card>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerText: {
    flex: 1,
    fontWeight: '600',
  },
});
