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
      whatWeCollect: [
        'Which features you use (e.g., "Daily Check-in completed")',
        'How long you spend in the app',
        'Device type (iPhone, Android, etc.)',
      ],
      whatWeDontCollect: [
        'Your journal entries, mood ratings, or assessment scores',
        'Any personally identifiable information',
        'Location data',
      ],
      whyItHelps: 'Understanding usage patterns helps us improve features you care about and fix confusing flows.',
      privacyNote: 'Data retention: 90 days, then automatically deleted. Anonymized before storage.',
    },
  },
  crashReports: {
    title: 'Crash Reports',
    description: 'Automatically report errors to fix bugs faster',
    details: {
      whatWeCollect: [
        'Technical error logs (which code failed)',
        'Device info (OS version, app version)',
        'What screen you were on when the crash occurred',
      ],
      whatWeDontCollect: [
        'Your personal data (mood, journal, assessments)',
        'Identifiable information',
      ],
      whyItHelps: 'Crashes disrupt your practice. Automatic reports help us detect and fix issues before they affect more people.',
      privacyNote: 'All crash reports are encrypted and anonymized.',
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
    description: 'Help improve mental health care (fully anonymous)',
    details: {
      whatWeCollect: [
        'Aggregated mood trends (e.g., "60% of users report improvement")',
        'Feature effectiveness data (which practices help most)',
        'Anonymized usage patterns',
      ],
      whatWeDontCollect: [
        'Individual responses or identifiable data',
        'Data shared with third parties for advertising',
        'Anything that could identify you',
      ],
      whyItHelps: 'Research helps us validate that Stoic practices are effective, publish findings to help more people, and secure funding to keep the app accessible.',
      privacyNote: 'Fully anonymized. Aggregated with 1,000+ other users. You can opt out anytime.',
    },
  },
} satisfies Record<string, ConsentCategoryCopy>;

export type ConsentCategoryKey = keyof typeof CONSENT_DETAILS;
