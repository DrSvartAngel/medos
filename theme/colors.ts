// MedOS – Centralized Theme Colors (90% Monochrome Neutrals + 10% Functional Teal Accent)

export const LightColors = {
  // Backgrounds & Surfaces (90% monochrome neutrals)
  background: '#F7F7F7',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F0F0',
  surfaceHighlight: '#E5E5E5',
  border: '#E5E5E5',
  borderFaint: '#F0F0F0',
  borderMuted: '#E5E5E5',
  cardBorder: '#E5E5E5',
  cardBorderHover: '#D4D4D4',

  // Functional Teal Accent (10% sparingly used)
  primary: '#0D9488',          // Clinical teal
  primaryPressed: '#0F766E',   // Deep pressed teal
  primaryMuted: '#CCFBF1',     // Soft teal surface
  accent: '#0D9488',           // Primary accent
  accentMuted: '#E6FFFA',

  // Semantic States (Controlled & functional)
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

  // Typography (90% monochrome neutrals)
  textPrimary: '#111111',      // Deep monochrome black
  textSecondary: '#525252',    // Neutral secondary
  textMuted: '#737373',        // Neutral muted
  textInverse: '#FFFFFF',

  // Navigation Shell
  tabActive: '#0D9488',
  tabInactive: '#737373',
  tabBar: '#FFFFFF',
} as const;

export const DarkColors: Record<keyof typeof LightColors, string> = {
  // Backgrounds & Surfaces (Deep monochrome charcoal / black)
  background: '#0A0A0A',
  surface: '#171717',
  surfaceElevated: '#212121',
  surfaceHighlight: '#2A2A2A',
  border: '#262626',
  borderFaint: '#1C1C1C',
  borderMuted: '#262626',
  cardBorder: '#262626',
  cardBorderHover: '#383838',

  // Functional Teal Accent (10% sparingly used)
  primary: '#14B8A6',
  primaryPressed: '#0D9488',
  primaryMuted: '#134E48',
  accent: '#14B8A6',
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

  // Typography (High-contrast monochrome neutral)
  textPrimary: '#FAFAFA',      // Neutral primary
  textSecondary: '#A3A3A3',    // Neutral secondary
  textMuted: '#737373',        // Neutral muted
  textInverse: '#0A0A0A',

  // Navigation Shell
  tabActive: '#14B8A6',
  tabInactive: '#737373',
  tabBar: '#171717',
};

export type ThemeColors = Record<keyof typeof LightColors, string>;
export const Colors: ThemeColors = LightColors;
export type ColorKey = keyof typeof LightColors;
