import React from 'react';
import { View, ActivityIndicator, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { VStack, GSText } from './gluestack';
import { useTheme } from '@/hooks/useTheme';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function LoadingState({
  message,
  size = 'large',
  style,
  className,
}: LoadingStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={message ?? 'Loading'}
      accessibilityLiveRegion="polite"
      style={[styles.container, { padding: spacing.xl }, style]}
      className={className}
    >
      <VStack space="sm" style={styles.stack}>
        <ActivityIndicator size={size} color={colors.primary} />
        {message ? (
          <GSText
            size="sm"
            style={[styles.text, { color: colors.textSecondary }]}
          >
            {message}
          </GSText>
        ) : null}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  stack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
