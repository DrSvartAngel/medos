import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/Typography';
import { GSText, HStack, VStack, Box } from '@/components/ui/gluestack';
import type { RagAnswer, RagCitation } from '@/models/rag';

export interface RagAnswerCardProps {
  answer: RagAnswer;
  onCitationPress?: (citation: RagCitation) => void;
}

export function RagAnswerCard({ answer, onCitationPress }: RagAnswerCardProps) {
  const { colors, radius, spacing } = useTheme();
  const t = useTranslation();

  // Highlight missing evidence states
  const isInsufficient = answer.evidenceState === 'insufficient';
  const isPartial = answer.evidenceState === 'partial';

  // Render text with clickable [SRC-N] citations
  const renderTextWithCitations = () => {
    // Basic regex to find [SRC-N] and keep text between
    const parts = answer.answerText.split(/(\[SRC-\d+\])/g);
    
    return (
      <GSText size="sm" style={{ color: colors.textPrimary, lineHeight: 24 }}>
        {parts.map((part, index) => {
          const match = part.match(/\[SRC-(\d+)\]/);
          if (match) {
            const labelStr = part.slice(1, -1); // remove brackets
            const labelNumber = match[1];
            
            return (
              <AppText
                key={index}
                weight="semiBold"
                style={{
                  color: colors.primary,
                  backgroundColor: colors.primary + '1A', // 10% opacity
                }}
              >
                {' '}[{labelNumber}]{' '}
              </AppText>
            );
          }
          return <React.Fragment key={index}>{part}</React.Fragment>;
        })}
      </GSText>
    );
  };

  return (
    <Card variant="elevated" style={styles.card}>
      <VStack space="md">
        {/* Warning Banner for Insufficient/Partial */}
        {(isInsufficient || isPartial) && (
          <HStack
            space="sm"
            style={[
              styles.warningBox,
              {
                backgroundColor: isInsufficient ? colors.error + '1A' : colors.warning + '1A',
                borderColor: isInsufficient ? colors.error + '33' : colors.warning + '33',
                borderRadius: radius.md,
              },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={16}
              color={isInsufficient ? colors.error : colors.warning}
            />
            <GSText
              size="sm"
              style={{
                color: isInsufficient ? colors.error : colors.warning,
                flex: 1,
              }}
            >
              {isInsufficient ? t.studyAi.ragInsufficientEvidence : t.studyAi.ragPartialEvidence}
            </GSText>
          </HStack>
        )}

        {/* Answer Text */}
        <Box>{renderTextWithCitations()}</Box>

        {/* Sources Used Section */}
        {answer.citations.length > 0 && (
          <VStack space="sm" style={{ marginTop: spacing.sm }}>
            <HStack style={{ alignItems: 'center' }} space="xs">
              <Feather name="file-text" size={14} color={colors.textSecondary} />
              <GSText size="xs" style={{ color: colors.textSecondary, fontWeight: '600' }}>
                {t.studyAi.sourcesUsed}
              </GSText>
            </HStack>

            <VStack space="xs">
              {answer.citations.map((cit, idx) => (
                <HStack
                  key={cit.chunkId + idx}
                  space="xs"
                  style={[
                    styles.citationBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.cardBorder,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <View style={[styles.citationNumberBadge, { backgroundColor: colors.primary + '1A' }]}>
                    <GSText size="xs" style={{ color: colors.primary, fontWeight: '700' }}>
                      {idx + 1}
                    </GSText>
                  </View>
                  <VStack style={{ flex: 1, justifyContent: 'center' }}>
                    <GSText size="xs" style={{ color: colors.textPrimary, fontWeight: '500' }} numberOfLines={1}>
                      {cit.sourceTitle}
                    </GSText>
                    {Boolean(cit.pageNumber || cit.slideNumber || cit.sectionTitle) && (
                      <GSText size="2xs" style={{ color: colors.textSecondary }} numberOfLines={1}>
                        {cit.pageNumber ? `${t.studyAi.pageRef} ${cit.pageNumber}` : ''}
                        {!cit.pageNumber && cit.slideNumber ? `${t.studyAi.slideRef} ${cit.slideNumber}` : ''}
                        {(cit.pageNumber || cit.slideNumber) && cit.sectionTitle ? ' • ' : ''}
                        {cit.sectionTitle || ''}
                      </GSText>
                    )}
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </VStack>
        )}
      </VStack>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  warningBox: {
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  citationBox: {
    padding: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  citationNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
