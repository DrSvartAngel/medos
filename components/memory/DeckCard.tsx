import React from 'react';
import { StyleSheet, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import type { Deck } from '@/store/useMemoryStore';

interface DeckCardProps {
  deck: Deck;
  committeeName?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function DeckCard({ deck, committeeName, onPress, style }: DeckCardProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.titleRow}>
        <AppText variant="h3" numberOfLines={2} style={styles.title}>
          {deck.name}
        </AppText>
        <Feather name="chevron-right" size={19} color={colors.textMuted} />
      </View>

      {deck.description.length > 0 && (
        <AppText
          variant="bodySmall"
          color={colors.textSecondary}
          numberOfLines={2}
          style={{ marginTop: spacing.xs }}
        >
          {deck.description}
        </AppText>
      )}

      <View style={[styles.metaRow, { marginTop: spacing.md }]}> 
        <View style={styles.metaItem}>
          <Feather name="copy" size={14} color={colors.accent} />
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginLeft: 6 }}>
            {deck.cardCount} {deck.cardCount === 1 ? 'card' : 'cards'}
          </AppText>
        </View>
        {committeeName !== undefined && (
          <View style={[styles.metaItem, styles.committee]}>
            <Feather name="book-open" size={14} color={colors.textMuted} />
            <AppText
              variant="caption"
              color={colors.textMuted}
              numberOfLines={1}
              style={{ marginLeft: 6, flex: 1 }}
            >
              {committeeName}
            </AppText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minHeight: 148,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  committee: {
    flex: 1,
    minWidth: 120,
  },
});
