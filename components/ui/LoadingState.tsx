import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export function LoadingState({
  message,
  size = 'large',
  style,
}: LoadingStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={message ?? 'Loading'}
      accessibilityLiveRegion="polite"
      style={[styles.container, { padding: spacing.xl }, style]}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? (
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={[styles.text, { marginTop: spacing.md }]}
        >
          {message}
        </AppText>
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
  text: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
