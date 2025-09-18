/**
 * Being. Haptic Accessibility Type Definitions
 * Comprehensive types for haptic feedback with WCAG AA compliance and mental health safety
 */

import type { 
  AccessibilityPreferences, 
  AccessibilityContext,
  WCAGLevel,
  CrisisAccessibility,
  TherapeuticAccessibility 
} from './accessibility';

// ============================================================================
// HAPTIC FEEDBACK ACCESSIBILITY TYPES
// ============================================================================

export interface HapticAccessibilityPreferences extends AccessibilityPreferences {
  readonly hapticEnabled: boolean;
  readonly hapticIntensity: 'light' | 'medium' | 'strong' | 'custom';
  readonly hapticPatterns: 'standard' | 'therapeutic' | 'crisis' | 'simplified';
  readonly bodyConsentGiven: boolean; // Trauma-informed consent
  readonly hapticAlternatives: boolean; // Always provide non-haptic alternatives
  readonly emergencyHapticOverride: boolean; // Allow crisis haptics even if disabled
}

export interface HapticAccessibilityCapabilities {
  readonly supportsHaptics: boolean;
  readonly supportsVariableIntensity: boolean;
  readonly supportsPatternComplexity: boolean;
  readonly hasBatteryOptimization: boolean;
  readonly respectsSystemSettings: boolean;
}

// ============================================================================
// THERAPEUTIC HAPTIC PATTERNS
// ============================================================================

export interface TherapeuticHapticPattern {
  readonly id: string;
  readonly name: string;
  readonly mbctPurpose: 'breathing-guide' | 'grounding' | 'focus-anchor' | 'mindful-attention';
  readonly pattern: HapticEvent[];
  readonly duration: number; // milliseconds
  readonly intensity: number; // 0-1 scale
  readonly accessibilityMetadata: {
    readonly description: string;
    readonly screenReaderAnnouncement: string;
    readonly visualAlternative: string;
    readonly audioAlternative?: string;
  };
  readonly traumaInformed: boolean;
  readonly anxietyFriendly: boolean;
}

export interface HapticEvent {
  readonly type: 'tap' | 'buzz' | 'pulse' | 'rhythm';
  readonly delay: number; // milliseconds from pattern start
  readonly duration: number; // milliseconds
  readonly intensity: number; // 0-1 scale
  readonly location?: 'device' | 'wearable' | 'controller'; // Future-proofing
}

// ============================================================================
// CRISIS HAPTIC ACCESSIBILITY
// ============================================================================

export interface CrisisHapticAccessibility extends CrisisAccessibility {
  readonly emergencyHapticPatterns: {
    readonly crisisAlert: TherapeuticHapticPattern;
    readonly safetyConfirmation: TherapeuticHapticPattern;
    readonly groundingSequence: TherapeuticHapticPattern;
  };
  readonly overrideUserPreferences: boolean; // For safety-critical situations
  readonly batteryReserveMode: boolean; // Conserve battery during crisis
}

// ============================================================================
// MBCT BREATHING HAPTIC PATTERNS
// ============================================================================

export interface MBCTBreathingHaptics {
  readonly breathingRhythm: '4-4-6' | '4-7-8' | '6-2-6' | 'custom';
  readonly phases: {
    readonly inhale: TherapeuticHapticPattern;
    readonly hold: TherapeuticHapticPattern;
    readonly exhale: TherapeuticHapticPattern;
    readonly pause: TherapeuticHapticPattern;
  };
  readonly sessionDuration: number; // seconds (180 for 3-minute MBCT standard)
  readonly adaptiveIntensity: boolean; // Adjust based on user stress response
}

// ============================================================================
// ACCESSIBILITY VALIDATION TYPES
// ============================================================================

export interface HapticAccessibilityTest {
  readonly testId: string;
  readonly wcagCriteria: string; // e.g., "1.4.2" (Audio Control), "2.1.1" (Keyboard)
  readonly hapticComponent: string;
  readonly testType: 'consent' | 'alternative-access' | 'intensity' | 'timing' | 'crisis-safety';
  readonly passed: boolean;
  readonly accessibilityIssues: string[];
  readonly recommendations: string[];
  readonly mentalHealthSafetyValidated: boolean;
}

export interface HapticAccessibilityAudit {
  readonly auditId: string;
  readonly scope: 'haptic-system' | 'therapeutic-patterns' | 'crisis-haptics' | 'user-preferences';
  readonly wcagLevel: WCAGLevel;
  readonly mentalHealthAccessibilityScore: number; // 0-100
  readonly traumaInformedCompliance: boolean;
  readonly tests: HapticAccessibilityTest[];
  readonly overallRecommendations: string[];
}

// ============================================================================
// HAPTIC COMPONENT ACCESSIBILITY PROPS
// ============================================================================

export interface HapticAccessibleProps {
  readonly hapticPattern?: TherapeuticHapticPattern;
  readonly hapticIntensity?: number;
  readonly hapticEnabled?: boolean;
  readonly requiresBodyConsent?: boolean;
  readonly traumaInformed?: boolean;
  readonly providesAlternatives: {
    readonly visual: string | React.ComponentType;
    readonly audio?: string | React.ComponentType;
    readonly textual: string;
  };
  readonly emergencyOverride?: boolean; // For crisis components
  readonly onHapticConsent?: (granted: boolean) => void;
  readonly onHapticStart?: () => void;
  readonly onHapticComplete?: () => void;
  readonly ariaHapticDescription: string;
}

// ============================================================================
// ACCESSIBILITY CONSTANTS FOR HAPTICS
// ============================================================================

export const HAPTIC_ACCESSIBILITY_CONSTANTS = {
  // Intensity levels (0-1 scale)
  MIN_INTENSITY: 0.1, // Barely perceptible
  MAX_INTENSITY: 1.0, // Full device capability
  DEFAULT_INTENSITY: 0.6, // Comfortable for most users
  CRISIS_INTENSITY: 0.8, // Strong enough to get attention during crisis
  
  // Timing constraints for accessibility
  MIN_HAPTIC_DURATION: 50, // milliseconds - minimum perceptible
  MAX_HAPTIC_DURATION: 2000, // milliseconds - avoid fatigue
  MIN_PATTERN_INTERVAL: 100, // milliseconds between events
  
  // MBCT-specific timing
  BREATHING_INHALE_DURATION: 4000, // 4 seconds
  BREATHING_HOLD_DURATION: 4000, // 4 seconds  
  BREATHING_EXHALE_DURATION: 6000, // 6 seconds
  BREATHING_TOTAL_CYCLE: 14000, // 14 seconds per cycle
  
  // Battery optimization
  MAX_CONTINUOUS_HAPTIC_TIME: 180000, // 3 minutes (MBCT session)
  BATTERY_SAVE_INTENSITY_REDUCTION: 0.3, // 30% reduction in low battery
  
  // Accessibility requirements
  CONSENT_TIMEOUT: 30000, // 30 seconds to provide haptic consent
  ALTERNATIVE_DISPLAY_TIMEOUT: 1000, // Always show alternatives within 1s
  
} as const;

export const THERAPEUTIC_HAPTIC_PATTERNS = {
  // Grounding patterns for anxiety/depression
  GROUNDING_SEQUENCE: {
    id: 'mbct-grounding',
    name: 'MBCT Grounding Sequence',
    mbctPurpose: 'grounding',
    duration: 10000, // 10 seconds
    traumaInformed: true,
    anxietyFriendly: true,
  },
  
  // Breathing guidance patterns
  BREATHING_INHALE: {
    id: 'mbct-inhale',
    name: 'Mindful Inhale Guide',
    mbctPurpose: 'breathing-guide',
    duration: 4000, // 4 seconds
    traumaInformed: true,
    anxietyFriendly: true,
  },
  
  // Crisis intervention patterns
  CRISIS_SAFETY_CHECK: {
    id: 'crisis-safety',
    name: 'Crisis Safety Confirmation',
    mbctPurpose: 'focus-anchor',
    duration: 1000, // 1 second
    traumaInformed: false, // Crisis patterns may override trauma preferences
    anxietyFriendly: false, // Crisis patterns prioritize attention over comfort
  },
  
  // Mindful attention patterns
  ATTENTION_ANCHOR: {
    id: 'mbct-attention',
    name: 'Present Moment Anchor',
    mbctPurpose: 'mindful-attention',
    duration: 2000, // 2 seconds
    traumaInformed: true,
    anxietyFriendly: true,
  },
  
} as const;

// ============================================================================
// HAPTIC ACCESSIBILITY CONTEXT EXTENSION
// ============================================================================

export interface HapticAccessibilityContext extends AccessibilityContext {
  readonly hapticPreferences: HapticAccessibilityPreferences;
  readonly hapticCapabilities: HapticAccessibilityCapabilities;
  readonly updateHapticPreferences: (prefs: Partial<HapticAccessibilityPreferences>) => void;
  readonly requestHapticConsent: (purpose: string) => Promise<boolean>;
  readonly playAccessibleHaptic: (pattern: TherapeuticHapticPattern) => Promise<void>;
  readonly announceHapticToScreenReader: (pattern: TherapeuticHapticPattern) => void;
  readonly validateHapticAccessibility: (component: string) => HapticAccessibilityTest[];
}

// ============================================================================
// UTILITY TYPES FOR TYPE SAFETY
// ============================================================================

export type HapticAccessibilityCompliant<T> = T & {
  readonly __hapticAccessibilityCompliant: WCAGLevel;
  readonly __traumaInformedHaptics: boolean;
  readonly __providesHapticAlternatives: boolean;
  readonly __respectsBodyConsent: boolean;
};

export type CrisisHapticCompliant<T> = T & HapticAccessibilityCompliant<T> & {
  readonly __crisisHapticSafe: true;
  readonly __emergencyOverrideCapable: boolean;
};

// Branded types for enhanced haptic type safety
export type HapticPatternId = string & { readonly __brand: 'HapticPatternId' };
export type HapticIntensity = number & { readonly __brand: 'HapticIntensity' }; // 0-1 scale
export type HapticDuration = number & { readonly __brand: 'HapticDuration' }; // milliseconds
export type BodyConsentToken = string & { readonly __brand: 'BodyConsentToken' };

// ============================================================================
// EXPORT VALIDATION INTERFACE
// ============================================================================

export interface HapticAccessibilityValidationResult {
  readonly wcagAACompliant: boolean;
  readonly mentalHealthSafe: boolean;
  readonly traumaInformed: boolean;
  readonly crisisSafe: boolean;
  readonly alternativesProvided: boolean;
  readonly consentRespected: boolean;
  readonly batteryOptimized: boolean;
  readonly performanceOptimized: boolean;
  readonly score: number; // 0-100
  readonly criticalIssues: string[];
  readonly recommendations: string[];
  readonly nextAuditDate?: Date;
}