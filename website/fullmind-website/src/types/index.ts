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
}

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