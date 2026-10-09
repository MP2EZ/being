/**
 * Art. 9 write gate on the daily-loop resume session (FEAT-667, FEAT-318 slice C).
 *
 * The session blob carries the loop's typed beat answers. Founder ruling
 * 2026-09-29: a blocked save writes NOTHING (no envelope-only session, so the
 * resume modal never offers a hollow resume), `loading` skips without latching,
 * and once a session has been withheld it stays withheld until it ends — every
 * save rewrites the whole session, so a later permitted save would carry answers
 * typed while withheld. Reads and `clearSession` are never gated.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

import type { SeededWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

const mockDisk: Record<string, string> = {};
const mockCounts = { writes: 0, deletes: 0 };

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockDisk[key] ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockCounts.writes += 1;
    mockDisk[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockCounts.deletes += 1;
    delete mockDisk[key];
  }),
}));

// The cipher is not under test; a transparent envelope keeps the payload readable.
jest.mock('@/core/services/security/EncryptionService', () => ({
  __esModule: true,
  default: {
    encryptData: jest.fn(async (data: unknown) => ({ plaintext: data })),
    decryptData: jest.fn(async (pkg: { plaintext: unknown }) => pkg.plaintext),
  },
}));

type ServiceModule = typeof import('@/core/services/session/SessionStorageService');
let Service: ServiceModule['SessionStorageService'];
let seed: (state: SeededWellnessWriteConsent) => void;

const ANSWERS = { sessionData: { response: 'what is present' }, mode: 'flat', depth: 'quick' };

beforeEach(() => {
  for (const key of Object.keys(mockDisk)) delete mockDisk[key];
  mockCounts.writes = 0;
  mockCounts.deletes = 0;
  jest.resetModules();
  Service = require('@/core/services/session/SessionStorageService').SessionStorageService;
  seed = require('../helpers/wellnessWriteConsent').seedWellnessWriteConsent;
});

it('granted: the session is written', async () => {
  seed('granted');
  await Service.saveSession('daily-loop', 'AwarePresence', ANSWERS);
  expect(mockCounts.writes).toBe(1);
  expect((await Service.loadSession('daily-loop'))?.flowState).toEqual(ANSWERS);
});

it.each<SeededWellnessWriteConsent>(['refused', 'revoked', 'under_age', 'missing'])(
  'blocked (%s): nothing is written, not even an envelope',
  async (reason) => {
    seed(reason);
    await expect(Service.saveSession('daily-loop', 'AwarePresence', ANSWERS)).resolves.toBeUndefined();
    expect(mockCounts.writes).toBe(0);
    expect(await Service.loadSession('daily-loop')).toBeNull();
  },
);

it('a withheld session stays withheld after a re-grant, until it ends', async () => {
  seed('refused');
  await Service.saveSession('daily-loop', 'AwarePresence', ANSWERS);
  seed('granted');
  await Service.saveSession('daily-loop', 'RadicalAcceptance', ANSWERS);
  expect(mockCounts.writes).toBe(0);

  await Service.clearSession('daily-loop');
  await Service.saveSession('daily-loop', 'AwarePresence', ANSWERS);
  expect(mockCounts.writes).toBe(1);
});

it('loading skips without latching', async () => {
  seed('loading');
  await Service.saveSession('daily-loop', 'AwarePresence', ANSWERS);
  expect(mockCounts.writes).toBe(0);

  seed('granted');
  await Service.saveSession('daily-loop', 'RadicalAcceptance', ANSWERS);
  expect(mockCounts.writes).toBe(1);
});

it('reads and erasure are never gated', async () => {
  seed('granted');
  await Service.saveSession('daily-loop', 'AwarePresence', ANSWERS); // before withdrawal
  seed('refused');

  expect((await Service.loadSession('daily-loop'))?.currentScreen).toBe('AwarePresence');
  await Service.clearSession('daily-loop');
  expect(mockCounts.deletes).toBe(1);
  expect(await Service.loadSession('daily-loop')).toBeNull();
});
