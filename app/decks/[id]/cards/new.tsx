import { useTranslation } from '@/i18n';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FlashcardForm } from '@/components/memory/FlashcardForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useMemoryStore, type UpdateCardInput } from '@/store/useMemoryStore';

export default function NewFlashcardScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const [prepared, setPrepared] = useState(false);
  const isDBReady = useAppStore((state) => state.isDBReady);
  const decks = useMemoryStore((state) => state.decks);
  const error = useMemoryStore((state) => state.error);
  const loadDecks = useMemoryStore((state) => state.loadDecks);
  const createCard = useMemoryStore((state) => state.createCard);
  const setError = useMemoryStore((state) => state.setError);
  const deck = decks.find((item) => item.id === id);

  useEffect(() => {
    if (!isDBReady || !id) return;
    setError(null);
    loadDecks();
    setPrepared(true);
  }, [id, isDBReady, loadDecks, setError]);

  function handleCreate(input: UpdateCardInput): boolean {
    const cardId = createCard({ deckId: id, ...input });
    if (cardId === null) return false;
    router.canGoBack() ? router.back() : router.replace(`/decks/${id}` as Href);
    return true;
  }

  if (!isDBReady || !prepared) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  if (!deck) {
    return (
      <ScreenWrapper includeBottomSafeArea scrollable={false} contentStyle={styles.centered}>
        <AppText variant="h3">{t.sweep.deckMissing}</AppText>
        <Button label={t.sweep.goBack} variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/memory' as Href))} style={{ marginTop: spacing.lg }} />
      </ScreenWrapper>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScreenWrapper includeBottomSafeArea>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityLabel={t.sweep.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace(`/decks/${id}` as Href))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: spacing.md }}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.sweep.newCard}</AppText>
            <AppText variant="body" color={colors.textSecondary} numberOfLines={1} style={{ marginTop: 2 }}>
              {deck.name}
            </AppText>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <FlashcardForm
            submitLabel={t.sweep.createCard}
            error={error}
            onSubmit={handleCreate}
            onCancel={() => (router.canGoBack() ? router.back() : router.replace(`/decks/${id}` as Href))}
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
