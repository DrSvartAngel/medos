import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Section } from '@/components/ui/Section';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { router, type Href } from 'expo-router';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { SubjectForm } from './SubjectForm';
import { committeeRepo } from '@/db/repositories/committeeRepo';
import { subjectRepo } from '@/db/repositories/subjectRepo';
import type { Committee } from '@/store/useCommitteeStore';
import type { Subject } from '@/models/curriculum';
import { useTranslation } from '@/i18n';
import { subjectFallback } from '@/utils/subjectRoutes';

type Loaded = { status: 'ready'; committee: Committee; subject: Subject | null }
  | { status: 'loading' | 'missing' | 'error' };

/** Shared create/edit route body, not a store. Only the form owns unsaved input. */
export function SubjectEditor({ id, mode }: { id: string; mode: 'create' | 'edit' }) {
  const t = useTranslation();
  const [loaded, setLoaded] = useState<Loaded>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => {
    setLoaded({ status: 'loading' });
    setSaveError(null);
    if (!id) { setLoaded({ status: 'missing' }); return; }
    try {
      const subject = mode === 'edit' ? subjectRepo.getById(id) : null;
      if (mode === 'edit' && !subject) { setLoaded({ status: 'missing' }); return; }
      const committee = committeeRepo.getById(subject?.committeeId ?? id);
      setLoaded(committee ? { status: 'ready', committee, subject } : { status: 'missing' });
    } catch { setLoaded({ status: 'error' }); }
  }, [id, mode, attempt]);

  function back() {
    try {
      const target = subjectFallback(loaded.status === 'ready' ? loaded.committee.id : mode === 'create' ? id : '',
        mode === 'edit' ? id : undefined) as Href;
      if (mode === 'edit' && target !== `/subjects/${encodeURIComponent(id)}`) router.dismissTo(target);
      else if (target !== '/(tabs)/committees' && router.canGoBack()) router.back();
      else router.replace(target);
    } catch { router.replace('/(tabs)/committees'); }
  }
  function save(value: { name: string; description: string }): boolean {
    if (loaded.status !== 'ready') return false;
    try {
      if (!committeeRepo.getById(loaded.committee.id)) { setSaveError(t.subjects.parentMissing); return false; }
      const now = Date.now();
      if (mode === 'create') {
        subjectRepo.insert({ ...value, id: now.toString(36) + Math.random().toString(36).slice(2, 10),
          committeeId: loaded.committee.id, createdAt: now, updatedAt: now });
      } else {
        const current = subjectRepo.getById(id);
        if (!current || current.committeeId !== loaded.committee.id ||
          !subjectRepo.update({ ...current, ...value, updatedAt: now })) {
          setSaveError(t.subjects.missing); return false;
        }
      }
    } catch { setSaveError(t.subjects.saveError); return false; }
    // Persistence has succeeded. A navigation lookup must not report the write as failed.
    let target = '/(tabs)/committees';
    try { target = subjectFallback(loaded.committee.id, mode === 'edit' ? id : undefined); } catch { /* safe tab fallback */ }
    router.dismissTo(target as Href);
    return true;
  }
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScreenWrapper includeBottomSafeArea>
      <Section>
        <Button label={t.common.back} variant="ghost" onPress={back} />
        <AppText variant="h2">{mode === 'create' ? t.subjects.add : t.subjects.edit}</AppText>
        {loaded.status === 'loading' && <FeedbackState kind="loading" message={t.common.loading} />}
        {loaded.status === 'missing' && <FeedbackState kind="empty" message={mode === 'create' ? t.subjects.parentMissing : t.subjects.missing} />}
        {loaded.status === 'error' && <FeedbackState kind="error" message={t.subjects.loadError}
          action={{ label: t.common.retry, onPress: () => setAttempt(value => value + 1) }} />}
        {loaded.status === 'ready' && <>
          <AppText>{t.subjects.parent(loaded.committee.name)}</AppText>
          <SubjectForm key={id} initialName={loaded.subject?.name} initialDescription={loaded.subject?.description}
            error={saveError} submitLabel={mode === 'create' ? t.subjects.create : t.common.save} onSubmit={save} />
        </>}
      </Section>
    </ScreenWrapper>
  </KeyboardAvoidingView>;
}
