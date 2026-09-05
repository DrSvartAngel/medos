import React from 'react';
import { Text, TextStyle, StyleProp, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'label';

interface TypographyProps {
  variant?: Variant;
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

  const variantStyles: Record<Variant, TextStyle> = {
    h1: { fontSize: typography.size.xxxl, fontWeight: typography.weight.extrabold, lineHeight: typography.size.xxxl * 1.2 },
    h2: { fontSize: typography.size.xxl,  fontWeight: typography.weight.bold,      lineHeight: typography.size.xxl * 1.25 },
    h3: { fontSize: typography.size.xl,   fontWeight: typography.weight.semibold,  lineHeight: typography.size.xl * 1.3 },
    body:      { fontSize: typography.size.base, fontWeight: typography.weight.regular, lineHeight: typography.size.base * 1.5 },
    bodySmall: { fontSize: typography.size.sm,   fontWeight: typography.weight.regular, lineHeight: typography.size.sm * 1.5 },
    caption:   { fontSize: typography.size.xs,   fontWeight: typography.weight.regular, lineHeight: typography.size.xs * 1.4 },
    label:     { fontSize: typography.size.sm,   fontWeight: typography.weight.medium,  lineHeight: typography.size.sm * 1.4, letterSpacing: 0.5 },
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
