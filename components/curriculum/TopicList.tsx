import React, { useCallback, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { topicRepo } from '@/db/repositories/topicRepo';
import type { Topic } from '@/models/curriculum';
import { Section } from '@/components/ui/Section';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
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
    setLoading(true); setError(false); setFailedOffset(offset);
    try {
      const page = topicRepo.listBySubject(subjectId, { limit: PAGE_SIZE, offset });
      const more = page.length === PAGE_SIZE && topicRepo.listBySubject(subjectId,
        { limit: 1, offset: offset + PAGE_SIZE }).length > 0;
      setItems(previous => offset === 0 ? page : [...previous, ...page]);
      nextOffset.current = offset + page.length;
      setHasMore(more);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [subjectId]);
  useFocusEffect(useCallback(() => {
    setItems([]); setHasMore(false); nextOffset.current = 0; load(0);
  }, [load]));
  return <Section title={t.topics.title}>
    <Button label={t.topics.add} variant="secondary" onPress={() => router.push(`/topics/new?subjectId=${encodeURIComponent(subjectId)}` as Href)} />
    {loading && <FeedbackState kind="loading" message={t.common.loading} />}
    {error && <FeedbackState kind="error" message={t.topics.listError}
      action={{ label: t.common.retry, onPress: () => load(failedOffset) }} />}
    {!loading && !error && items.length === 0 && <FeedbackState kind="empty" message={t.topics.empty} />}
    {items.map(topic => <Pressable key={topic.id} accessibilityRole="button"
      accessibilityLabel={t.topics.open(topic.name)} onPress={() => router.push(`/topics/${encodeURIComponent(topic.id)}` as Href)}
      style={({ pressed }) => ({ minHeight: Interaction.minTarget, padding: spacing.md,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
        opacity: pressed ? Interaction.pressedOpacity : 1 })}>
      <AppText>{topic.name}</AppText>
    </Pressable>)}
    {hasMore && !error && <Button label={t.topics.more} variant="ghost" disabled={loading} onPress={() => load(nextOffset.current)} />}
  </Section>;
}
