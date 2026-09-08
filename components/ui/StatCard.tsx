import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from './Card';
import { Box, HStack, VStack, Heading, GSText, Pressable as GSPressable } from './gluestack';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';

export interface StatCardTrend {
  value: string | number;
  direction?: 'up' | 'down' | 'neutral';
  label?: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  iconColor?: string;
  iconBg?: string;
  trend?: StatCardTrend;
  actionLabel?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function StatCard({
  label,
  value,
  subvalue,
  icon,
  iconColor,
  iconBg,
  trend,
  actionLabel,
  onPress,
  accessibilityLabel,
  style,
  className,
}: StatCardProps) {
  const { colors, spacing, radius } = useTheme();

  const resolvedIconColor = iconColor ?? colors.primary;
  const resolvedIconBg = iconBg ?? colors.primaryMuted;

  const cardContent = (
    <Card style={[styles.card, style]} className={className}>
      <VStack space="xs">
        {/* Header: icon & label */}
        <HStack space="sm" style={styles.headerRow}>
          {icon ? (
            <Box
              style={[
                styles.iconWrap,
                {
                  backgroundColor: resolvedIconBg,
                  borderRadius: radius.sm,
                },
              ]}
            >
              <Feather name={icon} size={16} color={resolvedIconColor} />
            </Box>
          ) : null}
          <GSText
            size="xs"
            style={{
              color: colors.textSecondary,
              fontWeight: '600',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {label}
          </GSText>
        </HStack>

        {/* Headline value */}
        <Heading
          size="xl"
          style={{
            color: colors.textPrimary,
            fontWeight: '700',
            letterSpacing: -0.5,
            marginTop: 2,
          }}
        >
          {value}
        </Heading>

        {/* Factual trend if present */}
        {trend ? (
          <HStack space="xs" style={{ alignItems: 'center', marginTop: 2 }}>
            <Feather
              name={
                trend.direction === 'up'
                  ? 'trending-up'
                  : trend.direction === 'down'
                  ? 'trending-down'
                  : 'minus'
              }
              size={12}
              color={
                trend.direction === 'up'
                  ? colors.success
                  : trend.direction === 'down'
                  ? colors.error
                  : colors.textMuted
              }
            />
            <GSText
              size="xs"
              style={{
                color:
                  trend.direction === 'up'
                    ? colors.success
                    : trend.direction === 'down'
                    ? colors.error
                    : colors.textMuted,
                fontWeight: '600',
              }}
            >
              {trend.value}
            </GSText>
            {trend.label ? (
              <GSText size="xs" style={{ color: colors.textMuted }}>
                {trend.label}
              </GSText>
            ) : null}
          </HStack>
        ) : null}

        {/* Subvalue supporting text */}
        {subvalue ? (
          <GSText
            size="xs"
            style={{
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            {subvalue}
          </GSText>
        ) : null}

        {/* Action footer if interactive */}
        {actionLabel ? (
          <HStack
            style={[
              styles.footer,
              {
                borderTopColor: colors.cardBorder,
                marginTop: spacing.sm,
              },
            ]}
          >
            <GSText
              size="xs"
              style={{
                color: colors.primary,
                fontWeight: '600',
                flex: 1,
              }}
            >
              {actionLabel}
            </GSText>
            <Feather name="chevron-right" size={14} color={colors.primary} />
          </HStack>
        ) : null}
      </VStack>
    </Card>
  );

  if (onPress) {
    return (
      <GSPressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
        style={({ pressed }: { pressed: boolean }) => [
          { opacity: pressed ? Interaction.pressedOpacity : 1 },
        ]}
      >
        {cardContent}
      </GSPressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
