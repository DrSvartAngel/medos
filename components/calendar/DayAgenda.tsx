import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TimelineItemRow } from './TimelineItemRow';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/useTheme';
import { formatAgendaDate } from '@/utils/calendarDate';
import type { CalendarItem } from '@/store/useCalendarStore';

interface DayAgendaProps {
  date: string;
  items: CalendarItem[];
  onAdd: () => void;
  onOpenItem: (item: CalendarItem) => void;
}

export function DayAgenda({ date, items, onAdd, onOpenItem }: DayAgendaProps) {
  const { colors, spacing } = useTheme();

  return (
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant="h3">{formatAgendaDate(date)}</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {items.length === 0
              ? 'A clear day.'
              : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
          </AppText>
        </View>
        <Button label="Add Study Event" onPress={onAdd} size="sm" />
      </View>

      {items.length === 0 ? (
        <Card elevated style={[styles.empty, { marginTop: spacing.md, paddingVertical: spacing.xl }]}> 
          <Feather name="sun" size={34} color={colors.accent} />
          <AppText variant="h3" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            Nothing scheduled for this day
          </AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.emptyText}>
            Leave it open, or add one study intention when you are ready.
          </AppText>
          <Button label="Add Study Event" variant="secondary" onPress={onAdd} style={{ marginTop: spacing.md }} />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {items.map((item) => (
            <TimelineItemRow
              key={item.id}
              item={item}
              onPress={
                item.type === 'focus' ? undefined : () => onOpenItem(item)
              }
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    maxWidth: 400,
    textAlign: 'center',
  },
});
