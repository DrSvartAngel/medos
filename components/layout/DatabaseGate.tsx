import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

interface DatabaseGateProps {
  isInitializing: boolean;
  hasError: boolean;
  onRetry: () => void;
}

export function DatabaseGate({ isInitializing, hasError, onRetry }: DatabaseGateProps) {
  const { colors, spacing } = useTheme();
  const t = useTranslation();

  return (
    <ScreenWrapper scrollable={false} contentStyle={styles.content}>
      {isInitializing ? (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {t.common.loading}
          </AppText>
        </>
      ) : hasError ? (
        <>
          <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
            <Feather name="database" size={28} color={colors.warning} />
          </View>
          <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            {t.common.dbNotReady}
          </AppText>
          <AppText
            color={colors.textMuted}
            style={{ marginTop: spacing.xs, marginBottom: spacing.lg, textAlign: 'center' }}
          >
            {t.sweep.operationError}
          </AppText>
          <Button
            label={t.common.dbRetry}
            accessibilityLabel={t.common.dbRetry}
            onPress={onRetry}
          />
        </>
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
