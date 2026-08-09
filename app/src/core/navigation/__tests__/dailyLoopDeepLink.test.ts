/**
 * DAILY LOOP DEEP LINK (FEAT-298 slice 4)
 *
 * `being://daily` opens the single daily ritual. Three properties are pinned here because
 * each was a live defect or an explicit crisis-pass constraint, not a nicety:
 *
 *  1. `/daily` validates, and `/daily/<anything>` does NOT navigate. `isAllowedPath` only
 *     checks segment[0], so sub-paths pass validation and then match no screen — a SILENT
 *     dead-end. Pinning it makes that a contract rather than an accident.
 *  2. `mode` / `depth` are NOT accepted as params. Depth is deliberately non-sticky
 *     (FEAT-301: "the next session re-presents this neutral choice") and mode becomes
 *     time-inferred. Accepting them would hand an external party — a push payload, an
 *     email, another app — the power to choose the depth of someone's practice and skip
 *     the neutral choice.
 *  3. The three path->screen sources of truth agree. `linking.ts`, `ALLOWED_PATHS`, and
 *     the (test-only, drift-prone) `extractNavigationParams` screenMap must not diverge.
 */

import DeepLinkValidationService from '@/core/services/security/DeepLinkValidationService';

/** extractNavigationParams consumes a validation RESULT, not a URL. */
const navFor = (url: string) =>
  DeepLinkValidationService.extractNavigationParams(
    DeepLinkValidationService.validateDeepLink(url)
  );

describe('being://daily deep link (FEAT-298 slice 4)', () => {
  describe('the bare path is allowed', () => {
    it('validates being://daily', () => {
      const result = DeepLinkValidationService.validateDeepLink('being://daily');
      expect(result.isValid).toBe(true);
    });

    it('resolves to the DailyLoop route name, not the "daily" record token', () => {
      // Route NAME and path TOKEN are separate concepts: 'DailyLoop' is pinned by
      // RootCrisisButton's IMMERSIVE_ROUTES, the Stack.Screen, getActiveRootRouteName and
      // a Maestro flow. They must never be "harmonized".
      const nav = navFor('being://daily');
      expect(nav.screen).toBe('DailyLoop');
    });
  });

  describe('sub-paths must not navigate (no silent dead-ends)', () => {
    it.each(['being://daily/quick', 'being://daily/quick/flat', 'being://daily/anything'])(
      '%s resolves to no screen',
      (url) => {
        const nav = navFor(url);
        expect(nav.screen).toBeNull();
      }
    );
  });

  describe('practice-shaping params are stripped, not honoured', () => {
    it('does not pass depth through', () => {
      const nav = navFor('being://daily?depth=quick');
      expect(nav.params).not.toHaveProperty('depth');
    });

    it('does not pass mode through', () => {
      const nav = navFor('being://daily?mode=evening');
      expect(nav.params).not.toHaveProperty('mode');
    });

    it('still validates the URL — the params are dropped, the link is not blocked', () => {
      // Stripping beats rejecting: the user still lands in their practice, they just get
      // the neutral depth/mode choice the app owns.
      const result = DeepLinkValidationService.validateDeepLink('being://daily?depth=quick');
      expect(result.isValid).toBe(true);
    });
  });

  describe('the crisis path is never affected by this slice', () => {
    it('being://crisis still validates', () => {
      // /crisis is the 988 path and must resolve unconditionally.
      expect(DeepLinkValidationService.validateDeepLink('being://crisis').isValid).toBe(true);
    });

    it('being://crisis still maps to CrisisResources', () => {
      expect(navFor('being://crisis').screen).toBe(
        'CrisisResources'
      );
    });
  });
});
