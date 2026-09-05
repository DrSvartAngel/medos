import { Spacing } from './spacing';

/** Preserve existing responsive geometry; feature-specific widths remain local. */
export const Layout = {
  breakpoints: { tablet: 600, largeTablet: 840 },
  contentWidth: { tablet: 720, largeTablet: 900 },
  spacingScale: { phone: 1, tablet: 1.25, largeTablet: 1.5 },
  gap: Spacing.md,
  inputMinHeight: 48,
  textAreaMinHeight: 120,
} as const;
