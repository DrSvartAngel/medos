import React, { useState, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import {
  AcademicContextSelector,
  type AcademicContextValue,
} from '@/components/curriculum/AcademicContextSelector';
import { FocusEmptyHistory } from '@/components/focus/FocusEmptyHistory';
import { useTheme } from '@/hooks/useTheme';
import { focusRepo } from '@/db/repositories/focusRepo';
import { useFocusStore, type FocusSession } from '@/store/useFocusStore';
import type { Committee } from '@/store/useCommitteeStore';
import { useTranslation } from '@/i18n';

interface SessionHistoryListProps {
  sessions: FocusSession[];
  committees: Committee[];
  onSessionUpdated?: () => void;
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

export function SessionHistoryList({ sessions, committees, onSessionUpdated }: SessionHistoryListProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const t = useTranslation();
  const committeesById = useMemo(
    () => new Map(committees.map((committee) => [committee.id, committee])),
    [committees]
  );

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editContextValue, setEditContextValue] = useState<AcademicContextValue>({
    committeeId: null,
    subjectId: null,
    topicId: null,
  });
  const [editError, setEditError] = useState<string | null>(null);

  function handleStartEdit(session: FocusSession) {
    setEditingSessionId(session.id);
    setEditContextValue({
      committeeId: session.committeeId ?? null,
      subjectId: session.subjectId ?? null,
      topicId: session.topicId ?? null,
    });
    setEditError(null);
  }

  function handleCancelEdit() {
    setEditingSessionId(null);
    setEditError(null);
  }

  function handleSaveEdit(sessionId: string) {
    try {
      focusRepo.updateAcademicContext(sessionId, {
        committeeId: editContextValue.committeeId ?? null,
        subjectId: editContextValue.subjectId ?? null,
        topicId: editContextValue.topicId ?? null,
      });
      setEditingSessionId(null);
      setEditError(null);
      useFocusStore.getState().loadRecentSessions();
      onSessionUpdated?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Context update failed';
      setEditError(message);
    }
  }

  function resolveBreadcrumb(session: FocusSession): string {
    const committee =
      session.committeeId === null ? null : committeesById.get(session.committeeId);
    const committeeName = committee?.name ?? t.focus.noCommittee;

    if (session.topicId) {
      try {
        const topicContext = focusRepo.getTopicContext(session.topicId);
        if (topicContext) {
          const resolvedCommittee = committeesById.get(topicContext.committeeId);
          const cName = resolvedCommittee?.name ?? committeeName;
          return `${cName} · ${topicContext.subjectName} · ${topicContext.name}`;
        }
      } catch {
        // Fallback to committee if topic lookup fails
      }
    }

    if (session.subjectId) {
      try {
        const subjectContext = focusRepo.getSubjectContext(session.subjectId);
        if (subjectContext) {
          const resolvedCommittee = committeesById.get(subjectContext.committeeId);
          const cName = resolvedCommittee?.name ?? committeeName;
          return `${cName} · ${subjectContext.name}`;
        }
      } catch {
        // Fallback to committee
      }
    }

    if (session.committeeId) {
      return committeeName;
    }

    return t.focus.history.noContext ?? t.focus.noCommittee;
  }

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
            const breadcrumb = resolveBreadcrumb(session);
            const isEditing = editingSessionId === session.id;

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
                    label={
                      session.cancelled
                        ? t.focus.history.status.cancelled
                        : t.focus.history.status.completed
                    }
                    variant={session.cancelled ? 'warning' : 'success'}
                  />
                </View>

                {/* Academic Context Breadcrumb */}
                <View style={[styles.contextRow, { marginTop: spacing.xs }]}>
                  <Feather name="book-open" size={12} color={colors.textMuted} />
                  <AppText
                    variant="caption"
                    color={colors.textSecondary}
                    numberOfLines={1}
                    style={{ flex: 1, marginLeft: spacing.xs }}
                  >
                    {breadcrumb}
                  </AppText>
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

                {/* Edit Context Action Button */}
                {session.completed && !isEditing && (
                  <View style={[styles.actionRow, { marginTop: spacing.sm }]}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={t.focus.history.editContext}
                      onPress={() => handleStartEdit(session)}
                      style={[
                        styles.editButton,
                        {
                          borderColor: colors.borderSubtle,
                          backgroundColor: colors.surfaceElevated,
                          borderRadius: radius.sm,
                          paddingHorizontal: spacing.sm,
                          paddingVertical: spacing.xs,
                        },
                      ]}
                    >
                      <Feather
                        name="edit-2"
                        size={12}
                        color={colors.primary}
                        style={{ marginRight: 4 }}
                      />
                      <AppText
                        variant="caption"
                        color={colors.primary}
                        style={{ fontWeight: '600' }}
                      >
                        {t.focus.history.editContext}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Inline Academic Context Editor */}
                {isEditing && (
                  <View
                    style={[
                      styles.editContainer,
                      {
                        borderTopColor: colors.borderSubtle,
                        borderTopWidth: borders.hairline,
                        marginTop: spacing.md,
                        paddingTop: spacing.sm,
                      },
                    ]}
                  >
                    <AppText
                      variant="bodySmall"
                      style={{ fontWeight: '600', marginBottom: spacing.xs, color: colors.textPrimary }}
                    >
                      {t.focus.history.editContextTitle}
                    </AppText>

                    <AcademicContextSelector
                      maxDepth="topic"
                      requiredDepth="none"
                      value={editContextValue}
                      onChange={(ctx) => setEditContextValue(ctx)}
                    />

                    {editError && (
                      <AppText
                        variant="caption"
                        color={colors.error}
                        style={{ marginTop: spacing.xs }}
                      >
                        {editError}
                      </AppText>
                    )}

                    <View style={[styles.editActions, { marginTop: spacing.sm, gap: spacing.sm }]}>
                      <Button
                        variant="outline"
                        size="sm"
                        label={t.common.cancel}
                        onPress={handleCancelEdit}
                        accessibilityLabel={t.common.cancel}
                        style={{ flex: 1 }}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        label={t.common.save}
                        onPress={() => handleSaveEdit(session.id)}
                        accessibilityLabel={t.common.save}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                )}
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
  contextRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  details: {
    gap: 2,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
  },
  editContainer: {},
  editActions: {
    flexDirection: 'row',
  },
});
