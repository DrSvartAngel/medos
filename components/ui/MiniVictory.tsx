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
    <Card style={{ width: '100%', gap: spacing.sm, marginBottom: spacing.md }}>
      <View accessible accessibilityRole="text" accessibilityLabel={`${title}. ${body}`}>
        <AppText variant="h3" color={lowStimulation ? colors.textPrimary : colors.success}>{title}</AppText>
        <AppText color={colors.textSecondary}>{body}</AppText>
      </View>
      <Button label={t.reward.dismiss} accessibilityLabel={t.reward.dismiss}
        variant="ghost" onPress={() => setDismissed(true)} style={{ minHeight: 44 }} />
    </Card>
  );
}
