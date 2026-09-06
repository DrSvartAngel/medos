import { useTranslation } from '@/i18n';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';

interface CalendarMonthHeaderProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarMonthHeader({
  label,
  onPrevious,
  onNext,
  onToday,
}: CalendarMonthHeaderProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.sweep.previousMonth}
        onPress={onPrevious}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderRadius: radius.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="chevron-left" size={21} color={colors.textPrimary} />
      </Pressable>

      <View style={[styles.labelWrap, { paddingHorizontal: spacing.sm }]}> 
        <AppText variant="h3" style={styles.label}>{label}</AppText>
        <Pressable accessibilityRole="button" onPress={onToday} hitSlop={8}>
          <AppText variant="caption" color={colors.accent} style={styles.today}>
            {t.sweep.today}</AppText>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.sweep.nextMonth}
        onPress={onNext}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            borderRadius: radius.md,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="chevron-right" size={21} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconButton: {
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  labelWrap: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    textAlign: 'center',
  },
  today: {
    fontWeight: '700',
    marginTop: 2,
  },
});
