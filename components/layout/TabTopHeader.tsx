import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { AppText } from '@/components/ui/Typography';

interface TabTopHeaderProps {
  showHome?: boolean;
  returnTo?: string;
  returnLabel?: string;
}

export function TabTopHeader({ showHome = true, returnTo, returnLabel = 'Back' }: TabTopHeaderProps) {
  const { colors, radius } = useTheme();
  const t = useTranslation();

  return (
    <View
      style={[
        styles.container,
        { justifyContent: showHome ? 'space-between' : 'flex-end' },
      ]}
    >
      {returnTo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={returnLabel}
          onPress={() => router.replace(returnTo as Href)}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.cardBorder,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: 12,
              height: 44,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <AppText variant="label" style={{ color: colors.primary, fontWeight: '600' }}>
            {returnLabel}
          </AppText>
        </Pressable>
      ) : showHome ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.tabs.home}
          onPress={() => router.push('/(tabs)' as Href)}
          style={({ pressed }) => [
            styles.navIconButton,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.cardBorder,
              borderRadius: radius.md,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          hitSlop={4}
        >
          <Feather name="home" size={20} color={colors.primary} />
        </Pressable>
      ) : <View />}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.tabs.profile}
        onPress={() => router.push('/(tabs)/profile' as Href)}
        style={({ pressed }) => [
          styles.navIconButton,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.cardBorder,
            borderRadius: radius.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        hitSlop={4}
      >
        <Feather name="user" size={20} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
    paddingBottom: 8,
    paddingTop: 4,
    width: '100%',
  },
  navIconButton: {
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    width: 44,
  },
});
