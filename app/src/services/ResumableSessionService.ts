/**
 * ResumableSessionService
 * Manages interrupted session state with automatic cleanup and versioning
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { 
  ResumableSession, 
  SessionProgress, 
  SessionValidationResult,
  SESSION_CONSTANTS,
  SessionStorageKeys
} from '../types/ResumableSession';
import { dataStore } from './storage/SecureDataStore';

class ResumableSessionServiceImpl {
  private readonly storageKeys: SessionStorageKeys = {
    RESUMABLE_SESSION_PREFIX: 'being_resumable_session_',
    SESSION_INDEX: 'being_session_index',
    SESSION_VERSION: 'being_session_version',
  };

  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeCleanupSchedule();
  }

  /**
   * Save or update a resumable session
   */
  async saveSession(sessionData: Partial<ResumableSession>): Promise<void> {
    try {
      // Generate ID if not provided
      const id = sessionData.id || Crypto.randomUUID();
      
      // Calculate expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_CONSTANTS.DEFAULT_TTL_HOURS);

      const session: ResumableSession = {
        id,
        type: sessionData.type || 'checkin',
        subType: sessionData.subType || 'morning',
        startedAt: sessionData.startedAt || new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: sessionData.progress || {
          currentStep: 0,
          totalSteps: 0,
          completedSteps: [],
          percentComplete: 0,
          estimatedTimeRemaining: 0,
        },
        data: sessionData.data || {},
        metadata: {
          resumeCount: sessionData.metadata?.resumeCount || 0,
          totalDuration: sessionData.metadata?.totalDuration || 0,
          lastScreen: sessionData.metadata?.lastScreen || '',
          ...sessionData.metadata,
        },
      };

      // Validate minimum progress requirement
      if (session.progress.percentComplete < SESSION_CONSTANTS.MIN_PROGRESS_FOR_RESUME) {
        console.log('Session progress too low to save:', session.progress.percentComplete);
        return;
      }

      // Save to encrypted storage
      const key = `${this.storageKeys.RESUMABLE_SESSION_PREFIX}${session.type}_${session.subType}`;
      await dataStore.setItem(key, JSON.stringify(session));

      // Update session index
      await this.updateSessionIndex(session);

      console.log(`Saved resumable session: ${session.type}_${session.subType}`);
    } catch (error) {
      console.error('Failed to save resumable session:', error);
      throw new Error('Failed to save session');
    }
  }

  /**
   * Retrieve a resumable session
   */
  async getSession(type: string, subType: string): Promise<ResumableSession | null> {
    try {
      const key = `${this.storageKeys.RESUMABLE_SESSION_PREFIX}${type}_${subType}`;
      const sessionData = await dataStore.getItem(key);

      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as ResumableSession;

      // Validate session before returning
      const validation = this.validateSession(session);
      if (!validation.isValid) {
        console.log(`Invalid session: ${validation.message}`);
        await this.deleteSession(session.id);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to retrieve resumable session:', error);
      return null;
    }
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Find and delete session by ID
      const sessions = await this.getAllActiveSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        const key = `${this.storageKeys.RESUMABLE_SESSION_PREFIX}${session.type}_${session.subType}`;
        await dataStore.removeItem(key);
        await this.removeFromSessionIndex(sessionId);
        console.log(`Deleted session: ${sessionId}`);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }

  /**
   * Clear all expired sessions
   */
  async clearExpiredSessions(): Promise<void> {
    try {
      const sessions = await this.getAllActiveSessions();
      const now = new Date();
      let clearedCount = 0;

      for (const session of sessions) {
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt < now) {
          await this.deleteSession(session.id);
          clearedCount++;
        }
      }

      if (clearedCount > 0) {
        console.log(`Cleared ${clearedCount} expired sessions`);
      }
    } catch (error) {
      console.error('Failed to clear expired sessions:', error);
    }
  }

  /**
   * Check if there's an active session
   */
  async hasActiveSession(type: string, subType: string): Promise<boolean> {
    const session = await this.getSession(type, subType);
    return session !== null && this.canResumeSession(session);
  }

  /**
   * Get all active sessions
   */
  async getAllActiveSessions(): Promise<ResumableSession[]> {
    try {
      const indexData = await AsyncStorage.getItem(this.storageKeys.SESSION_INDEX);
      if (!indexData) {
        return [];
      }

      const index = JSON.parse(indexData) as Array<{id: string, key: string}>;
      const sessions: ResumableSession[] = [];

      for (const entry of index) {
        const sessionData = await dataStore.getItem(entry.key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as ResumableSession;
          if (this.isSessionValid(session)) {
            sessions.push(session);
          }
        }
      }

      return sessions;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      return [];
    }
  }

  /**
   * Update session progress
   */
  async updateProgress(sessionId: string, progress: Partial<SessionProgress>): Promise<void> {
    try {
      const sessions = await this.getAllActiveSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      session.progress = {
        ...session.progress,
        ...progress,
      };
      session.lastUpdatedAt = new Date().toISOString();

      await this.saveSession(session);
    } catch (error) {
      console.error('Failed to update session progress:', error);
      throw error;
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, additionalHours: number = 12): Promise<void> {
    try {
      const sessions = await this.getAllActiveSessions();
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      const expiresAt = new Date(session.expiresAt);
      expiresAt.setHours(expiresAt.getHours() + additionalHours);
      session.expiresAt = expiresAt.toISOString();

      await this.saveSession(session);
      console.log(`Extended session ${sessionId} by ${additionalHours} hours`);
    } catch (error) {
      console.error('Failed to extend session:', error);
      throw error;
    }
  }

  /**
   * Validate session data
   */
  isSessionValid(session: ResumableSession): boolean {
    const validation = this.validateSession(session);
    return validation.isValid;
  }

  /**
   * Check if session can be resumed
   */
  canResumeSession(session: ResumableSession): boolean {
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < now) {
      return false;
    }

    // Check resume count
    if (session.metadata.resumeCount >= SESSION_CONSTANTS.MAX_RESUME_COUNT) {
      return false;
    }

    // Check version compatibility
    if (session.appVersion !== SESSION_CONSTANTS.SESSION_VERSION) {
      // Could implement version migration here
      return false;
    }

    // Check minimum progress
    if (session.progress.percentComplete < SESSION_CONSTANTS.MIN_PROGRESS_FOR_RESUME) {
      return false;
    }

    return true;
  }

  /**
   * Private: Validate session
   */
  private validateSession(session: ResumableSession): SessionValidationResult {
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < now) {
      return {
        isValid: false,
        error: 'SESSION_EXPIRED',
        message: 'Session has expired',
      };
    }

    // Check version
    if (session.appVersion !== SESSION_CONSTANTS.SESSION_VERSION) {
      return {
        isValid: false,
        error: 'VERSION_MISMATCH',
        message: 'Session version incompatible',
      };
    }

    // Check resume count
    if (session.metadata.resumeCount >= SESSION_CONSTANTS.MAX_RESUME_COUNT) {
      return {
        isValid: false,
        error: 'MAX_RESUMES_EXCEEDED',
        message: 'Maximum resume attempts exceeded',
      };
    }

    // Check data integrity
    if (!session.data || Object.keys(session.data).length === 0) {
      return {
        isValid: false,
        error: 'INVALID_DATA',
        message: 'Session data is invalid or empty',
      };
    }

    return { isValid: true };
  }

  /**
   * Private: Update session index
   */
  private async updateSessionIndex(session: ResumableSession): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(this.storageKeys.SESSION_INDEX);
      let index = indexData ? JSON.parse(indexData) : [];

      // Remove existing entry for this session type
      index = index.filter((entry: any) => 
        !(entry.type === session.type && entry.subType === session.subType)
      );

      // Add new entry
      index.push({
        id: session.id,
        type: session.type,
        subType: session.subType,
        key: `${this.storageKeys.RESUMABLE_SESSION_PREFIX}${session.type}_${session.subType}`,
        expiresAt: session.expiresAt,
      });

      await AsyncStorage.setItem(this.storageKeys.SESSION_INDEX, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update session index:', error);
    }
  }

  /**
   * Private: Remove from session index
   */
  private async removeFromSessionIndex(sessionId: string): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(this.storageKeys.SESSION_INDEX);
      if (!indexData) return;

      let index = JSON.parse(indexData);
      index = index.filter((entry: any) => entry.id !== sessionId);

      await AsyncStorage.setItem(this.storageKeys.SESSION_INDEX, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to remove from session index:', error);
    }
  }

  /**
   * Private: Initialize cleanup schedule
   */
  private initializeCleanupSchedule(): void {
    // Clear any existing interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Schedule cleanup every 6 hours
    this.cleanupInterval = setInterval(
      () => this.clearExpiredSessions(),
      SESSION_CONSTANTS.CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000
    );

    // Also run cleanup on initialization
    this.clearExpiredSessions();
  }
}

// Export singleton instance
export const resumableSessionService = new ResumableSessionServiceImpl();