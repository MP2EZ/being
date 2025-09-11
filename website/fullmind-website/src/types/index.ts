/**
 * FullMind Website - Core Type Definitions
 * Clinical-grade TypeScript types for the FullMind ecosystem
 */

// ============================================================================
// CORE WEBSITE TYPES
// ============================================================================

export interface SiteConfig {
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly ogImage: string;
  readonly links: {
    readonly appStore: string;
    readonly playStore: string;
    readonly github: string;
    readonly support: string;
  };
  readonly trial: TrialConfig;
}

// ============================================================================
// TRIAL CONFIGURATION TYPES
// ============================================================================

/**
 * Core trial configuration interface
 * Supports flexible trial durations and comprehensive messaging
 */
export interface TrialConfig {
  readonly duration: TrialDuration;
  readonly messaging: TrialMessaging;
  readonly legal: TrialLegal;
  readonly features: TrialFeatures;
  readonly conversion: TrialConversion;
}

/**
 * Trial duration configuration with validation
 */
export interface TrialDuration {
  readonly days: number;
  readonly displayText: string;
  readonly maxDays?: number;
  readonly minDays?: number;
}

/**
 * Comprehensive trial messaging system
 * Supports A/B testing and contextual messaging
 */
export interface TrialMessaging {
  readonly primary: string;
  readonly secondary: string;
  readonly cta: TrialCTA;
  readonly features: string;
  readonly disclaimer: string;
  readonly benefits: readonly string[];
  readonly urgency?: TrialUrgencyMessaging;
  readonly social?: TrialSocialProof;
}

/**
 * Call-to-action configuration with variants
 */
export interface TrialCTA {
  readonly primary: string;
  readonly secondary?: string;
  readonly variants?: readonly CTAVariant[];
}

/**
 * CTA variant for A/B testing
 */
export interface CTAVariant {
  readonly id: string;
  readonly text: string;
  readonly variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  readonly weight: number; // For A/B testing distribution
  readonly context: 'hero' | 'pricing' | 'mobile' | 'all';
}

/**
 * Urgency messaging for conversion optimization
 */
export interface TrialUrgencyMessaging {
  readonly enabled: boolean;
  readonly message: string;
  readonly threshold?: number; // Show after N seconds/scrolls
  readonly context: readonly ('hero' | 'pricing' | 'exit-intent')[];
}

/**
 * Social proof for trial messaging
 */
export interface TrialSocialProof {
  readonly enabled: boolean;
  readonly userCount: string;
  readonly professionalCount?: string;
  readonly recentSignups?: string;
}

/**
 * Legal and compliance configuration
 */
export interface TrialLegal {
  readonly terms: string;
  readonly cancellation: string;
  readonly requirements: string;
  readonly privacyNotice?: string;
  readonly dataHandling?: string;
  readonly compliance: TrialCompliance;
}

/**
 * Regulatory compliance for healthcare app
 */
export interface TrialCompliance {
  readonly hipaaReady: boolean;
  readonly gdprCompliant: boolean;
  readonly coppaCompliant: boolean;
  readonly calOPPACompliant: boolean;
  readonly clinicalDisclaimer: string;
}

/**
 * Trial feature availability and limitations
 */
export interface TrialFeatures {
  readonly included: readonly TrialFeature[];
  readonly excluded: readonly TrialFeature[];
  readonly limitations: readonly TrialLimitation[];
}

/**
 * Individual trial feature definition
 */
export interface TrialFeature {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly clinicalValue?: string;
  readonly accessLevel: 'full' | 'limited' | 'preview';
}

/**
 * Trial limitations for conversion clarity
 */
export interface TrialLimitation {
  readonly id: string;
  readonly feature: string;
  readonly limitation: string;
  readonly upgradeMessage: string;
}

/**
 * Conversion optimization configuration
 */
export interface TrialConversion {
  readonly tracking: TrialTracking;
  readonly optimization: ConversionOptimization;
  readonly retargeting: TrialRetargeting;
}

/**
 * Trial conversion tracking
 */
export interface TrialTracking {
  readonly events: readonly TrialTrackingEvent[];
  readonly goals: readonly ConversionGoal[];
  readonly attribution: AttributionConfig;
}

/**
 * Individual tracking event
 */
export interface TrialTrackingEvent {
  readonly name: string;
  readonly category: 'trial' | 'conversion' | 'engagement' | 'retention';
  readonly properties: Record<string, string | number | boolean>;
  readonly clinicalImportance: 'critical' | 'important' | 'optional';
}

/**
 * Conversion goal definition
 */
export interface ConversionGoal {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly target: number; // Percentage or count
  readonly timeframe: 'immediate' | 'trial-period' | 'post-trial';
}

/**
 * Attribution configuration
 */
export interface AttributionConfig {
  readonly enabled: boolean;
  readonly models: readonly ('first-click' | 'last-click' | 'time-decay' | 'position-based')[];
  readonly lookbackWindow: number; // days
}

/**
 * Conversion optimization settings
 */
export interface ConversionOptimization {
  readonly abTesting: ABTestingConfig;
  readonly personalization: PersonalizationConfig;
  readonly timing: TimingOptimization;
}

/**
 * A/B testing configuration
 */
export interface ABTestingConfig {
  readonly enabled: boolean;
  readonly tests: readonly ABTest[];
  readonly defaultExperience: 'control' | 'variant';
}

/**
 * Individual A/B test
 */
export interface ABTest {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly variants: readonly ABTestVariant[];
  readonly trafficAllocation: number; // 0-1
  readonly status: 'draft' | 'active' | 'paused' | 'completed';
}

/**
 * A/B test variant
 */
export interface ABTestVariant {
  readonly id: string;
  readonly name: string;
  readonly allocation: number; // 0-1, sum should equal trafficAllocation
  readonly config: Partial<TrialConfig>;
}

/**
 * Personalization configuration
 */
export interface PersonalizationConfig {
  readonly enabled: boolean;
  readonly segments: readonly UserSegment[];
  readonly rules: readonly PersonalizationRule[];
}

/**
 * User segment for personalization
 */
export interface UserSegment {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly criteria: Record<string, unknown>;
  readonly priority: number;
}

/**
 * Personalization rule
 */
export interface PersonalizationRule {
  readonly id: string;
  readonly segment: string;
  readonly config: Partial<TrialConfig>;
  readonly active: boolean;
}

/**
 * Timing optimization for conversion
 */
export interface TimingOptimization {
  readonly delayedOffers: boolean;
  readonly exitIntent: ExitIntentConfig;
  readonly scrollTriggers: ScrollTriggerConfig[];
  readonly timeBasedTriggers: TimeBasedTriggerConfig[];
}

/**
 * Exit intent configuration
 */
export interface ExitIntentConfig {
  readonly enabled: boolean;
  readonly message: string;
  readonly offer: string;
  readonly delay: number; // milliseconds
}

/**
 * Scroll-based trigger
 */
export interface ScrollTriggerConfig {
  readonly id: string;
  readonly threshold: number; // percentage
  readonly message: string;
  readonly action: 'modal' | 'banner' | 'highlight' | 'redirect';
}

/**
 * Time-based trigger
 */
export interface TimeBasedTriggerConfig {
  readonly id: string;
  readonly delay: number; // seconds
  readonly message: string;
  readonly action: 'modal' | 'banner' | 'highlight';
  readonly repeatInterval?: number; // seconds, optional
}

/**
 * Retargeting configuration
 */
export interface TrialRetargeting {
  readonly email: EmailRetargeting;
  readonly ads: AdRetargeting;
  readonly push: PushRetargeting;
}

/**
 * Email retargeting configuration
 */
export interface EmailRetargeting {
  readonly enabled: boolean;
  readonly sequences: readonly EmailSequence[];
  readonly triggers: readonly RetargetingTrigger[];
}

/**
 * Email sequence for retargeting
 */
export interface EmailSequence {
  readonly id: string;
  readonly name: string;
  readonly emails: readonly RetargetingEmail[];
  readonly clinicalApproval: ClinicalApproval;
}

/**
 * Individual retargeting email
 */
export interface RetargetingEmail {
  readonly id: string;
  readonly subject: string;
  readonly delay: number; // days from trigger
  readonly template: string;
  readonly personalized: boolean;
}

/**
 * Clinical approval for therapeutic content
 */
export interface ClinicalApproval {
  readonly approved: boolean;
  readonly approvedBy: string;
  readonly approvedAt: Date;
  readonly mbctCompliant: boolean;
  readonly clinicalReview: boolean;
}

/**
 * Retargeting trigger
 */
export interface RetargetingTrigger {
  readonly id: string;
  readonly name: string;
  readonly condition: 'abandoned-trial' | 'expired-trial' | 'partial-signup' | 'feature-interest';
  readonly delay: number; // hours
  readonly sequence: string; // references EmailSequence.id
}

/**
 * Ad retargeting configuration
 */
export interface AdRetargeting {
  readonly enabled: boolean;
  readonly platforms: readonly ('google' | 'facebook' | 'instagram' | 'youtube')[];
  readonly audiences: readonly AdAudience[];
  readonly campaigns: readonly AdCampaign[];
}

/**
 * Ad audience definition
 */
export interface AdAudience {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly criteria: Record<string, unknown>;
  readonly size: 'small' | 'medium' | 'large';
}

/**
 * Ad campaign configuration
 */
export interface AdCampaign {
  readonly id: string;
  readonly name: string;
  readonly audience: string; // references AdAudience.id
  readonly creative: AdCreative;
  readonly budget: AdBudget;
}

/**
 * Ad creative configuration
 */
export interface AdCreative {
  readonly headline: string;
  readonly description: string;
  readonly image: string;
  readonly cta: string;
  readonly landingPage: string;
}

/**
 * Ad budget configuration
 */
export interface AdBudget {
  readonly daily: number;
  readonly total: number;
  readonly bidStrategy: 'cpc' | 'cpm' | 'cpa' | 'target-roas';
}

/**
 * Push retargeting configuration
 */
export interface PushRetargeting {
  readonly enabled: boolean;
  readonly notifications: readonly PushNotification[];
  readonly triggers: readonly PushTrigger[];
}

/**
 * Push notification definition
 */
export interface PushNotification {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly action: string;
  readonly icon?: string;
  readonly clinicalSafety: boolean;
}

/**
 * Push notification trigger
 */
export interface PushTrigger {
  readonly id: string;
  readonly condition: 'trial-reminder' | 'feature-tip' | 'progress-celebration' | 'crisis-check';
  readonly delay: number; // hours
  readonly notification: string; // references PushNotification.id
  readonly frequency: 'once' | 'daily' | 'weekly';
}

// ============================================================================
// TRIAL CONFIGURATION UTILITY TYPES
// ============================================================================

/**
 * Trial configuration validation result
 */
export interface TrialConfigValidation {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly TrialValidationWarning[];
  readonly clinicalApproval: ClinicalApproval;
}

/**
 * Trial validation warning for trial configuration
 */
export interface TrialValidationWarning {
  readonly field: string;
  readonly message: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly suggestion: string;
}

/**
 * Trial configuration context for components
 */
export interface TrialConfigContext {
  readonly config: TrialConfig;
  readonly variant?: string; // A/B test variant
  readonly personalization?: string; // Personalization segment
  readonly tracking: {
    readonly sessionId: string;
    readonly userId?: string;
    readonly experimentId?: string;
  };
}

/**
 * Component-specific trial props
 */
export interface TrialAwareProps {
  readonly trialConfig: TrialConfigContext;
  readonly onTrialEvent?: (event: TrialTrackingEvent) => void;
  readonly variant?: 'default' | 'urgent' | 'social-proof' | 'minimal';
}

// ============================================================================
// TYPE GUARDS AND VALIDATION FUNCTIONS
// ============================================================================

/**
 * Type guard for valid trial duration
 */
export const isValidTrialDuration = (duration: TrialDuration): boolean => {
  return duration.days > 0 && 
         duration.days <= (duration.maxDays ?? 365) &&
         duration.days >= (duration.minDays ?? 1);
};

/**
 * Type guard for clinical compliance
 */
export const isClinicallyCompliant = (config: TrialConfig): boolean => {
  return config.legal.compliance.hipaaReady &&
         config.legal.compliance.clinicalDisclaimer.length > 0;
};

/**
 * Extract trial duration from configuration
 */
export type ExtractTrialDuration<T extends TrialConfig> = T['duration']['days'];

/**
 * Extract messaging variant from configuration
 */
export type ExtractMessagingVariant<T extends TrialConfig> = T['messaging']['cta']['variants'];

/**
 * Trial configuration with strict validation
 */
export type ValidatedTrialConfig = TrialConfig & {
  readonly __validated: true;
  readonly __clinicalApproval: ClinicalApproval;
};

/**
 * Component props that require trial configuration
 */
export type WithTrialConfig<T = {}> = T & {
  readonly trialConfig: TrialConfigContext;
};

/**
 * Optional trial configuration for components
 */
export type MaybeWithTrialConfig<T = {}> = T & {
  readonly trialConfig?: TrialConfigContext;
};

export interface NavigationItem {
  readonly title: string;
  readonly href: string;
  readonly description?: string;
  readonly external?: boolean;
  readonly disabled?: boolean;
}

// ============================================================================
// CLINICAL & HEALTHCARE TYPES
// ============================================================================

export interface ClinicalFeature {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly clinicalEvidence: string;
  readonly mbctCompliant: boolean;
  readonly accessibilityLevel: 'AA' | 'AAA';
}

export interface TherapeuticContent {
  readonly id: string;
  readonly type: 'assessment' | 'exercise' | 'educational' | 'crisis';
  readonly title: string;
  readonly description: string;
  readonly duration?: number; // in minutes
  readonly clinicalValidation: {
    readonly validated: boolean;
    readonly validatedBy: string;
    readonly validatedAt: Date;
  };
}

export interface CrisisResource {
  readonly id: string;
  readonly type: 'hotline' | 'text' | 'chat' | 'emergency';
  readonly name: string;
  readonly contact: string;
  readonly availability: string;
  readonly region: string;
}

// ============================================================================
// PERFORMANCE & ANALYTICS TYPES
// ============================================================================

export interface PerformanceMetrics {
  readonly lcp: number; // Largest Contentful Paint
  readonly fid: number; // First Input Delay
  readonly cls: number; // Cumulative Layout Shift
  readonly ttfb: number; // Time to First Byte
  readonly fcp: number; // First Contentful Paint
}

export interface AnalyticsEvent {
  readonly name: string;
  readonly category: 'navigation' | 'engagement' | 'conversion' | 'error';
  readonly properties?: Record<string, string | number | boolean>;
  readonly timestamp: Date;
}

// ============================================================================
// ACCESSIBILITY & UX TYPES
// ============================================================================

export interface AccessibilityFeature {
  readonly wcagLevel: 'A' | 'AA' | 'AAA';
  readonly feature: string;
  readonly description: string;
  readonly implementation: string;
  readonly tested: boolean;
}

export interface MotionPreference {
  readonly reduceMotion: boolean;
  readonly respectSystemPreference: boolean;
}

// ============================================================================
// HAPTIC ACCESSIBILITY EXPORTS
// ============================================================================

// Core haptic accessibility types
export * from './accessibility';
export * from './haptic-accessibility';

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface BaseComponentProps {
  readonly className?: string;
  readonly children?: React.ReactNode;
  readonly 'data-testid'?: string;
}

export interface SectionProps extends BaseComponentProps {
  readonly id: string;
  readonly ariaLabel?: string;
  readonly background?: 'default' | 'muted' | 'accent';
}

export interface ButtonProps extends BaseComponentProps {
  readonly variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'clinical';
  readonly size: 'sm' | 'md' | 'lg';
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onClick?: () => void;
  readonly href?: string;
  readonly external?: boolean;
}

// ============================================================================
// FORM & VALIDATION TYPES
// ============================================================================

export interface ContactFormData {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
  readonly userType: 'individual' | 'therapist' | 'organization';
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface FormState<T> {
  readonly data: T;
  readonly errors: ValidationError[];
  readonly isSubmitting: boolean;
  readonly isValid: boolean;
}

// ============================================================================
// THEME & DESIGN SYSTEM TYPES
// ============================================================================

export type ThemeVariant = 'morning' | 'midday' | 'evening';

export interface ThemeConfig {
  readonly variant: ThemeVariant;
  readonly colors: {
    readonly primary: string;
    readonly success: string;
    readonly background: string;
    readonly foreground: string;
    readonly muted: string;
  };
  readonly respectsSystemTheme: boolean;
}

// ============================================================================
// SEO & METADATA TYPES
// ============================================================================

export interface SEOData {
  readonly title: string;
  readonly description: string;
  readonly keywords?: string[];
  readonly ogTitle?: string;
  readonly ogDescription?: string;
  readonly ogImage?: string;
  readonly ogType?: string;
  readonly canonical?: string;
  readonly noindex?: boolean;
}

// ============================================================================
// ERROR & LOADING STATES
// ============================================================================

export interface ErrorState {
  readonly hasError: boolean;
  readonly error?: Error;
  readonly errorCode?: string;
  readonly fallbackMessage: string;
}

export interface LoadingState {
  readonly isLoading: boolean;
  readonly loadingMessage?: string;
  readonly progress?: number; // 0-100
}

// ============================================================================
// API & INTEGRATION TYPES
// ============================================================================

export interface APIResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly code?: string;
  readonly timestamp: Date;
}

export interface HealthCheckResponse {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: Date;
  readonly services: {
    readonly database: 'up' | 'down';
    readonly cache: 'up' | 'down';
    readonly external: 'up' | 'down';
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type StrictOmit<T, K extends keyof T> = Omit<T, K>;

// Brand types for enhanced type safety
export type EmailAddress = string & { readonly __brand: 'EmailAddress' };
export type PhoneNumber = string & { readonly __brand: 'PhoneNumber' };
export type URL = string & { readonly __brand: 'URL' };

// Clinical safety type guards
export type ClinicallyValidated<T> = T & { readonly __clinicallyValidated: true };
export type AccessibilityCompliant<T> = T & { readonly __accessibilityCompliant: 'AA' | 'AAA' };

// ============================================================================
// COMPREHENSIVE TYPE EXPORTS
// ============================================================================

// Core website types (existing)
// Export all types from this file above

// Component system types
export * from './components';

// App integration types (selective exports to avoid conflicts)
export type {
  AppBridgeMessage,
  AppBridgeResponse,
  PlatformDetection,
  DownloadTracking,
  UTMParameters,
  DeepLinkConfig,
  UserProgressSync as AppUserProgressSync,
  OnboardingStatus,
  AssessmentHistory,
  CheckInHistory,
  CrisisProtocolSync,
  TherapistPatientSync,
  CrossPlatformAnalytics,
  WebSocketMessage,
  RealTimeSync,
  OfflineCapabilities,
} from './integration';

export type {
  CheckIn as AppCheckIn,
  Assessment as AppAssessment,
  ResumableSession as AppResumableSession,
  SessionProgress as AppSessionProgress,
  User as AppUser,
  UserPreferences as AppUserPreferences,
  ClinicalProfile as AppClinicalProfile,
  UserProgress,
  ClinicalProgress,
  RiskAssessment as AppRiskAssessment,
  TherapistIntegration,
  SyncStatus,
  ValidationResult as AppValidationResult,
  AppError,
} from './app-bridge';

// Performance & monitoring types
export * from './performance';

// Validation & safety types (selective to avoid conflicts)
export type {
  ValidationSchema,
  ValidationField,
  ValidationResult,
  ValidationError as FormValidationError,
  ValidationWarning,
  ClinicalConcern,
  ValidationMetadata,
  FormValidationConfig,
  FormFieldValidation,
  FormValidationState,
  DataTransformer,
  TransformationPipeline,
  TransformationResult,
  ClinicalValidator,
  ClinicalValidationResult,
  TherapeuticValidationResult,
  AccessibilityValidationResult,
  ParseResult,
  SerializationResult,
  AsyncValidator,
  AsyncValidationQueue,
  // Skip conflicting types: AssessmentScore, ValidationRule
  DeepReadonly,
  DeepPartial,
  RequiredKeys,
  OptionalKeys,
  NonEmptyArray,
  Exact,
  ClinicalData,
  SanitizedInput,
  ValidatedForm,
  IfClinical,
  RequireClinicalValidation,
  ClinicalFormField,
  Brand,
  EmailAddress as ValidationEmailAddress,
  PhoneNumber as ValidationPhoneNumber,
  URL as ValidationURL,
  ClinicalID,
  TherapistLicense,
  RiskLevel as ValidationRiskLevel,
} from './validation';

// ============================================================================
// EXPORTS FOR EXTERNAL CONSUMPTION
// ============================================================================

// Re-export existing specialized types
export * from './healthcare';
export * from './api';

// ============================================================================
// CLINICAL EXPORT SYSTEM TYPES
// ============================================================================

// Clinical export system types for PDF/CSV generation and therapeutic data sharing
export type {
  // Core export data structures
  ExportDataPackage,
  ClinicalExportData,
  ClinicalAssessmentExport,
  ProgressTrackingExport,
  SessionSummaryExport,
  ClinicalReportExport,
  
  // Export format types
  ExportFormat,
  PDFExportFormat,
  CSVExportFormat,
  JSONExportFormat,
  ClinicalXMLFormat,
  
  // Serialization system
  ClinicalSerializationPipeline,
  ClinicalDataTransformer,
  FormatSpecificSerializer,
  SerializationOptions,
  PDFSerializationOptions,
  CSVSerializationOptions,
  SerializationResult,
  
  // Export data structures
  PDFExportData,
  CSVExportData,
  JSONExportData,
  XMLExportData,
  
  // Validation system
  ExportValidationResult,
  ClinicalAccuracyValidation,
  DataIntegrityValidation,
  PrivacyComplianceValidation,
  ClinicalOutputValidator,
  QualityAssuranceValidator,
  
  // Data processing types
  NormalizedAssessmentData,
  AggregatedProgressData,
  AssessmentNormalizer,
  ProgressAggregator,
  
  // Privacy and consent
  UserConsentRecord,
  PrivacyConfiguration,
  GranularConsentConfiguration,
  
  // Performance optimization
  PerformanceOptimizer,
  MemoryOptimizationConfig,
  SpeedOptimizationConfig,
  AccuracyOptimizationConfig,
  BalancedOptimizationConfig,
  StreamingOptimizationConfig,
  
  // Clinical context
  ClinicalExportContext,
  TherapeuticContext,
  RiskContext,
  ExportMetadata,
  
  // Branded ID types
  ExportID,
  ConsentID,
  PipelineID,
  StageID,
  AssessmentExportID,
  ProgressExportID,
  SessionExportID,
  ClinicalReportExportID,
  TransformerID,
  ISO8601Timestamp,
  ExportVersion,
  FormatVersion,
  DataVersion,
  ClinicalVersion,
  
  // Utility functions (selective export)
  createClinicalExportPipeline,
  isValidClinicalAssessment,
  hasMinimumClinicalData,
  validateMinimumClinicalRequirements,
  createDefaultPDFOptions,
  createDefaultCSVOptions,
  optimizeForLargeDataset,
  calculateTherapeuticDataQuality,
  
  // Export configuration and constants
  CLINICAL_EXPORT_CONSTANTS,
  DEFAULT_CLINICAL_EXPORT_CONFIG,
} from './clinical-export';

// ============================================================================
// DARK MODE & THEME SYSTEM EXPORTS
// ============================================================================

// Core theme system types
export * from './theme';

// Theme utility types and helpers
export type {
  ColorManipulation,
  ColorSchemeGenerator,
  ColorValidator,
  CSSCustomProperties,
  TailwindClassGenerator,
  ThemeTransitionConfig,
  ThemeError,
  ThemeValidationResult,
  ThemeDebugUtils,
  ThemeAnalyticsReport,
  ExtractThemeProps,
  OmitThemeProps,
  RequireTheme,
  OptionalTheme,
  ThemeComponentFactory,
  ThemeUtilityFunction,
} from './theme-utils';

// Theme hook types
export type {
  UseThemeReturn,
  UseThemeColorsReturn,
  UseThemePerformanceReturn,
  UseThemeAccessibilityReturn,
  UseCrisisThemeReturn,
  UseClinicalThemeReturn,
  UseSystemThemeReturn,
  UseThemePersistenceReturn,
  UseThemeTransitionsReturn,
  UseButtonThemeReturn,
  UseFormThemeReturn,
  UseAssessmentThemeReturn,
  ThemeHookFactory,
  ClinicalHookFactory,
  UseThemeSystemReturn,
  UseThemeSelector,
} from './theme-hooks';

// Component theme integration types
export type {
  FullMindThemeProps,
  FullMindClinicalProps,
  FullMindPerformanceProps,
  HeaderThemeProps,
  FooterThemeProps,
  NavigationThemeProps,
  HeroThemeProps,
  FeaturesThemeProps,
  ClinicalThemeProps as ClinicalSectionThemeProps,
  TrustIndicatorsThemeProps,
  ButtonThemeProps,
  CardThemeProps,
  ModalThemeProps,
  InputThemeProps,
  CrisisButtonThemeProps,
  AssessmentThemeProps,
  BreathingSpaceThemeProps,
  PerformanceDashboardThemeProps,
  LoadingThemeProps,
  ErrorBoundaryThemeProps,
  SkipLinksThemeProps,
  DownloadButtonsThemeProps,
  PhoneMockupThemeProps,
  TypographyThemeProps,
  SectionThemeProps,
  ContainerThemeProps,
  ThemeProviderComponentProps,
  WithThemeProps,
  OptionalThemeProps,
  RequireThemeProps,
} from './theme-components';

// Re-export commonly used types for convenience
export type { 
  ReactNode, 
  ReactElement, 
  ComponentProps, 
  PropsWithChildren 
} from 'react';

export type {
  Metadata,
  Viewport
} from 'next';