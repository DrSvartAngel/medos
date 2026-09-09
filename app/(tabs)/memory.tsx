import { translateError } from '@/i18n/errors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DeckCard } from '@/components/memory/DeckCard';
import { DeckEmptyState } from '@/components/memory/DeckEmptyState';
import { RecentReviewList } from '@/components/memory/RecentReviewList';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { TabTopHeader } from '@/components/layout/TabTopHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { ListRow } from '@/components/ui/ListRow';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useMemoryStore } from '@/store/useMemoryStore';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import { useTranslation } from '@/i18n';

export default function MemoryScreen() {
  const params = useLocalSearchParams<{ returnTo?: string; topicId?: string }>();
  const returnTo = params.returnTo;
  const topicId = params.topicId ? (Array.isArray(params.topicId) ? params.topicId[0] : params.topicId) : undefined;

  const { colors, spacing, radius } = useTheme();
  const { isTablet, columns } = useResponsive();
  const t = useTranslation();

  useFocusEffect(
    useCallback(() => {
      if (!returnTo) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.dismissTo(returnTo as Href);
        return true;
      });
      return () => sub.remove();
    }, [returnTo])
  );

  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const decks = useMemoryStore((state) => state.decks);
  const recentReviews = useMemoryStore((state) => state.recentReviews);
  const isLoading = useMemoryStore((state) => state.isLoadingDecks);
  const deckLoadError = useMemoryStore((state) => state.deckLoadError);
  const reviewLoadError = useMemoryStore((state) => state.reviewLoadError);
  const actionError = useMemoryStore((state) => state.error);
  const loadDecks = useMemoryStore((state) => state.loadDecks);
  const loadRecentReviews = useMemoryStore((state) => state.loadRecentReviews);
  const setError = useMemoryStore((state) => state.setError);

  const [topicContextData, setTopicContextData] = useState<{
    topicName: string;
    hierarchyContext: string;
    summary: ReturnType<typeof memoryRepo.getTopicScheduleSummary>;
    evidence: ReturnType<typeof memoryRepo.getTopicLearningEvidence>;
    cards: ReturnType<typeof memoryRepo.getCardsByTopic>;
  } | null>(null);

  const loadTopicContext = useCallback(() => {
    if (!topicId || !isDBReady) {
      setTopicContextData(null);
      return;
    }
    try {
      const topic = topicRepo.getById(topicId);
      const link = memoryRepo.getTopicLinkContext(topicId);
      const summary = memoryRepo.getTopicScheduleSummary(topicId);
      const evidence = memoryRepo.getTopicLearningEvidence(topicId);
      const cards = memoryRepo.getCardsByTopic(topicId);

      setTopicContextData({
        topicName: topic?.name ?? link?.topic ?? 'Topic',
        hierarchyContext: link ? `${link.committee} · ${link.subject}` : '',
        summary,
        evidence,
        cards,
      });
    } catch {
      setTopicContextData(null);
    }
  }, [isDBReady, topicId]);

  useEffect(() => {
    if (!isDBReady) return;
    setError(null);
    loadCommittees();
    loadDecks();
    loadRecentReviews(10);
    if (topicId) {
      loadTopicContext();
    }
  }, [isDBReady, loadCommittees, loadDecks, loadRecentReviews, loadTopicContext, setError, topicId]);

  useFocusEffect(
    useCallback(() => {
      if (topicId && isDBReady) {
        loadTopicContext();
      }
    }, [isDBReady, loadTopicContext, topicId])
  );

  const deckSchedules = useMemo(() => {
    if (!isDBReady || decks.length === 0) return [];
    return decks.map((deck) => {
      try {
        const summary = memoryRepo.getScheduleSummary(deck.id);
        return { deckId: deck.id, due: summary.due, newCards: summary.newCards, total: deck.cardCount };
      } catch {
        return { deckId: deck.id, due: 0, newCards: 0, total: deck.cardCount };
      }
    });
  }, [decks, isDBReady]);

  const totalDueCards = useMemo(() => {
    return deckSchedules.reduce((total, item) => total + item.due, 0);
  }, [deckSchedules]);

  const dueDeck = useMemo(() => {
    if (deckSchedules.length === 0) return null;
    const sorted = [...deckSchedules].sort((a, b) => b.due - a.due);
    return sorted[0]?.due > 0 ? sorted[0] : (deckSchedules[0] ?? null);
  }, [deckSchedules]);

  const numCols = columns(1);
  const columnWidth = `${Math.floor(100 / numCols)}%` as const;
  const totalCards = decks.reduce((total, deck) => total + deck.cardCount, 0);
  const error = deckLoadError ?? reviewLoadError ?? actionError;

  function handleAdd() {
    router.push('/decks/new' as Href);
  }

  function handleRetry() {
    setError(null);
    loadCommittees();
    loadDecks();
    loadRecentReviews(10);
    if (topicId) loadTopicContext();
  }

  function committeeName(committeeId: string | null): string | undefined {
    if (committeeId === null) return undefined;
    return committees.find((committee) => committee.id === committeeId)?.name ?? t.sweep.committeeRemoved;
  }

  function deckName(cardDeckId: string): string {
    return decks.find((d) => d.id === cardDeckId)?.name ?? 'Deck';
  }

  if (!isDBReady) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
      </ScreenWrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTEXTUAL TOPIC MEMORY VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (topicId) {
    const topicSummary = topicContextData?.summary ?? {
      due: 0,
      newCards: 0,
      unscheduled: 0,
      total: 0,
      nextReviewAt: null,
    };
    const topicEvidence = topicContextData?.evidence ?? {
      linkedCards: 0,
      linkedReviews: 0,
      dueCards: 0,
      nextReviewAt: null,
    };
    const topicCards = topicContextData?.cards ?? [];

    return (
      <ScreenWrapper>
        <TabTopHeader returnTo={returnTo} returnLabel={t.common.back || 'Back to Topic'} />

        {/* Topic Context Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {topicContextData?.hierarchyContext ? (
              <AppText variant="caption" color={colors.textMuted} style={{ marginBottom: 2 }}>
                {topicContextData.hierarchyContext}
              </AppText>
            ) : null}
            <AppText variant={isTablet ? 'h1' : 'h2'}>
              {topicContextData?.topicName ?? t.memory.title}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
              {t.memory.subtitle}
            </AppText>
          </View>
        </View>

        {/* Topic-Scoped Factual Metrics */}
        <View style={[styles.stats, { gap: spacing.sm, marginTop: spacing.md }]}>
          <Card style={styles.stat}>
            <AppText variant="h3" color={colors.textPrimary} style={styles.statValue}>
              {topicSummary.total}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
              {t.memory.cardsLabel(topicSummary.total)}
            </AppText>
          </Card>
          <Card style={styles.stat}>
            <AppText
              variant="h3"
              color={topicSummary.due > 0 ? colors.warning : colors.textPrimary}
              style={styles.statValue}
            >
              {topicSummary.due}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
              {t.memory.dueCount(topicSummary.due)}
            </AppText>
          </Card>
          <Card style={styles.stat}>
            <AppText variant="h3" color={colors.textPrimary} style={styles.statValue}>
              {topicEvidence.linkedReviews}
            </AppText>
            <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
              Reviews
            </AppText>
          </Card>
        </View>

        {/* Primary Action / Zero State */}
        {topicSummary.due > 0 ? (
          <Card elevated style={[styles.dueActionCard, { marginTop: spacing.md, padding: spacing.md }]}>
            <View style={styles.dueActionHeader}>
              <Badge label={t.memory.dueCount(topicSummary.due)} variant="warning" size="sm" />
              <AppText variant="h3" style={{ marginTop: spacing.xs }}>
                {t.memory.reviewDueCards}
              </AppText>
            </View>
            <Button
              label={`${t.memory.reviewDueCards} (${topicSummary.due})`}
              accessibilityLabel={`${t.memory.reviewDueCards} (${topicSummary.due})`}
              size={isTablet ? 'lg' : 'md'}
              variant="primary"
              onPress={() =>
                router.push(
                  `/memory/review?topicId=${encodeURIComponent(topicId)}&mode=due&returnTo=${encodeURIComponent(
                    returnTo ?? `/topics/${topicId}`
                  )}` as Href
                )
              }
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : topicSummary.total > 0 ? (
          <Card
            style={[
              styles.zeroDueCard,
              { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceElevated },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Feather name="check-circle" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <AppText variant="label" color={colors.textPrimary}>
                  {t.memory.noReviewsDue}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                  {t.scheduling.noneDue}
                </AppText>
              </View>
            </View>
            <Button
              label={`Review All (${topicSummary.total})`}
              variant="secondary"
              size="sm"
              onPress={() =>
                router.push(
                  `/memory/review?topicId=${encodeURIComponent(topicId)}&returnTo=${encodeURIComponent(
                    returnTo ?? `/topics/${topicId}`
                  )}` as Href
                )
              }
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          <Card
            elevated
            style={[
              styles.emptyCard,
              { marginTop: spacing.md, padding: spacing.xl, backgroundColor: colors.surface },
            ]}
          >
            <Feather name="layers" size={36} color={colors.primary} />
            <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>
              No Memory cards for this topic yet.
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs, textAlign: 'center' }}>
              Create or generate cards linked to this topic to start reviewing.
            </AppText>
            <Button
              label={t.studyAi.assistant}
              variant="secondary"
              size="sm"
              icon={<Feather name="cpu" size={14} color={colors.primary} />}
              onPress={() => router.push(`/topics/${encodeURIComponent(topicId)}/assistant` as Href)}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        )}

        {/* Topic-Linked Cards List */}
        {topicCards.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <AppText variant="subhead" style={{ marginBottom: spacing.xs }}>
              Topic Cards ({topicCards.length})
            </AppText>
            <View
              style={{
                borderRadius: radius.md,
                borderColor: colors.border,
                borderWidth: 1,
                overflow: 'hidden',
                backgroundColor: colors.surfaceElevated,
              }}
            >
              {topicCards.map((c, idx) => (
                <ListRow
                  key={c.id}
                  title={c.front}
                  subtitle={`${deckName(c.deckId)} · ${c.schedule?.state ?? 'new'}`}
                  leading={<Feather name="credit-card" size={16} color={colors.primary} />}
                  borderBottom={idx < topicCards.length - 1}
                  accessibilityRole="text"
                />
              ))}
            </View>
          </View>
        )}

        {/* Global Memory Option */}
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xl, alignItems: 'center' }}>
          <Button
            label="View All Memory"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(tabs)/memory' as Href)}
          />
        </View>
      </ScreenWrapper>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GLOBAL MEMORY VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <ScreenWrapper>
      <TabTopHeader returnTo={returnTo} returnLabel={t.common.back || 'Back to Topic'} />
      {/* 1. Memory Title */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant={isTablet ? 'h1' : 'h2'}>{t.memory.title}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
            {t.memory.subtitle}
          </AppText>
        </View>
      </View>

      {/* Global Error Notice */}
      {error !== null && (
        <View style={[styles.error, { borderColor: colors.error, marginTop: spacing.md, padding: spacing.md }]}>
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
            {translateError(error, t)}
          </AppText>
          <Button
            label={t.common.retry}
            accessibilityLabel={t.common.retry}
            size="sm"
            variant="secondary"
            onPress={handleRetry}
          />
        </View>
      )}

      {isLoading ? (
        <View style={[styles.centered, { paddingVertical: spacing.xxxl }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error !== null && decks.length === 0 ? null : decks.length === 0 ? (
        <DeckEmptyState onAdd={handleAdd} />
      ) : (
        <>
          {/* 2. Due Review Primary Action or Calm Zero State */}
          {totalDueCards > 0 && dueDeck ? (
            <Card elevated style={[styles.dueActionCard, { marginTop: spacing.md, padding: spacing.md }]}>
              <View style={styles.dueActionHeader}>
                <Badge label={t.memory.dueCount(totalDueCards)} variant="warning" size="sm" />
                <AppText variant="h3" style={{ marginTop: spacing.xs }}>
                  {t.memory.reviewDueCards}
                </AppText>
              </View>
              <Button
                label={t.memory.reviewDueCards}
                accessibilityLabel={t.memory.reviewDueCards}
                size={isTablet ? 'lg' : 'md'}
                variant="primary"
                onPress={() => router.push(`/decks/${encodeURIComponent(dueDeck.deckId)}/review?mode=due` as Href)}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : (
            <Card style={[styles.zeroDueCard, { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surfaceElevated }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Feather name="check-circle" size={20} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <AppText variant="label" color={colors.textPrimary}>
                    {t.memory.noReviewsDue}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    {t.scheduling.noneDue}
                  </AppText>
                </View>
              </View>
            </Card>
          )}

          {/* 3. Compact Factual Summary */}
          <View style={[styles.stats, { gap: spacing.sm, marginTop: spacing.md }]}>
            <Card style={styles.stat}>
              <AppText variant="h3" color={colors.textPrimary} style={styles.statValue}>
                {decks.length}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
                {t.memory.decksLabel(decks.length)}
              </AppText>
            </Card>
            <Card style={styles.stat}>
              <AppText variant="h3" color={colors.textPrimary} style={styles.statValue}>
                {totalCards}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
                {t.memory.cardsLabel(totalCards)}
              </AppText>
            </Card>
            <Card style={styles.stat}>
              <AppText
                variant="h3"
                color={totalDueCards > 0 ? colors.warning : colors.textPrimary}
                style={styles.statValue}
              >
                {totalDueCards}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
                {t.memory.dueCount(totalDueCards)}
              </AppText>
            </Card>
          </View>

          {/* 4. Deck List */}
          <View style={[styles.grid, { marginTop: spacing.md }]}>
            {decks.map((deck) => {
              const schedule = deckSchedules.find((s) => s.deckId === deck.id);
              return (
                <View
                  key={deck.id}
                  style={{ width: columnWidth, padding: spacing.xs }}
                >
                  <DeckCard
                    deck={deck}
                    dueCount={schedule?.due}
                    committeeName={committeeName(deck.committeeId)}
                    onPress={() => router.push(`/decks/${deck.id}` as Href)}
                    style={styles.deckCard}
                  />
                </View>
              );
            })}
          </View>

          {/* 5. Secondary Management Actions */}
          <View style={[styles.secondaryActions, { gap: spacing.sm, marginTop: spacing.lg }]}>
            <Button
              label={t.deckForm.createTitle}
              accessibilityLabel={t.deckForm.createTitle}
              variant="secondary"
              size="md"
              onPress={handleAdd}
            />
            <Button
              label={t.qbank.logSession}
              accessibilityLabel={t.qbank.logSession}
              variant="ghost"
              size="sm"
              onPress={() => router.push('/qbank/new' as Href)}
            />
          </View>

          {/* Recent Reviews History */}
          <View style={{ marginTop: spacing.xl }}>
            <RecentReviewList reviews={recentReviews} />
          </View>
        </>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingTop: 8,
  },
  headerText: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  statValue: {
    textAlign: 'center',
  },
  statLabel: {
    marginTop: 2,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -4,
  },
  deckCard: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
  },
  dueActionCard: {
    width: '100%',
  },
  dueActionHeader: {
    gap: 4,
  },
  zeroDueCard: {
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 16,
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
