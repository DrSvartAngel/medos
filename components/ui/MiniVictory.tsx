import React, { useState } from 'react';
import { View } from 'react-native';
import { Card } from './Card';
import { AppText } from './Typography';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';

/** Inline acknowledgement only; callers own the persisted-completion trigger. */
export function MiniVictory({ kind, lowStimulation = false }: {
  kind: 'focus' | 'review';
  lowStimulation?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const { colors, spacing } = useTheme();
  const t = useTranslation();
  if (dismissed) return null;
  const title = kind === 'focus' ? t.reward.focusTitle : t.reward.reviewTitle;
  const body = kind === 'focus' ? t.reward.focusBody : t.reward.reviewBody;
  return (
    <Card style={{ width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
      <View accessible accessibilityRole="text" accessibilityLabel={`${title}. ${body}`}>
        <AppText variant="h3" color={lowStimulation ? colors.textPrimary : colors.success}>{title}</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>{body}</AppText>
      </View>
      <Button label={t.reward.dismiss} accessibilityLabel={t.reward.dismiss}
        variant="ghost" size="sm" textStyle={{ flexShrink: 1, textAlign: 'center' }}
        onPress={() => setDismissed(true)} style={{ minHeight: 44, alignSelf: 'flex-start', maxWidth: '100%' }} />
    </Card>
  );
}
