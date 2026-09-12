/**
 * TabletNavRail — Phase 14.6F
 *
 * Persistent left navigation rail for tablet viewports.
 * Renders the 4 canonical Phase 14 primary destinations:
 * TODAY · ATLAS · PRACTICE · PLAN
 *
 * Architecture rules:
 * - Width: ShellLayout.railWidth (72dp)
 * - Suppressed during Focus immersive session (visible=false)
 * - Suppressed on phone (caller responsibility via isTablet guard)
 * - Does NOT appear in Focus, does NOT show Ask MedOS
 * - Active state: accentMoss icon/label, accentSoft pill background
 * - Inactive state: textMuted icon, no pill
 * - Minimum touch target: 44×44 per hit area
 */
import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { router, usePathname, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { ShellLayout } from '@/theme/layout';
import { AppText } from '@/components/ui/Typography';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface NavDestination {
  /** Route href for navigation */
  href: Href;
  /** Feather icon name */
  icon: FeatherIconName;
  /** i18n label key */
  label: string;
  /** Accessible label */
  accessibilityLabel: string;
  /** Route segment to match for active detection */
  matchSegment: string;
}

interface TabletNavRailProps {
  /** Whether the rail is visible (false during Focus immersive mode) */
  visible?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TabletNavRail({ visible = true, style }: TabletNavRailProps) {
  const { colors, borders } = useTheme();
  const t = useTranslation();
  const pathname = usePathname();

  if (!visible) return null;

  const destinations: NavDestination[] = [
    {
      href: '/(tabs)' as Href,
      icon: 'sun',
      label: t.tabs.today,
      accessibilityLabel: t.tabs.today,
      matchSegment: 'index',
    },
    {
      href: '/(tabs)/committees' as Href,
      icon: 'map',
      label: t.tabs.atlas,
      accessibilityLabel: t.tabs.atlas,
      matchSegment: '/committees',
    },
    {
      href: '/(tabs)/practice' as Href,
      icon: 'layers',
      label: t.tabs.practice,
      accessibilityLabel: t.tabs.practice,
      matchSegment: '/practice',
    },
    {
      href: '/(tabs)/calendar' as Href,
      icon: 'calendar',
      label: t.tabs.plan,
      accessibilityLabel: t.tabs.plan,
      matchSegment: '/calendar',
    },
  ];

  /**
   * Determines if a destination is active based on current pathname.
   * Handles both the root index and named segments.
   */
  function isActive(dest: NavDestination): boolean {
    if (dest.matchSegment === 'index') {
      // Root index tab: active only when exactly at root
      return pathname === '/' || pathname === '' || pathname === '/(tabs)';
    }
    return pathname.includes(dest.matchSegment);
  }

  return (
    <View
      style={[
        styles.rail,
        {
          width: ShellLayout.railWidth,
          backgroundColor: colors.surfaceSubtle,
          borderRightColor: colors.borderSubtle,
          borderRightWidth: borders.hairline,
        },
        style,
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel="Primary Navigation"
    >
      {/* Rail top spacer — aligns with content top */}
      <View style={styles.topSpacer} />

      {destinations.map((dest) => {
        const active = isActive(dest);
        const iconColor = active ? colors.accentMoss : colors.textMuted;

        return (
          <Pressable
            key={dest.matchSegment}
            accessibilityRole="button"
            accessibilityLabel={dest.accessibilityLabel}
            accessibilityState={{ selected: active }}
            onPress={() => router.push(dest.href)}
            style={({ pressed }) => [
              styles.item,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            {/* Icon pill — background only when active */}
            <View
              style={[
                styles.iconPill,
                active
                  ? {
                      backgroundColor: colors.accentSoft,
                      borderRadius: 12,
                    }
                  : undefined,
              ]}
            >
              <Feather name={dest.icon} size={22} color={iconColor} />
            </View>

            {/* Label below icon */}
            <AppText
              variant="caption"
              style={[
                styles.label,
                {
                  color: active ? colors.accentMoss : colors.textMuted,
                  fontWeight: active ? '600' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {dest.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    height: '100%',
    alignItems: 'center',
    paddingBottom: 24,
  },
  topSpacer: {
    height: 16,
  },
  item: {
    // Minimum 44×44 touch target per spec
    minHeight: 56,
    minWidth: ShellLayout.railWidth,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  iconPill: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
