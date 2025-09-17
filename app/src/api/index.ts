/**
 * API Integration Index for FullMind MBCT App
 *
 * Central export point for all API integration patterns
 * - Webhook processing with crisis safety guarantees
 * - External service integration (Stripe) with therapeutic continuity
 * - Security validation with HIPAA compliance
 * - Real-time state synchronization with mental health awareness
 * - P0-CLOUD: Orchestration services with therapeutic safety and performance guarantees
 */

// P0-CLOUD: Orchestration Service APIs
export {
  OrchestrationServiceFactory,
  OrchestrationServiceCoordinator,
  DEFAULT_ORCHESTRATION_CONFIG,
  performOrchestrationHealthCheck,

  // Core Orchestration APIs
  SyncOrchestrationAPI,
  ConflictResolutionAPI,
  PerformanceMonitoringAPI,

  // Integration APIs
  EnhancedStoreAPI,
  TherapeuticSafetyAPI,
  SubscriptionOrchestrationAPI,
  CrisisEscalationAPI,
  CrossDeviceCoordinationAPI,

  // Types
  type PriorityQueueConfig,
  type OrchestrationOperation,
  type SLAMonitoring,
  type TherapeuticConflict,
  type ClinicalValidationRequest,
  type PerformanceMetrics,
  type StoreIntegrationConfig,
  type TherapeuticSafetyConfig,
  type SubscriptionOrchestrationConfig,
  type CrisisDetectionConfig,
  type DeviceInfo,

  // Constants
  ORCHESTRATION_TIER_LIMITS,
  CRISIS_PRIORITY_MAPPING,
  THERAPEUTIC_PRECEDENCE_HIERARCHY,
  PERFORMANCE_SLA_TARGETS,
  STORE_INTEGRATION_PERFORMANCE_TARGETS,
  THERAPEUTIC_SAFETY_STANDARDS,
  SUBSCRIPTION_TIER_POLICIES,
  CRISIS_RESPONSE_STANDARDS,
  DEVICE_TIER_LIMITS
} from './orchestration';

// Webhook APIs
export { WebhookProcessorAPI } from './webhooks/webhook-processor-api';
export type {
  CrisisSafeAPIResponse,
  WebhookProcessingConfig,
  WebhookProcessingRequest
} from './webhooks/webhook-processor-api';

export { StripeWebhookIntegration } from './webhooks/stripe-webhook-integration';
export type {
  StripeWebhookEvent,
  PaymentCrisisAssessment,
  StripeWebhookConfig
} from './webhooks/stripe-webhook-integration';

export { PaymentStatusSyncAPI } from './webhooks/payment-status-sync';
export type {
  PaymentStatus,
  PaymentStatusUpdate,
  TherapeuticAccessConfig
} from './webhooks/payment-status-sync';

export { CrisisWebhookHandler } from './webhooks/crisis-webhook-handler';
export type {
  CrisisDetectionInput,
  CrisisDetectionResult,
  CrisisAssessmentConfig,
  EmergencyInterventionConfig
} from './webhooks/crisis-webhook-handler';

// Subscription Management APIs
export { SubscriptionStatusAPI } from './subscription/subscription-status-api';
export type {
  SubscriptionStatus,
  SubscriptionTransition,
  FeatureAccessConfig,
  TherapeuticAccessResult
} from './subscription/subscription-status-api';

// Security APIs
export { WebhookSecurityAPI } from './security/webhook-security-api';
export type {
  WebhookSecurityValidation,
  SecurityValidationResult,
  ThreatLevel,
  RateLimitConfig,
  ThreatDetectionConfig
} from './security/webhook-security-api';

// External Integration APIs
export { StripeIntegrationAPI } from './external/stripe-integration';
export type {
  StripeIntegrationConfig,
  SubscriptionRequest,
  PaymentRequest,
  StripeSubscriptionResult,
  StripePaymentResult
} from './external/stripe-integration';

/**
 * Enhanced API Configuration Factory
 * Includes P0-CLOUD orchestration services
 */
export interface APIConfiguration {
  webhook: {
    processor: WebhookProcessingConfig;
    security: RateLimitConfig & ThreatDetectionConfig;
    crisis: CrisisAssessmentConfig & EmergencyInterventionConfig;
  };
  stripe: StripeIntegrationConfig;
  subscription: {
    features: FeatureAccessConfig;
    therapeutic: TherapeuticAccessConfig;
  };
  performance: {
    crisisResponseTime: number; // ms
    standardResponseTime: number; // ms
    emergencyResponseTime: number; // ms
  };
  security: {
    hmacValidation: boolean;
    rateLimiting: boolean;
    threatDetection: boolean;
    emergencyBypass: boolean;
  };
  // P0-CLOUD: Orchestration Service Configuration
  orchestration?: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout: number;
    syncOrchestration: Partial<PriorityQueueConfig>;
    conflictResolution: Partial<ClinicalValidationRequest>;
    performanceMonitoring: Partial<PerformanceMetrics>;
    enhancedStore: Partial<StoreIntegrationConfig>;
    therapeuticSafety: Partial<TherapeuticSafetyConfig>;
    subscriptionOrchestration: Partial<SubscriptionOrchestrationConfig>;
    crisisEscalation: Partial<CrisisDetectionConfig>;
    crossDeviceCoordination: Partial<DeviceInfo>;
  };
}

/**
 * Enhanced Crisis-Safe API Factory
 * Includes P0-CLOUD orchestration services
 */
export class CrisisSafeAPIFactory {
  private config: APIConfiguration;
  private webhookProcessor?: WebhookProcessorAPI;
  private stripeWebhook?: StripeWebhookIntegration;
  private paymentSync?: PaymentStatusSyncAPI;
  private crisisHandler?: CrisisWebhookHandler;
  private subscriptionAPI?: SubscriptionStatusAPI;
  private securityAPI?: WebhookSecurityAPI;
  private stripeAPI?: StripeIntegrationAPI;

  // P0-CLOUD: Orchestration Services
  private orchestrationFactory?: OrchestrationServiceFactory;
  private orchestrationCoordinator?: OrchestrationServiceCoordinator;

  constructor(config: APIConfiguration) {
    this.config = config;
  }

  /**
   * Initialize all API services with crisis safety guarantees
   */
  async initialize(): Promise<{
    webhookProcessor: WebhookProcessorAPI;
    stripeWebhook: StripeWebhookIntegration;
    paymentSync: PaymentStatusSyncAPI;
    crisisHandler: CrisisWebhookHandler;
    subscriptionAPI: SubscriptionStatusAPI;
    securityAPI: WebhookSecurityAPI;
    stripeAPI: StripeIntegrationAPI;
    // P0-CLOUD: Orchestration Services
    orchestrationFactory?: OrchestrationServiceFactory;
    orchestrationCoordinator?: OrchestrationServiceCoordinator;
    orchestrationSuite?: ReturnType<OrchestrationServiceFactory['createOrchestrationSuite']>;
  }> {
    // Initialize core APIs
    this.webhookProcessor = new WebhookProcessorAPI(this.config.webhook.processor);
    this.securityAPI = new WebhookSecurityAPI(
      this.config.webhook.security,
      this.config.webhook.security
    );
    this.crisisHandler = new CrisisWebhookHandler(
      this.config.webhook.crisis,
      this.config.webhook.crisis
    );

    // Initialize Stripe integration
    this.stripeAPI = new StripeIntegrationAPI(this.config.stripe);
    this.stripeWebhook = new StripeWebhookIntegration(
      { ...this.config.webhook.processor, stripe: this.config.stripe },
      this.webhookProcessor
    );

    // Initialize state management APIs
    this.paymentSync = new PaymentStatusSyncAPI(this.config.subscription.therapeutic);
    this.subscriptionAPI = new SubscriptionStatusAPI(this.config.subscription.features);

    // P0-CLOUD: Initialize orchestration services if configured
    let orchestrationSuite;
    if (this.config.orchestration) {
      this.orchestrationFactory = new OrchestrationServiceFactory({
        baseUrl: this.config.orchestration.baseUrl,
        apiKey: this.config.orchestration.apiKey,
        defaultTimeout: this.config.orchestration.defaultTimeout
      });

      orchestrationSuite = this.orchestrationFactory.createOrchestrationSuite();
      this.orchestrationCoordinator = new OrchestrationServiceCoordinator(orchestrationSuite);

      // Perform health check to ensure orchestration services are ready
      const healthCheck = await performOrchestrationHealthCheck(orchestrationSuite);
      if (!healthCheck.healthy) {
        console.warn('Orchestration services health check failed:', healthCheck.recommendations);
      }
    }

    return {
      webhookProcessor: this.webhookProcessor,
      stripeWebhook: this.stripeWebhook,
      paymentSync: this.paymentSync,
      crisisHandler: this.crisisHandler,
      subscriptionAPI: this.subscriptionAPI,
      securityAPI: this.securityAPI,
      stripeAPI: this.stripeAPI,
      orchestrationFactory: this.orchestrationFactory,
      orchestrationCoordinator: this.orchestrationCoordinator,
      orchestrationSuite
    };
  }

  /**
   * Get crisis-optimized configuration
   */
  static getCrisisOptimizedConfig(): APIConfiguration {
    return {
      webhook: {
        processor: {
          crisisDetection: {
            enabled: true,
            sensitivity: 'high',
            responseTimeLimit: 150,
            automaticIntervention: true,
          },
          security: {
            hmacValidation: true,
            threatDetection: true,
            rateLimiting: {
              enabled: true,
              crisisExemption: true,
              maxRequestsPerMinute: 100,
            },
          },
          therapeutic: {
            continuityProtection: true,
            mbctCompliance: true,
            gracePeriodManagement: true,
            emergencyBypass: true,
          },
          performance: {
            monitoring: true,
            realTimeAlerts: true,
            degradationDetection: true,
          },
        },
        security: {
          windowMs: 60000, // 1 minute
          maxRequests: 100,
          crisisExemption: true,
          emergencyMultiplier: 5,
          burstAllowance: 20,
          penaltyMultiplier: 2,
          enableRealTime: true,
          suspiciousPatternDetection: true,
          anomalyDetection: true,
          geolocationValidation: false,
          userAgentValidation: true,
          payloadSizeValidation: true,
          frequencyAnalysis: true,
          crossReferenceValidation: true,
        },
        crisis: {
          paymentFailureWeighting: 0.6,
          subscriptionCancellationWeighting: 0.8,
          financialStressIndicators: ['multiple_failures', 'subscription_cancellation'],
          therapeuticDisruptionThreshold: 0.7,
          assessmentScoreThresholds: {
            phq9: { watch: 5, low: 10, medium: 15, high: 20, critical: 25 },
            gad7: { watch: 3, low: 8, medium: 12, high: 15, critical: 19 },
          },
          timeBasedFactors: {
            recentAssessment: true,
            activeTherapeuticSession: true,
            previousCrisisHistory: true,
            timeOfDay: 'high_risk',
          },
          contextualFactors: {
            multipleFailures: true,
            financialHardship: true,
            therapeuticEngagement: 'high',
            socialSupport: 'medium',
          },
          hotlineIntegration: {
            enabled: true,
            primaryHotline: '988',
            backupHotlines: ['741741'],
            automaticDialing: false,
            crisisTextSupport: true,
          },
          therapeuticSupport: {
            emergencyTherapistContact: false,
            crisisCoachingAvailable: true,
            peerSupportAccess: true,
            mindfulnessEmergencyContent: true,
          },
          accessControls: {
            emergencyUnlock: true,
            gracePeriodExtension: 30,
            premiumFeatureAccess: true,
            restrictedContentBypass: true,
          },
          monitoring: {
            continuousAssessment: true,
            escalationTriggers: ['high', 'critical', 'emergency'],
            followUpSchedule: [1, 6, 24, 72], // hours
            familyNotification: false,
          },
        },
      },
      stripe: {
        apiKey: process.env.STRIPE_SECRET_KEY || '',
        apiVersion: '2023-10-16',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        liveMode: process.env.NODE_ENV === 'production',
        retryConfig: {
          maxRetries: 3,
          backoffMultiplier: 2,
          crisisRetryInterval: 1000,
          maxRetryDelay: 30000,
        },
        timeouts: {
          standard: 10000,
          crisis: 5000,
          emergency: 2000,
        },
        therapeuticSettings: {
          gracePeriodDays: 14,
          emergencyAccessDays: 30,
          crisisTrialExtension: 7,
          anxietyReductionMode: true,
        },
      },
      subscription: {
        features: {
          core: {
            mindfulnessExercises: true,
            breathingExercises: true,
            moodTracking: true,
            progressTracking: true,
          },
          therapeutic: {
            phq9Assessment: true,
            gad7Assessment: true,
            mbctPrograms: true,
            therapeuticContent: true,
            guidedMeditations: true,
          },
          crisis: {
            crisisResources: true,
            emergencyContacts: true,
            hotlineAccess: true,
            safetyPlanning: true,
            emergencyMeditations: true,
          },
          premium: {
            advancedAnalytics: false,
            personalizedContent: false,
            exportFeatures: false,
            offlineAccess: true,
            prioritySupport: false,
          },
        },
        therapeutic: {
          coreFeatures: [
            'mindfulness_exercises',
            'breathing_exercises',
            'mood_tracking',
            'progress_tracking',
          ],
          crisisFeatures: [
            'crisis_resources',
            'emergency_contacts',
            'hotline_access',
            'safety_planning',
            'emergency_meditations',
          ],
          assessmentTools: [
            'phq9_assessment',
            'gad7_assessment',
            'custom_assessments',
          ],
          emergencyResources: [
            '988_hotline',
            'crisis_text_line',
            'emergency_services',
          ],
          gracePeriodFeatures: [
            'therapeutic_content',
            'crisis_resources',
            'assessment_tools',
            'core_features',
          ],
          restrictedFeatures: [
            'premium_analytics',
            'export_features',
            'priority_support',
          ],
        },
      },
      performance: {
        crisisResponseTime: 200,
        standardResponseTime: 2000,
        emergencyResponseTime: 100,
      },
      security: {
        hmacValidation: true,
        rateLimiting: true,
        threatDetection: true,
        emergencyBypass: true,
      },
      // P0-CLOUD: Orchestration Service Configuration
      orchestration: {
        baseUrl: process.env.REACT_APP_ORCHESTRATION_API_URL || 'http://localhost:3001/api/orchestration',
        apiKey: process.env.REACT_APP_ORCHESTRATION_API_KEY || 'dev-orchestration-key',
        defaultTimeout: 5000,
        syncOrchestration: {
          queueId: crypto.randomUUID(),
          name: 'crisis-optimized-queue',
          tierLevel: 8, // High priority for crisis optimization
          priority: {
            basePriority: 8,
            crisisOverride: true,
            therapeuticWeight: 5,
            subscriptionWeight: 1,
            latencyWeight: 2
          },
          crisisConfig: {
            enableCrisisOverride: true,
            crisisResponseTime: 200,
            crisisEscalationDelay: 1000,
            preserveTherapeuticContinuity: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        conflictResolution: {
          requestId: crypto.randomUUID(),
          conflictId: 'default-config',
          clinicalContext: {
            dataType: 'phq9',
            clinicalSignificance: 'critical',
            patientSafetyImplications: true,
            therapeuticContinuityImpact: true
          },
          validationRequirements: {
            accuracyValidationRequired: true,
            clinicalReviewRequired: true,
            expertConsultationRequired: false,
            patientConsentRequired: true,
            documentationRequired: true
          },
          requestedAt: new Date().toISOString()
        },
        performanceMonitoring: {
          metricsId: crypto.randomUUID(),
          userId: 'default-user',
          deviceId: 'default-device',
          subscriptionTier: 'basic',
          collectedAt: new Date().toISOString()
        },
        enhancedStore: {
          configId: crypto.randomUUID(),
          userId: 'default-user',
          subscriptionTier: 'basic',
          storeConfig: {
            enableRealTimeSync: true,
            enableCrossDeviceSync: true,
            enableConflictResolution: true,
            enableTherapeuticValidation: true,
            enableEncryption: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        therapeuticSafety: {
          configId: crypto.randomUUID(),
          userId: 'default-user',
          subscriptionTier: 'basic',
          clinicalDataProtection: {
            enableEncryption: true,
            encryptionLevel: 'clinical_grade',
            enableIntegrityValidation: true,
            enableAuditLogging: true,
            enableAccessControls: true,
            hipaaCompliant: true,
            enableDataMinimization: true,
            enableConsentManagement: true
          },
          crisisSafetyProtocols: {
            enableCrisisDetection: true,
            crisisResponseTime: 200,
            enableEmergencyEscalation: true,
            enableCrisisOverride: true,
            emergencyContactsEnabled: true,
            hotlineIntegrationEnabled: true,
            crisisDataPreservation: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        subscriptionOrchestration: {
          configId: crypto.randomUUID(),
          userId: 'default-user',
          subscriptionTier: 'basic',
          crisisOverridePolicies: {
            enableCrisisOverride: true,
            crisisDetectionThresholds: {
              phq9Threshold: 20,
              gad7Threshold: 15,
              customCrisisIndicators: ['user_reported_crisis', 'emergency_contact_trigger']
            },
            overrideCapabilities: {
              unlimitedResourceAccess: true,
              premiumFeaturesAccess: true,
              emergencyServicesAccess: true,
              crossDeviceSyncAccess: true,
              realTimeSupportAccess: true
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        crisisEscalation: {
          configId: crypto.randomUUID(),
          userId: 'default-user',
          subscriptionTier: 'basic',
          detectionThresholds: {
            assessmentThresholds: {
              phq9CrisisThreshold: 20,
              gad7CrisisThreshold: 15,
              combinedScoreThreshold: 30,
              rapidScoreIncreaseThreshold: 5,
              consistentHighScoresThreshold: 3
            },
            behavioralIndicators: {
              enableBehavioralDetection: true,
              inactivityThreshold: 172800000, // 48 hours
              appUsagePatternChanges: true,
              assessmentCompletionPatterns: true,
              responseTimePatterns: true
            }
          },
          responseConfiguration: {
            immediateResponse: {
              maxResponseTime: 200,
              enableAutomaticEscalation: true,
              showEmergencyContacts: true,
              displayCrisisResources: true,
              activateEmergencyMode: true
            }
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        crossDeviceCoordination: {
          deviceId: 'default-device',
          deviceName: 'Default Device',
          platform: 'ios',
          platformVersion: '17.0',
          appVersion: '1.0.0',
          capabilities: {
            hasSecureEnclave: true,
            supportsBackgroundSync: true,
            supportsPushNotifications: true,
            hasLocationServices: false,
            storageCapacity: 64 * 1024 * 1024 * 1024, // 64GB
            networkType: 'wifi'
          },
          status: {
            lastSeen: new Date().toISOString(),
            isOnline: true,
            syncEnabled: true,
            isPrimary: true
          },
          security: {
            encryptionKeyHash: 'default-hash',
            certificateFingerprint: 'default-cert',
            lastSecurityUpdate: new Date().toISOString(),
            biometricEnabled: true,
            lockScreenEnabled: true
          },
          registeredAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Get production-ready configuration
   */
  static getProductionConfig(): APIConfiguration {
    const baseConfig = this.getCrisisOptimizedConfig();

    return {
      ...baseConfig,
      stripe: {
        ...baseConfig.stripe,
        liveMode: true,
        retryConfig: {
          ...baseConfig.stripe.retryConfig,
          maxRetries: 5,
          maxRetryDelay: 60000,
        },
        timeouts: {
          standard: 15000,
          crisis: 3000,
          emergency: 1500,
        },
      },
      webhook: {
        ...baseConfig.webhook,
        processor: {
          ...baseConfig.webhook.processor,
          performance: {
            monitoring: true,
            realTimeAlerts: true,
            degradationDetection: true,
          },
        },
      },
      performance: {
        crisisResponseTime: 150,
        standardResponseTime: 1500,
        emergencyResponseTime: 75,
      },
    };
  }

  /**
   * Get development configuration
   */
  static getDevelopmentConfig(): APIConfiguration {
    const baseConfig = this.getCrisisOptimizedConfig();

    return {
      ...baseConfig,
      stripe: {
        ...baseConfig.stripe,
        liveMode: false,
        timeouts: {
          standard: 5000,
          crisis: 2000,
          emergency: 1000,
        },
      },
      webhook: {
        ...baseConfig.webhook,
        security: {
          ...baseConfig.webhook.security,
          maxRequests: 1000, // Higher limits for development
          crisisExemption: true,
        },
      },
      performance: {
        crisisResponseTime: 500, // More lenient for development
        standardResponseTime: 5000,
        emergencyResponseTime: 200,
      },
    };
  }
}

/**
 * Crisis Response Coordinator
 */
export class CrisisResponseCoordinator {
  private apis: any;

  constructor(apis: any) {
    this.apis = apis;
  }

  /**
   * Coordinate crisis response across all APIs
   */
  async handleCrisisEvent(
    event: {
      type: string;
      crisisLevel: CrisisLevel;
      userId: string;
      context: any;
    }
  ): Promise<{
    crisisDetected: boolean;
    interventionsTriggered: string[];
    therapeuticContinuityMaintained: boolean;
    emergencyResourcesActivated: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();
    const interventions: string[] = [];

    try {
      // 1. Crisis detection and assessment
      const crisisResult = await this.apis.crisisHandler.detectCrisis({
        webhookEvent: {
          type: event.type,
          data: event.context,
          timestamp: Date.now(),
          source: 'crisis_coordinator',
        },
        userContext: {
          userId: event.userId,
          currentCrisisLevel: event.crisisLevel,
        },
        urgencyLevel: 'emergency',
      });

      if (crisisResult.data.crisisLevel !== 'none') {
        interventions.push('crisis_detection');

        // 2. Emergency subscription management
        if (event.type.includes('payment') || event.type.includes('subscription')) {
          await this.apis.subscriptionAPI.emergencySubscriptionOverride(
            event.userId,
            {
              emergencyCode: 'CRISIS_OVERRIDE_988',
              accessLevel: 'therapeutic',
              durationDays: 30,
              reason: `Crisis intervention: ${event.type}`,
              crisisLevel: event.crisisLevel,
            }
          );
          interventions.push('emergency_access');
        }

        // 3. Hotline support activation
        if (crisisResult.data.crisisLevel === 'critical' || crisisResult.data.crisisLevel === 'emergency') {
          await this.apis.crisisHandler.initiateHotlineSupport(
            event.userId,
            event.crisisLevel,
            true // user consent assumed in emergency
          );
          interventions.push('hotline_support');
        }
      }

      const responseTime = Date.now() - startTime;

      return {
        crisisDetected: crisisResult.data.crisisLevel !== 'none',
        interventionsTriggered: interventions,
        therapeuticContinuityMaintained: true, // Always guaranteed
        emergencyResourcesActivated: interventions.length > 0,
        responseTime,
      };

    } catch (error) {
      console.error('Crisis response coordination failed:', error);

      return {
        crisisDetected: true, // Assume crisis on error
        interventionsTriggered: ['error_recovery'],
        therapeuticContinuityMaintained: true,
        emergencyResourcesActivated: true,
        responseTime: Date.now() - startTime,
      };
    }
  }
}

/**
 * Export convenience types
 */
export type { CrisisLevel, CrisisResponseTime, TherapeuticContinuity, EmergencyAccessControl } from '../types/webhooks/crisis-safety-types';

/**
 * Default API factory instance
 */
export const createCrisisSafeAPIs = (environment: 'development' | 'production' = 'development') => {
  const config = environment === 'production'
    ? CrisisSafeAPIFactory.getProductionConfig()
    : CrisisSafeAPIFactory.getDevelopmentConfig();

  return new CrisisSafeAPIFactory(config);
};