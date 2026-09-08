import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { topicRepo } from '@/db/repositories/topicRepo';
import { analyticsRepo } from '@/db/repositories/analyticsRepo';
import type { Topic } from '@/models/curriculum';
import type { TopicAnalyticsEvidence } from '@/models/analytics';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { Interaction } from '@/theme/interaction';

const PAGE_SIZE = 50;

export function TopicList({ subjectId }: { subjectId: string }) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const [items, setItems] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failedOffset, setFailedOffset] = useState(0);
  const nextOffset = useRef(0);

  const load = useCallback((offset: number) => {
    setLoading(true);
    setError(false);
    setFailedOffset(offset);
    try {
      const page = topicRepo.listBySubject(subjectId, { limit: PAGE_SIZE, offset });
      const more = page.length === PAGE_SIZE && topicRepo.listBySubject(subjectId,
        { limit: 1, offset: offset + PAGE_SIZE }).length > 0;
      setItems(previous => offset === 0 ? page : [...previous, ...page]);
      nextOffset.current = offset + page.length;
      setHasMore(more);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useFocusEffect(useCallback(() => {
    setItems([]); setHasMore(false); nextOffset.current = 0; load(0);
  }, [load]));

  // Factual analytical evidence per topic
  const analyticsMap = useMemo(() => {
    const map = new Map<string, TopicAnalyticsEvidence | null>();
    for (const item of items) {
      try {
        map.set(item.id, analyticsRepo.getTopicAnalytics(item.id));
      } catch {
        map.set(item.id, null);
      }
    }
    return map;
  }, [items]);

  function getContextSubtitle(evidence: TopicAnalyticsEvidence | null | undefined): string {
    if (!evidence) return t.topics.studyUnrecorded;
    if (evidence.masteryStatus === 'needs_attention') {
      return evidence.dueCardCount > 0
        ? `${t.analytics.needsAttentionTitle} · ${t.topicEvidence.due(evidence.dueCardCount)}`
        : t.analytics.needsAttentionTitle;
    }
    if (evidence.dueCardCount > 0) {
      return t.topicEvidence.due(evidence.dueCardCount);
    }
    if (evidence.questionCount > 0) {
      return `${t.topics.studyRecorded} · ${t.qbank.evidence.questions(evidence.questionCount)}`;
    }
    if (evidence.practiced) {
      return t.topics.studyRecorded;
    }
    return t.topics.studyUnrecorded;
  }

  return (
    <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionHeader
          title={t.topics.title}
          badge={items.length > 0 ? `${items.length}` : undefined}
          badgeVariant="default"
        />
        <Button
          label={t.topics.add}
          variant="secondary"
          size="sm"
          icon={<Feather name="plus" size={14} color={colors.primary} />}
          onPress={() => router.push(`/topics/new?subjectId=${encodeURIComponent(subjectId)}` as Href)}
        />
      </View>

      {loading && (
        <LoadingState message={t.common.loading} size="small" />
      )}

      {error && (
        <ErrorState
          message={t.topics.listError}
          action={{ label: t.common.retry, onPress: () => load(failedOffset) }}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          title={t.topics.empty}
          icon="list"
          action={{
            label: t.topics.add,
            onPress: () => router.push(`/topics/new?subjectId=${encodeURIComponent(subjectId)}` as Href),
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
          {items.map((topic, idx) => {
            const isLast = idx === items.length - 1;
            const evidence = analyticsMap.get(topic.id);
            const subtitle = getContextSubtitle(evidence);
            const isAttention = evidence?.masteryStatus === 'needs_attention';

            return (
              <Pressable
                key={topic.id}
                accessibilityRole="button"
                accessibilityLabel={t.topics.open(topic.name)}
                onPress={() => router.push(`/topics/${encodeURIComponent(topic.id)}` as Href)}
                style={({ pressed }) => ({
                  minHeight: Interaction.minTarget,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: colors.cardBorder,
                  backgroundColor: pressed ? colors.surfaceHighlight : colors.surface,
                  opacity: pressed ? Interaction.pressedOpacity : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                })}
              >
                <View style={{ flex: 1, marginRight: spacing.md }}>
                  <AppText variant="subhead" style={{ color: colors.textPrimary, fontWeight: '600' }}>
                    {topic.name}
                  </AppText>
                  <AppText
                    variant="caption"
                    style={{
                      color: isAttention ? colors.warning : colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {subtitle}
                  </AppText>
                </View>

                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}

      {hasMore && !error && (
        <Button
          label={t.topics.more}
          variant="ghost"
          disabled={loading}
          onPress={() => load(nextOffset.current)}
        />
      )}
    </View>
  );
}

