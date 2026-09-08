import { useAppStore } from '@/store/useAppStore';
import type { ModeType } from '@/components/ui/gluestack-ui-provider';

/**
 * MedOS Theme Bridge
 *
 * Connects the existing MedOS theme preference architecture with
 * GluestackUIProvider and UniWind semantic runtime classes.
 *
 * Resolves:
 *   MedOS theme preference -> Gluestack mode ('light' | 'dark' | 'system') -> UniWind classes
 */
export function resolveThemeMode(colorScheme?: string | null): ModeType {
  if (colorScheme === 'dark') return 'dark';
  if (colorScheme === 'light') return 'light';
  if (colorScheme === 'system') return 'system';
  // Evaluation default: light-first clinical clarity
  return 'light';
}

export function useThemeBridge(): {
  mode: ModeType;
  isDark: boolean;
} {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const mode = resolveThemeMode(colorScheme);
  return {
    mode,
    isDark: mode === 'dark',
  };
}
