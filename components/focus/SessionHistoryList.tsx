import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { FocusEmptyHistory } from '@/components/focus/FocusEmptyHistory';
import { useTheme } from '@/hooks/useTheme';
import type { Committee } from '@/store/useCommitteeStore';
import type { FocusSession } from '@/store/useFocusStore';
import { useTranslation } from '@/i18n';

interface SessionHistoryListProps {
  sessions: FocusSession[];
  committees: Committee[];
}

function formatActual(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function SessionHistoryList({ sessions, committees }: SessionHistoryListProps) {
  const { colors, spacing } = useTheme();
  const t = useTranslation();
  const committeesById = new Map(committees.map((committee) => [committee.id, committee]));

  return (
    <View>
      <View style={styles.header}>
        <AppText variant="h3">{t.focus.recentSessions}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {t.focus.lastN(10)}
        </AppText>
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {sessions.length === 0 ? (
          <FocusEmptyHistory />
        ) : (
          sessions.map((session) => {
            const committee =
              session.committeeId === null ? null : committeesById.get(session.committeeId);
            const committeeName =
              session.committeeId === null
                ? t.focus.noCommittee
                : committee?.name ?? t.focus.noCommittee;

            return (
              <Card key={session.id}>
                <View style={styles.rowTop}>
                  <View style={styles.committeeLabel}>
                    {committee != null && (
                      <View style={[styles.colorDot, { backgroundColor: committee.color }]} />
                    )}
                    <AppText variant="body" numberOfLines={1} style={styles.committeeName}>
                      {committeeName}
                    </AppText>
                  </View>
                  <Badge
                    label={session.cancelled ? t.focus.history.status.cancelled : t.focus.history.status.completed}
                    variant={session.cancelled ? 'warning' : 'success'}
                  />
                </View>

                <View style={[styles.details, { marginTop: spacing.sm }]}>
                  <AppText variant="bodySmall" color={colors.textSecondary}>
                    {t.focus.history.plannedActual(
                      Math.round(session.plannedSec / 60),
                      formatActual(session.actualSec)
                    )}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {t.common.dateTime(session.startedAt)}
                  </AppText>
                </View>
              </Card>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  committeeLabel: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
  },
  committeeName: {
    flex: 1,
  },
  colorDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  details: {
    gap: 2,
  },
});
