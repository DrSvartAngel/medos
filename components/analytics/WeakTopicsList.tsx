import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { WeakTopicItem, WeakTopicReason } from '@/models/analytics';
import { Box, VStack, HStack, Heading, GSText } from '@/components/ui/gluestack';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';

export interface WeakTopicsListProps {
  topics: WeakTopicItem[];
  onPressTopic?: (topicId: string) => void;
}

export function WeakTopicsList({ topics, onPressTopic }: WeakTopicsListProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  if (!topics || topics.length === 0) {
    return null;
  }

  const displayedTopics = topics.slice(0, 3);

  const getReasonInfo = (item: WeakTopicItem, reason: WeakTopicReason) => {
    switch (reason) {
      case 'low_qbank_accuracy':
        return {
          label: t.analytics.reasons.low_qbank_accuracy,
          value: t.analytics.qbankReasonValue(
            item.qbankAccuracyPercent ?? 0,
            item.questionCount
          ),
        };
      case 'low_memory_retention':
        return {
          label: t.analytics.reasons.low_memory_retention,
          value: t.analytics.memoryReasonValue(
            item.memoryRetentionPercent ?? 0,
            item.reviewCount
          ),
        };
      case 'due_reviews':
        return {
          label: t.analytics.reasons.due_reviews,
          value: t.analytics.dueReasonValue(item.dueCardCount),
        };
    }
  };

  const handlePress = (topicId: string) => {
    if (onPressTopic) {
      onPressTopic(topicId);
    } else {
      router.push(`/topics/${encodeURIComponent(topicId)}` as Href);
    }
  };

  return (
    <VStack space="sm" style={styles.container}>
      <HStack style={styles.headerRow}>
        <Heading size="sm" style={{ color: colors.textPrimary }}>
          {t.analytics.needsAttentionTitle}
        </Heading>
        <GSText size="xs" style={{ color: colors.textMuted }}>
          {displayedTopics.length} {t.dashboard.committee.toLowerCase()}
        </GSText>
      </HStack>

      <VStack space="xs" style={styles.listContainer}>
        {displayedTopics.map((item) => {
          const reasonDetails = item.reasons.map((r) => getReasonInfo(item, r));
          const reasonsA11y = reasonDetails
            .map((rd) => `${rd.label}: ${rd.value}`)
            .join(', ');
          const a11yLabel = `${item.topicName}. ${reasonsA11y}. ${t.analytics.openTopic(item.topicName)}`;

          return (
            <Pressable
              key={item.topicId}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              onPress={() => handlePress(item.topicId)}
              style={({ pressed }) => [
                styles.pressable,
                {
                  opacity: pressed ? 0.8 : 1,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Card
                style={[
                  styles.itemCard,
                  {
                    padding: spacing.md,
                  },
                ]}
              >
                <HStack style={styles.itemContent}>
                  <Box
                    style={[
                      styles.bulletWrap,
                      {
                        backgroundColor: colors.warningMuted,
                        borderRadius: radius.xs,
                      },
                    ]}
                  >
                    <Feather name="alert-triangle" size={14} color={colors.warning} />
                  </Box>

                  <VStack space="xs" style={styles.topicInfo}>
                    <GSText
                      size="sm"
                      numberOfLines={1}
                      style={[styles.topicTitle, { color: colors.textPrimary }]}
                    >
                      {item.topicName}
                    </GSText>

                    <HStack style={styles.reasonsRow}>
                      {reasonDetails.map((rd, index) => (
                        <GSText
                          key={index}
                          size="xs"
                          style={{ color: colors.textSecondary }}
                        >
                          {rd.label} ({rd.value})
                          {index < reasonDetails.length - 1 ? ' · ' : ''}
                        </GSText>
                      ))}
                    </HStack>
                  </VStack>

                  <Feather name="chevron-right" size={16} color={colors.textMuted} />
                </HStack>
              </Card>
            </Pressable>
          );
        })}
      </VStack>
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
  listContainer: {
    width: '100%',
  },
  pressable: {
    width: '100%',
  },
  itemCard: {
    borderWidth: 1,
    width: '100%',
  },
  itemContent: {
    alignItems: 'center',
    width: '100%',
  },
  bulletWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontWeight: '600',
  },
  reasonsRow: {
    flexWrap: 'wrap',
  },
});
