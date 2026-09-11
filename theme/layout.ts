import { Spacing } from './spacing';

// MedOS – Centralized Layout and Grid Constants (Neutral Zen Foundation)
// Architectural Source: docs/MEDOS_FINAL_ARCHITECTURE.md
// Visual Implementation Spec: docs/PHASE13_5_FINAL_VISUAL_DESIGN.md
// Figma Reference: 13.5 Foundations — Neutral Zen (Node 20:2)

/**
 * Canonical Page and Grid Layout Constants
 */
export const PageLayout = {
  // Screen edge gutters (page horizontal padding)
  gutterPhone: 16,        // space/16 (390dp phone viewport)
  gutterTablet: 24,       // space/24 (1024dp tablet viewport)
  gutterLargeTablet: 32,  // space/32 (desktop/large tablet viewport)

  // Layout gaps
  inlineGap: 4,           // space/4  - icon to label, badge dot to text
  compactGap: 8,          // space/8  - compact buttons, tags, chips
  contentGap: 16,         // space/16 - cards in vertical stack, list items
  sectionGap: 24,         // space/24 - major thematic sections
  majorGap: 32,           // space/32 - page-level block separation
} as const;

export type PageLayoutTokens = typeof PageLayout;

/**
 * Responsive Layout System
 * Preserves existing responsive geometry and extends with canonical Phase 14.3 page/grid constants.
 */
export const Layout = {
  // Existing responsive breakpoints and dimensions
  breakpoints: { tablet: 600, largeTablet: 840 },
  contentWidth: { tablet: 720, largeTablet: 900 },
  spacingScale: { phone: 1, tablet: 1.25, largeTablet: 1.5 },
  gap: Spacing.md,
  inputMinHeight: 48,
  textAreaMinHeight: 120,

  // Canonical Phase 14.3 Page & Layout Constants
  pagePadding: {
    phone: PageLayout.gutterPhone,
    tablet: PageLayout.gutterTablet,
    largeTablet: PageLayout.gutterLargeTablet,
  },
  pagePaddingPhone: PageLayout.gutterPhone,
  pagePaddingTablet: PageLayout.gutterTablet,
  gaps: {
    inline: PageLayout.inlineGap,
    compact: PageLayout.compactGap,
    content: PageLayout.contentGap,
    section: PageLayout.sectionGap,
    major: PageLayout.majorGap,
  },
  compactGap: PageLayout.compactGap,
  contentGap: PageLayout.contentGap,
  sectionGap: PageLayout.sectionGap,
} as const;
