/**
 * CRISIS BUTTON — TELEMETRY MUST NEVER GATE THE DIAL (INFRA-297)
 *
 * The invariant under test: on any crisis-button activation, the navigate-or-dial
 * call is the FIRST thing that happens, unconditionally, and no telemetry failure
 * can prevent it, delay it, or silence it.
 *
 * Why this file exists. Before INFRA-297, `handleCrisisAction` called `onNavigate()`
 * from INSIDE a `Sentry.startSpan(...)` callback. `startSpan` does real work before
 * it ever invokes that callback — async-context-strategy dispatch, a scope fork, a
 * sampling decision, span creation (see @sentry/core .../tracing/trace.js). If any
 * of it throws, the callback never runs, so **the crisis tap produces nothing at
 * all**: no navigation, no dial, and no log — because the audit call lived inside
 * the same callback. That is a false negative on a zero-false-negative path.
 *
 * Wrapping the span in try/catch does NOT fix it. That converts a visible crash
 * into a silently swallowed tap, which is worse. Hence the ordering assertions
 * below, not merely the occurrence ones: an occurrence-only test would pass a
 * try/catch non-fix. `onNavigate` must run BEFORE any telemetry call, not just
 * eventually.
 *
 * Gating: this file is deliberately named and placed to be picked up by BOTH
 * `npm run test:safety` (precommit, `__tests__/safety` pattern) and the CI
 * `crisis-validation` job (`[Cc]risis` pattern). A test no gate runs is decoration.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

/**
 * Shared call-order ledger. Every mocked telemetry entry point and the
 * `onNavigate` spy append to it, so ordering — not just occurrence — is
 * assertable.
 */
const callOrder: string[] = [];

const mockStartSpan = jest.fn();

jest.mock('@sentry/react-native', () => ({
  get startSpan() {
    return mockStartSpan;
  },
}));

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(() => {
    callOrder.push('logSecurity');
  }),
  logPerformance: jest.fn(() => {
    callOrder.push('logPerformance');
  }),
  logCrisis: jest.fn(() => {
    callOrder.push('logCrisis');
  }),
}));

import CollapsibleCrisisButton from '@/features/crisis/components/CollapsibleCrisisButton';

const TEST_ID = 'crisis-button-prominent';

/** Fresh spy that records into the shared ledger. */
function makeNavigateSpy(): jest.Mock {
  return jest.fn(() => {
    callOrder.push('onNavigate');
  });
}

function pressCrisisButton(onNavigate: jest.Mock): void {
  const { getByTestId } = render(
    <CollapsibleCrisisButton onNavigate={onNavigate} mode="prominent" testID={TEST_ID} />,
  );
  fireEvent.press(getByTestId(TEST_ID));
}

beforeEach(() => {
  callOrder.length = 0;
  jest.clearAllMocks();
  // Default: a well-behaved span that records its own position in the ledger.
  mockStartSpan.mockImplementation((_options: unknown, callback?: (span: unknown) => void) => {
    callOrder.push('startSpan');
    return callback?.({
      setAttribute: () => {
        callOrder.push('span.setAttribute');
      },
    });
  });
});

describe('INFRA-297 — the dial survives any telemetry failure', () => {
  test('startSpan THROWS → onNavigate still fires exactly once', () => {
    mockStartSpan.mockImplementation(() => {
      callOrder.push('startSpan');
      throw new Error('sentry exploded before invoking the callback');
    });

    const onNavigate = makeNavigateSpy();
    expect(() => pressCrisisButton(onNavigate)).not.toThrow();

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  test('startSpan returns WITHOUT invoking its callback → onNavigate still fires', () => {
    // The realistic shape of a sampling/scope failure: no throw, just a no-op.
    // This is the case a try/catch cannot possibly rescue.
    mockStartSpan.mockImplementation(() => {
      callOrder.push('startSpan');
      return undefined;
    });

    const onNavigate = makeNavigateSpy();
    pressCrisisButton(onNavigate);

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  test('span.setAttribute THROWS → onNavigate still fires and nothing escapes', () => {
    mockStartSpan.mockImplementation((_o: unknown, callback?: (span: unknown) => void) => {
      callOrder.push('startSpan');
      return callback?.({
        setAttribute: () => {
          throw new Error('setAttribute exploded');
        },
      });
    });

    const onNavigate = makeNavigateSpy();
    expect(() => pressCrisisButton(onNavigate)).not.toThrow();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  test('span is undefined → onNavigate still fires and nothing escapes', () => {
    mockStartSpan.mockImplementation((_o: unknown, callback?: (span: unknown) => void) => {
      callOrder.push('startSpan');
      return callback?.(undefined);
    });

    const onNavigate = makeNavigateSpy();
    expect(() => pressCrisisButton(onNavigate)).not.toThrow();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  test('Sentry module entirely absent (startSpan undefined) → onNavigate still fires', () => {
    mockStartSpan.mockImplementation(() => {
      throw new TypeError('Sentry.startSpan is not a function');
    });

    const onNavigate = makeNavigateSpy();
    expect(() => pressCrisisButton(onNavigate)).not.toThrow();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});

describe('INFRA-297 — ordering, not merely occurrence', () => {
  test('onNavigate runs BEFORE any telemetry call', () => {
    const onNavigate = makeNavigateSpy();
    pressCrisisButton(onNavigate);

    expect(callOrder).toContain('onNavigate');
    const navIdx = callOrder.indexOf('onNavigate');

    // Every telemetry entry that fired must come strictly after the navigate.
    // This is what a try/catch-around-the-span "fix" would fail.
    const telemetry = ['startSpan', 'span.setAttribute', 'logSecurity', 'logPerformance'];
    for (const entry of telemetry) {
      const idx = callOrder.indexOf(entry);
      if (idx === -1) continue;
      expect(idx).toBeGreaterThan(navIdx);
    }
  });

  test('onNavigate is the very first recorded call on the tap path', () => {
    const onNavigate = makeNavigateSpy();
    pressCrisisButton(onNavigate);

    expect(callOrder[0]).toBe('onNavigate');
  });

  test('a throwing telemetry path does not reorder or duplicate the navigate', () => {
    mockStartSpan.mockImplementation(() => {
      callOrder.push('startSpan');
      throw new Error('boom');
    });

    const onNavigate = makeNavigateSpy();
    pressCrisisButton(onNavigate);

    expect(callOrder[0]).toBe('onNavigate');
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
