# TypeScript Interfaces for Webhook Integration

## Overview

This document provides comprehensive TypeScript interface definitions for the Day 18 webhook integration system. All interfaces are designed with strict type safety, runtime validation, and crisis safety protocols in mind.

## Core Webhook Interfaces

### WebhookEvent

Base interface for all incoming webhook events with runtime validation.

```typescript
interface WebhookEvent {
  id: string;                    // Unique event identifier from provider
  type: string;                  // Event type (e.g., 'customer.subscription.updated')
  data: {
    object: Record<string, any>; // Event payload data
  };
  created: number;               // Unix timestamp of event creation
  livemode: boolean;             // true for production, false for test
  pending_webhooks: number;      // Number of pending webhooks in queue
  request: {
    id: string | null;           // Request ID that triggered the event
    idempotency_key: string | null; // Idempotency key for request
  };
  api_version: string;           // API version used for the event
}

// Zod schema for runtime validation
export const WebhookEventSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  type: z.string().min(1, "Event type is required"),
  data: z.object({
    object: z.record(z.any())
  }),
  created: z.number().positive("Created timestamp must be positive"),
  livemode: z.boolean(),
  pending_webhooks: z.number().min(0, "Pending webhooks must be non-negative"),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable()
  }),
  api_version: z.string().min(1, "API version is required")
});

// Type guard function
export function isValidWebhookEvent(event: unknown): event is WebhookEvent {
  try {
    WebhookEventSchema.parse(event);
    return true;
  } catch {
    return false;
  }
}
```

### WebhookHandlerResult

Result interface for webhook processing with performance metrics and crisis safety information.

```typescript
interface WebhookHandlerResult {
  success: boolean;              // Processing success status
  eventId: string;               // Original event ID
  eventType: string;             // Type of event processed
  processingTime: number;        // Processing duration in milliseconds

  // Optional subscription state update
  subscriptionUpdate?: SubscriptionUpdate;

  // Grace period management
  gracePeriodActivated?: boolean;
  gracePeriodReason?: GracePeriodReason;

  // Crisis override information
  crisisOverride?: boolean;
  crisisReason?: string;

  // Error details for failed processing
  errorDetails?: WebhookErrorDetails;

  // Performance and compliance metrics
  performanceMetrics?: WebhookPerformanceMetrics;

  // Audit trail information
  auditTrail?: WebhookAuditTrail;
}

type GracePeriodReason =
  | 'payment_issue'
  | 'crisis_override'
  | 'technical_difficulty'
  | 'subscription_canceled'
  | 'payment_failed';

interface WebhookErrorDetails {
  code: string;                  // Error code for categorization
  message: string;               // Human-readable error message
  retryable: boolean;            // Whether the operation can be retried
  crisisImpact: CrisisImpactLevel; // Impact on crisis functionality
  therapeuticGuidance?: string;  // Guidance for therapeutic messaging
  recoveryActions?: string[];    // Suggested recovery actions
}

type CrisisImpactLevel = 'none' | 'minimal' | 'significant' | 'critical';

interface WebhookPerformanceMetrics {
  startTime: number;             // Processing start timestamp
  endTime: number;               // Processing end timestamp
  duration: number;              // Total processing duration
  crisisCompliant: boolean;      // Whether response met crisis time limits
  securityValidationTime: number; // Time spent on security validation
  stateUpdateTime: number;       // Time spent updating state
  auditTime: number;             // Time spent on audit logging
}

interface WebhookAuditTrail {
  eventReceived: string;         // Timestamp when event was received
  validationCompleted: string;   // Timestamp when validation completed
  processingStarted: string;     // Timestamp when processing started
  stateUpdated: string;          // Timestamp when state was updated
  processingCompleted: string;   // Timestamp when processing completed
  auditLogged: string;           // Timestamp when audit was logged
  securityChecks: SecurityCheckResult[]; // Security validation results
  stateChanges: StateChangeRecord[];     // Record of state changes
}
```

### CrisisSafeWebhookContext

Context interface for crisis-aware webhook processing with comprehensive safety information.

```typescript
interface CrisisSafeWebhookContext {
  // Crisis detection state
  crisisDetected: boolean;       // Whether crisis is currently detected
  emergencyBypass: boolean;      // Whether emergency bypass is active

  // User context
  customerId: string;            // Customer/user identifier
  userId?: string;               // Internal user identifier

  // Crisis response configuration
  responseTimeLimit: number;     // Maximum response time in milliseconds
  therapeuticContinuity: boolean; // Maintain therapeutic access
  gracePeriodRequired: boolean;  // Whether grace period should be activated

  // Crisis metadata
  crisisType?: CrisisType;       // Type of crisis detected
  crisisSeverity?: CrisisSeverity; // Severity level of crisis
  crisisStartTime?: string;      // ISO timestamp when crisis was detected
  crisisSource?: CrisisSource;   // Source that triggered crisis detection

  // User context for crisis response
  userContext?: CrisisUserContext;

  // Processing context
  processingContext?: WebhookProcessingContext;
}

type CrisisType = 'clinical' | 'payment' | 'system' | 'user_reported';

type CrisisSeverity = 'low' | 'moderate' | 'high' | 'critical';

type CrisisSource =
  | 'assessment_score'     // PHQ-9/GAD-7 threshold exceeded
  | 'user_indication'      // User directly indicated crisis
  | 'payment_disruption'   // Payment issue during vulnerable period
  | 'system_failure'       // System failure affecting crisis tools
  | 'external_trigger';    // External crisis detection system

interface CrisisUserContext {
  currentProgram?: string;       // Current therapeutic program
  lastActivity?: string;         // Last app activity timestamp
  assessmentHistory?: AssessmentRecord[]; // Recent assessment history
  crisisContactConsent?: boolean; // Consent to contact emergency contacts
  emergencyContacts?: EmergencyContact[]; // User's emergency contacts
  safetyPlan?: SafetyPlan;       // User's safety plan
  therapeuticPreferences?: TherapeuticPreferences; // User's preferences
}

interface WebhookProcessingContext {
  requestId: string;             // Unique request identifier
  clientIP?: string;             // Client IP address (for security)
  userAgent?: string;            // User agent string
  processingNode?: string;       // Processing node identifier
  retryAttempt?: number;         // Current retry attempt number
  batchId?: string;              // Batch identifier if batch processing
}
```

## Payment-Specific Interfaces

### PaymentState

Comprehensive payment state interface with webhook integration and crisis safety.

```typescript
interface PaymentState {
  // Core subscription state
  subscriptionStatus: SubscriptionStatus;
  subscriptionId: string | null;
  customerId: string | null;

  // Payment method information
  paymentMethod: PaymentMethod | null;
  defaultPaymentMethodId: string | null;

  // Subscription plan details
  subscriptionPlan: SubscriptionPlan | null;

  // Billing information
  billingInfo: BillingInfo | null;

  // Application state
  isLoading: boolean;
  error: PaymentError | null;
  lastUpdated: string | null;

  // Crisis safety state
  gracePeriodStatus: GracePeriodStatus | null;
  crisisOverride: CrisisPaymentOverride | null;
  emergencyAccess: EmergencyAccessState | null;

  // Feature access based on payment state
  featureAccess: FeatureAccessMap;
}

type SubscriptionStatus =
  | 'none'          // No active subscription
  | 'active'        // Active subscription with valid payment
  | 'past_due'      // Payment failed, in grace period
  | 'canceled'      // Subscription canceled
  | 'unpaid'        // Payment failed, beyond grace period
  | 'grace_period'  // In therapeutic grace period
  | 'crisis_access'; // Emergency crisis access activated

interface PaymentMethod {
  id: string;                    // Payment method identifier
  type: PaymentMethodType;       // Type of payment method

  // Card information (if applicable)
  last4?: string;                // Last 4 digits of card
  brand?: string;                // Card brand (Visa, Mastercard, etc.)
  expiryMonth?: number;          // Expiry month (1-12)
  expiryYear?: number;           // Expiry year (full year)

  // Bank account information (if applicable)
  bankName?: string;             // Bank name for ACH
  accountType?: 'checking' | 'savings'; // Account type for ACH

  // Metadata
  isDefault: boolean;            // Whether this is the default payment method
  createdAt: string;             // ISO timestamp when created
  lastUsed?: string;             // ISO timestamp when last used

  // Security and compliance
  encrypted: boolean;            // Whether data is encrypted at rest
  tokenized: boolean;            // Whether payment data is tokenized
}

type PaymentMethodType = 'card' | 'bank_account' | 'apple_pay' | 'google_pay';

interface SubscriptionPlan {
  id: string;                    // Plan identifier
  name: string;                  // Human-readable plan name
  description?: string;          // Plan description

  // Pricing information
  price: number;                 // Price in cents
  currency: string;              // Currency code (USD, EUR, etc.)
  interval: BillingInterval;     // Billing frequency
  intervalCount: number;         // Number of intervals (e.g., 3 months)

  // Feature access
  features: PlanFeature[];       // Features included in plan
  featureAccess: FeatureAccessMap; // Feature access configuration

  // Therapeutic features
  therapeuticAccess: boolean;    // Access to therapeutic content
  crisisSupport: boolean;        // Access to crisis support features
  assessmentAccess: boolean;     // Access to PHQ-9/GAD-7 assessments
  progressTracking: boolean;     // Access to progress tracking

  // Plan metadata
  tier: PlanTier;                // Plan tier level
  deprecated: boolean;           // Whether plan is deprecated
  trialPeriodDays?: number;      // Trial period duration
  gracePeriodDays: number;       // Grace period duration for payment failures
}

type BillingInterval = 'day' | 'week' | 'month' | 'year';

type PlanTier = 'free' | 'basic' | 'premium' | 'crisis_access' | 'emergency';

interface PlanFeature {
  id: string;                    // Feature identifier
  name: string;                  // Feature name
  description?: string;          // Feature description
  category: FeatureCategory;     // Feature category
  enabled: boolean;              // Whether feature is enabled
  limits?: FeatureLimits;        // Usage limits for feature
}

type FeatureCategory =
  | 'therapeutic'     // Core therapeutic features
  | 'assessment'      // Assessment and evaluation tools
  | 'crisis'          // Crisis intervention features
  | 'progress'        // Progress tracking and analytics
  | 'social'          // Social and community features
  | 'premium';        // Premium-only features

interface FeatureLimits {
  dailyLimit?: number;           // Daily usage limit
  monthlyLimit?: number;         // Monthly usage limit
  concurrentLimit?: number;      // Concurrent usage limit
  storageLimit?: number;         // Storage limit in bytes
}

type FeatureAccessMap = Record<string, FeatureAccess>;

interface FeatureAccess {
  enabled: boolean;              // Whether feature is accessible
  reason?: string;               // Reason if not accessible
  upgradeRequired?: boolean;     // Whether upgrade is required
  gracePeriodAccess?: boolean;   // Available during grace period
  crisisAccess?: boolean;        // Available during crisis
  emergencyAccess?: boolean;     // Available during emergency
}
```

### GracePeriodStatus

Comprehensive grace period management with therapeutic considerations.

```typescript
interface GracePeriodStatus {
  // Grace period state
  active: boolean;               // Whether grace period is currently active

  // Timing information
  startDate: string;             // ISO timestamp when grace period started
  endDate: string;               // ISO timestamp when grace period ends
  remainingDays: number;         // Days remaining in grace period
  remainingHours: number;        // Hours remaining (for more precise tracking)

  // Grace period configuration
  reason: GracePeriodReason;     // Reason for grace period activation
  duration: number;              // Total duration in days
  extensionCount: number;        // Number of times extended
  maxExtensions: number;         // Maximum allowed extensions

  // Access permissions during grace period
  therapeuticAccess: boolean;    // Access to therapeutic features
  crisisAccess: boolean;         // Access to crisis support
  assessmentAccess: boolean;     // Access to assessments
  progressAccess: boolean;       // Access to progress tracking
  premiumAccess: boolean;        // Access to premium features

  // Messaging configuration
  therapeuticMessaging: boolean; // Use therapeutic messaging
  anxietyReducingLanguage: boolean; // Use anxiety-reducing language
  supportiveNotifications: boolean; // Send supportive notifications
  gentleReminders: boolean;      // Send gentle payment reminders

  // Crisis safety features
  crisisButtonEnabled: boolean;  // Crisis button remains enabled
  hotline988Enabled: boolean;    // 988 hotline access enabled
  emergencyContactEnabled: boolean; // Emergency contact access
  safetyPlanEnabled: boolean;    // Safety plan access

  // Financial support options
  hardshipSupport: boolean;      // Financial hardship support available
  paymentPlanAvailable: boolean; // Payment plan options available
  disabilitySupport: boolean;    // Disability accommodation available
  studentDiscount: boolean;      // Student discount available

  // Audit and compliance
  createdBy: string;             // Who/what created the grace period
  approvedBy?: string;           // Who approved extensions (if any)
  auditTrail: GracePeriodAuditEntry[]; // Audit trail of changes
  complianceNotes?: string;      // Compliance or clinical notes
}

interface GracePeriodAuditEntry {
  timestamp: string;             // ISO timestamp of action
  action: GracePeriodAction;     // Type of action taken
  performedBy: string;           // Who performed the action
  reason?: string;               // Reason for the action
  metadata?: Record<string, any>; // Additional metadata
}

type GracePeriodAction =
  | 'activated'       // Grace period activated
  | 'extended'        // Grace period extended
  | 'expired'         // Grace period expired naturally
  | 'terminated'      // Grace period terminated early
  | 'upgraded'        // User upgraded during grace period
  | 'converted';      // Grace period converted to different state
```

### CrisisPaymentOverride

Crisis override system for maintaining therapeutic access during emergencies.

```typescript
interface CrisisPaymentOverride {
  // Override state
  active: boolean;               // Whether override is currently active

  // Override metadata
  overrideId: string;            // Unique override identifier
  reason: CrisisOverrideReason;  // Reason for override activation
  severity: CrisisSeverity;      // Severity level of crisis

  // Timing information
  startTime: string;             // ISO timestamp when override started
  endTime: string | null;        // ISO timestamp when override ends (null = ongoing)
  duration?: number;             // Override duration in hours (if specified)
  autoExpiry: boolean;           // Whether override expires automatically

  // Access level configuration
  accessLevel: CrisisAccessLevel; // Level of access granted

  // Feature access during override
  therapeuticAccess: boolean;    // Access to therapeutic features
  emergencyAccess: boolean;      // Access to emergency features
  assessmentAccess: boolean;     // Access to crisis assessments
  hotlineIntegration: boolean;   // 988 hotline integration active
  emergencyContactAccess: boolean; // Emergency contact access
  safetyPlanAccess: boolean;     // Safety plan access
  progressPreservation: boolean; // Progress data preservation

  // Crisis intervention features
  crisisButtonHighlight: boolean; // Highlight crisis button
  emergencyResourcesVisible: boolean; // Show emergency resources
  therapeuticContinuityMode: boolean; // Maintain therapeutic continuity
  reducedFunctionality: boolean; // Reduce non-essential functionality

  // Security and audit
  triggeredBy: CrisisOverrideTrigger; // What triggered the override
  approvedBy?: string;           // Who approved the override (if manual)
  auditTrail: CrisisOverrideAuditEntry[]; // Audit trail
  complianceFlags: ComplianceFlag[]; // Compliance considerations

  // User context
  userConsent: boolean;          // User provided consent for override
  clinicalContext?: string;      // Clinical context for override
  therapeuticNotes?: string;     // Therapeutic notes or guidance

  // Recovery planning
  recoveryPlan?: CrisisRecoveryPlan; // Plan for returning to normal state
  followUpRequired: boolean;     // Whether follow-up is required
  clinicalReviewRequired: boolean; // Whether clinical review is needed
}

type CrisisOverrideReason =
  | 'payment_crisis'       // Payment failure during crisis episode
  | 'mental_health_emergency' // Acute mental health emergency
  | 'system_failure'       // System failure affecting crisis tools
  | 'clinical_escalation'  // Clinical escalation requiring access
  | 'user_safety_concern'  // Direct user safety concern
  | 'external_emergency';  // External emergency situation

type CrisisAccessLevel =
  | 'minimal'      // Basic crisis access only
  | 'essential'    // Essential therapeutic features
  | 'full'         // Full access to all features
  | 'enhanced';    // Enhanced access with additional support

interface CrisisOverrideTrigger {
  type: 'automatic' | 'manual' | 'clinical' | 'user_request';
  source: string;                // Source system or person
  confidence?: number;           // Confidence level (0-1) for automatic triggers
  evidenceData?: Record<string, any>; // Supporting evidence data
}

interface CrisisOverrideAuditEntry {
  timestamp: string;             // ISO timestamp
  action: string;                // Action performed
  performedBy: string;           // Who performed the action
  systemContext?: string;        // System context at time of action
  clinicalNotes?: string;        // Clinical notes or observations
  securityContext?: string;      // Security context and validation
}

interface ComplianceFlag {
  type: 'hipaa' | 'clinical' | 'safety' | 'audit';
  description: string;           // Description of compliance consideration
  resolved: boolean;             // Whether flag has been resolved
  resolvedBy?: string;           // Who resolved the flag
  resolvedAt?: string;           // When flag was resolved
}

interface CrisisRecoveryPlan {
  targetEndTime?: string;        // Target time to end override
  stepDownApproach: boolean;     // Gradual step-down vs immediate end
  followUpActions: string[];     // Required follow-up actions
  clinicalReview: boolean;       // Clinical review required
  userCheckIn: boolean;          // User check-in required
  systemValidation: boolean;     // System validation required
}
```

## Security and Validation Interfaces

### WebhookSecurityContext

Security context for webhook validation and processing.

```typescript
interface WebhookSecurityContext {
  // Request validation
  signature: string;             // HMAC signature from provider
  timestamp: number;             // Request timestamp
  payload: string;               // Raw webhook payload

  // Security configuration
  hmacSecret: string;            // HMAC secret for signature validation
  timestampTolerance: number;    // Timestamp tolerance in seconds

  // Rate limiting
  clientIP?: string;             // Client IP address
  rateLimitConfig: RateLimitConfig; // Rate limiting configuration

  // Crisis exemptions
  crisisMode: boolean;           // Whether crisis mode is active
  emergencyBypass: boolean;      // Whether emergency bypass is enabled

  // Audit and compliance
  requestId: string;             // Unique request identifier
  auditLevel: SecurityAuditLevel; // Level of security auditing
  complianceMode: ComplianceMode; // Compliance mode (HIPAA, etc.)
}

interface RateLimitConfig {
  windowSizeMs: number;          // Rate limit window size
  maxRequests: number;           // Maximum requests per window
  crisisExemption: boolean;      // Allow crisis exemptions
  emergencyMultiplier: number;   // Multiplier for emergency situations
  blockDuration: number;         // Duration to block violating IPs
}

type SecurityAuditLevel = 'minimal' | 'standard' | 'comprehensive' | 'forensic';

type ComplianceMode = 'standard' | 'hipaa' | 'pci_dss' | 'gdpr';

interface SecurityValidationResult {
  valid: boolean;                // Overall validation result

  // Individual validation results
  signatureValid: boolean;       // HMAC signature validation
  timestampValid: boolean;       // Timestamp validation
  rateLimitPassed: boolean;      // Rate limit validation
  ipWhitelisted: boolean;        // IP whitelist validation

  // Security metrics
  validationTime: number;        // Time spent on validation
  crisisExemptionUsed: boolean;  // Whether crisis exemption was used

  // Error details
  errors: SecurityValidationError[]; // Validation errors
  warnings: SecurityValidationWarning[]; // Validation warnings

  // Audit information
  auditEntries: SecurityAuditEntry[]; // Security audit entries
}

interface SecurityValidationError {
  code: string;                  // Error code
  message: string;               // Error message
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;            // Whether error is retryable
  crisisImpact: CrisisImpactLevel; // Impact on crisis functionality
}

interface SecurityValidationWarning {
  code: string;                  // Warning code
  message: string;               // Warning message
  recommendation?: string;       // Recommended action
}

interface SecurityAuditEntry {
  timestamp: string;             // ISO timestamp
  type: 'validation' | 'authorization' | 'rate_limit' | 'crisis_exemption';
  result: 'success' | 'failure' | 'warning';
  details: Record<string, any>;  // Audit details
  securityContext: string;       // Security context snapshot
}
```

## Performance and Monitoring Interfaces

### WebhookPerformanceMetrics

Comprehensive performance metrics for webhook processing.

```typescript
interface WebhookPerformanceMetrics {
  // Processing timing
  totalProcessingTime: number;   // Total processing time in ms
  securityValidationTime: number; // Security validation time
  payloadParsingTime: number;    // Payload parsing time
  businessLogicTime: number;     // Business logic processing time
  stateUpdateTime: number;       // State update time
  auditLoggingTime: number;      // Audit logging time
  responseTime: number;          // Total response time

  // Crisis performance
  crisisDetectionTime: number;   // Time to detect crisis
  crisisResponseTime: number;    // Time to respond to crisis
  emergencyAccessTime: number;   // Time to activate emergency access
  therapeuticContinuityTime: number; // Time to ensure therapeutic continuity

  // Memory and resource usage
  peakMemoryUsage: number;       // Peak memory usage in bytes
  cpuUsage: number;              // CPU usage percentage
  ioOperations: number;          // Number of I/O operations
  networkCalls: number;          // Number of network calls

  // Error and retry metrics
  retryCount: number;            // Number of retries attempted
  errorCount: number;            // Number of errors encountered
  recoveryTime: number;          // Time spent on error recovery

  // Compliance metrics
  auditTrailCreationTime: number; // Time to create audit trail
  encryptionTime: number;        // Time spent on encryption
  complianceValidationTime: number; // Time for compliance validation
}

interface WebhookProcessingStatistics {
  // Volume metrics
  totalWebhooksProcessed: number; // Total webhooks processed
  successfulWebhooks: number;    // Successfully processed webhooks
  failedWebhooks: number;        // Failed webhook processing
  crisisWebhooks: number;        // Crisis-related webhooks

  // Performance distribution
  responseTimeDistribution: PerformanceDistribution;
  processingTimeDistribution: PerformanceDistribution;
  crisisResponseDistribution: PerformanceDistribution;

  // Error analysis
  errorsByType: Record<string, number>; // Errors grouped by type
  errorsByEventType: Record<string, number>; // Errors by webhook event type
  retryAnalysis: RetryAnalysis;  // Analysis of retry patterns

  // Crisis safety metrics
  crisisComplianceRate: number;  // Percentage of crisis responses under limit
  emergencyBypassUsage: number;  // Number of emergency bypasses used
  therapeuticContinuityRate: number; // Rate of maintained continuity

  // Resource utilization
  averageMemoryUsage: number;    // Average memory usage
  averageCpuUsage: number;       // Average CPU usage
  resourceEfficiencyScore: number; // Overall efficiency score
}

interface PerformanceDistribution {
  min: number;                   // Minimum value
  max: number;                   // Maximum value
  mean: number;                  // Mean value
  median: number;                // Median value
  p95: number;                   // 95th percentile
  p99: number;                   // 99th percentile
  standardDeviation: number;     // Standard deviation
}

interface RetryAnalysis {
  totalRetries: number;          // Total number of retries
  averageRetriesPerEvent: number; // Average retries per event
  retrySuccessRate: number;      // Success rate of retries
  retryDistribution: Record<number, number>; // Distribution of retry counts
  maxRetriesReached: number;     // Number of events reaching max retries
}
```

## Error Handling Interfaces

### PaymentError

Comprehensive error interface for payment-related errors with therapeutic considerations.

```typescript
interface PaymentError {
  // Error identification
  id: string;                    // Unique error identifier
  code: string;                  // Standardized error code
  type: PaymentErrorType;        // Category of error

  // Error details
  message: string;               // Technical error message
  userMessage: string;           // User-friendly error message
  therapeuticMessage?: string;   // Therapeutic guidance message

  // Error context
  eventId?: string;              // Associated webhook event ID
  timestamp: string;             // ISO timestamp when error occurred
  source: ErrorSource;           // Source of the error

  // Error characteristics
  severity: ErrorSeverity;       // Severity level
  retryable: boolean;            // Whether error can be retried
  crisisImpact: CrisisImpactLevel; // Impact on crisis functionality
  therapeuticImpact: TherapeuticImpactLevel; // Impact on therapeutic access

  // Recovery information
  recoveryActions: RecoveryAction[]; // Suggested recovery actions
  escalationRequired: boolean;   // Whether escalation is required
  userActionRequired: boolean;   // Whether user action is required

  // Therapeutic considerations
  anxietyMitigation: AnxietyMitigationStrategy; // Strategy to reduce anxiety
  supportiveMessaging: boolean;  // Use supportive messaging
  crisisResourcesOffered: boolean; // Offer crisis resources
  therapeuticContinuityMaintained: boolean; // Therapeutic access maintained

  // Technical details
  stackTrace?: string;           // Error stack trace (non-production)
  requestId?: string;            // Associated request ID
  metadata: Record<string, any>; // Additional error metadata

  // Audit and compliance
  auditTrail: ErrorAuditEntry[]; // Error handling audit trail
  complianceNotes?: string;      // Compliance-related notes
  hipaaImplications?: string;    // HIPAA implications if any
}

type PaymentErrorType =
  | 'validation'        // Input validation error
  | 'authentication'    // Authentication failure
  | 'authorization'     // Authorization failure
  | 'payment_processing' // Payment provider error
  | 'network'           // Network connectivity error
  | 'rate_limit'        // Rate limiting error
  | 'webhook_processing' // Webhook processing error
  | 'state_management'  // State management error
  | 'crisis_safety'     // Crisis safety system error
  | 'system_failure';   // General system failure

type ErrorSource =
  | 'client'            // Client-side error
  | 'server'            // Server-side error
  | 'payment_provider'  // Payment provider error
  | 'webhook_provider'  // Webhook provider error
  | 'database'          // Database error
  | 'network'           // Network error
  | 'security_system'   // Security system error
  | 'crisis_system';    // Crisis safety system error

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

type TherapeuticImpactLevel =
  | 'none'              // No impact on therapeutic access
  | 'minimal'           // Minimal impact, workarounds available
  | 'moderate'          // Moderate impact, some features affected
  | 'significant'       // Significant impact, major features affected
  | 'critical';         // Critical impact, therapeutic access compromised

interface RecoveryAction {
  type: 'retry' | 'fallback' | 'user_action' | 'escalation' | 'crisis_protocol';
  description: string;           // Description of recovery action
  automaticExecution: boolean;   // Whether action can be executed automatically
  userGuidance?: string;         // Guidance for user actions
  therapeuticConsiderations?: string; // Therapeutic considerations
  crisisSafetyNotes?: string;    // Crisis safety notes
}

interface AnxietyMitigationStrategy {
  type: 'reassurance' | 'resource_highlighting' | 'continuity_emphasis' | 'support_offering';
  message: string;               // Anxiety-reducing message
  actions: string[];             // Suggested calming actions
  resourcesOffered: string[];    // Mental health resources offered
  timeframe?: string;            // Expected resolution timeframe
}

interface ErrorAuditEntry {
  timestamp: string;             // ISO timestamp
  action: string;                // Action taken
  result: 'success' | 'failure'; // Result of action
  performer: 'system' | 'user' | 'admin'; // Who performed the action
  notes?: string;                // Additional notes
  therapeuticImpact?: string;    // Impact on therapeutic access
  crisisSafetyImpact?: string;   // Impact on crisis safety
}
```

## Type Utility Functions

### Type Guards and Validators

```typescript
// Type guard functions for runtime type checking
export function isValidSubscriptionStatus(status: unknown): status is SubscriptionStatus {
  return typeof status === 'string' && [
    'none', 'active', 'past_due', 'canceled', 'unpaid', 'grace_period', 'crisis_access'
  ].includes(status);
}

export function isValidCrisisSeverity(severity: unknown): severity is CrisisSeverity {
  return typeof severity === 'string' && [
    'low', 'moderate', 'high', 'critical'
  ].includes(severity);
}

export function isValidPaymentMethodType(type: unknown): type is PaymentMethodType {
  return typeof type === 'string' && [
    'card', 'bank_account', 'apple_pay', 'google_pay'
  ].includes(type);
}

// Validation functions with detailed error reporting
export function validateWebhookEventStrict(event: unknown): {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
} {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    WebhookEventSchema.parse(event);
    return { valid: true, errors, warnings };
  } catch (error) {
    if (error instanceof ZodError) {
      errors.push(...error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
        code: e.code,
        severity: 'high' as const
      })));
    }
    return { valid: false, errors, warnings };
  }
}

interface ValidationError {
  path: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ValidationWarning {
  path: string;
  message: string;
  recommendation?: string;
}

// Crisis safety validation
export function validateCrisisSafetyCompliance(
  context: CrisisSafeWebhookContext,
  result: WebhookHandlerResult
): CrisisSafetyComplianceResult {
  const compliance: CrisisSafetyComplianceResult = {
    compliant: true,
    violations: [],
    warnings: [],
    score: 100
  };

  // Check response time compliance
  if (context.crisisDetected && result.processingTime > context.responseTimeLimit) {
    compliance.compliant = false;
    compliance.violations.push({
      type: 'response_time_violation',
      severity: 'critical',
      expected: context.responseTimeLimit,
      actual: result.processingTime,
      impact: 'crisis_response_delayed'
    });
    compliance.score -= 50;
  }

  // Check therapeutic continuity
  if (context.therapeuticContinuity && result.subscriptionUpdate?.therapeuticContinuity === false) {
    compliance.compliant = false;
    compliance.violations.push({
      type: 'therapeutic_continuity_violation',
      severity: 'high',
      impact: 'therapeutic_access_interrupted'
    });
    compliance.score -= 30;
  }

  // Check grace period activation for crisis scenarios
  if (context.crisisDetected && context.gracePeriodRequired && !result.gracePeriodActivated) {
    compliance.warnings.push({
      type: 'grace_period_not_activated',
      severity: 'medium',
      recommendation: 'Consider activating grace period for crisis scenarios'
    });
    compliance.score -= 10;
  }

  return compliance;
}

interface CrisisSafetyComplianceResult {
  compliant: boolean;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  score: number; // 0-100 compliance score
}

interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expected?: any;
  actual?: any;
  impact: string;
  remediation?: string;
}

interface ComplianceWarning {
  type: string;
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  impact?: string;
}
```

## Export Summary

This module exports all TypeScript interfaces and related utilities for the webhook integration system:

```typescript
// Core webhook interfaces
export type {
  WebhookEvent,
  WebhookHandlerResult,
  CrisisSafeWebhookContext,
  WebhookErrorDetails,
  WebhookPerformanceMetrics,
  WebhookAuditTrail
};

// Payment state interfaces
export type {
  PaymentState,
  PaymentMethod,
  SubscriptionPlan,
  SubscriptionStatus,
  PaymentMethodType,
  BillingInterval,
  PlanTier,
  FeatureAccess,
  FeatureAccessMap
};

// Crisis safety interfaces
export type {
  GracePeriodStatus,
  CrisisPaymentOverride,
  EmergencyAccessState,
  CrisisType,
  CrisisSeverity,
  CrisisOverrideReason,
  CrisisAccessLevel
};

// Security interfaces
export type {
  WebhookSecurityContext,
  SecurityValidationResult,
  SecurityAuditEntry,
  RateLimitConfig,
  ComplianceMode
};

// Performance interfaces
export type {
  WebhookProcessingStatistics,
  PerformanceDistribution,
  RetryAnalysis
};

// Error handling interfaces
export type {
  PaymentError,
  PaymentErrorType,
  ErrorSource,
  ErrorSeverity,
  TherapeuticImpactLevel,
  CrisisImpactLevel,
  RecoveryAction,
  AnxietyMitigationStrategy
};

// Validation schemas
export {
  WebhookEventSchema,
  SubscriptionUpdateSchema
};

// Type guards and validators
export {
  isValidWebhookEvent,
  isValidSubscriptionStatus,
  isValidCrisisSeverity,
  isValidPaymentMethodType,
  validateWebhookEventStrict,
  validateCrisisSafetyCompliance
};
```

These TypeScript interfaces provide comprehensive type safety for the entire webhook integration system while maintaining focus on crisis safety, therapeutic continuity, and mental health considerations throughout the payment processing lifecycle.