/**
 * FEAT-288 Slice C — the date-range filter as the reader meets it.
 *
 * Asserts behaviour through the rendered tree, not the pure function
 * (journalDateRange.unit.test.ts owns the arithmetic). What matters here is the
 * three things the screen must not do: strand the reader in an empty result,
 * tell them their record is empty when it is not, and decrypt more than the
 * visible window.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../services/journalEntryStore', () => ({
  listEntryMetadata: jest.fn(),
  getEntry: jest.fn(),
}));

import { listEntryMetadata, getEntry } from '../../services/journalEntryStore';
import { JournalHistoryScreen } from '../JournalHistoryScreen';

const DAY = 24 * 60 * 60 * 1000;
const mockList = listEntryMetadata as jest.MockedFunction<typeof listEntryMetadata>;
const mockGet = getEntry as jest.MockedFunction<typeof getEntry>;

/** Newest-first, as the store returns them. */
function seed(now: number) {
  return [
    { id: 'today', createdAt: now - 60_000, updatedAt: now - 60_000 },
    { id: 'week', createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY },
    { id: 'quarter', createdAt: now - 45 * DAY, updatedAt: now - 45 * DAY },
    { id: 'ancient', createdAt: now - 300 * DAY, updatedAt: now - 300 * DAY },
  ];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ id: 'x', text: 'some reflection', createdAt: 0, updatedAt: 0 });
});

describe('JournalHistoryScreen — date range', () => {
  it('shows every entry before any filtering, defaulting to All time', async () => {
    mockList.mockResolvedValue(seed(Date.now()));
    const { getByTestId } = render(<JournalHistoryScreen />);

    await waitFor(() => expect(getByTestId('journal-range-all')).toBeTruthy());
    expect(getByTestId('journal-range-all').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('journal-history-row-today')).toBeTruthy();
    expect(getByTestId('journal-history-row-ancient')).toBeTruthy();
  });

  it('narrows the list to the selected range', async () => {
    mockList.mockResolvedValue(seed(Date.now()));
    const { getByTestId, queryByTestId } = render(<JournalHistoryScreen />);

    await waitFor(() => expect(getByTestId('journal-range-last7')).toBeTruthy());
    fireEvent.press(getByTestId('journal-range-last7'));

    await waitFor(() => expect(queryByTestId('journal-history-row-quarter')).toBeNull());
    expect(getByTestId('journal-history-row-today')).toBeTruthy();
    expect(getByTestId('journal-history-row-week')).toBeTruthy();
    expect(queryByTestId('journal-history-row-ancient')).toBeNull();
  });

  it('keeps the newest-first order the store returned', async () => {
    mockList.mockResolvedValue(seed(Date.now()));
    const { getByTestId, getAllByTestId } = render(<JournalHistoryScreen />);

    await waitFor(() => expect(getByTestId('journal-range-last90')).toBeTruthy());
    fireEvent.press(getByTestId('journal-range-last90'));

    await waitFor(() => {
      const ids = getAllByTestId(/^journal-history-row-/).map(
        (n) => n.props.testID as string
      );
      expect(ids).toEqual([
        'journal-history-row-today',
        'journal-history-row-week',
        'journal-history-row-quarter',
      ]);
    });
  });

  describe('an empty RESULT is not an empty RECORD', () => {
    it('reports the range, not the reader, and never reuses the true-empty copy', async () => {
      const now = Date.now();
      mockList.mockResolvedValue([
        { id: 'ancient', createdAt: now - 300 * DAY, updatedAt: now - 300 * DAY },
      ]);
      const { getByTestId, queryByTestId } = render(<JournalHistoryScreen />);

      await waitFor(() => expect(getByTestId('journal-range-last7')).toBeTruthy());
      fireEvent.press(getByTestId('journal-range-last7'));

      await waitFor(() => expect(getByTestId('journal-history-range-empty')).toBeTruthy());
      // `journal-history-empty` says reflections "will appear here" — false for a
      // reader who has written some and narrowed past them.
      expect(queryByTestId('journal-history-empty')).toBeNull();
    });

    it('leaves the filter mounted, so the reader is never stranded', async () => {
      const now = Date.now();
      mockList.mockResolvedValue([
        { id: 'ancient', createdAt: now - 300 * DAY, updatedAt: now - 300 * DAY },
      ]);
      const { getByTestId, queryByTestId } = render(<JournalHistoryScreen />);

      await waitFor(() => expect(getByTestId('journal-range-last7')).toBeTruthy());
      fireEvent.press(getByTestId('journal-range-last7'));
      await waitFor(() => expect(getByTestId('journal-history-range-empty')).toBeTruthy());

      expect(getByTestId('journal-history-range-filter')).toBeTruthy();
      fireEvent.press(getByTestId('journal-range-all'));
      await waitFor(() => expect(getByTestId('journal-history-row-ancient')).toBeTruthy());
      expect(queryByTestId('journal-history-range-empty')).toBeNull();
    });

    it('still shows the true-empty state, without a filter, when nothing is stored', async () => {
      mockList.mockResolvedValue([]);
      const { getByTestId, queryByTestId } = render(<JournalHistoryScreen />);

      await waitFor(() => expect(getByTestId('journal-history-empty')).toBeTruthy());
      // Filtering nothing is meaningless — offering the control would imply the
      // absence might be the filter's doing.
      expect(queryByTestId('journal-history-range-filter')).toBeNull();
    });
  });

  it('narrowing cannot raise the number of decrypts', async () => {
    mockList.mockResolvedValue(seed(Date.now()));
    const { getByTestId } = render(<JournalHistoryScreen />);

    await waitFor(() => expect(getByTestId('journal-history-row-today')).toBeTruthy());
    const unfiltered = mockGet.mock.calls.length;
    mockGet.mockClear();

    fireEvent.press(getByTestId('journal-range-last7'));
    await waitFor(() => expect(getByTestId('journal-history-row-week')).toBeTruthy());

    expect(mockGet.mock.calls.length).toBeLessThanOrEqual(unfiltered);
  });

  it('carries no result count anywhere in the control', async () => {
    // A count is a fact about the reader's practice. Attaching one to a control
    // turns choosing a span into being told about a span.
    mockList.mockResolvedValue(seed(Date.now()));
    const { getByTestId } = render(<JournalHistoryScreen />);

    await waitFor(() => expect(getByTestId('journal-range-last7')).toBeTruthy());
    for (const option of ['all', 'last7', 'last30', 'last90']) {
      const label = getByTestId(`journal-range-${option}`).props.accessibilityLabel as string;
      expect(label).not.toMatch(/\d+\s*(entr|reflection|result|match)/i);
      expect(label).not.toMatch(/^\d|\(\d/);
    }
    expect('3 reflections').toMatch(/\d+\s*(entr|reflection|result|match)/i);
  });
});
