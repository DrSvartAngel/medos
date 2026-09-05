import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/i18n';
import { validateCurriculum } from '@/utils/curriculumValidation';

interface Props {
  initialName?: string;
  initialDescription?: string;
  error: string | null;
  submitLabel: string;
  onSubmit: (value: { name: string; description: string }) => boolean;
}

export function SubjectForm({ initialName = '', initialDescription = '', error, submitLabel, onSubmit }: Props) {
  const t = useTranslation();
  const { colors, spacing } = useTheme();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  function save() {
    if (submitting.current) return;
    const result = validateCurriculum({ name, description });
    if (!result.valid) { setValidationError(t.subjects.validation[result.error]); return; }
    submitting.current = true;
    setSaving(true);
    setValidationError(null);
    let saved = false;
    try { saved = onSubmit({ name: result.name, description: result.description }); }
    finally {
      // Keep the synchronous double-submit guard until the successful route exit.
      if (!saved) { submitting.current = false; setSaving(false); }
    }
  }
  return <View style={{ gap: spacing.md }}>
    {(validationError || error) && <View accessibilityLiveRegion="polite"><AppText color={colors.error}>{validationError ?? error}</AppText></View>}
    <FormField label={t.subjects.name}>
    <Input accessibilityLabel={t.subjects.name} value={name} editable={!saving}
      onChangeText={value => { setName(value); setValidationError(null); }} />
    </FormField>
    <FormField label={t.subjects.description}>
    <Input accessibilityLabel={t.subjects.description} value={description} editable={!saving}
      multiline textAlignVertical="top" onChangeText={value => { setDescription(value); setValidationError(null); }}
      />
    </FormField>
    <Button label={submitLabel} accessibilityLabel={submitLabel} onPress={save} loading={saving} />
  </View>;
}
