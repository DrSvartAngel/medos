import { useTranslation } from '@/i18n';
import React, { useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCalendarStore, type CalendarEventInput } from '@/store/useCalendarStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { isValidLocalDateKey, todayLocalDateKey } from '@/utils/calendarDate';

export default function NewCalendarEventScreen() {
  const t = useTranslation();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const selectedDate = useCalendarStore((state) => state.selectedDate);
  const createEvent = useCalendarStore((state) => state.createEvent);
  const error = useCalendarStore((state) => state.error);
  const setError = useCalendarStore((state) => state.setError);
  const initialDate = date !== undefined && isValidLocalDateKey(date)
    ? date
    : isValidLocalDateKey(selectedDate)
      ? selectedDate
      : todayLocalDateKey();

  useEffect(() => {
    setError(null);
    if (isDBReady) loadCommittees();
  }, [isDBReady, loadCommittees, setError]);

  function handleCreate(input: CalendarEventInput): boolean {
    const id = createEvent(input);
    if (id === null) return false;
    router.replace(`/calendar/${id}` as Href);
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
            accessibilityLabel={t.sweep.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/calendar' as Href))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ marginRight: spacing.md }}
          >
            <Feather name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.sweep.addEvent}</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>
              {t.sweep.eventHint}</AppText>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <CalendarEventForm
            initialDate={initialDate}
            committees={committees}
            submitLabel={t.sweep.createEvent}
            error={error}
            onSubmit={handleCreate}
            onCancel={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/calendar' as Href))}
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
