import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { CommitteeCard } from '@/components/committees/CommitteeCard';
import { CommitteeEmptyState } from '@/components/committees/CommitteeEmptyState';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { useCommitteeStore } from '@/store/useCommitteeStore';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/i18n';

export default function CommitteesScreen() {
  const { colors, spacing, radius } = useTheme();
  const { isTablet, columns } = useResponsive();
  const t = useTranslation();

  const isDBReady       = useAppStore((s) => s.isDBReady);
  const committees      = useCommitteeStore((s) => s.committees);
  const isLoading       = useCommitteeStore((s) => s.isLoading);
  const error           = useCommitteeStore((s) => s.error);
  const loadCommittees  = useCommitteeStore((s) => s.loadCommittees);

  // Load committees once the DB is ready
  useEffect(() => {
    if (isDBReady) {
      loadCommittees();
    }
  }, [isDBReady, loadCommittees]);

  // Responsive grid: 1 col on phone, 2 on tablet, 3 on large tablet
  const numCols      = columns(1);
  const colWidthPct  = `${Math.floor(100 / numCols)}%` as const;

  function handleAdd() {
    router.push('/committees/new' as Href);
  }

  function handleOpen(id: string) {
    router.push(`/committees/${id}` as Href);
  }

  return (
    <ScreenWrapper>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerText}>
            <AppText variant={isTablet ? 'h1' : 'h2'}>{t.committees.title}</AppText>
            <AppText
              variant="body"
              color={colors.textSecondary}
              style={{ marginTop: 2 }}
            >
              {committees.length > 0
                ? t.committees.decks(committees.length)
                : t.committees.subtitle}
            </AppText>
          </View>

          {/* FAB-style add button — shown when list is non-empty */}
          {committees.length > 0 && (
            <TouchableOpacity
              accessibilityRole="button"
            accessibilityLabel={t.committees.newCommittee}
              onPress={handleAdd}
              activeOpacity={0.75}
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  padding: spacing.sm + 2,
                },
              ]}
            >
              <Feather name="plus" size={22} color={colors.textInverse} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Loading ─────────────────────────────────────────── */}
      {isLoading && (
        <View style={[styles.centered, { paddingVertical: spacing.xxxl }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {!isLoading && error !== null && (
        <View style={[styles.centered, { paddingVertical: spacing.xl }]}>
          <Feather name="alert-circle" size={32} color={colors.error} />
          <AppText
            variant="body"
            color={colors.error}
            style={{ marginTop: spacing.sm, textAlign: 'center' }}
          >
            {t.common.noData}
          </AppText>
          <Button
            label={t.common.retry}
            accessibilityLabel={t.common.retry}
            onPress={loadCommittees}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      {/* ── Empty state ─────────────────────────────────────── */}
      {!isLoading && error === null && committees.length === 0 && (
        <CommitteeEmptyState onAdd={handleAdd} />
      )}

      {/* ── Committee grid ──────────────────────────────────── */}
      {!isLoading && error === null && committees.length > 0 && (
        <View style={[styles.grid, { marginTop: spacing.md }]}>
          {committees.map((committee) => (
            <View
              key={committee.id}
              style={[styles.cellWrap, { width: colWidthPct, padding: spacing.xs }]}
            >
              <CommitteeCard
                committee={committee}
                onPress={() => handleOpen(committee.id)}
                style={styles.card}
              />
            </View>
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  addButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  centered: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Negative margin offsets inner cell padding so edge cards flush with container
    margin: -4,
  },
  cellWrap: {
    // width set dynamically
  },
  card: {
    flex: 1,
  },
});
