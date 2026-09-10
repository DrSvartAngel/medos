# MedOS Phase 13B — Codex Track B Architecture

## 1. Architecture Thesis

**Study Continuity** organizes MedOS around choosing work, doing it with visible context, and returning to the next decision. Academic identity travels with activities; navigation does not determine evidence attribution.

Four destinations—Today, Study, Review and Plan—share one study workspace and one activity-context contract. Focus and AI are available capabilities, not competing product areas. Global review and unassigned study remain first-class workflows.

Sources are exclusively [the Phase 12 context pack](PHASE13_CODEX_CONTEXT.md) and [the Phase 13A audit](PHASE13A_CODEX_AUDIT.md). Audit corrections govern visible behavior where summaries differ. This is a target specification, not implemented capability; no additional production inspection was necessary.

## 2. Three Candidate Models

**Candidate 1 — Academic Home.** Navigation: Today, Curriculum, Review, Plan. Committee → Subject → Topic organizes nearly all study; global review bypasses it. Strongest advantage: predictable ownership and attribution. Biggest risk: repeated hierarchy traversal and awkward material-first or unassigned work.

**Candidate 2 — Activity Hub.** Navigation: Today, Learn, Practice, Plan. Students choose reading, recall or questions, then select academic context. Strongest advantage: recognizable actions and fast global entry. Biggest risk: rebuilding context between modalities and splitting flashcards from the materials that generated them.

**Candidate 3 — Study Continuity.** Navigation: Today, Study, Review, Plan. A resumable workspace carries academic/material context across activities; Review supports cross-topic work directly. Strongest advantage: consistent handoffs without mandatory Topic traversal. Biggest risk: context, workspace and active-session state need precise rules to avoid hidden scope changes.

## 3. Selected Track B Model

Select **Study Continuity**. Phase 13A shows that Topic integrations already exist; replacing academic organization would solve the wrong problem. The more important change is a shared context contract and direct transitions between reading and study actions.

Review earns primary navigation because due work legitimately spans Topics and Decks. Plan owns intentions; Today selects what matters now. Study owns academic discovery and sustained work. This separates responsibilities without giving each engine a tab.

The model requires explicit scope, resumable work and truthful completion boundaries. It can improve navigation using schema v14 while deferring durable task tracking, structured card provenance and persistent questions behind separate data requirements.

## 4. Product Mental Model

The student learns: **“Choose work, study in context, review what is due, adjust the plan.”**

- **Primary:** Today for the next action; Study for learning; Review for recall; Plan for commitments.
- **Academic:** Committee establishes course/exam context; Subject groups Topics; Topic identifies what is being studied.
- **Contextual:** Material supplies content; Focus, questions, cards and AI operate on the selected scope.
- **Global:** Due review, search, unassigned Focus and external-practice capture need no Topic prerequisite.
- **Supporting:** Progress interprets evidence; Study Support adjusts initiation; Settings controls preferences/providers.

Topic is destination, workspace context and evidence scope. It is not a mandatory doorway. Deck is a student-controlled collection, not a competing academic hierarchy.

## 5. Primary Navigation

| Destination | Owns | Boundary |
| --- | --- | --- |
| Today | Resume, next action, today's commitments | No dense analytics dashboard. |
| Study | Recent/pinned Topics, curriculum, materials, workspace, Progress access | No separate activity silos. |
| Review | Global due queue, scope filters, Deck/card management | No unrelated QBank shortcut. |
| Plan | Agenda/calendar, deadlines, exam/study planning | No fabricated task completion. |

Profile/Settings opens from a consistent account control. Search and quick actions are shared utilities. Focus appears through Start actions and an active-session control; AI through Ask actions and a dedicated assistant state. Neither is top-level. Progress is reachable from Study and any relevant evidence signal.

## 6. Academic & Context Architecture

Every action receives a **context record**: scope, Committee/Subject/Topic identifiers, optional material/location, optional Deck, entry location and return state. This is an interaction contract, not a new database entity.

Inherited Topic resolves its Subject and Committee; Material resolves its Topic. Invalid or conflicting identifiers block attribution until corrected. Deck controls storage/review filtering, never overrides Topic.

Explicit scope outranks inherited scope. Last-used context is a visible suggestion, never a silent assignment. Global actions default to “All topics” for review and “Unassigned” for Focus/logging. Recent Topics remain one selection away. Committee-only Focus stays valid; QBank without Topic remains unassigned because its current record has no Committee field.

The same action with the same chosen context uses the same evidence contract from Today, Study, Search or Plan. Topic-specific recommendations pass Topic explicitly; broad recommendations remain visibly broad.

Show Topic or global scope beside Start/Save, with ancestry available on demand. Material and review filters remain visible. Browsing another Topic does not change a running timer, in-flight AI request or draft. Switching draft scope requires explicit confirmation or a separate draft; asynchronous results retain their original scope.

Persist recent locations and resumable workspace state locally, separately from academic evidence. Revalidate identifiers on restoration. Missing/deleted content produces an unavailable-context state, not a guessed replacement.

## 7. Today Architecture

Information hierarchy:

1. **Active work:** continue the timer/workspace; after restart offer recovery only when reliable recovery exists.
2. **One recommended action:** activity, scope, approximate effort and a short factual reason.
3. **Today's intentions:** a short agenda with Start, inspect or reschedule.
4. **Secondary signals:** exam urgency, due workload and a compact evidence summary linking to Progress.

Active work takes priority. Otherwise prefer the current accepted plan item, then due review, then a specific corrective Topic action; use an unassigned short Focus start when evidence is insufficient. Exam proximity influences ordering within eligible work, not an unsupported claim of exam importance. Explain conflicts and allow the student to choose another action.

**Information** says “18 cards due” or “exam in six days.” **Action** says “Review 18 due cards” or “Inspect this committee's plan.” Weak-topic labels never stand alone. Unfinished drafts are resumable work, not completed study. Empty and partial-error states preserve useful actions without inventing zero evidence.

## 8. Topic / Study Workspace

Study opens recent/pinned work before the full academic tree. A Topic opens its last valid material/location or an overview when none exists. Always offer overview explicitly.

The workspace provides Learn, Questions and Review modes under stable Topic context. Focus is an overlaying session control; Ask opens a contextual panel/sheet. Changing mode preserves reading position and unsaved work or requests a deliberate discard.

Learn owns materials; Questions separates external logging and generated drafts; Review launches the Topic queue directly. Evidence explains available actions without interposing another summary screen. Completing an activity reveals its saved receipt and a contextual next action; it does not eject the student into another subsystem.

A workspace may be unassigned for Focus or span Topics for review. “Workspace” means coordinated interaction state, not evidence that a learning session occurred.

## 9. Materials Architecture

The viewer exposes direct **Ask, Make card, Generate questions and Focus** actions. Each inherits Topic, source and available page/section/selection. Reading position survives opening and closing a tool.

Ask defaults to the named current source; explicit controls expand to Topic sources. Selection/page grounding is offered only when the reader can supply that location and retrieval can honor it. Otherwise disclose source-level scope. Never claim page grounding from a Topic-wide query. Citation activation returns to the source location when available.

Card drafts preserve editable content plus a visible source excerpt/reference. Saving requires target Deck and confirmed Topic; a last-used Deck may be suggested. Schema v14 can include a reviewed citation in card text. Structured navigable provenance is a future requirement, not an existing card field.

Question drafts and explanations can remain temporary. Generating, reading or opening a material creates no practice/completion credit.

## 10. Focus Architecture

Global and contextual Focus use one start contract, with visible scope and duration. Topic/material start needs no reselection. Standard, Entry, Adaptive and optional Gentle Return remain supported.

Only one timer runs. Browsing does not retag it. Choosing a different study scope offers Continue existing or Finish/cancel and start new; no retroactive reassignment. Pause excludes elapsed time. Navigation away does not itself pause deliberate study.

Completion saves factual duration/context before showing success. Cancellation preserves the current below-30-second discard rule and longer cancelled-session evidence. Both return to the originating workspace with an explicit receipt; neither marks a Topic mastered.

**Target recovery:** maintain a durable local session journal containing stable session identity, frozen context, timer mode, accumulated time and checkpoints. Restore interrupted work paused; credit only verified checkpointed time, never an uncertain process-death interval. Show the last checkpoint and possible unrecorded interval.

Finalization must be idempotent across crashes between history insertion and journal clearing. Resume must not duplicate a Focus row. Storage durability, lifecycle behavior and existing-ID reconciliation require implementation verification before recovery is advertised. This architecture does not implement persistence.

## 11. Review / Flashcards Architecture

Review opens **all due cards across all Decks**, including unlinked cards. Its displayed count and launched queue use the same filter/time snapshot. Refresh remaining work after ratings; newly due cards can enter on the next refresh. No largest-Deck substitution.

Topic review filters cards by Topic across Decks. Deck review filters by collection; optional Topic filters intersect explicitly. Show scope/count before starting. Due review and optional Review all/new-card practice are distinct; preserve existing SRS calculations and rating semantics.

Card creation works from Material, Topic, Deck or quick capture. Topic is inherited when known; Deck remains required storage organization. A creation sheet can create a Deck without losing the draft. Global cards may remain unlinked. Relinking cards never rewrites historical review Topic snapshots.

## 12. Questions / QBank Architecture

Four clearly named responsibilities:

- **External practice log:** save manually reported question count, correct count, optional duration/source and optional Topic.
- **Topic practice:** contextual access to those logs and aggregate evidence; no claim of an internal question player.
- **AI question drafts:** generate, inspect, edit and discard temporary questions. No automatic scoring, attempt history or QBank insertion.
- **FUTURE REQUIREMENT — Question Player:** persistent question/version, answer, attempt, explanation and provenance contracts before claiming saved questions or question-level analytics.

Logging is reachable globally and from Topic. Generated drafts must not populate external-practice totals automatically. Mixed-topic external blocks remain unassigned unless the student supplies separate factual per-Topic blocks; never distribute totals by inference.

## 13. AI Architecture

Retrieval/indexing are background capabilities. Ask, explain, summarize and generate are contextual actions. One dedicated assistant state expands on phone or occupies a tablet panel, preserving source scope.

Global Ask opens a scope chooser/search into that same assistant, rather than another chat product. General ungrounded chat is outside the initial target. Planning assistance lives inside Plan and proposes changes against explicit dates, workload and evidence.

Requests freeze their source context. Show Mock/live mode and distinguish client-provider readiness from server extraction/visual capability. Offline/manual and lexical fallbacks remain usable.

Every persistent AI change requires preview, selected artifacts/changes and explicit Save/Apply. No silent card insertion, schedule replacement or learning evidence. Cancelling leaves existing data intact. AI cannot choose credential access or expand grounding silently.

## 14. Planning Architecture

Plan owns one agenda/calendar with distinguishable intentions, academic deadlines and recorded activity. Exam Plan and Study Plan become planning modes sharing Committee scope and the same proposal review, rather than competing destinations. Committee dates remain canonical.

Target lifecycle: **propose → accept → surface in Today → start with context → record activity → reconcile intention → replan**. Timed work or reviews create their own evidence; they do not prove an entire intention finished. The student confirms fulfilled/skipped/deferred intentions. Replanning previews changes and preserves completed evidence.

**FUTURE DATA REQUIREMENT — first-class Task/study intention:** durable identity, Topic/activity target, planned time, status and evidence links are necessary for reliable cross-day reconciliation. Calendar events alone cannot express this lifecycle. Do not encode hidden task records in event descriptions.

Before that addition, v14 supports events, read-only planning proposals and contextual starts; persistent task completion, acceptance and automatic plan reconciliation remain unavailable. Today must label proposals accordingly.

## 15. Progress Intelligence

Every signal separates **raw evidence → interpretation → recommendation**.

| Evidence | Interpretation limit | Next action |
| --- | --- | --- |
| Focus seconds | Effort, not understanding | Resume material or try recall. |
| Correct/total questions | Weighted accuracy; no individual-error diagnosis | Inspect Topic material, then log another block. |
| Review ratings/count | Recall performance, not proven retention | Start matching due review. |
| Freshness/neglect | Lack of recorded activity, possibly missing logs | Revisit Topic or log actual external work. |
| Mastery/exam timing | Heuristic classification plus deadline | Inspect evidence and choose practice; never certify mastery. |

Progress lives in Study with Committee, Subject, Topic and global scopes. Conceptual graphs: daily Focus bars for effort patterns; separate accuracy/review-performance trends with denominators; Topic-by-activity coverage for gaps; upcoming review workload for planning. Never combine these into a synthetic medical-competence score.

Selecting a signal exposes its period, sample size, reason and executable next step. Missing data is unknown, not zero performance. Returning after practice refreshes evidence without claiming that improvement proves causality.

## 16. Mobile Architecture

Prioritize one current activity, a reachable active-session control and contextual action sheets. Resume, due review and external logging are accessible without curriculum traversal. Scope selection uses recent/search results rather than cascading mandatory pickers.

Keep Start, Save and scope accessible with the keyboard; preserve Android insets, screen-reader order and low-stimulation behavior. No essential action requires a gesture. Sheets preserve underlying reading position; long editing expands into the same state. Tap targets in section 20 are design goals, not tested results.

## 17. Tablet Architecture

Use available width for work, not a universally centered 620dp container. A collapsible academic/recent-work pane establishes context; the main pane reads material; a secondary pane hosts Ask, card drafts or evidence. Focus controls remain accessible without replacing the material.

Simultaneous workflows: source plus cited answer; source plus editable card; Topic evidence plus corrective material; planning agenda plus Topic workload. Secondary tools share the selected context but cannot silently retarget an existing draft. Use two panes when three would compromise reading; collapse to sequential states in narrow windows. Preserve state across rotation, resizing and panel closure.

## 18. Back / Up / Search / Quick Capture

**Back** follows actual history and closes the top sheet/panel first. **Up** follows explicit ownership: Material → Topic → Subject → Committee → Study; Deck/card management → Review; event → Plan. A Topic breadcrumb always opens Topic, even from global Ask. With no history, Back falls back to the owning destination. Unsaved changes receive Save/discard handling.

Global Search is justified by repeated traversal: search local Topics, materials and Decks, display ancestry, open directly. Scope filters prevent ambiguous same-name results. Full-content/citation search is offered only where supported.

One quick-action sheet supplies Focus, external log, card/note capture and Ask; search and shortcuts share this entry rather than adding a separate command destination. Unassigned notes remain resumable drafts until a Topic is selected, because persisted sources require Topic ownership.

## 19. Target Screen Inventory

These are interaction states, not a proposed route count. Entries, carried context and main actions are specified together.

| Group / state | Purpose | Entry | Context | Main actions |
| --- | --- | --- | --- | --- |
| PRIMARY / Today | Decide now | Launch/tab | Active work, date | Resume, start, inspect plan. |
| PRIMARY / Study | Find learning | Tab/Up | Recent scope | Search, open Topic, Progress. |
| PRIMARY / Review | Recall workload | Tab/Today | Global/filter | Start due, manage Decks. |
| PRIMARY / Plan | Organize intentions | Tab/Today | Date/Committee | Inspect agenda, propose/edit. |
| ACADEMIC / Browser-detail | Organize curriculum | Study/search/Up | Committee/Subject/Topic | Drill down, edit, study. |
| STUDY / Workspace-reader | Sustained learning | Topic/search/resume | Topic/source/location | Read, Ask, Focus, review, questions. |
| STUDY / Review-player/collection | Rate/manage cards | Review/workspace | Queue scope/Deck | Rate, inspect/edit/create. |
| STUDY / Questions | Separate practice concepts | Workspace/quick action | Optional Topic | Log, inspect aggregates/drafts. |
| PLANNING / Proposal-event | Inspect commitments | Plan/Committee | Dates/Committee; proposal Topics | Edit event, preview; future accept task. |
| PROGRESS / Evidence-detail | Interpret and act | Study/signal | Scope/period | Inspect denominators, start correction. |
| AI / Assistant-drafts | Grounded assistance | Ask/Plan | Frozen sources or plan | Query, edit, explicit Save/Apply. |
| SETTINGS / Account-preferences | Configure app | Account control | User/provider | Theme, language, credentials, support preferences. |
| MODALS / Quick-action-context | Fast scoped entry | Shared control | Explicit/recent/global | Search, select scope, capture. |
| MODALS / Session-control-receipt | Manage ongoing work | Active control/start | Frozen session | Pause, finish, cancel, recover. |
| MODALS / Editor-support | Reusable forms/support | Create/edit/check-in/recovery | Entity or support context | Save/discard, choose gentle start. |

## 20. High-Frequency User Flows

Counts exclude typing, scrolling and loading; include named confirmations. Assume existing content/Deck. Future-dependent steps are not baseline promises.

| Flow | Target sequence | Taps |
| --- | --- | --- |
| Open → decide | Today reason → Start | 0 to understand; 1 start |
| Resume interruption | Continue; recovery confirmation after restart | 1; 2 after restart |
| Committee → Topic → study | Subject → Topic → Start | 3 from Committee |
| Topic → Material → AI | Material → Ask → submit | 3 |
| Material → flashcard | Make card → confirm Deck → Save | 3; +1 new Deck form |
| Material → Focus | Focus with visible inherited scope | 1 |
| Topic → questions | Questions → Log or Generate | 2; +1 Save for log |
| Global due review | Review → Start all due | 2; Today shortcut 1 |
| External QBank log | Quick actions → Log → Save | 3; +1 Topic selection |
| Weak Topic → correction | Signal → scoped suggested activity | 2 |
| Plan day → execute | Plan → proposal → accept → Start | 4; durable acceptance future |
| Tablet deep study | Material → Ask → submit → card draft | 4; reading stays visible |

## 21. Keep / Modify / Merge / Remove / Rebuild

| Subsystem | Decision | Target destination/responsibility |
| --- | --- | --- |
| Curriculum | KEEP | Study academic ownership. |
| Dashboard | MODIFY | Today decision hierarchy. |
| Topic | MODIFY | Study workspace/context. |
| Material handoffs | REBUILD | Reader contextual actions. |
| Focus | MODIFY | Shared session controls and reliable recovery. |
| SRS engine | KEEP | Review scheduling and historical attribution. |
| Memory/Deck interface | MODIFY | Review global/Topic/Deck scope. |
| QBank aggregates | KEEP | Questions external-practice evidence. |
| Retrieval/credentials | KEEP | Shared AI infrastructure. |
| AI entry points | MERGE | One contextual assistant state. |
| Calendar/exam/study planners | MERGE | Plan ownership. |
| Analytics | MODIFY | Progress evidence-to-action views. |
| Study Support | KEEP | Optional check-in/recovery actions. |
| Separate Focus/AI navigation; misleading scope promises | REMOVE | Capabilities retained contextually. |
| Tablet behavior | MODIFY | Simultaneous study panes. |

## 22. Data / State Implications

**A. Works with schema v14:** academic browsing, Topic-linked Focus, aggregate QBank logs, Deck/Topic/global review, weighted evidence, events, read-only plan proposals and existing retrieval/provider fallbacks. New source-specific retrieval behavior may require service changes despite needing no schema change.

**B. UI/state only:** navigation composition, shared context, Back/Up, filters, panels, recents/pins, reader bookmarks and local draft/session journal. These are resumability/preferences, never shadow learning records. Journal recovery requires verified durable writes and idempotent reconciliation with existing history; otherwise keep it gated.

**C. Potential additive requirements:** Task lifecycle (**FUTURE DATA REQUIREMENT**); structured card-source provenance; persistent questions/attempts (**FUTURE REQUIREMENT**). A session recovery record is also conditional if reliable journaling cannot fit existing storage contracts. No migration is authorized here.

## 23. Phase 14 Handoff Constraints

Implement only after separate authorization. Preserve schema v14 unless an additive requirement receives explicit approval. Keep historical review snapshots, weighted accuracy, cancellation thresholds, offline operation, lexical fallbacks and secure credentials.

Preserve user-created content, EN/TR, accessibility, safe areas and validator compatibility. Do not convert unused components into assumed visible clutter. Verify context equivalence across entries, queue/count agreement, no duplicate recovery writes and no AI-generated evidence. Distinguish static validation from phone/tablet and live-provider checks. Read exact Expo SDK 57 documentation before implementation.

## 24. Architecture Risks & Open Questions

Risks: Study may become overloaded; global review may feel unbounded; recovery may lose checkpoint-tail time; optional panes may overwhelm narrow tablets. Validate time-to-action, scope comprehension and interrupted-work recovery with students.

Open implementation questions: actual reading-location support, source-scoped retrieval contracts, reliable journal storage and historical-ID reconciliation. These gate corresponding promises, not the four-destination decision. Durable Task and provenance additions need separate prioritization.

Research should test whether recent/pinned Topics sufficiently reduce traversal and whether due-first review needs an explicitly counted session limit. No unresolved question permits invented evidence or silent context reassignment.

