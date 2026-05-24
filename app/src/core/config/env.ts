/**
 * Typed env schema + runtime validation (INFRA-141).
 *
 * Reads every EXPO_PUBLIC_* var the app depends on, validates with zod, and
 * exports a typed `env` constant. Schema parses at module-load time — if any
 * required var is missing or any safety-critical var is out of its allowed
 * range, the app refuses to boot.
 *
 * Why this exists: PostHog was silently disabled in production for months
 * because `EXPO_PUBLIC_POSTHOG_API_KEY` was never set, and the
 * `process.env[...] || ''` fallback pattern across the codebase made it
 * invisible. This schema replaces that pattern with fail-loud validation.
 *
 * Inlining note: Expo's babel transform (`babel-preset-expo`) inlines
 * `process.env['EXPO_PUBLIC_*']` reads at build time, but only when the key
 * appears as a static string literal. The `readRawEnv()` builder below
 * enumerates each key explicitly to preserve that inlining — DO NOT
 * refactor to `Object.entries(process.env)` or destructuring.
 *
 * Specialist constraints baked in:
 *   - Crisis (988/741741/911, PHQ/GAD thresholds, performance budgets):
 *     `.literal()` for hotlines + safety flags, ranges for thresholds.
 *   - Compliance (CCPA/TDPSA/GDPR): error messages never interpolate
 *     received values; USER_CONSENT_REQUIRED has no `.default('false')`
 *     escape; ALLOW_INSECURE_SSL refuses boot in production.
 *
 * Stale-name vars (`HIPAA_COMPLIANCE_MODE`, `CLINICAL_*`) are accepted as-is
 * for schema compatibility; renaming is INFRA-142.
 */

import { z } from 'zod';

// ---- helpers --------------------------------------------------------------

const httpsUrl = z.string().url().refine((u) => u.startsWith('https://'), {
  message: 'must use https://',
});

const booleanString = z.enum(['true', 'false']);

// Lenient "truthy/empty" pattern for opt-in vars whose absence == disabled.
// Used for analytics/error-reporting keys that can legitimately be unset.
const optionalApiKey = z.string().default('');

// ---- schema ---------------------------------------------------------------

export const envSchema = z
  .object({
    // === Core ===
    EXPO_PUBLIC_ENV: z.enum(['development', 'staging', 'production']),
    EXPO_PUBLIC_APP_VERSION: z.string().min(1),
    EXPO_PUBLIC_BUILD_NUMBER: z.string().min(1),
    EXPO_PUBLIC_CLINICAL_VERSION: z.string().min(1),

    // === Crisis hotlines — literals (refuse boot if changed) ===
    // 988 is the federally mandated Suicide & Crisis Lifeline short code.
    // 741741 is the Crisis Text Line short code. 911 is US emergency.
    // No legitimate runtime override; international support belongs in code,
    // not env.
    EXPO_PUBLIC_CRISIS_HOTLINE: z.literal('988'),
    EXPO_PUBLIC_CRISIS_TEXT_LINE: z.literal('741741'),
    EXPO_PUBLIC_EMERGENCY_SERVICES: z.literal('911'),

    // === Crisis URLs ===
    EXPO_PUBLIC_CRISIS_RESOURCES_URL: httpsUrl,
    // Soft-pin: typo'd or hijacked suicide-prevention domain is catastrophic.
    // Allow either the current canonical domain or the legacy alias.
    EXPO_PUBLIC_SUICIDE_PREVENTION_URL: z
      .string()
      .url()
      .refine(
        (u) =>
          u.startsWith('https://988lifeline.org') ||
          u.startsWith('https://suicidepreventionlifeline.org'),
        { message: 'must point to 988lifeline.org or suicidepreventionlifeline.org' },
      ),
    EXPO_PUBLIC_CRISIS_CHAT_URL: httpsUrl,

    // === Legal & support URLs ===
    EXPO_PUBLIC_PRIVACY_POLICY_URL: httpsUrl,
    EXPO_PUBLIC_TERMS_URL: httpsUrl,
    EXPO_PUBLIC_SUPPORT_URL: httpsUrl,
    EXPO_PUBLIC_LEGAL_URL: httpsUrl,
    EXPO_PUBLIC_GDPR_URL: httpsUrl,
    EXPO_PUBLIC_ACCESSIBILITY_URL: httpsUrl,

    // === API ===
    EXPO_PUBLIC_API_URL: httpsUrl,
    EXPO_PUBLIC_CDN_URL: httpsUrl,
    EXPO_PUBLIC_STATIC_ASSETS_URL: httpsUrl,

    // === Supabase ===
    EXPO_PUBLIC_SUPABASE_URL: httpsUrl,
    EXPO_PUBLIC_SUPABASE_KEY: z.string().min(1),
    EXPO_PUBLIC_SUPABASE_REGION: z.string().min(1),

    // === Auth ===
    EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID: z.string().min(1),
    EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
    EXPO_PUBLIC_AUTH_EMAIL_SIGNUP_ENABLED: booleanString,
    EXPO_PUBLIC_AUTH_BIOMETRIC_ENABLED: booleanString,

    // === Analytics & monitoring ===
    EXPO_PUBLIC_ANALYTICS_ENABLED: booleanString,
    EXPO_PUBLIC_CRASH_REPORTING: booleanString,
    EXPO_PUBLIC_PERFORMANCE_MONITORING: booleanString,
    EXPO_PUBLIC_ERROR_TRACKING: booleanString,
    EXPO_PUBLIC_USER_FEEDBACK_ENABLED: booleanString,

    // === Sentry & PostHog ===
    // Both keys are client-public by design (they ship in the JS bundle).
    // Empty string == disabled (intentional: dev env runs with no DSN).
    EXPO_PUBLIC_SENTRY_DSN: z
      .string()
      .refine((v) => v === '' || /^https:\/\/[^@]+@[^/]+\/\d+$/.test(v), {
        message: 'must be empty or a valid Sentry DSN (https://KEY@HOST/PROJECT_ID)',
      }),
    EXPO_PUBLIC_POSTHOG_API_KEY: optionalApiKey,
    EXPO_PUBLIC_POSTHOG_HOST: z.string().url(), // EU residency check is conditional — see superRefine below

    // === Feature flags (string blob, parsed by consumers) ===
    EXPO_PUBLIC_FEATURE_FLAGS: z.string().min(1),

    // === Clinical / therapeutic ===
    // Stale-naming: CLINICAL_* vars are kept for compatibility; rename to
    // ASSESSMENT_* is tracked in INFRA-142.
    EXPO_PUBLIC_CLINICAL_ACCURACY_MODE: booleanString,
    EXPO_PUBLIC_ASSESSMENT_VALIDATION: z.literal('strict'),
    // PHQ-9: CLAUDE.md fixes ≥15 = support, ≥20 = active intervention. This
    // var controls the active-intervention trigger. Range [15, 20] = the safe
    // band; default 20 matches CLAUDE.md.
    EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: z.coerce.number().int().min(15).max(20).default(20),
    // GAD-7: range [10, 15]; default 15 matches CLAUDE.md.
    EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: z.coerce.number().int().min(10).max(15).default(15),
    EXPO_PUBLIC_BREATHING_TIMER_PRECISION: z.coerce.number().int().positive(),
    EXPO_PUBLIC_THERAPEUTIC_TIMING_STRICT: booleanString,

    // === Compliance ===
    // Stale-naming: HIPAA_COMPLIANCE_MODE retained for compatibility. Being is
    // NOT a HIPAA-covered entity (see docs/legal/regulatory-applicability.md).
    // Rename tracked in INFRA-142.
    EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE: z.string().min(1),
    EXPO_PUBLIC_GDPR_COMPLIANCE: booleanString,
    // 30 days minimum (operational floor + GDPR erasure-window compatibility);
    // 730 days (2 years) maximum (beyond is a misconfig signal and conflicts
    // with GDPR Art. 5(1)(e) storage-limitation principle).
    EXPO_PUBLIC_DATA_RETENTION_DAYS: z.coerce.number().int().min(30).max(730),
    EXPO_PUBLIC_ANONYMOUS_ANALYTICS: booleanString,
    EXPO_PUBLIC_MINIMAL_DATA_COLLECTION: booleanString,
    // Legal floor under CCPA/TDPSA/GDPR — no default escape, no false escape.
    EXPO_PUBLIC_USER_CONSENT_REQUIRED: z.literal('true'),

    // === Debug ===
    EXPO_PUBLIC_DEBUG_MODE: booleanString,
    EXPO_PUBLIC_DEV_TOOLS: booleanString,
    EXPO_PUBLIC_CONSOLE_LOGS: booleanString,
    EXPO_PUBLIC_NETWORK_LOGGING: booleanString,
    EXPO_PUBLIC_PERFORMANCE_OVERLAY: booleanString,

    // === Crisis detection safety flags (all must stay enabled) ===
    EXPO_PUBLIC_CRISIS_DETECTION_ENABLED: z.literal('true'),
    EXPO_PUBLIC_SUICIDE_RISK_DETECTION: z.literal('true'),
    EXPO_PUBLIC_SELF_HARM_DETECTION: z.literal('true'),
    EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO: z.literal('true'),
    EXPO_PUBLIC_EMERGENCY_CONTACT_ENABLED: z.literal('true'),

    // === Performance budgets (CLAUDE.md ceilings) ===
    // Each MAX_MS field is a ceiling. Floors prevent zero/negative values
    // from silently disabling the budget check.
    EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: z.coerce.number().int().min(50).max(200).default(200),
    EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS: z.coerce.number().int().min(500).max(2000).default(2000),
    EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS: z.coerce.number().int().min(100).max(300).default(300),
    EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN: z.coerce.number().int().min(60).max(120).default(60),
    EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS: z.coerce.number().int().min(100).max(500).default(500),

    // === Undocumented runtime override (compliance/security boundary) ===
    // Read by certificate-pinning.ts. Absent from .env files (default = false).
    // Schema refuses boot if set truthy in production env (see superRefine).
    EXPO_PUBLIC_ALLOW_INSECURE_SSL: booleanString.default('false'),
  })
  .superRefine((env, ctx) => {
    // Insecure SSL must not be enabled in production builds.
    if (env.EXPO_PUBLIC_ENV === 'production' && env.EXPO_PUBLIC_ALLOW_INSECURE_SSL === 'true') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EXPO_PUBLIC_ALLOW_INSECURE_SSL'],
        message: 'must be false when EXPO_PUBLIC_ENV=production',
      });
    }
    // PostHog host must be EU-region in production (GDPR data residency).
    if (
      env.EXPO_PUBLIC_ENV === 'production' &&
      env.EXPO_PUBLIC_POSTHOG_API_KEY !== '' &&
      !/\beu\b.*posthog\.com$/.test(env.EXPO_PUBLIC_POSTHOG_HOST)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['EXPO_PUBLIC_POSTHOG_HOST'],
        message: 'must point to a PostHog EU host (.eu.posthog.com pattern) when API key is set in production',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

// Explicit per-key read to preserve babel inlining (see header note).
function readRawEnv(): Record<string, string | undefined> {
  return {
    EXPO_PUBLIC_ENV: process.env['EXPO_PUBLIC_ENV'],
    EXPO_PUBLIC_APP_VERSION: process.env['EXPO_PUBLIC_APP_VERSION'],
    EXPO_PUBLIC_BUILD_NUMBER: process.env['EXPO_PUBLIC_BUILD_NUMBER'],
    EXPO_PUBLIC_CLINICAL_VERSION: process.env['EXPO_PUBLIC_CLINICAL_VERSION'],
    EXPO_PUBLIC_CRISIS_HOTLINE: process.env['EXPO_PUBLIC_CRISIS_HOTLINE'],
    EXPO_PUBLIC_CRISIS_TEXT_LINE: process.env['EXPO_PUBLIC_CRISIS_TEXT_LINE'],
    EXPO_PUBLIC_EMERGENCY_SERVICES: process.env['EXPO_PUBLIC_EMERGENCY_SERVICES'],
    EXPO_PUBLIC_CRISIS_RESOURCES_URL: process.env['EXPO_PUBLIC_CRISIS_RESOURCES_URL'],
    EXPO_PUBLIC_SUICIDE_PREVENTION_URL: process.env['EXPO_PUBLIC_SUICIDE_PREVENTION_URL'],
    EXPO_PUBLIC_CRISIS_CHAT_URL: process.env['EXPO_PUBLIC_CRISIS_CHAT_URL'],
    EXPO_PUBLIC_PRIVACY_POLICY_URL: process.env['EXPO_PUBLIC_PRIVACY_POLICY_URL'],
    EXPO_PUBLIC_TERMS_URL: process.env['EXPO_PUBLIC_TERMS_URL'],
    EXPO_PUBLIC_SUPPORT_URL: process.env['EXPO_PUBLIC_SUPPORT_URL'],
    EXPO_PUBLIC_LEGAL_URL: process.env['EXPO_PUBLIC_LEGAL_URL'],
    EXPO_PUBLIC_GDPR_URL: process.env['EXPO_PUBLIC_GDPR_URL'],
    EXPO_PUBLIC_ACCESSIBILITY_URL: process.env['EXPO_PUBLIC_ACCESSIBILITY_URL'],
    EXPO_PUBLIC_API_URL: process.env['EXPO_PUBLIC_API_URL'],
    EXPO_PUBLIC_CDN_URL: process.env['EXPO_PUBLIC_CDN_URL'],
    EXPO_PUBLIC_STATIC_ASSETS_URL: process.env['EXPO_PUBLIC_STATIC_ASSETS_URL'],
    EXPO_PUBLIC_SUPABASE_URL: process.env['EXPO_PUBLIC_SUPABASE_URL'],
    EXPO_PUBLIC_SUPABASE_KEY: process.env['EXPO_PUBLIC_SUPABASE_KEY'],
    EXPO_PUBLIC_SUPABASE_REGION: process.env['EXPO_PUBLIC_SUPABASE_REGION'],
    EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID: process.env['EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID'],
    EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID: process.env['EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID'],
    EXPO_PUBLIC_AUTH_EMAIL_SIGNUP_ENABLED: process.env['EXPO_PUBLIC_AUTH_EMAIL_SIGNUP_ENABLED'],
    EXPO_PUBLIC_AUTH_BIOMETRIC_ENABLED: process.env['EXPO_PUBLIC_AUTH_BIOMETRIC_ENABLED'],
    EXPO_PUBLIC_ANALYTICS_ENABLED: process.env['EXPO_PUBLIC_ANALYTICS_ENABLED'],
    EXPO_PUBLIC_CRASH_REPORTING: process.env['EXPO_PUBLIC_CRASH_REPORTING'],
    EXPO_PUBLIC_PERFORMANCE_MONITORING: process.env['EXPO_PUBLIC_PERFORMANCE_MONITORING'],
    EXPO_PUBLIC_ERROR_TRACKING: process.env['EXPO_PUBLIC_ERROR_TRACKING'],
    EXPO_PUBLIC_USER_FEEDBACK_ENABLED: process.env['EXPO_PUBLIC_USER_FEEDBACK_ENABLED'],
    EXPO_PUBLIC_SENTRY_DSN: process.env['EXPO_PUBLIC_SENTRY_DSN'],
    EXPO_PUBLIC_POSTHOG_API_KEY: process.env['EXPO_PUBLIC_POSTHOG_API_KEY'],
    EXPO_PUBLIC_POSTHOG_HOST: process.env['EXPO_PUBLIC_POSTHOG_HOST'],
    EXPO_PUBLIC_FEATURE_FLAGS: process.env['EXPO_PUBLIC_FEATURE_FLAGS'],
    EXPO_PUBLIC_CLINICAL_ACCURACY_MODE: process.env['EXPO_PUBLIC_CLINICAL_ACCURACY_MODE'],
    EXPO_PUBLIC_ASSESSMENT_VALIDATION: process.env['EXPO_PUBLIC_ASSESSMENT_VALIDATION'],
    EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: process.env['EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD'],
    EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: process.env['EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD'],
    EXPO_PUBLIC_BREATHING_TIMER_PRECISION: process.env['EXPO_PUBLIC_BREATHING_TIMER_PRECISION'],
    EXPO_PUBLIC_THERAPEUTIC_TIMING_STRICT: process.env['EXPO_PUBLIC_THERAPEUTIC_TIMING_STRICT'],
    EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE: process.env['EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE'],
    EXPO_PUBLIC_GDPR_COMPLIANCE: process.env['EXPO_PUBLIC_GDPR_COMPLIANCE'],
    EXPO_PUBLIC_DATA_RETENTION_DAYS: process.env['EXPO_PUBLIC_DATA_RETENTION_DAYS'],
    EXPO_PUBLIC_ANONYMOUS_ANALYTICS: process.env['EXPO_PUBLIC_ANONYMOUS_ANALYTICS'],
    EXPO_PUBLIC_MINIMAL_DATA_COLLECTION: process.env['EXPO_PUBLIC_MINIMAL_DATA_COLLECTION'],
    EXPO_PUBLIC_USER_CONSENT_REQUIRED: process.env['EXPO_PUBLIC_USER_CONSENT_REQUIRED'],
    EXPO_PUBLIC_DEBUG_MODE: process.env['EXPO_PUBLIC_DEBUG_MODE'],
    EXPO_PUBLIC_DEV_TOOLS: process.env['EXPO_PUBLIC_DEV_TOOLS'],
    EXPO_PUBLIC_CONSOLE_LOGS: process.env['EXPO_PUBLIC_CONSOLE_LOGS'],
    EXPO_PUBLIC_NETWORK_LOGGING: process.env['EXPO_PUBLIC_NETWORK_LOGGING'],
    EXPO_PUBLIC_PERFORMANCE_OVERLAY: process.env['EXPO_PUBLIC_PERFORMANCE_OVERLAY'],
    EXPO_PUBLIC_CRISIS_DETECTION_ENABLED: process.env['EXPO_PUBLIC_CRISIS_DETECTION_ENABLED'],
    EXPO_PUBLIC_SUICIDE_RISK_DETECTION: process.env['EXPO_PUBLIC_SUICIDE_RISK_DETECTION'],
    EXPO_PUBLIC_SELF_HARM_DETECTION: process.env['EXPO_PUBLIC_SELF_HARM_DETECTION'],
    EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO: process.env['EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO'],
    EXPO_PUBLIC_EMERGENCY_CONTACT_ENABLED: process.env['EXPO_PUBLIC_EMERGENCY_CONTACT_ENABLED'],
    EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: process.env['EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS'],
    EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS: process.env['EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS'],
    EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS: process.env['EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS'],
    EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN: process.env['EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN'],
    EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS: process.env['EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS'],
    EXPO_PUBLIC_ALLOW_INSECURE_SSL: process.env['EXPO_PUBLIC_ALLOW_INSECURE_SSL'],
  };
}

// Format zod errors without leaking received values into output. Compliance
// requirement: error messages may name the variable and constraint but must
// not interpolate `ctx.data` or any received string (could include API keys,
// auth URLs with credentials, etc.).
function formatIssues(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.join('.') || '(root)';
      return `  - ${path}: ${issue.message}`;
    })
    .join('\n');
}

export function parseEnv(rawEnv: Record<string, string | undefined> = readRawEnv()): Env {
  const result = envSchema.safeParse(rawEnv);
  if (result.success) {
    return result.data;
  }
  const summary = formatIssues(result.error.issues);
  throw new Error(
    `Environment validation failed (INFRA-141). The app cannot start with an invalid env.\n${summary}\n\n` +
      `Check ~/dev/being/.config/env.production (or env.development). See app/src/core/config/env.ts for the schema.`,
  );
}

export const env: Env = parseEnv();
