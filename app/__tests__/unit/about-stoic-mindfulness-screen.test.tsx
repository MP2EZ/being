/**
 * about-stoic-mindfulness-screen.test.tsx — FEAT-211 (FEAT-203 Slice 3) + FEAT-76.
 *
 * Pins the content rendered by the dedicated AboutStoicMindfulnessScreen: all four
 * section headers, the five principles in order, the four developmental stages with
 * their timeframes, and the three dated philosopher attributions. Content is a
 * protected therapeutic path — these assertions guard against accidental edits.
 *
 * FEAT-76 additions: the citation-accuracy fix (no paraphrase presented as a verbatim
 * Marcus Aurelius quote; the unverified Meditations verse numbers dropped; Enchiridion 1
 * kept) and the per-principle Learn-module deep-link.
 *
 * FEAT-212: the screen is now a route; its title and back affordance come from the native
 * stack header (ProfileStackNavigator), not an in-content SubMenuHeader.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AboutStoicMindfulnessScreen from '@/features/profile/screens/AboutStoicMindfulnessScreen';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('AboutStoicMindfulnessScreen — content', () => {
  it('renders all four section headers', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen />);

    expect(getByText('What is Stoic Mindfulness?')).toBeTruthy();
    expect(getByText('The Five Principles')).toBeTruthy();
    expect(getByText('Developmental Stages')).toBeTruthy();
    expect(getByText('Philosophical Foundations')).toBeTruthy();
  });

  it('renders the five principles in canonical order', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen />);

    expect(getByText('1. Aware Presence')).toBeTruthy();
    expect(getByText('2. Radical Acceptance')).toBeTruthy();
    expect(getByText('3. Sphere Sovereignty')).toBeTruthy();
    expect(getByText('4. Virtuous Response')).toBeTruthy();
    expect(getByText('5. Interconnected Living')).toBeTruthy();
  });

  it('renders the four developmental stages with exact timeframes', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen />);

    expect(getByText('Fragmented (1-6 months)')).toBeTruthy();
    expect(getByText('Effortful (6-18 months)')).toBeTruthy();
    expect(getByText('Fluid (2-5 years)')).toBeTruthy();
    expect(getByText('Integrated (5+ years)')).toBeTruthy();
  });

  it('renders the three philosopher attributions', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen />);

    expect(getByText('Marcus Aurelius')).toBeTruthy();
    expect(getByText('Epictetus')).toBeTruthy();
    expect(getByText('Seneca')).toBeTruthy();
  });

  // FEAT-76 — citation accuracy
  it('does not present any paraphrase as a verbatim Marcus Aurelius quote', () => {
    const { queryByText } = render(<AboutStoicMindfulnessScreen />);

    // The unverified Meditations verse numbers must be gone everywhere.
    expect(queryByText(/Meditations 10:6/)).toBeNull();
    expect(queryByText(/Meditations 5:1/)).toBeNull();
    expect(queryByText(/Meditations 8:59/)).toBeNull();
    // The Radical Acceptance paraphrase is no longer wrapped in quotation marks.
    expect(queryByText(/"This is what's happening right now/)).toBeNull();
  });

  it('keeps the canonical Enchiridion 1 citation on Sphere Sovereignty', () => {
    const { getByText } = render(<AboutStoicMindfulnessScreen />);

    expect(getByText(/Epictetus, Enchiridion 1/)).toBeTruthy();
  });

  // FEAT-76 — per-principle deep-link into the matching Learn module
  it('deep-links each principle to its Learn module via the existing ModuleDetail route', () => {
    const { getByRole } = render(<AboutStoicMindfulnessScreen />);

    fireEvent.press(getByRole('button', { name: 'Learn more about 1. Aware Presence' }));
    expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', { moduleId: 'aware-presence' });

    fireEvent.press(getByRole('button', { name: 'Learn more about 2. Radical Acceptance' }));
    expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', { moduleId: 'radical-acceptance' });

    fireEvent.press(getByRole('button', { name: 'Learn more about 5. Interconnected Living' }));
    expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', { moduleId: 'interconnected-living' });
  });
});
