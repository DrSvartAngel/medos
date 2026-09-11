import React from 'react';
import {
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
  type AccessibilityRole,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { HStack, VStack, GSText, Pressable as GSPressable } from './gluestack';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';
import { FontFamily } from '@/theme/typography';
import { IconSizes } from '@/theme/icons';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  value?: string | number | React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  selected?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  borderBottom?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * ListRow primitive: Reusable row for academic lists, settings, review decks, and materials.
 * Supports leading/trailing elements, chevrons, selection states, and accessible touch targets.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  value,
  onPress,
  chevron = false,
  selected = false,
  destructive = false,
  disabled = false,
  borderBottom = true,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  style,
  className,
}: ListRowProps) {
  const { colors, spacing, borders } = useTheme();
  const isInteractive = Boolean(onPress && !disabled);

  const rowContent = (
    <View
      style={[
        styles.row,
        {
          minHeight: Interaction.minTarget,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          backgroundColor: selected ? colors.accentSoft : 'transparent',
          borderBottomColor: borderBottom ? colors.borderSubtle : 'transparent',
          borderBottomWidth: borderBottom ? borders.standard : borders.none,
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
      className={className}
    >
      <HStack space="md" style={styles.hstack}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}

        <VStack space="xs" style={styles.textStack}>
          <GSText
            size="sm"
            style={{
              color: destructive
                ? colors.error
                : selected
                ? colors.accentMoss
                : colors.textPrimary,
              fontFamily: FontFamily.semibold,
              fontWeight: '600',
              fontSize: 14,
              lineHeight: 20,
            }}
            numberOfLines={2}
          >
            {title}
          </GSText>
          {subtitle ? (
            <GSText
              size="xs"
              style={{
                color: colors.textSecondary,
                fontFamily: FontFamily.regular,
                fontSize: 12,
                lineHeight: 16,
              }}
              numberOfLines={2}
            >
              {subtitle}
            </GSText>
          ) : null}
        </VStack>

        {value !== undefined ? (
          typeof value === 'string' || typeof value === 'number' ? (
            <GSText
              size="xs"
              style={{
                color: colors.textMuted,
                fontFamily: FontFamily.medium,
                fontSize: 12,
              }}
            >
              {value}
            </GSText>
          ) : (
            value
          )
        ) : null}

        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}

        {chevron ? (
          <Feather
            name="chevron-right"
            size={IconSizes.sm}
            color={selected ? colors.accentMoss : colors.textMuted}
            style={{ marginLeft: spacing.xxs }}
          />
        ) : null}
      </HStack>
    </View>
  );

  if (isInteractive) {
    return (
      <GSPressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={
          accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)
        }
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, selected }}
        style={({ pressed }: { pressed: boolean }) => [
          { opacity: pressed ? Interaction.pressedOpacity : 1 },
        ]}
      >
        {rowContent}
      </GSPressable>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)
      }
    >
      {rowContent}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    justifyContent: 'center',
  },
  hstack: {
    alignItems: 'center',
    width: '100%',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textStack: {
    flex: 1,
    justifyContent: 'center',
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
