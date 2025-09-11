/**
 * Shared Widget Types for FullMind MBCT App
 * Type definitions used across React Native, iOS, and Android widget implementations
 */

// Core widget data structure (privacy-filtered)
export interface WidgetData {
  readonly todayProgress: DailyProgress;
  readonly hasActiveCrisis: boolean;
  readonly lastUpdateTime: string; // ISO timestamp
  readonly appVersion: string;
  readonly encryptionHash: string;
}

export interface DailyProgress {
  readonly morning: WidgetSessionStatus;
  readonly midday: WidgetSessionStatus;
  readonly evening: WidgetSessionStatus;
  readonly completionPercentage: number; // 0-100
}

export interface WidgetSessionStatus {
  readonly status: SessionStatus;
  readonly progressPercentage: number; // 0-100
  readonly canResume: boolean;
  readonly estimatedTimeMinutes: number;
}

export type SessionStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export type CheckInType = 'morning' | 'midday' | 'evening';

// Deep linking structure
export interface DeepLinkData {
  readonly scheme: 'fullmind';
  readonly path: string;
  readonly params: Record<string, string>;
}

export interface CheckInDeepLink extends DeepLinkData {
  readonly path: `/checkin/${CheckInType}`;
  readonly params: {
    readonly resume?: 'true' | 'false';
  };
}

export interface CrisisDeepLink extends DeepLinkData {
  readonly path: '/crisis';
  readonly params: {
    readonly trigger?: 'widget' | 'manual';
  };
}

// Widget configuration and metadata
export interface WidgetConfiguration {
  readonly widgetFamily: WidgetFamily;
  readonly updateFrequency: WidgetUpdateFrequency;
  readonly privacyLevel: PrivacyLevel;
  readonly theme: WidgetTheme;
}

export type WidgetFamily = 'small' | 'medium' | 'large';

export type WidgetUpdateFrequency = 'realtime' | 'frequent' | 'normal' | 'minimal';

export type PrivacyLevel = 'standard' | 'enhanced' | 'maximum';

export interface WidgetTheme {
  readonly primary: string; // Hex color
  readonly secondary: string; // Hex color
  readonly accent: string; // Hex color
  readonly background: string; // Hex color
  readonly text: string; // Hex color
}

// Analytics and performance tracking (privacy-safe)
export interface WidgetAnalyticsEvent {
  readonly eventType: WidgetEventType;
  readonly timestamp: string; // ISO timestamp
  readonly widgetFamily: WidgetFamily;
  readonly metadata: Record<string, string | number | boolean>;
}

export type WidgetEventType = 
  | 'widget_displayed'
  | 'widget_tapped'
  | 'checkin_started'
  | 'session_resumed'
  | 'crisis_accessed'
  | 'update_completed'
  | 'update_failed';

export interface WidgetPerformanceMetrics {
  readonly updateDuration: number; // milliseconds
  readonly dataSize: number; // bytes
  readonly memoryUsage: number; // bytes
  readonly batteryImpact: 'low' | 'medium' | 'high';
  readonly errorRate: number; // 0-1
}

// Security and privacy
export interface PrivacyAuditResult {
  readonly passed: boolean;
  readonly violations: PrivacyViolation[];
  readonly complianceLevel: ComplianceLevel;
  readonly auditTimestamp: string;
}

export interface PrivacyViolation {
  readonly severity: ViolationSeverity;
  readonly category: ViolationCategory;
  readonly description: string;
  readonly field?: string;
  readonly remediation: string;
}

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ViolationCategory = 
  | 'clinical_data'
  | 'personal_info'
  | 'unencrypted_data'
  | 'unauthorized_access';

export type ComplianceLevel = 'full' | 'partial' | 'violation';

// Widget health monitoring
export interface WidgetHealthStatus {
  readonly isHealthy: boolean;
  readonly lastCheck: string; // ISO timestamp
  readonly issues: HealthIssue[];
  readonly performance: WidgetPerformanceMetrics;
}

export interface HealthIssue {
  readonly type: HealthIssueType;
  readonly severity: ViolationSeverity;
  readonly description: string;
  readonly resolution?: string;
}

export type HealthIssueType = 
  | 'data_sync_failed'
  | 'encryption_error'
  | 'native_bridge_error'
  | 'privacy_violation'
  | 'performance_degradation'
  | 'memory_leak';

// Native bridge communication
export interface NativeBridgeMessage {
  readonly method: NativeBridgeMethod;
  readonly params: Record<string, any>;
  readonly requestId: string;
  readonly timestamp: string;
}

export type NativeBridgeMethod = 
  | 'storeWidgetData'
  | 'retrieveWidgetData'
  | 'updateWidgets'
  | 'reloadWidgets'
  | 'handleDeepLink'
  | 'performHealthCheck'
  | 'clearWidgetData';

export interface NativeBridgeResponse {
  readonly requestId: string;
  readonly success: boolean;
  readonly data?: any;
  readonly error?: string;
  readonly timestamp: string;
}

// Error handling
export class WidgetError extends Error {
  constructor(
    message: string,
    public readonly code: WidgetErrorCode,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'WidgetError';
  }
}

export type WidgetErrorCode = 
  | 'PRIVACY_VIOLATION'
  | 'DATA_ENCRYPTION_FAILED'
  | 'NATIVE_BRIDGE_ERROR'
  | 'DEEP_LINK_INVALID'
  | 'UPDATE_THROTTLED'
  | 'CONFIGURATION_INVALID'
  | 'STORAGE_UNAVAILABLE'
  | 'WIDGET_NOT_INSTALLED';

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type ReadonlyDeep<T> = {
  readonly [P in keyof T]: T[P] extends object ? ReadonlyDeep<T[P]> : T[P];
};

// Widget-specific constants
export const WIDGET_CONSTANTS = {
  UPDATE_INTERVALS: {
    REALTIME: 60000, // 1 minute
    FREQUENT: 300000, // 5 minutes
    NORMAL: 900000, // 15 minutes
    MINIMAL: 3600000, // 1 hour
  },
  
  PRIVACY_LEVELS: {
    STANDARD: 'standard',
    ENHANCED: 'enhanced',
    MAXIMUM: 'maximum',
  } as const,
  
  DEEP_LINK_SCHEME: 'fullmind',
  
  WIDGET_FAMILIES: {
    SMALL: 'small',
    MEDIUM: 'medium', 
    LARGE: 'large',
  } as const,
  
  THEMES: {
    MORNING: {
      primary: '#FF9F43',
      secondary: '#E8863A',
      accent: '#FFFFFF',
      background: 'linear-gradient(135deg, #FF9F43, #E8863A)',
      text: '#FFFFFF',
    },
    MIDDAY: {
      primary: '#40B5AD',
      secondary: '#2C8A82',
      accent: '#FFFFFF',
      background: 'linear-gradient(135deg, #40B5AD, #2C8A82)',
      text: '#FFFFFF',
    },
    EVENING: {
      primary: '#4A7C59',
      secondary: '#2D5016',
      accent: '#FFFFFF',
      background: 'linear-gradient(135deg, #4A7C59, #2D5016)',
      text: '#FFFFFF',
    },
  },
} as const;

// Type guards for runtime type checking
export const isWidgetData = (data: any): data is WidgetData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.todayProgress === 'object' &&
    typeof data.hasActiveCrisis === 'boolean' &&
    typeof data.lastUpdateTime === 'string' &&
    typeof data.appVersion === 'string' &&
    typeof data.encryptionHash === 'string'
  );
};

export const isSessionStatus = (status: any): status is SessionStatus => {
  return ['not_started', 'in_progress', 'completed', 'skipped'].includes(status);
};

export const isCheckInType = (type: any): type is CheckInType => {
  return ['morning', 'midday', 'evening'].includes(type);
};

export const isDeepLinkData = (data: any): data is DeepLinkData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    data.scheme === 'fullmind' &&
    typeof data.path === 'string' &&
    typeof data.params === 'object'
  );
};