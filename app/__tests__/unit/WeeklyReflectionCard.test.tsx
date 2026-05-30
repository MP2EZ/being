/**
 * WeeklyReflectionCard tests (FEAT-194)
 *
 * Covers the render-gating + composer round-trip integration.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import WeeklyReflectionCard from '@/features/insights/components/WeeklyReflectionCard';
import {
  useStoicPracticeStore,
  CheckInType,
} from '@/features/practices/stores/stoicPracticeStore';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const todayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const seedCheckIns = (count: number): void => {
  const completions = Array.from({ length: count }).map((_, i) => ({
    type: (i % 2 === 0 ? 'morning' : 'evening') as CheckInType,
    completedAt: new Date(),
    date: todayString(),
  }));
  useStoicPracticeStore.setState({ checkInCompletions: completions });
};

describe('WeeklyReflectionCard', () => {
  beforeEach(async () => {
    await useStoicPracticeStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('renders nothing when fewer than 4 check-ins this week', () => {
    seedCheckIns(3);
    const { queryByTestId } = render(<WeeklyReflectionCard />);
    expect(queryByTestId('weekly-reflection-card')).toBeNull();
  });

  it('renders the prompt when there are at least 4 check-ins and no saved reflection', () => {
    seedCheckIns(4);
    const { getByTestId, getByText } = render(<WeeklyReflectionCard />);

    expect(getByTestId('weekly-reflection-card')).toBeTruthy();
    expect(getByText('What did this week teach you?')).toBeTruthy();
    expect(getByText(/For deepening, not catching up/)).toBeTruthy();
  });

  it('renders the saved text with an Edit affordance when a reflection exists', async () => {
    seedCheckIns(4);
    await useStoicPracticeStore.getState().addWeeklyReflection('I noticed less reactivity.');

    const { getByText, getByTestId, queryByTestId } = render(<WeeklyReflectionCard />);

    expect(getByText('I noticed less reactivity.')).toBeTruthy();
    expect(getByTestId('weekly-reflection-edit')).toBeTruthy();
    expect(queryByTestId('weekly-reflection-prompt')).toBeNull();
  });

  it('saves a new reflection through the composer round-trip', async () => {
    seedCheckIns(4);
    const { getByTestId } = render(<WeeklyReflectionCard />);

    fireEvent.press(getByTestId('weekly-reflection-prompt'));

    const input = getByTestId('weekly-reflection-input');
    fireEvent.changeText(input, 'Something I noticed.');

    await act(async () => {
      fireEvent.press(getByTestId('weekly-reflection-save'));
    });

    const reflections = useStoicPracticeStore.getState().weeklyReflections;
    expect(reflections).toHaveLength(1);
    expect(reflections[0]?.text).toBe('Something I noticed.');
  });
});
