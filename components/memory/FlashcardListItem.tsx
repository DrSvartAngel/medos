import React from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import type { Flashcard } from '@/store/useMemoryStore';
import { useTranslation } from '@/i18n';

interface FlashcardListItemProps {
  card: Flashcard;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function FlashcardListItem({ card, index, onEdit, onDelete }: FlashcardListItemProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.content}>
          <AppText variant="caption" color={colors.accent}>
            CARD {index + 1}
          </AppText>
          <AppText variant="body" numberOfLines={2} style={{ marginTop: spacing.xs }}>
            {card.front}
          </AppText>
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            numberOfLines={2}
            style={{ marginTop: spacing.xs }}
          >
            {card.back}
          </AppText>
        </Pressable>

        <View style={[styles.actions, { marginLeft: spacing.md, gap: spacing.xs }]}> 
          <TouchableOpacity
            accessibilityLabel="Edit card"
            onPress={onEdit}
            style={[styles.iconButton, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}
          >
            <Feather name="edit-2" size={17} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Delete card"
            onPress={onDelete}
            style={[styles.iconButton, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}
          >
            <Feather name="trash-2" size={17} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      {card.schedule && <View>
        <AppText variant="caption">{t.scheduling.states[card.schedule.state]}</AppText>
        {card.schedule.nextReviewAt !== null && <AppText variant="caption">{t.scheduling.next(card.schedule.nextReviewAt)}</AppText>}
      </View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  actions: {
    flexDirection: 'column',
  },
  iconButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
});
