/**
 * CRISIS SECURITY PROTOCOL — reduced surface (MAINT-237)
 *
 * History: this module was a 1610-LOC "comprehensive crisis data security"
 * implementation (emergency-access grants, professional-access validation,
 * multi-layer encryption orchestration, violation detection + escalation,
 * monitoring intervals). A crisis-specialist audit found that the ENTIRE
 * machinery was unreachable: the only runtime consumer,
 * `SecurityMonitoringService`, calls exactly two things on this protocol —
 * `initialize()` (in its init chain) and `getCrisisSecurityMetrics()` (for a
 * vulnerability/compliance read). Every public grant/protect/validate/detect
 * method had ZERO external callers (grep-confirmed) and the "always-allow"
 * professional/emergency code paths were theater.
 *
 * MAINT-237 strips this to the consumed surface. The retired signals
 * (`securityViolations`, `averageAccessTime`) now read honest zeros: nothing
 * writes the backing state anymore, so `getCrisisSecurityMetrics()` reports
 * the truthful empty-state numbers the consumer reads. They are NOT faked —
 * the writers were deleted, so the values are genuinely 0.
 *
 * Surviving surface:
 * - getInstance() singleton
 * - __resetForTesting__() (MAINT-190 test-isolation escape hatch)
 * - initialize() (init chain; must resolve)
 * - getCrisisSecurityMetrics() (consumed read)
 * - destroy() (shutdown lifecycle)
 */


import { logPerformance, logError, logCrisis, logSystem, LogCategory } from '@/core/services/logging';
import EncryptionService from '@/core/services/security/EncryptionService';
import AuthenticationService from '@/core/services/security/AuthenticationService';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import NetworkSecurityService from '@/core/services/security/NetworkSecurityService';

/**
 * COMPREHENSIVE CRISIS SECURITY PROTOCOL
 * Reduced to the surface consumed by SecurityMonitoringService (MAINT-237).
 */
export class CrisisSecurityProtocol {
  private static instance: CrisisSecurityProtocol;
  private encryptionService: typeof EncryptionService;
  private authenticationService: typeof AuthenticationService;
  private secureStorage: typeof SecureStorageService;
  private networkSecurity: typeof NetworkSecurityService;

  // Backing state referenced by the surviving metrics read. Nothing writes
  // these anymore (the grant/violation machinery was deleted in MAINT-237),
  // so they stay empty and the metrics report truthful zeros.
  private activeCrisisAccess: Map<string, { accessDuration: number }> = new Map();
  private securityViolations: unknown[] = [];
  private monitoringActive: boolean = false;
  private initialized: boolean = false;

  private constructor() {
    this.encryptionService = EncryptionService;
    this.authenticationService = AuthenticationService;
    this.secureStorage = SecureStorageService;
    this.networkSecurity = NetworkSecurityService;
  }

  public static getInstance(): CrisisSecurityProtocol {
    if (!CrisisSecurityProtocol.instance) {
      CrisisSecurityProtocol.instance = new CrisisSecurityProtocol();
    }
    return CrisisSecurityProtocol.instance;
  }

  /**
   * MAINT-190: Test-only escape hatch for singleton state isolation.
   *
   * Clears all mutable instance state and nulls the static `instance` pointer,
   * forcing the next `getInstance()` call to produce a fresh instance. This is
   * the resolution for the `CrisisSecurityProtocol not initialized` CI flake
   * that INFRA-175 partially fixed: INFRA-175 guarded the setInterval calls
   * (preventing the orphan-timer family) but the `private static instance` +
   * `private initialized: boolean` still survived across Jest test files —
   * any test that grabbed the default-export reference before another test
   * reset `instance` saw a stale `initialized: false` view, producing the
   * "not initialized" error on the next public method call.
   *
   * Production safety: the `NODE_ENV !== 'test'` throw is non-negotiable.
   * Per the MAINT-190 crisis-agent planning pass: a production caller hitting
   * this would silently disable the audit trail and crisis monitoring
   * mid-session. Throwing is the only safe failure mode.
   *
   * What this does NOT touch:
   * - Master encryption key (lives in expo-secure-store, owned by
   *   EncryptionService — never wiped by reset)
   * - Production `destroy()` lifecycle (app-shutdown-only)
   * - Singleton service handles (encryptionService etc. — those are
   *   references to other singletons, not owned state)
   */
  public static __resetForTesting__(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'CrisisSecurityProtocol.__resetForTesting__() called outside NODE_ENV=test — refusing to clear crisis-monitoring state in production'
      );
    }
    if (CrisisSecurityProtocol.instance) {
      CrisisSecurityProtocol.instance.activeCrisisAccess.clear();
      CrisisSecurityProtocol.instance.securityViolations = [];
      CrisisSecurityProtocol.instance.monitoringActive = false;
      CrisisSecurityProtocol.instance.initialized = false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional: nulling private static reset target
    CrisisSecurityProtocol.instance = undefined as any;
  }

  /**
   * INITIALIZE CRISIS SECURITY PROTOCOL
   *
   * Brings up the underlying security services it depends on and marks the
   * protocol initialized. The crisis-specific sub-init helpers
   * (monitoring/emergency/professional/isolation) were removed in MAINT-237 —
   * they were unreachable theater. This must resolve without throwing because
   * it is awaited in `SecurityMonitoringService.initialize()`'s init chain.
   */
  public async initialize(): Promise<void> {
    const startTime = performance.now();

    try {
      logCrisis('Initializing Crisis Security Protocol');

      // Initialize all security services
      await this.encryptionService.initialize();
      await this.authenticationService.initialize();
      await this.secureStorage.initialize();
      await this.networkSecurity.initialize();

      this.initialized = true;

      const initializationTime = performance.now() - startTime;
      logPerformance('CrisisSecurityProtocol.initialize', initializationTime, {
        status: 'success'
      });

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CRISIS SECURITY INITIALIZATION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Crisis security initialization failed: ${(error instanceof Error ? error.message : String(error))}`);
    }
  }

  /**
   * CRISIS SECURITY METRICS
   *
   * The only metrics read by `SecurityMonitoringService` (vulnerability +
   * clinical-compliance checks). `securityViolations` and `averageAccessTime`
   * compute off backing state that no longer has any writer (MAINT-237), so
   * they report truthful zeros.
   */
  public async getCrisisSecurityMetrics(): Promise<{
    securityViolations: number;
    averageAccessTime: number;
    monitoringActive: boolean;
  }> {
    const accessTimes = Array.from(this.activeCrisisAccess.values())
      .map(context => context.accessDuration);

    const averageAccessTime = accessTimes.length > 0
      ? accessTimes.reduce((sum, time) => sum + time, 0) / accessTimes.length
      : 0;

    return {
      securityViolations: this.securityViolations.length,
      averageAccessTime,
      monitoringActive: this.monitoringActive
    };
  }

  public async destroy(): Promise<void> {
    try {
      logSystem('Destroying crisis security protocol');

      // Clear all backing state
      this.activeCrisisAccess.clear();
      this.securityViolations = [];

      // Disable monitoring
      this.monitoringActive = false;

      this.initialized = false;

      logSystem('Crisis security protocol destroyed');

    } catch (error) {
      logError(LogCategory.SYSTEM, 'CRISIS SECURITY DESTRUCTION ERROR:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export default CrisisSecurityProtocol.getInstance();
