/**
 * useAnalyticsConsent — the single consent predicate every analytics emit reads.
 *
 * WHY THIS EXISTS (DEBUG-559)
 * ---------------------------
 * Until DEBUG-559, `PostHogProvider` returned a bare fragment without analytics
 * consent and `<PHProvider>` with it, so `usePostHog()` was undefined on the
 * no-consent path — and `useAnalytics.trackEvent`'s `if (!posthog) return` was
 * therefore the app's effective consent gate, for free.
 *
 * That shape was the DEBUG-559 defect: an element-TYPE swap at a fixed position
 * destroyed and recreated the whole subtree below it, including every 988
 * affordance. The fix mounts `<PHProvider>` unconditionally, which means a client
 * now exists from launch and `usePostHog()` is ALWAYS truthy.
 *
 * So the free gate is gone, and this hook is what replaces it. The rule it
 * enforces, ruled non-negotiable by the `compliance` pass on DEBUG-559:
 *
 *   `usePostHog()` truthiness must NEVER again be treated as a consent signal.
 *
 * Every emit path reads THIS, not the presence of a client. Relying on the
 * vendored SDK's internal `optedOut` check instead would work today — `enqueue()`
 * does drop the event before it is persisted or sent — but it makes our privacy
 * posture a property of a third-party library's internals rather than of our own
 * code, and it is silent when it changes.
 *
 * The two store paths below are the ones `PostHogProvider` reads to drive
 * `optIn()`/`optOut()`, so a call site using this hook cannot disagree with the
 * client's own opt state. `useFeatureFlag.ts` already gated on exactly these two
 * conjuncts independently, which is why it was the one consumer the always-mount
 * change did not silently break.
 */

import { useConsentStore } from '@/core/stores/consentStore';

/**
 * True when the user has granted analytics consent and has not asserted a
 * universal opt-out (INFRA-151: GPC-equivalent, overrides granular consent).
 *
 * This governs ANALYTICS EMISSION ONLY. It is not, and must never be used as, a
 * data-operation gate — that is `useConsentStore.canPerformOperation(...)`.
 */
export function useAnalyticsConsent(): boolean {
  const analyticsEnabled = useConsentStore(
    (state) => state.currentConsent?.preferences?.analyticsEnabled ?? false
  );
  const universalOptOut = useConsentStore(
    (state) => state.currentConsent?.universalOptOut ?? false
  );

  return analyticsEnabled && !universalOptOut;
}

export default useAnalyticsConsent;
