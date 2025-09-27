/**
 * Navigation Security Service - Protected Route Implementation
 *
 * Provides secure navigation patterns for the UserStore integration:
 * - Route-level authentication enforcement
 * - Emergency access bypass for crisis features
 * - Session validation before sensitive operations
 * - Deep linking security validation
 * - Crisis-first navigation patterns
 */

import { useUserStore } from '../../store/userStore';
import { isEmergencyMode, emergencySecurityCheck, validateEmergencyAccess } from './index';

export interface RouteProtection {
  path: string;
  requiresAuth: boolean;
  requiresBiometric: boolean;
  allowEmergencyAccess: boolean;
  sensitivityLevel: 'public' | 'user' | 'clinical' | 'emergency';
  maxResponseTime?: number; // For crisis routes
  auditRequired: boolean;
}

export interface NavigationContext {
  currentRoute: string;
  previousRoute?: string;
  emergencyMode: boolean;
  sessionValid: boolean;
  timestamp: string;
  deviceId: string;
}

/**
 * Route configuration with security requirements
 */
export const ROUTE_SECURITY_CONFIG: Record<string, RouteProtection> = {
  // Public routes (no authentication required)
  '/welcome': {
    path: '/welcome',
    requiresAuth: false,
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'public',
    auditRequired: false
  },

  '/onboarding': {
    path: '/onboarding',
    requiresAuth: false,
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'public',
    auditRequired: false
  },

  // Crisis routes (highest priority, emergency access)
  '/crisis': {
    path: '/crisis',
    requiresAuth: false, // Emergency bypass
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'emergency',
    maxResponseTime: 200, // Critical response time
    auditRequired: true
  },

  '/crisis/plan': {
    path: '/crisis/plan',
    requiresAuth: false, // Emergency bypass
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'emergency',
    maxResponseTime: 200,
    auditRequired: true
  },

  '/crisis/contacts': {
    path: '/crisis/contacts',
    requiresAuth: false, // Emergency bypass
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'emergency',
    maxResponseTime: 200,
    auditRequired: true
  },

  // User routes (authentication required)
  '/home': {
    path: '/home',
    requiresAuth: true,
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'user',
    auditRequired: false
  },

  '/profile': {
    path: '/profile',
    requiresAuth: true,
    requiresBiometric: false,
    allowEmergencyAccess: false,
    sensitivityLevel: 'user',
    auditRequired: true
  },

  '/check-in': {
    path: '/check-in',
    requiresAuth: true,
    requiresBiometric: false,
    allowEmergencyAccess: true,
    sensitivityLevel: 'clinical',
    auditRequired: true
  },

  // Clinical routes (enhanced security)
  '/assessment/phq9': {
    path: '/assessment/phq9',
    requiresAuth: true,
    requiresBiometric: true,
    allowEmergencyAccess: false,
    sensitivityLevel: 'clinical',
    auditRequired: true
  },

  '/assessment/gad7': {
    path: '/assessment/gad7',
    requiresAuth: true,
    requiresBiometric: true,
    allowEmergencyAccess: false,
    sensitivityLevel: 'clinical',
    auditRequired: true
  },

  '/data/export': {
    path: '/data/export',
    requiresAuth: true,
    requiresBiometric: true,
    allowEmergencyAccess: false,
    sensitivityLevel: 'clinical',
    auditRequired: true
  }
};

/**
 * Navigation Security Service Implementation
 */
export class NavigationSecurityService {
  private static instance: NavigationSecurityService;
  private navigationHistory: NavigationContext[] = [];

  private constructor() {}

  public static getInstance(): NavigationSecurityService {
    if (!NavigationSecurityService.instance) {
      NavigationSecurityService.instance = new NavigationSecurityService();
    }
    return NavigationSecurityService.instance;
  }

  /**
   * Validate navigation attempt with security checks
   */
  async validateNavigation(
    targetRoute: string,
    context: Partial<NavigationContext> = {}
  ): Promise<{
    allowed: boolean;
    reason?: string;
    requiresAuth?: boolean;
    requiresBiometric?: boolean;
    emergencyBypass?: boolean;
    redirectTo?: string;
  }> {
    const startTime = Date.now();

    try {
      // Get route protection configuration
      const protection = ROUTE_SECURITY_CONFIG[targetRoute];
      if (!protection) {
        console.warn(`No security configuration found for route: ${targetRoute}`);
        return {
          allowed: false,
          reason: 'Route security configuration missing'
        };
      }

      // Get current user state
      const userState = useUserStore.getState();
      const { isAuthenticated, session, emergencyMode, isCrisisAccessible } = userState;

      // Create navigation context
      const navContext: NavigationContext = {
        currentRoute: targetRoute,
        previousRoute: context.previousRoute,
        emergencyMode: emergencyMode || false,
        sessionValid: isAuthenticated,
        timestamp: new Date().toISOString(),
        deviceId: context.deviceId || 'unknown'
      };

      // Record navigation attempt
      this.navigationHistory.push(navContext);

      // Emergency/Crisis route handling (highest priority)
      if (protection.sensitivityLevel === 'emergency') {
        // Crisis routes must respond within time limit
        if (protection.maxResponseTime) {
          const responseTime = Date.now() - startTime;
          if (responseTime > protection.maxResponseTime) {
            console.warn(`Crisis route response time ${responseTime}ms exceeds ${protection.maxResponseTime}ms limit`);
          }
        }

        // Allow emergency access regardless of authentication state
        if (protection.allowEmergencyAccess) {
          await this.logNavigationEvent(navContext, 'emergency_access_granted');
          return {
            allowed: true,
            emergencyBypass: true,
            reason: 'Emergency access granted'
          };
        }
      }

      // Check if route requires authentication
      if (protection.requiresAuth && !isAuthenticated) {
        // Check for emergency bypass
        if (protection.allowEmergencyAccess && (emergencyMode || isCrisisAccessible())) {
          const emergencyValid = await validateEmergencyAccess(
            session?.id || 'emergency_session',
            `navigate_${targetRoute}`
          );

          if (emergencyValid) {
            await this.logNavigationEvent(navContext, 'emergency_bypass_used');
            return {
              allowed: true,
              emergencyBypass: true,
              reason: 'Emergency bypass granted'
            };
          }
        }

        return {
          allowed: false,
          reason: 'Authentication required',
          requiresAuth: true,
          redirectTo: '/auth/signin'
        };
      }

      // Check if route requires biometric authentication
      if (protection.requiresBiometric && isAuthenticated) {
        const sessionValid = await userState.validateSession();
        if (!sessionValid) {
          return {
            allowed: false,
            reason: 'Session expired',
            requiresAuth: true,
            redirectTo: '/auth/signin'
          };
        }

        // Check if biometric authentication is required
        if (session && !session.security.biometricVerified) {
          return {
            allowed: false,
            reason: 'Biometric authentication required',
            requiresBiometric: true
          };
        }
      }

      // Validate session for authenticated routes
      if (protection.requiresAuth && isAuthenticated) {
        const sessionValid = await userState.validateSession();
        if (!sessionValid) {
          return {
            allowed: false,
            reason: 'Session validation failed',
            requiresAuth: true,
            redirectTo: '/auth/signin'
          };
        }
      }

      // Log successful navigation
      if (protection.auditRequired) {
        await this.logNavigationEvent(navContext, 'navigation_allowed');
      }

      return {
        allowed: true,
        reason: 'Navigation authorized'
      };

    } catch (error) {
      console.error('Navigation validation failed:', error);
      return {
        allowed: false,
        reason: `Navigation validation error: ${error}`
      };
    }
  }

  /**
   * Handle deep linking with security validation
   */
  async validateDeepLink(
    url: string,
    source: 'notification' | 'email' | 'external' | 'unknown'
  ): Promise<{
    allowed: boolean;
    route?: string;
    params?: Record<string, string>;
    reason?: string;
    securityWarning?: string;
  }> {
    try {
      // Parse deep link URL
      const parsedUrl = new URL(url);
      const route = parsedUrl.pathname;
      const params: Record<string, string> = {};

      parsedUrl.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Security validation for deep links
      if (source === 'external' || source === 'unknown') {
        // Extra validation for external links
        const userState = useUserStore.getState();
        if (!userState.isAuthenticated) {
          return {
            allowed: false,
            reason: 'Deep link requires authentication',
            securityWarning: 'External deep link blocked due to unauthenticated state'
          };
        }
      }

      // Validate the target route
      const navigationResult = await this.validateNavigation(route, {
        previousRoute: 'deep_link',
        deviceId: 'deep_link_device'
      });

      if (!navigationResult.allowed) {
        return {
          allowed: false,
          reason: navigationResult.reason,
          securityWarning: 'Deep link navigation blocked by security policy'
        };
      }

      // Log deep link access for audit
      await this.logNavigationEvent({
        currentRoute: route,
        previousRoute: 'deep_link',
        emergencyMode: false,
        sessionValid: useUserStore.getState().isAuthenticated,
        timestamp: new Date().toISOString(),
        deviceId: 'deep_link_device'
      }, 'deep_link_access', { source, url });

      return {
        allowed: true,
        route,
        params,
        reason: 'Deep link authorized'
      };

    } catch (error) {
      console.error('Deep link validation failed:', error);
      return {
        allowed: false,
        reason: `Deep link validation error: ${error}`,
        securityWarning: 'Deep link blocked due to validation error'
      };
    }
  }

  /**
   * Get crisis-accessible routes for emergency navigation
   */
  getCrisisRoutes(): string[] {
    return Object.values(ROUTE_SECURITY_CONFIG)
      .filter(config => config.allowEmergencyAccess || config.sensitivityLevel === 'emergency')
      .map(config => config.path);
  }

  /**
   * Check if current navigation state allows crisis access
   */
  async isCrisisNavigationAllowed(): Promise<boolean> {
    try {
      const securityCheck = await emergencySecurityCheck();
      const userState = useUserStore.getState();

      return securityCheck ||
             userState.emergencyMode ||
             userState.isCrisisAccessible() ||
             await isEmergencyMode();

    } catch (error) {
      console.error('Crisis navigation check failed:', error);
      return true; // Fail-safe: allow crisis access on errors
    }
  }

  /**
   * Force navigation to crisis route (emergency override)
   */
  async forceNavigationToCrisis(crisisType: string = 'immediate'): Promise<void> {
    try {
      const userState = useUserStore.getState();

      // Enable emergency mode if not already active
      if (!userState.emergencyMode) {
        await userState.enableEmergencyMode(crisisType);
      }

      // Log emergency navigation
      await this.logNavigationEvent({
        currentRoute: '/crisis',
        previousRoute: 'emergency_override',
        emergencyMode: true,
        sessionValid: userState.isAuthenticated,
        timestamp: new Date().toISOString(),
        deviceId: 'emergency_device'
      }, 'emergency_navigation_forced');

      console.log('Emergency navigation to crisis route activated');

    } catch (error) {
      console.error('Emergency navigation failed:', error);
      // Continue anyway - crisis access is critical
    }
  }

  /**
   * Log navigation events for audit and security monitoring
   */
  private async logNavigationEvent(
    context: NavigationContext,
    eventType: string,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    try {
      const { securityControlsService, DataSensitivity } = await import('./index');

      await securityControlsService.logAuditEntry({
        operation: `navigation_${eventType}`,
        entityType: 'navigation',
        dataSensitivity: context.emergencyMode ? DataSensitivity.CLINICAL : DataSensitivity.PERSONAL,
        userId: useUserStore.getState().user?.id || 'anonymous',
        securityContext: {
          authenticated: context.sessionValid,
          biometricUsed: false,
          deviceTrusted: true,
          networkSecure: true,
          encryptionActive: true
        },
        operationMetadata: {
          success: true,
          duration: 0
        },
        complianceMarkers: {
          hipaaRequired: context.emergencyMode,
          auditRequired: true,
          retentionDays: context.emergencyMode ? 2555 : 365
        }
      });

    } catch (error) {
      console.error('Navigation event logging failed:', error);
      // Don't throw - navigation should continue even if logging fails
    }
  }

  /**
   * Get navigation history for debugging/audit
   */
  getNavigationHistory(): NavigationContext[] {
    return [...this.navigationHistory];
  }

  /**
   * Clear navigation history (privacy)
   */
  clearNavigationHistory(): void {
    this.navigationHistory = [];
  }
}

// Export singleton instance
export const navigationSecurityService = NavigationSecurityService.getInstance();

// React hook for secure navigation
export const useSecureNavigation = () => {
  const userStore = useUserStore();

  const secureNavigate = async (route: string) => {
    const validation = await navigationSecurityService.validateNavigation(route);

    if (!validation.allowed) {
      console.warn(`Navigation to ${route} blocked: ${validation.reason}`);

      if (validation.redirectTo) {
        // Redirect to authentication or other required route
        return { success: false, redirect: validation.redirectTo };
      }

      return { success: false, error: validation.reason };
    }

    return { success: true };
  };

  const navigateToCrisis = async (crisisType: string = 'immediate') => {
    await navigationSecurityService.forceNavigationToCrisis(crisisType);
    return { success: true, route: '/crisis' };
  };

  const isCrisisAccessible = async () => {
    return await navigationSecurityService.isCrisisNavigationAllowed();
  };

  return {
    secureNavigate,
    navigateToCrisis,
    isCrisisAccessible,
    crisisRoutes: navigationSecurityService.getCrisisRoutes()
  };
};