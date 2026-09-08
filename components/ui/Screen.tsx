import React from 'react';
import { ScreenWrapper, type ScreenWrapperProps } from '@/components/layout/ScreenWrapper';

export type ScreenProps = ScreenWrapperProps;

/**
 * Standard page container for MedOS.
 * Provides theme-aware background, safe area handling, and responsive content centering.
 * Delegates directly to ScreenWrapper for architectural unity.
 */
export function Screen(props: ScreenProps) {
  return <ScreenWrapper {...props} />;
}
