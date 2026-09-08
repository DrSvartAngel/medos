import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HStack, VStack, Heading, GSText, Pressable as GSPressable } from './gluestack';
import { Badge, type BadgeVariant } from './Badge';
import { useTheme } from '@/hooks/useTheme';
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
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  badgeVariant = 'default',
  action,
  style,
  className,
}: SectionHeaderProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, style]} className={className}>
      <VStack space="xs" style={styles.left}>
        <HStack space="sm" style={styles.titleRow}>
          <Heading
            size="md"
            style={{
              color: colors.textPrimary,
              fontWeight: '600',
              letterSpacing: -0.2,
            }}
          >
            {title}
          </Heading>
          {badge ? (
            <Badge label={badge} variant={badgeVariant} size="sm" />
          ) : null}
        </HStack>
        {subtitle ? (
          <GSText size="xs" style={{ color: colors.textSecondary }}>
            {subtitle}
          </GSText>
        ) : null}
      </VStack>

      {action ? (
        <GSPressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          style={({ pressed }: { pressed: boolean }) => [
            styles.actionBtn,
            {
              opacity: pressed ? Interaction.pressedOpacity : 1,
              paddingVertical: spacing.xs,
              paddingHorizontal: spacing.sm,
            },
          ]}
        >
          <GSText
            size="xs"
            style={{
              color: colors.primary,
              fontWeight: '600',
            }}
          >
            {action.label}
          </GSText>
          {action.icon ? (
            <Feather
              name={action.icon}
              size={14}
              color={colors.primary}
              style={{ marginLeft: spacing.xxs }}
            />
          ) : null}
        </GSPressable>
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
