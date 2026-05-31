/**
 * useFeatureFlag.test.tsx — runtime feature-flag hook (INFRA-199).
 *
 * Pins the fail-safe resolution contract of the PostHog-backed runtime tier.
 * The build-time default (`isFeatureEnabled`), the PostHog client, and the
 * consent store are all mocked so each resolution path is asserted in isolation.
 *
 * The load-bearing safety properties under test:
 *  - the PRODUCT_FLAGS allow-list carve-out (safety flags never consult PostHog);
 *  - PostHog is NEVER read on the no-consent / opt-out path (no distinct_id
 *    transmission) — asserted via getFeatureFlag NOT being called;
 *  - every non-resolving path falls back to the build-time default (fail-safe).
 */
import { renderHook } from '@testing-library/react-native';

// Build-time default — controlled per test so assertions are deterministic
// regardless of the real env blob.
const mockIsFeatureEnabled = jest.fn<boolean, [string]>();
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (name: string) => mockIsFeatureEnabled(name),
}));

// PostHog client + hook.
const mockGetFeatureFlag = jest.fn<boolean | string | undefined, [string]>();
const mockUnsubscribe = jest.fn();
const mockOnFeatureFlags = jest.fn(() => mockUnsubscribe);
const mockUsePostHog = jest.fn();
jest.mock('posthog-react-native', () => ({
  usePostHog: () => mockUsePostHog(),
}));

// Consent store: useConsentStore(selector) runs the selector against state.
let mockConsentState: {
  currentConsent?: {
    preferences?: { analyticsEnabled?: boolean };
    universalOptOut?: boolean;
  };
};
jest.mock('@/core/stores/consentStore', () => ({
  useConsentStore: (selector: (s: unknown) => unknown) => selector(mockConsentState),
}));

import { useFeatureFlag } from '@/core/analytics/useFeatureFlag';

const fakeClient = {
  getFeatureFlag: (name: string) => mockGetFeatureFlag(name),
  onFeatureFlags: (cb: () => void) => mockOnFeatureFlags(cb),
};

const setConsent = (analyticsEnabled: boolean, universalOptOut = false): void => {
  mockConsentState = {
    currentConsent: { preferences: { analyticsEnabled }, universalOptOut },
  };
};

describe('useFeatureFlag — runtime resolution contract (INFRA-199)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setConsent(false);
    mockUsePostHog.mockReturnValue(fakeClient);
  });

  it('carve-out: a non-product (safety) flag returns the build-time default and never consults PostHog', () => {
    // crisis_detection is NOT in PRODUCT_FLAGS. Even with consent ON and PostHog
    // reporting `true`, the hook must return the build-time default.
    setConsent(true);
    mockIsFeatureEnabled.mockReturnValue(false);
    mockGetFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlag('crisis_detection'));

    expect(result.current).toBe(false); // build-time default, not PostHog's true
    expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    expect(mockOnFeatureFlags).not.toHaveBeenCalled();
  });

  it('no consent: a product flag falls back to build-time default and never reads PostHog (no distinct_id sent)', () => {
    setConsent(false); // analytics consent absent
    mockIsFeatureEnabled.mockReturnValue(false);
    mockGetFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlag('cloud_sync'));

    expect(result.current).toBe(false);
    // The privacy-critical assertion: no flag read => no $feature_flag_called event.
    expect(mockGetFeatureFlag).not.toHaveBeenCalled();
    expect(mockOnFeatureFlags).not.toHaveBeenCalled();
  });

  it('consent + PostHog true: a product flag resolves to the PostHog boolean (promotes above the build-time floor)', () => {
    setConsent(true);
    mockIsFeatureEnabled.mockReturnValue(false); // build-time floor is OFF
    mockGetFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlag('cloud_sync'));

    expect(result.current).toBe(true);
    expect(mockGetFeatureFlag).toHaveBeenCalledWith('cloud_sync');
  });

  it('consent but unresolved PostHog value (undefined / network fail) falls back to the build-time default', () => {
    setConsent(true);
    mockIsFeatureEnabled.mockReturnValue(false);
    mockGetFeatureFlag.mockReturnValue(undefined); // not yet loaded / fetch failed

    const { result } = renderHook(() => useFeatureFlag('cloud_sync'));

    expect(result.current).toBe(false); // fail-safe to build-time default
  });

  it('universal opt-out (GPC): a product flag falls back to build-time default and never reads PostHog', () => {
    setConsent(true, /* universalOptOut */ true);
    mockIsFeatureEnabled.mockReturnValue(false);
    mockGetFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlag('cloud_sync'));

    expect(result.current).toBe(false);
    expect(mockGetFeatureFlag).not.toHaveBeenCalled();
  });
});
