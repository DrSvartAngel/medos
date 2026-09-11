// MedOS – Centralized Spacing and Radius Tokens (Neutral Zen Foundation)
// Architectural Source: docs/MEDOS_FINAL_ARCHITECTURE.md
// Visual Implementation Spec: docs/PHASE13_5_FINAL_VISUAL_DESIGN.md
// Figma Reference: 13.5 Foundations — Neutral Zen (Node 20:2)

/**
 * Canonical Phase 13.5 Spacing Tokens
 * Collection: MedOS / Dimensions (space/4 through space/40)
 */
export const SpacingTokens = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
} as const;

export type SpacingToken = (typeof SpacingTokens)[keyof typeof SpacingTokens];

/**
 * Production Spacing Scale
 * Provides direct numeric keys, canonical Figma keys, and semantic scale aliases.
 */
export const Spacing = {
  // Canonical Phase 13.5 Numeric Keys
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,

  // Canonical Phase 13.5 Figma Dimension Keys
  'space/4': 4,
  'space/8': 8,
  'space/12': 12,
  'space/16': 16,
  'space/20': 20,
  'space/24': 24,
  'space/32': 32,
  'space/40': 40,

  // Semantic Named Tokens (Preserves existing codebase conventions & passes validate-phase11)
  xxs: 2,   // Fine micro-alignment / hairline padding (legacy)
  xs: 4,    // space/4  - micro gaps, tag insets, icon offsets
  sm: 8,    // space/8  - compact gaps, button vertical padding, chips
  smd: 12,  // space/12 - standard compact padding, input vertical padding
  md: 16,   // space/16 - default content padding, card padding, horizontal gutters
  mlg: 20,  // space/20 - tablet inset, medium section gap
  lg: 24,   // space/24 - standard section gap, prominent group separation
  xl: 32,   // space/32 - major layout section gap, hero header spacing
  xxl: 40,  // space/40 - generous visual breathing room, hero bottom offset (Phase 13.5 canonical)
  xxxl: 48, // large container bottom scroll padding (legacy)
} as const;

export type SpacingKey = keyof typeof Spacing;

/**
 * Canonical Phase 13.5 Radius Tokens
 * Collection: MedOS / Dimensions (radius/8 through radius/28)
 */
export const RadiusTokens = {
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  28: 28,
} as const;

export type RadiusToken = (typeof RadiusTokens)[keyof typeof RadiusTokens];

/**
 * Production Radius System
 * Provides direct numeric keys, canonical Figma keys, semantic role aliases, and legacy keys.
 */
export const Radius = {
  // Canonical Phase 13.5 Numeric Keys
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  28: 28,

  // Canonical Phase 13.5 Figma Dimension Keys
  'radius/8': 8,
  'radius/12': 12,
  'radius/16': 16,
  'radius/20': 20,
  'radius/28': 28,

  // Semantic Role Aliases
  controlSmall: 8,  // compact chips, inner tags
  control: 12,      // inputs, buttons, segmented controls
  card: 16,         // cards, modular content surfaces
  panel: 20,        // elevated panels, dialogs, popovers
  modal: 20,        // centered modal containers
  sheet: 28,        // bottom sheets, large rounded overlay containers

  // Scale and Legacy Compatibility Keys
  xs: 4,            // micro progress bars, indicator tracks
  sm: 8,            // radius/8
  md: 12,           // radius/12
  lg: 16,           // radius/16
  xl: 20,           // radius/20
  xxl: 28,          // radius/28
  full: 9999,       // circular avatars, pill tags
  pill: 9999,       // canonical pill button alias
} as const;

export type RadiusKey = keyof typeof Radius;
