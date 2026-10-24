/**
 * Guidance analytics boundary (FEAT-457, slice 4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PROMISE THIS ENFORCES IS A PUBLISHED ONE.
 *
 * Privacy policy §5.2 (mirrored in `docs/architecture/analytics-architecture.md`,
 * v1.24, DEBUG-793) promises that what you select, answer or write is never collected;
 * only that an affordance was opened is disclosed. A self-selected hardship domain —
 * "this user opened grief" — is exactly that content, and arguably more revealing
 * than a screen-view bucket.
 *
 * DEBUG-821 retired `guidance_opened` itself; the domain tokens stay blocked on
 * every live event. Before this suite, NOTHING mechanical stood behind that
 * sentence for these values. `PHI_KEYWORDS` is a substring blocklist scanned against string VALUES,
 * and 'conflict' / 'career' / 'grief' / 'pain' matched none of its entries, so the
 * filter would have passed a `domain` property straight through to PostHog. The
 * only control was prose. These tests are the control.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Terminology note: this file sits in `__tests__/privacy/` and is run by
 * `test:privacy`. "Wellness data", not "PHI" — Being is not a HIPAA entity; the
 * class is named `PHIFilter` for historical reasons only.
 */

import { PHIFilter, AnalyticsEvents, RETIRED_ANALYTICS_EVENTS } from '@/core/analytics/PHIFilter';
import {
  coarsenScreenNameForAnalytics,
  isSensitiveRoute,
  GENERIC_SCREEN_BUCKET,
} from '@/core/utils/sensitiveScreens';
import { DOMAIN_BINDINGS } from '@/features/guidance/constants/domainBindings';

const DOMAINS = Object.keys(DOMAIN_BINDINGS) as Array<keyof typeof DOMAIN_BINDINGS>;

describe('FEAT-457, then DEBUG-821 — guidance_opened is retired', () => {
  it('is in neither the whitelist nor the constant map', () => {
    // DEBUG-821 (ruling B, scope widened at batch approval 2026-10-23): opening hardship
    // guidance is support-seeking in a moment of distress, as strong a signal as opening
    // crisis resources, so it stopped reaching PostHog.
    expect(PHIFilter.isWhitelisted('guidance_opened')).toBe(false);
    expect(Object.values(AnalyticsEvents)).not.toContain('guidance_opened');
    expect(RETIRED_ANALYTICS_EVENTS).toContain('guidance_opened');
  });

  it('is rejected with the empty payload it used to carry', () => {
    expect(PHIFilter.validate('guidance_opened', {}).valid).toBe(false);
  });
});

describe('FEAT-457 — a domain property is blocked, whichever domain it names', () => {
  it.each(DOMAINS)('blocks domain=%s on a live event', (domain) => {
    // The blocklist is per-value, not per-event, so a later author cannot smuggle the
    // inference through a different event name.
    const result = PHIFilter.validate('settings_opened', { domain });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain(domain);
  });

  it('blocks the domain on ANY whitelisted event', () => {
    expect(PHIFilter.validate('screen_viewed', { screen: 'grief' }).valid).toBe(false);
    expect(PHIFilter.validate('learn_content_viewed', { topic: 'career' }).valid).toBe(false);
  });

  it('is not vacuous — a benign value on the same event still validates', () => {
    // Without this, a filter that blocked EVERYTHING would pass every assertion
    // above while breaking all product analytics.
    expect(PHIFilter.validate('settings_opened', { source: 'home' })).toEqual({ valid: true });
  });
});

describe('FEAT-457 — the guidance screen name never ships verbatim', () => {
  it.each(['DomainGuidance', 'DomainGuidanceScreen', 'guidance'])(
    'coarsens %s to the generic bucket',
    (name) => {
      expect(isSensitiveRoute(name)).toBe(true);
      expect(coarsenScreenNameForAnalytics(name)).toBe(GENERIC_SCREEN_BUCKET);
    }
  );

  it('leaves non-sensitive screen names alone, so per-screen funnels survive', () => {
    // The collateral check. `coarsenScreenNameForAnalytics` is a
    // pass-through-unless-matched blocklist, so adding a keyword can silently
    // bucket unrelated screens.
    expect(coarsenScreenNameForAnalytics('HomeScreen')).toBe('HomeScreen');
    expect(coarsenScreenNameForAnalytics('ProfileScreen')).toBe('ProfileScreen');
    expect(coarsenScreenNameForAnalytics('LearnScreen')).toBe('LearnScreen');
    expect(coarsenScreenNameForAnalytics('PracticeLibrary')).toBe('PracticeLibrary');
  });
});
