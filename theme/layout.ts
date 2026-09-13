import { Spacing } from './spacing';

// MedOS – Centralized Layout and Grid Constants (Neutral Zen Foundation)
// Architectural Source: docs/MEDOS_FINAL_ARCHITECTURE.md
// Visual Implementation Spec: docs/PHASE13_5_FINAL_VISUAL_DESIGN.md
// Figma Reference: 13.5 Foundations — Neutral Zen (Node 20:2)

/**
 * Canonical Breakpoints (dp)
 * Single source of truth for responsive adaptation across MedOS.
 */
export const Breakpoints = {
  phone: 0,
  tablet: 600,
  largeTablet: 840,
} as const;

export type BreakpointKey = keyof typeof Breakpoints;

/**
 * Canonical Content Width Constraints (dp)
 * Prevents text and cards from stretching uncomfortably across wide viewports.
 */
export const ContentWidths = {
  content: 720,      // Readable text / focused single-column study
  tablet: 720,       // Backwards-compatible key
  wide: 900,         // Wide dashboard / multi-column workspace
  largeTablet: 900,  // Backwards-compatible key
  workspace: 1200,   // Wide tablet multi-pane editorial workspace
} as const;

export type ContentWidthRole = keyof typeof ContentWidths;

/**
 * Canonical Shell Dimensions (dp)
 * Geometry standards for responsive application shell regions.
 */
export const ShellLayout = {
  railWidth: 72,              // Canonical compact navigation rail width for tablet
  railWidthExpanded: 240,     // Optional expanded sidebar
  inspectorWidth: 360,        // Canonical contextual inspector width for tablet
  inspectorMinWidth: 320,
  inspectorMaxWidth: 400,
  bottomBarHeightPhone: 64,   // Phone bottom bar reference height
  bottomBarHeightTablet: 72,
} as const;

export type ShellLayoutTokens = typeof ShellLayout;

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
 * Preserves existing responsive geometry and extends with canonical Phase 14.3/14.5 page/grid constants.
 */
export const Layout = {
  // Canonical responsive breakpoints and dimensions
  breakpoints: Breakpoints,
  contentWidth: ContentWidths,
  shell: ShellLayout,
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
