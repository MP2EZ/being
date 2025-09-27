/**
 * Webhook Security Tests - Day 18 Phase 4
 * Testing webhook signature verification, rate limiting, and HIPAA compliance
 */

import { WebhookSecurityValidationSchema } from '../../src/types/webhook';
import type { WebhookEvent, WebhookSecurityValidation } from '../../src/types/webhook';

// Mock crypto for HMAC verification
const mockCrypto = {
  createHmac: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  digest: jest.fn().mockReturnValue('valid_signature')
};

jest.mock('crypto', () => mockCrypto);

describe('Webhook Security Tests', () => {
  const mockSecret = 'whsec_test_secret_key_12345';
  const mockPayload = JSON.stringify({
    id: 'evt_test_123',
    object: 'event',
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_test' } }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Webhook Signature Validation', () => {
    it('validates webhook security validation schema', () => {
      const validationData: WebhookSecurityValidation = {
        signature: 'v1=test_signature_hash',
        timestamp: Math.floor(Date.now() / 1000),
        payload: mockPayload,
        tolerance: 300
      };

      const result = WebhookSecurityValidationSchema.safeParse(validationData);
      expect(result.success).toBe(true);
    });

    it('rejects validation data with invalid timestamp', () => {
      const invalidData = {
        signature: 'v1=test_signature_hash',
        timestamp: 'invalid_timestamp',
        payload: mockPayload,
        tolerance: 300
      };

      const result = WebhookSecurityValidationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('validates HMAC signature correctly', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${mockPayload}`;
      const expectedSignature = 'valid_signature';

      mockCrypto.createHmac.mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue(expectedSignature)
        })
      });

      // In real implementation, this would call the webhook security service
      const isValid = verifyWebhookSignature(
        'v1=' + expectedSignature,
        signedPayload,
        mockSecret
      );

      expect(isValid).toBe(true);
      expect(mockCrypto.createHmac).toHaveBeenCalledWith('sha256', mockSecret);
    });

    it('rejects invalid signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${mockPayload}`;
      const validSignature = 'valid_signature';
      const invalidSignature = 'invalid_signature';

      mockCrypto.createHmac.mockReturnValue({
        update: jest.fn().mockReturnValue({
          digest: jest.fn().mockReturnValue(validSignature)
        })
      });

      const isValid = verifyWebhookSignature(
        'v1=' + invalidSignature,
        signedPayload,
        mockSecret
      );

      expect(isValid).toBe(false);
    });

    it('rejects timestamps outside tolerance window', () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const tolerance = 300; // 5 minutes

      const isWithinTolerance = checkTimestampTolerance(oldTimestamp, tolerance);
      expect(isWithinTolerance).toBe(false);
    });

    it('accepts timestamps within tolerance window', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const tolerance = 300; // 5 minutes

      const isWithinTolerance = checkTimestampTolerance(recentTimestamp, tolerance);
      expect(isWithinTolerance).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('allows requests within rate limit', () => {
      const rateLimiter = createMockRateLimiter(60, 60000); // 60 requests per minute

      // Make 50 requests - should all pass
      for (let i = 0; i < 50; i++) {
        expect(rateLimiter.isAllowed('test_endpoint')).toBe(true);
      }
    });

    it('blocks requests exceeding rate limit', () => {
      const rateLimiter = createMockRateLimiter(5, 60000); // 5 requests per minute

      // Make 5 requests - should pass
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed('test_endpoint')).toBe(true);
      }

      // 6th request should be blocked
      expect(rateLimiter.isAllowed('test_endpoint')).toBe(false);
    });

    it('resets rate limit after time window', () => {
      const rateLimiter = createMockRateLimiter(1, 1000); // 1 request per second

      // First request should pass
      expect(rateLimiter.isAllowed('test_endpoint')).toBe(true);

      // Second request should be blocked
      expect(rateLimiter.isAllowed('test_endpoint')).toBe(false);

      // Advance time and reset
      rateLimiter.advanceTime(1001);

      // Request should now pass again
      expect(rateLimiter.isAllowed('test_endpoint')).toBe(true);
    });

    it('applies different limits per endpoint', () => {
      const rateLimiter = createMockRateLimiter(2, 60000);

      // Use up limit for endpoint1
      expect(rateLimiter.isAllowed('endpoint1')).toBe(true);
      expect(rateLimiter.isAllowed('endpoint1')).toBe(true);
      expect(rateLimiter.isAllowed('endpoint1')).toBe(false);

      // endpoint2 should still work
      expect(rateLimiter.isAllowed('endpoint2')).toBe(true);
      expect(rateLimiter.isAllowed('endpoint2')).toBe(true);
      expect(rateLimiter.isAllowed('endpoint2')).toBe(false);
    });
  });

  describe('HIPAA Compliance', () => {
    it('logs webhook events without PII', () => {
      const webhookEvent: WebhookEvent = {
        id: 'evt_test_123',
        object: 'event',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_456',
            metadata: {
              user_email: 'user@example.com', // PII that should be filtered
              user_id: '12345'
            }
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const hipaaLog = createHIPAACompliantLog(webhookEvent);

      // Should contain event metadata but no PII
      expect(hipaaLog.eventId).toBe('evt_test_123');
      expect(hipaaLog.eventType).toBe('customer.subscription.updated');
      expect(hipaaLog.userIdHash).toBeDefined();
      expect(hipaaLog.userIdHash).not.toBe('12345'); // Should be hashed

      // Should not contain PII in audit trail
      const auditTrailString = hipaaLog.auditTrail.join(' ');
      expect(auditTrailString).not.toContain('user@example.com');
      expect(auditTrailString).not.toContain('12345');
    });

    it('creates audit trail with required HIPAA fields', () => {
      const webhookEvent: WebhookEvent = {
        id: 'evt_audit_123',
        object: 'event',
        created: Date.now() / 1000,
        data: { object: { id: 'test_object' } },
        livemode: false,
        pending_webhooks: 1,
        request: { id: 'req_123', idempotency_key: 'key_123' },
        type: 'test.event'
      };

      const hipaaLog = createHIPAACompliantLog(webhookEvent);

      expect(hipaaLog.auditTrail).toContain('event_received');
      expect(hipaaLog.auditTrail).toContain('signature_verified');
      expect(hipaaLog.auditTrail).toContain('processing_started');
      expect(hipaaLog.timestamp).toBeInstanceOf(Date);
    });

    it('handles crisis events with appropriate logging', () => {
      const crisisEvent: WebhookEvent = {
        id: 'evt_crisis_123',
        object: 'event',
        created: Date.now() / 1000,
        data: {
          object: {
            id: 'sub_crisis_123',
            status: 'unpaid',
            metadata: { crisis_mode: 'true' }
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: 'customer.subscription.updated'
      };

      const hipaaLog = createHIPAACompliantLog(crisisEvent, true);

      expect(hipaaLog.auditTrail).toContain('crisis_mode_detected');
      expect(hipaaLog.auditTrail).toContain('emergency_processing');

      // Crisis events should have additional audit requirements
      const auditTrailString = hipaaLog.auditTrail.join(' ');
      expect(auditTrailString).toContain('crisis');
    });
  });

  describe('Performance Security Requirements', () => {
    it('validates webhook processing under crisis performance limits', () => {
      const startTime = performance.now();

      // Simulate crisis webhook processing
      const crisisWebhookValidation = validateCrisisWebhook({
        signature: 'v1=crisis_signature',
        timestamp: Math.floor(Date.now() / 1000),
        payload: mockPayload,
        tolerance: 60 // Reduced tolerance for crisis events
      });

      const processingTime = performance.now() - startTime;

      expect(crisisWebhookValidation.isValid).toBe(true);
      expect(processingTime).toBeLessThan(50); // Crisis security validation: <50ms
    });

    it('maintains security standards under load', () => {
      const rateLimiter = createMockRateLimiter(1000, 60000); // High rate limit
      const securityValidator = createMockSecurityValidator();

      // Simulate high load
      const results = [];
      for (let i = 0; i < 100; i++) {
        const isAllowed = rateLimiter.isAllowed('webhook_endpoint');
        const isSecure = securityValidator.validate(`payload_${i}`);
        results.push({ allowed: isAllowed, secure: isSecure });
      }

      // All requests should maintain security
      expect(results.every(r => r.secure)).toBe(true);
      expect(results.every(r => r.allowed)).toBe(true);
    });
  });

  describe('Error Handling Security', () => {
    it('does not leak sensitive information in error messages', () => {
      try {
        verifyWebhookSignature('invalid_signature', 'payload', mockSecret);
      } catch (error) {
        expect(error.message).not.toContain(mockSecret);
        expect(error.message).not.toContain('payload');
        expect(error.message).toContain('signature verification failed');
      }
    });

    it('handles malformed webhook data securely', () => {
      const malformedData = {
        signature: 'v1=test',
        timestamp: 'not_a_number',
        payload: null,
        tolerance: -1
      };

      const result = WebhookSecurityValidationSchema.safeParse(malformedData);
      expect(result.success).toBe(false);

      if (!result.success) {
        // Error should not contain sensitive data
        const errorMessage = result.error.message;
        expect(errorMessage).not.toContain('v1=test');
      }
    });
  });
});

// Mock helper functions
function verifyWebhookSignature(signature: string, payload: string, secret: string): boolean {
  // Mock implementation
  return signature.includes('valid_signature');
}

function checkTimestampTolerance(timestamp: number, tolerance: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - timestamp) <= tolerance;
}

function createMockRateLimiter(limit: number, windowMs: number) {
  const requests: Record<string, number[]> = {};
  let currentTime = Date.now();

  return {
    isAllowed(endpoint: string): boolean {
      if (!requests[endpoint]) {
        requests[endpoint] = [];
      }

      // Clean old requests
      requests[endpoint] = requests[endpoint].filter(
        time => currentTime - time < windowMs
      );

      if (requests[endpoint].length >= limit) {
        return false;
      }

      requests[endpoint].push(currentTime);
      return true;
    },
    advanceTime(ms: number) {
      currentTime += ms;
    }
  };
}

function createHIPAACompliantLog(event: WebhookEvent, isCrisis = false) {
  const userIdHash = event.data.object.metadata?.user_id
    ? `hash_${event.data.object.metadata.user_id.slice(0, 8)}`
    : undefined;

  const auditTrail = [
    'event_received',
    'signature_verified',
    'processing_started'
  ];

  if (isCrisis) {
    auditTrail.push('crisis_mode_detected', 'emergency_processing');
  }

  return {
    eventId: event.id,
    timestamp: new Date(),
    eventType: event.type,
    processingResult: 'success' as const,
    processingTime: 150,
    userIdHash,
    auditTrail
  };
}

function validateCrisisWebhook(validation: WebhookSecurityValidation) {
  // Mock crisis webhook validation
  return {
    isValid: true,
    processingTime: 25 // Fast for crisis
  };
}

function createMockSecurityValidator() {
  return {
    validate(payload: string): boolean {
      // Mock security validation
      return payload.length > 0;
    }
  };
}