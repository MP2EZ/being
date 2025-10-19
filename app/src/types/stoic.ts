/**
 * CORE STOIC MINDFULNESS TYPES
 *
 * Foundation types for Stoic Mindfulness architecture.
 * These types align with classical Stoicism (Marcus Aurelius, Epictetus, Seneca)
 * and have been validated by the philosopher agent (9.5/10 rating).
 *
 * NON-NEGOTIABLES:
 * - Four cardinal virtues ONLY (no modern additions)
 * - Self-compassion REQUIRED in VirtueChallenge (prevents harsh Stoicism)
 * - Classical Stoic alignment maintained
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

// ──────────────────────────────────────────────────────────────────────────────
// CARDINAL VIRTUES (Classical Stoicism)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The Four Cardinal Virtues of Stoic Philosophy
 *
 * These are the ONLY virtues in classical Stoicism. Modern additions like
 * 'humility', 'compassion', 'gratitude' are NOT cardinal virtues.
 *
 * Source: Plato (Republic), adopted by Stoics (Epictetus, Marcus Aurelius)
 *
 * @example
 * const virtue: CardinalVirtue = 'wisdom';
 * const virtues: CardinalVirtue[] = ['wisdom', 'courage', 'justice', 'temperance'];
 */
export type CardinalVirtue =
  | 'wisdom'       // Practical wisdom (phronesis) - right judgment
  | 'courage'      // Fortitude - facing fear, adversity, discomfort
  | 'justice'      // Fairness, treating others rightly
  | 'temperance';  // Self-control, moderation

// ──────────────────────────────────────────────────────────────────────────────
// DEVELOPMENTAL STAGES (Practice Progression)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Developmental Stages of Stoic Practice
 *
 * Represents user's progression in Stoic practice over time. NOT completion levels
 * (e.g., "beginner", "intermediate", "advanced"), but developmental stages that
 * reflect increasing integration of practice.
 *
 * Timeline (approximate):
 * - Fragmented: 1-6 months (learning principles, inconsistent practice)
 * - Effortful: 6-18 months (conscious application, requires effort)
 * - Fluid: 2-5 years (spontaneous application, less effort)
 * - Integrated: 5+ years (second nature, embodied practice)
 *
 * @example
 * const stage: DevelopmentalStage = 'fragmented';
 * const advancedStage: DevelopmentalStage = 'integrated';
 */
export type DevelopmentalStage =
  | 'fragmented'   // 1-6 months: Learning principles, inconsistent practice
  | 'effortful'    // 6-18 months: Conscious application, requires effort
  | 'fluid'        // 2-5 years: Spontaneous application, less effort
  | 'integrated';  // 5+ years: Second nature, embodied practice

// ──────────────────────────────────────────────────────────────────────────────
// PRACTICE DOMAINS (Application Areas)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Practice Domains for Virtue Application
 *
 * The three primary areas where Stoic principles are practiced in daily life.
 * Aligns with Stoic philosophy (Epictetus, Marcus Aurelius).
 *
 * @example
 * const domain: PracticeDomain = 'work';
 * const domains: PracticeDomain[] = ['work', 'relationships', 'adversity'];
 */
export type PracticeDomain =
  | 'work'           // Professional context, productivity, collaboration
  | 'relationships'  // Personal relationships, family, friends
  | 'adversity';     // Challenges, setbacks, difficult circumstances

// ──────────────────────────────────────────────────────────────────────────────
// VIRTUE INSTANCE (Successful Practice)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Virtue Instance - Record of Successful Virtue Practice
 *
 * Captures moments when the user successfully practiced a virtue. Used in evening
 * flow to track where virtue was demonstrated during the day.
 *
 * Design Decision: Balanced with VirtueChallenge (Critical Issue #2 from philosopher)
 * to prevent performative virtue signaling. Seneca's balanced examination.
 *
 * @example
 * const instance: VirtueInstance = {
 *   id: 'virtue_instance_001',
 *   virtue: 'wisdom',
 *   context: 'Paused before reacting to difficult email',
 *   domain: 'work',
 *   principleApplied: 'principle_2', // Dichotomy of Control
 *   timestamp: new Date(),
 * };
 */
export interface VirtueInstance {
  /**
   * Unique identifier for this virtue instance
   */
  id: string;

  /**
   * Which cardinal virtue was practiced
   */
  virtue: CardinalVirtue;

  /**
   * Brief description of the situation and how virtue was practiced
   * @example "Paused before reacting to criticism, asked clarifying questions"
   * @example "Spoke up in meeting despite fear of judgment"
   */
  context: string;

  /**
   * Which domain this virtue was practiced in
   */
  domain: PracticeDomain;

  /**
   * Which Stoic principle (if any) was consciously applied
   * @example 'principle_1' (Present Perception)
   * @example 'principle_2' (Dichotomy of Control)
   * @example null (user didn't identify specific principle)
   */
  principleApplied: string | null;

  /**
   * When this virtue instance occurred
   */
  timestamp: Date;
}

// ──────────────────────────────────────────────────────────────────────────────
// VIRTUE CHALLENGE (Struggle with Virtue)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Virtue Challenge - Record of Struggling with Virtue Practice
 *
 * Captures moments when the user struggled to practice virtue. Used in evening
 * flow to create BALANCED examination (Seneca's 3 questions: successes + struggles).
 *
 * CRITICAL: selfCompassion field is REQUIRED (prevents harsh Stoicism).
 * Philosopher agent non-negotiable (9.5/10 rating dependent on this).
 *
 * @example
 * const challenge: VirtueChallenge = {
 *   id: 'virtue_challenge_001',
 *   situation: 'Reacted defensively to feedback from manager',
 *   virtueViolated: 'wisdom',
 *   whatICouldHaveDone: 'Paused, listened fully, asked clarifying questions',
 *   triggerIdentified: 'Felt criticized and judged',
 *   whatWillIPractice: 'Pause 3 seconds before responding to feedback',
 *   selfCompassion: "I'm learning. Receiving feedback is hard.",
 *   timestamp: new Date(),
 * };
 */
export interface VirtueChallenge {
  /**
   * Unique identifier for this virtue challenge
   */
  id: string;

  /**
   * Brief description of the situation where virtue was NOT practiced
   * @example "Reacted defensively to feedback"
   * @example "Lost patience with family member"
   */
  situation: string;

  /**
   * Which cardinal virtue was violated (not practiced)
   */
  virtueViolated: CardinalVirtue;

  /**
   * What the user could have done differently (Stoic response)
   * @example "Paused, took three breaths, responded with kindness"
   * @example "Recognized I was tired, asked for a break"
   */
  whatICouldHaveDone: string;

  /**
   * What triggered the failure to practice virtue (if identified)
   * @example "Felt criticized and defensive"
   * @example "Was hungry and tired"
   * @example null (trigger not identified)
   */
  triggerIdentified: string | null;

  /**
   * What the user will practice going forward
   * @example "Pause 3 seconds before responding to feedback"
   * @example "Notice when I'm tired and need space"
   */
  whatWillIPractice: string;

  /**
   * Self-compassion note (REQUIRED - prevents harsh Stoicism)
   *
   * CRITICAL: This field is non-negotiable. Philosopher agent validation
   * depends on this being required. Without self-compassion, Stoic practice
   * can become harsh self-judgment.
   *
   * @example "I'm learning. This is hard."
   * @example "This is a lifelong practice. I'm doing my best."
   * @example "I'm human. I'll keep practicing."
   */
  selfCompassion: string;

  /**
   * When this challenge occurred
   */
  timestamp: Date;
}

// ──────────────────────────────────────────────────────────────────────────────
// DOMAIN PROGRESS (Practice Tracking by Domain)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Domain Progress - Tracks Practice in Each Life Domain
 *
 * Measures how frequently and deeply Stoic principles are applied in each of
 * the three practice domains (work, relationships, adversity).
 *
 * Used by StoicPracticeStore to track cross-domain integration (one of the
 * four developmental stage metrics).
 *
 * @example
 * const workProgress: DomainProgress = {
 *   domain: 'work',
 *   practiceInstances: 15,
 *   principlesApplied: ['principle_1', 'principle_2', 'principle_5'],
 *   lastPracticeDate: new Date('2025-10-19'),
 * };
 */
export interface DomainProgress {
  /**
   * Which practice domain this tracks
   */
  domain: PracticeDomain;

  /**
   * Total number of times practice occurred in this domain
   * (virtue instances + virtue challenges + intention applications)
   */
  practiceInstances: number;

  /**
   * Which Stoic principles have been applied in this domain
   * @example ['principle_1', 'principle_2', 'principle_5']
   * @example [] (no principles applied yet)
   */
  principlesApplied: string[];

  /**
   * When practice last occurred in this domain
   * @example new Date('2025-10-19')
   * @example null (never practiced in this domain yet)
   */
  lastPracticeDate: Date | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// TYPE EXPORTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * All core Stoic types exported for use throughout the app.
 *
 * These types are imported by:
 * - StoicPracticeStore (stores/stoicPracticeStore.ts)
 * - Flow data interfaces (types/flows.ts)
 * - Screen components (flows/morning|midday|evening/screens/*.tsx)
 * - Service layers (services/stoic/*.ts)
 */

// Types are exported above with each definition for better documentation
// No additional exports needed here
