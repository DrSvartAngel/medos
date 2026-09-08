// MedOS – Centralized Theme Colors (Light-first with Charcoal/Navy Dark support)

export const LightColors = {
  // Backgrounds & Surfaces (Clean clinical light)
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHighlight: '#E2E8F0',
  border: '#E2E8F0',
  borderFaint: '#F1F5F9',
  borderMuted: '#E2E8F0',
  cardBorder: '#E2E8F0',
  cardBorderHover: '#CBD5E1',

  // Brand (Clinical Teal + Deep Navy)
  primary: '#0D9488',          // Clinical teal
  primaryPressed: '#0F766E',   // Deep pressed teal
  primaryMuted: '#CCFBF1',     // Soft teal surface
  accent: '#0D9488',           // Primary accent
  accentMuted: '#E6FFFA',

  // Semantic States
  success: '#059669',          // Calm emerald
  successMuted: '#DEF7EC',
  warning: '#D97706',          // Muted amber
  warningMuted: '#FEF3C7',
  error: '#DC2626',            // Controlled crimson
  errorMuted: '#FEE2E2',
  info: '#0284C7',             // Calm sky blue
  infoMuted: '#E0F2FE',

  // Interactive & Focus
  focus: '#0D9488',
  focusRing: 'rgba(13, 148, 136, 0.25)',

  // Typography (Deep Navy / Slate hierarchy)
  textPrimary: '#0F172A',      // Deep navy
  textSecondary: '#475569',    // Cool slate
  textMuted: '#64748B',        // Muted slate
  textInverse: '#FFFFFF',

  // Navigation Shell
  tabActive: '#0D9488',
  tabInactive: '#64748B',
  tabBar: '#FFFFFF',
} as const;

export const DarkColors: Record<keyof typeof LightColors, string> = {
  // Backgrounds & Surfaces (Premium charcoal / deep navy)
  background: '#0B1120',
  surface: '#111827',
  surfaceElevated: '#1E293B',
  surfaceHighlight: '#243049',
  border: '#1E293B',
  borderFaint: '#151F32',
  borderMuted: '#172033',
  cardBorder: '#1E293B',
  cardBorderHover: '#334155',

  // Brand (Vibrant clinical teal on dark)
  primary: '#14B8A6',
  primaryPressed: '#0D9488',
  primaryMuted: '#134E48',
  accent: '#38BDF8',
  accentMuted: '#164E63',

  // Semantic States
  success: '#34D399',
  successMuted: '#064E3B',
  warning: '#FBBF24',
  warningMuted: '#78350F',
  error: '#F87171',
  errorMuted: '#7F1D1D',
  info: '#38BDF8',
  infoMuted: '#0C4A6E',

  // Interactive & Focus
  focus: '#14B8A6',
  focusRing: 'rgba(20, 184, 166, 0.35)',

  // Typography (High-contrast near-white / cool slate)
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textInverse: '#0B1120',

  // Navigation Shell
  tabActive: '#14B8A6',
  tabInactive: '#64748B',
  tabBar: '#0B1120',
};

export type ThemeColors = Record<keyof typeof LightColors, string>;
export const Colors: ThemeColors = LightColors;
export type ColorKey = keyof typeof LightColors;
