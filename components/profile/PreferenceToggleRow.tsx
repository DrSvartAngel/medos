import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

interface PreferenceToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

export function PreferenceToggleRow({
  label,
  description,
  value,
  onValueChange,
  accessibilityLabel,
}: PreferenceToggleRowProps) {
  const { colors, spacing } = useTheme();
  const t = useTranslation();

  return (
    <View style={[styles.row, { gap: spacing.md }]}>
      <View style={styles.copy}>
        <AppText variant="label">{label}</AppText>
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={{ marginTop: spacing.xs }}
        >
          {description}
        </AppText>
      </View>

      <View style={[styles.control, { gap: spacing.xs }]}>
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={styles.status}
        >
          {value ? t.common.on : t.common.off}
        </AppText>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={description}
          accessibilityState={{ checked: value }}
          hitSlop={8}
          ios_backgroundColor={colors.border}
          onValueChange={onValueChange}
          thumbColor={value ? colors.primary : colors.textSecondary}
          trackColor={{ false: colors.border, true: colors.primaryMuted }}
          value={value}
          style={styles.switch}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    width: '100%',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  control: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    minHeight: 48,
  },
  status: {
    minWidth: 24,
    textAlign: 'right',
  },
  switch: {
    minHeight: 44,
  },
});
