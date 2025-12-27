/**
 * SESSION STORAGE SERVICE
 * FEAT-23: Session resumption for interrupted Stoic practice flows
 *
 * Handles saving/loading/clearing session data with encryption and 24-hour TTL.
 *
 * FEATURES:
 * - AES-256-GCM encrypted storage for Privacy compliance
 * - Automatic 24-hour expiration to prevent guilt accumulation
 * - Type-safe session data handling
 * - Simple API for session management
 *
 * PHILOSOPHER-VALIDATED:
 * - Sessions expire automatically (no "incomplete" tracking)
 * - Focus on supporting practice continuity, not completion metrics
 * - Both resume and fresh start are equally valid choices
 */

import * as SecureStore from 'expo-secure-store';
import {
  FlowType,
  SessionData,
  SessionMetadata,
  SESSION_STORAGE_KEYS,
  SESSION_TTL_MS,
} from '@/core/types/session';
import EncryptionService from '../security/EncryptionService';

/**
 * Session Storage Service
 * Manages encrypted session data for practice flow resumption
 */
export class SessionStorageService {
  /**
   * Save session data to encrypted storage
   * @param flowType - Type of flow (morning/midday/evening)
   * @param currentScreen - Screen name where user left off
   * @param flowState - Optional flow-specific state to preserve
   */
  static async saveSession(
    flowType: FlowType,
    currentScreen: string,
    flowState?: Record<string, any>
  ): Promise<void> {
    try {
      const now = Date.now();
      const sessionData: SessionData = {
        flowType,
        startedAt: now,
        lastSavedAt: now,
        currentScreen,
        completed: false,
        expiresAt: now + SESSION_TTL_MS,
        flowState,
      };

      const key = this.getStorageKey(flowType);

      // Encrypt session data using AES-256-GCM
      const encryptedPackage = await EncryptionService.encryptData(
        sessionData,
        'level_3_intervention_metadata',
        `session_${flowType}`
      );

      // Store encrypted package as JSON
      const encryptedJson = JSON.stringify(encryptedPackage);
      await SecureStore.setItemAsync(key, encryptedJson);

      console.log(`[SessionStorage] Session saved for ${flowType} at ${currentScreen}`);
    } catch (error) {
      console.error(`[SessionStorage] Failed to save session:`, error);
      // Don't throw - session resumption is a nice-to-have, not critical
    }
  }

  /**
   * Load session data from encrypted storage
   * Returns null if no session exists, session is expired, or session is completed
   *
   * @param flowType - Type of flow to load session for
   * @returns Session data if valid and resumable, null otherwise
   */
  static async loadSession(flowType: FlowType): Promise<SessionData | null> {
    try {
      const key = this.getStorageKey(flowType);
      const encryptedJson = await SecureStore.getItemAsync(key);

      if (!encryptedJson) {
        return null; // No session saved
      }

      // Parse encrypted package
      const encryptedPackage = JSON.parse(encryptedJson);

      // Decrypt session data using AES-256-GCM
      const sessionData: SessionData = await EncryptionService.decryptData(
        encryptedPackage,
        `session_${flowType}`
      );

      // Check if session is expired (24 hour TTL)
      const now = Date.now();
      if (now > sessionData.expiresAt) {
        console.log(`[SessionStorage] Session expired for ${flowType}`);
        await this.clearSession(flowType); // Clean up expired session
        return null;
      }

      // Check if session was already completed
      if (sessionData.completed) {
        console.log(`[SessionStorage] Session already completed for ${flowType}`);
        await this.clearSession(flowType); // Clean up completed session
        return null;
      }

      console.log(`[SessionStorage] Session loaded for ${flowType} at ${sessionData.currentScreen}`);
      return sessionData;
    } catch (error) {
      console.error(`[SessionStorage] Failed to load session:`, error);

      // Clear corrupted/incompatible session data
      // This handles migration from old encryption formats
      await this.clearSession(flowType);
      console.log(`[SessionStorage] Cleared incompatible session for ${flowType}`);

      return null; // Fail gracefully
    }
  }

  /**
   * Clear session data from storage
   * Call this when user completes session or chooses "Begin Fresh"
   *
   * @param flowType - Type of flow to clear session for
   */
  static async clearSession(flowType: FlowType): Promise<void> {
    try {
      const key = this.getStorageKey(flowType);
      await SecureStore.deleteItemAsync(key);
      console.log(`[SessionStorage] Session cleared for ${flowType}`);
    } catch (error) {
      console.error(`[SessionStorage] Failed to clear session:`, error);
      // Don't throw - best effort cleanup
    }
  }

  /**
   * Mark session as completed
   * Prevents session from being resumable in the future
   *
   * @param flowType - Type of flow to mark as completed
   */
  static async markSessionCompleted(flowType: FlowType): Promise<void> {
    try {
      const sessionData = await this.loadSession(flowType);
      if (sessionData) {
        sessionData.completed = true;
        sessionData.lastSavedAt = Date.now();

        const key = this.getStorageKey(flowType);

        // Encrypt updated session data using AES-256-GCM
        const encryptedPackage = await EncryptionService.encryptData(
          sessionData,
          'level_3_intervention_metadata',
          `session_${flowType}`
        );

        // Store encrypted package as JSON
        const encryptedJson = JSON.stringify(encryptedPackage);
        await SecureStore.setItemAsync(key, encryptedJson);

        console.log(`[SessionStorage] Session marked completed for ${flowType}`);
      }
    } catch (error) {
      console.error(`[SessionStorage] Failed to mark session completed:`, error);
    }
  }

  /**
   * Get metadata only (for checking if resumable without loading full state)
   * Useful for showing resume modal without loading all flow state
   *
   * @param flowType - Type of flow to get metadata for
   * @returns Session metadata if exists and valid, null otherwise
   */
  static async getSessionMetadata(flowType: FlowType): Promise<SessionMetadata | null> {
    const sessionData = await this.loadSession(flowType);
    if (!sessionData) {
      return null;
    }

    // Return only metadata (exclude flowState)
    const { flowState, ...metadata } = sessionData;
    return metadata;
  }

  /**
   * Get storage key for flow type
   * @param flowType - Type of flow
   * @returns Storage key for SecureStore
   */
  private static getStorageKey(flowType: FlowType): string {
    switch (flowType) {
      case 'morning':
        return SESSION_STORAGE_KEYS.MORNING;
      case 'midday':
        return SESSION_STORAGE_KEYS.MIDDAY;
      case 'evening':
        return SESSION_STORAGE_KEYS.EVENING;
    }
  }

  /**
   * Clear all sessions (for testing or user logout)
   */
  static async clearAllSessions(): Promise<void> {
    await Promise.all([
      this.clearSession('morning'),
      this.clearSession('midday'),
      this.clearSession('evening'),
    ]);
    console.log(`[SessionStorage] All sessions cleared`);
  }
}

export default SessionStorageService;
