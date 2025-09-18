/**
 * Being. Website - Validation & Utility Type Definitions
 * Type-safe validation, transformation, and utility types for clinical safety
 */

// ============================================================================
// VALIDATION SCHEMA TYPES
// ============================================================================

export interface ValidationSchema<T = unknown> {
  readonly fields: ValidationField<keyof T>[];
  readonly rules: ValidationRule<T>[];
  readonly clinicalValidation?: ClinicalValidationRequirement;
  readonly strictMode: boolean;
}

export interface ValidationField<K extends string | number | symbol> {
  readonly field: K;
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'phone' | 'url';
  readonly required: boolean;
  readonly constraints?: FieldConstraints;
  readonly sanitization?: SanitizationRule[];
  readonly clinicalSensitive?: boolean;
}

export interface FieldConstraints {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: RegExp;
  readonly allowedValues?: readonly (string | number)[];
  readonly customValidator?: (value: unknown) => boolean;
}

export interface ValidationRule<T> {
  readonly name: string;
  readonly validator: (data: T) => ValidationResult;
  readonly severity: 'warning' | 'error' | 'critical';
  readonly clinicalImportance?: 'low' | 'medium' | 'high' | 'critical';
  readonly errorMessage: string;
}

export interface SanitizationRule {
  readonly type: 'trim' | 'lowercase' | 'uppercase' | 'strip-html' | 'escape-html' | 'normalize' | 'clinical-text';
  readonly preserveFormatting?: boolean;
  readonly clinicalContext?: boolean;
}

export interface ClinicalValidationRequirement {
  readonly required: boolean;
  readonly validatedBy?: 'clinician' | 'algorithm' | 'both';
  readonly riskAssessment: boolean;
  readonly documentationRequired: boolean;
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ValidationError[];
  readonly warnings: ValidationWarning[];
  readonly clinicalConcerns: ClinicalConcern[];
  readonly sanitizedData?: unknown;
  readonly metadata: ValidationMetadata;
}

export interface ValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly severity: 'error' | 'critical';
  readonly value?: unknown;
  readonly constraint?: string;
  readonly clinicalImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly value?: unknown;
  readonly clinicalRelevance: boolean;
}

export interface ClinicalConcern {
  readonly field: string;
  readonly concern: string;
  readonly severity: 'low' | 'medium' | 'high' | 'urgent';
  readonly recommendedAction: string;
  readonly escalationRequired: boolean;
  readonly validationRequired: boolean;
}

export interface ValidationMetadata {
  readonly timestamp: Date;
  readonly validatedBy: 'system' | 'clinician' | 'hybrid';
  readonly validationTime: number; // ms
  readonly rulesPassed: string[];
  readonly rulesFailed: string[];
  readonly clinicalReviewRequired: boolean;
}

// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

export interface FormValidationConfig<T> {
  readonly schema: ValidationSchema<T>;
  readonly validateOnChange: boolean;
  readonly validateOnBlur: boolean;
  readonly clinicalMode: boolean;
  readonly realTimeValidation: boolean;
  readonly accessibility: {
    readonly announceErrors: boolean;
    readonly focusFirstError: boolean;
    readonly ariaDescribedBy: boolean;
  };
}

export interface FormFieldValidation {
  readonly valid: boolean;
  readonly error?: string;
  readonly warning?: string;
  readonly clinicalNote?: string;
  readonly touched: boolean;
  readonly pristine: boolean;
  readonly validating: boolean;
}

export interface FormValidationState<T> {
  readonly fields: Record<keyof T, FormFieldValidation>;
  readonly globalErrors: ValidationError[];
  readonly isValid: boolean;
  readonly isSubmitting: boolean;
  readonly submissionAttempts: number;
  readonly clinicalReviewRequired: boolean;
}

// ============================================================================
// DATA TRANSFORMATION TYPES
// ============================================================================

export interface DataTransformer<TInput, TOutput> {
  readonly name: string;
  readonly transform: (input: TInput) => TOutput | Promise<TOutput>;
  readonly validate?: (input: TInput) => ValidationResult;
  readonly sanitize?: (input: TInput) => TInput;
  readonly clinicalSafe: boolean;
}

export interface TransformationPipeline<TInput, TOutput> {
  readonly steps: DataTransformer<unknown, unknown>[];
  readonly errorHandling: 'fail-fast' | 'collect-errors' | 'continue-on-error';
  readonly clinicalValidation: boolean;
  readonly auditTrail: boolean;
}

export interface TransformationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors: TransformationError[];
  readonly warnings: string[];
  readonly auditTrail: TransformationStep[];
  readonly clinicallyValidated: boolean;
}

export interface TransformationError {
  readonly step: string;
  readonly message: string;
  readonly inputData?: unknown;
  readonly originalError?: Error;
  readonly recoverable: boolean;
}

export interface TransformationStep {
  readonly stepName: string;
  readonly timestamp: Date;
  readonly inputType: string;
  readonly outputType: string;
  readonly success: boolean;
  readonly duration: number; // ms
}

// ============================================================================
// TYPE SAFETY UTILITIES
// ============================================================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends Record<string, unknown>
    ? DeepReadonly<T[P]>
    : T[P];
};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends Record<string, unknown>
    ? DeepPartial<T[P]>
    : T[P];
};

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

export type NonEmptyArray<T> = [T, ...T[]];

export type Exact<T, U> = T extends U
  ? U extends T
    ? T
    : never
  : never;

// Clinical-specific type utilities
export type ClinicalData<T> = T & {
  readonly __clinicalData: true;
  readonly validatedAt: Date;
  readonly validatedBy: string;
  readonly clinicalVersion: string;
};

export type SanitizedInput<T> = T & {
  readonly __sanitized: true;
  readonly sanitizedAt: Date;
  readonly sanitizationRules: string[];
};

export type ValidatedForm<T> = T & {
  readonly __validated: true;
  readonly validationResult: ValidationResult;
  readonly clinicallyApproved: boolean;
};

// ============================================================================
// CONDITIONAL TYPES FOR CLINICAL SAFETY
// ============================================================================

export type IfClinical<T, Clinical, NonClinical> = T extends { clinicalContext: true }
  ? Clinical
  : NonClinical;

export type RequireClinicalValidation<T> = T extends { clinicalSensitive: true }
  ? T & { clinicalValidation: ClinicalValidationRequirement }
  : T;

export type ClinicalFormField<T> = T extends { type: 'clinical' }
  ? T & {
      readonly clinicalValidation: true;
      readonly validatedBy: string;
      readonly hipaaCompliant: boolean;
    }
  : T;

// ============================================================================
// BRANDED TYPES FOR ENHANCED SAFETY
// ============================================================================

export type Brand<T, B> = T & { readonly __brand: B };

export type EmailAddress = Brand<string, 'EmailAddress'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type URL = Brand<string, 'URL'>;
export type ClinicalID = Brand<string, 'ClinicalID'>;
export type TherapistLicense = Brand<string, 'TherapistLicense'>;
export type AssessmentScore = Brand<number, 'AssessmentScore'>;
export type RiskLevel = Brand<'low' | 'moderate' | 'high' | 'critical', 'RiskLevel'>;

// Validation functions for branded types
export function createEmailAddress(email: string): EmailAddress | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? (email as EmailAddress) : null;
}

export function createPhoneNumber(phone: string): PhoneNumber | null {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone) ? (phone as PhoneNumber) : null;
}

export function createURL(url: string): URL | null {
  try {
    new window.URL(url);
    return url as URL;
  } catch {
    return null;
  }
}

export function createAssessmentScore(score: number, type: 'PHQ9' | 'GAD7'): AssessmentScore | null {
  const maxScore = type === 'PHQ9' ? 27 : 21;
  return score >= 0 && score <= maxScore && Number.isInteger(score) 
    ? (score as AssessmentScore) 
    : null;
}

// ============================================================================
// PARSER & SERIALIZER TYPES
// ============================================================================

export interface DataParser<TInput, TOutput> {
  readonly parse: (input: TInput) => ParseResult<TOutput>;
  readonly validate?: (parsed: TOutput) => ValidationResult;
  readonly schema: ValidationSchema<TOutput>;
  readonly clinicalSafe: boolean;
}

export interface ParseResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly errors: ParseError[];
  readonly warnings: string[];
  readonly partialData?: Partial<T>;
}

export interface ParseError {
  readonly field?: string;
  readonly message: string;
  readonly code: string;
  readonly position?: number;
  readonly severity: 'warning' | 'error' | 'critical';
}

export interface DataSerializer<TInput, TOutput> {
  readonly serialize: (input: TInput) => SerializationResult<TOutput>;
  readonly format: 'json' | 'xml' | 'csv' | 'clinical-export' | 'hipaa-compliant';
  readonly includeMetadata: boolean;
  readonly clinicalHeaders: boolean;
}

export interface SerializationResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly metadata?: SerializationMetadata;
  readonly errors: string[];
  readonly clinicallyCompliant: boolean;
}

export interface SerializationMetadata {
  readonly format: string;
  readonly timestamp: Date;
  readonly version: string;
  readonly clinicalValidation: boolean;
  readonly checksum?: string;
}

// ============================================================================
// ASYNC VALIDATION TYPES
// ============================================================================

export interface AsyncValidator<T> {
  readonly validate: (data: T) => Promise<ValidationResult>;
  readonly timeout: number; // ms
  readonly retryAttempts: number;
  readonly clinicalEndpoint?: string;
  readonly cacheable: boolean;
}

export interface AsyncValidationQueue {
  readonly queue: AsyncValidationTask[];
  readonly processing: boolean;
  readonly maxConcurrency: number;
  readonly clinicalPriority: boolean;
}

export interface AsyncValidationTask {
  readonly id: string;
  readonly data: unknown;
  readonly validator: AsyncValidator<unknown>;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly callback: (result: ValidationResult) => void;
  readonly clinicalTask: boolean;
  readonly createdAt: Date;
}

// ============================================================================
// CLINICAL VALIDATION TYPES
// ============================================================================

export interface ClinicalValidator {
  readonly validateClinicalData: <T>(data: T) => ClinicalValidationResult<T>;
  readonly validateAssessmentScore: (score: number, type: 'PHQ9' | 'GAD7') => boolean;
  readonly validateCrisisThreshold: (assessment: { score: number; type: string }) => boolean;
  readonly validateTherapeuticContent: (content: string) => TherapeuticValidationResult;
  readonly validateAccessibilityCompliance: (component: unknown) => AccessibilityValidationResult;
}

export interface ClinicalValidationResult<T> {
  readonly clinicallyValid: boolean;
  readonly data: T;
  readonly concerns: ClinicalConcern[];
  readonly riskAssessment: RiskAssessment;
  readonly recommendations: string[];
  readonly validatedBy: string;
  readonly validatedAt: Date;
}

export interface TherapeuticValidationResult {
  readonly therapeuticallySound: boolean;
  readonly mbctCompliant: boolean;
  readonly languageAppropriate: boolean;
  readonly concerns: string[];
  readonly suggestions: string[];
  readonly clinicalEvidence?: string;
}

export interface AccessibilityValidationResult {
  readonly wcagCompliant: boolean;
  readonly level: 'A' | 'AA' | 'AAA';
  readonly issues: AccessibilityIssue[];
  readonly recommendations: AccessibilityRecommendation[];
  readonly automaticallyTestable: boolean;
}

export interface AccessibilityIssue {
  readonly rule: string;
  readonly severity: 'minor' | 'moderate' | 'serious' | 'critical';
  readonly element?: string;
  readonly message: string;
  readonly helpUrl?: string;
}

export interface AccessibilityRecommendation {
  readonly issue: string;
  readonly solution: string;
  readonly implementationEffort: 'low' | 'medium' | 'high';
  readonly clinicalBenefit: boolean;
}

export interface RiskAssessment {
  readonly riskLevel: RiskLevel;
  readonly factors: string[];
  readonly mitigation: string[];
  readonly escalationRequired: boolean;
  readonly reviewRequired: boolean;
  readonly timeframe: string;
}

// ============================================================================
// TYPE GUARDS & RUNTIME VALIDATION
// ============================================================================

export function isValidEmail(value: unknown): value is EmailAddress {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhoneNumber(value: unknown): value is PhoneNumber {
  return typeof value === 'string' && /^\+?[\d\s\-\(\)]{10,}$/.test(value);
}

export function isValidURL(value: unknown): value is URL {
  if (typeof value !== 'string') return false;
  try {
    new window.URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isClinicalData<T>(value: T): value is ClinicalData<T> {
  return typeof value === 'object' && 
         value !== null && 
         '__clinicalData' in value &&
         'validatedAt' in value &&
         'validatedBy' in value;
}

export function isValidAssessmentScore(score: unknown, type: 'PHQ9' | 'GAD7'): score is AssessmentScore {
  if (typeof score !== 'number' || !Number.isInteger(score)) return false;
  const maxScore = type === 'PHQ9' ? 27 : 21;
  return score >= 0 && score <= maxScore;
}

export function requiresClinicalValidation<T>(data: T): boolean {
  return typeof data === 'object' && 
         data !== null && 
         'clinicalSensitive' in data &&
         (data as { clinicalSensitive?: boolean }).clinicalSensitive === true;
}

export function isHighRiskData<T>(data: T): boolean {
  if (typeof data !== 'object' || data === null) return false;
  
  // Check for crisis-related keywords or high scores
  const dataString = JSON.stringify(data).toLowerCase();
  const riskKeywords = ['suicide', 'death', 'harm', 'crisis', 'emergency'];
  const hasRiskKeywords = riskKeywords.some(keyword => dataString.includes(keyword));
  
  // Check for high assessment scores
  if ('score' in data && 'type' in data) {
    const assessment = data as { score: number; type: string };
    if (assessment.type === 'PHQ9' && assessment.score >= 20) return true;
    if (assessment.type === 'GAD7' && assessment.score >= 15) return true;
  }
  
  return hasRiskKeywords;
}

// ============================================================================
// VALIDATION CONSTANTS
// ============================================================================

export const VALIDATION_CONSTANTS = {
  MAX_TEXT_LENGTH: 5000,
  MAX_CLINICAL_TEXT_LENGTH: 10000,
  MIN_PASSWORD_LENGTH: 8,
  MAX_EMAIL_LENGTH: 320,
  MAX_PHONE_LENGTH: 20,
  CLINICAL_REVIEW_THRESHOLD: 0.8, // 80% confidence required
  ASYNC_VALIDATION_TIMEOUT: 5000, // 5 seconds
  MAX_VALIDATION_RETRIES: 3,
  
  RISK_THRESHOLDS: {
    PHQ9_CRISIS: 20,
    GAD7_CRISIS: 15,
    CLINICAL_REVIEW_REQUIRED: 15, // Any score above this needs review
  },
  
  SANITIZATION_RULES: {
    PRESERVE_CLINICAL_FORMATTING: ['line-breaks', 'spacing', 'punctuation'],
    REMOVE_HTML: true,
    ESCAPE_SPECIAL_CHARS: true,
    NORMALIZE_UNICODE: true,
  },
} as const;