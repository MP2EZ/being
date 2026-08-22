/**
 * Is the crisis button currently occluded by a software keyboard? (DEBUG-450)
 *
 * DEBUG-431 ruled that CLAUDE.md's "988 access: <3 taps from any screen" applies
 * while a keyboard is up, and that the occluded state is a defect. `RootCrisisButton`
 * cannot solve it by moving: the iOS keyboard renders in `UIRemoteKeyboardWindow`, a
 * separate `UIWindow` above the app's, so no in-tree y-position reaches above it
 * (see `crisisButtonGeometry.ts`). The fix is an additive control that renders INTO
 * that window — an `InputAccessoryView` — and this hook decides when it is needed.
 *
 * ONE SUBSCRIPTION FOR THE WHOLE APP, however many consumers (DEBUG-506). Under
 * DEBUG-450 the accessory was mounted once at app root, so a per-mount subscription cost
 * nothing. DEBUG-506 moves it to one instance per `TextInput` — `DailyLoopStepScreen`
 * renders up to three concurrently — and `keyboardWillChangeFrame` fires on every frame of
 * the keyboard's show animation. Per-mount subscription would therefore run 2N callbacks
 * per frame while a distressed user is looking at a crisis affordance. The listeners are
 * hoisted to module scope behind a subscriber set and torn down when the last consumer
 * leaves; `useSyncExternalStore` keeps every consumer on one snapshot, so N instances
 * cannot disagree about whether the keyboard is up.
 *
 * iOS-ONLY BY CONSTRUCTION, and that is a finding rather than a limitation. Android
 * sets `windowSoftInputMode=adjustResize` (explicit on `MainActivity`, and Expo's
 * default anyway), so the window itself shrinks when the IME opens and the
 * absolutely-positioned button is repositioned above the keyboard for free. There is
 * no occlusion to detect there. The hook returns `false` on Android rather than
 * pretending to measure something, and no keyboard listener is registered.
 *
 * NOT ON THE CRISIS TAP PATH. This subscribes to keyboard events only; the crisis
 * control's own tap handler does no keyboard work, so the <200ms tap budget is
 * untouched by anything here.
 */

import { useSyncExternalStore } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';

import { keyboardOccludesCrisisButton } from '@/features/crisis/constants/crisisButtonGeometry';

/** The single snapshot every consumer reads. */
let occluded = false;

/** React-supplied re-render callbacks, one per mounted consumer. */
const consumers = new Set<() => void>();

/** The two real `Keyboard` subscriptions, held only while a consumer exists. */
let subscriptions: EmitterSubscription[] | null = null;

function publish(next: boolean): void {
  if (next === occluded) return;
  occluded = next;
  for (const notify of consumers) notify();
}

function attachKeyboardListeners(): void {
  if (subscriptions) return;
  // Mirrors useOverlayBottomInset's pairing. `willChangeFrame` rather than `willShow`
  // because it also fires for split/undock and height changes, which are exactly the
  // transitions the predicate needs to re-evaluate.
  subscriptions = [
    Keyboard.addListener('keyboardWillChangeFrame', (e) => {
      publish(
        keyboardOccludesCrisisButton(e?.endCoordinates, {
          height: Dimensions.get('window').height,
        }),
      );
    }),
    Keyboard.addListener('keyboardWillHide', () => publish(false)),
  ];
}

function detachKeyboardListeners(): void {
  if (!subscriptions) return;
  for (const sub of subscriptions) sub.remove();
  subscriptions = null;
  // Reset rather than retain: the next consumer must not inherit a stale verdict from a
  // keyboard that was dismissed while nothing was listening.
  occluded = false;
}

function subscribe(notify: () => void): () => void {
  if (Platform.OS !== 'ios') return () => {};

  consumers.add(notify);
  if (consumers.size === 1) attachKeyboardListeners();

  return () => {
    consumers.delete(notify);
    if (consumers.size === 0) detachKeyboardListeners();
  };
}

/** Primitive snapshot, so `useSyncExternalStore`'s identity check is stable by value. */
function getSnapshot(): boolean {
  return Platform.OS === 'ios' ? occluded : false;
}

/**
 * @returns true when a bottom-anchored software keyboard is tall enough to cover the
 *          crisis button. Always false on Android — see the header.
 */
export function useKeyboardOccludesCrisisButton(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export default useKeyboardOccludesCrisisButton;
