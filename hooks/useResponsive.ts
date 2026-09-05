import { useWindowDimensions } from 'react-native';

/** Breakpoints (dp) */
const BREAKPOINTS = {
  phone: 0,
  tablet: 600,
  largeTablet: 840,
} as const;

export type DeviceClass = 'phone' | 'tablet' | 'largeTablet';

export interface Responsive {
  width: number;
  height: number;
  isPhone: boolean;
  isTablet: boolean;
  isLargeTablet: boolean;
  deviceClass: DeviceClass;
  /** Max content width – keeps readable line lengths on large screens */
  contentMaxWidth: number;
  /** Number of grid columns appropriate for current width */
  columns: (base?: number) => number;
  /** Responsive spacing multiplier */
  spacingScale: number;
  isLandscape: boolean;
}

/**
 * Returns responsive layout information based on current window dimensions.
 * Re-renders automatically on orientation change.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const deviceClass: DeviceClass =
    width >= BREAKPOINTS.largeTablet ? 'largeTablet' :
    width >= BREAKPOINTS.tablet      ? 'tablet'      :
                                       'phone';

  const isPhone       = deviceClass === 'phone';
  const isTablet      = deviceClass === 'tablet' || deviceClass === 'largeTablet';
  const isLargeTablet = deviceClass === 'largeTablet';

  // Max content width prevents full-bleed stretching on large screens
  const contentMaxWidth =
    isLargeTablet ? 900 :
    isTablet      ? 720 :
                    Number.MAX_SAFE_INTEGER; // no cap on phone

  const spacingScale = isLargeTablet ? 1.5 : isTablet ? 1.25 : 1;

  function columns(base = 1): number {
    if (base === 1) {
      return isLargeTablet ? 3 : isTablet ? 2 : 1;
    }
    if (base === 2) {
      return isLargeTablet ? 4 : isTablet ? 3 : 2;
    }
    return base;
  }

  return { width, height, isPhone, isTablet, isLargeTablet, deviceClass, contentMaxWidth, columns, spacingScale, isLandscape };
}
