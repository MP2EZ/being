/**
 * DRD Check-in Flow Types
 * Type definitions for morning, midday, and evening check-in flows
 */

// Flow Navigation Types

// Stoic Mindfulness Morning Flow - FEAT-139 Refactored 4-Screen Flow
// Philosopher validated (9/10) - All 5 principles represented
// Flow: Grounded Presence → Gratitude+Intention → Principle Focus → Relational Close
// @see ~/dtemp/morning-checkin-ux-refactor-design.md
export type MorningFlowParamList = {
  GroundedPresence: undefined;     // Screen 1: Physical grounding FIRST (Aware Presence)
  GratitudeIntention: undefined;   // Screen 2: Combined gratitude + intention with impermanence framing
  PrincipleFocus: undefined;       // Screen 3: Principle selection (SM pedagogy)
  RelationalClose: undefined;      // Screen 4: NEW - Interconnected Living (was missing)
  MorningCompletion: undefined;    // Completion card
};

// Stoic Mindfulness Midday Flow (MAINT-65) - Refactored 4-Screen Flow
// Aligned with 5 Stoic Mindfulness Principles (Philosopher validated 8.5/10)
// Flow: Pause & Acknowledge → Reality Check → Virtue Response → Compassionate Close
// @see /docs/design/midday-flow-wireframes-v2.md
export type MiddayFlowParamList = {
  PauseAcknowledge: undefined;   // Screen 1: Aware Presence (30s micro-breath + situation)
  RealityCheck: undefined;       // Screen 2: Radical Acceptance + Sphere Sovereignty
  VirtueResponse: undefined;     // Screen 3: Virtuous Response (principle picker)
  CompassionateClose: undefined; // Screen 4: Interconnected Living (completion)
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
// FEAT-139: MORNING FLOW UX REFACTOR - NEW 4-SCREEN DATA TYPES
// Philosopher validated (9/10) - All 5 Stoic Mindfulness principles represented
// Flow: Grounded Presence → Gratitude+Intention → Principle Focus → Relational Close
// @see ~/dtemp/morning-checkin-ux-refactor-design.md
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Screen 1: Grounded Presence (Aware Presence principle)
 * Physical grounding FIRST - 60s minimum presence time
 * Classical: "Begin at once to live" (Seneca, Letters 101)
 */
export interface GroundedPresenceData {
  completed: boolean;
  duration: number; // seconds spent in grounding
  skipped: boolean;
  timestamp?: Date;
}

/**
 * Screen 2: Gratitude + Intention (Combined screen)
 * Impermanence framing: "This day isn't guaranteed"
 * Reserve clause: "fate permitting" on intention
 * Classical: Marcus Aurelius, Meditations 2:1
 */
export interface GratitudeIntentionData {
  gratitudes: string[]; // min 1 required, max 3
  intention: string | null; // optional, includes reserve clause context
  timestamp: Date;
}

/**
 * Screen 4: Relational Close (Interconnected Living principle)
 * NEW screen adding missing principle to morning flow
 * All inputs optional - respects user agency
 * Classical: "We were born to work together" (Marcus Aurelius, Meditations 2:1)
 */
export interface RelationalCloseData {
  encounters: string | null; // Who might you encounter?
  practice: string | null; // How will you show up?
  timestamp: Date;
}

/**
 * Complete FEAT-139 Morning Flow Session Data
 * Refactored from 6 screens to 4 screens for improved UX
 * Target: ~70% completion rate (up from 35%)
 */
export interface MorningFlowSessionData {
  groundedPresence?: GroundedPresenceData;
  gratitudeIntention?: GratitudeIntentionData;
  principleFocus?: PrincipleFocusData;
  relationalClose?: RelationalCloseData;
  completedAt?: Date;
  timeSpentSeconds?: number;
  flowVersion: 'feat-139-v1';
}

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
// MIDDAY FLOW TYPES (MAINT-65 - Refactored 4-Screen Flow)
// Aligned with 5 Stoic Mindfulness Principles
// @see /docs/design/midday-flow-wireframes-v2.md
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Complete Midday Flow Session Data (MAINT-65)
 *
 * 4-screen flow: Pause & Acknowledge → Reality Check → Virtue Response → Compassionate Close
 * Duration: 3-5 minutes
 * Philosopher validated: 8.5/10
 */
export interface StoicMiddayFlowData {
  // Screen 1: Pause & Acknowledge (Aware Presence)
  pauseAcknowledge?: PauseAcknowledgeData;

  // Screen 2: Reality Check (Radical Acceptance + Sphere Sovereignty)
  realityCheck?: RealityCheckData;

  // Screen 3: Virtue Response (Virtuous Response principle)
  virtueResponse?: VirtueResponseData;

  // Screen 4: Compassionate Close (Interconnected Living)
  compassionateClose?: CompassionateCloseData;

  // Metadata
  completedAt: Date;
  timeSpentSeconds: number;
  flowVersion: 'stoic_midday_v2';  // Version identifier
  screenTimes?: {
    screen1: number;
    screen2: number;
    screen3: number;
    screen4: number;
  };
}

/**
 * Screen 1: Pause & Acknowledge
 * Principle: Aware Presence
 * Purpose: Transition from "doing" to "being" + name what's present
 */
export interface PauseAcknowledgeData {
  breathCompleted: boolean;
  breathDuration: 30;  // Fixed 30s micro-breath
  situation: string;   // "What's weighing on you right now?"
  timestamp: Date;
}

/**
 * Screen 2: Reality Check
 * Principles: Radical Acceptance + Sphere Sovereignty
 * Purpose: Focus on what's controllable (simplified per UX/Philosopher validation)
 * @see MAINT-65 UX simplification - removed acceptance selector
 */
export interface RealityCheckData {
  withinPower: string;  // "What can you actually control or influence here?"
  timestamp: Date;
}

/**
 * Screen 3: Virtue Response
 * Principle: Virtuous Response
 * Purpose: Choose virtuous action (simplified per UX/Philosopher validation)
 * @see MAINT-65 UX simplification - removed principle picker (virtue demonstrated through action)
 */
export interface VirtueResponseData {
  virtuousResponse: string;  // "What's one small, virtuous action you could take?"
  timestamp: Date;
}

/**
 * Screen 4: Compassionate Close
 * Principle: Interconnected Living
 * Purpose: Single integration prompt before completion (simplified per UX validation)
 * @see MAINT-65 UX simplification - merged two inputs into one, removed previous answer card
 */
export interface CompassionateCloseData {
  integrationNote?: string | undefined;  // "What do you need to remember as you return to your day?" (optional)
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
  durationSeconds: number;
  skipped?: boolean;
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

// ──────────────────────────────────────────────────────────────────────────────
// FEAT-291: SINGLE-LOOP DAILY PRACTICE PROTOTYPE (build-time flag `daily_loop`)
// The Five Principles in canonical order as ONE loop. Ships dark. Themed as
// 'midday' so it adds NO new FlowType/CheckInType/ThemeKey union member — the
// full flow unification is the deferred step-5 migration, not this prototype.
// @see docs/product/stoic-mindfulness (canonical principle names + sources)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Tense mode — the prototype compares these head-to-head (deciding flat-vs-tensed
 * is the experiment's GOAL, so all three are authored to equal fidelity):
 *  - 'flat'    : time-agnostic voice
 *  - 'morning' : prospective (praemeditatio / intention — Marcus, Meditations 2.1)
 *  - 'evening' : retrospective (Senecan examen — De Ira III.36)
 */
export type DailyLoopMode = 'flat' | 'morning' | 'evening';

/**
 * Depth — the per-session variant choice (FEAT-301), orthogonal to tense mode.
 *  - 'deep'  : the full five-principle loop
 *  - 'quick' : a short, self-contained pass over canonical steps 1→3→4
 *              (Aware Presence → Sphere Sovereignty → Virtuous Response:
 *              arrive → discern what's yours → act). A complete micro-arc, not a
 *              truncated fragment; reuses the canonical step config, so the
 *              names+order invariant holds (it runs a SUBSET, never a rename).
 * Chosen fresh each session and NEVER persisted as a sticky status / progression /
 * streak / unlock — the next session re-presents the same neutral choice
 * (operationalizes prohairesis / non-striving; the whole point of FEAT-301).
 */
export type DailyLoopDepth = 'quick' | 'deep';

export type DailyLoopParamList = {
  AwarePresence: undefined;        // Step 1: Aware Presence (30s breath + what's present)
  RadicalAcceptance: undefined;    // Step 2: Radical Acceptance (NEW beat vs. Midday)
  SphereSovereignty: undefined;    // Step 3: Sphere Sovereignty (dichotomy of control)
  VirtuousResponse: undefined;     // Step 4: Virtuous Response (four cardinal virtues + reappraisal)
  InterconnectedLiving: undefined; // Step 5: Interconnected Living (NEW beat vs. Midday)
  DailyLoopComplete: undefined;    // Completion — NOT a principle beat
};

/**
 * One beat's captured data. ALL fields are optional — the loop is reflect-first
 * (typing is capture, never a gate; preserves prohairesis and suits the walking,
 * eyes-up practice). Fields are populated per step:
 *  - `response`  : the primary reflection (steps 1, 2, 5) or the synthesized action (step 4)
 *  - `notMine`/`mine` : step 3's two-sided dichotomy of control (either order)
 *  - `virtues`   : step 4's multi-select cardinal virtues (optional scaffolding, not a gate)
 *  - `adversityRehearsal` : step 4 MORNING-only guardrailed premeditatio
 */
export interface DailyLoopStepData {
  response?: string | undefined;
  notMine?: string | undefined;
  mine?: string | undefined;
  virtues?: CardinalVirtue[] | undefined;
  adversityRehearsal?: string | undefined;
  timestamp: Date;
}

export interface DailyLoopCompleteData {
  integrationNote?: string | undefined;
  timestamp: Date;
}

export interface DailyLoopSessionData {
  mode: DailyLoopMode;
  /**
   * The depth chosen for THIS session (FEAT-301). Recorded on the completed session
   * for analytics parity only — it is write-only from the session's perspective and
   * MUST NOT be read back to pre-select, gate, or bias a future session's entry
   * (that would re-import the sticky-status dynamic this feature exists to reject).
   */
  depth?: DailyLoopDepth;
  awarePresence?: DailyLoopStepData;
  radicalAcceptance?: DailyLoopStepData;
  sphereSovereignty?: DailyLoopStepData;
  virtuousResponse?: DailyLoopStepData;
  interconnectedLiving?: DailyLoopStepData;
  complete?: DailyLoopCompleteData;
  completedAt?: Date;
  timeSpentSeconds?: number;
  flowVersion: 'feat-291-daily-loop-v1';
}