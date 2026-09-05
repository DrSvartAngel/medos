import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { TimerStatus } from '@/store/useFocusStore';
import { useTranslation } from '@/i18n';

interface SessionControlsProps {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export function SessionControls({
  status,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onReset,
}: SessionControlsProps) {
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const size = isTablet ? 'lg' : 'md';

  if (status === 'idle') {
    return (
      <View style={{ gap: spacing.sm }}>
        <Button label={t.focus.startSession} size={size} onPress={onStart} />
        <Button label={t.focus.resetSetup} size={size} variant="ghost" onPress={onReset} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={[styles.primaryRow, { gap: spacing.sm }]}>
        {status === 'paused' ? (
          <Button label={t.focus.controls.resume} size={size} onPress={onResume} style={styles.flexButton} />
        ) : (
          <Button
            label={t.focus.controls.pause}
            size={size}
            variant="secondary"
            onPress={onPause}
            style={styles.flexButton}
          />
        )}
        <Button
          label={t.focus.controls.finish}
          size={size}
          onPress={onFinish}
          style={styles.flexButton}
        />
      </View>
      <Button
        label={t.focus.controls.cancelSession}
        size={size}
        variant="ghost"
        onPress={onCancel}
        textStyle={{ color: colors.error }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  primaryRow: {
    flexDirection: 'row',
  },
  flexButton: {
    flex: 1,
  },
});
