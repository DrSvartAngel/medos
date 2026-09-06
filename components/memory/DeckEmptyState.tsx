import { useTranslation } from '@/i18n';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';

export function DeckEmptyState({ onAdd }: { onAdd: () => void }) {
  const t = useTranslation();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();

  return (
    <Card
      elevated
      style={[styles.card, { marginTop: spacing.lg, paddingVertical: isTablet ? 56 : 36 }]}
    >
      <Feather name="layers" size={isTablet ? 60 : 48} color={colors.accent} />
      <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>
        {t.sweep.firstDeck}</AppText>
      <AppText
        variant="body"
        color={colors.textSecondary}
        style={styles.description}
      >
        {t.sweep.firstDeckHelp}</AppText>
      <Button
        label={t.sweep.createDeck}
        onPress={onAdd}
        size={isTablet ? 'lg' : 'md'}
        style={{ marginTop: spacing.lg }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  description: {
    alignSelf: 'center',
    marginTop: 8,
    maxWidth: 420,
    textAlign: 'center',
  },
});
