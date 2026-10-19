/**
 * PRIVACY CONTRACT — FEAT-284 in-app bug/feedback reporting.
 *
 * The surface is OUR OWN form since FEAT-570 (`core/components/BugReportOverlay`),
 * triggered by shake-to-report or the Profile entry, gated behind the build-time
 * `bug_reporting` flag (INTERNAL/TestFlight only; flipped OFF before the public
 * App Store launch). CRITICAL SDK FACT (verified in @sentry/core@10.x): a
 * `type:'feedback'` event does NOT pass through `beforeSend`, so a global event
 * processor (`scrubFeedbackEvent`) is the only place to touch the outbound
 * feedback event — which is why the transport swap to `captureFeedback()` left
 * this contract intact rather than bypassing it.
 *
 * **THERE IS NO LONGER A SCREENSHOT.** This docblock used to record that "the
 * screenshot is intentional" as part of a deliberately-useful posture. FEAT-570
 * dropped the capability outright: attachments ride the ENVELOPE rather than the
 * event, so the processor pinned here structurally cannot reach one, and the
 * surface is armed over `AssessmentFlow` and `VoiceReflectionScreen`. Message
 * text only. Breadcrumbs still ride along because they are already sanitized
 * app-wide by `beforeBreadcrumbHook`.
 *
 * This contract pins the LIGHT hygiene the processor enforces — no `user` and no
 * `device_app_hash` (DEBUG-797), no cross-linking to a prior error, and a
 * pattern-scrub of the typed message — and the flag mechanism. The submit path's own guarantees
 * (kill switch, payload shape, call-site scrub) are pinned separately in
 * `bugReportSubmit.contract.test.ts`. Runs in `npm run precommit` via
 * `test:privacy`.
 *
 * @see docs/legal/dpia-sensitive-wellness-data.md §2 (Sentry)
 */

import {
  ExternalErrorReporter,
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

  // DEBUG-797: with Crash Reports on, `user.id` is the Sentry installation UUID
  // (RNSentry.mm fills a nil native user with it; DeviceContext copies it in), so
  // keeping it joined a bug report to that install's crash events.
  it('drops user entirely — no installation id, email, ip or username', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent());
    expect(out.user).toBeUndefined();
    expect('user' in out).toBe(false);
  });

  it('drops user even when it carries an id alone', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent({ user: { id: 'INSTALL-UUID' } }));
    expect(out.user).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('INSTALL-UUID');
  });

  it('handles a feedback event with no user (the Crash-Reports-off path)', () => {
    const { user: _omit, ...noUser } = makeFeedbackEvent();
    const out = scrubFeedbackEvent(noUser);
    expect(out).not.toBeNull();
    expect(out.user).toBeUndefined();
    expect(out.contexts.feedback.message).toBe('the button is broken');
  });

  it('handles a feedback event with no contexts.feedback and still drops user', () => {
    const out = scrubFeedbackEvent(makeFeedbackEvent({ contexts: { device: { model: 'iPhone15,2' } } }));
    expect(out).not.toBeNull();
    expect(out.user).toBeUndefined();
    expect(out.contexts.device).toEqual({ model: 'iPhone15,2' });
  });

  // DEBUG-797 (compliance ruling): DeviceContext also merges the native `app`
  // context and tags, which on iOS carry `device_app_hash` — a vendor-derived
  // device identifier that survives reinstall. Same join key, same processor.
  it('drops the vendor-derived device_app_hash (context and tag), keeps the rest of contexts.app', () => {
    const out = scrubFeedbackEvent(
      makeFeedbackEvent({
        tags: { screen: 'Home', 'app.device': 'HASH-123' },
        contexts: {
          feedback: { message: 'ok' },
          app: { device_app_hash: 'HASH-123', app_version: '1.4.0', in_foreground: true },
        },
      }),
    );
    expect(out.contexts.app.device_app_hash).toBeUndefined();
    expect(out.tags['app.device']).toBeUndefined();
    expect(out.contexts.app).toEqual({ app_version: '1.4.0', in_foreground: true });
    expect(out.tags.screen).toBe('Home');
    expect(JSON.stringify(out)).not.toContain('HASH-123');
  });

  it('passes a non-feedback event carrying a user through byte-identical', () => {
    const errorEvent = { type: undefined, message: 'boom', user: { id: 'INSTALL-UUID' } };
    const before = JSON.stringify(errorEvent);
    expect(scrubFeedbackEvent(errorEvent)).toBe(errorEvent);
    expect(JSON.stringify(errorEvent)).toBe(before);
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

/**
 * DEBUG-797 AC3 — ordering against the REAL `@sentry/core` `prepareEvent`.
 *
 * Every other Sentry test here `jest.mock`s `@sentry/react-native`, so none of them
 * proves the scrub runs AFTER the processors that inject `user`. In @sentry/core
 * 10.37.0 `prepareEvent` applies scope data (scope `user`) first, then runs client
 * processors (RN's DeviceContext, which copies the native installation id), then
 * scope processors — where `Sentry.addEventProcessor` registers `scrubFeedbackEvent`
 * (isolation scope). Fresh `Scope` instances only: the global scope is not mutated.
 */
describe('DEBUG-797 · scrubFeedbackEvent runs after user injection (real prepareEvent)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { prepareEvent, Scope } = jest.requireActual('@sentry/core');

  function run(event: any, isolationScope: any, currentScope: any, client: any) {
    const options = { integrations: [], normalizeDepth: 3, normalizeMaxBreadth: 1000 };
    return prepareEvent(options, event, {}, currentScope, client, isolationScope);
  }

  function stubClient(injectedUser: Record<string, unknown>) {
    return {
      emit: () => undefined,
      // Stand-in for DeviceContext: copies the native user into the event.
      getEventProcessors: () => [(e: any) => ({ ...e, user: { ...injectedUser, ...e.user } })],
    };
  }

  it('strips a client-injected AND a scope user from a feedback event', async () => {
    const isolationScope = new Scope();
    isolationScope.addEventProcessor(scrubFeedbackEvent);
    const currentScope = new Scope();
    currentScope.setUser({ id: 'SCOPE-UUID', ip_address: '{{auto}}' });

    const out = await run(
      { type: 'feedback', contexts: { feedback: { message: 'it froze' } } },
      isolationScope,
      currentScope,
      stubClient({ id: 'INSTALL-UUID' }),
    );

    expect(out).not.toBeNull();
    expect(out.type).toBe('feedback');
    expect(out.user).toBeUndefined();
    const json = JSON.stringify(out);
    expect(json).not.toContain('INSTALL-UUID');
    expect(json).not.toContain('SCOPE-UUID');
  });

  it('control: without the scrub, the same pipeline DOES deliver user (the harness injects)', async () => {
    const currentScope = new Scope();
    currentScope.setUser({ id: 'SCOPE-UUID' });
    const out = await run(
      { type: 'feedback', contexts: { feedback: { message: 'it froze' } } },
      new Scope(),
      currentScope,
      stubClient({ id: 'INSTALL-UUID' }),
    );
    expect(out.user).toEqual({ id: 'SCOPE-UUID' });
  });

  it('leaves a non-feedback event user alone (crash/session events keep the disclosed id)', async () => {
    const isolationScope = new Scope();
    isolationScope.addEventProcessor(scrubFeedbackEvent);
    const out = await run({ message: 'boom' }, isolationScope, new Scope(), stubClient({ id: 'INSTALL-UUID' }));
    expect(out.user).toEqual({ id: 'INSTALL-UUID' });
  });
});

/**
 * DEBUG-797 AC4 — the reporter never ASKS for user data. A `sendDefaultPii: true`
 * or a `setUser` call would put identity on every event class, crash events
 * included, outside anything `scrubFeedbackEvent` reaches. Comments are stripped
 * first: this file names both in prose (DEBUG-390).
 */
describe('DEBUG-797 · ExternalErrorReporter sets no sendDefaultPii and calls no setUser', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path');
  const SRC = path.join(__dirname, '../../src/core/services/logging/ExternalErrorReporter.ts');

  function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  }

  const raw: string = fs.readFileSync(SRC, 'utf8');
  const code = stripComments(raw);

  it('slice is the real reporter (anchors on its Sentry.init and processor registration)', () => {
    expect(code).toMatch(/addEventProcessor\s*\(\s*scrubFeedbackEvent\s*\)/);
    expect(code).toMatch(/\.init\s*\(/);
  });

  it('never enables sendDefaultPii', () => {
    expect(code).not.toMatch(/sendDefaultPii\s*:\s*true/);
  });

  it('never calls setUser', () => {
    expect(code).not.toMatch(/\bsetUser\s*\(/);
  });

  it('the pattern fires on a positive sample (not vacuous)', () => {
    const sample = stripComments("Sentry.init({ sendDefaultPii: true }); scope.setUser({ id: 'x' }); // setUser(");
    expect(sample).toMatch(/sendDefaultPii\s*:\s*true/);
    expect(sample).toMatch(/\bsetUser\s*\(/);
    expect(stripComments('// Sentry.setUser({ id })')).not.toMatch(/\bsetUser\s*\(/);
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

describe('INFRA-561 · beforeBreadcrumbHook checks BOTH ends of a navigation breadcrumb', () => {
  /**
   * Driven directly: `beforeBreadcrumbHook` is private but depends on nothing
   * except `this.killed`, `isSensitiveRoute` and `sanitizeString` — no Sentry
   * module — so it needs no mock to exercise.
   *
   * Latent when written: nothing in the app emits a `category:'navigation'`
   * breadcrumb today, so this branch has never run in production. It is pinned
   * now because INFRA-561 moves the screen-name path from root routes to leaf
   * routes, and any future navigation-breadcrumb source would land on a hook
   * that only ever inspected one end of the trip.
   */
  function hook(breadcrumb: unknown): unknown {
    (ExternalErrorReporter as any).instance = undefined;
    const reporter = ExternalErrorReporter.getInstance();
    return (reporter as any).beforeBreadcrumbHook(breadcrumb);
  }

  it('drops a navigation breadcrumb whose DESTINATION is sensitive', () => {
    // Control. Already true before INFRA-561 — if this goes red the hook is
    // broken outright and the `from` case below proves nothing about `from`.
    expect(hook({ category: 'navigation', data: { from: 'Home', to: 'VoiceReflection' } })).toBeNull();
  });

  it('drops a navigation breadcrumb whose ORIGIN is sensitive', () => {
    // The gap. The hook read `data.to || message`, and the SDK's message is
    // `Navigation to <to>` — so neither path ever saw `data.from`. Leaving
    // VoiceReflection for Home kept the breadcrumb with the sensitive name on it.
    expect(hook({ category: 'navigation', data: { from: 'VoiceReflection', to: 'Home' } })).toBeNull();
  });

  it('KEEPS a navigation breadcrumb when NEITHER end is sensitive', () => {
    // Proves the two assertions above are not vacuous: a hook that dropped every
    // navigation breadcrumb would satisfy both of them and lose the whole trail.
    expect(hook({ category: 'navigation', data: { from: 'Home', to: 'Learn' } })).not.toBeNull();
  });
});
