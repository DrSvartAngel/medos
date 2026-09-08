import React from 'react';
import { type TextStyle, type StyleProp, StyleSheet } from 'react-native';
import { Text as GSText } from './text/index';
import { Heading } from './heading/index';
import { useTheme } from '@/hooks/useTheme';

export type TextVariant =
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

  // Semantic styles for all roles
  const variantStyles: Record<TextVariant, TextStyle> = {
    display: { fontSize: 34, fontWeight: '800', lineHeight: 42, letterSpacing: -0.8 },
    h1: { fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.6 },
    h2: { fontSize: 22, fontWeight: '700', lineHeight: 28, letterSpacing: -0.4 },
    h3: { fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: -0.2 },
    title: { fontSize: 17, fontWeight: '600', lineHeight: 24, letterSpacing: -0.2 },
    stat: { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.8 },
    metric: { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.8 },
    subhead: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
    body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
    bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
    bodySmall: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
    label: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
    muted: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  };

  const defaultColor =
    variant === 'muted' || variant === 'caption'
      ? colors.textMuted
      : variant === 'bodySmall'
      ? colors.textSecondary
      : colors.textPrimary;

  const isHeadingVariant =
    variant === 'display' ||
    variant === 'h1' ||
    variant === 'h2' ||
    variant === 'h3' ||
    variant === 'title' ||
    variant === 'stat' ||
    variant === 'metric';

  const headingSize =
    variant === 'display' || variant === 'stat' || variant === 'metric'
      ? '3xl'
      : variant === 'h1'
      ? '2xl'
      : variant === 'h2'
      ? 'xl'
      : 'lg';

  const resolvedStyle: StyleProp<TextStyle> = [
    styles.base,
    {
      fontFamily: typography.fontFamily,
      color: color ?? defaultColor,
    },
    variantStyles[variant],
    style,
  ];

  if (isHeadingVariant) {
    return (
      <Heading
        size={headingSize}
        numberOfLines={numberOfLines}
        accessibilityLabel={accessibilityLabel}
        style={resolvedStyle as any}
        className={className}
      >
        {children}
      </Heading>
    );
  }

  return (
    <GSText
      numberOfLines={numberOfLines}
      accessibilityLabel={accessibilityLabel}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      style={resolvedStyle}
      className={className}
    >
      {children}
    </GSText>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
