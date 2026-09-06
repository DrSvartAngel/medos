import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FlashcardForm } from '@/components/memory/FlashcardForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useMemoryStore, type UpdateCardInput } from '@/store/useMemoryStore';

export default function EditFlashcardScreen() {
  const { id, cardId } = useLocalSearchParams<{ id: string; cardId: string }>();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const [prepared, setPrepared] = useState(false);
  const isDBReady = useAppStore((state) => state.isDBReady);
  const decks = useMemoryStore((state) => state.decks);
  const cards = useMemoryStore((state) => state.cards);
  const error = useMemoryStore((state) => state.error);
  const loadDecks = useMemoryStore((state) => state.loadDecks);
  const loadCards = useMemoryStore((state) => state.loadCards);
  const updateCard = useMemoryStore((state) => state.updateCard);
  const setError = useMemoryStore((state) => state.setError);
  const deck = decks.find((item) => item.id === id);
  const card = cards.find((item) => item.id === cardId && item.deckId === id);

  useEffect(() => {
    if (!isDBReady || !id) return;
    setError(null);
    loadDecks();
    loadCards(id);
    setPrepared(true);
  }, [id, isDBReady, loadCards, loadDecks, setError]);

  function handleUpdate(input: UpdateCardInput): boolean {
    const saved = updateCard(cardId, input);
    if (saved) router.back();
    return saved;
  }

  if (!isDBReady || !prepared) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  if (!deck || !card) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centered}>
        <AppText variant="h3">Card not found</AppText>
        <Button label="Go Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </ScreenWrapper>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenWrapper includeBottomSafeArea>
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
            <AppText variant={isTablet ? 'h1' : 'h2'}>Edit Card</AppText>
            <AppText variant="body" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
              {deck.name}
            </AppText>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <FlashcardForm
            key={card.id}
            initialFront={card.front}
            initialBack={card.back}
            initialTopicId={card.topicId ?? null}
            submitLabel="Save Changes"
            error={error}
            onSubmit={handleUpdate}
            onCancel={() => router.back()}
          />
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { alignItems: 'flex-start', flexDirection: 'row', paddingTop: 8 },
  headerText: { flex: 1 },
});
