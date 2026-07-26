/**
 * DEEP LINKING CONFIGURATION - MAINT-120 Security Implementation
 *
 * Secure deep linking configuration for React Navigation with:
 * - URL validation and sanitization before navigation
 * - Attack pattern detection and blocking
 * - Security event logging
 * - Rate limiting protection
 */

import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import DeepLinkValidationService from '@/core/services/security/DeepLinkValidationService';
import { logSecurity, logError, LogCategory } from '@/core/services/logging';
import type { RootStackParamList } from './CleanRootNavigator';
import { isFeatureEnabled } from '@/core/services/featureFlags';

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
 * FEAT-298 slice 4 — is this deep link gated off by a dark feature flag?
 *
 * The `DailyLoop` Stack.Screen is registered UNCONDITIONALLY (CleanRootNavigator), while
 * the Home card that reaches it is `daily_loop`-gated and the flag ships dark in
 * production. Adding `DailyLoop: 'daily'` to the linking config would therefore make the
 * deep link a FLAG BYPASS: a production user on a dark build could reach a surface that
 * build's QA never exercised. The URL is gated to match the flag.
 *
 * `/crisis` is never gated here under any condition — it is the 988 path.
 */
function isFlagGatedPath(path: string | null | undefined): boolean {
  if (!path) return false;
  const base = path.split('/').filter(Boolean)[0];
  return base === 'daily' && !isFeatureEnabled('daily_loop');
}

/**
 * SECURE GET INITIAL URL
 * Validates the initial URL before allowing navigation
 */
async function getSecureInitialURL(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL();

    if (!url) {
      return null;
    }

    // Validate the URL
    const validation = DeepLinkValidationService.validateDeepLink(url);

    if (!validation.isValid) {
      logSecurity('DeepLink: Initial URL blocked', 'high', {
        originalUrl: url.substring(0, 100),
        errors: validation.errors.map(e => e.code),
      });
      return null;
    }

    if (isFlagGatedPath(validation.metadata.path)) {
      logSecurity('DeepLink: Initial URL dropped (feature flag off)', 'low', {
        path: validation.metadata.path,
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
  // Subscribe to native linking events
  const subscription = Linking.addEventListener('url', (event) => {
    const { url } = event;

    if (!url) {
      return;
    }

    // Validate the URL
    const validation = DeepLinkValidationService.validateDeepLink(url);

    if (!validation.isValid) {
      logSecurity('DeepLink: Runtime URL blocked', 'high', {
        originalUrl: url.substring(0, 100),
        errors: validation.errors.map(e => e.code),
      });
      // Don't call listener - block navigation
      return;
    }

    if (isFlagGatedPath(validation.metadata.path)) {
      logSecurity('DeepLink: Runtime URL dropped (feature flag off)', 'low', {
        path: validation.metadata.path,
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
      MorningFlow: 'morning',
      MiddayFlow: 'midday',
      EveningFlow: 'evening',
      // FEAT-298 slice 4. Route NAME ('DailyLoop') and path TOKEN ('daily') are separate
      // concepts and must not be "harmonized" — the route name is pinned in three places
      // (RootCrisisButton IMMERSIVE_ROUTES, the Stack.Screen, getActiveRootRouteName) and
      // by a Maestro flow. Bare path: no mode/depth params — see ALLOWED_PARAMS.
      DailyLoop: 'daily',

      // Features
      CrisisResources: 'crisis',
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

export default linkingConfig;
