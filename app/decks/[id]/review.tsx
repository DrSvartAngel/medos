import { translateError } from '@/i18n/errors';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ReviewCard } from '@/components/memory/ReviewCard';
import { ReviewControls } from '@/components/memory/ReviewControls';
import { ReviewSummary } from '@/components/memory/ReviewSummary';
import { MiniVictory } from '@/components/ui/MiniVictory';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useMemoryStore, type ReviewRating } from '@/store/useMemoryStore';
import { RECOVERY_REVIEW_LIMIT } from '@/utils/recoveryRules';
import { useTranslation } from '@/i18n';

export default function DeckReviewScreen() {
  const { id, mode } = useLocalSearchParams<{
    id: string;
    mode?: string | string[];
  }>();
  const { colors, spacing, radius } = useTheme();
  const { isTablet } = useResponsive();
  const t = useTranslation();
  const [attemptedStart, setAttemptedStart] = useState(false);
  const [showReviewVictory, setShowReviewVictory] = useState(false);
  useFocusEffect(useCallback(() => () => setShowReviewVictory(false), []));
  const isDBReady = useAppStore((state) => state.isDBReady);
  const lowStimulationMode = useAppStore((state) => state.lowStimulationMode);
  const decks = useMemoryStore((state) => state.decks);
  const reviewStatus = useMemoryStore((state) => state.reviewStatus);
  useEffect(() => {
    if (reviewStatus !== 'complete') setShowReviewVictory(false);
  }, [reviewStatus]);
  const reviewQueue = useMemoryStore((state) => state.reviewQueue);
  const reviewIndex = useMemoryStore((state) => state.reviewIndex);
  const reviewSummary = useMemoryStore((state) => state.reviewSummary);
  const error = useMemoryStore((state) => state.error);
  const loadDecks = useMemoryStore((state) => state.loadDecks);
  const startReview = useMemoryStore((state) => state.startReview);
  const revealAnswer = useMemoryStore((state) => state.revealAnswer);
  const rateCurrentCard = useMemoryStore((state) => state.rateCurrentCard);
  const exitReview = useMemoryStore((state) => state.exitReview);
  const deck = decks.find((item) => item.id === id);
  const card = reviewQueue[reviewIndex];
  const revealed = reviewStatus === 'answer';
  const recoveryMode = (Array.isArray(mode) ? mode[0] : mode) === 'recovery';
  const dueMode = mode === 'due';
  const reviewLimit = recoveryMode ? RECOVERY_REVIEW_LIMIT : undefined;
  const backLabel = recoveryMode ? t.review.backToLighterPlan : t.review.backToDeck;
  const progress = reviewQueue.length > 0
    ? Math.min(100, ((reviewIndex + 1) / reviewQueue.length) * 100)
    : 0;

  useEffect(() => {
    if (!isDBReady || !id) return;
    loadDecks();
    startReview(id, reviewLimit, dueMode ? 'due' : 'all');
    setAttemptedStart(true);
    return () => exitReview();
  }, [exitReview, id, isDBReady, loadDecks, reviewLimit, startReview, dueMode]);

  function handleClose() {
    exitReview();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(
      recoveryMode
        ? ('/study-support/recovery' as Href)
        : (`/decks/${id}` as Href)
    );
  }

  function handleRate(rating: ReviewRating) {
    const saved = rateCurrentCard(rating);
    const current = useMemoryStore.getState();
    if (saved && current.reviewStatus === 'complete' && current.reviewSummary.reviewed > 0) {
      setShowReviewVictory(true);
    }
  }

  if (!isDBReady || reviewStatus === 'loading' || (reviewStatus === 'idle' && !attemptedStart)) {
    return (
      <ScreenWrapper scrollable={false} includeBottomSafeArea contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText variant="body" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {t.common.loading}
        </AppText>
        {error !== null && (
          <AppText variant="bodySmall" color={colors.error} style={styles.loadingError}>
            {translateError(error, t)}
          </AppText>
        )}
      </ScreenWrapper>
    );
  }

  if (reviewStatus === 'idle') {
    return (
      <ScreenWrapper scrollable={false} includeBottomSafeArea contentStyle={styles.centered}>
        <Feather name="alert-circle" size={38} color={colors.error} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.review.startFailed}</AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} style={styles.loadingError}>
          {error ?? t.review.queueUnavailable}
        </AppText>
        <Button
          label={t.common.retry}
          onPress={() => startReview(id, reviewLimit, dueMode ? 'due' : 'all')}
          style={{ marginTop: spacing.lg, minWidth: 180 }}
        />
        <Button
          label={backLabel}
          variant="ghost"
          onPress={handleClose}
          style={{ marginTop: spacing.sm }}
        />
      </ScreenWrapper>
    );
  }

  if (reviewStatus === 'complete') {
    return (
      <ScreenWrapper includeBottomSafeArea contentStyle={styles.reviewScreen}>
        <View style={[styles.workspace, { maxWidth: isTablet ? 640 : undefined }]}> 
          {reviewSummary.reviewed === 0 ? (
            <Card elevated style={[styles.empty, { padding: spacing.xl }]}> 
              <Feather
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                name="inbox"
                size={42}
                color={colors.accent}
              />
              <AppText variant="h2" style={{ marginTop: spacing.md, textAlign: 'center' }}>
                {dueMode ? t.scheduling.noneDue : deck ? t.review.noCards : t.review.deckUnavailable}
              </AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
                {dueMode ? t.scheduling.emptyHelp : recoveryMode
                  ? t.review.returnForStep
                  : deck
                    ? t.review.addFirstDescription
                    : t.review.removedDescription}
              </AppText>
              {!recoveryMode && !dueMode && deck ? (
                <Button
                  label={t.review.addCard}
                  onPress={() => {
                    exitReview();
                    router.replace(`/decks/${id}/cards/new` as Href);
                  }}
                  style={{ marginTop: spacing.lg }}
                />
              ) : null}
              <Button
                label={backLabel}
                variant="ghost"
                onPress={handleClose}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          ) : (
            <>
            {showReviewVictory && <MiniVictory kind="review" lowStimulation={lowStimulationMode} />}
            <ReviewSummary
              summary={reviewSummary}
              onReviewAgain={() => startReview(id, reviewLimit, dueMode ? 'due' : 'all')}
              onDone={handleClose}
              doneLabel={backLabel}
            />
            </>
          )}
        </View>
      </ScreenWrapper>
    );
  }

  if (!card) {
    return (
      <ScreenWrapper scrollable={false} includeBottomSafeArea contentStyle={styles.centered}>
        <Feather name="alert-circle" size={36} color={colors.error} />
        <AppText variant="h3" style={{ marginTop: spacing.md }}>{t.review.cardUnavailable}</AppText>
        <Button label={backLabel} variant="secondary" onPress={handleClose} style={{ marginTop: spacing.lg }} />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper includeBottomSafeArea contentStyle={styles.reviewScreen}>
      <View style={[styles.workspace, { maxWidth: isTablet ? 640 : undefined }]}> 
        <View style={styles.topRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={handleClose}
            style={[
              styles.closeButton,
              { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.full },
            ]}
          >
            <Feather
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              name="x"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.sessionTitle}>
            <AppText variant="label" numberOfLines={2} style={{ textAlign: 'center' }}>
              {deck?.name ?? t.review.title}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2, textAlign: 'center' }}>
              {t.review.progress(reviewIndex + 1, reviewQueue.length)}
            </AppText>
          </View>
          <View style={styles.closeSpacer} />
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surface, marginTop: spacing.md }]}> 
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.accent, width: `${progress}%` as const },
            ]}
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <ReviewCard card={card} revealed={revealed} />
        </View>

        {error !== null && (
          <View style={[styles.error, { borderColor: colors.error, marginTop: spacing.md, padding: spacing.md }]}> 
            <Feather name="alert-circle" size={18} color={colors.error} />
            <AppText variant="bodySmall" color={colors.error} style={styles.errorText}>
              {translateError(error, t)}
            </AppText>
          </View>
        )}

        <View style={{ marginTop: spacing.lg, paddingBottom: spacing.lg }}>
          <ReviewControls
            revealed={revealed}
            onReveal={revealAnswer}
            onRate={handleRate}
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewScreen: {
    justifyContent: 'center',
  },
  workspace: {
    alignSelf: 'center',
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  closeButton: {
    alignItems: 'center',
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  closeSpacer: {
    width: 44,
  },
  sessionTitle: {
    flex: 1,
    paddingHorizontal: 12,
  },
  progressTrack: {
    borderRadius: 3,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 3,
    height: 6,
  },
  error: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
  },
  loadingError: {
    marginTop: 12,
    maxWidth: 420,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    maxWidth: 440,
    textAlign: 'center',
  },
});
