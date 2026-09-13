import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useCommitteeStore, type Committee } from '@/store/useCommitteeStore';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import type { Subject, Topic } from '@/models/curriculum';
import { AcademicContextSheet } from './AcademicContextSheet';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';

export interface AcademicContextValue {
  committeeId: string | null;
  subjectId?: string | null;
  topicId?: string | null;
}

export interface AcademicContextResult {
  committeeId: string | null;
  subjectId: string | null;
  topicId: string | null;
  committeeName: string | null;
  subjectName: string | null;
  topicName: string | null;
}

export interface AcademicContextSelectorProps {
  maxDepth?: 'committee' | 'subject' | 'topic';
  requiredDepth?: 'none' | 'committee' | 'subject' | 'topic';
  value: AcademicContextValue;
  onChange: (result: AcademicContextResult) => void;
  disabled?: boolean;
  error?: string | null;
  label?: string;
  compact?: boolean;
}

type ModalType = 'none' | 'committee' | 'subject' | 'topic';

export function AcademicContextSelector({
  maxDepth = 'topic',
  requiredDepth = 'none',
  value,
  onChange,
  disabled = false,
  error,
  label,
  compact = false,
}: AcademicContextSelectorProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const t = useTranslation();

  const committees = useCommitteeStore((state) => state.committees);
  const loadCommittees = useCommitteeStore((state) => state.loadCommittees);

  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshRevision, setRefreshRevision] = useState(0);

  // Auto-refresh when returning from creating subjects or topics
  useFocusEffect(
    useCallback(() => {
      setRefreshRevision((r) => r + 1);
    }, [])
  );

  useEffect(() => {
    if (committees.length === 0) {
      loadCommittees();
    }
  }, [committees.length, loadCommittees]);

  // Resolve current entities for labels
  const currentCommittee = useMemo(() => {
    if (!value.committeeId) return null;
    return committees.find((c) => c.id === value.committeeId) ?? null;
  }, [committees, value.committeeId]);

  const currentSubject = useMemo(() => {
    if (!value.subjectId) return null;
    try {
      return subjectRepo.getById(value.subjectId);
    } catch {
      return null;
    }
  }, [value.subjectId]);

  const currentTopic = useMemo(() => {
    if (!value.topicId) return null;
    try {
      return topicRepo.getById(value.topicId);
    } catch {
      return null;
    }
  }, [value.topicId]);

  // Load available subjects when committee is selected
  const availableSubjects = useMemo(() => {
    if (!value.committeeId) return [];
    try {
      return subjectRepo.listByCommittee(value.committeeId, { limit: 100 });
    } catch {
      return [];
    }
  }, [value.committeeId, refreshRevision, activeModal]);

  // Load available topics when subject is selected
  const availableTopics = useMemo(() => {
    if (!value.subjectId) return [];
    try {
      return topicRepo.listBySubject(value.subjectId, { limit: 100 });
    } catch {
      return [];
    }
  }, [value.subjectId, refreshRevision, activeModal]);

  // Filtered lists for active picker
  const filteredCommittees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return committees;
    return committees.filter((c) => c.name.toLowerCase().includes(q));
  }, [committees, searchQuery]);

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableSubjects;
    return availableSubjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [availableSubjects, searchQuery]);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableTopics;
    return availableTopics.filter((tItem) => tItem.name.toLowerCase().includes(q));
  }, [availableTopics, searchQuery]);

  const breadcrumbText = useMemo(() => {
    if (currentTopic && currentSubject && currentCommittee) {
      return `${currentCommittee.name} · ${currentSubject.name} · ${currentTopic.name}`;
    }
    if (currentTopic && currentSubject) {
      return `${currentSubject.name} · ${currentTopic.name}`;
    }
    if (currentSubject && currentCommittee) {
      return `${currentCommittee.name} · ${currentSubject.name}`;
    }
    if (currentCommittee) {
      return `${currentCommittee.name} · ${t.dashboard?.selectContext ?? 'Ders / Konu seç'}`;
    }
    return t.dashboard?.selectContext ?? 'Ders / Konu seç';
  }, [currentCommittee, currentSubject, currentTopic, t]);

  function handleOpenCompact() {
    if (disabled) return;
    setSearchQuery('');
    if (!value.committeeId) {
      setActiveModal('committee');
    } else if (!value.subjectId) {
      setActiveModal('subject');
    } else {
      setActiveModal('topic');
    }
  }

  function handleSelectCommittee(selected: Committee | null) {
    setActiveModal(compact && selected !== null && maxDepth !== 'committee' ? 'subject' : 'none');
    setSearchQuery('');
    if (selected === null) {
      onChange({
        committeeId: null,
        subjectId: null,
        topicId: null,
        committeeName: null,
        subjectName: null,
        topicName: null,
      });
      return;
    }

    if (selected.id !== value.committeeId) {
      // Invariant: Changing parent clears incompatible descendants
      onChange({
        committeeId: selected.id,
        subjectId: null,
        topicId: null,
        committeeName: selected.name,
        subjectName: null,
        topicName: null,
      });
    }
  }

  function handleSelectSubject(selected: Subject | null) {
    setActiveModal(compact && selected !== null && maxDepth === 'topic' ? 'topic' : 'none');
    setSearchQuery('');
    if (selected === null) {
      onChange({
        committeeId: value.committeeId,
        subjectId: null,
        topicId: null,
        committeeName: currentCommittee?.name ?? null,
        subjectName: null,
        topicName: null,
      });
      return;
    }

    if (selected.id !== value.subjectId) {
      // Invariant: Changing Subject clears incompatible Topic
      onChange({
        committeeId: selected.committeeId,
        subjectId: selected.id,
        topicId: null,
        committeeName: currentCommittee?.name ?? null,
        subjectName: selected.name,
        topicName: null,
      });
    }
  }

  function handleSelectTopic(selected: Topic | null) {
    setActiveModal('none');
    setSearchQuery('');
    if (selected === null) {
      onChange({
        committeeId: value.committeeId,
        subjectId: value.subjectId ?? null,
        topicId: null,
        committeeName: currentCommittee?.name ?? null,
        subjectName: currentSubject?.name ?? null,
        topicName: null,
      });
      return;
    }

    // Invariant: Topic selection results in consistent Committee + Subject + Topic chain
    onChange({
      committeeId: value.committeeId,
      subjectId: selected.subjectId,
      topicId: selected.id,
      committeeName: currentCommittee?.name ?? null,
      subjectName: currentSubject?.name ?? null,
      topicName: selected.name,
    });
  }

  const showSubjectLevel = maxDepth === 'subject' || maxDepth === 'topic';
  const showTopicLevel = maxDepth === 'topic';

  return (
    <View style={styles.container}>
      {label ? (
        <AppText variant="label" style={[styles.mainLabel, { color: colors.textSecondary }]}>
          {label}
        </AppText>
      ) : null}

      {compact ? (
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={handleOpenCompact}
          accessibilityRole="button"
          accessibilityLabel={breadcrumbText}
          style={[
            styles.compactTrigger,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: error ? colors.error : colors.borderSubtle,
              borderRadius: radius.sm,
              borderWidth: borders.hairline,
              paddingHorizontal: spacing.sm + 2,
              paddingVertical: spacing.xs + 2,
            },
          ]}
        >
          <View style={[styles.compactRow, { gap: spacing.xs }]}>
            <Feather name="book-open" size={12} color={colors.accent} />
            <AppText
              variant="labelS"
              numberOfLines={1}
              style={{ color: colors.textSecondary, flex: 1 }}
            >
              {breadcrumbText}
            </AppText>
            <Feather name="chevron-down" size={12} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.selectorsColumn, { gap: spacing.sm }]}>
          {/* Committee Selector Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={disabled}
          onPress={() => {
            setSearchQuery('');
            setActiveModal('committee');
          }}
          accessibilityRole="button"
          accessibilityLabel={currentCommittee ? currentCommittee.name : t.focus.committeeOptional}
          style={[
            styles.selectorRow,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: error ? colors.error : colors.cardBorder,
              borderRadius: radius.md,
              borderWidth: borders.standard,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm + 2,
              opacity: disabled ? 0.6 : 1,
            },
          ]}
        >
          <View style={styles.rowLeft}>
            {currentCommittee?.color ? (
              <View style={[styles.colorDot, { backgroundColor: currentCommittee.color }]} />
            ) : (
              <Feather name="layers" size={16} color={colors.textMuted} style={styles.rowIcon} />
            )}
            <View style={styles.textStack}>
              <AppText variant="caption" style={{ color: colors.textMuted }}>
                {t.committees.title}
              </AppText>
              <AppText
                variant="body"
                style={{
                  color: currentCommittee ? colors.textPrimary : colors.textMuted,
                  fontWeight: currentCommittee ? '600' : '400',
                }}
                numberOfLines={1}
              >
                {currentCommittee?.name ?? (requiredDepth !== 'none' ? 'Komite seçimi zorunludur' : t.focus.noCommittee)}
              </AppText>
            </View>
          </View>
          <Feather name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Subject Selector Row */}
        {showSubjectLevel && (
          <View style={styles.subjectBlock}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={disabled || !value.committeeId}
              onPress={() => {
                setRefreshRevision((r) => r + 1);
                setSearchQuery('');
                setActiveModal('subject');
              }}
              accessibilityRole="button"
              accessibilityLabel={currentSubject ? currentSubject.name : (t.topics?.selectSubject ?? 'Ders Seç')}
              style={[
                styles.selectorRow,
                {
                  backgroundColor: value.committeeId ? colors.surfaceElevated : colors.surface,
                  borderColor: error ? colors.error : colors.cardBorder,
                  borderRadius: radius.md,
                  borderWidth: borders.standard,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm + 2,
                  opacity: disabled || !value.committeeId ? 0.5 : 1,
                },
              ]}
            >
              <View style={styles.rowLeft}>
                <Feather name="book-open" size={16} color={value.committeeId ? colors.textSecondary : colors.textMuted} style={styles.rowIcon} />
                <View style={styles.textStack}>
                  <AppText variant="caption" style={{ color: colors.textMuted }}>
                    {t.subjects?.title ?? 'Ders'}
                  </AppText>
                  <AppText
                    variant="body"
                    style={{
                      color: currentSubject ? colors.textPrimary : colors.textMuted,
                      fontWeight: currentSubject ? '600' : '400',
                    }}
                    numberOfLines={1}
                  >
                    {currentSubject?.name ?? (!value.committeeId ? 'Önce bir komite seçin' : (availableSubjects.length === 0 ? 'Bu komitede henüz ders yok' : (t.topics?.selectSubjectPrompt ?? 'Ders seçin')))}
                  </AppText>
                </View>
              </View>
              <Feather name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Clearly visible Add Subject action when committee is selected and has zero subjects */}
            {value.committeeId && availableSubjects.length === 0 ? (
              <View
                style={[
                  styles.addSubjectAffordance,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.borderSubtle,
                    borderRadius: radius.md,
                    borderWidth: borders.hairline,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    marginTop: spacing.xs,
                  },
                ]}
              >
                <View style={styles.addSubjectRow}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <AppText variant="caption" style={{ color: colors.textSecondary }}>
                      {'Bu komitede henüz ders bulunmuyor.'}
                    </AppText>
                  </View>
                  <Button
                    label="Ders Ekle"
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      router.push(`/subjects/new?committeeId=${encodeURIComponent(value.committeeId!)}` as Href);
                    }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Topic Selector Row */}
        {showTopicLevel && (
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={disabled || !value.subjectId}
            onPress={() => {
              setSearchQuery('');
              setActiveModal('topic');
            }}
            accessibilityRole="button"
            accessibilityLabel={currentTopic ? currentTopic.name : 'Konu Seç'}
            style={[
              styles.selectorRow,
              {
                backgroundColor: value.subjectId ? colors.surfaceElevated : colors.surface,
                borderColor: error ? colors.error : colors.cardBorder,
                borderRadius: radius.md,
                borderWidth: borders.standard,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
                opacity: disabled || !value.subjectId ? 0.5 : 1,
              },
            ]}
          >
            <View style={styles.rowLeft}>
              <Feather name="file-text" size={16} color={value.subjectId ? colors.textSecondary : colors.textMuted} style={styles.rowIcon} />
              <View style={styles.textStack}>
                <AppText variant="caption" style={{ color: colors.textMuted }}>
                  {'Konu'}
                </AppText>
                <AppText
                  variant="body"
                  style={{
                    color: currentTopic ? colors.textPrimary : colors.textMuted,
                    fontWeight: currentTopic ? '600' : '400',
                  }}
                  numberOfLines={1}
                >
                  {currentTopic?.name ?? (!value.subjectId ? 'Önce bir ders seçin' : 'Konu seçin')}
                </AppText>
              </View>
            </View>
            <Feather name="chevron-down" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      )}

      {error ? (
        <AppText variant="caption" style={{ color: colors.error, marginTop: 4 }}>
          {error}
        </AppText>
      ) : null}

      {/* Committee Sheet */}
      <AcademicContextSheet
        visible={activeModal === 'committee'}
        onClose={() => {
          setActiveModal('none');
          setSearchQuery('');
        }}
        title={t.committees.title}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Ara..."
        searchAccessibilityLabel="Ara"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalViewport}
        >
          <FlatList
            data={filteredCommittees}
            keyExtractor={(item) => item.id}
            style={styles.listContainer}
            contentContainerStyle={[styles.listContent, { gap: spacing.xs, paddingBottom: spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              requiredDepth === 'none' ? (
                <Pressable
                  onPress={() => handleSelectCommittee(null)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: value.committeeId === null ? colors.primaryMuted : pressed ? colors.surfaceHighlight : 'transparent',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                    },
                  ]}
                >
                  <AppText variant="body" style={{ color: value.committeeId === null ? colors.primary : colors.textSecondary }}>
                    {t.focus.noCommittee}
                  </AppText>
                  {value.committeeId === null ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => {
              const isSelected = item.id === value.committeeId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectCommittee(item)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: isSelected ? colors.primaryMuted : pressed ? colors.surfaceHighlight : 'transparent',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                    },
                  ]}
                >
                  <View style={styles.optionLeft}>
                    {item.color ? (
                      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                    ) : null}
                    <AppText
                      variant="body"
                      style={{
                        color: isSelected ? colors.primary : colors.textPrimary,
                        fontWeight: isSelected ? '700' : '500',
                      }}
                      numberOfLines={1}
                    >
                      {item.name}
                    </AppText>
                  </View>
                  {isSelected ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </KeyboardAvoidingView>
      </AcademicContextSheet>

      {/* Subject Sheet */}
      <AcademicContextSheet
        visible={activeModal === 'subject'}
        onClose={() => {
          setActiveModal('none');
          setSearchQuery('');
        }}
        title={t.subjects?.title ?? 'Ders Seç'}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Derslerde ara..."
        searchAccessibilityLabel="Derslerde ara"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalViewport}
        >
          {currentCommittee && (
            <View
              style={[
                styles.sheetBreadcrumbRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderBottomWidth: borders.hairline,
                  borderBottomColor: colors.borderSubtle,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  marginBottom: spacing.xs,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                {`${t.committees.title}: ${currentCommittee.name}`}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setActiveModal('committee');
                }}
                style={{ paddingHorizontal: 4, paddingVertical: 2 }}
              >
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  {'Değiştir'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={filteredSubjects}
            keyExtractor={(item) => item.id}
            style={styles.listContainer}
            contentContainerStyle={[styles.listContent, { gap: spacing.xs, paddingBottom: spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              requiredDepth === 'none' || requiredDepth === 'committee' ? (
                <Pressable
                  onPress={() => handleSelectSubject(null)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: value.subjectId === null ? colors.primaryMuted : pressed ? colors.surfaceHighlight : 'transparent',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                    },
                  ]}
                >
                  <AppText variant="body" style={{ color: value.subjectId === null ? colors.primary : colors.textSecondary }}>
                    {'Ders Yok'}
                  </AppText>
                  {value.subjectId === null ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={[styles.emptyBox, { padding: spacing.xl }]}>
                <Feather name="inbox" size={36} color={colors.textMuted} />
                <AppText variant="body" style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
                  {'Bu komiteye ait ders bulunamadı.'}
                </AppText>
                {value.committeeId ? (
                  <Button
                    label="Ders Ekle"
                    variant="primary"
                    size="md"
                    onPress={() => {
                      setActiveModal('none');
                      router.push(`/subjects/new?committeeId=${encodeURIComponent(value.committeeId!)}` as Href);
                    }}
                    style={{ marginTop: spacing.md }}
                  />
                ) : null}
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === value.subjectId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectSubject(item)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: isSelected ? colors.primaryMuted : pressed ? colors.surfaceHighlight : 'transparent',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </AppText>
                  {isSelected ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </KeyboardAvoidingView>
      </AcademicContextSheet>

      {/* Topic Sheet */}
      <AcademicContextSheet
        visible={activeModal === 'topic'}
        onClose={() => {
          setActiveModal('none');
          setSearchQuery('');
        }}
        title="Konu Seç"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Konularda ara..."
        searchAccessibilityLabel="Konularda ara"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalViewport}
        >
          {currentSubject && (
            <View
              style={[
                styles.sheetBreadcrumbRow,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderBottomWidth: borders.hairline,
                  borderBottomColor: colors.borderSubtle,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                  marginBottom: spacing.xs,
                },
              ]}
            >
              <AppText variant="caption" style={{ color: colors.textSecondary, flex: 1 }} numberOfLines={1}>
                {`${currentCommittee?.name ? `${currentCommittee.name} · ` : ''}${currentSubject.name}`}
              </AppText>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setActiveModal('subject');
                }}
                style={{ paddingHorizontal: 4, paddingVertical: 2 }}
              >
                <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                  {'Değiştir'}
                </AppText>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={filteredTopics}
            keyExtractor={(item) => item.id}
            style={styles.listContainer}
            contentContainerStyle={[styles.listContent, { gap: spacing.xs, paddingBottom: spacing.xl }]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <Pressable
                onPress={() => handleSelectTopic(null)}
                style={({ pressed }) => [
                  styles.optionRow,
                  {
                    backgroundColor: value.topicId === null ? colors.primaryMuted : pressed ? colors.surfaceHighlight : 'transparent',
                    borderRadius: radius.sm,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm + 2,
                  },
                ]}
              >
                <AppText variant="body" style={{ color: value.topicId === null ? colors.primary : colors.textSecondary }}>
                  {'Konu Yok'}
                </AppText>
                {value.topicId === null ? <Feather name="check" size={16} color={colors.primary} /> : null}
              </Pressable>
            }
            ListEmptyComponent={
              <View style={[styles.emptyBox, { padding: spacing.xl }]}>
                <Feather name="inbox" size={36} color={colors.textMuted} />
                <AppText variant="body" style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
                  {'Bu derse ait konu bulunamadı.'}
                </AppText>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === value.topicId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelectTopic(item)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    {
                      backgroundColor: isSelected ? colors.primaryMuted : pressed ? colors.surfaceHighlight : 'transparent',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </AppText>
                  {isSelected ? <Feather name="check" size={16} color={colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </KeyboardAvoidingView>
      </AcademicContextSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  mainLabel: {
    marginBottom: 6,
  },
  selectorsColumn: {
    width: '100%',
  },
  subjectBlock: {
    width: '100%',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  rowIcon: {
    marginRight: 10,
  },
  textStack: {
    flex: 1,
    justifyContent: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  addSubjectAffordance: {
    width: '100%',
  },
  addSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalViewport: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    maxHeight: 560,
    width: '100%',
  },
  searchWrapper: {
    width: '100%',
  },
  listContainer: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTrigger: {
    width: '100%',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  sheetBreadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});
