import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, Heading, GSText } from './gluestack';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily } from '@/theme/typography';
import { IconSizes } from '@/theme/icons';

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  body?: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  action?: EmptyStateAction;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * EmptyState primitive: Restrained, non-illustrative state composition.
 * Presents clear diagnostic guidance and optional recovery actions without visual clutter.
 */
export function EmptyState({
  title,
  message,
  body,
  icon = 'inbox',
  action,
  primaryAction,
  secondaryAction,
  style,
  className,
}: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();

  const resolvedBody = body ?? message;
  const resolvedPrimary = primaryAction ?? action;

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${resolvedBody ?? ''}`}
      style={[styles.container, { padding: spacing.xl }, style]}
      className={className}
    >
      <VStack space="md" style={styles.stack}>
        <Box
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.surfaceSubtle,
              borderRadius: radius.pill,
            },
          ]}
        >
          <Feather name={icon} size={IconSizes.lg} color={colors.textSecondary} />
        </Box>

        <Heading
          size="md"
          style={{
            color: colors.textPrimary,
            textAlign: 'center',
            fontFamily: FontFamily.semibold,
            fontWeight: '600',
            fontSize: 18,
            lineHeight: 24,
          }}
        >
          {title}
        </Heading>

        {resolvedBody ? (
          <GSText
            size="sm"
            style={{
              color: colors.textSecondary,
              textAlign: 'center',
              fontFamily: FontFamily.regular,
              fontSize: 14,
              lineHeight: 20,
              maxWidth: 320,
            }}
          >
            {resolvedBody}
          </GSText>
        ) : null}

        {resolvedPrimary || secondaryAction ? (
          <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.xs }]}>
            {resolvedPrimary ? (
              <Button
                label={resolvedPrimary.label}
                onPress={resolvedPrimary.onPress}
                variant="secondary"
                size="md"
              />
            ) : null}
            {secondaryAction ? (
              <Button
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                variant="ghost"
                size="md"
              />
            ) : null}
          </View>
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
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
