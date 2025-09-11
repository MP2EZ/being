/**
 * Advanced Features Integration Types for FullMind MBCT App
 * 
 * Unified type system for SQLite analytics and Calendar integration
 * with cross-feature coordination and performance monitoring.
 */

import {
  SQLiteSecurityConfig,
  SQLiteMigrationState,
  SQLiteQueryBuilder,
  SQLiteClinicalSafetyError,
  TherapeuticProgressMetrics,
  HabitFormationMetrics
} from './sqlite';

import {
  CalendarUserPreferences,
  CalendarIntegrationStatus,
  CalendarClinicalSafetyError,
  PrivacySafeCalendarEvent,
  CalendarEventTemplate
} from './calendar';

import { Assessment, CheckIn, CrisisPlan, UserProfile } from '../types';

// Unified Feature Management System
export interface FullMindAdvancedFeatures {
  readonly sqliteAnalytics: {
    readonly status: SQLiteFeatureStatus;
    readonly config: SQLiteSecurityConfig;
    readonly queryBuilder: SQLiteQueryBuilder;
    readonly clinicalDataProtection: ClinicalDataSafety;
  };
  
  readonly calendarIntegration: {
    readonly status: CalendarFeatureStatus;
    readonly userPreferences: CalendarUserPreferences;
    readonly integrationHealth: CalendarIntegrationStatus;
    readonly privacyGuards: CalendarPrivacyGuards;
  };
  
  // Cross-feature coordination
  readonly featureInteractions: {
    readonly analyticsEnabled: boolean; // Requires both SQLite + calendar data
    readonly habitFormationTracking: boolean; // Calendar schedule + SQLite progress
    readonly therapeuticInsights: boolean; // Combined analytics from both features
    readonly predictiveScheduling: boolean; // AI-suggested optimal check-in times
  };
  
  // Performance monitoring across features
  readonly performanceProfile: AdvancedFeaturesPerformance;
  
  // User control and privacy
  readonly userAgency: AdvancedFeaturesUserControl;
}

// SQLite Feature Status
export interface SQLiteFeatureStatus {
  readonly enabled: boolean;
  readonly migrationState: SQLiteMigrationState;
  readonly analyticsReady: boolean;
  readonly performanceOptimized: boolean;
  readonly dataIntegrityVerified: boolean;
  readonly lastHealthCheck: string | null; // ISO timestamp
  readonly capabilities: readonly SQLiteCapability[];
}

export type SQLiteCapability = 
  | 'basic_storage'
  | 'encrypted_storage'
  | 'advanced_analytics'
  | 'pattern_recognition'
  | 'therapeutic_insights'
  | 'habit_tracking'
  | 'crisis_prediction';

// Calendar Feature Status
export interface CalendarFeatureStatus {
  readonly enabled: boolean;
  readonly permissionsGranted: boolean;
  readonly syncHealthy: boolean;
  readonly privacyCompliant: boolean;
  readonly therapeuticSchedulingActive: boolean;
  readonly lastSync: string | null; // ISO timestamp
  readonly capabilities: readonly CalendarCapability[];
}

export type CalendarCapability = 
  | 'basic_reminders'
  | 'calendar_events'
  | 'recurring_schedules'
  | 'habit_formation'
  | 'therapeutic_timing'
  | 'crisis_aware_scheduling'
  | 'cross_platform_sync';

// Clinical Data Safety (SQLite-specific)
export interface ClinicalDataSafety {
  readonly encryptionActive: boolean;
  readonly backupSecure: boolean;
  readonly accessControlsEnabled: boolean;
  readonly auditLoggingActive: boolean;
  readonly emergencyAccessMaintained: boolean; // Crisis data always accessible
  readonly complianceLevel: 'basic' | 'enhanced' | 'clinical_grade';
  readonly lastSecurityAudit: string | null;
}

// Calendar Privacy Guards
export interface CalendarPrivacyGuards {
  readonly phiExposurePrevention: boolean;
  readonly genericEventsOnly: boolean;
  readonly crossAppLeakPrevention: boolean;
  readonly userConsentVerified: boolean;
  readonly privacyLevel: 'maximum' | 'balanced' | 'minimal';
  readonly lastPrivacyAudit: string | null;
}

// Cross-Feature Performance Monitoring
export interface AdvancedFeaturesPerformance {
  readonly sqliteMigration: {
    readonly maxMigrationTime: 300000; // 5 minutes maximum
    readonly memoryUsageLimit: 150; // MB
    readonly criticalDataFirst: boolean; // PHQ-9/GAD-7 prioritized
    readonly currentMigrationTime?: number; // Current migration duration
  };
  
  readonly calendarIntegration: {
    readonly maxResponseTime: 1000; // 1 second for calendar operations
    readonly fallbackLatency: 500; // Local notification fallback
    readonly permissionTimeout: 10000; // 10 seconds for permission requests
    readonly currentAvgResponseTime?: number; // Current average response time
  };
  
  readonly crossFeature: {
    readonly analyticsQueryTime: 2000; // Max time for combined queries
    readonly habitAnalysisTime: 3000; // Max time for habit formation analysis
    readonly therapeuticInsightTime: 5000; // Max time for therapeutic insights
    readonly memoryFootprint: number; // Combined memory usage in MB
    readonly batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
  };
}

// User Control and Agency
export interface AdvancedFeaturesUserControl {
  readonly featureToggles: {
    readonly sqliteAnalytics: boolean;
    readonly calendarIntegration: boolean;
    readonly habitFormationTracking: boolean;
    readonly therapeuticInsights: boolean;
    readonly predictiveScheduling: boolean;
  };
  
  readonly privacyControls: {
    readonly dataMinimization: boolean; // Keep only essential data
    readonly encryptionLevel: 'standard' | 'enhanced' | 'maximum';
    readonly analyticsScope: 'personal_only' | 'therapeutic_patterns' | 'full_insights';
    readonly calendarPrivacyLevel: 'maximum' | 'balanced' | 'minimal';
  };
  
  readonly performancePreferences: {
    readonly optimizeForBattery: boolean;
    readonly prioritizeSpeed: boolean;
    readonly backgroundProcessingEnabled: boolean;
    readonly analyticsFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  };
  
  readonly accessibilityPreferences: {
    readonly simplifiedInterface: boolean;
    readonly reducedAnimations: boolean;
    readonly highContrast: boolean;
    readonly screenReaderOptimized: boolean;
  };
}

// Combined Analytics Interface
export interface AdvancedTherapeuticAnalytics {
  // Combined SQLite + Calendar insights
  readonly getComprehensiveProgress: (
    userId: string,
    timeRange: { startDate: string; endDate: string }
  ) => Promise<ComprehensiveProgressReport>;
  
  readonly getHabitFormationInsights: (
    userId: string,
    days: number
  ) => Promise<HabitFormationInsights>;
  
  readonly getTherapeuticOptimization: (
    userId: string
  ) => Promise<TherapeuticOptimizationRecommendations>;
  
  readonly getPredictiveScheduling: (
    userId: string,
    lookAheadDays: number
  ) => Promise<PredictiveScheduleRecommendations>;
  
  // Crisis-aware analytics
  readonly getCrisisAwareInsights: (
    userId: string,
    emergencyAccess: boolean
  ) => Promise<CrisisAwareTherapeuticReport>;
}

// Comprehensive Progress Report (SQLite + Calendar combined)
export interface ComprehensiveProgressReport {
  readonly reportId: string;
  readonly generatedAt: string; // ISO timestamp
  readonly timeRange: { startDate: string; endDate: string };
  
  readonly therapeuticProgress: TherapeuticProgressMetrics;
  readonly habitFormation: HabitFormationMetrics;
  readonly schedulingConsistency: {
    readonly adherenceRate: number; // 0-100
    readonly optimalTimingAlignment: number; // 0-100
    readonly missedSessionPatterns: readonly string[];
    readonly improvementRecommendations: readonly string[];
  };
  
  readonly clinicalTrends: {
    readonly assessmentTrends: readonly {
      readonly type: 'phq9' | 'gad7';
      readonly trendDirection: 'improving' | 'stable' | 'declining' | 'fluctuating';
      readonly confidence: number; // 0-1
      readonly significantChanges: readonly string[];
    }[];
    readonly checkInConsistency: number; // 0-100
    readonly engagementQuality: 'high' | 'moderate' | 'low';
  };
  
  readonly recommendations: {
    readonly immediateActions: readonly string[];
    readonly schedulingOptimizations: readonly string[];
    readonly therapeuticAdjustments: readonly string[];
    readonly longTermGoals: readonly string[];
  };
}

// Habit Formation Insights (Enhanced with Calendar Data)
export interface HabitFormationInsights extends HabitFormationMetrics {
  readonly calendarOptimization: {
    readonly optimalReminderTimes: readonly string[]; // ISO time strings
    readonly dayOfWeekPatterns: readonly {
      readonly day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
      readonly successRate: number; // 0-100
      readonly recommendedAdjustment: string | null;
    }[];
    readonly seasonalPatterns: readonly {
      readonly season: 'spring' | 'summer' | 'fall' | 'winter';
      readonly engagementChange: number; // -100 to +100
      readonly adaptationRecommendations: readonly string[];
    }[];
  };
  
  readonly therapeuticAlignment: {
    readonly mbctComplianceScore: number; // 0-100
    readonly routineStability: number; // 0-100
    readonly flexibilityBalance: number; // 0-100 (too rigid vs too loose)
  };
}

// Therapeutic Optimization Recommendations
export interface TherapeuticOptimizationRecommendations {
  readonly optimizationId: string;
  readonly generatedAt: string;
  
  readonly assessmentOptimization: {
    readonly recommendedFrequency: 'weekly' | 'bi-weekly' | 'monthly';
    readonly optimalTiming: readonly string[]; // Best times for assessments
    readonly contextualFactors: readonly string[];
  };
  
  readonly checkInOptimization: {
    readonly personalizedSchedule: readonly {
      readonly type: 'morning' | 'midday' | 'evening';
      readonly recommendedTime: string; // ISO time
      readonly duration: number; // minutes
      readonly priority: 'high' | 'medium' | 'low';
    }[];
    readonly adaptiveReminders: boolean; // Adjust based on patterns
  };
  
  readonly therapeuticFocus: {
    readonly primaryAreas: readonly string[];
    readonly practiceRecommendations: readonly string[];
    readonly progressMilestones: readonly {
      readonly milestone: string;
      readonly timeframe: string;
      readonly measurableOutcome: string;
    }[];
  };
}

// Predictive Schedule Recommendations
export interface PredictiveScheduleRecommendations {
  readonly scheduleId: string;
  readonly generatedAt: string;
  readonly validUntil: string; // ISO timestamp
  
  readonly predictedOptimalTimes: readonly {
    readonly date: string; // ISO date
    readonly checkInType: 'morning' | 'midday' | 'evening';
    readonly recommendedTime: string; // ISO time
    readonly confidence: number; // 0-1
    readonly reasoning: string;
  }[];
  
  readonly riskFactors: readonly {
    readonly date: string;
    readonly riskType: 'low_energy' | 'high_stress' | 'disrupted_routine' | 'social_conflict';
    readonly mitigationStrategy: string;
  }[];
  
  readonly opportunityWindows: readonly {
    readonly date: string;
    readonly opportunityType: 'extra_practice' | 'reflection_time' | 'celebration' | 'integration';
    readonly suggestedActivity: string;
  }[];
}

// Crisis-Aware Therapeutic Report
export interface CrisisAwareTherapeuticReport {
  readonly reportId: string;
  readonly generatedAt: string;
  readonly emergencyAccessUsed: boolean;
  
  readonly crisisRiskAssessment: {
    readonly currentRiskLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
    readonly riskFactors: readonly string[];
    readonly protectiveFactors: readonly string[];
    readonly recommendedActions: readonly string[];
  };
  
  readonly therapeuticContinuity: {
    readonly maintenanceRecommendations: readonly string[];
    readonly adaptedSchedule: readonly {
      readonly type: 'morning' | 'midday' | 'evening';
      readonly modifiedTiming: string;
      readonly gentlerApproach: string;
    }[];
    readonly supportSystemActivation: readonly string[];
  };
  
  readonly recoveryOptimization: {
    readonly gradualReengagement: readonly string[];
    readonly strengtheningActivities: readonly string[];
    readonly monitoringRecommendations: readonly string[];
  };
}

// Error Handling for Advanced Features
export interface AdvancedFeatureError extends Error {
  readonly errorType: 'sqlite_error' | 'calendar_error' | 'integration_error' | 'analytics_error';
  readonly sourceError: SQLiteClinicalSafetyError | CalendarClinicalSafetyError | Error;
  readonly featureImpact: readonly ('analytics' | 'scheduling' | 'insights' | 'habit_tracking')[];
  readonly clinicalImpact: 'none' | 'minimal' | 'moderate' | 'high' | 'critical';
  readonly therapeuticContinuity: boolean;
  readonly fallbacksAvailable: readonly string[];
  readonly userNotificationRequired: boolean;
  readonly mitigationSteps: readonly string[];
}

// Feature Coordination Events
export interface FeatureCoordinationEvent {
  readonly eventId: string;
  readonly timestamp: string;
  readonly eventType: 'feature_enabled' | 'feature_disabled' | 'sync_completed' | 'error_occurred' | 'optimization_applied';
  readonly sourceFeature: 'sqlite' | 'calendar' | 'coordination_engine';
  readonly impactedFeatures: readonly ('analytics' | 'scheduling' | 'insights' | 'habit_tracking')[];
  readonly details: Record<string, unknown>;
  readonly userVisible: boolean;
}

// Type Guards for Advanced Features
export const isAdvancedFeaturesEnabled = (features: unknown): features is FullMindAdvancedFeatures => {
  return (
    typeof features === 'object' &&
    features !== null &&
    'sqliteAnalytics' in features &&
    'calendarIntegration' in features &&
    'featureInteractions' in features &&
    'performanceProfile' in features &&
    'userAgency' in features
  );
};

export const isComprehensiveProgressReport = (report: unknown): report is ComprehensiveProgressReport => {
  return (
    typeof report === 'object' &&
    report !== null &&
    'reportId' in report &&
    'generatedAt' in report &&
    'therapeuticProgress' in report &&
    'habitFormation' in report &&
    'schedulingConsistency' in report &&
    'clinicalTrends' in report &&
    'recommendations' in report
  );
};

// Constants for Advanced Features
export const ADVANCED_FEATURES_CONSTANTS = {
  ANALYTICS: {
    MAX_REPORT_GENERATION_TIME_MS: 10000, // 10 seconds
    CACHE_DURATION_HOURS: 4,
    MIN_DATA_POINTS_FOR_INSIGHTS: 10,
    CONFIDENCE_THRESHOLD: 0.7, // Minimum confidence for recommendations
  },
  
  COORDINATION: {
    FEATURE_SYNC_INTERVAL_MS: 300000, // 5 minutes
    ERROR_RETRY_ATTEMPTS: 3,
    FALLBACK_ACTIVATION_DELAY_MS: 5000, // 5 seconds
    PERFORMANCE_MONITORING_INTERVAL_MS: 60000, // 1 minute
  },
  
  USER_EXPERIENCE: {
    MAX_NOTIFICATION_FREQUENCY_PER_DAY: 3,
    ONBOARDING_DURATION_DAYS: 7,
    FEATURE_INTRODUCTION_DELAY_DAYS: 3,
    ANALYTICS_COOLDOWN_HOURS: 2,
  },
  
  CLINICAL_SAFETY: {
    CRISIS_OVERRIDE_ALL_FEATURES: true,
    EMERGENCY_ACCESS_TIMEOUT_MS: 200,
    THERAPEUTIC_CONTINUITY_PRIORITY: true,
    PRIVACY_VIOLATION_AUTO_DISABLE: true,
  }
} as const;

// Export utility types
export type AdvancedFeatureType = keyof FullMindAdvancedFeatures;
export type AnalyticsCapability = SQLiteCapability | CalendarCapability;
export type CoordinationEventType = FeatureCoordinationEvent['eventType'];
export type ClinicalImpactLevel = AdvancedFeatureError['clinicalImpact'];