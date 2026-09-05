import React, { useEffect } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { CalendarEventForm } from '@/components/calendar/CalendarEventForm';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCalendarStore, type CalendarEventInput } from '@/store/useCalendarStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';

export default function EditCalendarEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing } = useTheme();
  const { isTablet } = useResponsive();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const event = useCalendarStore((state) => state.activeEvent);
  const isLoadingEvent = useCalendarStore((state) => state.isLoadingEvent);
  const error = useCalendarStore((state) => state.error);
  const loadEvent = useCalendarStore((state) => state.loadEvent);
  const updateEvent = useCalendarStore((state) => state.updateEvent);
  const setError = useCalendarStore((state) => state.setError);

  useEffect(() => {
    if (!isDBReady || !id) return;
    setError(null);
    loadCommittees();
    loadEvent(id);
  }, [id, isDBReady, loadCommittees, loadEvent, setError]);

  function handleUpdate(input: CalendarEventInput): boolean {
    if (!id || !updateEvent(id, input)) return false;
    router.replace(`/calendar/${id}` as Href);
    return true;
  }

  if (!isDBReady || isLoadingEvent) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  if (!event || event.id !== id) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centered}>
        <Feather name="alert-circle" size={36} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>Study event not found</AppText>
        <Button
          label="Back to Calendar"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/calendar' as Href)}
          style={{ marginTop: spacing.lg }}
        />
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
            <AppText variant={isTablet ? 'h1' : 'h2'}>Edit Study Event</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: 2 }}>
              Keep the plan simple and useful.
            </AppText>
          </View>
        </View>

        <View style={{ marginTop: spacing.xl }}>
          <CalendarEventForm
            key={`${event.id}:${event.updatedAt}`}
            initialTitle={event.title}
            initialDescription={event.description}
            initialDate={event.date}
            initialStartTime={event.startTime}
            initialEndTime={event.endTime}
            initialCommitteeId={event.committeeId}
            committees={committees}
            submitLabel="Save Changes"
            error={error}
            onSubmit={handleUpdate}
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
