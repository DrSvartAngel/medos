# MedOS — Development Roadmap

## Current — Phase 6.3 Adaptive Motivation

- Implementation COMPLETE; Phase 6 ACTIVE. Phase 6.1–6.3 phone/tablet physical QA remains PENDING. Prior user-confirmed Phase 5 closure unchanged.
- Intentionally reuses the existing Phase 3 getAdaptiveRecommendation matrix; no duplicate recommendation engine. Exact energy categories: low / steady / good; attention: scattered / okay / focused.
- Preserved minutes (attention order scattered, okay, focused): low = 2 / 15 / 15; steady = 15 / 25 / 25; good = 15 / 25 / 45. All four 15-minute outcomes remain unchanged.
- EN/TR explanation explicitly ties the suggestion only to selected energy/attention and offers another duration or Lighter Plan. Existing reasons, input summary, 2/15/25/45 choices, explicit start, Committee checks, expiration and active-session protection unchanged.
- Low-Stimulation uses a regular recommendation card and neutral badge only. Same content, controls, selection semantics and screen-reader labels. No automatic start, Momentum completion or MiniVictory trigger.
- No new schema, dependency, store, tracking, analytics, notification or persistence. Schema v10. Focus/Recovery/SRS/Momentum/MiniVictory and existing preferences unchanged. No Phase 6.4 or PDF/Gemini work.
- Modified recommendation card, Check-In visual prop wiring, EN/TR, Phase 3/6 validators and four project-memory docs; no new files.
- Validation: TypeScript EXIT 0, dependency tree EXIT 0; Phase 2 21, Phase 3 85, Phase 4 43, Phase 5 29, Phase 6 22 PASS — 200 total. Phase 3 guard narrowly permits this approved visual prop; regression groups retained. Source contracts are not physical QA.
- User QA: EN/TR reasons and alternatives; all nine combinations; Low-Stimulation on/off; explicit start and Lighter Plan; phone/tablet long text and safe area. No device automation performed.
- Branch phase-6-3-adaptive-motivation; local commit only. Next: user physical QA and review. Do not push, merge main or start Phase 6.4 without explicit approval.

## Historical — Phase 6.2 Momentum Engine

- Implementation COMPLETE; Phase 6 ACTIVE. Phase 6.1 and 6.2 physical phone/tablet QA remain PENDING. Master Phase 5 stays CLOSED with user-confirmed QA PASS.
- Today's 3 are optional action targets: (1) finish a positive-duration, non-cancelled Focus session; (2) persist at least one Memory rating; (3) finish such a Focus session linked to an existing Topic. Opening a screen/Topic or starting a timer does not qualify.
- The third target uses existing Focus-to-Topic linkage, not curriculum edit/open inference. One linked session may satisfy both Focus targets; UI explicitly discloses this overlap. The fraction counts targets met, not distinct sessions, mastery or curriculum progress.
- Derived by one parameterized read-only query per refresh. Focus uses ended_at within the local day (including sessions crossing midnight); Memory uses reviewed_at. No completion flags/history persisted. Deleted/unlinked evidence is reflected on refresh.
- MomentumCard reuses focused Dashboard refresh: navigation return, foreground and local midnight; listeners/timers cleaned on blur, no polling/background jobs. Query failure clears stale results and offers Retry instead of false 0/3 or stale completion.
- Same EN/TR content/actions in Low-Stimulation, only recorded-label color becomes neutral. Existing daily minute goal, MiniVictory, Quick Start, Check-In/Recovery, Focus and SRS semantics unchanged. All-three celebration deferred to avoid replay spam; no reward persistence, streaks, XP, coins, levels, scores or notifications.
- Schema v10; dependencies, lockfile, stores and preferences unchanged. Created components/dashboard/MomentumCard.tsx. Modified Dashboard insertion points, dashboardRepo, EN/TR, validate-phase6 and four memory docs.
- Static validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21, Phase 3 85, Phase 4 43, Phase 5 29, Phase 6 18 PASS — 196 total. No device/emulator/ADB QA performed.
- User QA: Focus Finish vs Cancel, one Memory rating, Topic-linked finish, overlap explanation, navigation/foreground/midnight refresh, restart-derived state, EN/TR/Low-Stimulation, phone/tablet large-text and safe area.
- Next: user Phase 6.2 QA and branch review. Phase 6.3 NOT STARTED. No automatic main merge; PDF/Gemini and broad localization deferred.

## Historical — Phase 6.1 Reward Foundation

- Implementation COMPLETE; Phase 6 ACTIVE. Master Phase 5 remains CLOSED with user-confirmed phone/tablet/combined QA PASS. Phase 6.1 phone/tablet physical QA PENDING; no device automation performed.
- Inline dismissible MiniVictory acknowledges a successfully persisted, positive-duration Focus finish (including entry Finish here), or a completed Memory queue with at least one persisted rating. Cancel, zero-duration finish, empty queue, failed writes and merely reaching the entry milestone do not trigger feedback.
- Focus finish now returns its durable session receipt (null on failure/idle); persistence, timer transitions and history refresh semantics are unchanged. A history-read error after a successful write does not lose the receipt. Reward visibility is component/route-local, clears on a new Focus session or leaving Focus, and is never persisted.
- EN/TR factual copy; Low-Stimulation changes only banner title color, preserving content/dismissal. No blocking overlay, animation, sound, vibration, notifications, analytics, reward history, XP, coins, levels or streak mechanics.
- Schema v10 and dependencies/lockfile unchanged. Memory store/repository/SRS, full-deck/due/Lighter Plan max-five flows, Dashboard and preference architecture unchanged. No new store.
- Validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2: 21 PASS, Phase 3: 85 PASS, Phase 4: 43 PASS, Phase 5: 29 PASS, Phase 6: 11 PASS — 189 total. New tests exercise real stores with injected persistence plus explicitly static UI contracts, not physical UI tests. One old Phase 3 idle-presentation guard was narrowly updated for the approved completion banner; rerun passed.
- Created components/ui/MiniVictory.tsx and scripts/validate-phase6.cjs. Modified Focus screen/store, Memory review route, EN/TR dictionaries, package.json (validator script only), Phase 3 validator and these four documents.
- Manual QA (user-owned): phone/tablet Focus Finish vs Cancel; entry milestone vs Finish here; positive/empty full/due/Lighter Plan reviews; dismiss, navigate away/back, restart; Low-Stimulation and EN/TR; large text/safe area. Confirm normal study controls remain available.
- Next action: user Phase 6.1 phone/tablet QA and branch review. Do not merge automatically. Phase 6.2 NOT STARTED; broader motivation features, PDF/Gemini and broad localization remain deferred.

## Historical — Master Phase 5 closure

- Closure recorded on main after verifying a clean tree and main == origin/main at 1368fc3 (Phase 5.6 merged). This update changes only the four project-memory documents.
- Phase 5.1–5.6 implementation and technical closure COMPLETE. User explicitly confirmed phone PASS, tablet PASS and combined Phase 5.1–5.6 physical QA PASS. Master Phase 5 CLOSED. Phase 6 NOT STARTED.
- Final attention semantics unchanged: recorded Topic-linked reviews AND a currently due linked card on THAT Topic. No cross-Topic inference, scores, percentages, mastery, retention or Focus+Memory weighting. Unknown remains unknown.
- Exact current-card counts and rating-time review snapshots remain separate; relinking never moves old review evidence. Subject/Committee totals include every owned record, independent of filters/display limits, without join multiplication.
- Safe refactor: identical Subject/Committee card/review/Focus aggregation CTEs now share one repository-local SQL fragment. No query/API/ownership change. Topic predicate and SQL attention condition are checked against each other across time boundaries.
- Refresh fix: Topic detail revalidates its hierarchy and Focus evidence on foreground while focused; listener cleaned on blur. Existing evidence panels already handle focus/foreground/due boundaries. No polling or broad UI redesign.
- SRS unchanged: Again +10 minutes, interval reset to zero, no same-session reinsertion. First scheduled non-Again (also after reset) Hard 1d / Good 3d / Easy 7d; later Hard ×1.2 / Good ×2 / Easy ×3, ceil and at least previous+1 day. Early/free ratings reschedule from rating time. Atomic history+schedule, due-first queue, legacy unscheduled distinction, full-deck and Lighter Plan max-five preserved.
- Topic deletion nulls Card/Review/Focus references and preserves historical records; existing Card/Deck deletion semantics unchanged. Exam Plan unchanged. Objectives descriptive only.
- Schema v10, packages/lockfile/dependencies/stores unchanged. No PDF/Gemini; broad localization remains deferred.
- Modified Topic detail, memoryRepo, validate-phase5 and four project-memory docs. No new product feature or UI redesign.
- Closure validation rerun: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS, Phase 5 29 PASS (178 total). Existing regression groups retained. Static/in-memory results are separate from the user-confirmed physical QA above.
- Phase 5.1–5.6 combined physical QA: phone PASS; tablet PASS; combined walkthrough PASS, reported by the user. This supersedes historical Phase 5 PENDING/DEFERRED entries below, not unrelated older phase QA. No physical/emulator/ADB automation was performed by the agent.
- Next roadmap phase: Phase 6 — Motivation, NOT STARTED. Await explicit scope/implementation approval; no Phase 6 or PDF/Gemini work is authorized by this closure.

## Phase 5.5 checkpoint (historical)


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
- Static checks PASS; user-confirmed changed-flow phone/tablet physical QA PASS.
- Does NOT close Master Phase 4 or approve further product work.

### Phase 4.5 — Topic learning objectives — IMPLEMENTATION COMPLETE

- Optional Topic-only descriptive learning objectives implemented; schema v7. Static checks PASS; Phase 4.5 phone/tablet QA DEFERRED.
- Weight and priority remain deferred; no progress, completion or AI implementation.

### Phase 4.6 — Topic study evidence — IMPLEMENTATION COMPLETE

- Optional Focus → Topic linkage and truthful recorded-study state implemented; schema v8. Physical QA DEFERRED.
- Memory linkage, weak-topic analysis and any broader progress model remain deferred; no mastery or percentages.

### Phase 4.7 — Generated exam planning — IMPLEMENTATION COMPLETE

- On-demand equal-count Topic distribution from today through the day before the Committee exam; all days included, curriculum ordering retained. No persisted schedule or completion tracking.
- Committee exam-plan screen, Today/day sections and existing Topic-detail/Focus path. Schema v8 unchanged; physical QA PENDING.
- Master Phase 4 remains ACTIVE: deferred weight/priority and broader progress/weak-topic requirements are not implemented or silently removed from roadmap.

These groupings preserve the original advanced Phase 4 goals, not implementation commitments or new data-model decisions. Master Phase 4 remains ACTIVE.

## Phase 5 — Memory & Learning Engine — ACTIVE

### Phase 5.1 — Spaced repetition foundation — IMPLEMENTATION COMPLETE

- Deterministic Again/Hard/Good/Easy scheduling and atomic history updates; schema v9, separate due queue, preserved legacy history.
- Static PASS; physical phone/tablet QA PENDING. Full-deck and max-five reviews retained.

### Phase 5.2 — NOT STARTED

- Topic/Memory linkage and further learning intelligence require separate approval; no mastery/retention percentages.

## Next Required Action

User physical QA of Phase 5.1 scheduling. Phase 4.5/4.6/4.7 physical QA DEFERRED. No Phase 5.2 or PDF/Gemini implementation without approval.

Static: TypeScript and dependency tree EXIT 0; Phase 2 21 PASS, Phase 3 85 PASS, Phase 4 43 PASS, Phase 5 8 PASS. Schema v9; dependencies unchanged.
