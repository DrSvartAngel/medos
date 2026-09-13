import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import type { DashboardAgendaItem, DashboardAgendaItemType } from '@/utils/dashboardRules';

interface TodayAgendaProps {
  items: DashboardAgendaItem[];
  total: number;
  error?: string;
  onOpenItem: (item: DashboardAgendaItem) => void;
  onOpenCalendar: () => void;
}

type FeatherName = React.ComponentProps<typeof Feather>['name'];

const CONFIG: Record<
  DashboardAgendaItemType,
  { icon: FeatherName; colorKey: 'textPrimary' | 'accentMoss' | 'accentSage' }
> = {
  manual: { icon: 'calendar', colorKey: 'textPrimary' },
  committee_start: { icon: 'book-open', colorKey: 'accentMoss' },
  committee_exam: { icon: 'flag', colorKey: 'accentSage' },
};

/**
 * Editorial chronological agenda timeline.
 * Features precise time alignment, hairline separators, timeline nodes,
 * and an open editorial feel.
 */
export function TodayAgenda({
  items,
  total,
  error,
  onOpenItem,
  onOpenCalendar,
}: TodayAgendaProps) {
  const { colors, spacing, borders } = useTheme();
  const t = useTranslation();

  return (
    <View style={[styles.container, { gap: spacing.sm }]}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant="headingM" style={{ color: colors.textPrimary }}>
            {t.dashboard.todayPlan}
          </AppText>
          <AppText variant="labelS" style={{ color: colors.textSecondary }}>
            {t.dashboard.plannedCount(total)}
          </AppText>
        </View>
        {onOpenCalendar && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.dashboard.viewCalendar}
            onPress={onOpenCalendar}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 4 }]}
          >
            <View style={[styles.calendarLink, { gap: spacing.xs }]}>
              <AppText variant="labelS" style={{ color: colors.textMuted }}>
                {t.tabs.calendar}
              </AppText>
              <Feather name="chevron-right" size={14} color={colors.textMuted} />
            </View>
          </Pressable>
        )}
      </View>

      {error !== undefined && (
        <View style={[styles.error, { gap: spacing.xs, marginTop: spacing.xs }]}>
          <Feather name="alert-circle" size={14} color={colors.textMuted} />
          <AppText variant="labelS" style={{ color: colors.textMuted, flexShrink: 1 }}>
            {t.dashboard.agendaError}
          </AppText>
        </View>
      )}

      {items.length === 0 ? (
        <View
          style={[
            styles.empty,
            {
              paddingVertical: spacing.xl,
              borderTopWidth: borders.hairline,
              borderTopColor: colors.borderSubtle,
              borderBottomWidth: borders.hairline,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          <Feather name="sun" size={18} color={colors.textMuted} />
          <AppText
            variant="bodyM"
            style={{ color: colors.textPrimary, fontWeight: '600', marginTop: spacing.xs }}
          >
            {t.dashboard.plannedToday(0)}
          </AppText>
          <AppText variant="bodyS" style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t.dashboard.openDay}
          </AppText>
        </View>
      ) : (
        <View
          style={[
            styles.listContainer,
            {
              borderTopWidth: borders.hairline,
              borderTopColor: colors.borderSubtle,
            },
          ]}
        >
          {items.map((item) => {
            const config = CONFIG[item.type];
            const label = t.dashboard.agendaTypes[item.type];
            const title =
              item.type === 'committee_exam'
                ? t.dashboard.examTitle(item.committeeName ?? '')
                : item.type === 'committee_start'
                ? t.dashboard.startTitle(item.committeeName ?? '')
                : item.title;
            const subtitle =
              item.type === 'committee_exam'
                ? t.dashboard.examToday
                : item.type === 'committee_start'
                ? t.dashboard.committeeStart
                : item.committeeId
                ? item.committeeName ?? t.dashboard.committeeRemoved
                : undefined;
            const accent = colors[config.colorKey];

            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={t.dashboard.openItem(label, title)}
                onPress={() => onOpenItem(item)}
                style={({ pressed }) => [
                  styles.agendaRow,
                  {
                    borderBottomWidth: borders.hairline,
                    borderBottomColor: colors.borderSubtle,
                    opacity: pressed ? 0.75 : 1,
                    paddingVertical: spacing.md,
                    gap: spacing.md,
                  },
                ]}
              >
                {/* Time Indicator Column */}
                <View style={styles.timeColumn}>
                  <AppText
                    variant="labelS"
                    style={[styles.timeText, { color: colors.textPrimary, fontWeight: '600' }]}
                  >
                    {item.time ?? '—'}
                  </AppText>
                </View>

                {/* Timeline node */}
                <View style={[styles.nodeDot, { backgroundColor: accent }]} />

                {/* Content */}
                <View style={styles.rowText}>
                  <View style={[styles.metaRow, { gap: spacing.xs }]}>
                    <AppText variant="labelS" style={[styles.typeLabel, { color: accent }]}>
                      {label.toUpperCase()}
                    </AppText>
                  </View>
                  <AppText
                    variant="bodyM"
                    numberOfLines={2}
                    style={{ color: colors.textPrimary, fontWeight: '500', lineHeight: 20 }}
                  >
                    {title}
                  </AppText>
                  {subtitle !== undefined && (
                    <AppText
                      variant="labelS"
                      numberOfLines={1}
                      style={{ color: colors.textSecondary, marginTop: 2 }}
                    >
                      {subtitle}
                    </AppText>
                  )}
                </View>

                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  calendarLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyText: {
    marginTop: 2,
    textAlign: 'center',
  },
  listContainer: {
    width: '100%',
  },
  agendaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 52,
    width: '100%',
  },
  timeColumn: {
    minWidth: 48,
    alignItems: 'flex-start',
  },
  timeText: {
    fontVariant: ['tabular-nums'],
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rowText: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
