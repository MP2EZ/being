/**
 * Authentication Screen Types - Enhanced Type Safety
 *
 * Comprehensive types for authentication screen components, form handling,
 * error management, and performance monitoring integration.
 */

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, AuthNavigationParams, AuthPerformanceRequirements } from './navigation';
import type {
  AuthenticationResult,
  AuthErrorCode,
  ConsentLevel,
  CrisisAuthResult,
  AuthenticationMethod
} from './authentication';
import type {
  AuthSessionState,
  ConsentState,
  DeviceRegistration
} from '../services/cloud/AuthIntegrationService';

/**
 * Navigation Props for Authentication Screens
 */
export type SignInScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignIn'>;
export type SignInScreenRouteProp = RouteProp<RootStackParamList, 'SignIn'>;

export type SignUpScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;
export type SignUpScreenRouteProp = RouteProp<RootStackParamList, 'SignUp'>;

export type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
export type ForgotPasswordScreenRouteProp = RouteProp<RootStackParamList, 'ForgotPassword'>;

export type AuthenticationScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Authentication'>;
export type AuthenticationScreenRouteProp = RouteProp<RootStackParamList, 'Authentication'>;

/**
 * Screen Component Props
 */
export interface SignInScreenProps {
  navigation: SignInScreenNavigationProp;
  route: SignInScreenRouteProp;
}

export interface SignUpScreenProps {
  navigation: SignUpScreenNavigationProp;
  route: SignUpScreenRouteProp;
}

export interface ForgotPasswordScreenProps {
  navigation: ForgotPasswordScreenNavigationProp;
  route: ForgotPasswordScreenRouteProp;
}

export interface AuthenticationScreenProps {
  navigation: AuthenticationScreenNavigationProp;
  route: AuthenticationScreenRouteProp;
}

/**
 * Form Data Types
 */
export interface SignInFormData {
  readonly email: string;
  readonly password: string;
}

export interface SignUpFormData {
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export interface ForgotPasswordFormData {
  readonly email: string;
}

/**
 * Enhanced Error Types for Screen-Level Handling
 */
export interface AuthScreenError {
  readonly field?: keyof SignInFormData | keyof SignUpFormData | keyof ForgotPasswordFormData | 'terms' | 'privacy' | 'general';
  readonly message: string;
  readonly code: AuthErrorCode;
  readonly timestamp: string;
  readonly recoverable: boolean;
  readonly suggestions?: readonly string[];
}

export interface AuthScreenValidationError extends AuthScreenError {
  readonly field: keyof SignInFormData | keyof SignUpFormData | keyof ForgotPasswordFormData;
  readonly validationType: 'required' | 'format' | 'length' | 'strength' | 'match';
}

export interface AuthScreenServiceError extends AuthScreenError {
  readonly serviceType: 'authentication' | 'biometric' | 'oauth' | 'network';
  readonly retryable: boolean;
  readonly retryCount: number;
  readonly maxRetries: number;
}

/**
 * Screen State Management Types
 */
export interface AuthScreenState {
  readonly isLoading: boolean;
  readonly errors: readonly AuthScreenError[];
  readonly warnings: readonly AuthScreenWarning[];
  readonly currentStep: AuthScreenStep;
  readonly canNavigateBack: boolean;
  readonly performanceMetrics: AuthScreenPerformanceMetrics;
}

export interface AuthScreenWarning {
  readonly type: 'performance' | 'security' | 'accessibility' | 'network';
  readonly message: string;
  readonly dismissible: boolean;
  readonly action?: string;
}

export type AuthScreenStep =
  | 'form_input'
  | 'validation'
  | 'authentication'
  | 'biometric_setup'
  | 'consent_collection'
  | 'migration_check'
  | 'completion';

export interface AuthScreenPerformanceMetrics {
  readonly screenLoadTime: number;
  readonly formValidationTime: number;
  readonly authenticationTime: number;
  readonly biometricSetupTime: number;
  readonly totalTime: number;
  readonly crisisResponseReady: boolean; // Whether <200ms crisis response is available
  readonly networkLatency: number;
  readonly errorCount: number;
}

/**
 * Biometric Integration Types for Screens
 */
export interface BiometricScreenState {
  readonly supported: boolean;
  readonly available: boolean;
  readonly enrolled: boolean;
  readonly enabled: boolean;
  readonly lastUsed?: string;
  readonly setupInProgress: boolean;
  readonly capabilities: BiometricScreenCapabilities;
}

export interface BiometricScreenCapabilities {
  readonly faceId: boolean;
  readonly touchId: boolean;
  readonly fingerprint: boolean;
  readonly voice: boolean;
  readonly iris: boolean;
  readonly hardwareBacked: boolean;
  readonly multipleEnrollments: boolean;
}

/**
 * Social Authentication Integration Types
 */
export interface SocialAuthScreenState {
  readonly apple: SocialAuthProviderState;
  readonly google: SocialAuthProviderState;
}

export interface SocialAuthProviderState {
  readonly available: boolean;
  readonly configured: boolean;
  readonly loading: boolean;
  readonly lastError?: string;
  readonly lastUsed?: string;
}

/**
 * Consent Management Types for Screens
 */
export interface ConsentScreenState {
  readonly termsOfService: boolean;
  readonly privacyPolicy: boolean;
  readonly therapeuticData: boolean;
  readonly emailCommunication: boolean;
  readonly researchParticipation: boolean;
  readonly biometricAuth: boolean;
  readonly cloudSync: boolean;
  readonly emergencyAccess: boolean;
  readonly lastUpdated?: string;
  readonly validationErrors: readonly ConsentValidationError[];
}

export interface ConsentValidationError {
  readonly consentType: keyof ConsentScreenState;
  readonly message: string;
  readonly required: boolean;
}

/**
 * Migration State Types for Authentication Screens
 */
export interface MigrationScreenState {
  readonly available: boolean;
  readonly eligible: boolean;
  readonly inProgress: boolean;
  readonly completed: boolean;
  readonly dataFound: boolean;
  readonly estimatedDuration: number;
  readonly currentStep?: MigrationStep;
  readonly errors: readonly MigrationError[];
}

export interface MigrationStep {
  readonly step: string;
  readonly description: string;
  readonly progress: number; // 0-1
  readonly completed: boolean;
}

export interface MigrationError {
  readonly step: string;
  readonly message: string;
  readonly critical: boolean;
  readonly retryable: boolean;
}

/**
 * Crisis Authentication Types for Emergency Access
 */
export interface CrisisAuthScreenState {
  readonly available: boolean;
  readonly active: boolean;
  readonly responseTime: number;
  readonly lastActivated?: string;
  readonly accessGranted: boolean;
  readonly errors: readonly CrisisAuthError[];
}

export interface CrisisAuthError {
  readonly message: string;
  readonly responseTime: number;
  readonly criticalFailure: boolean;
  readonly fallbackAvailable: boolean;
}

/**
 * Performance Monitoring Types for Crisis Response
 */
export interface CrisisPerformanceMonitor {
  readonly enabled: boolean;
  readonly threshold: number; // 200ms
  readonly currentResponseTime: number;
  readonly averageResponseTime: number;
  readonly violationCount: number;
  readonly lastViolation?: string;
  readonly alerts: readonly CrisisPerformanceAlert[];
}

export interface CrisisPerformanceAlert {
  readonly timestamp: string;
  readonly responseTime: number;
  readonly threshold: number;
  readonly screen: string;
  readonly method: string;
  readonly severity: 'warning' | 'critical';
}

/**
 * Screen Action Types
 */
export interface AuthScreenActions {
  // Form actions
  updateFormData: (field: string, value: string) => void;
  validateForm: () => boolean;
  clearErrors: () => void;
  clearError: (field: string) => void;

  // Authentication actions
  signIn: (email: string, password: string) => Promise<AuthenticationResult>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<AuthenticationResult>;
  signInWithBiometric: () => Promise<AuthenticationResult>;
  signInWithApple: () => Promise<AuthenticationResult>;
  signInWithGoogle: () => Promise<AuthenticationResult>;
  resetPassword: (email: string) => Promise<boolean>;

  // Biometric actions
  setupBiometric: () => Promise<boolean>;
  checkBiometricSupport: () => Promise<BiometricScreenState>;
  enableBiometric: (enabled: boolean) => Promise<boolean>;

  // Consent actions
  updateConsent: (consentType: string, granted: boolean) => void;
  validateConsents: () => boolean;
  submitConsents: () => Promise<boolean>;

  // Migration actions
  checkMigrationEligibility: () => Promise<boolean>;
  startMigration: () => Promise<boolean>;
  cancelMigration: () => Promise<boolean>;

  // Crisis actions
  createCrisisAuth: (crisisType: string, severity: string) => Promise<CrisisAuthResult>;
  validateCrisisResponse: () => boolean;

  // Navigation actions
  navigateBack: () => void;
  navigateToScreen: (screen: string, params?: any) => void;
  handleAuthenticationSuccess: (result: AuthenticationResult) => void;
  handleAuthenticationError: (error: AuthScreenError) => void;
}

/**
 * Screen Configuration Types
 */
export interface AuthScreenConfig {
  readonly performanceMonitoring: boolean;
  readonly crisisResponseRequired: boolean;
  readonly biometricSetupOptional: boolean;
  readonly migrationCheckRequired: boolean;
  readonly consentValidationStrict: boolean;
  readonly offlineModeAvailable: boolean;
  readonly accessibilityEnhanced: boolean;
  readonly debugMode: boolean;
}

/**
 * Integration Types with Services
 */
export interface AuthScreenServiceIntegration {
  readonly authIntegrationService: any; // Will be typed based on service
  readonly securityManager: any;
  readonly cloudSyncAPI: any;
  readonly performanceMonitor: any;
}

/**
 * Type Guards for Authentication Screen Types
 */
export function isSignInFormData(data: any): data is SignInFormData {
  return data &&
         typeof data.email === 'string' &&
         typeof data.password === 'string';
}

export function isSignUpFormData(data: any): data is SignUpFormData {
  return data &&
         typeof data.email === 'string' &&
         typeof data.password === 'string' &&
         typeof data.confirmPassword === 'string';
}

export function isAuthScreenError(error: any): error is AuthScreenError {
  return error &&
         typeof error.message === 'string' &&
         typeof error.code === 'string' &&
         typeof error.timestamp === 'string' &&
         typeof error.recoverable === 'boolean';
}

export function isCrisisAuthRequired(state: AuthScreenState): boolean {
  return state.currentStep === 'authentication' &&
         state.performanceMetrics.crisisResponseReady;
}

export function isPerformanceViolation(metrics: AuthScreenPerformanceMetrics): boolean {
  return metrics.authenticationTime > 200 && // Crisis response requirement
         metrics.crisisResponseReady;
}

/**
 * Constants for Authentication Screens
 */
export const AUTH_SCREEN_CONSTANTS = {
  PERFORMANCE: {
    CRISIS_RESPONSE_TIMEOUT: 200, // ms
    STANDARD_AUTH_TIMEOUT: 2000, // ms
    BIOMETRIC_TIMEOUT: 1000, // ms
    NETWORK_TIMEOUT: 5000, // ms
    FORM_VALIDATION_TIMEOUT: 100, // ms
  },

  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128,
    EMAIL_REGEX: /\S+@\S+\.\S+/,
    STRONG_PASSWORD_REGEX: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
  },

  RETRY: {
    MAX_AUTH_RETRIES: 3,
    MAX_BIOMETRIC_RETRIES: 3,
    MAX_NETWORK_RETRIES: 2,
    RETRY_DELAY_MS: 1000,
  },

  SECURITY: {
    MAX_FAILED_ATTEMPTS: 3,
    LOCKOUT_DURATION_MINUTES: 15,
    SESSION_WARNING_MINUTES: 5,
  }
} as const;

/**
 * Export unified types for authentication screens
 */
export type AuthScreenTypes =
  | SignInScreenProps
  | SignUpScreenProps
  | ForgotPasswordScreenProps
  | AuthenticationScreenProps;

export type AuthFormDataTypes =
  | SignInFormData
  | SignUpFormData
  | ForgotPasswordFormData;

export type AuthScreenErrorTypes =
  | AuthScreenError
  | AuthScreenValidationError
  | AuthScreenServiceError;