import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { StudySource } from '@/models/studySource';
import { useTranslation } from '@/i18n';

export interface SourceContextBarProps {
  source: StudySource | null;
  onChangeSource?: () => void;
  style?: ViewStyle;
}

export function SourceContextBar({ source, onChangeSource, style }: SourceContextBarProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  if (!source) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.infoCol}>
          <View style={[styles.labelRow, { gap: spacing.xs }]}>
            <Feather name="book-open" size={13} color={colors.primary} />
            <AppText variant="caption" color={colors.textMuted}>
              {t.studyAi.selectedSource}
            </AppText>
            <Badge label={t.studySources[source.sourceType]} variant="default" size="sm" />
          </View>
          <AppText variant="subhead" numberOfLines={1} style={{ marginTop: 2 }}>
            {source.title}
          </AppText>
        </View>
        {onChangeSource ? (
          <Button
            label={t.studySources.changeSource}
            variant="ghost"
            size="sm"
            onPress={onChangeSource}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
