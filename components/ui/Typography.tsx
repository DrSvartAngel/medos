import React from 'react';
import { Text, TextStyle, StyleProp, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'subhead'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'stat';

interface TypographyProps {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  accessibilityLabel?: string;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
}

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
  accessibilityLabel,
  adjustsFontSizeToFit,
  minimumFontScale,
}: TypographyProps) {
  const { colors, typography } = useTheme();

  const variantStyles: Record<TextVariant, TextStyle> = typography.variants;

  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      style={[
        styles.base,
        { fontFamily: typography.fontFamily, color: color ?? colors.textPrimary },
        variantStyles[variant],
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
