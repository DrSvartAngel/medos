// MedOS – Centralized Border System (Neutral Zen Foundation)
// Architectural Source: docs/MEDOS_FINAL_ARCHITECTURE.md
// Visual Implementation Spec: docs/PHASE13_5_FINAL_VISUAL_DESIGN.md
// Figma Reference: 13.5 Foundations — Neutral Zen (Node 20:2)

/**
 * Canonical Border Widths
 * MedOS employs restrained 1px hairline borders for structural separation without visual noise.
 * Integrated with Phase 14.1 semantic token `borderSubtle`.
 */
export const BorderWidths = {
  none: 0,
  hairline: 1,  // 1px structural hairline (Figma border/subtle specification)
  subtle: 1,    // Default boundary between panels, cards, and list rows
  standard: 1,  // Standard interactive control boundary
  thick: 2,     // Active states, selection rings
  focus: 2,     // High-visibility focus indicators
} as const;

export type BorderWidthRole = keyof typeof BorderWidths;
export type BorderWidthValue = (typeof BorderWidths)[BorderWidthRole];

/**
 * Unified Borders Definition
 * Pairs canonical widths with semantic structural boundary standards.
 */
export const Borders = {
  width: BorderWidths,
  none: 0,
  hairline: 1,
  subtle: 1,
  standard: 1,
  thick: 2,
  focus: 2,
} as const;
