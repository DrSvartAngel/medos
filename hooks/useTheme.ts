import { useColorScheme as useRNColorScheme } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { DarkColors, LightColors, type ThemeColors } from '@/theme/colors';
import { Spacing, Radius } from '@/theme/spacing';
import { Typography } from '@/theme/typography';
import { Shadows } from '@/theme/shadows';

/**
 * Returns theme tokens resolved for the current color scheme.
 * Supports light-first clinical clarity with charcoal/navy dark mode.
 */
export function useTheme() {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const systemScheme = useRNColorScheme();
  const effectiveScheme = colorScheme === 'system' ? (systemScheme ?? 'light') : colorScheme;
  const isDark = effectiveScheme === 'dark';
  const colors: ThemeColors = isDark ? DarkColors : LightColors;

  return {
    colorScheme,
    isDark,
    colors,
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
    shadows: Shadows,
  };
}
