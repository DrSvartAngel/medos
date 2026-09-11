# MedOS — Project Status

## Phase 13.5 — Final Visual Design Lock ✅ COMPLETE / ACCEPTED / CLOSED

- **Phase Status:** Phase 13.5: **COMPLETE / ACCEPTED / CLOSED**
- **Dual Source of Truth Model:**
  - **Architectural Authority:** `docs/MEDOS_FINAL_ARCHITECTURE.md` (SHA256: `1813243a537df6678a65638e1a86438c36851cf680cda7f0ef3a6f5b1c930d0b`). Strictly overrides visual exploration.
  - **Visual Authority:** MedOS Figma Phase 13.5 (`https://www.figma.com/design/STGX479HWOwrlzsLKs3Okw`) & `docs/PHASE13_5_FINAL_VISUAL_DESIGN.md`. Governs visual implementation for Phase 14 and Phase 15.
- **Production Implementation Status:** Architecture and visual design specifications are locked and accepted, but **NOT yet implemented in production**. Production code remains strictly at the validated Phase 12 baseline.
- **Branch:** `phase13-track-b-codex` | **Schema:** **v14** (strictly preserved, zero unapproved schema modifications)
- **Visual Direction:** **Neutral Zen** (Premium Academic + Refined Academic). Off-white/stone/charcoal foundations (`#F1F1EE`, `#F8F8F5`, `#171917`, `#5C625E`) with desaturated sage (`#87968C`) and moss (`#4F5E55`) as semantic accents. Manrope typography. Low card density.
- **Core Architecture Invariants:**
  - **Primary Navigation:** `Today` · `Study` · `Review` · `Plan` (Bugün · Çalış · Tekrar · Plan).
  - **Academic Spine:** `Committee` → `Subject` → `Topic` → `Material` (Topic is the academic workspace, not an obligatory funnel for all actions).
  - **Shared Context Contract:** Decouples academic identity, browsing context, activity scope, evidence attribution, entry point, and return destination. Navigation never silently determines evidence attribution.
  - **AI Role:** Contextual and global `Ask MedOS` assistant capability (`Inform` / `Generate` / `Propose`), not a standalone primary tab.
  - **Focus Role:** Activity control with frozen scope and checkpointed state; not a primary navigation destination.
  - **Review Role:** Primary destination for global due queue plus Topic/Deck filtering while preserving historical rating-time attribution snapshots.
  - **QBank Status:** Retains aggregate external-practice logging (`qbank_sessions`) in current baseline. Persistent Question Player (`D7`) deferred.
  - **Planning Model:** `StudyIntention` (`D5`) is defined as a future additive planning entity with single completion ownership; strictly not falsely marked as implemented.
  - **Invariants Preserved:** Evidence truth, historical review snapshots, weighted accuracy metrics, offline-first behavior, schema v14 integrity, and zero fake completion automation.
- **Figma Phase 13.5 Pages:**
  - `13.5 Foundations — Neutral Zen` (Node `20:2`)
  - `13.5 Phone — Core Screens` (Node `20:3`)
  - `13.5 Tablet — Core Screens` (Node `20:4`)
  - `13.5 Phone — Academic & Activities` (Node `28:2`)
  - `13.5 Tablet — Deep Study` (Node `28:3`)
  - `13.5 Dark & States` (Node `28:4`)
- **Current Phase:** **Phase 14 — Design System & Application Shell Rebuild**
- **Active Implementation Slice:** **Phase 14.3 — Spacing, Grid, Radius, Borders & Icons: IMPLEMENTED**
  - **Static Validation:** PASS (TypeScript, Phase12.9, Phase14.1, Phase14.2, Phase14.3, Expo config)
  - **Physical QA:** DEFERRED / PENDING USER PHYSICAL QA (binding policy: accumulated testing after 14.9 before Phase 15)
  - **Phase 14 Final Acceptance:** BLOCKED awaiting cumulative user physical QA after Phase 14.9
  - **Phase 15:** BLOCKED until Phase 14 final physical QA passes

---

## Canonical Project Position

- **LAST ACCEPTED CHECKPOINT:** Phase 14.2 — Typography System (CLOSED / prior physical QA PASS)
- **CURRENT SLICE:** Phase 14.3 — Spacing, Grid, Radius, Borders & Icons (IMPLEMENTED / STATIC PASS / PHYSICAL QA DEFERRED)
- **NEXT SLICE:** Phase 14.4 — Shared UI Primitives

### Roadmap Sequence:
- **Phase 13 — UX Architecture & Ergonomic Reorganization:** ✅ COMPLETE / ACCEPTED / CLOSED
- **Phase 13.5 — Final Visual Design Lock:** ✅ COMPLETE / ACCEPTED / CLOSED
- **Phase 14 — Design System & Application Shell Rebuild:** 🟡 IN PROGRESS
  - *Phase 14.1 — Visual Foundations & Semantic Tokens:* ✅ COMPLETE / ACCEPTED / CLOSED (Physical QA: PASS, Branding: IMPLEMENTED / ACCEPTED)
  - *Phase 14.2 — Typography System:* ✅ COMPLETE / ACCEPTED / CLOSED (Physical QA: PASS)
  - *Phase 14.3 — Spacing, Grid, Radius, Borders & Icons:* 🟡 IMPLEMENTED (Static: PASS, Physical QA: DEFERRED)
  - *Phase 14.4 — Shared UI Primitives:* ⬜ NEXT UP
  - *Phase 14.5 — Responsive Application Shell:* ⬜ PENDING
  - *Phase 14.6 — Primary Navigation Shell:* ⬜ PENDING
  - *Phase 14.7 — Phone / Tablet Composition Rules:* ⬜ PENDING
  - *Phase 14.8 — Theme Completion:* ⬜ PENDING
  - *Phase 14.9 — Accessibility Foundation:* ⬜ PENDING
  - *Phase 14 Final User Physical QA Gate:* 🔴 BLOCKED (Accumulated checks executed after 14.9)
- **Phase 15 — Full Screen UI Rebuild & Visual QA:** ⬜ BLOCKED (Must not start until Phase 14 Physical QA Gate passes)

---

## Cumulative Phase 14 Physical QA Register

> [!NOTE]
> Physical QA is intentionally deferred for slices 14.3–14.9 to allow continuous implementation cadence. The full accumulated checklist will be executed by the user on device/tablet after Phase 14.9 and before Phase 15 begins.

### Status Summary
- **Phase 14.1 Physical QA:** ✅ PASSED (verified on device)
- **Phase 14.2 Physical QA:** ✅ PASSED (verified on device)
- **Phase 14.3 Physical QA:** ⏳ DEFERRED / PENDING (14 checks accumulated)
- **Accumulated Pending Checks:** 14

### Phase 14.3 Deferred Checks Checklist:
- [ ] App launches normally
- [ ] Persisted data remains intact
- [ ] No unexpected layout shift from spacing token integration
- [ ] Existing cards/controls remain visually usable
- [ ] No clipped content caused by geometry changes
- [ ] Phone page margins remain usable
- [ ] Tablet page margins remain usable
- [ ] Existing icons render
- [ ] No missing icon glyphs
- [ ] Icon sizes remain usable
- [ ] Light theme unaffected
- [ ] Dark theme unaffected
- [ ] System theme unaffected
- [ ] Turkish UI unaffected

---

## Historical — Phase 13.5 Final Visual Design Lock Gate (2026-09-10)

- Phase 13.5 formally closed. Visual source of truth locked in Figma (`STGX479HWOwrlzsLKs3Okw`) and recorded in `docs/PHASE13_5_FINAL_VISUAL_DESIGN.md`.
- Neutral Zen visual language, Manrope typography, semantic tokens (light/dark), surface hierarchy, phone/tablet responsive compositions, and core state matrices established.
- Production code remains untouched at validated Phase 12 baseline (schema v14).
- Ready for Phase 14 implementation.

---

## Historical — Master Phase 13 Closure Gate (2026-09-10)

- Master Phase 13 formally closed after full synthesis and canonical restoration of `docs/MEDOS_FINAL_ARCHITECTURE.md`.
- Track A, B, and C exploratory paths reconciled into one canonical architecture specification.
- Production code remains at Phase 12 baseline with zero unapproved schema or runtime changes.
- Next activity: Phase 13.5 — Final Visual Design Lock.

---

## Historical — Master Phase 12 — Learning Material Intelligence & RAG Pipeline ✅ COMPLETE / CLOSED

- **Phase Status:** Master Phase 12: **COMPLETE / CLOSED**
- **Branch:** `localization-en-tr-sweep` | **Schema:** **v14** (deterministic migration v13 → v14, `chunk_embeddings` table with 4 indexes and foreign key cascade)
- **Delivered Sequence:**
  - Phase 12.1 — Source Ingestion Foundation: **COMPLETE**
  - Phase 12.2 — PDF Extraction Pipeline: **COMPLETE**
  - Phase 12.3 — PPTX / Slide Ingestion: **COMPLETE**
  - Phase 12.4 — OCR & Visual Understanding: **COMPLETE**
  - Phase 12.5 — Chunking & Source Indexing: **COMPLETE**
  - Phase 12.6 — Retrieval Layer: **COMPLETE**
  - Phase 12.7 — RAG Answer Generation: **COMPLETE**
  - Phase 12.8 — RAG UI: **COMPLETE**
  - Phase 12.9 — Vector Store Integration: **COMPLETE**
- **Verification Gates:**
  - Phase 12 Static Closure Gate: **PASS** (TypeScript, Phase 12.2–12.9 suites 100% pass)
  - Phone Physical QA: **PASS** (User confirmed on real Android phone)
  - Tablet Physical QA: **PASS** (User confirmed on real Android tablet)
  - Bugs found during Phase 12 closure: **NONE**

---

## Historical — Master Phase 12 Closure Gate (2026-09-09)

- Master Phase 12 formally closed after full automated validation and explicit user physical phone and tablet QA confirmation.
- Next activity: Retroactive Gap Closure Audit across historical phases before beginning Phase 13.

## Historical — Phase 12.9: Vector Store Integration

- Phase 12.9 — Vector Store Integration: **COMPLETE**
- Branch: `localization-en-tr-sweep` | Schema: **v14**
- Delivered: `models/embedding.ts`, `models/retrieval.ts`, `db/migrations.ts`, `db/repositories/chunkEmbeddingRepo.ts`, `services/embedding/*`, `services/chunking/indexingService.ts`, `services/retrieval/hybridRanker.ts`, `services/retrieval/retrievalService.ts`, `scripts/validate-phase12-step9.cjs`
- Validation: `scripts/validate-phase12-step9.cjs` PASS (40/40) | TypeScript PASS (0 errors) | Phase 12.5–12.8 regression PASS

## Historical — Phase 12.8: RAG UI

- Phase 12.8 — RAG UI: **COMPLETE**
- Branch: `localization-en-tr-sweep` | Commit: `ea30253` | Schema: **v13** (unchanged)
- Delivered: `app/topics/[id]/assistant.tsx`, `components/study-ai/RagAnswerCard.tsx`, `i18n/en.ts`, `i18n/tr.ts`, `scripts/validate-phase12-step8.cjs`
- Validation: `scripts/validate-phase12-step8.cjs` PASS | TypeScript PASS

## Historical — Phase 12.7: RAG Answer Generation

- Phase 12.7 — RAG Answer Generation: **COMPLETE**
- Branch: `localization-en-tr-sweep` | Schema: **v13** (unchanged)
- Delivered: `models/rag.ts`, `services/rag/contextBuilder.ts`, `services/rag/ragPrompts.ts`, `services/rag/ragAnswerService.ts`, `scripts/validate-phase12-step7.cjs`
- Phase 12.7 suite: **35/35 PASS** | TypeScript: **PASS** | Phase 12.6/12.5 regression: **PASS**

## Historical — Phase 12.6: Retrieval Layer

- Phase 12.6 — Retrieval Layer: **COMPLETE**
- Branch: `localization-en-tr-sweep` | Schema: **v13** (unchanged)
- Delivered: `models/retrieval.ts`, `services/retrieval/retrievalService.ts`, `scripts/validate-phase12-step6.cjs`
- Phase 12.6 suite: **56/56 PASS** | TypeScript: **PASS** | Phase 12.5 regression: **15 PASS**

## Historical — Phase 10: AI Study Engine (Step 12: Master QA / AI Integrity Gate)

- Phase 10 — AI Study Engine: **COMPLETE WITH KNOWN DOCUMENT LIMITATION**
  - Step 1 (AI Foundation & Contracts): PASS
  - Step 2 (Study Sources Data Layer): PASS
  - Step 3 (Topic Study Source Ingestion UI): PASS
  - Step 4 (Gemini AI Provider REST Adapter): PASS
  - Step 5 (Source-Grounded Study Assistant UI): PASS
  - Step 6 (Source-Grounded Flashcard Draft Generator): PASS
  - Step 7 (Flashcard Review & Memory Batch Import): PASS
  - Step 8 (Document Ingestion & Capability Boundary): **PARTIAL**
    - Document picker: PASS
    - Text/Markdown extraction: PASS
    - Manual fallback: PASS
    - On-device PDF extraction: UNAVAILABLE in Expo Go/Hermes
  - Step 9 (Source-Grounded Question Draft Generator): PASS
  - Step 10 (AI-Assisted Study Planning): PASS
  - Step 11 (Security, Provider Settings, Real Gemini Activation): PASS
  - Step 12 (Master QA & AI Integrity Gate): PASS
- Explicit Known Limitation:
  - "Automated on-device PDF text extraction is not available in the current Expo Go/Hermes runtime. PDF selection and manual document-text fallback are supported."
- Phase 8 physical regression QA: PENDING (deferred).
- Phase 9 physical UI QA: PENDING (deferred).
- Master Validator:
  - `scripts/validate-phase10.cjs`: 17 master categories verifying AI architecture, provider isolation, Mock provider determinism, Gemini provider REST specifications with mocked fetch, credential security audit (zero SQLite/AsyncStorage storage, zero logged secrets, clean codebase scan), grounding rigor and provenance, flashcard safety (ephemeral drafts, explicit Memory batch import, zero fake review evidence), question draft safety (4 options, single answer, zero Q-Bank writes), study plan safety (truthful analytics metrics, null preservation, zero calendar/session automation), document ingestion boundary, offline core independence, centralized provider switching, 100% EN/TR localization parity across all 5 AI catalogs, accessibility semantics, Expo SDK 57 runtime dependencies, database schema v12 integrity, and Step 1-11 test orchestration.
- Full Regression Status:
  - TypeScript (`npx tsc --noEmit`): PASS (0 errors)
  - Phase 2 static/in-memory: PASS (21 checks)
  - Phase 3 + localization: PASS (90 checks)
  - Phase 4 curriculum: PASS (43 checks)
  - Phase 5 SRS & evidence: PASS (29 checks)
  - Phase 6 momentum & polish: PASS (33 checks)
  - Phase 9 analytics master suite: PASS (10 checks)
  - Phase 10 Steps 1–11 suites: ALL PASS (114 checks)
  - Phase 10 Master suite (`validate-phase10.cjs`): PASS (17 checks)
  - Total automated checks passing: 357 checks.
- Schema & Runtime Dependencies:
  - Schema remains strictly **v12** unchanged.
  - Dependencies: `expo-secure-store ~57.0.3`, `expo-document-picker ~57.0.1`, `expo-file-system ~57.0.6`. Zero vendor SDKs, zero node-only PDF parsers.

## Historical — Phase 10 Step 11: Security / Provider Settings / Real Gemini Activation
- Phase 10 Step 11 implementation: COMPLETE.
- Status: Secure AI provider settings and runtime Gemini activation delivered. Users can select between deterministic offline Mock simulation and real Google Gemini generation. Credentials stored securely with hardware-backed encryption via `expo-secure-store`.


## Historical — Phase 10 Step 9: Source-Grounded Question Draft Generator
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Source-grounded single-best-answer practice question draft generation delivered inside the Study Assistant. Generates 4-option MCQs strictly grounded in selected Study Source content; includes verbatim excerpt provenance, radio-based correct answer selection, local in-memory editing, draft removal, regeneration, and strict Q-Bank isolation (zero session writes, zero attempts, zero accuracy/evidence impact).
- Delivered scope:
  - Domain Contract & Models:
    - `AIQuestionDraft` in `models/ai.ts`: includes `id`, `question`, `options` (4 strings), `correctOptionIndex` (0..3), `explanation`, `sourceExcerpt`, `sourceId`, `sourceTitle`, `topicId`, and `edited`.
    - Batch ceiling: `MAX_QUESTION_DRAFTS = 5`.
  - Service & Prompt Design:
    - Provider-neutral `buildQuestionDraftPrompt()` in `services/ai/prompts.ts` with strict grounding rules, medical scope limits, and verbatim source excerpts.
    - `StudyAIService.generateQuestionDrafts()` in `services/ai/studyAIService.ts` validates source grounding via `isExcerptGrounded()`, enforces 4 options, valid `correctOptionIndex`, and non-empty explanations.
    - Rejects ungrounded excerpts with `grounding_failed` and malformed structures with `invalid_response`.
  - Mock Provider Modes:
    - `MockAIProvider` extended deterministically for question generation: `normal`, `bad_grounding`, `malformed`, `invalid_correct_index`, `empty_options`, `empty_result`, and `unavailable`.
  - UI Mode & Entry:
    - 4th action tab `Questions` (`t.studyAi.questionsTab` / "Sorular") added to Study Assistant (`app/topics/[id]/assistant.tsx`).
    - Action CTA: `Generate question drafts` (`t.studyAi.generateQuestions` / "Soru taslakları oluştur").
    - Selecting a different source clears question drafts.
  - Draft Presentation & Editing:
    - Explicit non-Q-Bank notice: `"Draft — not counted as Q-Bank activity"` / `"Taslak — Q-Bank etkinliği olarak sayılmaz"`.
    - Displays source title provenance and verbatim source excerpt.
    - Editable fields: question, each of the 4 options, explanation, and correct answer selection via radio button (`accessibilityRole="radio"`).
    - Local React state only; marked with `Edited` badge.
    - Draft removal (`removeQuestion`), clear all (`clearQuestions`), and regenerate (`regenerateQuestions` replaces draft set).
  - Strict Q-Bank Isolation:
    - ZERO writes to `qbank_sessions`.
    - ZERO calls to `qbankRepo.insertSession`.
    - ZERO store mutations in `useQBankStore`.
    - ZERO accuracy, attempt, or practice evidence contamination.
  - Provider & Runtime Isolation:
    - UI strictly imports from `services/ai/studyAIClient`.
    - Zero direct imports of `GeminiAIProvider` or `fetch`.
    - Runtime provider remains Mock.
  - Schema & Dependencies:
    - Schema remains strictly **v12** unchanged.
    - Zero `package.json` modifications.
  - Localization & Accessibility:
    - Complete 1:1 EN/TR parity across all 17 question draft keys in `studyAi`.
    - Radio semantics (`accessibilityRole="radio"`, `accessibilityRole="radiogroup"`, `accessibilityState={{ checked }}`).
- Dedicated Validation:
  - `scripts/validate-phase10-step9.cjs`: 10 comprehensive check suites covering contracts, prompt rules, service grounding, mock modes, UI integration, local editing, strict Q-Bank isolation, provider isolation, schema v12 integrity, localization parity, and accessibility.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1–9 Suites: ALL PASS (93 checks)
  - Total: 319 automated checks passing.
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING

## Historical — Phase 10 Step 8: PDF / Document Ingestion Pipeline

- Phase 10 Step 8 implementation: PARTIAL (Picker + pipeline foundation + plain text extraction + truthful PDF capability boundary + manual text import fallback).
- Phase 10 automated/static validation: PASS (all 11 Step 8 checks pass).
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Safe document ingestion pipeline foundation established. User can pick local documents (PDF, plain text), inspect file metadata, extract readable text where supported on-device (plain text/markdown), receive truthful capability reporting for PDF extraction in the current Expo/Hermes runtime, use manual text fallback, preview content, and explicitly persist as StudySource with `source_type = 'document'`.
- Delivered scope:
  - Document Picker:
    - Expo-compatible local document selection via `expo-document-picker`.
    - Supported types: `application/pdf`, `text/plain`, `text/markdown`.
    - Cancel-safe; unsupported formats safely rejected.
  - Extraction Architecture:
    - Provider-neutral `DocumentExtractor` interface in `services/documents/documentExtractor.ts`.
    - Domain limits: max file size 5 MB (`MAX_DOCUMENT_FILE_SIZE_BYTES`), max text length 100,000 chars (`MAX_DOCUMENT_TEXT_LENGTH`).
    - `TextExtractor`: local text extraction for plain text and markdown with whitespace normalization and empty-content rejection.
    - `PdfExtractor`: truthful capability boundary for current Expo/Hermes managed runtime. Declares extraction unavailable without custom native builds/OCR; zero fake extraction; zero cloud upload; zero OCR.
    - `CompositeDocumentExtractor`: delegates based on MIME type and file extension.
  - Ingestion UI & Invariants:
    - Dedicated screen: `app/topics/[id]/sources/import-document.tsx`.
    - Uses `<ScreenWrapper includeBottomSafeArea>` with responsive keyboard-avoiding scroll.
    - Metadata display: file name, formatted size, detected MIME type.
    - Informational banner for unavailable on-device extraction with manual text import fallback.
    - Pre-persistence validation (topic verification, title trimmed non-empty, content trimmed non-empty, limits enforced).
    - Explicit confirmation CTA ("Save as Study Source" / "Çalışma Kaynağı Olarak Kaydet").
    - No automatic persistence; original file bytes/binaries/URIs are NOT stored in SQLite.
  - Canonical Study Source Persistence:
    - Reuses `studySourceRepo.insert({ topicId, title, content, sourceType: 'document' })`.
    - Foreign key cascade preserved on topic deletion.
    - Schema remains strictly **v12** unchanged.
  - Isolation:
    - Zero AI provider calls or network uploads during ingestion.
    - StudyAIService does not parse documents; Gemini provider does not receive file bytes.
    - Zero writes to Memory (`flashcards`, `flashcard_reviews`), Q-Bank (`qbank_sessions`), or Analytics (`focus_sessions`).
  - Localization & Accessibility:
    - Complete 1:1 EN/TR parity across 27 keys in `documentImport` and `studySources.importDocument`.
    - Meaningful accessibility roles, labels, and state indicators.
- Dedicated Validation:
  - `scripts/validate-phase10-step8.cjs`: 11 test suites covering architecture isolation, extractor limits/utilities, truthful PDF capability boundary, text extractor functionality, canonical persistence, cascade deletion, database isolation, UI safeguards, localization parity, and accessibility.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1–8 Suites: ALL PASS (83 checks)
  - Total: 309 automated checks passing.
  - Phase 10 Step 5 Suite: ALL PASS (15 checks)
  - Phase 10 Step 6 Suite: ALL PASS (11 checks)
  - Phase 10 Step 7 Suite: ALL PASS (11 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING

## Historical — Phase 10 Step 6: Source-Grounded Flashcard Draft Generator

- Phase 10 Step 6 implementation: COMPLETE.
- Phase 10 automated/static validation: PASS.
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Source-grounded flashcard DRAFT generation delivered inside the Study Assistant; editable drafts, removal, regeneration, and strict ephemeral boundaries verified.
- Delivered scope:
  - Entry Point & UI Mode:
    - Extended Study Assistant (`app/topics/[id]/assistant.tsx`) with a 3rd action tab: `Flashcards` (`t.studyAi.flashcardsTab`).
    - Clean 3-tab segmented layout (Explain, Summarize, Flashcards) with responsive minimum widths.
  - Draft Generation Workflow:
    - Selected `StudySource` + `Topic` converted to `AISourceContext` via `toAISourceContext()`.
    - Invokes `StudyAIService.generateFlashcardDrafts(context)` with strict verbatim source excerpt grounding.
    - Respects `MAX_FLASHCARD_DRAFTS` (5-card batch ceiling).
    - Provider-neutral runtime: uses `MockAIProvider` by default for zero-cost offline development.
  - Draft Presentation & Scope:
    - Displays drafts with explicit notice: `"Draft — review before saving"` / `"Taslak — kaydetmeden önce gözden geçir"`.
    - Shows source provenance (`t.studyAi.basedOnSource(sourceTitle)`) and calm source-only note (`t.studyAi.sourceOnlyNote`).
    - Shows verbatim `sourceExcerpt` for each draft in an accessible sub-container.
    - Displays draft count badge (`t.studyAi.draftCount(drafts.length)`).
  - Local Editing & Management:
    - Users can edit front and back locally in React state (multiline, keyboard-safe, no fixed-height clipping).
    - Edited cards are marked with an `Edited` (`t.studyAi.editedBadge`) badge.
    - Editing does NOT alter the underlying Study Source or bypass generation grounding.
    - Users can remove individual drafts (`t.studyAi.removeDraft`) or clear all drafts (`t.studyAi.clearDrafts`).
    - Controlled regenerate action (`t.studyAi.regenerate`) replaces the current draft set without duplicate appends.
  - Persistence Safety & Step 6 Boundaries:
    - AI-generated drafts are strictly ephemeral React state.
    - Zero DB writes: NO inserts into `flashcards`, `cards`, `decks`, or `reviews`.
    - Memory/SRS evidence and Q-Bank evidence remain completely untouched.
    - Zero Save / Add to Deck / Approve buttons in Step 6 (deferred to human approval flow in Step 7).
    - Database schema remains **v12** unchanged.
  - Error Handling & Grounding:
    - Grounding failures, malformed outputs, and unavailable providers map safely to localized messages without leaking technical internals.
  - Localization:
    - Extended `studyAi` namespace in `i18n/en.ts` and `i18n/tr.ts` with 16 new keys (parity verified).
- Dedicated Validation:
  - `scripts/validate-phase10-step6.cjs`: 11 test suites covering entry point, service isolation, source selection, draft generation, grounding rejection, local editing, draft removal/clear/regenerate, persistence safety, scope labels, localization parity, accessibility, and zero credentials.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1 Suite: ALL PASS (8 checks)
  - Phase 10 Step 2 Suite: ALL PASS (8 checks)
  - Phase 10 Step 3 Suite: ALL PASS (9 checks)
  - Phase 10 Step 4 Suite: ALL PASS (9 checks)
  - Phase 10 Step 5 Suite: ALL PASS (15 checks)
  - Phase 10 Step 6 Suite: ALL PASS (11 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Phase 10 Step 7 (Human-in-the-Loop Flashcard Approval & Deck Import Flow).

## Historical — Phase 10 Step 5: Source-Grounded Study Assistant UI

- Phase 10 Step 5 implementation: COMPLETE.
- Phase 10 automated/static validation: PASS.
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: First source-grounded Study Assistant UI delivered using provider-neutral StudyAIService with mock-first runtime and ephemeral results.
- Delivered scope:
  - Provider-Neutral Service Access (`services/ai/studyAIClient.ts`):
    - Factory providing `StudyAIService` to UI screens (`getStudyAIService()`, `setStudyAIProvider()`, `resetStudyAIClient()`).
    - Uses deterministic `MockAIProvider` by default for zero-quota offline development.
    - Zero vendor SDK or provider-specific imports leaked to UI components.
  - Entry Point & Route:
    - Topic detail (`app/topics/[id].tsx`) features a "Study Assistant" (`t.studyAi.assistant`) action.
    - Dedicated task-oriented route (`app/topics/[id]/assistant.tsx`) built with `<ScreenWrapper includeBottomSafeArea>`.
    - Implements safe back navigation (`router.canGoBack()` -> `router.back()`, fallback to topic detail) and Android `hardwareBackPress`.
  - Source Selection & Truthful State:
    - Lists topic-linked study sources displaying title and source type badge (entire source content is never dumped into selection cards).
    - Auto-selects if exactly one source exists; supports selecting single source via accessible radiogroup.
    - If topic has no study sources, shows calm empty state directing user to add one.
    - Re-verifies source existence in DB before execution; displays localized truthful stale-source error (`sourceMissing`) if deleted.
    - Changing selected source resets previous result state to avoid provenance confusion.
  - Explain Workflow:
    - Requires concept query input with clear validation (`conceptRequired`).
    - Converts selected `StudySource` + `Topic` into `AISourceContext` via `toAISourceContext()`.
    - Invokes `studyAIService.explainConcept()` with strict grounding.
  - Summarize Workflow:
    - Action generates concise source summary without requiring user query.
    - Invokes `studyAIService.summarizeSource()`.
  - Result Model & Ephemeral State:
    - State machine: `idle` | `loading` | `success` | `error`.
    - Ephemeral React state only; zero persistence in SQLite; zero conversation history.
    - User can clear results at any time via `clearResult` button.
  - Grounding Visibility & Medical Scope:
    - Prominently displays source title provenance (`t.studyAi.basedOnSource(sourceTitle)`).
    - Includes calm source-only grounding label (`"Based only on the selected study source."` / `"Yalnızca seçilen çalışma kaynağına dayanır."`).
    - Subtle academic disclaimer (`"For study use. Verify important details against your course material."`).
    - No claims of clinical diagnosis or treatment advice.
  - Error Handling & Security:
    - Domain errors mapped to safe localized copy without leaking raw HTTP, API keys, stack traces, or SQLite internals.
  - Localization:
    - Added `studyAi` namespace in `i18n/en.ts` and `i18n/tr.ts` with strict parity across all keys.
  - Boundaries & Isolation:
    - Zero schema changes (remains **v12**).
    - Flashcard generation UI deferred to Step 6.
    - Gemini adapter exists from Step 4 but credential settings and runtime activation remain deferred.
- Dedicated Validation:
  - `scripts/validate-phase10-step5.cjs`: 15 test suites covering entry point, route, service isolation, SQLite source selection, explain workflow, summarize workflow, ephemerality, grounding visibility, safe error mapping, EN/TR parity, accessibility semantics, and scope boundaries.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1 Suite: ALL PASS (8 checks)
  - Phase 10 Step 2 Suite: ALL PASS (8 checks)
  - Phase 10 Step 3 Suite: ALL PASS (9 checks)
  - Phase 10 Step 4 Suite: ALL PASS (9 checks)
  - Phase 10 Step 5 Suite: ALL PASS (15 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Phase 10 Step 6 (AI-Assisted Flashcard Generation & Human Approval Flow).

## Historical — Phase 10 Step 4: First Real AI Provider Integration

- Phase 10 Step 4 implementation: COMPLETE.
- Phase 10 automated/static validation: PASS.
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Google Gemini integrated as the first real AIProvider implementation behind the provider-neutral abstraction layer via raw fetch REST adapter.
- Delivered scope:
  - Gemini AI Provider (`services/ai/geminiProvider.ts`):
    - Concrete implementation of `AIProvider` interface (`id = 'gemini'`, `name = 'Google Gemini'`).
    - Raw fetch REST transport targeting Google Generative Language API endpoint (`/v1beta/models/{model}:generateContent`).
    - Default model: `gemini-1.5-flash` isolated as a constant.
    - Zero vendor SDK dependencies (no `@google/genai` or Node-specific packages), ensuring Hermes/Expo runtime stability.
    - Zero vendor-specific types leaked outside the provider file.
  - Authentication & Security:
    - API key injected strictly via constructor/factory config (`createGeminiProvider({ apiKey, ... })`).
    - Passed via `x-goog-api-key` header; never included in URL query strings to avoid proxy/history log exposure.
    - Zero hardcoded keys; zero `process.env` direct reads in provider; zero secret leakage in error messages.
    - Credentials are NOT persisted yet (SecureStore deferred to provider settings step).
  - Request Construction:
    - Accurately maps systemPrompt (`systemInstruction`), userPrompt, and grounding sources into standard Gemini contents hierarchy.
    - Explicitly preserves sourceTitle, topicName, and source content blocks.
    - Configures temperature and maxOutputTokens from optional `AIGenerateOptions`.
  - Structured Output:
    - Uses `generationConfig: { responseMimeType: 'application/json' }`.
    - Parses JSON safely with automatic markdown code-fence stripping fallback.
    - Rejects empty candidates, empty parts, and malformed JSON payloads.
  - Error Mapping:
    - Translates network failures, request timeouts, HTTP 401/403 (auth), HTTP 429 (rate limit), and HTTP 5xx (server) into safe `AIServiceError` instances.
    - Redacts API keys from any provider error messages before exposure.
  - StudyAIService Integration:
    - Verified seamless orchestration with `createStudyAIService`: `explainConcept`, `summarizeSource`, and `generateFlashcardDrafts` with verbatim source grounding.
  - Network Boundary & Offline Core:
    - MedOS core (Curriculum, Focus, Memory, Q-Bank, Analytics, Study Sources CRUD) remains 100% offline.
    - Only `GeminiAIProvider` executes outbound network requests when invoked.
    - Automated test suite uses 100% mocked fetch; zero API quota consumed.
    - AI UI routes and generation persistence remain deferred.
    - Database schema remains **v12** unchanged.
- Dedicated Validation:
  - `scripts/validate-phase10-step4.cjs`: 9 test suites covering provider contract, text generation, structured JSON generation, malformed JSON rejection, StudyAIService orchestration, error mapping, security key sanitization, health check, and offline core isolation.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1 Suite: ALL PASS (8 checks)
  - Phase 10 Step 2 Suite: ALL PASS (8 checks)
  - Phase 10 Step 3 Suite: ALL PASS (9 checks)
  - Phase 10 Step 4 Suite: ALL PASS (9 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Phase 10 Step 5 (Provider Settings / Secure Key Storage & AI Active Recall UI).

## Historical — Phase 10 Step 3: Study Source Ingestion + Management UI

- Phase 10 Step 3 implementation: COMPLETE.
- Phase 10 automated/static validation: PASS.
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Topic-linked study source ingestion and management UI fully operational with plain text, notes, and textual document content.
- Delivered scope:
  - Topic Detail Integration (`app/topics/[id].tsx`):
    - Added "Study Sources" section to topic detail screen.
    - Displays source title, source type badge (`Text`, `Note`, `Document`), and localized updated timestamp.
    - Action button to add a new study source (`/topics/[id]/sources/new`).
    - Focus-aware screen lifecycle refreshes the source list via `studySourceRepo.getByTopic(id)`.
    - Calm localized empty state (`t.studySources.empty`) and error feedback (`t.studySources.loadError`) with retry.
  - Create Source Route (`app/topics/[id]/sources/new.tsx`):
    - Dedicated creation route utilizing `ScreenWrapper includeBottomSafeArea`.
    - Validates required title and content with whitespace trimming and localized feedback.
    - Persists new source to SQLite via `studySourceRepo.insert()`.
    - Safe back navigation (`router.canGoBack()` with fallback to topic detail `/topics/[id]`).
  - Source Detail / Edit Route (`app/topics/[id]/sources/[sourceId].tsx`):
    - View and edit modes for study sources.
    - Shows title, source type badge, localized updated date, and scrollable content without fixed-height clipping.
    - Update saves via `studySourceRepo.update()` preserving `createdAt`.
    - Deletion with native confirmation alert (`Alert.alert`) and safe return to topic detail.
    - Truthful not-found feedback (`t.studySources.notFound`) for missing/deleted sources.
  - Reusable Form Component (`components/study-sources/StudySourceEditor.tsx`):
    - Controlled form supporting title, multiline content, and source type selector (`text`, `note`, `document`).
    - Accessible `radiogroup` and `radio` roles with non-color-only selected states.
    - Native `KeyboardAvoidingView` and `ScrollView` for smooth typing and pasting of long lecture notes.
  - Source Type Semantics:
    - Strictly explicit textual content: `text` (pasted/plain study text), `note` (user's own study note), `document` (textual document content).
    - PDF parsing, file pickers, binary storage, and URI fields remain strictly deferred.
  - Localization & Accessibility:
    - Dedicated `studySources` namespace with 100% parity across `i18n/en.ts` and `i18n/tr.ts`.
    - Zero raw SQLite errors exposed to users.
    - Full screen-reader semantics (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`).
  - Isolation & Security:
    - Zero real AI providers (Gemini / OpenAI).
    - Zero network calls (`fetch` unused).
    - Zero API keys or secrets.
    - AI generation still not connected; AI drafts not persisted.
    - Database schema remains **v12** unchanged.
- Dedicated Validation:
  - `scripts/validate-phase10-step3.cjs`: 9 test suites covering topic integration, create route, edit/detail route, reusable editor, runtime CRUD & timestamp integrity, error masking, localization parity, accessibility semantics, and network/AI isolation.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1 Suite: ALL PASS (8 checks)
  - Phase 10 Step 2 Suite: ALL PASS (8 checks)
  - Phase 10 Step 3 Suite: ALL PASS (9 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Phase 10 Step 4 (First Real AI Provider Integration).

## Historical — Phase 10 Step 2: Study Sources Data Layer (Schema v12)

- Phase 10 Step 2 implementation: COMPLETE.
- Phase 10 automated/static validation: PASS.
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Topic-linked study source data layer established with schema v12 migration, factual repository, cascade deletion, and AI context adapter.
- Delivered scope:
  - Database Schema (v12):
    - Added `study_sources` table: `id`, `topic_id`, `title`, `content`, `source_type`, `created_at`, `updated_at`.
    - Strict SQLite constraints: `source_type IN ('text', 'note', 'document')`, non-empty `title`, non-empty `content`, `FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE`.
    - Index: `idx_study_sources_topic_created` on `study_sources(topic_id, created_at DESC)`.
    - Schema version advanced to **v12**.
  - Domain Model (`models/studySource.ts`):
    - Defined `StudySourceType`, `StudySource`, `CreateStudySourceInput`, `UpdateStudySourceInput`.
    - Zero AI-specific or vendor leakages (no embeddings, token counts, or provider fields).
  - Repository Layer (`db/repositories/studySourceRepo.ts`):
    - Implemented `insert`, `update`, `delete`, `getById`, `getByTopic`, `countByTopic`.
    - Input validation: trims text, rejects empty/whitespace title/content, enforces allowed source types, validates topic existence before insert.
    - Timestamp semantics: `createdAt` preserved across updates; `updatedAt` updates to current timestamp.
    - Clean entity mapping: SQLite column names isolated within repository.
  - AI Source Context Adapter (`services/ai/sourceContext.ts`):
    - Pure adapter `toAISourceContext(source, topic)` converting persisted `StudySource` and `Topic` metadata into provider-neutral `AISourceContext`.
    - Executes zero database queries and requires zero vendor SDKs.
  - Cascade Deletion:
    - Topic deletion cascades to attached study sources automatically.
    - Committee hierarchy deletion cascades through subjects and topics down to study sources.
  - Draft Non-Persistence:
    - Zero persistence tables for AI drafts (`ai_drafts`, `ai_generations`, `generated_flashcards`).
    - AI-generated drafts remain ephemeral in-memory until explicit human review and approval.
  - Security & Isolation:
    - Zero network calls (`fetch` unused).
    - Zero API keys or secrets in codebase.
    - Zero vendor SDKs installed.
- Dedicated Validation:
  - `scripts/validate-phase10-step2.cjs`: 8 test suites covering schema v12, table constraints, repository CRUD, ordering, input validation, cascade deletion, AI context adapter, draft non-persistence, and security scans.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1 Suite: ALL PASS (8 checks)
  - Phase 10 Step 2 Suite: ALL PASS (8 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Phase 10 Step 3 (Study Source Ingestion & Topic Management UI).

## Historical — Phase 10 Step 1: Provider Contracts + Study AI Service Foundation

- Phase 10 Step 1 implementation: COMPLETE.
- Phase 10 automated/static validation: PASS.
- Phase 9 implementation + validation: COMPLETE.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Phase 10 AI study engine foundation established with zero network, zero credentials, and offline deterministic mock provider.
- Delivered scope:
  - Domain Types (`models/ai.ts`):
    - Provider-neutral contracts: `AIProvider`, `AIProviderId`, `AISourceContext`, `AIGenerateOptions`, `AIGenerateTextRequest`, `AIGenerateTextResult`, `AIGenerateStructuredRequest`, `AIProviderHealth`.
    - Generated content models: `AIFlashcardDraft`, `AIExplanationResult`, `AISummaryResult`.
    - Domain error model: `AIServiceError` with stable codes (`provider_unavailable`, `invalid_response`, `source_not_supported`, `grounding_failed`, `generation_limit_exceeded`).
    - Zero subjective scores (no `confidenceScore`, `hallucinationScore`, `qualityScore`, or `readinessPercent`).
  - Prompts & Grounding Contracts (`services/ai/prompts.ts`):
    - Pure builders for explanation (`buildExplainPrompt`), summarization (`buildSummarizePrompt`), and draft active recall (`buildFlashcardDraftPrompt`).
    - Core grounding directives: rely strictly on supplied study material; declare insufficient source if not covered; forbid fabricated citations, pages, or external medical facts.
    - Medical education scope: academic coursework and exam preparation only; strictly forbids clinical advice, diagnosis, triage, or treatment recommendations.
    - Excerpt grounding validator: `isExcerptGrounded()` validates verbatim source excerpts with whitespace normalization.
  - Study AI Service (`services/ai/studyAIService.ts`):
    - Provider-neutral orchestration service (`createStudyAIService`).
    - Enforces batch limits (`MAX_FLASHCARD_DRAFTS = 5`).
    - Validates source context and rejects malformed provider responses.
    - Validates source provenance and verifies excerpt grounding on every candidate draft.
    - Pure draft generation: never persists flashcards to database; human review remains mandatory.
  - Deterministic Mock Provider (`services/ai/mockProvider.ts`):
    - Offline, zero-network test provider supporting multiple deterministic modes (`normal`, `malformed`, `bad_grounding`, `unavailable`).
  - Security & Isolation:
    - Zero vendor SDKs installed (no `@google/genai`, no `openai`).
    - Zero API keys or secrets in codebase; zero network calls (`fetch` unused).
    - Database schema remains **v11** strictly unchanged.
- Dedicated Validation:
  - `scripts/validate-phase10-step1.cjs`: 8 test suites covering domain types, prompts, excerpt grounding, mock provider modes, service orchestration, batch limits, flashcard repo isolation, security scans, and network isolation.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
  - Phase 10 Step 1 Suite: ALL PASS (8 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Phase 10 Step 2 (Study Sources Data Layer / Schema v12).

## Historical — Phase 9 Step 5: Final Integrity + Dedicated Test Sweep + QA Prep

- Phase 9 implementation: COMPLETE.
- Phase 9 automated/static validation: PASS.
- Phase 9 physical UI QA: PENDING (device validation deferred to combined QA).
- Phase 8 physical regression QA: PENDING (still deferred).
- Status: Phase 9 implementation complete, awaiting physical device QA before release closure.
- Delivered scope:
  - Architecture Integrity: Verified strict linear pipeline: SQLite facts -> repository aggregation -> deterministic rules -> priority engine -> UI. Zero business logic recalculation in UI, zero hidden numerical scores, zero psychiatric/ADHD inference, zero AI/prediction.
  - Query Integrity & CTE Optimization: Refactored `getCommitteeAnalytics` to accept optional preloaded topic evidences, eliminating the duplicate execution of the topic CTE query on committee screen load while strictly preserving existing contracts. Zero N+1 query loops.
  - Dedicated Master Suite (`scripts/validate-phase9.cjs`):
    - Real in-memory SQLite fixture with full migration to schema v11.
    - End-to-end verification of Domain Rules, Repository SQL CTEs, Priority Engine, and UI Contracts.
    - Explicit edge case coverage:
      A. Empty committee (0 topics, coverage null, no fake 0% readiness).
      B. Topic with cards but zero reviews (practiced = false, retention = null).
      C. 1/1 Q-Bank (100% accuracy, but sample guard prevents Strong status).
      D. Multi-topic aggregation: Topic A 1/1, Topic B 50/100 -> 51/101 = 50% (never averaged 75%).
      E. Memory retention: 6/10 good/easy reviews = 60%.
      F. Strong but stale: mastery 'strong', neglect 'stale' -> included in revisit list, excluded from weak list.
      G. Missing/deleted topic/subject/committee yields truthful null/empty array without fabricated state.
      H. DB error encapsulation: raw SQLite errors never reach analytics UI.
  - Truthfulness: Confirmed absolute absence of `readinessPercent`, `confidenceScore`, `passProbability`, `weaknessScore`, `examProbability`, `attentionScore`, `adhdSeverity` across Phase 9 runtime files.
  - Physical QA Preparation: Prepared combined Phase 8 + Phase 9 physical device QA checklist for Phone and Tablet.
- Database: Schema v11 strictly unchanged.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Step 1–4 validators: ALL PASS (34 checks)
  - Phase 9 Master Suite: ALL PASS (10 checks)
- Physical QA Status:
  - Phase 8: PENDING
  - Phase 9: PENDING
- Next: Combined Phase 8 + Phase 9 physical device QA.

## Historical — Phase 9 Step 4: Committee Analytics UI Integration

- Phase 9 Step 4 implementation COMPLETE. (Phase 8 implementation complete; Phase 8 physical regression QA remains DEFERRED).
- Delivered scope:
  - Analytics UI Components (`components/analytics/`):
    - `CommitteeAnalyticsSummary`:
      - Displays factual multi-signal exam evidence for current committee: curriculum coverage (`X / Y topics practiced · Z%`), Q-Bank practice (`X questions · Y% accuracy`), Memory reviews (`X% retention · Y due`), and topic state distribution (`needs attention`, `stale`, `never studied`).
      - Strictly truthful null handling: unpracticed Q-Bank renders "No Q-Bank practice" (never fake 0%), unreviewed Memory renders "No Memory reviews" (never fake 0%), empty committee renders "No topics in committee" (never fake 0%).
      - Section title: "Exam Evidence" (TR: "Sınav Kanıtı").
      - No composite "Exam Readiness %", pass probability, or pseudo-scientific scores.
    - `WeakTopicsList`:
      - Displays top 5 prioritized topics needing attention from `getWeakTopics(...)`.
      - Factual weakness reasons rendered with supporting metrics (`low_qbank_accuracy` -> "% · questions", `low_memory_retention` -> "% · reviews", `due_reviews` -> "cards due").
      - No weakness score, danger styling, or alarmist copy.
      - Actionable row navigation to canonical topic detail (`/topics/[id]`).
      - Section title: "Needs Attention" (TR: "İlgi Gerektirenler").
    - `NeglectedTopicsList`:
      - Displays top 5 prioritized curriculum areas from `getNeglectedTopics(...)`.
      - Factual status: "Not studied yet" (for `never_studied`) and "Last studied X days ago" (today / yesterday / X days ago for `stale`).
      - Preserves orthogonal distinction from weak topics (no implication of failure/weakness for merely stale topics).
      - Actionable row navigation to canonical topic detail (`/topics/[id]`).
      - Section title: "Needs Revisit" (TR: "Tekrar Bakılması Gerekenler").
  - Committee Detail Integration (`app/committees/[id].tsx`):
    - Efficient batch data loading: calls `analyticsRepo.getCommitteeAnalytics(id)` and `analyticsRepo.getCommitteeTopicAnalytics(id)` once on screen focus.
    - Derives priority lists in JS via pure deterministic rules (`getWeakTopics` and `getNeglectedTopics`).
    - Zero per-topic SQLite queries (no N+1).
    - Local screen state with calm loading, localized error handling, and retry action.
    - Zero global analytics Zustand store introduced.
  - Localization & Accessibility:
    - Dedicated `analytics` namespace with 100% key parity and signature matching across `i18n/en.ts` and `i18n/tr.ts`.
    - Meaningful `accessibilityRole` and descriptive `accessibilityLabel` on all interactive and metric elements.
    - Zero color-only status communication; no fixed-height truncation.
- Database: Schema v11 strictly unchanged.
- Dedicated Validation:
  - `scripts/validate-phase9-step4.cjs`: 10 test suites covering component contracts, batch data flow, lack of fake scores, truthful null handling, factual weak reasons, factual neglect status, localization parity, and accessibility.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Steps 1, 2, 3, and 4: ALL PASS
- Phase 8 physical regression QA remains DEFERRED; Phase 8 is not marked complete.
- Next: Phase 9 Step 5 (Subject / Topic analytics integration or dashboard polish).

## Historical — Phase 9 Step 3: Weak & Neglected Topic Engine

- Phase 9 Step 3 implementation COMPLETE. (Phase 8 implementation complete; Phase 8 physical regression QA remains DEFERRED).
- Delivered scope:
  - Domain types updated (`models/analytics.ts`):
    - `WeakTopicReason`: `'low_qbank_accuracy' | 'low_memory_retention' | 'due_reviews'`
    - `WeakTopicItem`: includes `topicId`, `subjectId`, `topicName`, `subjectName?`, `reasons`, `qbankAccuracyPercent`, `questionCount`, `memoryRetentionPercent`, `reviewCount`, `dueCardCount`, `lastActiveAt`.
    - `NeglectedTopicItem`: includes `topicId`, `subjectId`, `topicName`, `subjectName?`, `neglectStatus`, `lastActiveAt`, `daysSinceActive`.
    - Zero pseudo-scientific scores, confidence, or pass probability fields.
  - Reason Identification (`utils/analyticsRules.ts`):
    - `identifyWeakTopicReasons(topic)`: returns threshold-backed reasons (`low_qbank_accuracy`, `low_memory_retention`, `due_reviews`).
  - Priority Engine (`utils/analyticsPriorityRules.ts`):
    - `getWeakTopics(topics, limit?)`:
      - Qualification: strictly `masteryStatus === 'needs_attention'`. (Unstudied, in-progress, and strong topics are excluded; no re-classification).
      - Deterministic comparator hierarchy:
        1. Multiple weakness reasons before single-reason topics
        2. Due reviews present (immediate actionable SRS load)
        3. Lower Q-Bank accuracy, when sample-size-qualified (min 10 questions)
        4. Lower Memory retention, when sample-size-qualified (min 5 reviews)
        5. Higher due card count (when both have due reviews)
        6. Older `lastActiveAt` (least recently touched first; null = never active)
        7. Canonical topic name / ID tie-break
      - Null handling: unstudied / small samples are never treated as 0% accuracy or 0% retention.
    - `getNeglectedTopics(topics, limit?, now?)`:
      - Qualification: `neglectStatus === 'never_studied' || neglectStatus === 'stale'` (recent excluded).
      - Orthogonality: neglect is strictly independent from mastery (a strong topic can be stale).
      - Priority order: `never_studied` first, then stale topics oldest-activity first, then canonical tie-break.
      - Factual `daysSinceActive`: derived via canonical local calendar days for stale topics; null for `never_studied`.
    - Committee helpers: `getCommitteeWeakTopics` and `getCommitteeNeglectedTopics`.
    - Immutability: source arrays are never mutated.
- Performance & Invariants:
  - Database schema remains v11 strictly unchanged.
  - No SQL added; pure in-memory deterministic engine operating over `TopicAnalyticsEvidence[]`.
  - No composite readiness or exam probability scores created.
- Dedicated Validation:
  - `scripts/validate-phase9-step3.cjs`: 10 test suites covering weak qualification, multi-reason priority, sample-size-qualified accuracy/retention comparisons, multi-tier sorting, neglect qualification/independence, calendar-day calculation, boundary/limit conditions, immutability, absence of fake scores, and committee helpers.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Steps 1, 2, and 3: ALL PASS
- Phase 8 physical regression QA remains DEFERRED; Phase 8 is not marked complete.
- Next: Phase 9 Step 4 (learning analytics stores / UI integration).

## Historical — Phase 9 Step 2: Analytics Repository & Batch Aggregation

- Phase 9 Step 2 implementation COMPLETE. (Phase 8 implementation complete; Phase 8 physical regression QA remains DEFERRED).
- Delivered scope:
  - Analytics Repository (`db/repositories/analyticsRepo.ts`):
    - `getTopicAnalytics(topicId, now?)`: Returns factual evidence across Q-Bank, Memory, and Focus with exact predicate reuse, delegating classification to pure deterministic rules (`analyticsRules.ts`).
    - `getCommitteeTopicAnalytics(committeeId, now?)`: Batch single-pass CTE query joining `topics`, `subjects`, and `committees` with aggregated `qbank_sessions`, `flashcards`, `flashcard_reviews`, and `focus_sessions`. Eliminates per-topic N+1 loops while preserving unpracticed/zero-evidence topics.
    - `getSubjectAnalytics(subjectId, now?)`: Fetches constituent topic evidence via batch CTE and summarizes using raw totals.
    - `getCommitteeAnalytics(committeeId, now?)`: Constant 3 SQLite calls (existence check, subjects list, batch topic query) regardless of curriculum size. Computes aggregates from raw numerators/denominators; never averages topic percentages.
  - Canonical MedOS Semantics Preserved:
    - Focus: Exact concluded-study predicate (`actual_duration_sec > 0`, `ended_at >= started_at`, completed or cancelled >= 30s).
    - Memory: Review success requires rating `good` or `easy` (excludes `again` and `hard`). Due cards require `schedule_state != 'unscheduled' AND next_review <= now`. Owning flashcards alone !== practice.
    - Q-Bank: Raw sums of questions and correct count. Unlinked sessions (`topic_id IS NULL`) and cross-committee topics strictly excluded.
  - Truthful Zero/Null Handling:
    - Missing/deleted entity IDs return `null` (or `[]` for topic lists).
    - Zero-evidence topic yields `accuracyPercent: null`, `retentionPercent: null`, `lastActiveAt: null`, `masteryStatus: 'unstudied'`, `neglectStatus: 'never_studied'`.
    - Zero-practice subject/committee yields `coveragePercent: 0%` if topics exist; `coveragePercent: null` if 0 topics.
- Performance & Index Audit:
  - High-value existing indexes (`idx_qbank_sessions_topic_id`, `idx_flashcards_deck_id`, `idx_flashcard_reviews_reviewed_at`, `idx_focus_sessions_started_at`, `idx_topics_subject_order`, `idx_subjects_committee_order`) support queries efficiently without schema changes.
  - Schema remains v11 unchanged (no schema v12 or migrations added).
- Dedicated Validation:
  - `scripts/validate-phase9-step2.cjs`: 5 test suites covering topic evidence, batch CTE N+1 prevention, raw aggregate percentages (e.g. 51/101 = 50%, not 75%), zero/null handling, and cards-only practice exclusion.
- Full Regression Suite:
  - TypeScript: PASS (0 errors)
  - Phase 2–6 validators: ALL PASS (216 checks)
  - Phase 9 Step 1 & Step 2 validators: ALL PASS
- Phase 8 physical regression QA remains DEFERRED; Phase 8 is not marked complete.
- Next: Phase 9 Step 3 (learning analytics stores & reactive queries).

## Historical — Phase 9 Step 1: Learning Analytics Domain Models & Pure Rules

- Phase 9 Step 1 implementation COMPLETE. (Phase 8 implementation complete; Phase 8 physical regression QA remains DEFERRED).
- Delivered scope:
  - Analytics domain models (`models/analytics.ts`):
    - `TopicMasteryStatus`: `'unstudied' | 'needs_attention' | 'in_progress' | 'strong'`
    - `TopicNeglectStatus`: `'never_studied' | 'recent' | 'stale'` (strictly separated from mastery)
    - `TopicAnalyticsEvidence`, `SubjectAnalyticsSummary`, `CommitteeAnalyticsSummary`, `WeakTopicItem`, `NeglectedTopicItem`, `ExamEvidenceSummary`.
    - Strictly avoids fake predictive composite scores, IRT claims, or pseudoscientific "Exam Readiness %".
  - Pure deterministic analytics rules (`utils/analyticsRules.ts`):
    - `calculateAccuracy`, `calculateRetention`, `calculateLastActiveAt`.
    - `isPracticed`: requires actual Focus session, Memory review, or Q-Bank question (having flashcards alone !== practice).
    - `classifyTopicMastery`: sample-size-gated heuristics (Q-Bank min 10 questions < 60% or Memory min 5 reviews < 70% or due cards > 0 => `needs_attention`; min 15 Q-Bank >= 75% AND min 10 reviews >= 80% AND 0 due cards => `strong`; Focus minutes represent investment, never correctness, so Focus alone never grants Strong). Thresholds documented as transparent product heuristics.
    - `classifyTopicNeglect`: 14 local calendar days threshold via canonical civil day calculation (`differenceInLocalCalendarDays`).
    - Raw aggregate calculations (`calculateCoverage`, `summarizeSubjectAnalytics`, `summarizeCommitteeAnalytics`): strictly preserves raw numerators/denominators; never averages topic percentages.
    - `summarizeExamEvidence`: multi-signal factual summary.
- Database: Schema v11 strictly unchanged (Schema v12 NOT REQUIRED).
- Validation: TypeScript EXIT 0; Phase 2 (21 PASS), Phase 3 (90 PASS), Phase 4 (43 PASS), Phase 5 (29 PASS), Phase 6 (33 PASS); Phase 9 Step 1 focused test suite (9 test suites) PASS.
- Next: Phase 9 Step 2 (analytics repository aggregations).

## Historical — Phase 8 Step 3: Safe Area / Responsive Hardening

- Phase 8 Step 3 implementation COMPLETE.
- Delivered scope:
  - Standalone stack form safe areas: Enabled `includeBottomSafeArea` on `<ScreenWrapper>` in `app/qbank/new.tsx`, `app/decks/new.tsx`, `app/decks/[id]/edit.tsx`, `app/committees/new.tsx`, `app/calendar/new.tsx`, and `app/calendar/[id]/edit.tsx` to prevent Save/Cancel action button overlap with gesture bars and 3-button navigation.
  - Verified existing delegates: `SubjectEditor.tsx` (for `app/subjects/new.tsx`, `app/subjects/edit/[id].tsx`), `TopicEditor.tsx` (for `app/topics/new.tsx`, `app/topics/edit/[id].tsx`), and `app/committees/edit/[id].tsx` already safely opt into `includeBottomSafeArea`.
  - Verified tab screen isolation: Tab screens in `app/(tabs)/` remain strictly unchanged; tab bar continues to manage its own bottom system inset.
  - Layout & responsive invariants: Zero manual inset duplication, zero arbitrary fixed padding, keyboard avoidance (`KeyboardAvoidingView`) preserved, vertical scrolling and action button layouts intact, phone and tablet centered/max-width layouts preserved.
- Validation: TypeScript EXIT 0; Phase 2 (21 PASS), Phase 3 (90 PASS), Phase 4 (43 PASS), Phase 5 (29 PASS), Phase 6 (33 PASS); Phase 8 Step 2 test suite PASS; Phase 8 Step 3 focused test suite (26 checks) PASS.
- Remaining Phase 8 findings: None.

## Historical — Phase 8 Step 2: Accessibility & Truthful Error States

- Phase 8 Step 2 implementation COMPLETE.
- Delivered scope:
  - Accessibility: `components/dashboard/TodayMetrics.tsx` composed meaningful localized `accessibilityLabel` for Focus, Memory, and Q-Bank metric cards including metric title, factual formatted values, and action hints while preserving visual UI and existing validator assertions.
  - Evidence Error States: `components/memory/TopicReviewEvidence.tsx` and `components/curriculum/CommitteeLearningEvidence.tsx` distinguish query failure from zero-practice state, rendering localized error message and retry action via `FeedbackState` without raw SQLite errors or screen redesign.
  - Input Accessibility: `components/ui/Input.tsx` merges `invalid: Boolean(invalid || accessibilityState?.invalid)` into `accessibilityState` without overriding caller properties.
  - Stale Topic Handling: `db/repositories/qbankRepo.ts` detects foreign key constraint violations and maps to truthful localized stale-topic error; `app/qbank/new.tsx` translates error without raw SQLite text and prevents silent unlinked saving.
  - Localization parity: Full EN/TR parity maintained in `i18n/en.ts` and `i18n/tr.ts`.
- Validation: TypeScript EXIT 0; Phase 2 (21 PASS), Phase 3 (90 PASS), Phase 4 (43 PASS), Phase 5 (29 PASS), Phase 6 (33 PASS); Phase 7 master suite PASS; Phase 8 Step 2 focused test suite PASS.
- Remaining Phase 8 debt: Safe Area / Responsive finding (standalone stack form routes bottom inset handling).

## Historical — Phase 8 Step 1: Validator Modernization & Targeted Quality Audit

- Phase 8 started. Phase 7 Q-Bank physical phone QA PASS and physical tablet QA PASS. Phase 7 pushed to remote.
- Schema version: v11. Legacy validators (Phase 2–6) modernized to support additive schema evolution (`CURRENT_VERSION >= 10`) while strictly preserving historical invariants, table/column constraints, and domain-specific regression checks.
- Full static regression suite:
  - TypeScript (`tsc --noEmit`): PASS (0 errors)
  - Phase 2 (`validate-phase2.cjs`): 21 PASS
  - Phase 3 (`validate-phase3.cjs`): 90 PASS
  - Phase 4 (`validate-phase4.cjs`): 43 PASS
  - Phase 5 (`validate-phase5.cjs`): 29 PASS
  - Phase 6 (`validate-phase6.cjs`): 33 PASS
  - Phase 7 focused suite (`test-phase7-master.cjs`): PASS
- Targeted Quality Audit completed (evidence-backed findings):
  - HIGH: None.
  - MEDIUM:
    - Safe Area / Responsive: Standalone stack form routes (`app/qbank/new.tsx`, `app/decks/new.tsx`, `app/committees/new.tsx`, `app/calendar/new.tsx`, `app/subjects/new.tsx`, `app/topics/new.tsx`) render `<ScreenWrapper>` without `includeBottomSafeArea`, risking action button overlap with gesture bars.
    - Accessibility: Metric cards in `components/dashboard/TodayMetrics.tsx` set `accessibilityLabel` exclusively to action text (`openFocus`, `openMemory`, `logSession`), obscuring numeric metrics from screen readers.
    - Error States: `components/memory/TopicReviewEvidence.tsx` and `components/curriculum/CommitteeLearningEvidence.tsx` swallow Q-Bank query errors and render empty practice state (`noPractice`) rather than an error/retry state.
  - LOW:
    - Accessibility: `components/ui/Input.tsx` does not reflect `invalid` in native `accessibilityState`.
    - Navigation / Stale Entity: Concurrent topic deletion during `/qbank/new` produces a generic save failure instead of notifying the user of missing foreign key context.
  - Privacy: Confirmed zero telemetry, tracking, background sensors, or attention inference.
- Runtime application files modified: NONE. No new features, UI redesign, or schema changes.

## Historical — Phase 7 Q-Bank Tracking Engine

- Phase 7 implementation COMPLETE. Master Phase 6 remains ACTIVE awaiting physical phone/tablet QA; Phase 7 physical QA PENDING.
- Delivered scope:
  - Schema v11: additive `qbank_sessions` table with constraints (`total_questions > 0`, `0 <= correct_count <= total_questions`, `duration_sec >= 0`), nullable foreign key `topic_id REFERENCES topics(id) ON DELETE SET NULL`, and indexes on `topic_id` and `created_at`.
  - Canonical models & repository: `models/qbank.ts` (`QBankSession`, `CreateQBankSessionInput`, `QBankEvidenceSummary`) and `db/repositories/qbankRepo.ts` implementing `insert`, `delete`, `getRecent`, `getByTopic`, `getById`, `getTopicEvidence`, `getCommitteeEvidence`.
  - Store: `useQBankStore` (`loadRecentSessions`, `addSession`, `deleteSession`, `clearError`) integrated into barrel export `store/index.ts`.
  - Manual practice logging UI: `app/qbank/new.tsx` with numeric validation, minutes-to-seconds conversion, optional topic link picker, optional source name, safe back navigation fallback, and entry button on Memory tab.
  - Learning evidence integration: topic detail (`TopicReviewEvidence.tsx`) and committee detail (`CommitteeLearningEvidence.tsx`) show questions solved and accuracy %, strictly excluding unlinked sessions from curriculum-scoped evidence.
  - Daily dashboard integration: `dashboardRepo.getQBankSummary`, `useDashboardStore`, and `TodayMetrics.tsx` displaying today's total questions solved and accuracy % using local day boundaries on `created_at`; unlinked sessions included globally; supplementary action opening `/qbank/new` without altering adaptive `QuickStartCard` logic.
  - Bilingual localization: full EN/TR parity in `i18n/en.ts` and `i18n/tr.ts` with zero hardcoded user-visible text.
- Explicitly deferred: advanced analytics, exam-readiness prediction, AI question generation, PDF ingestion, third-party Q-Bank sync.
- Validation: TypeScript EXIT 0; focused Phase 7 master test (schema, repo, UI, evidence, dashboard, i18n parity) EXIT 0; existing legacy validators exhibit expected exact baseline schema v10 assertions.

## Historical — Full EN/TR Localization Sweep

- Full user-facing EN/TR sweep COMPLETE; existing i18n/useAppStore language architecture retained. This explicitly supersedes the earlier localization deferral. Physical localization and combined Phase 6 QA remain PENDING, user-owned; no emulator/ADB/device automation.
- Audited all app/component surfaces: tabs, Dashboard, curriculum/evidence/Exam Plan, Focus/support/breaks, Memory/SRS, Calendar, Profile and motivation. Filled Committee/Deck/Card/Event CRUD, confirmation, empty/error/fallback, count, badge, placeholder and accessibility gaps; already-localized surfaces kept intact.
- Existing terminology retained: Komite → Ders → Konu; Odaklanma, Bellek, Tekrar, Hafif plan, Düşük uyaran modu and Bugünün 3 Hedefi. Removed the isolated Memory/Bellek synonym mismatch and clarified Review again as a repeat-review action.
- Calendar generated titles/subtitles now use raw non-persisted presentation inputs at render time; user names/descriptions are never parsed or translated. Month/day/date and recent-review formatting follow the selected app locale. No new queries, stored records, date arithmetic, ordering or scheduling behavior.
- System errors translate at render time; unknown driver diagnostics show a truthful localized failure instead of raw technical text. Existing errors/drafts remain in their owning state. Language settings, hydration guard and persisted study data are unchanged.
- Intentionally untranslated: user-created content, MedOS name, native language names English/Türkçe, internal enums/routes/SQL/logs and historical developer docs. No literal English JSX text or textual UI attributes remain in the audited app/components; static coverage is not physical layout evidence.
- Schema v10; no migration, package/version/dependency, persistence or store changes. CalendarItem only gains erased presentation typing; existing Calendar runtime store code is identical after transpilation. Focus/SRS, evidence, Check-In matrix, Recovery, Momentum and Exam Plan rules remain frozen.
- Validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 (21 PASS), Phase 3/localization (90 PASS), Phase 4 (43 PASS), Phase 5 (29 PASS). Phase 6 exhibits legacy baseline failures where pre-localization git baselines (commits 10a9291, 037072f) assert byte-for-byte exact matches of intentionally localized files (app/(tabs)/focus.tsx, app/decks/[id]/review.tsx, i18n/en.ts, i18n/tr.ts). Preserved regression groups; added catalog key/type/parameter parity, static reference/UI-copy checks, bilingual generated Calendar copy, error translation and frozen-domain checks.
- Changes: 43 files — UI routes/components, existing EN/TR catalogs, new i18n/errors.ts, Calendar presentation metadata/date formatting, Phase 2/3/6 validators and these four memory docs. No product redesign.
- Branch localization-en-tr-sweep; local commit only, no push or main merge. Master Phase 6 ACTIVE; Phase 7 NOT STARTED; PDF/Gemini roadmap-only. Prior QA statuses unchanged.
- Next: user checks EN/TR switching + restart, CRUD/validation/delete/error states, Calendar dates/generated labels, user-content preservation and long-copy/large-font layouts on phone/tablet; then completes the existing combined Phase 6 checklist. Do not close Master Phase 6 without explicit phone AND tablet PASS.

## Historical — Phase 6.6 Technical Closure

- Phase 6.1–6.6 implementation/technical closure COMPLETE. Master Phase 6 remains ACTIVE until user phone AND tablet QA passes. Combined physical QA PENDING; no device/emulator/ADB automation. Phase 7 NOT STARTED.
- Final reward semantics: one inline acknowledgement after positive-duration persisted non-cancelled Focus finish, including entry Finish here, or successful final Memory rating with positive session count. No reward for cancel, screen/Recovery opening, selection, milestone alone, foreground or navigation return. Route-local blur/reset guards prevent replay; no reward history.
- Today's 3: positive completed Focus today; at least one persisted Memory rating today; positive completed Topic-linked Focus today. Existing local finish/rating-day query and focus/foreground/midnight refresh unchanged. One linked session may meet both Focus targets, explicitly disclosed; daily-minute preference remains separate.
- Adaptive Motivation reuses Phase 3 exactly (scattered/okay/focused): low 2/15/15, steady 15/25/25, good 15/25/45. Overrides and Lighter Plan remain available; explicit actions only. Recovery/Start Small keep original flows; completed records alone affect Momentum.
- Low-Stimulation preserves copy, controls, accessibility state and destinations; only styling differs. Bilingual JS element-tree contracts now cover both reward types, Momentum states, all nine recommendations and every duration override. This is not native layout/device QA.
- Audit found no new product defect requiring a change. No product code modified. Fixed a validator portability defect by normalizing CRLF before source assertions; retained all regression groups. Added entry milestone/Keep Going no-write and single durable finish coverage.
- Schema v10; dependencies, stores, persistence, Focus, SRS/evidence, Exam Plan and UI unchanged. No analytics, telemetry, trends, reward tracking, streaks, XP, coins, levels, notifications or PDF/Gemini.
- Validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21, Phase 3 85, Phase 4 43, Phase 5 29, Phase 6 33 PASS — 211 total. Phase 6 rerun passed after the CRLF test correction.
- Modified only scripts/validate-phase6.cjs and four project-memory docs. Combined QA checklist is in AGENT_HANDOFF.md below; prior phase QA statuses remain unchanged.
- Local branch phase-6-6-phase6-closure; commit only, no push/main merge. Next action: user runs the combined checklist on phone first, then tablet. Master Phase 6 must not be marked CLOSED before both results are explicitly confirmed.

## Historical — Phase 6.5 Motivation UI / Presentation Polish

- Implementation COMPLETE; Phase 6 ACTIVE. Phase 6.1–6.5 phone/tablet physical QA PENDING. Prior user-confirmed QA unchanged; no device/emulator/ADB automation.
- Only MiniVictory, MomentumCard and AdaptiveRecommendationCard presentation touched. Cards now use width 100% with the existing 620dp constrained-workspace pattern; no navigation/container/safe-area redesign.
- MiniVictory: compact secondary body with clear spacing; quiet smaller dismiss control retains >=44dp target, bounded width and wrapping text. Reward triggers/dismissal state unchanged.
- Momentum: subtle row separators, compact wrapping navigation controls, and a screen-reader text group combining each target with its factual recorded/pending state. Navigation button remains a separate accessible control; no checkbox or mastery-style progress bar.
- Adaptive result: smaller tablet heading, higher-emphasis readable input context, wrapping primary/alternative/Lighter Plan buttons and flexible duration tiles. All nine outcomes, text, selected radio semantics and actions unchanged. Recovery's existing bounded/scrollable integration already fits; not modified.
- Low-Stimulation retains identical copy/actions and existing neutral variants; no live announcements, blanket opacity reduction, animation or new mechanics.
- Schema v10; dependencies, stores, persistence, Focus/SRS, Today’s 3, matrix, navigation, shared primitives and reward gating unchanged. No new files or translations.
- Validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21, Phase 3 85, Phase 4 43, Phase 5 29, Phase 6 30 PASS — 208 total. Visual byte-freeze checks replaced narrowly by unchanged pre-render state/callback/copy contracts and layout/accessibility assertions. These are static checks, not device layout QA.
- Modified three cards, validate-phase6 and four project-memory docs. User QA: phone/tablet portrait/landscape, large EN/TR text, target/status reading order, dismiss and navigation buttons, Low-Stimulation, all duration options/Lighter Plan and safe area.
- Local branch phase-6-5-motivation-ui-polish; commit only, no push/merge. Next: user presentation QA and review. Phase 6.6 NOT STARTED; PDF/Gemini and new motivation mechanics not implemented.

## Historical — Phase 6.4 Reward & Recovery Integration

- Implementation COMPLETE; Phase 6 ACTIVE. Phase 6.1–6.4 physical phone/tablet QA PENDING; no emulator/ADB/device automation. Earlier user-confirmed QA unchanged.
- Recovery remains an optional route into existing entry Focus, bounded Memory or Calendar. Opening/selecting does not write completion, meet Momentum or show MiniVictory. No Recovery behavior changes.
- Start Small decision: preserve existing positive-duration persisted Finish here acknowledgement. Elapsed milestone/Keep Going alone are not durable completion and do not earn feedback. No new persistence or extra milestone reward.
- Narrow fix: Memory MiniVictory now appears only from a successful final rating callback with positive reviewed count. Its route-local visibility clears on blur and when starting another review. Returning to a retained complete screen cannot replay it. Foreground/Low-Stimulation rerenders cannot create another reward; Focus already has equivalent blur cleanup and durable receipt gating.
- Today’s 3 unchanged: completed non-cancelled positive Focus today; at least one persisted rating today; completed Topic-linked positive Focus today. Partial Memory exit has no completion reward but already-persisted ratings still truthfully meet the Memory target. No unrelated targets auto-complete.
- Recovery, matrix (low 2/15/15; steady 15/25/25; good 15/25/45 for scattered/okay/focused), alternative durations and Lighter Plan unchanged. MiniVictory/Momentum/adaptive quiet styling and content unchanged.
- Existing focused navigation/foreground/local-midnight refresh reused, listener cleanup verified; no polling, repeated all-three celebration, analytics, reward history or new global state. Schema v10, dependencies and SRS unchanged.
- Changed only Memory review route, validate-phase6 and these four documents; no new files. Tests combine real store callbacks with in-memory Momentum SQL and exercise refresh listener cleanup; reward UI gating checks remain explicitly static contracts, not physical QA.
- Validation: TypeScript EXIT 0; dependency tree EXIT 0; Phase 2 21, Phase 3 85, Phase 4 43, Phase 5 29, Phase 6 26 PASS — 204 total.
- User QA: Recovery → Start Small → Finish/Cancel; Recovery max-five review → completion/early exit; leave/return/foreground after acknowledgement; Review again; Momentum refresh; Low-Stimulation and phone/tablet safe area. No need to retest unrelated CRUD.
- Branch phase-6-4-reward-recovery-integration, local commit only. Next: user physical QA and review. Do not push, merge main or start Phase 6.5. PDF/Gemini remains deferred.

## Historical — Phase 6.3 Adaptive Motivation

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

## Canonical Next Recommended Action

**Retroactive Gap Closure Audit**

- Review outstanding or deferred QA and historical debt across Phase 3, Phase 6, Phase 8, Phase 9, Phase 10, and Phase 11.
- Active branch: `localization-en-tr-sweep`
- Next after gap closure: Phase 13 — UX Architecture & Ergonomic Reorganization (PLANNED / NOT STARTED).

---

## HISTORICAL / LEGACY CONTEXT (Early Phases Archive)

> [!NOTE]
> The sections below represent historical milestones from earlier development phases (Phases 3 and 4, schema v6).
> They are retained for archival reference and must not override the active Phase 12 development status.

### Historical Phase 4.2 Note (Archival Reference Only)
- (Legacy checkpoint: Phase 4.2 Subject CRUD was completed and merged in commit `e22cf4e`. Active development has since progressed through Phase 10 and Phase 12 with schema v13).
