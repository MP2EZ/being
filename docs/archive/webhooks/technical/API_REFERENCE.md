# Webhook Integration API Reference

## Overview

This API reference provides comprehensive documentation for the Day 18 webhook integration system, including all TypeScript interfaces, service classes, hook functions, and component APIs. The system implements production-ready webhook processing with crisis safety, security, and therapeutic continuity.

## Core API Components

### WebhookEvent Interface

The foundational interface for all webhook events processed by the system.

```typescript
interface WebhookEvent {
  id: string;                    // Unique event identifier
  type: string;                  // Webhook event type
  data: {
    object: any;                 // Event payload data
  };
  created: number;               // Unix timestamp
  livemode: boolean;             // Production vs test mode
  pending_webhooks: number;      // Queue depth
  request: {
    id: string | null;           // Request identifier
    idempotency_key: string | null; // Idempotency key
  };
  api_version: string;           // API version used
}

// Zod schema for runtime validation
export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any())
  }),
  created: z.number(),
  livemode: z.boolean(),
  pending_webhooks: z.number(),
  request: z.object({
    id: z.string().nullable(),
    idempotency_key: z.string().nullable()
  }),
  api_version: z.string()
});

// Usage example
const event = WebhookEventSchema.parse(incomingWebhookData);
```

### BillingEventResult Interface

Response interface for webhook processing results with crisis safety information.

```typescript
interface BillingEventResult {
  success: boolean;              // Processing success status
  eventId: string;               // Original event ID
  eventType: string;             // Event type processed
  processingTime: number;        // Processing duration (ms)

  // Optional subscription update data
  subscriptionUpdate?: SubscriptionUpdate;

  // Grace period activation
  gracePeriodActivated?: boolean;
  gracePeriodReason?: 'payment_issue' | 'crisis_override' | 'technical_difficulty';

  // Crisis override information
  crisisOverride?: boolean;
  crisisReason?: string;

  // Error details if processing failed
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
    crisisImpact: 'none' | 'minimal' | 'significant';
  };

  // Performance metadata
  performanceMetrics?: {
    startTime: number;
    endTime: number;
    duration: number;
    crisisCompliant: boolean;
  };
}
```

### CrisisSafeWebhookContext Interface

Context interface for crisis-aware webhook processing.

```typescript
interface CrisisSafeWebhookContext {
  crisisDetected: boolean;       // Active crisis state
  emergencyBypass: boolean;      // Emergency bypass activated
  customerId: string;            // User/customer identifier
  responseTimeLimit: number;     // Maximum response time (ms)
  therapeuticContinuity: boolean; // Maintain therapeutic access
  gracePeriodRequired: boolean;  // Grace period activation needed

  // Crisis metadata
  crisisType?: 'clinical' | 'payment' | 'system';
  crisisSeverity?: 'low' | 'moderate' | 'high' | 'critical';
  crisisStartTime?: string;

  // User context
  userContext?: {
    userId: string;
    currentProgram?: string;
    lastActivity?: string;
    crisisContactConsent?: boolean;
    emergencyContacts?: string[];
  };
}
```

## Payment Store API

### PaymentStore State Interface

Complete state interface for the payment store with webhook integration.

```typescript
interface PaymentStoreState extends PaymentState, PaymentActions {
  // Core payment state
  subscriptionStatus: SubscriptionStatus;
  paymentMethod: PaymentMethod | null;
  subscriptionPlan: SubscriptionPlan | null;
  isLoading: boolean;
  error: string | null;

  // Crisis safety state
  gracePeriodStatus: GracePeriodStatus | null;
  crisisOverride: CrisisPaymentOverride | null;
  emergencyAccess: EmergencyAccessState | null;

  // Webhook processing configuration
  _webhookConfig: WebhookConfig;
  _webhookMetrics: WebhookMetrics;
  _webhookQueue: Map<string, WebhookEvent>;
  _stateUpdateQueue: Map<string, StateUpdate>;

  // Processing intervals
  _realTimeUpdateInterval: NodeJS.Timeout | null;
  _gracePeriodMonitorInterval: NodeJS.Timeout | null;
}

// Webhook configuration
interface WebhookConfig {
  processingTimeoutMs: number;    // Standard timeout (2000ms)
  crisisTimeoutMs: number;        // Crisis timeout (200ms)
  maxRetryAttempts: number;       // Retry attempts (3)
  retryDelayMs: number;          // Retry delay (1000ms)
  batchSize: number;             // Batch processing size (10)
  enableMetrics: boolean;        // Metrics collection
  enableStateSync: boolean;      // Real-time sync
  gracePeriodDays: number;       // Grace period duration (7)
  therapeuticMessaging: boolean; // Therapeutic UX
  realTimeUpdates: boolean;      // Real-time processing
  stateDeduplication: boolean;   // Duplicate detection
}

// Webhook metrics
interface WebhookMetrics {
  totalProcessed: number;
  crisisProcessed: number;
  averageProcessingTime: number;
  lastEventProcessed: string | null;
  processingFailures: number;
  stateUpdates: number;
  gracePeriodActivations: number;
  crisisOverrides: number;
  realTimeUpdatesProcessed: number;
}
```

### PaymentStore Methods

#### Core Webhook Methods

```typescript
class PaymentStore {

  /**
   * Initialize webhook processing system
   */
  initializeWebhookProcessing(): Promise<void>;

  /**
   * Process billing event result from webhook
   * @param result - Billing event processing result
   */
  handleBillingEventResult(result: BillingEventResult): Promise<void>;

  /**
   * Update subscription state from billing event
   * @param subscriptionUpdate - Subscription update data
   */
  updateSubscriptionStateFromBilling(subscriptionUpdate: SubscriptionUpdate): Promise<void>;

  /**
   * Handle crisis override from billing event
   * @param result - Billing event result with crisis override
   */
  handleCrisisOverrideFromBilling(result: BillingEventResult): Promise<void>;

  /**
   * Calculate feature access based on tier and grace period
   * @param tier - Subscription tier
   * @param gracePeriod - Grace period status
   */
  calculateFeatureAccessFromTier(tier: string, gracePeriod: boolean): FeatureAccess;

  /**
   * Map tier ID to human-readable name
   * @param tierId - Internal tier identifier
   */
  mapTierToName(tierId: string): string;
}
```

#### Real-time Processing Methods

```typescript
class PaymentStore {

  /**
   * Start real-time update processor
   * Processes state updates every 1 second
   */
  startRealTimeUpdateProcessor(): void;

  /**
   * Start grace period monitor
   * Checks grace periods every 1 minute
   */
  startGracePeriodMonitor(): void;

  /**
   * Check for duplicate state updates
   * @param event - Webhook event to check
   */
  isDuplicateStateUpdate(event: WebhookEvent): boolean;

  /**
   * Queue real-time state update
   * @param event - Webhook event for state update
   */
  queueRealTimeStateUpdate(event: WebhookEvent): Promise<void>;

  /**
   * Process real-time state update
   * @param stateUpdate - State update to process
   */
  processRealTimeUpdate(stateUpdate: StateUpdate): Promise<void>;

  /**
   * Check and update grace periods
   * Updates remaining days and expiration status
   */
  checkAndUpdateGracePeriods(): Promise<void>;
}
```

## Webhook Processing Services

### TypeSafeWebhookHandlerRegistry

The main webhook processing service with type safety and crisis awareness.

```typescript
class TypeSafeWebhookHandlerRegistry {

  /**
   * Process webhook with type safety and crisis awareness
   * @param event - Webhook event to process
   * @param context - Crisis-safe processing context
   */
  async processWebhook(
    event: WebhookEvent,
    context: CrisisSafeWebhookContext
  ): Promise<WebhookHandlerResult>;

  /**
   * Register event handler for specific webhook type
   * @param eventType - Webhook event type
   * @param handler - Handler function
   */
  registerHandler<T extends keyof WebhookHandlerRegistry>(
    eventType: T,
    handler: WebhookHandlerRegistry[T]
  ): void;

  /**
   * Validate webhook event structure
   * @param event - Event to validate
   */
  validateWebhookEvent(event: unknown): WebhookEvent;

  /**
   * Get processing metrics
   */
  getProcessingMetrics(): WebhookProcessingMetrics;

  /**
   * Reset processing metrics
   */
  resetProcessingMetrics(): void;
}

// Handler registry type mapping
interface WebhookHandlerRegistry {
  'customer.subscription.created': SubscriptionCreatedHandler;
  'customer.subscription.updated': SubscriptionUpdatedHandler;
  'customer.subscription.deleted': SubscriptionDeletedHandler;
  'invoice.payment_succeeded': PaymentSucceededHandler;
  'invoice.payment_failed': PaymentFailedHandler;
  'setup_intent.succeeded': SetupIntentSucceededHandler;
}

// Handler function type
type WebhookHandler<T = any> = (
  event: WebhookEvent,
  context: CrisisSafeWebhookContext
) => Promise<WebhookHandlerResult>;
```

### WebhookSecurityValidator

Security validation service for webhook authentication and authorization.

```typescript
class WebhookSecurityValidator {

  /**
   * Validate webhook request with comprehensive security checks
   * @param payload - Raw webhook payload
   * @param headers - Request headers
   * @param context - Crisis-safe context
   */
  async validateWebhookRequest(
    payload: string,
    headers: Record<string, string>,
    context: CrisisSafeWebhookContext
  ): Promise<WebhookValidationResult>;

  /**
   * Validate HMAC signature with constant-time comparison
   * @param payload - Webhook payload
   * @param signature - HMAC signature
   * @param crisisMode - Crisis mode flag for extended tolerance
   */
  async validateHMACSignature(
    payload: string,
    signature: string,
    crisisMode?: boolean
  ): Promise<boolean>;

  /**
   * Check rate limiting with crisis exemptions
   * @param ipAddress - Client IP address
   * @param crisisMode - Crisis mode flag
   * @param emergencyBypass - Emergency bypass flag
   */
  async checkRateLimit(
    ipAddress: string,
    crisisMode?: boolean,
    emergencyBypass?: boolean
  ): Promise<RateLimitResult>;

  /**
   * Validate IP address against allowlist
   * @param ipAddress - Client IP address
   */
  validateIPAddress(ipAddress: string): boolean;

  /**
   * Get security validation metrics
   */
  getSecurityMetrics(): SecurityValidationMetrics;
}

// Security validation result
interface WebhookValidationResult {
  valid: boolean;
  securityPassed: boolean;
  rateLimitPassed: boolean;
  ipValidationPassed: boolean;
  hmacValidationPassed: boolean;
  processingTime: number;
  crisisExemptionUsed: boolean;
  errorDetails?: SecurityErrorDetails;
}
```

### PaymentAPIService

API service for webhook event processing with payment provider integration.

```typescript
class PaymentAPIService {

  /**
   * Process webhook event with security validation
   * @param event - Webhook event
   * @param signature - HMAC signature
   * @param crisisMode - Crisis processing mode
   */
  async processWebhookEvent(
    event: WebhookEvent,
    signature: string,
    crisisMode?: boolean
  ): Promise<BillingEventResult>;

  /**
   * Handle subscription created webhook
   * @param event - Subscription created event
   * @param crisisMode - Crisis processing mode
   */
  private async handleSubscriptionCreated(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult>;

  /**
   * Handle subscription updated webhook
   * @param event - Subscription updated event
   * @param crisisMode - Crisis processing mode
   */
  private async handleSubscriptionUpdated(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult>;

  /**
   * Handle subscription deleted webhook
   * @param event - Subscription deleted event
   * @param crisisMode - Crisis processing mode
   */
  private async handleSubscriptionDeleted(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult>;

  /**
   * Handle payment succeeded webhook
   * @param event - Payment succeeded event
   * @param crisisMode - Crisis processing mode
   */
  private async handlePaymentSucceeded(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult>;

  /**
   * Handle payment failed webhook
   * @param event - Payment failed event
   * @param crisisMode - Crisis processing mode
   */
  private async handlePaymentFailed(
    event: WebhookEvent,
    crisisMode: boolean
  ): Promise<BillingEventResult>;
}
```

## Security Services API

### PaymentSecurityService

Comprehensive security service for payment data protection and audit.

```typescript
class PaymentSecurityService {

  /**
   * Encrypt sensitive payment data
   * @param data - Data to encrypt
   * @param sensitivity - Data sensitivity level
   */
  async encryptPaymentData(
    data: any,
    sensitivity?: DataSensitivity
  ): Promise<string>;

  /**
   * Decrypt sensitive payment data
   * @param encryptedData - Encrypted data string
   */
  async decryptPaymentData(encryptedData: string): Promise<any>;

  /**
   * Validate webhook HMAC signature
   * @param payload - Webhook payload
   * @param signature - HMAC signature
   * @param crisisMode - Crisis mode for extended tolerance
   */
  async validateWebhookSignature(
    payload: string,
    signature: string,
    crisisMode?: boolean
  ): Promise<boolean>;

  /**
   * Secure storage of payment method data
   * @param paymentMethod - Payment method to store
   */
  async secureStorePaymentMethod(paymentMethod: PaymentMethod): Promise<void>;

  /**
   * Secure retrieval of payment method data
   * @param paymentMethodId - Payment method ID
   */
  async secureRetrievePaymentMethod(paymentMethodId: string): Promise<PaymentMethod | null>;

  /**
   * Handle crisis override with security validation
   * @param override - Crisis override data
   * @param justification - Override justification
   */
  async handleCrisisOverride(
    override: CrisisPaymentOverride,
    justification: string
  ): Promise<void>;

  /**
   * Get security operation metrics
   */
  getSecurityMetrics(): PaymentSecurityMetrics;
}

// Security metrics interface
interface PaymentSecurityMetrics {
  encryptionOperations: number;
  decryptionOperations: number;
  hmacValidations: number;
  securityViolations: number;
  auditEntries: number;
  crisisOverrides: number;
}
```

### CrisisResponseMonitor

Crisis safety monitoring service for response time compliance.

```typescript
class CrisisResponseMonitor {

  /**
   * Monitor webhook processing for crisis compliance
   * @param webhookProcessor - Webhook processing function
   * @param context - Crisis-safe context
   */
  async monitorCrisisResponse(
    webhookProcessor: () => Promise<WebhookHandlerResult>,
    context: CrisisSafeWebhookContext
  ): Promise<WebhookHandlerResult>;

  /**
   * Activate emergency bypass for crisis situations
   * @param context - Crisis context
   * @param processingTime - Current processing time
   */
  private async activateEmergencyBypass(
    context: CrisisSafeWebhookContext,
    processingTime: number
  ): Promise<WebhookHandlerResult>;

  /**
   * Update crisis performance metrics
   * @param processingTime - Processing time
   * @param crisisMode - Crisis mode flag
   * @param success - Success flag
   */
  private async updateCrisisMetrics(
    processingTime: number,
    crisisMode: boolean,
    success: boolean
  ): Promise<void>;

  /**
   * Get crisis response metrics
   */
  getCrisisMetrics(): CrisisResponseMetrics;
}

// Crisis response metrics
interface CrisisResponseMetrics {
  totalCrisisEvents: number;
  averageCrisisResponseTime: number;
  crisisComplianceRate: number;
  emergencyBypassActivations: number;
  therapeuticAccessMaintained: number;
}
```

## React Hooks API

### useWebhookStateSync Hook

React hook for real-time webhook state synchronization.

```typescript
interface UseWebhookStateSyncOptions {
  enableRealTimeUpdates?: boolean;
  crisisMode?: boolean;
  updateInterval?: number;
  conflictResolution?: 'last-write-wins' | 'merge-with-metadata';
  stateDeduplication?: boolean;
  gracePeriodHandling?: 'preserve' | 'extend' | 'clinical-priority';
}

interface UseWebhookStateSyncResult {
  // Current state
  paymentState: PaymentState;
  syncStatus: 'idle' | 'syncing' | 'error' | 'crisis_mode';
  lastSyncTime: string | null;

  // State management
  syncNow: () => Promise<void>;
  pauseSync: () => void;
  resumeSync: () => void;

  // Crisis management
  activateEmergencyAccess: (reason: string) => Promise<void>;
  extendGracePeriod: (reason: string) => Promise<void>;

  // Metrics
  syncMetrics: {
    totalSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
    lastSyncError: string | null;
  };

  // Error handling
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for real-time webhook state synchronization
 * @param options - Sync configuration options
 */
function useWebhookStateSync(
  options?: UseWebhookStateSyncOptions
): UseWebhookStateSyncResult;

// Usage example
const {
  paymentState,
  syncStatus,
  syncNow,
  activateEmergencyAccess,
  error
} = useWebhookStateSync({
  enableRealTimeUpdates: true,
  crisisMode: false,
  updateInterval: 1000
});
```

### usePaymentWebhookEvents Hook

React hook for subscribing to payment webhook events.

```typescript
interface UsePaymentWebhookEventsOptions {
  eventTypes?: string[];
  crisisMode?: boolean;
  bufferSize?: number;
  enableMetrics?: boolean;
}

interface UsePaymentWebhookEventsResult {
  // Event stream
  events: WebhookEvent[];
  latestEvent: WebhookEvent | null;

  // Event management
  clearEvents: () => void;
  filterEvents: (filter: (event: WebhookEvent) => boolean) => WebhookEvent[];

  // Crisis events
  crisisEvents: WebhookEvent[];
  hasCrisisEvents: boolean;

  // Metrics
  eventMetrics: {
    totalEvents: number;
    crisisEvents: number;
    eventsByType: Record<string, number>;
    lastEventTime: string | null;
  };

  // Status
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook for subscribing to payment webhook events
 * @param options - Event subscription options
 */
function usePaymentWebhookEvents(
  options?: UsePaymentWebhookEventsOptions
): UsePaymentWebhookEventsResult;

// Usage example
const {
  events,
  latestEvent,
  crisisEvents,
  eventMetrics,
  isConnected
} = usePaymentWebhookEvents({
  eventTypes: ['customer.subscription.updated', 'invoice.payment_failed'],
  crisisMode: true,
  bufferSize: 50
});
```

### useCrisisSafePayment Hook

React hook for crisis-safe payment state management.

```typescript
interface UseCrisisSafePaymentOptions {
  enableGracePeriod?: boolean;
  gracePeriodDays?: number;
  therapeuticMessaging?: boolean;
  emergencyAccess?: boolean;
  crisisDetection?: boolean;
}

interface UseCrisisSafePaymentResult {
  // Payment state
  subscriptionStatus: SubscriptionStatus;
  paymentMethod: PaymentMethod | null;
  subscriptionPlan: SubscriptionPlan | null;

  // Crisis safety state
  gracePeriodStatus: GracePeriodStatus | null;
  crisisOverride: CrisisPaymentOverride | null;
  emergencyAccess: EmergencyAccessState | null;

  // Crisis actions
  activateEmergencyAccess: (reason: string) => Promise<void>;
  extendGracePeriod: (reason: string) => Promise<void>;
  activateCrisisOverride: (reason: string) => Promise<void>;

  // Payment actions
  updatePaymentMethod: (paymentMethod: PaymentMethod) => Promise<void>;
  retryPayment: () => Promise<void>;
  cancelSubscription: () => Promise<void>;

  // Crisis messaging
  getCrisisSafeMessage: () => TherapeuticMessage | null;
  getGracePeriodMessage: () => TherapeuticMessage | null;

  // Status
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for crisis-safe payment state management
 * @param options - Crisis-safe payment options
 */
function useCrisisSafePayment(
  options?: UseCrisisSafePaymentOptions
): UseCrisisSafePaymentResult;

// Usage example
const {
  subscriptionStatus,
  gracePeriodStatus,
  activateEmergencyAccess,
  getCrisisSafeMessage,
  isLoading,
  error
} = useCrisisSafePayment({
  enableGracePeriod: true,
  gracePeriodDays: 7,
  therapeuticMessaging: true,
  emergencyAccess: true
});
```

## Component APIs

### CrisisSafePaymentStatus Component

Crisis-safe payment status component with therapeutic messaging.

```typescript
interface CrisisSafePaymentStatusProps {
  // Payment state
  subscriptionStatus: SubscriptionStatus;
  gracePeriodStatus?: GracePeriodStatus | null;
  emergencyAccess?: EmergencyAccessState | null;

  // Crisis configuration
  crisisMode?: boolean;
  therapeuticMessaging?: boolean;
  showEmergencyAccess?: boolean;

  // Event handlers
  onEmergencyAccess?: () => void;
  onCrisisSupport?: () => void;
  onPaymentUpdate?: () => void;
  onGracePeriodExtend?: () => void;

  // Customization
  theme?: 'morning' | 'midday' | 'evening';
  showProgress?: boolean;
  compactMode?: boolean;

  // Accessibility
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Crisis-safe payment status component
 */
function CrisisSafePaymentStatus(
  props: CrisisSafePaymentStatusProps
): React.ReactElement;

// Usage example
<CrisisSafePaymentStatus
  subscriptionStatus="grace_period"
  gracePeriodStatus={gracePeriodStatus}
  crisisMode={false}
  therapeuticMessaging={true}
  onEmergencyAccess={() => activateEmergencyAccess('user_request')}
  onCrisisSupport={() => navigateToCrisisSupport()}
  theme="morning"
/>
```

### GracePeriodNotification Component

Mental health-aware grace period notification component.

```typescript
interface GracePeriodNotificationProps {
  // Grace period data
  gracePeriodStatus: GracePeriodStatus;

  // Display configuration
  showRemainingDays?: boolean;
  showProgressBar?: boolean;
  therapeuticMessaging?: boolean;
  anxietyReducingLanguage?: boolean;

  // Actions
  onExtendGracePeriod?: () => void;
  onUpdatePayment?: () => void;
  onCrisisSupport?: () => void;
  onDismiss?: () => void;

  // Customization
  variant?: 'card' | 'banner' | 'modal';
  urgency?: 'low' | 'medium' | 'high';
  showIcon?: boolean;

  // Accessibility
  announceChanges?: boolean;
  reducedMotion?: boolean;
}

/**
 * Mental health-aware grace period notification
 */
function GracePeriodNotification(
  props: GracePeriodNotificationProps
): React.ReactElement;

// Usage example
<GracePeriodNotification
  gracePeriodStatus={gracePeriodStatus}
  showRemainingDays={true}
  therapeuticMessaging={true}
  anxietyReducingLanguage={true}
  onExtendGracePeriod={() => extendGracePeriod('financial_difficulty')}
  onCrisisSupport={() => navigateToCrisisSupport()}
  variant="card"
  urgency="low"
/>
```

### EmergencyAccessCard Component

Emergency access card component for crisis situations.

```typescript
interface EmergencyAccessCardProps {
  // Emergency access state
  emergencyAccess: EmergencyAccessState;
  crisisContext?: CrisisDetectionResult;

  // Emergency actions
  onHotlineAccess?: () => void;
  onEmergencyContacts?: () => void;
  onSafetyPlan?: () => void;
  onCrisisAssessment?: () => void;

  // Display configuration
  showHotlineButton?: boolean;
  showEmergencyContacts?: boolean;
  showSafetyPlan?: boolean;
  compactMode?: boolean;

  // Customization
  variant?: 'minimal' | 'standard' | 'comprehensive';
  urgency?: 'standard' | 'high' | 'critical';

  // Accessibility
  highContrast?: boolean;
  largeText?: boolean;
  quickAccess?: boolean;
}

/**
 * Emergency access card for crisis situations
 */
function EmergencyAccessCard(
  props: EmergencyAccessCardProps
): React.ReactElement;

// Usage example
<EmergencyAccessCard
  emergencyAccess={emergencyAccess}
  crisisContext={crisisContext}
  onHotlineAccess={() => callCrisisHotline('988')}
  onEmergencyContacts={() => showEmergencyContacts()}
  onSafetyPlan={() => showSafetyPlan()}
  showHotlineButton={true}
  variant="comprehensive"
  urgency="high"
  highContrast={true}
/>
```

## Error Handling APIs

### WebhookError Classes

Comprehensive error handling for webhook processing failures.

```typescript
class WebhookProcessingError extends Error {
  constructor(
    message: string,
    public eventId: string,
    public eventType: string,
    public retryable: boolean = true,
    public crisisImpact: 'none' | 'minimal' | 'significant' = 'minimal'
  ) {
    super(message);
    this.name = 'WebhookProcessingError';
  }
}

class CrisisResponseTimeoutError extends Error {
  constructor(
    message: string,
    public responseTime: number,
    public timeoutLimit: number,
    public crisisContext: CrisisSafeWebhookContext
  ) {
    super(message);
    this.name = 'CrisisResponseTimeoutError';
  }
}

class SecurityValidationError extends Error {
  constructor(
    message: string,
    public validationType: 'hmac' | 'rate_limit' | 'ip_validation' | 'payload_validation',
    public crisisMode: boolean = false
  ) {
    super(message);
    this.name = 'SecurityValidationError';
  }
}

class PaymentStateError extends Error {
  constructor(
    message: string,
    public stateOperation: string,
    public currentState: any,
    public attemptedState: any
  ) {
    super(message);
    this.name = 'PaymentStateError';
  }
}
```

### Error Recovery APIs

```typescript
interface ErrorRecoveryStrategy {
  // Recovery configuration
  maxRetryAttempts: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  crisisExemption: boolean;

  // Recovery actions
  fallbackToEmergencyAccess: boolean;
  activateGracePeriod: boolean;
  preserveTherapeuticAccess: boolean;
  notifyUser: boolean;

  // Escalation
  escalateAfterAttempts: number;
  escalationPath: string[];
  criticalErrorHandling: boolean;
}

class WebhookErrorRecoveryService {
  /**
   * Recover from webhook processing errors
   * @param error - Error to recover from
   * @param context - Crisis-safe context
   * @param strategy - Recovery strategy
   */
  async recoverFromError(
    error: Error,
    context: CrisisSafeWebhookContext,
    strategy: ErrorRecoveryStrategy
  ): Promise<ErrorRecoveryResult>;

  /**
   * Activate emergency fallback
   * @param context - Crisis context
   * @param error - Original error
   */
  async activateEmergencyFallback(
    context: CrisisSafeWebhookContext,
    error: Error
  ): Promise<EmergencyFallbackResult>;
}
```

## Performance Monitoring APIs

### Performance Metrics Interfaces

```typescript
interface WebhookPerformanceMetrics {
  // Processing metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageProcessingTime: number;

  // Crisis metrics
  crisisRequests: number;
  crisisComplianceRate: number;
  averageCrisisResponseTime: number;
  emergencyBypassActivations: number;

  // Performance distribution
  responseTimeDistribution: {
    under50ms: number;
    under100ms: number;
    under200ms: number;
    under500ms: number;
    over500ms: number;
  };

  // Error metrics
  errorsByType: Record<string, number>;
  retryAttempts: number;
  recoverySuccessRate: number;
}

interface CrisisPerformanceMetrics {
  // Crisis response
  totalCrisisEvents: number;
  averageCrisisResponseTime: number;
  crisisComplianceRate: number;

  // Emergency protocols
  emergencyAccessActivations: number;
  therapeuticAccessInterruptions: number;
  gracePeriodActivations: number;

  // Safety metrics
  hotlineAccessTimes: number[];
  emergencyContactActivations: number;
  safetyPlanAccessTimes: number[];
}
```

### Performance Monitoring Service

```typescript
class WebhookPerformanceMonitor {
  /**
   * Start performance monitoring
   * @param options - Monitoring configuration
   */
  startMonitoring(options: PerformanceMonitoringOptions): void;

  /**
   * Record webhook processing metrics
   * @param startTime - Processing start time
   * @param endTime - Processing end time
   * @param success - Success flag
   * @param crisisMode - Crisis mode flag
   */
  recordProcessingMetrics(
    startTime: number,
    endTime: number,
    success: boolean,
    crisisMode: boolean
  ): void;

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): WebhookPerformanceMetrics;

  /**
   * Get crisis performance metrics
   */
  getCrisisPerformanceMetrics(): CrisisPerformanceMetrics;

  /**
   * Generate performance report
   * @param timeRange - Time range for report
   */
  generatePerformanceReport(timeRange: TimeRange): PerformanceReport;
}
```

## Usage Examples

### Complete Webhook Processing Example

```typescript
import {
  typeSafeWebhookHandlerRegistry,
  useWebhookStateSync,
  CrisisSafePaymentStatus
} from '@fullmind/webhook-integration';

// Server-side webhook processing
export async function handleWebhook(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    // Parse webhook event
    const event = JSON.parse(payload);

    // Create crisis-safe context
    const context: CrisisSafeWebhookContext = {
      crisisDetected: await detectCrisisState(event),
      emergencyBypass: false,
      customerId: event.data.object.customer,
      responseTimeLimit: 200,
      therapeuticContinuity: true,
      gracePeriodRequired: false
    };

    // Process webhook with crisis safety
    const result = await typeSafeWebhookHandlerRegistry.processWebhook(
      event,
      context
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
}

// Client-side React component
function PaymentStatusScreen() {
  const {
    paymentState,
    syncStatus,
    activateEmergencyAccess,
    error
  } = useWebhookStateSync({
    enableRealTimeUpdates: true,
    crisisMode: false
  });

  const {
    gracePeriodStatus,
    emergencyAccess,
    getCrisisSafeMessage
  } = useCrisisSafePayment({
    enableGracePeriod: true,
    therapeuticMessaging: true
  });

  return (
    <View>
      <CrisisSafePaymentStatus
        subscriptionStatus={paymentState.subscriptionStatus}
        gracePeriodStatus={gracePeriodStatus}
        emergencyAccess={emergencyAccess}
        therapeuticMessaging={true}
        onEmergencyAccess={() => activateEmergencyAccess('user_request')}
        onCrisisSupport={() => navigateToCrisisSupport()}
      />

      {gracePeriodStatus && (
        <GracePeriodNotification
          gracePeriodStatus={gracePeriodStatus}
          therapeuticMessaging={true}
          anxietyReducingLanguage={true}
        />
      )}

      {emergencyAccess?.active && (
        <EmergencyAccessCard
          emergencyAccess={emergencyAccess}
          onHotlineAccess={() => callCrisisHotline('988')}
          variant="comprehensive"
          urgency="high"
        />
      )}
    </View>
  );
}
```

This API reference provides comprehensive documentation for implementing and using the Day 18 webhook integration system with full crisis safety, security, and therapeutic continuity features.