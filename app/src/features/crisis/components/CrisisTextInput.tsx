/**
 * A `TextInput` and its own crisis keyboard accessory, from one mount (DEBUG-506).
 *
 * WHY THIS EXISTS. DEBUG-450 wired all seven text surfaces to ONE `InputAccessoryView`
 * mounted at app root, on the recorded belief that "RN registers accessory content by
 * nativeID app-wide from ONE mount". That belief is false on Fabric and the control was
 * inert for its entire shipped life. `RCTInputAccessoryComponentView.mm:66-82` attaches
 * only inside `didMoveToWindow`, via a one-shot depth-first search of the window for a
 * `TextInput` carrying the id; from a root mount that search runs at app launch, finds
 * nothing, and can never re-run because the root view never changes windows.
 *
 * WHY A COMPONENT RATHER THAN A CONVENTION. Co-locating the accessory next to each input
 * is RN's own documented shape, but a sibling with an INDEPENDENT lifecycle is not enough
 * here: `RCTTextInputComponentView.mm:377-390` (`prepareForRecycle`) nils the input's own
 * `inputAccessoryViewID` AND its `inputAccessoryView`. So an input that unmounts and
 * remounts under a still-mounted accessory leaves that accessory holding a dead `__weak`
 * reference with nothing to re-attach it. Both of this app's most crisis-relevant surfaces
 * do exactly that — `VoiceReflectionScreen` unmounts the transcript input on
 * `setPhase('saved'|'idle')`, and `DailyLoopStepScreen` mounts and unmounts fields as the
 * beat changes. Sharing ONE mount lifecycle is what makes the binding survive, and it is
 * not something a JSX-ordering rule can express.
 *
 * WHY THE ID IS PER-INSTANCE. `RCTFindTextInputWithNativeId` returns the FIRST depth-first
 * match in the window. `DailyLoopStepScreen` renders up to three concurrent inputs, so a
 * shared id leaves two of three with no crisis affordance while looking perfectly wired at
 * every call site. There is deliberately no way for a caller to supply or read the id.
 *
 * WHAT CALL SITES KEEP. Everything. Props and refs pass straight through to the inner
 * `TextInput`, because all seven sites set their own `accessibilityLabel` / `testID` and a
 * wrapper that swallowed them would ship seven surfaces of unlabelled inputs — a larger
 * WCAG 4.1.2 failure than the one this fix closes. The component owns exactly one prop:
 * the accessory id.
 */

import React, { forwardRef, useId } from 'react';
import { TextInput } from 'react-native';
import type { TextInputProps } from 'react-native';

import { CrisisKeyboardAccessory } from '@/features/crisis/components/CrisisKeyboardAccessory';
import {
  CRISIS_KEYBOARD_ACCESSORY_ID_PREFIX,
  crisisAccessoryProps,
} from '@/features/crisis/constants/crisisInputAccessory';

/**
 * `inputAccessoryViewID` is owned by this component, so a call site cannot set it — that
 * is the door back to the shared-id collision, and it is closed at the type level.
 */
export type CrisisTextInputProps = Omit<TextInputProps, 'inputAccessoryViewID'>;

export const CrisisTextInput = forwardRef<TextInput, CrisisTextInputProps>(
  function CrisisTextInput(props, ref) {
    // Stable for the life of the instance and unique across instances. `useId` is React's
    // own identity, so it survives re-render and cannot collide with a sibling; the
    // non-alphanumerics it embeds are stripped because the value crosses into an NSString
    // compared by the native search.
    const instanceId = `${CRISIS_KEYBOARD_ACCESSORY_ID_PREFIX}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
      <>
        <TextInput ref={ref} {...props} {...crisisAccessoryProps(instanceId)} />
        {/* Second, deliberately. Fabric applies Update-then-Insert and inserts children in
            index order, so the input is already in the window when the accessory's
            `didMoveToWindow` runs its search. Ordering is not left to a call site. */}
        <CrisisKeyboardAccessory nativeID={instanceId} />
      </>
    );
  },
);

export default CrisisTextInput;
