// MedOS – Typography scale & semantic variants (clean system font stack)
import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export const Typography = {
  // Font families
  fontFamily,
  fontFamilyMono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),

  // Sizes
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

  // Weights
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

  // Semantic variants
  variants: {
    display: { fontSize: 34, fontWeight: '800' as const, lineHeight: 42 },
    h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
    h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
    h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    subhead: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
    body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
    bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
    label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
    stat: { fontSize: 32, fontWeight: '800' as const, lineHeight: 38 },
  },
} as const;

export type TypographyVariant = keyof typeof Typography.variants;
