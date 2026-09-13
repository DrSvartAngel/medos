import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { ContentWidths, type ContentWidthRole } from '@/theme/layout';

export type PageMaxWidthRole = 'content' | 'wide' | 'workspace' | 'full' | 'none' | number;

export interface PageContainerProps {
  children: React.ReactNode;
  /** Whether the container scrolls vertically (default: false) */
  scrollable?: boolean;
  /** Explicit horizontal edge gutter override; defaults to canonical responsive gutter (16/24/32) */
  gutter?: number;
  /** Maximum readable content width constraint (default: 'workspace' on large/landscape tablet, 'wide' on portrait tablet, 'full' on phone) */
  maxWidth?: PageMaxWidthRole;
  /** Whether to center the content container within available width (default: true) */
  centered?: boolean;
  /** Safe area edges to respect (default: ['top', 'left', 'right']) */
  safeAreaEdges?: Edge[];
  /** Standalone routes can opt into bottom system safe area */
  includeBottomSafeArea?: boolean;
  /** Outer container style */
  style?: StyleProp<ViewStyle>;
  /** Content region style */
  contentStyle?: StyleProp<ViewStyle>;
  /** ScrollView container style when scrollable is true */
  scrollContentStyle?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * PageContainer primitive
 * Canonical screen/page layout foundation enforcing Neutral Zen geometry:
 * - Responsive edge gutters: 16dp (phone), 24dp (tablet), 32dp (large tablet)
 * - Controlled readable content widths (720dp content / 900dp wide / 1200dp workspace)
 * - Coordinated safe-area insets without nested duplication
 */
export function PageContainer({
  children,
  scrollable = false,
  gutter: customGutter,
  maxWidth,
  centered = true,
  safeAreaEdges,
  includeBottomSafeArea = false,
  style,
  contentStyle,
  scrollContentStyle,
  className,
}: PageContainerProps) {
  const { colors } = useTheme();
  const { gutter: responsiveGutter, isTablet, isLargeTablet, isLandscape } = useResponsive();

  const resolvedGutter = customGutter ?? responsiveGutter;

  // Resolve max width constraint
  let resolvedMaxWidth: number | undefined;
  if (typeof maxWidth === 'number') {
    resolvedMaxWidth = maxWidth;
  } else if (maxWidth === 'content') {
    resolvedMaxWidth = ContentWidths.content;
  } else if (maxWidth === 'wide') {
    resolvedMaxWidth = ContentWidths.wide;
  } else if (maxWidth === 'workspace') {
    resolvedMaxWidth = ContentWidths.workspace;
  } else if (maxWidth === 'full' || maxWidth === 'none') {
    resolvedMaxWidth = undefined;
  } else {
    // Default: constrained on tablet, full width on phone
    resolvedMaxWidth = isLargeTablet
      ? ContentWidths.workspace
      : isTablet
        ? (isLandscape ? ContentWidths.workspace : ContentWidths.wide)
        : undefined;
  }

  const resolvedEdges: Edge[] =
    safeAreaEdges ??
    (includeBottomSafeArea
      ? ['top', 'left', 'right', 'bottom']
      : ['top', 'left', 'right']);

  const content = (
    <View
      style={[
        styles.content,
        {
          paddingHorizontal: resolvedGutter,
          maxWidth: resolvedMaxWidth,
          alignSelf: centered ? 'center' : 'stretch',
        },
        contentStyle,
      ]}
      className={className}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={resolvedEdges}
      style={[styles.safe, { backgroundColor: colors.background }, style]}
    >
      {scrollable ? (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            centered && { alignItems: 'center' },
            scrollContentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    width: '100%',
  },
});
