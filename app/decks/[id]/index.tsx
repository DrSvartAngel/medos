import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FlashcardListItem } from '@/components/memory/FlashcardListItem';
import { MemorySchedulePanel } from '@/components/memory/MemorySchedulePanel';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useMemoryStore } from '@/store/useMemoryStore';

export default function DeckDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const [prepared, setPrepared] = useState(false);
  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const decks = useMemoryStore((state) => state.decks);
  const cards = useMemoryStore((state) => state.cards);
  const isLoadingCards = useMemoryStore((state) => state.isLoadingCards);
  const error = useMemoryStore((state) => state.error);
  const loadDecks = useMemoryStore((state) => state.loadDecks);
  const loadCards = useMemoryStore((state) => state.loadCards);
  const deleteDeck = useMemoryStore((state) => state.deleteDeck);
  const deleteCard = useMemoryStore((state) => state.deleteCard);
  const setError = useMemoryStore((state) => state.setError);

  const deck = decks.find((item) => item.id === id);
  const deckCards = cards.filter((card) => card.deckId === id);
  const committee = deck?.committeeId
    ? committees.find((item) => item.id === deck.committeeId)
    : undefined;

  useEffect(() => {
    if (!isDBReady || !id) return;
    setError(null);
    loadCommittees();
    loadDecks();
    loadCards(id);
    setPrepared(true);
  }, [id, isDBReady, loadCards, loadCommittees, loadDecks, setError]);

  function handleDeleteDeck() {
    if (!deck) return;
    Alert.alert(
      'Delete this deck?',
      `“${deck.name}” and all of its cards and review history will be removed from this device.`,
      [
        { text: 'Keep Deck', style: 'cancel' },
        {
          text: 'Delete Deck',
          style: 'destructive',
          onPress: () => {
            if (deleteDeck(deck.id)) {
              router.replace('/(tabs)/memory' as Href);
            }
          },
        },
      ]
    );
  }

  function handleDeleteCard(cardId: string) {
    Alert.alert(
      'Delete this card?',
      'The card and its review history will be removed from this device.',
      [
        { text: 'Keep Card', style: 'cancel' },
        { text: 'Delete Card', style: 'destructive', onPress: () => deleteCard(cardId) },
      ]
    );
  }

  if (!isDBReady || !prepared) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  if (!deck) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <Feather name="alert-circle" size={36} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>Deck not found</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} style={styles.notFoundText}>
          It may have been deleted on this device.
        </AppText>
        <Button
          label="Back to Memory"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/memory' as Href)}
          style={{ marginTop: spacing.lg }}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.headerRow}>
        <TouchableOpacity
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ marginRight: spacing.md }}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <AppText variant={isTablet ? 'h1' : 'h2'} numberOfLines={2}>{deck.name}</AppText>
          <View style={[styles.metaRow, { gap: spacing.sm, marginTop: spacing.xs }]}> 
            <Badge
              label={`${deckCards.length} ${deckCards.length === 1 ? 'card' : 'cards'}`}
              variant="primary"
            />
            {deck.committeeId !== null && (
              <Badge
                label={committee?.name ?? 'Committee removed'}
                variant={committee ? 'info' : 'warning'}
              />
            )}
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Edit deck"
          onPress={() => router.push(`/decks/${deck.id}/edit` as Href)}
          style={[
            styles.editButton,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
          ]}
        >
          <Feather name="edit-2" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {deck.description.length > 0 && (
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {deck.description}
        </AppText>
      )}

      {error !== null && (
        <View style={[styles.error, { borderColor: colors.error, marginTop: spacing.md, padding: spacing.md }]}> 
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
            {error}
          </AppText>
        </View>
      )}

      <View style={[styles.primaryActions, isTablet && styles.primaryActionsTablet, { gap: spacing.sm, marginTop: spacing.lg }]}> 
        <Button
          label="Start Review"
          onPress={() => router.push(`/decks/${deck.id}/review` as Href)}
          disabled={deckCards.length === 0}
          size={isTablet ? 'lg' : 'md'}
          style={styles.primaryAction}
        />
        <Button
          label="Add Card"
          variant="secondary"
          onPress={() => router.push(`/decks/${deck.id}/cards/new` as Href)}
          size={isTablet ? 'lg' : 'md'}
          style={styles.primaryAction}
        />
      </View>

      <MemorySchedulePanel deckId={deck.id} />
      <View style={[styles.sectionHeader, { marginTop: spacing.xl, marginBottom: spacing.sm }]}> 
        <AppText variant="h3">Cards</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary}>
          Oldest first during review
        </AppText>
      </View>

      {isLoadingCards ? (
        <View style={[styles.centered, { paddingVertical: spacing.xl }]}> 
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : deckCards.length === 0 ? (
        <Card elevated style={[styles.emptyCards, { paddingVertical: spacing.xl }]}> 
          <Feather name="plus-square" size={36} color={colors.accent} />
          <AppText variant="h3" style={{ marginTop: spacing.md }}>Add your first card</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.emptyText}>
            A useful first card asks one specific question with one clear answer.
          </AppText>
          <Button
            label="Add Card"
            onPress={() => router.push(`/decks/${deck.id}/cards/new` as Href)}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        deckCards.map((card, index) => (
          <FlashcardListItem
            key={card.id}
            card={card}
            index={index}
            onEdit={() => router.push(`/decks/${deck.id}/cards/${card.id}/edit` as Href)}
            onDelete={() => handleDeleteCard(card.id)}
          />
        ))
      )}

      <Button
        label="Delete Deck"
        variant="danger"
        onPress={handleDeleteDeck}
        style={{ alignSelf: isTablet ? 'flex-start' : 'stretch', marginTop: spacing.xl, marginBottom: spacing.lg }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', paddingTop: 8 },
  headerText: { flex: 1 },
  metaRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' },
  editButton: { alignItems: 'center', borderWidth: 1, height: 42, justifyContent: 'center', marginLeft: 12, width: 42 },
  error: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row' },
  errorText: { flex: 1, marginLeft: 8 },
  primaryActions: { flexDirection: 'column' },
  primaryActionsTablet: { flexDirection: 'row' },
  primaryAction: { flex: 1 },
  sectionHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  emptyCards: { alignItems: 'center' },
  emptyText: { marginTop: 8, maxWidth: 420, textAlign: 'center' },
  notFoundText: { marginTop: 8, textAlign: 'center' },
});
