/**
 * Flows Export Index
 * Main export file for all DRD check-in flows
 *
 * DEPRECATED: Practice flows have moved to features/practices
 * This file remains for backward compatibility during migration
 */

// Morning Flow - Exclude GratitudeScreen to avoid conflict
export {
  MorningFlowNavigator,
  GratitudeScreen as MorningGratitudeScreen,
  IntentionScreen,
  ProtectedPreparationScreen,
  PrincipleFocusScreen,
  PhysicalGroundingScreen,
  MorningCompletionScreen
} from '@/features/practices/morning';

// Midday Flow
export * from '@/features/practices/midday';

// Evening Flow - Exclude GratitudeScreen to avoid conflict
export {
  EveningFlowNavigator,
  VirtueReflectionScreen,
  GratitudeScreen as EveningGratitudeScreen,
  TomorrowScreen,
  SelfCompassionScreen,
  SleepTransitionScreen,
  EveningCompletionScreen
} from '@/features/practices/evening';

// Shared Components
export * from '@/features/practices/shared/components';