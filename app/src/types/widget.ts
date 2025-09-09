/**
 * Widget Bridge Type Definitions
 * Comprehensive TypeScript types for widget integration with clinical-grade privacy protection
 * Ensures zero clinical data exposure through compile-time type safety
 */

// Core Widget Types
export interface WidgetData {
  readonly todayProgress: WidgetTodayProgress;
  readonly hasActiveCrisis: boolean; // Deprecated: Use crisisButton.prominence instead
  readonly crisisButton: WidgetCrisisButton;
  readonly lastUpdateTime: string;
  readonly appVersion: string;
  readonly encryptionHash: string;
}

export interface WidgetCrisisButton {
  readonly alwaysVisible: true; // Always true for safety - unconditional crisis access
  readonly prominence: WidgetCrisisProminence;
  readonly text: string; // Variable text based on prominence level
  readonly style: WidgetCrisisStyle; // Visual styling variation
  readonly responseTimeMs?: number; // Optional performance tracking
}

export interface WidgetTodayProgress {
  readonly morning: WidgetSessionStatus;
  readonly midday: WidgetSessionStatus;  
  readonly evening: WidgetSessionStatus;
  readonly completionPercentage: number; // 0-100
}

export interface WidgetSessionStatus {
  readonly status: WidgetSessionStatusType;
  readonly progressPercentage: number; // 0-100
  readonly canResume: boolean;
  readonly estimatedTimeMinutes: number;
}

export type WidgetSessionStatusType = 
  | 'not_started' 
  | 'in_progress' 
  | 'completed' 
  | 'skipped';

export type WidgetCrisisProminence = 
  | 'standard'   // Normal visibility - crisis support available
  | 'enhanced';  // High visibility - active crisis detected

export type WidgetCrisisStyle = 
  | 'standard'   // Regular crisis button styling
  | 'urgent';    // Enhanced styling for active crisis

export type CheckInType = 'morning' | 'midday' | 'evening';

// Deep Link Types
export interface WidgetDeepLinkParams {
  readonly url: string;
  readonly timestamp: string;
  readonly source: 'ios_widget' | 'android_widget';
}

export interface CheckInDeepLinkParams {
  readonly type: CheckInType;
  readonly resume: boolean;
  readonly fromWidget: true;
  readonly timestamp: string;
}

export interface CrisisDeepLinkParams {
  readonly trigger: CrisisTrigger;
  readonly fromWidget: true;
  readonly emergencyMode: true;
  readonly timestamp: string;
}

export type CrisisTrigger = 
  | 'widget_emergency_access'
  | 'widget_crisis_button'
  | 'manual_intervention';

// Native Bridge Interface Types
export interface WidgetNativeBridge {
  // iOS WidgetKit Bridge
  ios: {
    updateWidgetData: (data: string) => Promise<void>;
    reloadWidgets: () => Promise<void>;
    setAppGroupData: (key: string, data: string) => Promise<void>;
    getAppGroupData: (key: string) => Promise<string | null>;
  };
  // Android AppWidget Bridge  
  android: {
    updateWidgetData: (data: string) => Promise<void>;
    updateAllWidgets: () => Promise<void>;
    updateWidgetById: (widgetId: number, data: string) => Promise<void>;
    getActiveWidgetIds: () => Promise<number[]>;
  };
}

// Privacy Protection Types
export interface PrivacyFilter {
  readonly allowedFields: ReadonlyArray<keyof WidgetData>;
  readonly prohibitedPatterns: ReadonlyArray<string>;
  readonly maxDataSize: number;
}

export interface PrivacyValidationResult {
  readonly isValid: boolean;
  readonly violations: ReadonlyArray<PrivacyViolation>;
  readonly filteredData: WidgetData | null;
}

export interface PrivacyViolation {
  readonly field: string;
  readonly violationType: PrivacyViolationType;
  readonly details: string;
}

export type PrivacyViolationType =
  | 'clinical_data_detected'
  | 'personal_information_detected'
  | 'assessment_data_detected'
  | 'size_limit_exceeded'
  | 'unauthorized_field';

// Widget Update Triggers
export interface WidgetUpdateTrigger {
  readonly source: WidgetUpdateSource;
  readonly reason: WidgetUpdateReason;
  readonly timestamp: string;
  readonly priority: WidgetUpdatePriority;
}

export type WidgetUpdateSource =
  | 'checkin_completed'
  | 'checkin_started'
  | 'checkin_resumed'
  | 'session_progress'
  | 'manual_refresh'
  | 'app_foreground'
  | 'crisis_mode_changed';

export type WidgetUpdateReason =
  | 'status_change'
  | 'progress_update' 
  | 'schedule_update'
  | 'crisis_alert'
  | 'data_refresh';

export type WidgetUpdatePriority =
  | 'low'      // Background updates
  | 'normal'   // Regular status changes
  | 'high'     // Immediate user actions
  | 'critical' // Crisis or safety-related;

// Type Guards for Runtime Safety
export interface WidgetTypeGuards {
  isValidWidgetData: (data: unknown) => data is WidgetData;
  isValidSessionStatus: (status: unknown) => status is WidgetSessionStatus;
  isValidDeepLinkParams: (params: unknown) => params is WidgetDeepLinkParams;
  isValidCheckInType: (type: unknown) => type is CheckInType;
  isValidCrisisButton: (button: unknown) => button is WidgetCrisisButton;
  hasPrivacyViolations: (data: unknown) => boolean;
}

// Error Types
export class WidgetBridgeError extends Error {
  constructor(
    message: string,
    public readonly code: WidgetErrorCode,
    public readonly context?: unknown
  ) {
    super(message);
    this.name = 'WidgetBridgeError';
  }
}

export type WidgetErrorCode =
  | 'NATIVE_MODULE_NOT_AVAILABLE'
  | 'PRIVACY_VIOLATION'
  | 'INVALID_DATA_FORMAT'
  | 'NAVIGATION_FAILED'
  | 'UPDATE_THROTTLED'
  | 'STORAGE_FAILED'
  | 'DEEP_LINK_INVALID'
  | 'CRISIS_NAVIGATION_FAILED';

// Widget Configuration
export interface WidgetConfiguration {
  readonly updateFrequencyMs: number;
  readonly maxRetries: number;
  readonly timeoutMs: number;
  readonly privacyLevel: WidgetPrivacyLevel;
  readonly enabledFeatures: ReadonlyArray<WidgetFeature>;
}

export type WidgetPrivacyLevel = 
  | 'minimal'    // Progress only
  | 'standard'   // Progress + time estimates
  | 'enhanced';  // All safe data

export type WidgetFeature =
  | 'progress_display'
  | 'quick_checkin'
  | 'crisis_button'
  | 'time_estimates'
  | 'completion_stats';

// Store Integration Types
export interface WidgetStoreIntegration {
  readonly subscribeToCheckInUpdates: (callback: WidgetUpdateCallback) => () => void;
  readonly subscribeToSessionProgress: (callback: WidgetProgressCallback) => () => void;
  readonly subscribeToUserEvents: (callback: WidgetEventCallback) => () => void;
}

export type WidgetUpdateCallback = (trigger: WidgetUpdateTrigger) => void;
export type WidgetProgressCallback = (progress: WidgetTodayProgress) => void;
export type WidgetEventCallback = (event: WidgetEvent) => void;

export interface WidgetEvent {
  readonly type: WidgetEventType;
  readonly data: unknown;
  readonly timestamp: string;
}

export type WidgetEventType =
  | 'checkin_status_changed'
  | 'session_progress_updated'
  | 'crisis_mode_activated'
  | 'crisis_mode_deactivated'
  | 'user_preferences_changed';

// Utility Types for Type Safety

// Ensures no clinical data can accidentally be included
export type SafeForWidget<T> = T extends 
  | { phq9: any } 
  | { gad7: any }
  | { assessment: any }
  | { score: any }
  | { suicidal: any }
  | { personalNote: any }
  | { emergencyContact: any }
  ? never 
  : T;

// Readonly recursive type for immutable widget data
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object 
    ? T[P] extends Function 
      ? T[P]
      : DeepReadonly<T[P]>
    : T[P];
};

// Widget data must be safe and readonly
export type WidgetSafeData<T> = DeepReadonly<SafeForWidget<T>>;

// Compile-time privacy validation
export type PrivacyCompliant<T> = T extends WidgetSafeData<T> ? T : never;

// Hook Integration Types
export interface UseWidgetIntegrationOptions {
  readonly autoUpdate: boolean;
  readonly updateOnForeground: boolean;
  readonly throttleMs: number;
  readonly retryConfig: WidgetRetryConfig;
}

export interface WidgetRetryConfig {
  readonly maxRetries: number;
  readonly backoffMs: number;
  readonly exponentialBackoff: boolean;
}

export interface UseWidgetIntegrationReturn {
  readonly widgetData: WidgetData | null;
  readonly isUpdating: boolean;
  readonly error: WidgetBridgeError | null;
  readonly lastUpdateTime: string | null;
  readonly updateWidgetData: () => Promise<void>;
  readonly handleDeepLink: (url: string) => Promise<void>;
  readonly clearError: () => void;
}

// Testing Support Types
export interface WidgetTestingUtils {
  readonly createMockWidgetData: (overrides?: Partial<WidgetData>) => WidgetData;
  readonly createMockNativeBridge: () => WidgetNativeBridge;
  readonly simulateDeepLink: (type: CheckInType, resume?: boolean) => string;
  readonly validatePrivacy: (data: unknown) => PrivacyValidationResult;
}

// Performance Monitoring Types
export interface WidgetPerformanceMetrics {
  readonly updateLatencyMs: number;
  readonly nativeCallLatencyMs: number;
  readonly dataSerializationMs: number;
  readonly privacyValidationMs: number;
  readonly totalOperationMs: number;
}

export interface WidgetPerformanceTracker {
  readonly startOperation: (operation: string) => string;
  readonly endOperation: (operationId: string) => WidgetPerformanceMetrics;
  readonly getAverageMetrics: () => WidgetPerformanceMetrics;
  readonly resetMetrics: () => void;
}