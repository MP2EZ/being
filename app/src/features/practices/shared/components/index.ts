/**
 * Shared Components Index - Practice Flow Components
 * Export all reusable components for flows
 *
 * MAINT-65: Cleaned up 9 unused legacy components
 */

export { default as BreathingCircle } from './BreathingCircle';
export { default as Timer } from './Timer';

// FEAT-23: Session resumption
export { ResumeSessionModal } from './ResumeSessionModal';

// INFRA-135: Shared flow navigator components
export { FlowProgressIndicator } from './FlowProgressIndicator';
export type { FlowType } from './FlowProgressIndicator';

// Note: BodyAreaGrid exports BODY_AREAS constant used by Learn tab
// Import directly: import { BODY_AREAS } from '@/features/practices/shared/components/BodyAreaGrid';