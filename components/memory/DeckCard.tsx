import React from 'react';
import { useTranslation } from '@/i18n';
import { StyleSheet, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import type { Deck } from '@/store/useMemoryStore';

interface DeckCardProps {
  deck: Deck;
  dueCount?: number;
  committeeName?: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function DeckCard({ deck, dueCount, committeeName, onPress, style }: DeckCardProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${deck.name}, ${t.recovery.cards(deck.cardCount)}${dueCount !== undefined && dueCount > 0 ? `, ${t.memory.dueCount(dueCount)}` : ''}`}
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radius.sm,
            },
          ]}
        >
          <Feather name="layers" size={18} color={colors.primary} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <AppText variant="h3" numberOfLines={1} style={styles.title}>
              {deck.name}
            </AppText>
            {dueCount !== undefined && dueCount > 0 && (
              <Badge label={t.memory.dueCount(dueCount)} variant="warning" size="sm" />
            )}
          </View>

          {deck.description.length > 0 && (
            <AppText
              variant="bodySmall"
              color={colors.textSecondary}
              numberOfLines={1}
              style={{ marginTop: 2 }}
            >
              {deck.description}
            </AppText>
          )}

          <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
            <AppText variant="caption" color={colors.textSecondary}>
              {t.recovery.cards(deck.cardCount)}
            </AppText>
            {committeeName !== undefined && (
              <>
                <AppText variant="caption" color={colors.textMuted}> · </AppText>
                <AppText
                  variant="caption"
                  color={colors.textMuted}
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {committeeName}
                </AppText>
              </>
            )}
          </View>
        </View>

        <Feather name="chevron-right" size={18} color={colors.textMuted} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconWrap: {
    alignItems: 'center',
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  chevron: {
    marginLeft: 8,
  },
});
