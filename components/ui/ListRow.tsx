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

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  value?: string | number | React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  borderBottom?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  value,
  onPress,
  chevron = false,
  destructive = false,
  disabled = false,
  borderBottom = true,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  style,
  className,
}: ListRowProps) {
  const { colors, spacing } = useTheme();
  const isInteractive = Boolean(onPress && !disabled);

  const rowContent = (
    <View
      style={[
        styles.row,
        {
          minHeight: Interaction.minTarget,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderBottomColor: borderBottom ? colors.cardBorder : 'transparent',
          borderBottomWidth: borderBottom ? 1 : 0,
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
              color: destructive ? colors.error : colors.textPrimary,
              fontWeight: '600',
            }}
            numberOfLines={2}
          >
            {title}
          </GSText>
          {subtitle ? (
            <GSText
              size="xs"
              style={{ color: colors.textSecondary }}
              numberOfLines={2}
            >
              {subtitle}
            </GSText>
          ) : null}
        </VStack>

        {value !== undefined ? (
          typeof value === 'string' || typeof value === 'number' ? (
            <GSText size="xs" style={{ color: colors.textMuted }}>
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
            size={18}
            color={colors.textMuted}
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
        accessibilityState={{ disabled }}
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
