/**
 * DEEP LINK CONSENT GATE — INFRA-308
 *
 * Deep links must not bypass the age-verification / consent gate on cold start
 * or at runtime. React Navigation linking state replaces the root navigator's
 * initialRouteName, so `getSecureInitialURL` / `secureSubscribe` are the only
 * places the gate can hold for URL-initiated navigation.
 *
 * SAFETY CONTRACT (non-negotiable):
 *   /crisis is EXEMPT and resolves unconditionally — it is the 988 path.
 *   Crisis access is NEVER gated by consent (vital-interests basis; mirrors
 *   canPerformCrisisIntervention() in consentStore). The exemption must hold
 *   in every consent state AND when the consent store itself fails.
 */

import { getActionFromState } from '@react-navigation/native';
import {
  linkingConfig,
  CRISIS_PATH_SEGMENT,
  PRE_CONSENT_CRISIS_CONFIG,
} from '@/core/navigation/linking';
import { useConsentStore } from '@/core/stores/consentStore';
import DeepLinkValidationService from '@/core/services/security/DeepLinkValidationService';
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

const mockGetInitialURL = Linking.getInitialURL as jest.Mock;
const mockAddEventListener = Linking.addEventListener as jest.Mock;

/** Cold-start entry point under test. */
const getInitialURL = () =>
  (linkingConfig.getInitialURL as () => Promise<string | null>)();

/** Runtime entry point under test: subscribe, fire a URL event, return listener calls. */
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

/** Put the real zustand store into a settled consent state (no persistence I/O). */
function setConsentState(
  status:
    | 'valid'
    | 'version_mismatch'
    | 'integrity_error'
    | 'revoked'
    | 'expired'
    | 'missing'
    | 'under_age',
  opts: { ageVerified?: boolean; isEligible?: boolean } = {},
) {
  const { ageVerified = status === 'valid', isEligible = status === 'valid' } = opts;
  useConsentStore.setState({
    consentStatus: status,
    consentCache: {
      canCollectAnalytics: false,
      canCollectCrashReports: false,
      canSyncToCloud: false,
      canParticipateInResearch: false,
      canProcessMentalHealthData: status === 'valid',
      honorUniversalOptOut: false,
      ageVerified,
      isEligible,
      cacheTimestamp: Date.now(),
    },
  });
}

// FEAT-316 slice A split the single 'invalid' status into three. All three are
// listed explicitly rather than collapsed, so the `being://crisis` exemption is
// pinned under each one individually — a user in crisis on a device with a
// withdrawn, corrupted, or version-stale consent record reaches 988 the same way.
const UNGRANTED_STATES = [
  'missing',
  'under_age',
  'version_mismatch',
  'integrity_error',
  'revoked',
  'expired',
] as const;
const GATED_URLS = [
  'being://morning',
  'being://midday',
  'being://evening',
  'being://assessment/PHQ9',
  'being://module/stoicism-101',
  'being://practice/breathing',
];

describe('Deep link consent gate (INFRA-308)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // The validator singleton rate-limits at 30 req/min; without a reset the
    // suite's later tests are all blocked as RATE_LIMIT_EXCEEDED.
    DeepLinkValidationService.clearSecurityEvents();
  });

  describe('cold start — getInitialURL', () => {
    describe.each(UNGRANTED_STATES)('consent %s', (status) => {
      beforeEach(() => setConsentState(status));

      it.each(GATED_URLS)('drops %s', async (url) => {
        mockGetInitialURL.mockResolvedValue(url);
        await expect(getInitialURL()).resolves.toBeNull();
      });

      it('SAFETY: being://crisis still resolves (988 path is never consent-gated)', async () => {
        mockGetInitialURL.mockResolvedValue('being://crisis');
        await expect(getInitialURL()).resolves.toEqual(expect.stringContaining('crisis'));
      });
    });

    describe('consent valid + age verified', () => {
      beforeEach(() => setConsentState('valid'));

      it.each([...GATED_URLS, 'being://crisis'])(
        'resolves %s (no permanent suppression after grant)',
        async (url) => {
          mockGetInitialURL.mockResolvedValue(url);
          await expect(getInitialURL()).resolves.toEqual(expect.any(String));
        },
      );
    });

    it('drops non-crisis links when consent is valid but age verification is absent', async () => {
      setConsentState('valid', { ageVerified: false, isEligible: false });
      mockGetInitialURL.mockResolvedValue('being://morning');
      await expect(getInitialURL()).resolves.toBeNull();
    });

    it('SAFETY: https://being.fyi/crisis resolves with consent missing (https parity)', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('https://being.fyi/crisis');
      await expect(getInitialURL()).resolves.toEqual(expect.stringContaining('crisis'));
    });

    it('SAFETY: being://crisis?source=deeplink resolves with consent missing (allowed param survives)', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('being://crisis?source=deeplink');
      await expect(getInitialURL()).resolves.toEqual(expect.stringContaining('crisis'));
    });

    it('SAFETY: being://crisis/safety-plan resolves with consent missing (subtree exemption)', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('being://crisis/safety-plan');
      await expect(getInitialURL()).resolves.toEqual(expect.stringContaining('crisis'));
    });

    it('SAFETY: the crisis path performs ZERO consent-store reads (exempt-first ordering)', async () => {
      setConsentState('missing');
      const getStateSpy = jest.spyOn(useConsentStore, 'getState');
      getStateSpy.mockClear();
      mockGetInitialURL.mockResolvedValue('being://crisis');
      await expect(getInitialURL()).resolves.toEqual(expect.stringContaining('crisis'));
      expect(getStateSpy).not.toHaveBeenCalled();
      getStateSpy.mockRestore();
    });

    it('SAFETY: being://crisis still delivers when the validator is rate-limited', async () => {
      setConsentState('missing');
      // Trip the shared 30/min rate limiter.
      for (let i = 0; i < 31; i++) {
        DeepLinkValidationService.validateDeepLink('being://morning');
      }
      mockGetInitialURL.mockResolvedValue('being://crisis');
      // The carve-out delivers the hardcoded constant, never the original string.
      await expect(getInitialURL()).resolves.toBe(`being://${CRISIS_PATH_SEGMENT}`);
    });

    it('rate limiting still blocks NON-crisis URLs (carve-out is crisis-only)', async () => {
      setConsentState('valid');
      for (let i = 0; i < 31; i++) {
        DeepLinkValidationService.validateDeepLink('being://morning');
      }
      mockGetInitialURL.mockResolvedValue('being://morning');
      await expect(getInitialURL()).resolves.toBeNull();
    });

    it('attack payloads on the crisis path still block (exemption does not weaken detection)', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('being://crisis?source=<script>alert(1)</script>');
      await expect(getInitialURL()).resolves.toBeNull();
    });

    it('traversal spoof being://crisis/../morning is dropped under missing consent', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('being://crisis/../morning');
      await expect(getInitialURL()).resolves.toBeNull();
    });

    it('SAFETY: being://crisis resolves even if the consent store read throws', async () => {
      setConsentState('missing');
      const getStateSpy = jest
        .spyOn(useConsentStore, 'getState')
        .mockImplementation(() => {
          throw new Error('consent store unavailable');
        });
      try {
        mockGetInitialURL.mockResolvedValue('being://crisis');
        await expect(getInitialURL()).resolves.toEqual(expect.stringContaining('crisis'));
      } finally {
        getStateSpy.mockRestore();
      }
    });

    it('still drops security-invalid URLs regardless of consent (gate is additive)', async () => {
      setConsentState('valid');
      mockGetInitialURL.mockResolvedValue('javascript://alert(1)');
      await expect(getInitialURL()).resolves.toBeNull();
    });
  });

  describe('runtime — secureSubscribe', () => {
    it.each(GATED_URLS)('drops %s while consent is ungranted', (url) => {
      setConsentState('missing');
      expect(fireRuntimeUrl(url)).toHaveLength(0);
    });

    it('SAFETY: delivers being://crisis while consent is ungranted', () => {
      setConsentState('missing');
      const delivered = fireRuntimeUrl('being://crisis');
      expect(delivered).toHaveLength(1);
      expect(delivered[0]).toEqual(expect.stringContaining('crisis'));
    });

    it('SAFETY: delivers being://crisis while under age', () => {
      setConsentState('under_age');
      expect(fireRuntimeUrl('being://crisis')).toHaveLength(1);
    });

    it('delivers gated URLs once consent is granted', () => {
      setConsentState('valid');
      expect(fireRuntimeUrl('being://morning')).toHaveLength(1);
    });

    it('no permanent suppression: the SAME subscription delivers after consent transitions to valid', () => {
      const delivered: string[] = [];
      let handler: ((event: { url: string }) => void) | undefined;
      mockAddEventListener.mockImplementation((_e: string, cb: typeof handler) => {
        handler = cb;
        return { remove: jest.fn() };
      });
      const unsubscribe = (linkingConfig.subscribe as (
        l: (url: string) => void,
      ) => () => void)((u: string) => delivered.push(u));

      setConsentState('missing');
      handler?.({ url: 'being://morning' });
      expect(delivered).toHaveLength(0);

      setConsentState('valid');
      handler?.({ url: 'being://morning' });
      expect(delivered).toHaveLength(1);
      unsubscribe();
    });

    it('drops the event without throwing when the consent store read throws (fail closed)', () => {
      setConsentState('missing');
      const getStateSpy = jest
        .spyOn(useConsentStore, 'getState')
        .mockImplementation(() => {
          throw new Error('consent store unavailable');
        });
      try {
        expect(() => {
          expect(fireRuntimeUrl('being://morning')).toHaveLength(0);
        }).not.toThrow();
      } finally {
        getStateSpy.mockRestore();
      }
    });
  });

  /**
   * DEBUG-372 — the route sitting BENEATH the crisis modal on a cold start.
   *
   * `getSecureInitialURL` correctly DELIVERS `being://crisis` while consent is
   * ungranted (the tests above). What it could not control was the base route
   * React Navigation builds underneath it: `config.initialRouteName` is 'Main',
   * so `getStateFromPath('/crisis', config)` produced [Main, CrisisResources].
   * That linking state REPLACES the navigator's own `initialRouteName`
   * ('LegalGate'), so CleanTabNavigator — which performs zero consent reads —
   * mounted beneath a `presentation: 'modal'` card (visible behind it on iOS)
   * and `goBack()` landed there, all while consent was ungranted.
   *
   * SAFETY CONTRACT: every branch below must still yield a state CONTAINING
   * CrisisResources. Fail-closed applies to consent (throw ⇒ LegalGate);
   * fail-OPEN applies to the 988 path (never a state without CrisisResources).
   *
   * SCOPE: cold start only. React Navigation feeds RUNTIME links through
   * `getActionFromState(state, config)` with the ORIGINAL config, and that only
   * emits NAVIGATE when `routes[0].name === config.initialRouteName`; any other
   * two-route base yields a destructive RESET. Substituting on the runtime path
   * would silently convert warm-app crisis links into a root reset.
   */
  describe('cold-start base route beneath the crisis modal (DEBUG-372)', () => {
    type ParsedState = ReturnType<
      NonNullable<typeof linkingConfig.getStateFromPath>
    >;

    const parse = (path: string): ParsedState =>
      (linkingConfig.getStateFromPath as NonNullable<
        typeof linkingConfig.getStateFromPath
      >)(path, linkingConfig.config);

    const routeNames = (state: ParsedState): string[] | undefined =>
      state?.routes?.map((route) => route.name);

    /** Arm the cold-start path exactly as React Navigation does, then parse. */
    async function coldStart(url: string, path: string): Promise<ParsedState> {
      mockGetInitialURL.mockResolvedValue(url);
      await getInitialURL();
      return parse(path);
    }

    it('HEADLINE: a cold-start crisis link with consent missing puts LegalGate — not Main — beneath the modal', async () => {
      setConsentState('missing');
      const state = await coldStart('being://crisis', 'crisis');
      expect(routeNames(state)).toEqual(['LegalGate', 'CrisisResources']);
    });

    // `getStateFromPath` receives `extractPathFromURL` output, which is NOT the
    // URL()-normalized pathname `isCrisisExemptPath` consumes: it arrives bare,
    // with the query still attached, and sometimes slash-prefixed.
    it.each([
      ['being://crisis', 'crisis'],
      ['being://crisis', '/crisis'],
      ['being://crisis?source=deeplink', 'crisis?source=deeplink'],
    ])('substitutes for %s delivered as path %s', async (url, path) => {
      setConsentState('missing');
      const state = await coldStart(url, path);
      expect(routeNames(state)?.[0]).toBe('LegalGate');
      expect(routeNames(state)).toContain('CrisisResources');
    });

    /**
     * PRE-EXISTING GAP, recorded rather than fixed — NOT introduced by DEBUG-372.
     *
     * `isCrisisExemptPath` matches on the FIRST path segment, so its docstring is
     * right that "any route added under `crisis/` inherits this exemption". But no
     * such route has ever been added: `screens.CrisisResources` is the bare string
     * `'crisis'`, so React Navigation resolves `crisis/safety-plan` to NO STATE AT
     * ALL — with or without this fix, and identically before it.
     *
     * The consequence is that a nested crisis URL passes the consent gate (correct)
     * and then resolves to nothing (not correct), falling back to whatever
     * `Stack.Navigator initialRouteName` gives. 988 survives, because the crisis
     * overlay is a sibling of the navigator, but `CrisisResources` does not open.
     *
     * Pinned here so the behaviour is a known quantity rather than a surprise, and
     * so that registering a real `crisis/*` route later breaks this test and forces
     * the question. Fixing it is out of scope: this item was deliberately narrowed
     * to the base route beneath the modal.
     */
    it('nested crisis paths resolve to no state — pre-existing, unchanged by this fix', async () => {
      setConsentState('missing');
      const state = await coldStart('being://crisis/safety-plan', 'crisis/safety-plan');
      expect(state).toBeUndefined();
    });

    it.each(UNGRANTED_STATES)(
      'SAFETY: CrisisResources is still present under consent %s (988 is never gated)',
      async (status) => {
        setConsentState(status);
        const state = await coldStart('being://crisis', 'crisis');
        expect(routeNames(state)).toContain('CrisisResources');
      },
    );

    it('SAFETY: CrisisResources survives a THROWING consent store, and the base fails closed to LegalGate', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('being://crisis');
      // Arm first: the cold-start entry point performs zero consent reads by
      // design (pinned above), so the spy only intercepts the getStateFromPath read.
      await getInitialURL();
      const getStateSpy = jest
        .spyOn(useConsentStore, 'getState')
        .mockImplementation(() => {
          throw new Error('consent store unavailable');
        });
      try {
        const state = parse('crisis');
        expect(routeNames(state)).toContain('CrisisResources');
        expect(routeNames(state)).toEqual(['LegalGate', 'CrisisResources']);
      } finally {
        getStateSpy.mockRestore();
      }
    });

    it('base stays Main when consent is valid and age is verified', async () => {
      setConsentState('valid');
      const state = await coldStart('being://crisis', 'crisis');
      expect(routeNames(state)).toEqual(['Main', 'CrisisResources']);
    });

    it('a RUNTIME crisis link is NOT substituted — it must stay a NAVIGATE, never a RESET', () => {
      setConsentState('missing');
      expect(fireRuntimeUrl('being://crisis')).toHaveLength(1);
      const state = parse('crisis');
      expect(routeNames(state)).toEqual(['Main', 'CrisisResources']);
      expect(getActionFromState(state!, linkingConfig.config)?.type).toBe('NAVIGATE');
    });

    it('the cold-start substitution is ONE-SHOT (a second parse reverts to Main)', async () => {
      setConsentState('missing');
      const first = await coldStart('being://crisis', 'crisis');
      expect(routeNames(first)).toEqual(['LegalGate', 'CrisisResources']);
      expect(routeNames(parse('crisis'))).toEqual(['Main', 'CrisisResources']);
    });

    it('a non-crisis cold start still yields [Main, DailyLoop] (FEAT-298 stranding fix preserved)', async () => {
      setConsentState('valid');
      const state = await coldStart('being://daily', 'daily');
      expect(routeNames(state)).toEqual(['Main', 'DailyLoop']);
    });

    it('a blocked cold-start URL leaves the flag disarmed', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue('javascript://alert(1)');
      await expect(getInitialURL()).resolves.toBeNull();
      expect(routeNames(parse('crisis'))).toEqual(['Main', 'CrisisResources']);
    });

    it('a cold start with NO url leaves the flag disarmed', async () => {
      setConsentState('missing');
      mockGetInitialURL.mockResolvedValue(null);
      await expect(getInitialURL()).resolves.toBeNull();
      expect(routeNames(parse('crisis'))).toEqual(['Main', 'CrisisResources']);
    });

    it('SAFETY: the rate-limited crisis fallback also arms the substitution', async () => {
      setConsentState('missing');
      for (let i = 0; i < 31; i++) {
        DeepLinkValidationService.validateDeepLink('being://morning');
      }
      mockGetInitialURL.mockResolvedValue('being://crisis');
      await expect(getInitialURL()).resolves.toBe(`being://${CRISIS_PATH_SEGMENT}`);
      expect(routeNames(parse('crisis'))).toEqual(['LegalGate', 'CrisisResources']);
    });
  });

  describe('config pins', () => {
    it('the default config still bases at Main, and the pre-consent config shares the SAME screens object (DEBUG-372)', () => {
      expect(linkingConfig.config?.initialRouteName).toBe('Main');
      expect(PRE_CONSENT_CRISIS_CONFIG.initialRouteName).toBe('LegalGate');
      // Identical object, not a copy: `getStateFromPath` caches its parsed
      // config in a WeakMap keyed by reference, so a per-call spread would
      // re-parse the whole screen map on the crisis path.
      expect(PRE_CONSENT_CRISIS_CONFIG.screens).toBe(linkingConfig.config?.screens);
    });

    it('CrisisResources screen path equals CRISIS_PATH_SEGMENT (exemption cannot silently drift)', () => {
      const screens = linkingConfig.config?.screens as Record<string, unknown>;
      expect(screens.CrisisResources).toBe(CRISIS_PATH_SEGMENT);
      expect(CRISIS_PATH_SEGMENT).toBe('crisis');
    });

    it('linking.ts does not touch RootCrisisButton or SUPPRESSED_ROUTES (forbidden-change boundary)', () => {
      const fs = require('fs');
      const path = require('path');
      const source = fs.readFileSync(
        path.resolve(__dirname, '../../src/core/navigation/linking.ts'),
        'utf8',
      );
      expect(source).not.toContain('RootCrisisButton');
      expect(source).not.toContain('SUPPRESSED_ROUTES');
    });
  });
});
