import React from 'react';
import {
  Text,
  type TextStyle,
  type StyleProp,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export type TextVariant =
  // Canonical Phase 14.2 Semantic Tokens
  | 'displayXL'
  | 'headingL'
  | 'headingM'
  | 'headingS'
  | 'bodyL'
  | 'bodyM'
  | 'bodyS'
  | 'labelM'
  | 'labelS'
  // Legacy compatibility aliases
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'subhead'
  | 'body'
  | 'bodyStrong'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'muted'
  | 'stat'
  | 'metric';

export interface TypographyProps {
  variant?: TextVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  accessibilityLabel?: string;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  className?: string;
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
  className,
}: TypographyProps) {
  const { colors, typography } = useTheme();

  // Semantic styles mapped to canonical Phase 14.2 tokens
  const variantStyles: Record<TextVariant, TextStyle> = {
    // Canonical Phase 14.2 Semantic Tokens
    displayXL: { fontSize: 36, fontWeight: '700', lineHeight: 44, letterSpacing: -0.7, fontFamily: typography.displayXL.fontFamily },
    headingL: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: -0.5, fontFamily: typography.headingL.fontFamily },
    headingM: { fontSize: 22, fontWeight: '600', lineHeight: 30, letterSpacing: -0.3, fontFamily: typography.headingM.fontFamily },
    headingS: { fontSize: 18, fontWeight: '600', lineHeight: 26, letterSpacing: -0.2, fontFamily: typography.headingS.fontFamily },
    bodyL: { fontSize: 16, fontWeight: '400', lineHeight: 24, fontFamily: typography.bodyL.fontFamily },
    bodyM: { fontSize: 14, fontWeight: '400', lineHeight: 21, fontFamily: typography.bodyM.fontFamily },
    bodyS: { fontSize: 12, fontWeight: '400', lineHeight: 18, fontFamily: typography.bodyS.fontFamily },
    labelM: { fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: 0.1, fontFamily: typography.labelM.fontFamily },
    labelS: { fontSize: 11, fontWeight: '500', lineHeight: 16, letterSpacing: 0.2, fontFamily: typography.labelS.fontFamily },

    // Legacy Aliases Mapped to Canonical Proportions
    display: { fontSize: 36, fontWeight: '700', lineHeight: 44, letterSpacing: -0.7, fontFamily: typography.displayXL.fontFamily },
    h1: { fontSize: 28, fontWeight: '600', lineHeight: 36, letterSpacing: -0.5, fontFamily: typography.headingL.fontFamily },
    h2: { fontSize: 22, fontWeight: '600', lineHeight: 30, letterSpacing: -0.3, fontFamily: typography.headingM.fontFamily },
    h3: { fontSize: 18, fontWeight: '600', lineHeight: 26, letterSpacing: -0.2, fontFamily: typography.headingS.fontFamily },
    title: { fontSize: 18, fontWeight: '600', lineHeight: 26, letterSpacing: -0.2, fontFamily: typography.headingS.fontFamily },
    stat: { fontSize: 36, fontWeight: '700', lineHeight: 44, letterSpacing: -0.7, fontFamily: typography.displayXL.fontFamily },
    metric: { fontSize: 36, fontWeight: '700', lineHeight: 44, letterSpacing: -0.7, fontFamily: typography.displayXL.fontFamily },
    subhead: { fontSize: 16, fontWeight: '600', lineHeight: 24, fontFamily: typography.headingS.fontFamily },
    body: { fontSize: 14, fontWeight: '400', lineHeight: 21, fontFamily: typography.bodyM.fontFamily },
    bodyStrong: { fontSize: 14, fontWeight: '600', lineHeight: 21, fontFamily: typography.headingS.fontFamily },
    bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 18, fontFamily: typography.bodyS.fontFamily },
    label: { fontSize: 13, fontWeight: '500', lineHeight: 18, letterSpacing: 0.1, fontFamily: typography.labelM.fontFamily },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 18, fontFamily: typography.bodyS.fontFamily },
    muted: { fontSize: 12, fontWeight: '400', lineHeight: 18, fontFamily: typography.bodyS.fontFamily },
  };

  const defaultColor =
    variant === 'muted' || variant === 'caption' || variant === 'labelS'
      ? colors.textMuted
      : variant === 'bodySmall' || variant === 'bodyS'
      ? colors.textSecondary
      : colors.textPrimary;

  const isHeadingVariant =
    variant === 'display' ||
    variant === 'displayXL' ||
    variant === 'h1' ||
    variant === 'headingL' ||
    variant === 'h2' ||
    variant === 'headingM' ||
    variant === 'h3' ||
    variant === 'headingS' ||
    variant === 'title' ||
    variant === 'stat' ||
    variant === 'metric';

  const targetStyle = variantStyles[variant];
  const resolvedStyle: StyleProp<TextStyle> = [
    styles.base,
    {
      fontFamily: targetStyle.fontFamily ?? typography.fontFamily,
      color: color ?? defaultColor,
    },
    targetStyle,
    style,
  ];

  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={isHeadingVariant ? 'header' : undefined}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      style={resolvedStyle}
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
