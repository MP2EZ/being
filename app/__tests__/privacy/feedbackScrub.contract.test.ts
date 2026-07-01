/**
 * PRIVACY CONTRACT — FEAT-284 in-app bug/feedback reporting.
 *
 * The in-app "Report a bug / Send feedback" surface routes a user-authored
 * message to Sentry via `Sentry.captureFeedback`. CRITICAL SDK FACT verified in
 * @sentry/core@10.x: a `type:'feedback'` event does NOT pass through the
 * `beforeSend` hook (client.js runs beforeSend only when `event.type ===
 * undefined`). The existing allowlist/denylist scrub in ExternalErrorReporter
 * therefore never executes for feedback. This feature closes that gap with a
 * dedicated, drop-capable global event processor (`scrubFeedbackEvent`) plus a
 * pre-submit content guard.
 *
 * This test pins the outbound privacy contract and runs in `npm run precommit`
 * (via the `test:privacy` target) so a regression fails the commit before a
 * build is produced — mirroring the lsApplicationQueriesSchemes.config pin.
 *
 * @see docs/legal/dpia-sensitive-wellness-data.md §2 (Sentry: no wellness data)
 */

import {
  scrubFeedbackEvent,
  sanitizeFeedbackMessage,
  feedbackContainsCrisisContent,
} from '@/core/services/logging/ExternalErrorReporter';
import { __parseFlagsForTest } from '@/core/services/featureFlags';

/** A minimal feedback event shaped like what @sentry/core emits + merges. */
function makeFeedbackEvent(overrides: Record<string, unknown> = {}): any {
  return {
    type: 'feedback',
    event_id: 'abc123',
    release: '1.0.1',
    environment: 'production',
    platform: 'ios',
    // Scope data that prepareEvent merges onto EVERY event, feedback included:
    breadcrumbs: [
      { category: 'navigation', data: { to: 'PHQ9ResultsScreen' } },
      { category: 'console', message: 'user mood was 2' },
    ],
    user: { id: 'anon-uid-123', email: 'leaked@example.com', ip_address: '1.2.3.4' },
    extra: { lastAssessmentScore: 18 },
    tags: { screen: 'PHQ9ResultsScreen' },
    contexts: {
      feedback: { message: 'the button is broken', source: 'widget' },
      device: { name: "Max's iPhone", model: 'iPhone15,2' },
      os: { name: 'iOS', version: '17.0' },
    },
    ...overrides,
  };
}

describe('FEAT-284 feedback scrub — pre-submit content guard', () => {
  it('flags crisis / wellness content in the user message', () => {
    expect(feedbackContainsCrisisContent('I saw my phq9 score')).toBe(true);
    expect(feedbackContainsCrisisContent('the crisis button did nothing')).toBe(true);
    expect(feedbackContainsCrisisContent('gad7 results looked wrong')).toBe(true);
    expect(feedbackContainsCrisisContent('call 988 screen crashed')).toBe(true);
  });

  it('passes ordinary bug reports with no wellness terms', () => {
    expect(feedbackContainsCrisisContent('the home tab freezes on scroll')).toBe(false);
    expect(feedbackContainsCrisisContent('dark mode toggle does nothing')).toBe(false);
  });
});

describe('FEAT-284 feedback scrub — message sanitization', () => {
  it('redacts inline scores, emails, and tokens from the message', () => {
    expect(sanitizeFeedbackMessage('crashed at phq9: 18')).not.toMatch(/18/);
    expect(sanitizeFeedbackMessage('contact bob@secret.com')).not.toContain('bob@secret.com');
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abc123DEF456';
    expect(sanitizeFeedbackMessage(`token ${jwt}`)).not.toContain(jwt);
  });

  it('truncates to 500 characters (matches the reporter contract)', () => {
    // Spaced words so the contiguous-base64 pattern doesn't collapse the input.
    expect(sanitizeFeedbackMessage('the app is slow '.repeat(100))).toHaveLength(500);
  });

  it('never throws on non-string input', () => {
    // @ts-expect-error — exercising the fail-safe path
    expect(sanitizeFeedbackMessage(undefined)).toBe('');
  });
});

describe('FEAT-284 feedback event processor — outbound scope hygiene', () => {
  it('passes non-feedback events through untouched (beforeSend still owns them)', () => {
    const errorEvent = { type: undefined, message: 'boom', breadcrumbs: [{ x: 1 }] };
    expect(scrubFeedbackEvent(errorEvent)).toBe(errorEvent);
  });

  it('strips merged-scope breadcrumbs, extra, tags, and rich device context', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent());
    expect(out).not.toBeNull();
    expect(out.breadcrumbs).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.tags).toBeUndefined();
    // Only the feedback context survives — no device name / os / etc.
    expect(Object.keys(out.contexts)).toEqual(['feedback']);
    expect(out.contexts.device).toBeUndefined();
  });

  it('keeps ONLY the anonymous uid on user — never email / ip / username', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent());
    expect(out.user).toEqual({ id: 'anon-uid-123' });
    expect(out.user.email).toBeUndefined();
    expect(out.user.ip_address).toBeUndefined();
  });

  it('preserves release / environment / platform for triage', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent());
    expect(out.release).toBe('1.0.1');
    expect(out.environment).toBe('production');
    expect(out.platform).toBe('ios');
  });

  it('drops the entire event (null) when crisis content survives to the processor', () => {
    const evt = makeFeedbackEvent({
      contexts: { feedback: { message: 'my phq9 was 20 and I feel suicidal' } },
    });
    expect(scrubFeedbackEvent(evt)).toBeNull();
  });

  it('never links feedback to a prior (possibly wellness-context) error', () => {
    const evt = makeFeedbackEvent({
      contexts: { feedback: { message: 'ok', associated_event_id: 'deadbeef' } },
    });
    const out = scrubFeedbackEvent(evt);
    expect(out.contexts.feedback.associated_event_id).toBeUndefined();
  });

  it('fail-safe: returns null when scrubbing throws', () => {
    const hostile: any = { type: 'feedback' };
    Object.defineProperty(hostile, 'contexts', {
      get() {
        throw new Error('boom');
      },
    });
    expect(scrubFeedbackEvent(hostile)).toBeNull();
  });
});

describe('FEAT-284 build-time gate — bug_reporting flag', () => {
  it('is OFF for the App Store production flag blob (fail-closed)', () => {
    const prod = __parseFlagsForTest(
      'cloud_sync:false,emergency_sync:false,cross_device_sync:false,wellness_trend_notes:false,data_export:false,bug_reporting:false',
    );
    expect(prod['bug_reporting']).toBe(false);
  });

  it('is ON for internal (dev / preview) flag blobs', () => {
    const dev = __parseFlagsForTest('cloud_sync:true,bug_reporting:true');
    expect(dev['bug_reporting']).toBe(true);
  });

  it('defaults OFF when the key is absent (unknown flag → false)', () => {
    const none = __parseFlagsForTest('cloud_sync:true');
    expect(none['bug_reporting']).toBeUndefined();
  });
});
