/**
 * Crisis-button geometry (DEBUG-406)
 *
 * These constants are consumed by every overlay that must not put an interactive
 * control under the root crisis button — which wins an overlapping tap at
 * `zIndex: 9999`, firing a crisis entry the user did not ask for AND swallowing
 * the one they did.
 *
 * The load-bearing spec is `derives the same vertical protection as the band`:
 * DEBUG-406 replaced a full-width 176pt reserved band with a narrower exclusion
 * rect for bottom sheets, and the case for that replacement is that it hands back
 * only the width that was never protecting anything. If the rect's top inset ever
 * drifts below the band, that argument is void and the rect is a silent weakening.
 */

import {
  CRISIS_BUTTON_BOTTOM_OFFSET,
  CRISIS_BUTTON_CLEARANCE,
  CRISIS_BUTTON_EXCLUSION_RECT,
  CRISIS_BUTTON_HIT_SLOP,
  CRISIS_BUTTON_RESERVED_BAND,
  CRISIS_BUTTON_SIZE,
  OVERLAY_ACTION_ROW_PADDING_RIGHT,
  intersectsCrisisButtonExclusion,
  overlayBottomInset,
} from '../crisisButtonGeometry';

describe('DEBUG-406 · crisis button geometry', () => {
  describe('raw geometry mirrors CollapsibleCrisisButton', () => {
    it('pins the per-platform bottom offset', () => {
      expect(CRISIS_BUTTON_BOTTOM_OFFSET).toEqual({ ios: 100, android: 104 });
    });

    it('pins the visible target size at the WCAG 2.5.5 minimum', () => {
      expect(CRISIS_BUTTON_SIZE).toBe(44);
    });

    it('pins the uniform hitSlop', () => {
      expect(CRISIS_BUTTON_HIT_SLOP).toBe(12);
    });
  });

  describe('reserved band (centred cards — HapticsOptInPrompt, ResumeSessionModal)', () => {
    it('reproduces the literal both files declared, unchanged', () => {
      // 104 + 44 + 12 + 16. Extracting this constant must not move it: both
      // consumers are merged safety code and DEBUG-406 does not reopen them.
      expect(CRISIS_BUTTON_RESERVED_BAND).toBe(176);
    });

    it('is built from the raw geometry, not a literal', () => {
      expect(CRISIS_BUTTON_RESERVED_BAND).toBe(
        CRISIS_BUTTON_BOTTOM_OFFSET.android +
          CRISIS_BUTTON_SIZE +
          CRISIS_BUTTON_HIT_SLOP +
          CRISIS_BUTTON_CLEARANCE,
      );
    });
  });

  describe('exclusion rect (bottom sheets)', () => {
    it('derives the same vertical protection as the band', () => {
      // THE load-bearing assertion. The rect is defensible only as "the band with
      // the uncontested width handed back". Equal top edge is what makes that
      // true; drift here turns the swap into an unremarked weakening on the
      // app's highest-consequence control.
      expect(CRISIS_BUTTON_EXCLUSION_RECT.top).toBe(CRISIS_BUTTON_RESERVED_BAND);
    });

    it('contests only the button width plus hitSlop plus clearance', () => {
      expect(CRISIS_BUTTON_EXCLUSION_RECT.left).toBe(72); // 44 + 12 + 16
    });

    it('bounds the region from below using the SMALLER platform offset', () => {
      // Taking the larger (Android) offset here would shrink the region and
      // under-protect iOS, where the button sits 4pt lower.
      expect(CRISIS_BUTTON_EXCLUSION_RECT.bottom).toBe(72); // 100 - 12 - 16
    });

    it('exposes the action-row padding as the rect, not a re-typed number', () => {
      expect(OVERLAY_ACTION_ROW_PADDING_RIGHT).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
    });
  });

  describe('intersection test', () => {
    const screen = { width: 430, height: 932 }; // iPhone 16 Plus, DEBUG-403's rig

    it('flags a right-aligned action row sitting in the contested corner', () => {
      // The real shape of the defect: a Save button at the bottom-right of a
      // bottom sheet. y 856..900 is inside [932-176, 932-72] = [756, 860].
      expect(
        intersectsCrisisButtonExclusion(
          { x: 300, y: 830, width: 110, height: 44 },
          screen,
        ),
      ).toBe(true);
    });

    it('clears a left-aligned control at the same height', () => {
      // Cancel, on the left of the same row — the whole point of the rect over
      // the band is that this layout is fine.
      expect(
        intersectsCrisisButtonExclusion({ x: 24, y: 830, width: 110, height: 44 }, screen),
      ).toBe(false);
    });

    it('clears a right-aligned control above the region', () => {
      expect(
        intersectsCrisisButtonExclusion({ x: 300, y: 600, width: 110, height: 44 }, screen),
      ).toBe(false);
    });

    it('clears a right-aligned control below the region (under the button)', () => {
      // Below y = 932-72 = 860 the button is no longer present, so a control
      // there is safe even hard against the right edge.
      expect(
        intersectsCrisisButtonExclusion({ x: 380, y: 880, width: 50, height: 40 }, screen),
      ).toBe(false);
    });

    it('treats exactly-touching edges as clear, not overlapping', () => {
      // The clearance term already supplies the margin; counting a touch as an
      // overlap would reject correct layouts and train people to ignore it.
      expect(
        intersectsCrisisButtonExclusion(
          { x: 0, y: 756, width: screen.width - 72, height: 44 },
          screen,
        ),
      ).toBe(false);
    });

    it('flags a full-width control crossing the region', () => {
      // A full-bleed primary button at the bottom of a sheet — site 1's shape.
      expect(
        intersectsCrisisButtonExclusion(
          { x: 24, y: 800, width: screen.width - 48, height: 48 },
          screen,
        ),
      ).toBe(true);
    });
  });

  describe('keyboard inset is a max, never a sum', () => {
    it('returns the band when no keyboard is up', () => {
      expect(overlayBottomInset(0)).toBe(CRISIS_BUTTON_RESERVED_BAND);
    });

    it('returns the keyboard height when it exceeds the band', () => {
      expect(overlayBottomInset(336)).toBe(336);
    });

    it('never sums the two', () => {
      // 176 + 336 = 512 would consume most of an iPhone SE 3's 667pt viewport
      // before any content — DEBUG-403's exact failure, where the sheet
      // overflowed its box and a primary action's centre landed in clipped
      // space, so the tap resolved in the hierarchy but never reached the app.
      expect(overlayBottomInset(336)).toBeLessThan(
        CRISIS_BUTTON_RESERVED_BAND + 336,
      );
    });

    it('is justified by the button already being inside the keyboard frame', () => {
      // The button's top edge sits at offset + size = 148 (iOS 100 + 44, plus
      // hitSlop 12 → 156). Every shipping iPhone keyboard is taller than that,
      // so reserving space for the button while the keyboard is up buys nothing.
      const buttonTopEdge =
        CRISIS_BUTTON_BOTTOM_OFFSET.ios + CRISIS_BUTTON_SIZE + CRISIS_BUTTON_HIT_SLOP;
      expect(buttonTopEdge).toBe(156);
      expect(overlayBottomInset(216)).toBeGreaterThan(buttonTopEdge);
    });
  });
});
