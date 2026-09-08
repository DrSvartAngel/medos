import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  color?: string;
  style?: ViewStyle;
}

export function Divider({
  orientation = 'horizontal',
  spacing: customSpacing,
  color,
  style,
}: DividerProps) {
  const { colors, spacing } = useTheme();
  const resolvedColor = color ?? colors.border;
  const margin = customSpacing ?? spacing.sm;

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          styles.vertical,
          {
            backgroundColor: resolvedColor,
            marginHorizontal: margin,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          backgroundColor: resolvedColor,
          marginVertical: margin,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
