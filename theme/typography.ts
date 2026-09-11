// MedOS – Phase 14.2 Typography System (Manrope & Neutral Zen Scale)
import { Platform, type TextStyle } from 'react-native';

export const FontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
  fallback: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }) as string,
} as const;

export type TypographyTokenName =
  | 'displayXL'
  | 'headingL'
  | 'headingM'
  | 'headingS'
  | 'bodyL'
  | 'bodyM'
  | 'bodyS'
  | 'labelM'
  | 'labelS';

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing?: number;
}

/**
 * Locked Phase 13.5 / Phase 14.2 Canonical Semantic Typography Scale (Manrope)
 */
export const TypographyTokens: Record<TypographyTokenName, TypographyStyle> = {
  displayXL: {
    fontFamily: FontFamily.bold,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  headingL: {
    fontFamily: FontFamily.semibold,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  headingM: {
    fontFamily: FontFamily.semibold,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headingS: {
    fontFamily: FontFamily.semibold,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  bodyL: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodyM: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '400',
  },
  bodyS: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
  },
  labelM: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  labelS: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
} as const;

/**
 * Unified Typography export containing canonical tokens and legacy compatibility mappings
 */
export const Typography = {
  // Canonical Semantic Tokens (Phase 13.5 Figma Locked Scale)
  displayXL: TypographyTokens.displayXL,
  headingL: TypographyTokens.headingL,
  headingM: TypographyTokens.headingM,
  headingS: TypographyTokens.headingS,
  bodyL: TypographyTokens.bodyL,
  bodyM: TypographyTokens.bodyM,
  bodyS: TypographyTokens.bodyS,
  labelM: TypographyTokens.labelM,
  labelS: TypographyTokens.labelS,

  // Font family mappings
  fontFamily: FontFamily.regular,
  fontFamilyMono: FontFamily.mono,
  families: FontFamily,

  // Legacy sizes preserved for backward compatibility
  size: {
    xs: 12,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 36,
  },

  // Legacy weights preserved for backward compatibility
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Legacy semantic variants mapped to closest canonical tokens
  variants: {
    display: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, fontFamily: FontFamily.bold },
    h1: { fontSize: 28, fontWeight: '600' as const, lineHeight: 36, fontFamily: FontFamily.semibold },
    h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30, fontFamily: FontFamily.semibold },
    h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, fontFamily: FontFamily.semibold },
    subhead: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24, fontFamily: FontFamily.semibold },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 21, fontFamily: FontFamily.regular },
    bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, fontFamily: FontFamily.regular },
    label: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, fontFamily: FontFamily.medium },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18, fontFamily: FontFamily.regular },
    stat: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, fontFamily: FontFamily.bold },
  },
} as const;

export type TypographyVariant = keyof typeof Typography.variants;
