import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { DarkColors, LightColors, MidnightDarkColors, type ThemeColors } from '@/theme/colors';
import { Spacing, Radius } from '@/theme/spacing';
import { Borders } from '@/theme/borders';
import { Layout } from '@/theme/layout';
import { Icons } from '@/theme/icons';
import { Typography } from '@/theme/typography';
import { Shadows } from '@/theme/shadows';

/**
 * Returns theme tokens resolved for the current color scheme.
 * Supports light-first clinical clarity with Midnight Clinical Zen dark mode.
 */
export function useTheme() {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const systemScheme = useRNColorScheme();
  const effectiveScheme = colorScheme === 'system' ? (systemScheme ?? 'light') : colorScheme;
  const isDark = effectiveScheme === 'dark';
  const colors: ThemeColors = isDark ? MidnightDarkColors : LightColors;

  return {
    colorScheme,
    isDark,
    colors,
    spacing: Spacing,
    radius: Radius,
    borders: Borders,
    layout: Layout,
    icons: Icons,
    typography: Typography,
    shadows: Shadows,
  };
}
