/**
 * CONSENT FEATURE MODULE
 * User consent management for privacy (FEAT-90)
 *
 * Exports:
 * - Screens: CombinedLegalGateScreen (primary), ConsentManagementScreen (settings)
 * - Components: ConsentToggleCard
 * - Store: useConsentStore (from core/stores)
 *
 * Flow: CombinedLegalGateScreen (age + ToS) → Onboarding (with granular consent step)
 */

// Screens
export { default as CombinedLegalGateScreen } from './screens/CombinedLegalGateScreen';
export { default as ConsentManagementScreen } from './screens/ConsentManagementScreen';
// AgeVerificationScreen kept for backwards compatibility but deprecated
export { default as AgeVerificationScreen } from './screens/AgeVerificationScreen';

// Components
export { default as ConsentToggleCard } from './components/ConsentToggleCard';
export type { ConsentToggleCardProps } from './components/ConsentToggleCard';
