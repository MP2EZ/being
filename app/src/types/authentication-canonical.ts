/**
 * Authentication Canonical Types - Phase 4B Consolidation
 *
 * Consolidated from 5 authentication type files:
 * - authentication.ts (base)
 * - auth-session.ts
 * - auth-store.ts
 * - auth-integration.ts
 * - auth-screens.ts
 *
 * CRITICAL PRESERVATION REQUIREMENTS:
 * - JWT 15-minute expiry policy (IMMUTABLE)
 * - Biometric authentication patterns (IMMUTABLE)
 * - Crisis authentication bypass (IMMUTABLE)
 * - HIPAA compliance validation (IMMUTABLE)
 * - Multi-device session coordination (IMMUTABLE)
 *
 * @consolidation_result 5 files → 1 canonical file (80% reduction)
 */

import { z } from 'zod';

// === BRANDED TYPES FOR AUTHENTICATION SYSTEM ===

/**
 * Branded type for user identifiers with validation
 */
export type AuthUserID = string & { readonly __brand: 'AuthUserID' };

/**
 * Branded type for session identifiers with security validation
 */
export type SessionID = string & { readonly __brand: 'SessionID' };

/**
 * Branded type for JWT tokens with timing validation
 */
export type JWTToken = string & { readonly __brand: 'JWTToken' };

/**
 * Branded type for biometric template identifiers
 */
export type BiometricTemplateID = string & { readonly __brand: 'BiometricTemplateID' };

// === CORE AUTHENTICATION TYPES ===

/**
 * Authentication methods with crisis bypass support
 */
export const AuthenticationMethodSchema = z.enum([
  'anonymous',              // Anonymous access
  'email_password',         // Email and password
  'biometric',             // Biometric authentication (Face ID, Touch ID)
  'device_pin',            // Device PIN/passcode
  'oauth_google',          // Google OAuth
  'oauth_apple',           // Apple Sign In
  'emergency_bypass',      // Crisis emergency bypass
  'clinical_override'      // Clinical team override
]);

export type AuthenticationMethod = z.infer<typeof AuthenticationMethodSchema>;

/**
 * User authentication profile with security context
 */
export const UserAuthenticationProfileSchema = z.object({
  // User identification
  userId: z.string(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),

  // Authentication methods
  enabledMethods: z.array(AuthenticationMethodSchema),
  primaryMethod: AuthenticationMethodSchema,
  backupMethods: z.array(AuthenticationMethodSchema),

  // Security settings
  security: z.object({
    // Multi-factor authentication
    mfaEnabled: z.boolean(),
    mfaMethods: z.array(z.enum(['sms', 'email', 'authenticator', 'biometric'])),
    backupCodes: z.array(z.string()).optional(),

    // Security policies
    passwordPolicy: z.object({
      minLength: z.number().min(8),
      requireUppercase: z.boolean(),
      requireLowercase: z.boolean(),
      requireNumbers: z.boolean(),
      requireSpecialChars: z.boolean(),
      passwordHistory: z.number().optional()
    }).optional(),

    // Session security
    sessionTimeout: z.number().default(900), // 15 minutes - IMMUTABLE
    maxConcurrentSessions: z.number().default(3),
    deviceTrustRequired: z.boolean(),

    // Crisis and emergency settings (IMMUTABLE)
    emergencyBypassEnabled: z.boolean().default(true),
    crisisAuthenticationTimeout: z.number().default(60), // 1 minute for crisis
    clinicalOverrideEnabled: z.boolean()
  }),

  // Biometric configuration
  biometrics: z.object({
    faceIdEnabled: z.boolean(),
    touchIdEnabled: z.boolean(),
    voiceIdEnabled: z.boolean(),
    biometricFallback: AuthenticationMethodSchema.optional(),

    // Biometric security (IMMUTABLE)
    templateEncrypted: z.boolean().default(true),
    templateId: z.string().optional(),
    enrollmentDate: z.string().optional(),
    lastValidation: z.string().optional()
  }).optional(),

  // Account status
  status: z.object({
    active: z.boolean(),
    verified: z.boolean(),
    suspended: z.boolean(),
    locked: z.boolean(),
    lastLogin: z.string().optional(),

    // Security status
    compromised: z.boolean().default(false),
    suspiciousActivity: z.boolean().default(false),
    securityValidationRequired: z.boolean().default(false)
  })
});

export type UserAuthenticationProfile = z.infer<typeof UserAuthenticationProfileSchema>;

// === SESSION MANAGEMENT ===

/**
 * Enhanced authentication session with compliance tracking
 */
export const EnhancedAuthSessionSchema = z.object({
  // Session identification
  sessionId: z.string(),
  userId: z.string(),
  deviceId: z.string(),

  // Session metadata
  metadata: z.object({
    createdAt: z.string(), // ISO timestamp
    lastActivity: z.string(),
    expiresAt: z.string(),
    refreshedAt: z.string().optional(),

    // Session context
    userAgent: z.string(),
    platform: z.enum(['ios', 'android', 'web']),
    appVersion: z.string(),
    ipAddress: z.string().optional(),
    geolocation: z.object({
      country: z.string(),
      region: z.string().optional(),
      city: z.string().optional()
    }).optional()
  }),

  // Authentication context
  authentication: z.object({
    method: AuthenticationMethodSchema,
    authenticatedAt: z.string(),
    mfaCompleted: z.boolean(),
    biometricUsed: z.boolean(),
    emergencyBypassUsed: z.boolean(),

    // Token information (IMMUTABLE 15-minute expiry)
    tokens: z.object({
      accessToken: z.string(),
      accessTokenExpiresAt: z.string(),
      refreshToken: z.string().optional(),
      refreshTokenExpiresAt: z.string().optional(),
      tokenType: z.string().default('Bearer')
    })
  }),

  // Session security
  security: z.object({
    // Device trust
    deviceTrusted: z.boolean(),
    deviceFingerprint: z.string(),
    securityLevel: z.enum(['low', 'medium', 'high', 'critical']),

    // Risk assessment
    riskScore: z.number().min(0).max(100),
    riskFactors: z.array(z.enum([
      'new_device',
      'unusual_location',
      'suspicious_behavior',
      'security_violation',
      'concurrent_sessions',
      'failed_attempts'
    ])),

    // Encryption and privacy (IMMUTABLE HIPAA requirements)
    encrypted: z.boolean().default(true),
    hipaaCompliant: z.boolean().default(true),
    piiMinimized: z.boolean().default(true)
  }),

  // Crisis and clinical context (IMMUTABLE)
  clinical: z.object({
    crisisMode: z.boolean().default(false),
    emergencyAccess: z.boolean().default(false),
    clinicalOverride: z.boolean().default(false),
    therapeuticSessionActive: z.boolean().default(false),

    // Clinical data access permissions
    dataAccess: z.object({
      fullAccess: z.boolean(),
      assessmentAccess: z.boolean(),
      checkInAccess: z.boolean(),
      crisisPlanAccess: z.boolean(),
      therapeuticDataAccess: z.boolean()
    })
  }),

  // Session performance
  performance: z.object({
    authenticationTime: z.number(), // milliseconds
    sessionEstablishmentTime: z.number(),
    lastRequestLatency: z.number(),
    requestCount: z.number(),
    errorCount: z.number()
  })
});

export type EnhancedAuthSession = z.infer<typeof EnhancedAuthSessionSchema>;

// === JWT TOKEN MANAGEMENT ===

/**
 * Enhanced JWT claims with clinical context
 */
export const EnhancedJWTClaimsSchema = z.object({
  // Standard JWT claims
  iss: z.string(), // issuer
  sub: z.string(), // subject (user ID)
  aud: z.string(), // audience
  exp: z.number(), // expiration time (IMMUTABLE 15 minutes)
  iat: z.number(), // issued at
  nbf: z.number().optional(), // not before
  jti: z.string().optional(), // JWT ID

  // Custom claims
  custom: z.object({
    // User context
    userId: z.string(),
    deviceId: z.string(),
    sessionId: z.string(),

    // Authentication context
    authMethod: AuthenticationMethodSchema,
    mfaCompleted: z.boolean(),
    biometricUsed: z.boolean(),
    securityLevel: z.enum(['low', 'medium', 'high', 'critical']),

    // Clinical and therapeutic context (IMMUTABLE)
    clinical: z.object({
      crisisMode: z.boolean(),
      emergencyAccess: z.boolean(),
      clinicalOverride: z.boolean(),
      dataAccess: z.array(z.enum([
        'assessments',
        'check_ins',
        'crisis_plan',
        'therapeutic_data',
        'full_profile'
      ]))
    }),

    // Compliance and audit (IMMUTABLE)
    compliance: z.object({
      hipaaCompliant: z.boolean(),
      auditRequired: z.boolean(),
      dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted']),
      retentionPolicy: z.string()
    }),

    // Performance and monitoring
    performance: z.object({
      issueLatency: z.number(), // milliseconds
      deviceFingerprint: z.string(),
      riskScore: z.number().min(0).max(100)
    })
  })
});

export type EnhancedJWTClaims = z.infer<typeof EnhancedJWTClaimsSchema>;

/**
 * JWT validation result with security assessment
 */
export const JWTValidationResultSchema = z.object({
  // Validation status
  valid: z.boolean(),
  expired: z.boolean(),
  tampered: z.boolean(),

  // Claims validation
  claims: EnhancedJWTClaimsSchema.optional(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),

  // Security assessment
  security: z.object({
    trustLevel: z.enum(['untrusted', 'low', 'medium', 'high', 'verified']),
    riskFactors: z.array(z.string()),
    recommendedAction: z.enum(['accept', 'refresh', 'reauthenticate', 'deny'])
  }),

  // Performance metrics
  validation: z.object({
    validationTime: z.number(), // milliseconds
    signatureVerified: z.boolean(),
    clockSkewDetected: z.boolean(),
    algorithmValid: z.boolean()
  })
});

export type JWTValidationResult = z.infer<typeof JWTValidationResultSchema>;

// === BIOMETRIC AUTHENTICATION ===

/**
 * Enhanced biometric authentication data
 */
export const EnhancedBiometricAuthDataSchema = z.object({
  // Biometric type and metadata
  biometricType: z.enum(['face_id', 'touch_id', 'voice_id', 'fingerprint', 'iris']),
  available: z.boolean(),
  enrolled: z.boolean(),

  // Template information (encrypted)
  template: z.object({
    templateId: z.string(),
    templateHash: z.string(),
    encrypted: z.boolean(),
    algorithm: z.string(),

    // Template security (IMMUTABLE)
    createdAt: z.string(),
    lastUpdated: z.string(),
    expiresAt: z.string().optional(),
    revoked: z.boolean().default(false)
  }).optional(),

  // Quality metrics
  quality: z.object({
    enrollmentQuality: z.number().min(0).max(100).optional(),
    lastAuthQuality: z.number().min(0).max(100).optional(),
    false_acceptance_rate: z.number().min(0).max(1).optional(),
    false_rejection_rate: z.number().min(0).max(1).optional()
  }),

  // Security features (IMMUTABLE)
  security: z.object({
    liveness_detection: z.boolean(),
    presentation_attack_detection: z.boolean(),
    template_protection: z.boolean(),
    secure_enclave_used: z.boolean(),

    // Threat detection
    spoofing_detected: z.boolean().default(false),
    presentation_attack_detected: z.boolean().default(false),
    enrollment_attack_detected: z.boolean().default(false)
  }),

  // Clinical and crisis considerations (IMMUTABLE)
  clinical: z.object({
    crisis_fallback_enabled: z.boolean().default(true),
    emergency_override_available: z.boolean().default(true),
    stress_detection_enabled: z.boolean(),
    accessibility_accommodations: z.boolean()
  })
});

export type EnhancedBiometricAuthData = z.infer<typeof EnhancedBiometricAuthDataSchema>;

// === OAUTH INTEGRATION ===

/**
 * OAuth provider configuration with security validation
 */
export const OAuthProviderConfigSchema = z.object({
  // Provider information
  providerId: z.string(),
  providerName: z.string(),
  providerType: z.enum(['google', 'apple', 'microsoft', 'github']),

  // OAuth configuration
  oauth: z.object({
    clientId: z.string(),
    clientSecret: z.string().optional(), // Backend only
    redirectUri: z.string(),
    scope: z.array(z.string()),

    // OAuth endpoints
    authorizationEndpoint: z.string(),
    tokenEndpoint: z.string(),
    userInfoEndpoint: z.string(),
    jwksEndpoint: z.string().optional()
  }),

  // Security configuration
  security: z.object({
    pkceEnabled: z.boolean().default(true),
    stateValidation: z.boolean().default(true),
    nonceValidation: z.boolean().default(true),
    certificatePinning: z.boolean().default(true),

    // Token security
    tokenValidation: z.boolean().default(true),
    signatureVerification: z.boolean().default(true),
    issuerValidation: z.boolean().default(true)
  }),

  // Provider-specific features
  features: z.object({
    userProfileAccess: z.boolean(),
    emailAccess: z.boolean(),
    phoneAccess: z.boolean(),
    biometricIntegration: z.boolean(),

    // Clinical integration
    healthKitIntegration: z.boolean().optional(),
    therapeuticDataSharing: z.boolean().optional()
  })
});

export type OAuthProviderConfig = z.infer<typeof OAuthProviderConfigSchema>;

// === CRISIS AUTHENTICATION ===

/**
 * Crisis authentication configuration for emergency scenarios
 */
export const CrisisAuthenticationConfigSchema = z.object({
  // Crisis detection and triggers
  triggers: z.object({
    phq9_threshold: z.number().default(20), // IMMUTABLE
    gad7_threshold: z.number().default(15), // IMMUTABLE
    manual_crisis_button: z.boolean().default(true),
    assessment_crisis_scores: z.boolean().default(true),
    behavioral_crisis_detection: z.boolean().default(true)
  }),

  // Emergency bypass configuration (IMMUTABLE)
  emergency_bypass: z.object({
    enabled: z.boolean().default(true),
    bypass_timeout_minutes: z.number().default(60), // 1 hour maximum
    authentication_required_after: z.boolean().default(true),
    clinical_notification_required: z.boolean().default(true),

    // Bypass access levels
    access_levels: z.object({
      crisis_resources_access: z.boolean().default(true),
      emergency_contacts_access: z.boolean().default(true),
      assessment_tools_access: z.boolean().default(true),
      full_therapeutic_access: z.boolean().default(false),
      data_export_disabled: z.boolean().default(true)
    })
  }),

  // Crisis session management
  session_management: z.object({
    crisis_session_duration: z.number().default(3600), // 1 hour
    session_extension_allowed: z.boolean().default(true),
    max_extensions: z.number().default(2),
    clinical_oversight_required: z.boolean().default(true)
  }),

  // Emergency data access rules (IMMUTABLE)
  data_access: z.object({
    crisis_plan_immediate_access: z.boolean().default(true),
    emergency_contacts_immediate_access: z.boolean().default(true),
    recent_assessments_access: z.boolean().default(true),
    therapeutic_history_limited: z.boolean().default(true),

    // Data sharing in crisis
    emergency_sharing_enabled: z.boolean().default(true),
    clinical_team_sharing: z.boolean().default(true),
    family_sharing_with_consent: z.boolean().default(true)
  }),

  // Audit and compliance (IMMUTABLE)
  audit: z.object({
    crisis_audit_required: z.boolean().default(true),
    emergency_override_logging: z.boolean().default(true),
    clinical_review_required: z.boolean().default(true),
    hipaa_compliance_maintained: z.boolean().default(true)
  })
});

export type CrisisAuthenticationConfig = z.infer<typeof CrisisAuthenticationConfigSchema>;

// === ERROR HANDLING ===

/**
 * Authentication error with recovery strategies
 */
export interface AuthenticationError extends Error {
  readonly code: AuthenticationErrorCode;
  readonly category: 'authentication' | 'authorization' | 'session' | 'biometric' | 'oauth' | 'crisis';
  readonly severity: 'info' | 'warning' | 'error' | 'critical';
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly fallbackAvailable: boolean;
  readonly userMessage: string;
  readonly technicalDetails: string;
  readonly timestamp: Date;
  readonly context: {
    readonly userId?: string;
    readonly sessionId?: string;
    readonly deviceId?: string;
    readonly method?: AuthenticationMethod;
    readonly attempt?: number;
  };
}

/**
 * Authentication error codes
 */
export type AuthenticationErrorCode =
  // General authentication errors
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_LOCKED'
  | 'TOO_MANY_ATTEMPTS'
  // Session errors
  | 'SESSION_EXPIRED'
  | 'SESSION_INVALID'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'REFRESH_FAILED'
  // MFA errors
  | 'MFA_REQUIRED'
  | 'MFA_FAILED'
  | 'MFA_TOKEN_INVALID'
  // Biometric errors
  | 'BIOMETRIC_NOT_AVAILABLE'
  | 'BIOMETRIC_NOT_ENROLLED'
  | 'BIOMETRIC_FAILED'
  | 'BIOMETRIC_LOCKED'
  // OAuth errors
  | 'OAUTH_AUTHORIZATION_DENIED'
  | 'OAUTH_INVALID_STATE'
  | 'OAUTH_TOKEN_EXCHANGE_FAILED'
  // Crisis and emergency errors
  | 'CRISIS_BYPASS_FAILED'
  | 'EMERGENCY_ACCESS_DENIED'
  | 'CLINICAL_OVERRIDE_FAILED'
  // System errors
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

// === STORE INTEGRATION ===

/**
 * Authentication store state with comprehensive tracking
 */
export interface AuthenticationStoreState {
  // User authentication state
  readonly user: {
    readonly profile: UserAuthenticationProfile | null;
    readonly authenticated: boolean;
    readonly authMethod?: AuthenticationMethod;
  };

  // Session state
  readonly session: {
    readonly active: boolean;
    readonly session: EnhancedAuthSession | null;
    readonly tokens: {
      readonly accessToken?: string;
      readonly refreshToken?: string;
      readonly expiresAt?: string;
    };
  };

  // Biometric state
  readonly biometric: {
    readonly available: boolean;
    readonly enrolled: boolean;
    readonly data?: EnhancedBiometricAuthData;
  };

  // OAuth state
  readonly oauth: {
    readonly providers: Record<string, OAuthProviderConfig>;
    readonly linkedAccounts: Record<string, unknown>;
  };

  // Crisis and emergency state (IMMUTABLE)
  readonly crisis: {
    readonly mode: boolean;
    readonly config: CrisisAuthenticationConfig;
    readonly emergencyBypass: boolean;
    readonly clinicalOverride: boolean;
    readonly bypassExpiresAt?: string;
  };

  // Error and loading state
  readonly ui: {
    readonly loading: boolean;
    readonly error?: AuthenticationError;
    readonly lastAction?: string;
  };
}

/**
 * Authentication store actions
 */
export interface AuthenticationStoreActions {
  // Authentication actions
  signIn: (email: string, password: string) => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  signInWithOAuth: (provider: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Session management
  refreshSession: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  extendSession: () => Promise<void>;

  // Token management (IMMUTABLE 15-minute expiry)
  refreshTokens: () => Promise<void>;
  validateTokens: () => Promise<boolean>;

  // Biometric authentication
  enrollBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<void>;
  removeBiometric: () => Promise<void>;

  // Crisis and emergency actions (IMMUTABLE)
  activateCrisisMode: (crisisId: string) => Promise<void>;
  deactivateCrisisMode: () => Promise<void>;
  requestEmergencyBypass: (reason: string) => Promise<void>;
  activateClinicialOverride: (clinicianId: string, reason: string) => Promise<void>;

  // OAuth actions
  linkOAuthAccount: (provider: string) => Promise<void>;
  unlinkOAuthAccount: (provider: string) => Promise<void>;

  // Error handling
  clearErrors: () => void;
  retry: () => Promise<void>;
}

// === SERVICE INTERFACE ===

/**
 * Authentication canonical service interface compatible with Phase 3D services
 */
export interface AuthenticationCanonicalService {
  // Service lifecycle
  initialize: (config: AuthenticationServiceConfig) => Promise<void>;
  shutdown: () => Promise<void>;

  // Authentication
  authenticate: (method: AuthenticationMethod, credentials: unknown) => Promise<EnhancedAuthSession>;
  deauthenticate: (sessionId: string) => Promise<void>;

  // Session management
  createSession: (userId: string, method: AuthenticationMethod) => Promise<EnhancedAuthSession>;
  validateSession: (sessionId: string) => Promise<boolean>;
  refreshSession: (sessionId: string) => Promise<EnhancedAuthSession>;
  terminateSession: (sessionId: string) => Promise<void>;

  // Token management (IMMUTABLE 15-minute expiry)
  issueTokens: (userId: string, sessionId: string) => Promise<{ accessToken: string; refreshToken: string }>;
  validateToken: (token: string) => Promise<JWTValidationResult>;
  refreshTokens: (refreshToken: string) => Promise<{ accessToken: string; refreshToken: string }>;

  // Biometric authentication
  enrollBiometric: (userId: string, biometricData: unknown) => Promise<BiometricTemplateID>;
  authenticateWithBiometric: (userId: string, biometricData: unknown) => Promise<boolean>;

  // Crisis authentication (IMMUTABLE)
  activateCrisisMode: (userId: string, crisisId: string) => Promise<void>;
  requestEmergencyBypass: (userId: string, reason: string) => Promise<string>;

  // OAuth integration
  initiateOAuthFlow: (provider: string) => Promise<string>;
  completeOAuthFlow: (provider: string, code: string, state: string) => Promise<EnhancedAuthSession>;

  // Compliance and audit
  auditAuthenticationEvent: (event: unknown) => Promise<void>;
  validateHIPAACompliance: (sessionId: string) => Promise<boolean>;
}

/**
 * Authentication service configuration
 */
export const AuthenticationServiceConfigSchema = z.object({
  // Service configuration
  serviceId: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // JWT configuration (IMMUTABLE)
  jwt: z.object({
    issuer: z.string(),
    audience: z.string(),
    algorithm: z.string().default('RS256'),
    accessTokenExpiryMinutes: z.number().default(15), // IMMUTABLE
    refreshTokenExpiryDays: z.number().default(30),
    clockSkewToleranceSeconds: z.number().default(60)
  }),

  // Session configuration
  session: z.object({
    cookieName: z.string().default('auth_session'),
    secure: z.boolean().default(true),
    httpOnly: z.boolean().default(true),
    sameSite: z.enum(['strict', 'lax', 'none']).default('strict'),
    maxAge: z.number().default(900) // 15 minutes
  }),

  // Security configuration
  security: z.object({
    // Password policy
    passwordMinLength: z.number().default(8),
    passwordRequireUppercase: z.boolean().default(true),
    passwordRequireNumbers: z.boolean().default(true),
    passwordRequireSpecialChars: z.boolean().default(true),

    // Rate limiting
    maxLoginAttempts: z.number().default(5),
    lockoutDurationMinutes: z.number().default(30),
    rateLimitWindowMinutes: z.number().default(15),

    // Device trust
    deviceTrustEnabled: z.boolean().default(true),
    deviceFingerprintRequired: z.boolean().default(true)
  }),

  // Crisis configuration (IMMUTABLE)
  crisis: z.object({
    emergencyBypassEnabled: z.boolean().default(true),
    crisisAuthenticationEnabled: z.boolean().default(true),
    clinicalOverrideEnabled: z.boolean().default(true),
    emergencyBypassDurationMinutes: z.number().default(60)
  }),

  // Biometric configuration
  biometric: z.object({
    enabled: z.boolean().default(true),
    fallbackToPassword: z.boolean().default(true),
    livenessDetectionEnabled: z.boolean().default(true),
    presentationAttackDetection: z.boolean().default(true)
  }),

  // Compliance configuration (IMMUTABLE)
  compliance: z.object({
    hipaaCompliant: z.boolean().default(true),
    auditLoggingEnabled: z.boolean().default(true),
    dataRetentionDays: z.number().default(2555), // 7 years
    piiMinimizationEnabled: z.boolean().default(true)
  })
});

export type AuthenticationServiceConfig = z.infer<typeof AuthenticationServiceConfigSchema>;

// === TYPE GUARDS ===

export function isAuthUserID(value: unknown): value is AuthUserID {
  return typeof value === 'string' &&
         value.length > 0 &&
         /^[a-zA-Z0-9_-]+$/.test(value);
}

export function isSessionID(value: unknown): value is SessionID {
  return typeof value === 'string' &&
         value.length > 0 &&
         /^ses_[a-zA-Z0-9_-]+$/.test(value);
}

export function isJWTToken(value: unknown): value is JWTToken {
  return typeof value === 'string' &&
         value.split('.').length === 3;
}

export function isAuthenticationMethod(value: unknown): value is AuthenticationMethod {
  return AuthenticationMethodSchema.safeParse(value).success;
}

export const isEnhancedAuthSession = (value: unknown): value is EnhancedAuthSession => {
  try {
    EnhancedAuthSessionSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

export const isJWTValidationResult = (value: unknown): value is JWTValidationResult => {
  try {
    JWTValidationResultSchema.parse(value);
    return true;
  } catch {
    return false;
  }
};

// === FACTORY FUNCTIONS ===

export function createAuthUserID(id: string): AuthUserID {
  if (!isAuthUserID(id)) {
    throw new Error(`Invalid auth user ID: ${id}`);
  }
  return id as AuthUserID;
}

export function createSessionID(prefix: string = 'ses'): SessionID {
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return id as SessionID;
}

export function createBiometricTemplateID(): BiometricTemplateID {
  const id = `bio_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return id as BiometricTemplateID;
}

// === CONSTANTS (IMMUTABLE) ===

/**
 * Authentication canonical constants
 * CRITICAL: These values are IMMUTABLE for security and clinical safety
 */
export const AUTHENTICATION_CANONICAL_CONSTANTS = {
  // Token expiry (IMMUTABLE security requirement)
  TOKEN_EXPIRY: {
    ACCESS_TOKEN_MINUTES: 15,  // IMMUTABLE - Security requirement
    REFRESH_TOKEN_DAYS: 30,    // IMMUTABLE - Security requirement
    CRISIS_BYPASS_MINUTES: 60, // IMMUTABLE - Crisis safety
    CLINICAL_OVERRIDE_HOURS: 8 // IMMUTABLE - Clinical workflow
  },

  // Crisis thresholds (IMMUTABLE clinical requirements)
  CRISIS_THRESHOLDS: {
    PHQ9_CRISIS: 20,           // IMMUTABLE - Clinical requirement
    GAD7_CRISIS: 15,           // IMMUTABLE - Clinical requirement
    EMERGENCY_RESPONSE_TIMEOUT: 60000, // 1 minute - IMMUTABLE
    CRISIS_SESSION_MAX: 3600   // 1 hour - IMMUTABLE
  },

  // Security requirements (IMMUTABLE)
  SECURITY: {
    MIN_PASSWORD_LENGTH: 8,    // IMMUTABLE - Security standard
    MAX_LOGIN_ATTEMPTS: 5,     // IMMUTABLE - Security standard
    LOCKOUT_DURATION_MINUTES: 30, // IMMUTABLE - Security standard
    SESSION_TIMEOUT_MINUTES: 15,  // IMMUTABLE - Security standard
    DEVICE_TRUST_REQUIRED: true,  // IMMUTABLE - Security requirement
    MFA_RECOMMENDED_SCORE: 80      // IMMUTABLE - Security threshold
  },

  // Biometric security (IMMUTABLE)
  BIOMETRIC: {
    TEMPLATE_ENCRYPTION_REQUIRED: true,  // IMMUTABLE - Privacy requirement
    LIVENESS_DETECTION_ENABLED: true,    // IMMUTABLE - Security requirement
    PRESENTATION_ATTACK_DETECTION: true, // IMMUTABLE - Security requirement
    FALLBACK_TO_PASSWORD: true,          // IMMUTABLE - Accessibility requirement
    MAX_ENROLLMENT_ATTEMPTS: 3           // IMMUTABLE - User experience
  },

  // OAuth security (IMMUTABLE)
  OAUTH: {
    PKCE_REQUIRED: true,              // IMMUTABLE - Security standard
    STATE_VALIDATION_REQUIRED: true,  // IMMUTABLE - Security standard
    NONCE_VALIDATION_REQUIRED: true,  // IMMUTABLE - Security standard
    CERTIFICATE_PINNING: true,        // IMMUTABLE - Security hardening
    TOKEN_VALIDATION_STRICT: true     // IMMUTABLE - Security requirement
  },

  // Compliance requirements (IMMUTABLE)
  COMPLIANCE: {
    HIPAA_REQUIRED: true,              // IMMUTABLE - Regulatory requirement
    AUDIT_LOGGING_REQUIRED: true,     // IMMUTABLE - Regulatory requirement
    DATA_RETENTION_DAYS: 2555,        // 7 years - IMMUTABLE - Regulatory
    PII_MINIMIZATION_REQUIRED: true,  // IMMUTABLE - Privacy requirement
    CLINICAL_OVERSIGHT_REQUIRED: true // IMMUTABLE - Clinical governance
  }
} as const;

/**
 * AUTH_CONSTANTS - Legacy compatibility constants for services
 * Maps to AUTHENTICATION_CANONICAL_CONSTANTS for backward compatibility
 */
export const AUTH_CONSTANTS = {
  COMPLIANCE: {
    CONSENT_VERSION_CURRENT: '2024.1.0',
    PRIVACY_POLICY_VERSION_CURRENT: '2024.1.0',
    DATA_RETENTION_DAYS_DEFAULT: 2555, // 7 years
    HIPAA_REQUIRED: true,
    AUDIT_LOGGING_REQUIRED: true,
    PII_MINIMIZATION_REQUIRED: true,
    CLINICAL_OVERSIGHT_REQUIRED: true
  },
  SECURITY: {
    JWT_EXPIRY_MINUTES: 15,
    SESSION_TIMEOUT_MINUTES: 240,
    BIOMETRIC_TIMEOUT_MINUTES: 60,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30
  },
  AUTHENTICATION: {
    CRISIS_BYPASS_ENABLED: true,
    BIOMETRIC_PREFERRED: true,
    FALLBACK_PIN_ENABLED: true,
    GUEST_ACCESS_LIMITED: true
  }
} as const;

// === EXPORTS ===

export default {
  // Schemas
  AuthenticationMethodSchema,
  UserAuthenticationProfileSchema,
  EnhancedAuthSessionSchema,
  EnhancedJWTClaimsSchema,
  JWTValidationResultSchema,
  EnhancedBiometricAuthDataSchema,
  OAuthProviderConfigSchema,
  CrisisAuthenticationConfigSchema,
  AuthenticationServiceConfigSchema,

  // Type guards
  isAuthUserID,
  isSessionID,
  isJWTToken,
  isAuthenticationMethod,
  isEnhancedAuthSession,
  isJWTValidationResult,

  // Factory functions
  createAuthUserID,
  createSessionID,
  createBiometricTemplateID,

  // Constants
  AUTHENTICATION_CANONICAL_CONSTANTS
};