import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import type { Subject } from '@/models/curriculum';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

const PAGE_SIZE = 50;
export function SubjectList({ committeeId }: { committeeId: string }) {
  const t = useTranslation();
  const { colors } = useTheme();
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [failedOffset, setFailedOffset] = useState(0);
  const load = useCallback((offset: number) => {
    setLoading(true); setError(false); setFailedOffset(offset);
    try {
      const page = subjectRepo.listByCommittee(committeeId, { limit: PAGE_SIZE, offset });
      // A bounded one-row lookahead avoids a misleading Load more on exact multiples of 50.
      const more = page.length === PAGE_SIZE && subjectRepo.listByCommittee(committeeId, { limit: 1, offset: offset + PAGE_SIZE }).length > 0;
      setItems(previous => offset === 0 ? page : [...previous, ...page]);
      setHasMore(more);
    } catch { setError(true); }
    finally { setLoading(false); }
  }, [committeeId]);
  useFocusEffect(useCallback(() => { setItems([]); setHasMore(false); load(0); }, [load]));
  return <View style={{ gap: 12, marginBottom: 20 }}>
    <AppText variant="h3">{t.subjects.title}</AppText>
    <Button label={t.subjects.add} variant="secondary" onPress={() => router.push(`/subjects/new?committeeId=${encodeURIComponent(committeeId)}` as Href)} />
    {loading && <><ActivityIndicator /><AppText>{t.common.loading}</AppText></>}
    {error && <><AppText>{t.subjects.listError}</AppText>
      <Button label={t.common.retry} onPress={() => load(failedOffset)} /></>}
    {!loading && !error && items.length === 0 && <AppText>{t.subjects.empty}</AppText>}
    {items.map(subject => <Pressable key={subject.id} accessibilityRole="button"
      accessibilityLabel={t.subjects.open(subject.name)} onPress={() => router.push(`/subjects/${encodeURIComponent(subject.id)}` as Href)}
      style={{ minHeight: 48, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
      <AppText>{subject.name}</AppText>
    </Pressable>)}
    {hasMore && !error && <Button label={t.subjects.more} variant="ghost" disabled={loading} onPress={() => load(items.length)} />}
  </View>;
}
