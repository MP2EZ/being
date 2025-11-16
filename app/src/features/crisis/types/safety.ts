/**
 * Crisis Intervention Types - Enhanced Safety Constraints
 * Comprehensive type definitions for crisis detection and intervention
 * CRITICAL SAFETY: PHQ≥15 (moderate), PHQ≥20 (severe), GAD≥15, PHQ-9 Q9 >0 triggers
 * Response time requirement: <200ms
 *
 * DUAL-THRESHOLD SYSTEM (Updated 2025-01-27):
 * - PHQ-9 ≥15: Moderately severe depression - support recommended (23% have suicidal ideation)
 * - PHQ-9 ≥20: Severe depression - immediate intervention required
 * - GAD-7 ≥15: Severe anxiety - immediate intervention required
 */

import { AssessmentType, PHQ9Result, GAD7Result, AssessmentAnswer } from '@/flows/assessment/types';

/**
 * Crisis Detection Thresholds - IMMUTABLE CLINICAL CONSTANTS
 * These values MUST NOT be modified as they represent clinical standards
 */
export const CRISIS_SAFETY_THRESHOLDS = {
  /** PHQ-9 Moderately Severe Depression Score - Support Recommended */
  PHQ9_MODERATE_SEVERE_THRESHOLD: 15,
  /** PHQ-9 Severe Depression Score - Immediate Intervention */
  PHQ9_SEVERE_THRESHOLD: 20,
  /** GAD-7 Severe Anxiety Score - Immediate Intervention */
  GAD7_SEVERE_THRESHOLD: 15,
  /** PHQ-9 Crisis Score (alias for severe threshold) - Backward Compatibility */
  PHQ9_CRISIS_SCORE: 20,
  /** GAD-7 Crisis Score (alias for severe threshold) - Backward Compatibility */
  GAD7_CRISIS_SCORE: 15,
  /** PHQ-9 Suicidal Ideation Question ID */
  PHQ9_SUICIDAL_QUESTION_ID: 'phq9_9',
  /** Any non-zero response to suicidal ideation triggers crisis */
  SUICIDAL_IDEATION_THRESHOLD: 0,
  /** Maximum response time for crisis intervention (ms) */
  MAX_CRISIS_RESPONSE_TIME_MS: 200,
  /** Minimum intervention duration before dismissal allowed (ms) */
  MIN_INTERVENTION_DURATION_MS: 30000, // 30 seconds
} as const;

/**
 * Crisis Trigger Types
 * Comprehensive enumeration of all crisis trigger conditions
 */
export type CrisisTriggerType =
  | 'phq9_moderate_severe_score' // PHQ-9 score ≥15 (support recommended)
  | 'phq9_severe_score'          // PHQ-9 score ≥20 (immediate intervention)
  | 'phq9_suicidal_ideation'     // PHQ-9 Question 9 response >0
  | 'gad7_severe_score'          // GAD-7 score ≥15
  | 'combined_high_risk'         // Both PHQ-9 and GAD-7 high scores
  | 'manual_override'            // Clinician or system override
  | 'safety_plan_triggered';     // User-initiated safety plan

/**
 * Crisis Severity Levels
 * Escalating levels of crisis intervention required
 */
export type CrisisSeverityLevel = 
  | 'moderate'     // High scores but no suicidal ideation
  | 'high'         // Severe scores or mild suicidal ideation
  | 'critical'     // Severe scores with suicidal ideation
  | 'emergency';   // Immediate danger indicators

/**
 * Enhanced Crisis Detection Interface
 */
export interface CrisisDetection {
  /** Unique identifier for this crisis episode */
  id: string;
  /** Whether crisis intervention is triggered */
  isTriggered: boolean;
  /** Primary trigger that caused crisis detection */
  primaryTrigger: CrisisTriggerType;
  /** Additional contributing triggers */
  secondaryTriggers: CrisisTriggerType[];
  /** Severity level of crisis */
  severityLevel: CrisisSeverityLevel;
  /** Score or value that triggered crisis */
  triggerValue: number;
  /** Assessment type that triggered crisis */
  assessmentType: AssessmentType;
  /** Timestamp when crisis was detected */
  timestamp: number;
  /** Assessment session ID */
  assessmentId: string;
  /** User ID (encrypted) */
  userId: string;
  /** Response time for crisis detection (must be <200ms) */
  detectionResponseTimeMs: number;
  /** Additional context for crisis */
  context: {
    /** Assessment answers that led to crisis */
    triggeringAnswers: AssessmentAnswer[];
    /** Previous assessment scores for context */
    recentScores?: Array<{
      type: AssessmentType;
      score: number;
      timestamp: number;
    }>;
    /** User's location if available (for local resources) */
    userLocation?: {
      latitude: number;
      longitude: number;
    };
    /** Time of day for appropriate resource routing */
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  };
}

/**
 * Crisis Intervention State
 */
export interface CrisisIntervention {
  /** Reference to crisis detection */
  detection: CrisisDetection;
  /** Unique intervention ID */
  interventionId: string;
  /** When intervention was started */
  interventionStarted: boolean;
  /** Timestamp when intervention began */
  startTimestamp: number;
  /** Whether user has contacted support */
  contactedSupport: boolean;
  /** Support contact method used */
  supportContactMethod?: '988' | 'emergency_services' | 'crisis_hotline' | 'personal_contact';
  /** Response time from detection to intervention display (must be <200ms) */
  responseTime: number;
  /** Current intervention status */
  status: CrisisInterventionStatus;
  /** Actions taken during intervention */
  actionsTaken: CrisisAction[];
  /** Safety plan activation */
  safetyPlan?: CrisisSafetyPlan;
  /** Follow-up requirements */
  followUp: CrisisFollowUp;
  /** Whether intervention can be safely dismissed */
  canDismiss: boolean;
  /** Minimum time before dismissal allowed */
  dismissalAvailableAt: number;
  /** Resolution of crisis intervention */
  resolution?: CrisisResolution;
}

/**
 * Crisis Intervention Status
 */
export type CrisisInterventionStatus = 
  | 'initiated'           // Crisis detected, intervention starting
  | 'displaying_resources' // Showing crisis resources
  | 'awaiting_action'     // Waiting for user to take action
  | 'support_contacted'   // User has contacted support
  | 'safety_plan_active'  // Safety plan is being executed
  | 'monitoring'          // Active monitoring phase
  | 'resolved'            // Crisis intervention completed
  | 'escalated';          // Escalated to emergency services

/**
 * Crisis Actions
 */
export interface CrisisAction {
  /** Action type taken */
  type: CrisisActionType;
  /** Timestamp when action was taken */
  timestamp: number;
  /** Duration of action (if applicable) */
  durationMs?: number;
  /** Success/completion status */
  completed: boolean;
  /** Additional data for the action */
  data?: Record<string, unknown>;
}

export type CrisisActionType = 
  | 'viewed_resources'      // User viewed crisis resources
  | 'contacted_988'         // Called 988 Suicide & Crisis Lifeline
  | 'contacted_emergency'   // Called emergency services
  | 'activated_safety_plan' // Activated personal safety plan
  | 'contacted_support'     // Contacted personal support person
  | 'used_coping_skill'     // Used a coping strategy
  | 'scheduled_followup'    // Scheduled follow-up appointment
  | 'acknowledged_safety';  // Acknowledged safety commitment

/**
 * Crisis Safety Plan
 */
export interface CrisisSafetyPlan {
  /** Plan ID */
  id: string;
  /** When plan was created */
  createdAt: number;
  /** When plan was last updated */
  updatedAt: number;
  /** Personal warning signs */
  warningSignsPersonal: string[];
  /** Environmental warning signs */
  warningSignsEnvironmental: string[];
  /** Coping strategies that help */
  copingStrategies: Array<{
    strategy: string;
    effectiveness: 1 | 2 | 3 | 4 | 5;
    lastUsed?: number;
  }>;
  /** Professional support contacts */
  professionalContacts: Array<{
    name: string;
    role: string;
    phone: string;
    email?: string;
    availability: string;
  }>;
  /** Personal support contacts */
  personalContacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    canContactAnytime: boolean;
  }>;
  /** Emergency contacts */
  emergencyContacts: Array<{
    name: string;
    phone: string;
    type: '988' | 'emergency' | 'crisis_center';
  }>;
  /** Environmental safety measures */
  environmentalSafety: string[];
  /** Reasons for living/hope statements */
  reasonsForLiving: string[];
}

/**
 * Crisis Follow-Up Requirements
 */
export interface CrisisFollowUp {
  /** Whether follow-up is required */
  required: boolean;
  /** Urgency level of follow-up */
  urgency: 'immediate' | 'within_24h' | 'within_48h' | 'within_week';
  /** Type of follow-up needed */
  type: 'clinical_assessment' | 'safety_check' | 'therapy_appointment' | 'medication_review';
  /** Recommended follow-up actions */
  recommendations: string[];
  /** Follow-up contacts */
  contacts: Array<{
    type: 'therapist' | 'psychiatrist' | 'primary_care' | 'crisis_counselor';
    name?: string;
    phone?: string;
    priority: 'primary' | 'secondary' | 'backup';
  }>;
  /** Scheduled follow-up timestamp */
  scheduledAt?: number;
  /** Follow-up completion status */
  completed: boolean;
}

/**
 * Crisis Resolution
 */
export interface CrisisResolution {
  /** Resolution type */
  type: CrisisResolutionType;
  /** Timestamp when resolved */
  timestamp: number;
  /** Total intervention duration */
  totalDurationMs: number;
  /** Actions taken during intervention */
  actionsSummary: CrisisActionType[];
  /** User safety status */
  safetyStatus: 'safe' | 'monitoring_required' | 'professional_care_needed';
  /** Follow-up scheduled */
  followUpScheduled: boolean;
  /** Resolution notes */
  notes?: string;
}

export type CrisisResolutionType = 
  | 'user_safe_confirmed'     // User confirmed safety
  | 'support_contacted'       // Professional support engaged
  | 'safety_plan_activated'   // Safety plan successfully used
  | 'emergency_services'      // Emergency services contacted
  | 'clinical_referral'       // Referred to clinical care
  | 'ongoing_monitoring';     // Requires continued monitoring

/**
 * Crisis Resource Information
 */
export interface CrisisResource {
  /** Resource ID */
  id: string;
  /** Resource name */
  name: string;
  /** Resource type */
  type: 'hotline' | 'text_line' | 'chat' | 'local_service' | 'mobile_app' | 'website';
  /** Contact information */
  contact: {
    phone?: string;
    text?: string;
    website?: string;
    chat?: string;
  };
  /** Availability */
  availability: '24/7' | 'business_hours' | 'specific_hours';
  /** Specific hours if applicable */
  hours?: string;
  /** Geographic availability */
  geographic: 'national' | 'regional' | 'local';
  /** Languages supported */
  languages: string[];
  /** Specializations */
  specializations: string[];
  /** Crisis severity levels this resource handles */
  handlesLevels: CrisisSeverityLevel[];
}

/**
 * Crisis Detection Functions
 */

/**
 * Detects crisis conditions from assessment result
 * @param result - Assessment result to evaluate
 * @param userId - User ID for tracking
 * @returns Crisis detection or null if no crisis
 */
export function detectCrisis(
  result: PHQ9Result | GAD7Result, 
  userId: string
): CrisisDetection | null {
  const triggers: CrisisTriggerType[] = [];
  let severityLevel: CrisisSeverityLevel = 'moderate';
  let primaryTrigger: CrisisTriggerType;
  let triggerValue: number = result.totalScore;

  // PHQ-9 Crisis Detection
  if ('suicidalIdeation' in result) {
    // Check for suicidal ideation (Question 9)
    if (result.suicidalIdeation) {
      triggers.push('phq9_suicidal_ideation');
      severityLevel = result.totalScore >= CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE 
        ? 'critical' 
        : 'high';
      primaryTrigger = 'phq9_suicidal_ideation';
    }
    
    // Check for severe depression score
    if (result.totalScore >= CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE) {
      triggers.push('phq9_severe_score');
      if (!primaryTrigger!) {
        primaryTrigger = 'phq9_severe_score';
        severityLevel = 'high';
      }
    }
  } 
  // GAD-7 Crisis Detection
  else {
    if (result.totalScore >= CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE) {
      triggers.push('gad7_severe_score');
      primaryTrigger = 'gad7_severe_score';
      severityLevel = 'high';
    }
  }

  // No crisis detected
  if (triggers.length === 0) {
    return null;
  }

  return {
    id: `crisis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    isTriggered: true,
    primaryTrigger: primaryTrigger!,
    secondaryTriggers: triggers.filter(t => t !== primaryTrigger),
    severityLevel,
    triggerValue,
    assessmentType: 'suicidalIdeation' in result ? 'phq9' : 'gad7',
    timestamp: Date.now(),
    assessmentId: result.completedAt.toString(),
    userId,
    detectionResponseTimeMs: 0, // Set by calling code
    context: {
      triggeringAnswers: result.answers,
      timeOfDay: getTimeOfDay()
    }
  };
}

/**
 * Validates crisis detection meets safety requirements
 */
export function validateCrisisDetection(detection: CrisisDetection): boolean {
  // Validate response time
  if (detection.detectionResponseTimeMs > CRISIS_SAFETY_THRESHOLDS.MAX_CRISIS_RESPONSE_TIME_MS) {
    return false;
  }

  // Validate trigger conditions
  const validTriggers: CrisisTriggerType[] = [
    'phq9_severe_score',
    'phq9_suicidal_ideation',
    'gad7_severe_score'
  ];
  
  if (!validTriggers.includes(detection.primaryTrigger)) {
    return false;
  }

  // Validate score thresholds
  if (detection.assessmentType === 'phq9' && 
      detection.primaryTrigger === 'phq9_severe_score' &&
      detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.PHQ9_CRISIS_SCORE) {
    return false;
  }

  if (detection.assessmentType === 'gad7' && 
      detection.primaryTrigger === 'gad7_severe_score' &&
      detection.triggerValue < CRISIS_SAFETY_THRESHOLDS.GAD7_CRISIS_SCORE) {
    return false;
  }

  return true;
}

/**
 * Type Guards
 */
export function isCriticalCrisis(detection: CrisisDetection): boolean {
  return detection.severityLevel === 'critical' || 
         detection.severityLevel === 'emergency';
}

export function requiresImmediateIntervention(detection: CrisisDetection): boolean {
  return detection.primaryTrigger === 'phq9_suicidal_ideation' ||
         detection.severityLevel === 'emergency';
}

export function canSafelyDismissIntervention(
  intervention: CrisisIntervention, 
  currentTime: number
): boolean {
  return intervention.canDismiss && 
         currentTime >= intervention.dismissalAvailableAt &&
         intervention.actionsTaken.length > 0;
}

/**
 * Utility Functions
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Crisis Safety Validation
 */
export interface CrisisSafetyValidator {
  validateDetection: (detection: CrisisDetection) => boolean;
  validateIntervention: (intervention: CrisisIntervention) => boolean;
  validateResponseTime: (responseTimeMs: number) => boolean;
  validateSafetyPlan: (plan: CrisisSafetyPlan) => boolean;
}

/**
 * Emergency Resources
 */
export const EMERGENCY_RESOURCES: CrisisResource[] = [
  {
    id: '988_lifeline',
    name: '988 Suicide & Crisis Lifeline',
    type: 'hotline',
    contact: { phone: '988' },
    availability: '24/7',
    geographic: 'national',
    languages: ['English', 'Spanish'],
    specializations: ['Suicide Prevention', 'Crisis Counseling'],
    handlesLevels: ['moderate', 'high', 'critical', 'emergency']
  },
  {
    id: 'crisis_text_line',
    name: 'Crisis Text Line',
    type: 'text_line',
    contact: { text: '741741' },
    availability: '24/7',
    geographic: 'national',
    languages: ['English'],
    specializations: ['Crisis Support', 'Text-based Support'],
    handlesLevels: ['moderate', 'high', 'critical']
  }
];

export default CRISIS_SAFETY_THRESHOLDS;