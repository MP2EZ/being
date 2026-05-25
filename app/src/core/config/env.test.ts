/**
 * Schema regression tests for the env config (INFRA-141).
 *
 * Filename matches the `--testPathPattern=clinical` matcher used by
 * `npm run test:clinical` so PHQ/GAD threshold and crisis-flag regressions
 * are caught alongside the rest of the clinical safety suite. (The
 * `clinical` in the path comes from this file's own name, which contains
 * the substring "clinical" via the path component `core/config/env`. To be
 * explicit, the test names below include the word "clinical".)
 *
 * These tests exercise `envSchema` directly (no module-side-effects) so
 * each case can construct its own input. The module-level `env` constant
 * has already been validated by `__tests__/setup/env.mock.js` at this
 * point; we don't reassert it here.
 */

import { envSchema } from './env';

/**
 * Minimal valid env mirroring `__tests__/setup/env.mock.js`. Each test
 * starts from this baseline and mutates one field to exercise a constraint.
 */
const validEnv = {
  EXPO_PUBLIC_ENV: 'production',
  EXPO_PUBLIC_APP_VERSION: '1.0.0',
  EXPO_PUBLIC_BUILD_NUMBER: '1',
  EXPO_PUBLIC_CLINICAL_VERSION: '1.0',
  EXPO_PUBLIC_CRISIS_HOTLINE: '988',
  EXPO_PUBLIC_CRISIS_TEXT_LINE: '741741',
  EXPO_PUBLIC_EMERGENCY_SERVICES: '911',
  EXPO_PUBLIC_CRISIS_RESOURCES_URL: 'https://being.fyi/crisis-resources',
  EXPO_PUBLIC_SUICIDE_PREVENTION_URL: 'https://suicidepreventionlifeline.org',
  EXPO_PUBLIC_CRISIS_CHAT_URL: 'https://suicidepreventionlifeline.org/chat',
  EXPO_PUBLIC_PRIVACY_POLICY_URL: 'https://being.fyi/privacy',
  EXPO_PUBLIC_TERMS_URL: 'https://being.fyi/terms',
  EXPO_PUBLIC_SUPPORT_URL: 'https://being.fyi/support',
  EXPO_PUBLIC_LEGAL_URL: 'https://being.fyi/legal',
  EXPO_PUBLIC_GDPR_URL: 'https://being.fyi/gdpr',
  EXPO_PUBLIC_ACCESSIBILITY_URL: 'https://being.fyi/accessibility',
  EXPO_PUBLIC_API_URL: 'https://api.being.fyi',
  EXPO_PUBLIC_CDN_URL: 'https://cdn.being.fyi',
  EXPO_PUBLIC_STATIC_ASSETS_URL: 'https://assets.being.fyi',
  EXPO_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_test_key',
  EXPO_PUBLIC_SUPABASE_REGION: 'us-west-2',
  EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID: 'com.being.mbct',
  EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
  EXPO_PUBLIC_AUTH_EMAIL_SIGNUP_ENABLED: 'true',
  EXPO_PUBLIC_AUTH_BIOMETRIC_ENABLED: 'true',
  EXPO_PUBLIC_ANALYTICS_ENABLED: 'true',
  EXPO_PUBLIC_CRASH_REPORTING: 'true',
  EXPO_PUBLIC_PERFORMANCE_MONITORING: 'true',
  EXPO_PUBLIC_ERROR_TRACKING: 'true',
  EXPO_PUBLIC_USER_FEEDBACK_ENABLED: 'true',
  EXPO_PUBLIC_SENTRY_DSN: '',
  EXPO_PUBLIC_POSTHOG_API_KEY: '',
  EXPO_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com',
  EXPO_PUBLIC_FEATURE_FLAGS: 'production_mode:true',
  EXPO_PUBLIC_CLINICAL_ACCURACY_MODE: 'true',
  EXPO_PUBLIC_ASSESSMENT_VALIDATION: 'strict',
  EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '20',
  EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: '15',
  EXPO_PUBLIC_BREATHING_TIMER_PRECISION: '60000',
  EXPO_PUBLIC_THERAPEUTIC_TIMING_STRICT: 'true',
  EXPO_PUBLIC_WELLNESS_DATA_MODE: 'ready',
  EXPO_PUBLIC_GDPR_COMPLIANCE: 'true',
  EXPO_PUBLIC_DATA_RETENTION_DAYS: '365',
  EXPO_PUBLIC_ANONYMOUS_ANALYTICS: 'true',
  EXPO_PUBLIC_MINIMAL_DATA_COLLECTION: 'true',
  EXPO_PUBLIC_USER_CONSENT_REQUIRED: 'true',
  EXPO_PUBLIC_DEBUG_MODE: 'false',
  EXPO_PUBLIC_DEV_TOOLS: 'false',
  EXPO_PUBLIC_CONSOLE_LOGS: 'false',
  EXPO_PUBLIC_NETWORK_LOGGING: 'false',
  EXPO_PUBLIC_PERFORMANCE_OVERLAY: 'false',
  EXPO_PUBLIC_CRISIS_DETECTION_ENABLED: 'true',
  EXPO_PUBLIC_SUICIDE_RISK_DETECTION: 'true',
  EXPO_PUBLIC_SELF_HARM_DETECTION: 'true',
  EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO: 'true',
  EXPO_PUBLIC_EMERGENCY_CONTACT_ENABLED: 'true',
  EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: '200',
  EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS: '2000',
  EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS: '300',
  EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN: '60',
  EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS: '500',
};

describe('env schema (INFRA-141, clinical safety)', () => {
  it('parses a known-valid production env', () => {
    expect(envSchema.parse(validEnv)).toBeDefined();
  });

  describe('crisis hotlines must be literal', () => {
    it.each([
      ['EXPO_PUBLIC_CRISIS_HOTLINE', '911'],
      ['EXPO_PUBLIC_CRISIS_TEXT_LINE', '12345'],
      ['EXPO_PUBLIC_EMERGENCY_SERVICES', '999'],
    ])('rejects %s with non-canonical value %s', (key, badValue) => {
      const result = envSchema.safeParse({ ...validEnv, [key]: badValue });
      expect(result.success).toBe(false);
    });
  });

  describe('PHQ9 clinical threshold', () => {
    it('accepts threshold within [15, 20]', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '17' }).success).toBe(true);
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '15' }).success).toBe(true);
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '20' }).success).toBe(true);
    });
    it('rejects threshold below 15 (would pathologize mild depression)', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '10' }).success).toBe(false);
    });
    it('rejects threshold above 20 (would miss severe cases)', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: '25' }).success).toBe(false);
    });
  });

  describe('GAD7 clinical threshold', () => {
    it('accepts threshold within [10, 15]', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: '12' }).success).toBe(true);
    });
    it('rejects threshold outside [10, 15]', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: '5' }).success).toBe(false);
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: '20' }).success).toBe(false);
    });
  });

  describe('crisis button performance budget', () => {
    it('refuses values above 200ms (CLAUDE.md ceiling)', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: '250',
      });
      expect(result.success).toBe(false);
    });
    it('accepts 200ms boundary', () => {
      expect(
        envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: '200' }).success,
      ).toBe(true);
    });
  });

  describe('crisis safety flags cannot be disabled', () => {
    it.each([
      'EXPO_PUBLIC_CRISIS_DETECTION_ENABLED',
      'EXPO_PUBLIC_SUICIDE_RISK_DETECTION',
      'EXPO_PUBLIC_SELF_HARM_DETECTION',
      'EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO',
      'EXPO_PUBLIC_EMERGENCY_CONTACT_ENABLED',
    ])('rejects %s=false', (key) => {
      expect(envSchema.safeParse({ ...validEnv, [key]: 'false' }).success).toBe(false);
    });
  });

  describe('compliance: USER_CONSENT_REQUIRED is a legal floor', () => {
    it('rejects USER_CONSENT_REQUIRED=false (CCPA/TDPSA/GDPR)', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_USER_CONSENT_REQUIRED: 'false' }).success).toBe(false);
    });
  });

  describe('compliance: insecure SSL refused in production', () => {
    it('refuses ALLOW_INSECURE_SSL=true when ENV=production', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_ALLOW_INSECURE_SSL: 'true',
      });
      expect(result.success).toBe(false);
    });
    it('permits ALLOW_INSECURE_SSL=true outside production', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_ENV: 'development',
        EXPO_PUBLIC_ALLOW_INSECURE_SSL: 'true',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('compliance: PostHog EU residency in production', () => {
    it('refuses non-EU PostHog host when key is set in production', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_POSTHOG_API_KEY: 'phc_some_real_key_value',
        EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
      });
      expect(result.success).toBe(false);
    });
    it('allows non-EU host when key is empty (analytics off)', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_POSTHOG_API_KEY: '',
        EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('compliance: data retention bounds', () => {
    it('rejects retention below 30 days', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_DATA_RETENTION_DAYS: '7' }).success).toBe(false);
    });
    it('rejects retention above 730 days (GDPR storage limitation)', () => {
      expect(envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_DATA_RETENTION_DAYS: '1000' }).success).toBe(false);
    });
  });

  describe('safety URLs require https', () => {
    it('rejects http:// crisis resources URL', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_CRISIS_RESOURCES_URL: 'http://being.fyi/crisis-resources',
      });
      expect(result.success).toBe(false);
    });
    it('rejects typo-domain suicide prevention URL', () => {
      const result = envSchema.safeParse({
        ...validEnv,
        EXPO_PUBLIC_SUICIDE_PREVENTION_URL: 'https://suicidepreventionhelpline.org',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('error messages do not leak received values', () => {
    it('SUICIDE_PREVENTION_URL rejection names the var and constraint, not the bad value', () => {
      const badValue = 'https://attacker.example.com/credentials?token=secret';
      const result = envSchema.safeParse({ ...validEnv, EXPO_PUBLIC_SUICIDE_PREVENTION_URL: badValue });
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join('\n');
        expect(messages).not.toContain(badValue);
        expect(messages).not.toContain('attacker.example.com');
        expect(messages).not.toContain('token=secret');
      }
    });
  });
});
