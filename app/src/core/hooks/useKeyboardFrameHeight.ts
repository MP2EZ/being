/**
 * The height of the keyboard's frame, right now, as ONE app-wide snapshot (DEBUG-516).
 *
 * WHY A PRIMITIVE RATHER THAN A THIRD LISTENER. Two hooks already derive their own state
 * from the same two `Keyboard` events — `useOverlayBottomInset` and
 * `useKeyboardOccludesCrisisButton` — and both record that the pairing (`willChangeFrame`
 * rather than `willShow`, because it also fires for split/undock and height changes) is
 * load-bearing. A third copy is the drift `crisisButtonGeometry.ts` exists to prevent, and
 * the two consumers could then disagree about whether the keyboard is up.
 *
 * WHY THE HEIGHT AND NOT A DERIVED VERDICT. `overlayBottomInset` takes a MAX with the
 * crisis-button band, which is right for a centred card and wrong for a bottom-anchored
 * action row: keyboard-down it returns 176pt, a quarter of an iPhone SE 3 viewport, spent
 * to duplicate protection a horizontal `paddingRight` already provides. The raw frame is
 * the quantity both shapes are derived FROM, so that is what this publishes.
 *
 * WHY IT IS THE ONLY HONEST SOURCE FOR AN OCCLUDING EDGE. An `inputAccessoryView` is
 * installed into `UIRemoteKeyboardWindow` as part of the first responder's input-view set,
 * so `UIKeyboardFrameEndUserInfoKey` reports key layout + predictive bar + accessory as one
 * union, and RN passes that rect through verbatim. A layout derived from this number
 * therefore absorbs a change in the accessory's height in the same notification that causes
 * it — no capability probe, no device table, and no way for the inset and the edge to
 * disagree, because they are the same number read once. A layout derived from a MEASURED
 * clearance cannot do that, and is wrong the moment any keyboard-window chrome changes.
 *
 * ONE SUBSCRIPTION FOR THE WHOLE APP, however many consumers. `keyboardWillChangeFrame`
 * fires on every frame of the keyboard's show animation, so per-mount subscription runs 2N
 * callbacks per frame. Listeners are hoisted to module scope behind a subscriber set and
 * torn down when the last consumer leaves; `useSyncExternalStore` keeps every consumer on
 * one snapshot. Same shape as `useKeyboardOccludesCrisisButton`, deliberately.
 */

import { useSyncExternalStore } from 'react';
import { Keyboard, Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';

/** The single snapshot every consumer reads, in points. */
let keyboardHeight = 0;

/** React-supplied re-render callbacks, one per mounted consumer. */
const consumers = new Set<() => void>();

/** The two real `Keyboard` subscriptions, held only while a consumer exists. */
let subscriptions: EmitterSubscription[] | null = null;

function publish(next: number): void {
  if (next === keyboardHeight) return;
  keyboardHeight = next;
  for (const notify of consumers) notify();
}

function attachKeyboardListeners(): void {
  if (subscriptions) return;
  // `willChangeFrame` on iOS so a consumer's inset animates WITH the keyboard rather than
  // snapping after it. Android has no `will*` events, so use the `did*` pair there.
  const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
  const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

  subscriptions = [
    Keyboard.addListener(showEvent, (e) => publish(e?.endCoordinates?.height ?? 0)),
    Keyboard.addListener(hideEvent, () => publish(0)),
  ];
}

function detachKeyboardListeners(): void {
  if (!subscriptions) return;
  for (const sub of subscriptions) sub.remove();
  subscriptions = null;
  // Reset rather than retain: the next consumer must not inherit a stale height from a
  // keyboard that was dismissed while nothing was listening.
  keyboardHeight = 0;
}

function subscribe(notify: () => void): () => void {
  consumers.add(notify);
  if (consumers.size === 1) attachKeyboardListeners();

  return () => {
    consumers.delete(notify);
    if (consumers.size === 0) detachKeyboardListeners();
  };
}

/** Primitive snapshot, so `useSyncExternalStore`'s identity check is stable by value. */
function getSnapshot(): number {
  return keyboardHeight;
}

/**
 * @returns the keyboard frame's height in points — 0 when no keyboard is up.
 *          Accessory- and predictive-bar-inclusive on iOS; see the header.
 */
export function useKeyboardFrameHeight(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * The bottom inset a keyboard-avoiding CONTAINER should apply right now.
 *
 * Zero on Android, and that is a finding rather than a gap: `windowSoftInputMode`
 * is `adjustResize`, so the window itself shrinks when the IME opens and the container's
 * own bottom edge has already moved. Adding the height there DOUBLES the inset and floats
 * the content a full keyboard clear of the IME.
 *
 * @returns points to reserve at the bottom edge for the keyboard.
 */
export function useKeyboardAvoidingBottomInset(): number {
  const height = useKeyboardFrameHeight();
  return Platform.OS === 'ios' ? height : 0;
}

export default useKeyboardFrameHeight;
