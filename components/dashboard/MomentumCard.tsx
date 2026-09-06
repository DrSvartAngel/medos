import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { useAppStore } from '@/store/useAppStore';
import { dashboardRepo } from '@/db/repositories/dashboardRepo';
import { getLocalDayRange, todayLocalDateKey } from '@/utils/calendarDate';
import { useTranslation } from '@/i18n';

export function MomentumCard() {
  const t = useTranslation();
  const { colors, spacing } = useTheme();
  const lowStimulation = useAppStore(state => state.lowStimulationMode);
  const isDBReady = useAppStore(state => state.isDBReady);
  const [evidence, setEvidence] = useState<ReturnType<typeof dashboardRepo.getMomentum> | null>(null);
  const [failed, setFailed] = useState(false);
  const refresh = useCallback(() => {
    try {
      const { startMs, endMs } = getLocalDayRange(todayLocalDateKey());
      setEvidence(dashboardRepo.getMomentum(startMs, endMs));
      setFailed(false);
    } catch {
      // A failed refresh, including after midnight, must not retain stale completion.
      setEvidence(null);
      setFailed(true);
    }
  }, []);
  useDashboardRefresh(isDBReady, refresh);
  const rows = [
    { key: 'focus' as const, label: t.momentum.focus, action: t.momentum.openFocus, route: '/(tabs)/focus' },
    { key: 'memory' as const, label: t.momentum.memory, action: t.momentum.openMemory, route: '/(tabs)/memory' },
    { key: 'topicFocus' as const, label: t.momentum.topicFocus, action: t.momentum.openCurriculum, route: '/(tabs)/committees' },
  ];
  const completed = evidence ? rows.filter(row => evidence[row.key]).length : 0;
  const summaries = [t.momentum.zero, t.momentum.one, t.momentum.two, t.momentum.three];
  return (
    <Card style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.md }}>
      <AppText variant="h3">{t.momentum.title}</AppText>
      {evidence === null ? (
        <View style={{ gap: spacing.sm }}>
          <AppText>{failed ? t.momentum.unavailable : t.common.loading}</AppText>
          {failed && <Button label={t.common.retry} variant="ghost" onPress={refresh}
            textStyle={{ flexShrink: 1, textAlign: 'center' }} />}
        </View>
      ) : (
        <>
          <AppText>{t.momentum.completed(completed)}</AppText>
          <AppText color={colors.textSecondary}>{summaries[completed]}</AppText>
          {rows.map(row => (
            <View key={row.key} style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <View accessible accessibilityRole="text"
                accessibilityLabel={`${row.label}. ${evidence[row.key] ? t.momentum.recorded : t.momentum.pending}`}>
              <AppText>{row.label}</AppText>
              <AppText variant="bodySmall" color={evidence[row.key] && !lowStimulation ? colors.success : colors.textSecondary}>
                {evidence[row.key] ? t.momentum.recorded : t.momentum.pending}
              </AppText>
              </View>
              <Button label={row.action} accessibilityLabel={row.action} variant="ghost"
                size="sm" textStyle={{ flexShrink: 1, textAlign: 'left' }}
                onPress={() => router.push(row.route as Href)} style={{ minHeight: 44, alignSelf: 'flex-start', maxWidth: '100%' }} />
            </View>
          ))}
          <AppText variant="bodySmall" color={colors.textSecondary}>{t.momentum.help}</AppText>
        </>
      )}
    </Card>
  );
}
