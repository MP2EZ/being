/**
 * Bug-report form visibility (FEAT-570).
 *
 * ── WHY THIS FILE EXISTS AT ALL ──
 *
 * FEAT-284 opened Sentry's own feedback widget by calling a presenter:
 * `showFeedbackWidget()`. DEBUG-533 ruled that a DEBUG-406 conversion site — the
 * widget paints a 90%-opaque inset-0 backdrop as a later sibling of our whole
 * app, so `RootCrisisButton`'s `zIndex: 9999` cannot reach past it and the 988
 * affordance is gone for an unbounded dwell. The remedy is to render the form
 * ourselves, into `rootOverlaySlot`, where it structurally cannot paint above
 * the crisis button. A React overlay needs a visibility flag, and both entry
 * points (the Profile card and the root-armed shake gesture) are imperative call
 * sites that own no component state. This store is that flag.
 *
 * ── WHY IT IS SEPARATE FROM THE OVERLAY COMPONENT ──
 *
 * `ExternalErrorReporter` reads it, and that file must not import a component:
 * it would pull React Native into the logging service's module graph. Kept
 * dependency-free (zustand only) so the import is a flag, not a render tree.
 *
 * ── THIS FILE IS A PROTECTED PATH, AND NO DETECTOR CAN SEE WHY ──
 *
 * It imports nothing of ours. INFRA-531's crisis-constant-import rule matches
 * nothing here, and `check-modal-occlusion-guard.js` sees no `<Modal>`. What it
 * is, is the sole gate on whether a root-armed, opaque, accessibility-pruning
 * overlay opens — so a wrong edit here is a zero-988 window on a route where the
 * FAB has already stepped aside. The hand-maintained Protected Paths row in
 * `.claude/CLAUDE.md` is the only control. Do not delete it because this file
 * "looks like a two-field store".
 *
 * ── WHAT THIS STORE DELIBERATELY DOES NOT DECIDE ──
 *
 * • WHETHER THE SURFACE EXISTS. That is `isFeatureEnabled('bug_reporting')`,
 *   checked at `showFeedbackForm()` where both entry points already funnel.
 * • WHETHER IT MAY PAINT ON THIS ROUTE. That is `rootOverlaySlot`'s refusal, by
 *   construction, over `CRISIS_DESTINATION_ROUTES ∪ SCREEN_OWNED_988_ROUTES`.
 *   Do not add a route check here — two places deciding one thing is the
 *   two-list drift failure `CLAUDE.md` names for `guidance/` and `consent/`.
 * • WHETHER A REPORT MAY BE SENT. That is `submitFeedback()`'s `isActive()`
 *   check, read fresh at the moment of the call.
 *
 * ── THE DRAFT IS NEVER PERSISTED (compliance, non-negotiable) ──
 *
 * The message lives in the overlay's own component state and dies with it. It is
 * never written to AsyncStorage, SecureStore, or any retry queue, on any path
 * including a refused submit. Feedback text is unbounded user prose that can
 * carry the wellness disclosures its own placeholder warns against; persisting
 * it anywhere would reopen, to disk, exactly the exposure the dropped screenshot
 * was removed to close.
 */

import { create } from 'zustand';

interface BugReportState {
  /** True while the bug-report form should be published into the root slot. */
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useBugReportStore = create<BugReportState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));

/**
 * Imperative entry used by `showFeedbackForm()`.
 *
 * Both call sites — the Profile card and `useBugReportShake` — are imperative,
 * so they cannot hold component state of their own.
 */
export const openBugReport = (): void => useBugReportStore.getState().open();

/** Imperative close, used by the overlay's exits and by the slot's revocation. */
export const closeBugReport = (): void => useBugReportStore.getState().close();
