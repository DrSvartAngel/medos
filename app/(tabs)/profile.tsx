import { translateError } from '@/i18n/errors';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { PreferenceToggleRow } from '@/components/profile/PreferenceToggleRow';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import { retryAppPreferencesHydration, useAppStore } from '@/store/useAppStore';
import {
  DAILY_FOCUS_GOAL_OPTIONS,
  FOCUS_DURATION_OPTIONS,
  type DailyFocusGoalMin,
  type FocusDurationSec,
} from '@/utils/preferences';
import { useTranslation } from '@/i18n';

interface ChoiceProps {
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

function PreferenceChoice({
  label,
  selected,
  accessibilityLabel,
  onPress,
}: ChoiceProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.primaryMuted : colors.surfaceElevated,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <AppText
        variant="label"
        color={colors.textPrimary}
        style={styles.choiceLabel}
      >
        {label}
      </AppText>
      {selected ? <Feather name="check" size={18} color={colors.textPrimary} /> : null}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { colors, spacing } = useTheme();
  const { isLargeTablet } = useResponsive();
  const t = useTranslation();
  const defaultFocusSec = useAppStore((state) => state.defaultFocusSec);
  const dailyFocusGoalMin = useAppStore((state) => state.dailyFocusGoalMin);
  const lowStimulationMode = useAppStore((state) => state.lowStimulationMode);
  const gentleNudgesEnabled = useAppStore((state) => state.gentleNudgesEnabled);
  const language = useAppStore((state) => state.language);
  const isPreferencesHydrated = useAppStore((state) => state.isPreferencesHydrated);
  const preferencesError = useAppStore((state) => state.preferencesError);
  const setDefaultFocusSec = useAppStore((state) => state.setDefaultFocusSec);
  const setDailyFocusGoalMin = useAppStore((state) => state.setDailyFocusGoalMin);
  const setLowStimulationMode = useAppStore(
    (state) => state.setLowStimulationMode
  );
  const setGentleNudgesEnabled = useAppStore(
    (state) => state.setGentleNudgesEnabled
  );
  const setLanguage = useAppStore((state) => state.setLanguage);

  if (!isPreferencesHydrated) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centeredState}>
        <ActivityIndicator color={colors.primary} />
        <AppText color={colors.textMuted} style={{ marginTop: spacing.sm }}>
          {t.common.prefsLoading}
        </AppText>
      </ScreenWrapper>
    );
  }

  if (preferencesError) {
    return (
      <ScreenWrapper scrollable={false} contentStyle={styles.centeredState}>
        <Feather name="alert-circle" size={28} color={colors.warning} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          {t.common.prefsError}
        </AppText>
        <AppText
          color={colors.textMuted}
          style={{ marginTop: spacing.xs, marginBottom: spacing.md, textAlign: 'center' }}
        >
          {translateError(preferencesError, t)}
        </AppText>
        <Button
          label={t.common.prefsRetry}
          accessibilityLabel={t.common.prefsRetryAccessibility}
          onPress={() => void retryAppPreferencesHydration()}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ marginBottom: spacing.xl }}>
        <AppText variant="h1">{t.profile.title}</AppText>
        <AppText color={colors.textMuted} style={{ marginTop: spacing.xs }}>
          {t.profile.subtitle}
        </AppText>
      </View>

      <View style={[styles.sections, isLargeTablet && styles.sectionsWide]}>
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Feather name="clock" size={18} color={colors.primary} />
            </View>
            <View style={styles.headingText}>
              <AppText variant="h3">{t.profile.defaultFocusDuration}</AppText>
              <AppText variant="bodySmall" color={colors.textMuted}>
                {t.profile.defaultFocusDurationDesc}
              </AppText>
            </View>
          </View>

          <View accessibilityRole="radiogroup" style={[styles.choiceGrid, { gap: spacing.sm }]}>
            {FOCUS_DURATION_OPTIONS.map((seconds) => (
              <PreferenceChoice
                key={seconds}
                label={t.adaptiveRec.durationMin(seconds / 60)}
                selected={defaultFocusSec === seconds}
                accessibilityLabel={t.profile.setDurationAccessibility(seconds / 60)}
                onPress={() => setDefaultFocusSec(seconds as FocusDurationSec)}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
              <Feather name="target" size={18} color={colors.primary} />
            </View>
            <View style={styles.headingText}>
              <AppText variant="h3">{t.profile.dailyFocusGoal}</AppText>
              <AppText variant="bodySmall" color={colors.textMuted}>
                {t.profile.dailyFocusGoalDesc}
              </AppText>
            </View>
          </View>

          <View accessibilityRole="radiogroup" style={[styles.choiceGrid, { gap: spacing.sm }]}>
            <PreferenceChoice
              label={t.profile.none}
              selected={dailyFocusGoalMin === null}
              accessibilityLabel={t.profile.noGoalAccessibility}
              onPress={() => setDailyFocusGoalMin(null)}
            />
            {DAILY_FOCUS_GOAL_OPTIONS.map((minutes) => (
              <PreferenceChoice
                key={minutes}
                label={t.adaptiveRec.durationMin(minutes)}
                selected={dailyFocusGoalMin === minutes}
                accessibilityLabel={t.profile.setGoalAccessibility(minutes)}
                onPress={() => setDailyFocusGoalMin(minutes as DailyFocusGoalMin)}
              />
            ))}
          </View>
        </Card>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.sectionHeading}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Feather name="sliders" size={18} color={colors.primary} />
          </View>
          <View style={styles.headingText}>
            <AppText variant="h3">{t.profile.studySupport}</AppText>
            <AppText variant="bodySmall" color={colors.textMuted}>
              {t.profile.studySupportDesc}
            </AppText>
          </View>
        </View>

        <PreferenceToggleRow
          label={t.profile.lowStimMode}
          description={t.profile.lowStimModeDesc}
          value={lowStimulationMode}
          onValueChange={setLowStimulationMode}
          accessibilityLabel={t.profile.lowStimMode}
        />
        <View
          style={{
            borderTopColor: colors.border,
            borderTopWidth: 1,
            marginTop: spacing.sm,
            paddingTop: spacing.sm,
          }}
        >
          <PreferenceToggleRow
            label={t.profile.gentleNudges}
            description={t.profile.gentleNudgesDesc}
            value={gentleNudgesEnabled}
            onValueChange={setGentleNudgesEnabled}
            accessibilityLabel={t.profile.gentleNudges}
          />
        </View>
      </Card>

      {/* Language selector */}
      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.sectionHeading}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}>
            <Feather name="globe" size={18} color={colors.primary} />
          </View>
          <View style={styles.headingText}>
            <AppText variant="h3">{t.profile.language}</AppText>
            <AppText variant="bodySmall" color={colors.textMuted}>
              {t.profile.languageDesc}
            </AppText>
          </View>
        </View>
        <View accessibilityRole="radiogroup" style={[styles.choiceGrid, { gap: spacing.sm }]}>
          <PreferenceChoice
            label={t.profile.languageTurkish}
            selected={language === 'tr'}
            accessibilityLabel={t.profile.selectTurkish}
            onPress={() => setLanguage('tr')}
          />
          <PreferenceChoice
            label={t.profile.languageEnglish}
            selected={language === 'en'}
            accessibilityLabel={t.profile.selectEnglish}
            onPress={() => setLanguage('en')}
          />
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg }}>
        <View style={styles.localRow}>
          <Feather name="database" size={20} color={colors.textSecondary} />
          <View style={styles.headingText}>
            <AppText variant="label">{t.common.storedLocally}</AppText>
            <AppText variant="bodySmall" color={colors.textMuted}>
              {t.common.storedLocallyDesc}
            </AppText>
          </View>
        </View>
      </Card>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: {
    gap: 16,
  },
  sectionsWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionCard: {
    flex: 1,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headingText: {
    flex: 1,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  choice: {
    minWidth: 104,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  choiceLabel: {
    marginRight: 8,
  },
  localRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
});
