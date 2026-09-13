// MedOS – Centralized Theme Colors (Neutral Zen Foundation)
// Architectural Source: docs/MEDOS_FINAL_ARCHITECTURE.md
// Visual Implementation Spec: docs/PHASE13_5_FINAL_VISUAL_DESIGN.md
// Figma Reference: 13.5 Foundations — Neutral Zen (Node 20:2)

/**
 * Locked Phase 13.5 Neutral Zen Light Palette
 */
export const LightColors = {
  // --- Canonical Semantic Tokens (Phase 13.5 Locked) ---
  // Canvas & Surfaces
  canvas: '#F1F1EE',          // bg/canvas (Screen canvas)
  surface: '#F8F8F5',         // bg/surface (Default container / panel surface)
  surfaceSubtle: '#E8E9E4',   // bg/subtle (Secondary / recessed surface)
  surfaceRaised: '#FFFFFF',   // bg/raised (Elevated card, modal, popover)

  // Typography
  textPrimary: '#171917',     // text/primary (High-contrast ink)
  textSecondary: '#5C625E',   // text/secondary (Subheadings, body metadata)
  textMuted: '#838A85',       // text/muted (Captions, placeholders, disabled)
  textInverse: '#FFFFFF',     // text on dark accents/surfaces

  // Borders & Dividers
  borderSubtle: '#D7DAD5',    // border/subtle (1px hairline divider)

  // Semantic Accents (Desaturated Sage & Deep Moss)
  accent: '#87968C',          // accent/sage (Selection indicator, badges)
  accentStrong: '#4F5E55',    // accent/moss (Primary CTA, focus ring, prominent action)
  accentSoft: '#DCE3DE',      // accent/soft (Soft pill background, subtle highlight)
  accentSage: '#87968C',      // Explicit accent/sage token
  accentMoss: '#4F5E55',      // Explicit accent/moss token

  // Status Roles (Controlled, Non-Decorative)
  success: '#2E6B4A',         // status/success
  successMuted: '#DCE8E0',
  warning: '#9B6B28',         // status/warning
  warningMuted: '#F5EBDD',
  error: '#A13B35',           // status/error
  errorMuted: '#F6E0DF',
  info: '#3B627A',            // status/info
  infoMuted: '#DEE8EE',

  // --- Backward-Compatible Aliases (Legacy Token Preservation) ---
  background: '#F1F1EE',      // Alias to canvas
  surfaceElevated: '#FFFFFF', // Alias to surfaceRaised
  surfaceHighlight: '#E8E9E4',// Alias to surfaceSubtle
  border: '#D7DAD5',          // Alias to borderSubtle
  borderFaint: '#E8E9E4',     // Subtler border
  borderMuted: '#D7DAD5',     // Alias to borderSubtle
  cardBorder: '#D7DAD5',      // Alias to borderSubtle
  cardBorderHover: '#C2C6BE', // Subtle hover elevation

  // Interactive & Primary Aliases
  primary: '#4F5E55',         // Primary CTA is moss in Neutral Zen
  primaryPressed: '#3D4A43',  // Pressed moss
  primaryMuted: '#DCE3DE',    // Soft sage pill/surface
  accentMuted: '#DCE3DE',     // Alias to accentSoft
  focus: '#4F5E55',           // Focus accent
  focusRing: 'rgba(79, 94, 85, 0.25)',

  // Navigation Shell Aliases
  tabActive: '#4F5E55',       // Primary active tab
  tabInactive: '#838A85',     // Inactive tab text/icon
  tabBar: '#F8F8F5',          // Bottom navigation bar surface
} as const;

/**
 * Locked Phase 13.5 Neutral Zen Dark Palette
 */
export const DarkColors: Record<keyof typeof LightColors, string> = {
  // --- Canonical Semantic Tokens (Phase 13.5 Locked) ---
  // Canvas & Surfaces
  canvas: '#111412',          // bg/canvas
  surface: '#171B18',         // bg/surface
  surfaceSubtle: '#1E2420',   // bg/subtle
  surfaceRaised: '#202621',   // bg/raised

  // Typography
  textPrimary: '#F3F3EE',     // text/primary
  textSecondary: '#B7BDB8',   // text/secondary
  textMuted: '#858D87',       // text/muted
  textInverse: '#111412',     // text on light accents/surfaces

  // Borders & Dividers
  borderSubtle: '#303832',    // border/subtle

  // Semantic Accents (Desaturated Sage & Deep Moss)
  accent: '#95A59B',          // accent/sage
  accentStrong: '#A8B7AE',    // accent/moss
  accentSoft: '#253029',      // accent/soft
  accentSage: '#95A59B',      // Explicit accent/sage token
  accentMoss: '#A8B7AE',      // Explicit accent/moss token

  // Status Roles (Controlled, Non-Decorative)
  success: '#5FA87D',         // status/success
  successMuted: '#1B2E23',
  warning: '#D4A359',         // status/warning
  warningMuted: '#332717',
  error: '#D96B64',           // status/error
  errorMuted: '#381E1C',
  info: '#689EC0',            // status/info
  infoMuted: '#1C2A33',

  // --- Backward-Compatible Aliases (Legacy Token Preservation) ---
  background: '#111412',      // Alias to canvas
  surfaceElevated: '#202621', // Alias to surfaceRaised
  surfaceHighlight: '#1E2420',// Alias to surfaceSubtle
  border: '#303832',          // Alias to borderSubtle
  borderFaint: '#1E2420',
  borderMuted: '#303832',     // Alias to borderSubtle
  cardBorder: '#303832',      // Alias to borderSubtle
  cardBorderHover: '#454E47',

  // Interactive & Primary Aliases
  primary: '#A8B7AE',         // Primary CTA moss in Dark mode
  primaryPressed: '#95A59B',
  primaryMuted: '#253029',    // Soft sage pill/surface
  accentMuted: '#253029',     // Alias to accentSoft
  focus: '#A8B7AE',
  focusRing: 'rgba(168, 183, 174, 0.35)',

  // Navigation Shell Aliases
  tabActive: '#A8B7AE',
  tabInactive: '#858D87',
  tabBar: '#171B18',
};

/**
 * Phase 15C.3 Midnight Clinical Zen Dark Palette
 * Near-black midnight navy canvas, deep blue-charcoal surfaces,
 * restrained desaturated blue accent, soft neutral text hierarchy.
 */
export const MidnightDarkColors: Record<keyof typeof LightColors, string> = {
  // Canvas & Surfaces
  canvas: '#0B0E14',          // Near-black midnight navy canvas
  surface: '#111622',         // Deep blue-charcoal surface
  surfaceSubtle: '#151B28',   // Recessed cool blue-charcoal surface
  surfaceRaised: '#1A2234',   // Elevated cards, modals, popovers

  // Typography
  textPrimary: '#ECEFF4',     // Crisp neutral off-white
  textSecondary: '#94A1B8',   // Soft blue-slate
  textMuted: '#62718A',       // Restrained cool-grey
  textInverse: '#0B0E14',     // Text on light accents/surfaces

  // Borders & Dividers
  borderSubtle: '#1F293D',    // 1px hairline cool blue-charcoal divider

  // Semantic Accents (Restrained Desaturated Blue)
  accent: '#7E9BC0',          // Restrained desaturated blue accent
  accentStrong: '#9DB4D0',    // Clean desaturated blue for prominent CTA
  accentSoft: '#162234',      // Soft deep slate-blue wash for pills/tags
  accentSage: '#7E9BC0',      // Semantic slot mapped to clinical desaturated blue
  accentMoss: '#9DB4D0',      // Semantic slot mapped to prominent clinical blue

  // Status Roles (Clinical, Low Stimulation)
  success: '#4A9E77',         // Subtle muted clinical green
  successMuted: '#12261C',
  warning: '#C4924A',         // Warm clinical amber
  warningMuted: '#2B1F10',
  error: '#C95A54',           // Clinical muted brick red
  errorMuted: '#2E1615',
  info: '#5E89B8',            // Calm desaturated blue
  infoMuted: '#142233',

  // Backward-Compatible Aliases
  background: '#0B0E14',      // Alias to canvas
  surfaceElevated: '#1A2234', // Alias to surfaceRaised
  surfaceHighlight: '#151B28',// Alias to surfaceSubtle
  border: '#1F293D',          // Alias to borderSubtle
  borderFaint: '#172030',     // Subtler hairline border
  borderMuted: '#1F293D',     // Alias to borderSubtle
  cardBorder: '#1F293D',      // Alias to borderSubtle
  cardBorderHover: '#2A3750',

  // Interactive & Primary Aliases
  primary: '#7E9BC0',         // Restrained desaturated blue CTA
  primaryPressed: '#6986AB',
  primaryMuted: '#162234',    // Soft clinical blue surface
  accentMuted: '#162234',     // Alias to accentSoft
  focus: '#7E9BC0',
  focusRing: 'rgba(126, 155, 192, 0.28)',

  // Navigation Shell Aliases
  tabActive: '#7E9BC0',
  tabInactive: '#62718A',
  tabBar: '#111622',
};

export type ThemeColors = Record<keyof typeof LightColors, string>;
export const Colors: ThemeColors = LightColors;
export type ColorKey = keyof typeof LightColors;

