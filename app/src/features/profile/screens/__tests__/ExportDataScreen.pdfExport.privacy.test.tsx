/**
 * ExportDataScreen — the PDF export path (FEAT-806).
 *
 * "Export as PDF" renders FEAT-272's `buildExportHtml(buildExportPayload(...))`
 * through expo-print's `printToFileAsync`, moves the render under the export
 * name in the app cache, and shares it through the screen's ONE `shareAsync`
 * call. The PDF is an unencrypted copy of the user's wellness data, so it gets
 * the same lifecycle the JSON file got in DEBUG-645, plus a guard JSON now
 * shares: the sheet is raised only if the user is still on this screen and the
 * app is in the foreground. A render that settles after the user left must not
 * raise an OS sheet, which hides the 988 affordance, over wherever they went.
 *
 * Pinned here, against a STATEFUL file mock so existence is observed:
 *   A. render → move → share, with the PDF mime type;
 *   B. the PDF is gone once the share settles (completed or cancelled), and is
 *      on disk while the sheet is up, so the check is not vacuous;
 *   C. the sharing-unavailable return, a render failure and a move failure each
 *      leave nothing behind, including expo-print's own render;
 *   D. the presenting guard: unfocused or backgrounded → no sheet, file deleted,
 *      inline error — on the PDF path and on the JSON path;
 *   E. hydration and in-flight gating of both buttons;
 *   F. logging carries the Error only, never the document;
 *   G. the document covers the last 90 days only, and says so;
 *   H. the preparing copy is on screen and announced before the main-thread render.
 */
import React from 'react';
import { AppState } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockGather = jest.fn();
const mockSerialize = jest.fn();
jest.mock('@/core/services/privacy/DataExportService', () => ({
  gatherExportData: (...a: unknown[]) => mockGather(...a),
  serializeExport: (...a: unknown[]) => mockSerialize(...a),
}));

/** Stateful stand-in for the filesystem: path -> exists. */
const mockDisk = new Map<string, boolean>();
const mockFail = { move: false, delete: false };
jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation((dirOrUri: string, name?: string) => {
    const file = {
      path: name === undefined ? dirOrUri.replace(/^file:\/\//, '') : `${dirOrUri}/${name}`,
      get uri() {
        return `file://${file.path}`;
      },
      get exists() {
        return mockDisk.get(file.path) === true;
      },
      create: () => mockDisk.set(file.path, true),
      write: () => undefined,
      move: async (dest: { path: string }) => {
        if (mockFail.move) throw new Error('move failed');
        mockDisk.set(file.path, false);
        mockDisk.set(dest.path, true);
        file.path = dest.path;
      },
      delete: () => {
        if (mockFail.delete) throw new Error('already removed');
        if (mockDisk.get(file.path) !== true) throw new Error('path does not exist');
        mockDisk.set(file.path, false);
      },
    };
    return file;
  }),
}));

const PRINT_OUTPUT = '/cache/Print/3F2504E0-4F89-41D3-9A0C-0305E82C3301.pdf';
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

jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: () => false,
}));

const mockFocused = { value: true };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ isFocused: () => mockFocused.value }),
}));

const mockLogError = jest.fn();
jest.mock('@/core/services/logging', () => ({
  ...jest.requireActual('@/core/services/logging'),
  logError: (...a: unknown[]) => mockLogError(...a),
}));

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import ExportDataScreen, { PDF_PREPARING_COPY } from '../ExportDataScreen';
import { escapeHtml, PDF_WINDOW_OMISSION } from '@/features/data-export/services/exportPdfDocument';

const SECRET_REFLECTION = 'ZZPDFREFLECTIONZZ-only-in-the-document';
const DAY = 24 * 60 * 60 * 1000;
const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const PDF_NAME = /^\/cache\/being-export-\d{4}-\d{2}-\d{2}\.pdf$/;

const mockAppState = { value: 'active' };
Object.defineProperty(AppState, 'currentState', {
  configurable: true,
  get: () => mockAppState.value,
});

const onDisk = (): string[] => [...mockDisk].filter(([, exists]) => exists).map(([p]) => p);

function deferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const pressPdf = (api: ReturnType<typeof render>) =>
  fireEvent.press(api.getByTestId('export-pdf-button'));

beforeEach(() => {
  jest.clearAllMocks();
  mockDisk.clear();
  mockFail.move = false;
  mockFail.delete = false;
  mockFocused.value = true;
  mockAppState.value = 'active';
  mockGather.mockResolvedValue({ schemaVersion: '1' });
  mockSerialize.mockReturnValue('{"schemaVersion":"1"}');
  mockIsAvailable.mockResolvedValue(true);
  mockShareAsync.mockResolvedValue(undefined);
  mockPrintToFile.mockImplementation(async () => {
    mockDisk.set(PRINT_OUTPUT, true);
    return { uri: `file://${PRINT_OUTPUT}`, numberOfPages: 1 };
  });
  useAssessmentStore.setState({ completedAssessments: [] });
  useStoicPracticeStore.setState({
    principleEngagements: [],
    checkInCompletions: [],
    weeklyReflections: [
      {
        id: 'r1',
        weekStartIso: ymd(Date.now() - 2 * DAY),
        text: SECRET_REFLECTION,
        savedAt: new Date(Date.now() - 2 * DAY).toISOString(),
      },
    ],
    isLoading: false,
  });
});

describe('FEAT-806 A: render, move, share', () => {
  it('renders the document and shares it as a PDF through the one share call', async () => {
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    expect(mockPrintToFile).toHaveBeenCalledTimes(1);
    const { html } = mockPrintToFile.mock.calls[0][0] as { html: string };
    // A reflection from two days ago is inside the 90-day window, so it is in the document verbatim.
    expect(html).toContain(SECRET_REFLECTION);
    expect(html).toContain('988');

    const [uri, options] = mockShareAsync.mock.calls[0];
    expect(uri.replace('file://', '')).toMatch(PDF_NAME);
    expect(options).toEqual(
      expect.objectContaining({ mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }),
    );
    // The JSON path's gather/serialize never ran: the PDF is not a re-encoding of it.
    expect(mockGather).not.toHaveBeenCalled();
  });
});

describe('FEAT-806 B: the PDF does not outlive its share', () => {
  it('is on disk under the export name while the sheet is up, and gone once it settles', async () => {
    const sheet = deferred();
    mockShareAsync.mockReturnValue(sheet.promise);
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    const live = onDisk();
    expect(live).toHaveLength(1);
    expect(live[0]).toMatch(PDF_NAME);

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
    await waitFor(() => expect(onDisk()).toEqual([]));
    expect(api.queryByTestId('export-error')).toBeNull();
  });
});

describe('FEAT-806 C: every failure path leaves nothing behind', () => {
  it('sharing unavailable', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(api.getByTestId('export-error')).toBeTruthy());
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(onDisk()).toEqual([]);
  });

  it('a render that throws creates nothing and attempts no delete', async () => {
    mockPrintToFile.mockRejectedValue(new Error('WebView crashed'));
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(api.getByTestId('export-error')).toBeTruthy());
    expect(onDisk()).toEqual([]);
    expect(mockLogError).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('cleanup'),
      expect.anything(),
    );
  });

  it("a move that throws still deletes expo-print's render", async () => {
    mockFail.move = true;
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(api.getByTestId('export-error')).toBeTruthy());
    expect(mockDisk.get(PRINT_OUTPUT)).toBe(false);
    expect(onDisk()).toEqual([]);
  });

  it('a delete that throws is swallowed: no error state, logged, nothing propagates', async () => {
    mockFail.delete = true;
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockLogError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('cleanup'),
        expect.any(Error),
      ),
    );
    expect(api.queryByTestId('export-error')).toBeNull();
  });
});

describe('FEAT-806 D: the presenting guard', () => {
  it.each([
    ['the user left the screen', () => (mockFocused.value = false)],
    ['the app was backgrounded', () => (mockAppState.value = 'background')],
    ['the app is inactive', () => (mockAppState.value = 'inactive')],
  ])('PDF: does not raise the sheet when %s during the render', async (_label, leave) => {
    const render$ = deferred<{ uri: string; numberOfPages: number }>();
    mockPrintToFile.mockImplementation(() => {
      mockDisk.set(PRINT_OUTPUT, true);
      return render$.promise;
    });
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockPrintToFile).toHaveBeenCalledTimes(1));

    leave();
    await act(async () => {
      render$.resolve({ uri: `file://${PRINT_OUTPUT}`, numberOfPages: 1 });
      await render$.promise;
    });

    await waitFor(() => expect(api.getByTestId('export-error')).toBeTruthy());
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(onDisk()).toEqual([]);
    expect(api.getByTestId('export-error').props.accessibilityLiveRegion).toBe('assertive');
  });

  it('JSON inherits it: no sheet, no file, when the app is backgrounded', async () => {
    mockAppState.value = 'background';
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(api.getByTestId('export-error')).toBeTruthy());
    expect(mockShareAsync).not.toHaveBeenCalled();
    expect(onDisk()).toEqual([]);
  });

  it('reads the guard after the render, not when the button was pressed', async () => {
    // Control for the cases above: focused + active at share time → the sheet is raised,
    // even though the guard was false at press time.
    mockFocused.value = false;
    const render$ = deferred<{ uri: string; numberOfPages: number }>();
    mockPrintToFile.mockImplementation(() => {
      mockDisk.set(PRINT_OUTPUT, true);
      return render$.promise;
    });
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockPrintToFile).toHaveBeenCalledTimes(1));
    mockFocused.value = true;
    await act(async () => {
      render$.resolve({ uri: `file://${PRINT_OUTPUT}`, numberOfPages: 1 });
      await render$.promise;
    });
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
  });
});

describe('FEAT-806 E: gating', () => {
  it('keeps the PDF button disabled until the stores hydrate, with the preview flag dark', () => {
    useStoicPracticeStore.setState({ isLoading: true });
    const api = render(<ExportDataScreen />);
    const button = api.getByTestId('export-pdf-button');
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    pressPdf(api);
    expect(mockPrintToFile).not.toHaveBeenCalled();
    // The JSON export does not wait on hydration: it gathers from storage itself.
    expect(api.getByTestId('export-data-button').props.accessibilityState.disabled).toBe(false);
  });

  it('disables both buttons while the PDF is in flight, and marks only the PDF busy', async () => {
    const sheet = deferred();
    mockShareAsync.mockReturnValue(sheet.promise);
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    const pdf = api.getByTestId('export-pdf-button').props.accessibilityState;
    const json = api.getByTestId('export-data-button').props.accessibilityState;
    expect(pdf).toEqual({ disabled: true, busy: true });
    expect(json).toEqual({ disabled: true, busy: false });

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
    await waitFor(() =>
      expect(api.getByTestId('export-pdf-button').props.accessibilityState.busy).toBe(false),
    );
  });

  it('disables both buttons while the JSON export is in flight', async () => {
    const sheet = deferred();
    mockShareAsync.mockReturnValue(sheet.promise);
    const api = render(<ExportDataScreen />);
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    expect(api.getByTestId('export-pdf-button').props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    pressPdf(api);
    expect(mockPrintToFile).not.toHaveBeenCalled();
    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
  });
});

describe('FEAT-806 E2: two taps in one frame', () => {
  it('starts exactly one export when JSON and PDF are pressed before a re-render', async () => {
    const api = render(<ExportDataScreen />);
    const pdf = api.getByTestId('export-pdf-button');
    const json = api.getByTestId('export-data-button');
    // Both handlers fire against the same rendered props: state cannot have disabled either.
    act(() => {
      fireEvent.press(pdf);
      fireEvent.press(json);
    });
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    expect(mockPrintToFile).toHaveBeenCalledTimes(1);
    expect(mockGather).not.toHaveBeenCalled();
    // The latch is released: a later export starts normally.
    await waitFor(() => expect(api.getByTestId('export-data-button').props.accessibilityState.disabled).toBe(false));
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(2));
  });
});

describe('FEAT-806 F: logging', () => {
  it('logs the Error only, never the document or any of its content', async () => {
    mockShareAsync.mockRejectedValue(new Error('sheet failed to present'));
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(api.getByTestId('export-error')).toBeTruthy());

    // Other modules log through the same mock while the stores are seeded; judge this screen's.
    const screenCalls = mockLogError.mock.calls.filter((c) => String(c[1]).startsWith('[ExportData]'));
    expect(screenCalls.length).toBeGreaterThan(0);
    for (const call of screenCalls) {
      expect(call).toHaveLength(3);
      expect(call[2]).toBeInstanceOf(Error);
      expect(JSON.stringify(call)).not.toContain(SECRET_REFLECTION);
      expect(String(call[2].message)).not.toContain(SECRET_REFLECTION);
    }
  });
});

describe('FEAT-806 G: the PDF is bounded to the last 90 days', () => {
  it('leaves out a reflection older than the window and says so in the document', async () => {
    const OLD_REFLECTION = 'ZZOLDREFLECTIONZZ-outside-the-window';
    useStoicPracticeStore.setState({
      weeklyReflections: [
        ...useStoicPracticeStore.getState().weeklyReflections,
        {
          id: 'r-old',
          weekStartIso: ymd(Date.now() - 120 * DAY),
          text: OLD_REFLECTION,
          savedAt: new Date(Date.now() - 120 * DAY).toISOString(),
        },
      ],
    });
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    const { html } = mockPrintToFile.mock.calls[0][0] as { html: string };
    expect(html).toContain(SECRET_REFLECTION);
    expect(html).not.toContain(OLD_REFLECTION);
    expect(html).toContain(escapeHtml(PDF_WINDOW_OMISSION));
  });
});

describe('FEAT-806 H: busy copy before the main-thread render', () => {
  it('shows and announces the preparing copy before printToFileAsync is called', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AccessibilityInfo } = require('react-native');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    let busyAtRender: string | null = null;
    let announcedAtRender = false;
    let api!: ReturnType<typeof render>;
    mockPrintToFile.mockImplementation(async () => {
      busyAtRender = api.queryByTestId('export-pdf-busy')?.props.children ?? null;
      announcedAtRender = announce.mock.calls.some((c) => c[0] === PDF_PREPARING_COPY);
      mockDisk.set(PRINT_OUTPUT, true);
      return { uri: `file://${PRINT_OUTPUT}`, numberOfPages: 1 };
    });
    api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    expect(PDF_PREPARING_COPY).toBe('Preparing your PDF. This can take a few seconds.');
    expect(busyAtRender).toBe(PDF_PREPARING_COPY);
    expect(announcedAtRender).toBe(true);
  });

  it('removes the copy once the export settles, and never shows it for JSON', async () => {
    const api = render(<ExportDataScreen />);
    pressPdf(api);
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(api.queryByTestId('export-pdf-busy')).toBeNull());

    const sheet = deferred();
    mockShareAsync.mockReturnValue(sheet.promise);
    fireEvent.press(api.getByTestId('export-data-button'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(2));
    expect(api.queryByTestId('export-pdf-busy')).toBeNull();
    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });
  });
});
