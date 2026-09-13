// MedOS - Phase 15C.2 Independent Academic Context Validator
// Verifies the canonical Committee -> Subject -> Topic academic context system
// across Database Schema v15, AcademicContextSelector, TopicEditor, Focus, and Calendar.

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8').replace(/\r\n/g, '\n');
}

console.log('=== PHASE 15C.2: UNIFIED ACADEMIC CONTEXT VALIDATION ===\n');

// 1. Schema v15 Migration
check('1. Schema v15 Migration: CURRENT_VERSION is 15', () => {
  const src = read('db/migrations.ts');
  assert.ok(src.includes('const CURRENT_VERSION = 15;'), 'CURRENT_VERSION must be 15');
});

check('2. Schema v15 Migration: focus_sessions.subject_id column & index exist', () => {
  const src = read('db/migrations.ts');
  assert.ok(
    src.includes('focus_sessions ADD COLUMN subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL'),
    'focus_sessions subject_id column missing in migration'
  );
  assert.ok(
    src.includes('idx_focus_sessions_subject_id'),
    'idx_focus_sessions_subject_id index missing in migration'
  );
});

check('3. Schema v15 Migration: calendar_events subject_id and topic_id columns & indexes exist', () => {
  const src = read('db/migrations.ts');
  assert.ok(
    src.includes('calendar_events ADD COLUMN subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL'),
    'calendar_events subject_id column missing in migration'
  );
  assert.ok(
    src.includes('calendar_events ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL'),
    'calendar_events topic_id column missing in migration'
  );
  assert.ok(
    src.includes('idx_calendar_events_subject_id'),
    'idx_calendar_events_subject_id index missing in migration'
  );
  assert.ok(
    src.includes('idx_calendar_events_topic_id'),
    'idx_calendar_events_topic_id index missing in migration'
  );
});

check('4. Historical compatibility: strictly NO backfill of historical focus_sessions.subject_id', () => {
  const src = read('db/migrations.ts');
  const v15Match = src.match(/if\s*\(\s*currentVersion\s*<\s*15\s*\)\s*\{([\s\S]*?)\}/);
  assert.ok(v15Match, 'v15 migration block must exist');
  const block = v15Match[1];
  assert.ok(!block.includes('UPDATE focus_sessions'), 'Historical focus_sessions backfill is forbidden');
  assert.ok(!block.match(/UPDATE\s+focus_sessions\s+SET\s+subject_id/i), 'No UPDATE on focus_sessions allowed');
});

// 2. Reusable AcademicContextSelector
check('5. AcademicContextSelector component exists and exports component', () => {
  const src = read('components/curriculum/AcademicContextSelector.tsx');
  assert.ok(src.includes('export function AcademicContextSelector'), 'AcademicContextSelector export missing');
  assert.ok(src.includes('AcademicContextValue'), 'AcademicContextValue type missing');
});

check('6. AcademicContextSelector supports maxDepth and requiredDepth options', () => {
  const src = read('components/curriculum/AcademicContextSelector.tsx');
  assert.ok(src.includes("maxDepth?: 'committee' | 'subject' | 'topic'"), 'maxDepth prop missing');
  assert.ok(src.includes("requiredDepth?: 'none' | 'committee' | 'subject'"), 'requiredDepth prop missing');
});

check('7. AcademicContextSelector uses stores and repositories without Gluestack', () => {
  const src = read('components/curriculum/AcademicContextSelector.tsx');
  assert.ok(src.includes('useCommitteeStore'), 'useCommitteeStore must be used');
  assert.ok(src.includes('subjectRepo.listByCommittee'), 'subjectRepo.listByCommittee must be used');
  assert.ok(src.includes('topicRepo.listBySubject'), 'topicRepo.listBySubject must be used');
  assert.ok(!src.includes('@gluestack-ui'), 'Gluestack must NOT be used in AcademicContextSelector');
});

check('8. AcademicContextSelector clears invalid descendants when parent changes', () => {
  const src = read('components/curriculum/AcademicContextSelector.tsx');
  // When committee changes, subjectId and topicId must be reset
  assert.ok(
    src.includes('subjectId: null') && src.includes('topicId: null'),
    'Changing parent must clear descendant IDs'
  );
});

check('9. AcademicContextSelector handles empty subjects with verified create route', () => {
  const src = read('components/curriculum/AcademicContextSelector.tsx');
  assert.ok(
    src.includes('/subjects/new?committeeId='),
    'Empty state must offer navigation to verified /subjects/new route'
  );
});

check('10. AcademicContextSelector contains Android keyboard & viewport stability fix', () => {
  const src = read('components/curriculum/AcademicContextSelector.tsx');
  assert.ok(src.includes('KeyboardAvoidingView'), 'KeyboardAvoidingView missing for Android modal stability');
  assert.ok(src.includes('keyboardShouldPersistTaps="handled"'), 'keyboardShouldPersistTaps handled missing');
  assert.ok(src.includes('maxHeight:') || src.includes('modalViewport'), 'Viewport height constraint missing');
});

// 3. Today -> Add Topic
check('11. TopicEditor uses AcademicContextSelector with subject max/required depth', () => {
  const src = read('components/curriculum/TopicEditor.tsx');
  assert.ok(src.includes('AcademicContextSelector'), 'AcademicContextSelector must be used in TopicEditor');
  assert.ok(src.includes('maxDepth="subject"'), 'TopicEditor must specify maxDepth="subject"');
  assert.ok(src.includes('requiredDepth="subject"'), 'TopicEditor must specify requiredDepth="subject"');
});

check('12. TopicEditor preserves reparenting, material import, and derived committeeId', () => {
  const src = read('components/curriculum/TopicEditor.tsx');
  assert.ok(src.includes('subjectRepo.getById'), 'subjectRepo.getById used to verify subject');
  assert.ok(src.includes('subject.committeeId'), 'subject.committeeId derived for invariant');
  assert.ok(src.includes('showPostCreateModal'), 'Post-create modal flow must be preserved');
});

// 4. Focus Session Context
check('13. FocusSession model & focusRepo support subjectId and complete hierarchy', () => {
  const src = read('db/repositories/focusRepo.ts');
  assert.ok(src.includes('subject_id: string | null'), 'FocusSessionRow must have subject_id');
  assert.ok(src.includes('getTopicContext'), 'focusRepo must provide getTopicContext');
  assert.ok(src.includes('getSubjectContext'), 'focusRepo must provide getSubjectContext');
});

check('14. focusRepo.insert handles Committee-only, Committee+Subject, and Committee+Subject+Topic', () => {
  const src = read('db/repositories/focusRepo.ts');
  assert.ok(src.includes('this.getTopicContext(s.topicId)'), 'Topic resolution logic must exist in focusRepo insert');
  assert.ok(src.includes('this.getSubjectContext(s.subjectId)'), 'Subject resolution logic must exist in focusRepo insert');
  assert.ok(src.includes('committee_id, subject_id, topic_id'), 'All 3 hierarchy columns must be inserted');
});

check('15. useFocusStore manages selectedSubjectId and snapshots topic context', () => {
  const src = read('store/useFocusStore.ts');
  assert.ok(src.includes('selectedSubjectId: string | null'), 'selectedSubjectId must be in FocusState');
  assert.ok(src.includes('selectedSubjectName: string | null'), 'selectedSubjectName must be in FocusState');
  assert.ok(src.includes('setSelectedSubject'), 'setSelectedSubject action must exist in useFocusStore');
  assert.ok(src.includes('focusRepo.getTopicContext'), 'startTopicSession must resolve topic hierarchy');
});

check('16. Focus screen integrates AcademicContextSelector and displays unified context', () => {
  const src = read('app/(tabs)/focus.tsx');
  assert.ok(src.includes('AcademicContextSelector'), 'AcademicContextSelector must be used in Focus screen');
  assert.ok(src.includes('selectedSubjectName'), 'selectedSubjectName must be displayed in Focus badges');
});

// 5. Plan -> Add Study Event
check('17. CalendarEvent model & calendarRepo support subjectId and topicId', () => {
  const repoSrc = read('db/repositories/calendarRepo.ts');
  const storeSrc = read('store/useCalendarStore.ts');
  assert.ok(repoSrc.includes('subject_id: string | null'), 'CalendarEventRow must have subject_id');
  assert.ok(repoSrc.includes('topic_id: string | null'), 'CalendarEventRow must have topic_id');
  assert.ok(storeSrc.includes('subjectId?: string | null'), 'CalendarEvent must have subjectId');
  assert.ok(storeSrc.includes('topicId?: string | null'), 'CalendarEvent must have topicId');
  assert.ok(repoSrc.includes('resolveAcademicContext'), 'calendarRepo must resolve canonical context');
});

check('18. useCalendarStore propagates subjectId and topicId', () => {
  const src = read('store/useCalendarStore.ts');
  assert.ok(src.includes('subjectId?: string | null'), 'useCalendarStore createEvent must accept subjectId');
  assert.ok(src.includes('topicId?: string | null'), 'useCalendarStore createEvent must accept topicId');
});

check('19. CalendarEventForm integrates AcademicContextSelector with optional depth', () => {
  const src = read('components/calendar/CalendarEventForm.tsx');
  assert.ok(src.includes('AcademicContextSelector'), 'CalendarEventForm must use AcademicContextSelector');
  assert.ok(src.includes('maxDepth="topic"'), 'CalendarEventForm must support up to topic depth');
  assert.ok(src.includes('requiredDepth="none"'), 'CalendarEventForm depth must be optional');
});

check('20. Calendar event editing and detail screens preserve subject & topic context', () => {
  const editSrc = read('app/calendar/[id]/edit.tsx');
  assert.ok(editSrc.includes('initialSubjectId'), 'Edit screen must pass initialSubjectId');
  assert.ok(editSrc.includes('initialTopicId'), 'Edit screen must pass initialTopicId');

  const detailSrc = read('app/calendar/[id].tsx');
  assert.ok(detailSrc.includes('subjectRepo.getById'), 'Detail screen must fetch subject');
  assert.ok(detailSrc.includes('topicRepo.getById'), 'Detail screen must fetch topic');
});

console.log('\n============================================================');
console.log(`Phase 15C.2 Validation: ${passed}/${passed + failed} passed, ${failed} failed`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
