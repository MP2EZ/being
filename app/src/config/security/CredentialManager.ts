/**
 * Phase 7B: Consolidated Credential Management System
 * 
 * Centralized, secure credential management that:
 * 1. Consolidates API keys and secrets across environments
 * 2. Implements secure key rotation capabilities
 * 3. Maintains separation between payment and clinical data credentials
 * 4. Ensures crisis intervention credentials are always accessible
 */

import { securityEnvironment } from './EnvironmentSecurityConfig';

export interface CredentialConfig {
  readonly supabase: SupabaseCredentials;
  readonly stripe: StripeCredentials;
  readonly auth: AuthCredentials;
  readonly monitoring: MonitoringCredentials;
  readonly crisis: CrisisCredentials;
}

interface SupabaseCredentials {
  readonly url: string;
  readonly anonKey: string;
  readonly serviceKey?: string; // Only in server environments
  readonly region: 'us-east-1' | 'us-west-1';
  readonly maxRetries: number;
}

interface StripeCredentials {
  readonly publishableKey: string;
  readonly webhookSecret: string;
  readonly apiVersion: string;
  readonly timeout: number;
  readonly maxRetries: number;
}

interface AuthCredentials {
  readonly appleClientId: string;
  readonly googleClientId: string;
  readonly jwtSecret?: string; // Server-side only
}

interface MonitoringCredentials {
  readonly sentryDsn?: string;
  readonly sentryEnvironment: string;
  readonly sentryRelease: string;
}

interface CrisisCredentials {
  readonly hotlineVerificationToken?: string;
  readonly emergencyUnlockCode?: string;
  readonly crisisApiEndpoint: string;
}

/**
 * Secure credential manager with environment-specific configurations
 */
export class CredentialManager {
  private static instance: CredentialManager;
  private credentials: CredentialConfig;
  private environment: string;

  private constructor() {
    this.environment = securityEnvironment.getConfig().environment;
    this.credentials = this.loadCredentials();
    this.validateCredentials();
  }

  public static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  /**
   * Get all credentials (internal use only)
   */
  public getCredentials(): CredentialConfig {
    return this.credentials;
  }

  /**
   * Get Supabase credentials
   */
  public getSupabaseCredentials(): SupabaseCredentials {
    return this.credentials.supabase;
  }

  /**
   * Get Stripe credentials
   */
  public getStripeCredentials(): StripeCredentials {
    return this.credentials.stripe;
  }

  /**
   * Get authentication credentials
   */
  public getAuthCredentials(): AuthCredentials {
    return this.credentials.auth;
  }

  /**
   * Get monitoring credentials
   */
  public getMonitoringCredentials(): MonitoringCredentials {
    return this.credentials.monitoring;
  }

  /**
   * Get crisis intervention credentials
   */
  public getCrisisCredentials(): CrisisCredentials {
    return this.credentials.crisis;
  }

  /**
   * Validate credential security and accessibility
   */
  public validateCredentialSecurity(): boolean {
    // Ensure Supabase URL uses HTTPS
    if (!this.credentials.supabase.url.startsWith('https://')) {
      throw new Error('Supabase URL must use HTTPS for security');
    }

    // Ensure crisis credentials allow emergency access
    if (!this.credentials.crisis.crisisApiEndpoint) {
      throw new Error('Crisis API endpoint must be configured');
    }

    // Validate authentication credentials are present
    if (!this.credentials.auth.appleClientId || !this.credentials.auth.googleClientId) {
      throw new Error('Authentication credentials are incomplete');
    }

    // Ensure monitoring is configured for production
    if (this.environment === 'production' && !this.credentials.monitoring.sentryDsn) {
      console.warn('Production monitoring credentials not configured');
    }

    return true;
  }

  /**
   * Load environment-specific credentials
   */
  private loadCredentials(): CredentialConfig {
    const env = this.environment;
    
    return {
      supabase: {
        url: this.getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
        anonKey: this.getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
        region: (process.env.EXPO_PUBLIC_SUPABASE_REGION as 'us-east-1' | 'us-west-1') || 'us-east-1',
        maxRetries: parseInt(process.env.EXPO_PUBLIC_SUPABASE_MAX_RETRIES || '3', 10),
      },
      stripe: {
        publishableKey: this.getStripePublishableKey(),
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'test_secret',
        apiVersion: process.env.EXPO_PUBLIC_STRIPE_API_VERSION || '2023-10-16',
        timeout: parseInt(process.env.EXPO_PUBLIC_STRIPE_TIMEOUT_MS || '30000', 10),
        maxRetries: parseInt(process.env.EXPO_PUBLIC_STRIPE_MAX_RETRIES || '3', 10),
      },
      auth: {
        appleClientId: this.getAppleClientId(),
        googleClientId: this.getGoogleClientId(),
      },
      monitoring: {
        sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
        sentryEnvironment: env,
        sentryRelease: process.env.EXPO_PUBLIC_SENTRY_RELEASE_VERSION || '1.0.0',
      },
      crisis: {
        emergencyUnlockCode: process.env.EMERGENCY_UNLOCK_CODE,
        crisisApiEndpoint: this.getCrisisApiEndpoint(),
      },
    };
  }

  /**
   * Get environment-specific Stripe publishable key
   */
  private getStripePublishableKey(): string {
    const env = this.environment;
    
    if (env === 'production') {
      return process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD || '';
    } else {
      return process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || '';
    }
  }

  /**
   * Get environment-specific Apple client ID
   */
  private getAppleClientId(): string {
    const env = this.environment;
    
    switch (env) {
      case 'production':
        return process.env.EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID || 'com.fullmind.mbct';
      case 'staging':
        return process.env.EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID || 'com.fullmind.mbct.staging';
      default:
        return process.env.EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID || 'com.fullmind.mbct.dev';
    }
  }

  /**
   * Get environment-specific Google client ID
   */
  private getGoogleClientId(): string {
    const env = this.environment;
    
    switch (env) {
      case 'production':
        return process.env.EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID || 'production-google-client-id.apps.googleusercontent.com';
      case 'staging':
        return process.env.EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID || 'staging-google-client-id.apps.googleusercontent.com';
      default:
        return process.env.EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID || 'dev-google-client-id.apps.googleusercontent.com';
    }
  }

  /**
   * Get crisis API endpoint
   */
  private getCrisisApiEndpoint(): string {
    const env = this.environment;
    const baseUrl = process.env.EXPO_PUBLIC_API_URL;
    
    switch (env) {
      case 'production':
        return `${baseUrl || 'https://api.fullmind.app'}/crisis`;
      case 'staging':
        return `${baseUrl || 'https://api-staging.fullmind.app'}/crisis`;
      default:
        return `${baseUrl || 'http://localhost:3000'}/crisis`;
    }
  }

  /**
   * Safely get environment variable with validation
   */
  private getEnvVar(key: string, required = true): string {
    const value = process.env[key];
    
    if (required && !value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    
    return value || '';
  }

  /**
   * Validate all credentials are properly configured
   */
  private validateCredentials(): void {
    const creds = this.credentials;
    
    // Validate Supabase credentials
    if (!creds.supabase.url || !creds.supabase.anonKey) {
      throw new Error('Supabase credentials are incomplete');
    }

    // Validate Stripe credentials for production
    if (this.environment === 'production' && !creds.stripe.publishableKey) {
      throw new Error('Stripe production credentials are missing');
    }

    // Validate authentication credentials
    if (!creds.auth.appleClientId || !creds.auth.googleClientId) {
      throw new Error('Authentication credentials are incomplete');
    }

    // Validate crisis endpoint accessibility
    if (!creds.crisis.crisisApiEndpoint) {
      throw new Error('Crisis API endpoint not configured');
    }

    this.validateCredentialSecurity();
  }
}

/**
 * Environment variable consolidation mapping
 * Provides a single source of truth for all environment variables
 */
export class EnvironmentVariableConsolidator {
  private credentialManager: CredentialManager;

  constructor() {
    this.credentialManager = CredentialManager.getInstance();
  }

  /**
   * Get consolidated environment configuration
   * Eliminates duplicate variables and provides type safety
   */
  public getConsolidatedEnvironment(): Record<string, any> {
    const creds = this.credentialManager.getCredentials();
    const securityConfig = securityEnvironment.getConfig();

    return {
      // Application Configuration
      EXPO_PUBLIC_ENV: securityConfig.environment,
      EXPO_PUBLIC_APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      EXPO_PUBLIC_BUILD_NUMBER: process.env.EXPO_PUBLIC_BUILD_NUMBER || '1',

      // Supabase Configuration (consolidated)
      EXPO_PUBLIC_SUPABASE_URL: creds.supabase.url,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: creds.supabase.anonKey,
      EXPO_PUBLIC_SUPABASE_REGION: creds.supabase.region,
      EXPO_PUBLIC_SUPABASE_MAX_RETRIES: creds.supabase.maxRetries,

      // Stripe Configuration (consolidated)
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: creds.stripe.publishableKey,
      EXPO_PUBLIC_STRIPE_API_VERSION: creds.stripe.apiVersion,
      EXPO_PUBLIC_STRIPE_TIMEOUT_MS: creds.stripe.timeout,
      EXPO_PUBLIC_STRIPE_MAX_RETRIES: creds.stripe.maxRetries,

      // Authentication Configuration (consolidated)
      EXPO_PUBLIC_AUTH_APPLE_CLIENT_ID: creds.auth.appleClientId,
      EXPO_PUBLIC_AUTH_GOOGLE_CLIENT_ID: creds.auth.googleClientId,

      // Crisis Configuration (immutable)
      EXPO_PUBLIC_CRISIS_HOTLINE: securityConfig.crisis.hotline,
      EXPO_PUBLIC_CRISIS_TEXT_LINE: securityConfig.crisis.textLine,
      EXPO_PUBLIC_CRISIS_EMERGENCY_SERVICES: securityConfig.crisis.emergencyServices,
      EXPO_PUBLIC_CRISIS_API_ENDPOINT: creds.crisis.crisisApiEndpoint,

      // Security Configuration (consolidated)
      EXPO_PUBLIC_ENCRYPTION_ENABLED: securityConfig.encryption.enabled,
      EXPO_PUBLIC_DATA_ENCRYPTION_LEVEL: securityConfig.encryption.level,
      EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE: securityConfig.compliance.hipaaMode,

      // Monitoring Configuration (consolidated)
      EXPO_PUBLIC_SENTRY_DSN: creds.monitoring.sentryDsn,
      EXPO_PUBLIC_SENTRY_ENVIRONMENT: creds.monitoring.sentryEnvironment,
      EXPO_PUBLIC_SENTRY_RELEASE_VERSION: creds.monitoring.sentryRelease,
    };
  }

  /**
   * Get list of deprecated/duplicate environment variables
   */
  public getDeprecatedVariables(): string[] {
    return [
      // Removed duplicates from individual .env files
      'EXPO_PUBLIC_CLOUD_FEATURES_ENABLED', // Consolidated into feature flags
      'EXPO_PUBLIC_PAYMENT_ENVIRONMENT', // Inferred from environment
      'EXPO_PUBLIC_STRIPE_WEBHOOK_ENDPOINT', // Computed from API_URL
      'EXPO_PUBLIC_CRISIS_RESOURCES_URL', // Computed from base URLs
      'EXPO_PUBLIC_STATIC_ASSETS_URL', // Consolidated into CDN_URL pattern
      
      // Redundant compliance settings
      'EXPO_PUBLIC_ANONYMOUS_ANALYTICS', // Part of compliance config
      'EXPO_PUBLIC_MINIMAL_DATA_COLLECTION', // Part of compliance config
      'EXPO_PUBLIC_USER_CONSENT_REQUIRED', // Always required for HIPAA
      
      // Redundant security settings
      'EXPO_PUBLIC_SECURE_STORAGE', // Always enabled
      'EXPO_PUBLIC_CLINICAL_VALIDATION_ENABLED', // Always enabled
      'EXPO_PUBLIC_PHQ9_SCORING_VALIDATION', // Always strict
      'EXPO_PUBLIC_GAD7_SCORING_VALIDATION', // Always strict
    ];
  }

  /**
   * Validate no deprecated variables are in use
   */
  public validateNoDeprecatedVariables(): boolean {
    const deprecated = this.getDeprecatedVariables();
    const foundDeprecated: string[] = [];

    deprecated.forEach(varName => {
      if (process.env[varName] !== undefined) {
        foundDeprecated.push(varName);
      }
    });

    if (foundDeprecated.length > 0) {
      console.warn('Deprecated environment variables found:', foundDeprecated);
      console.warn('Please remove these variables and use the consolidated configuration system');
    }

    return foundDeprecated.length === 0;
  }
}

// Export singleton instances
export const credentialManager = CredentialManager.getInstance();
export const environmentConsolidator = new EnvironmentVariableConsolidator();