import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

export function FocusEmptyHistory() {
  const { colors, spacing } = useTheme();
  const t = useTranslation();

  return (
    <Card>
      <View style={styles.content}>
        <Feather name="clock" size={28} color={colors.textMuted} />
        <AppText variant="body" style={{ marginTop: spacing.sm }}>
          {t.focus.history.empty}
        </AppText>
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          style={[styles.message, { marginTop: spacing.xs }]}
        >
          {t.focus.history.emptyDesc}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  message: {
    maxWidth: 320,
    textAlign: 'center',
  },
});
