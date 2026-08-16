/**
 * Crisis Components - Barrel Export
 * UI components for crisis intervention and support
 */

export { default as CrisisErrorBoundary } from './CrisisErrorBoundary';
export { default as CollapsibleCrisisButton } from './CollapsibleCrisisButton';
export type { CrisisButtonMode } from './CollapsibleCrisisButton';
export { default as RootCrisisButton, ROOT_CRISIS_BUTTON_TEST_ID } from './RootCrisisButton';
// MAINT-393 deleted CrisisAccessibility.tsx with the unmounted advanced-
// accessibility subtree it was half of (the two formed an import cycle).
// The four exports above are the live crisis surface.
