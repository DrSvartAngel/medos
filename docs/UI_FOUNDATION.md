# UI Foundation 1

Internal React Native/StyleSheet foundation, not a visual redesign. No UI framework,
new fonts, palette, persistence, or navigation system.

## Tokens and contracts

- Existing colors, spacing, radius and typography remain authoritative. Do not map
  user-authored Committee colors to theme tokens.
- `theme/layout.ts` owns shared 600/840 breakpoints, 720/900 content caps,
  existing spacing multipliers, 16dp gap and 48/120dp input heights.
  `useResponsive` remains the only responsive calculation layer. Feature-specific
  widths stay local; no universal width override.
- `theme/interaction.ts` owns the existing 44dp target, .75 pressed feedback,
  .5 disabled-button opacity and 1dp input border. No blanket text opacity change.
- Input focus uses primary border; invalid uses error border (takes precedence).
  Errors must also have readable text, never color alone. Disabled inputs retain
  readable text and expose disabled semantics. Selected/success visuals continue
  using existing theme colors and feature semantics; no new state engine.
- Card's elevated surface means a surface color, not a new shadow. No shadow
  framework or animation layer is introduced.

## Primitives

- Input: native TextInput props/ref, multiline textarea, focus styling. Caller owns
  value, validation and submission. Caller supplies accessible label; optional
  invalid border supplements a textual error, never replaces one.
- FormField: wrapping label, children and optional polite textual error. Give its
  input the matching accessibilityLabel; the wrapper is not an accessible group.
- Section: optional heading and existing gap, no implicit card/padding/navigation.
- FeedbackState: supplied loading/empty/error message and optional action callback.
  It performs no retry itself. Error text is polite; spinner is decorative.
- AppText/Button/Card/Badge/ScreenWrapper retain compatible defaults. Button only
  replaces numeric literals with equal-valued interaction tokens.

No repository, routing, business validation, timer, storage, localization selection,
or lifecycle logic belongs in these primitives. No automatic copy or side effects.

## Layout and accessibility

Preserve phone single column, tablet constrained width and wrapping text. Subject
forms retain keyboard avoidance and scrollable ScreenWrapper. Stack screens opt
into bottom safe area; tabs keep the default and their existing tab-bar inset.
Do not add another inset or screen-container system. Preserve native input props,
44dp+ actions, disabled/busy semantics, readable errors and timer announcements.

## Adoption and future redesign

Only Subject form/editor/detail adopt new primitives now. Data loading, mutation,
count errors, double-submit guards and navigation are untouched. Future visual
redesign can change tokens/primitive variants behind compatible defaults, then
use Subject detail as an explicitly approved pilot. Do not migrate all screens or
refactor Focus/Recovery lifecycle as part of foundation work.

Validation uses existing TypeScript and Phase 2/3/4 scripts. Source assertions are
not runtime UI tests. User owns phone/tablet checks for create/edit/detail, errors,
long text, safe area, accessibility and absence of unintended visual changes.
