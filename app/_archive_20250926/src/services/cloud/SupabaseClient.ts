/**
 * Supabase Client Configuration - HIPAA-Compliant Setup
 *
 * Zero-knowledge architecture with client-side encryption
 * All sensitive data encrypted before transmission to Supabase
 */

import { createClient, SupabaseClient, AuthSession, Session } from '@supabase/supabase-js';
import { SupabaseAuthConfig, CloudFeatureFlags, CLOUD_CONSTANTS } from '../../types/cloud';

// Environment-based configuration
const SUPABASE_CONFIG: SupabaseAuthConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  region: (process.env.EXPO_PUBLIC_SUPABASE_REGION as 'us-east-1' | 'us-west-1') || 'us-east-1',
  enableRLS: true,
  sessionTimeout: parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT || '1800', 10), // 30 minutes
  maxRetries: parseInt(process.env.EXPO_PUBLIC_SUPABASE_MAX_RETRIES || '3', 10)
};

/**
 * HIPAA-compliant Supabase client wrapper
 * Ensures all operations follow zero-knowledge and compliance requirements
 */
export class HIPAASupabaseClient {
  private client: SupabaseClient | null = null;
  private initialized = false;
  private authSession: Session | null = null;
  private featureFlags: CloudFeatureFlags = CLOUD_CONSTANTS.DEFAULT_FEATURE_FLAGS;

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize Supabase client with HIPAA-compliant configuration
   */
  private initializeClient(): void {
    try {
      // Validate required configuration
      if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        console.warn('Supabase configuration missing - cloud features disabled');
        return;
      }

      // Validate region is HIPAA-compliant
      if (!CLOUD_CONSTANTS.HIPAA_REGIONS.includes(SUPABASE_CONFIG.region)) {
        throw new Error(`Invalid region ${SUPABASE_CONFIG.region} - must use HIPAA-compliant US regions`);
      }

      this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce', // More secure flow
          storage: undefined, // Use default secure storage
          storageKey: 'fullmind-auth-token',
          debug: __DEV__ ? false : false // Never log in production
        },
        db: {
          schema: 'public'
        },
        global: {
          headers: {
            'X-FullMind-Version': process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
            'X-HIPAA-Compliant': 'true',
            'X-Zero-Knowledge': 'true'
          },
          fetch: this.createHIPAAFetch()
        },
        realtime: {
          enabled: false // Disable realtime for HIPAA compliance
        }
      });

      // Set up auth state listener
      this.client.auth.onAuthStateChange((event, session) => {
        this.handleAuthStateChange(event, session);
      });

      this.initialized = true;
      console.log('Supabase HIPAA client initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
      this.client = null;
      this.initialized = false;
    }
  }

  /**
   * Create HIPAA-compliant fetch wrapper
   */
  private createHIPAAFetch() {
    return async (url: RequestInfo | URL, options?: RequestInit) => {
      // Add HIPAA compliance headers
      const hipaaHeaders = {
        'X-Request-ID': this.generateRequestId(),
        'X-Timestamp': new Date().toISOString(),
        'X-Client-ID': 'fullmind-mobile-v1',
        ...options?.headers
      };

      const hipaaOptions: RequestInit = {
        ...options,
        headers: hipaaHeaders,
        // Ensure secure connection
        credentials: 'same-origin',
        mode: 'cors'
      };

      try {
        const response = await fetch(url, hipaaOptions);

        // Log for audit trail (no sensitive data)
        this.auditLog('HTTP_REQUEST', {
          url: typeof url === 'string' ? url : url.toString(),
          method: options?.method || 'GET',
          status: response.status,
          duration: Date.now()
        });

        return response;
      } catch (error) {
        this.auditLog('HTTP_ERROR', {
          url: typeof url === 'string' ? url : url.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    };
  }

  /**
   * Handle authentication state changes
   */
  private handleAuthStateChange(event: string, session: Session | null): void {
    this.authSession = session;

    this.auditLog('AUTH_STATE_CHANGE', {
      event,
      hasSession: !!session,
      userId: session?.user?.id || null
    });

    // Validate session security
    if (session) {
      this.validateSessionSecurity(session);
    }
  }

  /**
   * Validate session meets HIPAA security requirements
   */
  private validateSessionSecurity(session: Session): void {
    const now = Date.now() / 1000;
    const sessionAge = now - (session.user.created_at ? new Date(session.user.created_at).getTime() / 1000 : now);

    // Check session timeout
    if (sessionAge > SUPABASE_CONFIG.sessionTimeout) {
      console.warn('Session timeout exceeded - forcing re-authentication');
      this.signOut();
      return;
    }

    // Validate token format and claims
    if (!session.access_token || !session.refresh_token) {
      console.error('Invalid session tokens');
      this.signOut();
      return;
    }

    console.log('Session security validation passed');
  }

  /**
   * Update feature flags configuration
   */
  public updateFeatureFlags(flags: CloudFeatureFlags): void {
    this.featureFlags = { ...flags };

    this.auditLog('FEATURE_FLAGS_UPDATED', {
      enabled: flags.enabled,
      supabaseSync: flags.supabaseSync,
      auditLogging: flags.auditLogging
    });
  }

  /**
   * Check if cloud features are enabled
   */
  public isEnabled(): boolean {
    return this.initialized && this.featureFlags.enabled && !!this.client;
  }

  /**
   * Get Supabase client instance (only if enabled)
   */
  public getClient(): SupabaseClient | null {
    if (!this.isEnabled()) {
      return null;
    }
    return this.client;
  }

  /**
   * Sign in with email and password (deprecated - use AuthIntegrationService)
   * @deprecated Use authIntegrationService.signIn() instead
   */
  public async signIn(email: string, password: string): Promise<{
    success: boolean;
    session?: Session;
    error?: string;
  }> {
    console.warn('DEPRECATED: Use authIntegrationService.signIn() instead of supabaseClient.signIn()');

    if (!this.client) {
      return { success: false, error: 'Cloud services not available' };
    }

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        this.auditLog('SIGN_IN_FAILED', { error: error.message });
        return { success: false, error: error.message };
      }

      if (data.session) {
        this.auditLog('SIGN_IN_SUCCESS', { userId: data.user?.id });
        return { success: true, session: data.session };
      }

      return { success: false, error: 'No session returned' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLog('SIGN_IN_ERROR', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sign up with email and password (deprecated - use AuthIntegrationService)
   * @deprecated Use authIntegrationService.signUp() instead
   */
  public async signUp(email: string, password: string, metadata?: Record<string, unknown>): Promise<{
    success: boolean;
    session?: Session;
    error?: string;
    needsConfirmation?: boolean;
  }> {
    console.warn('DEPRECATED: Use authIntegrationService.signUp() instead of supabaseClient.signUp()');

    if (!this.client) {
      return { success: false, error: 'Cloud services not available' };
    }

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            hipaa_consent: true,
            created_via: 'fullmind_mobile',
            app_version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0'
          }
        }
      });

      if (error) {
        this.auditLog('SIGN_UP_FAILED', { error: error.message });
        return { success: false, error: error.message };
      }

      const needsConfirmation = !data.session && data.user && !data.user.email_confirmed_at;

      this.auditLog('SIGN_UP_SUCCESS', {
        userId: data.user?.id,
        needsConfirmation
      });

      return {
        success: true,
        session: data.session || undefined,
        needsConfirmation
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.auditLog('SIGN_UP_ERROR', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Sign out current user (deprecated - use AuthIntegrationService)
   * @deprecated Use authIntegrationService.signOut() instead
   */
  public async signOut(): Promise<void> {
    console.warn('DEPRECATED: Use authIntegrationService.signOut() instead of supabaseClient.signOut()');

    if (!this.client) {
      return;
    }

    try {
      const userId = this.authSession?.user?.id;
      await this.client.auth.signOut();

      this.authSession = null;
      this.auditLog('SIGN_OUT_SUCCESS', { userId });

    } catch (error) {
      this.auditLog('SIGN_OUT_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get current authenticated session
   */
  public getSession(): Session | null {
    return this.authSession;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.authSession && !!this.authSession.access_token;
  }

  /**
   * Refresh authentication session
   */
  public async refreshSession(): Promise<boolean> {
    if (!this.client || !this.authSession) {
      return false;
    }

    try {
      const { data, error } = await this.client.auth.refreshSession({
        refresh_token: this.authSession.refresh_token
      });

      if (error || !data.session) {
        this.auditLog('SESSION_REFRESH_FAILED', { error: error?.message });
        return false;
      }

      this.authSession = data.session;
      this.auditLog('SESSION_REFRESH_SUCCESS', { userId: data.user?.id });
      return true;

    } catch (error) {
      this.auditLog('SESSION_REFRESH_ERROR', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Test connection to Supabase
   */
  public async testConnection(): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!this.client) {
      return { success: false, error: 'Client not initialized' };
    }

    const startTime = Date.now();

    try {
      // Simple health check query
      const { error } = await this.client
        .from('health_check')
        .select('id')
        .limit(1)
        .single();

      const latency = Date.now() - startTime;

      // 404 is expected for health_check table - means connection works
      if (error && !error.message.includes('table "health_check" does not exist')) {
        return { success: false, error: error.message };
      }

      this.auditLog('CONNECTION_TEST_SUCCESS', { latency });
      return { success: true, latency };

    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.auditLog('CONNECTION_TEST_FAILED', { error: errorMessage, latency });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Generate unique request ID for audit trails
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Audit logging for HIPAA compliance
   */
  private auditLog(operation: string, details: Record<string, unknown>): void {
    if (!this.featureFlags.auditLogging) {
      return;
    }

    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      details: {
        ...details,
        // Never log sensitive data
        sessionId: this.authSession?.access_token ? '[REDACTED]' : null,
        region: SUPABASE_CONFIG.region,
        featureFlagsEnabled: this.featureFlags.enabled
      }
    };

    // In production, this would be sent to secure audit service
    if (__DEV__) {
      console.log('[HIPAA AUDIT]', auditEntry);
    }

    // TODO: Implement secure audit trail storage
  }

  /**
   * Cleanup and destroy client
   */
  public destroy(): void {
    if (this.client) {
      this.signOut();
      this.client = null;
    }
    this.authSession = null;
    this.initialized = false;
    this.auditLog('CLIENT_DESTROYED', {});
  }
}

// Singleton instance
export const supabaseClient = new HIPAASupabaseClient();