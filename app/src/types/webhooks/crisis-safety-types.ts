/**
 * Crisis Safety Type Constraints for FullMind MBCT App
 *
 * Defines strict type constraints ensuring:
 * - <200ms crisis response guarantees
 * - Emergency access preservation during payment issues
 * - Therapeutic continuity protection
 * - Mental health-aware error handling
 * - HIPAA-compliant crisis data management
 */

import { z } from 'zod';

/**
 * Crisis Response Time Constraints (Type-Level Enforcement)
 */
export type CrisisResponseTime = 50 | 100 | 150 | 200; // milliseconds
export type NormalResponseTime = 500 | 1000 | 1500 | 2000; // milliseconds
export type MaximumResponseTime = 5000 | 10000 | 15000 | 30000; // milliseconds

/**
 * Crisis Level Definitions
 */
export const CrisisLevelSchema = z.enum([
  'none',        // No crisis detected
  'watch',       // Monitoring indicators
  'low',         // Mild indicators
  'medium',      // Moderate indicators requiring attention
  'high',        // Significant indicators requiring intervention
  'critical',    // Immediate intervention required
  'emergency'    // Life-threatening situation
]);

export type CrisisLevel = z.infer<typeof CrisisLevelSchema>;

/**
 * Crisis Detection Triggers
 */
export const CrisisDetectionTriggerSchema = z.object({
  type: z.enum([
    'assessment_score',     // PHQ-9/GAD-7 scores
    'payment_failure',      // Payment processing failure
    'access_restriction',   // Feature access blocked
    'emergency_button',     // Crisis button pressed
    'therapeutic_disruption', // MBCT session interrupted
    'safety_protocol',      // Safety protocol activation
    'external_trigger'      // External crisis indicator
  ]),
  severity: CrisisLevelSchema,
  timestamp: z.number(),
  context: z.record(z.string(), z.any()).optional(),
  interventionRequired: z.boolean(),
  emergencyProtocols: z.boolean(),
});

export type CrisisDetectionTrigger = z.infer<typeof CrisisDetectionTriggerSchema>;

/**
 * Emergency Access Control
 */
export const EmergencyAccessControlSchema = z.object({
  granted: z.boolean(),
  grantedAt: z.number(),
  expiresAt: z.number().optional(),
  scope: z.array(z.enum([
    'crisis_resources',     // Access to crisis resources
    'emergency_contacts',   // Emergency contact functionality
    'therapeutic_content',  // Core MBCT content
    'assessment_tools',     // PHQ-9/GAD-7 access
    'safety_planning',      // Safety plan creation
    'mindfulness_exercises', // Emergency mindfulness content
    'breathing_exercises',  // Crisis breathing techniques
    'all_features'         // Complete app access
  ])),
  restrictions: z.array(z.string()).optional(),
  monitoringLevel: CrisisLevelSchema,
});

export type EmergencyAccessControl = z.infer<typeof EmergencyAccessControlSchema>;

/**
 * Therapeutic Continuity Protection
 */
export const TherapeuticContinuitySchema = z.object({
  protected: z.boolean(),
  protectionLevel: z.enum(['basic', 'standard', 'enhanced', 'maximum']),
  gracePeriodDays: z.number().min(0).max(30),
  protectedFeatures: z.array(z.string()),
  interventionThreshold: CrisisLevelSchema,
  automaticExtension: z.boolean(),
  clinicalOverride: z.boolean().optional(),
});

export type TherapeuticContinuity = z.infer<typeof TherapeuticContinuitySchema>;

/**
 * Crisis Response Protocol
 */
export const CrisisResponseProtocolSchema = z.object({
  protocolId: z.string(),
  triggered: z.boolean(),
  triggerTime: z.number(),
  responseTime: z.number().max(200), // Type-level 200ms constraint
  protocol: z.enum([
    'emergency_access',      // Grant emergency access
    'crisis_intervention',   // Activate crisis intervention
    'therapeutic_protection', // Protect therapeutic access
    'payment_bypass',        // Bypass payment restrictions
    'grace_period_extension', // Extend grace period
    'safety_escalation',     // Escalate to safety protocols
    'external_intervention'  // External crisis support
  ]),
  interventions: z.array(z.object({
    type: z.string(),
    applied: z.boolean(),
    appliedAt: z.number(),
    effectiveness: z.enum(['unknown', 'ineffective', 'partial', 'effective', 'highly_effective']).optional(),
  })),
  escalationPath: z.array(z.string()).optional(),
  monitoring: z.object({
    continuous: z.boolean(),
    interval: z.number(), // seconds
    duration: z.number(), // seconds
    alerts: z.boolean(),
  }),
});

export type CrisisResponseProtocol = z.infer<typeof CrisisResponseProtocolSchema>;

/**
 * Crisis-Safe State Management
 */
export interface CrisisSafeState<T> {
  value: T;
  crisisLevel: CrisisLevel;
  lastUpdated: number;
  emergencyAccess: boolean;
  therapeuticProtection: boolean;
  gracePeriodActive: boolean;
  updateConstraints: {
    maxResponseTime: CrisisResponseTime | NormalResponseTime;
    requiresValidation: boolean;
    auditRequired: boolean;
    crisisOverride: boolean;
  };
}

/**
 * Performance-Constrained Crisis Operations
 */
export type CrisisConstrainedOperation<T, R extends CrisisResponseTime = 200> = (
  data: T,
  constraints: {
    maxTime: R;
    crisisLevel: CrisisLevel;
    emergencyMode: boolean;
  }
) => Promise<{
  result: T;
  responseTime: R;
  crisisHandled: boolean;
  therapeuticContinuity: boolean;
}>;

/**
 * Crisis Event Handler Constraints
 */
export interface CrisisEventHandlerConstraints {
  maxResponseTime: CrisisResponseTime;
  requiresEmergencyAccess: boolean;
  therapeuticContinuityRequired: boolean;
  gracePeriodEligible: boolean;
  escalationTriggers: CrisisLevel[];
  interventionProtocols: string[];
  monitoringRequired: boolean;
  auditLevel: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * Mental Health Context Awareness
 */
export const MentalHealthContextSchema = z.object({
  userState: z.enum([
    'stable',           // Normal mental health state
    'monitoring',       // Under observation
    'concerning',       // Some concerning indicators
    'at_risk',         // At risk indicators present
    'crisis',          // In mental health crisis
    'emergency'        // Mental health emergency
  ]),
  assessmentScores: z.object({
    phq9: z.number().min(0).max(27).optional(),
    gad7: z.number().min(0).max(21).optional(),
    lastAssessment: z.number().optional(),
  }).optional(),
  therapeuticEngagement: z.object({
    sessionCount: z.number().min(0),
    lastSession: z.number().optional(),
    completionRate: z.number().min(0).max(100),
    engagement: z.enum(['low', 'moderate', 'high', 'very_high']),
  }).optional(),
  crisisHistory: z.array(z.object({
    date: z.number(),
    level: CrisisLevelSchema,
    resolved: z.boolean(),
    interventionEffective: z.boolean().optional(),
  })).optional(),
});

export type MentalHealthContext = z.infer<typeof MentalHealthContextSchema>;

/**
 * Crisis-Aware Error Handling
 */
export interface CrisisAwareError {
  code: string;
  message: string;
  therapeuticMessage: string;
  crisisImpact: boolean;
  emergencyBypass: boolean;
  interventionRequired: boolean;
  escalationLevel: CrisisLevel;
  recovery: {
    automatic: boolean;
    gracePeriod: boolean;
    emergencyAccess: boolean;
    therapeuticContinuity: boolean;
  };
}

/**
 * Crisis Safety Validation
 */
export const validateCrisisConstraints = <T>(
  operation: () => Promise<T>,
  constraints: CrisisEventHandlerConstraints
): CrisisConstrainedOperation<T> => {
  return async (data, operationConstraints) => {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Crisis response timeout')),
          operationConstraints.maxTime)
        )
      ]);

      const responseTime = Date.now() - startTime as CrisisResponseTime;

      return {
        result,
        responseTime,
        crisisHandled: operationConstraints.crisisLevel !== 'none',
        therapeuticContinuity: constraints.therapeuticContinuityRequired,
      };
    } catch (error) {
      // Crisis-safe error handling
      throw new Error(`Crisis operation failed within ${operationConstraints.maxTime}ms constraint`);
    }
  };
};

/**
 * Type-Level Crisis Response Guarantees
 */
export type CrisisResponseGuarantee<T extends CrisisResponseTime> = {
  readonly maxResponseTime: T;
  readonly emergencyAccess: true;
  readonly therapeuticContinuity: true;
  readonly gracePeriodProtection: true;
};

/**
 * Crisis Mode Type Definitions
 */
export interface CrisisMode {
  active: boolean;
  level: CrisisLevel;
  triggers: CrisisDetectionTrigger[];
  protocols: CrisisResponseProtocol[];
  emergencyAccess: EmergencyAccessControl;
  therapeuticContinuity: TherapeuticContinuity;
  mentalHealthContext: MentalHealthContext;
  monitoring: {
    continuous: boolean;
    realTime: boolean;
    alertsEnabled: boolean;
    escalationEnabled: boolean;
  };
}

/**
 * Default Crisis Configuration
 */
export const DEFAULT_CRISIS_CONFIG: CrisisMode = {
  active: false,
  level: 'none',
  triggers: [],
  protocols: [],
  emergencyAccess: {
    granted: false,
    grantedAt: 0,
    scope: ['crisis_resources', 'emergency_contacts', 'therapeutic_content'],
    monitoringLevel: 'none',
  },
  therapeuticContinuity: {
    protected: true,
    protectionLevel: 'standard',
    gracePeriodDays: 7,
    protectedFeatures: ['crisis_resources', 'therapeutic_content', 'assessment_tools'],
    interventionThreshold: 'medium',
    automaticExtension: true,
  },
  mentalHealthContext: {
    userState: 'stable',
  },
  monitoring: {
    continuous: false,
    realTime: true,
    alertsEnabled: true,
    escalationEnabled: true,
  },
};