/**
 * Crypto Utilities for React Native
 *
 * Provides cross-platform cryptographic functions using expo-crypto
 * to replace browser/Node.js crypto API calls.
 */

import * as Crypto from 'expo-crypto';

/**
 * Generate a UUID v4 string using secure random bytes
 */
export async function randomUUID(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);

  // Set version (4) and variant bits according to RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

  // Convert to hex string with hyphens
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join('-');
}

/**
 * Generate secure random bytes
 */
export async function getRandomBytes(length: number): Promise<Uint8Array> {
  return await Crypto.getRandomBytesAsync(length);
}

/**
 * Generate a random hex string of specified length
 */
export async function randomHex(length: number): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(Math.ceil(length / 2));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, length);
}

/**
 * Polyfill for crypto.randomUUID() that can be used as a drop-in replacement
 * This matches the Web Crypto API interface
 */
export const crypto = {
  randomUUID
};