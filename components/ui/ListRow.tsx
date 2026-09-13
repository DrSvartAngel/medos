import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  type ViewStyle,
  type StyleProp,
  type AccessibilityRole,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
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
      <View style={[styles.hstack, { gap: spacing.md }]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}

        <View style={styles.textStack}>
          <Text
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
              includeFontPadding: false,
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
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
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {value !== undefined ? (
          typeof value === 'string' || typeof value === 'number' ? (
            <Text
              style={{
                color: colors.textMuted,
                fontFamily: FontFamily.medium,
                fontSize: 12,
                includeFontPadding: false,
              }}
            >
              {value}
            </Text>
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
      </View>
    </View>
  );

  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={
          accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)
        }
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, selected }}
        style={({ pressed }) => [
          { opacity: pressed ? Interaction.pressedOpacity : 1 },
        ]}
      >
        {rowContent}
      </Pressable>
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
    flexDirection: 'row',
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
