/**
 * Shared Components Index - Practice Flow Components
 * Export all reusable components for flows
 *
 * MAINT-65: Cleaned up 9 unused legacy components
 */

export { default as BreathingCircle } from './BreathingCircle';
export { default as Timer } from './Timer';

// FEAT-385: re-homed onto the three live practice screens via
// PracticeScreenLayout's `overlay` slot. Pair it with `useHapticsOptIn`, which
// owns the once-ever claim — rendering it unconditionally would re-ask.
export { HapticsOptInPrompt } from './HapticsOptInPrompt';

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

// MAINT-386: the SharedBreathingScreen exports are gone with the component. It
// was orphaned by FEAT-298 slice 6c (672032f5), which retired its only two
// callers. The three type re-exports went with it and were shadowed dead weight
// anyway: the live `BreathingPattern` is declared in `../breathingPatterns`
// (and privately in `BreathingCircle`), and `FlowThemeType` was an alias of
// `FlowType` from `@/core/types/practice-identity`. Import from those directly.

// Note: BodyAreaGrid exports BODY_AREAS constant used by Learn tab
// Import directly: import { BODY_AREAS } from '@/features/practices/shared/components/BodyAreaGrid';