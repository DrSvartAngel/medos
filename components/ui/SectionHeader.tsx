import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge, type BadgeVariant } from './Badge';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';
import { FontFamily } from '@/theme/typography';
import { IconSizes } from '@/theme/icons';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
  count?: number | string;
  action?: {
    label: string;
    onPress: () => void;
    icon?: React.ComponentProps<typeof Feather>['name'];
  };
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * SectionHeader primitive: Structural header establishing hierarchy primarily through type and spacing.
 * Never styled as a card container.
 */
export function SectionHeader({
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  count,
  action,
  style,
  className,
}: SectionHeaderProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, style]} className={className}>
      <View style={styles.left}>
        <View style={[styles.titleRow, { gap: spacing.sm }]}>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: FontFamily.semibold,
              fontWeight: '600',
              fontSize: 20,
              lineHeight: 26,
              letterSpacing: -0.3,
              includeFontPadding: false,
            }}
          >
            {title}
          </Text>
          {count !== undefined ? (
            <Badge label={count} variant="neutral" size="sm" />
          ) : null}
          {badge ? (
            <Badge label={badge} variant={badgeVariant} size="sm" />
          ) : null}
        </View>
        {subtitle ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontFamily: FontFamily.regular,
              fontSize: 12,
              lineHeight: 16,
              marginTop: spacing.xxs,
              includeFontPadding: false,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          style={({ pressed }) => [
            styles.actionBtn,
            {
              opacity: pressed ? Interaction.pressedOpacity : 1,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: FontFamily.semibold,
              fontWeight: '600',
              fontSize: 13,
              includeFontPadding: false,
            }}
          >
            {action.label}
          </Text>
          {action.icon ? (
            <Feather
              name={action.icon}
              size={IconSizes.sm}
              color={colors.primary}
              style={{ marginLeft: spacing.xxs }}
            />
          ) : null}
        </Pressable>
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
    width: '100%',
  },
  left: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
});
