/**
 * Multi-Tier Priority Queue API
 *
 * 10-level priority queue system with crisis escalation and subscription tier enforcement
 * - Level 10: Crisis Emergency (988 hotline, immediate response <200ms)
 * - Level 9: Emergency High (High clinical risk)
 * - Level 8: Emergency Low (Emergency access, low clinical risk)
 * - Level 7: Critical (Crisis plan updates, high-risk assessments)
 * - Level 6: Urgent (Recent assessments with elevated scores)
 * - Level 5: High (Assessment data, clinical responses)
 * - Level 4: Elevated (Recent session data)
 * - Level 3: Normal (Standard check-ins, non-clinical data)
 * - Level 2: Low (User preferences, settings)
 * - Level 1: Background (Non-urgent background sync)
 */

import { z } from 'zod';
import type { SyncPriority } from './payment-sync-context-api';
import type { SubscriptionTier } from '../../types/subscription';

/**
 * Queue Operation Types
 */
export const QueueOperationSchema = z.object({
  operationId: z.string().uuid(),
  priority: z.number().min(1).max(10),
  entityType: z.string(),
  entityId: z.string(),
  userId: z.string(),
  subscriptionTier: z.enum(['trial', 'basic', 'premium', 'grace_period']),

  // Queue management
  enqueuedAt: z.string(),
  estimatedProcessingTime: z.number().positive(),
  maxWaitTime: z.number().positive(),
  timeoutAt: z.string(),

  // Crisis context
  crisisOverride: z.boolean(),
  crisisLevel: z.enum(['none', 'watch', 'elevated', 'high', 'critical', 'emergency']),
  emergencyBypass: z.boolean(),

  // Payment context
  quotaImpact: z.object({
    operationCount: z.number().min(1),
    dataSize: z.number().min(0),
    cost: z.number().min(0)
  }),

  // Dependencies
  dependencies: z.array(z.string()).default([]),
  blocking: z.array(z.string()).default([]),

  // Metadata
  metadata: z.record(z.any()).default({})
});

export type QueueOperation = z.infer<typeof QueueOperationSchema>;

/**
 * Queue Status Information
 */
export const QueueStatusSchema = z.object({
  queueId: z.string(),
  totalOperations: z.number().min(0),
  operationsByPriority: z.record(z.string(), z.number()),
  averageWaitTime: z.number().min(0),
  crisisOperations: z.number().min(0),

  // Processing stats
  processing: z.object({
    currentlyProcessing: z.number().min(0),
    maxConcurrency: z.number().positive(),
    averageProcessingTime: z.number().min(0),
    successRate: z.number().min(0).max(1)
  }),

  // Performance metrics
  performance: z.object({
    crisisResponseTime: z.object({
      average: z.number().min(0),
      p95: z.number().min(0),
      p99: z.number().min(0),
      violations: z.number().min(0) // >200ms responses
    }),
    throughput: z.object({
      operationsPerSecond: z.number().min(0),
      dataTransferRate: z.number().min(0),
      peakOperationsPerSecond: z.number().min(0)
    })
  }),

  // Subscription tier breakdown
  tierBreakdown: z.record(z.string(), z.object({
    operations: z.number().min(0),
    averageWaitTime: z.number().min(0),
    priorityAccess: z.boolean()
  })),

  lastUpdated: z.string()
});

export type QueueStatus = z.infer<typeof QueueStatusSchema>;

/**
 * Queue Position Information
 */
export const QueuePositionSchema = z.object({
  operationId: z.string().uuid(),
  currentPosition: z.number().min(0),
  priority: z.number().min(1).max(10),
  estimatedWaitTime: z.number().min(0),

  // Queue context
  queueLength: z.number().min(0),
  operationsAhead: z.number().min(0),
  operationsBehind: z.number().min(0),

  // Processing prediction
  prediction: z.object({
    likelyStartTime: z.string(),
    estimatedCompletionTime: z.string(),
    confidenceLevel: z.number().min(0).max(1)
  }),

  // Crisis escalation potential
  crisisEscalation: z.object({
    canEscalate: z.boolean(),
    escalationCriteria: z.array(z.string()),
    automaticEscalation: z.boolean()
  }),

  // Subscription context
  tierPriority: z.object({
    hasPriorityAccess: z.boolean(),
    tierBonus: z.number().min(0),
    upgradeWouldHelp: z.boolean()
  }),

  queriedAt: z.string()
});

export type QueuePosition = z.infer<typeof QueuePositionSchema>;

/**
 * Priority Escalation Request
 */
export const PriorityEscalationSchema = z.object({
  operationId: z.string().uuid(),
  requestedPriority: z.number().min(1).max(10),
  escalationReason: z.enum([
    'crisis_detected',
    'clinical_urgency',
    'time_sensitive',
    'user_request',
    'system_requirement',
    'emergency_override'
  ]),
  justification: z.string(),

  // Crisis context
  crisisEvidence: z.object({
    assessmentScores: z.record(z.number()).optional(),
    crisisIndicators: z.array(z.string()).default([]),
    timeConstraints: z.string().optional(),
    clinicalJustification: z.string().optional()
  }).optional(),

  // Authorization
  authorizedBy: z.string(),
  authorizationLevel: z.enum(['user', 'system', 'clinical', 'emergency']),

  requestedAt: z.string()
});

export type PriorityEscalation = z.infer<typeof PriorityEscalationSchema>;

/**
 * Multi-Tier Priority Queue API Class
 */
export class PriorityQueueAPI {
  private baseUrl: string;
  private apiKey: string;
  private defaultTimeout: number;

  constructor(config: {
    baseUrl: string;
    apiKey: string;
    defaultTimeout?: number;
  }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.defaultTimeout = config.defaultTimeout || 10000; // Shorter timeout for queue operations
  }

  /**
   * Enqueue operation with priority and payment context
   */
  async enqueue(operation: QueueOperation): Promise<{
    queued: boolean;
    position: number;
    estimatedWaitTime: number;
    priorityAssigned: SyncPriority;
    crisisEscalated?: boolean;
  }> {
    try {
      const validatedOperation = QueueOperationSchema.parse(operation);

      // Apply crisis escalation logic
      if (validatedOperation.crisisOverride || validatedOperation.emergencyBypass) {
        validatedOperation.priority = this.applyCrisisEscalation(
          validatedOperation.priority,
          validatedOperation.crisisLevel
        );
      }

      const response = await this.makeRequest('POST', '/queue/enqueue', validatedOperation);
      return response;
    } catch (error) {
      throw new Error(`Queue enqueue failed: ${error}`);
    }
  }

  /**
   * Get current queue status
   */
  async getQueueStatus(): Promise<QueueStatus> {
    try {
      const response = await this.makeRequest('GET', '/queue/status');
      return QueueStatusSchema.parse(response);
    } catch (error) {
      throw new Error(`Queue status query failed: ${error}`);
    }
  }

  /**
   * Get position of specific operation in queue
   */
  async getOperationPosition(operationId: string): Promise<QueuePosition> {
    try {
      const response = await this.makeRequest('GET', `/queue/position/${operationId}`);
      return QueuePositionSchema.parse(response);
    } catch (error) {
      throw new Error(`Queue position query failed: ${error}`);
    }
  }

  /**
   * Request priority escalation for operation
   */
  async requestPriorityEscalation(request: PriorityEscalation): Promise<{
    approved: boolean;
    newPriority: SyncPriority;
    newPosition: number;
    estimatedWaitTime: number;
    reason?: string;
  }> {
    try {
      const validatedRequest = PriorityEscalationSchema.parse(request);
      const response = await this.makeRequest('POST', '/queue/escalate', validatedRequest);
      return response;
    } catch (error) {
      throw new Error(`Priority escalation failed: ${error}`);
    }
  }

  /**
   * Cancel operation from queue
   */
  async cancelOperation(operationId: string, reason?: string): Promise<{
    canceled: boolean;
    wasProcessing: boolean;
    position?: number;
    refundQuota: boolean;
  }> {
    try {
      const response = await this.makeRequest('DELETE', `/queue/operation/${operationId}`, {
        reason,
        canceledAt: new Date().toISOString()
      });
      return response;
    } catch (error) {
      throw new Error(`Queue cancellation failed: ${error}`);
    }
  }

  /**
   * Get queue analytics for subscription tier
   */
  async getTierQueueAnalytics(tier: SubscriptionTier): Promise<{
    averageWaitTime: number;
    priorityAccess: boolean;
    operationsToday: number;
    quotaUsage: number;
    recommendation?: string;
  }> {
    try {
      const response = await this.makeRequest('GET', `/queue/analytics/${tier}`);
      return response;
    } catch (error) {
      throw new Error(`Tier analytics query failed: ${error}`);
    }
  }

  /**
   * Emergency queue bypass for crisis situations
   */
  async emergencyBypass(
    operationId: string,
    justification: string,
    crisisLevel: string
  ): Promise<{
    bypassed: boolean;
    newPosition: number;
    estimatedStartTime: string;
    emergencyCode: string;
  }> {
    try {
      const response = await this.makeRequest('POST', '/queue/emergency-bypass', {
        operationId,
        justification,
        crisisLevel,
        bypassedAt: new Date().toISOString(),
        emergencyCode: `EMG-${Date.now()}`
      });
      return response;
    } catch (error) {
      throw new Error(`Emergency bypass failed: ${error}`);
    }
  }

  /**
   * Bulk enqueue operations with dependency management
   */
  async bulkEnqueue(operations: QueueOperation[]): Promise<{
    queued: number;
    failed: number;
    operations: Array<{
      operationId: string;
      status: 'queued' | 'failed';
      position?: number;
      error?: string;
    }>;
  }> {
    try {
      const validatedOperations = operations.map(op => QueueOperationSchema.parse(op));

      const response = await this.makeRequest('POST', '/queue/bulk-enqueue', {
        operations: validatedOperations,
        requestedAt: new Date().toISOString()
      });

      return response;
    } catch (error) {
      throw new Error(`Bulk enqueue failed: ${error}`);
    }
  }

  /**
   * Get real-time queue events stream
   */
  async subscribeToQueueEvents(
    operationIds: string[],
    callback: (event: QueueEvent) => void
  ): Promise<() => void> {
    try {
      // Implementation would depend on WebSocket or Server-Sent Events
      const eventSource = new EventSource(
        `${this.baseUrl}/queue/events?operations=${operationIds.join(',')}`
      );

      eventSource.onmessage = (event) => {
        try {
          const queueEvent = JSON.parse(event.data);
          callback(queueEvent);
        } catch (error) {
          console.error('Queue event parsing failed:', error);
        }
      };

      // Return cleanup function
      return () => {
        eventSource.close();
      };
    } catch (error) {
      throw new Error(`Queue event subscription failed: ${error}`);
    }
  }

  /**
   * Apply crisis escalation logic
   */
  private applyCrisisEscalation(
    currentPriority: number,
    crisisLevel: string
  ): number {
    const escalationMap: Record<string, number> = {
      'emergency': 10, // Crisis Emergency
      'critical': 9,   // Emergency High
      'high': 8,       // Emergency Low
      'elevated': 7,   // Critical
      'watch': 6,      // Urgent
      'none': currentPriority
    };

    return Math.max(currentPriority, escalationMap[crisisLevel] || currentPriority);
  }

  /**
   * Private helper methods
   */
  private async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Client-Version': '1.0.0',
      'X-Request-ID': crypto.randomUUID()
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.defaultTimeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Queue Event Types for Real-time Updates
 */
export interface QueueEvent {
  operationId: string;
  eventType: 'position_changed' | 'processing_started' | 'completed' | 'failed' | 'escalated' | 'canceled';
  position?: number;
  estimatedWaitTime?: number;
  error?: string;
  timestamp: string;
}

/**
 * Priority Level Descriptions for UI
 */
export const PRIORITY_DESCRIPTIONS = {
  10: 'Crisis Emergency - Immediate response required (<200ms)',
  9: 'Emergency High - High clinical risk emergency',
  8: 'Emergency Low - Emergency access, lower clinical risk',
  7: 'Critical - Crisis plan updates, high-risk assessments',
  6: 'Urgent - Recent assessments with elevated scores',
  5: 'High - Assessment data, clinical responses',
  4: 'Elevated - Recent session data',
  3: 'Normal - Standard check-ins, non-clinical data',
  2: 'Low - User preferences, settings',
  1: 'Background - Non-urgent background sync'
} as const;

/**
 * Subscription Tier Queue Benefits
 */
export const TIER_QUEUE_BENEFITS = {
  trial: {
    priorityAccess: false,
    maxConcurrentOperations: 2,
    queueJumpRights: false,
    crisisEscalation: true // Always available for safety
  },
  basic: {
    priorityAccess: true,
    maxConcurrentOperations: 5,
    queueJumpRights: false,
    crisisEscalation: true
  },
  premium: {
    priorityAccess: true,
    maxConcurrentOperations: 10,
    queueJumpRights: true,
    crisisEscalation: true
  },
  grace_period: {
    priorityAccess: false,
    maxConcurrentOperations: 1,
    queueJumpRights: false,
    crisisEscalation: true // Always available for safety
  }
} as const;

export default PriorityQueueAPI;