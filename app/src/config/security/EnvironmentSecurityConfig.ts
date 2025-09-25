/**
 * Phase 7B: Security Environment Configuration Consolidation
 * 
 * Consolidated security environment management system that:
 * 1. Eliminates duplicate security environment variables
 * 2. Centralizes credential management 
 * 3. Maintains HIPAA compliance across all environments
 * 4. Preserves DataSensitivity.CRISIS encryption requirements
 * 5. Ensures crisis intervention accessibility (988 hotline)
 */

export interface SecurityEnvironmentConfig {
  readonly environment: 'development' | 'staging' | 'production';
  readonly encryption: EncryptionConfig;
  readonly crisis: CrisisSecurityConfig;
  readonly auth: AuthSecurityConfig;
  readonly compliance: ComplianceConfig;
  readonly performance: PerformanceSecurityConfig;
}

interface EncryptionConfig {
  readonly enabled: boolean;
  readonly level: 'AES-256' | 'AES-128';
  readonly keyRotationEnabled: boolean;
  readonly backupEncryption: boolean;
  readonly separatePaymentKeys: boolean;
}

interface CrisisSecurityConfig {
  readonly hotline: '988';
  readonly textLine: '741741';
  readonly emergencyServices: '911';
  readonly responseTimeoutMs: 200 | 50; // dev/staging: 200ms, prod: 50ms
  readonly paymentBypassEnabled: true;
  readonly alwaysAccessible: true;
  readonly detectionEnabled: true;
  readonly autoIntervention: true;
  readonly thresholds: {
    readonly phq9: 20;
    readonly gad7: 15;
  };
}

interface AuthSecurityConfig {
  readonly tokenExpirySeconds: number;
  readonly sessionTimeoutSeconds: number;
  readonly biometricEnabled: boolean;
  readonly secureStorageEnabled: true;
}

interface ComplianceConfig {
  readonly hipaaMode: 'development' | 'staging' | 'ready';
  readonly gdprCompliance: true;
  readonly auditLogging: boolean;
  readonly clinicalAuditTrail: true;
  readonly dataRetentionDays: number;
  readonly rightToDelete: true;
}

interface PerformanceSecurityConfig {
  readonly crisisButtonMaxMs: 200;
  readonly appLaunchMaxMs: number;
  readonly assessmentLoadMaxMs: number;
  readonly breathingFpsMin: 60;
  readonly checkinTransitionMaxMs: number;
}

/**
 * IMMUTABLE: Crisis intervention security settings
 * These values are safety-critical and must never be modified
 */
const CRISIS_SECURITY_CONSTANTS = {
  HOTLINE: '988' as const,
  TEXT_LINE: '741741' as const,
  EMERGENCY_SERVICES: '911' as const,
  PHQ9_CRISIS_THRESHOLD: 20 as const,
  GAD7_CRISIS_THRESHOLD: 15 as const,
  ALWAYS_ACCESSIBLE: true as const,
  PAYMENT_BYPASS_ENABLED: true as const,
  AUTO_INTERVENTION: true as const,
  DETECTION_ENABLED: true as const,
} as const;

/**
 * Environment-specific security configurations
 * Consolidates all duplicate environment variables into single source
 */
const SECURITY_CONFIGS: Record<string, SecurityEnvironmentConfig> = {
  development: {
    environment: 'development',
    encryption: {
      enabled: true,
      level: 'AES-256',
      keyRotationEnabled: false,
      backupEncryption: true,
      separatePaymentKeys: false,
    },
    crisis: {
      ...CRISIS_SECURITY_CONSTANTS,
      responseTimeoutMs: 200,
    },
    auth: {
      tokenExpirySeconds: 86400, // 24 hours
      sessionTimeoutSeconds: 3600, // 1 hour
      biometricEnabled: false,
      secureStorageEnabled: true,
    },
    compliance: {
      hipaaMode: 'development',
      gdprCompliance: true,
      auditLogging: true,
      clinicalAuditTrail: true,
      dataRetentionDays: 30,
      rightToDelete: true,
    },
    performance: {
      crisisButtonMaxMs: 200,
      appLaunchMaxMs: 3000,
      assessmentLoadMaxMs: 500,
      breathingFpsMin: 60,
      checkinTransitionMaxMs: 750,
    },
  },

  staging: {
    environment: 'staging',
    encryption: {
      enabled: true,
      level: 'AES-256',
      keyRotationEnabled: true,
      backupEncryption: true,
      separatePaymentKeys: true,
    },
    crisis: {
      ...CRISIS_SECURITY_CONSTANTS,
      responseTimeoutMs: 200,
    },
    auth: {
      tokenExpirySeconds: 86400, // 24 hours
      sessionTimeoutSeconds: 1800, // 30 minutes
      biometricEnabled: true,
      secureStorageEnabled: true,
    },
    compliance: {
      hipaaMode: 'staging',
      gdprCompliance: true,
      auditLogging: true,
      clinicalAuditTrail: true,
      dataRetentionDays: 365,
      rightToDelete: true,
    },
    performance: {
      crisisButtonMaxMs: 200,
      appLaunchMaxMs: 2000,
      assessmentLoadMaxMs: 300,
      breathingFpsMin: 60,
      checkinTransitionMaxMs: 500,
    },
  },

  production: {
    environment: 'production',
    encryption: {
      enabled: true,
      level: 'AES-256',
      keyRotationEnabled: true,
      backupEncryption: true,
      separatePaymentKeys: true,
    },
    crisis: {
      ...CRISIS_SECURITY_CONSTANTS,
      responseTimeoutMs: 50, // Production has stricter performance requirements
    },
    auth: {
      tokenExpirySeconds: 86400, // 24 hours
      sessionTimeoutSeconds: 1800, // 30 minutes
      biometricEnabled: true,
      secureStorageEnabled: true,
    },
    compliance: {
      hipaaMode: 'ready',
      gdprCompliance: true,
      auditLogging: true,
      clinicalAuditTrail: true,
      dataRetentionDays: 365,
      rightToDelete: true,
    },
    performance: {
      crisisButtonMaxMs: 200,
      appLaunchMaxMs: 2000,
      assessmentLoadMaxMs: 300,
      breathingFpsMin: 60,
      checkinTransitionMaxMs: 500,
    },
  },
} as const;

/**
 * Secure environment variable accessor
 * Validates environment and returns appropriate security configuration
 */
export class SecurityEnvironmentManager {
  private static instance: SecurityEnvironmentManager;
  private currentConfig: SecurityEnvironmentConfig;

  private constructor() {
    const env = this.detectEnvironment();
    this.currentConfig = SECURITY_CONFIGS[env];
    this.validateConfiguration();
  }

  public static getInstance(): SecurityEnvironmentManager {
    if (!SecurityEnvironmentManager.instance) {
      SecurityEnvironmentManager.instance = new SecurityEnvironmentManager();
    }
    return SecurityEnvironmentManager.instance;
  }

  /**
   * Get current security configuration
   */
  public getConfig(): SecurityEnvironmentConfig {
    return this.currentConfig;
  }

  /**
   * Get crisis-specific security settings (immutable)
   */
  public getCrisisConfig(): CrisisSecurityConfig {
    return this.currentConfig.crisis;
  }

  /**
   * Get encryption configuration
   */
  public getEncryptionConfig(): EncryptionConfig {
    return this.currentConfig.encryption;
  }

  /**
   * Get compliance configuration
   */
  public getComplianceConfig(): ComplianceConfig {
    return this.currentConfig.compliance;
  }

  /**
   * Validate DataSensitivity.CRISIS encryption requirements
   */
  public validateCrisisEncryption(): boolean {
    const config = this.currentConfig;
    
    // Crisis data must always be encrypted
    if (!config.encryption.enabled) {
      throw new Error('DataSensitivity.CRISIS requires encryption to be enabled');
    }

    // Must use AES-256 for crisis data
    if (config.encryption.level !== 'AES-256') {
      throw new Error('DataSensitivity.CRISIS requires AES-256 encryption');
    }

    // Crisis hotlines must be accessible
    if (!config.crisis.alwaysAccessible || !config.crisis.paymentBypassEnabled) {
      throw new Error('Crisis intervention must remain always accessible');
    }

    return true;
  }

  /**
   * Detect current environment from process.env
   */
  private detectEnvironment(): 'development' | 'staging' | 'production' {
    const env = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development';
    
    if (env === 'production' || env === 'prod') {
      return 'production';
    } else if (env === 'staging' || env === 'stage') {
      return 'staging';
    } else {
      return 'development';
    }
  }

  /**
   * Validate configuration integrity
   */
  private validateConfiguration(): void {
    // Validate crisis constants haven't been tampered with
    const crisis = this.currentConfig.crisis;
    if (crisis.hotline !== '988' || crisis.textLine !== '741741') {
      throw new Error('Crisis hotline configuration has been tampered with - security violation');
    }

    if (crisis.thresholds.phq9 !== 20 || crisis.thresholds.gad7 !== 15) {
      throw new Error('Clinical thresholds have been modified - safety violation');
    }

    // Validate encryption is always enabled
    if (!this.currentConfig.encryption.enabled) {
      throw new Error('Encryption cannot be disabled in any environment');
    }

    // Validate HIPAA compliance is always enabled
    if (!this.currentConfig.compliance.gdprCompliance) {
      throw new Error('GDPR compliance cannot be disabled');
    }

    this.validateCrisisEncryption();
  }
}

/**
 * Legacy environment variable compatibility layer
 * Provides backward compatibility while consolidating configuration
 */
export class LegacyEnvironmentBridge {
  private securityManager: SecurityEnvironmentManager;

  constructor() {
    this.securityManager = SecurityEnvironmentManager.getInstance();
  }

  /**
   * Get consolidated environment variable values
   * Maps old environment variables to new consolidated configuration
   */
  public getConsolidatedValues(): Record<string, string | boolean | number> {
    const config = this.securityManager.getConfig();

    return {
      // Crisis Configuration
      EXPO_PUBLIC_CRISIS_HOTLINE: config.crisis.hotline,
      EXPO_PUBLIC_CRISIS_TEXT_LINE: config.crisis.textLine,
      EXPO_PUBLIC_CRISIS_RESPONSE_TIMEOUT_MS: config.crisis.responseTimeoutMs,
      EXPO_PUBLIC_CRISIS_PAYMENT_BYPASS_ENABLED: config.crisis.paymentBypassEnabled,
      EXPO_PUBLIC_CRISIS_ALWAYS_ACCESSIBLE: config.crisis.alwaysAccessible,
      EXPO_PUBLIC_CRISIS_DETECTION_ENABLED: config.crisis.detectionEnabled,
      EXPO_PUBLIC_CRISIS_INTERVENTION_AUTO: config.crisis.autoIntervention,
      EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD: config.crisis.thresholds.phq9,
      EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD: config.crisis.thresholds.gad7,

      // Encryption Configuration
      EXPO_PUBLIC_ENCRYPTION_ENABLED: config.encryption.enabled,
      EXPO_PUBLIC_DATA_ENCRYPTION_LEVEL: config.encryption.level,
      EXPO_PUBLIC_BACKUP_ENCRYPTION: config.encryption.backupEncryption,
      EXPO_PUBLIC_PAYMENT_ENCRYPTION_SEPARATE_KEYS: config.encryption.separatePaymentKeys,

      // Authentication Configuration
      EXPO_PUBLIC_AUTH_TOKEN_EXPIRY: config.auth.tokenExpirySeconds,
      EXPO_PUBLIC_SESSION_TIMEOUT: config.auth.sessionTimeoutSeconds,
      EXPO_PUBLIC_BIOMETRIC_AUTH: config.auth.biometricEnabled,
      EXPO_PUBLIC_SECURE_STORAGE: config.auth.secureStorageEnabled,

      // Compliance Configuration
      EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE: config.compliance.hipaaMode,
      EXPO_PUBLIC_GDPR_COMPLIANCE: config.compliance.gdprCompliance,
      EXPO_PUBLIC_AUDIT_LOGGING: config.compliance.auditLogging,
      EXPO_PUBLIC_CLINICAL_AUDIT_TRAIL: config.compliance.clinicalAuditTrail,
      EXPO_PUBLIC_DATA_RETENTION_DAYS: config.compliance.dataRetentionDays,
      EXPO_PUBLIC_RIGHT_TO_DELETE: config.compliance.rightToDelete,

      // Performance Configuration
      EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS: config.performance.crisisButtonMaxMs,
      EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS: config.performance.appLaunchMaxMs,
      EXPO_PUBLIC_PERFORMANCE_ASSESSMENT_LOAD_MAX_MS: config.performance.assessmentLoadMaxMs,
      EXPO_PUBLIC_PERFORMANCE_BREATHING_FPS_MIN: config.performance.breathingFpsMin,
      EXPO_PUBLIC_PERFORMANCE_CHECKIN_TRANSITION_MAX_MS: config.performance.checkinTransitionMaxMs,
    };
  }

  /**
   * Get specific consolidated value with type safety
   */
  public getValue<T = string | boolean | number>(key: string): T {
    const values = this.getConsolidatedValues();
    return values[key] as T;
  }
}

// Export singleton instances for easy consumption
export const securityEnvironment = SecurityEnvironmentManager.getInstance();
export const legacyBridge = new LegacyEnvironmentBridge();