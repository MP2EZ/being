/**
 * Crisis-button geometry — the single source for every layout constant derived
 * from where the root crisis button sits (DEBUG-406).
 *
 * WHY THIS MODULE EXISTS
 * ======================
 * Before this file, the button's position was hand-copied into two constants and
 * two comment blocks: `HapticsOptInPrompt.tsx` and `ResumeSessionModal.tsx` each
 * declared `104 + TOUCH_TARGETS.minimum + 12 + spacing[16]` verbatim. Nothing
 * connected either literal back to `CollapsibleCrisisButton`'s styles, so moving
 * the button would have left both wrong — silently, and in the direction of an
 * overlay control sitting under a control that wins the tap.
 *
 * DEBUG-406 needed a THIRD consumer with a different shape, which is the point at
 * which copying stops being tolerable. Both shapes now derive from the raw
 * geometry below.
 *
 * THE RAW GEOMETRY (mirrors CollapsibleCrisisButton.tsx:456, 471-477)
 * ==================================================================
 * The button is `position: 'absolute'`, `right: 0`, `zIndex: 9999`, sized
 * `TOUCH_TARGETS.minimum` square in `standard`/`immersive` mode, with a uniform
 * 12pt `hitSlop`, offset from the bottom by 100 (iOS) / 104 (Android).
 *
 * `zIndex: 9999` is why any overlap matters: the button WINS an overlapping tap.
 * An overlay control underneath it does not merely become hard to press — the
 * press fires a crisis entry the user did not ask for (audit-logged, and it
 * navigates away from whatever they were doing) AND swallows the action they
 * did ask for. `HapticsOptInPrompt` states it as "an overlap is unrecoverable."
 *
 * TWO SHAPES, AND WHY BOTH ARE CORRECT
 * ====================================
 * `CRISIS_BUTTON_RESERVED_BAND` — a full-width bottom inset. Correct for a
 * CENTRED CARD (`justifyContent: 'center'`), where the card is free to float and
 * a full-width inset costs nothing. Used by `HapticsOptInPrompt` and
 * `ResumeSessionModal`, both unchanged by DEBUG-406.
 *
 * `CRISIS_BUTTON_EXCLUSION_RECT` — the actual contested region. Correct for a
 * BOTTOM SHEET (`justifyContent: 'flex-end'`), where a full-width 176pt inset
 * would detach the sheet from the bottom edge and destroy the affordance.
 *
 * ⚠️  BEFORE MAKING ANY OF THIS DYNAMIC, read
 * docs/development/crisis-button-keyboard-occlusion.md (DEBUG-431, ruled
 * 2026-08-16). The rect is satisfied by an EQUALITY with zero slack — a sheet's
 * action row sits at exactly `.top` (176) — so any change to the button's
 * `bottom` breaks it in one direction or the other, and there is no intermediate
 * value. A raised button lands either on the action row or on the multiline
 * TextInput, and at zIndex 9999 it wins the tap: a caret placement or a Cancel
 * press fires an audit-logged crisis navigation instead. That document rules the
 * dynamic raise OUT and records the shape the constraints do permit.
 *
 * DEBUG-406's audit derived the band from two centred cards and initially applied
 * it to four bottom sheets. That was wrong, and the correction is worth recording
 * precisely because the two constants look interchangeable: the band's virtue was
 * never its WIDTH, it was that it is one number on one style prop that a test can
 * read. The rect keeps the same vertical protection (its inflated top edge is
 * exactly the band — see the assertion in the test) and hands back the width that
 * was never protecting anything.
 *
 * THE CLEARANCE TERM IS NOT COSMETIC
 * ==================================
 * Both shapes add `spacing[16]` beyond the raw hit area. That is TARGET
 * SEPARATION, not padding-for-looks: a control whose hit rect ends 1pt outside
 * the button's is compliant on paper and a coin-flip under a thumb, and the
 * mis-tap is asymmetric (see above). The rect inflates on its three APPROACH
 * edges only — left, top, bottom. It is not inflated rightward because
 * `right: 0` means that edge is the screen edge and there is nothing there to
 * separate from.
 *
 * WHAT THIS MODULE CANNOT DO
 * ==========================
 * A constant cannot enforce "no interactive control intersects this region."
 * `paddingRight`/`marginBottom` are PROXIES for that invariant, and they stop
 * being sufficient the moment someone adds a button, flips `justifyContent`,
 * or a translator supplies a longer string — silently, toward a false crisis tap.
 * The invariant itself is asserted on-device from the view hierarchy's real
 * bounds; see `docs/testing/e2e-maestro.md` on the bounds falsifier. Treat the
 * numbers here as necessary, never as evidence.
 *
 * ORIENTATION: `right: 0` carries no horizontal safe-area inset, so
 * `EXCLUSION_INSET_RIGHT` is a PORTRAIT figure. The app is portrait-locked
 * (`app.json` → `orientation: "portrait"`); if that ever changes, the rect needs
 * the landscape inset added.
 */

import { spacing } from '@/core/theme';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

/**
 * Bottom offset of the button's container, per platform.
 * Mirrors `CollapsibleCrisisButton`'s `styles.container.bottom`.
 */
export const CRISIS_BUTTON_BOTTOM_OFFSET = { ios: 100, android: 104 } as const;

/**
 * The larger of the two platform offsets. Layout constraints take the
 * CONSERVATIVE union rather than `Platform.select`, so one set of numbers is
 * safe on both platforms and a jest snapshot does not depend on the host OS.
 */
export const CRISIS_BUTTON_BOTTOM_OFFSET_MAX = Math.max(
  CRISIS_BUTTON_BOTTOM_OFFSET.ios,
  CRISIS_BUTTON_BOTTOM_OFFSET.android,
);

/** The button's visible square in `standard` / `immersive` mode. */
export const CRISIS_BUTTON_SIZE = TOUCH_TARGETS.minimum;

/** Uniform `hitSlop` on the button's Pressable. */
export const CRISIS_BUTTON_HIT_SLOP = 12;

/** Target-separation margin added beyond the raw hit area. See header. */
export const CRISIS_BUTTON_CLEARANCE = spacing[16];

/**
 * Full-width bottom inset for a CENTRED-CARD overlay.
 *
 * 104 + 44 + 12 + 16 = 176. Consumed by `HapticsOptInPrompt` and
 * `ResumeSessionModal`, which keep their existing behaviour — this constant
 * reproduces the literal both files declared, it does not change it.
 */
export const CRISIS_BUTTON_RESERVED_BAND =
  CRISIS_BUTTON_BOTTOM_OFFSET_MAX +
  CRISIS_BUTTON_SIZE +
  CRISIS_BUTTON_HIT_SLOP +
  CRISIS_BUTTON_CLEARANCE;

/**
 * The contested region, as insets from the screen's edges, for a BOTTOM-SHEET
 * overlay. Clearance-inflated on the three approach edges.
 *
 *   right  : 0                                    (the screen edge)
 *   left   : 44 + 12 + 16               =  72     → x ∈ [W − 72, W]
 *   top    : 104 + 44 + 12 + 16         = 176     → y ∈ [H − 176, …]
 *   bottom : 100 − 12 − 16              =  72     → y ∈ [ … , H − 72]
 *
 * `top` is measured from the BOTTOM of the screen and is deliberately identical
 * to `CRISIS_BUTTON_RESERVED_BAND` — the rect is the band with the uncontested
 * width handed back. A test pins that equality so the two cannot drift.
 *
 * `bottom` uses the SMALLER (iOS) offset because it bounds the region from
 * below: taking the larger value would shrink the rect and under-protect iOS.
 */
export const CRISIS_BUTTON_EXCLUSION_RECT = {
  /** Distance from the screen's right edge to the region's left edge. */
  left:
    CRISIS_BUTTON_SIZE + CRISIS_BUTTON_HIT_SLOP + CRISIS_BUTTON_CLEARANCE,
  /** Distance from the screen's bottom edge to the region's top edge. */
  top:
    CRISIS_BUTTON_BOTTOM_OFFSET_MAX +
    CRISIS_BUTTON_SIZE +
    CRISIS_BUTTON_HIT_SLOP +
    CRISIS_BUTTON_CLEARANCE,
  /** Distance from the screen's bottom edge to the region's bottom edge. */
  bottom: Math.max(
    0,
    Math.min(CRISIS_BUTTON_BOTTOM_OFFSET.ios, CRISIS_BUTTON_BOTTOM_OFFSET.android) -
      CRISIS_BUTTON_HIT_SLOP -
      CRISIS_BUTTON_CLEARANCE,
  ),
} as const;

/**
 * Minimum `paddingRight` on a bottom sheet's action row so no control reaches
 * into the exclusion rect's contested column. Equal to the rect's `left` inset.
 */
export const OVERLAY_ACTION_ROW_PADDING_RIGHT = CRISIS_BUTTON_EXCLUSION_RECT.left;

/**
 * True when a control's rect (in screen coordinates) intersects the crisis
 * button's exclusion region. Shared by the `__DEV__` layout assertion and its
 * unit tests so both read one implementation.
 *
 * Half-open intervals: a control that ENDS exactly where the region begins does
 * not intersect. The clearance term already supplies the safety margin, so
 * treating touching edges as an overlap would reject correct layouts.
 */
export function intersectsCrisisButtonExclusion(
  control: { x: number; y: number; width: number; height: number },
  screen: { width: number; height: number },
): boolean {
  const regionLeft = screen.width - CRISIS_BUTTON_EXCLUSION_RECT.left;
  const regionTop = screen.height - CRISIS_BUTTON_EXCLUSION_RECT.top;
  const regionBottom = screen.height - CRISIS_BUTTON_EXCLUSION_RECT.bottom;

  const controlRight = control.x + control.width;
  const controlBottom = control.y + control.height;

  const overlapsX = controlRight > regionLeft && control.x < screen.width;
  const overlapsY = controlBottom > regionTop && control.y < regionBottom;

  return overlapsX && overlapsY;
}

/**
 * Bottom inset for a keyboard-raising overlay: `max`, NEVER a sum.
 *
 * DEBUG-406 — the iOS keyboard renders in `UIRemoteKeyboardWindow`, a separate
 * `UIWindow` ABOVE the app's, so `zIndex: 9999` is as irrelevant to it as it is
 * to an RN `<Modal>`. At a 100pt offset the button's top edge is 156pt, and the
 * smallest keyboard on any shipping iPhone exceeds that — so whenever the
 * keyboard is up, the crisis button is already inside its frame and reserving
 * space for it buys exactly nothing.
 *
 * Adding the two would consume 176 + ~260 = 436pt of an iPhone SE 3's 667pt
 * viewport before any content, which is how DEBUG-403's defect happened: the
 * sheet overflowed its box, a primary action's centre landed in clipped space,
 * and the tap resolved in the view hierarchy while never reaching the app.
 */
export function overlayBottomInset(keyboardHeight: number): number {
  return Math.max(CRISIS_BUTTON_RESERVED_BAND, keyboardHeight);
}
