/**
 * Bottom inset for a keyboard-raising overlay (DEBUG-406).
 *
 * Replaces `KeyboardAvoidingView` on overlays that also have to keep clear of
 * the root crisis button. Two mechanisms competing for the same edge is how
 * DEBUG-403's defect happened, so this drives the inset from a single source.
 *
 * WHY NOT KeyboardAvoidingView
 * ============================
 * Two independent reasons:
 *
 * 1. IT MEASURES AGAINST ITS OWN FRAME. Inside an RN `<Modal>` a KAV measured
 *    against the modal's window origin, so it "just worked". Rendered inline —
 *    which is what every DEBUG-406 conversion does — it measures against its own
 *    frame, so `keyboardVerticalOffset` has to account for every ancestor
 *    offset. That is the classic source of "correct on the device I tested".
 *
 * 2. IT COMPOSES BADLY WITH A RESERVED BAND. A KAV adds the keyboard height as
 *    padding; a separately-applied crisis-button band adds on top of it. On an
 *    iPhone SE 3 that is 176 + ~260 = 436pt of a 667pt viewport consumed before
 *    any content. DEBUG-403 shipped exactly that shape: the sheet overflowed its
 *    box, the primary action's centre landed 1.5pt inside clipped space, and
 *    Maestro reported the tap COMPLETED while the app never received it.
 *
 * THE INSET IS A MAX, NEVER A SUM
 * ===============================
 * The crisis button sits at most 156pt above the bottom edge (100 offset + 44
 * size + 12 hitSlop). Every shipping iPhone keyboard is taller than that, and
 * the iOS keyboard renders in `UIRemoteKeyboardWindow` — a separate `UIWindow`
 * ABOVE the app's, so `zIndex: 9999` is as irrelevant to it as it is to a
 * `<Modal>`. Whenever the keyboard is up the button is already inside its frame,
 * so reserving space for it as well buys nothing and costs a viewport.
 *
 * Consequence worth stating plainly, because it bounds what these conversions
 * achieve: while the keyboard is up, 988 access via the root button is NOT
 * restored. It returns the instant the keyboard is dismissed, and Cancel remains
 * reachable above the keyboard, so the user always has a one-tap route back to a
 * state where the button is visible. That is a mitigation, not a fix — the
 * app-wide keyboard-occlusion problem is tracked separately and is not specific
 * to these overlays (the journal and VoiceReflection have it too).
 */

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { overlayBottomInset } from '@/features/crisis/constants/crisisButtonGeometry';

/**
 * @returns the bottom inset an overlay should apply right now, in points.
 */
export function useOverlayBottomInset(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // `WillChangeFrame` on iOS so the inset animates with the keyboard rather
    // than snapping after it; Android has no `will*` events, so use the
    // `did*` pair there.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return overlayBottomInset(keyboardHeight);
}

export default useOverlayBottomInset;
