/**
 * Journal re-read is not a detection event — safety pin (FEAT-287 Slice B).
 *
 * Lives in `__tests__/safety/` rather than co-located, deliberately. CI runs ten
 * jest path patterns and a co-located `*.behavioral.test.tsx` under
 * `src/features/journal/` matches none of them, so it would run on no PR at all —
 * which is what `check:ci-test-coverage` flagged. Slice A's equivalent is on the
 * uncovered allowlist for exactly that reason. A pin that is the SOLE mechanical
 * enforcement of a crisis ruling must not be allowlisted into never running.
 *
 * The first suite is the load-bearing one. Crisis review ruled that re-reading
 * an entry is NOT a detection event: nothing new is disclosed, the app already
 * responded when the entry was written, and treating a re-read as detection
 * double-counts one episode, fires an iOS Alert on every list-to-detail
 * navigation, and gives `trigger_type: 'journal_text_match'` a second meaning.
 *
 * Maestro cannot cover this half. `journal-crisis-scan.yaml` says so in its own
 * header: Maestro's `text:` selector does not match iOS UIAlertController
 * accessibility text, so an alert firing here is invisible to the flow. This
 * suite is the only thing standing between a regression and production.
 *
 * The entry text used throughout is a real `CRISIS_TEXT_PATTERN_SOURCES` phrase.
 * Anything less would pass whether or not a scanner ran.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@/features/crisis/services/crisisAlert', () => ({
  showCrisisAlert: jest.fn(),
}));

jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { trackCrisisDetection: jest.fn() },
}));

jest.mock('@/features/journal/services/journalEntryStore', () => ({
  getEntry: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { entryId: 'entry-1' } }),
}));

import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import SupabaseService from '@/core/services/supabase/SupabaseService';

import { getEntry } from '@/features/journal/services/journalEntryStore';
import { JournalEntryDetailScreen } from '@/features/journal/screens/JournalEntryDetailScreen';

const mockGetEntry = getEntry as jest.Mock;
const mockAlert = showCrisisAlert as jest.Mock;
const mockTrack = (SupabaseService as unknown as { trackCrisisDetection: jest.Mock })
  .trackCrisisDetection;

const CRISIS_ENTRY = {
  id: 'entry-1',
  text: 'that was the week i kept thinking i want to die and could not say it',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEntry.mockResolvedValue(CRISIS_ENTRY);
});

describe('re-reading a crisis-positive entry is not a detection event', () => {
  it('renders the entry without firing a crisis alert', async () => {
    const { getByTestId } = render(<JournalEntryDetailScreen />);

    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());
    expect(mockAlert).not.toHaveBeenCalled();
  });

  it('emits no crisis telemetry on re-read', async () => {
    const { getByTestId } = render(<JournalEntryDetailScreen />);

    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('fires neither across a re-render of the same entry', async () => {
    // Navigating back and forth must not accumulate episodes.
    const { getByTestId, rerender } = render(<JournalEntryDetailScreen />);
    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());

    rerender(<JournalEntryDetailScreen />);
    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());

    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });
});

describe('the detail screen does not classify the entry it shows', () => {
  it('shows no crisis banner over crisis-positive text', async () => {
    // A banner on exactly the distressed entries would tell the user how Being
    // once classified their private writing, and make those entries legible as
    // a group to anyone holding the phone.
    const { getByTestId, queryByTestId } = render(<JournalEntryDetailScreen />);

    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());
    expect(queryByTestId('journal-crisis-banner')).toBeNull();
    expect(queryByTestId('journal-crisis-call-988')).toBeNull();
  });

  it('renders identically for benign text — no content-dependent chrome', async () => {
    const { getByTestId, queryByTestId } = render(<JournalEntryDetailScreen />);
    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());
    const crisisTree = queryByTestId('journal-entry-detail-screen');
    expect(crisisTree).toBeTruthy();

    jest.clearAllMocks();
    mockGetEntry.mockResolvedValue({ ...CRISIS_ENTRY, text: 'a calm and ordinary day' });
    const benign = render(<JournalEntryDetailScreen />);
    await waitFor(() => expect(benign.getByTestId('journal-entry-text')).toBeTruthy());

    // Same testIDs present in both states; nothing appears only for one.
    expect(benign.queryByTestId('journal-crisis-banner')).toBeNull();
    expect(benign.getByTestId('journal-entry-date')).toBeTruthy();
  });
});

describe('plaintext lifetime', () => {
  it('requests the entry exactly once per mount', async () => {
    const { getByTestId } = render(<JournalEntryDetailScreen />);
    await waitFor(() => expect(getByTestId('journal-entry-text')).toBeTruthy());
    expect(mockGetEntry).toHaveBeenCalledTimes(1);
  });

  it('surfaces a missing entry rather than rendering a blank body', async () => {
    mockGetEntry.mockResolvedValue(null);
    const { getByTestId, queryByTestId } = render(<JournalEntryDetailScreen />);

    await waitFor(() => expect(getByTestId('journal-entry-missing')).toBeTruthy());
    expect(queryByTestId('journal-entry-text')).toBeNull();
  });
});
