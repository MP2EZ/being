/**
 * ExportDataScreen (FEAT-267) — accessibility + the export-to-share flow.
 * Pressing "Export as JSON" gathers + serializes the on-device data, writes a
 * JSON file, and opens the system share sheet.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockGather = jest.fn();
const mockSerialize = jest.fn();
jest.mock('@/core/services/privacy/DataExportService', () => ({
  gatherExportData: (...a: unknown[]) => mockGather(...a),
  serializeExport: (...a: unknown[]) => mockSerialize(...a),
}));

const mockWrite = jest.fn();
const mockCreate = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation(() => ({
    create: mockCreate,
    write: mockWrite,
    uri: 'file:///cache/being-export.json',
  })),
}));

const mockShareAsync = jest.fn();
const mockIsAvailable = jest.fn();
jest.mock('expo-sharing', () => ({
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
  isAvailableAsync: (...a: unknown[]) => mockIsAvailable(...a),
}));

import ExportDataScreen from '../ExportDataScreen';

describe('ExportDataScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGather.mockResolvedValue({ schemaVersion: '1' });
    mockSerialize.mockReturnValue('{"schemaVersion":"1"}');
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it('labels the export control for screen readers', () => {
    const { getByTestId } = render(<ExportDataScreen />);
    const button = getByTestId('export-data-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toMatch(/export as json/i);
  });

  it('discloses that encrypted server data is excluded', () => {
    const { getByText } = render(<ExportDataScreen />);
    expect(getByText(/encrypted/i)).toBeTruthy();
  });

  it('gathers, serializes, writes, and opens the share sheet on press', async () => {
    const { getByTestId } = render(<ExportDataScreen />);
    fireEvent.press(getByTestId('export-data-button'));

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());
    expect(mockGather).toHaveBeenCalled();
    expect(mockSerialize).toHaveBeenCalledWith({ schemaVersion: '1' });
    expect(mockWrite).toHaveBeenCalledWith('{"schemaVersion":"1"}');
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/being-export.json',
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  it('surfaces an error and does not throw when sharing is unavailable', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { getByTestId } = render(<ExportDataScreen />);
    fireEvent.press(getByTestId('export-data-button'));

    await waitFor(() => expect(getByTestId('export-error')).toBeTruthy());
    expect(mockShareAsync).not.toHaveBeenCalled();
  });
});
