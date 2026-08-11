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
 * Note `AccessibleButton` and `AccessibleInput` are deliberately absent here:
 * they live beside this file and their consumers import them by path.
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
