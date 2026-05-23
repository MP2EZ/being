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
// AgeVerificationScreen kept for backwards compatibility but deprecated
export { default as AgeVerificationScreen } from './screens/AgeVerificationScreen';

// Components
export { default as ConsentToggleCard } from './components/ConsentToggleCard';
export type { ConsentToggleCardProps } from './components/ConsentToggleCard';
