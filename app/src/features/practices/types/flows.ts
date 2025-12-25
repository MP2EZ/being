/**
 * DRD Check-in Flow Types
 * Type definitions for morning, midday, and evening check-in flows
 */

// Flow Navigation Types

// Stoic Mindfulness Morning Flow (FEAT-45) - DRD v2.0.0
export type MorningFlowParamList = {
  Gratitude: undefined;
  Intention: undefined;
  Preparation: undefined;
  PrincipleFocus: undefined;
  PhysicalGrounding: undefined;
  MorningCompletion: undefined;
};

// Stoic Mindfulness Midday Flow (FEAT-45) - DRD v2.0.0
export type MiddayFlowParamList = {
  ControlCheck: undefined;
  Embodiment: undefined;
  Reappraisal: undefined;
  Affirmation: undefined;
  MiddayCompletion: undefined;
};

// Stoic Mindfulness Evening Flow (FEAT-134) - UX-Optimized 6-Screen Flow
// Redesigned for reduced cognitive load: 3 required fields (down from 8)
// Flow order: Breathe → Gratitude → Reflection → Compassion → Tomorrow → Sleep
export type EveningFlowParamList = {
  Breathing: undefined;           // Screen 1: Pure 60s breathing (no decisions)
  Gratitude: undefined;           // Screen 2: 1 required, up to 3 optional
  VirtueReflection: undefined;    // Screen 3: Reflection + inline principle picker
  SelfCompassion: undefined;      // Screen 4: Dedicated self-kindness (required)
  Tomorrow: undefined;            // Screen 5: Optional intention (skippable)
  SleepTransition: {              // Screen 6: Breathing + completion card
    summary?: EveningCompletionSummary;
  } | undefined;
};

// Common Flow Data Types
export interface FlowProgress {
  currentStep: number;
  totalSteps: number;
  flowType: 'morning' | 'midday' | 'evening';
  startTime: Date;
  isComplete: boolean;
}

export interface BodyAreaData {
  area: string;
  sensation: string;
  intensity: number; // 1-10 scale
  description?: string;
}

export interface EmotionData {
  emotion: string;
  intensity: number; // 1-10 scale
  trigger?: string;
  description?: string;
}

export interface ThoughtData {
  thought: string;
  category: 'helpful' | 'unhelpful' | 'neutral';
  intensity: number; // 1-10 scale
  response?: string;
}

// Physical Grounding (DRD v2.0.0 - Mindful body awareness, not data tracking)
export interface PhysicalGroundingData {
  method: 'body_scan' | 'breathing';  // User choice
  bodyAwareness: string;               // What they noticed
  timestamp: Date;
}

export interface ValuesData {
  value: string;
  intention: string;
  priority: number; // 1-10 scale
}

export interface DreamData {
  hasDream: boolean;
  content?: string;
  emotions?: string[];
  significance?: number; // 1-10 scale
}

// Midday Flow Types
export interface AwarenessData {
  presentMoment: string;
  bodyAwareness: string;
  emotionalState: string;
}

export interface GatheringData {
  focus: number; // 1-10 scale
  clarity: number; // 1-10 scale
  intention: string;
}

export interface ExpandingData {
  perspective: string;
  gratitude: string[];
  connection: string;
}

// Evening Flow Types
export interface DayReviewData {
  highlights: string[];
  challenges: string[];
  learnings: string[];
  overallRating: number; // 1-10 scale
}

export interface PleasantUnpleasantData {
  pleasant: {
    event: string;
    emotions: string[];
    bodyResponse: string;
  }[];
  unpleasant: {
    event: string;
    emotions: string[];
    bodyResponse: string;
    coping: string;
  }[];
}

export interface ThoughtPatternsData {
  patterns: {
    thought: string;
    frequency: 'rare' | 'occasional' | 'frequent' | 'constant';
    helpfulness: 'helpful' | 'unhelpful' | 'neutral';
    alternative?: string;
  }[];
}

export interface TomorrowPrepData {
  intentions: string[];
  priorities: string[];
  selfCare: string[];
  gratitude: string;
}

// Complete Flow Session Data
export interface FlowSessionData {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  date: Date;
  startTime: Date;
  endTime?: Date;
  progress: FlowProgress;
  data: MorningFlowData | MiddayFlowData | EveningFlowData;
  isComplete: boolean;
}

export interface MorningFlowData {
  bodyScan?: BodyAreaData[];
  emotions?: EmotionData[];
  thoughts?: ThoughtData[];
  physicalMetrics?: PhysicalGroundingData;
  values?: ValuesData[];
  dream?: DreamData;
}

export interface MiddayFlowData {
  awareness?: AwarenessData;
  gathering?: GatheringData;
  expanding?: ExpandingData;
}

export interface EveningFlowData {
  dayReview?: DayReviewData;
  pleasantUnpleasant?: PleasantUnpleasantData;
  thoughtPatterns?: ThoughtPatternsData;
  tomorrowPrep?: TomorrowPrepData;
}

// ──────────────────────────────────────────────────────────────────────────────
// STOIC MINDFULNESS FLOW TYPES (FEAT-45)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Stoic Mindfulness Flow Data Interfaces
 * Philosopher-validated (9.5/10 rating) - See Architecture v1.0
 * @see /docs/architecture/Stoic-Mindfulness-Architecture-v1.0.md
 */

import type { CardinalVirtue, PracticeDomain, StoicPrinciple, VirtueInstance, VirtueChallenge } from './stoic';

// ──────────────────────────────────────────────────────────────────────────────
// MORNING FLOW TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface StoicMorningFlowData {
  // Stoic practices
  gratitude?: GratitudeData;
  intention?: IntentionData;
  preparation?: PreparationData;       // Premeditatio malorum (with safeguards)
  principleFocus?: PrincipleFocusData;

  // Mindful body awareness (DRD v2.0.0)
  physicalGrounding?: PhysicalGroundingData;

  // Metadata
  completedAt: Date;
  timeSpentSeconds: number;
  flowVersion: string;  // 'stoic_v2'
}

export interface GratitudeData {
  items: GratitudeItem[];  // 2-3 items
  stoicGrounding?: string | undefined; // Optional: "What's within your control to appreciate?"
  timestamp: Date;
}

export interface GratitudeItem {
  what: string;
  impermanenceReflection?: {
    acknowledged: boolean;
    awareness: string;
  };
}

export interface IntentionData {
  intentionStatement: string;  // "How will I show up today?"
  whatIControl: string;         // Dichotomy of control grounding
  virtueAwareness?: string | undefined;     // Optional: integrated virtue recognition
  timestamp: Date;
}

export interface PreparationData {
  obstacles: ObstacleContemplation[];  // MAX 2 (prevents rumination)
  readinessRating: number;             // 1-10
  selfCompassionNote: string;          // REQUIRED if obstacles present

  // Safety safeguards
  timeSpentSeconds: number;      // Flag if >120s
  optedOut: boolean;
  optOutReason?: 'anxiety' | 'not_needed_today' | 'prefer_gratitude';
  anxietyDetected?: boolean;

  timestamp: Date;
}

export interface ObstacleContemplation {
  obstacle: string;
  howICanRespond: string;
  whatIControl: string;
  whatIDontControl: string;
  virtueToApply?: CardinalVirtue;
}

export interface PrincipleFocusData {
  principleKey: string;              // StoicPrinciple key
  personalInterpretation?: string | undefined;   // Optional personal application
  reminderTime?: string | undefined;             // Optional reminder time (HH:MM format)
  timestamp: Date;
}

// ──────────────────────────────────────────────────────────────────────────────
// MIDDAY FLOW TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface StoicMiddayFlowData {
  // Stoic practices
  currentSituation?: CurrentSituationData;
  controlCheck?: ControlCheckData;
  reappraisal?: ReappraisalData;
  intentionProgress?: IntentionProgressData;

  // Retained from original evidence-based protocol (60fps breathing)
  embodiment?: EmbodimentData;

  // Metadata
  completedAt: Date;
  timeSpentSeconds: number;
  flowVersion: string;
}

export interface CurrentSituationData {
  situation: string;
  emotionalState: string;
  energyLevel: number;  // 1-10
  timestamp: Date;
}

export interface ControlCheckData {
  aspect: string;
  controlType: 'fully_in_control' | 'can_influence' | 'not_in_control';  // Three-tier
  whatIControl?: string | undefined;
  whatICannotControl?: string | undefined;
  actionIfControllable?: string | undefined;
  acceptanceIfUncontrollable?: string | undefined;
  timestamp: Date;
}

export interface ReappraisalData {
  obstacle: string;
  virtueOpportunity: string;
  reframedPerspective: string;
  principleApplied?: string | undefined;
  timestamp: Date;
}

export interface IntentionProgressData {
  morningIntention: string;
  practiced: boolean;
  howApplied?: string | undefined;
  adjustment?: string | undefined;
  timestamp: Date;
}

export interface EmbodimentData {
  breathingDuration: 60;  // EXACTLY 60 seconds (60fps critical)
  breathingQuality: number;  // 1-10
  bodyAwareness: string;
  timestamp: Date;
}

export interface AffirmationData {
  selectedAffirmation?: string | undefined;  // Pre-defined grounded affirmation
  personalAffirmation?: string | undefined;  // User's own affirmation
  selfCompassionNote?: string | undefined;   // Optional self-compassion reflection
  timestamp: Date;
}

// ──────────────────────────────────────────────────────────────────────────────
// EVENING FLOW TYPES
// ──────────────────────────────────────────────────────────────────────────────

export interface StoicEveningFlowData {
  // Stoic examination (balanced)
  review?: ReviewData;
  virtueInstances?: VirtueInstance[];    // Successes
  virtueChallenges?: VirtueChallenge[];  // Struggles
  learning?: LearningData;
  senecaQuestions?: SenecaQuestionsData;

  // Gratitude & preparation
  gratitude?: GratitudeData;
  tomorrowIntention?: IntentionData;

  // Optional practices
  meditation?: MeditationData;
  selfCompassion?: SelfCompassionData;  // REQUIRED screen

  // Metadata
  completedAt: Date;
  timeSpentSeconds: number;
  flowVersion: string;
}

export interface ReviewData {
  morningIntentionPracticed: boolean;
  dayQualityRating: number;      // Virtue-focused, not outcome-focused
  virtueMoments: string[];
  struggleMoments: string[];

  // Seneca's 3 questions
  whatViceDidIResist?: string;
  whatHabitDidIImprove?: string;
  howAmIBetterToday?: string;

  // Under-represented principles
  intentionOverOutcome?: {
    situation: string;
    stayedProcessFocused: boolean;
    learning: string;
  };
  howDidIShowUpForOthers?: string;
  contributionToCommonGood?: string;

  selfCompassion: string;  // REQUIRED
  timestamp: Date;
}

export interface LearningData {
  reactVsRespondMoments: Array<{
    situation: string;
    myResponse: 'reacted' | 'responded' | 'mixed';
    whatILearned: string;
    whatIllPractice: string;
  }>;
  timestamp: Date;
}

export interface SenecaQuestionsData {
  whatViceDidIResist: string;
  whatHabitDidIImprove: string;
  howAmIBetterToday: string;
  timestamp: Date;
}

export interface VirtueReflectionData {
  showedUpWell: string;                              // Where did I show up well today? (REQUIRED)
  growthArea?: string | undefined;                   // Where could I grow? (optional)
  principleReflected?: StoicPrinciple | undefined;   // Inline principle picker (optional, feeds Insights)
  timestamp: Date;
}

export interface CelebrationData {
  attempts: string[];           // What did you attempt today? (efforts, not outcomes)
  learningCelebration?: string | undefined; // Optional: What did attempting teach you?
  timestamp: Date;
}

export interface TomorrowData {
  intention?: string | undefined;   // What's your intention for tomorrow?
  lettingGo?: string | undefined;   // What can you let go of tonight?
  timestamp: Date;
}

export interface SelfCompassionData {
  reflection: string;  // REQUIRED (prevents harsh Stoicism)
  timestamp: Date;
}

export interface SleepTransitionData {
  breathingCompleted: boolean;  // Optional tracking of breathing practice completion
  timestamp: Date;
}

// FEAT-134: Evening flow breathing screen data
export interface EveningBreathingData {
  completed: boolean;
  durationSeconds: 60;  // Fixed 60s duration
  timestamp: Date;
}

// FEAT-134: Updated gratitude data for evening flow (1 required, up to 3 optional)
export interface EveningGratitudeData {
  items: string[];  // 1-3 items, first is required
  timestamp: Date;
}

// FEAT-134: Evening flow completion summary for completion card
export interface EveningCompletionSummary {
  gratitudeCount: number;
  principleReflected?: StoicPrinciple | undefined;
  selfCompassionCompleted: boolean;
  tomorrowIntentionSet: boolean;
}

export interface MeditationData {
  practice: 'stoic_reflection' | 'negative_visualization' | 'view_from_above';
  duration: number;
  reflection: string;
  timestamp: Date;
}