import { useTranslation } from '@/i18n';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import type { ReviewHistoryItem, ReviewRating } from '@/store/useMemoryStore';

interface RecentReviewListProps {
  reviews: ReviewHistoryItem[];
}

type BadgeVariant = 'error' | 'warning' | 'info' | 'success';

const RATING_BADGES: Record<ReviewRating, { variant: BadgeVariant }> = {
  again: { variant: 'error' },
  hard: { variant: 'warning' },
  good: { variant: 'info' },
  easy: { variant: 'success' },
};

function formatReviewDate(timestamp: number, locale: string): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function RecentReviewList({ reviews }: RecentReviewListProps) {
  const t = useTranslation();
  const { colors, spacing } = useTheme();

  return (
    <View>
      <AppText variant="h3">{t.sweep.recentRecall}</AppText>
      {reviews.length === 0 ? (
        <Card style={{ marginTop: spacing.sm }}>
          <AppText variant="bodySmall" color={colors.textSecondary}>
            {t.sweep.historyHint}</AppText>
        </Card>
      ) : (
        reviews.map((review) => {
          const badge = RATING_BADGES[review.rating];
          return (
            <Card key={review.id} style={{ marginTop: spacing.sm }}>
              <View style={styles.topRow}>
                <View style={styles.text}>
                  <AppText variant="body" numberOfLines={1}>
                    {review.cardFront}
                  </AppText>
                  <AppText
                    variant="caption"
                    color={colors.textSecondary}
                    numberOfLines={1}
                    style={{ marginTop: spacing.xs }}
                  >
                    {review.deckName} · {formatReviewDate(review.reviewedAt, t.dashboard.locale)}
                  </AppText>
                </View>
                <Badge label={t.review.ratings[review.rating]} variant={badge.variant} style={{ marginLeft: spacing.sm }} />
              </View>
            </Card>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    flex: 1,
  },
});
