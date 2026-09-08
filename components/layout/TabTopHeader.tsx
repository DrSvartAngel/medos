import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

interface TabTopHeaderProps {
  showHome?: boolean;
}

export function TabTopHeader({ showHome = true }: TabTopHeaderProps) {
  const { colors, radius } = useTheme();
  const t = useTranslation();

  return (
    <View
      style={[
        styles.container,
        { justifyContent: showHome ? 'space-between' : 'flex-end' },
      ]}
    >
      {showHome && (
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
      )}

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
