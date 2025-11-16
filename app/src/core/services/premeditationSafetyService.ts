/**
 * PREMEDITATION SAFETY SERVICE
 *
 * Service for premeditatio malorum (negative visualization) with safety safeguards.
 * Philosopher-validated (9.5/10 rating) with crisis integration.
 *
 * Premeditatio malorum is a powerful Stoic practice where practitioners contemplate
 * potential obstacles and how to respond virtuously. However, this practice can
 * become rumination or trigger anxiety if not properly safeguarded.
 *
 * SAFETY SAFEGUARDS (NON-NEGOTIABLE):
 * 1. Max 2 obstacles (prevents rumination spiral)
 * 2. Time-boxing (flag if >120s, suggest opt-out)
 * 3. Anxiety detection (keywords, patterns)
 * 4. Opt-out pathway (user agency preserved)
 * 5. Self-compassion REQUIRED (if obstacles present)
 * 6. Crisis integration (offer support if severe distress detected)
 *
 * Classical Sources:
 * - Marcus Aurelius, Meditations (Book 2:1, 8:36)
 * - Seneca, Letters to Lucilius (91, 107)
 * - Epictetus, Discourses (3.24, 4.1)
 *
 * @see /docs/technical/Stoic-Mindfulness-Architecture-v1.0.md
 */

import type { CardinalVirtue } from '@/types/stoic';

// ──────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ──────────────────────────────────────────────────────────────────────────────

export interface ObstacleInput {
  obstacle: string;
  howICanRespond: string;
  whatIControl: string;
  whatIDontControl: string;
  virtueToApply?: CardinalVirtue;
}

export interface Obstacle extends ObstacleInput {
  id: string;
  addedAt: Date;
}

export interface SafetyFlags {
  timeExceeded: boolean;           // >120s
  maxObstaclesReached: boolean;    // 2 obstacles
  anxietyDetected: boolean;        // Anxiety keywords/patterns
  shouldSuggestOptOut: boolean;    // Time + anxiety
}

export interface PremeditationSession {
  sessionId: string;
  startTime: Date;
  endTime: Date | null;
  obstacles: Obstacle[];
  safetyFlags: SafetyFlags;
  optedOut: boolean;
  optOutReason?: 'anxiety' | 'not_needed_today' | 'prefer_gratitude';
  selfCompassionNote: string;
  timeSpentSeconds: number;
  isComplete: boolean;
}

export interface CrisisResources {
  showCrisisButton: boolean;
  supportMessage: string;
  severity: 'mild' | 'moderate' | 'severe';
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

const MAX_OBSTACLES = 2;
const TIME_LIMIT_SECONDS = 120; // 2 minutes

// Anxiety detection keywords (case-insensitive)
const ANXIETY_KEYWORDS = [
  'worried',
  'anxious',
  'panic',
  'scared',
  'terrified',
  'afraid',
  'fear',
  'nervous',
  'stress',
  'overwhelmed',
];

// Rumination patterns
const RUMINATION_PATTERNS = [
  /what if.*wrong/i,
  /cannot.*stop.*think/i,
  /keep.*think/i,
  /terrible.*might/i,
  /scared.*that/i,
  /worried.*that/i,
];

// Crisis severity keywords (severe distress)
const CRISIS_KEYWORDS = [
  'suicidal',
  'kill myself',
  'end it all',
  'cannot go on',
  'want to die',
  'no point living',
];

// ──────────────────────────────────────────────────────────────────────────────
// PREMEDITATION SAFETY SERVICE
// ──────────────────────────────────────────────────────────────────────────────

export class PremeditationSafetyService {
  private sessions: Map<string, PremeditationSession>;

  constructor() {
    this.sessions = new Map();
  }

  /**
   * Start a new premeditation session
   */
  startSession(): PremeditationSession {
    const sessionId = this.generateSessionId();

    const session: PremeditationSession = {
      sessionId,
      startTime: new Date(),
      endTime: null,
      obstacles: [],
      safetyFlags: {
        timeExceeded: false,
        maxObstaclesReached: false,
        anxietyDetected: false,
        shouldSuggestOptOut: false,
      },
      optedOut: false,
      selfCompassionNote: '',
      timeSpentSeconds: 0,
      isComplete: false,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Add an obstacle to the session
   * Enforces max 2 obstacles, detects anxiety patterns
   */
  addObstacle(sessionId: string, obstacleInput: ObstacleInput): PremeditationSession {
    const session = this.getSession(sessionId);

    // Enforce max 2 obstacles (philosopher safety requirement)
    if (session.obstacles.length >= MAX_OBSTACLES) {
      throw new Error('Maximum 2 obstacles allowed (prevents rumination)');
    }

    const obstacle: Obstacle = {
      ...obstacleInput,
      id: this.generateObstacleId(),
      addedAt: new Date(),
    };

    session.obstacles.push(obstacle);

    // Update safety flags
    this.updateSafetyFlags(session);

    return session;
  }

  /**
   * Remove an obstacle (user changes mind)
   */
  removeObstacle(sessionId: string, obstacleIndex: number): PremeditationSession {
    const session = this.getSession(sessionId);

    if (obstacleIndex < 0 || obstacleIndex >= session.obstacles.length) {
      throw new Error('Invalid obstacle index');
    }

    session.obstacles.splice(obstacleIndex, 1);

    // Update safety flags (max obstacles no longer reached)
    this.updateSafetyFlags(session);

    return session;
  }

  /**
   * Opt out of premeditation exercise
   */
  optOut(
    sessionId: string,
    reason: 'anxiety' | 'not_needed_today' | 'prefer_gratitude'
  ): PremeditationSession {
    const session = this.getSession(sessionId);

    session.optedOut = true;
    session.optOutReason = reason;
    session.obstacles = []; // Clear any obstacles

    return session;
  }

  /**
   * Complete the premeditation session
   * Requires self-compassion note if obstacles present
   */
  completeSession(sessionId: string, selfCompassionNote: string): PremeditationSession {
    const session = this.getSession(sessionId);

    // Validate self-compassion note (REQUIRED if obstacles present)
    if (session.obstacles.length > 0 && !selfCompassionNote.trim()) {
      throw new Error('Self-compassion note required when obstacles are present');
    }

    session.selfCompassionNote = selfCompassionNote;
    session.endTime = new Date();
    session.timeSpentSeconds = this.getSessionDuration(sessionId);
    session.isComplete = true;

    return session;
  }

  /**
   * Get session duration in seconds
   */
  getSessionDuration(sessionId: string): number {
    const session = this.getSession(sessionId);
    const endTime = session.endTime || new Date();
    return Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);
  }

  /**
   * Check safety flags for a session
   */
  checkSafetyFlags(sessionId: string): SafetyFlags {
    const session = this.getSession(sessionId);
    this.updateSafetyFlags(session);
    return session.safetyFlags;
  }

  /**
   * Get crisis resources if severe anxiety detected
   * Returns null if no crisis resources needed
   */
  getCrisisResourcesIfNeeded(sessionId: string): CrisisResources | null {
    const session = this.getSession(sessionId);

    // Check for crisis keywords in obstacles
    const hasCrisisKeywords = session.obstacles.some(obstacle =>
      this.containsCrisisKeywords(obstacle.obstacle)
    );

    if (hasCrisisKeywords) {
      return {
        showCrisisButton: true,
        supportMessage: 'We\'re here to support you. If you\'re experiencing a mental health crisis, help is available.',
        severity: 'severe',
      };
    }

    // Check for severe anxiety (multiple anxiety indicators)
    const anxietyCount = session.obstacles.filter(obstacle =>
      this.detectAnxiety(obstacle.obstacle)
    ).length;

    if (anxietyCount >= 2) {
      return {
        showCrisisButton: true,
        supportMessage: 'This exercise seems to be causing distress. You can skip this practice and try gratitude instead.',
        severity: 'moderate',
      };
    }

    return null;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): PremeditationSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Update safety flags based on current session state
   */
  private updateSafetyFlags(session: PremeditationSession): void {
    const duration = this.getSessionDuration(session.sessionId);

    // Time exceeded (>120s)
    session.safetyFlags.timeExceeded = duration > TIME_LIMIT_SECONDS;

    // Max obstacles reached (2 obstacles)
    session.safetyFlags.maxObstaclesReached = session.obstacles.length >= MAX_OBSTACLES;

    // Anxiety detected (check all obstacles)
    session.safetyFlags.anxietyDetected = session.obstacles.some(obstacle =>
      this.detectAnxiety(obstacle.obstacle)
    );

    // Should suggest opt-out (time exceeded OR anxiety detected)
    session.safetyFlags.shouldSuggestOptOut =
      session.safetyFlags.timeExceeded ||
      session.safetyFlags.anxietyDetected;
  }

  /**
   * Detect anxiety from obstacle text
   * Returns true if anxiety keywords or rumination patterns found
   */
  private detectAnxiety(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Check for anxiety keywords
    const hasAnxietyKeywords = ANXIETY_KEYWORDS.some(keyword =>
      lowerText.includes(keyword)
    );

    // Check for rumination patterns
    const hasRuminationPattern = RUMINATION_PATTERNS.some(pattern =>
      pattern.test(text)
    );

    return hasAnxietyKeywords || hasRuminationPattern;
  }

  /**
   * Check for crisis keywords (severe distress)
   */
  private containsCrisisKeywords(text: string): boolean {
    const lowerText = text.toLowerCase();
    return CRISIS_KEYWORDS.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `premeditation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique obstacle ID
   */
  private generateObstacleId(): string {
    return `obstacle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
