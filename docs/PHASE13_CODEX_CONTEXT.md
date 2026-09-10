# MedOS Phase 12 Final Baseline — Codex Context Pack

> **Document Type**: Architecture & Subsystem Specification Map  
> **Purpose**: Enables rapid, token-efficient context hydration for Phase 13 without recursive workspace scanning.  
> **Baseline Integrity**: Schema v14, TypeScript clean, Expo SDK 57.0.21, Phase 12.9 (40/40 PASS).

---

## 1. Baseline

### Technical Stack & Dependencies
| Component | Pinned Version | Package Reference |
| :--- | :--- | :--- |
| **Runtime Framework** | Expo SDK `~57.0.21` | [`package.json`](file:///c:/medos/package.json) |
| **Routing** | Expo Router `~57.0.20` | [`app/`](file:///c:/medos/app) |
| **Mobile Core** | React Native `0.86.3` | `react-native` |
| **UI Runtime** | React `19.2.3` | `react`, `react-dom` |
| **Type System** | TypeScript `~6.0.3` | [`tsconfig.json`](file:///c:/medos/tsconfig.json) |
| **Database Engine** | Expo SQLite `~57.0.2` | [`db/client.ts`](file:///c:/medos/db/client.ts) |
| **Styling Engine** | Uniwind `^1.3.0` + Tailwind CSS `^4.1.18` | [`global.css`](file:///c:/medos/global.css) |
| **State Management** | Zustand `^5.0.15` | [`store/`](file:///c:/medos/store) |
| **Offline Key Storage** | Expo SecureStore `~57.0.3` | [`services/ai/credentialStore.ts`](file:///c:/medos/services/ai/credentialStore.ts) |
| **Static Analysis** | ESLint `^9.0.0` (`eslint-config-expo` flat) | [`eslint.config.js`](file:///c:/medos/eslint.config.js) |
| **Code Formatter** | Prettier `^3.9.6` | [`.prettierrc.json`](file:///c:/medos/.prettierrc.json) |

### Database & Schema Status
- **Current SQLite Schema Version**: `14` (tracked in `_schema_version` table via [`db/migrations.ts`](file:///c:/medos/db/migrations.ts)).
- **Foreign Keys**: Enforced at startup (`PRAGMA foreign_keys = ON;`).
- **Transactional Safety**: All migrations and atomic compound writes use `db.withTransactionSync(...)`.

### Baseline Validation Health
- `npx.cmd tsc --noEmit`: **PASS** (0 errors).
- `npx.cmd expo lint`: **PASS** (0 errors).
- `npx.cmd expo-doctor`: **PASS** (21/21 checks passed).
- `npm.cmd ls --depth=0`: **PASS** (clean dependency tree).
- `node scripts/validate-phase12-step9.cjs`: **40/40 PASS** (0 failed).
- `npx.cmd expo export --platform android`: **PASS** (Hermes bytecode bundle `.hbc` verified).

---

## 2. Repository Map

```
c:\medos
├── app/                  # Expo Router filesystem routing (tabs, modal screens, deep routes)
├── assets/               # Static icons, splash images, and fonts
├── components/           # UI presentation components grouped by academic/domain modality
├── constants/            # Route constants and shared invariants
├── db/                   # SQLite client, migrations (v1-v14), and entity repositories
├── docs/                 # Architectural specifications, audits, and roadmap archives
├── hooks/                # Reusable React hooks (theme, database gate, timer, responsive)
├── i18n/                 # Translation dictionaries (en, tr) and localization bridge
├── models/               # Canonical TypeScript domain entities, DTOs, and contracts
├── scripts/              # Independent Node.js validation test runners (Phase 2 through 12.9)
├── server/               # Microservice for PDF/PPTX/OCR document extraction (Render deployment)
├── services/             # Core business logic: AI, RAG, retrieval, embeddings, chunking
├── store/                # Zustand client state stores (focus, memory, calendar, dashboard, etc.)
├── theme/                # Design tokens: palette, typography, spacing, shadows, theme bridge
└── utils/                # Pure business rules, scheduling heuristics, analytics math, date utils
```

### Layer Relationships & Boundaries
1. **`app/` -> `components/` & `store/`**: Screens are thin orchestrators. Screens subscribe to Zustand stores and call repositories/services.
2. **`components/` -> `theme/` & `hooks/`**: Components consume tokens via `useTheme()` and `useResponsive()`. They do not query SQLite directly.
3. **`store/` -> `db/repositories/`**: Zustand actions delegate data persistence and queries to synchronous repositories.
4. **`db/repositories/` -> `db/client.ts` & `models/`**: Repositories execute raw parameterized SQL statements against the single Expo SQLite handle.
5. **`services/` -> `db/repositories/` & `models/`**: Intelligence pipelines (retrieval, indexing, RAG, AI) compose repository operations and domain models without UI coupling.

---

## 3. Navigation & Screens

Root router is defined in [`app/_layout.tsx`](file:///c:/medos/app/_layout.tsx) with `<DatabaseGate>` wrapping the primary `<Stack>`.

### Route Table & Screen Inventory

| Route Path | File Location | Purpose & Modality |
| :--- | :--- | :--- |
| `/(tabs)/` | [`app/(tabs)/index.tsx`](file:///c:/medos/app/(tabs)/index.tsx) | Dashboard: QuickStart, TodayMetrics, Agenda, Recent Activity |
| `/(tabs)/committees` | [`app/(tabs)/committees.tsx`](file:///c:/medos/app/(tabs)/committees.tsx) | Academic Committee listing, exam countdowns, progress stats |
| `/(tabs)/focus` | [`app/(tabs)/focus.tsx`](file:///c:/medos/app/(tabs)/focus.tsx) | Focus timer (Standard / Entry / Adaptive), active session |
| `/(tabs)/memory` | [`app/(tabs)/memory.tsx`](file:///c:/medos/app/(tabs)/memory.tsx) | Flashcard decks, due card counters, recent review history |
| `/(tabs)/calendar` | [`app/(tabs)/calendar.tsx`](file:///c:/medos/app/(tabs)/calendar.tsx) | Unified timeline, day agenda, month grid, manual event entry |
| `/(tabs)/ai` | [`app/(tabs)/ai.tsx`](file:///c:/medos/app/(tabs)/ai.tsx) | *(Hidden tab)* Standalone AI conversational interface |
| `/(tabs)/profile` | [`app/(tabs)/profile.tsx`](file:///c:/medos/app/(tabs)/profile.tsx) | *(Hidden tab)* Profile, theme, language, navigation to AI settings |
| `/committees/new` | [`app/committees/new.tsx`](file:///c:/medos/app/committees/new.tsx) | Modal: create new Committee |
| `/committees/[id]` | [`app/committees/[id].tsx`](file:///c:/medos/app/committees/[id].tsx) | Committee detail: subject list, evidence snapshot, progress |
| `/committees/edit/[id]` | [`app/committees/edit/[id].tsx`](file:///c:/medos/app/committees/edit/[id].tsx) | Edit committee metadata, dates, color accent |
| `/committees/exam-plan/[id]`| [`app/committees/exam-plan/[id].tsx`](file:///c:/medos/app/committees/exam-plan/[id].tsx) | Exam prep plan generator and scheduled topic distribution |
| `/committees/[id]/study-plan`| [`app/committees/[id]/study-plan.tsx`](file:///c:/medos/app/committees/[id]/study-plan.tsx) | Structured committee curriculum study planner |
| `/subjects/new` | [`app/subjects/new.tsx`](file:///c:/medos/app/subjects/new.tsx) | Create Subject under parent Committee |
| `/subjects/[id]` | [`app/subjects/[id].tsx`](file:///c:/medos/app/subjects/[id].tsx) | Subject detail: Topic hierarchy list, analytics metrics |
| `/subjects/edit/[id]` | [`app/subjects/edit/[id].tsx`](file:///c:/medos/app/subjects/edit/[id].tsx) | Edit subject name and description |
| `/topics/new` | [`app/topics/new.tsx`](file:///c:/medos/app/topics/new.tsx) | Create Topic under parent Subject |
| `/topics/[id]` | [`app/topics/[id].tsx`](file:///c:/medos/app/topics/[id].tsx) | Topic hub: materials, cards, QBank sessions, linked focus |
| `/topics/edit/[id]` | [`app/topics/edit/[id].tsx`](file:///c:/medos/app/topics/edit/[id].tsx) | Edit topic metadata & learning objectives |
| `/topics/[id]/assistant` | [`app/topics/[id]/assistant.tsx`](file:///c:/medos/app/topics/[id]/assistant.tsx) | Topic RAG assistant: grounding queries on topic sources |
| `/topics/[id]/sources/new` | [`app/topics/[id]/sources/new.tsx`](file:///c:/medos/app/topics/[id]/sources/new.tsx) | Add manual text/note study material |
| `/topics/[id]/sources/import-document` | [`app/topics/[id]/sources/import-document.tsx`](file:///c:/medos/app/topics/[id]/sources/import-document.tsx) | Document import picker (PDF, PPTX, Image) |
| `/topics/[id]/sources/[sourceId]` | [`app/topics/[id]/sources/[sourceId].tsx`](file:///c:/medos/app/topics/[id]/sources/[sourceId].tsx) | Material viewer: chunks, terms, OCR text, visual analysis |
| `/decks/new` | [`app/decks/new.tsx`](file:///c:/medos/app/decks/new.tsx) | Create new flashcard Deck |
| `/decks/[id]` | [`app/decks/[id]/index.tsx`](file:///c:/medos/app/decks/[id]/index.tsx) | Deck view: card inventory, filter by topic, start review |
| `/decks/[id]/review` | [`app/decks/[id]/review.tsx`](file:///c:/medos/app/decks/[id]/review.tsx) | SRS review session for a single Deck |
| `/decks/[id]/cards/new` | [`app/decks/[id]/cards/new.tsx`](file:///c:/medos/app/decks/[id]/cards/new.tsx) | Create flashcard with optional Topic linkage |
| `/decks/[id]/cards/[cardId]/edit` | [`app/decks/[id]/cards/[cardId]/edit.tsx`](file:///c:/medos/app/decks/[id]/cards/[cardId]/edit.tsx) | Edit flashcard front/back and topic link |
| `/memory/review` | [`app/memory/review.tsx`](file:///c:/medos/app/memory/review.tsx) | Global SRS review session across all due cards |
| `/calendar/new` | [`app/calendar/new.tsx`](file:///c:/medos/app/calendar/new.tsx) | Create manual calendar event |
| `/calendar/[id]` | [`app/calendar/[id].tsx`](file:///c:/medos/app/calendar/[id].tsx) | View calendar event details |
| `/calendar/[id]/edit` | [`app/calendar/[id]/edit.tsx`](file:///c:/medos/app/calendar/[id]/edit.tsx) | Edit calendar event |
| `/qbank/new` | [`app/qbank/new.tsx`](file:///c:/medos/app/qbank/new.tsx) | Record QBank practice block (questions, correct, time) |
| `/settings/ai` | [`app/settings/ai.tsx`](file:///c:/medos/app/settings/ai.tsx) | Manage AI provider (Mock, Gemini) & API credentials |
| `/study-support/check-in` | [`app/study-support/check-in.tsx`](file:///c:/medos/app/study-support/check-in.tsx) | Daily energy/attention check-in modal |
| `/study-support/recovery` | [`app/study-support/recovery.tsx`](file:///c:/medos/app/study-support/recovery.tsx) | Academic recovery workflow for neglected topics |

### Tablet & Responsive Behavior
- Configured in [`hooks/useResponsive.ts`](file:///c:/medos/hooks/useResponsive.ts).
- `isTablet` triggers when screen width >= `768dp`.
- On tablets, workspace containers apply a constrained 620dp centered layout (`maxWidth: 620`, `alignSelf: 'center'`) to avoid horizontal distortion.
- Tab bar height and padding automatically expand on tablets and adjust for Android system navigation insets (`Platform.OS === 'android' ? insets.bottom : 0`).

---

## 4. Academic Domain Model

The academic domain represents a strict 3-tier hierarchy with content and evidence attachments:

```
Committee (1) ────< Subject (N) ────< Topic (N)
                                        ├──< StudySource (N) ──< SourceChunk (N) ──< ChunkEmbedding (1)
                                        ├──< Flashcard (linked via topic_id)
                                        ├──< FlashcardReview (snapshot topic_id)
                                        ├──< FocusSession (linked via topic_id)
                                        └──< QBankSession (linked via topic_id)
```

### Entity Specifications

1. **Committee**:
   - Table: `committees` (v1, extended in v2).
   - Fields: `id`, `name`, `subject` (legacy text), `description`, `color`, `start_date`, `exam_date`, `created_at`, `updated_at`.
   - Repository: [`db/repositories/committeeRepo.ts`](file:///c:/medos/db/repositories/committeeRepo.ts).
   - Store: [`store/useCommitteeStore.ts`](file:///c:/medos/store/useCommitteeStore.ts).
2. **Subject**:
   - Table: `subjects` (v6).
   - Fields: `id`, `committee_id` (FK `committees(id)` ON DELETE CASCADE), `name`, `description`, `created_at`, `updated_at`.
   - Repository: [`db/repositories/subjectRepo.ts`](file:///c:/medos/db/repositories/subjectRepo.ts).
   - Store: **None** (direct repository querying pattern).
3. **Topic**:
   - Table: `topics` (v6, extended in v7).
   - Fields: `id`, `subject_id` (FK `subjects(id)` ON DELETE CASCADE), `name`, `description`, `learning_objectives`, `created_at`, `updated_at`.
   - Repository: [`db/repositories/topicRepo.ts`](file:///c:/medos/db/repositories/topicRepo.ts).
   - Store: **None** (direct repository querying pattern).
4. **StudySource**:
   - Table: `study_sources` (v12).
   - Fields: `id`, `topic_id` (FK `topics(id)` ON DELETE CASCADE), `title`, `content`, `source_type` (`'text' | 'note' | 'document'`), `created_at`, `updated_at`.
   - Repository: [`db/repositories/studySourceRepo.ts`](file:///c:/medos/db/repositories/studySourceRepo.ts).
   - Model: [`models/studySource.ts`](file:///c:/medos/models/studySource.ts).

---

## 5. Focus System

### Architecture & Timer Model
- **State Store**: [`store/useFocusStore.ts`](file:///c:/medos/store/useFocusStore.ts).
- **Driver Hook**: [`hooks/useTimer.ts`](file:///c:/medos/hooks/useTimer.ts).
- **Modes**:
  - `standard`: Standard countdown timer configured to user preferences (default 25 or 50 min).
  - `entry`: Micro-focus starter (2 minutes / 120 sec) to combat task inertia; offers a "Keep Going" transition without interrupting momentum.
  - `adaptive`: Recommended durations (15m, 25m, 45m) driven by energy/attention check-in state.
- **States**: `idle`, `running`, `paused`, `overtime`.

### Persistence & Invariants
- Table: `focus_sessions` (v1, extended in v3, v8).
- Columns: `id`, `duration_sec`, `actual_duration_sec`, `completed`, `cancelled`, `committee_id`, `topic_id`, `started_at`, `ended_at`.
- **Cancellation Cutoff**: Sessions shorter than 30 seconds (`MIN_CANCEL_PERSIST_SEC = 30`) are discarded on cancel to avoid polluting study history with false starts.
- Concluded positive study seconds are credited directly to topic/committee analytics evidence.

---

## 6. Tasks / Planning / Calendar

### Data Model & Unification
- **Manual Table**: `calendar_events` (v1, extended in v5).
- Fields: `id`, `title`, `description`, `event_date` (ISO `YYYY-MM-DD` via [`utils/calendarDate.ts`](file:///c:/medos/utils/calendarDate.ts)), `start_time`, `end_time`, `is_all_day`, `color`, `committee_id`, `created_at`, `updated_at`.
- **Timeline Aggregator**: [`db/repositories/timelineRepo.ts`](file:///c:/medos/db/repositories/timelineRepo.ts) synthesizes calendar events, committee milestones (`committee_start`, `committee_exam`), focus sessions, and card reviews into a unified chronological day stream ([`utils/calendarTimeline.ts`](file:///c:/medos/utils/calendarTimeline.ts)).
- **Store**: [`store/useCalendarStore.ts`](file:///c:/medos/store/useCalendarStore.ts).

### Exam & Study Planning
- Rule engine: [`utils/examPlanRules.ts`](file:///c:/medos/utils/examPlanRules.ts).
- Distributes all topics of a committee evenly across the remaining calendar days between `start_date` (or today) and `exam_date`.
- Generates read-only structured study plans without modifying the database schema.

---

## 7. Flashcards / Review (Memory)

### SRS Algorithm & Logic
- Implemented in [`utils/memoryScheduling.ts`](file:///c:/medos/utils/memoryScheduling.ts).
- Ratings: `'again' | 'hard' | 'good' | 'easy'`.
- Schedule states: `'unscheduled' | 'learning' | 'reviewing'`.
- First rating behavior:
  - `again`: reset to 1 day interval, ease penalty (-0.2).
  - `hard`: 1 day interval, slight ease penalty (-0.15).
  - `good`: 1 day interval.
  - `easy`: 3-4 days bonus interval, ease bonus (+0.15).
- Subsequent ratings apply ease multipliers with minimum 1-day step advance.
- Due queries filter cards where `next_review <= Date.now()` ordered due-first.

### Persistence & Topic Attribution
- Tables: `decks`, `flashcards`, `flashcard_reviews` (v1, extended in v4, v9, v10).
- `flashcards.topic_id`: Optional link to academic Topic.
- `flashcard_reviews.topic_id`: **Rating-time snapshot**. Relinking a flashcard to a different topic never re-attributes historical reviews.
- Store: [`store/useMemoryStore.ts`](file:///c:/medos/store/useMemoryStore.ts).
- Repository: [`db/repositories/memoryRepo.ts`](file:///c:/medos/db/repositories/memoryRepo.ts).

---

## 8. QBank / Questions

### Architectural Distinction: Session-Level Aggregation
> [!IMPORTANT]
> MedOS does **NOT** store individual question texts, answer choices, or question-level rows in SQLite.  
> It tracks **session-level practice blocks** to record quantitative factual evidence.

### Data Model & Repositories
- Table: `qbank_sessions` (v11).
- Fields:
  - `id`: TEXT PRIMARY KEY
  - `topic_id`: TEXT (FK `topics(id)` ON DELETE SET NULL)
  - `total_questions`: INTEGER (> 0)
  - `correct_count`: INTEGER (>= 0 and <= total_questions)
  - `duration_sec`: INTEGER (optional)
  - `source_name`: TEXT (optional textbook / bank name, e.g. "TUSDATA", "UWorld")
  - `created_at`: INTEGER (Unix ms)
- Repository: [`db/repositories/qbankRepo.ts`](file:///c:/medos/db/repositories/qbankRepo.ts).
- Store: [`store/useQBankStore.ts`](file:///c:/medos/store/useQBankStore.ts).
- Evidence: Feeds directly into `analyticsRepo` to calculate true percentage accuracy: `(sum(correct) / sum(total)) * 100`.

---

## 9. AI Architecture

### Provider Hierarchy & Boundaries
Configured in [`services/ai/`](file:///c:/medos/services/ai):
- **Credential Store**: [`services/ai/credentialStore.ts`](file:///c:/medos/services/ai/credentialStore.ts) securely manages API keys via `expo-secure-store` with in-memory caching.
- **Providers (Runtime Callable)**:
  - `mockProvider.ts`: Active default offline deterministic provider. Emits realistic medical explanations and study schedules without network access.
  - `geminiProvider.ts`: Active real provider executing direct REST calls to Google Gemini API using configured model (`DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash'`).
  - *(Note: No Claude provider or credential configuration exists in the codebase. Domain model `models/ai.ts` defines `AIProviderId = 'mock' | 'gemini' | 'openai'`, but runtime implementation and UI are strictly Mock and Gemini).*
- **Orchestration Service**: [`services/ai/studyAIService.ts`](file:///c:/medos/services/ai/studyAIService.ts).

### User-Facing AI Capabilities
1. **Topic Assistant (RAG)**: [`app/topics/[id]/assistant.tsx`](file:///c:/medos/app/topics/[id]/assistant.tsx). Grounded QA using retrieved chunks from topic materials.
2. **Visual Understanding**: [`services/ai/visualUnderstandingService.ts`](file:///c:/medos/services/ai/visualUnderstandingService.ts). Generates clinical descriptions, anatomical landmarks, and OCR clarifications for slide/diagram images.
3. **Study Coach / Planning**: Dynamic recommendations derived from factual check-in state.

---

## 10. Materials / PDF / RAG Pipeline

```
[Document / File]
       │
       ▼ (services/documents/documentExtractor.ts)
[Normalized Document: text + images + page numbers]
       │
       ▼ (services/chunking/semanticChunker.ts)
[Source Chunks: tokens, fingerprints, headers, media IDs]
       │
       ├──► SQLite: source_chunks (v13)
       ├──► SQLite: source_chunk_terms (v13 inverted index)
       └──► SQLite: source_chunks_fts (v13 optional FTS5)
       │
       ▼ (services/embedding/embeddingIndexingService.ts)
[Vector Embeddings: 768-dim float arrays]
       │
       └──► SQLite: chunk_embeddings (v14)
```

### Retrieval & Grounding Flow
1. **Query**: User enters question in [`app/topics/[id]/assistant.tsx`](file:///c:/medos/app/topics/[id]/assistant.tsx).
2. **Retrieval**: [`services/retrieval/retrievalService.ts`](file:///c:/medos/services/retrieval/retrievalService.ts):
   - **Lexical Search**: `sourceChunkRepo.search()` queries FTS5, falling back to inverted term index (`source_chunk_terms`).
   - **Semantic Search**: `chunkEmbeddingRepo.searchNearest()` calculates cosine similarity over vectors stored in SQLite.
   - **Hybrid Fusion**: [`services/retrieval/hybridRanker.ts`](file:///c:/medos/services/retrieval/hybridRanker.ts) normalizes and blends scores using Reciprocal Rank Fusion.
   - **Fallback**: If vector provider is unavailable, lexical search serves results without failing.
3. **Prompt Construction**: [`services/rag/contextBuilder.ts`](file:///c:/medos/services/rag/contextBuilder.ts) bounds context window and injects verified chunk citations `[Source: Title, P. X]`.
4. **Answer Generation**: [`services/rag/ragAnswerService.ts`](file:///c:/medos/services/rag/ragAnswerService.ts) returns grounded medical answer with verifiable citation lineage.

---

## 11. Progress / Analytics / Evidence

### Evidence Math & Calculation Principles
Defined in [`utils/analyticsRules.ts`](file:///c:/medos/utils/analyticsRules.ts) and [`db/repositories/analyticsRepo.ts`](file:///c:/medos/db/repositories/analyticsRepo.ts):
- **Single-Pass CTE**: Computes topic evidence in a single database query to eliminate N+1 latency.
- **Accuracy**: `round((sum(correct) / sum(total)) * 100)`. Never averages percentages across days.
- **Retention**: `round((sum(successful_reviews) / sum(all_reviews)) * 100)` where successful is rating in (`good`, `easy`).
- **Mastery Classification**:
  - `unpracticed`: 0 questions and 0 reviews.
  - `struggling`: accuracy < 60% OR retention < 70%.
  - `developing`: practiced, but neither struggling nor mastered.
  - `mastered`: accuracy >= 80% AND retention >= 85% with minimum threshold volume.
- **Neglect Classification**:
  - `critical`: unpracticed for >= 14 days or exam within 7 days with zero practice.
  - `attention_needed`: last active >= 7 days ago.
  - `fresh`: active within 7 days.
- **Integrity Rule**: No psychiatric inferences, fake stress scores, or vanity completion meters.

---

## 12. Persistence & State Architecture

### Storage Segregation Matrix

| Storage Layer | Technology | Contents | Persistence Lifecycle |
| :--- | :--- | :--- | :--- |
| **Relational Data** | SQLite (`medos.db`) | Committees, subjects, topics, study sources, chunks, embeddings, cards, reviews, focus sessions, calendar events, QBank sessions | Permanent on-device |
| **User Preferences** | `AsyncStorage` via Zustand `persist` | Theme (`light`/`dark`), onboarded flag, default focus length, language (`en`/`tr`), low-stimulation mode | Permanent on-device |
| **Secure Secrets** | `expo-secure-store` | AI provider API keys (Google Gemini) | Permanent secure hardware keychain |
| **Transient Session State** | Zustand in-memory | Active timer countdown, active card review card index, transient form state | Volatile (resets on app close) |

### SQLite Client Details ([`db/client.ts`](file:///c:/medos/db/client.ts))
- Opens `medos.db` synchronously via `SQLite.openDatabaseSync('medos.db')`.
- Executes `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;`.
- Handled at app root by `<DatabaseGate>` in [`components/layout/DatabaseGate.tsx`](file:///c:/medos/components/layout/DatabaseGate.tsx).

---

## 13. Design System & UI Infrastructure

### System Tokens & Foundations
- Colors: [`theme/colors.ts`](file:///c:/medos/theme/colors.ts). Medical palette with high contrast, semantic statuses (`success`, `warning`, `error`, `info`), and dark/light modes.
- Spacing: [`theme/spacing.ts`](file:///c:/medos/theme/spacing.ts) (`xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `xxl: 32`).
- Typography: [`theme/typography.ts`](file:///c:/medos/theme/typography.ts). Sized for readability and accessibility.
- Shadows & Radius: [`theme/shadows.ts`](file:///c:/medos/theme/shadows.ts). Subtle elevation curves.

### Component Primitives ([`components/ui/`](file:///c:/medos/components/ui))
- **Card**: Surface with rounded border, background elevation, and pressable states.
- **Button**: Variant-based actions (`primary`, `secondary`, `outline`, `ghost`, `danger`).
- **Input / FormField**: Keyboard-aware text inputs with field-level validation and error display.
- **Badge**: Compact status indicators (`neutral`, `success`, `warning`, `danger`, `info`).
- **ProgressBar**: Accessible percentage bar with min/max clamps.
- **Gluestack UI Wrappers**: [`components/ui/gluestack.ts`](file:///c:/medos/components/ui/gluestack.ts) provides cross-platform layout boxes (`Box`, `VStack`, `HStack`, `Heading`, `GSText`, `Pressable`).

---

## 14. Known Technical Constraints & Invariants

1. **Windows PowerShell Invocation**: Windows blocks `npx.ps1` and `npm.ps1`. **Always invoke `npx.cmd` and `npm.cmd`**.
2. **Strict Offline Test Safety**: All test suites must execute offline with zero mandatory internet calls.
3. **No Unitemized Questions**: QBank questions are logged in aggregate sessions, not individually.
4. **Direct Subject/Topic Repository Access**: Subjects and Topics do not maintain Zustand stores; components call `subjectRepo` and `topicRepo` directly.
5. **Preserved Validator Targets**:
   - `components/committees/CommitteeCard.tsx` and `components/dashboard/MomentumCard.tsx` are required by Phase 6 / 11 validators.
   - `components/dashboard/WeeklyFocusChart.tsx` is preserved but unmounted.
6. **React 19 Hooks Compiler**: `react-hooks/set-state-in-effect` and `react-hooks/purity` are configured to `warn` in `eslint.config.js` to preserve asynchronous data loading patterns in existing screen components.

---

## 15. Validation Infrastructure

MedOS maintains regression testing via standalone Node.js test scripts in [`scripts/`](file:///c:/medos/scripts):

| Test Script | Target Subsystem & Primary Assertions |
| :--- | :--- |
| [`scripts/validate-phase12-step9.cjs`](file:///c:/medos/scripts/validate-phase12-step9.cjs) | **Phase 12.9 Master Suite (40/40 checks)**: Vector store, embedding providers, semantic retrieval, hybrid ranking, fallback cascades, Turkish/English queries, schema v14. |
| [`scripts/validate-phase11.cjs`](file:///c:/medos/scripts/validate-phase11.cjs) | **Phase 11 Master Suite**: UI/UX design invariants, screen layouts, legacy regression runs for Phase 4, Phase 5, and Phase 9. |
| [`scripts/validate-phase10.cjs`](file:///c:/medos/scripts/validate-phase10.cjs) | **Phase 10 Suite**: Document ingestion, chunking algorithms, term tokenizer, fingerprint deduplication, study sources schema v12. |
| [`scripts/validate-phase9.cjs`](file:///c:/medos/scripts/validate-phase9.cjs) | **Phase 9 Suite**: Analytics domain math, accuracy, retention, CTE query validation, mastery & neglect classification. |
| [`scripts/validate-phase6.cjs`](file:///c:/medos/scripts/validate-phase6.cjs) | **Phase 6 Suite**: Dashboard refresh behavior, MomentumCard, focus milestones. |
| [`scripts/validate-phase5.cjs`](file:///c:/medos/scripts/validate-phase5.cjs) | **Phase 5 Suite**: Memory SRS intervals, review logging, due queries, schema v8/v9. |
| [`scripts/validate-phase4.cjs`](file:///c:/medos/scripts/validate-phase4.cjs) | **Phase 4 Suite**: Curriculum hierarchy (Committees, Subjects, Topics), cascade deletes, schema v6/v7. |
| [`scripts/validate-phase3.cjs`](file:///c:/medos/scripts/validate-phase3.cjs) | **Phase 3 Suite**: SQLite database client, transaction rollbacks, schema v1-v5 migrations. |
| [`scripts/validate-phase2.cjs`](file:///c:/medos/scripts/validate-phase2.cjs) | **Phase 2 Suite**: Design system tokens, color contracts, typography, core UI components. |

---

## 16. Critical File Index

| Subsystem | Primary Files | Why Codex May Need Them |
| :--- | :--- | :--- |
| **Database Schema** | [`db/migrations.ts`](file:///c:/medos/db/migrations.ts), [`db/client.ts`](file:///c:/medos/db/client.ts) | Canonical source of truth for all SQLite tables, versions, and indexes |
| **Curriculum Domain** | [`db/repositories/committeeRepo.ts`](file:///c:/medos/db/repositories/committeeRepo.ts), [`subjectRepo.ts`](file:///c:/medos/db/repositories/subjectRepo.ts), [`topicRepo.ts`](file:///c:/medos/db/repositories/topicRepo.ts) | Database operations for committees, subjects, topics |
| **Curriculum Store** | [`store/useCommitteeStore.ts`](file:///c:/medos/store/useCommitteeStore.ts) | Committee state and actions |
| **Analytics Engine** | [`db/repositories/analyticsRepo.ts`](file:///c:/medos/db/repositories/analyticsRepo.ts), [`utils/analyticsRules.ts`](file:///c:/medos/utils/analyticsRules.ts) | CTE queries and math for accuracy, retention, mastery, neglect |
| **Focus Engine** | [`store/useFocusStore.ts`](file:///c:/medos/store/useFocusStore.ts), [`db/repositories/focusRepo.ts`](file:///c:/medos/db/repositories/focusRepo.ts) | Timer states, countdowns, session persistence, 30s cutoff |
| **Memory / SRS** | [`store/useMemoryStore.ts`](file:///c:/medos/store/useMemoryStore.ts), [`db/repositories/memoryRepo.ts`](file:///c:/medos/db/repositories/memoryRepo.ts), [`utils/memoryScheduling.ts`](file:///c:/medos/utils/memoryScheduling.ts) | Spaced repetition algorithm, decks, cards, review history |
| **Calendar / Timeline** | [`store/useCalendarStore.ts`](file:///c:/medos/store/useCalendarStore.ts), [`db/repositories/timelineRepo.ts`](file:///c:/medos/db/repositories/timelineRepo.ts), [`utils/calendarDate.ts`](file:///c:/medos/utils/calendarDate.ts) | Date formatting, timezone-safe date keys, multi-entity timeline |
| **QBank Engine** | [`store/useQBankStore.ts`](file:///c:/medos/store/useQBankStore.ts), [`db/repositories/qbankRepo.ts`](file:///c:/medos/db/repositories/qbankRepo.ts) | Session-level question logging and accuracy aggregation |
| **Study Support** | [`store/useStudySupportStore.ts`](file:///c:/medos/store/useStudySupportStore.ts), [`utils/studySupportRules.ts`](file:///c:/medos/utils/studySupportRules.ts) | Energy/attention check-in, adaptive duration recommendations |
| **Document Ingestion** | [`services/documents/documentExtractor.ts`](file:///c:/medos/services/documents/documentExtractor.ts), [`services/chunking/semanticChunker.ts`](file:///c:/medos/services/chunking/semanticChunker.ts) | Text extraction, page chunking, token estimation, fingerprinting |
| **Vector Store** | [`db/repositories/chunkEmbeddingRepo.ts`](file:///c:/medos/db/repositories/chunkEmbeddingRepo.ts), [`services/embedding/mockEmbeddingProvider.ts`](file:///c:/medos/services/embedding/mockEmbeddingProvider.ts) | SQLite vector storage, cosine similarity calculations |
| **Retrieval Engine** | [`services/retrieval/retrievalService.ts`](file:///c:/medos/services/retrieval/retrievalService.ts), [`services/retrieval/hybridRanker.ts`](file:///c:/medos/services/retrieval/hybridRanker.ts) | Lexical (FTS5/terms) + semantic vector hybrid search fusion |
| **RAG Pipeline** | [`services/rag/contextBuilder.ts`](file:///c:/medos/services/rag/contextBuilder.ts), [`services/rag/ragAnswerService.ts`](file:///c:/medos/services/rag/ragAnswerService.ts) | Grounded prompt assembly, citation lineage tracking, answer generator |
| **AI Provider Layer** | [`services/ai/studyAIService.ts`](file:///c:/medos/services/ai/studyAIService.ts), [`services/ai/credentialStore.ts`](file:///c:/medos/services/ai/credentialStore.ts) | Provider abstraction, secure key access, AI model routing |
| **Design System** | [`theme/colors.ts`](file:///c:/medos/theme/colors.ts), [`theme/spacing.ts`](file:///c:/medos/theme/spacing.ts), [`components/ui/gluestack.ts`](file:///c:/medos/components/ui/gluestack.ts) | Design tokens and core layout primitives |
| **Localization** | [`i18n/index.ts`](file:///c:/medos/i18n/index.ts) | Bilingual localization hook (`useTranslation()`) |
| **App Shell & Tabs** | [`app/_layout.tsx`](file:///c:/medos/app/_layout.tsx), [`app/(tabs)/_layout.tsx`](file:///c:/medos/app/(tabs)/_layout.tsx) | Navigation tree, tab configuration, Android inset compensation |

---

## 17. Files Codex Usually Does NOT Need To Read

1. `node_modules/**` & `server/node_modules/**`: External vendor libraries.
2. `.expo/**` & `dist/**`: Generated local state and build output.
3. `assets/**`: Binary images, icons, fonts.
4. `scripts/validate-*.cjs`: Validation runners (run them via command line; do not read their voluminous verification code unless diagnosing a specific test failure).
5. `i18n/en.ts` & `i18n/tr.ts`: 60KB+ translation dictionary files (only consult when adding or modifying localized UI string keys).
6. `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`, `docs/AGENT_HANDOFF.md`, `docs/LAST_AGENT_REPORT.md`: Historical handoff documents from earlier phases; superseded by this context pack.

---

## 18. Verification Gaps

1. **Live Remote PDF Server**: [`server/pdfServer.js`](file:///c:/medos/server/pdfServer.js) is designed for remote Render deployment (`render.yaml`). In local environments without a live Render instance, PDF extraction gracefully falls back to mock/manual text entry as verified in Phase 12.1.
2. **Live Embedding API Keys**: Embedding tests pass deterministically using `mockEmbeddingProvider.ts`. Live semantic embeddings require the user to input a Gemini API key in [`app/settings/ai.tsx`](file:///c:/medos/app/settings/ai.tsx).
