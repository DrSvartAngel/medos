import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';

interface CommitteeEmptyStateProps {
  onAdd: () => void;
}

export function CommitteeEmptyState({ onAdd }: CommitteeEmptyStateProps) {
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();

  const iconSize   = isTablet ? 96 : 72;
  const featherSize = isTablet ? 40 : 30;

  return (
    <View style={[styles.container, { paddingVertical: isTablet ? 64 : 48 }]}>
      {/* Icon container */}
      <View
        style={[
          styles.iconWrap,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize / 2,
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name="book-open" size={featherSize} color={colors.primary} />
      </View>

      <AppText
        variant={isTablet ? 'h2' : 'h3'}
        style={[styles.title, { marginTop: spacing.lg }]}
      >
        {t.committees.empty}
      </AppText>

      <AppText
        variant="body"
        color={colors.textSecondary}
        style={[styles.subtitle, { marginTop: spacing.sm }]}
      >
        {t.committees.emptyDesc}
      </AppText>

      <Button
        label={t.committees.createFirst}
        size={isTablet ? 'lg' : 'md'}
        onPress={onAdd}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconWrap: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
});
