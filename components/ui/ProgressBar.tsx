import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from './Typography';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = false,
  color,
  trackColor,
  height = 8,
  accessibilityLabel,
  style,
}: ProgressBarProps) {
  const { colors, spacing, radius } = useTheme();

  const safeMax = max <= 0 ? 100 : max;
  const clampedValue = Math.max(0, Math.min(safeMax, isNaN(value) ? 0 : value));
  const percentage = Math.round((clampedValue / safeMax) * 100);

  const resolvedColor = color ?? colors.primary;
  const resolvedTrackColor = trackColor ?? colors.surfaceHighlight;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: safeMax, now: clampedValue }}
      accessibilityLabel={accessibilityLabel ?? label ?? `${percentage}%`}
      style={[styles.container, style]}
    >
      {label || showPercentage ? (
        <View style={[styles.labelRow, { marginBottom: spacing.xs }]}>
          {label ? (
            <AppText variant="caption" color={colors.textSecondary}>
              {label}
            </AppText>
          ) : <View />}
          {showPercentage ? (
            <AppText variant="caption" color={colors.textPrimary} style={{ fontWeight: '600' }}>
              {percentage}%
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: resolvedTrackColor,
            borderRadius: radius.full,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              height,
              backgroundColor: resolvedColor,
              borderRadius: radius.full,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    minWidth: 0,
  },
});
