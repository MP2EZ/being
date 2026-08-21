/**
 * Wiring for the keyboard-anchored crisis affordance (DEBUG-450).
 *
 * Kept separate from the component so a `TextInput` call site pulls in an ID and a
 * one-line prop spread, not the control's whole render tree. Seven surfaces consume
 * `crisisAccessoryProps()`; a `Platform.select` copy-pasted seven times is the drift
 * `crisisButtonGeometry.ts` exists to prevent.
 */

import { Platform } from 'react-native';

/**
 * `nativeID` linking every `TextInput` to the single mounted accessory view.
 *
 * React Native registers `InputAccessoryView` content by `nativeID` app-wide from ONE
 * mount, so this string — not a per-screen component — is what makes the affordance
 * appear above the keyboard on every surface.
 */
export const CRISIS_KEYBOARD_ACCESSORY_NATIVE_ID = 'crisis-keyboard-accessory';

/** testID for the accessory's own 988 control. */
export const CRISIS_KEYBOARD_ACCESSORY_TEST_ID = 'crisis-keyboard-accessory-button';

/** testID for the accessory container — asserted by the device-only Maestro flow. */
export const CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID = 'crisis-keyboard-accessory';

/**
 * Props every `TextInput` must spread to reach the crisis accessory.
 *
 * iOS-only by construction. `InputAccessoryView` has no Android equivalent, and Android
 * does not need one: `windowSoftInputMode=adjustResize` shrinks the window when the IME
 * opens, so the root crisis button is repositioned above the keyboard for free. Returning
 * `{}` there is the correct answer, not a gap — passing `inputAccessoryViewID` on Android
 * would only produce a console warning for a view that can never render.
 */
export function crisisAccessoryProps(): { inputAccessoryViewID?: string } {
  return Platform.OS === 'ios'
    ? { inputAccessoryViewID: CRISIS_KEYBOARD_ACCESSORY_NATIVE_ID }
    : {};
}
