/**
 * ProductionLogger — production-branch behaviour (MAINT-748).
 *
 * The logger's environment is fixed at CONSTRUCTION (`getEnvironment()` runs in a
 * field initializer), so the production branch is only reachable by building a
 * fresh instance with `__DEV__` false and `NODE_ENV` set to 'production'. Under
 * jest's own settings every other test in the repo exercises the test branch.
 *
 * What is pinned here is what fails silently:
 *   • the audit trail is a bounded, memory-only buffer;
 *   • `crisis()` forwards an ALLOWLIST of context keys — scores, user ids and
 *     responses must be absent from the stored entry, not merely un-logged;
 *   • `crisis()` is emitted at ERROR so production's ERROR-only filter keeps it,
 *     and the console line carries the message only, never the context;
 *   • production warn / info / debug leave no console output and no trail entry.
 */

import { ProductionLogger, LogCategory } from '@/core/services/logging/ProductionLogger';

const globalWithDev = global as unknown as { __DEV__?: boolean };
const env = process.env as Record<string, string | undefined>;

let originalDev: boolean | undefined;
let originalNodeEnv: string | undefined;
let errorSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
let infoSpy: jest.SpyInstance;
let debugSpy: jest.SpyInstance;

/** A production-branch instance, built fresh through the static reset. */
function freshProductionLogger(): ProductionLogger {
  globalWithDev.__DEV__ = false;
  env.NODE_ENV = 'production';
  (ProductionLogger as unknown as { instance: ProductionLogger | undefined }).instance = undefined;
  return ProductionLogger.getInstance();
}

beforeEach(() => {
  originalDev = globalWithDev.__DEV__;
  originalNodeEnv = env.NODE_ENV;
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => {
  globalWithDev.__DEV__ = originalDev;
  if (originalNodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = originalNodeEnv;
  // Leave no production-branch singleton behind for the next suite's getInstance().
  (ProductionLogger as unknown as { instance: ProductionLogger | undefined }).instance = undefined;
  jest.restoreAllMocks();
});

describe('ProductionLogger · audit trail bound', () => {
  it('keeps at most 1000 entries and evicts the oldest first', () => {
    const logger = freshProductionLogger();

    for (let i = 1; i <= 1001; i += 1) {
      logger.error(LogCategory.SYSTEM, `probe-${i}`);
    }

    const trail = logger.getAuditTrail();
    expect(trail).toHaveLength(1000);
    expect(trail[0].message).toBe('probe-2');
    expect(trail[trail.length - 1].message).toBe('probe-1001');
    expect(trail.some((entry) => entry.message === 'probe-1')).toBe(false);
  });

  it('clearAuditTrail empties it', () => {
    const logger = freshProductionLogger();
    logger.error(LogCategory.SYSTEM, 'probe');
    expect(logger.getAuditTrail()).toHaveLength(1);

    logger.clearAuditTrail();

    expect(logger.getAuditTrail()).toEqual([]);
  });

  it('hands out a copy, so a caller cannot truncate the live trail', () => {
    const logger = freshProductionLogger();
    logger.error(LogCategory.SYSTEM, 'probe');

    logger.getAuditTrail().length = 0;

    expect(logger.getAuditTrail()).toHaveLength(1);
  });
});

describe('ProductionLogger · crisis()', () => {
  it('stores only the allowlisted context keys; scores, user ids and responses are absent', () => {
    const logger = freshProductionLogger();

    logger.crisis('crisis intervention displayed', {
      detectionTime: 12,
      interventionType: 'modal',
      severity: 'high',
      // Not in the declared type on purpose: a caller can still pass them at runtime.
      score: 22,
      userId: 'user-abc-123',
      responses: [3, 3, 3, 3],
    } as never);

    const [entry] = logger.getAuditTrail();
    expect(entry.category).toBe(LogCategory.CRISIS);
    expect(entry.level).toBe('ERROR');
    expect(Object.keys(entry.context).sort()).toEqual([
      'detectionTime',
      'interventionType',
      'sessionHash',
      'severity',
      'timestamp',
    ]);
    expect(entry.context).not.toHaveProperty('score');
    expect(entry.context).not.toHaveProperty('userId');
    expect(entry.context).not.toHaveProperty('responses');
    expect(JSON.stringify(entry)).not.toContain('user-abc-123');
  });

  it('is emitted at ERROR so production filtering keeps it, as "[crisis] <message>" with no context', () => {
    const logger = freshProductionLogger();

    logger.crisis('crisis intervention displayed', {
      detectionTime: 12,
      interventionType: 'modal',
      severity: 'high',
    });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    // Exactly one argument: the context is never printed to the console.
    expect(errorSpy.mock.calls[0]).toEqual(['[crisis] crisis intervention displayed']);
  });

  it('with no context stores no context object at all', () => {
    const logger = freshProductionLogger();

    logger.crisis('crisis intervention displayed');

    const [entry] = logger.getAuditTrail();
    expect(entry.context).toBeUndefined();
  });
});

describe('ProductionLogger · production level filter', () => {
  it('prints nothing and records nothing for warn, info and debug', () => {
    const logger = freshProductionLogger();

    logger.warn(LogCategory.SYSTEM, 'a warning');
    logger.info(LogCategory.SYSTEM, 'an info line');
    logger.debug(LogCategory.SYSTEM, 'a debug line');

    for (const spy of [errorSpy, logSpy, warnSpy, infoSpy, debugSpy]) {
      expect(spy).not.toHaveBeenCalled();
    }
    expect(logger.getAuditTrail()).toEqual([]);
  });

  it('still prints and records an error (the filter is not simply muting everything)', () => {
    const logger = freshProductionLogger();

    logger.error(LogCategory.SYSTEM, 'an error line');

    expect(errorSpy).toHaveBeenCalledWith('[system] an error line');
    expect(logger.getAuditTrail()).toHaveLength(1);
  });
});

describe('ProductionLogger · emergencyShutdown', () => {
  it('empties the trail, emits exactly one shutdown line, and does not throw', () => {
    const logger = freshProductionLogger();
    logger.error(LogCategory.SYSTEM, 'seed one');
    logger.error(LogCategory.SYSTEM, 'seed two');
    expect(logger.getAuditTrail()).toHaveLength(2);
    errorSpy.mockClear();

    expect(() => logger.emergencyShutdown('test shutdown')).not.toThrow();

    expect(logger.getAuditTrail()).toEqual([]);
    const shutdownLines = errorSpy.mock.calls.filter(
      ([line]) => typeof line === 'string' && line.includes('EMERGENCY LOGGER SHUTDOWN'),
    );
    expect(shutdownLines).toHaveLength(1);
    expect(shutdownLines[0][0]).toContain('test shutdown');
  });
});
