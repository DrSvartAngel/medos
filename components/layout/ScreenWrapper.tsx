import React from 'react';
import { ScrollView, View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';

export interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pass false to disable the tablet centered container (e.g. for full-bleed maps) */
  centered?: boolean;
  /** Standalone stack routes can opt into the bottom system inset. */
  includeBottomSafeArea?: boolean;
  className?: string;
}

export function ScreenWrapper({
  children,
  scrollable = true,
  style,
  contentStyle,
  centered = true,
  includeBottomSafeArea = false,
  className,
}: ScreenWrapperProps) {
  const { colors, spacing } = useTheme();
  const { contentMaxWidth, spacingScale } = useResponsive();

  const padding = spacing.md * spacingScale;

  const inner = (
    <View
      style={[
        styles.content,
        {
          padding,
          // Center content on tablets with a max-width cap
          maxWidth: centered ? contentMaxWidth : undefined,
          width: '100%',
          alignSelf: 'center',
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
      edges={
        includeBottomSafeArea
          ? ['top', 'right', 'bottom', 'left']
          : ['top', 'left', 'right']
      }
      style={[styles.safe, { backgroundColor: colors.background }, style]}
    >
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        inner
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
    alignItems: 'center', // centers the maxWidth container
  },
  content: {
    flex: 1,
  },
});
