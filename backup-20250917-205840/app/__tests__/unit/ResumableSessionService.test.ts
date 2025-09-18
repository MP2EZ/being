/**
 * ResumableSessionService Unit Tests
 * 
 * CRITICAL TESTING: Session management for mental health app
 * Tests must ensure 100% reliability for clinical data preservation
 * 
 * Focus Areas:
 * - Session TTL and expiration handling
 * - Clinical data integrity during save/resume cycles
 * - Error handling under failure conditions
 * - Maximum resume attempts enforcement
 * - Version compatibility checks
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { dataStore } from '../../src/services/storage/SecureDataStore';
import { 
  ResumableSession, 
  SessionProgress, 
  SESSION_CONSTANTS 
} from '../../src/types/ResumableSession';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/storage/SecureDataStore');
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-12345'),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockDataStore = dataStore as jest.Mocked<typeof dataStore>;

describe('ResumableSessionService Unit Tests', () => {
  let mockSession: ResumableSession;
  let mockProgress: SessionProgress;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset timers for TTL testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));

    mockProgress = {
      currentStep: 3,
      totalSteps: 8,
      completedSteps: ['bodyAreas', 'emotions', 'thoughts'],
      percentComplete: 37.5,
      estimatedTimeRemaining: 300,
    };

    mockSession = {
      id: 'test-session-123',
      type: 'checkin',
      subType: 'morning',
      startedAt: '2024-01-15T09:30:00.000Z',
      lastUpdatedAt: '2024-01-15T09:45:00.000Z',
      expiresAt: '2024-01-16T09:30:00.000Z', // 24 hours later
      appVersion: '1.0.0',
      progress: mockProgress,
      data: {
        bodyAreas: ['shoulders', 'neck'],
        emotions: ['calm', 'focused'],
        thoughts: ['positive', 'grateful'],
        sleepQuality: 4,
      },
      metadata: {
        resumeCount: 0,
        totalDuration: 900,
        lastScreen: 'sleep-quality',
        navigationStack: ['start', 'body-scan', 'emotions', 'thoughts', 'sleep-quality'],
        interruptionReason: 'app_background',
      },
    };

    // Mock storage responses
    mockDataStore.setItem.mockResolvedValue();
    mockDataStore.getItem.mockResolvedValue(null);
    mockDataStore.removeItem.mockResolvedValue();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session Creation and Storage', () => {
    test('saveSession creates valid session with proper TTL', async () => {
      const sessionData = {
        type: 'checkin' as const,
        subType: 'morning' as const,
        progress: mockProgress,
        data: mockSession.data,
      };

      await resumableSessionService.saveSession(sessionData);

      expect(mockDataStore.setItem).toHaveBeenCalledTimes(1);
      const [key, storedData] = mockDataStore.setItem.mock.calls[0];
      
      expect(key).toBe('@fullmind_resumable_session_checkin_morning');
      
      const savedSession = JSON.parse(storedData);
      expect(savedSession).toMatchObject({
        id: 'mock-uuid-12345',
        type: 'checkin',
        subType: 'morning',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: mockProgress,
        data: mockSession.data,
      });

      // Verify TTL is set to 24 hours
      const expiresAt = new Date(savedSession.expiresAt);
      const expectedExpiration = new Date('2024-01-16T10:00:00.000Z'); // 24h from system time
      expect(expiresAt.getTime()).toBe(expectedExpiration.getTime());
    });

    test('saveSession updates session index', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('[]');
      
      await resumableSessionService.saveSession({
        type: 'checkin',
        subType: 'evening',
        progress: mockProgress,
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_session_index',
        expect.stringContaining('"type":"checkin"')
      );
    });

    test('saveSession rejects sessions below minimum progress threshold', async () => {
      const lowProgressSession = {
        type: 'checkin' as const,
        subType: 'morning' as const,
        progress: {
          ...mockProgress,
          percentComplete: 5, // Below 10% threshold
        },
        data: {},
      };

      await resumableSessionService.saveSession(lowProgressSession);

      // Should not save to storage due to low progress
      expect(mockDataStore.setItem).not.toHaveBeenCalled();
    });

    test('saveSession handles storage errors gracefully', async () => {
      mockDataStore.setItem.mockRejectedValueOnce(new Error('Storage full'));

      await expect(
        resumableSessionService.saveSession({ type: 'checkin', subType: 'morning' })
      ).rejects.toThrow('Failed to save session');
    });
  });

  describe('Session Retrieval and Validation', () => {
    test('getSession retrieves and validates active session', async () => {
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSession));

      const result = await resumableSessionService.getSession('checkin', 'morning');

      expect(result).toEqual(mockSession);
      expect(mockDataStore.getItem).toHaveBeenCalledWith(
        '@fullmind_resumable_session_checkin_morning'
      );
    });

    test('getSession returns null for non-existent session', async () => {
      mockDataStore.getItem.mockResolvedValueOnce(null);

      const result = await resumableSessionService.getSession('checkin', 'morning');

      expect(result).toBeNull();
    });

    test('getSession validates and removes expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: '2024-01-14T09:30:00.000Z', // Expired yesterday
      };
      
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(expiredSession));
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([{ id: expiredSession.id, key: 'test-key' }])
      );

      const result = await resumableSessionService.getSession('checkin', 'morning');

      expect(result).toBeNull();
      // Should have deleted the expired session
      expect(mockDataStore.removeItem).toHaveBeenCalled();
    });

    test('getSession validates version compatibility', async () => {
      const incompatibleSession = {
        ...mockSession,
        appVersion: '0.9.0', // Different version
      };
      
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(incompatibleSession));

      const result = await resumableSessionService.getSession('checkin', 'morning');

      expect(result).toBeNull();
    });

    test('getSession handles corrupted session data', async () => {
      mockDataStore.getItem.mockResolvedValueOnce('invalid-json');

      const result = await resumableSessionService.getSession('checkin', 'morning');

      expect(result).toBeNull();
    });
  });

  describe('Session Resume Validation', () => {
    test('canResumeSession allows valid session', () => {
      const canResume = resumableSessionService.canResumeSession(mockSession);
      expect(canResume).toBe(true);
    });

    test('canResumeSession rejects expired session', () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: '2024-01-14T09:30:00.000Z',
      };

      const canResume = resumableSessionService.canResumeSession(expiredSession);
      expect(canResume).toBe(false);
    });

    test('canResumeSession enforces maximum resume count', () => {
      const maxResumedSession = {
        ...mockSession,
        metadata: {
          ...mockSession.metadata,
          resumeCount: SESSION_CONSTANTS.MAX_RESUME_COUNT, // At limit
        },
      };

      const canResume = resumableSessionService.canResumeSession(maxResumedSession);
      expect(canResume).toBe(false);
    });

    test('canResumeSession rejects incompatible version', () => {
      const oldVersionSession = {
        ...mockSession,
        appVersion: '0.9.0',
      };

      const canResume = resumableSessionService.canResumeSession(oldVersionSession);
      expect(canResume).toBe(false);
    });

    test('canResumeSession enforces minimum progress', () => {
      const lowProgressSession = {
        ...mockSession,
        progress: {
          ...mockSession.progress,
          percentComplete: 5,
        },
      };

      const canResume = resumableSessionService.canResumeSession(lowProgressSession);
      expect(canResume).toBe(false);
    });
  });

  describe('Session Progress Updates', () => {
    test('updateProgress modifies session progress accurately', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([{ id: mockSession.id, key: 'test-key' }])
      );
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSession));

      const progressUpdate = {
        currentStep: 5,
        completedSteps: ['bodyAreas', 'emotions', 'thoughts', 'sleepQuality', 'energyLevel'],
        percentComplete: 62.5,
        estimatedTimeRemaining: 180,
      };

      await resumableSessionService.updateProgress(mockSession.id, progressUpdate);

      expect(mockDataStore.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"percentComplete":62.5')
      );
    });

    test('updateProgress throws error for non-existent session', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('[]');

      await expect(
        resumableSessionService.updateProgress('non-existent-id', { currentStep: 1 })
      ).rejects.toThrow('Session not found');
    });
  });

  describe('Session Cleanup and Maintenance', () => {
    test('clearExpiredSessions removes only expired sessions', async () => {
      const validSession = { ...mockSession, id: 'valid-1' };
      const expiredSession = {
        ...mockSession,
        id: 'expired-1',
        expiresAt: '2024-01-14T09:30:00.000Z',
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([
          { id: 'valid-1', key: 'key-1' },
          { id: 'expired-1', key: 'key-2' },
        ])
      );

      mockDataStore.getItem
        .mockResolvedValueOnce(JSON.stringify(validSession))
        .mockResolvedValueOnce(JSON.stringify(expiredSession));

      await resumableSessionService.clearExpiredSessions();

      // Should only delete the expired session
      expect(mockDataStore.removeItem).toHaveBeenCalledTimes(1);
    });

    test('deleteSession removes session and updates index', async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify([{ id: mockSession.id, key: 'test-key' }]))
        .mockResolvedValueOnce(JSON.stringify([{ id: mockSession.id }]));
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSession));

      await resumableSessionService.deleteSession(mockSession.id);

      expect(mockDataStore.removeItem).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_session_index',
        '[]' // Empty after removal
      );
    });

    test('extendSession adds hours to expiration', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([{ id: mockSession.id, key: 'test-key' }])
      );
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSession));

      await resumableSessionService.extendSession(mockSession.id, 12);

      const expectedNewExpiration = new Date('2024-01-16T21:30:00.000Z'); // +12 hours
      expect(mockDataStore.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(expectedNewExpiration.toISOString())
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles concurrent session operations safely', async () => {
      mockDataStore.getItem.mockResolvedValue(JSON.stringify(mockSession));

      // Simulate concurrent updates
      const operations = [
        resumableSessionService.updateProgress(mockSession.id, { currentStep: 1 }),
        resumableSessionService.updateProgress(mockSession.id, { currentStep: 2 }),
        resumableSessionService.updateProgress(mockSession.id, { currentStep: 3 }),
      ];

      await Promise.all(operations);

      // All operations should complete without error
      expect(mockDataStore.setItem).toHaveBeenCalledTimes(3);
    });

    test('handles storage corruption gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json-data');

      const sessions = await resumableSessionService.getAllActiveSessions();
      expect(sessions).toEqual([]);
    });

    test('hasActiveSession returns accurate status', async () => {
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSession));

      const hasActive = await resumableSessionService.hasActiveSession('checkin', 'morning');
      expect(hasActive).toBe(true);

      // Test with expired session
      const expiredSession = { ...mockSession, expiresAt: '2024-01-14T09:30:00.000Z' };
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(expiredSession));

      const hasExpired = await resumableSessionService.hasActiveSession('checkin', 'morning');
      expect(hasExpired).toBe(false);
    });

    test('validates session data integrity', () => {
      const validSession = mockSession;
      expect(resumableSessionService.isSessionValid(validSession)).toBe(true);

      // Test with missing data
      const invalidSession = { ...mockSession, data: {} };
      expect(resumableSessionService.isSessionValid(invalidSession)).toBe(false);
    });
  });

  describe('Clinical Data Integrity', () => {
    test('preserves PHQ-9 partial responses accurately', async () => {
      const phq9Session = {
        type: 'assessment' as const,
        subType: 'phq9' as const,
        progress: {
          currentStep: 5,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 55.6,
          estimatedTimeRemaining: 240,
        },
        data: {
          answers: [2, 1, 3, 2, 1], // Partial PHQ-9 responses
          currentQuestion: 5,
          startTime: '2024-01-15T09:30:00.000Z',
        },
      };

      await resumableSessionService.saveSession(phq9Session);

      const savedData = mockDataStore.setItem.mock.calls[0][1];
      const savedSession = JSON.parse(savedData);

      expect(savedSession.data.answers).toEqual([2, 1, 3, 2, 1]);
      expect(savedSession.data.currentQuestion).toBe(5);
    });

    test('preserves GAD-7 partial responses accurately', async () => {
      const gad7Session = {
        type: 'assessment' as const,
        subType: 'gad7' as const,
        progress: {
          currentStep: 3,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3'],
          percentComplete: 42.9,
          estimatedTimeRemaining: 240,
        },
        data: {
          answers: [3, 2, 1], // Partial GAD-7 responses
          currentQuestion: 3,
          startTime: '2024-01-15T09:30:00.000Z',
        },
      };

      await resumableSessionService.saveSession(gad7Session);

      const savedData = mockDataStore.setItem.mock.calls[0][1];
      const savedSession = JSON.parse(savedData);

      expect(savedSession.data.answers).toEqual([3, 2, 1]);
      expect(savedSession.progress.percentComplete).toBeCloseTo(42.9, 1);
    });

    test('maintains clinical data format during resume cycles', async () => {
      const clinicalSession = {
        ...mockSession,
        type: 'assessment' as const,
        subType: 'phq9' as const,
        data: {
          answers: [2, 1, 3, 2, 0, 1, 2],
          currentQuestion: 7,
          timeSpent: 420,
          interruptedAt: '2024-01-15T09:45:00.000Z',
        },
      };

      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(clinicalSession));

      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      expect(retrieved?.data.answers).toEqual([2, 1, 3, 2, 0, 1, 2]);
      expect(retrieved?.data.currentQuestion).toBe(7);
      expect(retrieved?.data.timeSpent).toBe(420);
    });
  });

  describe('Performance and Resource Management', () => {
    test('session operations complete within performance thresholds', async () => {
      const startTime = Date.now();
      
      await resumableSessionService.saveSession({
        type: 'checkin',
        subType: 'morning',
        progress: mockProgress,
        data: mockSession.data,
      });

      const saveTime = Date.now() - startTime;
      expect(saveTime).toBeLessThan(100); // Should complete within 100ms

      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSession));
      
      const retrieveStartTime = Date.now();
      await resumableSessionService.getSession('checkin', 'morning');
      const retrieveTime = Date.now() - retrieveStartTime;
      
      expect(retrieveTime).toBeLessThan(50); // Retrieval should be faster
    });

    test('cleanup operations handle large session counts efficiently', async () => {
      // Create 100 mock sessions (mix of expired and valid)
      const sessions = Array.from({ length: 100 }, (_, i) => ({
        id: `session-${i}`,
        key: `key-${i}`,
      }));

      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(sessions));
      
      // Mock 50 expired, 50 valid sessions
      sessions.forEach((_, index) => {
        const isExpired = index < 50;
        const session = {
          ...mockSession,
          id: `session-${index}`,
          expiresAt: isExpired ? '2024-01-14T09:30:00.000Z' : '2024-01-16T09:30:00.000Z',
        };
        mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(session));
      });

      const startTime = Date.now();
      await resumableSessionService.clearExpiredSessions();
      const cleanupTime = Date.now() - startTime;

      expect(cleanupTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockDataStore.removeItem).toHaveBeenCalledTimes(50); // Only expired sessions
    });
  });
});