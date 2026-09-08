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

  const variantStyles: Record<TextVariant, TextStyle> = {
    display:   { fontSize: typography.size.xxxl + 4, fontWeight: typography.weight.extrabold, lineHeight: (typography.size.xxxl + 4) * 1.2 },
    h1:        { fontSize: typography.size.xxxl, fontWeight: typography.weight.extrabold, lineHeight: typography.size.xxxl * 1.2 },
    h2:        { fontSize: typography.size.xxl,  fontWeight: typography.weight.bold,      lineHeight: typography.size.xxl * 1.25 },
    h3:        { fontSize: typography.size.xl,   fontWeight: typography.weight.semibold,  lineHeight: typography.size.xl * 1.3 },
    subhead:   { fontSize: typography.size.md,   fontWeight: typography.weight.medium,    lineHeight: typography.size.md * 1.4 },
    body:      { fontSize: typography.size.base, fontWeight: typography.weight.regular, lineHeight: typography.size.base * 1.5 },
    bodySmall: { fontSize: typography.size.sm,   fontWeight: typography.weight.regular, lineHeight: typography.size.sm * 1.5 },
    caption:   { fontSize: typography.size.xs,   fontWeight: typography.weight.regular, lineHeight: typography.size.xs * 1.4 },
    label:     { fontSize: typography.size.sm,   fontWeight: typography.weight.medium,  lineHeight: typography.size.sm * 1.4, letterSpacing: 0.5 },
    stat:      { fontSize: typography.size.xxl + 2, fontWeight: typography.weight.bold,   lineHeight: (typography.size.xxl + 2) * 1.2 },
  };

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
