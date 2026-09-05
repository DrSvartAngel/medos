import React, { useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DeckForm } from '@/components/memory/DeckForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useMemoryStore, type CreateDeckInput } from '@/store/useMemoryStore';

export default function NewDeckScreen() {
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const createDeck = useMemoryStore((state) => state.createDeck);
  const error = useMemoryStore((state) => state.error);
  const setError = useMemoryStore((state) => state.setError);

  useEffect(() => {
    setError(null);
    if (isDBReady) loadCommittees();
  }, [isDBReady, loadCommittees, setError]);

  function handleCreate(input: CreateDeckInput): boolean {
    const id = createDeck(input);
    if (id === null) return false;
    router.replace(`/decks/${id}` as Href);
    return true;
  }

  if (!isDBReady) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            <AppText variant={isTablet ? 'h1' : 'h2'}>New Deck</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>
              Give one medical topic a clear home.
            </AppText>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <DeckForm
            committees={committees}
            submitLabel="Create Deck"
            error={error}
            onSubmit={handleCreate}
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
