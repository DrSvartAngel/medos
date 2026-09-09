import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ReviewCard } from '@/components/memory/ReviewCard';
import { ReviewControls } from '@/components/memory/ReviewControls';
import { ReviewSummary } from '@/components/memory/ReviewSummary';
import { MiniVictory } from '@/components/ui/MiniVictory';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/store/useAppStore';
import { useMemoryStore, type ReviewRating } from '@/store/useMemoryStore';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { topicRepo } from '@/db/repositories/topicRepo';
import { RECOVERY_REVIEW_LIMIT } from '@/utils/recoveryRules';
import { useTranslation } from '@/i18n';
import { translateError } from '@/i18n/errors';

export type ReviewSessionScope =
  | { type: 'deck'; deckId: string }
  | { type: 'topic'; topicId: string };

interface ReviewSessionProps {
  scope: ReviewSessionScope;
  mode?: string | string[];
  returnTo?: string;
  onExit?: () => void;
}

export function ReviewSession({ scope, mode, returnTo, onExit }: ReviewSessionProps) {
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
  const startTopicReview = useMemoryStore((state) => state.startTopicReview);
  const revealAnswer = useMemoryStore((state) => state.revealAnswer);
  const rateCurrentCard = useMemoryStore((state) => state.rateCurrentCard);
  const exitReview = useMemoryStore((state) => state.exitReview);

  const recoveryMode = (Array.isArray(mode) ? mode[0] : mode) === 'recovery';
  const dueMode = mode === 'due';
  const reviewLimit = recoveryMode ? RECOVERY_REVIEW_LIMIT : undefined;

  const deck = scope.type === 'deck' ? decks.find((item) => item.id === scope.deckId) : null;
  const topicContext = scope.type === 'topic' ? memoryRepo.getTopicLinkContext(scope.topicId) : null;
  const topic = scope.type === 'topic' ? topicRepo.getById(scope.topicId) : null;

  const title =
    scope.type === 'deck'
      ? (deck?.name ?? t.review.title)
      : (topic?.name ?? topicContext?.topic ?? t.review.title);

  const backLabel =
    returnTo
      ? (t.common.back || 'Back to Topic')
      : recoveryMode
        ? t.review.backToLighterPlan
        : t.review.backToDeck;

  const progress =
    reviewQueue.length > 0
      ? Math.min(100, ((reviewIndex + 1) / reviewQueue.length) * 100)
      : 0;

  const card = reviewQueue[reviewIndex];
  const revealed = reviewStatus === 'answer';

  const triggerStart = useCallback(() => {
    if (scope.type === 'deck') {
      startReview(scope.deckId, reviewLimit, dueMode ? 'due' : 'all');
    } else {
      startTopicReview(scope.topicId, reviewLimit, dueMode ? 'due' : 'all');
    }
  }, [dueMode, reviewLimit, scope, startReview, startTopicReview]);

  useEffect(() => {
    if (!isDBReady) return;
    if (scope.type === 'deck') loadDecks();
    triggerStart();
    setAttemptedStart(true);
    return () => exitReview();
  }, [exitReview, isDBReady, loadDecks, triggerStart, scope.type]);

  const handleClose = useCallback(() => {
    exitReview();
    if (onExit) {
      onExit();
      return;
    }
    if (returnTo) {
      router.dismissTo(returnTo as Href);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (scope.type === 'deck') {
      router.replace(
        recoveryMode
          ? ('/study-support/recovery' as Href)
          : (`/decks/${scope.deckId}` as Href)
      );
    } else {
      router.replace(`/topics/${scope.topicId}` as Href);
    }
  }, [exitReview, onExit, recoveryMode, returnTo, scope]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        handleClose();
        return true;
      });
      return () => sub.remove();
    }, [handleClose])
  );

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
        <ActivityIndicator size="large" color={colors.primary} />
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
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          {t.review.startFailed}
        </AppText>
        <AppText variant="bodySmall" color={colors.textSecondary} style={styles.loadingError}>
          {error ?? t.review.queueUnavailable}
        </AppText>
        <Button
          label={t.common.retry}
          onPress={triggerStart}
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
    const emptyTitle = dueMode
      ? t.scheduling.noneDue
      : scope.type === 'deck'
        ? (deck ? t.review.noCards : t.review.deckUnavailable)
        : (topic ? 'No Memory cards for this topic yet.' : 'Topic unavailable');

    const emptyHelp = dueMode
      ? t.scheduling.emptyHelp
      : recoveryMode
        ? t.review.returnForStep
        : scope.type === 'deck'
          ? (deck ? t.review.addFirstDescription : t.review.removedDescription)
          : 'Link flashcards to this topic from Decks or Study Assistant to review them here.';

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
                color={colors.primary}
              />
              <AppText variant="h2" style={{ marginTop: spacing.md, textAlign: 'center' }}>
                {emptyTitle}
              </AppText>
              <AppText variant="body" color={colors.textSecondary} style={styles.emptyText}>
                {emptyHelp}
              </AppText>
              {!recoveryMode && !dueMode && scope.type === 'deck' && deck ? (
                <Button
                  label={t.review.addCard}
                  onPress={() => {
                    exitReview();
                    router.replace(`/decks/${scope.deckId}/cards/new` as Href);
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
                onReviewAgain={triggerStart}
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
        <AppText variant="h3" style={{ marginTop: spacing.md }}>
          {t.review.cardUnavailable}
        </AppText>
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
              {title}
            </AppText>
            <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 2, textAlign: 'center' }}>
              {t.review.progress(reviewIndex + 1, reviewQueue.length)}
            </AppText>
          </View>
          <View style={styles.closeSpacer} />
        </View>

        <ProgressBar
          value={progress}
          max={100}
          height={6}
          color={colors.primary}
          style={{ marginTop: spacing.md }}
        />

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
    padding: 24,
  },
  reviewScreen: {
    alignItems: 'center',
  },
  workspace: {
    width: '100%',
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  sessionTitle: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  closeSpacer: {
    width: 40,
  },
  empty: {
    alignItems: 'center',
    borderRadius: 16,
    width: '100%',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
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
    marginTop: 8,
    textAlign: 'center',
  },
});
