import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, Heading, GSText } from './gluestack';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon = 'inbox',
  action,
  style,
  className,
}: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${message ?? ''}`}
      style={[styles.container, { padding: spacing.xl }, style]}
      className={className}
    >
      <VStack space="md" style={styles.stack}>
        <Box
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.surfaceHighlight,
              borderRadius: radius.full,
            },
          ]}
        >
          <Feather name={icon} size={24} color={colors.textSecondary} />
        </Box>

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

        {message ? (
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
        ) : null}

        {action ? (
          <Button
            label={action.label}
            onPress={action.onPress}
            variant="secondary"
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
