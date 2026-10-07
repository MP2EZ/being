/**
 * RadioGroup — the PHQ-9 / GAD-7 answer control (MAINT-750, audit TEST-36).
 *
 * THE DEFECT. handleKeyDown's useCallback listed [disabled, options, showScores] and called
 * handleOptionSelect without depending on it, so it kept the FIRST render's onValueChange.
 * EnhancedAssessmentFlow renders one un-keyed EnhancedAssessmentQuestion for all nine
 * questions, and RESPONSE_OPTIONS is module-scope, so none of those deps ever changes: a
 * keyboard answer to Q9 would have run question 1's handler and been recorded as phq9_1.
 *
 * Why the cases RERENDER the same instance, never remount: a remount builds fresh callbacks
 * and hides the bug.
 *
 * Scope of the evidence: the keyboard path is reachable only here. RN 0.85 emits onKeyPress
 * only from a TextInput, so a Pressable never receives it on iOS or Android, and RN's space
 * key is ' ' — not 'Space', the literal the handler matches. A green file is NOT evidence
 * that keyboard or switch answering works on device; real answering goes through onPress,
 * which is pinned here too.
 */

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import RadioGroup, { type RadioOption } from '../RadioGroup';

const announce = AccessibilityInfo.announceForAccessibility as jest.Mock;

const OPTIONS: RadioOption[] = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

const key = (k: string) => ({ nativeEvent: { key: k }, preventDefault: jest.fn() });
const option = (utils: ReturnType<typeof render>, value: number) =>
  utils.getByTestId(`q-option-${value}`);

function mount(props: Partial<React.ComponentProps<typeof RadioGroup>> = {}) {
  const base = {
    options: OPTIONS,
    value: undefined,
    onValueChange: jest.fn(),
    label: 'Question',
    testID: 'q',
    clinicalContext: 'phq9' as const,
  };
  const utils = render(<RadioGroup {...base} {...props} />);
  const rerender = (next: Partial<React.ComponentProps<typeof RadioGroup>>) =>
    utils.rerender(<RadioGroup {...base} {...props} {...next} />);
  return { ...utils, rerender };
}

beforeEach(() => {
  announce.mockClear();
});

describe('the current onValueChange is always the one called', () => {
  it.each(['Space', 'Enter'])('%s after a rerender calls the NEW handler, never the old', (k) => {
    const first = jest.fn();
    const second = jest.fn();
    const utils = mount({ onValueChange: first });
    utils.rerender({ onValueChange: second });

    fireEvent(option(utils, 1), 'keyPress', key(k));

    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('a press after a rerender calls the NEW handler (the production path)', () => {
    const first = jest.fn();
    const second = jest.fn();
    const utils = mount({ onValueChange: first });
    utils.rerender({ onValueChange: second });

    fireEvent.press(option(utils, 3));

    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(3);
    expect(first).not.toHaveBeenCalled();
  });
});

describe('keyboard navigation', () => {
  it('ArrowDown moves to the next option and announces its label', () => {
    const utils = mount();
    fireEvent(option(utils, 0), 'keyPress', key('ArrowDown'));
    expect(announce).toHaveBeenLastCalledWith('Several days');
  });

  it('ArrowDown wraps from the last option to the first', () => {
    const utils = mount();
    fireEvent(option(utils, 3), 'keyPress', key('ArrowDown'));
    expect(announce).toHaveBeenLastCalledWith('Not at all');
  });

  it('ArrowUp wraps from the first option to the last', () => {
    const utils = mount();
    fireEvent(option(utils, 0), 'keyPress', key('ArrowUp'));
    expect(announce).toHaveBeenLastCalledWith('Nearly every day');
  });

  it('includes the score in the announcement when scores are shown', () => {
    const utils = mount({ showScores: true });
    fireEvent(option(utils, 0), 'keyPress', key('ArrowDown'));
    expect(announce).toHaveBeenLastCalledWith('Several days, score 1');
  });

  it('skips a disabled option and lands on the third', () => {
    const options = OPTIONS.map((o) => (o.value === 1 ? { ...o, disabled: true } : o));
    const utils = mount({ options });
    fireEvent(option(utils, 0), 'keyPress', key('ArrowDown'));
    expect(announce).toHaveBeenLastCalledWith('More than half the days');
    expect(announce).not.toHaveBeenCalledWith('Several days');
  });

  it('Enter on a non-first option selects that option', () => {
    const onValueChange = jest.fn();
    const utils = mount({ onValueChange });
    fireEvent(option(utils, 2), 'keyPress', key('Enter'));
    expect(onValueChange).toHaveBeenCalledWith(2);
  });

  it('a disabled group ignores every key — no selection, no announcement', () => {
    const onValueChange = jest.fn();
    const utils = mount({ onValueChange, disabled: true });
    // A disabled Pressable swallows events, so drive its handler directly: the group's own
    // guard is what is under test.
    const target = option(utils, 1);
    for (const k of ['ArrowDown', 'ArrowUp', 'Space', 'Enter']) {
      fireEvent(target, 'keyPress', key(k));
      target.props.onKeyPress?.(key(k));
    }
    expect(onValueChange).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it('when every option is disabled, arrows go nowhere and nothing is announced', () => {
    const options = OPTIONS.map((o) => ({ ...o, disabled: true }));
    const utils = mount({ options });
    const target = option(utils, 0);
    target.props.onKeyPress?.(key('ArrowDown'));
    target.props.onKeyPress?.(key('Space'));
    expect(announce).not.toHaveBeenCalled();
  });
});
