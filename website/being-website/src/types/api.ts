/**
 * Being. Website - API & Integration Type Definitions
 * Types for API communication and external service integration
 */

// ============================================================================
// BASE API TYPES
// ============================================================================

export interface APIError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: Date;
  readonly requestId?: string;
}

export interface APIResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: APIError;
  readonly metadata?: {
    readonly page?: number;
    readonly limit?: number;
    readonly total?: number;
    readonly hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  readonly metadata: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly hasMore: boolean;
    readonly totalPages: number;
  };
}

// ============================================================================
// CONTACT & COMMUNICATION API
// ============================================================================

export interface ContactSubmission {
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly message: string;
  readonly userType: 'individual' | 'therapist' | 'organization' | 'press' | 'other';
  readonly priority: 'low' | 'medium' | 'high' | 'urgent';
  readonly source: 'website' | 'app' | 'referral';
}

export interface ContactResponse extends APIResponse {
  readonly data: {
    readonly id: string;
    readonly status: 'received' | 'processing' | 'responded';
    readonly estimatedResponse: string; // e.g., "1-2 business days"
    readonly ticketNumber: string;
  };
}

export interface NewsletterSubscription {
  readonly email: string;
  readonly interests: ('product-updates' | 'research' | 'clinical-news' | 'community')[];
  readonly source: string;
  readonly consentGiven: boolean;
  readonly doubleOptIn: boolean;
}

// ============================================================================
// WAITLIST & EARLY ACCESS API
// ============================================================================

export interface WaitlistSubmission {
  readonly email: string;
  readonly userType: 'individual' | 'therapist' | 'organization';
  readonly interests: string[];
  readonly referralSource?: string;
  readonly urgency: 'low' | 'medium' | 'high';
  readonly location?: {
    readonly country: string;
    readonly state?: string;
    readonly timezone?: string;
  };
}

export interface WaitlistResponse extends APIResponse {
  readonly data: {
    readonly position: number;
    readonly estimatedAccess: Date;
    readonly referralCode: string;
    readonly benefits: string[];
  };
}

// ============================================================================
// THERAPIST PORTAL API
// ============================================================================

export interface TherapistRegistration {
  readonly personalInfo: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
  };
  readonly credentials: {
    readonly license: string;
    readonly licenseState: string;
    readonly licenseExpiry: Date;
    readonly specialties: string[];
    readonly yearsExperience: number;
  };
  readonly practice: {
    readonly type: 'private' | 'group' | 'hospital' | 'clinic' | 'other';
    readonly name: string;
    readonly address: {
      readonly street: string;
      readonly city: string;
      readonly state: string;
      readonly zip: string;
      readonly country: string;
    };
  };
  readonly interests: {
    readonly patientVolume: 'low' | 'medium' | 'high';
    readonly focusAreas: string[];
    readonly technologyComfort: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface TherapistVerification {
  readonly status: 'pending' | 'in-review' | 'approved' | 'rejected';
  readonly submittedAt: Date;
  readonly reviewedAt?: Date;
  readonly notes?: string;
  readonly requirements: {
    readonly licenseVerified: boolean;
    readonly backgroundCheck: boolean;
    readonly trainingComplete: boolean;
  };
}

// ============================================================================
// CONTENT MANAGEMENT API
// ============================================================================

export interface ContentItem {
  readonly id: string;
  readonly type: 'article' | 'resource' | 'exercise' | 'assessment';
  readonly title: string;
  readonly description: string;
  readonly content: string;
  readonly metadata: {
    readonly author: string;
    readonly publishedAt: Date;
    readonly updatedAt: Date;
    readonly tags: string[];
    readonly category: string;
  };
  readonly clinical: {
    readonly validated: boolean;
    readonly validator?: string;
    readonly evidenceLevel: 'research' | 'clinical' | 'expert' | 'anecdotal';
  };
  readonly accessibility: {
    readonly readingLevel: number;
    readonly wcagCompliant: boolean;
    readonly alternativeFormats: string[];
  };
}

export interface ContentSearchParams {
  readonly query?: string;
  readonly category?: string;
  readonly tags?: string[];
  readonly validated?: boolean;
  readonly readingLevel?: [number, number]; // [min, max]
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: 'relevance' | 'date' | 'popularity';
}

// ============================================================================
// ANALYTICS & METRICS API
// ============================================================================

export interface AnalyticsEvent {
  readonly name: string;
  readonly category: 'page-view' | 'interaction' | 'conversion' | 'error';
  readonly properties: Record<string, string | number | boolean>;
  readonly timestamp: Date;
  readonly sessionId: string;
  readonly userId?: string;
  readonly anonymized: boolean;
}

export interface WebVitalsMetric {
  readonly name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB';
  readonly value: number;
  readonly id: string;
  readonly url: string;
  readonly timestamp: Date;
  readonly connection?: {
    readonly effectiveType: string;
    readonly rtt: number;
    readonly downlink: number;
  };
}

export interface AnalyticsQuery {
  readonly metrics: string[];
  readonly dimensions?: string[];
  readonly filters?: Record<string, string | number>;
  readonly dateRange: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly granularity?: 'hour' | 'day' | 'week' | 'month';
}

// ============================================================================
// HEALTH CHECK & MONITORING API
// ============================================================================

export interface HealthStatus {
  readonly overall: 'healthy' | 'degraded' | 'unhealthy';
  readonly timestamp: Date;
  readonly services: {
    readonly website: ServiceStatus;
    readonly api: ServiceStatus;
    readonly database: ServiceStatus;
    readonly cache: ServiceStatus;
    readonly cdn: ServiceStatus;
    readonly monitoring: ServiceStatus;
  };
  readonly performance: {
    readonly responseTime: number;
    readonly throughput: number;
    readonly errorRate: number;
  };
}

export interface ServiceStatus {
  readonly status: 'up' | 'down' | 'degraded';
  readonly lastCheck: Date;
  readonly responseTime?: number;
  readonly uptime?: number; // percentage
  readonly incidents?: number;
}

export interface SystemMetrics {
  readonly timestamp: Date;
  readonly performance: {
    readonly avgLoadTime: number;
    readonly p95LoadTime: number;
    readonly bounceRate: number;
    readonly conversionRate: number;
  };
  readonly usage: {
    readonly uniqueVisitors: number;
    readonly pageViews: number;
    readonly sessionDuration: number;
    readonly topPages: Array<{ page: string; views: number }>;
  };
  readonly errors: {
    readonly totalErrors: number;
    readonly errorRate: number;
    readonly criticalErrors: number;
    readonly topErrors: Array<{ error: string; count: number }>;
  };
}

// ============================================================================
// INTEGRATION WITH EXTERNAL SERVICES
// ============================================================================

export interface EmailServiceConfig {
  readonly provider: 'sendgrid' | 'ses' | 'mailgun';
  readonly apiKey: string;
  readonly fromAddress: string;
  readonly replyToAddress: string;
  readonly templates: {
    readonly welcome: string;
    readonly contactConfirmation: string;
    readonly waitlistConfirmation: string;
    readonly therapistVerification: string;
  };
}

export interface CRMIntegration {
  readonly provider: 'salesforce' | 'hubspot' | 'pipedrive';
  readonly endpoints: {
    readonly createContact: string;
    readonly updateContact: string;
    readonly createLead: string;
    readonly trackEvent: string;
  };
  readonly fieldMapping: Record<string, string>;
}

export interface AnalyticsIntegration {
  readonly providers: {
    readonly googleAnalytics?: {
      readonly measurementId: string;
      readonly debugMode: boolean;
    };
    readonly mixpanel?: {
      readonly projectToken: string;
      readonly trackingDomain: string;
    };
    readonly amplitude?: {
      readonly apiKey: string;
      readonly serverZone: 'US' | 'EU';
    };
  };
  readonly consentRequired: boolean;
  readonly anonymizeIp: boolean;
}

// ============================================================================
// ERROR HANDLING & VALIDATION
// ============================================================================

export interface ValidationRule {
  readonly field: string;
  readonly rules: Array<{
    readonly type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
    readonly value?: string | number;
    readonly message: string;
  }>;
}

export interface FormValidationError {
  readonly field: string;
  readonly rule: string;
  readonly message: string;
  readonly value?: unknown;
}

export interface RateLimitError extends APIError {
  readonly code: 'RATE_LIMIT_EXCEEDED';
  readonly retryAfter: number; // seconds
  readonly limit: number;
  readonly remaining: number;
  readonly resetTime: Date;
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

export function isAPIError(response: APIResponse): response is APIResponse & { error: APIError } {
  return !response.success && response.error !== undefined;
}

export function isRateLimitError(error: APIError): error is RateLimitError {
  return error.code === 'RATE_LIMIT_EXCEEDED';
}

export function isPaginatedResponse<T>(response: APIResponse<T[]>): response is PaginatedResponse<T> {
  return Array.isArray(response.data) && 
         response.metadata !== undefined &&
         'page' in response.metadata &&
         'total' in response.metadata;
}

// ============================================================================
// HTTP CLIENT CONFIGURATION
// ============================================================================

export interface HTTPClientConfig {
  readonly baseURL: string;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly retryDelay: number;
  readonly headers: Record<string, string>;
  readonly interceptors: {
    readonly request?: (config: RequestConfig) => RequestConfig;
    readonly response?: (response: APIResponse) => APIResponse;
    readonly error?: (error: APIError) => APIError;
  };
}

export interface RequestConfig {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly url: string;
  readonly data?: unknown;
  readonly params?: Record<string, string | number | boolean>;
  readonly headers?: Record<string, string>;
  readonly timeout?: number;
  readonly retryAttempts?: number;
}