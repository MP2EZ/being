/**
 * Practice Identity — the app's own answer to "which daily practice is this?"
 *
 * FEAT-298 slice 1 (flow-redesign step 5). Two jobs:
 *
 * 1. **One declaration.** Before this file, the union `'morning' | 'midday' | 'evening'`
 *    was declared TEN times under four different names (`FlowType` ×4, `FlowTheme` ×4,
 *    `FlowThemeType` ×1, plus an unnamed inline in `CelebrationToast`). Widening the
 *    model meant finding and editing all ten. Now it means editing one.
 *
 * 2. **Decouple flow identity from theme identity.** `ThemeKey` is NOT ours — it lives in
 *    the published `@mp2ez/being-design-system` package. Historically the app got away
 *    with `getTheme(flowType)` only because the two unions happened to be spelled the
 *    same; nothing enforced that they were the same concept. That coincidence is what
 *    made adding a fourth practice identity look like a cross-repo package release
 *    (see INFRA-303). Routing every dynamic `getTheme` call through `themeKeyFor()`
 *    breaks the coupling: `ThemeKey` stays a *palette* key, the app owns the mapping,
 *    and later slices can widen `PracticeIdentity` freely without touching the package.
 *
 * This module is deliberately behaviour-neutral: `themeKeyFor` is the identity function
 * for the three legacy tokens, so slice 1 changes no pixel.
 */

import type { ThemeKey } from '@/core/theme';

/**
 * The three time-of-day practice flows.
 *
 * Still the shape persisted in session storage and check-in records, so it is NOT
 * simply "the legacy union" — narrow it only when those consumers migrate (slice 2+).
 */
export type FlowType = 'morning' | 'midday' | 'evening';

/**
 * Everything that can identify a practice surface for *presentation* purposes.
 *
 * Wider than `FlowType` because the FEAT-291 daily loop is a real surface that needs a
 * palette but is not a time-of-day flow and is not (yet) a persisted check-in type.
 * Later slices add `'daily'` here; that is the point of the seam.
 */
export type PracticeIdentity = FlowType | 'daily-loop';

/**
 * Practice identity → design-system palette key.
 *
 * A total `Record` rather than a function body with a `switch`/ternary on purpose: adding
 * a member to `PracticeIdentity` without deciding its palette becomes a **compile error**
 * instead of a silent fallthrough to some default theme. That property is the whole
 * reason this indirection earns its keep.
 *
 * `'daily-loop' → 'midday'` preserves FEAT-291's deliberate choice (it themed the loop as
 * midday to avoid this migration). It is a mapping decision now, not a hardcoded ternary
 * buried in a component.
 */
const THEME_KEY_BY_IDENTITY: Record<PracticeIdentity, ThemeKey> = {
  morning: 'morning',
  midday: 'midday',
  evening: 'evening',
  'daily-loop': 'midday',
};

/**
 * Resolve a practice identity to the design-system `ThemeKey` its palette comes from.
 *
 * Use this for every *dynamic* `getTheme(...)` call. Calls with a literal key
 * (`getTheme('midday')`) are already unambiguous and need no adapter.
 */
export function themeKeyFor(identity: PracticeIdentity): ThemeKey {
  return THEME_KEY_BY_IDENTITY[identity];
}
