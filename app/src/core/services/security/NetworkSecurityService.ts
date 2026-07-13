/**
 * NETWORK SECURITY SERVICE - DRD-FLOW-005 Security Implementation
 *
 * Scope after MAINT-238: this service no longer carries a request pipeline.
 * The former `secureRequest()` machinery (request signing, certificate-pinning
 * setup, response integrity/encryption verification, rate limiting, retry/abort
 * tracking, and the SecurityViolationEvent log) was an unused mock with zero
 * production callers and has been removed.
 *
 * What remains is the live surface that other layers actually depend on:
 * - `initialize()` — awaited by CrisisSecurityProtocol.initialize() and
 *   SecurityMonitoringService.initialize(); must resolve.
 * - `getSecurityMetrics()` / `NetworkSecurityMetrics` — read by
 *   SecurityMonitoringService.assessNetworkSecurity() and
 *   checkDataProtectionCompliance() (successfulRequests / totalRequests /
 *   securityViolations).
 * - getInstance() singleton + default export + __resetForTesting__().
 */

import EncryptionService from './EncryptionService';
import AuthenticationService from './AuthenticationService';
import { logPerformance, logError, LogCategory } from '../logging';

/**
 * NETWORK SECURITY CONFIGURATION
 */
export const NETWORK_CONFIG = {
  /** Security headers */
  REQUIRED_SECURITY_HEADERS: [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Strict-Transport-Security',
    'Content-Security-Policy'
  ] as const,

  /** TLS configuration */
  MIN_TLS_VERSION: '1.3',
  CIPHER_SUITES: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ] as const,

  /** Rate limiting */
  RATE_LIMITS: {
    standard: { requests: 100, windowMs: 60000 },      // 100 req/min
    crisis: { requests: 1000, windowMs: 60000 },       // 1000 req/min
    assessment: { requests: 50, windowMs: 60000 },     // 50 req/min
    bulk: { requests: 10, windowMs: 60000 }            // 10 req/min
  },

  /** Performance thresholds */
  PERFORMANCE_THRESHOLDS: {
    standard_api_ms: 1000,
    crisis_api_ms: 200,
    assessment_upload_ms: 500,
    bulk_operation_ms: 2000
  },

  /** Retry configuration */
  RETRY_CONFIG: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2
  },

  /** Request timeout */
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds

  /** Security validation */
  SIGNATURE_ALGORITHM: 'HMAC-SHA256',
  NONCE_LENGTH: 32,
  TIMESTAMP_TOLERANCE_MS: 300000 // 5 minutes
} as const;

/**
 * NETWORK SECURITY METRICS
 *
 * EXACT field shape is load-bearing: SecurityMonitoringService reads
 * successfulRequests, totalRequests, and securityViolations.
 */
export interface NetworkSecurityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  securityViolations: number;
  certificateFailures: number;
  encryptionFailures: number;
  retryAttempts: number;
  rateLimitHits: number;
  performanceViolations: number;
  timestamp: number;
}

/**
 * NETWORK SECURITY SERVICE
 * Initializes the security dependency chain and exposes network security metrics.
 */
export class NetworkSecurityService {
  private static instance: NetworkSecurityService;
  private encryptionService: typeof EncryptionService;
  private authenticationService: typeof AuthenticationService;
  private securityMetrics: NetworkSecurityMetrics;
  private initialized: boolean = false;

  private constructor() {
    this.encryptionService = EncryptionService;
    this.authenticationService = AuthenticationService;
    this.securityMetrics = this.initializeMetrics();
  }

  public static getInstance(): NetworkSecurityService {
    if (!NetworkSecurityService.instance) {
      NetworkSecurityService.instance = new NetworkSecurityService();
    }
    return NetworkSecurityService.instance;
  }

  /**
   * MAINT-190: Test-only escape hatch for singleton state isolation.
   *
   * Production safety: throws if NODE_ENV !== 'test'. A production call would
   * reset network security metrics, masking the data SecurityMonitoringService
   * relies on for its network-security assessment.
   */
  public static __resetForTesting__(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'NetworkSecurityService.__resetForTesting__() called outside NODE_ENV=test — refusing to clear network state in production'
      );
    }
    if (NetworkSecurityService.instance) {
      NetworkSecurityService.instance.initialized = false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: nulling private static reset target
    NetworkSecurityService.instance = undefined as any;
  }

  /**
   * INITIALIZE NETWORK SECURITY
   *
   * Awaited by CrisisSecurityProtocol.initialize() and
   * SecurityMonitoringService.initialize(); must resolve.
   */
  public async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      // Initialize dependencies
      await this.encryptionService.initialize();
      await this.authenticationService.initialize();

      this.initialized = true;

      const initializationTime = performance.now() - startTime;
      logPerformance('NetworkSecurityService.initialize', initializationTime, {
        status: 'success'
      });

    } catch (error) {
      logError(LogCategory.SECURITY, '🚨 NETWORK SECURITY INITIALIZATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Network security initialization failed: ${(error instanceof Error ? error.message : String(error))}`);
    }
  }

  private initializeMetrics(): NetworkSecurityMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      securityViolations: 0,
      certificateFailures: 0,
      encryptionFailures: 0,
      retryAttempts: 0,
      rateLimitHits: 0,
      performanceViolations: 0,
      timestamp: Date.now()
    };
  }

  /**
   * PUBLIC API METHODS
   */

  public getSecurityMetrics(): NetworkSecurityMetrics {
    return { ...this.securityMetrics };
  }
}

// Export singleton instance
export default NetworkSecurityService.getInstance();
