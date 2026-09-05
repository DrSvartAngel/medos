import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface RecoveryActionCardProps {
  icon: FeatherIconName;
  title: string;
  detail: string;
  actionLabel: string;
  accessibilityLabel: string;
  onAction: () => void;
  children?: React.ReactNode;
  elevated?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RecoveryActionCard({
  icon,
  title,
  detail,
  actionLabel,
  accessibilityLabel,
  onAction,
  children,
  elevated = false,
  disabled = false,
  style,
}: RecoveryActionCardProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <Card elevated={elevated} style={[styles.card, style]}>
      <View style={styles.headingRow}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.icon,
            {
              backgroundColor: elevated ? colors.primaryMuted : colors.surfaceElevated,
              borderRadius: radius.md,
            },
          ]}
        >
          <Feather name={icon} size={22} color={colors.primary} />
        </View>
        <View style={[styles.headingCopy, { marginLeft: spacing.sm }]}>
          <AppText variant="h3">{title}</AppText>
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            style={{ marginTop: spacing.xs }}
          >
            {detail}
          </AppText>
        </View>
      </View>

      {children}

      <Button
        label={actionLabel}
        accessibilityLabel={accessibilityLabel}
        onPress={onAction}
        disabled={disabled}
        variant={elevated ? 'primary' : 'secondary'}
        style={{ marginTop: spacing.lg }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  headingRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  icon: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
});
