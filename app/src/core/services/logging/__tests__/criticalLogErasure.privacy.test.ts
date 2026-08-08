/**
 * Critical-log erasure — proof of absence on the crisis logging path (DEBUG-355)
 *
 * WHY THIS TEST REPLACES `LogEncryption.test.ts`
 *
 * The suite this file supersedes did not merely fail to catch the defect — it
 * PINNED it. Its "Fallback on Encryption Failure" block asserted that when the
 * encryption service throws, `SecureStore.setItemAsync` is still called with the
 * entry serialized *in the clear*, and that the stored object has no `encrypted`
 * wrapper. That is the defect written down as a requirement, so the fix could not
 * be test-additive: the old assertions had to go, not be extended.
 *
 * THE DEFECT
 *
 * `ProductionLogger.storeCriticalEntry` wrote `critical_log_${Date.now()}` to
 * SecureStore for every entry with `level === 'ERROR'` OR
 * `category === LogCategory.CRISIS`. SecureStore has no enumerate API and the key
 * carried a timestamp, so the record matched no fixed erasure manifest and no
 * sweepable prefix: it was unerasable BY CONSTRUCTION. Account deletion could not
 * remove it, and neither could a launch-time sweeper, because nothing could learn
 * the key names.
 *
 * WHAT THE FIX WAS, AND WHY THIS SHAPE PROVES IT
 *
 * The write was deleted outright rather than re-keyed. The record was write-only:
 * `critical_log` appeared nowhere in the repo except the write and a cleanup that
 * searched the WRONG store (AsyncStorage) and so could never match. Nothing read
 * it back, so no debugging capability is lost — the surviving surfaces are the
 * in-memory `auditTrail` (1000 entries) and `console.error`, and this suite pins
 * that the first of those still holds the entry.
 *
 * Not Sentry: `ProductionLogger` has no bridge to it and never calls
 * `reportExternalError`, so a `logCrisis(...)` call has never reached Sentry.
 * Saying otherwise would overstate what remains after the deletion.
 *
 * The assertions below enumerate BOTH stores rather than asserting "the removed
 * function is not called". A call-count assertion would pass just as well if the
 * same write were reintroduced under a different name; enumerating every key that
 * actually exists cannot be fooled that way. The final test guards the guard.
 */

const mockSecureStore = new Map<string, string>();
const mockAsyncStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecureStore.set(k, v);
  }),
  getItemAsync: jest.fn(async (k: string) => mockSecureStore.get(k) ?? null),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecureStore.delete(k);
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const impl = {
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsyncStore.set(k, v);
    }),
    getItem: jest.fn(async (k: string) => mockAsyncStore.get(k) ?? null),
    removeItem: jest.fn(async (k: string) => {
      mockAsyncStore.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsyncStore.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsyncStore.delete(k));
    }),
  };
  return { __esModule: true, default: impl, ...impl };
});

import * as SecureStore from 'expo-secure-store';

import { ProductionLogger, LogCategory } from '../ProductionLogger';
import * as loggingIndex from '../index';

const logger = ProductionLogger.getInstance();

/** Let any (wrongly) un-awaited storage write settle before enumerating. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

beforeEach(async () => {
  mockSecureStore.clear();
  mockAsyncStore.clear();
  jest.clearAllMocks();
  await logger.clearAuditTrail();
});

describe('crisis-path logging persists nothing durable', () => {
  it('writes no SecureStore key at all for a crisis entry', async () => {
    logger.crisis('Crisis detected', { severity: 'high', detectionTime: 150 });
    await settle();

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect([...mockSecureStore.keys()]).toEqual([]);
  });

  it('writes no SecureStore key for ERROR-level security or error entries', async () => {
    // `security()` logs at ERROR (ProductionLogger:199) and production's log
    // level IS ERROR, so this is the highest-volume path into the old write —
    // `logSecurity` alone has hundreds of call sites across the app.
    logger.security('Security event', 'critical', { action: 'blocked' });
    logger.error(LogCategory.SYSTEM, 'Something failed');
    await settle();

    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect([...mockSecureStore.keys()]).toEqual([]);
  });

  it('leaves no critical_log_* key in EITHER store', async () => {
    // The original cleanup searched AsyncStorage for a key only ever written to
    // SecureStore. Enumerating both stores is what makes that class of
    // wrong-store mistake impossible to repeat silently.
    logger.crisis('Crisis detected', { severity: 'critical' });
    logger.security('Security event', 'high');
    logger.error(LogCategory.CRISIS, 'Crisis subsystem error');
    await settle();

    const allKeys = [...mockSecureStore.keys(), ...mockAsyncStore.keys()];
    expect(allKeys.filter((k) => k.startsWith('critical_log_'))).toEqual([]);
  });

  it('leaves no crisis message content anywhere on disk', async () => {
    logger.crisis('SENTINEL_CRISIS_MESSAGE', { severity: 'critical' });
    await settle();

    const dump = JSON.stringify([
      ...mockSecureStore.entries(),
      ...mockAsyncStore.entries(),
    ]);
    expect(dump).not.toContain('SENTINEL_CRISIS_MESSAGE');
  });

  it('proves the assertion can fail — a planted critical_log_ key IS detected', async () => {
    // Guards the guard. With both stores empty, every assertion above would
    // pass vacuously if enumeration silently stopped working. This plants the
    // exact defect shape and confirms the check rejects it.
    logger.crisis('Crisis detected', { severity: 'high' });
    await settle();
    mockSecureStore.set('critical_log_1700000000000', JSON.stringify({ message: 'x' }));

    const allKeys = [...mockSecureStore.keys(), ...mockAsyncStore.keys()];
    expect(allKeys.filter((k) => k.startsWith('critical_log_'))).toEqual([
      'critical_log_1700000000000',
    ]);
  });
});

describe('the in-memory audit trail remains the debugging surface', () => {
  it('still holds the crisis entry after logging', async () => {
    logger.crisis('Crisis detected', { severity: 'high', detectionTime: 150 });
    await settle();

    const trail = logger.getAuditTrail();
    const entry = trail.find((e) => e.message === 'Crisis detected');
    expect(entry).toBeDefined();
    expect(entry?.category).toBe(LogCategory.CRISIS);
    expect(entry?.level).toBe('ERROR');
  });

  it('still holds ERROR-level security entries', async () => {
    logger.security('Security event', 'critical', { action: 'blocked' });
    await settle();

    expect(
      logger.getAuditTrail().some((e) => e.message.includes('Security event'))
    ).toBe(true);
  });

  it('clearAuditTrail empties memory and touches neither store', async () => {
    logger.crisis('Crisis detected', { severity: 'high' });
    await settle();
    expect(logger.getAuditTrail().length).toBeGreaterThan(0);

    jest.clearAllMocks();
    await logger.clearAuditTrail();

    expect(logger.getAuditTrail()).toEqual([]);
    // The old implementation swept AsyncStorage for a SecureStore key — a
    // GDPR-commented cleanup that cleared the wrong store. It is gone, so no
    // enumeration happens at all.
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    expect(AsyncStorage.getAllKeys).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe('the crisis path stays synchronous, fire-and-forget and non-throwing', () => {
  it('returns synchronously — crisis detection has a strict <200ms budget', () => {
    const start = Date.now();
    logger.crisis('Performance probe', { severity: 'critical', detectionTime: 100 });
    expect(Date.now() - start).toBeLessThan(10);
  });

  it('does not throw when the underlying stores fail', () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error('keychain unavailable')
    );

    expect(() => logger.crisis('Crisis with failing store', { severity: 'high' })).not.toThrow();
    expect(() => logger.security('Security with failing store', 'critical')).not.toThrow();
  });
});

describe('the removed encryption tier cannot be re-armed', () => {
  it('exposes no log-encryption toggle on the public logging surface', () => {
    // The plaintext fallback lived inside a conditional encryption tier whose
    // enable path had ZERO callers, so `encryptionEnabled` was always false and
    // every record ever written took the plaintext branch. Removing the tier
    // removes the branch; keeping a dormant enable path would leave a way to
    // re-introduce the encrypt-or-store-in-the-clear shape.
    expect(loggingIndex).not.toHaveProperty('enableLogEncryption');
    expect(loggingIndex).not.toHaveProperty('disableLogEncryption');
    expect(logger).not.toHaveProperty('enableEncryption');
    expect(logger).not.toHaveProperty('disableEncryption');
  });
});
