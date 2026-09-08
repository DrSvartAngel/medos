import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Progress as GSProgress, ProgressFilledTrack } from './progress/index';
import { GSText, HStack } from './gluestack';
import { useTheme } from '@/hooks/useTheme';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
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
  className,
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
      className={className}
    >
      {label || showPercentage ? (
        <HStack style={[styles.labelRow, { marginBottom: spacing.xs }]}>
          {label ? (
            <GSText size="xs" style={{ color: colors.textSecondary }}>
              {label}
            </GSText>
          ) : (
            <View />
          )}
          {showPercentage ? (
            <GSText
              size="xs"
              style={{ color: colors.textPrimary, fontWeight: '600' }}
            >
              {percentage}%
            </GSText>
          ) : null}
        </HStack>
      ) : null}

      <GSProgress
        value={percentage}
        style={[
          styles.track,
          {
            height,
            backgroundColor: resolvedTrackColor,
            borderRadius: radius.full,
          },
        ]}
      >
        <ProgressFilledTrack
          style={{
            height,
            backgroundColor: resolvedColor,
            borderRadius: radius.full,
          }}
        />
      </GSProgress>
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
    width: '100%',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
