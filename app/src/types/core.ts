/**
 * Core TypeScript Types - Enhanced Strict Type Safety
 *
 * Foundation types for the Being. MBCT app with strict mode compliance
 * and comprehensive type safety for clinical data and crisis intervention.
 *
 * CRITICAL: 100% type safety required for clinical operations
 */

// === UTILITY TYPES ===

/**
 * Branded type for compile-time safety
 */
type Brand<K, T> = K & { readonly __brand: T };

/**
 * Makes all properties deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Makes specified keys required while keeping others optional
 */
export type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Makes specified keys optional while keeping others required
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract non-nullable types
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Strict object type that prevents additional properties
 */
export type Exact<T, U extends T = T> = T & {
  readonly [K in Exclude<keyof U, keyof T>]: never;
};

/**
 * Type-safe picker that preserves exact property types
 */
export type StrictPick<T, K extends keyof T> = {
  readonly [P in K]: T[P];
};

/**
 * Type-safe omit that preserves remaining property types
 */
export type StrictOmit<T, K extends keyof T> = {
  readonly [P in Exclude<keyof T, K>]: T[P];
};

/**
 * Conditional type for safe parsing
 */
export type SafeParse<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: readonly ValidationError[] };

// === CORE BRANDED TYPES ===

/**
 * User identifier type
 */
export type UserID = Brand<string, 'UserID'>;

/**
 * Device identifier type
 */
export type DeviceID = Brand<string, 'DeviceID'>;

/**
 * Session identifier type
 */
export type SessionID = Brand<string, 'SessionID'>;

/**
 * ISO 8601 date string type
 */
export type ISODateString = Brand<string, 'ISODate'>;

/**
 * Unix timestamp in milliseconds
 */
export type UnixTimestamp = Brand<number, 'UnixTimestamp'>;

/**
 * Encrypted data string
 */
export type EncryptedData = Brand<string, 'EncryptedData'>;

/**
 * URL type with validation
 */
export type ValidURL = Brand<string, 'ValidURL'>;

/**
 * Email type with validation
 */
export type EmailAddress = Brand<string, 'EmailAddress'>;

/**
 * Phone number type with validation
 */
export type PhoneNumber = Brand<string, 'PhoneNumber'>;

/**
 * Percentage value (0-100)
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Duration in milliseconds
 */
export type DurationMs = Brand<number, 'DurationMs'>;

// === CLINICAL SAFETY TYPES ===

/**
 * Clinical data sensitivity levels
 */
export type DataSensitivity =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'critical';

/**
 * HIPAA compliance status
 */
export type HIPAACompliance =
  | 'compliant'
  | 'non_compliant'
  | 'pending_review'
  | 'not_applicable';

/**
 * Crisis severity levels with strict ordering
 */
export type CrisisSeverity =
  | 'none'
  | 'low'
  | 'moderate'
  | 'high'
  | 'critical'
  | 'emergency';

/**
 * Risk assessment levels
 */
export type RiskLevel =
  | 'minimal'
  | 'low'
  | 'moderate'
  | 'high'
  | 'severe'
  | 'critical';

// === VALIDATION TYPES ===

/**
 * Validation error with context
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
  readonly severity: 'warning' | 'error' | 'critical';
  readonly context?: Record<string, unknown>;
}

/**
 * Validation result with detailed information
 */
export interface ValidationResult<T = unknown> {
  readonly isValid: boolean;
  readonly data?: T;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
  readonly metadata?: {
    readonly validatedAt: ISODateString;
    readonly validatorVersion: string;
    readonly validationDuration: DurationMs;
  };
}

/**
 * Type guard function signature
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * Parser function signature
 */
export type Parser<T> = (value: unknown) => SafeParse<T>;

/**
 * Validator function signature
 */
export type Validator<T> = (value: T) => ValidationResult<T>;

// === ASYNC OPERATION TYPES ===

/**
 * Async operation states
 */
export type AsyncState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error'
  | 'cancelled';

/**
 * Result type for async operations
 */
export type AsyncResult<T, E = Error> =
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: E }
  | { readonly status: 'loading' }
  | { readonly status: 'idle' };

/**
 * Promise with timeout and cancellation
 */
export interface CancellablePromise<T> extends Promise<T> {
  readonly cancel: () => void;
  readonly timeout: (ms: DurationMs) => CancellablePromise<T>;
}

// === CONFIGURATION TYPES ===

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Platform types
 */
export type Platform = 'ios' | 'android' | 'web';

/**
 * Device form factors
 */
export type DeviceType = 'phone' | 'tablet' | 'desktop';

/**
 * Network connectivity states
 */
export type NetworkState =
  | 'online'
  | 'offline'
  | 'slow'
  | 'error';

/**
 * Theme modes
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * Language codes (ISO 639-1)
 */
export type LanguageCode = 'en' | 'es' | 'fr' | 'de';

// === PERFORMANCE TYPES ===

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  readonly responseTime: DurationMs;
  readonly memoryUsage: number; // bytes
  readonly cpuUsage: Percentage;
  readonly frameRate: number; // fps
  readonly networkLatency: DurationMs;
  readonly errorRate: Percentage;
}

/**
 * Performance thresholds
 */
export interface PerformanceThresholds {
  readonly maxResponseTime: DurationMs;
  readonly maxMemoryUsage: number; // bytes
  readonly minFrameRate: number; // fps
  readonly maxNetworkLatency: DurationMs;
  readonly maxErrorRate: Percentage;
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  readonly enabled: boolean;
  readonly thresholds: PerformanceThresholds;
  readonly reportingInterval: DurationMs;
  readonly trackingEnabled: {
    readonly responseTime: boolean;
    readonly memoryUsage: boolean;
    readonly frameRate: boolean;
    readonly networkLatency: boolean;
  };
}

// === ERROR HANDLING TYPES ===

/**
 * Base error interface
 */
export interface BaseError {
  readonly name: string;
  readonly message: string;
  readonly code?: string;
  readonly timestamp: UnixTimestamp;
  readonly context?: Record<string, unknown>;
}

/**
 * Clinical error types
 */
export type ClinicalErrorType =
  | 'validation_error'
  | 'calculation_error'
  | 'data_integrity_error'
  | 'security_violation'
  | 'crisis_detection_error';

/**
 * Clinical error with safety context
 */
export interface ClinicalError extends BaseError {
  readonly type: ClinicalErrorType;
  readonly severity: CrisisSeverity;
  readonly requiresImmediateAttention: boolean;
  readonly affectedAssessment?: string;
  readonly userImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error recovery options
 */
export interface ErrorRecovery {
  readonly canRecover: boolean;
  readonly recoveryActions: readonly string[];
  readonly fallbackData?: unknown;
  readonly retryPolicy?: {
    readonly maxRetries: number;
    readonly retryDelay: DurationMs;
    readonly backoffMultiplier: number;
  };
}

// === TYPE GUARDS ===

/**
 * Check if value is a valid UserID
 */
export const isUserID = (value: unknown): value is UserID => {
  return typeof value === 'string' && /^user_[a-zA-Z0-9_-]+$/.test(value);
};

/**
 * Check if value is a valid DeviceID
 */
export const isDeviceID = (value: unknown): value is DeviceID => {
  return typeof value === 'string' && /^device_[a-zA-Z0-9_-]+$/.test(value);
};

/**
 * Check if value is a valid SessionID
 */
export const isSessionID = (value: unknown): value is SessionID => {
  return typeof value === 'string' && /^session_[a-zA-Z0-9_-]+$/.test(value);
};

/**
 * Check if value is a valid ISO date string
 */
export const isISODateString = (value: unknown): value is ISODateString => {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && date.toISOString() === value;
};

/**
 * Check if value is a valid email address
 */
export const isEmailAddress = (value: unknown): value is EmailAddress => {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * Check if value is a valid phone number
 */
export const isPhoneNumber = (value: unknown): value is PhoneNumber => {
  if (typeof value !== 'string') return false;
  // E.164 format validation
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(value);
};

/**
 * Check if value is a valid percentage (0-100)
 */
export const isPercentage = (value: unknown): value is Percentage => {
  return typeof value === 'number' && value >= 0 && value <= 100 && !isNaN(value);
};

// === FACTORY FUNCTIONS ===

/**
 * Create a new UserID
 */
export const createUserID = (prefix = 'user'): UserID => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}` as UserID;
};

/**
 * Create a new DeviceID
 */
export const createDeviceID = (platform: Platform): DeviceID => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `device_${platform}_${timestamp}_${random}` as DeviceID;
};

/**
 * Create a new SessionID
 */
export const createSessionID = (): SessionID => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}` as SessionID;
};

/**
 * Create an ISO date string from a Date object
 */
export const createISODateString = (date?: Date): ISODateString => {
  const d = date || new Date();
  return d.toISOString() as ISODateString;
};

/**
 * Create a Unix timestamp
 */
export const createUnixTimestamp = (date?: Date): UnixTimestamp => {
  const d = date || new Date();
  return d.getTime() as UnixTimestamp;
};

// === CONSTANTS ===

/**
 * Core application constants
 */
export const CORE_CONSTANTS = {
  // Timing constants
  TIMING: {
    SECOND_MS: 1000 as DurationMs,
    MINUTE_MS: 60000 as DurationMs,
    HOUR_MS: 3600000 as DurationMs,
    DAY_MS: 86400000 as DurationMs,
    WEEK_MS: 604800000 as DurationMs,
  },

  // Performance constants
  PERFORMANCE: {
    TARGET_FPS: 60,
    MAX_RESPONSE_TIME_MS: 200 as DurationMs,
    CRISIS_RESPONSE_TIME_MS: 100 as DurationMs,
    MEMORY_WARNING_THRESHOLD_MB: 100,
    MEMORY_CRITICAL_THRESHOLD_MB: 200,
  },

  // Validation constants
  VALIDATION: {
    MAX_STRING_LENGTH: 10000,
    MAX_ARRAY_LENGTH: 1000,
    MAX_OBJECT_DEPTH: 10,
    MAX_NUMBER_VALUE: Number.MAX_SAFE_INTEGER,
    MIN_NUMBER_VALUE: Number.MIN_SAFE_INTEGER,
  },

  // Encryption constants
  ENCRYPTION: {
    AES_KEY_LENGTH: 32,
    IV_LENGTH: 16,
    SALT_LENGTH: 32,
    ITERATION_COUNT: 100000,
  },

  // Clinical constants
  CLINICAL: {
    PHQ9_MAX_SCORE: 27,
    GAD7_MAX_SCORE: 21,
    CRISIS_THRESHOLD_PHQ9: 20,
    CRISIS_THRESHOLD_GAD7: 15,
    EMERGENCY_PHONE: '988' as const,
    TEXT_CRISIS_LINE: '741741' as const,
  },

  // Therapeutic constants
  THERAPEUTIC: {
    BREATHING_DURATION_MS: 60000 as DurationMs,
    BREATHING_STEP_DURATION_MS: 20000 as DurationMs,
    MIN_SESSION_DURATION_MS: 30000 as DurationMs,
    MAX_SESSION_DURATION_MS: 3600000 as DurationMs,
  },
} as const;

/**
 * Type for the constants object
 */
export type CoreConstants = typeof CORE_CONSTANTS;

// === EXPORTS ===

export type {
  Brand,
  DeepReadonly,
  RequireKeys,
  OptionalKeys,
  Exact,
  StrictPick,
  StrictOmit,
  SafeParse,
};