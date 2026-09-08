import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
  { icon: FeatherName; colorKey: 'textPrimary' | 'info' | 'warning' }
> = {
  manual: { icon: 'calendar', colorKey: 'textPrimary' },
  committee_start: { icon: 'book-open', colorKey: 'info' },
  committee_exam: { icon: 'flag', colorKey: 'warning' },
};

export function TodayAgenda({
  items,
  total,
  error,
  onOpenItem,
  onOpenCalendar,
}: TodayAgendaProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  return (
    <VStack space="sm" style={styles.container}>
      {/* Header Row */}
      <HStack style={styles.headerRow}>
        <VStack space="xs" style={styles.headerText}>
          <Heading size="sm" style={{ color: colors.textPrimary }}>
            {t.dashboard.todayPlan}
          </Heading>
          <GSText size="xs" style={{ color: colors.textSecondary }}>
            {t.dashboard.plannedCount(total)}
          </GSText>
        </VStack>
        {onOpenCalendar && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.dashboard.viewCalendar}
            onPress={onOpenCalendar}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, padding: 4 }]}
          >
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <GSText size="xs" style={{ color: colors.textMuted }}>
                {t.tabs.calendar}
              </GSText>
              <Feather name="chevron-right" size={14} color={colors.textMuted} />
            </HStack>
          </Pressable>
        )}
      </HStack>

      {error !== undefined && (
        <HStack space="xs" style={[styles.error, { marginTop: spacing.xs }]}>
          <Feather name="alert-circle" size={14} color={colors.textMuted} />
          <GSText size="xs" style={{ color: colors.textMuted, flexShrink: 1 }}>
            {t.dashboard.agendaError}
          </GSText>
        </HStack>
      )}

      {items.length === 0 ? (
        <Card
          style={[
            styles.empty,
            {
              paddingVertical: spacing.lg,
            },
          ]}
        >
          <Feather name="sun" size={24} color={colors.primary} />
          <GSText
            size="sm"
            style={{ color: colors.textPrimary, fontWeight: '600', marginTop: spacing.xs }}
          >
            {t.dashboard.plannedToday(0)}
          </GSText>
          <GSText size="xs" style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t.dashboard.openDay}
          </GSText>
        </Card>
      ) : (
        <VStack space="xs" style={{ width: '100%' }}>
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
                className="bg-card border border-border"
                style={({ pressed }) => [
                  styles.agendaRow,
                  {
                    borderLeftColor: accent,
                    borderLeftWidth: 3,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.8 : 1,
                    padding: spacing.md,
                  },
                ]}
              >
                <Box style={[styles.rowIconWrap, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}>
                  <Feather name={config.icon} size={16} color={accent} />
                </Box>
                <VStack space="xs" style={[styles.rowText, { marginLeft: spacing.md }]}>
                  <HStack space="xs" style={styles.metaRow}>
                    <GSText size="xs" style={[styles.typeLabel, { color: accent }]}>
                      {label}
                    </GSText>
                    {item.time !== undefined && (
                      <GSText size="xs" style={{ color: colors.textMuted }}>
                        · {item.time}
                      </GSText>
                    )}
                  </HStack>
                  <GSText
                    size="sm"
                    numberOfLines={2}
                    style={{ color: colors.textPrimary, fontWeight: '500' }}
                  >
                    {title}
                  </GSText>
                  {subtitle !== undefined && (
                    <GSText size="xs" numberOfLines={1} style={{ color: colors.textSecondary }}>
                      {subtitle}
                    </GSText>
                  )}
                </VStack>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </VStack>
      )}
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  error: {
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyText: {
    marginTop: 4,
    textAlign: 'center',
  },
  agendaRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    width: '100%',
  },
  rowIconWrap: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  rowText: {
    flex: 1,
  },
  metaRow: {
    alignItems: 'center',
  },
  typeLabel: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
