/**
 * FEAT-858 (FEAT-530 slice B) — voice journal search on JournalHistoryScreen.
 *
 * Slice A's index module is mocked whole: this suite pins what the SCREEN does
 * with A's answers (composition, ordering, last-submit-wins, the fixed status
 * copy, the crisis wiring), never the index itself, which A's own suites own.
 *
 * The crisis mocks are CrisisTextInput.test.tsx's, with the occlusion hook held
 * true. RNTL renders the iOS InputAccessoryView as a plain host view from mount,
 * so the accessory is asserted by presence, label and pointerEvents rather than
 * by a focus transition jest cannot model.
 */

import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, TextInput } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';

import { TOUCH_TARGETS } from '@/core/theme';
import {
  CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID,
  CRISIS_KEYBOARD_ACCESSORY_TEST_ID,
} from '@/features/crisis/constants/crisisInputAccessory';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@/features/crisis/services/crisisTapTrace', () => ({ beginCrisisTap: jest.fn() }));
jest.mock('@/features/crisis/utils/navigateToCrisisResources', () => ({
  navigateToCrisisResources: jest.fn(),
}));
jest.mock('@/core/hooks/useKeyboardOccludesCrisisButton', () => ({
  useKeyboardOccludesCrisisButton: jest.fn(() => true),
}));

jest.mock('../../services/journalEntryStore', () => ({
  listEntryMetadata: jest.fn(),
  getEntry: jest.fn(),
  journalIndexSource: { listIds: jest.fn(), readText: jest.fn() },
}));

jest.mock('../../services/journalSearchIndex', () => ({
  buildSearchIndex: jest.fn(),
  ensureSearchIndex: jest.fn(),
  getSearchIndexCompleteness: jest.fn(),
  querySearchIndex: jest.fn(),
}));

import { listEntryMetadata, getEntry, journalIndexSource } from '../../services/journalEntryStore';
import { buildSearchIndex, querySearchIndex } from '../../services/journalSearchIndex';
import type { BackfillOutcome, SearchQueryResult } from '../../services/journalSearchIndex';
import { JournalHistoryScreen } from '../JournalHistoryScreen';

const DAY = 24 * 60 * 60 * 1000;
const mockList = listEntryMetadata as jest.MockedFunction<typeof listEntryMetadata>;
const mockGet = getEntry as jest.MockedFunction<typeof getEntry>;
const mockBuild = buildSearchIndex as jest.MockedFunction<typeof buildSearchIndex>;
const mockQuery = querySearchIndex as jest.MockedFunction<typeof querySearchIndex>;

/** The AC4 copy, verbatim. Nothing else may appear in the status line. */
const STATUS = {
  preparing: 'Preparing search…',
  searching: 'Searching your reflections',
  results: 'Showing matching reflections',
  noneAll: 'No reflections match this search.',
  noneRange: 'No reflections match this search in this range.',
  unavailable: "Search isn't available right now.",
} as const;

/** Newest-first, as the store returns them. */
function seed(now: number) {
  return [
    { id: 'today', createdAt: now - 60_000, updatedAt: now - 60_000 },
    { id: 'week', createdAt: now - 3 * DAY, updatedAt: now - 3 * DAY },
    { id: 'quarter', createdAt: now - 45 * DAY, updatedAt: now - 45 * DAY },
    { id: 'ancient', createdAt: now - 300 * DAY, updatedAt: now - 300 * DAY },
  ];
}

const ok = (...ids: string[]): SearchQueryResult => ({ status: 'ok', ids: new Set(ids) });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function renderLoaded() {
  const utils = render(<JournalHistoryScreen />);
  await waitFor(() => expect(utils.getByTestId('journal-search-input')).toBeTruthy());
  return utils;
}

type Utils = Awaited<ReturnType<typeof renderLoaded>>;

function submit(utils: Utils, text: string) {
  fireEvent(utils.getByTestId('journal-search-input'), 'submitEditing', { nativeEvent: { text } });
}

const rowIds = (utils: Utils) =>
  utils.queryAllByTestId(/^journal-history-row-/).map((n) => n.props.testID as string);

const status = (utils: Utils) => {
  const node = utils.getByTestId('journal-search-status');
  const children = node.props.children as unknown;
  return typeof children === 'string' ? children : '';
};

let announce: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue(seed(Date.now()));
  mockGet.mockResolvedValue({ id: 'x', text: 'some reflection', createdAt: 0, updatedAt: 0 });
  mockBuild.mockResolvedValue('complete');
  mockQuery.mockResolvedValue(ok());
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});

afterEach(() => {
  announce.mockRestore();
});

// ── Composition: test-first (AC2) ─────────────────────────────────────────────

describe('results are a membership filter over the range (AC2)', () => {
  it('shows range ∩ matched set, nothing outside either', async () => {
    mockQuery.mockResolvedValue(ok('week', 'ancient'));
    const utils = await renderLoaded();

    fireEvent.press(utils.getByTestId('journal-range-last7'));
    submit(utils, 'harbour');

    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-week']));
  });

  it("keeps the store's newest-first order when the Set iterates in reverse", async () => {
    // Insertion order is the reverse of the list's. Any code that iterated the
    // Set to build rows would render ancient first.
    mockQuery.mockResolvedValue(ok('ancient', 'quarter', 'today'));
    const utils = await renderLoaded();

    submit(utils, 'harbour');

    await waitFor(() =>
      expect(rowIds(utils)).toEqual([
        'journal-history-row-today',
        'journal-history-row-quarter',
        'journal-history-row-ancient',
      ])
    );
  });

  it('recombines on a preset change without a second query', async () => {
    mockQuery.mockResolvedValue(ok('today', 'quarter', 'ancient'));
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    await waitFor(() => expect(rowIds(utils)).toHaveLength(3));

    fireEvent.press(utils.getByTestId('journal-range-last90'));
    await waitFor(() =>
      expect(rowIds(utils)).toEqual(['journal-history-row-today', 'journal-history-row-quarter'])
    );
    fireEvent.press(utils.getByTestId('journal-range-all'));
    await waitFor(() => expect(rowIds(utils)).toHaveLength(3));

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('last submit wins: a late first answer never replaces the second', async () => {
    const first = deferred<SearchQueryResult>();
    mockQuery.mockReturnValueOnce(first.promise).mockResolvedValueOnce(ok('quarter'));
    const utils = await renderLoaded();

    submit(utils, 'first');
    submit(utils, 'second');
    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-quarter']));

    await act(async () => {
      first.resolve(ok('today'));
    });
    expect(rowIds(utils)).toEqual(['journal-history-row-quarter']);
  });

  it('shows the last SUBMITTED query, even while the field text differs', async () => {
    mockQuery.mockResolvedValue(ok('week'));
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-week']));

    fireEvent.changeText(utils.getByTestId('journal-search-input'), 'something else entirely');
    expect(rowIds(utils)).toEqual(['journal-history-row-week']);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('a late answer after Clear writes nothing', async () => {
    const late = deferred<SearchQueryResult>();
    mockQuery.mockReturnValueOnce(late.promise);
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    fireEvent.press(utils.getByTestId('journal-search-clear'));
    await act(async () => {
      late.resolve(ok('week'));
    });

    expect(rowIds(utils)).toHaveLength(4);
    expect(status(utils)).toBe('');
  });

  it('rows are the unchanged EntryRow: same testID, label shape and preview', async () => {
    mockQuery.mockResolvedValue(ok('week'));
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-week']));
    const row = utils.getByTestId('journal-history-row-week');
    await waitFor(() =>
      expect(row.props.accessibilityLabel).toMatch(/^Reflection from .+\. some reflection$/)
    );
  });
});

// ── Completeness before answering (AC3) ───────────────────────────────────────

describe('completeness before answering (AC3)', () => {
  it('a needs-build answer runs the backfill and re-queries once; the missing entry appears', async () => {
    // `ancient` is absent from the mocked index until the backfill runs.
    mockQuery.mockResolvedValueOnce({ status: 'needs-build' }).mockResolvedValueOnce(ok('ancient'));
    const utils = await renderLoaded();

    submit(utils, 'harbour');

    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-ancient']));
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(mockBuild.mock.calls[0][0]).toBe(journalIndexSource);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    // Both queries carry the full live id set, so A can judge completeness.
    expect(mockQuery.mock.calls[1][1]).toEqual(['today', 'week', 'quarter', 'ancient']);
  });

  it('a second needs-build is unavailable, never a partial answer', async () => {
    mockQuery.mockResolvedValue({ status: 'needs-build' });
    const utils = await renderLoaded();

    submit(utils, 'harbour');

    await waitFor(() => expect(status(utils)).toBe(STATUS.unavailable));
    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockBuild).toHaveBeenCalledTimes(1);
    expect(rowIds(utils)).toEqual([]);
  });
});

// ── Fixed copy, no counts (AC4) ───────────────────────────────────────────────

describe('every state uses the fixed copy, with no count (AC4)', () => {
  it('idle shows and announces nothing', async () => {
    const utils = await renderLoaded();
    expect(status(utils)).toBe('');
    expect(announce).not.toHaveBeenCalled();
  });

  it('focus shows "Preparing search…"; a submit during it waits, then runs', async () => {
    const build = deferred<BackfillOutcome>();
    mockBuild.mockReturnValueOnce(build.promise);
    mockQuery.mockResolvedValue(ok('today'));
    const utils = await renderLoaded();

    fireEvent(utils.getByTestId('journal-search-input'), 'focus');
    await waitFor(() => expect(status(utils)).toBe(STATUS.preparing));
    expect(announce).toHaveBeenCalledWith(STATUS.preparing);

    submit(utils, 'harbour');
    await act(async () => {});
    expect(mockQuery).not.toHaveBeenCalled();
    expect(status(utils)).toBe(STATUS.preparing);

    await act(async () => {
      build.resolve('complete');
    });
    await waitFor(() => expect(status(utils)).toBe(STATUS.results));
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockBuild).toHaveBeenCalledTimes(1);
  });

  it('a running query says "Searching your reflections" and keeps the last list', async () => {
    const pending = deferred<SearchQueryResult>();
    mockQuery.mockReturnValueOnce(pending.promise);
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    await waitFor(() => expect(status(utils)).toBe(STATUS.searching));
    expect(rowIds(utils)).toHaveLength(4);

    await act(async () => {
      pending.resolve(ok('week'));
    });
    expect(status(utils)).toBe(STATUS.results);
    expect(announce).toHaveBeenCalledWith(STATUS.searching);
    expect(announce).toHaveBeenCalledWith(STATUS.results);
  });

  it('zero matches in All time vs. in a narrower range', async () => {
    mockQuery.mockResolvedValue(ok('ancient'));
    const utils = await renderLoaded();

    submit(utils, 'zzz');
    await waitFor(() => expect(status(utils)).toBe(STATUS.results));

    fireEvent.press(utils.getByTestId('journal-range-last7'));
    await waitFor(() => expect(status(utils)).toBe(STATUS.noneRange));
    // The no-query range copy is not reused for a search result.
    expect(utils.queryByTestId('journal-history-range-empty')).toBeNull();

    mockQuery.mockResolvedValue(ok());
    fireEvent.press(utils.getByTestId('journal-range-all'));
    submit(utils, 'zzz');
    await waitFor(() => expect(status(utils)).toBe(STATUS.noneAll));
    expect(announce).toHaveBeenCalledWith(STATUS.noneRange);
    expect(announce).toHaveBeenCalledWith(STATUS.noneAll);
  });

  it('every announcement is one of the fixed strings, and none carries a digit', async () => {
    mockQuery.mockResolvedValueOnce(ok('today', 'week')).mockResolvedValueOnce({ status: 'unavailable' });
    const utils = await renderLoaded();

    fireEvent(utils.getByTestId('journal-search-input'), 'focus');
    submit(utils, 'harbour');
    await waitFor(() => expect(status(utils)).toBe(STATUS.results));
    fireEvent.press(utils.getByTestId('journal-range-last7'));
    submit(utils, 'again');
    await waitFor(() => expect(status(utils)).toBe(STATUS.unavailable));

    const said = announce.mock.calls.map((c) => c[0] as string);
    expect(said.length).toBeGreaterThan(2);
    for (const line of said) {
      expect(Object.values(STATUS)).toContain(line);
      expect(line).not.toMatch(/\d/);
    }
    for (const line of Object.values(STATUS)) expect(line).not.toMatch(/\d/);
    expect('3 reflections match').toMatch(/\d/);
  });

  it('the status line is a polite live region (Android announces through it)', async () => {
    const utils = await renderLoaded();
    expect(utils.getByTestId('journal-search-status').props.accessibilityLiveRegion).toBe('polite');
  });

  it('a whitespace, punctuation or marks-only query behaves as Clear', async () => {
    mockQuery.mockResolvedValue(ok('week'));
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-week']));

    for (const empty of ['', '   ', '?!…', '́̈']) {
      submit(utils, empty);
      await waitFor(() => expect(rowIds(utils)).toHaveLength(4));
      expect(status(utils)).toBe('');
    }
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('Clear is a labelled button at the minimum target, restores the list and keeps the preset', async () => {
    mockQuery.mockResolvedValue(ok('today'));
    const utils = await renderLoaded();

    const clear = utils.getByTestId('journal-search-clear');
    expect(clear.props.accessibilityRole).toBe('button');
    expect(clear.props.accessibilityLabel).toBe('Clear search');
    const style = StyleSheet.flatten(clear.props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);
    expect(style.minWidth).toBeGreaterThanOrEqual(TOUCH_TARGETS.minimum);

    fireEvent.press(utils.getByTestId('journal-range-last7'));
    submit(utils, 'harbour');
    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-today']));

    fireEvent.press(utils.getByTestId('journal-search-clear'));
    await waitFor(() =>
      expect(rowIds(utils)).toEqual(['journal-history-row-today', 'journal-history-row-week'])
    );
    expect(utils.getByTestId('journal-range-last7').props.accessibilityState.selected).toBe(true);
    expect(status(utils)).toBe('');
  });

  it('neither field nor filter renders while loading or with zero entries', async () => {
    const list = deferred<Awaited<ReturnType<typeof listEntryMetadata>>>();
    mockList.mockReturnValueOnce(list.promise);
    const loading = render(<JournalHistoryScreen />);
    expect(loading.queryByTestId('journal-search-input')).toBeNull();
    expect(loading.queryByTestId('journal-history-range-filter')).toBeNull();
    await act(async () => {
      list.resolve([]);
    });
    expect(loading.getByTestId('journal-history-empty')).toBeTruthy();
    expect(loading.queryByTestId('journal-search-input')).toBeNull();
    expect(loading.queryByTestId('journal-search-clear')).toBeNull();
    expect(loading.queryByTestId('journal-history-range-filter')).toBeNull();
  });
});

// ── Error state (AC5) ─────────────────────────────────────────────────────────

describe('error state (AC5)', () => {
  it('a failed query shows only the message; field, Clear and filter stay mounted', async () => {
    mockQuery.mockRejectedValue(new Error('boom'));
    const utils = await renderLoaded();
    const decryptsBefore = mockGet.mock.calls.length;

    submit(utils, 'harbour');

    await waitFor(() => expect(status(utils)).toBe(STATUS.unavailable));
    expect(rowIds(utils)).toEqual([]);
    expect(utils.queryByTestId('journal-history-range-empty')).toBeNull();
    expect(utils.getByTestId('journal-search-input')).toBeTruthy();
    expect(utils.getByTestId('journal-search-clear')).toBeTruthy();
    expect(utils.getByTestId('journal-history-range-filter')).toBeTruthy();
    // Never a fallback to per-entry decrypts (AC7).
    expect(mockGet.mock.calls.length).toBe(decryptsBefore);
  });

  it('an unavailable answer is the same state', async () => {
    mockQuery.mockResolvedValue({ status: 'unavailable' });
    const utils = await renderLoaded();
    submit(utils, 'harbour');
    await waitFor(() => expect(status(utils)).toBe(STATUS.unavailable));
    expect(rowIds(utils)).toEqual([]);
  });

  it('a backfill failure on focus shows the message and keeps the range list; re-focus retries once', async () => {
    mockBuild.mockResolvedValueOnce('failed');
    const utils = await renderLoaded();
    const input = utils.getByTestId('journal-search-input');

    fireEvent(input, 'focus');
    await waitFor(() => expect(status(utils)).toBe(STATUS.unavailable));
    expect(rowIds(utils)).toHaveLength(4);
    // No automatic retry loop.
    await act(async () => {});
    expect(mockBuild).toHaveBeenCalledTimes(1);

    fireEvent(input, 'blur');
    fireEvent(input, 'focus');
    await waitFor(() => expect(status(utils)).toBe(''));
    expect(mockBuild).toHaveBeenCalledTimes(2);
  });

  it('a thrown backfill is a failure, not a crash', async () => {
    mockBuild.mockRejectedValueOnce(new Error('boom'));
    const utils = await renderLoaded();
    fireEvent(utils.getByTestId('journal-search-input'), 'focus');
    await waitFor(() => expect(status(utils)).toBe(STATUS.unavailable));
  });
});

// ── Crisis path stays live (AC6) ──────────────────────────────────────────────

describe('the crisis path stays live during the backfill (AC6)', () => {
  it('opening History raises no keyboard and starts no backfill', async () => {
    const utils = await renderLoaded();
    expect(utils.getByTestId('journal-search-input').props.autoFocus).toBe(false);
    await act(async () => {});
    expect(mockBuild).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('while preparing, the accessory, Clear, chips and rows stay mounted and enabled', async () => {
    const build = deferred<BackfillOutcome>();
    mockBuild.mockReturnValueOnce(build.promise);
    const utils = await renderLoaded();

    fireEvent(utils.getByTestId('journal-search-input'), 'focus');
    await waitFor(() => expect(status(utils)).toBe(STATUS.preparing));

    const container = utils.getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID);
    expect(container.props.pointerEvents).toBe('auto');
    expect(utils.getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID)).toBeTruthy();
    for (const id of ['journal-search-clear', 'journal-range-last7', 'journal-history-row-week']) {
      const node = utils.getByTestId(id);
      expect(node.props.accessibilityState?.disabled).not.toBe(true);
      expect(node.props.disabled).not.toBe(true);
    }
    expect(rowIds(utils)).toHaveLength(4);

    await act(async () => {
      build.resolve('complete');
    });
  });

  it('unmount stops the backfill and writes no state; re-focus resumes through A', async () => {
    const build = deferred<BackfillOutcome>();
    mockBuild.mockReturnValueOnce(build.promise);
    const utils = await renderLoaded();

    fireEvent(utils.getByTestId('journal-search-input'), 'focus');
    const options = mockBuild.mock.calls[0][1];
    expect(options?.shouldContinue?.()).toBe(true);

    utils.unmount();
    expect(options?.shouldContinue?.()).toBe(false);
    await act(async () => {
      build.resolve('interrupted');
    });

    // A fresh mount after a partial backfill calls A's build, which resumes a
    // built index (it ensures) rather than starting over.
    const again = await renderLoaded();
    fireEvent(again.getByTestId('journal-search-input'), 'focus');
    await waitFor(() => expect(mockBuild).toHaveBeenCalledTimes(2));
    expect(mockBuild.mock.calls[1][0]).toBe(journalIndexSource);
  });

  it('unmount while a query is in flight writes no state and runs no follow-up', async () => {
    const pending = deferred<SearchQueryResult>();
    mockQuery.mockReturnValueOnce(pending.promise);
    const utils = await renderLoaded();

    submit(utils, 'harbour');
    utils.unmount();
    await act(async () => {
      pending.resolve({ status: 'needs-build' });
    });
    expect(mockBuild).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

// ── Field and crisis wiring (AC1) ─────────────────────────────────────────────

describe('the field is a CrisisTextInput (AC1)', () => {
  it('is the only text input, labelled, and configured as the AC requires', async () => {
    const utils = await renderLoaded();

    const inputs = utils.UNSAFE_getAllByType(TextInput);
    expect(inputs).toHaveLength(1);
    const input = utils.getByTestId('journal-search-input');
    expect(input.props.accessibilityLabel).toBe('Search your reflections');
    expect(input.props.placeholder).toBe('Search your reflections');
    expect(input.props.autoFocus).toBe(false);
    expect(input.props.autoCorrect).toBe(false);
    expect(input.props.spellCheck).toBe(false);
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.clearButtonMode).toBe('never');
    expect(input.props.returnKeyType).toBe('search');
    // Focus stays on the field after a submit.
    expect(input.props.submitBehavior).toBe('submit');
    // The composite owns the accessory id; the screen sets none.
    expect(typeof input.props.inputAccessoryViewID).toBe('string');
  });

  it('pairs the field with the crisis accessory: "I need support", pointerEvents auto (iOS, occluded)', async () => {
    const utils = await renderLoaded();
    const button = utils.getByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID);
    expect(button.props.accessibilityLabel).toBe('I need support');
    expect(utils.getByTestId(CRISIS_KEYBOARD_ACCESSORY_CONTAINER_TEST_ID).props.pointerEvents).toBe(
      'auto'
    );
  });

  it('on Android the accessory renders null and status is left to the live region', async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    try {
      const utils = await renderLoaded();
      expect(utils.queryByTestId(CRISIS_KEYBOARD_ACCESSORY_TEST_ID)).toBeNull();
      mockQuery.mockResolvedValue(ok('week'));
      submit(utils, 'harbour');
      await waitFor(() => expect(status(utils)).toBe(STATUS.results));
      expect(announce).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true });
    }
  });

  it('keeps the list keyboard-aware', async () => {
    const utils = await renderLoaded();
    const list = utils.getByTestId('journal-history-list');
    expect(list.props.keyboardShouldPersistTaps).toBe('handled');
    expect(list.props.keyboardDismissMode).toBe('on-drag');
    expect(list.props.automaticallyAdjustKeyboardInsets).toBe(true);
  });
});

// ── No O(N) decrypt (AC7) ─────────────────────────────────────────────────────

describe('no O(N) decrypt after a submit (AC7)', () => {
  it('every getEntry after a submit is for a matched id', async () => {
    mockQuery.mockResolvedValue(ok('quarter', 'week'));
    const utils = await renderLoaded();
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    mockGet.mockClear();

    fireEvent.press(utils.getByTestId('journal-range-last7'));
    await waitFor(() => expect(rowIds(utils)).toHaveLength(2));
    mockGet.mockClear();

    submit(utils, 'harbour');
    await waitFor(() => expect(rowIds(utils)).toEqual(['journal-history-row-week']));
    fireEvent.press(utils.getByTestId('journal-range-last90'));
    await waitFor(() =>
      expect(rowIds(utils)).toEqual(['journal-history-row-week', 'journal-history-row-quarter'])
    );

    for (const [id] of mockGet.mock.calls) expect(['quarter', 'week']).toContain(id);
  });
});

// ── Source shape (AC1, AC7) — comments stripped first, per DEBUG-390 ─────────

describe('source shape', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const SCREENS = join(__dirname, '..');
  const screen = strip(readFileSync(join(SCREENS, 'JournalHistoryScreen.tsx'), 'utf8'));

  const HOOK = /\buseKeyboardOccludesCrisisButton\b/;
  const BARE_INPUT = /<TextInput[\s/>]/;
  const PERSISTENCE = /AsyncStorage|SecureStore|SecureStorageService|\bzustand\b|setParams\s*\(/;

  it('the stripped source is non-trivial and the stripper did work', () => {
    expect(screen.length).toBeGreaterThan(2000);
    expect(screen.length).toBeLessThan(readFileSync(join(SCREENS, 'JournalHistoryScreen.tsx'), 'utf8').length);
    expect(screen).toMatch(/<CrisisTextInput[\s/>]/);
  });

  it('neither imports nor calls the occlusion hook (the composite owns it)', () => {
    expect(screen).not.toMatch(HOOK);
  });

  it('renders no bare <TextInput>', () => {
    expect(screen).not.toMatch(BARE_INPUT);
  });

  it('keeps the query out of every persistent store', () => {
    expect(screen).not.toMatch(PERSISTENCE);
  });

  it('the matchers fire on known-bad literals', () => {
    expect('const occluded = useKeyboardOccludesCrisisButton();').toMatch(HOOK);
    expect('<TextInput value={q} />').toMatch(BARE_INPUT);
    expect('<CrisisTextInput value={q} />').not.toMatch(BARE_INPUT);
    expect("await AsyncStorage.setItem('q', query);").toMatch(PERSISTENCE);
    expect('navigation.setParams({ query });').toMatch(PERSISTENCE);
  });
});
