/**
 * FullMind Website - App Integration Type Definitions
 * Types for seamless integration with React Native app ecosystem
 */

import { 
  CheckIn, 
  Assessment, 
  ResumableSession, 
  SessionProgress 
} from './app-bridge';

// ============================================================================
// APP-WEBSITE BRIDGE TYPES
// ============================================================================

export interface AppBridgeMessage {
  readonly type: 'app-to-web' | 'web-to-app';
  readonly action: AppBridgeAction;
  readonly payload?: unknown;
  readonly requestId: string;
  readonly timestamp: Date;
  readonly source: 'fullmind-app' | 'fullmind-website';
}

export type AppBridgeAction = 
  | 'SYNC_PROGRESS'
  | 'REQUEST_ONBOARDING_STATUS' 
  | 'REQUEST_ASSESSMENT_HISTORY'
  | 'REQUEST_CHECKIN_STREAK'
  | 'TRIGGER_DOWNLOAD'
  | 'LAUNCH_APP_SECTION'
  | 'SHARE_ACHIEVEMENT'
  | 'REQUEST_CRISIS_RESOURCES'
  | 'SYNC_PREFERENCES';

export interface AppBridgeResponse {
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string;
  readonly requestId: string;
  readonly timestamp: Date;
}

// ============================================================================
// DOWNLOAD & PLATFORM DETECTION TYPES
// ============================================================================

export interface PlatformDetection {
  readonly platform: 'ios' | 'android' | 'desktop' | 'unknown';
  readonly version?: string;
  readonly userAgent: string;
  readonly supported: boolean;
  readonly recommendedAction: DownloadAction;
}

export type DownloadAction = 
  | 'app-store'
  | 'play-store'
  | 'waitlist'
  | 'web-app'
  | 'unsupported';

export interface DownloadTracking {
  readonly clickId: string;
  readonly source: string;
  readonly platform: string;
  readonly timestamp: Date;
  readonly userAgent: string;
  readonly referrer?: string;
  readonly utmParams?: UTMParameters;
  readonly converted?: boolean;
  readonly conversionTimestamp?: Date;
}

export interface UTMParameters {
  readonly source?: string;
  readonly medium?: string;
  readonly campaign?: string;
  readonly term?: string;
  readonly content?: string;
}

export interface DeepLinkConfig {
  readonly scheme: 'fullmind';
  readonly host: string;
  readonly path: string;
  readonly params?: Record<string, string>;
  readonly fallbackUrl?: string;
  readonly universalLink?: string;
}

// ============================================================================
// USER PROGRESS & CONTINUITY TYPES
// ============================================================================

export interface UserProgressSync {
  readonly userId?: string;
  readonly sessionToken?: string;
  readonly lastSync: Date;
  readonly progress: {
    readonly onboardingComplete: boolean;
    readonly currentStreak: number;
    readonly totalCheckIns: number;
    readonly completedAssessments: number;
    readonly unlockedFeatures: string[];
  };
  readonly preferences: UserPreferences;
  readonly achievements: Achievement[];
}

export interface UserPreferences {
  readonly theme: 'morning' | 'midday' | 'evening' | 'auto';
  readonly notifications: {
    readonly checkInReminders: boolean;
    readonly assessmentReminders: boolean;
    readonly motivationalMessages: boolean;
    readonly crisisAlerts: boolean;
  };
  readonly accessibility: {
    readonly reduceMotion: boolean;
    readonly highContrast: boolean;
    readonly largeText: boolean;
    readonly screenReaderOptimized: boolean;
  };
  readonly clinical: {
    readonly shareWithTherapist: boolean;
    readonly anonymousReporting: boolean;
    readonly dataRetention: number; // days
  };
}

export interface Achievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: 'streak' | 'assessment' | 'checkin' | 'clinical' | 'milestone';
  readonly unlockedAt: Date;
  readonly shareble: boolean;
  readonly clinicalSignificance?: string;
}

export interface OnboardingStatus {
  readonly completed: boolean;
  readonly currentStep?: number;
  readonly totalSteps: number;
  readonly completedSteps: string[];
  readonly skippedSteps: string[];
  readonly personalizedRecommendations: string[];
  readonly clinicalProfile?: ClinicalProfile;
}

export interface ClinicalProfile {
  readonly riskLevel: 'low' | 'moderate' | 'high';
  readonly primaryConcerns: string[];
  readonly therapeuticGoals: string[];
  readonly previousExperience: boolean;
  readonly therapistInvolved: boolean;
  readonly crisisProtocol: boolean;
}

// ============================================================================
// ASSESSMENT INTEGRATION TYPES
// ============================================================================

export interface AssessmentHistory {
  readonly userId?: string;
  readonly assessments: Assessment[];
  readonly trends: AssessmentTrend[];
  readonly clinicalInsights: ClinicalInsight[];
  readonly lastAssessment?: Date;
  readonly nextRecommended?: Date;
}

export interface AssessmentTrend {
  readonly type: 'PHQ9' | 'GAD7';
  readonly period: '7d' | '30d' | '90d' | '1y';
  readonly direction: 'improving' | 'stable' | 'declining' | 'variable';
  readonly significance: 'none' | 'minimal' | 'clinical' | 'critical';
  readonly dataPoints: TrendDataPoint[];
  readonly clinicalNote?: string;
}

export interface TrendDataPoint {
  readonly date: Date;
  readonly score: number;
  readonly severity: string;
  readonly context?: string;
  readonly clinicallySignificant: boolean;
}

export interface ClinicalInsight {
  readonly id: string;
  readonly type: 'trend' | 'milestone' | 'concern' | 'achievement';
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly title: string;
  readonly description: string;
  readonly actionRecommended?: string;
  readonly clinicalEvidence?: string;
  readonly validatedAt: Date;
}

// ============================================================================
// CHECK-IN INTEGRATION TYPES
// ============================================================================

export interface CheckInHistory {
  readonly userId?: string;
  readonly checkIns: CheckIn[];
  readonly streaks: StreakData;
  readonly patterns: CheckInPattern[];
  readonly lastCheckIn?: Date;
  readonly nextReminder?: Date;
}

export interface StreakData {
  readonly current: number;
  readonly longest: number;
  readonly weeklyAverage: number;
  readonly monthlyCompletion: number;
  readonly streakType: 'daily' | 'weekly' | 'milestone';
  readonly streakStart?: Date;
  readonly milestones: Milestone[];
}

export interface Milestone {
  readonly days: number;
  readonly title: string;
  readonly description: string;
  readonly achieved: boolean;
  readonly achievedAt?: Date;
  readonly reward?: string;
}

export interface CheckInPattern {
  readonly type: 'morning' | 'midday' | 'evening';
  readonly consistency: number; // 0-1
  readonly preferredTime: string;
  readonly completionRate: number; // 0-1
  readonly qualityScore: number; // 0-1
  readonly therapeuticEngagement: number; // 0-1
}

// ============================================================================
// CRISIS & SAFETY INTEGRATION TYPES
// ============================================================================

export interface CrisisProtocolSync {
  readonly userId?: string;
  readonly protocols: CrisisProtocol[];
  readonly contacts: EmergencyContact[];
  readonly safetyPlan?: SafetyPlan;
  readonly lastUpdated: Date;
  readonly therapistShared: boolean;
}

export interface CrisisProtocol {
  readonly id: string;
  readonly trigger: string;
  readonly severity: 'low' | 'moderate' | 'high' | 'critical';
  readonly response: string[];
  readonly contacts: string[];
  readonly resources: string[];
  readonly escalation: string[];
  readonly timeframe: number; // minutes
}

export interface EmergencyContact {
  readonly id: string;
  readonly name: string;
  readonly relationship: string;
  readonly phone: string;
  readonly availability: string;
  readonly notificationMethod: 'call' | 'text' | 'both';
  readonly priority: number;
  readonly therapistContact: boolean;
}

export interface SafetyPlan {
  readonly id: string;
  readonly userId: string;
  readonly warningSignals: string[];
  readonly copingStrategies: string[];
  readonly supportContacts: EmergencyContact[];
  readonly professionalContacts: EmergencyContact[];
  readonly environmentalSafety: string[];
  readonly reasonsForLiving: string[];
  readonly lastUpdated: Date;
  readonly therapistApproved: boolean;
}

// ============================================================================
// THERAPIST PORTAL INTEGRATION TYPES
// ============================================================================

export interface TherapistPatientSync {
  readonly therapistId: string;
  readonly patients: PatientSummary[];
  readonly permissions: TherapistPermissions;
  readonly notifications: TherapistNotification[];
  readonly lastSync: Date;
}

export interface PatientSummary {
  readonly patientId: string;
  readonly anonymizedId: string;
  readonly consentLevel: 'basic' | 'extended' | 'full';
  readonly lastActivity: Date;
  readonly riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  readonly progressSummary: {
    readonly checkInConsistency: number;
    readonly assessmentTrends: 'improving' | 'stable' | 'declining';
    readonly engagementLevel: 'low' | 'medium' | 'high';
    readonly clinicalConcerns: string[];
  };
  readonly alerts: PatientAlert[];
}

export interface TherapistPermissions {
  readonly viewProgress: boolean;
  readonly viewAssessments: boolean;
  readonly viewCrisisAlerts: boolean;
  readonly receiveNotifications: boolean;
  readonly exportData: boolean;
  readonly modifySafetyPlan: boolean;
}

export interface TherapistNotification {
  readonly id: string;
  readonly type: 'crisis-alert' | 'progress-concern' | 'milestone' | 'missed-checkin';
  readonly patientId: string;
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';
  readonly title: string;
  readonly message: string;
  readonly timestamp: Date;
  readonly acknowledged: boolean;
  readonly actionRequired: boolean;
}

export interface PatientAlert {
  readonly id: string;
  readonly type: 'crisis' | 'concern' | 'milestone' | 'engagement';
  readonly severity: 'info' | 'warning' | 'critical';
  readonly message: string;
  readonly timestamp: Date;
  readonly resolved: boolean;
  readonly actionTaken?: string;
}

// ============================================================================
// PERFORMANCE & ANALYTICS INTEGRATION
// ============================================================================

export interface CrossPlatformAnalytics {
  readonly sessionId: string;
  readonly userId?: string;
  readonly platform: 'web' | 'ios' | 'android';
  readonly events: AnalyticsEvent[];
  readonly performance: PerformanceMetrics;
  readonly engagement: EngagementMetrics;
  readonly clinical: ClinicalMetrics;
}

export interface AnalyticsEvent {
  readonly name: string;
  readonly category: 'navigation' | 'interaction' | 'conversion' | 'clinical' | 'error';
  readonly properties: Record<string, string | number | boolean>;
  readonly timestamp: Date;
  readonly platform: string;
  readonly clinicalContext?: boolean;
}

export interface PerformanceMetrics {
  readonly loadTime: number;
  readonly renderTime: number;
  readonly interactionDelay: number;
  readonly errorRate: number;
  readonly crashRate: number;
  readonly memoryUsage?: number;
  readonly networkLatency?: number;
}

export interface EngagementMetrics {
  readonly sessionDuration: number;
  readonly screenTime: Record<string, number>;
  readonly interactionCount: number;
  readonly featureUsage: Record<string, number>;
  readonly dropoffPoints: string[];
  readonly completionRate: number;
}

export interface ClinicalMetrics {
  readonly assessmentCompletion: number;
  readonly checkInConsistency: number;
  readonly therapeuticEngagement: number;
  readonly crisisInterventions: number;
  readonly progressMeasures: Record<string, number>;
  readonly clinicalOutcomes: ClinicalOutcome[];
}

export interface ClinicalOutcome {
  readonly measure: 'PHQ9' | 'GAD7' | 'engagement' | 'consistency';
  readonly baseline: number;
  readonly current: number;
  readonly change: number;
  readonly significance: 'none' | 'minimal' | 'clinical' | 'substantial';
  readonly timeframe: string;
}

// ============================================================================
// WEBSOCKET & REAL-TIME COMMUNICATION
// ============================================================================

export interface WebSocketMessage {
  readonly type: 'sync' | 'notification' | 'crisis' | 'update';
  readonly channel: string;
  readonly data: unknown;
  readonly timestamp: Date;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly encryption?: boolean;
}

export interface RealTimeSync {
  readonly connectionId: string;
  readonly userId?: string;
  readonly platform: 'web' | 'app';
  readonly status: 'connected' | 'disconnected' | 'reconnecting';
  readonly lastPing: Date;
  readonly syncQueue: SyncItem[];
  readonly conflictResolution: 'client-wins' | 'server-wins' | 'merge';
}

export interface SyncItem {
  readonly id: string;
  readonly type: 'checkin' | 'assessment' | 'preference' | 'safety-plan';
  readonly action: 'create' | 'update' | 'delete';
  readonly data: unknown;
  readonly timestamp: Date;
  readonly priority: number;
  readonly retryCount: number;
}

// ============================================================================
// OFFLINE & CACHE MANAGEMENT
// ============================================================================

export interface OfflineCapabilities {
  readonly supported: boolean;
  readonly cacheStrategy: 'aggressive' | 'conservative' | 'clinical-only';
  readonly syncOnline: boolean;
  readonly clinicalDataPersistence: boolean;
  readonly emergencyOfflineAccess: boolean;
}

export interface CacheConfig {
  readonly userPreferences: { ttl: number; strategy: 'never' | 'on-demand' | 'background' };
  readonly clinicalData: { ttl: number; strategy: 'never' | 'on-demand' | 'background' };
  readonly staticContent: { ttl: number; strategy: 'never' | 'on-demand' | 'background' };
  readonly emergencyResources: { ttl: number; strategy: 'never' | 'on-demand' | 'background' };
}

export interface SyncConflictResolution {
  readonly strategy: 'client-priority' | 'server-priority' | 'timestamp' | 'clinical-priority';
  readonly clinicalDataPrecedence: boolean;
  readonly userNotification: boolean;
  readonly manualResolution: boolean;
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

export function isAppBridgeMessage(data: unknown): data is AppBridgeMessage {
  return typeof data === 'object' && 
         data !== null && 
         'type' in data && 
         'action' in data && 
         'requestId' in data;
}

export function isClinicalData(data: unknown): data is CheckIn | Assessment {
  return typeof data === 'object' && 
         data !== null && 
         ('type' in data || 'score' in data);
}

export function isCriticalNotification(notification: TherapistNotification): boolean {
  return notification.priority === 'urgent' || notification.type === 'crisis-alert';
}

export function requiresImmediateSync(syncItem: SyncItem): boolean {
  return syncItem.type === 'safety-plan' || 
         (syncItem.type === 'assessment' && syncItem.priority > 8) ||
         syncItem.retryCount >= 3;
}

// ============================================================================
// INTEGRATION CONSTANTS
// ============================================================================

export const INTEGRATION_CONSTANTS = {
  BRIDGE_TIMEOUT: 5000, // 5 seconds
  SYNC_INTERVAL: 300000, // 5 minutes
  CRITICAL_SYNC_INTERVAL: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  CACHE_DURATION: {
    USER_PREFERENCES: 86400000, // 24 hours
    CLINICAL_DATA: 3600000, // 1 hour
    STATIC_CONTENT: 604800000, // 7 days
    EMERGENCY_RESOURCES: 0, // Never cache (always fresh)
  },
  WEBSOCKET_RECONNECT_INTERVAL: 1000, // 1 second
  MAX_WEBSOCKET_RECONNECTS: 10,
} as const;

export const DEEP_LINK_ROUTES = {
  ONBOARDING: '/onboarding',
  ASSESSMENT_PHQ9: '/assessment/phq9',
  ASSESSMENT_GAD7: '/assessment/gad7',
  CHECKIN_MORNING: '/checkin/morning',
  CHECKIN_MIDDAY: '/checkin/midday',
  CHECKIN_EVENING: '/checkin/evening',
  CRISIS_RESOURCES: '/crisis',
  SAFETY_PLAN: '/safety-plan',
  PROGRESS: '/progress',
  SETTINGS: '/settings',
} as const;