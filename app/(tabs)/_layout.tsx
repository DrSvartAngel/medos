/**
 * (tabs)/_layout.tsx — Phase 14.6F
 *
 * Canonical primary navigation shell.
 *
 * PHONE: 4-destination bottom tab bar (TODAY / ATLAS / PRACTICE / PLAN)
 *   - standard expo-router Tabs with custom styling
 *   - safe area handled by Expo Tabs (bottom inset, Android edge-to-edge)
 *   - hidden during active Focus session
 *
 * TABLET: persistent left navigation rail (TabletNavRail)
 *   - bottom tab bar hidden
 *   - rail renders in a flex-row wrapper alongside the tab content
 *   - TabletNavRail drives primary navigation
 *
 * FOCUS: immersive
 *   - focus route is hidden from tab bar (href: null)
 *   - when Focus timer is active, bottom bar is hidden on phone too
 *   - rail receives visible={!isFocusActive} on tablet
 *
 * ASK MEDOS (ai tab): contextual, NOT primary navigation
 *   - hidden from tab bar (href: null)
 *   - accessible from contextual entry points on screens
 */
import { Tabs, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { ShellLayout } from '@/theme/layout';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/i18n';
import { TabletNavRail } from '@/components/layout/TabletNavRail';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TabConfig {
  name: string;
  titleKey: 'today' | 'atlas' | 'practice' | 'plan';
  icon: FeatherIconName;
  accessibilityLabel?: string;
}

/**
 * Canonical 4 primary destinations — Phase 14.6F locked architecture.
 * Order determines bottom-nav order on phone.
 */
const PRIMARY_TABS: TabConfig[] = [
  { name: 'index',      titleKey: 'today',    icon: 'sun' },
  { name: 'committees', titleKey: 'atlas',    icon: 'map' },
  { name: 'practice',   titleKey: 'practice', icon: 'layers' },
  { name: 'calendar',   titleKey: 'plan',     icon: 'calendar' },
];

/**
 * Routes that exist within (tabs) but are NOT primary navigation destinations.
 * Must be explicitly declared with href:null to suppress from tab bar.
 */
const HIDDEN_ROUTES = [
  { name: 'focus' },    // Immersive — launched from Practice, not a primary tab
  { name: 'memory' },   // Surfaced through Practice tab; retained as a direct route for contextual deep links
  { name: 'ai' },       // Ask MedOS — contextual only
  { name: 'profile' },  // Settings/profile — contextual only
] as const;

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabLayout() {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const t = useTranslation();
  const pathname = usePathname();

  // Suppress primary navigation ONLY while the actual Focus route is rendered
  const isFocusRoute = pathname === '/focus' || pathname.includes('/focus');

  // ── Bottom bar geometry (phone + Android edge-to-edge) ──────────────────
  // On Android with edgeToEdgeEnabled:true the app draws behind the system
  // navigation bar. Insets.bottom compensates. iOS already sizes itself correctly.
  const androidBottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  const baseTabBarHeight = Platform.OS === 'ios' ? 84 : 64;
  const baseTabBarPaddingBottom = Platform.OS === 'ios' ? Spacing.lg : Spacing.sm;

  const tabBarHeight = baseTabBarHeight + androidBottomInset;
  const tabBarPaddingBottom = baseTabBarPaddingBottom + androidBottomInset;

  const iconSize = isTablet ? 24 : 22;
  const labelSize = isTablet ? 12 : 11;

  /**
   * Tab bar style rules:
   * - Tablet: always hidden (rail handles navigation)
   * - Phone during Focus route: hidden (immersive mode)
   * - Phone otherwise: visible 4-tab bottom bar
   */
  const tabBarDisplay: 'none' | 'flex' =
    isTablet || isFocusRoute ? 'none' : 'flex';

  const tabBarStyle = {
    display: tabBarDisplay,
    backgroundColor: colors.tabBar,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    height: tabBarHeight,
    paddingBottom: tabBarPaddingBottom,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  } as const;

  const tabs = (
    <Tabs
      initialRouteName="index"
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: '600',
          marginTop: 3,
          letterSpacing: 0.2,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      {/* ── Hidden routes (suppressed from tab bar) ───────────────────────── */}
      {HIDDEN_ROUTES.map((route) => (
        <Tabs.Screen
          key={route.name}
          name={route.name}
          options={{ href: null }}
        />
      ))}

      {/* ── Primary navigation destinations ───────────────────────────────── */}
      {PRIMARY_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t.tabs[tab.titleKey],
            tabBarAccessibilityLabel: tab.accessibilityLabel ?? t.tabs[tab.titleKey],
            tabBarIcon: ({ color }) => (
              <Feather name={tab.icon} size={iconSize} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );

  // ── Tablet: rail + content side-by-side ─────────────────────────────────
  if (isTablet) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <TabletNavRail visible={!isFocusRoute} />
        <View style={{ flex: 1 }}>
          {tabs}
        </View>
      </View>
    );
  }

  // ── Phone: standard tabs (bar visible/hidden per state) ──────────────────
  return tabs;
}
