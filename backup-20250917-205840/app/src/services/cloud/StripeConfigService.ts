/**
 * Stripe Configuration Service for FullMind MBCT App
 *
 * Manages Stripe SDK configuration with:
 * - HIPAA-compliant environment setup
 * - Crisis-safe configuration loading
 * - PCI DSS compliant key management
 * - Integration with React Native Stripe SDK
 * - Environment-specific configuration management
 */

import { StripeProvider, initStripe } from '@stripe/stripe-react-native';
import { PaymentConfig } from '../../types/payment';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Stripe Environment Configuration
 */
interface StripeEnvironmentConfig {
  publishableKey: string;
  merchantIdentifier?: string; // For Apple Pay
  googlePayMerchantId?: string; // For Google Pay
  webhookEndpoint?: string;
  environment: 'production' | 'test' | 'development';
  crisisMode: boolean;
}

/**
 * Stripe SDK Configuration Options
 */
interface StripeSDKConfig {
  publishableKey: string;
  merchantIdentifier?: string;
  urlScheme?: string;
  applePay?: {
    merchantIdentifier: string;
    buttonType?: 'plain' | 'buy' | 'setup' | 'inStore' | 'donate' | 'checkout' | 'book' | 'subscribe' | 'reload' | 'addMoney' | 'topUp' | 'order' | 'rent' | 'support' | 'contribute' | 'tip';
  };
  googlePay?: {
    merchantIdentifier: string;
    environment: 'test' | 'production';
    countryCode: string;
    currencyCode: string;
  };
  appearance?: {
    theme: 'automatic' | 'light' | 'dark';
    primaryColor?: string;
    backgroundColor?: string;
    componentBackgroundColor?: string;
    componentBorderColor?: string;
    primaryTextColor?: string;
    secondaryTextColor?: string;
    componentTextColor?: string;
    iconColor?: string;
    placeholderTextColor?: string;
  };
}

/**
 * Stripe Configuration Service
 *
 * Handles secure initialization and configuration of Stripe SDK
 * with crisis safety and HIPAA compliance considerations.
 */
export class StripeConfigService {
  private static instance: StripeConfigService;
  private initialized = false;
  private config: StripeEnvironmentConfig | null = null;
  private sdkConfig: StripeSDKConfig | null = null;

  private constructor() {}

  public static getInstance(): StripeConfigService {
    if (!StripeConfigService.instance) {
      StripeConfigService.instance = new StripeConfigService();
    }
    return StripeConfigService.instance;
  }

  /**
   * Initialize Stripe configuration from environment variables
   */
  async initialize(): Promise<StripeEnvironmentConfig> {
    try {
      console.log('Initializing Stripe configuration...');

      // Load configuration from environment
      const envConfig = await this.loadEnvironmentConfig();

      // Validate configuration
      await this.validateConfiguration(envConfig);

      // Initialize Stripe SDK
      await this.initializeStripeSDK(envConfig);

      this.config = envConfig;
      this.initialized = true;

      console.log(`Stripe configured for ${envConfig.environment} environment`);

      return envConfig;

    } catch (error) {
      console.error('Stripe configuration initialization failed:', error);

      // CRISIS SAFETY: Enable emergency configuration if initialization fails
      const emergencyConfig = await this.createEmergencyConfiguration();
      this.config = emergencyConfig;
      this.initialized = true;

      console.log('Emergency Stripe configuration enabled for crisis safety');
      return emergencyConfig;
    }
  }

  /**
   * Get current Stripe configuration
   */
  getConfig(): StripeEnvironmentConfig | null {
    return this.config;
  }

  /**
   * Check if Stripe is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get Stripe SDK configuration for React Native components
   */
  getSDKConfig(): StripeSDKConfig | null {
    return this.sdkConfig;
  }

  /**
   * Create PaymentConfig for payment API service
   */
  createPaymentConfig(): PaymentConfig {
    if (!this.config) {
      throw new Error('Stripe configuration not initialized');
    }

    const paymentConfig: PaymentConfig = {
      stripe: {
        publishableKey: this.config.publishableKey,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET, // Server-side only
        apiVersion: this.getStripeApiVersion(),
        timeout: this.getPaymentTimeout(),
        maxRetries: this.getMaxRetries(),
        enableApplePay: this.isApplePayEnabled(),
        enableGooglePay: this.isGooglePayEnabled()
      },
      subscription: {
        defaultTrialDays: this.getDefaultTrialDays(),
        gracePeriodDays: this.getGracePeriodDays(),
        retryAttempts: this.getSubscriptionRetryAttempts(),
        invoiceReminders: this.isInvoiceRemindersEnabled()
      },
      crisis: {
        enablePaymentBypass: this.isCrisisPaymentBypassEnabled(),
        emergencyAccessDuration: this.getCrisisAccessDuration(),
        crisisDetectionTimeout: this.getCrisisResponseTimeout(),
        hotlineAlwaysAccessible: this.isHotlineAlwaysAccessible()
      },
      security: {
        enableFraudDetection: this.isFraudDetectionEnabled(),
        rateLimit: {
          maxAttemptsPerMinute: this.getRateLimitPerMinute(),
          blockDurationMinutes: this.getRateLimitBlockDuration()
        },
        tokenExpiry: {
          paymentMethods: this.getPaymentTokenExpiry(),
          sessions: this.getSessionTokenExpiry()
        }
      },
      compliance: {
        pciDssLevel: this.getPCIDSSLevel() as '1' | '2' | '3' | '4',
        auditRetentionYears: this.getAuditRetentionYears(),
        enableDetailedLogging: this.isDetailedLoggingEnabled(),
        hipaaCompliant: this.isHIPAACompliant()
      }
    };

    return paymentConfig;
  }

  /**
   * Enable crisis mode configuration
   */
  async enableCrisisMode(): Promise<void> {
    try {
      if (this.config) {
        this.config.crisisMode = true;

        // Update SDK configuration for crisis mode
        await this.updateSDKForCrisisMode();

        console.log('Stripe configuration switched to crisis mode');
      }
    } catch (error) {
      console.error('Failed to enable crisis mode in Stripe config:', error);
      // Should not throw - crisis mode must be enabled
    }
  }

  /**
   * Disable crisis mode configuration
   */
  async disableCrisisMode(): Promise<void> {
    try {
      if (this.config) {
        this.config.crisisMode = false;

        // Restore normal SDK configuration
        await this.restoreNormalSDKConfiguration();

        console.log('Stripe configuration restored to normal mode');
      }
    } catch (error) {
      console.error('Failed to disable crisis mode in Stripe config:', error);
    }
  }

  /**
   * Validate Stripe integration health
   */
  async validateHealth(): Promise<{
    configured: boolean;
    sdkInitialized: boolean;
    keysValid: boolean;
    applePayAvailable: boolean;
    googlePayAvailable: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check basic configuration
      const configured = this.isInitialized();
      if (!configured) {
        errors.push('Stripe configuration not initialized');
      }

      // Check SDK initialization
      const sdkInitialized = this.sdkConfig !== null;
      if (!sdkInitialized) {
        errors.push('Stripe SDK not initialized');
      }

      // Validate keys
      const keysValid = await this.validateKeys();
      if (!keysValid) {
        errors.push('Invalid Stripe keys');
      }

      // Check Apple Pay availability
      const applePayAvailable = await this.checkApplePayAvailability();

      // Check Google Pay availability
      const googlePayAvailable = await this.checkGooglePayAvailability();

      return {
        configured,
        sdkInitialized,
        keysValid,
        applePayAvailable,
        googlePayAvailable,
        errors
      };

    } catch (error) {
      console.error('Stripe health validation failed:', error);
      return {
        configured: false,
        sdkInitialized: false,
        keysValid: false,
        applePayAvailable: false,
        googlePayAvailable: false,
        errors: ['Health validation failed', error.message]
      };
    }
  }

  // PRIVATE METHODS

  /**
   * Load configuration from environment variables
   */
  private async loadEnvironmentConfig(): Promise<StripeEnvironmentConfig> {
    const env = Constants.expoConfig?.extra?.env || process.env.EXPO_PUBLIC_ENV || 'development';
    const paymentEnv = process.env.EXPO_PUBLIC_PAYMENT_ENVIRONMENT || env;

    // Determine publishable key based on environment
    let publishableKey: string;
    if (paymentEnv === 'production') {
      publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD || '';
    } else {
      publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST || '';
    }

    if (!publishableKey) {
      throw new Error(`Stripe publishable key not found for environment: ${paymentEnv}`);
    }

    const config: StripeEnvironmentConfig = {
      publishableKey,
      merchantIdentifier: this.getMerchantIdentifier(),
      googlePayMerchantId: this.getGooglePayMerchantId(),
      webhookEndpoint: process.env.EXPO_PUBLIC_STRIPE_WEBHOOK_ENDPOINT,
      environment: paymentEnv as 'production' | 'test' | 'development',
      crisisMode: this.isCrisisPaymentBypassEnabled()
    };

    return config;
  }

  /**
   * Validate Stripe configuration
   */
  private async validateConfiguration(config: StripeEnvironmentConfig): Promise<void> {
    // Validate publishable key format
    const keyPrefix = config.environment === 'production' ? 'pk_live_' : 'pk_test_';
    if (!config.publishableKey.startsWith(keyPrefix)) {
      throw new Error(`Invalid publishable key for ${config.environment} environment`);
    }

    // Validate Apple Pay configuration if enabled
    if (this.isApplePayEnabled() && !config.merchantIdentifier) {
      console.warn('Apple Pay enabled but no merchant identifier provided');
    }

    // Validate Google Pay configuration if enabled
    if (this.isGooglePayEnabled() && !config.googlePayMerchantId) {
      console.warn('Google Pay enabled but no merchant ID provided');
    }

    console.log('Stripe configuration validation passed');
  }

  /**
   * Initialize Stripe SDK with configuration
   */
  private async initializeStripeSDK(config: StripeEnvironmentConfig): Promise<void> {
    try {
      // Create SDK configuration
      const sdkConfig: StripeSDKConfig = {
        publishableKey: config.publishableKey,
        merchantIdentifier: config.merchantIdentifier,
        urlScheme: 'fullmind', // Deep link scheme for payment redirects
        applePay: this.isApplePayEnabled() ? {
          merchantIdentifier: config.merchantIdentifier || 'merchant.com.fullmind.mbct',
          buttonType: 'subscribe'
        } : undefined,
        googlePay: this.isGooglePayEnabled() ? {
          merchantIdentifier: config.googlePayMerchantId || 'fullmind-merchant',
          environment: config.environment === 'production' ? 'production' : 'test',
          countryCode: 'US',
          currencyCode: 'USD'
        } : undefined,
        appearance: this.createAppearanceConfig()
      };

      // Initialize Stripe SDK
      await initStripe(sdkConfig);

      this.sdkConfig = sdkConfig;
      console.log('Stripe SDK initialized successfully');

    } catch (error) {
      console.error('Stripe SDK initialization failed:', error);
      throw new Error(`Stripe SDK initialization failed: ${error.message}`);
    }
  }

  /**
   * Create emergency configuration for crisis situations
   */
  private async createEmergencyConfiguration(): Promise<StripeEnvironmentConfig> {
    const emergencyConfig: StripeEnvironmentConfig = {
      publishableKey: 'pk_test_emergency_crisis_mode', // Mock key for crisis
      environment: 'development',
      crisisMode: true
    };

    // Initialize with minimal SDK configuration for crisis mode
    try {
      const emergencySDKConfig: StripeSDKConfig = {
        publishableKey: emergencyConfig.publishableKey,
        urlScheme: 'fullmind',
        appearance: {
          theme: 'automatic',
          primaryColor: '#E74C3C' // Red to indicate emergency mode
        }
      };

      this.sdkConfig = emergencySDKConfig;
      console.log('Emergency Stripe SDK configuration created');

    } catch (error) {
      console.error('Emergency SDK configuration failed:', error);
    }

    return emergencyConfig;
  }

  /**
   * Update SDK configuration for crisis mode
   */
  private async updateSDKForCrisisMode(): Promise<void> {
    try {
      if (this.sdkConfig) {
        // Update appearance for crisis mode
        this.sdkConfig.appearance = {
          ...this.sdkConfig.appearance,
          primaryColor: '#E74C3C', // Red for crisis mode
          theme: 'automatic'
        };

        console.log('SDK configuration updated for crisis mode');
      }
    } catch (error) {
      console.error('Failed to update SDK for crisis mode:', error);
    }
  }

  /**
   * Restore normal SDK configuration
   */
  private async restoreNormalSDKConfiguration(): Promise<void> {
    try {
      if (this.sdkConfig) {
        // Restore normal appearance
        this.sdkConfig.appearance = this.createAppearanceConfig();

        console.log('SDK configuration restored to normal mode');
      }
    } catch (error) {
      console.error('Failed to restore normal SDK configuration:', error);
    }
  }

  /**
   * Create appearance configuration for Stripe components
   */
  private createAppearanceConfig(): StripeSDKConfig['appearance'] {
    const theme = process.env.EXPO_PUBLIC_PAYMENT_SHEET_APPEARANCE_THEME || 'automatic';
    const primaryColor = process.env.EXPO_PUBLIC_PAYMENT_SHEET_PRIMARY_COLOR || '#2C8A82';

    return {
      theme: theme as 'automatic' | 'light' | 'dark',
      primaryColor,
      backgroundColor: undefined, // Use default
      componentBackgroundColor: undefined, // Use default
      componentBorderColor: undefined, // Use default
      primaryTextColor: undefined, // Use default
      secondaryTextColor: undefined, // Use default
      componentTextColor: undefined, // Use default
      iconColor: undefined, // Use default
      placeholderTextColor: undefined // Use default
    };
  }

  /**
   * Validate Stripe keys
   */
  private async validateKeys(): Promise<boolean> {
    try {
      if (!this.config) return false;

      // Basic validation - in production, this would make a test API call
      const key = this.config.publishableKey;
      const isValidFormat = key.startsWith('pk_');
      const isCorrectEnv = this.config.environment === 'production'
        ? key.startsWith('pk_live_')
        : key.startsWith('pk_test_');

      return isValidFormat && isCorrectEnv;

    } catch (error) {
      console.error('Key validation failed:', error);
      return false;
    }
  }

  /**
   * Check Apple Pay availability
   */
  private async checkApplePayAvailability(): Promise<boolean> {
    try {
      // This would use the actual Stripe SDK method in production
      // For React Native: await isApplePaySupported()
      return Platform.OS === 'ios' && this.isApplePayEnabled();
    } catch (error) {
      console.error('Apple Pay availability check failed:', error);
      return false;
    }
  }

  /**
   * Check Google Pay availability
   */
  private async checkGooglePayAvailability(): Promise<boolean> {
    try {
      // This would use the actual Stripe SDK method in production
      // For React Native: await isGooglePaySupported()
      return Platform.OS === 'android' && this.isGooglePayEnabled();
    } catch (error) {
      console.error('Google Pay availability check failed:', error);
      return false;
    }
  }

  // Configuration getter methods
  private getMerchantIdentifier(): string | undefined {
    return process.env.EXPO_PUBLIC_APPLE_PAY_MERCHANT_ID || 'merchant.com.fullmind.mbct';
  }

  private getGooglePayMerchantId(): string | undefined {
    return process.env.EXPO_PUBLIC_GOOGLE_PAY_MERCHANT_ID || 'fullmind-merchant';
  }

  private getStripeApiVersion(): string {
    return process.env.EXPO_PUBLIC_STRIPE_API_VERSION || '2023-10-16';
  }

  private getPaymentTimeout(): number {
    return parseInt(process.env.EXPO_PUBLIC_STRIPE_TIMEOUT_MS || '30000');
  }

  private getMaxRetries(): number {
    return parseInt(process.env.EXPO_PUBLIC_STRIPE_MAX_RETRIES || '3');
  }

  private isApplePayEnabled(): boolean {
    return process.env.EXPO_PUBLIC_STRIPE_APPLE_PAY_ENABLED === 'true';
  }

  private isGooglePayEnabled(): boolean {
    return process.env.EXPO_PUBLIC_STRIPE_GOOGLE_PAY_ENABLED === 'true';
  }

  private getDefaultTrialDays(): number {
    return parseInt(process.env.EXPO_PUBLIC_SUBSCRIPTION_DEFAULT_TRIAL_DAYS || '7');
  }

  private getGracePeriodDays(): number {
    return parseInt(process.env.EXPO_PUBLIC_SUBSCRIPTION_GRACE_PERIOD_DAYS || '3');
  }

  private getSubscriptionRetryAttempts(): number {
    return parseInt(process.env.EXPO_PUBLIC_SUBSCRIPTION_RETRY_ATTEMPTS || '3');
  }

  private isInvoiceRemindersEnabled(): boolean {
    return process.env.EXPO_PUBLIC_SUBSCRIPTION_INVOICE_REMINDERS === 'true';
  }

  private isCrisisPaymentBypassEnabled(): boolean {
    return process.env.EXPO_PUBLIC_CRISIS_PAYMENT_BYPASS_ENABLED === 'true';
  }

  private getCrisisAccessDuration(): number {
    return parseInt(process.env.EXPO_PUBLIC_CRISIS_SUBSCRIPTION_OVERRIDE_HOURS || '24');
  }

  private getCrisisResponseTimeout(): number {
    return parseInt(process.env.EXPO_PUBLIC_CRISIS_RESPONSE_TIMEOUT_MS || '200');
  }

  private isHotlineAlwaysAccessible(): boolean {
    return process.env.EXPO_PUBLIC_PAYMENT_988_HOTLINE_NEVER_BLOCKED === 'true';
  }

  private isFraudDetectionEnabled(): boolean {
    return process.env.EXPO_PUBLIC_PAYMENT_FRAUD_DETECTION_ENABLED === 'true';
  }

  private getRateLimitPerMinute(): number {
    return parseInt(process.env.EXPO_PUBLIC_PAYMENT_RATE_LIMIT_PER_MINUTE || '10');
  }

  private getRateLimitBlockDuration(): number {
    return parseInt(process.env.EXPO_PUBLIC_PAYMENT_RATE_LIMIT_BLOCK_DURATION_MIN || '5');
  }

  private getPaymentTokenExpiry(): number {
    return parseInt(process.env.EXPO_PUBLIC_PAYMENT_TOKEN_EXPIRY_HOURS || '24');
  }

  private getSessionTokenExpiry(): number {
    return parseInt(process.env.EXPO_PUBLIC_PAYMENT_SESSION_EXPIRY_HOURS || '2');
  }

  private getPCIDSSLevel(): string {
    return process.env.EXPO_PUBLIC_PAYMENT_PCI_DSS_LEVEL || '2';
  }

  private getAuditRetentionYears(): number {
    return parseInt(process.env.EXPO_PUBLIC_PAYMENT_AUDIT_RETENTION_YEARS || '7');
  }

  private isDetailedLoggingEnabled(): boolean {
    return process.env.EXPO_PUBLIC_PAYMENT_DETAILED_LOGGING === 'true';
  }

  private isHIPAACompliant(): boolean {
    return process.env.EXPO_PUBLIC_PAYMENT_HIPAA_COMPLIANT === 'true';
  }
}

// Export singleton instance
export const stripeConfigService = StripeConfigService.getInstance();