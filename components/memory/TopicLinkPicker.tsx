import React, { useEffect, useState } from 'react';
import { memoryRepo } from '@/db/repositories/memoryRepo';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { AppText } from '@/components/ui/Typography';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { useTranslation } from '@/i18n';

type Scope = { level: 'committee' | 'subject' | 'topic'; parentId: string | null; path: string };
const ROOT: Scope = { level: 'committee', parentId: null, path: '' };
const PAGE_SIZE = 50;

/** Feature-local selector: optional, bounded SQLite reads, no curriculum store. */
export function TopicLinkPicker({ value, onChange, disabled = false }: {
  value: string | null; onChange: (id: string | null) => void; disabled?: boolean;
}) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<ReturnType<typeof memoryRepo.getTopicLinkContext>>(null);
  const [contextFailed, setContextFailed] = useState(false);
  const [scope, setScope] = useState<Scope>(ROOT);
  const [rows, setRows] = useState<{id:string;name:string}[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState<number | null>(null);

  function loadContext() {
    try { setContext(value ? memoryRepo.getTopicLinkContext(value) : null); setContextFailed(false); }
    catch { setContext(null); setContextFailed(true); }
  }
  useEffect(loadContext, [value]);
  function load(next: Scope, page: number) {
    try {
      const result = memoryRepo.listTopicLinkChoices(next.level, next.parentId, page);
      setRows(result.slice(0, PAGE_SIZE)); setMore(result.length > PAGE_SIZE); setOffset(page); setFailed(null);
    } catch { setFailed(page); }
  }
  useEffect(() => {
    if (!open) return;
    setRows([]); setMore(false); setOffset(0); load(scope, 0);
  }, [open, scope]);

  return <Section title={t.memoryTopic.label}>
    <AppText>{t.memoryTopic.help}</AppText>
    {contextFailed ? <FeedbackState kind="error" message={t.memoryTopic.error}
      action={{label:t.common.retry,onPress:loadContext}} />
      : <AppText>{value ? context ? `${context.committee} → ${context.subject} → ${context.topic}` : t.memoryTopic.missing : t.memoryTopic.none}</AppText>}
    {value !== null && <Button label={t.memoryTopic.unlink} variant="ghost" disabled={disabled} onPress={() => onChange(null)} />}
    <Button label={open ? t.memoryTopic.close : t.memoryTopic.choose} variant="secondary" disabled={disabled}
      onPress={() => { setScope(ROOT); setOpen(v => !v); }} />
    {open && <Section>
      <AppText>{t.memoryTopic[scope.level]}</AppText>
      {scope.path ? <AppText>{scope.path}</AppText> : null}
      {scope.level !== 'committee' && <Button label={t.memoryTopic.restart} variant="ghost" disabled={disabled} onPress={() => setScope(ROOT)} />}
      {failed !== null && <FeedbackState kind="error" message={t.memoryTopic.error}
        action={{label:t.common.retry,onPress:() => load(scope, failed)}} />}
      {failed === null && rows.length === 0 && <FeedbackState kind="empty" message={t.memoryTopic.empty} />}
      {rows.map(row => <Button key={row.id} label={row.name} accessibilityLabel={t.memoryTopic.select(row.name)}
        variant="secondary" disabled={disabled} onPress={() => {
          if (scope.level === 'topic') { onChange(row.id); setOpen(false); }
          else setScope({level:scope.level === 'committee' ? 'subject' : 'topic', parentId:row.id,
            path:scope.path ? `${scope.path} → ${row.name}` : row.name});
        }} />)}
      {offset > 0 && <Button label={t.memoryTopic.previous} variant="ghost" disabled={disabled} onPress={() => load(scope, offset - PAGE_SIZE)} />}
      {more && <Button label={t.memoryTopic.more} variant="ghost" disabled={disabled} onPress={() => load(scope, offset + PAGE_SIZE)} />}
    </Section>}
  </Section>;
}
