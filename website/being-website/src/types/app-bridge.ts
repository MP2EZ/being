/**
 * Being. Website - App Bridge Type Definitions
 * Shared types for seamless integration between website and React Native app
 * These types mirror the app's core types for consistency
 */

// ============================================================================
// CORE APP TYPES (MIRRORED FROM REACT NATIVE APP)
// ============================================================================

export interface CheckIn {
  readonly id: string;
  readonly type: 'morning' | 'midday' | 'evening';
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly skipped: boolean;
  readonly data: CheckInData;
}

export interface CheckInData {
  // Morning check-in fields
  readonly bodyAreas?: string[];
  readonly emotions?: string[];
  readonly thoughts?: string[];
  readonly sleepQuality?: number; // 1-5
  readonly energyLevel?: number; // 1-5
  readonly anxietyLevel?: number; // 1-5
  readonly todayValue?: string;
  readonly intention?: string;
  readonly dreams?: string;

  // Midday check-in fields
  readonly currentEmotions?: string[];
  readonly breathingCompleted?: boolean;
  readonly pleasantEvent?: string;
  readonly unpleasantEvent?: string;
  readonly currentNeed?: string;

  // Evening check-in fields
  readonly dayHighlight?: string;
  readonly dayChallenge?: string;
  readonly dayEmotions?: string[];
  readonly gratitude1?: string;
  readonly gratitude2?: string;
  readonly gratitude3?: string;
  readonly dayLearning?: string;
  readonly tensionAreas?: string[];
  readonly releaseNote?: string;
  readonly sleepIntentions?: string[];
  readonly tomorrowFocus?: string;
  readonly lettingGo?: string;
}

export interface Assessment {
  readonly id: string;
  readonly type: 'PHQ9' | 'GAD7';
  readonly score: number;
  readonly severity: 'minimal' | 'mild' | 'moderate' | 'moderately-severe' | 'severe';
  readonly responses: AssessmentResponse[];
  readonly completedAt: string;
  readonly crisisThreshold: boolean;
}

export interface AssessmentResponse {
  readonly questionId: number;
  readonly score: 0 | 1 | 2 | 3;
  readonly text: string;
}

export interface ResumableSession {
  readonly id: string;
  readonly type: 'checkin' | 'assessment';
  readonly subType: 'morning' | 'midday' | 'evening' | 'phq9' | 'gad7';
  readonly startedAt: string;
  readonly lastUpdatedAt: string;
  readonly expiresAt: string;
  readonly appVersion: string;
  readonly progress: SessionProgress;
  readonly data: Partial<CheckInData> | Partial<Assessment>;
  readonly metadata: SessionMetadata;
}

export interface SessionProgress {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly completedSteps: string[];
  readonly percentComplete: number;
  readonly estimatedTimeRemaining: number; // in seconds
}

export interface SessionMetadata {
  readonly deviceId?: string;
  readonly interruptionReason?: 'app_background' | 'app_close' | 'navigation' | 'crash' | 'manual';
  readonly resumeCount: number;
  readonly totalDuration: number; // cumulative time in seconds
  readonly lastScreen: string;
  readonly navigationStack?: string[];
}

// ============================================================================
// USER & PREFERENCE TYPES
// ============================================================================

export interface User {
  readonly id: string;
  readonly createdAt: string;
  readonly lastActiveAt: string;
  readonly preferences: UserPreferences;
  readonly onboardingComplete: boolean;
  readonly clinicalProfile?: ClinicalProfile;
}

export interface UserPreferences {
  readonly theme: 'morning' | 'midday' | 'evening' | 'auto';
  readonly notifications: NotificationPreferences;
  readonly accessibility: AccessibilityPreferences;
  readonly privacy: PrivacyPreferences;
  readonly clinical: ClinicalPreferences;
}

export interface NotificationPreferences {
  readonly checkInReminders: boolean;
  readonly assessmentReminders: boolean;
  readonly motivationalMessages: boolean;
  readonly crisisAlerts: boolean;
  readonly reminderTimes: {
    readonly morning?: string; // HH:MM format
    readonly midday?: string;
    readonly evening?: string;
  };
}

export interface AccessibilityPreferences {
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly screenReaderOptimized: boolean;
  readonly simplifiedInterface: boolean;
  readonly voiceNavigation: boolean;
}

export interface PrivacyPreferences {
  readonly analyticsEnabled: boolean;
  readonly crashReportingEnabled: boolean;
  readonly shareWithTherapist: boolean;
  readonly anonymousReporting: boolean;
  readonly dataRetentionDays: number;
}

export interface ClinicalPreferences {
  readonly shareProgressWithTherapist: boolean;
  readonly allowTherapistNotifications: boolean;
  readonly emergencyContactsEnabled: boolean;
  readonly crisisProtocolEnabled: boolean;
  readonly clinicalReportingFrequency: 'never' | 'weekly' | 'monthly';
}

export interface ClinicalProfile {
  readonly riskLevel: 'low' | 'moderate' | 'high';
  readonly primaryConcerns: string[];
  readonly therapeuticGoals: string[];
  readonly hasTherapist: boolean;
  readonly therapistId?: string;
  readonly previousMBCTExperience: boolean;
  readonly medicationStatus: 'none' | 'current' | 'previous';
  readonly crisisProtocolActive: boolean;
  readonly lastClinicalReview?: string;
}

// ============================================================================
// PROGRESS & ANALYTICS TYPES
// ============================================================================

export interface UserProgress {
  readonly checkInStreak: StreakData;
  readonly assessmentHistory: AssessmentSummary[];
  readonly achievements: Achievement[];
  readonly milestones: Milestone[];
  readonly engagementMetrics: EngagementMetrics;
  readonly clinicalProgress: ClinicalProgress;
}

export interface StreakData {
  readonly current: number;
  readonly longest: number;
  readonly lastCheckIn: string;
  readonly streakType: 'daily' | 'weekly';
  readonly weeklyConsistency: number; // 0-1
  readonly monthlyConsistency: number; // 0-1
}

export interface AssessmentSummary {
  readonly type: 'PHQ9' | 'GAD7';
  readonly latestScore: number;
  readonly previousScore?: number;
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly assessmentCount: number;
  readonly lastAssessment: string;
  readonly clinicalSignificance: boolean;
}

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: 'streak' | 'assessment' | 'checkin' | 'clinical' | 'milestone';
  readonly icon: string;
  readonly unlockedAt: string;
  readonly shareble: boolean;
  readonly clinicalRelevance?: string;
}

export interface Milestone {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly targetValue: number;
  readonly currentValue: number;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly category: 'engagement' | 'consistency' | 'clinical' | 'therapeutic';
}

export interface EngagementMetrics {
  readonly totalCheckIns: number;
  readonly totalAssessments: number;
  readonly averageSessionDuration: number; // seconds
  readonly featureUsageFrequency: Record<string, number>;
  readonly lastActiveDate: string;
  readonly consistencyScore: number; // 0-1
  readonly therapeuticEngagement: number; // 0-1
}

export interface ClinicalProgress {
  readonly phq9Trend: TrendData;
  readonly gad7Trend: TrendData;
  readonly overallProgress: 'significant-improvement' | 'moderate-improvement' | 'stable' | 'decline' | 'insufficient-data';
  readonly clinicalMilestones: ClinicalMilestone[];
  readonly riskAssessment: RiskAssessment;
  readonly therapeuticGoalProgress: GoalProgress[];
}

export interface TrendData {
  readonly direction: 'improving' | 'stable' | 'declining' | 'variable';
  readonly changeAmount: number;
  readonly significance: 'none' | 'minimal' | 'clinical' | 'substantial';
  readonly dataPoints: TrendPoint[];
  readonly confidenceLevel: number; // 0-1
}

export interface TrendPoint {
  readonly date: string;
  readonly value: number;
  readonly context?: string;
}

export interface ClinicalMilestone {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly clinicalSignificance: string;
  readonly achieved: boolean;
  readonly achievedAt?: string;
  readonly evidenceLevel: 'research' | 'clinical' | 'anecdotal';
}

export interface RiskAssessment {
  readonly currentLevel: 'low' | 'moderate' | 'high' | 'critical';
  readonly factors: RiskFactor[];
  readonly protectiveFactors: string[];
  readonly lastAssessed: string;
  readonly nextAssessment: string;
  readonly interventionRequired: boolean;
}

export interface RiskFactor {
  readonly factor: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly trend: 'improving' | 'stable' | 'worsening';
  readonly evidenceSource: 'assessment' | 'checkin' | 'clinical';
}

export interface GoalProgress {
  readonly goalId: string;
  readonly title: string;
  readonly description: string;
  readonly targetDate?: string;
  readonly currentProgress: number; // 0-1
  readonly milestones: string[];
  readonly completedMilestones: string[];
  readonly therapeuticRelevance: string;
}

// ============================================================================
// CRISIS & SAFETY TYPES
// ============================================================================

export interface CrisisProtocol {
  readonly id: string;
  readonly userId: string;
  readonly active: boolean;
  readonly triggerConditions: TriggerCondition[];
  readonly responseSteps: ResponseStep[];
  readonly emergencyContacts: EmergencyContact[];
  readonly professionalContacts: ProfessionalContact[];
  readonly safetyPlan: SafetyPlan;
  readonly lastUpdated: string;
  readonly therapistApproved: boolean;
}

export interface TriggerCondition {
  readonly type: 'assessment-score' | 'checkin-pattern' | 'manual' | 'time-based';
  readonly threshold?: number;
  readonly pattern?: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResponseStep {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly action: 'self-care' | 'contact' | 'professional' | 'emergency';
  readonly timeframe: number; // minutes
  readonly escalationTrigger?: string;
}

export interface EmergencyContact {
  readonly id: string;
  readonly name: string;
  readonly relationship: string;
  readonly phone: string;
  readonly available247: boolean;
  readonly preferredContact: 'call' | 'text' | 'either';
  readonly priority: number;
  readonly notificationMethod: string[];
}

export interface ProfessionalContact {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly organization?: string;
  readonly phone: string;
  readonly email?: string;
  readonly availability: string;
  readonly specialization: string[];
  readonly emergencyProtocol: boolean;
}

export interface SafetyPlan {
  readonly id: string;
  readonly warningSignals: string[];
  readonly copingStrategies: string[];
  readonly reasonsForLiving: string[];
  readonly socialSupports: string[];
  readonly professionalSupports: string[];
  readonly environmentalSafety: string[];
  readonly restrictionAgreements: string[];
  readonly lastUpdated: string;
  readonly collaborativelyDeveloped: boolean;
}

// ============================================================================
// THERAPIST INTEGRATION TYPES
// ============================================================================

export interface TherapistIntegration {
  readonly therapistId: string;
  readonly patientId: string;
  readonly relationshipStatus: 'pending' | 'active' | 'paused' | 'terminated';
  readonly permissions: TherapistPermission[];
  readonly dataSharing: DataSharingPreferences;
  readonly communicationSettings: CommunicationSettings;
  readonly clinicalAgreements: ClinicalAgreement[];
}

export interface TherapistPermission {
  readonly permission: string;
  readonly granted: boolean;
  readonly grantedAt: string;
  readonly expiresAt?: string;
  readonly scope: 'read' | 'write' | 'notify' | 'emergency';
}

export interface DataSharingPreferences {
  readonly shareCheckIns: boolean;
  readonly shareAssessments: boolean;
  readonly shareProgress: boolean;
  readonly shareCrisisAlerts: boolean;
  readonly aggregatedDataOnly: boolean;
  readonly realTimeNotifications: boolean;
  readonly reportingFrequency: 'real-time' | 'daily' | 'weekly' | 'monthly';
}

export interface CommunicationSettings {
  readonly allowDirectMessages: boolean;
  readonly emergencyNotifications: boolean;
  readonly progressReports: boolean;
  readonly appointmentReminders: boolean;
  readonly preferredContactMethod: 'app' | 'email' | 'phone';
}

export interface ClinicalAgreement {
  readonly id: string;
  readonly type: 'data-sharing' | 'crisis-protocol' | 'treatment-plan' | 'safety-plan';
  readonly title: string;
  readonly description: string;
  readonly agreedAt: string;
  readonly expiresAt?: string;
  readonly version: string;
  readonly digitalSignature: boolean;
}

// ============================================================================
// SYNC & OFFLINE TYPES
// ============================================================================

export interface SyncStatus {
  readonly lastSync: string;
  readonly pendingSyncs: PendingSync[];
  readonly conflictResolutions: ConflictResolution[];
  readonly syncEnabled: boolean;
  readonly offlineCapable: boolean;
  readonly criticalDataSynced: boolean;
}

export interface PendingSync {
  readonly id: string;
  readonly type: 'checkin' | 'assessment' | 'preferences' | 'safety-plan';
  readonly action: 'create' | 'update' | 'delete';
  readonly data: unknown;
  readonly timestamp: string;
  readonly attempts: number;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConflictResolution {
  readonly id: string;
  readonly type: 'data-conflict' | 'version-mismatch' | 'permission-denied';
  readonly localData: unknown;
  readonly serverData: unknown;
  readonly resolution: 'local-wins' | 'server-wins' | 'merged' | 'manual-required';
  readonly resolvedAt?: string;
  readonly resolvedBy: 'system' | 'user' | 'therapist';
}

// ============================================================================
// VALIDATION & ERROR TYPES
// ============================================================================

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
}

export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly severity: 'error' | 'critical';
}

export interface ValidationWarning {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
  readonly stack?: string;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly reportable: boolean;
}

// ============================================================================
// TYPE GUARDS FOR RUNTIME SAFETY
// ============================================================================

export function isCheckIn(data: unknown): data is CheckIn {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'type' in data && 
         'startedAt' in data && 
         'data' in data;
}

export function isAssessment(data: unknown): data is Assessment {
  return typeof data === 'object' && 
         data !== null && 
         'id' in data && 
         'type' in data && 
         'score' in data && 
         'responses' in data;
}

export function isCriticalRisk(assessment: Assessment): boolean {
  return assessment.crisisThreshold || 
         (assessment.type === 'PHQ9' && assessment.score >= 20) ||
         (assessment.type === 'GAD7' && assessment.score >= 15);
}

export function hasActiveTherapist(clinicalProfile?: ClinicalProfile): boolean {
  return Boolean(clinicalProfile?.hasTherapist && clinicalProfile?.therapistId);
}

export function requiresEmergencyProtocol(riskAssessment: RiskAssessment): boolean {
  return riskAssessment.currentLevel === 'critical' || 
         riskAssessment.interventionRequired;
}

// ============================================================================
// APP VERSION COMPATIBILITY
// ============================================================================

export interface VersionCompatibility {
  readonly appVersion: string;
  readonly websiteVersion: string;
  readonly apiVersion: string;
  readonly compatible: boolean;
  readonly minimumRequiredVersion: string;
  readonly deprecationWarnings: string[];
  readonly migrationRequired: boolean;
}

export const APP_BRIDGE_VERSION = '1.0.0';
export const MINIMUM_APP_VERSION = '1.7.0';
export const API_COMPATIBILITY_VERSION = '2.0.0';