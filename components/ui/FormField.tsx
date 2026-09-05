import React from 'react';
import { View } from 'react-native';
import { AppText } from './Typography';
import { useTheme } from '@/hooks/useTheme';
import { Layout } from '@/theme/layout';

export function FormField({ label, children, error }: {
  label: string; children: React.ReactNode; error?: string | null;
}) {
  const { colors } = useTheme();
  return <View style={{ gap: Layout.gap }}>
    <AppText variant="label">{label}</AppText>
    {children}
    {error ? <View accessibilityLiveRegion="polite"><AppText color={colors.error}>{error}</AppText></View> : null}
  </View>;
}
