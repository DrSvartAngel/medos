// MedOS – Centralized Icon System Foundation (Neutral Zen)
// Architectural Source: docs/MEDOS_FINAL_ARCHITECTURE.md
// Visual Implementation Spec: docs/PHASE13_5_FINAL_VISUAL_DESIGN.md
// Figma Reference: 13.5 Foundations — Neutral Zen (Node 20:2)

/**
 * Standard Icon Library: Feather (@expo/vector-icons)
 * Provides restrained, clinical-academic, open-stroke glyphs designed on a 24x24 grid.
 */
export const DEFAULT_ICON_LIBRARY = 'Feather' as const;

/**
 * Canonical Icon Size Scale
 * Deterministically mapped to the 4pt grid rhythm and typography line heights.
 */
export const IconSizes = {
  xs: 12,  // Micro inline metadata, badge indicators (aligned with labelS 12px)
  sm: 16,  // Compact button icons, chevrons, list row arrows (aligned with bodyL/headingS 16px)
  md: 20,  // Standard interactive controls, navigation tabs, input slots (aligned with bodyM 20px line-height)
  lg: 24,  // Section headers, stat cards, primary action icons (aligned with headingL 24px)
  xl: 32,  // Modal headers, milestone celebration icons, hero banners (aligned with displayXL 32px)
  xxl: 48, // Illustration focal icons, full-page empty states (aligned with 48px grid)
} as const;

export type IconSizeRole = keyof typeof IconSizes;
export type IconSizeValue = (typeof IconSizes)[IconSizeRole];

/**
 * Icon Stroke Width Policy
 * Feather icons utilize a standard 2px stroke on a 24x24 viewBox (~8.3% stroke-to-size ratio).
 */
export const IconStroke = {
  thin: 1.5,
  standard: 2,
  bold: 2.5,
} as const;

export type IconStrokeRole = keyof typeof IconStroke;

/**
 * Canonical Icons Export
 */
export const Icons = {
  defaultLibrary: DEFAULT_ICON_LIBRARY,
  sizes: IconSizes,
  stroke: IconStroke,
  // Direct size role accessors
  xs: IconSizes.xs,
  sm: IconSizes.sm,
  md: IconSizes.md,
  lg: IconSizes.lg,
  xl: IconSizes.xl,
  xxl: IconSizes.xxl,
} as const;
