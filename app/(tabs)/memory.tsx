import { translateError } from '@/i18n/errors';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
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
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useMemoryStore } from '@/store/useMemoryStore';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { useTranslation } from '@/i18n';

export default function MemoryScreen() {
  const { colors, spacing } = useTheme();
  const { isTablet, columns } = useResponsive();
  const t = useTranslation();
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

  useEffect(() => {
    if (!isDBReady) return;
    setError(null);
    loadCommittees();
    loadDecks();
    loadRecentReviews(10);
  }, [isDBReady, loadCommittees, loadDecks, loadRecentReviews, setError]);

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
  }

  function committeeName(committeeId: string | null): string | undefined {
    if (committeeId === null) return undefined;
    return committees.find((committee) => committee.id === committeeId)?.name ?? t.sweep.committeeRemoved;
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

  return (
    <ScreenWrapper>
      <TabTopHeader />
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
  addButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
