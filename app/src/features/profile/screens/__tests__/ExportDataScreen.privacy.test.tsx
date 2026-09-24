/**
 * ExportDataScreen — the plaintext export must not outlive its share (DEBUG-645).
 *
 * `handleExport` writes the complete portability envelope to the app cache as
 * plaintext JSON and hands it to the share sheet. Before DEBUG-645 nothing ever
 * deleted it, so an unencrypted copy of the user's wellness data sat in the app
 * container indefinitely and survived account deletion.
 *
 * CANCEL IS NOT A SEPARATE PATH. expo-sharing's `shareAsync` RESOLVES when the
 * user cancels, on both platforms (iOS SharingModule.swift completionWithItems-
 * Handler; Android SharingModule.kt onActivityResult) — it rejects only on a
 * setup error before the sheet appears. So a completed share and a cancelled one
 * are the same promise outcome, and one `finally` covers both. A test that
 * modelled "cancel" as a rejection would pin behaviour no device can produce.
 *
 * Pinned here, against a STATEFUL file mock so existence is observed, not
 * inferred:
 *   A. the file exists while the sheet is up and is gone once the share settles
 *      (the mid-flight check is what makes this non-vacuous);
 *   B. the sharing-unavailable early return also deletes it;
 *   C. a write failure after create also deletes it;
 *   D. a delete that throws is swallowed — no error state, nothing propagates.
 *      An unhandled rejection here could reach the ExternalErrorReporter surface,
 *      a known zero-affordance occluder (DEBUG-533);
 *   E. a failure before any file exists attempts no delete.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockGather = jest.fn();
const mockSerialize = jest.fn();
jest.mock('@/core/services/privacy/DataExportService', () => ({
  gatherExportData: (...a: unknown[]) => mockGather(...a),
  serializeExport: (...a: unknown[]) => mockSerialize(...a),
}));

/** Stateful stand-in for the app cache: name -> exists. */
const mockDisk = new Map<string, boolean>();
const mockFailWrite = { value: false };
const mockFailDelete = { value: false };
const mockCreated: string[] = [];
jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation((_dir: unknown, name: string) => ({
    uri: `file:///cache/${name}`,
    get exists() {
      return mockDisk.get(name) === true;
    },
    create: () => {
      mockDisk.set(name, true);
      mockCreated.push(name);
    },
    write: () => {
      if (mockFailWrite.value) throw new Error('disk full');
    },
    delete: () => {
      if (mockFailDelete.value) throw new Error('already removed');
      if (mockDisk.get(name) !== true) throw new Error('path does not exist');
      mockDisk.set(name, false);
    },
  })),
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

const mockLogError = jest.fn();
jest.mock('@/core/services/logging', () => ({
  ...jest.requireActual('@/core/services/logging'),
  logError: (...a: unknown[]) => mockLogError(...a),
}));

import ExportDataScreen from '../ExportDataScreen';

const exportedName = (): string => {
  expect(mockCreated).toHaveLength(1);
  return mockCreated[0];
};
const onDisk = (name: string): boolean => mockDisk.get(name) === true;

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('DEBUG-645: the exported file does not outlive its share', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDisk.clear();
    mockCreated.length = 0;
    mockFailWrite.value = false;
    mockFailDelete.value = false;
    mockGather.mockResolvedValue({ schemaVersion: '1' });
    mockSerialize.mockReturnValue('{"schemaVersion":"1"}');
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it('A. exists while the sheet is up, and is gone once the share settles (completed OR cancelled)', async () => {
    const sheet = deferred();
    mockShareAsync.mockReturnValue(sheet.promise);
    const { getByTestId, queryByTestId } = render(<ExportDataScreen />);

    fireEvent.press(getByTestId('export-data-button'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));

    // Non-vacuity: the file really was written and is still there mid-flight.
    const name = exportedName();
    expect(name).toMatch(/^being-export-\d{4}-\d{2}-\d{2}\.json$/);
    expect(onDisk(name)).toBe(true);

    await act(async () => {
      sheet.resolve();
      await sheet.promise;
    });

    await waitFor(() => expect(onDisk(name)).toBe(false));
    expect(queryByTestId('export-error')).toBeNull();
  });

  it('B. deletes it when sharing is unavailable (the early-return path)', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { getByTestId } = render(<ExportDataScreen />);

    fireEvent.press(getByTestId('export-data-button'));
    await waitFor(() => expect(getByTestId('export-error')).toBeTruthy());

    const name = exportedName();
    expect(onDisk(name)).toBe(false);
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('C. deletes it when the write fails after create', async () => {
    mockFailWrite.value = true;
    const { getByTestId } = render(<ExportDataScreen />);

    fireEvent.press(getByTestId('export-data-button'));
    await waitFor(() => expect(getByTestId('export-error')).toBeTruthy());

    expect(onDisk(exportedName())).toBe(false);
  });

  it('D. a delete that throws is swallowed: no error state, logged, nothing propagates', async () => {
    mockFailDelete.value = true;
    const { getByTestId, queryByTestId } = render(<ExportDataScreen />);

    fireEvent.press(getByTestId('export-data-button'));
    await waitFor(() => expect(mockShareAsync).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockLogError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('cleanup'),
        expect.any(Error),
      ),
    );

    expect(queryByTestId('export-error')).toBeNull();
    expect(getByTestId('export-data-button')).toBeTruthy();
  });

  it('E. a failure before any file exists attempts no delete', async () => {
    mockGather.mockRejectedValue(new Error('store unavailable'));
    const { getByTestId } = render(<ExportDataScreen />);

    fireEvent.press(getByTestId('export-data-button'));
    await waitFor(() => expect(getByTestId('export-error')).toBeTruthy());

    expect(mockCreated).toHaveLength(0);
    expect(mockLogError).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('cleanup'),
      expect.anything(),
    );
  });
});
