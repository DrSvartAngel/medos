// MedOS – Dark-first color palette
export const Colors = {
  // Backgrounds
  background: '#0D0F14',
  surface: '#161A23',
  surfaceElevated: '#1C2130',
  border: '#232836',
  borderFaint: '#1A1F2E',

  // Brand
  primary: '#6C63FF',    // violet  – focus / calm
  primaryMuted: '#3D3880',
  accent: '#3ECFCF',     // teal    – memory / recall
  accentMuted: '#1D7A7A',

  // Semantic
  success: '#4ADE80',
  warning: '#FACC15',
  error: '#F87171',
  info: '#60A5FA',

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

export type ColorKey = keyof typeof Colors;
