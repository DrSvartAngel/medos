import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { useTheme } from '@/hooks/useTheme';
import type { CalendarItem, CalendarItemType } from '@/store/useCalendarStore';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

interface TimelineItemRowProps {
  item: CalendarItem;
  onPress?: () => void;
}

const ITEM_CONFIG: Record<
  CalendarItemType,
  { label: string; icon: FeatherName; variant: BadgeVariant; colorKey: 'textPrimary' | 'info' | 'warning' | 'primary' | 'accent' }
> = {
  manual: { label: 'Study', icon: 'calendar', variant: 'default', colorKey: 'textPrimary' },
  committee_start: { label: 'Committee', icon: 'book-open', variant: 'info', colorKey: 'info' },
  committee_exam: { label: 'Exam', icon: 'flag', variant: 'warning', colorKey: 'warning' },
  focus: { label: 'Focus', icon: 'clock', variant: 'primary', colorKey: 'primary' },
  memory: { label: 'Memory', icon: 'layers', variant: 'success', colorKey: 'accent' },
};

export function TimelineItemRow({ item, onPress }: TimelineItemRowProps) {
  const { colors, spacing, radius } = useTheme();
  const config = ITEM_CONFIG[item.type];
  const accentColor = colors[config.colorKey];

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: accentColor,
          borderRadius: radius.md,
          opacity: pressed ? 0.75 : 1,
          padding: spacing.md,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}> 
        <Feather name={config.icon} size={18} color={accentColor} />
      </View>
      <View style={[styles.content, { marginLeft: spacing.md }]}> 
        <View style={styles.metaRow}>
          <Badge label={config.label} variant={config.variant} />
          {item.time !== undefined && (
            <AppText variant="caption" color={colors.textMuted} style={{ marginLeft: spacing.sm }}>
              {item.time}
            </AppText>
          )}
        </View>
        <AppText
          variant={item.type === 'committee_exam' ? 'h3' : 'body'}
          numberOfLines={2}
          style={{ marginTop: spacing.xs }}
        >
          {item.title}
        </AppText>
        {item.subtitle !== undefined && (
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            numberOfLines={2}
            style={{ marginTop: spacing.xs }}
          >
            {item.subtitle}
          </AppText>
        )}
      </View>
      {onPress !== undefined && (
        <Feather name="chevron-right" size={18} color={colors.textMuted} style={{ marginLeft: spacing.sm }} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderLeftWidth: 4,
    borderWidth: 1,
    flexDirection: 'row',
  },
  iconWrap: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  content: {
    flex: 1,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
