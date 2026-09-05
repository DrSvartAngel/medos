# MedOS — Development Roadmap

## Phase 4.4 — Curriculum integration / closure — IMPLEMENTATION COMPLETE

- Branch: phase-4-4-curriculum-closure, based on clean main 7819215; no merge to main.
- Committee edit save/back resolves a verified Committee detail or Committees tab; error/missing states have safe exits. Android back listeners are focus-scoped and removed on blur.
- Subject detail/editor now use verified hierarchical dismissal, retaining known Committee context across missing-record/retry states and resetting context on route identity change.
- Committee detail revalidates on focus without polling. Committee edit retains mount-based loading so focus does not reset unsaved form input. Existing Subject/Topic pagination and real Topic COUNT remain unchanged.
- Committee edit/detail stack states use existing bottom-safe-area opt-in and scrolling; touched back labels are localized, minimum targets retained, edit heading can wrap.
- Committee delete title/body/cancel/action consistently use EN/TR. Actual hierarchy-only deletion and external records unchanged.
- Parameter checks reject non-string, blank and control-character inputs without UUID restrictions.
- Modified: Committee detail/edit, Subject detail/editor, subjectRoutes, EN/TR catalogs, Phase 2/4 validators and four canonical docs. No new files, repositories, stores, schema or package changes.
- Static: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 31 PASS (137 total). Source assertions are not runtime UI tests.
- Phase 4.1 COMPLETE; Phase 4.2/4.3 and UI Foundation 1 COMPLETE with user-confirmed phone/tablet physical QA PASS.
- Phase 4.4 phone/tablet physical QA PENDING, user-owned. No emulator/ADB/device automation. Existing unspecified Phase 3 gaps remain unchanged.
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

> MedOS is an ADHD-oriented medical-school study OS for Android phones and tablets.

## Future initiative — PDF / Gemini Study Engine (NOT STARTED)

Architecture direction: Source Library → PDF / Book / Lecture Notes → AI Provider
Layer → Study Processor → Committee / Subject / Topic → Memory / Review / Study Plan.

Future scope, requiring separate approval:
- PDF import, source metadata and Committee/Subject/Topic association.
- AI-powered PDF understanding; chapter/section extraction; concise and exam-focused/high-yield summaries; key concepts; table/diagram explanations.
- Active-recall questions, quizzes and flashcard generation; explicit Memory integration.
- Source-grounded Q&A with page/section references where feasible and explicit "not found in source" responses when unsupported.
- Study-plan generation from large books.
- Optional Gemini Notebook / enterprise notebook integration later, subject to actual available APIs, permissions and feasibility; not promised as an existing integration.

Keep provider adapters behind a provider-neutral AI Provider Layer. Gemini API is
the initial candidate; OpenAI/other providers and optional notebook adapters may
follow. Source metadata, curriculum and study artifacts must not depend on one
provider's response/storage format. Grounding and reference availability must be
represented truthfully; generated material requires future review UX decisions.
This is roadmap documentation only: no keys, network calls, PDF uploads, Gemini
code, new dependencies or automatic phase approval.

## Execution priority — user update, 2026-09-05

The user owns ALL physical/manual QA. AI work is scoped product implementation plus concise TypeScript, dependency-tree, Phase 2, Phase 3, and Phase 4 static checks. No emulator/ADB/device/UI automation or QA-environment setup/debugging. Run each static command once; allow one final rerun after a small code fix. Environment failures: maximum two attempts, then record PENDING. Do not change physical status without an explicit user result. Stop at the approved scope; no automatic new phase.

Product development has priority. Whole-app Turkish localization is **intentionally deferred** until the product is much closer to completion. Do not continue CRUD or Calendar localization now. The user explicitly approved moving into Phase 4.

Overall roadmap progress is roughly 40% (user estimate); working-app/MVP maturity is further along. Remaining later scopes include Phase 4.2+ Subjects/Topics/advanced Committees; Phase 5 Memory/Learning/spaced repetition; Phase 6 Motivation; Phase 7 Assistant/Automation; Phase 8 Testing/UX/Performance; Phase 9 Production. Listing later phases is **not implementation approval**. Current approved product work is Phase 4 after 4.1 closure. Master Phase 3 remains ACTIVE only because remaining physical QA is pending.

## Localization — DEFERRED (2026-09-05)

- [x] Manual Profile language choice in the existing hydration-safe preference store.
- [x] Partial bilingual UI repaired; TypeScript/dependency checks pass, Phase 2 21 checks and Phase 3/localization 85 checks pass.
- [x] Check-In + Lighter Plan copy/accessibility/recommendation reasons translated without changing selection rules, timing, or state lifecycle (source/static verification; device QA pending).
- [x] Dashboard English/Turkish presentation, dynamic summaries, dates and accessibility; static checks PASS.
- [ ] Remaining built-in copy, CRUD routes, Calendar, domain errors, and localization QA — **deferred** until the product is much closer to completion.

Do not resume localization as the next product task. Phase 3.3 tablet and Phase 3.4–3.6 phone/tablet QA remain PENDING and user-owned. See `AGENT_HANDOFF.md` for the current Phase 4.1 closure.

## Phase 1 — Foundation / Scaffold ✅ COMPLETE

- [x] Expo SDK 57, React Native, TypeScript, and Expo Router foundation
- [x] Six-tab navigation: Dashboard, Committees, Focus, Memory, Calendar, Profile
- [x] SQLite client, versioned migration system, repositories, and Zustand stores
- [x] Shared theme, responsive breakpoints, `ScreenWrapper`, and reusable UI primitives

## Phase 2 — Functional Core ✅ COMPLETE

The functional implementation, static/in-memory closure checks, full physical Expo Go 57 Android Core Walkthrough, and final Profile restart-persistence retest are complete.

### Phase 2.1 — Committee System ✅ IMPLEMENTATION COMPLETE

- [x] SQLite-backed Committee create, view, edit, and confirmed delete
- [x] Required validation plus loading, empty, error, not-found, and retry states
- [x] Direct/deep-linked detail and edit routes load by ID from SQLite
- [x] Mutations acknowledge database success before navigation
- [x] Device-local start/exam status and calendar-day countdowns
- [x] Responsive phone/tablet list and detail layouts

### Phase 2.2 — Focus Timer System ✅ IMPLEMENTATION COMPLETE

- [x] Timestamp-based start, pause, resume, finish, cancel, reset, and overtime
- [x] Completed/cancelled persistence and under-30-second false-start discard
- [x] Optional Committee link and last-ten-session history
- [x] Profile default used by fresh/reset Focus-tab setup
- [x] Active timer preservation and fixed 25-minute Dashboard Quick Start
- [x] Focus-history loading retry

### Phase 2.3 — Memory / Flashcards ✅ IMPLEMENTATION COMPLETE

- [x] SQLite-backed deck and flashcard CRUD
- [x] Front/reveal/rate active-recall sessions with durable review history
- [x] Review persistence before session advancement
- [x] Transactional card/deck dependent-row cleanup
- [x] Legacy `interval`, `ease`, and `next_review` compatibility fields preserved and hidden
- [x] Top-level deck/review loading retry and responsive layouts

### Phase 2.4 — Calendar & Study Timeline ✅ IMPLEMENTATION COMPLETE

- [x] Interactive month grid and selected-day agenda
- [x] SQLite-backed manual study-event CRUD
- [x] Read-only derived Committee dates, completed Focus sessions, and aggregated Memory reviews
- [x] Device-local date-only handling with no UTC day shifting
- [x] Responsive stacked and large-tablet two-pane layouts

### Phase 2.5 — Dashboard / Daily Overview ✅ IMPLEMENTATION COMPLETE

- [x] Repository-driven daily overview with truthful bounded queries
- [x] Real Committee, completed Focus, Memory review, and planned Calendar data
- [x] Deterministic Quick Start and active Focus preservation
- [x] Partial-query failure handling and refresh lifecycle cleanup
- [x] No fake due, mastery, streak, progress, or task metrics

### Phase 2.6 — Profile Minimum + Core Closure Fixes ✅ IMPLEMENTATION COMPLETE

- [x] Locally persisted default Focus duration: 15 / 25 / 45 / 60 minutes
- [x] Optional locally persisted daily Focus goal: None / 30 / 60 / 90 / 120 minutes
- [x] Preference hydration, normalization, failure state, and retry
- [x] Central database-initialization recovery gate with in-app retry
- [x] Committee deep-link, write acknowledgement, and local-date consistency fixes
- [x] Remaining user-facing Phase 2 placeholders removed
- [x] Missing Committee, Focus-history, and Memory top-level retry actions added
- [x] Touched-control accessibility labels and minimum touch targets improved
- [x] Migration v2/v3 column guards and transactional version advancement hardened
- [x] Retained dependency-free `npm.cmd run validate:phase2` closure harness

### Phase 2 Exit Gate

- [x] Six main screens have functional, non-placeholder user flows
- [x] Core writes use SQLite; Profile preferences use local persisted Zustand/AsyncStorage
- [x] Repository/Zustand responsibilities and cross-module read-only derivation are preserved
- [x] TypeScript passes with zero errors
- [x] Dependency tree validates and package versions remain unchanged
- [x] Clean/v0, guarded v2/v3, v4→v5, repeat-run, and failure rollback migration paths pass the retained harness
- [x] Physical Expo Go 57 Android Core Walkthrough passes
- [x] Cold-restart persistence is confirmed on the target runtime
- [x] Phone layout and tablet viewport smoke checks pass on the target runtime

Phase 2 interprets basic study items as persisted manual study-plan events optionally linked to a Committee. Subject/Topic hierarchy is deliberately deferred to Phase 4 — Medical School / Committee Engine and is not a Phase 2 exit blocker.

## Phase 3 — ADHD Intelligence Layer 🟦 ACTIVE

- ADHD-oriented check-ins and context-aware assistance
- Sprint, Recovery, and Flow support
- Low-friction task breakdown, distraction handling, and adaptive nudges

### Phase 3.1 — Start Small / Two-Minute Entry ✅ COMPLETE

- [x] Clearly secondary Dashboard `Start small · 2 min` action
- [x] Atomic timestamp-based entry session that cannot replace active Focus
- [x] Safe optional Committee inheritance with stale-reference clearing
- [x] Runtime-only standard/entry mode with no schema change
- [x] Two-minute milestone with no automatic finish, persistence, or forced break
- [x] Finish, Keep Going, and Continue to Profile default total
- [x] Existing pause/resume, overtime, cancellation, history, and Dashboard semantics preserved
- [x] One-time accessible milestone announcement and explicit action labels
- [x] Phase 2 regression suite and dependency-free Phase 3.1 validation harness pass
- [x] Focused physical Expo Go 57 Phase 3.1 device QA

### Phase 3.2 — Optional Check-In & Adaptive Session ✅ COMPLETE

- [x] Dashboard-only tertiary `Not sure what fits? Check in` entry while Focus is idle
- [x] Two-step Energy → Attention → Recommendation flow
- [x] Exact deterministic nine-cell 2/15/25/45-minute matrix with neutral explanations
- [x] Explicit duration override and explicit start confirmation; no automatic Focus start
- [x] Two-minute recommendation reuses Phase 3.1 entry mode
- [x] Atomic standard adaptive start for 15/25/45 minutes with active-session protection
- [x] Visible, removable, and revalidated optional Committee context
- [x] Runtime-only store with two-hour, local-midnight, and negative-age expiry
- [x] Skip/close behavior, responsive constrained layout, and accessible controls
- [x] TypeScript, dependency, Phase 2 regression, and Phase 3 regression validation pass
- [x] Focused physical Expo Go 57 Android phone QA
- [x] Focused physical Expo Go 57 Android tablet QA

### Phase 3.3 — Lighter Plan / Recovery ✅ IMPLEMENTATION COMPLETE

- [x] Universal low-emphasis `Choose a lighter plan` entry on completed Check-In recommendations only
- [x] Safe standalone Lighter Plan route with direct-route, back, close, foreground, and partial-query handling
- [x] Fixed Focus → Memory → Calendar ordering with unavailable actions omitted and no filler actions
- [x] Continue Focus as the only action for running, paused, overtime, or active entry sessions
- [x] Two-minute Focus action reuses `startEntrySession()` with removable and revalidated Committee context
- [x] Memory selection reuses the seven-local-day Again/Hard signal, then the most recently updated non-empty deck
- [x] Existing Memory review route supports an optional oldest-first maximum-five queue on initial load, retry, and Review Again
- [x] Deleted-deck handling and truthful local-rating summary copy in the touched review flow
- [x] Manual Calendar selection: ongoing timed → all-day → next future timed, with passed timed events excluded
- [x] Calendar refresh on route focus, app foreground, local midnight, and next relevant event boundary
- [x] Route-local Recovery candidates only; no history, score, analytics, micro-steps, persistence, schema change, or dependency change
- [x] TypeScript, dependency tree, Phase 2 regression, and expanded Phase 3 regression validation pass
- [x] Focused physical Expo Go 57 Phase 3.3 Android phone QA
- [ ] Focused physical Expo Go 57 Phase 3.3 Android tablet portrait/landscape QA

Android bottom safe-area physical retests passed on both phone and tablet. Micro-steps remain deferred to a separately approved later Phase 3 scope.

### Phase 3.4 — Gentle Return / Distraction Support ✅ IMPLEMENTATION COMPLETE

- [x] Active-Focus-only low-emphasis `I got distracted` entry
- [x] Inline `GentleReturnCard` replacement that keeps the main timer visible and changes no timer field when opened
- [x] Running/overtime choices: Return to focus, explicit two-minute break, or Not now
- [x] Manually paused choices: Return to focus or Stay paused, with no additional break countdown
- [x] Atomic duplicate-safe pause of the existing session for an explicit Gentle break
- [x] Runtime-only `gentleBreakStartedAt` timestamp with no persistence or history
- [x] Timestamp-derived 120-second countdown with background/foreground accuracy and no auto-resume
- [x] Same-session resume with accumulated Focus time, target, mode, Committee, overtime, and entry milestone state preserved
- [x] Finish, Cancel, Reset, and fresh-process state clear the runtime break marker
- [x] Scrollable active Focus layout for large text, wrapped content, accessible labels, and one polite completion announcement
- [x] No automatic detection, sound, vibration, notification, analytics, distraction history, break history, schema change, or dependency change
- [x] TypeScript, dependency tree, Phase 2 regression, and expanded Phase 3 regression validation pass
- [ ] Focused physical Expo Go 57 Phase 3.4 Android phone QA
- [ ] Focused physical Expo Go 57 Phase 3.4 Android tablet QA

Phase 3.3 Android phone QA passed; Phase 3.3 tablet QA remains pending.

### Phase 3.5 — Low-Stimulation / Gentle Nudge Preferences ✅ IMPLEMENTATION COMPLETE

- [x] Profile-only `Low-stimulation mode` and `Gentle nudges` controls in one full-width Study support card
- [x] Strict boolean defaults and malformed-value normalization; both preferences default Off
- [x] Existing AsyncStorage-backed `useAppStore` persistence with hydration-safe write protection and retry behavior preserved
- [x] Presentation-only native Switch rows with visible On/Off text, wrapping copy, accessible state, and practical touch targets
- [x] Low-Stimulation affects only the active Focus workspace; idle Focus and every other product surface remain unchanged
- [x] Neutral active timer badge, numerals, sizing, border treatment, and reduced minimum height with status, overtime, and Committee context preserved
- [x] Neutral visual variants for Entry Milestone and Gentle Return with every action, state, and announcement preserved
- [x] Gentle Nudges remains storage-only with no current prompting behavior
- [x] No automatic enablement, notification permission/API, reminder, push token, background job, sound, vibration, analytics, SQLite setting, migration, new theme system, or dependency
- [x] TypeScript, dependency tree, expanded Phase 2 preference regression, and expanded Phase 3 regression validation pass
- [ ] Focused physical Expo Go 57 Phase 3.5 Android phone QA
- [ ] Focused physical Expo Go 57 Phase 3.5 Android tablet QA

Phase 3.3 tablet QA and Phase 3.4 phone/tablet QA remain pending.

### Phase 3.6 — Integration / Accessibility / Phase 3 Closure ✅ IMPLEMENTATION COMPLETE

- [x] Check-In two-minute CTA and Memory rating/summary copy normalized to the approved truthful wording
- [x] Destination-aware Recovery/normal review exits with safe direct-route fallbacks
- [x] Calendar detail preserves valid back history and safely falls back to the Calendar tab
- [x] Recovery candidate, AppState, Calendar-boundary, and hardware-back work scoped to screen focus without polling
- [x] Shared opt-in standalone bottom safe area for Check-In, Lighter Plan, Memory review, and Calendar detail; tab defaults unchanged
- [x] Check-In choice groups use radio-group/radio/checked accessibility semantics
- [x] Descriptive non-live timer accessibility label and narrow large-text numeral fitting
- [x] Review back/close semantics, 44dp target, scrollable completion/empty states, and two-line deck title support
- [x] Targeted muted/inverse/ghost/selected-state contrast corrections without a new theme
- [x] Gentle Nudges copy explicitly states the preference is not used yet; Low-Stimulation naming and behavior unchanged
- [x] No new Phase 3 feature behavior, state, persistence, notification, analytics, or telemetry; later Phase 4.1 added schema v6 only
- [x] TypeScript and dependency-tree checks pass
- [x] Phase 2 validator passes all 19 grouped checks
- [x] Phase 3 validator passes all 74 grouped Phase 3.1–3.6 checks
- [ ] Consolidated physical Expo Go 57 Phase 3.6 Android phone QA
- [ ] Consolidated physical Expo Go 57 Phase 3.6 Android tablet QA

### Master Phase 3 Exit Gate 🟦 ACTIVE

- [x] Phase 3.1–3.6 implementation complete
- [x] TypeScript PASS
- [x] Installed dependency tree PASS
- [x] Phase 2 validator PASS
- [x] Phase 3 validator PASS
- [x] Documentation current
- [ ] Remaining phone QA PASS
- [ ] Remaining tablet QA PASS
- [ ] Post-Phase-3.6 safe-area regression PASS
- [ ] No unresolved critical physical navigation/timing/persistence/accessibility/data-integrity regression

Phase 3.3 phone QA remains passed. Phase 3.3 tablet QA, Phase 3.4–3.6 phone/tablet QA, and the consolidated safe-area regression remain pending. Master Phase 3 is not complete.

## Phase 4 — Medical School / Committee Engine 🟦 ACTIVE

- Committee → Subject → Topic hierarchy
- Advanced goals below remain FUTURE work, explicitly excluded from 4.4
- Subject/Topic implementation begins here, not in Phase 3

### Phase 4.1 — Curriculum data foundation ✅ IMPLEMENTATION COMPLETE

- [x] Additive schema v6 `subjects` / `topics` with parent FKs and hierarchy-only cascade
- [x] Order indexes `(parent_id, created_at, id)`
- [x] Connection-local foreign-key enforcement verified before caching
- [x] No destructive repair; conflict aborts without data loss
- [x] Repositories validate parents and affected rows; bounded parent-scoped lists
- [x] Focus/Memory/Calendar rows are not cascaded
- [x] No Subject/Topic Zustand store or cross-module linkage; UI was intentionally absent at the 4.1 checkpoint and added in 4.2/4.3
- [x] No new dependency; `validate:phase4` harness retained
- [x] TypeScript, dependency tree, Phase 2, Phase 3, and Phase 4.1 static checks pass

### Phase 4.2 — Subject CRUD — IMPLEMENTATION COMPLETE

- [x] Committee Subject list, create/detail/edit/delete, direct-route safety and hierarchy warnings
- [x] Route-local state; no Subject store; real detail Topic count
- [x] Schema v6; no new dependencies or cross-module links
- [x] Static validation passed
- [x] User-confirmed Phase 4.2 phone and tablet physical QA PASS

### Phase 4.3 — Topic CRUD — COMPLETE

- Topic list/create/detail/edit/delete, safe parent navigation, EN/TR, 50-row paging and real separate COUNT implemented.
- User-confirmed phone/tablet physical QA PASS.

### Phase 4.4 — Curriculum integration / closure — IMPLEMENTATION COMPLETE

- Narrow navigation, parent refresh, safe-area, accessible exits and delete-language closure only.
- Static checks PASS; changed-flow phone/tablet physical QA PENDING.
- Does NOT close Master Phase 4 or approve further product work.

### Phase 4.5 — Curriculum Metadata — NOT STARTED

- Future learning objectives, weights and priorities. Requires separate design/implementation approval.

### Phase 4.6 — Curriculum Progress Intelligence — NOT STARTED

- Future truthful Topic/Subject progress model and weak-topic views. No mastery/status implementation approved here.

### Phase 4.7 — Exam Planning — NOT STARTED

- Future exam sprint planning and daily distribution. Requires separate approval.

These groupings preserve the original advanced Phase 4 goals, not implementation commitments or new data-model decisions. Master Phase 4 remains ACTIVE.

## Phase 5 — Memory & Learning Engine ⬜ NOT STARTED

- Full spaced-repetition scheduling and due queues
- Retention/learning analytics and richer Memory workflows
- Existing Phase 2 recall ratings remain historical inputs until this phase

## Next Required Action

User physical QA of changed Phase 4.4 curriculum flows. Wait for separate approval before Phase 4.5. Master Phase 4 ACTIVE; Master Phase 3 retains remaining explicit QA gaps. Whole-app localization DEFERRED; Phase 5 NOT STARTED.

Static: TypeScript and dependency tree EXIT 0; Phase 2 21 PASS; Phase 3 85 PASS; Phase 4 31 PASS. Schema v6 and dependencies unchanged.
