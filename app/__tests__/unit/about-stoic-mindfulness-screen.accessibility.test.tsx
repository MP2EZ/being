/**
 * about-stoic-mindfulness-screen.accessibility.test.tsx — FEAT-211 (FEAT-203 Slice 3).
 *
 * The audit's §5.3 a11y improvement: on extraction, the in-content section titles
 * (previously plain Text with no role) gain `accessibilityRole="header"` /
 * `accessibilityLevel={2}` so screen readers expose the article's structure under
 * the screen's level-1 heading. Verifies all four section headers carry the role
 * and level.
 *
 * FEAT-212: the back affordance is now the native stack header (ProfileStackNavigator),
 * so the in-content close-button label test was removed.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import AboutStoicMindfulnessScreen from '@/features/profile/screens/AboutStoicMindfulnessScreen';

describe('AboutStoicMindfulnessScreen — accessibility (FEAT-211)', () => {
  it('exposes all four section titles as level-2 headers', () => {
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
