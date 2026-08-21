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

import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform } from 'react-native';

import { keyboardOccludesCrisisButton } from '@/features/crisis/constants/crisisButtonGeometry';

/**
 * @returns true when a bottom-anchored software keyboard is tall enough to cover the
 *          crisis button. Always false on Android — see the header.
 */
export function useKeyboardOccludesCrisisButton(): boolean {
  const [occluded, setOccluded] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    // Mirrors useOverlayBottomInset's pairing. `willChangeFrame` rather than
    // `willShow` because it also fires for split/undock and height changes, which
    // are exactly the transitions the predicate needs to re-evaluate.
    const showSub = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
      setOccluded(
        keyboardOccludesCrisisButton(e?.endCoordinates, {
          height: Dimensions.get('window').height,
        }),
      );
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => setOccluded(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return occluded;
}

export default useKeyboardOccludesCrisisButton;
