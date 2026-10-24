/**
 * FEAT-807 — "Last export prepared" on the export screen.
 *
 * Pinned against the real `useLastExportRecord` hook (focus simulated as mount) with the
 * storage calls mocked:
 *   A. the stored date renders, and nothing renders when there is none;
 *   B. the record is written only after the share call resolves, and the line updates;
 *   C. the record holds the scope the format EXPORTED — JSON all-time, PDF its 90-day
 *      bound — never the preview selection;
 *   D. no record on sharing-unavailable, the presenting guard, or a failed render;
 *   E. a failed write leaves the export itself untouched: no error state.
 */
import React from 'react';
import { AppState } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockRead = jest.fn();
const mockWrite = jest.fn();
jest.mock('@/features/data-export/services/lastExportRecord', () => ({
  ...jest.requireActual('@/features/data-export/services/lastExportRecord'),
  readLastExportRecord: (...a: unknown[]) => mockRead(...a),
  writeLastExportRecord: (...a: unknown[]) => mockWrite(...a),
}));

const mockGather = jest.fn();
jest.mock('@/core/services/privacy/DataExportService', () => ({
  gatherExportData: (...a: unknown[]) => mockGather(...a),
  serializeExport: () => '{"schemaVersion":"1"}',
}));

jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation((dirOrUri: string, name?: string) => ({
    uri: name === undefined ? dirOrUri : `file:///cache/${name}`,
    exists: false,
    create: () => undefined,
    write: () => undefined,
    move: async () => undefined,
    delete: () => undefined,
  })),
}));

const mockPrintToFile = jest.fn();
jest.mock('expo-print', () => ({
  printToFileAsync: (...a: unknown[]) => mockPrintToFile(...a),
}));

const mockShareAsync = jest.fn();
const mockIsAvailable = jest.fn();
jest.mock('expo-sharing', () => ({
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
  isAvailableAsync: (...a: unknown[]) => mockIsAvailable(...a),
}));

// ON, so the preview's range picker is rendered and C can move it away from the export scope.
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: () => true,
}));

const mockFocused = { value: true };
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ isFocused: () => mockFocused.value }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactActual.useEffect(effect, [effect]),
  };
});

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import ExportDataScreen from '../ExportDataScreen';

const ALL_CATEGORIES = ['assessments', 'checkIns', 'practices', 'reflections'];
const OCT_20 = new Date(2026, 9, 20, 9).getTime();
const OCT_24 = new Date(2026, 9, 24, 9).getTime();
const copyFor = (day: string) =>
  `Last export prepared: ${day}. Being keeps only this date, the format and the range it ` +
  "covered — not the file, and not on Being's servers.";

const mockAppState = { value: 'active' };
Object.defineProperty(AppState, 'currentState', {
  configurable: true,
  get: () => mockAppState.value,
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFocused.value = true;
  mockAppState.value = 'active';
  mockRead.mockResolvedValue(null);
  mockWrite.mockImplementation(async (format: string, scope: unknown) => ({
    preparedAt: OCT_24,
    format,
    scope,
  }));
  mockGather.mockResolvedValue({ schemaVersion: '1' });
  mockIsAvailable.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
  mockPrintToFile.mockResolvedValue({ uri: 'file:///cache/Print/x.pdf', numberOfPages: 1 });
  useAssessmentStore.setState({ completedAssessments: [] });
  useStoicPracticeStore.setState({
    principleEngagements: [],
    checkInCompletions: [],
    weeklyReflections: [],
    isLoading: false,
  });
});

describe('A. the stored date', () => {
  it('renders the approved copy for a stored record', async () => {
    mockRead.mockResolvedValue({ preparedAt: OCT_20, format: 'pdf', scope: {} });
    const { findByTestId } = render(<ExportDataScreen />);
    const line = await findByTestId('export-last-prepared');
    expect(line.props.children).toBe(copyFor('Oct 20, 2026'));
  });

  it('renders nothing when no export was ever prepared', async () => {
    const { queryByTestId } = render(<ExportDataScreen />);
    await waitFor(() => expect(mockRead).toHaveBeenCalled());
    expect(queryByTestId('export-last-prepared')).toBeNull();
  });
});

describe('B. written after the share resolves', () => {
  it('writes nothing while the sheet is up, then writes and updates the line', async () => {
    mockRead.mockResolvedValue({ preparedAt: OCT_20, format: 'json', scope: {} });
    const sheet = deferred();
    mockShareAsync.mockReturnValue(sheet.promise);
    const api = render(<ExportDataScreen />);
    await api.findByText(copyFor('Oct 20, 2026'));

    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockWrite).not.toHaveBeenCalled();

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
    await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
    expect(await api.findByText(copyFor('Oct 24, 2026'))).toBeTruthy();
  });
});

describe('C. the scope the format exported, never the preview selection', () => {
  it('JSON records all time and every category, with the preview on Last 7 days', async () => {
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-range-last7'));
    fireEvent.press(api.getByTestId('export-category-reflections'));
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
    expect(mockWrite).toHaveBeenCalledWith('json', { preset: 'all', categories: ALL_CATEGORIES });
  });

  it('PDF records its 90-day bound and every category, with the preview on All time', async () => {
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-range-all'));
    fireEvent.press(api.getByTestId('export-pdf-button'));
    await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
    expect(mockWrite).toHaveBeenCalledWith('pdf', { preset: 'last90', categories: ALL_CATEGORIES });
  });
});

describe('D. no record when nothing was offered to share', () => {
  it.each([
    ['sharing is unavailable', () => mockIsAvailable.mockResolvedValue(false)],
    ['the screen lost focus before presenting', () => { mockFocused.value = false; }],
    ['the app left the foreground before presenting', () => { mockAppState.value = 'background'; }],
    ['gathering the data failed', () => mockGather.mockRejectedValue(new Error('x'))],
  ])('%s', async (_label, arrange) => {
    arrange();
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-data-button'));
    await api.findByTestId('export-error');
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('the PDF render failed', async () => {
    mockPrintToFile.mockRejectedValue(new Error('render'));
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-pdf-button'));
    await api.findByTestId('export-error');
    expect(mockWrite).not.toHaveBeenCalled();
  });
});

describe('E. the write never holds the export', () => {
  it('re-enables the button while the write is still pending', async () => {
    mockWrite.mockReturnValue(new Promise(() => {}));
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.getByTestId('export-data-button').props.accessibilityState.disabled).toBe(false));
  });

  it('a failed write shows no error and no stale date', async () => {
    mockWrite.mockResolvedValue(null);
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockWrite).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.getByTestId('export-data-button').props.accessibilityState.disabled).toBe(false));
    expect(api.queryByTestId('export-error')).toBeNull();
    expect(api.queryByTestId('export-last-prepared')).toBeNull();
  });
});
