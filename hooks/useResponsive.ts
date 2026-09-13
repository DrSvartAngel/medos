import { useWindowDimensions } from 'react-native';
import {
  Breakpoints,
  PageLayout,
  ContentWidths,
  Layout,
  type BreakpointKey,
} from '@/theme/layout';

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
  isPortrait: boolean;
  /** Canonical screen edge gutter for current device class (phone: 16, tablet: 24, largeTablet: 32) */
  gutter: number;
  /** Content width presets (content: 720, wide: 900) */
  contentWidth: typeof ContentWidths;
  /** Breakpoints source of truth */
  breakpoints: typeof Breakpoints;
}

/**
 * Returns responsive layout information based on current window dimensions.
 * Re-renders automatically on orientation change.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isPortrait = !isLandscape;

  const deviceClass: DeviceClass =
    width >= Breakpoints.largeTablet ? 'largeTablet' :
    width >= Breakpoints.tablet      ? 'tablet'      :
                                       'phone';

  const isPhone       = deviceClass === 'phone';
  const isTablet      = deviceClass === 'tablet' || deviceClass === 'largeTablet';
  const isLargeTablet = deviceClass === 'largeTablet';

  // Canonical page edge gutter for current viewport class
  const gutter =
    isLargeTablet ? PageLayout.gutterLargeTablet :
    isTablet      ? PageLayout.gutterTablet :
                    PageLayout.gutterPhone;

  // Max content width prevents full-bleed stretching on large screens
  const contentMaxWidth =
    isLargeTablet ? ContentWidths.workspace :
    isTablet      ? (isLandscape ? ContentWidths.workspace : ContentWidths.wide) :
                    Number.MAX_SAFE_INTEGER; // no cap on phone

  const spacingScale =
    isLargeTablet ? Layout.spacingScale.largeTablet :
    isTablet      ? Layout.spacingScale.tablet :
                    Layout.spacingScale.phone;

  function columns(base = 1): number {
    if (base === 1) {
      return isLargeTablet ? 3 : isTablet ? 2 : 1;
    }
    if (base === 2) {
      return isLargeTablet ? 4 : isTablet ? 3 : 2;
    }
    return base;
  }

  return {
    width,
    height,
    isPhone,
    isTablet,
    isLargeTablet,
    deviceClass,
    contentMaxWidth,
    columns,
    spacingScale,
    isLandscape,
    isPortrait,
    gutter,
    contentWidth: ContentWidths,
    breakpoints: Breakpoints,
  };
}
