/**
 * about-stoic-mindfulness-screen.accessibility.test.tsx — FEAT-211 (FEAT-203 Slice 3) + FEAT-76.
 *
 * The audit's §5.3 a11y improvement: the in-content section titles carry
 * `accessibilityRole="header"` / `accessibilityLevel={2}` so screen readers expose the
 * article's structure under the screen's level-1 heading. Verifies all four section
 * headers carry the role and level.
 *
 * FEAT-76 invariant: the principle/stage cards are now progressive-disclosure accordions,
 * but their toggles are buttons — there must STILL be exactly four header nodes (the four
 * document sections), not one-per-card.
 *
 * FEAT-212: the back affordance is the native stack header (ProfileStackNavigator).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import AboutStoicMindfulnessScreen from '@/features/profile/screens/AboutStoicMindfulnessScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('AboutStoicMindfulnessScreen — accessibility (FEAT-211 / FEAT-76)', () => {
  it('exposes exactly the four section titles as level-2 headers', () => {
    const { getAllByRole } = render(<AboutStoicMindfulnessScreen />);

    const headers = getAllByRole('header');
    expect(headers).toHaveLength(4);
    headers.forEach((header) => {
      expect(header.props.accessibilityLevel).toBe(2);
    });
  });

  it('labels each section header for screen readers', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen />);

    ['What is Stoic Mindfulness?', 'The Five Principles', 'Developmental Stages', 'Philosophical Foundations'].forEach((title) => {
      const node = getByText(title);
      expect(node.props.accessibilityRole).toBe('header');
      expect(node.props.accessibilityLevel).toBe(2);
    });
  });
});
