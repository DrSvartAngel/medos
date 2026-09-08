import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function EmptyState({
  title,
  message,
  icon = 'inbox',
  action,
  style,
}: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${message ?? ''}`}
      style={[styles.container, { padding: spacing.xl }, style]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.surfaceHighlight,
            borderRadius: radius.full,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Feather name={icon} size={28} color={colors.textSecondary} />
      </View>

      <AppText variant="h3" color={colors.textPrimary} style={styles.textCenter}>
        {title}
      </AppText>

      {message ? (
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={[styles.textCenter, { marginTop: spacing.xs, maxWidth: 320 }]}
        >
          {message}
        </AppText>
      ) : null}

      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          size="md"
          style={{ marginTop: spacing.lg }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
});
