/**
 * CORE ONBOARDING TYPE DEFINITIONS - DRD-001 FOUNDATION
 * Phase 1.3: TypeScript Agent - Core Type Definitions Only
 *
 * VALIDATED BY DOMAIN AGENTS:
 * - Clinician: Clinical content specification with PHQ-9/GAD-7 exact wording ✅
 * - Crisis: Crisis safety matrix - existing infrastructure production-ready ✅
 * - Compliance: Regulatory matrix - robust HIPAA/encryption infrastructure ready ✅
 *
 * TYPE DEFINITIONS ONLY - NO IMPLEMENTATION
 * Ready for React component implementation in Phase 2
 */

// =============================================================================
// CORE ONBOARDING STATE TYPES
// =============================================================================

/**
 * Onboarding Screen Flow Enumeration
 * Defines the 7-screen onboarding journey
 */
export enum OnboardingScreen {
  WELCOME = 'welcome',
  PHQ9 = 'phq9',
  GAD7 = 'gad7',
  VALUES = 'values',
  NOTIFICATIONS = 'notifications',
  PRIVACY = 'privacy',
  CELEBRATION = 'celebration'
}

/**
 * Onboarding State Interface
 * Complete state management for onboarding flow
 */
export interface OnboardingState {
  /** Current screen in the onboarding flow */
  currentScreen: OnboardingScreen;

  /** Overall progress percentage (0-100) */
  progressPercentage: number;

  /** Screen completion status */
  completedScreens: Set<OnboardingScreen>;

  /** Assessment responses */
  phq9Responses?: PHQ9OnboardingResponse;
  gad7Responses?: GAD7OnboardingResponse;

  /** Selected therapeutic values */
  selectedValues?: ValuesSelection;

  /** Notification preferences */
  notificationSettings?: NotificationPreferences;

  /** Privacy and consent status */
  consentStatus?: OnboardingConsentStatus;

  /** Flow timing data */
  startedAt: number;
  lastUpdatedAt: number;
  completedAt?: number;

  /** Crisis detection during onboarding */
  crisisDetected?: CrisisDetectionResult;

  /** Onboarding completion status */
  isComplete: boolean;
}

/**
 * Onboarding Component Props Interface
 * Standard props for all onboarding components
 */
export interface OnboardingProps {
  /** Current onboarding state */
  state: OnboardingState;

  /** Screen navigation handlers */
  onNext: () => void;
  onBack: () => void;
  onSkip?: () => void;

  /** Emergency crisis button handler */
  onCrisisButtonPress: () => void;

  /** Theme context for styling */
  theme?: OnboardingTheme;

  /** Performance constraints */
  performanceConstraints?: {
    maxRenderTimeMs: number;
    enableOptimizations: boolean;
  };
}

// =============================================================================
// PHQ-9/GAD-7 RESPONSE INTERFACES
// =============================================================================

/**
 * Assessment Response Type (from existing ExercisesScreen.simple.tsx)
 * 0-3 scale exactly matching clinical validation
 */
export type AssessmentResponse = 0 | 1 | 2 | 3;

/**
 * Individual Answer Interface
 * Matches existing Answer interface pattern
 */
export interface OnboardingAnswer {
  questionId: string;
  response: AssessmentResponse;
  timestamp: number;
}

/**
 * PHQ-9 Response Interface for Onboarding
 * Integrates with existing PHQ9Result pattern
 */
export interface PHQ9OnboardingResponse {
  /** All 9 responses */
  answers: OnboardingAnswer[];

  /** Calculated total score (0-27) */
  totalScore: number;

  /** Clinical severity level */
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';

  /** Crisis threshold detection (≥20) */
  isCrisis: boolean;

  /** Suicidal ideation detection (Q9 > 0) */
  suicidalIdeation: boolean;

  /** Completion timestamp */
  completedAt: number;

  /** Assessment context */
  context: 'onboarding';
}

/**
 * GAD-7 Response Interface for Onboarding
 * Integrates with existing GAD7Result pattern
 */
export interface GAD7OnboardingResponse {
  /** All 7 responses */
  answers: OnboardingAnswer[];

  /** Calculated total score (0-21) */
  totalScore: number;

  /** Clinical severity level */
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';

  /** Crisis threshold detection (≥15) */
  isCrisis: boolean;

  /** Completion timestamp */
  completedAt: number;

  /** Assessment context */
  context: 'onboarding';
}

/**
 * Assessment Completion Interface
 * Combined assessment results for onboarding
 */
export interface OnboardingAssessmentResults {
  phq9?: PHQ9OnboardingResponse;
  gad7?: GAD7OnboardingResponse;
  overallCrisisDetected: boolean;
  completionTimeMs: number;
}

// =============================================================================
// CRISIS DETECTION TYPE DEFINITIONS
// =============================================================================

/**
 * Crisis Risk Level Enumeration
 * Integrates with existing crisis infrastructure
 */
export enum CrisisRisk {
  NONE = 'none',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Crisis Threshold Interface
 * Validates PHQ≥20, GAD≥15, Q9≥1 logic
 */
export interface CrisisThreshold {
  /** PHQ-9 score threshold (≥20) */
  phq9ScoreThreshold: 20;

  /** GAD-7 score threshold (≥15) */
  gad7ScoreThreshold: 15;

  /** PHQ-9 Question 9 suicidal ideation threshold (≥1) */
  phq9SuicidalThreshold: 1;
}

/**
 * Crisis Alert Interface
 * Emergency response definition
 */
export interface CrisisAlert {
  /** Alert trigger type */
  triggerType: 'phq9_score' | 'phq9_suicidal' | 'gad7_score';

  /** Threshold value that triggered alert */
  triggerValue: number;

  /** Risk assessment level */
  riskLevel: CrisisRisk;

  /** Emergency response required */
  requiresImmediateIntervention: boolean;

  /** Crisis detection timestamp */
  detectedAt: number;

  /** Associated assessment data */
  assessmentContext: {
    assessmentType: 'phq9' | 'gad7';
    score: number;
    answers: OnboardingAnswer[];
  };
}

/**
 * Crisis Detection Result
 * Complete crisis state management
 */
export interface CrisisDetectionResult {
  /** Crisis alert if detected */
  alert?: CrisisAlert;

  /** Overall crisis status */
  crisisDetected: boolean;

  /** Crisis response initiated */
  responseInitiated: boolean;

  /** Response time constraint (<200ms) */
  responseTimeMs: number;

  /** 988 contact information presented */
  emergencyResourcesPresented: boolean;
}

// =============================================================================
// VALUES SELECTION AND NOTIFICATION TYPES
// =============================================================================

/**
 * Therapeutic Value Enumeration
 * 15 core MBCT-aligned values for selection
 */
export enum TherapeuticValue {
  COMPASSION = 'compassion',
  GROWTH = 'growth',
  CONNECTION = 'connection',
  MINDFULNESS = 'mindfulness',
  ACCEPTANCE = 'acceptance',
  PRESENCE = 'presence',
  KINDNESS = 'kindness',
  RESILIENCE = 'resilience',
  AUTHENTICITY = 'authenticity',
  PEACE = 'peace',
  GRATITUDE = 'gratitude',
  WISDOM = 'wisdom',
  COURAGE = 'courage',
  BALANCE = 'balance',
  UNDERSTANDING = 'understanding'
}

/**
 * Values Selection Interface
 * 3-5 value selection constraint
 */
export interface ValuesSelection {
  /** Selected values (3-5 required) */
  selectedValues: TherapeuticValue[];

  /** Selection validation */
  isValidSelection: boolean;

  /** Selection timestamp */
  selectedAt: number;

  /** User reflection on values (optional) */
  reflection?: string;
}

/**
 * Notification Time Interface
 * Morning/midday/evening therapeutic timing
 */
export interface NotificationTime {
  /** Time in 24-hour format (e.g., "09:00") */
  time: string;

  /** Time period category */
  period: 'morning' | 'midday' | 'evening';

  /** Enabled status */
  enabled: boolean;

  /** Therapeutic messaging alignment */
  therapeuticContext: TherapeuticValue[];
}

/**
 * Notification Preferences Interface
 * Complete notification configuration
 */
export interface NotificationPreferences {
  /** Check-in reminder times */
  checkInReminders: NotificationTime[];

  /** Exercise/breathing reminders */
  exerciseReminders: NotificationTime[];

  /** Overall notification consent */
  notificationsEnabled: boolean;

  /** Therapeutic timing optimization */
  optimizeForTherapeuticTiming: boolean;

  /** Preferences set timestamp */
  configuredAt: number;
}

// =============================================================================
// ONBOARDING FLOW NAVIGATION TYPES
// =============================================================================

/**
 * Onboarding Navigation Props
 * Navigation component integration
 */
export interface OnboardingNavigationProps {
  /** Current screen */
  currentScreen: OnboardingScreen;

  /** Available navigation actions */
  canGoBack: boolean;
  canGoNext: boolean;
  canSkip: boolean;

  /** Navigation handlers */
  onNavigateToScreen: (screen: OnboardingScreen) => void;
  onNavigateNext: () => void;
  onNavigateBack: () => void;
  onSkipScreen: () => void;

  /** Progress tracking */
  completionPercentage: number;

  /** Crisis button always available */
  onCrisisAccess: () => void;
}

/**
 * Screen Transition Event
 * Navigation event tracking
 */
export interface ScreenTransitionEvent {
  /** Source screen */
  fromScreen: OnboardingScreen;

  /** Destination screen */
  toScreen: OnboardingScreen;

  /** Transition trigger */
  trigger: 'next' | 'back' | 'skip' | 'direct';

  /** Transition timestamp */
  timestamp: number;

  /** Screen completion status */
  sourceScreenCompleted: boolean;
}

/**
 * Onboarding Completion Event
 * Final completion tracking
 */
export interface OnboardingCompletionEvent {
  /** Total completion time */
  totalTimeMs: number;

  /** Screens completed */
  completedScreens: OnboardingScreen[];

  /** Skipped screens */
  skippedScreens: OnboardingScreen[];

  /** Assessment results */
  assessmentResults: OnboardingAssessmentResults;

  /** Crisis detected during flow */
  crisisDetected: boolean;

  /** Values selected */
  valuesSelected: TherapeuticValue[];

  /** Notification preferences set */
  notificationConfigured: boolean;

  /** Consent provided */
  consentProvided: boolean;

  /** Completion timestamp */
  completedAt: number;
}

/**
 * App Navigation Integration
 * Integration with existing navigation system
 */
export interface OnboardingAppNavigationIntegration {
  /** Post-onboarding destination */
  nextDestination: 'main_app' | 'crisis_intervention';

  /** Navigation parameters to pass */
  navigationParams?: Record<string, any>;

  /** User profile initialization data */
  profileInitializationData: {
    assessmentResults: OnboardingAssessmentResults;
    therapeuticValues: TherapeuticValue[];
    notificationPreferences: NotificationPreferences;
    consentStatus: OnboardingConsentStatus;
  };
}

// =============================================================================
// PRIVACY AND CONSENT TYPES
// =============================================================================

/**
 * Consent Type Enumeration
 * HIPAA, data collection, privacy policy
 */
export enum ConsentType {
  HIPAA_CONSENT = 'hipaa_consent',
  DATA_COLLECTION = 'data_collection',
  PRIVACY_POLICY = 'privacy_policy',
  THERAPEUTIC_CONTACT = 'therapeutic_contact',
  CRISIS_INTERVENTION = 'crisis_intervention',
  RESEARCH_PARTICIPATION = 'research_participation'
}

/**
 * Individual Consent State
 * Tracking for each consent type
 */
export interface ConsentState {
  /** Consent type */
  type: ConsentType;

  /** Consent provided */
  granted: boolean;

  /** Consent timestamp */
  grantedAt?: number;

  /** Consent withdrawal timestamp */
  withdrawnAt?: number;

  /** Consent version/revision */
  version: string;

  /** Required for app function */
  required: boolean;
}

/**
 * Onboarding Consent Status
 * Complete consent tracking
 */
export interface OnboardingConsentStatus {
  /** Individual consent states */
  consents: ConsentState[];

  /** All required consents provided */
  allRequiredConsentsGranted: boolean;

  /** HIPAA compliance status */
  hipaaCompliant: boolean;

  /** Data processing consent */
  dataProcessingConsent: boolean;

  /** Crisis intervention consent */
  crisisInterventionConsent: boolean;

  /** Consent completion timestamp */
  completedAt?: number;
}

/**
 * Privacy Settings Interface
 * User privacy preferences
 */
export interface PrivacySettings {
  /** Data sharing preferences */
  dataSharing: {
    therapeuticInsights: boolean;
    anonymizedResearch: boolean;
    performanceAnalytics: boolean;
  };

  /** Communication preferences */
  communication: {
    therapeuticReminders: boolean;
    crisisFollowUp: boolean;
    systemUpdates: boolean;
  };

  /** Data retention preferences */
  dataRetention: {
    automaticDeletion: boolean;
    retentionPeriodDays: number;
  };

  /** Privacy settings timestamp */
  configuredAt: number;
}

/**
 * Consent Validation Interface
 * HIPAA compliance validation
 */
export interface ConsentValidation {
  /** Validation timestamp */
  validatedAt: number;

  /** Validation result */
  isValid: boolean;

  /** HIPAA compliance check */
  hipaaCompliant: boolean;

  /** Missing consents */
  missingRequiredConsents: ConsentType[];

  /** Validation errors */
  validationErrors: string[];

  /** Remediation steps */
  remediationRequired: string[];
}

// =============================================================================
// ONBOARDING THEME AND STYLING TYPES
// =============================================================================

/**
 * Onboarding Theme Context
 * Therapeutic color and styling themes
 */
export interface OnboardingTheme {
  /** Theme identifier */
  name: 'morning' | 'midday' | 'evening' | 'neutral' | 'crisis';

  /** Primary color scheme */
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    accent: string;
    warning: string;
    error: string;
  };

  /** Typography scale */
  typography: {
    title: object;
    subtitle: object;
    body: object;
    caption: object;
  };

  /** Spacing system */
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  /** Crisis-specific styling */
  crisisContext?: {
    emergencyColors: object;
    alertStyling: object;
    accessibilityEnhancements: object;
  };
}

// =============================================================================
// TYPE INTEGRATION WITH EXISTING SYSTEMS
// =============================================================================

/**
 * Integration with existing Assessment types
 * Ensures compatibility with ExercisesScreen.simple.tsx patterns
 */
export interface OnboardingAssessmentIntegration {
  /** Existing AssessmentType compatibility */
  assessmentType: 'phq9' | 'gad7';

  /** Existing AssessmentResponse compatibility */
  responseScale: [0, 1, 2, 3];

  /** Existing response labels */
  responseLabels: {
    0: "Not at all";
    1: "Several days";
    2: "More than half the days";
    3: "Nearly every day";
  };

  /** Crisis threshold compatibility */
  crisisThresholds: {
    PHQ9_CRISIS_SCORE: 20;
    GAD7_CRISIS_SCORE: 15;
    PHQ9_SUICIDAL_QUESTION_ID: 'phq9_9';
  };
}

/**
 * Integration with existing Crisis infrastructure
 * Leverages production-ready crisis safety matrix
 */
export interface OnboardingCrisisIntegration {
  /** Crisis detection compatibility */
  crisisDetectionEnabled: true;

  /** Emergency response (<200ms constraint) */
  emergencyResponseTimeMs: number;

  /** 988 crisis line integration */
  crisisLineIntegration: {
    phoneNumber: '988';
    textLine: '741741';
    emergencyNumber: '911';
  };

  /** Crisis button accessibility */
  crisisButtonAlwaysAccessible: true;
}

/**
 * Integration with existing HIPAA/Compliance infrastructure
 * Leverages robust encryption and consent systems
 */
export interface OnboardingComplianceIntegration {
  /** HIPAA compliance enabled */
  hipaaComplianceEnabled: true;

  /** Encryption integration */
  encryptionRequired: true;

  /** Audit logging enabled */
  auditLoggingEnabled: true;

  /** Data classification */
  dataClassification: 'PHI' | 'sensitive' | 'general';

  /** Consent management integration */
  consentManagementEnabled: true;
}

// =============================================================================
// PERFORMANCE AND OPTIMIZATION TYPES
// =============================================================================

/**
 * Onboarding Performance Constraints
 * Performance requirements for onboarding flow
 */
export interface OnboardingPerformanceConstraints {
  /** Screen transition time (<500ms) */
  maxScreenTransitionMs: 500;

  /** Assessment response time (<300ms) */
  maxAssessmentResponseMs: 300;

  /** Crisis detection time (<200ms) */
  maxCrisisDetectionMs: 200;

  /** Overall onboarding completion (<10min) */
  maxOnboardingDurationMs: 600000;

  /** Memory usage constraints */
  maxMemoryUsageMB: 100;

  /** Network constraints */
  maxNetworkRequestsPerScreen: 3;
}

/**
 * Onboarding Optimization Settings
 * Performance optimization configuration
 */
export interface OnboardingOptimizationSettings {
  /** Enable lazy loading */
  lazyLoadingEnabled: boolean;

  /** Preload next screen */
  preloadNextScreen: boolean;

  /** Cache assessment responses */
  cacheResponses: boolean;

  /** Optimize animations */
  optimizeAnimations: boolean;

  /** Reduce bundle size */
  minimizeBundle: boolean;
}

// =============================================================================
// EXPORTS AND TYPE GUARDS
// =============================================================================

/**
 * Type guard functions for runtime validation
 */
export const OnboardingTypeGuards = {
  isOnboardingScreen: (value: any): value is OnboardingScreen => {
    return Object.values(OnboardingScreen).includes(value);
  },

  isAssessmentResponse: (value: any): value is AssessmentResponse => {
    return typeof value === 'number' && [0, 1, 2, 3].includes(value);
  },

  isTherapeuticValue: (value: any): value is TherapeuticValue => {
    return Object.values(TherapeuticValue).includes(value);
  },

  isCrisisRisk: (value: any): value is CrisisRisk => {
    return Object.values(CrisisRisk).includes(value);
  },

  isConsentType: (value: any): value is ConsentType => {
    return Object.values(ConsentType).includes(value);
  },

  isValidValuesSelection: (selection: ValuesSelection): boolean => {
    return selection.selectedValues.length >= 3 &&
           selection.selectedValues.length <= 5 &&
           selection.isValidSelection;
  },

  isOnboardingComplete: (state: OnboardingState): boolean => {
    return state.isComplete &&
           state.completedScreens.size === Object.keys(OnboardingScreen).length &&
           !!state.phq9Responses &&
           !!state.gad7Responses &&
           !!state.selectedValues &&
           !!state.notificationSettings &&
           !!state.consentStatus?.allRequiredConsentsGranted;
  }
} as const;

/**
 * Default values for type initialization
 */
export const OnboardingDefaults = {
  INITIAL_STATE: {
    currentScreen: OnboardingScreen.WELCOME,
    progressPercentage: 0,
    completedScreens: new Set<OnboardingScreen>(),
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    isComplete: false
  } as Partial<OnboardingState>,

  PERFORMANCE_CONSTRAINTS: {
    maxScreenTransitionMs: 500,
    maxAssessmentResponseMs: 300,
    maxCrisisDetectionMs: 200,
    maxOnboardingDurationMs: 600000,
    maxMemoryUsageMB: 100,
    maxNetworkRequestsPerScreen: 3
  } as OnboardingPerformanceConstraints,

  CRISIS_THRESHOLDS: {
    phq9ScoreThreshold: 20,
    gad7ScoreThreshold: 15,
    phq9SuicidalThreshold: 1
  } as CrisisThreshold
} as const;

/**
 * Main export - Complete onboarding type system
 * Ready for React component implementation in Phase 2
 */
export default {
  // Core types
  OnboardingScreen,
  CrisisRisk,
  TherapeuticValue,
  ConsentType,

  // Type guards
  TypeGuards: OnboardingTypeGuards,

  // Defaults
  Defaults: OnboardingDefaults,

  // Integration points
  Integration: {
    Assessment: {} as OnboardingAssessmentIntegration,
    Crisis: {} as OnboardingCrisisIntegration,
    Compliance: {} as OnboardingComplianceIntegration
  }
} as const;