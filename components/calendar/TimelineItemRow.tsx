import React from 'react';
import { useTranslation } from '@/i18n';
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
  { icon: FeatherName; variant: BadgeVariant; colorKey: 'textPrimary' | 'info' | 'warning' | 'primary' | 'accent' }
> = {
  manual: { icon: 'calendar', variant: 'default', colorKey: 'textPrimary' },
  committee_start: { icon: 'book-open', variant: 'info', colorKey: 'info' },
  committee_exam: { icon: 'flag', variant: 'warning', colorKey: 'warning' },
  focus: { icon: 'clock', variant: 'primary', colorKey: 'primary' },
  memory: { icon: 'layers', variant: 'success', colorKey: 'accent' },
};

export function TimelineItemRow({ item, onPress }: TimelineItemRowProps) {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();
  const config = ITEM_CONFIG[item.type];
  const accentColor = colors[config.colorKey];
  const display = item.display;
  const committee = item.committeeId ? display?.name ?? t.sweep.committeeRemoved : undefined;
  const title = !display ? item.title : item.type === 'committee_start' ? t.dashboard.startTitle(display.name ?? '')
    : item.type === 'committee_exam' ? t.dashboard.examTitle(display.name ?? '')
    : item.type === 'focus' ? t.sweep.focusTitle(display.name ?? null)
    : item.type === 'memory' ? t.sweep.memoryTitle(display.name ?? '') : item.title;
  const subtitle = !display ? item.subtitle : item.type === 'manual' ? [committee, display.description].filter(Boolean).join(' · ')
    : item.type === 'committee_start' ? t.dashboard.committeeStart
    : item.type === 'committee_exam' ? t.sweep.exam
    : item.type === 'focus' ? [committee, t.sweep.focused(display.actualSec ?? 0)].filter(Boolean).join(' · ')
    : t.sweep.cardReviews(display.reviews ?? 0);

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
          <Badge label={t.sweep.timelineTypes[item.type]} variant={config.variant} />
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
          {title}
        </AppText>
        {subtitle !== undefined && (
          <AppText
            variant="bodySmall"
            color={colors.textSecondary}
            numberOfLines={2}
            style={{ marginTop: spacing.xs }}
          >
            {subtitle}
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
