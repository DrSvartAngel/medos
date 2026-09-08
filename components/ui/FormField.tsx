import React from 'react';
import { View } from 'react-native';
import { VStack } from './gluestack';
import { AppText } from './Typography';
import { useTheme } from '@/hooks/useTheme';

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  error?: string | null;
  helperText?: string | null;
  className?: string;
}

export function FormField({
  label,
  children,
  error,
  helperText,
  className,
}: FormFieldProps) {
  const { colors, spacing } = useTheme();

  return (
    <VStack space="xs" style={{ width: '100%', marginBottom: spacing.xs }} className={className}>
      <AppText variant="label" color={colors.textPrimary}>
        {label}
      </AppText>
      {children}
      {error ? (
        <View accessibilityLiveRegion="polite">
          <AppText variant="caption" color={colors.error}>
            {error}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {helperText}
        </AppText>
      ) : null}
    </VStack>
  );
}
