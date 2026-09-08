import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { router, type Href, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getDB } from '@/db/client';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { TabTopHeader } from '@/components/layout/TabTopHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GSText, Heading, VStack, HStack, Box } from '@/components/ui/gluestack';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';

interface TopicItem {
  id: string;
  name: string;
  subjectName: string;
  committeeName: string;
  sourceCount: number;
}

export default function AIScreen() {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();
  const isDBReady = useAppStore((state) => state.isDBReady);

  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTopics = useCallback(() => {
    if (!isDBReady) {
      setLoading(false);
      return;
    }
    try {
      const db = getDB();
      const rows = db.getAllSync<{
        id: string;
        name: string;
        subject_name: string;
        committee_name: string;
        source_count: number;
      }>(
        `SELECT t.id, t.name, s.name AS subject_name, c.name AS committee_name,
                (SELECT COUNT(*) FROM study_sources ss WHERE ss.topic_id = t.id) AS source_count
         FROM topics t
         JOIN subjects s ON s.id = t.subject_id
         JOIN committees c ON c.id = s.committee_id
         ORDER BY source_count DESC, t.updated_at DESC
         LIMIT 25`
      );
      setTopics(
        rows.map((r) => ({
          id: r.id,
          name: r.name,
          subjectName: r.subject_name,
          committeeName: r.committee_name,
          sourceCount: r.source_count,
        }))
      );
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [isDBReady]);

  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  return (
    <ScreenWrapper>
      <TabTopHeader />
      <VStack space="lg" style={styles.container}>
        {/* Header */}
        <HStack style={styles.headerRow}>
          <VStack space="xs" style={{ flex: 1 }}>
            <Heading size="lg" style={{ color: colors.textPrimary }}>
              {t.tabs.ai}
            </Heading>
            <GSText size="xs" style={{ color: colors.textSecondary }}>
              {t.dashboard.aiAssistantDesc}
            </GSText>
          </VStack>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.aiSettings.title}
            onPress={() => router.push('/settings/ai' as Href)}
            style={({ pressed }) => [
              styles.settingsBtn,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.cardBorder,
                borderRadius: radius.md,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Feather name="settings" size={18} color={colors.textSecondary} />
          </Pressable>
        </HStack>

        {/* Info banner */}
        <Card>
          <HStack space="sm" style={styles.bannerRow}>
            <Box
              style={[
                styles.iconWrap,
                { backgroundColor: colors.primaryMuted, borderRadius: radius.sm },
              ]}
            >
              <Feather name="shield" size={16} color={colors.primary} />
            </Box>
            <VStack space="xs" style={{ flex: 1 }}>
              <GSText size="xs" style={{ color: colors.primary, fontWeight: '700' }}>
                {t.studySources.title}
              </GSText>
              <GSText size="xs" style={{ color: colors.textSecondary }}>
                {t.dashboard.aiAssistantDesc}
              </GSText>
            </VStack>
          </HStack>
        </Card>

        {/* Topics Section */}
        <VStack space="sm">
          <GSText size="xs" style={{ color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>
            {t.topics.title.toUpperCase()}
          </GSText>

          {loading ? (
            <GSText size="sm" style={{ color: colors.textSecondary }}>
              {t.common.loading}
            </GSText>
          ) : topics.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Feather name="book-open" size={28} color={colors.primary} />
              <GSText size="sm" style={{ color: colors.textPrimary, fontWeight: '600', marginTop: spacing.sm }}>
                {t.topics.empty}
              </GSText>
              <GSText size="xs" style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4 }}>
                {t.dashboard.firstCommitteeDetail}
              </GSText>
              <Button
                label={t.dashboard.createCommittee}
                variant="secondary"
                size="sm"
                onPress={() => router.push('/committees/new' as Href)}
                style={{ marginTop: spacing.md }}
              />
            </Card>
          ) : (
            <VStack space="xs">
              {topics.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${item.committeeName}`}
                  onPress={() => router.push(`/topics/${item.id}/assistant` as Href)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                >
                  <Card style={styles.topicCard}>
                    <HStack style={styles.topicRow}>
                      <Box
                        style={[
                          styles.topicIcon,
                          {
                            backgroundColor:
                              item.sourceCount > 0 ? colors.primaryMuted : colors.surfaceElevated,
                            borderRadius: radius.sm,
                          },
                        ]}
                      >
                        <Feather
                          name={item.sourceCount > 0 ? 'file-text' : 'book'}
                          size={16}
                          color={item.sourceCount > 0 ? colors.primary : colors.textMuted}
                        />
                      </Box>
                      <VStack space="xs" style={{ flex: 1 }}>
                        <GSText size="sm" style={{ color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
                          {item.name}
                        </GSText>
                        <GSText size="xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
                          {item.committeeName} · {item.subjectName}
                        </GSText>
                      </VStack>
                      {item.sourceCount > 0 ? (
                        <Badge label={`${item.sourceCount} ${t.studySources.title}`} variant="info" />
                      ) : null}
                      <Feather name="chevron-right" size={16} color={colors.textMuted} />
                    </HStack>
                  </Card>
                </Pressable>
              ))}
            </VStack>
          )}
        </VStack>
      </VStack>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 32,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  settingsBtn: {
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    width: 44,
  },
  bannerRow: {
    alignItems: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  topicCard: {
    padding: 12,
  },
  topicRow: {
    alignItems: 'center',
    gap: 12,
  },
  topicIcon: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
