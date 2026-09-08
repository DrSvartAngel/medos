import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Interaction } from '@/theme/interaction';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  borderBottom?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron = false,
  destructive = false,
  disabled = false,
  borderBottom = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ListRowProps) {
  const { colors, spacing } = useTheme();

  const isInteractive = Boolean(onPress && !disabled);

  const content = (
    <View
      style={[
        styles.row,
        {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderBottomColor: borderBottom ? colors.border : 'transparent',
          borderBottomWidth: borderBottom ? 1 : 0,
          opacity: disabled ? Interaction.disabledOpacity : 1,
        },
        style,
      ]}
    >
      {leading ? <View style={{ marginRight: spacing.md }}>{leading}</View> : null}

      <View style={styles.textContainer}>
        <AppText
          variant="subhead"
          color={destructive ? colors.error : colors.textPrimary}
          numberOfLines={1}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            variant="caption"
            color={colors.textSecondary}
            numberOfLines={2}
            style={{ marginTop: 2 }}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {trailing ? <View style={{ marginLeft: spacing.sm }}>{trailing}</View> : null}

      {chevron ? (
        <Feather
          name="chevron-right"
          size={18}
          color={colors.textMuted}
          style={{ marginLeft: spacing.xs }}
        />
      ) : null}
    </View>
  );

  if (isInteractive) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
        accessibilityHint={accessibilityHint}
        activeOpacity={Interaction.pressedOpacity}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: Interaction.minTarget, // guaranteed >=44pt
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
