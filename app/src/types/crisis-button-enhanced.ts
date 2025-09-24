/**
 * Enhanced CrisisButton TypeScript Definitions
 *
 * Comprehensive type safety enhancements for the CrisisButton component
 * with crisis-optimized interfaces and performance monitoring.
 *
 * CRITICAL: These types ensure 100% type safety for crisis-critical operations
 */

import type { ViewStyle, AccessibilityRole } from 'react-native';
import type { ComponentVariant } from './ui';

// === BRANDED TYPES FOR CRISIS SAFETY ===

/**
 * Branded type for crisis phone numbers with validation
 */
export type CrisisPhoneNumber = string & { readonly __brand: 'CrisisPhoneNumber' };

/**
 * Branded type for response times with performance guarantees
 */
export type ResponseTimeMs = number & { readonly __brand: 'ResponseTimeMs' };

/**
 * Branded type for urgency levels with clinical validation
 */
export type CrisisUrgencyLevel = ('standard' | 'high' | 'emergency') & { readonly __brand: 'CrisisUrgency' };

// === ENHANCED CRISIS BUTTON PROPS ===

/**
 * Enhanced CrisisButton Props with Comprehensive Type Safety
 */
export interface EnhancedCrisisButtonProps {
  // Core variant and styling
  readonly variant?: 'floating' | 'header' | 'embedded';
  readonly style?: ViewStyle | ViewStyle[] | ((state: { pressed: boolean }) => ViewStyle | ViewStyle[]);

  // Enhanced accessibility props for crisis situations
  readonly highContrastMode?: boolean;
  readonly largeTargetMode?: boolean;
  readonly voiceCommandEnabled?: boolean;
  readonly urgencyLevel?: CrisisUrgencyLevel;

  // Crisis-specific callbacks with enhanced typing
  readonly onCrisisStart?: (context: CrisisCallContext) => void | Promise<void>;
  readonly onCrisisComplete?: (result: CrisisCallResult) => void;
  readonly onCrisisError?: (error: CrisisError) => void;

  // NEW ARCHITECTURE ENHANCEMENT: Crisis-optimized interaction features
  readonly crisisOptimizedRipple?: boolean;
  readonly enhancedHaptics?: boolean;
  readonly safetyMonitoring?: boolean;

  // Performance and monitoring configuration
  readonly performanceConfig?: CrisisPerformanceConfig;
  readonly monitoringCallbacks?: CrisisMonitoringCallbacks;

  // Accessibility overrides for crisis scenarios
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: AccessibilityRole;

  // Testing and debugging
  readonly testID?: string;
  readonly debugMode?: boolean;
}

// === CRISIS-SPECIFIC TYPE DEFINITIONS ===

/**
 * Crisis Call Context with Comprehensive Metadata
 */
export interface CrisisCallContext {
  readonly timestamp: Date;
  readonly urgencyLevel: CrisisUrgencyLevel;
  readonly variant: 'floating' | 'header' | 'embedded';
  readonly userAgent: string;
  readonly platform: 'ios' | 'android';
  readonly accessibilityEnabled: boolean;
  readonly performanceMetrics: CrisisPerformanceSnapshot;
}

/**
 * Crisis Call Result with Success/Failure Tracking
 */
export interface CrisisCallResult {
  readonly success: boolean;
  readonly responseTime: ResponseTimeMs;
  readonly callInitiated: boolean;
  readonly fallbackUsed: boolean;
  readonly accessibilityAnnounced: boolean;
  readonly hapticFeedbackDelivered: boolean;
  readonly performanceCompliant: boolean;
  readonly error?: CrisisError;
}

/**
 * Enhanced Crisis Error Types with Recovery Strategies
 */
export interface CrisisError extends Error {
  readonly code: CrisisErrorCode;
  readonly severity: 'warning' | 'critical' | 'emergency';
  readonly fallbackMessage: string;
  readonly recoveryStrategy: CrisisRecoveryStrategy;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly timestamp: Date;
  readonly context: CrisisCallContext;
}

/**
 * Crisis Error Codes with Specific Failure Types
 */
export type CrisisErrorCode =
  | 'CALL_FAILED'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'PLATFORM_UNSUPPORTED'
  | 'ACCESSIBILITY_FAILURE'
  | 'PERFORMANCE_VIOLATION'
  | 'HAPTIC_FAILURE'
  | 'UNKNOWN_ERROR';

/**
 * Crisis Recovery Strategies for Error Handling
 */
export type CrisisRecoveryStrategy =
  | 'retry_immediately'
  | 'fallback_to_manual'
  | 'show_emergency_info'
  | 'escalate_to_alternative'
  | 'announce_instructions'
  | 'no_recovery_available';

// === PERFORMANCE AND MONITORING TYPES ===

/**
 * Crisis Performance Configuration with Therapeutic Requirements
 */
export interface CrisisPerformanceConfig {
  readonly maxResponseTime: ResponseTimeMs;
  readonly hapticLatencyMax: number;
  readonly accessibilityDelayMax: number;
  readonly animationFrameTarget: 60;
  readonly memoryUsageMax: number;
  readonly enableProfiling: boolean;
  readonly performanceAlerts: boolean;
}

/**
 * Crisis Performance Snapshot for Real-Time Monitoring
 */
export interface CrisisPerformanceSnapshot {
  readonly captureTime: Date;
  readonly responseTime: ResponseTimeMs;
  readonly renderTime: number;
  readonly hapticLatency: number;
  readonly accessibilityDelay: number;
  readonly memoryUsage: number;
  readonly frameDrops: number;
  readonly complianceStatus: PerformanceComplianceStatus;
}

/**
 * Performance Compliance Status with Therapeutic Validation
 */
export interface PerformanceComplianceStatus {
  readonly overall: 'compliant' | 'warning' | 'violation';
  readonly responseTimeCompliant: boolean;
  readonly renderTimeCompliant: boolean;
  readonly hapticCompliant: boolean;
  readonly accessibilityCompliant: boolean;
  readonly memoryCompliant: boolean;
  readonly frameRateCompliant: boolean;
  readonly violations: PerformanceViolation[];
}

/**
 * Performance Violation Details for Debugging
 */
export interface PerformanceViolation {
  readonly metric: string;
  readonly measuredValue: number;
  readonly requiredValue: number;
  readonly severity: 'minor' | 'major' | 'critical';
  readonly clinicalImpact: string;
  readonly recommendation: string;
}

/**
 * Crisis Monitoring Callbacks for Real-Time Tracking
 */
export interface CrisisMonitoringCallbacks {
  readonly onPerformanceViolation?: (violation: PerformanceViolation) => void;
  readonly onResponseTimeExceeded?: (responseTime: ResponseTimeMs) => void;
  readonly onAccessibilityIssue?: (issue: AccessibilityIssue) => void;
  readonly onHapticFailure?: (error: Error) => void;
  readonly onRenderingIssue?: (frameDrops: number) => void;
}

/**
 * Accessibility Issue Tracking for Crisis Scenarios
 */
export interface AccessibilityIssue {
  readonly type: 'screen_reader' | 'contrast' | 'touch_target' | 'timing' | 'motion';
  readonly description: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly userImpact: string;
  readonly recommendation: string;
  readonly automatedFix: boolean;
}

// === RESPONSE TIME MONITORING TYPES ===

/**
 * Enhanced Response Time Monitor with Type Safety
 */
export interface CrisisResponseTimeMonitor {
  readonly startTime: number;
  readonly recordStart: () => void;
  readonly measureResponse: () => ResponseTimeMs;
  readonly validateCompliance: () => boolean;
  readonly getPerformanceReport: () => CrisisPerformanceSnapshot;
  readonly reset: () => void;
}

/**
 * Crisis Button State with Enhanced Tracking
 */
export interface CrisisButtonState {
  readonly isLoading: boolean;
  readonly isReduceMotionEnabled: boolean;
  readonly isScreenReaderEnabled: boolean;
  readonly isHighContrastEnabled: boolean;
  readonly performanceMonitor: CrisisResponseTimeMonitor | null;
  readonly lastCallResult: CrisisCallResult | null;
  readonly complianceStatus: PerformanceComplianceStatus;
}

// === UTILITY TYPES AND FUNCTIONS ===

/**
 * Crisis Configuration Factory with Type Validation
 */
export type CrisisConfigFactory<T extends 'floating' | 'header' | 'embedded'> = {
  readonly variant: T;
  readonly urgencyLevel: CrisisUrgencyLevel;
  readonly performanceRequirements: T extends 'floating'
    ? { maxResponseTime: 200 }
    : T extends 'header'
    ? { maxResponseTime: 250 }
    : { maxResponseTime: 300 };
  readonly accessibilityRequirements: {
    readonly screenReaderSupport: true;
    readonly highContrastSupport: boolean;
    readonly hapticFeedback: boolean;
  };
};

/**
 * Type guard for crisis urgency level validation
 */
export function isCrisisUrgencyLevel(value: unknown): value is CrisisUrgencyLevel {
  return typeof value === 'string' &&
         ['standard', 'high', 'emergency'].includes(value);
}

/**
 * Type guard for crisis phone number validation
 */
export function isCrisisPhoneNumber(value: unknown): value is CrisisPhoneNumber {
  return typeof value === 'string' &&
         /^\d{3}$/.test(value); // 988 format
}

/**
 * Type guard for response time validation
 */
export function isValidResponseTime(value: unknown): value is ResponseTimeMs {
  return typeof value === 'number' &&
         value >= 0 &&
         value <= 1000; // Maximum 1 second
}

/**
 * Factory function for creating crisis phone numbers
 */
export function createCrisisPhoneNumber(phone: string): CrisisPhoneNumber {
  if (!isCrisisPhoneNumber(phone)) {
    throw new Error(`Invalid crisis phone number: ${phone}. Must be 3-digit format (e.g., 988)`);
  }
  return phone as CrisisPhoneNumber;
}

/**
 * Factory function for creating response time measurements
 */
export function createResponseTime(ms: number): ResponseTimeMs {
  if (!isValidResponseTime(ms)) {
    throw new Error(`Invalid response time: ${ms}ms. Must be between 0-1000ms`);
  }
  return ms as ResponseTimeMs;
}

/**
 * Factory function for creating crisis urgency levels
 */
export function createCrisisUrgencyLevel(level: string): CrisisUrgencyLevel {
  if (!isCrisisUrgencyLevel(level)) {
    throw new Error(`Invalid crisis urgency level: ${level}. Must be 'standard', 'high', or 'emergency'`);
  }
  return level as CrisisUrgencyLevel;
}

// === PERFORMANCE VALIDATION FUNCTIONS ===

/**
 * Validate crisis performance configuration
 */
export function validateCrisisPerformanceConfig(config: CrisisPerformanceConfig): boolean {
  return config.maxResponseTime <= 200 &&
         config.hapticLatencyMax <= 50 &&
         config.accessibilityDelayMax <= 100 &&
         config.animationFrameTarget >= 60 &&
         config.memoryUsageMax > 0;
}

/**
 * Create default crisis performance configuration
 */
export function createDefaultCrisisPerformanceConfig(): CrisisPerformanceConfig {
  return {
    maxResponseTime: createResponseTime(200),
    hapticLatencyMax: 50,
    accessibilityDelayMax: 100,
    animationFrameTarget: 60,
    memoryUsageMax: 100, // MB
    enableProfiling: true,
    performanceAlerts: true,
  };
}

/**
 * Create crisis monitoring callbacks with type safety
 */
export function createCrisisMonitoringCallbacks(
  options: Partial<CrisisMonitoringCallbacks> = {}
): CrisisMonitoringCallbacks {
  return {
    onPerformanceViolation: options.onPerformanceViolation || (() => {}),
    onResponseTimeExceeded: options.onResponseTimeExceeded || (() => {}),
    onAccessibilityIssue: options.onAccessibilityIssue || (() => {}),
    onHapticFailure: options.onHapticFailure || (() => {}),
    onRenderingIssue: options.onRenderingIssue || (() => {}),
  };
}

// === CONSTANTS ===

/**
 * Crisis Button Type Safety Constants
 */
export const CRISIS_BUTTON_CONSTANTS = {
  PHONE_NUMBERS: {
    CRISIS_HOTLINE: createCrisisPhoneNumber('988'),
    EMERGENCY: createCrisisPhoneNumber('911'),
  },
  PERFORMANCE: {
    MAX_RESPONSE_TIME: createResponseTime(200),
    MAX_HAPTIC_LATENCY: 50,
    MAX_ACCESSIBILITY_DELAY: 100,
    TARGET_FRAME_RATE: 60,
    MAX_MEMORY_USAGE: 100, // MB
  },
  URGENCY_LEVELS: {
    STANDARD: createCrisisUrgencyLevel('standard'),
    HIGH: createCrisisUrgencyLevel('high'),
    EMERGENCY: createCrisisUrgencyLevel('emergency'),
  },
  ACCESSIBILITY: {
    MIN_TOUCH_TARGET: 44, // WCAG AA
    CRISIS_TOUCH_TARGET: 52, // Enhanced for crisis
    MIN_CONTRAST_RATIO: 4.5, // WCAG AA
    CRISIS_CONTRAST_RATIO: 7.0, // Enhanced for crisis
  },
} as const;

// === TYPE EXPORTS ===

export type {
  EnhancedCrisisButtonProps,
  CrisisCallContext,
  CrisisCallResult,
  CrisisError,
  CrisisErrorCode,
  CrisisRecoveryStrategy,
  CrisisPerformanceConfig,
  CrisisPerformanceSnapshot,
  PerformanceComplianceStatus,
  PerformanceViolation,
  CrisisMonitoringCallbacks,
  AccessibilityIssue,
  CrisisResponseTimeMonitor,
  CrisisButtonState,
  CrisisConfigFactory,
};