import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { useAppStore } from '@/store/useAppStore';
import { dashboardRepo } from '@/db/repositories/dashboardRepo';
import { getLocalDayRange, todayLocalDateKey } from '@/utils/calendarDate';
import { useTranslation } from '@/i18n';

export function MomentumCard() {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const lowStimulation = useAppStore((state) => state.lowStimulationMode);
  const isDBReady = useAppStore((state) => state.isDBReady);
  const [evidence, setEvidence] = useState<ReturnType<typeof dashboardRepo.getMomentum> | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    try {
      const { startMs, endMs } = getLocalDayRange(todayLocalDateKey());
      setEvidence(dashboardRepo.getMomentum(startMs, endMs));
      setFailed(false);
    } catch {
      setEvidence(null);
      setFailed(true);
    }
  }, []);

  useDashboardRefresh(isDBReady, refresh);

  const rows = [
    { key: 'focus' as const, label: t.momentum.focus, action: t.momentum.openFocus, route: '/(tabs)/focus', icon: 'clock' as const },
    { key: 'memory' as const, label: t.momentum.memory, action: t.momentum.openMemory, route: '/(tabs)/memory', icon: 'layers' as const },
    { key: 'topicFocus' as const, label: t.momentum.topicFocus, action: t.momentum.openCurriculum, route: '/(tabs)/committees', icon: 'book-open' as const },
  ];

  const completed = evidence ? rows.filter((row) => evidence[row.key]).length : 0;
  const summaries = [t.momentum.zero, t.momentum.one, t.momentum.two, t.momentum.three];

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.cardBorder,
          borderRadius: radius.lg,
          padding: spacing.md,
        },
      ]}
    >
      <VStack space="sm">
        <HStack style={styles.headerRow}>
          <Heading size="sm" style={{ color: colors.textPrimary }}>
            {t.momentum.title}
          </Heading>
          <GSText size="xs" style={{ color: colors.textMuted }}>
            {evidence ? `${completed}/3` : ''}
          </GSText>
        </HStack>

        {evidence === null ? (
          <VStack space="xs">
            <GSText size="xs" style={{ color: colors.textSecondary }}>
              {failed ? t.momentum.unavailable : t.common.loading}
            </GSText>
            {failed && (
              <Button
                label={t.common.retry}
                variant="ghost"
                size="sm"
                onPress={refresh}
                textStyle={{ flexShrink: 1, textAlign: 'center' }}
              />
            )}
          </VStack>
        ) : (
          <VStack space="sm">
            <GSText size="xs" style={{ color: colors.textSecondary }}>
              {summaries[completed]}
            </GSText>

            <VStack space="xs" style={styles.rowsContainer}>
              {rows.map((row) => {
                const isRecorded = evidence[row.key];
                return (
                  <HStack
                    key={row.key}
                    style={[
                      styles.itemRow,
                      {
                        borderTopWidth: 1,
                        borderTopColor: colors.borderFaint,
                        paddingTop: spacing.xs,
                      },
                    ]}
                  >
                    <Box
                      style={[
                        styles.itemIconWrap,
                        {
                          backgroundColor: isRecorded
                            ? colors.primaryMuted
                            : colors.surfaceElevated,
                          borderRadius: radius.xs,
                        },
                      ]}
                    >
                      <Feather
                        name={isRecorded ? 'check' : row.icon}
                        size={14}
                        color={isRecorded ? colors.primary : colors.textMuted}
                      />
                    </Box>

                    <VStack
                      space="xs"
                      style={styles.itemText}
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={`${row.label}. ${
                        isRecorded ? t.momentum.recorded : t.momentum.pending
                      }`}
                    >
                      <GSText
                        size="xs"
                        style={{ color: colors.textPrimary, fontWeight: '500' }}
                      >
                        {row.label}
                      </GSText>
                      <GSText
                        size="xs"
                        style={{
                          color:
                            isRecorded && !lowStimulation
                              ? colors.success
                              : colors.textMuted,
                        }}
                      >
                        {isRecorded ? t.momentum.recorded : t.momentum.pending}
                      </GSText>
                    </VStack>

                    <Button
                      label={row.action}
                      accessibilityLabel={row.action}
                      variant="ghost"
                      size="sm"
                      textStyle={{ fontSize: 12 }}
                      onPress={() => router.push(row.route as Href)}
                      style={styles.actionBtn}
                    />
                  </HStack>
                );
              })}
            </VStack>

            <GSText size="xs" style={{ color: colors.textMuted, marginTop: 2 }}>
              {t.momentum.help}
            </GSText>
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowsContainer: {
    width: '100%',
  },
  itemRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemText: {
    flex: 1,
  },
  actionBtn: {
    minHeight: 36,
    paddingHorizontal: 8,
  },
});
