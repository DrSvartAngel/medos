import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import type { CalendarGridDay } from '@/utils/calendarDate';
import type { CalendarItem, CalendarItemType } from '@/store/useCalendarStore';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarMonthGridProps {
  days: CalendarGridDay[];
  items: CalendarItem[];
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
}

export function CalendarMonthGrid({
  days,
  items,
  selectedDate,
  today,
  onSelectDate,
}: CalendarMonthGridProps) {
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const current = grouped.get(item.date) ?? [];
      current.push(item);
      grouped.set(item.date, current);
    }
    return grouped;
  }, [items]);

  const markerColors: Record<CalendarItemType, string> = {
    manual: colors.textPrimary,
    committee_start: colors.info,
    committee_exam: colors.warning,
    focus: colors.primary,
    memory: colors.accent,
  };

  return (
    <View style={{ marginTop: spacing.md }}>
      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday) => (
          <AppText key={weekday} variant="caption" color={colors.textMuted} style={styles.weekday}>
            {weekday}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((day) => {
          const dayItems = itemsByDate.get(day.key) ?? [];
          const markerTypes = Array.from(new Set(dayItems.map((item) => item.type))).slice(0, 3);
          const selected = day.key === selectedDate;
          const isToday = day.key === today;
          const hasExam = dayItems.some((item) => item.type === 'committee_exam');
          const accessibilitySources = Array.from(
            new Set(dayItems.map((item) => item.type.replace('_', ' ')))
          ).join(', ');

          return (
            <Pressable
              key={day.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${day.key}${
                dayItems.length > 0
                  ? `, ${dayItems.length} items: ${accessibilitySources}`
                  : ', no items'
              }`}
              onPress={() => onSelectDate(day.key)}
              style={({ pressed }) => [
                styles.day,
                {
                  backgroundColor: selected ? colors.primaryMuted : 'transparent',
                  borderColor: selected
                    ? colors.primary
                    : isToday
                      ? colors.accent
                      : hasExam
                        ? colors.warning
                        : 'transparent',
                  borderRadius: radius.sm,
                  minHeight: isTablet ? 58 : 48,
                  opacity: pressed ? 0.7 : day.inVisibleMonth ? 1 : 0.45,
                  paddingVertical: spacing.xs,
                },
              ]}
            >
              <AppText
                variant={isTablet ? 'bodySmall' : 'caption'}
                color={selected ? colors.textPrimary : day.inVisibleMonth ? colors.textSecondary : colors.textMuted}
                style={styles.dayNumber}
              >
                {day.dayNumber}
              </AppText>
              <View style={[styles.markers, { gap: 3, marginTop: spacing.xs }]}> 
                {markerTypes.map((type) => (
                  <View key={type} style={[styles.marker, { backgroundColor: markerColors[type] }]} />
                ))}
                {dayItems.length > 3 && (
                  <AppText variant="caption" color={colors.textMuted} style={styles.more}>
                    +
                  </AppText>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    paddingVertical: 6,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    width: '14.285714%',
  },
  dayNumber: {
    fontWeight: '600',
    textAlign: 'center',
  },
  markers: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 7,
    justifyContent: 'center',
  },
  marker: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  more: {
    fontSize: 9,
    lineHeight: 9,
  },
});
