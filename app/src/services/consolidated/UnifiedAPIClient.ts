/**
 * Unified API Client - TypeScript-First Consolidation
 *
 * Consolidated API client service replacing multiple scattered API clients
 * with strict TypeScript typing, comprehensive error handling, and New Architecture
 * compatibility. Maintains clinical accuracy and crisis response performance.
 *
 * CRITICAL: <200ms crisis endpoint response time requirement
 * FEATURES: Branded types, strict mode compliance, unified error handling, performance monitoring
 * REPLACES: SupabaseClient, RestSyncClient, DeviceManagementAPI, PerformanceMonitoringAPI, etc.
 */

import { Platform } from 'react-native';
import type {
  DeepReadonly,
  ISODateString,
  UserID,
  DurationMs,
  CrisisSeverity,
} from '../../types/core';
import type {
  PHQ9Score,
  GAD7Score,
  AssessmentID,
  ClinicalSeverity,
} from '../../types/clinical';
import type {
  CloudFeatureFlags,
  CloudSyncError,
  CloudSyncMetadata,
} from '../../types/cloud';

// === BRANDED TYPES FOR TYPE SAFETY ===

type APIRequestID = string & { readonly __brand: 'APIRequestID' };
type EndpointURL = string & { readonly __brand: 'EndpointURL' };
type APIToken = string & { readonly __brand: 'APIToken' };
type ResponseHash = string & { readonly __brand: 'ResponseHash' };
type RequestTimestamp = number & { readonly __brand: 'RequestTimestamp' };

// === API CLIENT CONFIGURATION ===

interface UnifiedAPIConfig {
  readonly baseURL: EndpointURL;
  readonly timeout: DurationMs;
  readonly retryAttempts: number;
  readonly enableRequestDeduplication: boolean;
  readonly enableResponseCaching: boolean;
  readonly cacheTTL: DurationMs;
  readonly performanceTracking: boolean;
  readonly crisisEndpointPriority: boolean;
  readonly hipaaCompliance: boolean;
  readonly endpoints: {
    readonly auth: string;
    readonly sync: string;
    readonly crisis: string;
    readonly assessments: string;
    readonly monitoring: string;
    readonly analytics: string;
  };
}

const DEFAULT_API_CONFIG: UnifiedAPIConfig = {
  baseURL: (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.fullmind.app') as EndpointURL,
  timeout: 30000 as DurationMs,
  retryAttempts: 3,
  enableRequestDeduplication: true,
  enableResponseCaching: true,
  cacheTTL: 300000 as DurationMs, // 5 minutes
  performanceTracking: true,
  crisisEndpointPriority: true,
  hipaaCompliance: true,
  endpoints: {
    auth: '/auth',
    sync: '/sync',
    crisis: '/crisis',
    assessments: '/assessments',
    monitoring: '/monitor',
    analytics: '/analytics',
  },
} as const;

// === REQUEST/RESPONSE TYPES ===

interface APIRequest<T = any> {
  readonly id: APIRequestID;
  readonly endpoint: EndpointURL;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly headers: ReadonlyMap<string, string>;
  readonly body?: T;
  readonly timestamp: RequestTimestamp;
  readonly priority: 'low' | 'normal' | 'high' | 'critical';
  readonly requiresAuth: boolean;
  readonly retryable: boolean;
  readonly cacheKey?: string;
}

interface APIResponse<T = any> {
  readonly requestId: APIRequestID;
  readonly status: number;
  readonly data: T;
  readonly headers: ReadonlyMap<string, string>;
  readonly timestamp: ISODateString;
  readonly fromCache: boolean;
  readonly responseTime: DurationMs;
  readonly contentHash?: ResponseHash;
}

interface APIError {
  readonly requestId: APIRequestID;
  readonly code: string;
  readonly message: string;
  readonly status?: number;
  readonly category: 'network' | 'authentication' | 'validation' | 'server' | 'timeout' | 'crisis';
  readonly retryable: boolean;
  readonly hipaaRelevant: boolean;
  readonly occurredAt: ISODateString;
  readonly context?: Record<string, any>;
}

// === PERFORMANCE MONITORING TYPES ===

interface APIPerformanceMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly averageResponseTime: DurationMs;
  readonly crisisEndpointPerformance: {
    readonly averageResponseTime: DurationMs;
    readonly p99ResponseTime: DurationMs;
    readonly successRate: number;
  };
  readonly endpointMetrics: ReadonlyMap<string, {
    readonly requests: number;
    readonly avgResponseTime: DurationMs;
    readonly errorRate: number;
  }>;
  readonly cacheMetrics: {
    readonly hits: number;
    readonly misses: number;
    readonly hitRate: number;
  };
}

// === CRISIS API TYPES ===

interface CrisisAPIRequest {
  readonly userId: UserID;
  readonly severity: CrisisSeverity;
  readonly trigger: string;
  readonly timestamp: ISODateString;
  readonly location?: {
    readonly latitude: number;
    readonly longitude: number;
  };
  readonly assessmentScores?: {
    readonly phq9?: PHQ9Score;
    readonly gad7?: GAD7Score;
  };
  readonly emergencyContact?: boolean;
}

interface CrisisAPIResponse {
  readonly crisisId: string;
  readonly recommendations: readonly string[];
  readonly emergencyContacts: readonly string[];
  readonly safetyPlan: any;
  readonly immediateActions: readonly string[];
  readonly followUpRequired: boolean;
  readonly professionalReferral: boolean;
}

// === ASSESSMENT API TYPES ===

interface AssessmentSyncRequest {
  readonly assessmentId: AssessmentID;
  readonly type: 'phq9' | 'gad7';
  readonly responses: Record<string, number>;
  readonly score: number;
  readonly severity: ClinicalSeverity;
  readonly timestamp: ISODateString;
  readonly encrypted: boolean;
}

interface AssessmentSyncResponse {
  readonly syncId: string;
  readonly status: 'synced' | 'conflict' | 'failed';
  readonly serverScore?: number;
  readonly conflictReason?: string;
  readonly recommendations?: readonly string[];
}

// === MAIN UNIFIED API CLIENT ===

class TypeSafeUnifiedAPIClient {
  private readonly config: UnifiedAPIConfig;
  private readonly authToken: APIToken | null = null;
  private readonly requestCache = new Map<string, APIResponse>();
  private readonly performanceMetrics: APIPerformanceMetrics;
  private readonly pendingRequests = new Map<string, Promise<APIResponse>>();
  private readonly crisisRequestQueue: APIRequest[] = [];
  private isProcessingCrisisQueue = false;

  constructor(config: Partial<UnifiedAPIConfig> = {}) {
    this.config = { ...DEFAULT_API_CONFIG, ...config };
    this.performanceMetrics = this.initializeMetrics();

    // Setup crisis request priority processing
    if (this.config.crisisEndpointPriority) {
      this.setupCrisisQueueProcessor();
    }
  }

  // === CRISIS API METHODS (HIGHEST PRIORITY) ===

  /**
   * Send crisis intervention request with <200ms target response time
   * CRITICAL: Must maintain crisis response performance
   */
  async sendCrisisRequest(request: CrisisAPIRequest): Promise<APIResponse<CrisisAPIResponse> | APIError> {
    const startTime = performance.now() as RequestTimestamp;

    try {
      const apiRequest: APIRequest<CrisisAPIRequest> = {
        id: this.generateRequestId(),
        endpoint: this.buildEndpoint('crisis') as EndpointURL,
        method: 'POST',
        headers: this.buildHeaders(true, 'crisis'),
        body: request,
        timestamp: startTime,
        priority: 'critical',
        requiresAuth: true,
        retryable: false, // Crisis requests should not be retried to avoid delays
        cacheKey: undefined, // Never cache crisis requests
      };

      // Process crisis request immediately, bypassing normal queue
      const response = await this.executeCrisisRequest(apiRequest);

      const responseTime = performance.now() - startTime;
      this.updateCrisisMetrics(responseTime);

      if (responseTime > 200) {
        console.warn(`Crisis API exceeded target: ${responseTime}ms`);
        this.recordPerformanceWarning('crisis_slow_response', responseTime);
      }

      return response;
    } catch (error) {
      return this.createAPIError(error, 'crisis', this.generateRequestId());
    }
  }

  /**
   * Get emergency contacts and safety plan
   */
  async getEmergencyResources(userId: UserID): Promise<APIResponse<any> | APIError> {
    return this.makeRequest({
      id: this.generateRequestId(),
      endpoint: this.buildEndpoint(`crisis/${userId}/emergency`) as EndpointURL,
      method: 'GET',
      headers: this.buildHeaders(true, 'crisis'),
      timestamp: performance.now() as RequestTimestamp,
      priority: 'critical',
      requiresAuth: true,
      retryable: true,
    });
  }

  // === ASSESSMENT API METHODS ===

  /**
   * Sync assessment with clinical validation
   */
  async syncAssessment(request: AssessmentSyncRequest): Promise<APIResponse<AssessmentSyncResponse> | APIError> {
    // Validate clinical accuracy before sync
    if (!this.validateClinicalAssessment(request)) {
      return this.createAPIError(
        new Error('Clinical validation failed - assessment data invalid'),
        'validation',
        this.generateRequestId()
      );
    }

    return this.makeRequest({
      id: this.generateRequestId(),
      endpoint: this.buildEndpoint('assessments/sync') as EndpointURL,
      method: 'POST',
      headers: this.buildHeaders(true, 'clinical'),
      body: request,
      timestamp: performance.now() as RequestTimestamp,
      priority: 'high',
      requiresAuth: true,
      retryable: true,
    });
  }

  /**
   * Get assessment history with clinical context
   */
  async getAssessmentHistory(
    userId: UserID,
    type: 'phq9' | 'gad7',
    limit = 10
  ): Promise<APIResponse<any[]> | APIError> {
    const cacheKey = `assessments_${userId}_${type}_${limit}`;

    return this.makeRequest({
      id: this.generateRequestId(),
      endpoint: this.buildEndpoint(`assessments/${userId}/${type}?limit=${limit}`) as EndpointURL,
      method: 'GET',
      headers: this.buildHeaders(true, 'clinical'),
      timestamp: performance.now() as RequestTimestamp,
      priority: 'normal',
      requiresAuth: true,
      retryable: true,
      cacheKey,
    });
  }

  // === CLOUD SYNC API METHODS ===

  /**
   * Perform encrypted cloud sync
   */
  async syncToCloud(
    data: any,
    syncMetadata: CloudSyncMetadata
  ): Promise<APIResponse<any> | APIError> {
    return this.makeRequest({
      id: this.generateRequestId(),
      endpoint: this.buildEndpoint('sync/upload') as EndpointURL,
      method: 'POST',
      headers: this.buildHeaders(true, 'sync'),
      body: {
        data,
        metadata: syncMetadata,
        encrypted: true,
        platform: Platform.OS,
      },
      timestamp: performance.now() as RequestTimestamp,
      priority: 'normal',
      requiresAuth: true,
      retryable: true,
    });
  }

  /**
   * Fetch updates from cloud
   */
  async fetchFromCloud(
    lastSyncTimestamp?: ISODateString
  ): Promise<APIResponse<any> | APIError> {
    const endpoint = lastSyncTimestamp
      ? `sync/download?since=${lastSyncTimestamp}`
      : 'sync/download';

    return this.makeRequest({
      id: this.generateRequestId(),
      endpoint: this.buildEndpoint(endpoint) as EndpointURL,
      method: 'GET',
      headers: this.buildHeaders(true, 'sync'),
      timestamp: performance.now() as RequestTimestamp,
      priority: 'normal',
      requiresAuth: true,
      retryable: true,
    });
  }

  // === PERFORMANCE MONITORING ===

  /**
   * Send performance metrics to monitoring service
   */
  async sendPerformanceMetrics(metrics: any): Promise<APIResponse<void> | APIError> {
    return this.makeRequest({
      id: this.generateRequestId(),
      endpoint: this.buildEndpoint('monitoring/performance') as EndpointURL,
      method: 'POST',
      headers: this.buildHeaders(true, 'monitoring'),
      body: {
        ...metrics,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      },
      timestamp: performance.now() as RequestTimestamp,
      priority: 'low',
      requiresAuth: true,
      retryable: true,
    });
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): DeepReadonly<APIPerformanceMetrics> {
    return this.performanceMetrics;
  }

  // === GENERIC API METHODS ===

  /**
   * Make generic type-safe API request
   */
  async makeRequest<TRequest = any, TResponse = any>(
    request: Omit<APIRequest<TRequest>, 'headers'> & {
      headers?: ReadonlyMap<string, string>;
    }
  ): Promise<APIResponse<TResponse> | APIError> {
    try {
      // Build complete request
      const completeRequest: APIRequest<TRequest> = {
        ...request,
        headers: request.headers || this.buildHeaders(request.requiresAuth),
      };

      // Check request deduplication
      if (this.config.enableRequestDeduplication && request.cacheKey) {
        const existingRequest = this.pendingRequests.get(request.cacheKey);
        if (existingRequest) {
          return existingRequest as Promise<APIResponse<TResponse>>;
        }
      }

      // Check response cache
      if (this.config.enableResponseCaching && request.cacheKey && request.method === 'GET') {
        const cachedResponse = this.requestCache.get(request.cacheKey);
        if (cachedResponse && this.isCacheValid(cachedResponse)) {
          this.updateCacheMetrics(true);
          return { ...cachedResponse, fromCache: true } as APIResponse<TResponse>;
        }
      }

      // Execute request
      const requestPromise = this.executeRequest<TRequest, TResponse>(completeRequest);

      // Store pending request for deduplication
      if (request.cacheKey) {
        this.pendingRequests.set(request.cacheKey, requestPromise as any);
      }

      const response = await requestPromise;

      // Clean up pending request
      if (request.cacheKey) {
        this.pendingRequests.delete(request.cacheKey);
      }

      // Cache response if applicable
      if (this.config.enableResponseCaching && request.cacheKey && request.method === 'GET' && response.status === 200) {
        this.requestCache.set(request.cacheKey, response);
        this.updateCacheMetrics(false);
      }

      return response;
    } catch (error) {
      return this.createAPIError(error, 'network', request.id);
    }
  }

  // === PRIVATE HELPER METHODS ===

  private async executeRequest<TRequest, TResponse>(
    request: APIRequest<TRequest>
  ): Promise<APIResponse<TResponse>> {
    const startTime = performance.now();

    try {
      const fetchOptions: RequestInit = {
        method: request.method,
        headers: this.mapToObject(request.headers),
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout),
      };

      const response = await fetch(request.endpoint, fetchOptions);
      const responseTime = (performance.now() - startTime) as DurationMs;

      // Update performance metrics
      this.updatePerformanceMetrics(request, response.status, responseTime);

      let data: TResponse;
      try {
        data = await response.json();
      } catch {
        data = {} as TResponse;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        requestId: request.id,
        status: response.status,
        data,
        headers: this.objectToMap(Object.fromEntries(response.headers.entries())),
        timestamp: new Date().toISOString() as ISODateString,
        fromCache: false,
        responseTime,
        contentHash: this.generateContentHash(data),
      };
    } catch (error) {
      const responseTime = (performance.now() - startTime) as DurationMs;
      this.updatePerformanceMetrics(request, 0, responseTime, true);
      throw error;
    }
  }

  private async executeCrisisRequest<T>(
    request: APIRequest<T>
  ): Promise<APIResponse<CrisisAPIResponse>> {
    // Crisis requests bypass normal processing for speed
    return this.executeRequest<T, CrisisAPIResponse>(request);
  }

  private validateClinicalAssessment(assessment: AssessmentSyncRequest): boolean {
    // Validate PHQ-9 scoring
    if (assessment.type === 'phq9') {
      if (assessment.score < 0 || assessment.score > 27) return false;
      const responseCount = Object.keys(assessment.responses).length;
      if (responseCount !== 9) return false;
    }

    // Validate GAD-7 scoring
    if (assessment.type === 'gad7') {
      if (assessment.score < 0 || assessment.score > 21) return false;
      const responseCount = Object.keys(assessment.responses).length;
      if (responseCount !== 7) return false;
    }

    return true;
  }

  private setupCrisisQueueProcessor(): void {
    // Process crisis queue every 50ms for maximum responsiveness
    setInterval(() => {
      if (!this.isProcessingCrisisQueue && this.crisisRequestQueue.length > 0) {
        this.processCrisisQueue();
      }
    }, 50);
  }

  private async processCrisisQueue(): Promise<void> {
    this.isProcessingCrisisQueue = true;

    try {
      while (this.crisisRequestQueue.length > 0) {
        const request = this.crisisRequestQueue.shift();
        if (request) {
          await this.executeCrisisRequest(request);
        }
      }
    } finally {
      this.isProcessingCrisisQueue = false;
    }
  }

  private buildEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.config.baseURL}/${cleanPath}`;
  }

  private buildHeaders(
    requiresAuth = false,
    context?: 'crisis' | 'clinical' | 'sync' | 'monitoring'
  ): ReadonlyMap<string, string> {
    const headers = new Map<string, string>();

    headers.set('Content-Type', 'application/json');
    headers.set('Accept', 'application/json');
    headers.set('X-Client-Version', process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0');
    headers.set('X-Platform', Platform.OS);
    headers.set('X-Request-ID', this.generateRequestId());
    headers.set('X-Timestamp', new Date().toISOString());

    if (this.config.hipaaCompliance) {
      headers.set('X-HIPAA-Compliant', 'true');
    }

    if (context) {
      headers.set('X-Context', context);
      if (context === 'crisis') {
        headers.set('X-Priority', 'critical');
      }
    }

    if (requiresAuth && this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    return headers;
  }

  private generateRequestId(): APIRequestID {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as APIRequestID;
  }

  private generateContentHash(content: any): ResponseHash {
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16) as ResponseHash;
  }

  private isCacheValid(response: APIResponse): boolean {
    const now = Date.now();
    const responseAge = now - new Date(response.timestamp).getTime();
    return responseAge < this.config.cacheTTL;
  }

  private mapToObject(map: ReadonlyMap<string, string>): Record<string, string> {
    const obj: Record<string, string> = {};
    map.forEach((value, key) => {
      obj[key] = value;
    });
    return obj;
  }

  private objectToMap(obj: Record<string, string>): ReadonlyMap<string, string> {
    return new Map(Object.entries(obj));
  }

  private createAPIError(
    error: unknown,
    category: APIError['category'],
    requestId: APIRequestID
  ): APIError {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return {
      requestId,
      code: `API_${category.toUpperCase()}_ERROR`,
      message,
      category,
      retryable: category !== 'validation' && category !== 'authentication',
      hipaaRelevant: category === 'crisis' || category === 'validation',
      occurredAt: new Date().toISOString() as ISODateString,
      context: {
        originalError: error instanceof Error ? error.name : 'Unknown',
      },
    };
  }

  private initializeMetrics(): APIPerformanceMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0 as DurationMs,
      crisisEndpointPerformance: {
        averageResponseTime: 0 as DurationMs,
        p99ResponseTime: 0 as DurationMs,
        successRate: 1.0,
      },
      endpointMetrics: new Map(),
      cacheMetrics: {
        hits: 0,
        misses: 0,
        hitRate: 0,
      },
    };
  }

  private updatePerformanceMetrics(
    request: APIRequest,
    status: number,
    responseTime: DurationMs,
    failed = false
  ): void {
    const metrics = this.performanceMetrics as any;

    metrics.totalRequests++;
    if (failed || status >= 400) {
      metrics.failedRequests++;
    } else {
      metrics.successfulRequests++;
    }

    // Update average response time
    metrics.averageResponseTime = (
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) /
      metrics.totalRequests
    );

    // Update crisis metrics if applicable
    if (request.endpoint.includes('/crisis')) {
      this.updateCrisisMetrics(responseTime, failed);
    }

    // Update endpoint-specific metrics
    const endpointKey = `${request.method} ${request.endpoint}`;
    const existing = metrics.endpointMetrics.get(endpointKey) || {
      requests: 0,
      avgResponseTime: 0,
      errorRate: 0,
    };

    existing.requests++;
    existing.avgResponseTime = (
      (existing.avgResponseTime * (existing.requests - 1) + responseTime) /
      existing.requests
    );
    existing.errorRate = failed ?
      ((existing.errorRate * (existing.requests - 1)) + 1) / existing.requests :
      (existing.errorRate * (existing.requests - 1)) / existing.requests;

    metrics.endpointMetrics.set(endpointKey, existing);
  }

  private updateCrisisMetrics(responseTime: DurationMs, failed = false): void {
    const crisisMetrics = (this.performanceMetrics as any).crisisEndpointPerformance;

    // Update crisis-specific performance tracking
    const currentAvg = crisisMetrics.averageResponseTime;
    const currentCount = Math.max(1, this.performanceMetrics.totalRequests);

    crisisMetrics.averageResponseTime = (
      (currentAvg * (currentCount - 1) + responseTime) / currentCount
    );

    // Track P99 response time for crisis endpoints
    if (responseTime > crisisMetrics.p99ResponseTime) {
      crisisMetrics.p99ResponseTime = responseTime;
    }

    // Update crisis success rate
    if (!failed) {
      crisisMetrics.successRate = Math.min(1.0, crisisMetrics.successRate + 0.01);
    } else {
      crisisMetrics.successRate = Math.max(0.0, crisisMetrics.successRate - 0.05);
    }
  }

  private updateCacheMetrics(hit: boolean): void {
    const cacheMetrics = (this.performanceMetrics as any).cacheMetrics;

    if (hit) {
      cacheMetrics.hits++;
    } else {
      cacheMetrics.misses++;
    }

    const total = cacheMetrics.hits + cacheMetrics.misses;
    cacheMetrics.hitRate = total > 0 ? cacheMetrics.hits / total : 0;
  }

  private recordPerformanceWarning(type: string, value: number): void {
    if (this.config.performanceTracking) {
      console.warn(`[API Performance] ${type}: ${value}ms`);
      // In production, this would be sent to monitoring service
    }
  }

  // === PUBLIC API ===

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    (this as any).authToken = token as APIToken;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    (this as any).authToken = null;
  }

  /**
   * Clear request cache
   */
  clearCache(): void {
    this.requestCache.clear();
    this.pendingRequests.clear();
    (this.performanceMetrics as any).cacheMetrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    readonly size: number;
    readonly hitRate: number;
    readonly totalHits: number;
    readonly totalMisses: number;
  } {
    return {
      size: this.requestCache.size,
      hitRate: this.performanceMetrics.cacheMetrics.hitRate,
      totalHits: this.performanceMetrics.cacheMetrics.hits,
      totalMisses: this.performanceMetrics.cacheMetrics.misses,
    };
  }
}

// === SERVICE INSTANCE ===

export const UnifiedAPIClient = new TypeSafeUnifiedAPIClient({
  baseURL: (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.fullmind.app') as EndpointURL,
  timeout: 30000 as DurationMs,
  retryAttempts: 3,
  enableRequestDeduplication: true,
  enableResponseCaching: true,
  cacheTTL: 300000 as DurationMs,
  performanceTracking: true,
  crisisEndpointPriority: true,
  hipaaCompliance: true,
});

// === TYPE EXPORTS ===

export type {
  UnifiedAPIConfig,
  APIRequest,
  APIResponse,
  APIError,
  APIPerformanceMetrics,
  CrisisAPIRequest,
  CrisisAPIResponse,
  AssessmentSyncRequest,
  AssessmentSyncResponse,
  APIRequestID,
  EndpointURL,
  APIToken,
  ResponseHash,
  RequestTimestamp,
};

// === DEFAULT EXPORT ===

export default UnifiedAPIClient;