import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { GSText, Heading, HStack, VStack, Box } from '@/components/ui/gluestack';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { dashboardRepo } from '@/db/repositories/dashboardRepo';
import {
  todayLocalDateKey,
  parseLocalDateKey,
  shiftLocalDateKey,
  getLocalDayRange,
} from '@/utils/calendarDate';

export function WeeklyFocusChart() {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  const weekData = useMemo(() => {
    try {
      const todayKey = todayLocalDateKey();
      const todayParts = parseLocalDateKey(todayKey);
      if (!todayParts) return { days: [], totalMinutes: 0, hasData: false };

      const jsDate = new Date(todayParts.year, todayParts.month - 1, todayParts.day);
      const dayOfWeek = jsDate.getDay(); // 0 is Sun, 1 is Mon
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayKey = shiftLocalDateKey(todayKey, -daysSinceMonday);

      const weekdays = t.sweep.weekdays; // ['Mon', 'Tue', ...]
      const days: { key: string; label: string; minutes: number; isToday: boolean }[] = [];
      let totalSeconds = 0;

      for (let i = 0; i < 7; i++) {
        const dayKey = shiftLocalDateKey(mondayKey, i);
        const { startMs, endMs } = getLocalDayRange(dayKey);
        const summary = dashboardRepo.getFocusSummary(startMs, endMs);
        const minutes = Math.round(summary.totalSeconds / 60);
        totalSeconds += summary.totalSeconds;

        days.push({
          key: dayKey,
          label: weekdays[i] ?? '',
          minutes,
          isToday: dayKey === todayKey,
        });
      }

      const totalMinutes = Math.round(totalSeconds / 60);
      return {
        days,
        totalMinutes,
        hasData: totalMinutes > 0,
      };
    } catch {
      return { days: [], totalMinutes: 0, hasData: false };
    }
  }, [t]);

  const maxMinutes = useMemo(() => {
    const rawMax = Math.max(...weekData.days.map((d) => d.minutes), 0);
    return Math.max(rawMax, 60); // minimum scale ceiling 60 min
  }, [weekData]);

  const formattedTotal = useMemo(() => {
    const h = Math.floor(weekData.totalMinutes / 60);
    const m = weekData.totalMinutes % 60;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }, [weekData.totalMinutes]);

  return (
    <Card style={styles.card}>
      <VStack space="sm">
        {/* Header */}
        <HStack style={styles.headerRow}>
          <HStack space="xs" style={{ alignItems: 'center' }}>
            <Box
              style={[
                styles.iconWrap,
                { backgroundColor: colors.primaryMuted, borderRadius: radius.xs },
              ]}
            >
              <Feather name="bar-chart-2" size={14} color={colors.primary} />
            </Box>
            <GSText size="xs" style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {t.dashboard.weeklyFocus.toUpperCase()}
            </GSText>
          </HStack>
          {weekData.hasData && (
            <GSText size="xs" style={{ color: colors.primary, fontWeight: '700' }}>
              {t.dashboard.weeklyTotal(formattedTotal)}
            </GSText>
          )}
        </HStack>

        {/* Chart Content */}
        {!weekData.hasData ? (
          <VStack space="xs" style={styles.emptyContainer}>
            <Feather name="clock" size={24} color={colors.textMuted} />
            <GSText size="xs" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
              {t.dashboard.noWeeklyFocus}
            </GSText>
          </VStack>
        ) : (
          <VStack space="xs" style={{ width: '100%', paddingTop: 8 }}>
            <HStack style={styles.barsRow}>
              {weekData.days.map((day) => {
                const fillPercent = Math.min(100, Math.round((day.minutes / maxMinutes) * 100));
                return (
                  <VStack key={day.key} style={styles.barCol}>
                    {/* Minutes label above bar */}
                    <GSText
                      size="xs"
                      style={[
                        styles.minLabel,
                        {
                          color: day.minutes > 0 ? (day.isToday ? colors.primary : colors.textSecondary) : 'transparent',
                          fontWeight: day.isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {day.minutes > 0 ? day.minutes : '0'}
                    </GSText>

                    {/* Vertical Bar track */}
                    <View
                      style={[
                        styles.barTrack,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: day.isToday ? colors.primary : colors.borderFaint,
                          borderWidth: day.isToday ? 1 : 0,
                          borderRadius: radius.xs,
                        },
                      ]}
                    >
                      {fillPercent > 0 && (
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${fillPercent}%`,
                              backgroundColor: day.isToday ? colors.primary : colors.primaryPressed,
                              borderRadius: radius.xs,
                            },
                          ]}
                        />
                      )}
                    </View>

                    {/* Day name below bar */}
                    <GSText
                      size="xs"
                      style={[
                        styles.dayLabel,
                        {
                          color: day.isToday ? colors.primary : colors.textMuted,
                          fontWeight: day.isToday ? '700' : '500',
                        },
                      ]}
                    >
                      {day.label}
                    </GSText>
                  </VStack>
                );
              })}
            </HStack>

            {/* Subtle Baseline */}
            <View style={[styles.baseline, { backgroundColor: colors.border }]} />
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  barsRow: {
    alignItems: 'flex-end',
    height: 110,
    justifyContent: 'space-between',
    width: '100%',
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  minLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  barTrack: {
    height: 72,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 20,
  },
  barFill: {
    width: '100%',
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  baseline: {
    height: 1,
    marginTop: 2,
    width: '100%',
  },
});
