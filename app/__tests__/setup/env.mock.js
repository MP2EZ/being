/**
 * Test-env injection — must run before any source module imports `@/core/config/env`.
 *
 * Wired via jest.config.js `setupFiles` (which runs before setupFilesAfterEnv and before
 * the test framework finishes initializing modules). Sets every EXPO_PUBLIC_* var the
 * zod schema validates, so that `import { env } from '@/core/config/env'` succeeds in
 * the jest runtime without requiring a real .env file.
 *
 * Values mirror app/.env.production where doing so is safe, with the following
 * deliberate exceptions:
 *   - SENTRY_DSN is empty (test runs must not phone home to Sentry).
 *   - POSTHOG_API_KEY is empty (no analytics from tests).
 *   - ALLOW_INSECURE_SSL stays unset (defaults to 'false' per schema).
 *
 * INFRA-141.
 */

const ENV = {
  // Core
  EXPO_PUBLIC_ENV: 'production',
  EXPO_PUBLIC_APP_VERSION: '1.0.0',
  EXPO_PUBLIC_BUILD_NUMBER: '1',
  EXPO_PUBLIC_CLINICAL_VERSION: '1.0',

  // Crisis & emergency (literals — must match prod)
  EXPO_PUBLIC_CRISIS_HOTLINE: '988',
  EXPO_PUBLIC_CRISIS_TEXT_LINE: '741741',
  EXPO_PUBLIC_EMERGENCY_SERVICES: '911',
  EXPO_PUBLIC_CRISIS_RESOURCES_URL: 'https://being.fyi/crisis-resources',
  EXPO_PUBLIC_SUICIDE_PREVENTION_URL: 'https://suicidepreventionlifeline.org',
  EXPO_PUBLIC_CRISIS_CHAT_URL: 'https://suicidepreventionlifeline.org/chat',

  // Legal & support URLs
  EXPO_PUBLIC_PRIVACY_POLICY_URL: 'https://being.fyi/privacy',
  EXPO_PUBLIC_TERMS_URL: 'https://being.fyi/terms',
  EXPO_PUBLIC_SUPPORT_URL: 'https://being.fyi/support',
  EXPO_PUBLIC_LEGAL_URL: 'https://being.fyi/legal',
  EXPO_PUBLIC_GDPR_URL: 'https://being.fyi/gdpr',
  EXPO_PUBLIC_ACCESSIBILITY_URL: 'https://being.fyi/accessibility',

  // API
  EXPO_PUBLIC_API_URL: 'https://api.being.fyi',
  EXPO_PUBLIC_CDN_URL: 'https://cdn.being.fyi',
  EXPO_PUBLIC_STATIC_ASSETS_URL: 'https://assets.being.fyi',

  // Supabase
  EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_test_key_value_for_jest_env',
  EXPO_PUBLIC_SUPABASE_REGION: 'us-west-2',

  // Auth
  EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID: 'com.being.app',
  EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
  EXPO_PUBLIC_AUTH_EMAIL_SIGNUP_ENABLED: 'true',
  EXPO_PUBLIC_AUTH_BIOMETRIC_ENABLED: 'true',

  // Analytics & monitoring
  EXPO_PUBLIC_ANALYTICS_ENABLED: 'true',
  EXPO_PUBLIC_CRASH_REPORTING: 'true',
  EXPO_PUBLIC_PERFORMANCE_MONITORING: 'true',
  EXPO_PUBLIC_ERROR_TRACKING: 'true',
  EXPO_PUBLIC_USER_FEEDBACK_ENABLED: 'true',

  // Sentry & PostHog — empty in tests so no network egress
  EXPO_PUBLIC_SENTRY_DSN: '',
  EXPO_PUBLIC_POSTHOG_API_KEY: '',
  EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',

  // Feature flags
  EXPO_PUBLIC_FEATURE_FLAGS: 'production_mode:true,crisis_detection:true',

  // Clinical / therapeutic
  EXPO_PUBLIC_CLINICAL_ACCURACY_MODE: 'true',
  EXPO_PUBLIC_ASSESSMENT_VALIDATION: 'strict',
  EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '20',
  EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: '15',
  EXPO_PUBLIC_BREATHING_TIMER_PRECISION: '60000',
  EXPO_PUBLIC_THERAPEUTIC_TIMING_STRICT: 'true',

  // Compliance
  EXPO_PUBLIC_WELLNESS_DATA_MODE: 'ready',
  EXPO_PUBLIC_GDPR_COMPLIANCE: 'true',
  EXPO_PUBLIC_DATA_RETENTION_DAYS: '365',
  EXPO_PUBLIC_ANONYMOUS_ANALYTICS: 'true',
  EXPO_PUBLIC_MINIMAL_DATA_COLLECTION: 'true',
  EXPO_PUBLIC_USER_CONSENT_REQUIRED: 'true',

  // Debug
  EXPO_PUBLIC_DEBUG_MODE: 'false',
  EXPO_PUBLIC_DEV_TOOLS: 'false',
  EXPO_PUBLIC_CONSOLE_LOGS: 'false',
  EXPO_PUBLIC_NETWORK_LOGGING: 'false',
  EXPO_PUBLIC_PERFORMANCE_OVERLAY: 'false',

  // Crisis detection
  EXPO_PUBLIC_CRISIS_DETECTION_ENABLED: 'true',
  EXPO_PUBLIC_SUICIDE_RISK_DETECTION: 'true',
  EXPO_PUBLIC_SELF_HARM_DETECTION: 'true',
  EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO: 'true',
  EXPO_PUBLIC_EMERGENCY_CONTACT_ENABLED: 'true',

  // Performance budgets (CLAUDE.md ceilings)
  EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: '200',
  EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS: '2000',
  EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS: '300',
  EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN: '60',
  EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS: '500',
};

for (const [key, value] of Object.entries(ENV)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
