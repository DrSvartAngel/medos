import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import type { ReviewSummaryData } from '@/store/useMemoryStore';
import { useTranslation } from '@/i18n';

interface ReviewSummaryProps {
  summary: ReviewSummaryData;
  onReviewAgain: () => void;
  onDone: () => void;
  doneLabel?: string;
}

export function ReviewSummary({
  summary,
  onReviewAgain,
  onDone,
  doneLabel,
}: ReviewSummaryProps) {
  const { colors, spacing } = useTheme();
  const t = useTranslation();
  const counts = [
    { label: t.review.ratings.again, value: summary.again, color: colors.error },
    { label: t.review.ratings.hard,  value: summary.hard,  color: colors.warning },
    { label: t.review.ratings.good,  value: summary.good,  color: colors.info },
    { label: t.review.ratings.easy,  value: summary.easy,  color: colors.success },
  ];

  return (
    <Card elevated style={[styles.card, { padding: spacing.lg }]}> 
      <View style={[styles.icon, { backgroundColor: colors.accentMuted }]}> 
        <Feather name="check" size={28} color={colors.accent} />
      </View>
      <AppText variant="h2" style={{ marginTop: spacing.md, textAlign: 'center' }}>
        {t.review.sessionDone}
      </AppText>
      <AppText variant="body" color={colors.textSecondary} style={styles.subtitle}>
        {t.review.sessionDoneDesc}
      </AppText>

      <View style={[styles.counts, { gap: spacing.sm, marginTop: spacing.lg }]}> 
        {counts.map((count) => (
          <View key={count.label} style={[styles.count, { backgroundColor: colors.surface }]}> 
            <AppText variant="h3" color={count.color} style={{ textAlign: 'center' }}>
              {count.value}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              {count.label}
            </AppText>
          </View>
        ))}
      </View>

      <View style={[styles.actions, { gap: spacing.sm, marginTop: spacing.lg }]}> 
        <Button label={doneLabel ?? t.review.backToDeck} variant="secondary" onPress={onDone} style={styles.action} />
        <Button label={t.review.reviewAgain} onPress={onReviewAgain} style={styles.action} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 460,
    textAlign: 'center',
  },
  counts: {
    flexDirection: 'row',
    width: '100%',
  },
  count: {
    borderRadius: 10,
    flex: 1,
    paddingVertical: 12,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
  },
  action: {
    flex: 1,
  },
});
