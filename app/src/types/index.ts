/**
 * Being. Data Models - Exact implementation from TRD v2.0
 * These interfaces must match the prototype data structure precisely
 */

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