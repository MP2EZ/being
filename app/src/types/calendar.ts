/**
 * Calendar Integration Types for FullMind MBCT App
 * 
 * Privacy-safe calendar integration with compile-time PHI protection
 * and comprehensive user agency controls for therapeutic scheduling.
 */

import { CheckInType } from '../types';

// Privacy-Safe Calendar Event (Compile-time PHI Prevention)
export interface PrivacySafeCalendarEvent {
  // Restricted title options (enum prevents PHI exposure)
  readonly title: 'FullMind Practice' | 'Mindfulness Session' | 'Wellness Check-in' | 'Self-Care Time';
  readonly description: string; // Max 50 chars, generic therapeutic language only
  readonly startDate: Date;
  readonly endDate: Date;
  readonly allDay: boolean;
  readonly isRecurring: boolean;
  
  // Compile-time privacy guarantees
  readonly containsNoPHI: true; // Compile-time flag
  readonly isGenericOnly: true;
  readonly clinicalDataExcluded: true;
  
  // Therapeutic context (local only, never exported to calendar)
  readonly localMetadata: {
    readonly checkInType: CheckInType;
    readonly therapeuticContext: 'routine' | 'crisis_recovery' | 'habit_building';
    readonly userCustomized: boolean;
    readonly reminderEnabled: boolean;
    readonly privacyLevel: CalendarPrivacyLevel;
  } | null;
  
  // Calendar platform metadata
  readonly platformMetadata: {
    readonly calendarId?: string; // External calendar ID
    readonly eventId?: string; // External event ID
    readonly lastSynced?: string; // ISO timestamp
    readonly syncStatus: 'pending' | 'synced' | 'failed' | 'disabled';
  };
}

// Calendar Privacy Levels
export type CalendarPrivacyLevel = 'maximum' | 'balanced' | 'minimal';

// Platform-Specific Permission Management
export interface CalendarPermissionManager {
  readonly ios: {
    readonly eventKit: boolean;
    readonly requestStatus: 'not_determined' | 'denied' | 'authorized' | 'restricted';
    readonly fallbackStrategy: 'local_notifications' | 'in_app_only' | 'user_choice';
    readonly degradationGraceful: boolean;
  };
  readonly android: {
    readonly calendarProvider: boolean;
    readonly writeCalendar: boolean;
    readonly readCalendar: boolean;
    readonly degradationMode: 'graceful' | 'disabled' | 'notification_fallback';
  };
  readonly web: {
    readonly notSupported: true;
    readonly fallbackStrategy: 'local_storage_reminders';
  };
}

// User Agency and Control Interface
export interface CalendarUserPreferences {
  readonly integrationLevel: 'disabled' | 'minimal' | 'standard' | 'full';
  readonly respectCrisisBoundaries: boolean; // No reminders during crisis episodes
  readonly privacyLevel: CalendarPrivacyLevel;
  
  // Therapeutic timing windows (user-customizable)
  readonly therapeuticTiming: {
    readonly morningWindow: TimeWindow; // Default: 6:00-10:00 AM
    readonly middayWindow: TimeWindow;  // Default: 11:00 AM-3:00 PM
    readonly eveningWindow: TimeWindow; // Default: 6:00-10:00 PM
  };
  
  // Granular control over calendar features
  readonly featureControls: {
    readonly createCalendarEvents: boolean;
    readonly sendReminders: boolean;
    readonly enableRecurrence: boolean;
    readonly crossPlatformSync: boolean;
    readonly shareCalendarData: boolean; // Always false for PHI protection
  };
  
  // Emergency and crisis considerations
  readonly crisisSettings: {
    readonly pauseDuringCrisis: boolean; // Automatically pause reminders during crisis
    readonly crisisOverrideDuration: number; // Hours to pause after crisis resolution
    readonly emergencyContactIntegration: boolean; // Warn emergency contacts of missed sessions
  };
  
  // Accessibility preferences
  readonly accessibility: {
    readonly largeTextCalendarEvents: boolean;
    readonly highContrastReminders: boolean;
    readonly voiceOverOptimized: boolean;
    readonly reducedMotionCalendar: boolean;
  };
}

// Time Window Definition
export interface TimeWindow {
  readonly startHour: number; // 0-23
  readonly startMinute: number; // 0-59
  readonly endHour: number; // 0-23
  readonly endMinute: number; // 0-59
  readonly enabled: boolean;
  readonly customizableByUser: boolean;
}

// Calendar Integration Status and Health
export interface CalendarIntegrationStatus {
  readonly isEnabled: boolean;
  readonly isHealthy: boolean;
  readonly lastSync: string | null; // ISO timestamp
  readonly permissions: CalendarPermissionManager;
  readonly activeCalendars: readonly CalendarInfo[];
  readonly syncErrors: readonly CalendarError[];
  readonly performanceMetrics: CalendarPerformanceMetrics;
}

// Calendar Information (Privacy-Safe)
export interface CalendarInfo {
  readonly id: string;
  readonly title: string; // Calendar name (user's calendar, no PHI)
  readonly color: string; // Hex color
  readonly isDefault: boolean;
  readonly accessLevel: 'read' | 'write' | 'owner';
  readonly platform: 'ios' | 'android' | 'google' | 'outlook' | 'other';
}

// Calendar Performance Metrics
export interface CalendarPerformanceMetrics {
  readonly eventCreationTime: number; // Average ms to create event
  readonly syncLatency: number; // Average ms for sync operations
  readonly failureRate: number; // 0-1, percentage of failed operations
  readonly memoryUsage: number; // Bytes used by calendar operations
  readonly batteryImpact: 'minimal' | 'low' | 'moderate' | 'high';
}

// Calendar Privacy Error Prevention
export enum CalendarPrivacyError {
  PHI_EXPOSURE_PREVENTED = 'PHI_EXPOSURE_PREVENTED',
  PERMISSION_DENIED_GRACEFUL = 'PERMISSION_DENIED_GRACEFUL',
  PRIVACY_VIOLATION_BLOCKED = 'PRIVACY_VIOLATION_BLOCKED',
  CROSS_APP_LEAK_PREVENTED = 'CROSS_APP_LEAK_PREVENTED',
  CLINICAL_DATA_SANITIZED = 'CLINICAL_DATA_SANITIZED',
  UNAUTHORIZED_ACCESS_BLOCKED = 'UNAUTHORIZED_ACCESS_BLOCKED'
}

// Clinical-Safe Calendar Error
export interface CalendarClinicalSafetyError extends Error {
  readonly errorType: CalendarPrivacyError;
  readonly privacyImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  readonly therapeuticContinuity: boolean; // Can therapy continue without calendar?
  readonly fallbackAvailable: boolean; // Alternative reminder method available?
  readonly userNotificationRequired: boolean;
  readonly privacyAuditRequired: boolean;
}

// Calendar Event Templates (Pre-approved therapeutic language)
export interface CalendarEventTemplate {
  readonly id: string;
  readonly name: string;
  readonly title: PrivacySafeCalendarEvent['title'];
  readonly description: string; // Pre-approved therapeutic language
  readonly defaultDuration: number; // Minutes
  readonly category: 'check_in' | 'breathing' | 'reflection' | 'crisis_recovery';
  readonly privacyLevel: CalendarPrivacyLevel;
  readonly therapeuticValue: 'low' | 'medium' | 'high';
  readonly userCustomizable: boolean;
}

// Calendar Reminder Configuration
export interface CalendarReminderConfig {
  readonly enabled: boolean;
  readonly methods: readonly Array<'notification' | 'calendar_alert' | 'email' | 'none'>;
  readonly timingOptions: readonly {
    readonly minutesBefore: number; // 5, 15, 30, 60, etc.
    readonly label: string; // "5 minutes before", etc.
    readonly enabled: boolean;
  }[];
  readonly customMessage: string | null; // Optional user-customized reminder text (PHI-safe)
  readonly respectQuietHours: boolean;
  readonly quietHours: {
    readonly startHour: number; // 22 (10 PM)
    readonly endHour: number; // 7 (7 AM)
    readonly enabled: boolean;
  };
}

// Calendar Sync Configuration
export interface CalendarSyncConfig {
  readonly syncEnabled: boolean;
  readonly syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
  readonly bidirectionalSync: boolean; // Allow external calendar changes to affect FullMind
  readonly conflictResolution: 'fullmind_priority' | 'calendar_priority' | 'user_choice';
  readonly syncScope: {
    readonly pastDays: number; // How many days back to sync
    readonly futureDays: number; // How many days forward to sync
  };
  readonly dataRetention: {
    readonly keepDeletedEvents: boolean;
    readonly retentionDays: number; // Days to keep deleted event history
  };
}

// Calendar Integration Service Interface
export interface CalendarIntegrationService {
  // Permission Management
  readonly checkPermissions: () => Promise<CalendarPermissionManager>;
  readonly requestPermissions: (
    degradationStrategy?: 'graceful' | 'strict'
  ) => Promise<CalendarPermissionResult>;
  
  // Event Management (Privacy-Safe)
  readonly createPrivacySafeEvent: (
    template: CalendarEventTemplate,
    customization?: Partial<PrivacySafeCalendarEvent>
  ) => Promise<CalendarOperationResult>;
  
  readonly updateEvent: (
    eventId: string,
    updates: Partial<PrivacySafeCalendarEvent>
  ) => Promise<CalendarOperationResult>;
  
  readonly deleteEvent: (eventId: string) => Promise<CalendarOperationResult>;
  
  // Bulk Operations
  readonly createRecurringEvents: (
    template: CalendarEventTemplate,
    recurrencePattern: RecurrencePattern,
    endDate: Date
  ) => Promise<CalendarBulkOperationResult>;
  
  // User Preferences
  readonly updateUserPreferences: (
    preferences: Partial<CalendarUserPreferences>
  ) => Promise<void>;
  
  readonly getUserPreferences: () => Promise<CalendarUserPreferences>;
  
  // Health and Status
  readonly getIntegrationStatus: () => Promise<CalendarIntegrationStatus>;
  readonly performHealthCheck: () => Promise<CalendarHealthResult>;
  
  // Privacy and Security
  readonly validatePrivacyCompliance: (
    event: PrivacySafeCalendarEvent
  ) => Promise<PrivacyValidationResult>;
  
  readonly auditCalendarAccess: () => Promise<CalendarAccessAudit>;
}

// Supporting Types for Service Interface
export interface CalendarPermissionResult {
  readonly granted: boolean;
  readonly permissions: CalendarPermissionManager;
  readonly degradationApplied: boolean;
  readonly fallbackMethod: string | null;
  readonly userNotificationShown: boolean;
}

export interface CalendarOperationResult {
  readonly success: boolean;
  readonly eventId: string | null;
  readonly error: CalendarClinicalSafetyError | null;
  readonly privacyValidationPassed: boolean;
  readonly fallbackUsed: boolean;
}

export interface CalendarBulkOperationResult {
  readonly totalEvents: number;
  readonly createdEvents: number;
  readonly failedEvents: number;
  readonly errors: readonly CalendarClinicalSafetyError[];
  readonly partialSuccess: boolean;
}

export interface RecurrencePattern {
  readonly frequency: 'daily' | 'weekly' | 'monthly';
  readonly interval: number; // Every N days/weeks/months
  readonly daysOfWeek?: readonly Array<0 | 1 | 2 | 3 | 4 | 5 | 6>; // Sunday = 0
  readonly endDate: Date;
  readonly maxOccurrences?: number; // Alternative to endDate
}

export interface CalendarHealthResult {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly issues: readonly {
    readonly type: 'permission' | 'sync' | 'performance' | 'privacy';
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly description: string;
    readonly resolution: string;
  }[];
  readonly performanceMetrics: CalendarPerformanceMetrics;
}

export interface PrivacyValidationResult {
  readonly passed: boolean;
  readonly violations: readonly {
    readonly type: CalendarPrivacyError;
    readonly field: string;
    readonly description: string;
    readonly severity: 'warning' | 'error' | 'critical';
  }[];
  readonly sanitizedEvent?: PrivacySafeCalendarEvent; // Cleaned version if violations found
}

export interface CalendarAccessAudit {
  readonly auditTimestamp: string;
  readonly accessLogs: readonly {
    readonly timestamp: string;
    readonly operation: 'read' | 'write' | 'delete' | 'sync';
    readonly success: boolean;
    readonly privacyCompliant: boolean;
    readonly userInitiated: boolean;
  }[];
  readonly privacyScore: number; // 0-100, higher is better
  readonly recommendations: readonly string[];
}

// Type Guards for Runtime Validation
export const isPrivacySafeCalendarEvent = (event: unknown): event is PrivacySafeCalendarEvent => {
  if (typeof event !== 'object' || event === null) return false;
  
  const e = event as any;
  const allowedTitles = ['FullMind Practice', 'Mindfulness Session', 'Wellness Check-in', 'Self-Care Time'];
  
  return (
    allowedTitles.includes(e.title) &&
    typeof e.description === 'string' &&
    e.description.length <= 50 &&
    e.startDate instanceof Date &&
    e.endDate instanceof Date &&
    e.containsNoPHI === true &&
    e.isGenericOnly === true &&
    e.clinicalDataExcluded === true
  );
};

export const isCalendarUserPreferences = (prefs: unknown): prefs is CalendarUserPreferences => {
  if (typeof prefs !== 'object' || prefs === null) return false;
  
  const p = prefs as any;
  const validIntegrationLevels = ['disabled', 'minimal', 'standard', 'full'];
  const validPrivacyLevels = ['maximum', 'balanced', 'minimal'];
  
  return (
    validIntegrationLevels.includes(p.integrationLevel) &&
    typeof p.respectCrisisBoundaries === 'boolean' &&
    validPrivacyLevels.includes(p.privacyLevel) &&
    typeof p.therapeuticTiming === 'object' &&
    typeof p.featureControls === 'object' &&
    typeof p.crisisSettings === 'object' &&
    typeof p.accessibility === 'object'
  );
};

// Calendar Constants
export const CALENDAR_CONSTANTS = {
  PRIVACY: {
    MAX_DESCRIPTION_LENGTH: 50,
    ALLOWED_TITLES: ['FullMind Practice', 'Mindfulness Session', 'Wellness Check-in', 'Self-Care Time'] as const,
    PHI_SCAN_PATTERNS: [
      /\b(phq-?9|gad-?7)\b/i,
      /\bscore\b/i,
      /\b(depression|anxiety|suicidal)\b/i,
      /\b\d{1,2}\/\d{1,2}\b/, // Date patterns that might reveal assessment timing
    ],
  },
  PERMISSIONS: {
    REQUEST_TIMEOUT_MS: 10000,
    DEGRADATION_DELAY_MS: 3000, // Wait before applying fallback
    RETRY_ATTEMPTS: 3,
  },
  PERFORMANCE: {
    MAX_EVENT_CREATION_MS: 1000,
    MAX_SYNC_LATENCY_MS: 5000,
    ACCEPTABLE_FAILURE_RATE: 0.05, // 5%
    BATCH_SIZE: 25, // Events per batch operation
  },
  TIMING: {
    DEFAULT_MORNING_START: { hour: 6, minute: 0 },
    DEFAULT_MORNING_END: { hour: 10, minute: 0 },
    DEFAULT_MIDDAY_START: { hour: 11, minute: 0 },
    DEFAULT_MIDDAY_END: { hour: 15, minute: 0 },
    DEFAULT_EVENING_START: { hour: 18, minute: 0 },
    DEFAULT_EVENING_END: { hour: 22, minute: 0 },
    DEFAULT_SESSION_DURATION_MINUTES: 15,
  },
  CRISIS: {
    AUTO_PAUSE_HOURS: 24, // Pause reminders after crisis for 24 hours
    RECOVERY_GRACE_PERIOD_HOURS: 48, // Gentle reminders during recovery
  }
} as const;

// Export utility types
export type CalendarPlatform = keyof CalendarPermissionManager;
export type CalendarOperationType = 'read' | 'write' | 'delete' | 'sync';
export type CalendarHealthStatus = CalendarHealthResult['status'];

// Template Types for Pre-built Calendar Events
export const CALENDAR_EVENT_TEMPLATES: readonly CalendarEventTemplate[] = [
  {
    id: 'morning_checkin',
    name: 'Morning Check-in',
    title: 'FullMind Practice',
    description: 'Start your day with mindful awareness',
    defaultDuration: 10,
    category: 'check_in',
    privacyLevel: 'balanced',
    therapeuticValue: 'high',
    userCustomizable: true,
  },
  {
    id: 'midday_breathing',
    name: 'Midday Breathing Space',
    title: 'Mindfulness Session',
    description: 'Three-minute breathing space',
    defaultDuration: 5,
    category: 'breathing',
    privacyLevel: 'minimal',
    therapeuticValue: 'high',
    userCustomizable: false,
  },
  {
    id: 'evening_reflection',
    name: 'Evening Reflection',
    title: 'Wellness Check-in',
    description: 'Reflect on your day with compassion',
    defaultDuration: 15,
    category: 'reflection',
    privacyLevel: 'balanced',
    therapeuticValue: 'medium',
    userCustomizable: true,
  },
  {
    id: 'crisis_recovery',
    name: 'Gentle Recovery Time',
    title: 'Self-Care Time',
    description: 'Gentle self-care and recovery',
    defaultDuration: 30,
    category: 'crisis_recovery',
    privacyLevel: 'maximum',
    therapeuticValue: 'high',
    userCustomizable: false,
  },
] as const;