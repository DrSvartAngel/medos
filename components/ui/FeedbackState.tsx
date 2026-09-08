import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from './Typography';
import { Button } from './Button';
import { Layout } from '@/theme/layout';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  kind: 'loading' | 'empty' | 'error';
  message: string;
  action?: { label: string; onPress: () => void };
};

/** Supplied copy/actions only; never fetches, retries, or navigates by itself. */
export function FeedbackState({ kind, message, action }: Props) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: Layout.gap }} accessibilityLiveRegion={kind === 'error' ? 'polite' : 'none'}>
      {kind === 'loading' ? <ActivityIndicator accessible={false} color={colors.primary} /> : null}
      <AppText color={kind === 'error' ? colors.error : undefined}>{message}</AppText>
      {action ? <Button label={action.label} onPress={action.onPress} /> : null}
    </View>
  );
}
