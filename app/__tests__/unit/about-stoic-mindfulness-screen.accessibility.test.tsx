/**
 * about-stoic-mindfulness-screen.accessibility.test.tsx — FEAT-211 (FEAT-203 Slice 3).
 *
 * The audit's §5.3 a11y improvement: on extraction, the in-content section titles
 * (previously plain Text with no role) gain `accessibilityRole="header"` /
 * `accessibilityLevel={2}` so screen readers expose the article's structure under
 * the screen's level-1 heading. Verifies all four section headers carry the role
 * and level, and that the close affordance is properly labelled.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import AboutStoicMindfulnessScreen from '@/features/profile/screens/AboutStoicMindfulnessScreen';

describe('AboutStoicMindfulnessScreen — accessibility (FEAT-211)', () => {
  it('exposes all four section titles as level-2 headers', () => {
    const { getAllByRole } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    const headers = getAllByRole('header');
    expect(headers).toHaveLength(4);
    headers.forEach((header) => {
      expect(header.props.accessibilityLevel).toBe(2);
    });
  });

  it('labels each section header for screen readers', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    ['What is Stoic Mindfulness?', 'The Five Principles', 'Developmental Stages', 'Philosophical Foundations'].forEach((title) => {
      const node = getByText(title);
      expect(node.props.accessibilityRole).toBe('header');
      expect(node.props.accessibilityLevel).toBe(2);
    });
  });

  it('gives the close button an accessible label and hint', () => {
    const { getByLabelText } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    const closeButton = getByLabelText('Close About Stoic Mindfulness');
    expect(closeButton.props.accessibilityRole).toBe('button');
    expect(closeButton.props.accessibilityHint).toBe('Returns to profile menu');
  });
});
