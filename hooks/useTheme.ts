import { useAppStore } from '@/store/useAppStore';
import { Colors } from '@/theme/colors';
import { Spacing, Radius } from '@/theme/spacing';
import { Typography } from '@/theme/typography';

/**
 * Returns theme tokens resolved for the current color scheme.
 * Currently always dark; extends to light mode via colorScheme toggle in Phase 2.
 */
export function useTheme() {
  const colorScheme = useAppStore((s) => s.colorScheme);

  return {
    colorScheme,
    colors: Colors,   // Phase 2 will swap to a light palette when colorScheme === 'light'
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
  };
}
