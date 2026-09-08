import { useAppStore } from '@/store/useAppStore';
import { DarkColors, LightColors, type ThemeColors } from '@/theme/colors';
import { Spacing, Radius } from '@/theme/spacing';
import { Typography } from '@/theme/typography';

/**
 * Returns theme tokens resolved for the current color scheme.
 * Supports dark mode (primary) and accessible light mode.
 */
export function useTheme() {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const isDark = colorScheme !== 'light';
  const colors: ThemeColors = isDark ? DarkColors : (LightColors as unknown as ThemeColors);

  return {
    colorScheme,
    isDark,
    colors,
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
  };
}
