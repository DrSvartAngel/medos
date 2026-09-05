import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DeckCard } from '@/components/memory/DeckCard';
import { DeckEmptyState } from '@/components/memory/DeckEmptyState';
import { RecentReviewList } from '@/components/memory/RecentReviewList';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useMemoryStore } from '@/store/useMemoryStore';
import { useTranslation } from '@/i18n';

export default function MemoryScreen() {
  const { colors, spacing, radius } = useTheme();
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
    return committees.find((committee) => committee.id === committeeId)?.name ?? 'Committee removed';
  }

  if (!isDBReady) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
      </ScreenWrapper>
    );
  }

  const numCols = columns(1);
  const columnWidth = `${Math.floor(100 / numCols)}%` as const;
  const totalCards = decks.reduce((total, deck) => total + deck.cardCount, 0);
  const error = deckLoadError ?? reviewLoadError ?? actionError;

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant={isTablet ? 'h1' : 'h2'}>{t.memory.title}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
            {t.memory.subtitle}
          </AppText>
        </View>
        {decks.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t.deckForm.createTitle}
            onPress={handleAdd}
            activeOpacity={0.75}
            style={[
              styles.addButton,
              { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.sm + 2 },
            ]}
          >
            <Feather name="plus" size={22} color={colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.stats, { gap: spacing.sm, marginTop: spacing.md }]}> 
        <Card style={styles.stat}>
          <AppText variant="h3" color={colors.accent} style={styles.statValue}>
            {decks.length}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
            {t.memory.decksLabel(decks.length)}
          </AppText>
        </Card>
        <Card style={styles.stat}>
          <AppText variant="h3" color={colors.accent} style={styles.statValue}>
            {totalCards}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.statLabel}>
            {t.memory.cardsLabel(totalCards)}
          </AppText>
        </Card>
      </View>

      {error !== null && (
        <View style={[styles.error, { borderColor: colors.error, marginTop: spacing.md, padding: spacing.md }]}> 
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
            {error}
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
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error !== null && decks.length === 0 ? null : decks.length === 0 ? (
        <DeckEmptyState onAdd={handleAdd} />
      ) : (
        <>
          <View style={[styles.grid, { marginTop: spacing.md }]}> 
            {decks.map((deck) => (
              <View
                key={deck.id}
                style={{ width: columnWidth, padding: spacing.xs }}
              >
                <DeckCard
                  deck={deck}
                  committeeName={committeeName(deck.committeeId)}
                  onPress={() => router.push(`/decks/${deck.id}` as Href)}
                  style={styles.deckCard}
                />
              </View>
            ))}
          </View>
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
});
