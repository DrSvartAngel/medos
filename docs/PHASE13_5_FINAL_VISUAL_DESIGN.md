# MedOS Phase 13.5 — Final Visual Design Specification

**Status:** COMPLETE / ACCEPTED / CLOSED  
**Date:** September 10, 2026  
**Architectural Baseline:** `docs/MEDOS_FINAL_ARCHITECTURE.md` (SHA256: `1813243a537df6678a65638e1a86438c36851cf680cda7f0ef3a6f5b1c930d0b`)  
**Visual Baseline:** MedOS Figma Phase 13.5 (`https://www.figma.com/design/STGX479HWOwrlzsLKs3Okw`)  
**Implementation Phase:** Phase 14 — Design System & Application Shell Rebuild  

---

## 1. Dual Source of Truth Model

MedOS strictly maintains two coordinated authorities:

1. **Architectural Source of Truth:**  
   [`docs/MEDOS_FINAL_ARCHITECTURE.md`](file:///C:/medos/docs/MEDOS_FINAL_ARCHITECTURE.md) governs information architecture, domain models, activity lifecycles, context contracts, evidence integrity, and authority boundaries. It strictly overrides visual exploration.

2. **Visual Source of Truth:**  
   **MedOS Figma Phase 13.5** determines the visual design system, layout hierarchy, component language, responsive compositions, and styling tokens for Phase 14 and Phase 15.

Neither source redefines the other. Visual design interprets and expresses canonical architecture without introducing unsupported domain entities or altering activity lifecycles.

---

## 2. Locked Visual Direction: Neutral Zen

The locked visual identity for MedOS is:
**PREMIUM ACADEMIC + REFINED ACADEMIC + NEUTRAL ZEN**

### Target Character
- Premium, quiet-luxury software character
- Sophisticated, calm, clinical-academic, serious, modern
- Restrained, low-stimulation environment for high-focus medical study
- Generous whitespace and intentional layout breathing room
- Low card density: structure defined by typography, alignment, and subtle tonal separation
- Strong typographic and numerical hierarchy for evidence and statistics

### Prohibited Patterns (Negative Constraints)
- No wellness-app or meditation-app aesthetic
- No bright, saturated, or neon green
- No playful or childish education-app UI
- No excessive cards or floating container clutter
- No heavy elevation shadows or skeuomorphic depth
- No pervasive glassmorphism or distracting blurs
- No generic Material Design or hospital administration software look
- No developer-tool or Linear-clone appearance

---

## 3. Figma Page & Node References

> [!NOTE]
> Node IDs are implementation-reference metadata for designers and developers inspecting Figma frames. They are NOT runtime application identifiers.

### Phase 13.5 Figma Pages
- **Foundations:** `13.5 Foundations — Neutral Zen` (Node ID: `20:2`)
- **Core Phone:** `13.5 Phone — Core Screens` (Node ID: `20:3`)
- **Core Tablet:** `13.5 Tablet — Core Screens` (Node ID: `20:4`)
- **Phone Academic & Activities:** `13.5 Phone — Academic & Activities` (Node ID: `28:2`)
- **Tablet Deep Study:** `13.5 Tablet — Deep Study` (Node ID: `28:3`)
- **Dark & States:** `13.5 Dark & States` (Node ID: `28:4`)

### Core Screen Nodes (Phone 390 × 844 & Tablet 1024 × 768)
| Destination | Phone Node ID | Tablet Node ID | Architectural Role |
| :--- | :--- | :--- | :--- |
| **Today** | `22:4` | `23:4` | Single dominant next action, continuation, due summary, factual evidence |
| **Study** | `22:59` | `23:73` | Academic spine navigation (Committee → Subject → Topic → Material) |
| **Review** | `22:131` | `23:157` | Primary destination for global due queue + Topic/Deck filtering |
| **Plan** | `22:186` | `23:238` | Study intention ownership + Calendar time projection |

### Phone Academic & Activity Nodes
| Surface | Node ID | Description / Boundaries |
| :--- | :--- | :--- |
| **Committee** | `29:4` | Top-level academic container listing subjects and overview |
| **Subject** | `29:37` | Subject overview and topic curriculum list |
| **Topic Workspace** | `29:60` | Main academic workspace exposing Learn, Focus, Questions, Review, Ask MedOS |
| **Material Reader** | `29:91` | Focused reader with contextual tool docks |
| **Focus** | `29:111` | Activity control: single active timer, visible frozen scope, checkpointed state |
| **Review Queue** | `29:133` | Active card review session with SRS rating triggers |
| **Deck & Card** | `29:157` | Card collection browsing and manual card management |
| **Questions** | `29:182` | Aggregate external-practice logging + source-grounded draft generator |
| **Calendar** | `29:201` | Time projection of scheduled intentions and milestones |
| **Progress / Evidence** | `29:244` | Factual activity metrics (Focus time, flashcard recall, practice accuracy) |
| **Ask MedOS** | `29:276` | Contextual and global assistant overlay (Inform / Generate / Propose) |
| **Settings** | `29:301` | App preferences, theme, provider credentials, data management |

### Tablet Deep-Study Nodes
| Surface | Node ID | Composition |
| :--- | :--- | :--- |
| **Topic Workspace** | `30:4` | Nav rail + Academic hierarchy + Topic detail & actions |
| **Material Reader + Ask MedOS** | `30:59` | Side-by-side split: active reading on left, grounded assistant on right |
| **Focus** | `30:110` | Non-distracting focus mode preserving active reading context |
| **Review Workspace** | `30:152` | Queue summary + active card preview / review session |
| **Plan + Calendar** | `30:197` | Plan intention management alongside monthly/weekly calendar projection |
| **Progress / Evidence** | `30:263` | Dual-pane evidence ledger and domain breakdown |

### Dark Mode & State Nodes
- **Dark / Today:** `31:4`
- **Dark / Tablet Topic:** `31:47`
- **States Matrix:**
  - `Empty`: `31:100` (First-run or zero items; instructive guidance)
  - `Loading`: `31:107` (Restrained skeletons, zero layout shifts)
  - `Offline`: `31:115` (Unobtrusive status banner, core works offline)
  - `Error`: `31:122` (Clear diagnostic, non-destructive recovery action)
  - `No Data`: `31:129` (Distinct from zero performance; preserves null semantics)
  - `Disabled`: `31:134` (Reduced contrast, preserved touch layout)
  - `Recovery`: `31:141` (Focus session interrupted checkpoint restoration)
  - `AI Proposal Preview`: `31:148` (Explicit preview → Accept/Edit/Ignore; no auto-write)
  - `Destructive Confirmation`: `31:155` (Explicit warning before permanent deletion)
  - `Selected / Active`: `31:162` (Subtle sage/moss tint, clean border highlight)

---

## 4. Semantic Color Tokens & Theme Definitions

The UI is predominantly neutral off-white, warm stone, and deep charcoal. Desaturated sage and deep moss act strictly as **semantic accents** for active selections, primary CTAs, active Focus state, and academic context highlights.

### Token Palette

```
Semantic Role       Light Mode     Dark Mode      Usage Rule
------------------------------------------------------------------------------------------------------------------
bg/canvas           #F1F1EE        #111412        Screen background canvas
bg/surface          #F8F8F5        #171B18        Default container / panel surface
bg/subtle           #E8E9E4        #1E2420        Secondary sections, hovered or inactive controls
bg/raised           #FFFFFF        #202621        Elevated surfaces, modals, popovers, active sheets

text/primary        #171917        #F3F3EE        Headings, primary body text, active labels
text/secondary      #5C625E        #B7BDB8        Subheadings, secondary descriptions, metadata
text/muted          #838A85        #858D87        Placeholders, disabled text, caption hints

border/subtle       #D7DAD5        #303832        Hairline dividers, structural card borders (1px)

accent/sage         #87968C        #95A59B        Active tabs, subtle badge background, selection indicator
accent/moss         #4F5E55        #A8B7AE        Primary button background, prominent accent text
accent/soft         #DCE3DE        #253029        Soft accent pill backgrounds, tag highlights

status/success      #2E6B4A        #5FA87D        Passing benchmarks, completed sessions
status/warning      #9B6B28        #D4A359        Attention required, queue buildup, unsaved changes
status/error        #A13B35        #D96B64        Validation failure, sync error, destructive warning
status/info         #3B627A        #689EC0        Informational banners, non-blocking notices
```

### Figma Variable Collections
- **Collection:** `MedOS / Semantic Colors` (Modes: `Light`, `Dark`)
- **Collection:** `MedOS / Dimensions`:
  - **Spacing:** `space/4` (4px), `space/8` (8px), `space/12` (12px), `space/16` (16px), `space/20` (20px), `space/24` (24px), `space/32` (32px), `space/40` (40px)
  - **Radius:** `radius/8` (8px), `radius/12` (12px), `radius/16` (16px), `radius/20` (20px), `radius/28` (28px)

---

## 5. Typography

**Typeface:** `Manrope` across all surfaces.

```
Figma Style             Size / LineHeight   Weight          Usage
--------------------------------------------------------------------------------------------------
MedOS / Display/XL      32px / 40px         SemiBold (600)  Hero headers, primary welcome titles
MedOS / Heading/L       24px / 32px         SemiBold (600)  Screen titles, modal titles
MedOS / Heading/M       20px / 28px         SemiBold (600)  Section headers, workspace titles
MedOS / Heading/S       16px / 24px         Medium (500)    Card headers, group titles
MedOS / Body/L          16px / 24px         Regular (400)   Material reader text, long-form reading
MedOS / Body/M          14px / 20px         Regular (400)   Default body text, list descriptions
MedOS / Body/S          13px / 18px         Regular (400)   Compact descriptions, helper text
MedOS / Label/M         14px / 20px         Medium (500)    Button labels, tab labels, form labels
MedOS / Label/S         12px / 16px         Medium (500)    Badges, tags, metric unit labels, timestamps
```

---

## 6. Surface Language & Hierarchy

To avoid visual noise and "dashboard syndrome", UI hierarchy strictly follows:
1. **Whitespace:** Generous spacing between primary zones
2. **Typography:** Distinct scale and weight differences rather than colored boxes
3. **Alignment:** Clear vertical baseline and horizontal margins
4. **Tonal Separation:** Subtle background shifts (`bg/canvas` vs `bg/surface`)
5. **Hairline Borders:** `1px border/subtle` to bound content groups
6. **Cards (Restrained):** Only applied when content requires distinct modular encapsulation or interactive affordance. Zero heavy drop shadows.

---

## 7. Responsive Architecture

### Phone (390 × 844)
- Bottom navigation bar with 4 primary destinations: `Today`, `Study`, `Review`, `Plan`.
- Single dominant action/decision per viewport.
- Compact sheets and progressive disclosure for secondary actions.
- Touch target minimum: 44 × 44pt.

### Tablet (1024 × 768)
- Left navigation rail (or compact sidebar) housing the 4 primary destinations + quick utility controls.
- Primary academic workspace occupying main central column.
- Contextual secondary/inspector column activated when reading material or viewing active tools (e.g. Reader + Ask MedOS, Reader + Flashcard).
- Real responsive composition: NEVER a stretched phone interface.

---

## 8. Non-Negotiable Architectural Invariants

Phase 14 and Phase 15 implementation must preserve:
1. **Primary Navigation:** Strictly `Today` · `Study` · `Review` · `Plan` (`Bugün` · `Çalış` · `Tekrar` · `Plan`).
2. **Academic Spine:** `Committee` → `Subject` → `Topic` → `Material`.
3. **Review Role:** Primary destination for global due review + Topic/Deck filtering. Unlinked cards remain valid. Historical rating-time topic snapshots remain immutable.
4. **Ask MedOS:** Contextual and global assistant capability (`Inform` / `Generate` / `Propose`). NOT a primary navigation tab.
5. **Focus:** Activity control with frozen scope and checkpoint recovery. NOT a primary navigation tab.
6. **QBank Baseline:** Retains aggregate external-practice logging (`qbank_sessions`). Full Question Player deferred to D7.
7. **Planning:** Plan owns intention; Calendar represents time projection; Activity creates factual evidence.
8. **Evidence Truth:** Factual numerator/denominator metrics. Zero fake mastery percentages, readiness scores, or competence estimates.
9. **Context Contract:** Navigation never silently determines evidence attribution. Explicit scope > inherited scope.
10. **State Integrity:** No-data state strictly distinct from zero performance.

---

## 9. Phase 14 Implementation Handoff

Phase 14 initiates the implementation of this locked design specification according to the following order:
- **Phase 14.1:** Visual Foundations & Semantic Tokens (Neutral Zen palette, Manrope typography, semantic tokens, theme store)
- **Phase 14.2:** Spacing, Grid, Radii, Borders & Vector Icons
- **Phase 14.3:** Shared UI Primitives (Button, Surface, Input, Badge, Tag, Breadcrumb, List Row)
- **Phase 14.4:** Responsive Application Shell & Navigation (Phone bottom bar & Tablet navigation rail)
- **Phase 14.5:** Theme Switching & Accessibility Foundations
