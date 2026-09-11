import React from 'react';
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { ShellLayout } from '@/theme/layout';

export interface AppShellProps {
  children: React.ReactNode;
  /** Tablet navigation rail slot (structural slot reserved for Phase 14.6) */
  rail?: React.ReactNode;
  /** Contextual secondary inspector slot (e.g. Ask MedOS, study tools, context) */
  inspector?: React.ReactNode;
  /** Whether the contextual inspector is active/visible (default: true if inspector is provided on tablet) */
  showInspector?: boolean;
  /** Phone bottom navigation slot (structural slot reserved for Phase 14.6) */
  bottomNav?: React.ReactNode;
  /** Safe area edges for the shell container (default: ['top', 'left', 'right', 'bottom']) */
  safeAreaEdges?: Edge[];
  /** Custom rail width override (default: ShellLayout.railWidth = 72) */
  railWidth?: number;
  /** Custom inspector width override (default: ShellLayout.inspectorWidth = 360) */
  inspectorWidth?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  className?: string;
}

/**
 * ShellRail slot primitive
 * Structural container for tablet left navigation rail.
 */
export function ShellRail({
  children,
  width = ShellLayout.railWidth,
  style,
}: {
  children: React.ReactNode;
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, borders } = useTheme();

  return (
    <View
      style={[
        styles.rail,
        {
          width,
          backgroundColor: colors.surfaceSubtle,
          borderRightColor: colors.borderSubtle,
          borderRightWidth: borders.hairline,
        },
        style,
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel="Navigation Rail"
    >
      {children}
    </View>
  );
}

/**
 * ShellMain slot primitive
 * Primary workspace region within the application shell.
 */
export function ShellMain({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.main,
        { backgroundColor: colors.background },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * ShellInspector slot primitive
 * Secondary contextual column on tablet viewports (for Ask MedOS, context, tools).
 */
export function ShellInspector({
  children,
  width = ShellLayout.inspectorWidth,
  style,
}: {
  children: React.ReactNode;
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, borders } = useTheme();

  return (
    <View
      style={[
        styles.inspector,
        {
          width,
          backgroundColor: colors.surfaceSubtle,
          borderLeftColor: colors.borderSubtle,
          borderLeftWidth: borders.hairline,
        },
        style,
      ]}
      accessibilityLabel="Contextual Inspector"
    >
      {children}
    </View>
  );
}

/**
 * AppShell primitive
 * Neutral Zen application frame managing responsive slots across viewports:
 * - Phone: [ Main Workspace ] + [ Bottom Navigation Slot (Phase 14.6) ]
 * - Tablet: [ Rail Slot ] + [ Main Workspace ] + [ Optional Contextual Inspector Slot ]
 *
 * Scrolling Responsibility Convention:
 * - AppShell owns structural viewport frames, safe areas, and column slots (non-scrolling).
 * - Individual pages / workspaces (PageContainer, ScrollView, FlatList) own content scrolling.
 */
export function AppShell({
  children,
  rail,
  inspector,
  showInspector,
  bottomNav,
  safeAreaEdges = ['top', 'left', 'right', 'bottom'],
  railWidth = ShellLayout.railWidth,
  inspectorWidth = ShellLayout.inspectorWidth,
  style,
  contentStyle,
  className,
}: AppShellProps) {
  const { colors, borders } = useTheme();
  const { isTablet } = useResponsive();

  const isInspectorVisible =
    isTablet &&
    Boolean(inspector) &&
    (showInspector !== undefined ? showInspector : true);

  if (isTablet) {
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[styles.shell, { backgroundColor: colors.background }, style]}
      >
        <View style={[styles.tabletContainer, contentStyle]} className={className}>
          {rail ? <ShellRail width={railWidth}>{rail}</ShellRail> : null}
          <ShellMain>{children}</ShellMain>
          {isInspectorVisible ? (
            <ShellInspector width={inspectorWidth}>{inspector}</ShellInspector>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // Phone viewport
  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={[styles.shell, { backgroundColor: colors.background }, style]}
    >
      <View style={[styles.phoneContainer, contentStyle]} className={className}>
        <ShellMain>{children}</ShellMain>
        {bottomNav ? (
          <View
            style={[
              styles.bottomNavContainer,
              {
                backgroundColor: colors.surfaceSubtle,
                borderTopColor: colors.borderSubtle,
                borderTopWidth: borders.hairline,
              },
            ]}
          >
            {bottomNav}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  tabletContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  phoneContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  rail: {
    height: '100%',
    alignItems: 'center',
  },
  main: {
    flex: 1,
    height: '100%',
  },
  inspector: {
    height: '100%',
  },
  bottomNavContainer: {
    width: '100%',
  },
});
