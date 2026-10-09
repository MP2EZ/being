/**
 * crisisTapTrace — TERMINAL OUTCOME CONTRACT (DEBUG-596 AC3).
 *
 * WHY THIS FILE EXISTS
 * ====================
 * Before it, the only automated statement this repo made about its crisis-tap tracer
 * was that a tap produced NO screen and NO dial. Three suites press the real crisis
 * button (`CollapsibleCrisisButton.behavioral`, `crisis-button-telemetry-ordering`,
 * `crisisButtonGestureState.regression`); none closes the mark, so every run emitted
 * `deadline_exceeded` at HIGH severity — and that was the module's only observed
 * behaviour. Nothing imported `endCrisisTap` anywhere in either test root, so `emit()`
 * — the span, the budget branch, the audit record — had never executed under test.
 *
 * The coverage was not merely absent, it was INVERTED: the dropped-tap branch was
 * green on every run and the success branch was exercised by nothing.
 *
 * WHAT THIS PINS
 * ==============
 * Both directions, deliberately. A suite that only asserted the success path could go
 * green against a watchdog that had stopped firing entirely — so the dropped-tap case
 * below is the DEBUG-390 proof that the matcher can still go red, and it asserts the
 * exact payload, not merely that something was logged.
 *
 * WHAT IT DOES NOT PIN
 * ====================
 * Not a timing measurement. `performance.now` is stubbed, so these cases fix the
 * OUTCOME and SEVERITY a completed vs. dropped tap records — a contract, not a
 * latency. The real tap→render number is device-only and hand-read; no jest assertion
 * substitutes for it, and CLAUDE.md's Validation Matrix should not be read as though
 * one does.
 */

const mockLogSecurity = jest.fn();
const mockLogPerformance = jest.fn();
const mockLogError = jest.fn();

jest.mock('@/core/services/logging', () => ({
  logSecurity: (...args: unknown[]) => mockLogSecurity(...args),
  logPerformance: (...args: unknown[]) => mockLogPerformance(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
  LogCategory: { SECURITY: 'security', SYSTEM: 'system', PERFORMANCE: 'performance' },
}));

import {
  beginCrisisTap,
  endCrisisTap,
  __resetCrisisTapTraceForTests,
  CRISIS_TAP_BUDGET_MS,
  CRISIS_TAP_WATCHDOG_MS,
} from '../crisisTapTrace';

/**
 * `performance.now()` is read once by `begin()` and once by each terminal, so a queued
 * sequence fixes the elapsed time exactly. Stubbing the clock rather than advancing
 * fake timers keeps the budget branch independent of timer-mock internals.
 */
function stubClock(...readings: number[]): jest.SpyInstance {
  const spy = jest.spyOn(performance, 'now');
  readings.forEach((r) => spy.mockReturnValueOnce(r));
  spy.mockReturnValue(readings[readings.length - 1] ?? 0);
  return spy;
}

describe('crisisTapTrace — terminal outcome contract (DEBUG-596)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockLogSecurity.mockClear();
    mockLogPerformance.mockClear();
    mockLogError.mockClear();
  });

  afterEach(() => {
    __resetCrisisTapTraceForTests();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('the guard can still go red (DEBUG-390)', () => {
    it('a tap that never terminates DOES emit deadline_exceeded, with its exact payload', () => {
      stubClock(0, 5002);
      beginCrisisTap('crisis_button');

      // Nothing has been recorded while the tap is still open.
      expect(mockLogSecurity).not.toHaveBeenCalled();

      jest.advanceTimersByTime(CRISIS_TAP_WATCHDOG_MS + 1);

      expect(mockLogSecurity).toHaveBeenCalledTimes(1);
      expect(mockLogSecurity).toHaveBeenCalledWith(
        'Crisis button tap produced no screen or dial',
        'high',
        expect.objectContaining({
          outcome: 'deadline_exceeded',
          source: 'crisis_button',
          threshold: CRISIS_TAP_BUDGET_MS,
        }),
      );
      // A dropped tap is a SAFETY event, never a performance datapoint.
      expect(mockLogPerformance).not.toHaveBeenCalled();
    });
  });

  describe('a completed tap closes the mark and disarms the watchdog', () => {
    it('screen_commit within budget records a performance datapoint and no security event', () => {
      stubClock(0, 42);
      beginCrisisTap('crisis_button');
      endCrisisTap('screen_commit');

      expect(mockLogPerformance).toHaveBeenCalledTimes(1);
      expect(mockLogPerformance).toHaveBeenCalledWith('crisis_button_response', 42);
      expect(mockLogSecurity).not.toHaveBeenCalled();
    });

    it('and the watchdog NEVER fires afterwards — this is the AC2 contract', () => {
      stubClock(0, 42);
      beginCrisisTap('crisis_button');
      expect(jest.getTimerCount()).toBe(1);

      endCrisisTap('screen_commit');

      // THE DISARM ITSELF, read BEFORE any advance. Asserting only after advancing is
      // vacuous, and demonstrably so: the terminal nulls the single-flight slot first,
      // so a watchdog left scheduled fires into `if (!dropped) return` — silent — and
      // has already been consumed by the time the count is read. A mutation removing
      // `clearWatchdog(mark)` from endCrisisTap passed the post-advance form. That
      // surviving timer IS the leak shape this item exists to remove, so the count has
      // to be read here.
      expect(jest.getTimerCount()).toBe(0);

      jest.advanceTimersByTime(CRISIS_TAP_WATCHDOG_MS * 3);
      expect(mockLogSecurity).not.toHaveBeenCalled();
    });

    it('url_open is a terminal too — the OS taking the dial closes the mark', () => {
      stubClock(0, 88);
      beginCrisisTap('keyboard_accessory');
      endCrisisTap('url_open');

      jest.advanceTimersByTime(CRISIS_TAP_WATCHDOG_MS + 1);

      expect(mockLogPerformance).toHaveBeenCalledWith('crisis_button_response', 88);
      expect(mockLogSecurity).not.toHaveBeenCalled();
    });
  });

  describe('an over-budget tap is a security event, not a slow datapoint', () => {
    it('records the exceeded-budget event rather than logPerformance', () => {
      stubClock(0, CRISIS_TAP_BUDGET_MS + 51);
      beginCrisisTap('crisis_button');
      endCrisisTap('screen_commit');

      expect(mockLogSecurity).toHaveBeenCalledTimes(1);
      expect(mockLogSecurity).toHaveBeenCalledWith(
        'Crisis button response time exceeded',
        'high',
        expect.objectContaining({
          responseTime: CRISIS_TAP_BUDGET_MS + 51,
          threshold: CRISIS_TAP_BUDGET_MS,
        }),
      );
      expect(mockLogPerformance).not.toHaveBeenCalled();
    });
  });

  describe('single-flight', () => {
    it('a second begin() replaces the first: one timer, one deadline_exceeded', () => {
      stubClock(0, 10, 5002);
      beginCrisisTap('crisis_button');
      beginCrisisTap('keyboard_accessory');

      // The first mark's watchdog was cleared, not left running beside the second.
      expect(jest.getTimerCount()).toBe(1);

      jest.advanceTimersByTime(CRISIS_TAP_WATCHDOG_MS + 1);

      expect(mockLogSecurity).toHaveBeenCalledTimes(1);
      // The newer tap is the one the user is waiting on.
      expect(mockLogSecurity).toHaveBeenCalledWith(
        'Crisis button tap produced no screen or dial',
        'high',
        expect.objectContaining({ source: 'keyboard_accessory' }),
      );
    });
  });

  describe('end() with no open mark is a silent no-op', () => {
    it('emits nothing and does not throw', () => {
      // `openCrisisUrl` has callers that arrive after the commit already closed the
      // mark — a "Call Now" tap inside CrisisResourcesScreen. They must be unaffected.
      expect(() => endCrisisTap('url_open')).not.toThrow();

      expect(mockLogPerformance).not.toHaveBeenCalled();
      expect(mockLogSecurity).not.toHaveBeenCalled();
      expect(mockLogError).not.toHaveBeenCalled();
    });
  });
});
