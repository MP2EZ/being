/**
 * FEAT-807 — the last-export record holds the day, the format and the exported scope,
 * nothing else; one key, overwritten; never rejects; logs carry no content.
 */
const mockStore = jest.fn();
const mockRetrieve = jest.fn();
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: (...args: unknown[]) => mockStore(...args),
    retrieveWellnessBlob: (...args: unknown[]) => mockRetrieve(...args),
  },
}));
const mockLogError = jest.fn();
jest.mock('@/core/services/logging', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
  LogCategory: { SYSTEM: 'SYSTEM' },
}));

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import {
  writeLastExportRecord,
  readLastExportRecord,
  lastExportPreparedCopy,
} from '../lastExportRecord';

const SCOPE = { preset: 'all' as const, categories: ['checkIns', 'assessments'] as never[] };

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.mockResolvedValue({ success: true });
});

describe('writeLastExportRecord', () => {
  it('stores exactly preparedAt, format and scope under one fixed key', async () => {
    const record = await writeLastExportRecord('pdf', SCOPE);
    expect(mockStore).toHaveBeenCalledTimes(1);
    const [key, data, level] = mockStore.mock.calls[0];
    expect(key).toBe('last_export_record_v1');
    expect(level).toBe('level_5_general_data');
    expect(Object.keys(data as object).sort()).toEqual(['format', 'preparedAt', 'scope']);
    expect(Object.keys((data as { scope: object }).scope).sort()).toEqual(['categories', 'preset']);
    expect(data).toEqual({ preparedAt: expect.any(Number), format: 'pdf', scope: SCOPE });
    expect(record).toEqual(data);
  });

  it('overwrites rather than accumulating: every write uses the same key', async () => {
    await writeLastExportRecord('json', SCOPE);
    await writeLastExportRecord('pdf', SCOPE);
    expect(new Set(mockStore.mock.calls.map((c) => c[0]))).toEqual(new Set(['last_export_record_v1']));
  });

  it('copies the categories, so a later mutation of the caller array cannot reach the record', async () => {
    const categories = ['checkIns'] as never[];
    const record = await writeLastExportRecord('json', { preset: 'all', categories });
    categories.push('reflections' as never);
    expect(record?.scope.categories).toEqual(['checkIns']);
  });

  it.each([
    ['an unsuccessful result', () => mockStore.mockResolvedValue({ success: false })],
    ['a rejection', () => mockStore.mockRejectedValue(new Error('wellness detail'))],
  ])('resolves null on %s and logs a content-free message', async (_label, arrange) => {
    arrange();
    await expect(writeLastExportRecord('json', SCOPE)).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalledWith('SYSTEM', '[LastExportRecord] write failed');
  });
});

describe('readLastExportRecord', () => {
  it('returns a stored record', async () => {
    const stored = { preparedAt: 1_760_000_000_000, format: 'json', scope: SCOPE };
    mockRetrieve.mockResolvedValue(stored);
    await expect(readLastExportRecord()).resolves.toEqual(stored);
    expect(mockRetrieve).toHaveBeenCalledWith('last_export_record_v1');
  });

  it('returns null with no log when nothing was ever stored', async () => {
    mockRetrieve.mockResolvedValue(null);
    await expect(readLastExportRecord()).resolves.toBeNull();
    expect(mockLogError).not.toHaveBeenCalled();
  });

  it.each([
    ['a non-object', () => mockRetrieve.mockResolvedValue('x')],
    ['an unknown format', () => mockRetrieve.mockResolvedValue({ preparedAt: 1, format: 'csv' })],
    ['a non-finite date', () => mockRetrieve.mockResolvedValue({ preparedAt: NaN, format: 'pdf' })],
    ['a rejection', () => mockRetrieve.mockRejectedValue(new Error('wellness detail'))],
  ])('returns null for %s, never rejecting, and logs no content', async (_label, arrange) => {
    arrange();
    await expect(readLastExportRecord()).resolves.toBeNull();
    expect(mockLogError).toHaveBeenCalledWith('SYSTEM', '[LastExportRecord] read failed');
  });
});

describe('lastExportPreparedCopy', () => {
  it('says "prepared" and claims no delivery or device-only storage', () => {
    const copy = lastExportPreparedCopy(Date.now());
    expect(copy).toMatch(/^Last export prepared: /);
    expect(copy).not.toMatch(/\b(saved|sent|shared|delivered)\b|on this device only/i);
  });

  it('is the approved copy, with the day only', () => {
    expect(lastExportPreparedCopy(new Date(2026, 9, 20, 23, 59).getTime())).toBe(
      "Last export prepared: Oct 20, 2026. Being keeps only this date, the format and the range " +
        "it covered — not the file, and not on Being's servers.",
    );
  });
});

describe('who reads the record', () => {
  const SRC = join(__dirname, '../../../..');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path);
      return /\.tsx?$/.test(name) ? [path] : [];
    });
  // DEBUG-390: comments name modules in prose, so strip them before matching.
  const code = (path: string) =>
    readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const IMPORT = /from\s+['"][^'"]*(services\/lastExportRecord|hooks\/useLastExportRecord)['"]/;

  it('is imported only by the two screens and the hook', () => {
    const importers = files(SRC)
      .filter((path) => IMPORT.test(code(path)))
      .map((path) => relative(SRC, path))
      .sort();
    expect(importers).toEqual([
      'features/data-export/hooks/useLastExportRecord.ts',
      'features/profile/screens/DeleteAccountScreen.tsx',
      'features/profile/screens/ExportDataScreen.tsx',
    ]);
  });
});
