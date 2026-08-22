/**
 * journalCrisisScan — unit specs (FEAT-283 Slice A, AC #4)
 *
 * The orchestration around `detectCrisisInText`: WHEN the scan fires, what
 * happens when the user edits between scans, and what reaches telemetry.
 *
 * The rules encoded here come from the crisis planning pass and are not
 * negotiable defaults — each one exists because the obvious alternative
 * produces a false negative.
 */

jest.mock('@/features/crisis/services/crisisAlert', () => ({
  showCrisisAlert: jest.fn(),
}));

jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { trackCrisisDetection: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SECURITY: 'SECURITY', SYSTEM: 'SYSTEM' },
}));

import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import SupabaseService from '@/core/services/supabase/SupabaseService';
import { logSecurity } from '@/core/services/logging';

import { JournalCrisisScanner, newJournalDraftId } from '../journalCrisisScan';

const mockAlert = showCrisisAlert as jest.Mock;
const mockTrack = (SupabaseService as unknown as { trackCrisisDetection: jest.Mock })
  .trackCrisisDetection;
const mockLogSecurity = logSecurity as jest.Mock;

const CRISIS_TEXT = 'i want to die';
const CLEAN_TEXT = 'today was hard but i made it through';

let scanner: JournalCrisisScanner;

beforeEach(() => {
  jest.clearAllMocks();
  scanner = new JournalCrisisScanner();
});

describe('scan points', () => {
  it('fires on transcript finalize', () => {
    const result = scanner.scanOnFinalize('draft-1', CRISIS_TEXT);

    expect(result.triggered).toBe(true);
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it('fires on save commit', () => {
    const result = scanner.scanOnSave('draft-1', CRISIS_TEXT);

    expect(result.triggered).toBe(true);
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });

  it('catches crisis language the user ADDS after a clean transcript', () => {
    // The edit field is a real text input. An edit can introduce language the
    // recognizer never produced, so save-time scanning is not redundant.
    expect(scanner.scanOnFinalize('draft-1', CLEAN_TEXT).triggered).toBe(false);

    const atSave = scanner.scanOnSave('draft-1', `${CLEAN_TEXT} and i want to die`);

    expect(atSave.triggered).toBe(true);
    expect(mockAlert).toHaveBeenCalledTimes(1);
  });
});

describe('one-way escalation', () => {
  it('does NOT retract an intervention when the user edits the language out', () => {
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    expect(mockAlert).toHaveBeenCalledTimes(1);

    const atSave = scanner.scanOnSave('draft-1', CLEAN_TEXT);

    // Already-surfaced support stays surfaced. Someone who speaks a
    // disclosure, reads it back and deletes it was still in crisis; treating
    // the edit as a retraction would be a false negative produced by the flow
    // rather than by the scanner.
    expect(atSave.interventionActive).toBe(true);
    expect(scanner.isInterventionActive('draft-1')).toBe(true);
  });

  it('keeps the intervention active when the draft is discarded', () => {
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);

    scanner.onDraftDiscarded('draft-1');

    expect(scanner.isInterventionActive('draft-1')).toBe(true);
  });
});

describe('deduplication', () => {
  it('surfaces exactly ONE alert per draft when both scans hit', async () => {
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    scanner.scanOnSave('draft-1', CRISIS_TEXT);
    await Promise.resolve();

    // The double-alert family of bug that MAINT-166 fixed and
    // q9-single-alert.yaml pins.
    expect(mockAlert).toHaveBeenCalledTimes(1);
    // DEBUG-504: the emission is gated by the same `alreadyActive` branch as the Alert, so
    // the suppressed half nobody was asserting is the one that matters most — a skipped
    // Alert is a degraded response, a skipped emission is an absent `crisis_detected` row.
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('treats a different draft as a separate episode', async () => {
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    scanner.scanOnFinalize('draft-2', CRISIS_TEXT);
    await Promise.resolve();

    expect(mockAlert).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenCalledTimes(2);
  });
});

describe('a second capture in one session (DEBUG-504)', () => {
  it('alerts and emits again for a new draft after the previous one was discarded', async () => {
    // The exact sequence the screen produces: disclose, discard, re-record, disclose. Same
    // words are not the same disclosure.
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    scanner.onDraftDiscarded('draft-1');
    scanner.scanOnFinalize('draft-2', CRISIS_TEXT);
    scanner.scanOnSave('draft-2', CRISIS_TEXT);
    await Promise.resolve();

    // Two disclosures, two responses — and the second capture's two scan points are still
    // ONE episode between them.
    expect(mockAlert).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenCalledTimes(2);

    // AC 3 is untouched: discarding the text still does not retract the disclosure.
    expect(scanner.isInterventionActive('draft-1')).toBe(true);
  });
});

describe('newJournalDraftId', () => {
  it('never repeats, even with the clock frozen', () => {
    // The guarantee is a process-monotonic counter, not the clock and not the RNG.
    // `__tests__/setup/quick-setup.js` mocks expo-crypto's getRandomBytes to a CONSTANT, so
    // a purely random id is deterministic under JEST_QUICK — a same-millisecond pair would
    // then collide in exactly the test written to prove it cannot.
    const now = jest.spyOn(Date, 'now').mockReturnValue(1);
    try {
      const ids = new Set(Array.from({ length: 1000 }, () => newJournalDraftId()));
      expect(ids.size).toBe(1000);
    } finally {
      now.mockRestore();
    }
  });

  it('is pure — minting an id does not touch scanner state', () => {
    // What keeps AC 3 true by construction: a new identity cannot clear an old one.
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    newJournalDraftId();

    expect(scanner.isInterventionActive('draft-1')).toBe(true);
  });
});

describe('telemetry payload', () => {
  it('emits only the four allow-listed fields', async () => {
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    await Promise.resolve();

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(Object.keys(mockTrack.mock.calls[0][0]).sort()).toEqual(
      ['assessment_type', 'intervention_surfaced', 'severity_bucket', 'trigger_type'].sort()
    );
  });

  it('never lets transcript content reach telemetry or logging', async () => {
    const transcript = 'the quarterly review went badly and i want to die about it';
    scanner.scanOnFinalize('draft-1', transcript);
    await Promise.resolve();

    const everything = JSON.stringify([
      mockTrack.mock.calls,
      mockLogSecurity.mock.calls,
    ]);
    expect(everything).not.toContain('quarterly');
    expect(everything).not.toContain('want to die');
    // Not even a length or an offset — each is a partial read of content.
    expect(everything).not.toContain(String(transcript.length));
  });

  it('uses a categorical trigger that does not identify the phrase', async () => {
    scanner.scanOnFinalize('a', 'suicidal');
    scanner.scanOnFinalize('b', 'no point living');
    await Promise.resolve();

    const [first] = mockTrack.mock.calls[0];
    const [second] = mockTrack.mock.calls[1];
    expect(first.trigger_type).toBe(second.trigger_type);
  });

  it('surfaces the alert BEFORE emitting telemetry', () => {
    const order: string[] = [];
    mockAlert.mockImplementation(() => order.push('alert'));
    mockTrack.mockImplementation(async () => {
      order.push('telemetry');
    });

    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);

    expect(order[0]).toBe('alert');
  });

  it('still surfaces the alert when telemetry throws', async () => {
    mockTrack.mockRejectedValue(new Error('offline'));

    expect(() => scanner.scanOnFinalize('draft-1', CRISIS_TEXT)).not.toThrow();
    expect(mockAlert).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });
});

describe('budget and failure handling', () => {
  it('logs a breach with the existing event string when the scan exceeds 200ms', () => {
    const slowScanner = new JournalCrisisScanner({
      now: (() => {
        const values = [0, 250];
        let i = 0;
        return () => values[Math.min(i++, values.length - 1)];
      })(),
    });

    slowScanner.scanOnFinalize('draft-1', CRISIS_TEXT);

    // Same string the assessment path emits, so log queries do not fork.
    expect(mockLogSecurity).toHaveBeenCalledWith(
      'Crisis detection time exceeded',
      'high',
      expect.objectContaining({ threshold: 200 })
    );
  });

  it('does not log a breach for a fast scan', () => {
    scanner.scanOnFinalize('draft-1', CRISIS_TEXT);
    expect(mockLogSecurity).not.toHaveBeenCalledWith(
      'Crisis detection time exceeded',
      expect.anything(),
      expect.anything()
    );
  });

  it('fails safe — an alert that throws does not break the save path', () => {
    mockAlert.mockImplementation(() => {
      throw new Error('Alert unavailable');
    });

    expect(() => scanner.scanOnSave('draft-1', CRISIS_TEXT)).not.toThrow();
  });

  it('reports triggered even if the alert throws, so the banner still renders', () => {
    mockAlert.mockImplementation(() => {
      throw new Error('Alert unavailable');
    });

    // The in-page banner is the durable affordance; a failed modal must not
    // take it down with it.
    expect(scanner.scanOnSave('draft-1', CRISIS_TEXT).triggered).toBe(true);
  });
});

describe('clean entries', () => {
  it('does nothing at all for a clean entry', async () => {
    const result = scanner.scanOnFinalize('draft-1', CLEAN_TEXT);
    await Promise.resolve();

    expect(result.triggered).toBe(false);
    expect(result.interventionActive).toBe(false);
    expect(mockAlert).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
