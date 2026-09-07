import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { NeglectedTopicItem } from '@/models/analytics';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/hooks/useTheme';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';

export interface NeglectedTopicsListProps {
  topics: NeglectedTopicItem[];
  onPressTopic?: (topicId: string) => void;
}

export function NeglectedTopicsList({
  topics,
  onPressTopic,
}: NeglectedTopicsListProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  if (!topics || topics.length === 0) {
    return null;
  }

  const displayedTopics = topics.slice(0, 5);

  const getStatusText = (item: NeglectedTopicItem): string => {
    if (item.neglectStatus === 'never_studied') {
      return t.analytics.neverStudied;
    }

    if (item.daysSinceActive !== null) {
      if (item.daysSinceActive === 0) {
        return t.analytics.studiedToday;
      }
      if (item.daysSinceActive === 1) {
        return t.analytics.studiedYesterday;
      }
      return t.analytics.daysAgo(item.daysSinceActive);
    }

    return t.analytics.staleLabel;
  };

  const handlePress = (topicId: string) => {
    if (onPressTopic) {
      onPressTopic(topicId);
    } else {
      router.push(`/topics/${encodeURIComponent(topicId)}` as Href);
    }
  };

  return (
    <Section title={t.analytics.needsRevisitTitle}>
      <View style={{ gap: spacing.sm }}>
        {displayedTopics.map((item) => {
          const statusText = getStatusText(item);
          const a11yLabel = `${item.topicName}. ${statusText}. ${t.analytics.openTopic(item.topicName)}`;

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

                <AppText variant="caption" color={colors.textSecondary}>
                  {statusText}
                </AppText>
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
});
