import { useTranslation } from '@/i18n';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DeckForm } from '@/components/memory/DeckForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useMemoryStore, type UpdateDeckInput } from '@/store/useMemoryStore';

export default function EditDeckScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const [prepared, setPrepared] = useState(false);
  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const decks = useMemoryStore((state) => state.decks);
  const error = useMemoryStore((state) => state.error);
  const loadDecks = useMemoryStore((state) => state.loadDecks);
  const updateDeck = useMemoryStore((state) => state.updateDeck);
  const setError = useMemoryStore((state) => state.setError);
  const deck = decks.find((item) => item.id === id);

  useEffect(() => {
    if (!isDBReady || !id) return;
    setError(null);
    loadCommittees();
    loadDecks();
    setPrepared(true);
  }, [id, isDBReady, loadCommittees, loadDecks, setError]);

  function handleUpdate(input: UpdateDeckInput): boolean {
    const saved = updateDeck(id, input);
    if (saved) {
      router.canGoBack() ? router.back() : router.replace(`/decks/${id}` as Href);
    }
    return saved;
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
        <Feather name="alert-circle" size={36} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.sweep.deckMissing}</AppText>
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
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.sweep.editDeck}</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {t.sweep.deckEditHint}</AppText>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <DeckForm
            key={deck.id}
            initialName={deck.name}
            initialDescription={deck.description}
            initialCommitteeId={deck.committeeId}
            committees={committees}
            submitLabel={t.sweep.save}
            error={error}
            onSubmit={handleUpdate}
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
