/**
 * FullMind Website - Healthcare & Clinical Type Definitions
 * Specialized types for mental health and clinical compliance
 */

// ============================================================================
// MENTAL HEALTH ASSESSMENT TYPES
// ============================================================================

export interface PHQ9Question {
  readonly id: number;
  readonly text: string;
  readonly category: 'mood' | 'interest' | 'sleep' | 'energy' | 'appetite' | 'guilt' | 'concentration' | 'psychomotor' | 'suicidal';
}

export interface GAD7Question {
  readonly id: number;
  readonly text: string;
  readonly category: 'worry' | 'control' | 'restless' | 'relax' | 'irritable' | 'afraid' | 'various';
}

export type AssessmentScore = 0 | 1 | 2 | 3;

export interface AssessmentResult {
  readonly type: 'PHQ9' | 'GAD7';
  readonly score: number;
  readonly severity: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
  readonly crisisThreshold: boolean;
  readonly recommendations: string[];
  readonly completedAt: Date;
}

// ============================================================================
// MBCT (MINDFULNESS-BASED COGNITIVE THERAPY) TYPES
// ============================================================================

export interface MBCTModule {
  readonly id: string;
  readonly week: number;
  readonly title: string;
  readonly description: string;
  readonly objectives: string[];
  readonly practices: MBCTPractice[];
  readonly duration: number; // in minutes
}

export interface MBCTPractice {
  readonly id: string;
  readonly type: 'breathing' | 'body-scan' | 'mindful-movement' | 'sitting-meditation' | 'walking-meditation';
  readonly title: string;
  readonly instructions: string[];
  readonly duration: number; // in minutes
  readonly audioGuidance: boolean;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface BreathingExercise {
  readonly id: string;
  readonly name: string;
  readonly pattern: {
    readonly inhale: number; // seconds
    readonly hold: number;   // seconds
    readonly exhale: number; // seconds
    readonly pause: number;  // seconds
  };
  readonly cycles: number;
  readonly totalDuration: number; // in seconds
  readonly guidance: string[];
}

// ============================================================================
// CRISIS INTERVENTION & SAFETY TYPES
// ============================================================================

export interface CrisisAssessment {
  readonly id: string;
  readonly timestamp: Date;
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  readonly triggers: string[];
  readonly protectiveFactors: string[];
  readonly interventionRequired: boolean;
  readonly followUpRequired: boolean;
}

export interface CrisisResource {
  readonly id: string;
  readonly type: 'hotline' | 'text' | 'chat' | 'emergency' | 'professional';
  readonly name: string;
  readonly contact: string;
  readonly description: string;
  readonly availability: '24/7' | 'business-hours' | 'evening' | 'weekend';
  readonly region: string;
  readonly languages: string[];
  readonly specialties: string[];
}

export interface SafetyPlan {
  readonly id: string;
  readonly userId: string;
  readonly warningSignals: string[];
  readonly copingStrategies: string[];
  readonly socialSupports: string[];
  readonly professionals: CrisisResource[];
  readonly environmentalSafety: string[];
  readonly lastUpdated: Date;
}

// ============================================================================
// CLINICAL COMPLIANCE & VALIDATION TYPES
// ============================================================================

export interface ClinicalValidation {
  readonly content: string;
  readonly validator: {
    readonly name: string;
    readonly credentials: string;
    readonly license: string;
  };
  readonly validatedAt: Date;
  readonly validUntil: Date;
  readonly notes?: string;
  readonly approved: boolean;
}

export interface HIPAACompliance {
  readonly dataType: 'PHI' | 'non-PHI' | 'de-identified';
  readonly encryptionRequired: boolean;
  readonly retentionPeriod: number; // in days
  readonly sharingRestrictions: string[];
  readonly userConsent: boolean;
  readonly auditTrail: boolean;
}

export interface TherapeuticOutcome {
  readonly measureType: 'PHQ9' | 'GAD7' | 'custom';
  readonly baselineScore: number;
  readonly currentScore: number;
  readonly improvement: number;
  readonly clinicallySignificant: boolean;
  readonly assessmentDate: Date;
}

// ============================================================================
// THERAPEUTIC CONTENT TYPES
// ============================================================================

export interface TherapeuticExercise {
  readonly id: string;
  readonly type: 'breathing' | 'grounding' | 'cognitive' | 'behavioral' | 'mindfulness';
  readonly title: string;
  readonly description: string;
  readonly instructions: string[];
  readonly duration: number; // in minutes
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly clinicalEvidence: string;
  readonly contraindications?: string[];
  readonly modifications?: string[];
}

export interface MoodTracking {
  readonly id: string;
  readonly userId: string;
  readonly date: Date;
  readonly mood: {
    readonly valence: number; // -5 to +5
    readonly arousal: number; // 0 to 10
    readonly dominance: number; // 0 to 10
  };
  readonly activities: string[];
  readonly triggers: string[];
  readonly notes?: string;
  readonly context: {
    readonly location: string;
    readonly weather?: string;
    readonly social?: string;
  };
}

// ============================================================================
// ACCESSIBILITY FOR MENTAL HEALTH USERS
// ============================================================================

export interface MentalHealthAccessibility {
  readonly cognitiveLoad: 'low' | 'medium' | 'high';
  readonly stressReduction: boolean;
  readonly crisisAccessible: boolean;
  readonly readingLevel: number; // Grade level
  readonly colorContrast: 'AA' | 'AAA';
  readonly motionSensitive: boolean;
  readonly keyboardNavigation: boolean;
  readonly screenReaderOptimized: boolean;
}

export interface CrisisAccessibility {
  readonly emergencyAccess: number; // seconds to crisis resources
  readonly skipNavigation: boolean;
  readonly largeText: boolean;
  readonly highContrast: boolean;
  readonly voiceActivated: boolean;
  readonly oneHandedOperation: boolean;
}

// ============================================================================
// THERAPEUTIC MEASUREMENT & ANALYTICS
// ============================================================================

export interface TherapeuticMetric {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly baseline?: number;
  readonly target?: number;
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly clinicalSignificance: boolean;
  readonly measuredAt: Date;
}

export interface EngagementMetric {
  readonly userId: string;
  readonly sessionDuration: number; // in minutes
  readonly practicesCompleted: number;
  readonly assessmentsCompleted: number;
  readonly crisisResourcesAccessed: number;
  readonly consecutiveDays: number;
  readonly lastActive: Date;
}

// ============================================================================
// CLINICAL INTEGRATION TYPES
// ============================================================================

export interface ClinicalReport {
  readonly id: string;
  readonly userId: string;
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly assessmentScores: AssessmentResult[];
  readonly moodTrends: MoodTracking[];
  readonly practiceEngagement: EngagementMetric;
  readonly therapeuticProgress: TherapeuticOutcome[];
  readonly clinicalNotes?: string;
  readonly generatedAt: Date;
}

export interface TherapistPortal {
  readonly therapistId: string;
  readonly patients: string[];
  readonly accessLevel: 'view' | 'monitor' | 'intervene';
  readonly notifications: {
    readonly crisisAlerts: boolean;
    readonly progressReports: boolean;
    readonly missedSessions: boolean;
  };
  readonly reportingFrequency: 'daily' | 'weekly' | 'monthly';
}

// ============================================================================
// TYPE GUARDS FOR CLINICAL SAFETY
// ============================================================================

export function isCrisisThreshold(assessment: AssessmentResult): boolean {
  return assessment.crisisThreshold;
}

export function isHighRisk(assessment: CrisisAssessment): boolean {
  return assessment.riskLevel === 'high' || assessment.riskLevel === 'imminent';
}

export function isClinicallyValidated(content: { validation?: ClinicalValidation }): content is { validation: ClinicalValidation } {
  return content.validation?.approved === true && 
         new Date(content.validation.validUntil) > new Date();
}

// ============================================================================
// CLINICAL CONSTANTS
// ============================================================================

export const CRISIS_HOTLINES = {
  NATIONAL_SUICIDE_PREVENTION: '988',
  CRISIS_TEXT_LINE: '741741',
  EMERGENCY: '911'
} as const;

export const PHQ9_THRESHOLDS = {
  MINIMAL: [0, 4],
  MILD: [5, 9],
  MODERATE: [10, 14],
  MODERATELY_SEVERE: [15, 19],
  SEVERE: [20, 27],
  CRISIS: 20
} as const;

export const GAD7_THRESHOLDS = {
  MINIMAL: [0, 4],
  MILD: [5, 9],
  MODERATE: [10, 14],
  SEVERE: [15, 21],
  CRISIS: 15
} as const;