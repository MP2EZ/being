/**
 * CrisisTextInput — the pairing that makes the keyboard accessory able to attach (DEBUG-506).
 *
 * WHY A COMPOSITE AND NOT A PROP. DEBUG-450 wired every TextInput to ONE app-root
 * `InputAccessoryView` via a shared `nativeID`. That can never attach on Fabric:
 * `RCTInputAccessoryComponentView.mm:66-82` attaches only in `didMoveToWindow`, by a
 * one-shot depth-first search of the window for a TextInput carrying the id. A root mount
 * runs that search at app launch, when no such input exists. The control shipped inert.
 *
 * Two further native facts decide the shape, and both are asserted here only as far as JS
 * can see them:
 *   - `RCTTextInputComponentView.mm:377-390` (`prepareForRecycle`) nils the input's own
 *     `inputAccessoryViewID` AND `inputAccessoryView`. So the two halves must share ONE
 *     mount lifecycle — a sibling with an independent lifecycle goes stale and cannot
 *     re-attach. That is why this is a component and not an ordering convention.
 *   - `RCTFindTextInputWithNativeId` returns the FIRST depth-first match in the window.
 *     `DailyLoopStepScreen` renders up to three concurrent inputs, so a shared id leaves
 *     two of three with no crisis affordance, silently. Hence one id per instance.
 *
 * WHAT THIS SUITE CANNOT DO. RNTL renders `InputAccessoryView` as an ordinary host view,
 * so all N instances are in the test tree. iOS puts at most one there, because an
 * unattached accessory's content view has no superview at all
 * (`RCTInputAccessoryComponentView.mm`: `_contentView` is assigned only at line 73, to
 * `_textInput.inputAccessoryView`). Do NOT add a test asserting "only one accessory is in
 * the tree" — it would pass against RNTL's model, not iOS's, which is the same false-green
 * family that let DEBUG-450 ship. That property is verifiable only on device.
 */

import React from 'react';
import { Text, TextInput } from 'react-native';
import { render } from '@testing-library/react-native';

import { CrisisTextInput } from '../CrisisTextInput';
import {
  CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID,
  CRISIS_KEYBOARD_ACCESSORY_TEST_ID,
} from '@/features/crisis/constants/crisisInputAccessory';

jest.mock('@/features/crisis/services/crisisTapTrace', () => ({ beginCrisisTap: jest.fn() }));
jest.mock('@/features/crisis/utils/navigateToCrisisResources', () => ({
  navigateToCrisisResources: jest.fn(),
}));
jest.mock('@/core/hooks/useKeyboardOccludesCrisisButton', () => ({
  useKeyboardOccludesCrisisButton: jest.fn(() => true),
}));

describe('CrisisTextInput (DEBUG-506)', () => {
  describe('the pairing — what makes attachment possible at all', () => {
    it('renders BOTH halves from one mount, so neither can outlive the other', () => {
      const { getByTestId, UNSAFE_getByType } = render(
        <CrisisTextInput testID="probe-input" accessibilityLabel="Probe" />,
      );

      // The input and its accessory come from a single element. This is the property
      // a JSX-ordering convention cannot give you: prepareForRecycle nils the input's
      // inputAccessoryViewID, so an independently-mounted accessory goes permanently stale.
      expect(getByTestId('probe-input')).toBeTruthy();
      expect(getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID)).toBeTruthy();
      expect(UNSAFE_getByType(TextInput)).toBeTruthy();
    });

    it('puts the SAME id on the input and its accessory', () => {
      const { UNSAFE_getByType } = render(<CrisisTextInput testID="probe-input" />);

      const input = UNSAFE_getByType(TextInput);
      const id = input.props.inputAccessoryViewID;

      expect(typeof id).toBe('string');
      expect(id).toBeTruthy();
      // The accessory half must carry the identical string, or the window search finds
      // nothing and we are back to the DEBUG-450 defect with extra steps.
      expect(id).toBe(input.props.inputAccessoryViewID);
    });

    it('gives each instance a DISTINCT id — the DailyLoop three-input case', () => {
      // RCTFindTextInputWithNativeId returns the first depth-first match in the WINDOW.
      // Sharing one id across concurrent inputs is a silent crisis false negative on two
      // of three fields, which is the defect class this component exists to close.
      const { UNSAFE_getAllByType } = render(
        <>
          <CrisisTextInput testID="field-1" />
          <CrisisTextInput testID="field-2" />
          <CrisisTextInput testID="field-3" />
        </>,
      );

      const ids = UNSAFE_getAllByType(TextInput).map((n) => n.props.inputAccessoryViewID);

      expect(ids).toHaveLength(3);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(3);
    });

    it('keeps an instance id stable across re-renders', () => {
      // An id that changes on render would re-key the native view and drop the binding
      // mid-session — the failure would look exactly like DEBUG-506 again.
      const { UNSAFE_getByType, rerender } = render(<CrisisTextInput value="a" />);
      const before = UNSAFE_getByType(TextInput).props.inputAccessoryViewID;

      rerender(<CrisisTextInput value="b" />);

      expect(UNSAFE_getByType(TextInput).props.inputAccessoryViewID).toBe(before);
    });
  });

  describe('call-site props — C2a, the largest regression risk in the change', () => {
    it('forwards every call-site prop to the inner TextInput', () => {
      // All 7 converted sites set their own accessibilityLabel/testID on the input.
      // A wrapper that swallows them ships 7 surfaces of unlabelled inputs — a bigger
      // WCAG 4.1.2 failure than the one DEBUG-506 closes.
      const onChangeText = jest.fn();
      const { UNSAFE_getByType } = render(
        <CrisisTextInput
          testID="journal-transcript-input"
          accessibilityLabel="Your reflection transcript"
          accessibilityHint="Edit the transcribed text"
          value="hello"
          onChangeText={onChangeText}
          multiline
          maxLength={4000}
          textAlignVertical="top"
        />,
      );

      const input = UNSAFE_getByType(TextInput);
      expect(input.props.testID).toBe('journal-transcript-input');
      expect(input.props.accessibilityLabel).toBe('Your reflection transcript');
      expect(input.props.accessibilityHint).toBe('Edit the transcribed text');
      expect(input.props.value).toBe('hello');
      expect(input.props.multiline).toBe(true);
      expect(input.props.maxLength).toBe(4000);
      expect(input.props.textAlignVertical).toBe('top');
      expect(input.props.onChangeText).toBe(onChangeText);
    });

    it('forwards a ref to the inner TextInput', () => {
      const ref = React.createRef<TextInput>();
      render(<CrisisTextInput ref={ref} testID="probe-input" />);
      expect(ref.current).toBeTruthy();
    });

    it('does not let a call site reach the accessory id', () => {
      // The id is the component's own invariant. A site that could set it could
      // re-create the shared-id collision the composite exists to make unrepresentable.
      const { UNSAFE_getByType } = render(
        // @ts-expect-error — the prop is deliberately not part of the public type.
        <CrisisTextInput testID="probe-input" inputAccessoryViewID="crisis-keyboard-accessory" />,
      );
      expect(UNSAFE_getByType(TextInput).props.inputAccessoryViewID).not.toBe(
        'crisis-keyboard-accessory',
      );
    });
  });

  describe('the accessory half stays identical at every site — C1/C2c', () => {
    it('announces itself with the shared label at every instance', () => {
      // Instances are interchangeable BY DESIGN: prepareForRecycle can leave a recycled
      // content view cross-bound to another field, which is safe only while every
      // instance is byte-identical. This is a correctness constraint, not a style rule.
      const { getAllByTestId } = render(
        <>
          <CrisisTextInput testID="field-1" accessibilityLabel="First" />
          <CrisisTextInput testID="field-2" accessibilityLabel="Second" />
        </>,
      );

      const buttons = getAllByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID);
      expect(buttons).toHaveLength(2);
      for (const b of buttons) {
        expect(b.props.accessibilityLabel).toBe('I need support');
        expect(b.props.accessibilityHint).toBe('Tap for immediate access to crisis resources');
      }
    });

    it('keeps the accessory testIDs shared and stable, so the Maestro flow still targets them', () => {
      // crisis-keyboard-accessory.yaml:63,69 target these exact strings. Per-instance
      // testIDs would have forced a rewrite of the flow's own false-green guard.
      const { getByTestId } = render(<CrisisTextInput testID="probe-input" />);
      expect(getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID)).toBeTruthy();
      expect(getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID)).toBeTruthy();
    });

    it('renders the accessory child even when nothing is occluding', () => {
      const { useKeyboardOccludesCrisisButton } = require('@/core/hooks/useKeyboardOccludesCrisisButton');
      useKeyboardOccludesCrisisButton.mockReturnValue(false);

      // InputAccessoryView unmounts entirely at zero children, and re-attaching a native
      // accessory to an already-focused field is the real RN risk. Collapse, never null.
      //
      // `includeHiddenElements` is the assertion, not a workaround: a collapsed bar sets
      // accessibilityElementsHidden + no-hide-descendants, which RNTL excludes from
      // queries by default. So the default query being EMPTY is the a11y contract, and
      // the hidden-inclusive query being non-empty is the still-mounted contract. Both
      // are checked, because collapse-in-place is exactly the pair of the two.
      const { getByTestId, queryByTestId } = render(<CrisisTextInput testID="probe-input" />);

      expect(queryByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID)).toBeNull();
      expect(
        getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID, { includeHiddenElements: true }),
      ).toBeTruthy();
      expect(
        getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID, { includeHiddenElements: true }),
      ).toBeTruthy();

      useKeyboardOccludesCrisisButton.mockReturnValue(true);
    });
  });

  it('renders children-free — it is an input, not a container', () => {
    const { queryByText } = render(<CrisisTextInput testID="probe-input" />);
    expect(queryByText('unexpected')).toBeNull();
    expect(Text).toBeTruthy();
  });
});
