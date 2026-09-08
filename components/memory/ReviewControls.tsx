import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import type { ReviewRating } from '@/store/useMemoryStore';
import { useTranslation } from '@/i18n';

interface ReviewControlsProps {
  revealed: boolean;
  onReveal: () => void;
  onRate: (rating: ReviewRating) => void;
}

export function ReviewControls({ revealed, onReveal, onRate }: ReviewControlsProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  const RATINGS: Array<{
    rating: ReviewRating;
    label: string;
    hint: string;
    colorKey: 'error' | 'warning' | 'info' | 'success';
  }> = [
    { rating: 'again', label: t.review.ratings.again, hint: t.review.ratingAccessibility.again, colorKey: 'error' },
    { rating: 'hard',  label: t.review.ratings.hard,  hint: t.review.ratingAccessibility.hard,  colorKey: 'warning' },
    { rating: 'good',  label: t.review.ratings.good,  hint: t.review.ratingAccessibility.good,  colorKey: 'info' },
    { rating: 'easy',  label: t.review.ratings.easy,  hint: t.review.ratingAccessibility.easy,  colorKey: 'success' },
  ];

  if (!revealed) {
    return <Button label={t.review.showAnswer} onPress={onReveal} size="lg" />;
  }

  return (
    <View>
      <AppText variant="bodySmall" color={colors.textSecondary} style={styles.prompt}>
        {t.review.ratingLabel}
      </AppText>
      <View style={[styles.grid, { gap: spacing.sm }]}> 
        {RATINGS.map((item) => {
          const color = colors[item.colorKey];
          return (
            <Pressable
              key={item.rating}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${item.hint}`}
              onPress={() => onRate(item.rating)}
              style={({ pressed }) => [
                styles.rating,
                {
                  backgroundColor: colors.surface,
                  borderColor: color,
                  borderRadius: radius.md,
                  opacity: pressed ? 0.72 : 1,
                  padding: spacing.md,
                },
              ]}
            >
              <AppText variant="label" color={color}>
                {item.label}
              </AppText>
              <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2 }}>
                {item.hint}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginBottom: 10,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rating: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
  },
});
