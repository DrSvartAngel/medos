# MedOS — compact handoff, 2026-09-05

## Current working rule

The user owns ALL physical/manual QA. AI work is scoped product implementation plus concise TypeScript, dependency-tree, Phase 2 and Phase 3/localization checks. No emulator/ADB/device/UI automation or QA-environment setup/debugging. Run each static command once; allow one final rerun after a small code fix. Environment failures: maximum two attempts, then record PENDING. Do not change physical status without an explicit user result. Stop at the approved scope; no automatic new phase.

## Dashboard localization — COMPLETE in source, 2026-09-05

- Dashboard headings/greetings, Quick Start branches, Committee status/exam timing, Focus/Memory summaries, agenda, loading/empty/partial-error/retry copy and accessibility now use the existing English/Turkish catalogs.
- Dynamic counts, durations and local dates follow the selected language. User-authored names are untouched. Dashboard rules gained raw presentation metadata only (time, days, response count, Committee name); selection, sorting, fixed 25-minute start, 2-minute entry, active protection, queries and refresh lifecycle are unchanged.
- Files changed: `app/(tabs)/index.tsx`; four `components/dashboard/*.tsx` cards; `utils/dashboardRules.ts`; `i18n/en.ts`, `i18n/tr.ts`; `scripts/validate-phase3.cjs`; these four project-memory documents. No new files.
- Static validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 **21 PASS**; Phase 3/localization **85 PASS**; **106 checks total**. All existing groups retained. A new literal-copy scan initially matched TypeScript syntax; narrowed it to JSX text and the one final Phase 3 rerun passed.
- SQLite schema **v5 unchanged**; migrations, dependencies, package versions, preference persistence and domain stores unchanged.
- AI performed **no emulator or physical QA**. Dashboard localization phone/tablet QA **PENDING**, owned by the user.
- Whole-app localization remains partial. **Next product scope: Committee / Deck / Card / Event create-edit-detail CRUD localization, only after explicit approval.** Calendar and remaining errors follow later; not implemented in this task.
- Phase 1/2 complete; Phase 3.1–3.6 implementation complete; Master Phase 3 **ACTIVE** for physical exit gates; Phase 4 **NOT STARTED**.

Manual Dashboard checklist: switch English/Turkish and check immediate copy updates; check no mixed built-in text; try Quick Start / Start Small / Check-In / Continue Focus; check long Turkish text and bottom safe area.

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

Localization phone/tablet QA: PENDING. Historical emulator evidence is separate, cannot close physical QA, and is not an instruction to resume automation. Previous quota observations are historical; no quota-switch loop is running.
