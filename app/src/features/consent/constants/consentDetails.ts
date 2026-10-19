/**
 * CONSENT CATEGORY COPY
 *
 * Plain-language descriptions for the four OPTIONAL `ConsentPreferences`
 * toggles (`consentStore.ts:91-99`). One copy, two consumers: the onboarding
 * privacy step (`OnboardingScreen.tsx`) and the re-consent screen
 * (`ReConsentScreen.tsx`, FEAT-376).
 *
 * Extracted from `OnboardingScreen.tsx` in FEAT-376. The re-consent screen must
 * re-ask these four with the SAME descriptions the user agreed to originally —
 * two divergent copies of consent text is a GDPR Art. 7(2) "clear and plain
 * language" problem waiting to happen, and the drift would be invisible.
 *
 * 🚫 THE FIFTH PREFERENCE IS NOT HERE, AND MUST NOT BE ADDED.
 * `mentalHealthProcessingConsent` is GDPR Art. 9(2)(a) explicit consent for
 * special-category data. It is not an optional product toggle, it is never
 * rendered by `ConsentToggleCard`, and it has no truthful
 * `whatWeCollect`/`whatWeDontCollect`/`whyItHelps` triple. It is collected as a
 * document-style acceptance alongside the Terms and Privacy Policy — see
 * `CombinedLegalGateScreen.tsx:360-377` and `ReConsentScreen.tsx`.
 */

import type { ConsentToggleCardProps } from '../components/ConsentToggleCard';
import { OPERATIONAL_TELEMETRY_DISCLOSURE } from '@/core/services/supabase/operationalEvents';

/** The shape `ConsentToggleCard` consumes, minus the per-render state. */
type ConsentCategoryCopy = Pick<ConsentToggleCardProps, 'title' | 'description' | 'details'>;

/**
 * Keyed by category, NOT by `ConsentPreferences` field name — the mapping to
 * `analyticsEnabled` / `crashReportsEnabled` / `cloudSyncEnabled` /
 * `researchEnabled` is each screen's business.
 */
export const CONSENT_DETAILS = {
  analytics: {
    title: 'Analytics',
    description: 'Help us improve the app by understanding how it\'s used',
    details: {
      // DEBUG-788: matches what PostHog actually stores (project 111221, checked 2026-10-14)
      // and privacy-policy §5.2. Every event carries a device-persistent random identifier,
      // and the project's GeoIP transformation adds city and country, so nothing here may
      // claim anonymity or rule out location. No retention figure: nothing in the app
      // enforces one on PostHog's side (DEBUG-793). Pinned by
      // analyticsConsentCopy.privacy.test.ts.
      whatWeCollect: [
        'Which features and screens you use, including when you open a check-in, a wellness screening or support resources (never your answers, scores or what you write)',
        'When you open the app and how long you spend in it',
        'Device and app details: device model, OS and app version, screen size, language and time zone',
        'A random identifier created for this installation of the app',
        'Your approximate location (city and country), which our analytics provider estimates from your internet connection',
      ],
      whatWeDontCollect: [
        'Your journal entries, mood ratings, or PHQ-9/GAD-7 responses and scores',
        'Your name, email, or account identifier',
        'Your advertising identifier',
        'Your precise (GPS) location, or your IP address',
      ],
      whyItHelps: 'Understanding usage patterns helps us improve features you care about and fix confusing flows.',
      privacyNote: 'Sent to our analytics provider, PostHog (EU servers, Frankfurt), over an encrypted connection. The installation identifier is not linked to your account. Turning this off stops collection immediately.',
    },
  },
  crashReports: {
    title: 'Crash Reports',
    description: 'Automatically report errors to fix bugs faster',
    details: {
      // DEBUG-779: matches what the consented Sentry client sends (DEBUG-776) and
      // privacy-policy §5.1. Release-health sessions carry a per-install identifier, so
      // nothing here may claim anonymity; "encrypted" means in transit only.
      // DEBUG-786: native crash events also carry a device identifier (device_app_hash) and a
      // city/country Sentry derives at ingest — observed, Sentry event bf0dd8b4…, DPIA 2.43.
      whatWeCollect: [
        "Technical error details (which part of the app's code failed)",
        'Device and app details, such as OS version and app version',
        'App-session diagnostics (when a session starts and ends, and whether it crashed), used to measure app stability',
        'Identifiers created for this installation of the app',
        'Your approximate location (city and country), which our crash-reporting provider estimates from your internet connection',
      ],
      whatWeDontCollect: [
        'Your mood check-ins, journal entries, or PHQ-9/GAD-7 responses and scores',
        'Your name, email, or account identifier',
        'Your precise (GPS) location, or your IP address',
      ],
      whyItHelps: 'Crashes disrupt your practice. Automatic reports help us detect and fix issues before they affect more people.',
      privacyNote: 'Sent to our crash-reporting provider, Sentry, over an encrypted connection. These identifiers are not linked to your account or your wellness data. Turning this off stops all crash and session reporting.',
    },
  },
  cloudSync: {
    title: 'Cloud Backup',
    description: 'Back up a few app settings to encrypted cloud storage',
    details: {
      // TWO disjoint sources, both pinned by cloudBackupConsentCopy.privacy.test.ts:
      //   1. the backup PAYLOAD (DEBUG-614), and
      //   2. the operational TELEMETRY sent under this same consent (DEBUG-625).
      // DEBUG-614 pinned only the payload, so the card ended up describing strictly
      // less than the consent covered — six server-side event types, each stamped with
      // the anonymous account identifier, appeared nowhere. The `whatWeCollect` heading
      // reads as exhaustive, which made that an FTC §5 omission independent of the
      // legal-basis question.
      // 'A last-sync timestamp' was REMOVED with the field itself (DEBUG-625 AC1).
      whatWeCollect: [
        'Your autosave setting',
        OPERATIONAL_TELEMETRY_DISCLOSURE,
      ],
      whatWeDontCollect: [
        'Journal entries',
        'Mood check-ins',
        'PHQ-9/GAD-7 responses and scores',
      ],
      whyItHelps: 'Lets these settings be restored on this device. Your wellness history stays on your device and is not part of the backup.',
      privacyNote: 'Encrypted on your device before upload. We cannot read it.',
    },
  },
  research: {
    title: 'Research Participation',
    // DEBUG-788: no code consumes the research grant (canary in
    // analyticsConsentCopy.privacy.test.ts). When a research path is built, re-derive this
    // card from it and bump CONSENT_VERSION.
    description: 'Not active. Nothing is collected for research today.',
    details: {
      whatWeCollect: [
        'Nothing. Being does not currently run a research program.',
      ],
      whatWeDontCollect: [
        'Any of your data, while no research program is running',
        'Data shared with third parties for advertising',
      ],
      whyItHelps: 'If we start a research program, this records that you are open to being asked.',
      privacyNote: 'Before any research data is collected, we will tell you exactly what it includes and ask for your consent again. You can turn this off anytime.',
    },
  },
} satisfies Record<string, ConsentCategoryCopy>;

export type ConsentCategoryKey = keyof typeof CONSENT_DETAILS;
