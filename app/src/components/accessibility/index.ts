/**
 * Accessibility Components - WCAG 2.1 AA Compliant Mental Health Components
 * 
 * Comprehensive accessibility component library designed specifically for mental
 * health applications with crisis-aware functionality and cognitive accessibility.
 * 
 * Components provide:
 * - 100% WCAG 2.1 AA compliance
 * - Crisis-integrated accessibility features
 * - Cognitive load reduction for anxiety/depression
 * - Therapeutic timing controls
 * - Mental health context awareness
 */

// Core Mental Health Accessibility Hook
export { useMentalHealthAccessibility, type MentalHealthAccessibilityConfig, type AccessibilityAnnouncement, type TimingControlState, type CognitiveSupport } from '../../hooks/useMentalHealthAccessibility';

// Migration Status Component - WCAG 4.1.3 Status Messages
export { AccessibleMigrationStatus, type MigrationProgressData, type AccessibleMigrationStatusProps } from './AccessibleMigrationStatus';

// Calendar Permissions Component - WCAG 3.3.2 Labels/Instructions  
export { AccessibleCalendarPermissions, type AccessibleCalendarPermissionsProps } from './AccessibleCalendarPermissions';

// Error Recovery Component - WCAG 3.3.3 Error Suggestion
export { AccessibleErrorRecovery, type ErrorDetails, type RecoveryOption, type AccessibleErrorRecoveryProps } from './AccessibleErrorRecovery';

// Breathing Timer Component - WCAG 2.2.1 Timing Adjustable
export { AccessibleBreathingTimer, type BreathingPhase, type BreathingPattern, type TimingPreferences, type AccessibleBreathingTimerProps } from './AccessibleBreathingTimer';

// Re-export existing core accessible components for consistency
export { AccessibleAlert } from '../core/AccessibleAlert';
export { Button } from '../core/Button';

/**
 * Usage Guidelines:
 * 
 * 1. Always use useMentalHealthAccessibility hook in accessibility components
 * 2. All components integrate with CrisisIntegrationCoordinator for safety
 * 3. Components automatically adjust for cognitive accessibility needs
 * 4. Screen reader announcements respect mental health context
 * 5. Timing controls support WCAG 2.2.1 requirements
 * 
 * Example Integration:
 * ```tsx
 * import { AccessibleMigrationStatus, useMentalHealthAccessibility } from '@/components/accessibility';
 * 
 * function MyComponent() {
 *   const { announceToUser, crisisMode } = useMentalHealthAccessibility();
 *   
 *   return (
 *     <AccessibleMigrationStatus
 *       visible={migrating}
 *       migrationData={progress}
 *       onComplete={() => announceToUser({
 *         message: 'Migration completed safely',
 *         priority: 'high',
 *         context: 'completion'
 *       })}
 *     />
 *   );
 * }
 * ```
 */