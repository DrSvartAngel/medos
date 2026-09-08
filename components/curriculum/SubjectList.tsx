import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import type { Subject } from '@/models/curriculum';
import type { SubjectAnalyticsSummary } from '@/models/analytics';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Interaction } from '@/theme/interaction';

const PAGE_SIZE = 50;

export function SubjectList({ committeeId }: { committeeId: string }) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failedOffset, setFailedOffset] = useState(0);

  const load = useCallback((offset: number) => {
    setLoading(true);
    setError(false);
    setFailedOffset(offset);
    try {
      const page = subjectRepo.listByCommittee(committeeId, { limit: PAGE_SIZE, offset });
      // A bounded one-row lookahead avoids a misleading Load more on exact multiples of 50.
      const more = page.length === PAGE_SIZE && subjectRepo.listByCommittee(committeeId, { limit: 1, offset: offset + PAGE_SIZE }).length > 0;
      setItems(previous => offset === 0 ? page : [...previous, ...page]);
      setHasMore(more);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [committeeId]);

  useFocusEffect(useCallback(() => {
    setItems([]);
    setHasMore(false);
    load(0);
  }, [load]));

  // Factual analytical progress map per subject
  const analyticsMap = useMemo(() => {
    const map = new Map<string, SubjectAnalyticsSummary | null>();
    for (const item of items) {
      try {
        map.set(item.id, analyticsRepo.getSubjectAnalytics(item.id));
      } catch {
        map.set(item.id, null);
      }
    }
    return map;
  }, [items]);

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader
          title={t.subjects.title}
          badge={items.length > 0 ? `${items.length}` : undefined}
          badgeVariant="default"
        />
        <Button
          label={t.subjects.add}
          variant="secondary"
          size="sm"
          icon={<Feather name="plus" size={14} color={colors.primary} />}
          onPress={() => router.push(`/subjects/new?committeeId=${encodeURIComponent(committeeId)}` as Href)}
        />
      </View>

      {loading && (
        <LoadingState message={t.common.loading} size="small" />
      )}

      {error && (
        <ErrorState
          message={t.subjects.listError}
          action={{ label: t.common.retry, onPress: () => load(failedOffset) }}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title={t.subjects.empty}
          icon="book"
          action={{
            label: t.subjects.add,
            onPress: () => router.push(`/subjects/new?committeeId=${encodeURIComponent(committeeId)}` as Href),
          }}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            overflow: 'hidden',
          }}
        >
          {items.map((subject, idx) => {
            const isLast = idx === items.length - 1;
            const summary = analyticsMap.get(subject.id);
            const total = summary?.totalTopics ?? 0;
            const practiced = summary?.practicedTopics ?? 0;

            return (
              <Pressable
                key={subject.id}
                accessibilityRole="button"
                accessibilityLabel={t.subjects.open(subject.name)}
                onPress={() => router.push(`/subjects/${encodeURIComponent(subject.id)}` as Href)}
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.cardBorder,
                  backgroundColor: pressed ? colors.surfaceHighlight : colors.surface,
                  opacity: pressed ? Interaction.pressedOpacity : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: spacing.md }}>
                    <AppText variant="subhead" style={{ color: colors.textPrimary, fontWeight: '600' }}>
                      {subject.name}
                    </AppText>

                    {total > 0 && (
                      <AppText variant="caption" style={{ color: colors.textSecondary, marginTop: 2 }}>
                        {t.dashboard.topicsComplete(practiced, total)}
                      </AppText>
                    )}
                  </View>

                  <Feather name="chevron-right" size={18} color={colors.textMuted} />
                </View>

                {total > 0 && (
                  <View style={{ marginTop: spacing.xs }}>
                    <ProgressBar
                      value={practiced}
                      max={total}
                      height={4}
                      color={colors.primary}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {hasMore && !error && (
        <Button
          label={t.subjects.more}
          variant="ghost"
          disabled={loading}
          onPress={() => load(items.length)}
        />
      )}
    </View>
  );
}

