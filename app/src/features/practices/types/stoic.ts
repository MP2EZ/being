/**
 * CORE STOIC MINDFULNESS TYPES
 *
 * Foundation types for Stoic Mindfulness architecture.
 * These types align with classical Stoicism (Marcus Aurelius, Epictetus, Seneca)
 * and have been validated by the philosopher agent (9.7/10 rating).
 *
 * FEAT-45: 12→5 Principle Consolidation (2025-10-29)
 * Framework consolidated from 12 principles to 5 integrative principles.
 * Philosopher verdict: "philosophically elegant, not reductive" (9.7/10, up from 9.5/10).
 *
 * NON-NEGOTIABLES:
 * - Four cardinal virtues ONLY (no modern additions)
 * - Self-compassion REQUIRED in VirtueChallenge (prevents harsh Stoicism)
 * - Classical Stoic alignment maintained
 * - Prohairesis (moral agency) preserved in Sphere Sovereignty
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
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
// STOIC PRINCIPLES (5 Integrative Practices)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The 5 Stoic Mindfulness Principles (Consolidated Framework)
 *
 * FEAT-45: Consolidated from 12 principles to 5 integrative principles.
 * Philosopher validation: 9.7/10 (2025-10-29) - "philosophically elegant, not reductive"
 *
 * These principles represent the core practices of Stoic Mindfulness:
 * 1. Aware Presence - Present-moment attention across cognitive, metacognitive, somatic dimensions
 * 2. Radical Acceptance - Amor fati, loving one's fate exactly as it is
 * 3. Sphere Sovereignty - Prohairesis, moral agency, dichotomy of control
 * 4. Virtuous Response - Virtue ethics in action (reappraisal, preparation, character cultivation)
 * 5. Interconnected Living - Relational ethics, oikeiosis, embodied practice
 *
 * Sources: Marcus Aurelius (Meditations), Epictetus (Enchiridion, Discourses), Seneca (Letters)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md (v1.1 LOCKED)
 * @see /docs/product/stoic-mindfulness/ for detailed principle documentation
 */
export type StoicPrinciple =
  | 'aware_presence'         // Principle 1: Present-moment attention (cognitive + metacognitive + somatic)
  | 'radical_acceptance'     // Principle 2: Amor fati - loving one's fate (Marcus Aurelius, Meditations 10:6)
  | 'sphere_sovereignty'     // Principle 3: Prohairesis - moral agency, dichotomy of control (Epictetus, Enchiridion 1)
  | 'virtuous_response'      // Principle 4: Virtue ethics in action - reappraisal, premeditatio, character
  | 'interconnected_living'; // Principle 5: Oikeiosis - relational ethics, common good, embodied practice

/**
 * Legacy 12-Principle Framework Mapping
 *
 * FEAT-45: Reference for how the 12 legacy principles map to 5 consolidated principles.
 * Useful for understanding educational content, historical data, and the consolidation rationale.
 *
 * This mapping documents the philosophical relationships between legacy and current framework.
 * See /docs/technical/Stoic-Data-Models.md Section 6 for full migration strategy.
 *
 * @example
 * // Convert legacy principle to new framework
 * const legacyPrinciple = 'metacognitive_space';
 * const newPrinciple = LEGACY_PRINCIPLE_MAP[legacyPrinciple]; // 'aware_presence'
 */
export const LEGACY_PRINCIPLE_MAP: Record<string, StoicPrinciple> = {
  // Aware Presence (integrates 3 legacy principles)
  'present_perception': 'aware_presence',
  'metacognitive_space': 'aware_presence',
  'embodied_awareness': 'aware_presence',

  // Radical Acceptance (unchanged)
  'radical_acceptance': 'radical_acceptance',

  // Sphere Sovereignty (integrates 2 legacy principles)
  'sphere_sovereignty': 'sphere_sovereignty',
  'intention_over_outcome': 'sphere_sovereignty',

  // Virtuous Response (integrates 3 legacy principles)
  'virtuous_reappraisal': 'virtuous_response',
  'negative_visualization': 'virtuous_response',
  'character_cultivation': 'virtuous_response',

  // Interconnected Living (integrates 3 legacy principles)
  'interconnected_action': 'interconnected_living',
  'relational_presence': 'interconnected_living',
  'contemplative_praxis': 'interconnected_living',
} as const;

/**
 * Principle Metadata - Rich Information for Each Principle
 *
 * Provides detailed metadata for UI display, educational modules, and progress tracking.
 * Each principle includes full name, integration notes, and classical sources.
 *
 * @example
 * const metadata: PrincipleMetadata = {
 *   id: 'aware_presence',
 *   name: 'Aware Presence',
 *   integrates: ['Present Perception', 'Metacognitive Space', 'Embodied Awareness'],
 *   description: 'Present-moment attention across cognitive, metacognitive, and somatic dimensions',
 *   classicalSource: 'Marcus Aurelius, Meditations 2:1; Epictetus, Enchiridion 1.5',
 * };
 */
export interface PrincipleMetadata {
  /**
   * Principle identifier (matches StoicPrinciple type)
   */
  id: StoicPrinciple;

  /**
   * Display name for UI
   * @example "Aware Presence"
   * @example "Sphere Sovereignty"
   */
  name: string;

  /**
   * Legacy principles this integrates (from 12-principle framework)
   * @example ["Present Perception", "Metacognitive Space", "Embodied Awareness"]
   * @example ["Radical Acceptance"] (for principles that didn't change)
   */
  integrates: string[];

  /**
   * Brief description of the principle
   * @example "Present-moment attention across cognitive, metacognitive, and somatic dimensions"
   */
  description: string;

  /**
   * Classical Stoic source citation
   * @example "Marcus Aurelius, Meditations 2:1; Epictetus, Enchiridion 1.5"
   */
  classicalSource: string;
}

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
