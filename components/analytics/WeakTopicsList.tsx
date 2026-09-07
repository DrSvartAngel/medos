import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { WeakTopicItem, WeakTopicReason } from '@/models/analytics';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';

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

  const displayedTopics = topics.slice(0, 5);

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
    <Section title={t.analytics.needsAttentionTitle}>
      <View style={{ gap: spacing.sm }}>
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
              <Card elevated style={[styles.itemCard, { gap: spacing.xs }]}>
                <View style={styles.headerRow}>
                  <AppText
                    variant="body"
                    style={[{ fontWeight: '600', flex: 1, marginRight: spacing.sm }]}
                  >
                    {item.topicName}
                  </AppText>
                  <Feather name="chevron-right" size={16} color={colors.textMuted} />
                </View>

                <View style={[styles.reasonsContainer, { gap: 2 }]}>
                  {reasonDetails.map((rd, index) => (
                    <View key={index} style={styles.reasonRow}>
                      <AppText variant="caption" color={colors.textSecondary}>
                        {rd.label} ·{' '}
                      </AppText>
                      <AppText
                        variant="caption"
                        color={colors.textPrimary}
                        style={{ fontWeight: '500' }}
                      >
                        {rd.value}
                      </AppText>
                    </View>
                  ))}
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  pressable: {
    overflow: 'hidden',
  },
  itemCard: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonsContainer: {
    flexDirection: 'column',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
