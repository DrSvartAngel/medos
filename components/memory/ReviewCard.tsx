import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { Flashcard } from '@/store/useMemoryStore';
import { useTranslation } from '@/i18n';

interface ReviewCardProps {
  card: Flashcard;
  revealed: boolean;
}

export function ReviewCard({ card, revealed }: ReviewCardProps) {
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();

  return (
    <Card elevated style={[styles.card, { minHeight: isTablet ? 360 : 300, padding: spacing.lg }]}> 
      <View style={styles.section}>
        <AppText variant="caption" color={colors.accent} style={styles.eyebrow}>
          {revealed ? t.review.prompt : t.review.recallThis}
        </AppText>
        <AppText
          variant={isTablet ? 'h1' : 'h2'}
          style={[styles.content, revealed && { fontSize: isTablet ? 24 : 21 }]}
        >
          {card.front}
        </AppText>
      </View>

      {revealed && (
        <View style={[styles.answer, { borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.lg }]}> 
          <AppText variant="caption" color={colors.success} style={styles.eyebrow}>
            {t.review.answer}
          </AppText>
          <AppText variant={isTablet ? 'h2' : 'h3'} style={styles.content}>
            {card.back}
          </AppText>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    justifyContent: 'center',
    width: '100%',
  },
  section: {
    justifyContent: 'center',
  },
  answer: {
    borderTopWidth: 1,
  },
  eyebrow: {
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  content: {
    marginTop: 12,
  },
});
