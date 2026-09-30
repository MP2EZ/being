/**
 * Weekly reflection under the Art. 9 write gate (FEAT-667, FEAT-318 slice C).
 *
 * Founder ruling 2026-09-29: while wellness-data writes are withheld, the composer
 * says so before the input, the primary action reads "Done" rather than a "Save"
 * that saves nothing, and Done closes the sheet without adding the text to the
 * store — not even in memory, or the card would show it back as though it were
 * kept. Nothing changes for a user who allowed processing, or while consent is
 * still loading.
 *
 * The card reads the gate; the composer only receives a prop
 * (wellnessWriteConsentBoundary.test.ts pins that the composer never reads it).
 *
 * `.accessibility.` so `npm run test:accessibility` runs it: the note is plain,
 * non-interactive text read in order title → note → input.
 */

import React from 'react';
import { ScrollView } from 'react-native';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import WeeklyReflectionCard from '@/features/insights/components/WeeklyReflectionCard';
import { WITHHELD_NOTE } from '@/features/insights/components/WeeklyReflectionComposer';
import { RootOverlaySlot } from '@/core/navigation/rootOverlaySlot';
import { useStoicPracticeStore, type CheckInType } from '@/features/practices/stores/stoicPracticeStore';
import {
  seedWellnessWriteConsent,
  type SeededWellnessWriteConsent,
} from '../../../../../__tests__/helpers/wellnessWriteConsent';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const today = (): string => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};

/** Four check-ins this week, so the card renders (MIN_CHECK_INS_TO_SHOW). */
const seedCheckIns = (): void => {
  const types: CheckInType[] = ['morning', 'midday', 'evening', 'learn'];
  useStoicPracticeStore.setState({
    checkInCompletions: types.map((type) => ({ type, completedAt: new Date(), date: today() })),
    weeklyReflections: [],
  });
};

function openComposer(consent: SeededWellnessWriteConsent) {
  seedCheckIns();
  seedWellnessWriteConsent(consent);
  const screen = render(
    <>
      <WeeklyReflectionCard />
      <RootOverlaySlot />
    </>,
  );
  fireEvent.press(screen.getByTestId('weekly-reflection-prompt'));
  return screen;
}

describe.each<SeededWellnessWriteConsent>(['refused', 'revoked'])('withheld (%s)', (consent) => {
  it('shows the note between the title and the input, as plain text', () => {
    const screen = openComposer(consent);
    const note = screen.getByTestId('weekly-reflection-withheld-note');

    expect(note).toHaveTextContent(WITHHELD_NOTE);
    expect(note.props.accessibilityRole).toBeUndefined();
    expect(note.props.onPress).toBeUndefined();

    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(within(scroll).getByTestId('weekly-reflection-withheld-note')).toBeTruthy();
    const order = React.Children.toArray(scroll.props.children).map(
      (child) => (child as React.ReactElement<{ testID?: string; accessibilityRole?: string }>).props,
    );
    expect(order.map((p) => p.testID ?? p.accessibilityRole)).toEqual([
      'header',
      'weekly-reflection-withheld-note',
      'weekly-reflection-input',
    ]);
  });

  it('labels the primary action "Done", never "Save"', () => {
    const screen = openComposer(consent);
    const primary = screen.getByTestId('weekly-reflection-save');
    expect(primary.props.accessibilityLabel).toBe('Done');
    expect(within(primary).getByText('Done')).toBeTruthy();
    expect(within(primary).queryByText('Save')).toBeNull();
  });

  it('Done closes the sheet and keeps the text out of the store', async () => {
    const screen = openComposer(consent);
    fireEvent.changeText(screen.getByTestId('weekly-reflection-input'), 'not to be kept');
    await act(async () => {
      fireEvent.press(screen.getByTestId('weekly-reflection-save'));
    });

    expect(useStoicPracticeStore.getState().weeklyReflections).toEqual([]);
    expect(screen.queryByTestId('weekly-reflection-overlay')).toBeNull();
    // Back to the prompt, not an "Edit" of a reflection that does not exist.
    expect(screen.getByTestId('weekly-reflection-prompt')).toBeTruthy();
  });
});

describe.each<SeededWellnessWriteConsent>(['granted', 'loading'])('not withheld (%s)', (consent) => {
  it('renders no note and no wrapper in its place', () => {
    const screen = openComposer(consent);
    expect(screen.queryByTestId('weekly-reflection-withheld-note')).toBeNull();
    expect(screen.queryByText(WITHHELD_NOTE)).toBeNull();
    const scroll = screen.UNSAFE_getByType(ScrollView);
    expect(React.Children.toArray(scroll.props.children)).toHaveLength(2);
  });

  it('keeps "Save" and saves the reflection', async () => {
    const screen = openComposer(consent);
    const primary = screen.getByTestId('weekly-reflection-save');
    expect(primary.props.accessibilityLabel).toBe('Save reflection');

    fireEvent.changeText(screen.getByTestId('weekly-reflection-input'), 'kept');
    await act(async () => {
      fireEvent.press(screen.getByTestId('weekly-reflection-save'));
    });
    expect(useStoicPracticeStore.getState().weeklyReflections.map((r) => r.text)).toEqual(['kept']);
  });
});
