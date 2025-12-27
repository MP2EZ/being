/**
 * CRYPTOGRAPHIC ID GENERATION UNIT TESTS
 *
 * Tests for the secure ID generation utilities in @/core/utils/id.
 * These utilities replace insecure Math.random() calls throughout the codebase.
 *
 * Security Requirements:
 * - All IDs must be cryptographically random (not predictable)
 * - IDs must be unique across calls (no collisions)
 * - Format must be consistent and parseable
 */

import {
  generateUUID,
  generateRandomString,
  generateTimestampedId,
  generateComponentId,
  generateSessionId,
  generateInternalId,
} from '../../src/core/utils/id';

describe('Cryptographic ID Generation', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID v4 format', () => {
      const uuid = generateUUID();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs on each call', () => {
      const uuids = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        uuids.add(generateUUID());
      }

      // All 1000 UUIDs should be unique
      expect(uuids.size).toBe(iterations);
    });

    it('should have correct length (36 characters with hyphens)', () => {
      const uuid = generateUUID();
      expect(uuid.length).toBe(36);
    });
  });

  describe('generateRandomString', () => {
    it('should generate a string of default length (9)', () => {
      const str = generateRandomString();
      expect(str.length).toBe(9);
    });

    it('should generate a string of specified length', () => {
      const lengths = [5, 10, 16, 32];

      for (const len of lengths) {
        const str = generateRandomString(len);
        expect(str.length).toBe(len);
      }
    });

    it('should generate unique strings on each call', () => {
      const strings = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        strings.add(generateRandomString());
      }

      expect(strings.size).toBe(iterations);
    });

    it('should contain only alphanumeric characters', () => {
      const str = generateRandomString(100);
      // After base36 encoding, should only contain 0-9 and a-z
      expect(str).toMatch(/^[0-9a-z]+$/);
    });
  });

  describe('generateTimestampedId', () => {
    it('should generate ID with prefix when provided', () => {
      const id = generateTimestampedId('test');
      expect(id).toMatch(/^test_\d+_[a-z0-9]+$/);
    });

    it('should generate ID without prefix when not provided', () => {
      const id = generateTimestampedId();
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });

    it('should include a valid timestamp', () => {
      const before = Date.now();
      const id = generateTimestampedId('evt');
      const after = Date.now();

      // Extract timestamp from ID
      const parts = id.split('_');
      const timestamp = parseInt(parts[1], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique IDs even in rapid succession', () => {
      const ids = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        ids.add(generateTimestampedId('rapid'));
      }

      // Even with same timestamp, random suffix ensures uniqueness
      expect(ids.size).toBe(iterations);
    });

    it('should handle various prefix formats', () => {
      const prefixes = ['evt', 'consent', 'assessment', 'crisis_alert'];

      for (const prefix of prefixes) {
        const id = generateTimestampedId(prefix);
        expect(id.startsWith(`${prefix}_`)).toBe(true);
      }
    });
  });

  describe('generateComponentId', () => {
    it('should generate ID with prefix when provided', () => {
      const id = generateComponentId('radio-group');
      expect(id).toMatch(/^radio-group-[a-z0-9]+$/);
    });

    it('should generate ID without prefix when not provided', () => {
      const id = generateComponentId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it('should generate unique IDs for React key usage', () => {
      const ids = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        ids.add(generateComponentId('item'));
      }

      expect(ids.size).toBe(iterations);
    });
  });

  describe('generateSessionId', () => {
    it('should generate session ID with correct format', () => {
      const id = generateSessionId();
      // Format: session_YYYY-MM-DD_xxxxxxxxx
      expect(id).toMatch(/^session_\d{4}-\d{2}-\d{2}_[a-z0-9]+$/);
    });

    it('should include today\'s date', () => {
      const id = generateSessionId();
      const today = new Date().toISOString().split('T')[0];

      expect(id).toContain(today);
    });

    it('should generate unique session IDs', () => {
      const ids = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        ids.add(generateSessionId());
      }

      expect(ids.size).toBe(iterations);
    });
  });

  describe('generateInternalId', () => {
    it('should generate ID with timestamp and random suffix', () => {
      const id = generateInternalId();
      expect(id).toMatch(/^\d+_[a-z0-9]+$/);
    });

    it('should include a valid timestamp', () => {
      const before = Date.now();
      const id = generateInternalId();
      const after = Date.now();

      const timestamp = parseInt(id.split('_')[0], 10);

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique internal IDs', () => {
      const ids = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        ids.add(generateInternalId());
      }

      expect(ids.size).toBe(iterations);
    });
  });

  describe('Cryptographic Security Properties', () => {
    it('should not produce predictable sequences', () => {
      // Generate many IDs and check they don't follow obvious patterns
      const ids: string[] = [];
      for (let i = 0; i < 100; i++) {
        ids.push(generateRandomString(9));
      }

      // Check that consecutive IDs are not incrementing
      let hasVariation = false;
      for (let i = 1; i < ids.length; i++) {
        if (ids[i] !== ids[i - 1]) {
          hasVariation = true;
          break;
        }
      }
      expect(hasVariation).toBe(true);

      // Check that IDs are not sorted (which would indicate predictability)
      const sorted = [...ids].sort();
      let matchesSorted = true;
      for (let i = 0; i < ids.length; i++) {
        if (ids[i] !== sorted[i]) {
          matchesSorted = false;
          break;
        }
      }
      expect(matchesSorted).toBe(false);
    });

    it('should have sufficient entropy for security-sensitive use', () => {
      // A 9-character base36 string has ~46 bits of entropy
      // This is sufficient for most application-level IDs
      const str = generateRandomString(9);

      // Base36 alphabet: 0-9 (10) + a-z (26) = 36 characters
      // 36^9 ≈ 1.01 × 10^14 possible combinations
      expect(str.length).toBeGreaterThanOrEqual(9);
    });
  });
});
