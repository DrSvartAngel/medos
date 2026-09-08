import React from 'react';
import { ViewStyle } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  centered?: boolean;
  includeBottomSafeArea?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Standard page container for MedOS.
 * Provides theme-aware background, safe area handling, and responsive content centering.
 */
export function Screen({
  children,
  scrollable = true,
  centered = true,
  includeBottomSafeArea = false,
  style,
  contentStyle,
}: ScreenProps) {
  return (
    <ScreenWrapper
      scrollable={scrollable}
      centered={centered}
      includeBottomSafeArea={includeBottomSafeArea}
      style={style}
      contentStyle={contentStyle}
    >
      {children}
    </ScreenWrapper>
  );
}
