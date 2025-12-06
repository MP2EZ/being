/**
 * CONSENT FEATURE MODULE
 * User consent management for privacy (FEAT-90)
 *
 * Exports:
 * - Screens: AgeVerificationScreen, ConsentManagementScreen
 * - Components: ConsentToggleCard
 * - Store: useConsentStore (from core/stores)
 */

// Screens
export { default as AgeVerificationScreen } from './screens/AgeVerificationScreen';
export { default as ConsentManagementScreen } from './screens/ConsentManagementScreen';

// Components
export { default as ConsentToggleCard } from './components/ConsentToggleCard';
export type { ConsentToggleCardProps } from './components/ConsentToggleCard';
