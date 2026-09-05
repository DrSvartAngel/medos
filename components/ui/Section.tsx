import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { AppText } from './Typography';
import { Layout } from '@/theme/layout';

export function Section({ title, children, style }: {
  title?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap: Layout.gap }, style]}>
    {title ? <AppText variant="h2">{title}</AppText> : null}
    {children}
  </View>;
}
