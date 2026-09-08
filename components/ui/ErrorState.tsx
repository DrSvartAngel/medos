import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, Heading, GSText } from './gluestack';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';

export interface ErrorStateProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ErrorState({
  title,
  message,
  action,
  style,
  className,
}: ErrorStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${title ? title + '. ' : ''}${message}`}
      style={[styles.container, { padding: spacing.xl }, style]}
      className={className}
    >
      <VStack space="md" style={styles.stack}>
        <Box
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.errorMuted,
              borderRadius: radius.full,
            },
          ]}
        >
          <Feather name="alert-circle" size={24} color={colors.error} />
        </Box>

        {title ? (
          <Heading
            size="md"
            style={{
              color: colors.textPrimary,
              textAlign: 'center',
              fontWeight: '600',
            }}
          >
            {title}
          </Heading>
        ) : null}

        <GSText
          size="sm"
          style={{
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          {message}
        </GSText>

        {action ? (
          <Button
            label={action.label}
            onPress={action.onPress}
            variant="outline"
            size="md"
            style={{ marginTop: spacing.sm }}
          />
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
  iconWrap: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
