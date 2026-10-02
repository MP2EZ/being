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
  SessionData,
  SessionMetadata,
  SESSION_STORAGE_KEYS,
  computeSessionExpiry,
} from '@/core/types/session';
// FEAT-298 slice 3b: sessions are keyed by PRACTICE IDENTITY ('daily-loop'), not by the
// persisted record type ('daily'). See the token-split note in core/types/session.ts.
import type { PracticeIdentity } from '@/core/types/practice-identity';
import { decideWellnessWrite } from '@/core/stores/consentStore';
import EncryptionService from '../security/EncryptionService';

/**
 * Session Storage Service
 * Manages encrypted session data for practice flow resumption
 */
export class SessionStorageService {
  /**
   * Flows whose session was withheld this process (FEAT-667). Every save writes the
   * whole cumulative session, so once one is withheld each later save of it carries
   * answers the user was told would not be kept. Cleared when the session ends.
   */
  private static withheldFlows = new Set<PracticeIdentity>();

  /**
   * Save session data to encrypted storage.
   *
   * FEAT-667 (FEAT-318 slice C): the daily loop's typed beat answers are Art. 9
   * wellness data. A blocked save writes NOTHING — no envelope-only session, so
   * ResumeSessionModal never offers a hollow resume — and the loop still advances,
   * because callers do not await this. `loading` skips without latching: the next
   * beat's save carries the whole session anyway.
   *
   * @param flowType - Type of flow (morning/midday/evening)
   * @param currentScreen - Screen name where user left off
   * @param flowState - Optional flow-specific state to preserve
   */
  static async saveSession(
    flowType: PracticeIdentity,
    currentScreen: string,
    flowState?: Record<string, any>
  ): Promise<void> {
    try {
      const decision = decideWellnessWrite();
      if (!decision.allowed && decision.reason !== 'loading') this.withheldFlows.add(flowType);
      if (!decision.allowed || this.withheldFlows.has(flowType)) return;

      const now = Date.now();
      const sessionData: SessionData = {
        flowType,
        startedAt: now,
        lastSavedAt: now,
        currentScreen,
        completed: false,
        expiresAt: computeSessionExpiry(flowType, now),
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
  static async loadSession(flowType: PracticeIdentity): Promise<SessionData | null> {
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
  static async clearSession(flowType: PracticeIdentity): Promise<void> {
    // Ungated erasure (FEAT-667). The session has ended, so a new one starts clean.
    this.withheldFlows.delete(flowType);
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
  static async markSessionCompleted(flowType: PracticeIdentity): Promise<void> {
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
  static async getSessionMetadata(flowType: PracticeIdentity): Promise<SessionMetadata | null> {
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
  private static getStorageKey(flowType: PracticeIdentity): string {
    switch (flowType) {
      case 'morning':
        return SESSION_STORAGE_KEYS.MORNING;
      case 'midday':
        return SESSION_STORAGE_KEYS.MIDDAY;
      case 'evening':
        return SESSION_STORAGE_KEYS.EVENING;
      case 'daily-loop':
        return SESSION_STORAGE_KEYS.DAILY_LOOP;
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
