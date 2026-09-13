import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { subjectRepo, type SubjectWithCommittee } from '@/db/repositories/subjectRepo';
import { Modal } from '@/components/ui/Modal';
import { Search } from '@/components/ui/Search';
import { AppText } from '@/components/ui/Typography';
import { FeedbackState } from '@/components/ui/FeedbackState';

export interface SubjectSelectorProps {
  selectedSubjectId: string | null;
  selectedSubjectName?: string | null;
  selectedCommitteeName?: string | null;
  onSelectSubject: (subject: SubjectWithCommittee) => void;
  disabled?: boolean;
  error?: string | null;
}

/**
 * Reusable Subject Selector — Phase 14.6G
 *
 * Allows direct selection of a Subject with disambiguating Committee context.
 * Uses bounded queries without loading the entire curriculum.
 */
export function SubjectSelector({
  selectedSubjectId,
  selectedSubjectName,
  selectedCommitteeName,
  onSelectSubject,
  disabled = false,
  error,
}: SubjectSelectorProps) {
  const { colors, spacing, radius, borders } = useTheme();
  const t = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [subjects, setSubjects] = useState<SubjectWithCommittee[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    try {
      const results = subjectRepo.listWithCommittees({
        query: debouncedQuery,
        limit: 50,
      });
      setSubjects(results);
    } catch {
      setSubjects([]);
    }
  }, [isOpen, debouncedQuery]);

  function handleSelect(item: SubjectWithCommittee) {
    onSelectSubject(item);
    setIsOpen(false);
    setSearchQuery('');
    setDebouncedQuery('');
  }

  const hasSelection = Boolean(selectedSubjectId && selectedSubjectName);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          hasSelection
            ? `${selectedSubjectName}, ${selectedCommitteeName ?? ''}`
            : t.topics.selectSubject
        }
        style={[
          styles.trigger,
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
        <View style={styles.contentColumn}>
          {hasSelection ? (
            <>
              <AppText
                variant="body"
                style={{ color: colors.textPrimary, fontWeight: '600' }}
                numberOfLines={1}
              >
                {selectedSubjectName}
              </AppText>
              {selectedCommitteeName ? (
                <View style={styles.committeeRow}>
                  <Feather name="map" size={11} color={colors.textSecondary} />
                  <AppText
                    variant="caption"
                    style={{ color: colors.textSecondary, marginLeft: 4 }}
                    numberOfLines={1}
                  >
                    {t.topics.committee(selectedCommitteeName)}
                  </AppText>
                </View>
              ) : null}
            </>
          ) : (
            <AppText
              variant="body"
              style={{ color: colors.textMuted }}
            >
              {t.topics.selectSubjectPrompt}
            </AppText>
          )}
        </View>

        <Feather
          name="chevron-down"
          size={16}
          color={colors.textMuted}
          style={styles.chevron}
        />
      </TouchableOpacity>

      {error ? (
        <AppText
          variant="caption"
          style={{ color: colors.error, marginTop: 4 }}
        >
          {error}
        </AppText>
      ) : null}

      <Modal
        visible={isOpen}
        onClose={() => {
          setIsOpen(false);
          setSearchQuery('');
        }}
        title={t.topics.selectSubject}
        presentation="auto"
        scrollable={false}
      >
        <View style={{ gap: spacing.md, flex: 1, maxHeight: 460 }}>
          <Search
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.topics.searchSubjects}
            accessibilityLabel={t.topics.searchSubjects}
          />

          <FlatList
            data={subjects}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.md }}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={5}
            ListEmptyComponent={
              <FeedbackState
                kind="empty"
                message={t.topics.noSubjectsFound}
              />
            }
            renderItem={({ item }) => {
              const isSelected = item.id === selectedSubjectId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleSelect(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.committeeName}`}
                  style={({ pressed }) => [
                    styles.itemRow,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryMuted
                        : pressed
                        ? colors.surfaceHighlight
                        : 'transparent',
                      borderRadius: radius.sm,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    },
                  ]}
                >
                  <View style={styles.itemInfo}>
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
                    <View style={styles.committeeRow}>
                      <Feather
                        name="map"
                        size={11}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <AppText
                        variant="caption"
                        style={{
                          color: isSelected ? colors.primary : colors.textSecondary,
                          marginLeft: 4,
                        }}
                        numberOfLines={1}
                      >
                        {item.committeeName}
                      </AppText>
                    </View>
                  </View>

                  {isSelected ? (
                    <Feather
                      name="check"
                      size={18}
                      color={colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  committeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
});
