import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { CalendarMonthHeader } from '@/components/calendar/CalendarMonthHeader';
import { DayAgenda } from '@/components/calendar/DayAgenda';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCalendarStore, type CalendarItem } from '@/store/useCalendarStore';
import { formatMonthLabel, getVisibleGridDays, todayLocalDateKey } from '@/utils/calendarDate';
import { useTranslation } from '@/i18n';

export default function CalendarScreen() {
  const { colors, spacing } = useTheme();
  const { isTablet, isLargeTablet } = useResponsive();
  const t = useTranslation();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const visibleMonth = useCalendarStore((state) => state.visibleMonth);
  const timelineItems = useCalendarStore((state) => state.timelineItems);
  const isLoading = useCalendarStore((state) => state.isLoading);
  const error = useCalendarStore((state) => state.error);
  const selectDate = useCalendarStore((state) => state.selectDate);
  const goToPreviousMonth = useCalendarStore((state) => state.goToPreviousMonth);
  const goToNextMonth = useCalendarStore((state) => state.goToNextMonth);
  const goToToday = useCalendarStore((state) => state.goToToday);
  const loadVisibleRange = useCalendarStore((state) => state.loadVisibleRange);

  useFocusEffect(
    useCallback(() => {
      if (isDBReady) loadVisibleRange();
    }, [isDBReady, loadVisibleRange])
  );

  const days = useMemo(() => getVisibleGridDays(visibleMonth), [visibleMonth]);
  const selectedItems = useMemo(
    () => timelineItems.filter((item) => item.date === selectedDate),
    [selectedDate, timelineItems]
  );

  function openNewEvent() {
    router.push(`/calendar/new?date=${selectedDate}` as Href);
  }

  function openItem(item: CalendarItem) {
    if (item.type === 'manual') {
      router.push(`/calendar/${item.sourceId}` as Href);
    } else if (item.type === 'committee_start' || item.type === 'committee_exam') {
      router.push(`/committees/${item.sourceId}` as Href);
    } else if (item.type === 'memory') {
      router.push(`/decks/${item.sourceId}` as Href);
    }
  }

  if (!isDBReady) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
      </ScreenWrapper>
    );
  }

  const monthPanel = (
    <Card elevated padded={false} style={styles.monthPanel}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
        <CalendarMonthHeader
          label={formatMonthLabel(visibleMonth)}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onToday={goToToday}
        />
      </View>
      <View style={{ paddingBottom: spacing.md, paddingHorizontal: spacing.xs }}>
        <CalendarMonthGrid
          days={days}
          items={timelineItems}
          selectedDate={selectedDate}
          today={todayLocalDateKey()}
          onSelectDate={selectDate}
        />
      </View>
    </Card>
  );

  const agendaPanel = (
    <View style={styles.agendaPanel}>
      <DayAgenda
        date={selectedDate}
        items={selectedItems}
        onAdd={openNewEvent}
        onOpenItem={openItem}
      />
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <AppText variant={isTablet ? 'h1' : 'h2'}>{t.calendar.title}</AppText>
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
          {t.calendar.subtitle}
        </AppText>
      </View>

      {error !== null && (
        <View style={[styles.error, { borderColor: colors.error, marginTop: spacing.md, padding: spacing.md }]}>
          <Feather name="alert-circle" size={18} color={colors.error} />
          <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
            {error}
          </AppText>
          <Button label={t.common.retry} variant="ghost" size="sm" onPress={loadVisibleRange} />
        </View>
      )}

      {isLoading && timelineItems.length === 0 ? (
        <View style={[styles.centered, { paddingVertical: spacing.xl }]}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : isLargeTablet ? (
        <View style={[styles.twoPane, { gap: spacing.lg, marginTop: spacing.lg }]}>
          <View style={styles.calendarColumn}>{monthPanel}</View>
          <View style={styles.agendaColumn}>{agendaPanel}</View>
        </View>
      ) : (
        <View style={{ gap: spacing.xl, marginTop: spacing.lg }}>
          {monthPanel}
          {agendaPanel}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 8 },
  error: { alignItems: 'center', borderRadius: 12, borderWidth: 1, flexDirection: 'row' },
  errorText: { flex: 1, marginLeft: 8 },
  monthPanel: { width: '100%' },
  agendaPanel: { width: '100%' },
  twoPane: { alignItems: 'flex-start', flexDirection: 'row' },
  calendarColumn: { flex: 1.05, minWidth: 0 },
  agendaColumn: { flex: 0.95, minWidth: 0 },
});
