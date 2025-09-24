/**
 * Being. Website - Accessibility Type Definitions
 * Comprehensive types for WCAG AA compliance and mental health accessibility
 */

// ============================================================================
// WCAG COMPLIANCE TYPES
// ============================================================================

export type WCAGLevel = 'A' | 'AA' | 'AAA';

export interface WCAGCompliance {
  readonly level: WCAGLevel;
  readonly criteria: {
    readonly perceivable: boolean;
    readonly operable: boolean;
    readonly understandable: boolean;
    readonly robust: boolean;
  };
  readonly lastAudited: Date;
  readonly auditedBy: string;
}

export interface AccessibilityFeature {
  readonly id: string;
  readonly name: string;
  readonly wcagCriteria: string; // e.g., "1.4.3", "2.1.1"
  readonly level: WCAGLevel;
  readonly implemented: boolean;
  readonly tested: boolean;
  readonly description: string;
  readonly testProcedure?: string;
}

// ============================================================================
// SCREEN READER & ASSISTIVE TECHNOLOGY TYPES
// ============================================================================

export interface AriaAttributes {
  readonly 'aria-label'?: string;
  readonly 'aria-labelledby'?: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-expanded'?: boolean;
  readonly 'aria-hidden'?: boolean;
  readonly 'aria-live'?: 'off' | 'polite' | 'assertive';
  readonly 'aria-atomic'?: boolean;
  readonly 'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  readonly 'aria-busy'?: boolean;
  readonly 'aria-disabled'?: boolean;
  readonly 'aria-invalid'?: boolean | 'grammar' | 'spelling';
  readonly role?: string;
}

export interface ScreenReaderContent {
  readonly visualText: string;
  readonly screenReaderText: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly context?: string;
}

// ============================================================================
// KEYBOARD NAVIGATION TYPES
// ============================================================================

export interface KeyboardNavigation {
  readonly focusable: boolean;
  readonly tabIndex?: number;
  readonly focusOrder?: number;
  readonly keyHandlers?: {
    readonly Enter?: () => void;
    readonly Space?: () => void;
    readonly Escape?: () => void;
    readonly ArrowUp?: () => void;
    readonly ArrowDown?: () => void;
    readonly ArrowLeft?: () => void;
    readonly ArrowRight?: () => void;
  };
}

export interface FocusManagement {
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly skipLinks?: boolean;
  readonly focusOnMount?: boolean;
  readonly returnFocusTo?: string; // Element ID
}

// ============================================================================
// VISUAL & COGNITIVE ACCESSIBILITY TYPES
// ============================================================================

export interface ColorAccessibility {
  readonly foreground: string;
  readonly background: string;
  readonly contrastRatio: number;
  readonly wcagAACompliant: boolean;
  readonly wcagAAACompliant: boolean;
}

export interface MotionPreferences {
  readonly respectsReducedMotion: boolean;
  readonly hasAlternativeStaticVersion: boolean;
  readonly animationDuration?: number;
  readonly animationType?: 'fade' | 'slide' | 'scale' | 'none';
}

export interface CognitiveAccessibility {
  readonly readingLevel: number; // Grade level
  readonly useSimpleLanguage: boolean;
  readonly providesContextualHelp: boolean;
  readonly allowsTimeExtension: boolean;
  readonly hasErrorPrevention: boolean;
  readonly hasProgressIndicators: boolean;
}

// ============================================================================
// MENTAL HEALTH SPECIFIC ACCESSIBILITY TYPES
// ============================================================================

export interface CrisisAccessibility {
  readonly accessTimeLimit: number; // Max seconds to access crisis resources
  readonly keyboardShortcuts: {
    readonly crisisHelp: string; // e.g., "Alt+C"
    readonly emergency: string; // e.g., "Alt+E"
  };
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly simplifiedInterface: boolean;
}

export interface TherapeuticAccessibility {
  readonly traumaInformed: boolean;
  readonly anxietyFriendly: boolean;
  readonly depressionAccessible: boolean;
  readonly cognitiveLoadManagement: boolean;
  readonly emotionalSafetyFeatures: {
    readonly contentWarnings: boolean;
    readonly pauseCapability: boolean;
    readonly exitStrategy: boolean;
    readonly safeSpaceDesign: boolean;
  };
}

export interface AssessmentAccessibility {
  readonly allowsReview: boolean;
  readonly providesProgress: boolean;
  readonly hasTimeExtensions: boolean;
  readonly supportsBreaks: boolean;
  readonly offersAlternativeFormats: boolean;
  readonly validationIsHelpful: boolean; // Not punitive
}

// ============================================================================
// TESTING & AUDIT TYPES
// ============================================================================

export interface AccessibilityTest {
  readonly id: string;
  readonly name: string;
  readonly type: 'automated' | 'manual' | 'user-testing';
  readonly wcagCriteria: string;
  readonly component?: string;
  readonly passed: boolean;
  readonly issues?: AccessibilityIssue[];
  readonly runDate: Date;
  readonly runBy: string;
}

export interface AccessibilityIssue {
  readonly id: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly wcagCriteria: string;
  readonly description: string;
  readonly element?: string;
  readonly selector?: string;
  readonly recommendation: string;
  readonly fixComplexity: 'trivial' | 'easy' | 'moderate' | 'complex';
}

export interface AccessibilityAudit {
  readonly id: string;
  readonly scope: 'component' | 'page' | 'site' | 'flow';
  readonly target: string; // Component name, page path, etc.
  readonly auditDate: Date;
  readonly auditor: string;
  readonly toolsUsed: string[];
  readonly wcagLevel: WCAGLevel;
  readonly overallScore: number; // 0-100
  readonly tests: AccessibilityTest[];
  readonly criticalIssues: number;
  readonly highIssues: number;
  readonly mediumIssues: number;
  readonly lowIssues: number;
  readonly recommendations: string[];
  readonly nextAuditDate?: Date;
}

// ============================================================================
// COMPONENT ACCESSIBILITY PROPS
// ============================================================================

export interface AccessibleComponentProps extends AriaAttributes {
  readonly accessibilityLabel?: string;
  readonly accessibilityHint?: string;
  readonly accessibilityRole?: string;
  readonly accessibilityState?: {
    readonly disabled?: boolean;
    readonly selected?: boolean;
    readonly checked?: boolean;
    readonly expanded?: boolean;
  };
  readonly focusable?: boolean;
  readonly keyboardNavigation?: KeyboardNavigation;
  readonly screenReaderOptimized?: boolean;
}

export interface FormAccessibilityProps extends AccessibleComponentProps {
  readonly required?: boolean;
  readonly invalid?: boolean;
  readonly errorMessage?: string;
  readonly helpText?: string;
  readonly autocomplete?: string;
  readonly inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

// ============================================================================
// ACCESSIBILITY CONTEXT TYPES
// ============================================================================

export interface AccessibilityPreferences {
  readonly reduceMotion: boolean;
  readonly highContrast: boolean;
  readonly largeText: boolean;
  readonly screenReaderMode: boolean;
  readonly keyboardOnlyMode: boolean;
  readonly focusIndicatorEnhanced: boolean;
  readonly simplifiedInterface: boolean;
  readonly audioDescriptions: boolean;
}

export interface AccessibilityContext {
  readonly preferences: AccessibilityPreferences;
  readonly capabilities: {
    readonly supportsAriaLive: boolean;
    readonly supportsAriaExpanded: boolean;
    readonly hasScreenReader: boolean;
    readonly hasKeyboardNavigation: boolean;
  };
  readonly updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void;
  readonly announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type AccessibilityCompliant<T> = T & {
  readonly __accessibilityCompliant: WCAGLevel;
  readonly __mentalHealthSafe: boolean;
};

export type CrisisAccessible<T> = T & {
  readonly __crisisAccessible: true;
  readonly __maxAccessTime: number; // seconds
};

// Branded types for enhanced type safety
export type AccessibilityId = string & { readonly __brand: 'AccessibilityId' };
export type WCAGCriteria = string & { readonly __brand: 'WCAGCriteria' }; // e.g., "1.4.3"
export type AriaLabel = string & { readonly __brand: 'AriaLabel' };
export type ScreenReaderText = string & { readonly __brand: 'ScreenReaderText' };

// ============================================================================
// CONSTANTS FOR ACCESSIBILITY COMPLIANCE
// ============================================================================

export const ACCESSIBILITY_CONSTANTS = {
  // WCAG contrast ratios
  CONTRAST_AA_NORMAL: 4.5,
  CONTRAST_AA_LARGE: 3.0,
  CONTRAST_AAA_NORMAL: 7.0,
  CONTRAST_AAA_LARGE: 4.5,
  
  // Touch targets (minimum sizes)
  MIN_TOUCH_TARGET: 44, // pixels
  PREFERRED_TOUCH_TARGET: 48, // pixels
  MIN_TOUCH_SPACING: 8, // pixels between targets
  
  // Timing limits
  MAX_CRISIS_ACCESS_TIME: 3, // seconds
  MIN_AUTO_REFRESH_INTERVAL: 20, // seconds
  SESSION_WARNING_TIME: 120, // seconds before timeout
  
  // Focus management
  FOCUS_RING_WIDTH: 2, // pixels
  FOCUS_OFFSET: 2, // pixels
  
  // Animation limits
  MAX_FLASH_RATE: 3, // flashes per second
  REDUCED_MOTION_DURATION: 0.01, // seconds (effectively instant)
  
  // Text and reading
  MAX_LINE_LENGTH: 80, // characters
  MIN_LINE_HEIGHT: 1.5, // ratio
  PREFERRED_READING_LEVEL: 8, // grade level
  
} as const;

export const MENTAL_HEALTH_ACCESSIBILITY = {
  // Crisis access requirements
  CRISIS_BUTTON_SIZE: 60, // pixels (larger than standard)
  CRISIS_CONTRAST_RATIO: 7.0, // AAA level for critical elements
  MAX_CRISIS_STEPS: 2, // Maximum steps to reach help
  
  // Anxiety-friendly design
  GENTLE_ANIMATION_DURATION: 300, // milliseconds
  CALM_COLOR_SATURATION: 0.6, // Maximum saturation for calming effect
  
  // Depression-accessible features
  HIGH_CONTRAST_MODE_THRESHOLD: 1.5, // Brightness adjustment factor
  LARGE_TEXT_SCALE: 1.25, // Scale factor for large text mode
  
  // Cognitive accessibility
  MAX_COGNITIVE_LOAD_ITEMS: 7, // Miller's magic number
  DECISION_TIMEOUT_WARNING: 300, // seconds before warning about inactivity
  
} as const;

// ============================================================================
// ARIA ROLES AND PATTERNS
// ============================================================================

export const ARIA_ROLES = {
  // Landmark roles
  MAIN: 'main',
  NAVIGATION: 'navigation',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  COMPLEMENTARY: 'complementary',
  SEARCH: 'search',
  REGION: 'region',
  
  // Widget roles
  BUTTON: 'button',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SLIDER: 'slider',
  TEXTBOX: 'textbox',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
  
  // Composite roles
  TABLIST: 'tablist',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  
  // Document roles
  ARTICLE: 'article',
  DOCUMENT: 'document',
  PRESENTATION: 'presentation',
  
  // Live region roles
  ALERT: 'alert',
  LOG: 'log',
  STATUS: 'status',
} as const;

export const ARIA_PROPERTIES = {
  // Widget properties
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  EXPANDED: 'aria-expanded',
  HIDDEN: 'aria-hidden',
  INVALID: 'aria-invalid',
  PRESSED: 'aria-pressed',
  SELECTED: 'aria-selected',
  
  // Live region properties
  ATOMIC: 'aria-atomic',
  BUSY: 'aria-busy',
  LIVE: 'aria-live',
  RELEVANT: 'aria-relevant',
  
  // Relationship properties
  ACTIVEDESCENDANT: 'aria-activedescendant',
  CONTROLS: 'aria-controls',
  DESCRIBEDBY: 'aria-describedby',
  LABELLEDBY: 'aria-labelledby',
  OWNS: 'aria-owns',
  
  // Global properties
  LABEL: 'aria-label',
} as const;