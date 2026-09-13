/**
 * Wiring for the keyboard-anchored crisis affordance (DEBUG-450).
 *
 * Kept separate from the component so `CrisisTextInput` pulls in ids and a one-line prop
 * spread, not the control's whole render tree. A `Platform.select` copy-pasted at seven
 * call sites is the drift `crisisButtonGeometry.ts` exists to prevent — and DEBUG-506 is
 * what happens when the wiring is centralised on a premise nobody measured.
 */

import { Platform } from 'react-native';

/**
 * Prefix for the per-instance `nativeID` that binds one `TextInput` to one accessory.
 *
 * THERE IS NO APP-WIDE ID, and there must never be one again (DEBUG-506). The removed
 * constant rested on the claim that "RN registers accessory content by nativeID app-wide
 * from ONE mount". That is false on Fabric: `RCTInputAccessoryComponentView.mm:66-82`
 * attaches in `didMoveToWindow` by a one-shot depth-first search of the window, and
 * `RCTFindTextInputWithNativeId` returns the FIRST match — so a shared id cannot serve
 * more than one input even when it attaches at all. `CrisisTextInput` appends a
 * `React.useId()` value per instance; nothing else may build one of these.
 */
export const CRISIS_KEYBOARD_ACCESSORY_ID_PREFIX = 'crisis-keyboard-accessory';

/**
 * Font scale at or above which the accessory bar sheds padding to protect its label.
 *
 * iOS accessibility content sizes begin around 1.35x; below that the bar keeps its normal
 * chrome. Capping the LABEL is refused outright — see `CrisisResourcesScreen.tsx:778-781`.
 */
export const AX_FONT_SCALE = 1.35;

/**
 * Should the accessory bar shed its own chrome to protect the label?
 *
 * The bar's height at large text sizes is label PLUS padding. Dropping padding removes
 * decoration so the label keeps its full growth — the opposite of capping the label, which
 * `CrisisResourcesScreen.tsx:778-781` refuses on a crisis affordance and which stays
 * refused here. Extracted so the trade is testable without driving `useWindowDimensions`.
 */
export function shouldShedAccessoryChrome(fontScale: number): boolean {
  return Number.isFinite(fontScale) && fontScale >= AX_FONT_SCALE;
}

/** testID for the accessory's own 988 control. */
export const CRISIS_KEYBOARD_ACCESSORY_TEST_ID = 'crisis-keyboard-accessory-button';

/** testID for the accessory container — asserted by the device-only Maestro flow. */
export const CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID = 'crisis-keyboard-accessory';

/**
 * Wires one `TextInput` to its own accessory instance.
 *
 * INTERNAL TO `CrisisTextInput`. Call sites render `CrisisTextInput` and never touch this;
 * a site that could choose its own id could re-create the shared-id collision the
 * composite exists to make unrepresentable.
 *
 * iOS-only by construction. `InputAccessoryView` has no Android equivalent, and Android
 * does not need one: `windowSoftInputMode=adjustResize` shrinks the window when the IME
 * opens, so the root crisis button is repositioned above the keyboard for free. Returning
 * `{}` there is the correct answer, not a gap — passing `inputAccessoryViewID` on Android
 * would only produce a console warning for a view that can never render.
 */
export function crisisAccessoryProps(instanceId: string): { inputAccessoryViewID?: string } {
  return Platform.OS === 'ios' ? { inputAccessoryViewID: instanceId } : {};
}
