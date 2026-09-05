import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppText } from './Typography';
import { Button } from './Button';
import { Layout } from '@/theme/layout';

type Props = {
  kind: 'loading' | 'empty' | 'error';
  message: string;
  action?: { label: string; onPress: () => void };
};

/** Supplied copy/actions only; never fetches, retries, or navigates by itself. */
export function FeedbackState({ kind, message, action }: Props) {
  return <View style={{ gap: Layout.gap }} accessibilityLiveRegion={kind === 'error' ? 'polite' : 'none'}>
    {kind === 'loading' ? <ActivityIndicator accessible={false} /> : null}
    <AppText>{message}</AppText>
    {action ? <Button label={action.label} onPress={action.onPress} /> : null}
  </View>;
}
