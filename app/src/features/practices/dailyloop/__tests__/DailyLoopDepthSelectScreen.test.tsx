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

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

import { useWindowDimensions } from 'react-native';
import { DEPTH_PICKER_COPY } from '../config/tenseMode';

/** Render at a given Dynamic Type scale. 1 = default; 3.1 ≈ iOS AX5. */
const renderAtScale = (fontScale: number) => {
  (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
    width: 375, height: 667, scale: 2, fontScale,
  });
  return render(<DailyLoopDepthSelectScreen onSelect={jest.fn()} />);
};

describe('DailyLoopDepthSelectScreen — DEBUG-469: reachable at accessibility text sizes', () => {
  afterEach(() => {
    (useWindowDimensions as unknown as jest.Mock).mockReturnValue({
      width: 375, height: 812, scale: 2, fontScale: 1,
    });
  });

  it('shows the FEAT-301 guarantee at DEFAULT type', () => {
    const { getByText } = renderAtScale(1);
    expect(getByText(DEPTH_PICKER_COPY.guarantee)).toBeTruthy();
  });

  it('still shows the guarantee at AX5 — it is never conditionally hidden', () => {
    // It is pinned WITH the controls precisely so a user at AX5 cannot reach the moment of
    // choosing without it. The last element that may ever be dropped, never the first.
    const { getByText } = renderAtScale(3.1);
    expect(getByText(DEPTH_PICKER_COPY.guarantee)).toBeTruthy();
  });

  it('RELOCATES both blurbs at AX5 rather than deleting them', () => {
    // The rejected candidate hid the blurbs and left accessibilityHint to carry them. The
    // AX5 cohort is overwhelmingly low-vision SIGHTED users, who are precisely the users
    // NOT running VoiceOver — and Speak Hints is user-disablable even for those who are.
    // So the strings must still be VISIBLE somewhere, verbatim.
    const { getByText } = renderAtScale(3.1);
    for (const depth of ['quick', 'deep'] as const) {
      expect(getByText(new RegExp(escapeRe(DEPTH_LABELS[depth].blurb)))).toBeTruthy();
    }
  });

  it('keeps both blurbs on their cards at default type', () => {
    const { getByText } = renderAtScale(1);
    for (const depth of ['quick', 'deep'] as const) {
      expect(getByText(DEPTH_LABELS[depth].blurb)).toBeTruthy();
    }
  });

  it('relocates BOTH blurbs at the same scale, never one before the other', () => {
    // A per-depth or height-derived threshold would drop the two at different scales,
    // because the blurbs differ in length — asymmetric cost is ranking through a layout
    // back door (FEAT-301).
    const onCards = (scale: number) => {
      const { queryByText } = renderAtScale(scale);
      return (['quick', 'deep'] as const).map(d => queryByText(DEPTH_LABELS[d].blurb) !== null);
    };
    for (const scale of [1, 1.2, 1.59, 1.6, 2.5, 3.1]) {
      const [q, d] = onCards(scale);
      expect(q).toBe(d);
    }
  });

  it('keeps accessibilityHint on both cards in BOTH states — a supplement, not the carrier', () => {
    for (const scale of [1, 3.1]) {
      const { getByTestId } = renderAtScale(scale);
      for (const depth of ['quick', 'deep'] as const) {
        expect(getByTestId(`daily-loop-depth-${depth}`).props.accessibilityHint)
          .toBe(DEPTH_LABELS[depth].blurb);
      }
    }
  });
});

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
