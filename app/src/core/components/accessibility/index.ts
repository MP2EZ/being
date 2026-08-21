/**
 * Accessibility Components - Unified Export
 *
 * Foundational accessibility only: WCAG AA radio groups, focus management,
 * and skip links.
 *
 * MAINT-393 deleted the `advanced/` subtree (cognitive, motor, sensory,
 * crisis-intervention providers and testing utilities) that this barrel used to
 * re-export. It was never mounted: `App.tsx` wires PostHogProvider →
 * SafeAreaProvider → RootCrisisBoundary → CleanRootNavigator, and
 * `AdvancedAccessibilityProvider` had no consumer outside this file. Because
 * `SensoryAccessibility`'s hook threw unless wrapped in its own provider, the
 * subtree could not execute in the running app at all.
 *
 * It was not free, though: line 23 used to be a VALUE import of
 * `AdvancedAccessibilityProvider`, and `advanced/index.ts` value-imported all
 * seven modules plus `CrisisAccessibility.tsx`. Metro does not tree-shake by
 * default, so ~5,100 LOC were parsed and module-initialised on the path that
 * renders AssessmentResults / AssessmentIntroduction / EnhancedAssessmentQuestion
 * — the PHQ-9 / GAD-7 threshold surface, which carries the <2s launch and
 * <300ms assessment-load budgets. Deleting it removes weight FROM that path.
 *
 * Reintroducing advanced sensory / motor / cognitive support needs a fresh
 * design and a `crisis` agent pass, not a `git revert` — see
 * docs/development/inclusive-design-standards.md.
 *
 * Note `AccessibleButton` is deliberately absent here: it lives beside this file and
 * its two consumers (both in features/practices/dailyloop/) import it by path.
 *
 * MAINT-487 NARROWED THIS NOTE. It used to cover `AccessibleInput` too, on the same
 * "their consumers import them by path" reasoning — but that component had NO
 * consumers, in either test root, so the sentence explained its absence from the
 * barrel with a fact that was not true of it. The component is deleted, along with
 * the `textHelper` palette entry it alone read (4.3494 on gray[300], below AA).
 */

// === FOUNDATIONAL ACCESSIBILITY COMPONENTS ===
export { default as RadioGroup } from './RadioGroup';
export type { RadioOption, RadioGroupProps } from './RadioGroup';

// Import for local use and re-export
import FocusProviderDefault, {
  FocusProvider,
  Focusable,
  SkipLink,
  useFocusManager
} from './FocusManager';
export type { FocusContextValue } from './FocusManager';

// Export with original names
export {
  FocusProvider,
  Focusable,
  SkipLink,
  useFocusManager
};

// === CONVENIENCE EXPORTS ===
export {
  FocusProvider as AccessibilityProvider,
  useFocusManager as useAccessibility,
};

// === DEFAULT EXPORT ===
export default FocusProviderDefault;
