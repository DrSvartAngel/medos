import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Badge, type BadgeVariant } from './Badge';
import { Feather } from '@expo/vector-icons';
import { Interaction } from '@/theme/interaction';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  action?: {
    label: string;
    onPress: () => void;
    icon?: React.ComponentProps<typeof Feather>['name'];
  };
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  action,
  style,
}: SectionHeaderProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <AppText variant="h3" color={colors.textPrimary}>
            {title}
          </AppText>
          {badge ? (
            <Badge
              label={badge}
              variant={badgeVariant}
              style={{ marginLeft: spacing.sm }}
            />
          ) : null}
        </View>
        {subtitle ? (
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xxs }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {action ? (
        <TouchableOpacity
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          activeOpacity={Interaction.pressedOpacity}
          style={[styles.actionBtn, { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm }]}
        >
          <AppText variant="label" color={colors.primary} style={{ fontWeight: '600' }}>
            {action.label}
          </AppText>
          {action.icon ? (
            <Feather
              name={action.icon}
              size={14}
              color={colors.primary}
              style={{ marginLeft: spacing.xs }}
            />
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  left: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
});
