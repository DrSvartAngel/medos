import { useTranslation } from '@/i18n';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
    <View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant="h3">{t.dashboard.todayPlan}</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {t.dashboard.plannedCount(total)}
          </AppText>
        </View>
        <Button label={t.dashboard.viewCalendar} variant="ghost" size="sm" onPress={onOpenCalendar} />
      </View>

      {error !== undefined && (
        <View style={[styles.error, { marginTop: spacing.sm }]}>
          <Feather name="alert-circle" size={16} color={colors.textMuted} />
          <AppText variant="caption" color={colors.textMuted} style={{ marginLeft: spacing.sm, flexShrink: 1 }}>
            {t.dashboard.agendaError}
          </AppText>
        </View>
      )}

      {items.length === 0 ? (
        <Card style={[styles.empty, { marginTop: spacing.md, paddingVertical: spacing.lg }]}>
          <Feather name="sun" size={28} color={colors.accent} />
          <AppText variant="body" style={{ marginTop: spacing.sm }}>{t.dashboard.plannedToday(0)}</AppText>
          <AppText variant="bodySmall" color={colors.textSecondary} style={styles.emptyText}>
            {t.dashboard.openDay}
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {items.map((item) => {
            const config = CONFIG[item.type];
            const label = t.dashboard.agendaTypes[item.type];
            const title = item.type === 'committee_exam' ? t.dashboard.examTitle(item.committeeName ?? '')
              : item.type === 'committee_start' ? t.dashboard.startTitle(item.committeeName ?? '') : item.title;
            const subtitle = item.type === 'committee_exam' ? t.dashboard.examToday
              : item.type === 'committee_start' ? t.dashboard.committeeStart
              : item.committeeId ? item.committeeName ?? t.dashboard.committeeRemoved : undefined;
            const accent = colors[config.colorKey];
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={t.dashboard.openItem(label, title)}
                onPress={() => onOpenItem(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: accent,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.75 : 1,
                    padding: spacing.md,
                  },
                ]}
              >
                <Feather name={config.icon} size={18} color={accent} />
                <View style={[styles.rowText, { marginLeft: spacing.md }]}>
                  <View style={styles.metaRow}>
                    <AppText variant="caption" color={accent} style={styles.typeLabel}>
                      {label}
                    </AppText>
                    {item.time !== undefined && (
                      <AppText variant="caption" color={colors.textMuted} style={{ marginLeft: spacing.sm, flexShrink: 1 }}>
                        {item.time}
                      </AppText>
                    )}
                  </View>
                  <AppText variant="body" numberOfLines={2} style={{ marginTop: 2 }}>
                    {title}
                  </AppText>
                  {subtitle !== undefined && (
                    <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
                      {subtitle}
                    </AppText>
                  )}
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { alignItems: 'center', flexDirection: 'row' },
  headerText: { flex: 1, marginRight: 8 },
  error: { alignItems: 'center', flexDirection: 'row' },
  empty: { alignItems: 'center' },
  emptyText: { marginTop: 4, textAlign: 'center' },
  row: { alignItems: 'center', borderLeftWidth: 4, borderWidth: 1, flexDirection: 'row', minHeight: 64 },
  rowText: { flex: 1 },
  metaRow: { alignItems: 'center', flexDirection: 'row' },
  typeLabel: { fontWeight: '700' },
});
