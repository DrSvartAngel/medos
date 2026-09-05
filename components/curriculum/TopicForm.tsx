import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Section } from '@/components/ui/Section';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { validateCurriculum, validateLearningObjectives } from '@/utils/curriculumValidation';

interface Props {
  initialName?: string;
  initialDescription?: string;
  initialLearningObjectives?: string;
  error: string | null;
  submitLabel: string;
  onSubmit: (value: { name: string; description: string; learningObjectives: string }) => boolean;
}

export function TopicForm({ initialName = '', initialDescription = '', initialLearningObjectives = '', error, submitLabel, onSubmit }: Props) {
  const t = useTranslation();
  const { colors, spacing } = useTheme();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [learningObjectives, setLearningObjectives] = useState(initialLearningObjectives);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  function save() {
    if (submitting.current) return;
    const result = validateCurriculum({ name, description });
    if (!result.valid) { setValidationError(t.topics.validation[result.error]); return; }
    const objectives = validateLearningObjectives(learningObjectives);
    if (!objectives.valid) { setValidationError(t.topics.validation[objectives.error]); return; }
    submitting.current = true;
    setSaving(true);
    setValidationError(null);
    let saved = false;
    try { saved = onSubmit({ name: result.name, description: result.description, learningObjectives: objectives.learningObjectives }); }
    finally {
      // Keep the synchronous double-submit guard until the successful route exit.
      if (!saved) { submitting.current = false; setSaving(false); }
    }
  }
  return <View style={{ gap: spacing.md }}>
    {(validationError || error) && <View accessibilityLiveRegion="polite"><AppText color={colors.error}>{validationError ?? error}</AppText></View>}
    <FormField label={t.topics.name}>
    <Input accessibilityLabel={t.topics.name} value={name} editable={!saving}
      onChangeText={value => { setName(value); setValidationError(null); }} />
    </FormField>
    <FormField label={t.topics.description}>
    <Input accessibilityLabel={t.topics.description} value={description} editable={!saving}
      multiline textAlignVertical="top" onChangeText={value => { setDescription(value); setValidationError(null); }}
      />
    </FormField>
    <Section>
      <FormField label={t.topics.learningObjectivesOptional}>
        <AppText color={colors.textSecondary}>{t.topics.learningObjectivesHelp}</AppText>
        <Input accessibilityLabel={t.topics.learningObjectivesOptional} accessibilityHint={t.topics.learningObjectivesHelp}
          value={learningObjectives} editable={!saving} multiline textAlignVertical="top"
          onChangeText={value => { setLearningObjectives(value); setValidationError(null); }} />
      </FormField>
    </Section>
    <Button label={submitLabel} accessibilityLabel={submitLabel} onPress={save} loading={saving} />
  </View>;
}
