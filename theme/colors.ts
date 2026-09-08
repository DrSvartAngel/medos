// MedOS – Centralized Theme Colors (Dark-first with Light support)

export const DarkColors = {
  // Backgrounds & Surfaces
  background: '#0D0F14',
  surface: '#161A23',
  surfaceElevated: '#1C2130',
  surfaceHighlight: '#222938',
  border: '#232836',
  borderFaint: '#1A1F2E',
  borderMuted: '#1E2330',
  cardBorder: '#232836',
  cardBorderHover: '#384259',

  // Brand
  primary: '#6C63FF',    // violet  – focus / calm
  primaryMuted: '#3D3880',
  accent: '#3ECFCF',     // teal    – memory / recall
  accentMuted: '#1D7A7A',

  // Semantic
  success: '#4ADE80',
  successMuted: '#123524',
  warning: '#FACC15',
  warningMuted: '#382C0E',
  error: '#F87171',
  errorMuted: '#3D1B1B',
  info: '#60A5FA',
  infoMuted: '#162B44',

  // Interactive & Focus
  focus: '#857EFA',
  focusRing: 'rgba(108, 99, 255, 0.35)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#7C8BA1',
  textInverse: '#000000',

  // Tab bar
  tabActive: '#6C63FF',
  tabInactive: '#64748B',
  tabBar: '#101318',
} as const;

export const LightColors: Record<keyof typeof DarkColors, string> = {
  // Backgrounds & Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHighlight: '#E2E8F0',
  border: '#E2E8F0',
  borderFaint: '#F1F5F9',
  borderMuted: '#E2E8F0',
  cardBorder: '#E2E8F0',
  cardBorderHover: '#CBD5E1',

  // Brand
  primary: '#5850EC',
  primaryMuted: '#EEF2FF',
  accent: '#0E9F6E',
  accentMuted: '#DEF7EC',

  // Semantic
  success: '#057A55',
  successMuted: '#DEF7EC',
  warning: '#D97706',
  warningMuted: '#FEF3C7',
  error: '#E02424',
  errorMuted: '#FDE8E8',
  info: '#1C64F2',
  infoMuted: '#E1EFFE',

  // Interactive & Focus
  focus: '#5850EC',
  focusRing: 'rgba(88, 80, 236, 0.25)',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',

  // Tab bar
  tabActive: '#5850EC',
  tabInactive: '#94A3B8',
  tabBar: '#FFFFFF',
};

export const Colors = DarkColors;
export type ColorKey = keyof typeof DarkColors;
export type ThemeColors = typeof DarkColors;
