import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';
import { Button } from './Button';
import { Feather } from '@expo/vector-icons';

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function ErrorState({
  title,
  message,
  action,
  style,
}: ErrorStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title ? title + '. ' : ''}${message}`}
      style={[styles.container, { padding: spacing.xl }, style]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: colors.errorMuted,
            borderRadius: radius.full,
            marginBottom: spacing.md,
          },
        ]}
      >
        <Feather name="alert-triangle" size={28} color={colors.error} />
      </View>

      {title ? (
        <AppText variant="h3" color={colors.textPrimary} style={styles.textCenter}>
          {title}
        </AppText>
      ) : null}

      <AppText
        variant="bodySmall"
        color={colors.textSecondary}
        style={[styles.textCenter, { marginTop: spacing.xs, maxWidth: 320 }]}
      >
        {message}
      </AppText>

      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="outline"
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
