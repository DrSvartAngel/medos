# MedOS — compact handoff, 2026-09-05

## Current working rule

The user owns ALL physical/manual QA. AI work is scoped product implementation plus concise TypeScript, dependency-tree, Phase 2, Phase 3, and Phase 4 static checks. No emulator/ADB/device/UI automation or QA-environment setup/debugging. Run each static command once; allow one final rerun after a small code fix. Environment failures: maximum two attempts, then record PENDING. Do not change physical status without an explicit user result. Stop at the approved scope; no automatic new phase.

Product development has priority. Whole-app Turkish localization is **intentionally deferred** until the product is much closer to completion. Do **not** continue Committee / Deck / Card / Event / Calendar localization.

## Phase 4.1 — Curriculum data foundation — COMPLETE, 2026-09-05

- Schema is **v6**. Additive `subjects` and `topics` tables, parent FKs with hierarchy-only `ON DELETE CASCADE`, and order indexes. Legacy Committee/Deck `subject` text is not treated as a relation. Preexisting curriculum-name conflict stops without repair or data loss.
- `getDB()` enables and verifies `PRAGMA foreign_keys = ON` before caching the connection. Failed enablement is not cached.
- Repositories: `subjectRepo` / `topicRepo` with parent existence checks, name/description validation, bounded parent-scoped lists, parameterized SQL, and false returns for missing/mismatched updates and deletes.
- Cascade is limited to Committee → Subject → Topic. Focus, Memory, and Calendar rows are not cascaded.
- No Subject/Topic Zustand store, UI routes, or cross-module `subject_id` / `topic_id` linkage. No new dependency or package version.
- Static validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 **21 PASS**; Phase 3/localization **85 PASS**; Phase 4.1 **16 PASS**.
- AI performed **no emulator or physical QA**.

**Phase 4.2 (Subject CRUD UI/store) is NOT STARTED** and must not begin without explicit planning/approval.

## Localization — DEFERRED

Dashboard English/Turkish presentation remains in source. Remaining CRUD/Calendar/error localization is paused by user decision. Do not resume it as the next product task.

## Physical QA statuses (PRESERVED — never change these from emulator results)

Verified against canonical/user-confirmed physical statuses; never promote emulator evidence to physical PASS.

| Check | Status |
|---|---|
| Phase 3.2 Android phone QA | PASSED |
| Phase 3.2 Android tablet QA | PASSED |
| Android bottom tab-bar safe-area phone retest | PASSED |
| Android bottom tab-bar safe-area tablet retest | PASSED |
| Phase 3.3 Android phone QA | PASSED |
| Phase 3.3 Android tablet QA | PENDING |
| Phase 3.4 Android phone QA | PENDING |
| Phase 3.4 Android tablet QA | PENDING |
| Phase 3.5 Android phone QA | PENDING |
| Phase 3.5 Android tablet QA | PENDING |
| Phase 3.6 Android phone QA | PENDING |
| Phase 3.6 Android tablet QA | PENDING |
| Consolidated post-Phase-3.6 safe-area regression | PENDING |

Localization phone/tablet QA: DEFERRED with the rest of whole-app localization. Historical emulator evidence is separate and cannot close physical QA.

Phase 1/2 complete; Phase 3.1–3.6 implementation complete; Master Phase 3 **ACTIVE** only because remaining physical QA is pending; Phase 4.1 **COMPLETE**; Phase 4.2 **NOT STARTED**; Phase 5 **NOT STARTED**.
