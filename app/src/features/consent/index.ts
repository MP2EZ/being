/**
 * CONSENT FEATURE MODULE
 * User consent management for privacy (FEAT-90)
 *
 * Exports:
 * - Screens: CombinedLegalGateScreen (primary)
 * - Components: ConsentToggleCard
 * - Store: useConsentStore (from core/stores)
 *
 * Flow: CombinedLegalGateScreen (age + ToS) → Onboarding (with granular consent step)
 * Note: Consent toggles are now inline in AppSettingsScreen (Privacy & Data section)
 */

// Screens
export { default as CombinedLegalGateScreen } from './screens/CombinedLegalGateScreen';
export { default as ReConsentScreen } from './screens/ReConsentScreen';
export type { ReConsentScreenProps } from './screens/ReConsentScreen';

// Components
export { default as ConsentToggleCard } from './components/ConsentToggleCard';
export type { ConsentToggleCardProps } from './components/ConsentToggleCard';

// Constants
export { CONSENT_DETAILS } from './constants/consentDetails';
export type { ConsentCategoryKey } from './constants/consentDetails';

// Services
export { submitReConsent } from './services/submitReConsent';
export type { ReConsentSubmission, ReConsentSubmitResult } from './services/submitReConsent';
