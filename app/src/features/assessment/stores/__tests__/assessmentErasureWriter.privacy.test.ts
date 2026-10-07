/**
 * On-disk assessment erasure writer (FEAT-717 AC1, FEAT-665 slice A2a-ii). Unwired.
 *
 * Rulings carried from FEAT-665 (2026-10-03) and the 2026-10-05 panel:
 *   - reads disk with load()'s exact key, legacy key and options; never memory
 *   - read throws or the shape is unrecognised → zero writes, `read_failed`, one
 *     content-free high-severity logSecurity
 *   - absent → zero writes, `{ok: true, wrote: false}`
 *   - otherwise writes the envelope `{state, version}` at persist's version, deleting
 *     only what the op names; a failed store → `write_failed`
 *   - no logAccess
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');

const mockDisk: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockDisk[key] = data;
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockDisk[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => {
      delete mockDisk[key];
    }),
  },
}));

const mockLogSecurity = jest.fn();
jest.mock('@/core/services/logging', () => ({
  ...jest.requireActual('@/core/services/logging'),
  logSecurity: (...args: unknown[]) => mockLogSecurity(...args),
}));

import SecureStorageService from '@/core/services/security/SecureStorageService';
import { useAssessmentStore, writeAssessmentErasure } from '../assessmentStore';
import type { AssessmentSession } from '../../types/index';

const mockStore = SecureStorageService.storeWellnessBlob as jest.Mock;
const mockRetrieve = SecureStorageService.retrieveWellnessBlob as jest.Mock;

const KEY = 'assessment_store';

const session = (id: string, extra: Partial<AssessmentSession> = {}): AssessmentSession => ({
  id,
  type: 'phq9',
  context: 'standalone',
  progress: { type: 'phq9', currentQuestionIndex: 0, totalQuestions: 9, startedAt: 1, answers: [], isComplete: false },
  ...extra,
});

const diskState = () => ({
  completedAssessments: [session('disk-a', { note: 'on disk' }), session('disk-b')],
  currentSession: session('disk-live'),
  answers: [{ questionId: 'phq9_1', response: 2, timestamp: 5 }],
  currentQuestionIndex: 1,
  autoSaveEnabled: false,
});

/** Let persist's own setItem from a setState settle before the test clears the mocks. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  // Memory deliberately disagrees with disk, so a write built from memory is visible.
  useAssessmentStore.setState({
    completedAssessments: [session('memory-only', { note: 'in memory' })],
    currentSession: session('memory-live'),
  });
  await flush();
  for (const k of Object.keys(mockDisk)) delete mockDisk[k];
  jest.clearAllMocks();
});

const written = () => {
  expect(mockStore).toHaveBeenCalledTimes(1);
  const [key, data, level] = mockStore.mock.calls[0]!;
  expect(key).toBe(KEY);
  expect(level).toBe('level_2_assessment_data');
  return data as { state: Record<string, unknown>; version: number };
};

describe('reads disk exactly as load() does, never memory', () => {
  it('passes load()\'s key, legacy key and options to retrieveWellnessBlob', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    await writeAssessmentErasure({ kind: 'clear_history' });
    expect(mockRetrieve).toHaveBeenCalledTimes(1);
    expect(mockRetrieve).toHaveBeenCalledWith(KEY, 'assessment_store_encrypted', {
      legacyFormat: 'plaintext_json',
      sensitivityLevel: 'level_2_assessment_data',
    });
  });

  it('the write is built from disk: memory-only sessions never appear', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    const result = await writeAssessmentErasure({ kind: 'clear_session_note', sessionId: 'disk-a' });
    expect(result).toEqual({ ok: true, wrote: true });
    expect(JSON.stringify(written())).not.toMatch(/memory-only|memory-live|in memory/);
  });

  it('source pin: applyErasure never reads the store or calls load()', () => {
    const source = readFileSync(join(__dirname, '../assessmentStore.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const start = source.indexOf('static async applyErasure(');
    const end = source.indexOf('private static erasureFailed(', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);
    const MEMORY_READ = /\bget\(\)|\bgetState\(|\.load\(|\bthis\.load\b/;
    // Positive controls (DEBUG-390): the slice is the real method, and the matcher fires
    // on the store code that does read memory and load().
    expect(body).toMatch(/retrieveWellnessBlob/);
    expect(body).toMatch(/storeWellnessBlob/);
    expect(source).toMatch(MEMORY_READ);
    expect('const state = get();').toMatch(MEMORY_READ);
    expect(body).not.toMatch(MEMORY_READ);
  });
});

describe('each op deletes only what it names, on either shape', () => {
  it('envelope + clear_history: completedAssessments emptied, everything else untouched', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    await writeAssessmentErasure({ kind: 'clear_history' });
    expect(written()).toEqual({ state: { ...diskState(), completedAssessments: [] }, version: 0 });
  });

  it('flat + clear_session_note: rewritten as the envelope, note omitted on the match only', async () => {
    const { autoSaveEnabled: _a, ...flat } = diskState();
    mockDisk[KEY] = { ...flat, lastSavedAt: 77 };
    await writeAssessmentErasure({ kind: 'clear_session_note', sessionId: 'disk-a' });
    const out = written();
    expect(out.version).toBe(0);
    expect(out.state).toEqual({
      ...flat,
      lastSavedAt: 77,
      completedAssessments: [session('disk-a'), session('disk-b')],
    });
    const [a] = out.state['completedAssessments'] as AssessmentSession[];
    expect(Object.prototype.hasOwnProperty.call(a, 'note')).toBe(false);
  });

  it('reset_current_session: session nulled, answers emptied, index rewound', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    await writeAssessmentErasure({ kind: 'reset_current_session' });
    expect(written().state).toEqual({ ...diskState(), currentSession: null, answers: [], currentQuestionIndex: 0 });
  });

  it('writes at persist\'s configured version, looked up at call time', async () => {
    const spy = jest
      .spyOn(useAssessmentStore.persist, 'getOptions')
      .mockReturnValue({ ...useAssessmentStore.persist.getOptions(), version: 3 });
    try {
      mockDisk[KEY] = { state: diskState(), version: 3 };
      await writeAssessmentErasure({ kind: 'clear_history' });
      expect(written().version).toBe(3);
    } finally {
      spy.mockRestore();
    }
  });

  it('defaults the version to 0 when persist has none configured', async () => {
    const options = useAssessmentStore.persist.getOptions();
    const { version: _v, ...withoutVersion } = options;
    const spy = jest.spyOn(useAssessmentStore.persist, 'getOptions').mockReturnValue(withoutVersion);
    try {
      mockDisk[KEY] = { state: diskState(), version: 0 };
      await writeAssessmentErasure({ kind: 'clear_history' });
      expect(written().version).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('makes no logAccess write and logs nothing on success', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    await writeAssessmentErasure({ kind: 'clear_history' });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockLogSecurity).not.toHaveBeenCalled();
  });
});

describe('zero writes when disk cannot be trusted', () => {
  const expectContentFreeLog = (reason: string, secret?: string) => {
    expect(mockLogSecurity).toHaveBeenCalledTimes(1);
    const [, severity, context] = mockLogSecurity.mock.calls[0]!;
    expect(severity).toBe('high');
    expect(context).toEqual({
      component: 'EncryptedAssessmentStorage',
      action: 'applyErasure',
      result: 'failure',
      reason,
    });
    if (secret) expect(JSON.stringify(mockLogSecurity.mock.calls)).not.toContain(secret);
  };

  it('a throwing read → read_failed, no write, content-free log', async () => {
    mockRetrieve.mockRejectedValueOnce(new Error('decrypt failed for disk-a SECRET'));
    const result = await writeAssessmentErasure({ kind: 'clear_history' });
    expect(result).toEqual({ ok: false, reason: 'read_failed' });
    expect(mockStore).not.toHaveBeenCalled();
    expectContentFreeLog('read_failed', 'SECRET');
  });

  it('an absent blob → success with zero writes and no log', async () => {
    const result = await writeAssessmentErasure({ kind: 'clear_history' });
    expect(result).toEqual({ ok: true, wrote: false });
    expect(mockStore).not.toHaveBeenCalled();
    expect(mockLogSecurity).not.toHaveBeenCalled();
  });

  it.each<[string, unknown]>([
    ['an array', [diskState()]],
    ['a string', 'assessment'],
    ['an envelope with a non-object state', { state: 'x', version: 0 }],
    ['a flat blob with malformed history', { completedAssessments: 'all of it' }],
  ])('an unrecognised shape (%s) → read_failed, no write', async (_label, raw) => {
    mockDisk[KEY] = raw;
    const result = await writeAssessmentErasure({ kind: 'clear_history' });
    expect(result).toEqual({ ok: false, reason: 'read_failed' });
    expect(mockStore).not.toHaveBeenCalled();
    expectContentFreeLog('read_failed');
  });

  it('a store that reports failure → write_failed, content-free log', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    mockStore.mockResolvedValueOnce({ success: false, error: 'disk full near disk-a SECRET' });
    const result = await writeAssessmentErasure({ kind: 'clear_history' });
    expect(result).toEqual({ ok: false, reason: 'write_failed' });
    expectContentFreeLog('write_failed', 'SECRET');
  });

  it('a store that throws → write_failed, never a rejected promise', async () => {
    mockDisk[KEY] = { state: diskState(), version: 0 };
    mockStore.mockRejectedValueOnce(new Error('SECRET'));
    await expect(writeAssessmentErasure({ kind: 'clear_history' })).resolves.toEqual({ ok: false, reason: 'write_failed' });
    expectContentFreeLog('write_failed', 'SECRET');
  });
});
