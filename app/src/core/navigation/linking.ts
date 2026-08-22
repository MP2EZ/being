/**
 * DEEP LINKING CONFIGURATION - MAINT-120 Security Implementation
 *
 * Secure deep linking configuration for React Navigation with:
 * - URL validation and sanitization before navigation
 * - Attack pattern detection and blocking
 * - Security event logging
 * - Rate limiting protection
 */

import { LinkingOptions, getStateFromPath } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import DeepLinkValidationService, {
  DEEP_LINK_CONFIG,
} from '@/core/services/security/DeepLinkValidationService';
import { logSecurity, logError, LogCategory } from '@/core/services/logging';
import { useConsentStore } from '@/core/stores/consentStore';
import type { RootStackParamList } from './CleanRootNavigator';

/**
 * URL PREFIXES
 * All valid URL prefixes for the app
 */
const URL_PREFIXES = [
  Linking.createURL('/'),
  'being://',
  'https://being.fyi',
  'https://www.being.fyi',
  'https://app.being.fyi',
];

/**
 * CRISIS PATH SEGMENT — single source of truth (INFRA-308)
 *
 * Must equal `linkingConfig.config.screens.CrisisResources` below. The consent
 * exemption is keyed on this segment; if the crisis route path is ever renamed,
 * both places change together or the pin test in
 * `__tests__/safety/deepLinkConsentGate.test.ts` fails loudly.
 */
export const CRISIS_PATH_SEGMENT = 'crisis';

/** Delivered instead of the raw URL by the rate-limit carve-out below. */
const CRISIS_FALLBACK_URL = `being://${CRISIS_PATH_SEGMENT}`;

/**
 * Consent exemption for the crisis subtree (INFRA-308).
 *
 * `/crisis` and anything under it resolve unconditionally — it is the 988 path,
 * and crisis access is NEVER gated by consent (vital-interests basis; mirrors
 * `canPerformCrisisIntervention()` in consentStore). Any route added under
 * `crisis/` inherits this exemption and must therefore be safety-only.
 *
 * `path` is the URL()-normalized pathname from DeepLinkValidationService, so
 * traversal like `crisis/../morning` has already resolved to `/morning` and
 * does not match here.
 */
function isCrisisExemptPath(path: string | null): boolean {
  if (!path) {
    return false;
  }
  const firstSegment = path.split('/').filter(Boolean)[0];
  return firstSegment !== undefined && firstSegment.toLowerCase() === CRISIS_PATH_SEGMENT;
}

/**
 * Same question as `isCrisisExemptPath`, but for the string React Navigation
 * hands `getStateFromPath` — which is NOT the same string.
 *
 * `isCrisisExemptPath` takes the URL()-normalized pathname from
 * DeepLinkValidationService (`/crisis`). `getStateFromPath` receives
 * `extractPathFromURL` output, which can be `crisis`, `crisis?source=x`, or
 * `/crisis` depending on the prefix that matched. Strip the query/hash and an
 * optional leading slash, then reuse the one matcher so the two cannot drift.
 */
function isCrisisLinkPath(path: string): boolean {
  const withoutQuery = path.split(/[?#]/)[0] ?? '';
  return isCrisisExemptPath(withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`);
}

/**
 * DEBUG-372 — one-shot arming flag for the cold-start crisis base route.
 *
 * `getStateFromPath` cannot tell a cold start from a warm one, and the
 * difference is not cosmetic: React Navigation's RUNTIME path feeds links
 * through `getActionFromState` with the ORIGINAL config, and that only emits
 * NAVIGATE when `routes[0].name === config.initialRouteName`. Any other 2-route
 * base yields a destructive RESET. So substituting the base route unconditionally
 * would silently convert warm-app crisis links into a root reset.
 *
 * Hence: `getSecureInitialURL` (which only ever runs at cold start) arms this,
 * and `getStateFromPath` consumes-and-clears it. Scoping is load-bearing, not
 * defensive.
 */
let coldStartCrisisLinkPending = false;

/**
 * AGE-VERIFICATION / CONSENT GATE (INFRA-308)
 *
 * React Navigation linking state replaces the root navigator's
 * `initialRouteName`, so a deep link would otherwise render its target route
 * even when CleanRootNavigator resolved 'LegalGate'. Deep links are delivered
 * only when the consent store shows currently-valid consent AND a passed 18+
 * age verification; every other state (`missing`, `under_age`, `expired`,
 * `version_mismatch`, `integrity_error`, `revoked`, `loading`) drops the URL.
 * Fail-safe by construction: any state not affirmatively valid — including
 * future consentStatus additions — blocks.
 *
 * FEAT-417: this list previously named `'invalid'`, a status that has not
 * existed since FEAT-316 slice A split it into `version_mismatch` /
 * `integrity_error` / `revoked` (`consentStore.ts:357-360`). The BEHAVIOUR was
 * always correct — the gate tests for `valid` affirmatively and never
 * enumerated anything at runtime — but a stale status list on a safety-path
 * file is exactly the kind of thing that gets copied into the next story as
 * fact.
 *
 * 🚫 `ReConsent` (FEAT-417) is deliberately absent from `config.screens` below
 * and from `DeepLinkValidationService.ALLOWED_PATHS`: nothing external may
 * summon a consent prompt. There is exactly ONE place to keep it out of —
 * `PRE_CONSENT_CRISIS_CONFIG` spreads the SAME `screens` object reference, so
 * adding a path there would also make it reachable from a cold-start
 * `being://crisis` link.
 *
 * Safe to read synchronously: NavigationContainer only mounts after
 * `loadConsent()` settles (CleanRootNavigator gates on `initialRoute`), so the
 * store is never 'loading' when React Navigation calls these entry points.
 *
 * Dropped URLs are never queued or replayed — the user re-navigates after
 * granting consent. This processes wellness data lawfully (GDPR Art. 9(2)(a)
 * explicit consent before any wellness-data screen renders).
 */
function consentGateAllowsNavigation(): boolean {
  const consent = useConsentStore.getState();
  return consent.hasValidConsent() && consent.isAgeVerified();
}

/** Reason code for the drop audit log — status only, no URL content. */
function consentDropReason(): string {
  const status = useConsentStore.getState().consentStatus;
  return status === 'valid' ? 'age_unverified' : `consent_${status}`;
}

/**
 * RATE-LIMIT CARVE-OUT FOR THE 988 PATH (INFRA-308, crisis-agent C4)
 *
 * DeepLinkValidationService rate-limits ALL deep links via a shared counter
 * (30/min), and a rate-limited result carries `metadata.path: null` — which
 * would silently suppress `being://crisis`. An availability control must never
 * deny the crisis route. When the ONLY blocking error is RATE_LIMIT_EXCEEDED
 * and the raw URL shows crisis intent (allowed scheme/host, first path segment
 * `crisis`), we deliver the hardcoded CRISIS_FALLBACK_URL — never the original
 * string, so zero attacker-controlled data reaches navigation. Attack-class
 * errors (XSS, injection, traversal) still block absolutely.
 */
function isRateLimitedCrisisIntent(
  url: string,
  validation: ReturnType<typeof DeepLinkValidationService.validateDeepLink>,
): boolean {
  const codes = validation.errors.map((e) => e.code);
  if (!codes.includes('RATE_LIMIT_EXCEEDED') || codes.some((c) => c !== 'RATE_LIMIT_EXCEEDED')) {
    return false;
  }
  try {
    const isCustomScheme = url.startsWith('being://');
    const normalized = isCustomScheme ? url.replace('being://', 'https://being.fyi/') : url;
    const parsed = new URL(normalized);
    if (!isCustomScheme) {
      if (parsed.protocol !== 'https:') {
        return false;
      }
      const host = parsed.hostname.toLowerCase();
      if (!(DEEP_LINK_CONFIG.ALLOWED_HOSTS as readonly string[]).includes(host)) {
        return false;
      }
    }
    return isCrisisExemptPath(parsed.pathname);
  } catch {
    return false;
  }
}

/**
 * SECURE GET INITIAL URL
 * Validates the initial URL before allowing navigation
 */
async function getSecureInitialURL(): Promise<string | null> {
  // DEBUG-372: clear first, arm only on the two crisis-delivery branches below.
  // Clearing here rather than on each non-crisis `return` means a path added
  // later cannot forget to disarm and leak the substitution onto a non-crisis
  // link.
  coldStartCrisisLinkPending = false;

  try {
    const url = await Linking.getInitialURL();

    if (!url) {
      return null;
    }

    // Validate the URL
    const validation = DeepLinkValidationService.validateDeepLink(url);

    if (!validation.isValid) {
      // 988 availability: rate limiting alone must not suppress the crisis route.
      if (isRateLimitedCrisisIntent(url, validation)) {
        logSecurity('DeepLink: rate-limited crisis URL, delivering crisis fallback', 'high', {
          path: `/${CRISIS_PATH_SEGMENT}`,
        });
        coldStartCrisisLinkPending = true; // DEBUG-372
        return CRISIS_FALLBACK_URL;
      }
      logSecurity('DeepLink: Initial URL blocked', 'high', {
        originalUrl: url.substring(0, 100),
        errors: validation.errors.map(e => e.code),
      });
      return null;
    }

    // Crisis exemption FIRST — before any consent-store access, so no consent
    // gate state (or consent-store failure) can ever suppress the 988 path.
    if (isCrisisExemptPath(validation.metadata.path)) {
      logSecurity('DeepLink: Initial URL validated', 'low', {
        path: validation.metadata.path,
        hasParams: Object.keys(validation.metadata.params).length > 0,
      });
      // DEBUG-372: armed AFTER the exemption check, so it adds no consent, seed
      // or env read ahead of it — the "ZERO consent-store reads on the crisis
      // cold start" pin stays green.
      coldStartCrisisLinkPending = true;
      return validation.sanitizedUrl;
    }

    // Age-verification / consent gate (INFRA-308): drop, never queue.
    // Log only the base segment + reason code — no params, no full URL
    // (the URL arrives pre-consent; data minimization applies to the log).
    if (!consentGateAllowsNavigation()) {
      logSecurity('DeepLink: Initial URL dropped by consent gate', 'medium', {
        basePath: `/${validation.metadata.path?.split('/').filter(Boolean)[0] ?? ''}`,
        reason: consentDropReason(),
      });
      return null;
    }

    logSecurity('DeepLink: Initial URL validated', 'low', {
      path: validation.metadata.path,
      hasParams: Object.keys(validation.metadata.params).length > 0,
    });

    return validation.sanitizedUrl;
  } catch (error) {
    logError(
      LogCategory.SECURITY,
      'Error getting initial URL:',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

/**
 * SECURE URL SUBSCRIBER
 * Validates URLs before allowing navigation
 */
function secureSubscribe(
  listener: (url: string) => void
): () => void {
  // Subscribe to native linking events. The whole handler is wrapped so an
  // exception (e.g. a consent-store read failure) drops the event instead of
  // propagating into the native expo-linking emitter — fail closed (INFRA-308).
  const subscription = Linking.addEventListener('url', (event) => {
    try {
      const { url } = event;

      if (!url) {
        return;
      }

      // Validate the URL
      const validation = DeepLinkValidationService.validateDeepLink(url);

      if (!validation.isValid) {
        // 988 availability: rate limiting alone must not suppress the crisis route.
        if (isRateLimitedCrisisIntent(url, validation)) {
          logSecurity('DeepLink: rate-limited crisis URL, delivering crisis fallback', 'high', {
            path: `/${CRISIS_PATH_SEGMENT}`,
          });
          listener(CRISIS_FALLBACK_URL);
          return;
        }
        logSecurity('DeepLink: Runtime URL blocked', 'high', {
          originalUrl: url.substring(0, 100),
          errors: validation.errors.map(e => e.code),
        });
        // Don't call listener - block navigation
        return;
      }

      // Crisis exemption FIRST — before any consent-store access, so no consent
      // gate state (or consent-store failure) can ever suppress the 988 path.
      if (isCrisisExemptPath(validation.metadata.path)) {
        logSecurity('DeepLink: Runtime URL validated', 'low', {
          path: validation.metadata.path,
          hasParams: Object.keys(validation.metadata.params).length > 0,
        });
        if (validation.sanitizedUrl) {
          listener(validation.sanitizedUrl);
        }
        return;
      }

      // Age-verification / consent gate (INFRA-308): consent state is read at
      // event time (never captured at subscribe time), so links resolve again
      // the moment consent is granted. Drop, never queue.
      if (!consentGateAllowsNavigation()) {
        logSecurity('DeepLink: Runtime URL dropped by consent gate', 'medium', {
          basePath: `/${validation.metadata.path?.split('/').filter(Boolean)[0] ?? ''}`,
          reason: consentDropReason(),
        });
        return;
      }

      logSecurity('DeepLink: Runtime URL validated', 'low', {
        path: validation.metadata.path,
        hasParams: Object.keys(validation.metadata.params).length > 0,
      });

      // Call listener with sanitized URL
      if (validation.sanitizedUrl) {
        listener(validation.sanitizedUrl);
      }
    } catch (error) {
      // Fail closed: drop the event. Crisis URLs return before any code that
      // can throw beyond validateDeepLink (which never throws), so this catch
      // cannot suppress the 988 path.
      logError(
        LogCategory.SECURITY,
        'DeepLink: runtime URL handler failed, dropping event:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  });

  return () => {
    subscription.remove();
  };
}

/**
 * SECURE LINKING CONFIGURATION
 * React Navigation linking config with security validation
 */
export const linkingConfig: LinkingOptions<RootStackParamList> = {
  prefixes: URL_PREFIXES,

  // Use secure handlers
  getInitialURL: getSecureInitialURL,
  subscribe: secureSubscribe,
  getStateFromPath: secureGetStateFromPath,

  // Screen configuration
  config: {
    // FEAT-298 slice 4 — REQUIRED, and its absence was a real bug. Without it a cold-start
    // deep link produces a root state of exactly [TargetRoute], so `navigation.goBack()`
    // (DailyLoop's onExit/onComplete) is a no-op on an empty stack and the user is stranded
    // in an immersive practice with gestureEnabled:false — no way out but force-quit. 988
    // still works (the crisis overlay is a SIBLING of the navigator, so it is mounted
    // regardless), but "cannot leave the default daily practice" is not shippable.
    initialRouteName: 'Main',
    screens: {
      // Main navigation
      Main: '',
      LegalGate: 'legal',
      Onboarding: 'onboarding',

      // Check-in flows
      // FEAT-298 slice 4. Route NAME ('DailyLoop') and path TOKEN ('daily') are separate
      // concepts and must not be "harmonized" — the route name is pinned in three places
      // (the crisis overlay's IMMERSIVE_ROUTES, the Stack.Screen, getActiveRootRouteName) and
      // by a Maestro flow. Bare path: no mode/depth params — see ALLOWED_PARAMS.
      DailyLoop: 'daily',

      // Features
      CrisisResources: CRISIS_PATH_SEGMENT,
      AssessmentFlow: {
        path: 'assessment/:assessmentType',
        parse: {
          assessmentType: (type: string) => {
            // Only allow valid assessment types
            const validTypes = ['PHQ9', 'GAD7'];
            return validTypes.includes(type) ? type : 'PHQ9';
          },
        },
      },

      // Learning
      ModuleDetail: {
        path: 'module/:moduleId',
        parse: {
          moduleId: (id: string) => {
            // Sanitize moduleId - alphanumeric and hyphens only
            return id.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50);
          },
        },
      },

      // Practice screens
      PracticeTimer: {
        path: 'practice/:practiceId',
        parse: {
          practiceId: (id: string) => id.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50),
          moduleId: (id: string) => id.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 50),
          duration: (d: string) => {
            const num = parseInt(d, 10);
            return isNaN(num) ? 60 : Math.min(Math.max(num, 10), 3600);
          },
          title: (t: string) => t.replace(/[<>]/g, '').substring(0, 100),
        },
      },

      ReflectionTimer: 'reflection',
      SortingPractice: 'sorting',
      BodyScan: 'bodyscan',
      GuidedBodyScan: 'guidedbodyscan',

      // Subscription
      Subscription: 'subscription',
      SubscriptionStatus: 'subscription/status',

      // Wellness trends full-history detail (FEAT-196)
      WellnessTrendsDetail: 'wellness-trends',
    },
  },
};

/**
 * GET DEEP LINK SECURITY METRICS
 * Returns security metrics for monitoring
 */
export function getDeepLinkSecurityMetrics() {
  return DeepLinkValidationService.getSecurityMetrics();
}

/**
 * VALIDATE DEEP LINK MANUALLY
 * For use outside of navigation context
 */
export function validateDeepLink(url: string) {
  return DeepLinkValidationService.validateDeepLink(url);
}

/**
 * DEBUG-372 — the pre-consent variant of the linking config.
 *
 * Identical to `linkingConfig.config` except for `initialRouteName`. Derived by
 * spread rather than re-declared, so `screens` is the SAME OBJECT REFERENCE and
 * the two cannot drift apart as routes are added.
 *
 * Module-level identity is load-bearing, not style: `getStateFromPath` caches
 * the parsed config in a WeakMap keyed by the options object, so building this
 * per call would re-parse the entire screen map on the crisis path — the one
 * path with a latency budget.
 */
export const PRE_CONSENT_CRISIS_CONFIG = {
  ...linkingConfig.config,
  initialRouteName: 'LegalGate',
} as NonNullable<LinkingOptions<RootStackParamList>['config']>;

/**
 * DEBUG-372 — swap the BASE route beneath a cold-start crisis modal.
 *
 * THE BUG: `config.initialRouteName` is 'Main' (FEAT-298 slice 4, and required —
 * without it `goBack()` strands the user in an immersive practice). So
 * `getStateFromPath('crisis', config)` returns
 * `{index:1, routes:[{name:'Main'}, {name:'CrisisResources'}]}`. That state
 * becomes `initialState` and OVERRIDES `Stack.Navigator initialRouteName`, so on
 * a fresh install — consent ungranted, no age check — CleanTabNavigator mounts
 * beneath the crisis modal and `goBack()` lands the user in the app proper. The
 * stack is a JS `createStackNavigator` with `presentation:'modal'`, so it is
 * visible beneath on iOS, not merely present.
 *
 * THE FIX: when a cold-start crisis link is in flight AND consent is ungranted,
 * resolve against a config whose `initialRouteName` is 'LegalGate'. Every other
 * call delegates unchanged.
 *
 * FAIL DIRECTIONS ARE ASYMMETRIC AND MUST NOT BE COLLAPSED. The consent read
 * fails CLOSED (a throw lands the user on LegalGate, the conservative base). But
 * EVERY branch still resolves `CrisisResources` — the crisis screen is never
 * gated, never delayed, and never dropped, because the state comes from the
 * default resolver either way and only the BASE route is substituted. A
 * consent-store failure degrades to today's known defect; it can never degrade
 * to a missing 988 path.
 */
function secureGetStateFromPath(
  path: string,
  options: Parameters<typeof getStateFromPath>[1],
): ReturnType<typeof getStateFromPath> {
  // Consume-and-clear: one cold start arms exactly one resolution.
  const wasColdStartCrisisLink = coldStartCrisisLinkPending;
  coldStartCrisisLinkPending = false;

  if (!wasColdStartCrisisLink || !isCrisisLinkPath(path)) {
    return getStateFromPath(path, options);
  }

  let consentGranted: boolean;
  try {
    consentGranted = consentGateAllowsNavigation();
  } catch {
    // Fail CLOSED on the consent question only. `getStateFromPath` below still
    // runs, so CrisisResources is still in the resulting state.
    consentGranted = false;
  }

  if (consentGranted) {
    return getStateFromPath(path, options);
  }

  return getStateFromPath(path, PRE_CONSENT_CRISIS_CONFIG);
}

export default linkingConfig;
