import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/i18n';

export interface ProvenanceBlockProps {
  sourceTitle: string;
  excerpt?: string;
  style?: ViewStyle;
}

export function ProvenanceBlock({ sourceTitle, excerpt, style }: ProvenanceBlockProps) {
  const { colors, spacing, radius } = useTheme();
  const t = useTranslation();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          gap: spacing.xs,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.titleRow, { gap: spacing.xs }]}>
          <Feather name="file-text" size={13} color={colors.primary} />
          <AppText
            variant="caption"
            color={colors.textSecondary}
            numberOfLines={1}
            style={styles.sourceTitleText}
          >
            {t.studyAi.basedOnSource(sourceTitle)}
          </AppText>
        </View>
        <Badge label="Source" variant="default" size="sm" />
      </View>
      {excerpt ? (
        <View
          style={[
            styles.excerptContainer,
            {
              borderLeftColor: colors.primary,
              paddingLeft: spacing.sm,
              marginTop: spacing.xxs,
            },
          ]}
        >
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            style={styles.excerptText}
          >
            {`“${excerpt}”`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  sourceTitleText: {
    flex: 1,
  },
  excerptContainer: {
    borderLeftWidth: 3,
  },
  excerptText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
