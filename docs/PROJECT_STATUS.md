# MedOS — Project Status

## Phase 5.5 — Committee Learning Evidence — IMPLEMENTATION COMPLETE

- Started from clean main 46b9652, equal to origin/main. Branch phase-5-5-committee-learning-evidence; no automatic merge.
- Committee detail adds factual totals: Subjects (including those without Topics), Topics, Topics with recorded study activity, current linked cards, rating-time linked reviews, due scheduled linked cards, attention Topics and Subjects containing >=1 attention Topic.
- Attention stays Topic-local: linked review evidence AND at least one currently due linked card on that same Topic. Never infer attention by combining reviews on one Topic with due cards on another. Focus is boolean context only; no score, percentages, mastery, retention, priority or objective-based inference.
- Two SQLite reads per refresh: verify Committee plus one Committee-scoped CTE aggregation. Independent card/review/Focus grouping prevents multiplied counts; final grouped rows preserve Subject created_at ASC,id ASC. No N+1 queries or global store.
- All Subjects / Needs review attention filter preserves order and never changes Committee totals. Render first 50 rows with Show more; totals and next deadline cover the full result. Subject rows open existing Subject detail and display exact Topic/study/card/review/due/attention counts.
- Focus/foreground/next due boundary refresh; timeout/listener removed on blur. No polling. Missing parent/query errors stay errors, not zero/empty success.
- Schema v10 unchanged; no migration/dependency/persistence change. SRS, full/due/max-five review flows, review snapshots, Topic deletion behavior, Subject/Topic screens, Focus and Exam Plan unchanged.
- Created components/curriculum/CommitteeLearningEvidence.tsx and utils/committeeEvidenceRules.ts. Modified Committee detail, memoryRepo, EN/TR, validate-phase5 and four project-memory docs.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS, Phase 5 26 PASS (175 total). Phase 5 rerun passed after correcting test-helper initialization order; no application defect found. Existing regression groups retained.
- Physical QA Phase 5.5 phone/tablet PENDING; prior states unchanged: Phase 5.1 DEFERRED, Phase 5.2/5.3/5.4 PENDING; earlier deferred QA retained. No emulator/ADB/device automation; user owns physical QA.
- Master Phase 4 and Phase 5 remain ACTIVE; Phase 5.6 NOT STARTED. Whole-app localization deferred; PDF/Gemini roadmap-only.
- Next: user checks totals vs Subjects, empty/untracked/future/due states, exact filter, navigation/return, foreground/due refresh, long names/50+ Subjects and phone/tablet safe area; then explicit merge/next-scope approval.

## Phase 5.4 checkpoint (historical)


## Phase 5.4 — Subject Learning Evidence — IMPLEMENTATION COMPLETE

- Started from clean main 3d2dd79, equal to origin/main. Branch phase-5-4-subject-learning-evidence; no automatic merge.
- Subject detail adds a Learning Evidence section with exact totals across ALL owned Topics: Topics, Topics with recorded study activity, current linked cards, rating-time linked reviews, currently due scheduled cards and Topics needing review attention.
- Review attention reuses Phase 5.3 exactly: linkedReviews > 0 AND dueCards > 0. Untracked/unscheduled/future-only data is never inferred weak. Focus provides a boolean context only, using the existing positive concluded-session predicate including meaningful cancellation >=30 seconds.
- Two SQLite reads per refresh: verify Subject then one Subject-scoped CTE aggregation. Cards/reviews/study sources are grouped independently to avoid join multiplication. No per-Topic repository queries, global cache or store.
- Rows preserve created_at ASC, id ASC. All Topics / Needs review attention filter preserves that order and never changes totals. Render first 50 rows with Show more; totals and next due boundary use the complete Subject-scoped result, not the displayed subset.
- Current card links and historical review snapshots remain distinct; relinking does not reattribute old reviews. Focus and Memory are never combined numerically. Objectives are not inputs.
- Focus/foreground/next due-time refresh; listener and timeout cleaned on blur, no polling. Empty/error/loading/retry remain distinct. Existing Subject CRUD/Topic list, Topic evidence, Focus, SRS, full/due/max-five reviews and Exam Plan remain unchanged.
- Schema v10 unchanged; no migration/dependency/persistence changes. UI Foundation, constrained stack layout and safe area reused; only new EN/TR copy. No percentages, mastery, weak score or PDF/Gemini work.
- Created components/curriculum/SubjectLearningEvidence.tsx and utils/subjectEvidenceRules.ts. Modified Subject detail, memoryRepo, EN/TR, validate-phase5 and four project-memory docs.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS, Phase 5 23 PASS (172 total). Existing regression groups retained; static/in-memory checks are not physical QA.
- Phase 5.4 phone/tablet physical QA PENDING. Prior QA unchanged: Phase 5.1 DEFERRED; Phase 5.2/5.3 PENDING; earlier deferred statuses retained. User owns physical QA; no emulator/ADB/device automation.
- Master Phase 4 and Phase 5 ACTIVE; Phase 5.5 NOT STARTED. Broad localization deferred; PDF/Gemini roadmap-only.
- Next: user checks totals, neutral untracked/future-only states, exact attention filter, Topic navigation/return, relinking, due-boundary/foreground refresh, 50+ rows, EN/TR and phone/tablet safe area; then explicit merge/next-scope approval.

## Phase 5.3 checkpoint (historical)


## Phase 5.3 — Topic review-attention evidence — IMPLEMENTATION COMPLETE

- Started from clean main 77f9938, equal to origin/main. Work branch: phase-5-3-weak-topic-evidence; no automatic merge.
- Derived/on-demand, schema v10 unchanged. No persistence, migrations, dependencies or new store.
- Exact facts: current linked Card count, rating-time Topic-linked Review count, current scheduled/due linked Card count. Unscheduled cards are not due. Historical reviews retain original attribution when cards are relinked; counts intentionally describe different current-link and historical-snapshot populations.
- Attention requires linkedReviews > 0 AND dueCards > 0. Otherwise reviews > 0 means review evidence available; no linked reviews means insufficient linked review evidence, never weak/zero progress. No Again/Hard trend or arbitrary thresholds.
- Existing Topic Focus evidence remains separate context, never a numerical input. Objectives ignored. No mastery/retention/progress/completion percentages or global weakness score.
- Topic Learning Evidence replaces the previous Memory evidence presentation using existing UI Foundation. Loading/error/retry are distinct from zero; refresh on focus, foreground and next scheduled due boundary. Listener/timeout cleanup on blur, no polling.
- Subject-level review-attention list deferred to a separately approved future Phase 5.4 scope: a second paginated/refreshing surface is not needed for this minimal Topic-detail implementation. Phase 5.4 NOT STARTED.
- SRS algorithm, full-deck/due/max-five review flows, history, Topic deletion SET NULL, Focus and Exam Plan unchanged. New EN/TR strings only; broad localization deferred; PDF/Gemini roadmap-only.
- Files: created utils/topicEvidenceRules.ts; modified memoryRepo, TopicReviewEvidence, EN/TR, validate-phase5 and four project-memory docs.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS, Phase 5 19 PASS (168 total). Existing groups retained; source assertions are not runtime/device tests.
- Phase 5.1 physical QA DEFERRED; Phase 5.2 physical QA PENDING; Phase 5.3 phone/tablet physical QA PENDING. Older deferred QA unchanged; user-owned, no emulator/ADB/device automation.
- Master Phase 4 and Phase 5 remain ACTIVE. Next: user checks untracked/future/due evidence, exact counts, relinking attribution, foreground/deadline refresh, EN/TR and phone/tablet layout; then explicit merge/next-scope approval.

## Phase 5.2 checkpoint (historical)


## Phase 5.2 — Topic ↔ Memory evidence — IMPLEMENTATION COMPLETE

- Started from clean main 0e8d937, equal to origin/main. Branch: phase-5-2-topic-memory-linkage; do not merge automatically.
- Schema v10, additive from v9: nullable flashcards.topic_id and flashcard_reviews.topic_id, both REFERENCES topics(id) ON DELETE SET NULL. No tables/indexes/backfill; legacy cards/reviews remain unlinked and valid.
- Card linkage is optional and editable/removable. Card create/edit uses a local Committee → Subject → Topic selector, one level at a time, 50 rows with one-record lookahead. No global curriculum loading/cache/store; Deck ownership is unchanged.
- Review topic_id is a rating-time snapshot of the persisted card link, saved in the existing atomic history + schedule transaction. Relinking/unlinking cards never reattributes prior reviews; old reviews are not retroactively linked. Topic/ancestor deletion nulls references and preserves cards, schedules and review rows.
- Topic detail shows only “Review activity recorded” / “No linked review evidence yet”, based on actual saved review snapshots. Loading/error/retry remain distinct from no evidence; refresh on focus. No counts, scores, mastery, retention, weak-topic inference or combined Focus/Memory metric.
- Existing Focus linkage remains independent. SRS algorithm, all ratings including free/early reviews, due ordering, new versus legacy-unscheduled semantics, full-deck review and max-five Lighter Plan behavior are unchanged.
- New EN/TR strings only; user-authored content unchanged. UI Foundation reused; touched Card stack routes opt into existing bottom safe-area. Missing Topic blocks only an invalid selected link and allows unlink/reselection without losing card text.
- Created components/memory/TopicLinkPicker.tsx and components/memory/TopicReviewEvidence.tsx. Modified FlashcardForm, Card new/edit and Topic detail, memoryRepo, useMemoryStore card/input fields, migration, EN/TR, four validators and these four project-memory files.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2: 21 PASS; Phase 3/localization: 85 PASS; Phase 4: 43 PASS; Phase 5: 15 PASS (164 total). Phase 3 was rerun after correcting its obsolete no-v10 assertion. Historical migration and SRS groups remain; source assertions are not runtime UI tests.
- No dependency/package/lockfile changes. Card update now checks existence/Deck ownership/affected rows rather than silently succeeding for a missing row. Evidence retains rating-time attribution; optional query errors never become false “no evidence”.
- Phase 5.1 implementation COMPLETE and merged; physical QA DEFERRED (not PASS). Phase 4.5/4.6/4.7 physical QA remains DEFERRED. Phase 5.2 phone/tablet physical QA PENDING, user-owned; no emulator/ADB/device automation performed.
- Master Phase 4 remains ACTIVE for documented deferred scope. Phase 5 ACTIVE; further Phase 5 work requires approval. Weak-topic scoring deferred; PDF/Gemini roadmap-only; broad localization DEFERRED.
- Next: user tests unlinked/linked Card create, edit/link/unlink and restart; rate while linked then inspect Topic evidence; relink without moving old evidence; delete Topic without losing cards/history; due/full-deck/max-five regression and phone/tablet keyboard/safe-area.

## Phase 5.1 checkpoint (historical)

## Phase 5.1 — Spaced repetition foundation — IMPLEMENTATION COMPLETE

- Branch phase-5-1-spaced-repetition-foundation from clean main bb443c3. Do not merge automatically.
- Schema v9: one additive flashcards.schedule_state column (unscheduled/learning/reviewing). Reuses interval (whole elapsed 24-hour days) and next_review (Unix ms). ease remains untouched/unused. Existing cards, compatibility values and review history are preserved, not replayed or retroactively scheduled.
- Unscheduled with no history = New; unscheduled with history = Previously reviewed, schedule not set. Both have unknown next review, never an invented historical due date. A real rating initializes scheduling.
- Again: learning state, interval reset to zero, next review exactly 10 minutes after rating. No same-session reinsertion. First non-Again rating, also after Again reset: Hard 1 day, Good 3 days, Easy 7 days.
- Subsequent reviewing intervals: Hard ×1.2, Good ×2, Easy ×3; Math.ceil with minimum previous interval +1 day. Dates always start at the new rating timestamp, including early/free reviews. Invalid rating/timestamp/state/interval or out-of-range date is rejected, never silently repaired.
- All ratings atomically insert history and update schedule in one SQLite transaction. Failure rolls both back, leaves answer visible, and permits retry; duplicate review ID cannot double-write. Existing store advances once after success.
- Separate Review due cards entry on Deck detail. Due (persisted next_review <= now) first by due time/created_at/id, then all unscheduled by created_at/id. Future scheduled cards excluded. Full-deck oldest-first and Lighter Plan max-five remain unchanged; all modes reschedule ratings.
- Due queue is a session snapshot, no automatic reinsertion. Retry/Review again rebuild with the same route mode. Empty due mode says no cards due/unscheduled, not missing cards. DB errors remain explicit.
- Deck panel shows due/new/previously-reviewed-unscheduled counts and next future review; card rows show scheduling state/next date. Refresh on screen focus/foreground/next future boundary, cleaned on blur. Only new EN/TR copy localized.
- Created utils/memoryScheduling.ts, components/memory/MemorySchedulePanel.tsx and scripts/validate-phase5.cjs. Modified migration, memoryRepo, useMemoryStore, Deck detail/review, FlashcardListItem, EN/TR, package script, existing validator current-version/wiring guards and four docs.
- Static: TypeScript EXIT 0, dependency tree EXIT 0; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS, Phase 5 8 PASS (157 total). Phase 3 final rerun passed after two stale source-wiring assertions were adapted; original regression groups retained. In-memory/source checks are not physical QA.
- No new dependencies or lockfile changes. No Topic ↔ Memory linkage (deferred to separately approved Phase 5.2), new store, mastery/retention percentage, weak-topic inference or quotas. Existing session-position bar remains session position only.
- Phase 4.5/4.6/4.7 physical QA DEFERRED, NOT PASS. Phase 5.1 phone/tablet physical QA PENDING, user-owned; no emulator/ADB/device automation.
- Master Phase 4 remains ACTIVE for previously documented deferred scope. Phase 5 ACTIVE, Phase 5.2 NOT STARTED. PDF/Gemini roadmap-only; broad localization DEFERRED.
- Next: user tests new/legacy-unscheduled distinction, all four ratings, persisted dates after restart, Again not reinserted, due/future selection, early full-deck rescheduling, max-five Recovery, empty/error/retry, EN/TR and phone/tablet safe-area/long text.

## Previous checkpoint (historical)

## Phase 4.7 — Generated exam planning — IMPLEMENTATION COMPLETE

- Branch phase-4-7-exam-planning from clean main b7b5662; do not merge automatically.
- Committee detail → /committees/exam-plan/[id]. Direct SQLite parent lookup, distinct missing/error/retry states and verified Committee/tab back fallback.
- On-demand plan uses every real Topic under the Committee: Subject created_at/id then Topic created_at/id. A names-only Committee-scoped query avoids paginated-list truncation and does not load objectives/history.
- Study days: today inclusive through day before exam exclusive, all local calendar days including weekends. Equal Topic counts; first days receive the remainder. Every Topic appears exactly once. Equal counts do not imply equal study time, priority or mastery.
- No persisted schedule/checkoff/debt. Rebuild on screen focus, app foreground and local midnight with focus-scoped cleanup, no polling. All Topics remain included even with study evidence. Missing/invalid date, exam today/past and no Topics have truthful states and safe exit.
- UI shows localized exam date, remaining study days, total Topics, Today and subsequent day cards. Shows 14 nonempty day sections initially with more on request; trailing days without assignments are explicitly counted. Phone single column, tablet constrained ScreenWrapper and bottom safe area.
- Topic buttons open existing Topic detail; its existing explicit linked-Focus action is reused. No new direct timer start or Focus redesign, completion signal, Calendar event, reminder, notification or sync.
- Created utils/examPlanRules.ts and app/committees/exam-plan/[id].tsx. Modified Committee detail, topicRepo, EN/TR catalogs, Phase 4 validator and four canonical docs.
- Schema remains v8; no migration, dependencies, new store or persistence. Static: TypeScript EXIT 0, dependency tree EXIT 0, Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS (149 total). All passed first run; static assertions are not device/UI QA.
- Phase 4.5/4.6 implementation COMPLETE and physical QA DEFERRED, NOT PASS. Phase 4.6 merged at b7b5662. Phase 4.7 phone/tablet QA DEFERRED, user-owned; no emulator/ADB/device automation.
- Master Phase 4 ACTIVE: original advanced weight/priority and broader progress/weak-topic goals remain deferred/unimplemented and require separate scope decisions; no claim of total Phase 4 closure. No mastery or percentages added.
- Phase 5 NOT STARTED; PDF/Gemini roadmap-only; whole-app localization DEFERRED.
- Next: user tests future/today/past/missing exam, no Topics, balanced ordering/all Topics, open Topic → linked Focus, unchanged plan after study, return/foreground/day rollover, direct back, EN/TR and phone/tablet long-text/safe-area.

## Previous checkpoint (historical)

## Phase 4.6 — Topic study evidence — IMPLEMENTATION COMPLETE

- Branch phase-4-6-progress-intelligence from clean main b016d2c. Do not merge automatically.
- Optional Focus → Topic only. Topic detail explicitly starts a standard Focus session using Profile duration and verified Topic → Subject → Committee context. Active sessions can only be continued, never replaced. Existing starts remain unlinked.
- Evidence means at least one linked concluded Focus row with positive integer actual duration and valid ending timestamp: completed/not-cancelled, or cancelled/not-completed with >=30 seconds (existing meaningful-cancel persistence policy). Discarded short cancellations and zero/invalid durations do not count.
- Exact EN/TR state: “Study activity recorded” / “Çalışma kaydı var”; otherwise “No study activity recorded yet” / “Henüz çalışma kaydı yok”. Lookup error is separate, retryable and never represented as no activity. Evidence refreshes on Topic screen focus.
- This is recorded activity only, not learned/unlearned, mastery, completion, weakness or a percentage. Learning objectives are never queried for evidence. No Subject aggregate.
- Schema v8: additive nullable focus_sessions.topic_id FK → topics(id), ON DELETE SET NULL. Legacy rows remain null; no retroactive links, new table/index or dependency. Topic/ancestor deletion preserves Focus history. Save revalidates optional context; deleted context saves unlinked, DB errors preserve the active session for retry.
- Minimal runtime Focus Topic ID/name context clears on teardown and ordinary starts. Pause/resume/break retain it; no Topic store, global curriculum cache or new persistence system.
- Changed: migrations, focusRepo, useFocusStore, Focus screen, Topic detail, EN/TR, Phase 2/3/4 validators, four canonical docs. Memory/Calendar/Dashboard unchanged.
- Static: TypeScript and dependency tree successful; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 39 PASS (145 total). Updated old SQL-placeholder/current-version assertions; relevant reruns PASS. Source/in-memory checks are not device QA.
- Phase 4.5 implementation COMPLETE and merged at b016d2c; physical QA DEFERRED, NOT PASS. Phase 4.6 phone/tablet physical QA DEFERRED, user-owned; NOT PASS. Older explicit QA statuses unchanged.
- Master Phase 4 ACTIVE. Memory linkage/weak-topic analysis deferred. Weight/priority, Phase 4.7 and Phase 5 NOT STARTED. PDF/Gemini roadmap-only; no visual redesign or broad localization.
- Next: user checks linked start/Committee context, normal unlinked start, finish/evidence/restart, zero and short/meaningful cancel, active protection, Topic deletion during/after Focus, error retry, phone/tablet layout. Await approval after handoff.

## Previous checkpoint (historical)

## Phase 4.5 — Topic learning objectives — IMPLEMENTATION COMPLETE

- Branch: phase-4-5-topic-learning-objectives, based on clean main a113842; do not merge to main automatically.
- Only optional Topic learningObjectives text implemented: outer trim, blank/missing becomes '', maximum 2000 UTF-16 units; internal newlines, Unicode, apostrophes and repeated lines preserved. Invalid runtime types are rejected.
- Additive transactional schema v6 → v7: topics.learning_objectives TEXT NOT NULL DEFAULT ''. Existing rows preserved with empty objectives; failure rolls back without advancing the version. No tables/indexes/FK changes.
- Topic repository maps and parameterizes the field. Parent ownership, creation timestamps, list/count behavior and hierarchy cascades unchanged.
- Topic create/edit reuse the existing save flow and UI Foundation with a secondary multiline field and new EN/TR labels/help/errors. Detail hides the section when empty. No extra route, required step or completion semantics.
- Modified: db/migrations.ts, models/curriculum.ts, utils/curriculumValidation.ts, db/repositories/topicRepo.ts, TopicForm.tsx, TopicEditor.tsx, app/topics/[id].tsx, i18n/en.ts, i18n/tr.ts, Phase 2/3/4 validators and four canonical docs. No new files or dependencies.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 35 PASS (141 total). In-memory DB tests and source assertions are not device/UI tests.
- Phase 4.1 COMPLETE. Phase 4.2/4.3/4.4 and UI Foundation 1 COMPLETE with user-confirmed phone/tablet physical QA PASS. Phase 4.4 merged to main at a113842.
- Phase 4.5 phone/tablet physical QA DEFERRED, user-owned; not PASS. No emulator/ADB/device automation performed. Earlier explicit Phase 3 QA gaps unchanged.
- Master Phase 4 ACTIVE. Weight/priority deferred. Phase 4.6/4.7 and Phase 5 NOT STARTED. No new store, progress/mastery, cross-module linkage or visual redesign.
- Whole-app localization DEFERRED; PDF/Gemini remains roadmap-only.
- Next: user checks Topic empty/populated objectives, restart persistence, edit/clear, multiline/TR/near-max text, conditional detail display and phone keyboard/tablet safe-area layout. Await approval before further work.

## Previous checkpoint (historical)

## Phase 4.4 — Curriculum integration / closure — IMPLEMENTATION COMPLETE

- Phase 4.4 merged to main at a113842; implementation branch was phase-4-4-curriculum-closure.
- Committee edit save/back resolves a verified Committee detail or Committees tab; error/missing states have safe exits. Android back listeners are focus-scoped and removed on blur.
- Subject detail/editor now use verified hierarchical dismissal, retaining known Committee context across missing-record/retry states and resetting context on route identity change.
- Committee detail revalidates on focus without polling. Committee edit retains mount-based loading so focus does not reset unsaved form input. Existing Subject/Topic pagination and real Topic COUNT remain unchanged.
- Committee edit/detail stack states use existing bottom-safe-area opt-in and scrolling; touched back labels are localized, minimum targets retained, edit heading can wrap.
- Committee delete title/body/cancel/action consistently use EN/TR. Actual hierarchy-only deletion and external records unchanged.
- Parameter checks reject non-string, blank and control-character inputs without UUID restrictions.
- Modified: Committee detail/edit, Subject detail/editor, subjectRoutes, EN/TR catalogs, Phase 2/4 validators and four canonical docs. No new files, repositories, stores, schema or package changes.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 31 PASS (137 total). Source assertions are not runtime UI tests.
- Phase 4.1 COMPLETE; Phase 4.2/4.3 and UI Foundation 1 COMPLETE with user-confirmed phone/tablet physical QA PASS.
- Phase 4.4 phone/tablet physical QA PASS, user-confirmed. No emulator/ADB/device automation. Existing unspecified Phase 3 gaps remain unchanged.
- Schema v6; Master Phase 4 ACTIVE. Future 4.5 Metadata, 4.6 Progress Intelligence and 4.7 Exam Planning NOT STARTED and require separate approval. Phase 5 NOT STARTED.
- Whole-app localization DEFERRED; PDF/Gemini roadmap-only; no visual redesign or cross-module linkage.
- Next: user checks only changed Committee return/refresh, direct edit/save/back/error/missing, Subject back/parent fallback, delete dialog language, large text and phone/tablet safe area.

## Previous checkpoint (historical)

## Phase 4.3 — Topic CRUD — IMPLEMENTATION COMPLETE

- Phase 4.3 merged to main at 7819215; implementation branch was phase-4-3-topic-crud.
- Topic create/detail/edit/delete use existing SQLite repositories and route-local state. Topic remains Subject-owned; parent Subject/Committee checked directly and again before saves.
- Subject detail retains its real COUNT and separate count-error handling; TopicList adds 50-row pages with one-row lookahead, first-page focus refresh and retryable failed offset without discarding earlier pages.
- UI Foundation Input/FormField/Section/FeedbackState reused. Name/description use shared trimmed 120/2000 UTF-16 limits; duplicate names allowed. Failed writes preserve drafts; double-submit guarded; navigation follows acknowledged writes.
- Topic is a leaf: delete warning mentions only the Topic. Missing/failed delete stays on-screen; verified Subject → Committee → Committees fallback never returns to a deleted Topic. Explicit and Android hardware back use focus-scoped safe exits.
- Small review fix: editor retains previously verified parent context across retries, clearing it only for a different route identity; fallback destinations are still revalidated.
- Created: app/topics/new.tsx, app/topics/[id].tsx, app/topics/edit/[id].tsx; components/curriculum/TopicForm.tsx, TopicEditor.tsx, TopicList.tsx; utils/topicRoutes.ts.
- Modified: Subject detail; EN/TR catalogs (Topic strings only); Phase 4 validator; four canonical docs. No repository/store/schema/package change.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 27 PASS (133 total). TypeScript/Phase 4 final rerun passed after the retry-context fix. Existing groups preserved; new UI checks are source wiring, not runtime/device tests.
- Phase 4.1/4.2 COMPLETE. Phase 4.2 phone/tablet PASS and UI Foundation 1 phone/tablet PASS are user-confirmed. Accumulated tablet regression PASS remains recorded separately from unspecified older Phase 3 gaps.
- Phase 4.3 physical phone/tablet QA PASS, user-confirmed; no emulator/ADB/device automation by this agent. Schema v6; no dependencies, cross-module Topic linkage or global cache.
- Phase 4.4 NOT STARTED; Master Phase 4 NOT COMPLETE. Master Phase 3 remains ACTIVE for remaining explicit QA gaps. Whole-app localization DEFERRED; PDF/Gemini roadmap-only; no visual redesign.
- Next action: user manual Topic create/restart/detail/edit/delete, duplicate/blank/long-name validation, Topic count refresh, direct/back routes, long text, phone safe area, tablet width and 50+ pagination. Await approval before further scope.

## Previous implementation checkpoints (historical)

## UI Foundation 1 — IMPLEMENTATION COMPLETE (2026-09-05)

- UI Foundation 1 merged to main at 89fd5ef; its implementation branch was ui-foundation-1.
- Added layout/interaction tokens, Input (multiline), FormField, Section and FeedbackState. Limited adoption: Subject form/editor/detail only. Button and useResponsive now read equal-valued tokens.
- Appearance preserved except explicit input focus border and polite error semantics. Subject queries, validation, count, mutations, deletion and navigation unchanged.
- Schema v6; no dependency/version/store/repository change. No visual redesign, Phase 4.3, broad localization or AI/PDF implementation.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 22 PASS (128 total). Phase 2 literal 44dp assertion updated to verify token wiring/value; relevant rerun passed. Phase 4 adds source-contract coverage, not simulated UI tests.
- Created: theme/layout.ts, theme/interaction.ts; components/ui/Input.tsx, FormField.tsx, Section.tsx, FeedbackState.tsx; docs/UI_FOUNDATION.md.
- Modified: SubjectForm/SubjectEditor/Subject detail; Button; useResponsive; Phase 2/4 validators; four canonical memory docs.
- User-confirmed Phase 4.2 phone PASS, tablet PASS, accumulated tablet regression checks PASS. These do not silently close unspecified older Phase 3 checklist items.
- UI Foundation 1 phone/tablet physical QA PASS, user-confirmed. No emulator/ADB/device automation performed by this agent.
- Phase 4.1/4.2 COMPLETE; Master Phase 3 ACTIVE for remaining explicit QA gaps; Master Phase 4 NOT COMPLETE; Phase 4.3 and Phase 5 NOT STARTED. Whole-app localization DEFERRED.
- Future PDF / Gemini Study Engine recorded in ROADMAP only: provider-neutral architecture, Gemini API initially, optional notebook/enterprise integration and other providers later subject to feasibility/approval. No implementation or API availability claim.
- Next: user checks Subject create/edit/detail, validation/error/loading, long text, phone safe area, tablet width and accessible controls; approve next scope separately.

## Phase 4.2 — Subject CRUD — IMPLEMENTATION COMPLETE

- Phase 4.1 remains COMPLETE. Phase 4.2 Subject create/detail/edit/delete now uses route-local state and existing SQLite repositories; no Subject/Topic Zustand store.
- Committee detail lists Subjects in 50-row pages, created_at ASC / id ASC, with one-row lookahead, retry and focus refresh. No Topic counts on list rows.
- Subject detail shows a real parameterized Topic COUNT, including valid zero and a distinct count error/retry. No Topic CRUD/list UI.
- Shared SubjectForm trims/validates name (required, <=120 UTF-16 units) and optional description (<=2000), allows duplicate names and preserves input on failed saves. Writes precede navigation; parent existence is checked.
- Direct routes load SQLite records, distinguish loading/missing/error, and have safe fallbacks. Deletes return to a valid parent or Committees tab, never the deleted Subject. Subject and Committee warnings explain hierarchy-only cascade and preservation of Focus/Memory/Calendar.
- New files: app/subjects/new.tsx, app/subjects/[id].tsx, app/subjects/edit/[id].tsx; components/curriculum/SubjectForm.tsx, SubjectEditor.tsx, SubjectList.tsx; utils/subjectRoutes.ts.
- Modified: Committee detail; topicRepo count helper; EN/TR catalogs (new Subject strings only); Phase 2/4 validators; four canonical docs.
- Schema remains v6; migrations, dependencies/package versions, Dashboard, domain stores and cross-module linkage unchanged. Whole-app localization remains DEFERRED.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 21 PASS (127 total). Existing data-layer groups retained; UI assertions are source-wiring checks, not runtime/device tests.
- Narrow fixes during validation: new-route address typing; old Committee-delete back assertion updated for safe dismissal; save-order assertion scoped to save handler.
- Physical/manual Phase 4.2 phone/tablet QA PASS, user-confirmed; accumulated tablet regression checks PASS. No emulator/ADB/device automation performed by this agent.
- Master Phase 3 remains ACTIVE for unchanged physical QA debt. Master Phase 4 NOT COMPLETE. Phase 4.3 Topic CRUD and Phase 5 NOT STARTED.
- Phase 4.2 merged to main at e22cf4e. Next action: UI Foundation 1 user QA; await explicit approval before Phase 4.3 or visual redesign.

Manual checklist: create, restart persistence, edit, delete warning/cascade, Topic count, direct routes/back, long names, phone/tablet bottom safe area.

## Previous checkpoints (historical)

**Last Updated:** 2026-09-05  
**Checkpoint Phase:** Phase 4 — Medical School / Committee Engine (before Phase 4.2)
**Current Status:** Phase 4.1 curriculum data foundation implementation and static closure complete; Phase 4.2 Subject CRUD not started; Master Phase 3 remains active only because remaining physical QA is pending

## Phase Status

**Product-first working policy (2026-09-05):** The user owns ALL physical/manual QA. AI work is scoped product implementation plus concise TypeScript, dependency-tree, Phase 2, Phase 3, and Phase 4 static checks. No emulator/ADB/device/UI automation or QA-environment setup/debugging. Run each static command once; allow one final rerun after a small code fix. Environment failures: maximum two attempts, then record PENDING. Do not change physical status without an explicit user result. Stop at the approved scope; no automatic new phase.

Product development has priority. Whole-app Turkish localization is **intentionally deferred** until the product is much closer to completion. Do not continue CRUD or Calendar localization now.

**Progress context:** Overall master-roadmap progress is approximately 40% (user estimate, not a measured completion score). Working-app/MVP maturity is substantially further along. Phase 1/2 and Phase 3.1–3.6 implementation are complete; Master Phase 3 is ACTIVE pending physical QA; Phase 4.1 is complete; Phase 4.2 and Phase 5 have not started.

## Dashboard localization — COMPLETE in source, 2026-09-05

- Dashboard headings/greetings, Quick Start branches, Committee status/exam timing, Focus/Memory summaries, agenda, loading/empty/partial-error/retry copy and accessibility now use the existing English/Turkish catalogs.
- Dynamic counts, durations and local dates follow the selected language. User-authored names are untouched. Dashboard rules gained raw presentation metadata only (time, days, response count, Committee name); selection, sorting, fixed 25-minute start, 2-minute entry, active protection, queries and refresh lifecycle are unchanged.
- Files changed: `app/(tabs)/index.tsx`; four `components/dashboard/*.tsx` cards; `utils/dashboardRules.ts`; `i18n/en.ts`, `i18n/tr.ts`; `scripts/validate-phase3.cjs`; these four project-memory documents. No new files.
- Static validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 **21 PASS**; Phase 3/localization **85 PASS**; **106 checks total**. All existing groups retained. A new literal-copy scan initially matched TypeScript syntax; narrowed it to JSX text and the one final Phase 3 rerun passed.
- At that checkpoint SQLite schema was **v5**; current schema is **v6** after Phase 4.1. Preference persistence and domain stores were unchanged by Dashboard localization.
- AI performed **no emulator or physical QA**. Remaining localization QA is **deferred** with whole-app localization.
- Whole-app localization remains partial and is **deferred** by user decision. Do not continue CRUD/Calendar localization as the next product task.
- Phase 1/2 complete; Phase 3.1–3.6 implementation complete; Master Phase 3 **ACTIVE** only for remaining physical exit gates; Phase 4.1 **COMPLETE**; Phase 4.2 **NOT STARTED**; Phase 5 **NOT STARTED**.

Manual Dashboard checklist: switch English/Turkish and check immediate copy updates; check no mixed built-in text; try Quick Start / Start Small / Check-In / Continue Focus; check long Turkish text and bottom safe area.

Physical statuses preserved: Phase 3.2 phone/tablet PASSED; Phase 3.3 phone PASSED/tablet PENDING; Phase 3.4–3.6 phone/tablet PENDING. Consolidated closure QA remains pending.

| Phase | Status | Evidence |
|---|---|---|
| Phase 1 — Foundation / Scaffold | Complete | Six-tab Expo Router shell, shared theme/responsive UI, SQLite, repositories, Zustand |
| Phase 2.1 — Committee | Implementation complete | CRUD, direct ID loading, acknowledged writes, local-date status, retries |
| Phase 2.2 — Focus | Implementation complete | Timestamp lifecycle, overtime, persistence, Committee link, history |
| Phase 2.3 — Memory / Flashcards | Implementation complete | Deck/card CRUD, review flow/history, transactional cleanup |
| Phase 2.4 — Calendar & Study Timeline | Implementation complete | Month/agenda, manual events, derived cross-module timeline |
| Phase 2.5 — Dashboard / Daily Overview | Implementation complete | Truthful bounded queries, deterministic Quick Start, refresh lifecycle |
| Phase 2.6 — Profile Minimum + Closure Fixes | Implementation complete | Profile preferences, recovery/retry coverage, Committee and migration hardening |
| Master Phase 2 exit | Complete | Full physical Expo Go 57 walkthrough passed; the final Profile restart-persistence fix was retested successfully |
| Phase 3.1 — Start Small / Two-Minute Entry | Complete | Atomic two-minute entry, runtime-only mode, milestone choices, Dashboard action, regression harness, physical Expo Go 57 QA passed |
| Phase 3.2 — Optional Check-In & Adaptive Session | Complete | Runtime-only Energy/Attention flow, deterministic duration suggestion, explicit adaptive start, regression harness, Android phone/tablet Expo Go 57 QA passed |
| Phase 3.3 — Lighter Plan / Recovery | Implementation complete; phone QA passed; tablet QA pending | User-invoked runtime-only plan, deterministic real actions, bounded five-card review, safe Calendar event opening, active Focus protection |
| Phase 3.4 — Gentle Return / Distraction Support | Implementation complete; device QA pending | Active-Focus-only inline support, explicit timestamp-derived two-minute break, same-session resume, no detection/history/persistence |
| Phase 3.5 — Low-Stimulation / Gentle Nudge Preferences | Implementation complete; device QA pending | Profile-owned persisted preferences, active-Focus-only calmer presentation, Gentle Nudges stored with no current behavior |
| Phase 3.6 — Integration / Accessibility / Phase 3 Closure | Implementation complete; device QA pending | Final copy/contrast/accessibility integration, safe standalone navigation, shared stack bottom safe area, focus-scoped Recovery lifecycle |
| Phase 4.1 — Curriculum data foundation | Implementation complete | Schema v6 subjects/topics, FK-on client, hierarchy-only cascade, repositories, Phase 4 harness; no UI/store/linkage |
| Phase 4.2 — Subject CRUD | Not started | Subject create/edit/detail UI and store are out of Phase 4.1 scope |

## Phase 3.6 Completed Implementation

- Final copy is consistent: the Check-In two-minute CTA is `Start small · 2 min`; Memory hints now use truthful recall wording; summary text remains `Ratings are saved locally.`; and `Review again` uses sentence case.
- Review exits are destination-aware. Recovery reviews say `Back to lighter plan`; normal reviews say `Back to deck`. Both preserve valid back history and use safe direct-route fallbacks to Lighter Plan or the deck detail route.
- Recovery-mode missing or empty decks no longer invite card authoring. They explain availability truthfully and return to Lighter Plan; normal empty-deck authoring remains available.
- Calendar detail preserves normal back behavior when history exists and safely returns direct routes to the Calendar tab when it does not.
- Recovery candidate refresh, AppState listener, Calendar boundary timeout, and hardware-back listener now mount only while Recovery is focused. No polling or selection-rule change was added.
- `ScreenWrapper` now offers an opt-in bottom safe-area edge for standalone stack screens. Check-In, Lighter Plan, Memory review, and Calendar detail opt in; tab screens keep the unchanged default and do not double-count the Android tab-bar inset. Recovery's route-local manual bottom padding was removed.
- Energy, Attention, and Check-In duration choices use radio-group/radio/checked semantics without changing selection or recommendation behavior.
- The Focus timer exposes a descriptive state-aware accessibility label without becoming a live region. Timer numerals retain one-line fitting with a bounded font-size fallback for narrow phones, large system text, and hour-format sessions.
- Review close/back controls now have explicit button semantics and 44dp sizing. Review complete/empty states scroll, essential deck titles may wrap to two lines, and redundant decorative review/Calendar back icons are hidden from accessibility.
- Narrow contrast corrections set muted text to `#7C8BA1`, inverse primary-button text to `#000000`, ghost-button text to the readable secondary token, and selected labels/checks/primary badges on muted primary surfaces to primary text where needed.
- Gentle Nudges now states explicitly that MedOS does not use the preference yet and sends no reminders or notifications. `Low-stimulation mode` naming and behavior are unchanged.
- No Focus, Check-In, Recovery, Gentle Return, Memory rating, Low-Stimulation, persistence, or hydration behavior changed during Phase 3.6. Phase 4.1 later added schema v6 curriculum tables only; it did not change Phase 3 study-support behavior.
- Phase 3.6 implementation is complete. Physical phone and tablet QA have not been performed or claimed; Master Phase 3 remains active.

## Phase 3.5 Completed Implementation

- Profile now contains one full-width `Study support` card below the existing duration and daily-goal cards. It remains a single constrained card on large tablets rather than becoming a third side-by-side panel.
- `Low-stimulation mode` and `Gentle nudges` are strict boolean preferences in the existing AsyncStorage-backed `useAppStore`; both default to Off and only literal persisted `true` values enable them.
- Existing hydration protection remains intact: writes stay paused before a successful read, remain paused after a read failure, and resume only after a successful retry. Old or malformed stored values fall back safely.
- The presentation-only `PreferenceToggleRow` uses a native Switch, visible On/Off text, wrapping copy, explicit accessibility state, and practical touch sizing. The store remains the only source of truth, including during rapid toggles.
- Low-Stimulation is read directly from `useAppStore` by Focus and is applied only while a Focus session is active. Idle Focus setup, Dashboard, Check-In, Lighter Plan, Memory, Calendar, Profile theme, navigation, and shared theme tokens are unchanged.
- The active timer retains status, elapsed/overtime semantics, and Committee context while using a neutral badge, normal primary text, calmer sizing, a regular bordered surface, and a shorter minimum card height. Only the non-essential planned-time sentence is hidden.
- Entry milestones and Gentle Return retain every action, state transition, accessibility announcement, and timer behavior while using neutral cards, omitting decorative header icons, and using neutral countdown text.
- Session controls remain complete: Pause, Resume, Finish, Cancel, and `I got distracted` are not removed or behaviorally changed.
- `gentleNudgesEnabled` is storage-only in Phase 3.5. It is not consumed outside Profile and adds no permissions, notifications, reminders, push tokens, background jobs, sound, vibration, or prompt changes.
- No automatic enabling, behavior inference, analytics, usage history, timestamp tracking, cloud behavior, AI, new theme system, SQLite setting, migration, or dependency was added.
- Created `components/profile/PreferenceToggleRow.tsx`; modified only the app preference layer, Profile, active Focus presentation components, validation harnesses, and canonical documentation.
- Phase 3.5 implementation is complete. Physical phone and tablet QA have not been performed or claimed.

## Phase 3.4 Completed Implementation

- The active Focus screen now exposes one low-emphasis `I got distracted` action. It is absent from Dashboard, Check-In, Lighter Plan, Memory, Calendar, and idle Focus setup.
- Opening the inline `GentleReturnCard` changes no Focus timer field. The main timer remains visible while the normal active-session controls or entry milestone are temporarily replaced.
- Running and overtime sessions offer `Return to focus`, `Take a 2 min break`, and `Not now`. A normal manually paused session offers only `Return to focus` and `Stay paused`.
- Starting the explicit break atomically preserves accumulated Focus time, pauses the existing session once, and stores only `gentleBreakStartedAt` in the runtime Focus store. Duplicate taps cannot replace the original timestamp.
- Break time remaining is derived from `Date.now()` against a fixed 120-second duration. Background time stays accurate, foreground return recalculates immediately, and reaching zero never auto-resumes Focus.
- Returning resumes the same existing session, preserves its original timestamps, target, mode, Committee link, and entry milestone flags, and clears the break marker only after a valid resume.
- Finish, meaningful Cancel, false-start Cancel, and Reset reuse existing teardown behavior and clear the runtime break marker. No new Focus row type or persistence behavior was added.
- Entry-mode and overtime sessions retain their exact semantics. Break time does not count as Focus time, and milestone state reappears unchanged after Gentle Return closes.
- The active Focus workspace is now scrollable for wrapped copy and large text while retaining its constrained centered phone/tablet layout and existing safe-area handling.
- Countdown accessibility uses a descriptive label without announcing every second and emits at most one polite completion announcement per break.
- There is no automatic distraction detection, sound, vibration, notification, distraction/break history, analytics, telemetry, Recovery change, task breakdown, schema change, or dependency change.
- Phase 3.4 implementation is complete. Physical phone and tablet QA have not been performed or claimed.

## Phase 3.3 Completed Implementation

- Every valid completed Check-In recommendation shows one low-emphasis `Choose a lighter plan` action. No permanent Dashboard entry was added.
- `app/study-support/recovery.tsx` is a safe standalone route with exact calm copy, explicit back/close behavior, and a one-to-three-action responsive layout.
- When Focus is idle, actions are derived in the fixed order `Start small · 2 min`, `Review up to 5 cards`, then `Open study event`; unavailable actions are omitted and the two-minute action is the truthful fallback.
- Any running, paused, overtime, or active entry session replaces the entire choice set with `Continue Focus`. The existing timer is never reset or replaced.
- The Focus action reuses `startEntrySession()`, displays valid inherited Committee context, allows removing it, and revalidates it immediately before starting. Stale context becomes unlinked; lookup errors offer Retry and unlinked continuation.
- The Memory candidate reuses the existing seven-local-day Again/Hard signal and its established tie-breakers, then falls back to the most recently updated non-empty deck (`updated_at DESC`, `id ASC`).
- Recovery review reuses the existing deck review route with an optional repository limit of five. Initial load, retry, and Review Again preserve the limit; cards remain ordered by `created_at ASC`, then `id ASC`.
- The touched review path verifies the deck before loading cards, so a deleted deck produces a truthful unavailable state. Existing SQLite-write-before-advance rating behavior is unchanged.
- Memory summary copy now truthfully states `Ratings are saved locally.` and makes no scheduling claim.
- The Calendar action considers only manual events for the current local date, ordered as ongoing timed, all-day, then next future timed. Passed timed events are excluded and ties are stable.
- Calendar eligibility refreshes on route focus, app foreground, local midnight, and the next relevant event start/end boundary without polling. The selected event is revalidated before navigation.
- Optional Memory or Calendar query errors do not block the Focus fallback and expose a calm retry.
- Lighter Plan candidates are route-local only. No Recovery history, completion score, analytics, micro-steps, persisted Zustand state, AsyncStorage entry, table, column, index, or migration was added.
- Phone uses a centered single column. Tablet portrait remains one constrained column; large-tablet landscape may place Memory and Calendar side by side while preserving Focus-first reading order.
- Phase 3.3 implementation is complete. Android phone Expo Go 57 QA passed as user-confirmed; tablet QA remains pending.

## Phase 3.2 Completed Features

- Dashboard adds one tertiary `Not sure what fits? Check in` entry only while Focus is idle; primary Quick Start and `Start small · 2 min` retain their established hierarchy and behavior.
- The standalone check-in route uses two short steps: Energy (`Low / Steady / Good`) followed by Attention (`Scattered / Okay / Focused`).
- The exact approved nine-cell matrix is implemented in one pure utility and returns no suggestion for incomplete or unknown values.
- Answers, selected duration, freshness timestamp, and optional Committee context live only in a non-persisted Zustand runtime store.
- A completed or partial check-in expires after two elapsed hours, at device-local midnight, or when a negative clock age is detected.
- Suggestions remain advisory. Answering, viewing a recommendation, or selecting an override never starts Focus.
- The compact override list is exactly 2, 15, 25, and 45 minutes; normal Focus setup remains available for the Profile default and 60 minutes.
- Two-minute starts reuse the Phase 3.1 entry action. Fifteen, twenty-five, and forty-five-minute starts use one atomic standard adaptive action that refuses non-idle Focus.
- Valid inherited Committee context is shown before starting and can be removed. Context is revalidated; stale references are cleared and lookup failures offer retry or unlinked continuation.
- Successful starts clear the check-in. Refused/failed starts preserve the recommendation for retry.
- Skip opens normal Focus setup; explicit close and Android hardware back clear the check-in and return to Dashboard.
- The route revalidates expiry on foreground return and schedules the earliest two-hour/local-midnight expiry while open.
- New controls include practical touch targets, explicit accessibility labels, non-color selection indicators, wrapping content, and a single polite recommendation announcement.
- No database, migration, dependency, package-version, Profile, Focus persistence, or active-timer recovery change was made.

## Phase 3.1 Completed Features

- Dashboard retains its existing deterministic primary Quick Start and adds a clearly secondary `Start small · 2 min` action only while Focus is idle.
- An atomic `startEntrySession` action creates one timestamp-based 120-second session and refuses to replace an active or paused session.
- A requested Dashboard Committee link is verified against SQLite; deleted, stale, or unavailable optional context becomes an unlinked session without changing Committee data.
- `standard` / `entry` session mode and milestone assistance are runtime-only and never enter the persisted Focus row.
- The two-minute milestone is derived from real elapsed time, including temporary background time, and never auto-finishes or auto-persists.
- `Finish here` uses the existing successful Focus persistence path with a 120-second planned duration.
- `Keep going` preserves timestamps and the 120-second target while continuing normal overtime.
- `Continue to X min total` uses the normalized current Profile default as the total target without resetting elapsed time or creating another session.
- Entry sessions preserve the existing pause/resume and under-30-second cancellation rules.
- The milestone includes explicit accessible labels, wrapping content, practical touch targets, and a once-per-session polite accessibility announcement.
- Phase 3.1 remained intact during Phase 3.2; no Recovery, distraction, nudge, low-stimulation, Subject, Topic, AI, reward, or spaced-repetition feature was started.

## Phase 2 Exit Blocker Fix — 2026-09-03

- Physical-device QA passed every other Phase 2 exit check. Only `defaultFocusSec` and `dailyFocusGoalMin` reverted after a full Expo Go/app restart.
- Root cause: Zustand persist invokes storage writes after every store mutation. The pre-hydration callback and startup database-state mutations could therefore write partialized default preferences before AsyncStorage's first asynchronous read completed.
- Fix: app-store `setItem` calls remain paused until preference hydration succeeds. Hydration failure keeps writes paused, and a retry re-enables them only after a successful read.
- The pre-hydration state mutation that directly triggered an early default-state write was removed.
- Defaults now apply only when no saved value exists or a stored value is invalid. A persisted `null` daily goal remains valid.
- The retained harness recreates the startup race and verifies serialization, store re-creation, valid values, `null`, malformed fallback, and exclusion of runtime-only fields.
- No Profile UI, Focus product behavior, database schema, dependency, or package version changed.

## Phase 2.6 Completed Features

### Profile

- Replaced the former placeholder with a small functional Profile screen.
- `defaultFocusSec` supports only 15, 25, 45, or 60 minutes.
- `dailyFocusGoalMin` supports None, 30, 60, 90, or 120 minutes.
- Both preferences persist through the existing Zustand/AsyncStorage app store.
- Persisted values are normalized during hydration; invalid legacy values fall back safely.
- Preference hydration has explicit loading, calm failure, and retry states.
- Database and hydration errors remain runtime-only and are not written to AsyncStorage.
- Persist writes are hydration-safe, preventing startup runtime updates from replacing stored preferences.
- The UI truthfully explains that preferences and study records remain local.
- Inert Dark Mode, notification, break, export, clear-data, avatar, and future-phase controls were removed.

### Focus integration

- Fresh or reset Focus-tab setup uses the hydrated Profile default.
- Changing the preference cannot replace an active running, paused, or overtime session.
- The internal reset action also refuses to reset a non-idle timer.
- Dashboard Quick Start remains an explicit fixed 25-minute action and still preserves any active timer.
- Existing Focus completion, cancellation, false-start, history, and overtime semantics are unchanged.
- Idle Focus-history errors now provide an explicit retry action.

### Committee reliability

- Detail and edit routes query SQLite by ID and no longer depend on a preloaded Committee list.
- Direct routes expose loading, loaded, not-found, database-error, and retry states rather than returning a blank screen.
- Create, edit, and delete actions now return success/failure results.
- Screens navigate only after SQLite reports success; failed writes preserve the current screen and form data.
- Repository update/delete methods verify that a row was actually changed.
- Committee status and countdowns use device-local calendar dates. The local exam date remains `Exam today` for the entire day.
- Committee, Dashboard, and Calendar now share the same local-date arithmetic primitives.
- Future-phase locked sections were removed from Committee detail.
- Committee list loading now includes a retry action.

### Database recovery and migrations

- Root navigation is protected by a centralized database initialization gate.
- Initialization failures offer an in-app retry without restart, reset, or automatic data deletion.
- Concurrent/stale initialization attempts cannot overwrite a newer retry result.
- Migration v2 and v3 now inspect `PRAGMA table_info` before every additive column change.
- V2/v3 column changes and schema-version updates run in transactions.
- A real ALTER failure rolls back and cannot falsely advance `_schema_version`.
- V4/v5 guarded behavior is preserved. At Phase 2.6 close schema was v5; Phase 4.1 later added additive v6 curriculum tables.
- No repair migration was introduced for missing v5 columns; no actual missing-column v5 database was discovered in the workspace.

### Closure UX and validation

- Memory top-level load errors now provide one retry for decks, recent reviews, and Committee context.
- Shared buttons now provide a meaningful default accessibility label and a minimum 44dp height.
- Touched icon buttons and Committee form fields received explicit labels and practical touch/input sizes.
- Phone, small-tablet, and large-tablet layout branches remain in place.
- `scripts/validate-phase2.cjs` provides a retained, dependency-free closure harness.

## Phase 4.1 Completed Implementation

- Additive schema **v6** creates empty `subjects` and `topics` tables with required identity/name/description/timestamps, parent foreign keys, and `ON DELETE CASCADE` only inside the Committee → Subject → Topic hierarchy.
- Order indexes are `idx_subjects_committee_order (committee_id, created_at, id)` and `idx_topics_subject_order (subject_id, created_at, id)`.
- v6 is transactional, additive, and non-destructive: no ALTER/DROP of existing tables, no data rewrite, and a preexisting `subjects`/`topics` name conflict aborts without repair.
- `db/client.ts` enables and verifies `PRAGMA foreign_keys = ON` before caching the connection; a failed enablement closes the handle and is not cached.
- `subjectRepo` / `topicRepo` validate parents, names, descriptions, and timestamps; lists are parent-scoped, bounded, and stably ordered; missing/mismatched updates and deletes return false.
- Deleting a Subject cascades only its Topics. Deleting a Committee cascades only Subjects/Topics. Existing Focus, Deck/Card/Review, and Calendar rows are preserved.
- No Subject/Topic Zustand store, Expo Router UI, or Focus/Memory/Calendar `subject_id`/`topic_id` linkage. No new dependency or package version. The only added package script is `validate:phase4`.
- Phase 4.1 implementation is complete. Phase 4.2 Subject CRUD is not started. Physical QA remains user-owned and was not performed for this closure.

## Current Architecture

### Navigation

- Root: `app/_layout.tsx` initializes SQLite and renders `DatabaseGate` until local data is ready.
- Tabs: Dashboard, Committees, Focus, Memory, Calendar, Profile.
- Direct Committee routes: create, detail by ID, and edit by ID.
- Deck/card/review and Calendar manual-event routes remain unchanged.
- Study support: `app/study-support/check-in.tsx` is a safe standalone runtime-only Energy/Attention suggestion flow.
- Lighter Plan: `app/study-support/recovery.tsx` derives bounded Focus, Memory, and manual Calendar actions without persisting Recovery state.
- Gentle Return: the active Focus screen renders `components/focus/GentleReturnCard.tsx` inline; there is no new route or modal.

### Persistence responsibilities

| Data | Persistent source | Reactive/runtime layer |
|---|---|---|
| Committees | SQLite `committees` | `useCommitteeStore` |
| Focus history | SQLite `focus_sessions` | `useFocusStore` |
| Decks/cards/reviews | SQLite Memory tables | `useMemoryStore` |
| Manual study plans | SQLite `calendar_events` | `useCalendarStore` |
| Dashboard snapshot | Not persisted; repository-derived | `useDashboardStore` |
| Profile preferences, including Low-Stimulation and Gentle Nudges | AsyncStorage through Zustand persist | `useAppStore` |
| Active Focus timer | Not persisted every second | `useFocusStore` runtime timestamps |
| Current Gentle break | Not persisted | `useFocusStore.gentleBreakStartedAt` runtime timestamp only |
| Current study check-in | Not persisted | `useStudySupportStore` runtime only |
| Current Lighter Plan candidates | Not persisted | Recovery route-local state only |
| Subjects / Topics | SQLite `subjects`, `topics` | Repositories only in Phase 4.1; no Zustand store |

### Database schema

- Current schema version: **v6**.
- Phase 3.2 through Phase 3.6 added no table, column, or index. Phase 4.1 added additive curriculum tables only.
- V2 Committee columns: `description`, `start_date`, `exam_date`, `updated_at`.
- V3 Focus columns: `actual_duration_sec`, `cancelled`.
- V4 Memory metadata/review history remains unchanged.
- Legacy flashcard scheduling columns `interval`, `ease`, and `next_review` remain compatibility-only and hidden.
- V5 Calendar `event_date`, `updated_at`, and existing bounded-query indexes remain unchanged.
- V6 `subjects` and `topics` are empty on upgrade; legacy Committee/Deck `subject` text is compatibility-only and is not migrated into relations.
- Cross-module Committee, Focus, and Memory rows are never copied into Calendar or Dashboard tables.

### Date handling

- Date-only keys use local `YYYY-MM-DD` components and never `new Date('YYYY-MM-DD')` parsing.
- Calendar-day differences use civil-date ordinals rather than elapsed milliseconds divided by 24 hours.
- Unix timestamps remain appropriate for actual Focus and review activity.
- No Türkiye-only timezone is hard-coded.

## Roadmap Alignment

- Phase 3 is **ADHD Intelligence Layer** (implementation complete; physical exit gates pending).
- Phase 4 is **Medical School / Committee Engine**. Phase 4.1 data foundation is complete. Phase 4.2 Subject CRUD has not started.
- Phase 5 is **Memory & Learning Engine** and has not started.
- Phase 2 interprets basic study items as persisted manual study-plan events optionally linked to a Committee.
- Whole-app localization is deferred by user decision and is not the next product task.

## Latest Validation

```powershell
.\node_modules\.bin\tsc.cmd --noEmit
```

Result: **EXIT 0** — zero TypeScript errors.

```powershell
npm.cmd ls --depth=0
```

Result: **EXIT 0** — installed dependency tree valid.

```powershell
npm.cmd run validate:phase2
```

Result: **EXIT 0** — 21 grouped Phase 2 checks passed, including schema v6 reachability from a clean install.

```powershell
npm.cmd run validate:phase3
```

Result: **EXIT 0** — 85 grouped Phase 3.1–3.6 plus localization static/in-memory checks passed.

```powershell
npm.cmd run validate:phase4
```

Result: **EXIT 0** — 16 grouped Phase 4.1 checks passed (FK enablement, additive v6, v5 upgrade preservation, rollback, conflict-without-repair, hierarchy-only cascade, repositories, no UI/store/linkage/new dependency).

No dependency or package version changed during this Phase 4.1 closure. Git working tree may include documentation updates from this audit.

## Unresolved Issues / Known Warnings

- The full physical Expo Go 57 Phase 2 exit walkthrough passed, including the focused restart-persistence retest for `defaultFocusSec` and `dailyFocusGoalMin`.
- Phase 3.1 focused physical Expo Go 57 device QA passed for Start Small, timer lifecycle, background timing, milestone choices, persistence, Dashboard refresh, duplicate protection, and cancellation behavior.
- Phase 3.2 Android phone and tablet Expo Go 57 QA passed, as confirmed by the user.
- The Android bottom safe-area fix passed physical phone and tablet retests, as confirmed by the user.
- Phase 3.3 Android phone Expo Go 57 QA passed as user-confirmed; Phase 3.3 tablet QA remains pending.
- Phase 3.4 has not yet received focused physical Expo Go 57 phone or tablet QA; implementation/static success is not presented as device evidence.
- Phase 3.5 has not yet received focused physical Expo Go 57 phone or tablet QA; implementation/static success is not presented as device evidence.
- Phase 3.6 has not yet received focused physical Expo Go 57 phone or tablet QA; implementation/static success is not presented as device evidence.
- The previously verified Android bottom tab-bar safe-area fix remains unchanged. A consolidated post-Phase-3.6 safe-area regression walkthrough is still pending as part of the Master Phase 3 physical exit gate.
- The Expo device database is outside this source workspace. Phase 4.1 added additive v6 curriculum tables; a preexisting `subjects`/`topics` name conflict aborts without repair. No destructive v6 data-repair migration exists.
- Active Focus survives rerenders, navigation, intervals, and temporary backgrounding, but a full Android process kill still clears its intentionally runtime-only active state.
- Committee and Calendar dates remain validated text inputs to avoid dependency expansion.
- The retained migration harness uses the built-in SQLite support in the current Node 24 environment.
- Existing environment notes remain: an SDK 57-compatible Expo Go Android build is required, and no forced dependency/audit changes were made.

## Android Bottom Tab-Bar Safe-Area Fix — 2026-09-03

### Bug

On a physical Android phone the MedOS bottom tab bar overlapped the Android system navigation area (gesture bar or 3-button buttons). Tab icons and labels sat behind the system navigation zone.

### Root Cause

`app.json` has `"edgeToEdgeEnabled": true` for Android, which instructs React Native 0.86 to draw the app behind the system navigation bar. `app/(tabs)/_layout.tsx` used hardcoded tab bar `height: 64` and `paddingBottom: Spacing.sm` for Android phones with no safe-area inset awareness — the device-reported bottom inset was never applied, so the tab bar content occupied space that the system navigation bar also occupied.

### Fix

- Added `import { useSafeAreaInsets } from 'react-native-safe-area-context'` to `app/(tabs)/_layout.tsx`.
- Called `useSafeAreaInsets()` in `TabLayout`.
- Computed `androidBottomInset = Platform.OS === 'android' ? insets.bottom : 0` — zero on iOS so iOS heights are unchanged and there is no double-counting.
- `tabBarHeight = baseTabBarHeight + androidBottomInset` and `tabBarPaddingBottom = baseTabBarPaddingBottom + androidBottomInset`.
- The device-reported inset is authoritative, so both gesture navigation and 3-button navigation are handled correctly without any hardcoded device or manufacturer values.
- No new dependency was added; `react-native-safe-area-context` is already in the project and already wraps the app via `SafeAreaProvider` in `app/_layout.tsx`.

### Files Modified

- `app/(tabs)/_layout.tsx` — safe-area inset awareness added.
- `docs/PROJECT_STATUS.md` — this update.
- `docs/LAST_AGENT_REPORT.md` — this fix recorded.

### Schema / Dependency Changes

None at the time of this fix. Later Phase 4.1 advanced schema to v6. No package was added, removed, or version-changed by the tab-bar fix.

### Validation and Physical Retest

- `useSafeAreaInsets` declared as `(): EdgeInsets` in `react-native-safe-area-context` type declarations — verified against installed `node_modules`.
- `EdgeInsets.bottom: number` — arithmetic with numeric base heights is type-safe.
- Import path `'react-native-safe-area-context'` matches the existing import in `ScreenWrapper.tsx` — consistent with established project patterns.
- `tsc --noEmit`, `npm.cmd ls --depth=0`, `validate:phase2`, and `validate:phase3` all pass in the current workspace.
- Phase 3.2 behavior (Dashboard check-in entry, Energy/Attention flow, adaptive recommendation matrix, runtime-only store, Committee context, active-session protection, Phase 3.1 entry mode) is completely unchanged.

### Physical Retest Result

- Android phone retest: **PASSED** (user-confirmed).
- Android tablet retest: **PASSED** (user-confirmed).

## Exact Next Recommended Action

**Phase 4.2 — Subject CRUD implementation planning/approval.**

Do not implement Phase 4.2 until that planning/approval step is explicit. Do not resume whole-app localization. Master Phase 3 remains active only because remaining physical phone/tablet and safe-area QA is pending and user-owned. Phase 5 has not started.
