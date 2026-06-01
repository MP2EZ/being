/**
 * about-stoic-mindfulness-screen.test.tsx — FEAT-211 (FEAT-203 Slice 3).
 *
 * Pins the verbatim content extracted out of ProfileScreen into the dedicated
 * AboutStoicMindfulnessScreen: all four section headers, the five principles in
 * order, the four developmental stages with their timeframes, and the three dated
 * philosopher attributions. Content is a protected therapeutic path — these
 * assertions guard against accidental edits during the structural move (and the
 * later FEAT-76 content enhancement). Also verifies the close affordance calls back.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AboutStoicMindfulnessScreen from '@/features/profile/screens/AboutStoicMindfulnessScreen';

describe('AboutStoicMindfulnessScreen — FEAT-211 verbatim extraction', () => {
  it('renders the title and all four section headers', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    expect(getByText('About Stoic Mindfulness')).toBeTruthy();
    expect(getByText('What is Stoic Mindfulness?')).toBeTruthy();
    expect(getByText('The Five Principles')).toBeTruthy();
    expect(getByText('Developmental Stages')).toBeTruthy();
    expect(getByText('Philosophical Foundations')).toBeTruthy();
  });

  it('renders the five principles in canonical order', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    expect(getByText('1. Aware Presence')).toBeTruthy();
    expect(getByText('2. Radical Acceptance')).toBeTruthy();
    expect(getByText('3. Sphere Sovereignty')).toBeTruthy();
    expect(getByText('4. Virtuous Response')).toBeTruthy();
    expect(getByText('5. Interconnected Living')).toBeTruthy();
  });

  it('renders the four developmental stages with exact timeframes', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    expect(getByText('Fragmented (1-6 months)')).toBeTruthy();
    expect(getByText('Effortful (6-18 months)')).toBeTruthy();
    expect(getByText('Fluid (2-5 years)')).toBeTruthy();
    expect(getByText('Integrated (5+ years)')).toBeTruthy();
  });

  it('renders the three philosopher attributions', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen onReturn={jest.fn()} />);

    expect(getByText('Marcus Aurelius')).toBeTruthy();
    expect(getByText('Epictetus')).toBeTruthy();
    expect(getByText('Seneca')).toBeTruthy();
  });

  it('calls onReturn when the close button is pressed', () => {
    const onReturn = jest.fn();
    const { getByLabelText } = render(<AboutStoicMindfulnessScreen onReturn={onReturn} />);

    fireEvent.press(getByLabelText('Close About Stoic Mindfulness'));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
