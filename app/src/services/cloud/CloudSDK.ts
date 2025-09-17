/**
 * FullMind Cloud SDK - Type-Safe Client for Zero-Knowledge Cloud Services
 *
 * Production-ready TypeScript SDK with comprehensive error handling,
 * validation, and monitoring for HIPAA-compliant cloud operations
 */

import { z } from 'zod';
import { CheckIn, Assessment, UserProfile, CrisisPlan } from '../../types';
import {
  CloudFeatureFlags,
  CloudSyncStats,
  HIPAAComplianceStatus,
  CloudServiceHealth,
  EmergencySyncConfig,
  CrossDeviceSyncStatus,
  CLOUD_CONSTANTS
} from '../../types/cloud';
import { zeroKnowledgeIntegration } from './ZeroKnowledgeIntegration';
import { cloudSyncAPI } from './CloudSyncAPI';
import { supabaseClient } from './SupabaseClient';

/**
 * SDK Configuration Schema
 */
const SDKConfigSchema = z.object({
  enableCloudSync: z.boolean().default(false),
  enableEmergencySync: z.boolean().default(false),
  enableCrossDeviceSync: z.boolean().default(false),
  enableAuditLogging: z.boolean().default(true),
  syncIntervalMs: z.number().min(10000).default(30000), // Min 10 seconds
  batchSize: z.number().min(1).max(100).default(50),
  retryAttempts: z.number().min(1).max(10).default(3),
  timeoutMs: z.number().min(5000).default(30000),
  emergencyTimeoutMs: z.number().min(1000).default(5000)
}).readonly();

export type SDKConfig = z.infer<typeof SDKConfigSchema>;

/**
 * SDK Operation Result
 */
interface SDKResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp: string;
  duration?: number;
}

/**
 * SDK Authentication Result
 */
interface AuthResult extends SDKResult<{ userId: string; sessionToken: string }> {
  needsConfirmation?: boolean;
  sessionExpiry?: string;
}

/**
 * SDK Sync Result
 */
interface SyncResult extends SDKResult<{
  uploaded: number;
  downloaded: number;
  conflicts: number;
  skipped: number;
}> {
  syncStats?: CloudSyncStats;
  conflicts?: Array<{
    id: string;
    entityType: string;
    requiresManualResolution: boolean;
  }>;
}

/**
 * Main FullMind Cloud SDK Class
 */
export class FullMindCloudSDK {
  private config: SDKConfig;
  private initialized = false;
  private syncInProgress = false;
  private lastSyncTime: string | null = null;
  private errorCount = 0;
  private readonly maxErrors = 10;

  constructor(config: Partial<SDKConfig> = {}) {
    this.config = SDKConfigSchema.parse(config);
    this.initializeAsync();
  }

  /**
   * Initialize SDK with validation and setup
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Validate environment configuration
      const envValidation = this.validateEnvironment();
      if (!envValidation.success) {
        console.warn('Cloud SDK environment validation failed:', envValidation.error);
        return;
      }

      // Initialize underlying services
      await this.initializeServices();

      this.initialized = true;
      console.log('FullMind Cloud SDK initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Cloud SDK:', error);
      this.initialized = false;
    }
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(): SDKResult {
    const requiredEnvVars = [
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        return {
          success: false,
          error: `Missing required environment variable: ${envVar}`,
          errorCode: 'ENV_VALIDATION_FAILED',
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize underlying services
   */
  private async initializeServices(): Promise<void> {
    // Update feature flags based on configuration
    const featureFlags: CloudFeatureFlags = {
      enabled: this.config.enableCloudSync,
      supabaseSync: this.config.enableCloudSync,
      encryptedBackup: this.config.enableCloudSync,
      crossDeviceSync: this.config.enableCrossDeviceSync,
      conflictResolution: true,
      auditLogging: this.config.enableAuditLogging,
      emergencySync: this.config.enableEmergencySync
    };

    supabaseClient.updateFeatureFlags(featureFlags);
  }

  /**
   * Check if SDK is ready for operations
   */
  public isReady(): boolean {
    return this.initialized && this.errorCount < this.maxErrors;
  }

  /**
   * Get current SDK status
   */
  public async getStatus(): Promise<SDKResult<{
    ready: boolean;
    authenticated: boolean;
    cloudEnabled: boolean;
    lastSync: string | null;
    errorCount: number;
    serviceHealth: 'healthy' | 'degraded' | 'unavailable';
  }>> {
    const startTime = Date.now();

    try {
      const syncStatus = await zeroKnowledgeIntegration.getSyncStatus();
      const healthCheck = await cloudSyncAPI.healthCheck();

      let serviceHealth: 'healthy' | 'degraded' | 'unavailable' = 'unavailable';
      if (healthCheck.success) {
        serviceHealth = (healthCheck.latency || 0) < 500 ? 'healthy' : 'degraded';
      }

      return {
        success: true,
        data: {
          ready: this.isReady(),
          authenticated: syncStatus.authenticated,
          cloudEnabled: syncStatus.enabled,
          lastSync: this.lastSyncTime,
          errorCount: this.errorCount,
          serviceHealth
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Status check failed',
        errorCode: 'STATUS_CHECK_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Authenticate user with email and password
   */
  public async authenticate(email: string, password: string): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      // Validate input
      const emailSchema = z.string().email();
      const passwordSchema = z.string().min(8);

      emailSchema.parse(email);
      passwordSchema.parse(password);

      const result = await supabaseClient.signIn(email, password);

      if (result.success && result.session) {
        return {
          success: true,
          data: {
            userId: result.session.user.id,
            sessionToken: result.session.access_token
          },
          sessionExpiry: new Date(result.session.expires_at! * 1000).toISOString(),
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };
      }

      return {
        success: false,
        error: result.error || 'Authentication failed',
        errorCode: 'AUTH_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.incrementErrorCount();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication error',
        errorCode: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Register new user account
   */
  public async register(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<AuthResult> {
    const startTime = Date.now();

    try {
      // Validate input
      const emailSchema = z.string().email();
      const passwordSchema = z.string().min(8).max(128);

      emailSchema.parse(email);
      passwordSchema.parse(password);

      const result = await supabaseClient.signUp(email, password, {
        ...metadata,
        hipaa_consent: true,
        app_version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
        platform: 'mobile'
      });

      if (result.success) {
        const authResult: AuthResult = {
          success: true,
          needsConfirmation: result.needsConfirmation,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };

        if (result.session) {
          authResult.data = {
            userId: result.session.user.id,
            sessionToken: result.session.access_token
          };
          authResult.sessionExpiry = new Date(result.session.expires_at! * 1000).toISOString();
        }

        return authResult;
      }

      return {
        success: false,
        error: result.error || 'Registration failed',
        errorCode: 'REGISTRATION_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.incrementErrorCount();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration error',
        errorCode: 'REGISTRATION_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Sign out current user
   */
  public async signOut(): Promise<SDKResult> {
    const startTime = Date.now();

    try {
      await supabaseClient.signOut();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
        errorCode: 'SIGNOUT_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Sync check-in data to cloud
   */
  public async syncCheckIn(checkIn: CheckIn): Promise<SDKResult> {
    if (!this.isReady()) {
      return this.createNotReadyResult();
    }

    const startTime = Date.now();

    try {
      // Validate check-in data
      this.validateCheckIn(checkIn);

      const result = await zeroKnowledgeIntegration.syncCheckIn(checkIn);

      if (result.success) {
        return {
          success: true,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };
      }

      this.incrementErrorCount();
      return {
        success: false,
        error: result.error || 'Check-in sync failed',
        errorCode: 'CHECKIN_SYNC_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.incrementErrorCount();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Check-in sync error',
        errorCode: 'CHECKIN_SYNC_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Sync assessment data to cloud (critical priority)
   */
  public async syncAssessment(assessment: Assessment): Promise<SDKResult> {
    if (!this.isReady()) {
      return this.createNotReadyResult();
    }

    const startTime = Date.now();

    try {
      // Validate assessment data with strict clinical accuracy
      this.validateAssessment(assessment);

      const result = await zeroKnowledgeIntegration.syncAssessment(assessment);

      if (result.success) {
        return {
          success: true,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };
      }

      this.incrementErrorCount();
      return {
        success: false,
        error: result.error || 'Assessment sync failed',
        errorCode: 'ASSESSMENT_SYNC_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.incrementErrorCount();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Assessment sync error',
        errorCode: 'ASSESSMENT_SYNC_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Sync crisis plan to cloud
   */
  public async syncCrisisPlan(crisisPlan: CrisisPlan): Promise<SDKResult> {
    if (!this.isReady()) {
      return this.createNotReadyResult();
    }

    const startTime = Date.now();

    try {
      // Validate crisis plan data
      this.validateCrisisPlan(crisisPlan);

      const result = await zeroKnowledgeIntegration.syncCrisisPlan(crisisPlan);

      if (result.success) {
        return {
          success: true,
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime
        };
      }

      this.incrementErrorCount();
      return {
        success: false,
        error: result.error || 'Crisis plan sync failed',
        errorCode: 'CRISIS_PLAN_SYNC_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.incrementErrorCount();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Crisis plan sync error',
        errorCode: 'CRISIS_PLAN_SYNC_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Perform full bidirectional sync
   */
  public async performFullSync(): Promise<SyncResult> {
    if (!this.isReady()) {
      return this.createNotReadyResult() as SyncResult;
    }

    if (this.syncInProgress) {
      return {
        success: false,
        error: 'Sync already in progress',
        errorCode: 'SYNC_IN_PROGRESS',
        timestamp: new Date().toISOString()
      };
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      const result = await zeroKnowledgeIntegration.performFullSync();

      this.lastSyncTime = new Date().toISOString();

      return {
        success: result.success,
        data: {
          uploaded: result.uploaded,
          downloaded: result.downloaded,
          conflicts: result.conflicts,
          skipped: 0
        },
        error: result.errors.length > 0 ? result.errors.join('; ') : undefined,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      this.incrementErrorCount();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Full sync failed',
        errorCode: 'FULL_SYNC_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Emergency sync for crisis situations
   */
  public async emergencySync(): Promise<SDKResult> {
    if (!this.config.enableEmergencySync) {
      return {
        success: false,
        error: 'Emergency sync not enabled',
        errorCode: 'EMERGENCY_SYNC_DISABLED',
        timestamp: new Date().toISOString()
      };
    }

    const startTime = Date.now();

    try {
      const result = await zeroKnowledgeIntegration.emergencySync();

      return {
        success: result.success,
        error: result.error,
        errorCode: result.success ? undefined : 'EMERGENCY_SYNC_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency sync error',
        errorCode: 'EMERGENCY_SYNC_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get sync statistics
   */
  public async getSyncStats(): Promise<SDKResult<CloudSyncStats>> {
    const startTime = Date.now();

    try {
      const result = await cloudSyncAPI.getSyncStats();

      return {
        success: result.success,
        data: result.stats,
        error: result.error,
        errorCode: result.success ? undefined : 'STATS_RETRIEVAL_FAILED',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Stats retrieval error',
        errorCode: 'STATS_ERROR',
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Validate check-in data
   */
  private validateCheckIn(checkIn: CheckIn): void {
    if (!checkIn.id || !checkIn.type || !checkIn.startedAt) {
      throw new Error('Invalid check-in data: missing required fields');
    }

    if (!['morning', 'midday', 'evening'].includes(checkIn.type)) {
      throw new Error('Invalid check-in type');
    }
  }

  /**
   * Validate assessment data with clinical accuracy requirements
   */
  private validateAssessment(assessment: Assessment): void {
    if (!assessment.id || !assessment.type || !assessment.answers || !assessment.score) {
      throw new Error('Invalid assessment data: missing required fields');
    }

    if (!['phq9', 'gad7'].includes(assessment.type)) {
      throw new Error('Invalid assessment type');
    }

    // Validate scoring accuracy (critical for clinical compliance)
    const expectedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    if (assessment.score !== expectedScore) {
      throw new Error(`Assessment scoring error: expected ${expectedScore}, got ${assessment.score}`);
    }

    // Validate answer ranges
    const maxAnswerValue = assessment.type === 'phq9' ? 3 : 3;
    if (assessment.answers.some(answer => answer < 0 || answer > maxAnswerValue)) {
      throw new Error('Invalid assessment answer values');
    }

    // Validate question count
    const expectedQuestions = assessment.type === 'phq9' ? 9 : 7;
    if (assessment.answers.length !== expectedQuestions) {
      throw new Error(`Invalid number of answers: expected ${expectedQuestions}, got ${assessment.answers.length}`);
    }
  }

  /**
   * Validate crisis plan data
   */
  private validateCrisisPlan(crisisPlan: CrisisPlan): void {
    if (!crisisPlan.id || !crisisPlan.contacts) {
      throw new Error('Invalid crisis plan: missing required fields');
    }

    if (!crisisPlan.contacts.crisisLine) {
      throw new Error('Crisis plan must include crisis hotline');
    }

    // Ensure 988 is included as crisis line
    if (crisisPlan.contacts.crisisLine !== '988' && !crisisPlan.contacts.crisisLine.includes('988')) {
      console.warn('Crisis plan does not include 988 hotline');
    }
  }

  /**
   * Create standard "not ready" result
   */
  private createNotReadyResult(): SDKResult {
    return {
      success: false,
      error: 'SDK not ready - initialization failed or too many errors',
      errorCode: 'SDK_NOT_READY',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Increment error count and check if SDK should be disabled
   */
  private incrementErrorCount(): void {
    this.errorCount++;
    if (this.errorCount >= this.maxErrors) {
      console.error('Maximum error count reached - disabling Cloud SDK');
    }
  }

  /**
   * Reset error count (for recovery scenarios)
   */
  public resetErrorCount(): void {
    this.errorCount = 0;
  }

  /**
   * Update SDK configuration
   */
  public updateConfig(newConfig: Partial<SDKConfig>): SDKResult {
    try {
      this.config = SDKConfigSchema.parse({ ...this.config, ...newConfig });

      // Re-initialize services with new config
      this.initializeServices();

      return {
        success: true,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Config update failed',
        errorCode: 'CONFIG_UPDATE_FAILED',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cleanup and destroy SDK
   */
  public destroy(): void {
    this.initialized = false;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.errorCount = 0;

    // Cleanup underlying services
    zeroKnowledgeIntegration.destroy();
    supabaseClient.destroy();
  }
}

/**
 * Create configured SDK instance
 */
export const createCloudSDK = (config?: Partial<SDKConfig>): FullMindCloudSDK => {
  return new FullMindCloudSDK(config);
};

/**
 * Default SDK instance with production configuration
 */
export const cloudSDK = createCloudSDK({
  enableCloudSync: false, // Default OFF as per requirements
  enableEmergencySync: false,
  enableCrossDeviceSync: false,
  enableAuditLogging: true,
  syncIntervalMs: CLOUD_CONSTANTS.SYNC_INTERVAL_MS,
  batchSize: CLOUD_CONSTANTS.BATCH_SIZE,
  retryAttempts: CLOUD_CONSTANTS.MAX_RETRIES,
  timeoutMs: CLOUD_CONSTANTS.REQUEST_TIMEOUT_MS,
  emergencyTimeoutMs: CLOUD_CONSTANTS.EMERGENCY_SYNC_TIMEOUT_MS
});