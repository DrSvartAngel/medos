import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Typography } from '@/theme/typography';
import { Spacing } from '@/theme/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/i18n';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface TabConfig {
  name: string;
  titleKey: keyof ReturnType<typeof useTranslation>['tabs'];
  icon: FeatherIconName;
}

const TAB_CONFIGS: TabConfig[] = [
  { name: 'index',       titleKey: 'dashboard',  icon: 'home' },
  { name: 'committees',  titleKey: 'committees', icon: 'book-open' },
  { name: 'focus',       titleKey: 'focus',      icon: 'clock' },
  { name: 'memory',      titleKey: 'memory',     icon: 'layers' },
  { name: 'calendar',    titleKey: 'calendar',   icon: 'calendar' },
  { name: 'profile',     titleKey: 'profile',    icon: 'user' },
];

export default function TabLayout() {
  const { colors } = useTheme();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const t = useTranslation();

  // On Android with edgeToEdgeEnabled:true the app draws behind the system
  // navigation bar, so the tab bar must grow by the device-reported bottom
  // inset to clear gesture / 3-button navigation. iOS heights are left
  // unchanged because those values were already manually sized for the home
  // indicator — adding insets.bottom again would double-count on iOS.
  const androidBottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  // Base content heights (icon + label + paddingTop).
  const baseTabBarHeight = isTablet
    ? Platform.OS === 'ios' ? 96 : 72
    : Platform.OS === 'ios' ? 84 : 64;

  // Base padding below the label content.
  const baseTabBarPaddingBottom = isTablet
    ? Platform.OS === 'ios' ? Spacing.xl : Spacing.md
    : Platform.OS === 'ios' ? Spacing.lg : Spacing.sm;

  // Final values: base + reported bottom inset (0 on iOS, device value on Android).
  const tabBarHeight = baseTabBarHeight + androidBottomInset;
  const tabBarPaddingBottom = baseTabBarPaddingBottom + androidBottomInset;

  const iconSize = isTablet ? 26 : 22;
  const labelSize = isTablet ? Typography.size.sm : Typography.size.xs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: Spacing.xs,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: labelSize,
          fontWeight: Typography.weight.medium,
          marginTop: 2,
        },
      }}
    >
      {TAB_CONFIGS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t.tabs[tab.titleKey],
            tabBarIcon: ({ color }) => (
              <Feather name={tab.icon} size={iconSize} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
