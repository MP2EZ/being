/**
 * PRIVACY CONTRACT — FEAT-284 in-app bug/feedback reporting.
 *
 * The surface is Sentry's feedback widget (message + screenshot), triggered by
 * shake-to-report or the Profile entry, gated behind the build-time
 * `bug_reporting` flag (INTERNAL/TestFlight only; flipped OFF before the public
 * App Store launch). CRITICAL SDK FACT (verified in @sentry/core@10.x): a
 * `type:'feedback'` event does NOT pass through `beforeSend`, so a global event
 * processor (`scrubFeedbackEvent`) is the only place to touch the outbound
 * feedback event.
 *
 * Posture is deliberately useful (internal tool, owner's own data): the
 * screenshot is intentional, and breadcrumbs ride along because they are already
 * sanitized app-wide by `beforeBreadcrumbHook`. This contract pins the LIGHT
 * hygiene the processor still enforces — identity reduced to the anonymous uid,
 * no cross-linking to a prior error, and a pattern-scrub of the typed message —
 * and the flag mechanism. Runs in `npm run precommit` via `test:privacy`.
 *
 * @see docs/legal/dpia-sensitive-wellness-data.md §2 (Sentry)
 */

import {
  scrubFeedbackEvent,
  sanitizeFeedbackMessage,
} from '@/core/services/logging/ExternalErrorReporter';
import { __parseFlagsForTest } from '@/core/services/featureFlags';

/** A feedback event shaped like what the Sentry widget emits + merges. */
function makeFeedbackEvent(overrides: Record<string, unknown> = {}): any {
  return {
    type: 'feedback',
    event_id: 'abc123',
    release: '1.0.1',
    environment: 'production',
    platform: 'ios',
    breadcrumbs: [{ category: 'navigation', data: { to: 'HomeScreen' } }],
    user: { id: 'anon-uid-123', email: 'leaked@example.com', ip_address: '1.2.3.4' },
    contexts: {
      feedback: { message: 'the button is broken', source: 'widget' },
      device: { name: "Max's iPhone", model: 'iPhone15,2' },
    },
    ...overrides,
  };
}

describe('FEAT-284 feedback message sanitization', () => {
  it('redacts inline scores, emails, and tokens from the typed message', () => {
    expect(sanitizeFeedbackMessage('crashed at phq9: 18')).not.toMatch(/18/);
    expect(sanitizeFeedbackMessage('contact bob@secret.com')).not.toContain('bob@secret.com');
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abc123DEF456';
    expect(sanitizeFeedbackMessage(`token ${jwt}`)).not.toContain(jwt);
  });

  it('truncates to 500 characters', () => {
    expect(sanitizeFeedbackMessage('the app is slow '.repeat(100))).toHaveLength(500);
  });

  it('never throws on non-string input', () => {
    // @ts-expect-error — exercising the fail-safe path
    expect(sanitizeFeedbackMessage(undefined)).toBe('');
  });
});

describe('FEAT-284 feedback event processor — light hygiene', () => {
  it('passes non-feedback events through untouched (beforeSend still owns them)', () => {
    const errorEvent = { type: undefined, message: 'boom', breadcrumbs: [{ x: 1 }] };
    expect(scrubFeedbackEvent(errorEvent)).toBe(errorEvent);
  });

  it('keeps ONLY the anonymous uid on user — never email / ip / username', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent());
    expect(out.user).toEqual({ id: 'anon-uid-123' });
    expect(out.user.email).toBeUndefined();
    expect(out.user.ip_address).toBeUndefined();
  });

  it('pattern-scrubs the typed feedback message', () => {
    const out = scrubFeedbackEvent(
      makeFeedbackEvent({ contexts: { feedback: { message: 'saw phq9: 27 on screen' } } }),
    );
    expect(out.contexts.feedback.message).not.toMatch(/27/);
  });

  it('never cross-links feedback to a prior (possibly wellness-context) error', () => {
    const out = scrubFeedbackEvent(
      makeFeedbackEvent({
        contexts: { feedback: { message: 'ok', associated_event_id: 'deadbeef' } },
      }),
    );
    expect(out.contexts.feedback.associated_event_id).toBeUndefined();
  });

  it('KEEPS useful debugging context — breadcrumbs, device, release', () => {
    // Breadcrumbs are already sanitized app-wide by beforeBreadcrumbHook; they
    // and device/release are the trail a bug report needs, so we keep them.
    const out = scrubFeedbackEvent(makeFeedbackEvent());
    expect(out.breadcrumbs).toBeDefined();
    expect(out.contexts.device).toBeDefined();
    expect(out.release).toBe('1.0.1');
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
  it('is ON pre-launch (dev + production blobs ship it to TestFlight)', () => {
    const blob =
      'cloud_sync:false,emergency_sync:false,cross_device_sync:false,wellness_trend_notes:false,data_export:false,bug_reporting:true';
    expect(__parseFlagsForTest(blob)['bug_reporting']).toBe(true);
  });

  it('can be flipped OFF at launch (mechanism works both ways)', () => {
    expect(__parseFlagsForTest('bug_reporting:false')['bug_reporting']).toBe(false);
  });

  it('defaults OFF when the key is absent (unknown flag → false)', () => {
    expect(__parseFlagsForTest('cloud_sync:true')['bug_reporting']).toBeUndefined();
  });
});
