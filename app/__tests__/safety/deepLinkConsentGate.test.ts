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

import { linkingConfig, CRISIS_PATH_SEGMENT } from '@/core/navigation/linking';
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
  status: 'valid' | 'invalid' | 'expired' | 'missing' | 'under_age',
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

const UNGRANTED_STATES = ['missing', 'under_age', 'invalid', 'expired'] as const;
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

  describe('config pins', () => {
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
