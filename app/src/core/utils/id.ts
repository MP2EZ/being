/**
 * Cryptographic ID Generation Utilities
 *
 * Replaces Math.random()-based ID generation with cryptographically secure alternatives.
 * Uses the uuid package (v4) for standard UUIDs and expo-crypto for random bytes.
 *
 * @module core/utils/id
 */

import { v4 as uuidv4 } from 'uuid';
import * as Crypto from 'expo-crypto';

/**
 * Generate a cryptographically secure UUID v4.
 * Use this for unique identifiers that don't need timestamps.
 *
 * @returns UUID string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Generate a cryptographically secure random string.
 * Uses expo-crypto for secure random bytes.
 *
 * @param length - Length of the random string (default: 9)
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number = 9): string {
  const bytes = Crypto.getRandomBytes(Math.ceil(length * 0.75));
  // Convert to base64 and trim to desired length, replacing non-alphanumeric chars
  return Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, length);
}

/**
 * Generate a timestamped ID with cryptographic random suffix.
 * Format: `{prefix}_{timestamp}_{randomString}`
 *
 * Use this when you need:
 * - Sortable IDs (timestamp prefix)
 * - Human-readable debugging (visible timestamp)
 * - Uniqueness guarantees (crypto random suffix)
 *
 * @param prefix - Optional prefix for the ID (e.g., "consent", "session")
 * @returns Timestamped ID string
 *
 * @example
 * generateTimestampedId('consent') // "consent_1703644800000_x7k2m9p4q"
 * generateTimestampedId() // "1703644800000_x7k2m9p4q"
 */
export function generateTimestampedId(prefix?: string): string {
  const timestamp = Date.now();
  const randomPart = generateRandomString(9);

  if (prefix) {
    return `${prefix}_${timestamp}_${randomPart}`;
  }
  return `${timestamp}_${randomPart}`;
}

/**
 * Generate a short unique ID for UI components.
 * Suitable for React keys, DOM IDs, and accessibility labels.
 *
 * @param prefix - Optional prefix for the ID
 * @returns Short ID string (e.g., "radio-group-x7k2m9p4q")
 */
export function generateComponentId(prefix?: string): string {
  const randomPart = generateRandomString(9);
  if (prefix) {
    return `${prefix}-${randomPart}`;
  }
  return randomPart;
}

/**
 * Generate a session-style ID with date prefix.
 * Format: `session_{YYYY-MM-DD}_{randomString}`
 *
 * @returns Session ID with date prefix
 */
export function generateSessionId(): string {
  const today = new Date().toISOString().split('T')[0];
  const randomPart = generateRandomString(9);
  return `session_${today}_${randomPart}`;
}

/**
 * Generate an ID for internal use (stores, state management).
 * Shorter format suitable for Zustand stores and internal tracking.
 *
 * @returns Compact timestamped ID
 */
export function generateInternalId(): string {
  return `${Date.now()}_${generateRandomString(9)}`;
}
