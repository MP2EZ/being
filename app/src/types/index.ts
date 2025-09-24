/**
 * Being. Data Models - Enhanced TypeScript Foundations
 *
 * Comprehensive type system with strict mode compliance and clinical safety.
 * Includes legacy compatibility while adding enhanced type safety.
 *
 * CRITICAL: 100% type safety for clinical operations
 */

// === ENHANCED TYPE FOUNDATIONS ===

// Core enhanced types
export type {
  // Utility types
  Brand,
  DeepReadonly,
  RequireKeys,
  OptionalKeys,
  NonNullable,
  Exact,
  StrictPick,
  StrictOmit,
  SafeParse,

  // Core branded types
  UserID,
  DeviceID,
  SessionID,
  ISODateString,
  UnixTimestamp,
  EncryptedData,
  ValidURL,
  EmailAddress,
  PhoneNumber,
  Percentage,
  DurationMs,

  // Clinical safety types
  DataSensitivity,
  HIPAACompliance,
  CrisisSeverity,
  RiskLevel,

  // Validation types
  ValidationError,
  ValidationResult,
  TypeGuard,
  Parser,
  Validator,

  // Core constants
  CoreConstants,
} from './core';

// Enhanced validation and type guards
export {
  // Type guards
  isUserID,
  isDeviceID,
  isSessionID,
  isISODateString,
  isEmailAddress,
  isPhoneNumber,
  isPercentage,

  // Factory functions
  createUserID,
  createDeviceID,
  createSessionID,
  createISODateString,
  createUnixTimestamp,

  // Constants
  CORE_CONSTANTS,
} from './core';

// Enhanced validation system
export type {
  // Validation schemas and parsers are available from validation module
} from './validation';

export {
  // Comprehensive validation utilities
  validateUserID,
  validateDeviceID,
  validateAssessment,
  validatePHQ9ScoreCalculation,
  validateGAD7ScoreCalculation,
  validatePHQ9CrisisDetection,
  validateGAD7CrisisDetection,
  VALIDATION_CONSTANTS,
} from './validation';

// Enhanced component props with clinical safety
export type {
  // Enhanced base props
  EnhancedBaseProps,
  ComponentPerformanceMetrics,

  // Crisis-aware components
  CrisisButtonProps as EnhancedCrisisButtonProps,
  EnhancedButtonProps,
  ValidatedTextInputProps,

  // Therapeutic components
  TherapeuticBreathingCircleProps,
  BreathingPerformanceMetrics as TherapeuticBreathingPerformanceMetrics,

  // Enhanced component constants
  EnhancedComponentConstants,
} from './component-props-enhanced';

// Enhanced navigation with crisis safety
export type {
  // All navigation types with crisis awareness
  RootStackParamList as EnhancedRootStackParamList,
  MainTabParamList,
  CompositeNavigationProps,
} from './navigation';

export {
  isCrisisRoute,
  isAccessibleDuringCrisis,
  NAVIGATION_CONSTANTS,
} from './navigation';

// Comprehensive error handling with clinical safety
export type {
  ErrorSeverity,
  ErrorCategory,
  ErrorRecoveryStrategy,
  AppError,
  ClinicalValidationError as EnhancedClinicalValidationError,
  CrisisDetectionError as EnhancedCrisisDetectionError,
  ErrorHandlerService,
  ErrorMetrics,
} from './error-handling';

export {
  isClinicalError,
  isCrisisError,
  isEmergencyError,
  createClinicalValidationError,
  createCrisisDetectionError,
  ERROR_CONSTANTS,
} from './error-handling';

// === LEGACY DATA MODELS (Enhanced) ===

export interface UserProfile {
  id: string;
  createdAt: string; // ISO date
  onboardingCompleted: boolean;
  values: string[]; // 3-5 selected
  notifications: {
    enabled: boolean;
    morning: string; // "08:00"
    midday: string;  // "13:00"
    evening: string; // "20:00"
  };
  preferences: {
    haptics: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  lastSyncDate?: string; // Future
  clinicalProfile?: {
    phq9Baseline?: number;
    gad7Baseline?: number;
    riskLevel?: 'minimal' | 'mild' | 'moderate' | 'severe';
  };
}

export interface CheckIn {
  id: string;
  type: 'morning' | 'midday' | 'evening';
  startedAt: string;
  completedAt?: string;
  skipped: boolean;
  // Exactly matching prototype structure
  data: {
    // Morning specific
    bodyAreas?: string[];
    emotions?: string[];
    thoughts?: string[];
    sleepQuality?: number;
    energyLevel?: number;
    anxietyLevel?: number;
    todayValue?: string;
    intention?: string;
    dreams?: string;
    
    // Midday specific
    currentEmotions?: string[];
    breathingCompleted?: boolean;
    pleasantEvent?: string;
    unpleasantEvent?: string;
    currentNeed?: string;
    
    // Evening specific
    dayHighlight?: string;
    dayChallenge?: string;
    dayEmotions?: string[];
    gratitude1?: string;
    gratitude2?: string;
    gratitude3?: string;
    dayLearning?: string;
    tensionAreas?: string[];
    releaseNote?: string;
    sleepIntentions?: string[];
    tomorrowFocus?: string;
    lettingGo?: string;
    // Original evening fields (keep for backward compatibility)
    overallMood?: number;
    energyManagement?: number;
    valuesAlignment?: number;
    pleasantEvents?: string[];
    unpleasantEvents?: string[];
    learnings?: string;
    thoughtPatterns?: string[];
    tomorrowReminder?: string;
    tomorrowIntention?: string;
  };
}

// Import enhanced Assessment types from clinical module
export type { Assessment, AssessmentID, CheckInID } from './clinical';

// Import cloud types for P0-CLOUD Phase 1
export type {
  CloudFeatureFlags,
  EncryptedDataContainer,
  CloudSyncMetadata,
  CloudSyncOperation,
  CloudSyncError,
  CloudConflict,
  CloudAuditEntry,
  CloudSyncStats,
  HIPAAComplianceStatus,
  EmergencySyncConfig,
  CLOUD_CONSTANTS
} from './cloud';

// Import cloud client integration types
export type {
  CloudClientSDK,
  CloudClientConfig,
  CloudAuthClient,
  CloudDataClient,
  CloudSyncClient,
  CloudFeatureClient,
  CloudEmergencyClient,
  CloudMonitorClient,
  TypeSafeFeatureFlags,
  FeatureFlagConfiguration,
  EncryptableEntity,
  EncryptableCheckIn,
  EncryptableAssessment,
  EncryptableUserProfile,
  EncryptableCrisisPlan,
  ClientSDKResult,
  AuthSession,
  BiometricAuthData,
  CLOUD_CLIENT_CONSTANTS
} from './cloud-client';

// Import encrypted data flow types
export type {
  EncryptedEntity,
  EncryptionMetadata,
  DataIntegrityProof,
  ClinicalDataEncryption,
  BatchEncryptionOperation,
  EncryptionStage,
  ENCRYPTED_DATA_CONSTANTS
} from './encrypted-data-flow';

// Import authentication and session types
export type {
  AuthSession as DetailedAuthSession,
  SessionTokens,
  SessionSecurity,
  SessionPermissions,
  SessionCompliance,
  BiometricAuthData as DetailedBiometricAuthData,
  JWTValidationResult,
  JWTClaims,
  MultiDeviceSession,
  SessionActivity,
  AUTH_CONSTANTS
} from './auth-session';

// Import authentication screen types for enhanced UI integration
export type {
  SignInScreenProps,
  SignUpScreenProps,
  ForgotPasswordScreenProps,
  AuthenticationScreenProps,
  SignInFormData,
  SignUpFormData,
  ForgotPasswordFormData,
  AuthScreenError,
  AuthScreenState,
  BiometricScreenState,
  SocialAuthScreenState,
  ConsentScreenState,
  MigrationScreenState,
  CrisisAuthScreenState,
  CrisisPerformanceMonitor,
  AuthScreenActions,
  AuthScreenConfig,
  AUTH_SCREEN_CONSTANTS,
  isSignInFormData,
  isSignUpFormData,
  isAuthScreenError,
  isCrisisAuthRequired,
  isPerformanceViolation
} from './auth-screens';

// Import comprehensive authentication types for Week 2 implementation
export type {
  // Core Authentication Types
  AuthenticationMethod,
  AuthenticationResult,
  AuthenticationFlow,
  AuthenticationStep,
  AuthSecurityContext,
  AuthDeviceContext,
  AuthUserContext,

  // Enhanced User Authentication
  UserAuthenticationProfile,
  EnabledAuthMethod,
  AuthenticationPreferences,
  UserSecuritySettings,
  UserComplianceProfile,

  // Enhanced Session Management
  EnhancedAuthSession,
  SessionManagementSettings,
  SessionPerformanceMetrics,
  CrisisSessionContext,
  SessionSyncStatus,
  SessionEncryptionStatus,

  // Enhanced Biometric Authentication
  EnhancedBiometricAuthData,
  BiometricTemplate,
  BiometricQualityMetrics,
  BiometricSecurityFeatures,
  BiometricEnrollmentContext,

  // OAuth Integration
  OAuthProviderConfig,
  OAuthProviderInfo,
  OAuthUserProfile,
  OAuthAuthenticationResult,

  // Enhanced JWT with 15-minute Expiry
  EnhancedJWTClaims,
  JWTCustomClaims,
  JWTValidationConfig,
  EnhancedJWTValidationResult,
  TokenRiskAssessment,

  // User Migration (Anonymous to Authenticated)
  EnhancedUserMigration,
  MigrationStrategy,
  DataMigrationMapping,
  SecurityMigrationInfo,
  ComplianceMigrationInfo,

  // Crisis Authentication
  CrisisAuthenticationConfig,
  CrisisTrigger,
  EmergencyBypassConfig,
  CrisisSessionManagement,
  EmergencyContact,
  CrisisDataAccessRules,

  // Error Handling
  AuthenticationError,
  AuthErrorCode,
  OAuthError,

  // Store Integration
  AuthenticationStore,
  SessionStatus,
  ComplianceStatus,
  NavigationAuthState,

  // Navigation Integration
  AuthProtectedRoute,

  // Type Guards and Schemas
  isAuthenticationFlow,
  isEnhancedJWTClaims,
  isAuthenticationError,
  isCrisisMode,
  AuthenticationFlowSchema,
  EnhancedJWTClaimsSchema,

  // Constants
  AUTHENTICATION_CONSTANTS,

  // Type Unions
  AuthenticationTypes,
  AuthenticationStoreTypes,
  AuthenticationErrorTypes
} from './authentication';

// Import authentication store types for Zustand integration
export type {
  // Core Store Types
  AuthenticationStoreState,
  AuthenticationStoreActions,
  AuthenticationStoreSelectors,
  AuthenticationStore,
  AuthenticationStoreSlice,

  // Store Configuration
  AuthenticationStoreConfig,
  StateStorage,

  // Supporting Store Types
  SessionWarning,
  WarningAction,
  DeviceSessionInfo,
  BiometricStatus,
  OAuthStatus,
  OAuthProviderStatus,
  EmergencyStatus,
  EncryptionStatus,
  AuthAuditEntry,
  AuthenticationFeatureFlags,
  AuthenticationConfiguration,
  MigrationState,
  CrisisEvent,
  CrisisResponse,

  // Store Action Results
  MigrationEligibility,
  SessionHealth,
  SessionHealthIssue,
  BiometricEnrollmentResult,
  BiometricTestResult,
  ContactTestResult,
  OAuthLinkResult,
  OAuthRefreshResult,
  ComplianceReport,
  ComplianceCheck,
  ComplianceIssue,
  AuditExport,
  SecurityIncident,

  // Store Selectors Return Types
  DataAccessPermission,
  RetentionStatus,
  AuthPerformanceMetrics,
  LatencyMetrics,
  ErrorRateMetrics,
  ThroughputMetrics,

  // Store Configuration Types
  CrisisThresholds,
  ComplianceSettings,

  // Store Action Parameters
  SignInParams,
  MigrationParams,
  CrisisParams,

  // Store Events
  AuthenticationStoreEvent,

  // Store Constants
  AUTHENTICATION_STORE_CONSTANTS
} from './auth-store';

// Import authentication integration types for service integration
export type {
  // Encryption Service Integration
  AuthenticatedEncryptionService,
  AuthEncryptionContext,
  AuthComplianceContext,
  AuthenticatedEncryptionResult,
  BiometricEncryptionResult,
  SessionBinding,
  ComplianceMarkers,
  EncryptionAuditTrail,
  BiometricBinding,
  SessionDerivedKey,
  KeyRotationResult,
  CrisisEncryptionConfig,
  ComplianceValidationResult,
  KeyPurpose,
  ComplianceLevel,

  // Cloud Sync Integration
  AuthenticatedCloudSync,
  CloudSyncAuthContext,
  AuthSyncStrategy,
  UserMigrationSyncContext,
  DeviceAuthContext,
  AuthenticatedSyncResult,
  AuthenticatedSyncMetadata,
  EncryptionSyncProof,
  SyncComplianceValidation,
  SyncPerformanceMetrics,
  BatchAuthSyncResult,
  AuthSyncSummary,
  AuthSyncConflict,
  ConflictResolution,
  MigrationSyncResult,
  EmergencySyncResult,
  AuthProfileSyncResult,
  BiometricSyncResult,
  SyncPermissions,
  CloudComplianceRequirements,
  DeviceTrustLevel,
  SyncRetryPolicy,
  DeviceAuthCapabilities,
  TimeRestrictions,
  DataClassification,
  TrustFactor,
  SyncComplianceReport,
  ComplianceCheckResult,
  ComplianceViolation,
  SyncAuditEntry,

  // Feature Flags Integration
  AuthenticatedFeatureFlags,
  AuthFeatureFlagContext,
  AuthFeatureFlagEvaluation,
  FeatureFlagOverride,
  FeatureFlagSafeguard,

  // Navigation Integration
  AuthNavigationGuard,
  NavigationAuthState,
  NavigationGuardResult,
  RouteResolution,
  AuthNavigationAction,
  CrisisNavigationAction,

  // Performance Monitoring Integration
  AuthPerformanceMonitor,
  AuthPerformanceReport,
  AuthMethodMetrics,
  SessionMetrics,
  EncryptionMetrics,
  PerformanceAnomaly,
  DateRange,

  // Type Utilities
  AuthenticationIntegrationTypes,
  AuthContextTypes,
  AuthResultTypes
} from './auth-integration';

// Import enhanced navigation types for authentication integration
export type {
  RootStackParamList,
  AuthNavigationParams,
  AuthPerformanceRequirements,
  NavigationAuthState,
  AuthNavigationPerformanceMetrics,
  AuthNavigationError,
  isAuthNavigation,
  requiresCrisisPerformance
} from './navigation';

// Legacy assessment interface for backward compatibility
export interface LegacyAssessment {
  id: string;
  type: 'phq9' | 'gad7';
  completedAt: string;
  answers: number[]; // [0,1,2,3,...]
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately severe' | 'severe';
  context: 'onboarding' | 'standalone' | 'clinical';
}

export interface CrisisPlan {
  id: string;
  updatedAt: string;
  warningSigns: string[];
  copingStrategies: string[];
  contacts: {
    therapist?: { name: string; phone: string; };
    crisisLine: string; // Default "988"
    trustedFriends: Array<{ name: string; phone: string; }>;
  };
  safetyMeasures: string[];
  isActive: boolean;
}

// Core app data structure
export interface AppData {
  user: UserProfile;
  checkIns: CheckIn[];
  assessments: any[];
  crisisPlan: CrisisPlan | null;
  // Current session (not persisted)
  currentCheckIn?: Partial<CheckIn>;
}

// Export data structure for sharing
export interface ExportData {
  exportDate: string;
  version: string;
  user: UserProfile;
  checkIns: CheckIn[];
  assessments: any[];
  crisisPlan: CrisisPlan | null;
  disclaimer: string;
}

// Assessment response options
export interface AssessmentOption {
  value: number;
  label: string;
}

// Assessment question structure
export interface AssessmentQuestion {
  id: number;
  text: string;
  options: AssessmentOption[];
}

// Assessment configuration
export interface AssessmentConfig {
  type: 'phq9' | 'gad7';
  title: string;
  subtitle: string;
  questions: AssessmentQuestion[];
  scoringThresholds: {
    minimal: number;
    mild: number;
    moderate: number;
    moderatelySevere?: number; // PHQ-9 only
    severe: number;
  };
}

// Notification configuration
export interface NotificationConfig {
  id: string;
  title: string;
  body: string;
  data: {
    type: 'morning' | 'midday' | 'evening';
    action?: string;
  };
  trigger: {
    hour: number;
    minute: number;
    repeats: boolean;
  };
}

// Import comprehensive payment types for P0-CLOUD Phase 1
export type {
  // Core Payment Types
  PaymentConfig,
  PaymentState,
  PaymentActions,
  PaymentEnvironmentConfig,
  PaymentAPIClient,

  // Customer Management
  CustomerData,
  CustomerResult,

  // Payment Methods
  PaymentMethodData,
  PaymentMethodResult,

  // Payment Processing
  PaymentIntentData,
  PaymentIntentResult,

  // Subscription Management
  SubscriptionPlan,
  SubscriptionResult,
  SubscriptionStatus,

  // Crisis Management
  CrisisPaymentOverride,

  // Error Handling
  PaymentError,

  // Events and Analytics
  PaymentEvent,
  WebhookEvent,

  // Enhanced Payment Types (Day 15 TypeScript Integration)
  EnhancedPaymentState,
  EnhancedPaymentActions,
  EnhancedPaymentStore,

  // Error Handling Types
  EnhancedPaymentError,
  PaymentErrorCategory,
  CrisisImpactLevel,
  ErrorRecoveryStrategy,
  PaymentErrorContext,
  PaymentOperation,
  PaymentErrorSource,
  ComplianceFlag,
  StripeErrorMapping,
  ErrorRecoveryResult,
  CrisisSafeErrorHandler,

  // Performance Monitoring Types
  PerformanceMetricCategory,
  PerformanceAlertLevel,
  PaymentPerformanceMetric,
  PaymentPerformanceSession,
  PaymentPerformanceSummary,
  PaymentPerformanceAlert,
  PaymentPerformanceMonitor,
  PerformanceContext,
  CrisisPerformanceValidator,
  PerformanceOptimizationSuggestion,

  // Payment UI Types (Day 16 Phase 3 Integration)
  PaymentStackParamList,
  PaymentNavigationProp,
  PaymentRouteProp,
  CrisisPerformanceMetrics,
  PerformanceViolation,
  SubscriptionTier,
  SubscriptionScreenProps,
  SubscriptionScreenState,
  SubscriptionScreenActions,
  PaymentMethodFormData,
  PaymentMethodScreenProps,
  PaymentMethodScreenState,
  PaymentMethodScreenActions,
  Transaction,
  BillingHistoryScreenProps,
  BillingHistoryScreenState,
  BillingHistoryScreenActions,
  SubscriptionChangeOption,
  PaymentSettingsScreenProps,
  PaymentSettingsScreenState,
  PaymentSettingsScreenActions,
  CrisisPaymentBannerProps,
  CrisisPaymentBannerState,
  CrisisPaymentBannerActions,
  PaymentAnxietyDetectionProps,
  AnxietyIndicators,
  PaymentAnxietyDetectionState,
  PaymentAnxietyDetectionActions,
  PaymentUIError,
  PaymentUIPerformanceMetrics,
  PaymentUIPerformanceMonitor,
  PaymentUIState,
  PaymentUIActions,
  UseSubscriptionScreenHook,
  UsePaymentMethodScreenHook,
  UseBillingHistoryScreenHook,
  UsePaymentSettingsScreenHook,
  PaymentUIStoreIntegration,
  CrisisSafetyValidator,
  PaymentUIConfig,
  CompletePaymentUITypes,

  // Validation Schemas
  PaymentSchemas
} from './payment';

// Import comprehensive subscription types for Day 17 Phase 4 TypeScript integration
export type {
  // Core Subscription Types
  SubscriptionTier,
  TrialState,
  SubscriptionState,
  TrialManagement,

  // Feature Gate System
  FeatureGateConfig,
  FeatureAccessResult,
  FeatureGateWrapperProps,

  // Performance Monitoring
  SubscriptionPerformanceMetrics,

  // Error Handling
  SubscriptionError,

  // Store Integration
  SubscriptionStore,
  SubscriptionStoreState,
  SubscriptionStoreActions,
  UserStoreSubscriptionIntegration,

  // Navigation Integration
  SubscriptionNavigationParams,

  // Hook Types
  UseSubscriptionReturn,
  UseFeatureGateReturn,

  // Utility Types
  SubscriptionTierFeatures,
  FeatureValidationContext,
  CrisisFeatureOverride,

  // Type Guards
  isSubscriptionState,
  isFeatureAccessResult,
  isTrialState,
  isSubscriptionError
} from './subscription';

// Import enhanced subscription store types
export type {
  // Enhanced Store Types
  EnhancedSubscriptionStoreState,
  EnhancedSubscriptionStoreActions,
  EnhancedSubscriptionStore,

  // Store Configuration
  SubscriptionStoreConfig,
  SubscriptionStoreSelectors,
  SubscriptionStoreMiddleware,

  // Store Events
  SubscriptionStoreEvent,

  // Integration Types
  UserStoreSubscriptionSlice,

  // Performance Monitoring
  SubscriptionPerformanceMonitor,

  // Store Utilities
  StoreActionParams,
  StoreActionReturn,

  // Type Guards
  isEnhancedSubscriptionStore
} from './subscription-store';

// Import subscription hook types
export type {
  // Core Hook Types
  UseSubscriptionHookOptions,
  UseSubscriptionHookReturn,
  UseFeatureGateHookOptions,
  UseFeatureGateHookReturn,

  // Specialized Hook Types
  UseMultipleFeatureGatesHookOptions,
  UseMultipleFeatureGatesHookReturn,
  UseTrialHookOptions,
  UseTrialHookReturn,
  UseSubscriptionPerformanceHookOptions,
  UseSubscriptionPerformanceHookReturn,
  UseFeatureFlagsHookOptions,
  UseFeatureFlagsHookReturn,
  UseCrisisModeHookOptions,
  UseCrisisModeHookReturn,

  // Hook Error and Performance Types
  SubscriptionHookError,
  HookPerformanceMetrics,
  SubscriptionHookContext,

  // Hook Utility Types
  HookRefreshFunction,
  HookValidationFunction,
  HookErrorHandler,
  HookPerformanceCallback,

  // Hook Type Guards
  isUseSubscriptionReturn,
  isUseFeatureGateReturn
} from './subscription-hooks';

// Import subscription component types
export type {
  // Main Component Props
  FeatureGateWrapperProps as EnhancedFeatureGateWrapperProps,
  SubscriptionCardProps,
  TrialCountdownProps,
  FeatureListProps,
  SubscriptionTierSelectorProps,
  UpgradePromptProps,
  PaymentFormProps as EnhancedPaymentFormProps,
  CrisisSubscriptionBannerProps,
  SubscriptionSettingsProps,
  SubscriptionPerformanceMonitorProps,

  // Sub-Component Props
  FeatureGateLoadingProps,
  FeatureGateErrorProps,
  FeatureGateUpgradeProps,
  FeatureGateCrisisProps,
  FeatureListItemProps,
  TierCardProps,

  // Component State and Actions
  SubscriptionComponentState,
  SubscriptionComponentActions,
  BaseSubscriptionComponentProps,

  // Theme and Styling
  SubscriptionTheme,
  SubscriptionAnimations,
  SubscriptionAccessibility
} from './subscription-components';

// Import comprehensive webhook types for Day 18 integration
export type {
  // Core Webhook Types
  WebhookEvent,
  WebhookEventType,
  SubscriptionWebhookData,
  InvoiceWebhookData,
  WebhookProcessingResult,

  // Webhook Infrastructure
  WebhookConnectionStatus,
  WebhookMetrics,
  WebhookQueueItem,
  WebhookConfig,
  WebhookSubscriptionState,

  // Crisis and Clinical Webhook Types
  CrisisWebhookOverride,
  PaymentWebhookContext,
  ClinicalWebhookRequirements,
  ClinicalWebhookEvent,

  // HIPAA Compliance
  HIPAAWebhookLog,
  WebhookSecurityValidation,

  // Handler Types
  WebhookEventHandler,

  // Schemas for Runtime Validation
  WebhookEventSchema,
  SubscriptionWebhookDataSchema,
  InvoiceWebhookDataSchema,
  WebhookProcessingResultSchema,
  WebhookSecurityValidationSchema
} from './webhook';

// Import comprehensive orchestration types for P0-CLOUD Platform Infrastructure
export type {
  // Sync Orchestration Types
  OrchestrationPriority,
  OrchestrationOperation,
  OrchestrationQueue,
  OrchestrationEngine,
  OrchestrationEngineState,
  OrchestrationEngineActions,
  OrchestrationEngineConfig,
  ORCHESTRATION_CONSTANTS,
  isOrchestrationOperation,
  isOrchestrationQueue,
  isOrchestrationEngineState
} from './orchestration/sync-orchestration-types';

// Import comprehensive conflict resolution types
export type {
  // Conflict Resolution Types
  ConflictType,
  ConflictDescriptor,
  ConflictResolutionPriority,
  AIConflictAnalysis,
  AIResolutionResult,
  CrisisSafeConflictHandling,
  CrisisConflictResolution,
  CrossDeviceConflictCoordination,
  ConflictResolutionService,
  ConflictResolutionState,
  ConflictResolutionActions,
  ConflictResolutionConfig,
  CONFLICT_RESOLUTION_CONSTANTS,
  isConflictDescriptor,
  isAIConflictAnalysis,
  isCrisisConflictResolution
} from './orchestration/conflict-resolution-types';

// Import cross-device sync coordination types
export type {
  // Cross-Device Sync Types
  DeviceCapabilities,
  DeviceRegistry,
  TherapeuticSessionCoordination,
  OfflineDeviceState,
  OnlineReconciliationProcess,
  CrossDeviceSyncService,
  CrossDeviceSyncState,
  CrossDeviceSyncActions,
  CrossDeviceSyncConfig,
  CROSS_DEVICE_CONSTANTS,
  isDeviceCapabilities,
  isTherapeuticSessionCoordination,
  isOfflineDeviceState
} from './orchestration/cross-device-sync-types';

// Import performance monitoring types
export type {
  // Performance Monitoring Types
  PerformanceMetricCategory,
  PerformanceAlertLevel,
  PerformanceMetric,
  PerformanceSession,
  PerformanceSummary,
  PerformanceAlert,
  PerformanceMonitorService,
  PerformanceMonitorState,
  PerformanceMonitorActions,
  PerformanceMonitorConfig,
  PERFORMANCE_CONSTANTS,
  isPerformanceMetric,
  isPerformanceSession,
  isPerformanceAlert
} from './orchestration/performance-monitoring-types';

// Import enhanced store integration types
export type {
  // Enhanced Store Integration Types
  StoreMetadata,
  StoreOperationContext,
  OrchestrationIntegratedStore,
  OrchestrationIntegratedStoreState,
  OrchestrationIntegratedStoreActions,
  UserStoreOrchestrationIntegration,
  AssessmentStoreOrchestrationIntegration,
  CheckInStoreOrchestrationIntegration,
  SubscriptionStoreOrchestrationIntegration,
  PaymentStoreOrchestrationIntegration,
  CrossStoreCoordinationEvent,
  CrossStoreCoordinationResult,
  EnhancedStoreConfig,
  ENHANCED_STORE_CONSTANTS,
  isStoreMetadata,
  isStoreOperationContext,
  isCrossStoreCoordinationEvent
} from './integration/enhanced-store-types';

// Import payment-aware sync types
export type {
  // Payment-Aware Sync Types
  SyncQuotaManagement,
  PaymentSyncIntegration,
  CrisisPaymentOverride,
  GracePeriodManagement,
  PaymentAwareSyncService,
  PaymentAwareSyncState,
  PaymentAwareSyncActions,
  PaymentAwareSyncConfig,
  PAYMENT_SYNC_CONSTANTS,
  isSyncQuotaManagement,
  isCrisisPaymentOverride,
  isGracePeriodManagement
} from './integration/payment-aware-sync-types';

// Import crisis safety integration types
export type {
  // Crisis Safety Types
  CrisisSeverity,
  CrisisDetectionSource,
  CrisisEvent,
  EmergencyEscalation,
  SafetyProtocol,
  EmergencyDataAccess,
  CrisisSafetyService,
  CrisisSafetyState,
  CrisisSafetyActions,
  CrisisSafetyConfig,
  CRISIS_SAFETY_CONSTANTS,
  isCrisisEvent,
  isEmergencyEscalation,
  isSafetyProtocol
} from './integration/crisis-safety-types';

// Import therapeutic continuity types
export type {
  // Therapeutic Continuity Types
  TherapeuticSessionType,
  TherapeuticSessionState,
  ClinicalDataIntegrity,
  TherapeuticProgress,
  InterventionCoordination,
  TherapeuticContinuityService,
  TherapeuticContinuityState,
  TherapeuticContinuityActions,
  TherapeuticContinuityConfig,
  THERAPEUTIC_CONTINUITY_CONSTANTS,
  isTherapeuticSessionState,
  isClinicalDataIntegrity,
  isTherapeuticProgress
} from './integration/therapeutic-continuity-types';

// Import payment-aware sync context types for Day 18 P0-CLOUD Platform Infrastructure
export type {
  // Core Priority Queue System
  SyncPriorityLevel,
  SyncPriorityEntry,
  SyncPriorityQueueState,

  // Subscription Tier Sync Policies
  SubscriptionSyncPolicy,
  SyncTierEnforcementResult,

  // Crisis Safety Constraints
  CrisisSafetyConstraint,
  CrisisResponseValidator,

  // Cross-Device Coordination
  CrossDeviceSyncCoordinator,
  TherapeuticSessionPreservation,

  // HIPAA-Compliant Zero-PII Design
  ZeroPiiValidation,
  HipaaComplianceValidation,

  // Day 18 Webhook System Integration
  WebhookSyncIntegration,
  StoreCoordinationIntegration,

  // Core Sync Context Service
  SyncContextState,
  SyncContextActions,
  SyncContextService,
  SyncContextConfig,

  // Type Guards and Validators
  isSyncPriorityEntry,
  isCrisisSafetyConstraint,
  isSubscriptionSyncPolicy,
  isZeroPiiValidation,

  // Default Policies and Constants
  DEFAULT_SUBSCRIPTION_SYNC_POLICIES,
  SYNC_CONTEXT_CONSTANTS
} from './sync-context';

// Import comprehensive type-safe webhook handler types for Day 18 TypeScript implementation
export type {
  // Core Webhook Handler Types
  WebhookHandlerResult,
  WebhookPerformanceConstraints,
  CrisisSafeWebhookContext,

  // Individual Handler Types
  SubscriptionCreatedWebhookData,
  SubscriptionCreatedWebhookHandler,
  SubscriptionUpdatedWebhookData,
  SubscriptionUpdatedWebhookHandler,
  SubscriptionDeletedWebhookData,
  SubscriptionDeletedWebhookHandler,
  TrialEndingWebhookData,
  TrialEndingWebhookHandler,
  PaymentSucceededWebhookData,
  PaymentSucceededWebhookHandler,
  PaymentFailedWebhookData,
  PaymentFailedWebhookHandler,
  InvoicePaymentSucceededWebhookData,
  InvoicePaymentSucceededWebhookHandler,
  InvoicePaymentFailedWebhookData,
  InvoicePaymentFailedWebhookHandler,
  CustomerCreatedWebhookData,
  CustomerCreatedWebhookHandler,

  // Grace Period Management
  GracePeriodActivationParams,
  GracePeriodState,
  GracePeriodManager,

  // State Synchronization
  WebhookStateUpdateParams,
  WebhookStateSyncParams,
  WebhookStateSyncResult,

  // Registry and Integration Types
  WebhookHandlerMap,
  WebhookHandlerRegistry,
  BillingEventHandlerIntegration,
  PaymentStoreWebhookIntegration,

  // Error Handling and Recovery
  WebhookProcessingError,
  CrisisFallbackHandler,

  // Audit and Compliance
  WebhookAuditEntry,
  WebhookComplianceMonitor,

  // Validation Schemas
  WebhookHandlerSchemas
} from './webhook-handlers';

// Import comprehensive cross-device sync API types with crisis safety and compliance validation
export type {
  // Core Type Safety Foundations
  CrisisSeverityLevel,
  DataSensitivityLevel,
  SyncPriorityLevel,
  PerformanceSLA,

  // Crisis Safety Type System
  CrisisSafeData,
  EmergencyAccessConstraints,
  CrisisSafetyValidation,
  CrisisPriorityQueue,
  EmergencyContact,
  SafetyPlan,

  // Zero-Knowledge Encryption Types
  EncryptedDataWrapper,
  EncryptionMetadata,
  DataIntegrityProof,
  EncryptionContext,
  DeviceKey,
  DeviceTrustLevel,
  EmergencyDecryption,
  EmergencyTimeConstraints,

  // Multi-Tier Sync Types
  SyncOperation,
  SyncOperationType,
  SyncOperationMetadata,
  EntityType,
  SyncConstraints,
  NetworkRequirements,
  SecurityRequirements,
  SyncValidation,
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // WebSocket Real-Time Sync Types
  WebSocketSyncEvent,
  WebSocketEventType,
  RealTimeSyncClient,
  WebSocketEventHandler,
  WebSocketEventResponse,
  ConnectionStatus,

  // REST API Types
  RestSyncClient,
  SyncClientResult,
  SyncResultMetadata,
  BatchSyncResult,
  SingleSyncResult,
  FailedSyncOperation,
  BatchSyncSummary,

  // Conflict Resolution Types
  SyncConflict,
  ConflictType,
  ConflictMetadata,
  ConflictResolutionOption,
  ConflictResolutionStrategy,
  ConflictResolution,
  MergeInstructions,
  CustomMergeRule,
  ConflictResolutionResult,

  // Offline Queue Types
  OfflineQueue,
  QueuedOperation,
  PersistenceGuarantee,
  RetryPolicy,

  // Performance Monitoring Types
  SyncPerformanceMetrics,
  LatencyMetrics,
  ThroughputMetrics,
  ReliabilityMetrics,
  ResourceMetrics,
  ComplianceMetrics,
  NetworkAdaptation,
  NetworkQuality,
  AdaptiveStrategy,
  QualityIndicators,
  NetworkOptimization,

  // Battery and Resource Optimization
  BatteryOptimization,
  PowerState,
  OptimizationLevel,
  PowerRestriction,
  PowerAdaptation,

  // Alert and Notification Types
  PerformanceAlert,
  AlertType,
  AlertSeverity,
  ThresholdViolation,

  // Security and Compliance Validation
  SecurityValidation,
  SecurityCheck,
  ComplianceValidation,
  ComplianceControl,
  ComplianceViolation,
  ComplianceAttestation,

  // Audit and Logging Types
  AuditEntry,
  EmergencyAuditEntry,
  ComplianceMetadata,

  // Error Handling Types
  SyncError,
  SyncErrorCategory,
  ErrorContext,

  // Integration and Service Types
  ServiceIntegration,
  EncryptionServiceIntegration,
  StorageServiceIntegration,
  StorageOptions,
  StorageUsage,
  NetworkServiceIntegration,
  AuditServiceIntegration,
  AuditFilter,
  AuditExportOptions,
  MonitoringServiceIntegration,
  MonitoringDashboard,
  DashboardSummary,
  DashboardChart,
  ChartDataPoint,

  // Event System Types
  EventSystem,
  EventListener,
  Event,
  EventPriority,
  EventMetadata,
  EventResponse,
  EventOptions,
  EventSubscription,

  // Configuration Types
  SyncConfiguration,
  SyncSettings,
  PerformanceSettings,
  SecuritySettings,
  ComplianceSettings,
  MonitoringSettings,
  FeatureFlags,

  // Testing and Mock Types
  MockSyncClient,
  MockCall,
  SyncTestFixture,

  // Result and Status Types
  SyncStatus,
  HealthStatus,
  ComponentHealth,
  IntegrityCheckResult,
  IntegrityDetail,
  IntegrityValidationResult,
  ValidationSummary,
  PerformanceValidationResult,
  SLAComplianceResult,
  PerformanceRecommendation,
  ComplianceCheckResult,
  ComplianceControlResult,
  ComplianceRecommendation,
  ComplianceCertification,

  // Runtime Validation Schemas
  CrisisSafeDataSchema,
  SyncOperationSchema,

  // Type Guards and Utilities
  isCrisisSafeData,
  isSyncOperation,
  isEmergencyData,
  requiresCrisisResponseTime,
  isClinicalData,
  requiresCompliance,

  // Constants
  PERFORMANCE_SLAS,
  SYNC_DEFAULTS
} from './comprehensive-cross-device-sync';

// Import comprehensive cross-device sync UI types for type-safe component integration
export type {
  // Core UI Status and State Types
  SyncStatus as UISyncStatus,
  DeviceStatus,
  ConflictSeverity,
  SyncAnimationState,
  SyncProgress,

  // Sync Status Indicator Component Types
  SyncStatusIndicatorProps,
  SyncStatusIndicatorState,
  ComponentPerformanceMetrics,

  // Device Management Screen Types
  DeviceManagementScreenProps,
  DeviceInfo,
  DeviceRegistrationResult,
  DeviceManagementScreenState,
  DeviceRegistrationModalState,
  DeviceTrustModalState,

  // Sync Conflict Resolver Types
  SyncConflictResolverProps,
  UIConflict,
  TherapeuticImpact,
  UIConflictOption,
  ConflictPreviewData,
  DataPreview,
  FieldPreview,

  // Crisis Sync Badge Types
  CrisisSyncBadgeProps,
  CrisisSyncBadgeState,
  EmergencySyncOperation,

  // Sync Settings Panel Types
  SyncSettingsPanelProps,
  SyncUserSettings,
  DeviceCapabilities,
  NetworkPreferences,
  BatteryPreferences,
  PrivacyPreferences,
  TherapeuticSyncSettings,
  DiagnosticsResult,
  DeviceDiagnostics,
  NetworkDiagnostics,
  StorageDiagnostics,
  SyncDiagnostics,
  SecurityDiagnostics,
  PerformanceDiagnostics,
  DiagnosticRecommendation,

  // Hook Types for Component Integration
  UseSyncStatusResult,
  UseDeviceManagementResult,
  UseConflictResolutionResult,
  UseCrisisSyncResult,
  UseSyncSettingsResult,

  // Event Handler Types
  SyncEventHandlers,
  UserInteractionHandlers,

  // Navigation Types
  CrossDeviceSyncNavigationParams,
  SyncNavigationProp,

  // Theme Integration Types
  SyncTheme,
  SyncThemeColors,
  SyncTypography,
  SyncSpacing,
  SyncAnimations,
  SyncAccessibility,

  // Performance Optimization Types
  ComponentOptimization,
  ListOptimization,

  // Accessibility Compliance Types
  SyncAccessibilityCompliance,
  ContrastTestResult,

  // Error Boundary Types
  SyncErrorBoundaryProps,
  SyncErrorBoundaryState,

  // Testing Support Types
  SyncComponentTestHelpers,
  SyncMockDataGenerators,

  // Integration Types with Existing Stores
  UserStoreSyncIntegration,
  AssessmentStoreSyncIntegration,
  StoreSyncBridge,

  // UI Constants and Defaults
  SYNC_UI_DEFAULTS,
  CRISIS_RESPONSE_TIMES,
  SYNC_STATUS_COLORS
} from './cross-device-sync-ui';

// === PAYMENT ENHANCEMENT TYPES (PHASE 4.2A) ===

// Enhanced Pressable types for payment component migration
export type {
  // Core Payment Pressable Types
  PaymentPressableVariant,
  PaymentCrisisSafetyLevel,
  PaymentDataSensitivity,
  PaymentPressableProps,
  PaymentMethodPressableProps,
  SubscriptionTierPressableProps,
  CrisisPaymentOverridePressableProps,
  PaymentAnxietyInterventionPressableProps,
  PaymentPressableState,
  PaymentAnxietyDetection,
  PaymentPressablePerformanceMetrics,
  PaymentMethodStyleFunction,
  SubscriptionTierStyleFunction,
  CrisisOverrideStyleFunction,
  PaymentSafeRippleConfig,
  TherapeuticPaymentRipple
} from './payment-pressable-enhanced';

// Enhanced interaction types for migrated payment components
export type {
  // Component Interaction Types
  PaymentMethodScreenInteractions,
  PaymentAnxietyDetectionInteractions,
  PaymentSettingsScreenInteractions,

  // Validation Types
  PaymentMethodSelectionValidation,
  PaymentMethodFormValidation,
  PciComplianceValidation,
  TherapeuticBreathingValidation,
  TherapeuticSubscriptionImpact,

  // Action and Performance Types
  PaymentMethodAction,
  PaymentInteractionPerformanceMetrics,
  PaymentInteractionError,
  PaymentInteractionRecoveryStrategy
} from './payment-interaction-enhanced';

// Enhanced crisis detection types for payment anxiety algorithms
export type {
  // Core Anxiety Detection Types
  PaymentAnxietySeverity,
  FinancialStressIndicators,
  PaymentAnxietyAlgorithmConfig,
  PaymentAnxietyDetectionState,
  PaymentAnxietyRiskFactors,
  PaymentAnxietyInterventionStatus,

  // Event and Intervention Types
  PaymentAnxietyEvent,
  PaymentAnxietyEventType,
  PaymentAnxietyIntervention,
  PaymentAnxietyInterventionType,

  // Performance and Validation Types
  PaymentAnxietyPerformanceMetrics,
  PaymentAnxietyAlgorithmValidation
} from './payment-crisis-detection-enhanced';

// Enhanced HIPAA compliance types for financial + mental health data intersection
export type {
  // Data Classification and Compliance
  PaymentHIPAADataClassification,
  PaymentHIPAAComplianceLevel,
  PaymentHIPAADataPermissions,
  PaymentRelatedPHI,
  FinancialMentalHealthData,

  // Consent and Authorization
  PaymentMentalHealthConsent,
  EmergencyPaymentOverrideAuthorization,

  // Audit and Monitoring
  PaymentHIPAAAuditEntry,
  PaymentHIPAAComplianceMonitor,
  PaymentHIPAAViolation,
  PaymentHIPAAViolationType,
  PaymentHIPAAWarning,
  PaymentHIPAARecommendation
} from './payment-hipaa-compliance-enhanced';

// Enhanced payment Pressable factory functions and validators
export {
  // Type Guards
  isPaymentPressableProps,
  isPaymentMethodPressableProps,
  isCrisisOverridePressableProps,
  validatePaymentCrisisCompliance,
  validatePaymentHIPAACompliance,

  // Factory Functions
  createPaymentMethodPressableProps,
  createCrisisPaymentOverridePressableProps,

  // Constants
  PAYMENT_PRESSABLE_CONSTANTS
} from './payment-pressable-enhanced';

export {
  // Interaction Type Guards
  isPaymentMethodSelectionValidation,
  isPciComplianceValidation,
  isTherapeuticSubscriptionImpact,
  isPaymentInteractionError,

  // Factory Functions
  createPaymentMethodSelectionProps,
  createCrisisPaymentSupportProps,

  // Constants
  PAYMENT_INTERACTION_CONSTANTS
} from './payment-interaction-enhanced';

export {
  // Crisis Detection Type Guards
  isPaymentAnxietySeverity,
  isFinancialStressIndicators,
  isPaymentAnxietyEvent,
  isPaymentAnxietyIntervention,

  // Validation Functions
  validateAnxietyCrisisTiming,
  validateTherapeuticAccuracy,

  // Factory Functions
  createPaymentAnxietyDetectionConfig,
  createFinancialStressIndicators,

  // Constants
  PAYMENT_ANXIETY_CONSTANTS
} from './payment-crisis-detection-enhanced';

export {
  // HIPAA Compliance Type Guards
  isPaymentHIPAADataClassification,
  isPaymentMentalHealthConsent,
  isPaymentHIPAAAuditEntry,

  // Validation Functions
  validatePaymentMentalHealthHIPAACompliance,
  validateEmergencyOverrideAuthorization,

  // Factory Functions
  createFinancialMentalHealthData,
  createEmergencyPaymentOverrideAuthorization,

  // Constants
  PAYMENT_HIPAA_CONSTANTS
} from './payment-hipaa-compliance-enhanced';

// === CLINICAL TYPE SAFETY SYSTEM (PHASE 4.2B) ===

// Core clinical component type safety with crisis response timing validation
export type {
  // Crisis Response Timing Types (<200ms enforcement)
  CrisisResponseTiming,
  CrisisResponseTimingConstraints,
  CrisisResponseTimingValidation,
  CrisisResponsePerformanceMetrics,
  EmergencyResponseTiming,

  // Clinical Accuracy Types (100% accuracy requirement)
  ClinicalAccuracyValidation,
  ClinicalAccuracyMetrics,
  AssessmentAccuracyValidation,
  PHQ9AccuracyValidation,
  GAD7AccuracyValidation,
  ClinicalCalculationValidation,

  // MBCT Compliance Types
  MBCTComplianceValidation,
  MBCTTherapeuticValidation,
  MBCTInteractionValidation,
  TherapeuticTimingValidation,
  MindfulnessValidation,

  // Emergency Protocol Types
  EmergencyProtocolValidation,
  EmergencyContactValidation,
  HotlineIntegrationValidation,
  CrisisDetectionValidation,
  SafetyProtocolValidation,

  // Accessibility Compliance Types (WCAG AA enforcement)
  AccessibilityComplianceValidation,
  WCAGAAValidation,
  AccessibilityPerformanceValidation,
  InclusiveDesignValidation,
  CrisisAccessibilityValidation
} from './clinical-component-types';

// Enhanced clinical assessment types with strict validation
export type {
  // PHQ-9 Assessment Types
  PHQ9Question,
  PHQ9Response,
  PHQ9Score,
  PHQ9Severity,
  PHQ9ScoreRange,
  PHQ9CrisisThreshold,
  PHQ9ValidationResult,

  // GAD-7 Assessment Types
  GAD7Question,
  GAD7Response,
  GAD7Score,
  GAD7Severity,
  GAD7ScoreRange,
  GAD7CrisisThreshold,
  GAD7ValidationResult,

  // Assessment Processing Types
  AssessmentProcessor,
  AssessmentValidator,
  ClinicalCalculationEngine,
  AssessmentResultProcessor,
  CrisisDetectionProcessor,

  // Assessment Performance Metrics
  AssessmentPerformanceMetrics,
  CalculationPerformanceMetrics,
  ValidationPerformanceMetrics
} from './enhanced-clinical-assessment-types';

// MBCT therapeutic interaction types
export type {
  // Core MBCT Types
  MBCTTherapeuticInteraction,
  MBCTInteractionType,
  MBCTComplianceLevel,
  MBCTValidationResult,

  // Mindfulness Practice Types
  MindfulnessPractice,
  MindfulnessPracticeType,
  MindfulnessValidation,
  BreathingExerciseValidation,

  // Cognitive Therapy Types
  CognitiveTherapyInteraction,
  CognitiveTherapyValidation,
  ThoughtPatternAnalysis,
  CognitiveRestructuring,

  // Therapeutic Timing Types
  TherapeuticTiming,
  TherapeuticTimingValidation,
  BreathingTimingValidation,
  SessionTimingValidation,

  // Integration Types
  MBCTIntegrationValidation,
  TherapeuticDataIntegration,
  MBCTComplianceMonitor
} from './mbct-therapeutic-interaction-types';

// Emergency protocol safety types with zero false negative tolerance
export type {
  // Crisis Detection System
  CrisisDetectionSystem,
  CrisisDetectionResult,
  CrisisDetectionMetrics,
  FalseNegativeValidation,
  CrisisDetectionPerformance,

  // Emergency Response Types
  EmergencyResponse,
  EmergencyResponseType,
  EmergencyResponseTiming,
  EmergencyContactSystem,
  EmergencyProtocol,

  // Hotline Integration Types
  HotlineIntegration,
  HotlineValidation,
  HotlineContactValidation,
  EmergencyCallValidation,

  // Safety Protocol Types
  SafetyProtocol,
  SafetyProtocolValidation,
  SafetyMeasureValidation,
  EmergencyDataAccess,

  // Emergency Performance Types
  EmergencyPerformanceMetrics,
  EmergencyResponseMetrics,
  CrisisTimingMetrics
} from './emergency-protocol-safety-types';

// WCAG accessibility compliance types with enhanced crisis requirements
export type {
  // Core WCAG Types
  WCAGComplianceLevel,
  WCAGValidationResult,
  WCAGAACompliance,
  AccessibilityStandard,
  AccessibilityValidation,

  // Crisis Accessibility Types
  CrisisAccessibilityRequirements,
  CrisisUIValidation,
  EmergencyAccessibilityValidation,
  CrisisNavigationValidation,

  // Enhanced Accessibility Types
  ContrastValidation,
  SizeValidation,
  FocusValidation,
  ScreenReaderValidation,
  KeyboardNavigationValidation,

  // Accessibility Performance Types
  AccessibilityPerformanceValidation,
  AccessibilityMetrics,
  AccessibilityComplianceMetrics,

  // Inclusive Design Types
  InclusiveDesignValidation,
  CognitiveAccessibilityValidation,
  MotorAccessibilityValidation,
  VisualAccessibilityValidation,
  AuditoryAccessibilityValidation
} from './wcag-accessibility-compliance-types';

// Comprehensive clinical component validation system
export type {
  // Master Clinical Validation Types
  ClinicalComponentValidation,
  ClinicalComponentConfig,
  ClinicalValidationHierarchy,
  ClinicalValidationResult,
  ClinicalValidationSummary,

  // Component Specific Validations
  OnboardingCrisisButtonValidation,
  OnboardingCrisisAlertValidation,
  ClinicalCarouselValidation,
  PHQAssessmentPreviewValidation,
  ClinicalPaneValidation,

  // Production Readiness Types
  ProductionReadinessValidation,
  ClinicalProductionConfig,
  ClinicalDeploymentValidation,
  ClinicalPerformanceValidation,

  // Integration Validation Types
  ClinicalIntegrationValidation,
  ClinicalStoreIntegration,
  ClinicalNavigationIntegration,
  ClinicalErrorHandlingIntegration,

  // Master Validation System
  ClinicalMasterValidator,
  ClinicalValidationEngine,
  ClinicalComplianceEngine,
  ClinicalSafetyValidator
} from './comprehensive-clinical-component-types';

// Clinical type safety validation utilities and constants
export {
  // Type Guards
  isCrisisResponseTiming,
  isClinicalAccuracyValidation,
  isMBCTCompliant,
  isEmergencyProtocolValid,
  isWCAGAACompliant,

  // Validation Functions
  validateCrisisResponseTiming,
  validateClinicalAccuracy,
  validateMBCTCompliance,
  validateEmergencyProtocol,
  validateAccessibilityCompliance,

  // Factory Functions
  createCrisisResponseConfig,
  createClinicalAccuracyValidator,
  createMBCTValidator,
  createEmergencyProtocolValidator,
  createAccessibilityValidator,

  // Constants
  CLINICAL_TYPE_SAFETY_CONSTANTS,
  CRISIS_RESPONSE_CONSTANTS,
  CLINICAL_ACCURACY_CONSTANTS,
  MBCT_COMPLIANCE_CONSTANTS,
  EMERGENCY_PROTOCOL_CONSTANTS,
  ACCESSIBILITY_COMPLIANCE_CONSTANTS
} from './comprehensive-clinical-component-types';

// === NEW ARCHITECTURE ENHANCED TYPES ===

// New Architecture enhancements for React Native Pressable migration
export type * from './new-architecture-enhanced';
export type * from './new-architecture-types';

// Enhanced type utilities for Button components
export {
  // Enhanced type guards for Button components
  isTherapeuticStyleFunction,
  isCrisisOptimized,
  validatePerformanceConfig,
  createCrisisButtonConfig,
  createTherapeuticAnimation,

  // Enhanced constants
  NEW_ARCHITECTURE_CONSTANTS
} from './new-architecture-enhanced';

// === PERFORMANCE MONITORING SYSTEM TYPES (PHASE 4.3B) ===

// Core performance monitoring types with healthcare compliance
export type {
  // Core Performance Monitoring Types
  PerformanceSLA,
  CrisisResponseTime,
  TherapeuticTimingAccuracy,
  PerformanceOverhead,
  MemoryUsage,
  FrameRate,

  // Performance Monitoring Coordinator Types
  PerformanceMonitoringPriority,
  PerformanceMetricCategory,
  PerformanceAlertLevel,
  PerformanceMetric,
  PerformanceMonitoringSession,
  PerformanceAlert,
  SLAViolation,

  // Healthcare Compliance Monitor Types
  HealthcareComplianceMonitor,
  ComplianceViolation,
  ComplianceRecommendation,

  // Real-Time Analytics Engine Types
  RealTimeAnalyticsConfig,
  RealTimeAnalyticsEngine,
  AnalyticsProcessingResult,

  // Observer/Decorator/Strategy Pattern Types
  PerformanceObserver,
  HealthcareContext,
  PerformanceDecorator,
  HealthcareCompliantComponent,
  ComplianceValidationResult,
  PerformanceMonitoringStrategy,

  // TurboStore Manager Integration Types
  TurboStorePerformanceMetrics,
  TurboModuleMonitor,
  TurboStoreOperation,
  TurboStorePerformanceReport,

  // Migration Validation Types
  MigrationPerformanceBaseline,
  MigrationValidationResult,
  MigrationBenefitsValidator,
  PerformanceRegression,
  MigrationComprehensiveReport,

  // Constants and Type System
  PerformanceMonitoringTypes
} from './performance-monitoring-types';

// TurboModule performance integration types with Phase 4.3A compatibility
export type {
  // TurboModule Core Types
  TurboModuleCallLatency,
  TurboModuleMemoryFootprint,
  TurboModuleOperationType,
  TurboModulePerformanceTier,

  // TurboStore Manager Integration Types
  TurboStoreOperation,
  TurboStorePerformanceMetrics,
  TurboStoreHealthStatus,
  TurboStoreIssue,
  TurboStoreSLAViolation,

  // AsyncStorage TurboModule Types
  AsyncStorageTurboModuleOperation,
  AsyncStoragePerformanceMonitor,
  AsyncStoragePerformanceReport,

  // Calculation TurboModule Types
  ClinicalCalculationType,
  CalculationTurboModuleOperation,
  CalculationPerformanceValidator,
  CalculationValidationResult,
  CalculationIssue,
  CalculationPerformanceReport,

  // Crisis-First Optimization Types
  CrisisOptimizationStrategy,
  CrisisOptimizationMethod,
  CrisisOptimizationResult,
  OptimizationRegressionTest,

  // TurboModule Monitoring Dashboard Types
  TurboModuleMonitoringDashboard,
  TurboModuleMonitoringEntry,

  // Constants and Type System
  TurboModulePerformanceTypes
} from './turbo-module-performance-types';

// Comprehensive monitoring implementation types
export type {
  // Monitoring Coordinator Implementation Types
  PerformanceMonitoringCoordinator,
  MonitoringCoordinatorConfig,
  MonitoringStorageConfig,
  MonitoringIntegrationConfig,

  // Performance Monitor Implementations
  PerformanceMonitor,
  PerformanceMonitorConfig,
  AlertThresholds,
  HealthcareRequirements,
  RetentionPolicy,
  ValidationRules,
  ValidationRule,

  // Specialized Monitor Implementations
  CrisisResponseMonitor,
  TherapeuticPerformanceMonitor,
  ClinicalAccuracyMonitor,
  MemoryPerformanceMonitor,

  // Alert Management Types
  AlertManager,
  AlertEscalationRule,
  AlertDestination,
  EscalationCondition,
  NotificationChannel,
  NotificationChannelConfig,

  // SLA Management Types
  SLAManager,
  SLADefinition,
  SLAEvaluationResult,
  SLAComplianceRecord,

  // Healthcare Compliance Types
  HealthcareComplianceResult,
  HealthcareComplianceStatus,
  ComplianceViolation,
  ComplianceRecommendation,

  // Reporting and Analytics Types
  PerformanceReport,
  PerformanceReportMetrics,
  HealthcareMetrics,
  TimeWindow,
  RiskAssessment,
  ImprovementArea,
  ActionItem,

  // Utility Types
  RiskFactor,
  MitigationStrategy,
  RetryPolicy,
  RateLimit,
  EncryptionConfig,
  MonitoringDashboardData,
  SystemHealth,
  PerformanceSummary,
  AlertSummary,
  SLAStatus,
  SystemIssue,

  // Type System Collection
  MonitoringImplementationTypes
} from './monitoring-implementation-types';

// Performance monitoring type guards and factory functions
export {
  // Core Type Guards
  isCrisisResponseTime,
  isTherapeuticTimingAccuracy,
  isPerformanceOverhead,
  isHealthcareContext,
  isPerformanceMetric,

  // Factory Functions
  createCrisisResponseTime,
  createTherapeuticTimingAccuracy,
  createPerformanceOverhead,
  createHealthcareContext,

  // Performance Monitoring Constants
  PERFORMANCE_MONITORING_CONSTANTS,
  HEALTHCARE_COMPLIANCE_LEVELS,
  PERFORMANCE_PRIORITIES
} from './performance-monitoring-types';

// TurboModule performance type guards and factory functions
export {
  // TurboModule Type Guards
  isTurboModuleCallLatency,
  isTurboStoreOperation,
  isCalculationTurboModuleOperation,
  isTurboModuleHealthcareCompliant,

  // TurboModule Factory Functions
  createTurboModuleCallLatency,
  createTurboStoreOperation,
  createCalculationTurboModuleOperation,

  // TurboModule Performance Constants
  TURBO_MODULE_PERFORMANCE_CONSTANTS,
  TURBO_MODULE_OPERATION_PRIORITIES,
  TURBO_MODULE_HEALTHCARE_COMPLIANCE
} from './turbo-module-performance-types';