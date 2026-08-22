/**
 * Guidance analytics boundary (FEAT-457, slice 4).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PROMISE THIS ENFORCES IS A PUBLISHED ONE.
 *
 * `docs/architecture/analytics-architecture.md` states, under Privacy Policy
 * Disclosure: "What We NEVER Collect: … Any mental health data." A self-selected
 * hardship domain — "this user opened grief" — is exactly that, and arguably more
 * revealing than a screen-view bucket.
 *
 * Before this suite, NOTHING mechanical stood behind that sentence for these
 * values. `PHI_KEYWORDS` is a substring blocklist scanned against string VALUES,
 * and 'conflict' / 'career' / 'grief' / 'pain' matched none of its entries, so the
 * filter would have passed a `domain` property straight through to PostHog. The
 * only control was prose. These tests are the control.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Terminology note: this file sits in `__tests__/privacy/` and is run by
 * `test:privacy`. "Wellness data", not "PHI" — Being is not a HIPAA entity; the
 * class is named `PHIFilter` for historical reasons only.
 */

import { PHIFilter, AnalyticsEvents } from '@/core/analytics/PHIFilter';
import {
  coarsenScreenNameForAnalytics,
  isSensitiveRoute,
  GENERIC_SCREEN_BUCKET,
} from '@/core/utils/sensitiveScreens';
import { DOMAIN_BINDINGS } from '@/features/guidance/constants/domainBindings';

const DOMAINS = Object.keys(DOMAIN_BINDINGS) as Array<keyof typeof DOMAIN_BINDINGS>;

describe('FEAT-457 — guidance_opened is whitelisted and carries nothing', () => {
  it('is registered in both the whitelist and the constant map', () => {
    // A name in one and not the other is the silent-failure shape: `trackEvent`
    // logs the block and returns, nothing throws.
    expect(PHIFilter.isWhitelisted('guidance_opened')).toBe(true);
    expect(AnalyticsEvents.GUIDANCE_OPENED).toBe('guidance_opened');
  });

  it('validates with an empty payload — the shape actually emitted', () => {
    expect(PHIFilter.validate('guidance_opened', {})).toEqual({ valid: true });
  });
});

describe('FEAT-457 — a domain property is blocked, whichever domain it names', () => {
  it.each(DOMAINS)('blocks guidance_opened carrying domain=%s', (domain) => {
    const result = PHIFilter.validate('guidance_opened', { domain });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain(domain);
  });

  it('blocks the domain on ANY whitelisted event, not just this one', () => {
    // The blocklist is per-value, not per-event, so a later author cannot smuggle
    // the inference through a different event name.
    expect(PHIFilter.validate('screen_viewed', { screen: 'grief' }).valid).toBe(false);
    expect(PHIFilter.validate('learn_content_viewed', { topic: 'career' }).valid).toBe(false);
  });

  it('is not vacuous — a benign value on the same event still validates', () => {
    // Without this, a filter that blocked EVERYTHING would pass every assertion
    // above while breaking all product analytics.
    expect(PHIFilter.validate('guidance_opened', { source: 'home' })).toEqual({ valid: true });
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
