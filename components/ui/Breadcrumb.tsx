import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Feather } from '@expo/vector-icons';
import { Interaction } from '@/theme/interaction';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Breadcrumb({ items, accessibilityLabel, style }: BreadcrumbProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={accessibilityLabel ?? 'Breadcrumbs'}
      style={[styles.container, style]}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isClickable = !isLast && Boolean(item.onPress);

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {isClickable ? (
              <TouchableOpacity
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                activeOpacity={Interaction.pressedOpacity}
                style={[styles.touchable, { paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs }]}
              >
                <AppText
                  variant="label"
                  color={colors.primary}
                  numberOfLines={1}
                  style={styles.label}
                >
                  {item.label}
                </AppText>
              </TouchableOpacity>
            ) : (
              <View style={[styles.touchable, { paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs }]}>
                <AppText
                  variant="label"
                  color={isLast ? colors.textPrimary : colors.textSecondary}
                  numberOfLines={1}
                  style={[styles.label, isLast && styles.currentLabel]}
                >
                  {item.label}
                </AppText>
              </View>
            )}

            {!isLast ? (
              <Feather
                name="chevron-right"
                size={14}
                color={colors.textMuted}
                style={{ marginHorizontal: spacing.xxs }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minHeight: Interaction.minTarget,
  },
  touchable: {
    justifyContent: 'center',
    maxWidth: 200,
  },
  label: {
    fontWeight: '500',
  },
  currentLabel: {
    fontWeight: '600',
  },
});
