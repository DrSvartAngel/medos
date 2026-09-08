import React from 'react';
import { StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Divider as GSDivider } from './divider/index';
import { useTheme } from '@/hooks/useTheme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  spacing: customSpacing,
  color,
  style,
  className,
}: DividerProps) {
  const { colors, spacing } = useTheme();
  const resolvedColor = color ?? colors.cardBorder;
  const margin = customSpacing ?? spacing.sm;

  if (orientation === 'vertical') {
    return (
      <GSDivider
        orientation="vertical"
        style={[
          styles.vertical,
          {
            backgroundColor: resolvedColor,
            marginHorizontal: margin,
          },
          style,
        ]}
        className={className}
      />
    );
  }

  return (
    <GSDivider
      orientation="horizontal"
      style={[
        styles.horizontal,
        {
          backgroundColor: resolvedColor,
          marginVertical: margin,
        },
        style,
      ]}
      className={className}
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
