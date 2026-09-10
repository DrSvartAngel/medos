# MedOS Phase 13A — Current-State UX Architecture Audit

## Executive Diagnosis

MedOS connects academic data more consistently than study workflows. Topic joins materials, Focus, Memory, QBank and AI, but activity context varies by entry point and learning requires repeated handoffs.

This static audit uses the Phase 12 context pack and ten additional source files. It qualifies several pack descriptions without establishing physical-device usability, live-provider reliability or learning effectiveness. No replacement architecture is defined.

## Current Product Mental Model

Students encounter two intersecting organizational systems:

- **Academic organization:** Committee → Subject → Topic → materials and attributed evidence.
- **Activity organization:** Focus sessions, decks/reviews, practice logs, calendar entries and AI operations.

Dashboard attempts to coordinate these systems. Study Support contributes check-in, entry sessions and recovery, rather than a separate academic hierarchy. Analytics interprets evidence across activities.

The hierarchy is a credible context spine, but cross-topic review, committee planning and unassigned Focus are legitimate activities. Mandatory traversal through Topic would add friction. Fragmentation comes from inconsistent transitions between these models.

## Information Architecture Findings

Five visible tabs mix an overview, academic organization, two activity types and planning. Materials and QBank lack equivalent top-level ownership; AI and Profile are hidden tabs. This makes capabilities feel unevenly distributed even though many share the same database.

Repeated entries help when scope is clear. Topic and Dashboard Focus starts create unequal attribution. Memory's secondary QBank action blurs recall/practice ownership.

Topic has Overview, Materials, Practice and Memory sections, yet most actions launch elsewhere. Decks provide another grouping axis students must understand alongside Topic.

Planning spans Calendar, exam plans, study plans and an AI-styled Dashboard shortcut. Analytics is distributed across academic summaries and activity areas. Overlapping responsibilities do not invalidate their underlying engines.

## Navigation Findings

Tabs are Dashboard, Committees, Focus, Memory and Calendar; AI/Profile are hidden [E1]. Curriculum traversal requires Committee, Subject and Topic selections. Materials and review add section selection and another destination.

Contextual Focus/Memory preserve `returnTo` through Android back [E3–E5]. However, entering Focus from another Topic resumes the existing timer without reassigning it: return destination and activity scope differ.

The viewer and assistant use history-back first and Topic replacement only when history is unavailable. Their Topic-labelled breadcrumb uses that same callback [E7–E8]. When the assistant is entered from the AI launcher, that breadcrumb can lead back to the launcher instead of upward to Topic. History navigation and academic parent navigation therefore have inconsistent meaning.

The AI launcher lists only 25 topics, ordered by source count then update time [E9]. Profile's header interaction was not independently inspected.

## Academic Context Findings

| Transition | Current context behavior | Consequence |
| :--- | :--- | :--- |
| Committee → Subject → Topic | Inherited through the baseline hierarchy | Strong academic ownership. |
| Topic → Material | Topic and source identifiers passed; viewer checks ownership | Reliable material scope. |
| Topic → Focus | Store resolves Topic and Committee before starting | Good attribution without reselection. |
| Dashboard / global Focus → session | Committee or no context; ordinary start clears Topic | Fast starts produce less granular evidence. |
| Topic → Memory → review | Topic filter and return destination passed onward | Contextual review already exists. |
| Deck → card creation / review | Deck passed; baseline card Topic link is optional | Academic association is a separate decision. |
| Topic → QBank | Topic and return destination passed to logging route | Context supplied at entry; receiver not rechecked. |
| Topic → assistant | Topic inherited; RAG queries use Topic scope | Grounding spans that Topic's materials. |
| Material → assistant | No direct handoff in inspected viewer | Reading context must be reconstructed. |
| Assistant → saved flashcards | Topic retained; target Deck selected | Academic identity survives, but storage identity changes. |
| Calendar / plans → activity | Baseline manual events link Committee; plans reference Topics | No verified common execution-and-completion contract. |
| Activity → analytics | Linked evidence aggregates; review Topic is a historical snapshot | Trustworthy attribution where links exist. |

Subject is inherited organizational context. No inspected transition carries reading position into another activity. Saved AI cards retain Topic but not source/chunk identifiers [E8]; RAG citations do not establish durable card provenance.

## Workflow Friction

Estimates count selections, excluding scrolling, typing, loading and confirmations; they are not measured usability results.

| Repeated operation | Approximate cost | Main friction |
| :--- | :--- | :--- |
| Dashboard → quick Focus | 1 tap | Fast, but no Topic attribution. |
| Dashboard → curriculum Topic → Focus | 5 taps via Committees tab | Academic specificity requires traversal. |
| Topic Overview → material | 2 taps | Local section, then source. |
| Viewer → source-specific AI generation | About 5 selections before generation | Back, Overview, assistant, mode, source reselection. |
| Topic Overview → due review | 3 taps before review screen | Memory section, contextual Memory, review action. |
| Topic Overview → QBank form | 2 taps, then entry/save | Records external practice after the activity. |
| Global Memory → manual card form | 2 taps with an existing Deck | Topic linkage still requires form context. |

Repeatedly reconstructing Topic, material, Deck and review scope is costly. Finishing Focus saves evidence but requires another action to return [E4].

## Subsystem Findings

### Today / Dashboard

Dashboard partially answers “What should I study now?” QuickStart prioritizes continuing an active timer and can launch due Deck review or a new Focus session. Start Small and check-in reduce initiation friction. However, its Focus action supplies Committee rather than a concrete Topic or material [E2]. Recommendation ranking inside the snapshot producer was not inspected.

TodayMetrics shortcuts open broad activity destinations. Agenda opens events or Committees. Exam timing and due work are useful signals; summaries add noise when they do not clarify the next action.

Contrary to the pack's route summary, the inspected Dashboard does **not** mount Recent Activity or MomentumCard. Its actual composition is Committee, QuickStart, metrics, agenda and the planning/AI shortcut. Existing momentum components must not be described as visible clutter.

### Curriculum

Committees and Subjects provide durable ownership, academic dates and broader evidence summaries. Repeated traversal burdens frequently revisited Topics. Whether every resource naturally belongs to one Topic remains an assumption to test, without changing schema now.

### Topic

Topic already supports evidence inspection, materials, practice logging and contextual tool launches [E3].

Reading, timing, reviewing and AI still occur elsewhere. Memory adds another summary before review. Overview's recorded/unrecorded Focus signal cannot choose between reading, recall and questions.

### Materials / RAG

Extraction, retrieval and citations are valuable foundations. The viewer preserves Topic, editing and visual analysis, but offers no direct Focus, assistant or card-creation handoff [E7].

RAG operates across Topic sources; explain, summarize and generation modes require source selection. Changing source deliberately clears earlier results/drafts, preventing provenance confusion but making switching costly [E8]. Imported flashcards require review and Deck selection. Generated question drafts remain separate from QBank's aggregate evidence; generation is not recorded practice.

Chunk counts and configuration errors expose technical concepts with limited study value. Remote extraction and live embeddings retain the pack's verification gaps.

### Focus

Topic start is one action and inherits Committee automatically. Global setup offers duration and Committee selection; it lacks a visible Topic picker [E4]. Entry and adaptive modes support initiation, while Gentle Return supports interruptions.

Elapsed time is timestamp-derived rather than dependent on interval frequency. Completion writes before resetting; cancellation below 30 seconds is discarded, and longer cancelled sessions persist [E5]. These are sound evidence safeguards. Active state remains volatile per the baseline, so a process restart cannot be treated as a durably recoverable session. This differs from merely leaving the Focus screen.

Active Focus concentrates controls; concurrent reading requires navigation. Reach, lifecycle and finish/cancel understanding need device evaluation.

### Flashcards / Review

Deck review, global review capability and contextual Topic review coexist. Topic Memory shows linked cards, due counts and review evidence across Decks; the continuity is real [E6]. Scheduling states and next-review evidence support review timing, while historical Topic snapshots protect attribution.

Global Memory sums due cards across Decks but launches only the Deck with the largest due count. This creates a scope mismatch between the displayed workload and primary action. Deck detail passes only Deck identity to review/card creation; unlike the pack's description, the inspected screen has no Topic filter [E10]. Topic-linked card rows in contextual Memory are informational rather than direct editing links. Creation and maintenance remain substantially Deck-oriented.

### QBank

QBank records external practice volume, correct answers, optional duration and source. Weighted accuracy is useful, but cannot identify individual errors or revisit questions.

Topic Practice gives logging a discoverable academic home; Dashboard metrics and global Memory provide additional entries. These shortcuts have unequal context. AI question generation is another adjacent capability, but it must not imply a persisted question bank or automatic practice credit.

### Planning / Calendar

The baseline timeline combines manual events, committee milestones and past Focus/reviews, mixing intentions with evidence. Events carry Committee context; exam plans distribute Topics against dates; study planning has another route.

A persisted plan-to-agenda-to-activity-to-completion lifecycle is unverified, rather than a confirmed synchronization defect. Planner screens were outside the verification budget.

### AI

The hidden AI area launches topic assistants and settings, **not standalone conversation** [E9]. Duplication concerns entry ownership.

Topic Assistant combines RAG, explanation, summaries and drafts. Dashboard opens study planning when a Committee exists, otherwise AI; its accessibility label remains AI-oriented [E2].

Mock/Gemini use secure credentials. Viewer analysis separately requires server configuration [E7]; client readiness does not establish server readiness. Live services were not tested.

### Progress / Analytics

Focus seconds, accuracy, review success and freshness provide complementary evidence. Mastery/neglect thresholds are heuristics, not proof of medical understanding. “Retention” measures review ratings, not independently measured long-term retention.

Aggregate accuracy cannot identify individual errors. Freshness and Focus establish activity, not learning quality. Inspected surfaces lack a demonstrated warning-to-corrective-work-to-reassessment loop.

## Mobile vs Tablet Findings

Phones accumulate hierarchy and handoff costs. Assistant source selection, draft editing and Deck selection add scrolling/keyboard demands. These are static risks, not observed failures.

The pack describes a 768dp tablet threshold and centered 620dp constraint. Source inspection reveals exceptions: Dashboard explicitly composes two columns, active Focus caps at 600dp, viewer declares 680dp and assistant 760dp [E2, E4, E7–E8]. Parent wrapper constraints were not reopened, so these declarations do not prove final rendered widths.

Where effective, 620dp supports readable forms but constrains deep study. Neither inspected viewer nor assistant composes simultaneous reading and study tools. Tablet adaptation exists; study concurrency remains limited.

## Keep / Modify / Merge / Remove / Rebuild Matrix

These classify responsibilities, without specifying replacements. MERGE means overlapping ownership needs reconciliation.

| Area | Classification | Architectural assessment |
| :--- | :--- | :--- |
| Curriculum entities | KEEP | Stable academic ownership. |
| Topic experience | MODIFY | Existing integrations need more consistent continuity. |
| Dashboard | MODIFY | Useful initiation; uneven specificity and action scope. |
| Focus | MODIFY | Preserve lifecycle safeguards; address attribution and interruption gaps. |
| Memory / review | MODIFY | Preserve SRS; clarify Deck/Topic/global scope. |
| QBank evidence | KEEP | Honest aggregate practice model with explicit limits. |
| Material-to-study handoff | REBUILD | Inspected viewer lacks the connecting action boundary. |
| Retrieval and grounding | KEEP | Valuable source-scoped infrastructure and fallbacks. |
| AI entry-point ownership | MERGE | Reconcile launcher, contextual assistant and planning presentation. |
| Planning ownership | MERGE | Calendar, agenda and planners overlap without a verified common lifecycle. |
| Analytics presentation | MODIFY | Connect factual interpretation to decisions without overstating certainty. |
| Study Support | KEEP | Preserve optional initiation/recovery support and low-stimulation behavior. |
| Mismatched action meanings | REMOVE | Eliminate ambiguous scope promises, not their underlying capabilities. |
| Tablet workspace behavior | MODIFY | Existing responsiveness does not yet support concurrent deep study. |

## Top 10 Structural UX Problems

1. **HIGH — Entry-dependent attribution:** the same Focus activity has Topic evidence only through certain starts.
2. **HIGH — Reading-to-action break:** viewer context does not directly continue into assistant or study tools.
3. **HIGH — Unfinished Focus is volatile:** durable history does not ensure recovery of ongoing work after process termination.
4. **HIGH — Review workload/action mismatch:** all-Deck due counts lead into a single Deck.
5. **HIGH — Planning responsibility is split:** a shared plan-to-agenda-to-evidence lifecycle is unverified.
6. **HIGH — Analytics lacks consistent decision closure:** classifications do not reliably identify executable corrective work.
7. **MEDIUM — Repeated curriculum traversal:** frequently used Topic activities accumulate navigation cost.
8. **MEDIUM — Back and academic Up diverge:** parent-labelled actions sometimes follow entry history.
9. **MEDIUM — AI identity is inconsistent:** launcher, assistant and planning shortcuts imply overlapping ownership.
10. **MEDIUM — Tablet study remains sequential:** additional width does not preserve simultaneous material/action context.

## Constraints Phase 13B Must Respect

- Preserve schema v14 and existing data contracts unless separately authorized; this audit proposes no schema change.
- Keep QBank aggregate-only. AI drafts, material access and elapsed time must not become fabricated practice or mastery evidence.
- Preserve historical review attribution, weighted accuracy, Focus persistence safeguards and legitimate unassigned activities.
- Retain offline operation, Mock behavior, retrieval fallbacks, secure credentials and explicit provider boundaries.
- Preserve EN/TR app copy, user-created content, accessibility, Android safe areas and optional Study Support.
- Treat validator-preserved components as compatibility constraints; unmounted components are not visible UX duplication.
- Independently compare architectural options. Topic is a credible organizing context, not a predetermined universal destination.
- Carry forward live-provider and physical-device verification gaps. Phase 12 static passes are baseline evidence, not Phase 13 usability certification.

## Evidence / Files Verified

Primary baseline: `docs/PHASE13_CODEX_CONTEXT.md`, read first. Schema, scheduling math, planning/timeline and historical checks were accepted from the pack.

| ID | Additional source file | Relevant lines / verification |
| :--- | :--- | :--- |
| E1 | `app/(tabs)/_layout.tsx` | 19–24, 91–115: visible/hidden tabs. |
| E2 | `app/(tabs)/index.tsx` | 44–125, 168–237, 309–330: starts, destinations, mounted composition. |
| E3 | `app/topics/[id].tsx` | 51, 86–99, 299–463: local sections and contextual launches. |
| E4 | `app/(tabs)/focus.tsx` | 35–52, 206–208, 231–305, 391–422: return behavior, controls and selection. |
| E5 | `store/useFocusStore.ts` | 117–124, 179–214, 398–452: attribution, elapsed time, completion/cancellation. |
| E6 | `app/(tabs)/memory.tsx` | 66–128, 171–359, 405–512: Topic/global scope and review destinations. |
| E7 | `app/topics/[id]/sources/[sourceId].tsx` | 49–84, 160–165, 258–303, 552–563; targeted action search: viewer boundaries. |
| E8 | `app/topics/[id]/assistant.tsx` | 75–96, 133–218, 444–460, 577, 1429–1456; targeted action search: scope, drafts, persistence. |
| E9 | `app/(tabs)/ai.tsx` | 38–52, 90–104, 130–164: bounded launcher and settings. |
| E10 | `app/decks/[id]/index.tsx` | 22–43, 163–209: Deck-scoped actions and card inventory. |

Ten source files inspected; no recursive scan, translation/validator reading, production edits, installation, commit or push. Requested branch initially clean. Validation: documentation review and Git status only; no regression suite or device test.
