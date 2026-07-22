/**
 * DailyLoopDepthSelectScreen — FEAT-301 render + a11y + neutrality tests.
 *
 * Pins the non-negotiables: two EQUAL always-available choices (no pre-selection /
 * badge / lock / "recommended"), WCAG-AA button roles + labels + hints on both, and
 * that selecting either fires onSelect with the right depth.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DailyLoopDepthSelectScreen from '../screens/DailyLoopDepthSelectScreen';
import { DEPTH_LABELS } from '../config/tenseMode';

describe('DailyLoopDepthSelectScreen (FEAT-301)', () => {
  it('renders both depth choices as accessible buttons with label + hint', () => {
    const { getByTestId } = render(<DailyLoopDepthSelectScreen onSelect={jest.fn()} />);

    for (const depth of ['quick', 'deep'] as const) {
      const card = getByTestId(`daily-loop-depth-${depth}`);
      expect(card.props.accessibilityRole).toBe('button');
      expect(card.props.accessibilityLabel).toContain(DEPTH_LABELS[depth].label);
      expect(card.props.accessibilityHint).toBe(DEPTH_LABELS[depth].blurb);
      // Neutral: neither card is pre-selected / disabled / weighted.
      expect(card.props.accessibilityState?.selected).toBeFalsy();
      expect(card.props.accessibilityState?.disabled).toBeFalsy();
    }
  });

  it('fires onSelect("quick") when the quick card is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<DailyLoopDepthSelectScreen onSelect={onSelect} />);
    fireEvent.press(getByTestId('daily-loop-depth-quick'));
    expect(onSelect).toHaveBeenCalledWith('quick');
  });

  it('fires onSelect("deep") when the deep card is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(<DailyLoopDepthSelectScreen onSelect={onSelect} />);
    fireEvent.press(getByTestId('daily-loop-depth-deep'));
    expect(onSelect).toHaveBeenCalledWith('deep');
  });

  it('frames both variants as complete (no lock/badge/"recommended" wording)', () => {
    const { getByText, queryByText } = render(<DailyLoopDepthSelectScreen onSelect={jest.fn()} />);
    expect(getByText(/both are complete practices/i)).toBeTruthy();
    expect(queryByText(/recommended|locked|unlock|premium/i)).toBeNull();
  });
});
