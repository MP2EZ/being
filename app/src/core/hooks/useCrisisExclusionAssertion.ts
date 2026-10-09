/**
 * DEBUG-643 — a __DEV__-only runtime check that a control a host has cleared from the
 * crisis FAB's exclusion region really is clear, on the device and at the text size a
 * developer is looking at.
 *
 * WHY. `intersectsCrisisButtonExclusion` had zero runtime callers. Every host in the
 * DEBUG-547 family was found by a person reading a hand-run `maestro hierarchy` capture,
 * then pinned by a per-host jest geometry test — and jest has no layout engine, pins its
 * safe-area insets at 0, and cannot see a content-count change move a row into the band.
 * This check reads REAL measured frames, so it fires while someone is looking at the screen
 * they just changed.
 *
 * WHAT IT IS NOT. It is dev-only: Release binds a no-op at module scope, so a host passes
 * `onLayout={undefined}` and no layout event is subscribed. It is opt-in, so it covers only
 * the controls that adopt it. The Maestro gate runs Release binaries and never executes it.
 * It is therefore never merge evidence, and never grounds for weakening a per-host jest pin
 * — those remain the falsifier. It warns; it never throws and never changes layout.
 *
 * HOW IT MEASURES. `nativeEvent.layout` is parent-relative, and the predicate needs window
 * coordinates, so the handler measures its own target with `measureInWindow`. Native-driven
 * card and modal transitions reach the shadow tree only when they end, and `onLayout` does
 * not fire again for a transform, so one reading at mount can be a card still off-screen.
 * The handler therefore polls briefly and evaluates only a frame that is on the window and
 * unchanged since the previous reading. A frame that never settles is reported as
 * unverified rather than passed.
 *
 * PLACEMENT. `scrolls` — the control sits in a scroll column and can rest at any height, so
 * only its horizontal extent is invariant: the frame is projected onto the region's
 * vertical span before the predicate runs, which is exactly what the per-host jest sweeps
 * check at every y. `fixed` — the control does not scroll, and the frame is used as
 * measured.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Dimensions } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';

export type CrisisExclusionPlacement = 'scrolls' | 'fixed';
type Frame = { x: number; y: number; width: number; height: number };
type Screen = { width: number; height: number };
type LayoutHandler = (event: LayoutChangeEvent) => void;
type Measurable = {
  measureInWindow?: (cb: (x: number, y: number, width: number, height: number) => void) => void;
};

const POLL_MS = 100;
const WINDOW_MS = 1500;
const SETTLE_TOLERANCE = 0.5;

/** The frame the predicate is asked about. Exported for tests. */
export function exclusionProbeFrame(
  frame: Frame,
  screen: Screen,
  placement: CrisisExclusionPlacement,
): Frame {
  if (placement === 'fixed') return frame;
  return {
    x: frame.x,
    y: screen.height - CRISIS_BUTTON_EXCLUSION_RECT.top,
    width: frame.width,
    height: CRISIS_BUTTON_EXCLUSION_RECT.top - CRISIS_BUTTON_EXCLUSION_RECT.bottom,
  };
}

const sameFrame = (a: Frame, b: Frame): boolean =>
  Math.abs(a.x - b.x) <= SETTLE_TOLERANCE &&
  Math.abs(a.y - b.y) <= SETTLE_TOLERANCE &&
  Math.abs(a.width - b.width) <= SETTLE_TOLERANCE &&
  Math.abs(a.height - b.height) <= SETTLE_TOLERANCE;

const onWindow = (f: Frame, s: Screen, placement: CrisisExclusionPlacement): boolean => {
  const horizontal = f.x >= -SETTLE_TOLERANCE && f.x + f.width <= s.width + SETTLE_TOLERANCE;
  if (placement === 'scrolls') return horizontal;
  return horizontal && f.y >= -SETTLE_TOLERANCE && f.y + f.height <= s.height + SETTLE_TOLERANCE;
};

const frameLabel = (f: Frame): string => `x=${f.x} y=${f.y} w=${f.width} h=${f.height}`;

const reported = new Set<string>();

/** Tests only: forget which warnings have been emitted. */
export function resetCrisisExclusionWarnings(): void {
  reported.clear();
}

function warnOnce(key: string, message: string): void {
  if (reported.has(key)) return;
  reported.add(key);
  // eslint-disable-next-line no-console -- DEBUG-643 __DEV__-only: LogBox shows warn, and ProductionLogger's dev output (console.log) does not reach it
  console.warn(message);
}

function makeHandler(
  testID: string,
  placement: CrisisExclusionPlacement,
  isAlive: () => boolean,
): LayoutHandler {
  return (event) => {
    try {
      // Captured now: the event's currentTarget does not outlive dispatch.
      const target = (event as unknown as { currentTarget?: Measurable } | undefined)?.currentTarget;
      if (!target || typeof target.measureInWindow !== 'function') return;

      let previous: Frame | null = null;
      let lastEvaluated: Frame | null = null;
      let elapsed = 0;

      const finish = (): void => {
        if (lastEvaluated) return;
        warnOnce(
          `unverified:${testID}`,
          `[DEBUG-643] could not verify ${testID} against the crisis button's exclusion region: ` +
            `its frame never settled on the window within ${WINDOW_MS}ms.`,
        );
      };

      const sample = (): void => {
        if (!isAlive()) return;
        try {
          target.measureInWindow?.((x, y, width, height) => {
            if (!isAlive() || width <= 0 || height <= 0) return;
            const frame = { x, y, width, height };
            const screen = Dimensions.get('window');
            const settled =
              previous !== null && sameFrame(previous, frame) && onWindow(frame, screen, placement);
            previous = frame;
            if (settled && !(lastEvaluated && sameFrame(lastEvaluated, frame))) {
              lastEvaluated = frame;
              const probe = exclusionProbeFrame(frame, screen, placement);
              if (intersectsCrisisButtonExclusion(probe, screen)) {
                warnOnce(
                  `hit:${testID}:${frameLabel(frame)}`,
                  `[DEBUG-643] ${testID} intersects the crisis button's exclusion region ` +
                    `(${placement}): frame ${frameLabel(frame)} on a ${screen.width}x${screen.height} window. ` +
                    `A tap there opens CrisisResources. See crisisButtonGeometry.ts.`,
                );
              }
            }
            elapsed += POLL_MS;
            if (elapsed > WINDOW_MS) {
              finish();
              return;
            }
            setTimeout(sample, POLL_MS);
          });
        } catch {
          // A detached or unmeasurable target ends the check; it must never reach the host.
        }
      };
      sample();
    } catch {
      // Never throw into a host's layout pass.
    }
  };
}

const devFactory = (testID: string, placement: CrisisExclusionPlacement): LayoutHandler =>
  makeHandler(testID, placement, () => true);

function useDevAssertion(testID: string, placement: CrisisExclusionPlacement): LayoutHandler {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return useMemo(() => makeHandler(testID, placement, () => alive.current), [testID, placement]);
}

/**
 * The check as an `onLayout` handler, for a control rendered inside a `.map` where a hook
 * cannot be called. `undefined` in Release. Polling is bounded to ~1.5s and ends when the
 * target stops answering.
 */
export const crisisExclusionOnLayout: (
  testID: string,
  placement: CrisisExclusionPlacement,
) => LayoutHandler | undefined = __DEV__ ? devFactory : () => undefined;

/** The check as an `onLayout` handler that stops when the host unmounts. `undefined` in Release. */
export const useCrisisExclusionAssertion: (
  testID: string,
  placement: CrisisExclusionPlacement,
) => LayoutHandler | undefined = __DEV__ ? useDevAssertion : () => undefined;
