import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, type Href, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useCalendarStore } from '@/store/useCalendarStore';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { formatAgendaDate } from '@/utils/calendarDate';

export default function CalendarEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const isDBReady = useAppStore((state) => state.isDBReady);
  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);
  const event = useCalendarStore((state) => state.activeEvent);
  const isLoadingEvent = useCalendarStore((state) => state.isLoadingEvent);
  const error = useCalendarStore((state) => state.error);
  const loadEvent = useCalendarStore((state) => state.loadEvent);
  const deleteEvent = useCalendarStore((state) => state.deleteEvent);
  const clearActiveEvent = useCalendarStore((state) => state.clearActiveEvent);

  useEffect(() => {
    if (!isDBReady || !id) return;
    loadCommittees();
    loadEvent(id);
    return clearActiveEvent;
  }, [clearActiveEvent, id, isDBReady, loadCommittees, loadEvent]);

  const committee = event?.committeeId
    ? committees.find((item) => item.id === event.committeeId)
    : undefined;

  function handleDelete() {
    if (!event) return;
    Alert.alert(
      'Remove this study event?',
      `“${event.title}” will be removed from Calendar. Committee, Focus, and Memory data will not be affected.`,
      [
        { text: 'Keep Event', style: 'cancel' },
        {
          text: 'Remove Event',
          style: 'destructive',
          onPress: () => {
            if (deleteEvent(event.id)) router.replace('/(tabs)/calendar' as Href);
          },
        },
      ]
    );
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/calendar' as Href);
  }

  if (!isDBReady || isLoadingEvent) {
    return (
      <ScreenWrapper scrollable={false} includeBottomSafeArea contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </ScreenWrapper>
    );
  }

  if (!event || event.id !== id) {
    return (
      <ScreenWrapper scrollable={false} includeBottomSafeArea contentStyle={styles.centered}>
        <Feather name="alert-circle" size={36} color={colors.textMuted} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>Study event not found</AppText>
        <AppText variant="bodySmall" color={error ? colors.error : colors.textSecondary} style={styles.notFoundText}>
          {error ?? 'It may have been removed from this device.'}
        </AppText>
        <Button
          label="Back to Calendar"
          variant="secondary"
          onPress={handleBack}
          style={{ marginTop: spacing.lg }}
        />
      </ScreenWrapper>
    );
  }

  const timeLabel = event.startTime === null
    ? 'All day'
    : event.endTime === null
      ? event.startTime
      : `${event.startTime}–${event.endTime}`;

  return (
    <ScreenWrapper includeBottomSafeArea>
      <View style={styles.topBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Feather
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            name="arrow-left"
            size={24}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Edit study event"
          onPress={() => router.push(`/calendar/${event.id}/edit` as Href)}
          style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
          <AppText variant="label" color={colors.primary} style={{ marginLeft: 6 }}>Edit</AppText>
        </TouchableOpacity>
      </View>

      <Card elevated style={[styles.hero, { marginTop: spacing.lg }]}>
        <Badge label="Study Event" variant="primary" />
        <AppText variant={isTablet ? 'h1' : 'h2'} style={{ marginTop: spacing.md }}>
          {event.title}
        </AppText>
        <View style={[styles.detailRow, { marginTop: spacing.lg }]}>
          <Feather name="calendar" size={17} color={colors.textMuted} />
          <AppText variant="body" color={colors.textSecondary} style={styles.detailText}>
            {formatAgendaDate(event.date)}
          </AppText>
        </View>
        <View style={[styles.detailRow, { marginTop: spacing.sm }]}>
          <Feather name="clock" size={17} color={colors.textMuted} />
          <AppText variant="body" color={colors.textSecondary} style={styles.detailText}>
            {timeLabel}
          </AppText>
        </View>
        {event.committeeId !== null && (
          <View style={[styles.detailRow, { marginTop: spacing.sm }]}>
            <Feather name="book-open" size={17} color={committee ? colors.info : colors.warning} />
            <AppText
              variant="body"
              color={committee ? colors.textSecondary : colors.warning}
              style={styles.detailText}
            >
              {committee?.name ?? 'Committee removed'}
            </AppText>
          </View>
        )}
        {event.description.length > 0 && (
          <View style={[styles.description, { borderTopColor: colors.border, marginTop: spacing.lg, paddingTop: spacing.lg }]}>
            <AppText variant="label" color={colors.textMuted}>NOTE</AppText>
            <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
              {event.description}
            </AppText>
          </View>
        )}
      </Card>

      {error !== null && (
        <AppText variant="bodySmall" color={colors.error} style={{ marginTop: spacing.md }}>
          {error}
        </AppText>
      )}

      <Button
        label="Remove Study Event"
        variant="danger"
        onPress={handleDelete}
        style={{ alignSelf: isTablet ? 'flex-start' : 'stretch', marginTop: spacing.xl }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center' },
  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  backButton: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  editButton: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
  hero: { maxWidth: 720, width: '100%' },
  detailRow: { alignItems: 'center', flexDirection: 'row' },
  detailText: { flex: 1, marginLeft: 10 },
  description: { borderTopWidth: 1 },
  notFoundText: { marginTop: 8, maxWidth: 400, textAlign: 'center' },
});
