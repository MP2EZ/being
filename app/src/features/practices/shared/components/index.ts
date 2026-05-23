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

// FEAT-139: DRY flow components
export { FlowBackButton } from './FlowBackButton';
export { SkipLink } from './SkipLink';
export { FlowHeader } from './FlowHeader';
export { StoicQuoteCard } from './StoicQuoteCard';
export { PreviousAnswerCard } from './PreviousAnswerCard';
export { default as GuidanceCard } from './GuidanceCard';
export type { FlowTheme } from './FlowBackButton';

// MAINT-140: Consolidated breathing screen for morning/evening flows
export { SharedBreathingScreen } from './SharedBreathingScreen';
export type { SharedBreathingScreenProps, BreathingPattern, FlowThemeType } from './SharedBreathingScreen';

// MAINT-140: Consolidated gratitude input section for morning/evening flows
export { GratitudeInputSection } from './GratitudeInputSection';
export type { GratitudeInputSectionProps, GratitudeTheme } from './GratitudeInputSection';

// Note: BodyAreaGrid exports BODY_AREAS constant used by Learn tab
// Import directly: import { BODY_AREAS } from '@/features/practices/shared/components/BodyAreaGrid';