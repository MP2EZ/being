/**
 * GuidanceSuppressionNotice — accessibility contract (MAINT-745, TEST-67).
 *
 * The notice is the only hand-off control a suppressed reader is given, so its
 * spoken surface is pinned as tightly as its visible one. Siting: the
 * `.accessibility.test.tsx` suffix is what `test:accessibility` matches on.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import GuidanceSuppressionNotice from '../GuidanceSuppressionNotice';
import { TOUCH_TARGETS } from '@/core/theme/accessibility';

const VISIBLE_ACTION = 'See support options';

describe('GuidanceSuppressionNotice — accessibility', () => {
  it('announces its heading as a header', () => {
    const { getByText } = render(<GuidanceSuppressionNotice onOpenCrisisResources={jest.fn()} />);
    expect(getByText("Let's start somewhere else").props.accessibilityRole).toBe('header');
  });

  it('exposes the hand-off as a button whose spoken label contains the visible text (WCAG 2.5.3)', () => {
    const { getByTestId, getByText } = render(
      <GuidanceSuppressionNotice onOpenCrisisResources={jest.fn()} />,
    );
    const action = getByTestId('guidance-open-crisis-resources');
    expect(action.props.accessibilityRole).toBe('button');
    expect(getByText(VISIBLE_ACTION)).toBeTruthy();
    expect(action.props.accessibilityLabel).toContain(VISIBLE_ACTION);
    expect(action.props.accessibilityHint).toBe('Shows crisis lines and immediate support options');
  });

  it('calls onOpenCrisisResources when pressed', () => {
    const onOpen = jest.fn();
    const { getByTestId } = render(<GuidanceSuppressionNotice onOpenCrisisResources={onOpen} />);
    fireEvent.press(getByTestId('guidance-open-crisis-resources'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('meets the minimum touch target', () => {
    const { getByTestId } = render(<GuidanceSuppressionNotice onOpenCrisisResources={jest.fn()} />);
    const style = StyleSheet.flatten(getByTestId('guidance-open-crisis-resources').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
  });

  it('names no score, threshold or count anywhere it is read or spoken', () => {
    const { getByTestId, UNSAFE_root } = render(
      <GuidanceSuppressionNotice onOpenCrisisResources={jest.fn()} />,
    );
    const texts = UNSAFE_root.findAll((n) => typeof n.type === 'string' && n.type === 'Text').flatMap(
      (n) => [n.props.children].flat().filter((c): c is string => typeof c === 'string'),
    );
    expect(texts.length).toBeGreaterThan(0);
    const action = getByTestId('guidance-open-crisis-resources');
    const spoken = [action.props.accessibilityLabel, action.props.accessibilityHint];
    for (const copy of [...texts, ...spoken]) expect(copy).not.toMatch(/\d/);
  });
});
