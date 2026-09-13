import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { AppText } from '@/components/ui/Typography';
import { Interaction } from '@/theme/interaction';
import { IconSizes } from '@/theme/icons';

export interface ScreenHeaderProps {
  /** Main screen title */
  title: string;
  /** Optional eyebrow metadata above title (e.g. date, committee context) */
  eyebrow?: string;
  /** Optional subtitle or description below title */
  subtitle?: string;
  /** Optional back navigation handler */
  onBack?: () => void;
  /** Accessible label for back action */
  backLabel?: string;
  /** Custom leading element (replaces back button if provided) */
  leading?: React.ReactNode;
  /** Restrained trailing action (e.g. action button, menu icon, secondary trigger) */
  trailing?: React.ReactNode;
  /** Optional status badge or pill adjacent to title */
  badge?: React.ReactNode;
  /** Style overrides for header container */
  style?: StyleProp<ViewStyle>;
  /** Optional bottom hairline divider (default: false) */
  borderBottom?: boolean;
}

/**
 * ScreenHeader: Canonical editorial screen header.
 * Replaces legacy floating-pill TabTopHeader with quiet, typography-first hierarchy.
 * Consumes strictly Phase 14 semantic tokens and preserves accessible touch targets.
 */
export function ScreenHeader({
  title,
  eyebrow,
  subtitle,
  onBack,
  backLabel = 'Back',
  leading,
  trailing,
  badge,
  style,
  borderBottom = false,
}: ScreenHeaderProps) {
  const { colors, spacing, borders } = useTheme();
  const { isTablet } = useResponsive();

  const showLeading = Boolean(leading || onBack);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: spacing.xs,
          paddingBottom: spacing.sm,
          borderBottomColor: borderBottom ? colors.borderSubtle : 'transparent',
          borderBottomWidth: borderBottom ? borders.hairline : 0,
        },
        style,
      ]}
      accessibilityRole="header"
    >
      {/* Top row: leading back trigger + trailing accessory */}
      {(showLeading || trailing) && (
        <View style={styles.utilityRow}>
          <View style={styles.leadingZone}>
            {leading ? (
              leading
            ) : onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={backLabel}
                onPress={onBack}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.backBtn,
                  { opacity: pressed ? Interaction.pressedOpacity : 1 },
                ]}
              >
                <Feather name="arrow-left" size={IconSizes.md} color={colors.textPrimary} />
                <AppText
                  variant="labelM"
                  style={[styles.backLabel, { color: colors.textSecondary }]}
                >
                  {backLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {trailing ? <View style={styles.trailingZone}>{trailing}</View> : null}
        </View>
      )}

      {/* Eyebrow context */}
      {eyebrow ? (
        <AppText
          variant="labelS"
          color={colors.textMuted}
          style={[styles.eyebrow, { marginTop: showLeading ? spacing.xs : 0 }]}
          numberOfLines={1}
        >
          {eyebrow}
        </AppText>
      ) : null}

      {/* Main title row */}
      <View style={[styles.titleRow, { marginTop: eyebrow ? spacing.xxs : showLeading ? spacing.xs : 0 }]}>
        <AppText
          variant={isTablet ? 'headingL' : 'headingM'}
          color={colors.textPrimary}
          style={styles.titleText}
          numberOfLines={2}
        >
          {title}
        </AppText>
        {badge ? <View style={{ marginLeft: spacing.sm }}>{badge}</View> : null}
      </View>

      {/* Subtitle */}
      {subtitle ? (
        <AppText
          variant="bodyS"
          color={colors.textSecondary}
          style={{ marginTop: spacing.xxs }}
          numberOfLines={2}
        >
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  utilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: Interaction.minTarget,
    width: '100%',
  },
  leadingZone: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Interaction.minTarget,
  },
  trailingZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: Interaction.minTarget,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Interaction.minTarget,
    minWidth: Interaction.minTarget,
  },
  backLabel: {
    marginLeft: 6,
    fontWeight: '500',
  },
  eyebrow: {
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  titleText: {
    fontWeight: '600',
    letterSpacing: -0.4,
  },
});
