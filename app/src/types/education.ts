/**
 * Education Module Types
 * FEAT-49: Educational Modules for 5 Stoic Principles
 *
 * Type-safe definitions for the educational content system.
 * Based on philosopher validation (9.5/10 rating) and UX specification.
 */

// ============================================================================
// Core Type Unions
// ============================================================================

export type ModuleId =
  | 'aware-presence'
  | 'radical-acceptance'
  | 'sphere-sovereignty'
  | 'virtuous-response'
  | 'interconnected-living';

export type ModuleStatus = 'not_started' | 'in_progress' | 'completed';

export type DevelopmentalStage =
  | 'fragmented'
  | 'effortful'
  | 'fluid'
  | 'integrated'
  | null;

export type PracticeType = 'guided-timer' | 'sorting' | 'reflection' | 'body-scan';

export type ModuleTag =
  | 'FOUNDATION'
  | 'WORKING WITH WHAT IS'
  | 'MOST ESSENTIAL'
  | 'CHARACTER'
  | 'ETHICS';

// ============================================================================
// Content Structure Interfaces
// ============================================================================

/**
 * Classical Stoic quote with attribution
 * Must be exact translation (no paraphrasing)
 */
export interface ClassicalQuote {
  text: string;
  author: 'Marcus Aurelius' | 'Epictetus' | 'Seneca';
  source?: string; // e.g., "Meditations, Book 4"
}

/**
 * Individual concept within "What It Is" section
 * Expandable accordion pattern
 */
export interface Concept {
  title: string;
  content: string;
  learnMore?: string; // Extended teaching (optional depth)
}

/**
 * "What It Is" section structure
 */
export interface WhatItIs {
  summary: string; // 2-3 sentence overview (Layer 1)
  concepts: Concept[]; // Expandable sub-concepts (Layer 2)
}

/**
 * Practice exercise definition
 */
export interface Practice {
  id: string;
  title: string;
  description: string;
  type: PracticeType;
  duration?: number; // Seconds (for timers)
  icon?: string; // Emoji or icon identifier
  instructions?: string[]; // Step-by-step for guided practices
  scenarios?: SortingScenario[]; // For sorting practice (Module 3)
}

/**
 * Sorting scenario for Module 3 (Sphere Sovereignty)
 * Real-time sorting practice: in my control vs. not in my control
 */
export interface SortingScenario {
  id: string;
  text: string;
  correctAnswer: 'in-control' | 'not-in-control';
  explanation: string;
  inControl?: string[]; // What IS in your control (bullet points)
  notInControl?: string[]; // What is NOT in your control (bullet points)
}

/**
 * Common obstacle (FAQ-style)
 * Compassionate response + practical tip
 */
export interface Obstacle {
  question: string; // User's common concern
  response: string; // Validating, reframing explanation
  tip: string; // Practical action to take
}

/**
 * Developmental stage description
 */
export interface Stage {
  stage: DevelopmentalStage;
  title: string;
  description: string;
  indicators: string[]; // Observable signs of this stage
}

/**
 * Callout box for examples, warnings, etc.
 */
export interface CalloutBox {
  type: 'example' | 'warning' | 'tip' | 'support';
  icon: string; // Emoji
  content: string;
}

// ============================================================================
// Module Content (JSON structure)
// ============================================================================

/**
 * Complete module content
 * Loaded from app/assets/modules/module-{id}.json
 */
export interface ModuleContent {
  id: ModuleId;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  tag: ModuleTag;
  description: string; // 2-line description for module card
  estimatedMinutes: number; // Total time to complete module
  classicalQuote: ClassicalQuote;
  whatItIs: WhatItIs;
  whyItMatters: string; // Paragraph explanation
  practicalExample?: CalloutBox; // Optional real-life scenario
  practices: Practice[];
  commonObstacles: Obstacle[];
  reflectionPrompt: string; // Journal prompt
  developmentalStages: Stage[];
}

// ============================================================================
// User Progress Tracking
// ============================================================================

/**
 * User's progress for a single module
 * Stored in Zustand + persisted to AsyncStorage (encrypted)
 */
export interface ModuleProgress {
  status: ModuleStatus;
  lastAccessedAt: Date;
  completedSections: string[]; // Section IDs: 'what-it-is', 'why-it-matters', 'practice-1', etc.
  developmentalStage: DevelopmentalStage; // Self-assessed stage
  practiceCount: number; // How many times user completed practices
  reflectionResponses: string[]; // Journal entry IDs (links to journalStore)
  optOutFlags: string[]; // Safety opt-outs: ['negative-visualization'], etc.
  completedAt?: Date; // When user marked module complete
}

/**
 * Complete education state (Zustand store)
 */
export interface EducationState {
  modules: Record<ModuleId, ModuleProgress>;
  currentModule: ModuleId | null; // Active module being viewed
  recommendedNext: ModuleId | null; // Personalized suggestion

  // Actions
  setModuleStatus: (moduleId: ModuleId, status: ModuleStatus) => void;
  completeSection: (moduleId: ModuleId, sectionId: string) => void;
  incrementPracticeCount: (moduleId: ModuleId) => void;
  setDevelopmentalStage: (
    moduleId: ModuleId,
    stage: DevelopmentalStage
  ) => void;
  saveReflection: (moduleId: ModuleId, journalEntryId: string) => void;
  addOptOut: (moduleId: ModuleId, flag: string) => void;
  removeOptOut: (moduleId: ModuleId, flag: string) => void;
  getModuleProgress: (moduleId: ModuleId) => ModuleProgress;
  getRecommendedModule: () => ModuleId | null;
  setCurrentModule: (moduleId: ModuleId | null) => void;
  resetModule: (moduleId: ModuleId) => void; // Reset progress for a module
}

// ============================================================================
// Practice Session State (ephemeral, not persisted)
// ============================================================================

/**
 * Active practice session state
 * Used during timer/sorting practice screens
 */
export interface PracticeSession {
  moduleId: ModuleId;
  practiceId: string;
  startedAt: Date;
  isPaused: boolean;
  currentScenario?: number; // For sorting practice (0-11)
  userResponses?: Record<string, 'in-control' | 'not-in-control'>; // Sorting responses
}

/**
 * Post-practice mood check
 * Optional feedback after completing a practice
 */
export interface PostPracticeMood {
  feeling: 'more-calm' | 'about-same' | 'more-anxious';
  timestamp: Date;
}

// ============================================================================
// Recommendation Logic Types
// ============================================================================

/**
 * Input data for recommendation algorithm
 */
export interface RecommendationInput {
  recentMoods: string[]; // From check-in store
  phq9Score?: number; // Latest PHQ-9 score
  gad7Score?: number; // Latest GAD-7 score
  completedModules: ModuleId[];
  developmentalStages: Partial<Record<ModuleId, DevelopmentalStage>>;
}

/**
 * Recommendation result
 */
export interface Recommendation {
  moduleId: ModuleId;
  reason: string; // Why this module is recommended
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Module metadata for directory listing
 */
export interface ModuleMetadata {
  id: ModuleId;
  number: number;
  title: string;
  tag: ModuleTag;
  description: string;
  estimatedMinutes: number;
}

/**
 * Progress statistics for Profile widget
 */
export interface LearningProgressStats {
  completedCount: number;
  totalCount: number;
  practiceCount: number;
  stagesByModule: Record<ModuleId, DevelopmentalStage>;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Module IDs in recommended order
 */
export const MODULE_ORDER: ModuleId[] = [
  'aware-presence', // 1: Foundation
  'radical-acceptance', // 2: Working with what is
  'sphere-sovereignty', // 3: MOST CRITICAL
  'virtuous-response', // 4: Character
  'interconnected-living', // 5: Ethics
];

/**
 * Module emphasis (per philosopher validation)
 */
export const MODULE_EMPHASIS: Record<ModuleId, 'critical' | 'standard'> = {
  'aware-presence': 'standard',
  'radical-acceptance': 'standard',
  'sphere-sovereignty': 'critical', // MOST ESSENTIAL - dichotomy of control
  'virtuous-response': 'standard',
  'interconnected-living': 'standard',
};

/**
 * Developmental stages in order
 */
export const DEVELOPMENTAL_STAGES: DevelopmentalStage[] = [
  'fragmented',
  'effortful',
  'fluid',
  'integrated',
];
