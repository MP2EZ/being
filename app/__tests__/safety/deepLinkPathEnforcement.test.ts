/**
 * DEEP LINK PATH ALLOWLIST ENFORCEMENT — DEBUG-636
 *
 * `DEEP_LINK_CONFIG.ALLOWED_PATHS` was advisory: an `isAllowedPath` miss pushed
 * `DISALLOWED_PATH` at severity `medium`, and `hasBlockingErrors` only trips on
 * critical/high, so every unlisted path validated and navigated wherever
 * `config.screens` resolved it. The depth and per-segment charset checks inside
 * `isAllowedPath` were dead for the same reason.
 *
 * Pinned here:
 *  - an unlisted path is blocked, and the error stays `medium` (a benign link is
 *    not an attack);
 *  - attack-class detection runs strictly AHEAD of the block, so traversal keeps
 *    `attack_detected` and its metric;
 *  - the crisis subtree skips only depth + charset, never attack detection
 *    (linking.ts promises `crisis/*` routes inherit the exemption);
 *  - rate limiting still returns before path validation, so a rate-limited crisis
 *    URL carries exactly one error code — `isRateLimitedCrisisIntent` needs that;
 *  - a blocked path logs no URL content, pre-consent included.
 */

import { linkingConfig, CRISIS_PATH_SEGMENT } from '@/core/navigation/linking';
import { useConsentStore } from '@/core/stores/consentStore';
import DeepLinkValidationService, {
  pathForSecurityLog,
} from '@/core/services/security/DeepLinkValidationService';
import { logSecurity } from '@/core/services/logging';
import * as Linking from 'expo-linking';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `being://${path.replace(/^\//, '')}`),
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SECURITY: 'security' },
}));

const mockLogSecurity = logSecurity as jest.Mock;
const mockGetInitialURL = Linking.getInitialURL as jest.Mock;
const mockAddEventListener = Linking.addEventListener as jest.Mock;

const validate = (url: string) => DeepLinkValidationService.validateDeepLink(url);
const codesOf = (url: string) => validate(url).errors.map((e) => e.code);

/** Blocked by the path allowlist and by nothing else. */
function expectPathBlocked(url: string) {
  const result = validate(url);
  expect(result.isValid).toBe(false);
  expect(result.errors.map((e) => e.code)).toEqual(['DISALLOWED_PATH']);
}

const getInitialURL = () =>
  (linkingConfig.getInitialURL as () => Promise<string | null>)();

function fireRuntimeUrl(url: string): string[] {
  const delivered: string[] = [];
  let handler: ((event: { url: string }) => void) | undefined;
  mockAddEventListener.mockImplementation((_event: string, cb: typeof handler) => {
    handler = cb;
    return { remove: jest.fn() };
  });
  const unsubscribe = (linkingConfig.subscribe as (
    listener: (url: string) => void,
  ) => () => void)((u: string) => delivered.push(u));
  handler?.({ url });
  unsubscribe();
  return delivered;
}

function setConsent(granted: boolean) {
  useConsentStore.setState({
    consentStatus: granted ? 'valid' : 'missing',
    consentCache: {
      canCollectAnalytics: false,
      canCollectCrashReports: false,
      canSyncToCloud: false,
      canParticipateInResearch: false,
      canProcessMentalHealthData: granted,
      honorUniversalOptOut: false,
      ageVerified: granted,
      isEligible: granted,
      cacheTimestamp: Date.now(),
    },
  });
}

/** React Navigation's resolver as linking.ts wires it (consumes the DEBUG-372 flag). */
const parse = (path: string) =>
  (linkingConfig.getStateFromPath as NonNullable<typeof linkingConfig.getStateFromPath>)(
    path,
    linkingConfig.config,
  );

/** Trip the shared 30/min limiter so the next validation is rate-limited. */
function tripRateLimit() {
  for (let i = 0; i < 30; i++) validate('being://daily');
}

/** Everything any logSecurity call carried, as one string. */
const loggedText = () => JSON.stringify(mockLogSecurity.mock.calls);

/** A path no ruling will ever allowlist, with URL content that must never be logged. */
const SECRET_BEARING_URL = 'being://totallybogusxx/secretseg?source=secretparam';

beforeEach(() => {
  jest.clearAllMocks();
  // Shared singleton, 30/min: reset or later cases read RATE_LIMIT_EXCEEDED.
  DeepLinkValidationService.clearSecurityEvents();
});

describe('DEBUG-636: an unlisted path is blocked', () => {
  it.each([
    'being://totallybogusxx',
    'https://being.fyi/totallybogusxx',
    'https://www.being.fyi/totallybogusxx',
    // Published by being-website but served by no screen (DEBUG-649's fixture).
    'https://being.fyi/privacy',
  ])('%s → isValid:false with exactly DISALLOWED_PATH', (url) => {
    expectPathBlocked(url);
    expect(validate(url).sanitizedUrl).toBeNull();
  });

  it('keeps DISALLOWED_PATH at severity medium — a benign link is not an attack', () => {
    const result = validate('being://totallybogusxx');
    expect(result.errors).toEqual([expect.objectContaining({ code: 'DISALLOWED_PATH', severity: 'medium' })]);
    expect(DeepLinkValidationService.getSecurityMetrics().attacksDetected).toBe(0);
  });

  // Controls: the block must not pass by rejecting everything.
  it.each([
    'being://daily',
    'being://crisis',
    'being://assessment/PHQ9',
    'being://module/stoic-basics',
    'being://practice/probe',
    'being://subscription',
    'being://subscription/status',
    'https://being.fyi/crisis',
  ])('%s (allowlisted) still validates', (url) => {
    const result = validate(url);
    expect(result.errors.map((e) => e.code)).not.toContain('DISALLOWED_PATH');
    expect(result.isValid).toBe(true);
  });
});

describe('DEBUG-636: the structural checks are live for non-crisis paths', () => {
  it('rejects a path deeper than 3 segments', () => {
    expectPathBlocked('being://module/a/b/c');
  });

  it('accepts exactly 3 segments (boundary control)', () => {
    expect(validate('being://module/a/b').isValid).toBe(true);
  });

  it.each([
    ['a dot', 'being://module/a.b'],
    ['a percent-encoded non-ASCII segment', 'being://module/r%C3%A9sum%C3%A9'],
    ['a 65-char segment', `being://module/${'a'.repeat(65)}`],
  ])('rejects a sub-segment with %s', (_label, url) => {
    expectPathBlocked(url);
  });

  it('accepts a 64-char [A-Za-z0-9_-] segment (boundary control)', () => {
    expect(validate(`being://module/${'a'.repeat(62)}_-`).isValid).toBe(true);
  });

  it('checks depth on non-crisis allowlisted roots too', () => {
    expectPathBlocked('being://daily/a/b/c');
  });
});

describe('DEBUG-636: the crisis subtree skips depth and charset only (AC4)', () => {
  it.each([
    'being://crisis/a/b/c/d',
    'being://crisis/a.b',
    'being://crisis/safety-plan',
    'being://crisis/',
    'https://being.fyi/crisis/w/x/y/z',
  ])('%s validates', (url) => {
    const result = validate(url);
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('matches the segment linking.ts routes crisis through (no import: linking.ts imports the service)', () => {
    const result = validate(`being://${CRISIS_PATH_SEGMENT}/a/b/c/d`);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // Exact and case-sensitive by ruling: the resolver is case-sensitive too, so
  // none of these ever reached CrisisResources — blocking them costs no 988 path.
  it.each(['being://crisisx/a/b/c/d', 'being://CRISIS/a', 'being://Crisis', 'being://%63risis'])(
    '%s gets no carve-out',
    (url) => {
      expectPathBlocked(url);
    },
  );

  it.each([
    ['path command injection', 'being://crisis/a;b', 'COMMAND_INJECTION_DETECTED'],
    ['param XSS', 'being://crisis?source=<script>alert(1)</script>', 'XSS_DETECTED'],
    ['original-URL traversal', 'being://crisis/../../etc/passwd', 'PATH_TRAVERSAL_DETECTED'],
    ['encoded traversal', 'being://crisis/..%2fbodyscan', 'PATH_TRAVERSAL_DETECTED'],
  ])('attack detection still blocks on the crisis subtree (%s)', (_label, url, code) => {
    const result = validate(url);
    expect(result.isValid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain(code);
  });

  // After the carve-out, a crisis-subtree URL can be invalid only for an attack,
  // a size/format limit, or the rate limit (which has its own fallback) — never
  // for the allowlist.
  it.each([
    'being://crisis',
    'being://crisis/a/b/c/d/e/f',
    `being://crisis/${'x'.repeat(200)}`,
    'being://crisis/r%C3%A9sum%C3%A9',
    'being://crisis/a;b',
    'https://being.fyi/crisis/..%2fbodyscan',
  ])('%s is never blocked as DISALLOWED_PATH', (url) => {
    expect(codesOf(url)).not.toContain('DISALLOWED_PATH');
  });
});

describe('DEBUG-636: attack detection runs ahead of the path block', () => {
  it('traversal stays attack_detected, logged critical, and counted', () => {
    const result = validate('being://../../etc/passwd');
    expect(result.isValid).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('PATH_TRAVERSAL_DETECTED');
    expect(DeepLinkValidationService.getSecurityMetrics().attacksDetected).toBe(1);
    expect(mockLogSecurity).toHaveBeenCalledWith(
      'DeepLinkValidation: Attack detected',
      'critical',
      expect.any(Object),
    );
  });

  it('an unlisted path carrying an injection is still an attack, not a medium block', () => {
    validate("being://totallybogusxx?moduleId=' OR 1=1--");
    expect(DeepLinkValidationService.getSecurityMetrics().attacksDetected).toBe(1);
  });
});

describe('DEBUG-636: rate limiting still returns before path validation', () => {
  it.each(['being://crisis', 'being://crisis/a/b/c/d', 'being://totallybogusxx', 'being://bodyscan'])(
    'a rate-limited %s carries exactly RATE_LIMIT_EXCEEDED',
    (url) => {
      tripRateLimit();
      expect(codesOf(url)).toEqual(['RATE_LIMIT_EXCEEDED']);
    },
  );

  // isRateLimitedCrisisIntent needs RATE_LIMIT_EXCEEDED to be the ONLY code.
  it('cold start: a rate-limited crisis sub-path delivers exactly the crisis fallback', async () => {
    setConsent(false);
    tripRateLimit();
    mockGetInitialURL.mockResolvedValue('being://crisis/a/b/c/d');
    await expect(getInitialURL()).resolves.toBe(`being://${CRISIS_PATH_SEGMENT}`);
  });

  it('runtime: a rate-limited crisis sub-path delivers exactly the crisis fallback', () => {
    setConsent(false);
    tripRateLimit();
    expect(fireRuntimeUrl('being://crisis/a/b/c/d')).toEqual([`being://${CRISIS_PATH_SEGMENT}`]);
  });

  it('cold start: a rate-limited NOT_REACHABLE link delivers nothing and leaves the DEBUG-372 flag disarmed', async () => {
    setConsent(false);
    tripRateLimit();
    mockGetInitialURL.mockResolvedValue('being://bodyscan');
    await expect(getInitialURL()).resolves.toBeNull();
    // Armed, this would substitute LegalGate for Main beneath the modal.
    expect(parse('crisis')?.routes.map((r) => r.name)).toEqual(['Main', 'CrisisResources']);
  });

  it('runtime: a rate-limited NOT_REACHABLE link delivers nothing', () => {
    setConsent(false);
    tripRateLimit();
    expect(fireRuntimeUrl('being://bodyscan')).toEqual([]);
  });
});

describe('DEBUG-636: a blocked path logs no URL content', () => {
  it('the validator neither logs nor stores the URL', () => {
    expect(validate(SECRET_BEARING_URL).isValid).toBe(false);
    expect(loggedText()).not.toMatch(/secret/);
    const events = DeepLinkValidationService.getSecurityMetrics().recentEvents;
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toMatch(/secret/);
  });

  it('logs the block at medium with the base segment and code, not as a high-severity URL', async () => {
    setConsent(true);
    mockGetInitialURL.mockResolvedValue(SECRET_BEARING_URL);
    await getInitialURL();
    expect(mockLogSecurity).toHaveBeenCalledWith(
      'DeepLink: Initial URL blocked, path not allowlisted',
      'medium',
      { basePath: '/totallybogusxx', errors: ['DISALLOWED_PATH'] },
    );
    expect(mockLogSecurity).not.toHaveBeenCalledWith('DeepLink: Initial URL blocked', 'high', expect.anything());
  });

  it('an attack on an unlisted path keeps the full high-severity blocked log', async () => {
    setConsent(true);
    mockGetInitialURL.mockResolvedValue('being://totallybogusxx?source=<script>alert(1)</script>');
    await getInitialURL();
    expect(mockLogSecurity).toHaveBeenCalledWith('DeepLink: Initial URL blocked', 'high', expect.anything());
  });

  it.each([
    [null, '/'],
    ['', '/'],
    ['/', '/'],
    ['/bodyscan/secret', '/bodyscan'],
    [`/${'a'.repeat(40)}`, `/${'a'.repeat(20)}`],
    ['/r%C3%A9sum%C3%A9', '/rC3A9sumC3A9'],
    ['/...', '/<unlisted>'],
  ])('pathForSecurityLog(%p) → %p', (input, expected) => {
    expect(pathForSecurityLog(input)).toBe(expected);
  });

  it.each([true, false])('cold start drops it without logging the URL (consent granted: %s)', async (granted) => {
    setConsent(granted);
    mockGetInitialURL.mockResolvedValue(SECRET_BEARING_URL);
    await expect(getInitialURL()).resolves.toBeNull();
    expect(mockLogSecurity).toHaveBeenCalled();
    expect(loggedText()).not.toMatch(/secret/);
  });

  it.each([true, false])('runtime drops it without logging the URL (consent granted: %s)', (granted) => {
    setConsent(granted);
    expect(fireRuntimeUrl(SECRET_BEARING_URL)).toEqual([]);
    expect(mockLogSecurity).toHaveBeenCalled();
    expect(loggedText()).not.toMatch(/secret/);
  });
});

describe('DEBUG-636: a crisis sub-path is still handed to the navigator', () => {
  // Delivery only. `crisis/a/b/c/d` resolves to no screen in getStateFromPath —
  // a pre-existing gap filed separately — so these pin that the VALIDATOR and
  // the consent exemption pass it through, not that the user lands on 988.
  it.each([false, true])('cold start delivers being://crisis/a/b/c/d unchanged (consent granted: %s)', async (granted) => {
    setConsent(granted);
    mockGetInitialURL.mockResolvedValue('being://crisis/a/b/c/d');
    await expect(getInitialURL()).resolves.toBe('being://crisis/a/b/c/d');
  });

  it('runtime delivers being://crisis/a/b/c/d unchanged pre-consent', () => {
    setConsent(false);
    expect(fireRuntimeUrl('being://crisis/a/b/c/d')).toEqual(['being://crisis/a/b/c/d']);
  });

  it('a blocked NOT_REACHABLE cold start leaves the DEBUG-372 flag disarmed', async () => {
    setConsent(false);
    mockGetInitialURL.mockResolvedValue('being://bodyscan');
    await expect(getInitialURL()).resolves.toBeNull();
    expect(parse('crisis')?.routes.map((r) => r.name)).toEqual(['Main', 'CrisisResources']);
  });
});
