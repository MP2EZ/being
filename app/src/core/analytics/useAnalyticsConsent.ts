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
 * `PostHogProvider`'s `ConsentSync` drives `optIn()`/`optOut()` from this hook, so a
 * call site using it cannot disagree with the client's own opt state.
 *
 * DEBUG-690: it emits exactly when `analyticsConsentOutcome` says `emit`. Reading
 * only the analytics preference kept PostHog opted in after consent lapsed: the
 * `expired` and `under_age` load branches, and `revokeConsent`, keep `currentConsent`
 * in memory with its preference intact. `hold` (loading) and `purge` are both false;
 * this hook never purges (consentWithdrawalPurge does).
 *
 * It renders above `RootCrisisBoundary`, and the outcome's `default` arm throws on an
 * unknown status, so the selector catches and returns false: a throw here would blank
 * every 988 affordance (DEBUG-559). One selector, one boolean primitive.
 */

import { useConsentStore } from '@/core/stores/consentStore';
import { analyticsConsentOutcome } from './analyticsConsentOutcome';

/**
 * True when consent is `valid`, analytics is granted, and no universal opt-out is
 * asserted (INFRA-151: GPC-equivalent, overrides granular consent).
 *
 * This governs ANALYTICS EMISSION ONLY. It is not, and must never be used as, a
 * data-operation gate — that is `useConsentStore.canPerformOperation(...)`.
 */
export function useAnalyticsConsent(): boolean {
  return useConsentStore((state) => {
    try {
      return analyticsConsentOutcome(state) === 'emit';
    } catch {
      return false;
    }
  });
}

export default useAnalyticsConsent;
