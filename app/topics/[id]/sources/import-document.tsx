// MedOS — Phase 10 Step 8: Document Ingestion Screen
// Allows selecting local documents, extracting text, previewing, and persisting as a StudySource.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, type Href, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { topicRepo } from '@/db/repositories/topicRepo';
import { studySourceRepo } from '@/db/repositories/studySourceRepo';
import { Feather } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { topicRouteId } from '@/utils/topicRoutes';
import {
  cleanDocumentTitle,
  documentExtractor,
  formatDocumentFileSize,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
  MAX_DOCUMENT_TEXT_LENGTH,
  type DocumentInput,
} from '@/services/documents/documentExtractor';

export default function ImportDocumentScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const topicId = topicRouteId(Array.isArray(params.id) ? params.id[0] : params.id);
  const t = useTranslation();
  const { colors, spacing, radius } = useTheme();

  const [selectedFile, setSelectedFile] = useState<DocumentInput | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractionMetadata, setExtractionMetadata] = useState<import('@/models/ingestion').SourceIngestionMetadata | null>(null);
  const [extractionProvenance, setExtractionProvenance] = useState<import('@/models/ingestion').SourceProvenance | null>(null);
  const [extractionNotice, setExtractionNotice] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const topic = topicId ? topicRepo.getById(topicId) : null;

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (topicId) {
      router.replace(`/topics/${encodeURIComponent(topicId)}` as Href);
    } else {
      router.replace('/(tabs)/committees' as Href);
    }
  }, [topicId]);

  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => listener.remove();
    }, [handleBack])
  );

  if (!topicId || !topic) {
    return (
      <ScreenWrapper includeBottomSafeArea>
        <Section>
          <FeedbackState
            kind="empty"
            message={t.topics.missing}
            action={{ label: t.common.back, onPress: handleBack }}
          />
        </Section>
      </ScreenWrapper>
    );
  }

  async function handlePickDocument() {
    try {
      setValidationError(null);
      setSaveError(null);
      setExtractionNotice(null);
      setExtractionProvenance(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/markdown'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const docInput: DocumentInput = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? undefined,
        size: asset.size ?? undefined,
      };

      setSelectedFile(docInput);
      setTitle(cleanDocumentTitle(asset.name));

      // Check file size limit
      if (asset.size !== undefined && asset.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
        setValidationError(t.documentImport.fileTooLarge);
        setContent('');
        return;
      }

      // Run extraction
      setIsExtracting(true);
      try {
        const extraction = await documentExtractor.extract(docInput);
        const pdfExtraction = extraction as import('@/services/documents/pdfTypes').PdfExtractionResult;

        if (pdfExtraction.provenance && pdfExtraction.provenance.length > 0) {
          setExtractionProvenance(pdfExtraction.provenance[0]);
        }

        if (extraction.metadata) {
          setExtractionMetadata(extraction.metadata);
        }

        if (extraction.status === 'success') {
          setContent(extraction.text);
          setExtractionNotice(t.documentImport.extractionSuccess);
        } else if (extraction.status === 'partial') {
          setContent(extraction.text);
          setExtractionNotice(t.documentImport.extractionUnavailableDesc);
        } else if (extraction.status === 'unavailable') {
          setContent('');
          setExtractionNotice(t.documentImport.extractionUnavailableDesc);
        } else if (extraction.status === 'file_too_large') {
          setContent('');
          setValidationError(t.documentImport.fileTooLarge);
        } else if (extraction.status === 'text_too_long') {
          setContent(extraction.text);
          setValidationError(t.documentImport.textTooLong);
        } else if (extraction.status === 'empty') {
          setContent('');
          setValidationError(t.documentImport.noTextExtracted);
        } else if (extraction.status === 'unsupported') {
          setContent('');
          setValidationError(t.documentImport.unsupportedDocument);
        } else {
          setContent('');
          setValidationError(t.documentImport.extractionFailed);
        }
      } finally {
        setIsExtracting(false);
      }
    } catch {
      setValidationError(t.documentImport.extractionFailed);
      setIsExtracting(false);
    }
  }

  async function handleConfirmSave() {
    setValidationError(null);
    setSaveError(null);

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      setValidationError(t.documentImport.titleRequired);
      return;
    }

    if (!trimmedContent) {
      setValidationError(t.documentImport.contentRequired);
      return;
    }

    if (trimmedContent.length > MAX_DOCUMENT_TEXT_LENGTH) {
      setValidationError(t.documentImport.textTooLong);
      return;
    }

    const freshTopic = topicRepo.getById(topicId!);
    if (!freshTopic) {
      setSaveError(t.topics.missing);
      return;
    }

    try {
      setIsSaving(true);
      studySourceRepo.insert({
        topicId: topicId!,
        title: trimmedTitle,
        content: trimmedContent,
        sourceType: 'document',
        metadata: extractionMetadata ?? (selectedFile ? {
          originalFileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
          fileSizeBytes: selectedFile.size,
          origin: 'file_import',
          canonicalType: selectedFile.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'text',
          processingStatus: 'ready',
          lastProcessedAt: Date.now(),
        } : undefined),
        provenance: extractionProvenance ?? undefined,
      });
      handleBack();
    } catch {
      setSaveError(t.studySources.saveError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenWrapper includeBottomSafeArea>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: spacing.xxl, maxWidth: 680, width: '100%', alignSelf: 'center' },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Section>
            <Breadcrumb
              items={[
                { label: topic.name, onPress: handleBack },
                { label: t.documentImport.importDocument, isCurrent: true },
              ]}
            />
            <AppText variant="h2" style={{ marginTop: spacing.xs }}>
              {t.documentImport.importDocument}
            </AppText>
          </Section>

          {/* Document Picker Section */}
          <Section>
            <Button
              label={
                selectedFile
                  ? t.documentImport.changeDocument
                  : t.documentImport.chooseDocument
              }
              variant={selectedFile ? 'secondary' : 'primary'}
              onPress={handlePickDocument}
              disabled={isExtracting || isSaving}
              accessibilityLabel={
                selectedFile
                  ? t.documentImport.changeDocument
                  : t.documentImport.chooseDocument
              }
            />

            {selectedFile && (
              <View
                style={[
                  styles.metadataCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.xs,
                  },
                ]}
              >
                <AppText variant="caption" style={{ color: colors.primary }}>
                  {t.documentImport.selectedFile}
                </AppText>
                <AppText variant="body" style={{ fontWeight: '600' }}>
                  {selectedFile.name}
                </AppText>
                <View style={styles.metadataRow}>
                  <AppText variant="caption" color={colors.textSecondary} style={styles.metadataText}>
                    {t.documentImport.fileSize(
                      formatDocumentFileSize(selectedFile.size)
                    )}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary} style={styles.metadataText}>
                    {t.documentImport.fileType(
                      selectedFile.mimeType ?? 'document'
                    )}
                  </AppText>
                </View>
              </View>
            )}

            {isExtracting && (
              <View style={[styles.loadingRow, { gap: spacing.sm, paddingVertical: spacing.sm }]}>
                <ActivityIndicator color={colors.primary} size="small" />
                <AppText variant="bodySmall" color={colors.textSecondary}>
                  {t.documentImport.extracting}
                </AppText>
              </View>
            )}

            {extractionNotice && (
              <View
                style={[
                  styles.noticeBox,
                  {
                    backgroundColor: colors.surfaceElevated,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    gap: spacing.xs,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Feather name="info" size={14} color={colors.primary} />
                  <AppText variant="caption" color={colors.primary} style={{ fontWeight: '600' }}>
                    {t.documentImport.extractionUnavailable}
                  </AppText>
                </View>
                <AppText variant="bodySmall" color={colors.textSecondary}>
                  {extractionNotice}
                </AppText>
              </View>
            )}

            {validationError && (
              <FeedbackState kind="error" message={validationError} />
            )}

            {saveError && (
              <FeedbackState kind="error" message={saveError} />
            )}
          </Section>

          {/* Preview & Edit Section */}
          {selectedFile && (
            <Section title={t.documentImport.preview}>
              <FormField label={t.documentImport.sourceTitle}>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t.documentImport.sourceTitlePlaceholder}
                  editable={!isSaving}
                  accessibilityLabel={t.documentImport.sourceTitle}
                />
              </FormField>

              <FormField
                label={`${t.documentImport.manualTextFallback} (${t.documentImport.characterCount(content.length)})`}
              >
                <Input
                  value={content}
                  onChangeText={setContent}
                  placeholder={t.documentImport.manualTextPlaceholder}
                  multiline
                  numberOfLines={10}
                  editable={!isSaving}
                  style={styles.contentInput}
                  accessibilityLabel={t.documentImport.manualTextFallback}
                />
              </FormField>

              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                <Button
                  label={
                    isSaving
                      ? t.documentImport.importingDocument
                      : t.documentImport.confirmImport
                  }
                  variant="primary"
                  onPress={handleConfirmSave}
                  disabled={isSaving || isExtracting}
                  accessibilityLabel={t.documentImport.confirmImport}
                />
                <Button
                  label={t.common.cancel}
                  variant="ghost"
                  onPress={handleBack}
                  disabled={isSaving}
                  accessibilityLabel={t.common.cancel}
                />
              </View>
            </Section>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  metadataCard: {
    borderWidth: 1,
    marginTop: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  metadataText: {
    fontSize: 12,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentInput: {
    minHeight: 180,
    textAlignVertical: 'top',
  },
  noticeBox: {
    borderWidth: 1,
    marginTop: 8,
  },
});
