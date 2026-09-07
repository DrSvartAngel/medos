import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppText } from '@/components/ui/Typography';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import {
  getActiveAIProviderState,
  setActiveAIProvider,
  testAIProviderConnection,
  type AIProviderId,
} from '@/services/ai/studyAIClient';
import {
  deleteGeminiApiKey,
  hasGeminiApiKey,
  setGeminiApiKey,
} from '@/services/ai/credentialStore';
import { DEFAULT_GEMINI_MODEL } from '@/services/ai/geminiProvider';

export default function AISettingsScreen() {
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const [providerId, setProviderId] = useState<AIProviderId>('mock');
  const [hasSavedKey, setHasSavedKey] = useState<boolean>(false);
  const [inputKey, setInputKey] = useState<string>('');
  const [isSavingKey, setIsSavingKey] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const back = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        back();
        return true;
      });
      return () => listener.remove();
    }, [back])
  );

  const loadState = useCallback(async () => {
    try {
      const state = await getActiveAIProviderState();
      setProviderId(state.providerId);
      const keyExists = await hasGeminiApiKey();
      setHasSavedKey(keyExists);
    } catch {
      // Fail closed gracefully
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const handleSelectProvider = async (newId: AIProviderId) => {
    setProviderId(newId);
    setErrorMessage(null);
    setStatusMessage(null);
    setTestResult(null);
    await setActiveAIProvider(newId);
  };

  const handleSaveKey = async () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      setErrorMessage(t.aiSettings.keyMissing);
      return;
    }

    setIsSavingKey(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setTestResult(null);

    try {
      await setGeminiApiKey(trimmed);
      setHasSavedKey(true);
      setInputKey(''); // Clear input for security
      setStatusMessage(t.aiSettings.keySaved);
      await setActiveAIProvider(providerId);
    } catch {
      setErrorMessage(t.aiSettings.saveKey);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleRemoveKey = async () => {
    setIsSavingKey(true);
    setErrorMessage(null);
    setStatusMessage(null);
    setTestResult(null);

    try {
      await deleteGeminiApiKey();
      setHasSavedKey(false);
      setInputKey('');
      await setActiveAIProvider(providerId);
    } catch {
      setErrorMessage(t.aiSettings.removeKey);
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMessage(null);

    try {
      const res = await testAIProviderConnection();
      if (res.ok) {
        setTestResult({ ok: true, message: t.aiSettings.connectionSuccess });
      } else {
        const msgDetail = res.message ?? '';
        let msg = t.aiSettings.connectionFailed;
        if (msgDetail.includes('API key is missing') || msgDetail.includes('not configured')) {
          msg = t.aiSettings.keyMissing;
        } else if (msgDetail.includes('authentication') || msgDetail.includes('401') || msgDetail.includes('403')) {
          msg = t.aiSettings.authError;
        } else if (msgDetail.includes('rate limit') || msgDetail.includes('429')) {
          msg = t.aiSettings.rateLimitError;
        } else if (msgDetail.includes('Network') || msgDetail.includes('internet')) {
          msg = t.aiSettings.networkError;
        }
        setTestResult({ ok: false, message: msg });
      }
    } catch {
      setTestResult({ ok: false, message: t.aiSettings.connectionFailed });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <ScreenWrapper includeBottomSafeArea>
      {/* Top Header */}
      <View style={[styles.topBar, { marginBottom: spacing.md }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
          onPress={back}
          style={styles.iconButton}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <AppText variant="h3">{t.aiSettings.title}</AppText>
        </View>
      </View>

      {/* Security Note Card */}
      <Card
        elevated={false}
        style={[
          styles.securityCard,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
            marginBottom: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
          },
        ]}
      >
        <View style={styles.securityRow}>
          <Feather name="shield" size={20} color={colors.primary} style={{ marginTop: 2 }} />
          <AppText
            color={colors.textSecondary}
            variant="bodySmall"
            style={{ flex: 1, marginLeft: spacing.sm }}
          >
            {t.aiSettings.secureStorageNote}
          </AppText>
        </View>
      </Card>

      {/* Provider Selector Card */}
      <Card
        elevated
        style={[
          styles.sectionCard,
          {
            borderColor: colors.border,
            marginBottom: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
          },
        ]}
      >
        <AppText variant="label" color={colors.textPrimary} style={{ marginBottom: spacing.sm }}>
          {t.aiSettings.provider}
        </AppText>

        {/* Choice: Mock */}
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={t.aiSettings.mock}
          accessibilityState={{ checked: providerId === 'mock' }}
          onPress={() => handleSelectProvider('mock')}
          style={({ pressed }) => [
            styles.choiceItem,
            {
              backgroundColor: providerId === 'mock' ? colors.primaryMuted : colors.surfaceElevated,
              borderColor: providerId === 'mock' ? colors.primary : colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={styles.choiceHeaderRow}>
            <AppText variant="body" color={colors.textPrimary} style={{ fontWeight: '600' }}>
              {t.aiSettings.mock}
            </AppText>
            {providerId === 'mock' ? (
              <Feather name="check-circle" size={20} color={colors.primary} />
            ) : null}
          </View>
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
            {t.aiSettings.mockDescription}
          </AppText>
        </Pressable>

        {/* Choice: Gemini */}
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={t.aiSettings.gemini}
          accessibilityState={{ checked: providerId === 'gemini' }}
          onPress={() => handleSelectProvider('gemini')}
          style={({ pressed }) => [
            styles.choiceItem,
            {
              backgroundColor: providerId === 'gemini' ? colors.primaryMuted : colors.surfaceElevated,
              borderColor: providerId === 'gemini' ? colors.primary : colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={styles.choiceHeaderRow}>
            <AppText variant="body" color={colors.textPrimary} style={{ fontWeight: '600' }}>
              {t.aiSettings.gemini}
            </AppText>
            {providerId === 'gemini' ? (
              <Feather name="check-circle" size={20} color={colors.primary} />
            ) : null}
          </View>
          <AppText variant="caption" color={colors.textMuted} style={{ marginTop: 4 }}>
            {t.aiSettings.geminiDescription}
          </AppText>
        </Pressable>
      </Card>

      {/* Gemini Settings Section */}
      {providerId === 'gemini' && (
        <Card
          elevated
          style={[
            styles.sectionCard,
            {
              borderColor: colors.border,
              marginBottom: spacing.md,
              padding: spacing.md,
              borderRadius: radius.md,
            },
          ]}
        >
          {/* Key Status Row */}
          <View style={styles.keyStatusRow}>
            <AppText variant="label" color={colors.textPrimary}>
              {t.aiSettings.apiKey}
            </AppText>
            <Badge
              label={hasSavedKey ? t.aiSettings.keySaved : t.aiSettings.keyMissing}
              variant={hasSavedKey ? 'success' : 'warning'}
              dot
            />
          </View>

          {/* Model info */}
          <View style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
            <AppText variant="caption" color={colors.textMuted}>
              {`${t.aiSettings.model}: ${DEFAULT_GEMINI_MODEL}`}
            </AppText>
          </View>

          {/* Secure Key Input */}
          <Input
            secureTextEntry
            placeholder={t.aiSettings.apiKeyPlaceholder}
            value={inputKey}
            onChangeText={setInputKey}
            editable={!isSavingKey}
            accessibilityLabel={t.aiSettings.apiKey}
          />

          {/* Action buttons */}
          <View style={[styles.buttonRow, { marginTop: spacing.md }]}>
            <Button
              label={t.aiSettings.saveKey}
              onPress={handleSaveKey}
              disabled={isSavingKey || inputKey.trim().length === 0}
              accessibilityLabel={t.aiSettings.saveKey}
              style={{ flex: 1 }}
            />
            {hasSavedKey ? (
              <Button
                label={t.aiSettings.removeKey}
                variant="danger"
                onPress={handleRemoveKey}
                disabled={isSavingKey}
                accessibilityLabel={t.aiSettings.removeKey}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>

          {/* Status / Error Message */}
          {statusMessage ? (
            <View style={[styles.feedbackBox, { marginTop: spacing.sm }]}>
              <Feather name="check" size={16} color={colors.success} />
              <AppText variant="caption" color={colors.success} style={{ marginLeft: 6 }}>
                {statusMessage}
              </AppText>
            </View>
          ) : null}

          {errorMessage ? (
            <View accessibilityRole="alert" style={[styles.feedbackBox, { marginTop: spacing.sm }]}>
              <Feather name="alert-circle" size={16} color={colors.error} />
              <AppText variant="caption" color={colors.error} style={{ marginLeft: 6 }}>
                {errorMessage}
              </AppText>
            </View>
          ) : null}

          {/* Connection Test Section */}
          <View style={[styles.testSection, { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }]}>
            <Button
              label={isTesting ? t.aiSettings.testingConnection : t.aiSettings.connectionTest}
              variant="secondary"
              onPress={handleTestConnection}
              disabled={isTesting || !hasSavedKey}
              accessibilityLabel={t.aiSettings.connectionTest}
            />

            {testResult ? (
              <View
                accessibilityRole="alert"
                style={[
                  styles.testResultBox,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: testResult.ok ? colors.success : colors.error,
                    borderRadius: radius.sm,
                    marginTop: spacing.sm,
                    padding: spacing.sm,
                  },
                ]}
              >
                <Feather
                  name={testResult.ok ? 'check-circle' : 'alert-triangle'}
                  size={16}
                  color={testResult.ok ? colors.success : colors.error}
                />
                <AppText
                  variant="caption"
                  color={testResult.ok ? colors.success : colors.error}
                  style={{ flex: 1, marginLeft: 6 }}
                >
                  {testResult.message}
                </AppText>
              </View>
            ) : null}
          </View>
        </Card>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCard: {
    borderWidth: 1,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sectionCard: {
    borderWidth: 1,
  },
  choiceItem: {
    borderWidth: 1,
  },
  choiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  keyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testSection: {},
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
});
