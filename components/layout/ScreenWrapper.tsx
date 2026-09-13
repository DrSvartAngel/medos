import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { PageContainer, type PageContainerProps, type PageMaxWidthRole } from './PageContainer';

export interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pass false to disable the tablet centered container (e.g. for full-bleed maps) */
  centered?: boolean;
  /** Standalone stack routes can opt into the bottom system inset. */
  includeBottomSafeArea?: boolean;
  /** Maximum readable content width constraint (default: 'workspace'/'wide' on tablet, 'full' on phone) */
  maxWidth?: PageMaxWidthRole;
  className?: string;
}

/**
 * ScreenWrapper: standard responsive screen wrapper.
 * Unifies with canonical PageContainer primitive while preserving 100% backward compatibility.
 */
export function ScreenWrapper({
  children,
  scrollable = true,
  style,
  contentStyle,
  centered = true,
  includeBottomSafeArea = false,
  maxWidth,
  className,
}: ScreenWrapperProps) {
  return (
    <PageContainer
      scrollable={scrollable}
      style={style}
      contentStyle={contentStyle}
      centered={centered}
      includeBottomSafeArea={includeBottomSafeArea}
      maxWidth={maxWidth}
      className={className}
    >
      {children}
    </PageContainer>
  );
}
