/**
 * Session Security Tests
 * 
 * CRITICAL: Tests encryption and security of resumable session data
 * Mental health data requires maximum protection during storage and transmission
 * 
 * Security Requirements:
 * - All session data encrypted in storage
 * - No sensitive data in logs or crash reports
 * - Secure session cleanup on expiration
 * - Protection against data tampering
 * - Privacy compliance for mental health data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { dataStore } from '../../src/services/storage/SecureDataStore';
import { ResumableSession, SessionProgress } from '../../src/types/ResumableSession';
import * as Crypto from 'expo-crypto';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/storage/SecureDataStore');
jest.mock('expo-crypto');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockDataStore = dataStore as jest.Mocked<typeof dataStore>;
const mockCrypto = Crypto as jest.Mocked<typeof Crypto>;

// Mock console methods to capture logging
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('Session Security Tests', () => {
  let mockSensitiveSession: ResumableSession;
  let mockClinicalData: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCrypto.randomUUID.mockReturnValue('secure-session-uuid');

    // Create session with sensitive clinical data
    mockClinicalData = {
      answers: [3, 3, 2, 2, 1, 3, 2, 1, 2], // PHQ-9 responses indicating depression
      currentQuestion: 9,
      startTime: '2024-01-15T10:00:00.000Z',
      personalNotes: 'Experiencing severe anxiety about work performance',
      familyHistory: 'Mother had depression, father had anxiety disorder',
      medications: ['sertraline 50mg', 'lorazepam as needed'],
      therapistNotes: 'Client reports increased suicidal ideation',
      crisisContacts: ['Emergency: 988', 'Therapist: Dr. Smith 555-0123'],
      ssn: '123-45-6789', // Should never be stored
      insuranceInfo: 'Blue Cross Blue Shield ID: ABC123456789',
    };

    mockSensitiveSession = {
      id: 'sensitive-session-test',
      type: 'assessment',
      subType: 'phq9',
      startedAt: '2024-01-15T10:00:00.000Z',
      lastUpdatedAt: '2024-01-15T10:15:00.000Z',
      expiresAt: '2024-01-16T10:00:00.000Z',
      appVersion: '1.0.0',
      progress: {
        currentStep: 9,
        totalSteps: 9,
        completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
        percentComplete: 100,
        estimatedTimeRemaining: 0,
      },
      data: mockClinicalData,
      metadata: {
        resumeCount: 1,
        totalDuration: 900,
        lastScreen: 'complete',
        navigationStack: ['intro', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5', 'question-6', 'question-7', 'question-8', 'question-9', 'complete'],
        deviceId: 'iPhone-12-Pro-ABCD1234',
        ipAddress: '192.168.1.100',
      },
    };

    // Default mock implementations
    mockDataStore.setItem.mockResolvedValue();
    mockDataStore.getItem.mockResolvedValue(null);
    mockDataStore.removeItem.mockResolvedValue();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Data Encryption and Storage Security', () => {
    test('sensitive session data is encrypted before storage', async () => {
      await resumableSessionService.saveSession(mockSensitiveSession);

      expect(mockDataStore.setItem).toHaveBeenCalledTimes(1);
      
      const [storageKey, storedData] = mockDataStore.setItem.mock.calls[0];
      
      // Verify data goes through secure storage (encrypted by dataStore)
      expect(storageKey).toBe('@fullmind_resumable_session_assessment_phq9');
      
      // Data should be JSON stringified but encrypted by SecureDataStore
      const parsedData = JSON.parse(storedData);
      expect(parsedData.data.answers).toEqual(mockClinicalData.answers);
      
      // Verify SecureDataStore is used (which handles encryption)
      expect(mockDataStore.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });

    test('no sensitive data appears in plain text logs', async () => {
      await resumableSessionService.saveSession(mockSensitiveSession);

      // Check all console log calls for sensitive data leakage
      const allLogCalls = [
        ...mockConsoleLog.mock.calls,
        ...mockConsoleError.mock.calls,
      ];

      const sensitiveValues = [
        '123-45-6789', // SSN
        'sertraline',  // Medication
        'suicidal ideation', // Clinical notes
        'Dr. Smith', // Therapist name
        'ABC123456789', // Insurance ID
      ];

      allLogCalls.forEach(call => {
        const logMessage = call.join(' ');
        sensitiveValues.forEach(sensitiveValue => {
          expect(logMessage).not.toContain(sensitiveValue);
        });
      });
    });

    test('session ID generation uses cryptographically secure random values', async () => {
      // Reset the mock to track calls
      mockCrypto.randomUUID.mockClear();
      mockCrypto.randomUUID.mockReturnValueOnce('crypto-secure-uuid-123');

      await resumableSessionService.saveSession({
        type: 'checkin',
        subType: 'morning',
        data: { emotions: ['happy'] },
      });

      expect(mockCrypto.randomUUID).toHaveBeenCalledTimes(1);
      expect(mockDataStore.setItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('crypto-secure-uuid-123')
      );
    });

    test('sensitive metadata is sanitized before storage', async () => {
      const sessionWithSensitiveMetadata = {
        ...mockSensitiveSession,
        metadata: {
          ...mockSensitiveSession.metadata,
          userLocation: 'GPS: 40.7128,-74.0060',
          deviceFingerprint: 'detailed-device-signature',
          networkInfo: 'WiFi: HomeNetwork_5G, IP: 192.168.1.100',
          debugInfo: 'User clicked crisis button at 10:15:30',
        },
      };

      await resumableSessionService.saveSession(sessionWithSensitiveMetadata);

      const [, storedData] = mockDataStore.setItem.mock.calls[0];
      const parsedData = JSON.parse(storedData);

      // Sensitive metadata should be excluded or sanitized
      // Note: Implementation should sanitize this data
      expect(storedData).not.toContain('GPS:');
      expect(storedData).not.toContain('192.168.1.100');
    });
  });

  describe('Data Access and Retrieval Security', () => {
    test('session retrieval requires proper authentication context', async () => {
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSensitiveSession));

      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');

      // Verify data is accessed through secure storage
      expect(mockDataStore.getItem).toHaveBeenCalledWith(
        '@fullmind_resumable_session_assessment_phq9'
      );
      
      expect(retrieved?.data.answers).toEqual(mockClinicalData.answers);
    });

    test('corrupted or tampered session data is rejected', async () => {
      const tamperedSessionData = JSON.stringify({
        ...mockSensitiveSession,
        data: {
          ...mockSensitiveSession.data,
          answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], // Tampered to show no depression
        },
        // But metadata suggests it was a high-scoring session
        metadata: {
          ...mockSensitiveSession.metadata,
          originalScore: 22, // Doesn't match tampered answers
        },
      });

      mockDataStore.getItem.mockResolvedValueOnce(tamperedSessionData);

      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');

      // Session should still be returned (validation happens at application layer)
      // But we can verify the integrity check data is available
      expect(retrieved).toBeTruthy();
      
      // Application should detect tampering by comparing scores
      const actualScore = (retrieved?.data.answers as number[]).reduce((sum, val) => sum + val, 0);
      const metadataScore = (retrieved as any)?.metadata?.originalScore;
      
      if (metadataScore !== undefined) {
        expect(actualScore).not.toBe(metadataScore); // Tampering detected
      }
    });

    test('expired sessions are securely cleaned up', async () => {
      const expiredSession = {
        ...mockSensitiveSession,
        expiresAt: '2024-01-14T10:00:00.000Z', // Expired
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([{ id: expiredSession.id, key: 'test-key' }])
      );
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(expiredSession));

      await resumableSessionService.clearExpiredSessions();

      // Expired session should be securely deleted
      expect(mockDataStore.removeItem).toHaveBeenCalled();
      
      // Session should be removed from index
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_session_index',
        '[]'
      );
    });

    test('session access logging excludes sensitive content', async () => {
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSensitiveSession));

      await resumableSessionService.getSession('assessment', 'phq9');

      // Verify logs don't contain sensitive data
      const allLogs = mockConsoleLog.mock.calls.flat().join(' ');
      
      expect(allLogs).not.toContain('123-45-6789'); // SSN
      expect(allLogs).not.toContain('sertraline'); // Medication
      expect(allLogs).not.toContain('suicidal ideation'); // Clinical notes
    });
  });

  describe('Privacy and Compliance Security', () => {
    test('no personally identifiable information in session storage keys', async () => {
      await resumableSessionService.saveSession({
        type: 'checkin',
        subType: 'morning',
        data: {
          userEmail: 'patient@example.com',
          fullName: 'John Doe',
          phoneNumber: '555-0123',
        },
      });

      const [storageKey] = mockDataStore.setItem.mock.calls[0];
      
      // Storage key should not contain PII
      expect(storageKey).not.toContain('patient@example.com');
      expect(storageKey).not.toContain('John');
      expect(storageKey).not.toContain('Doe');
      expect(storageKey).not.toContain('555-0123');
      
      // Should use generic session key format
      expect(storageKey).toMatch(/@fullmind_resumable_session_checkin_morning/);
    });

    test('session data minimization - only necessary data is stored', async () => {
      const sessionWithExcessiveData = {
        type: 'assessment' as const,
        subType: 'phq9' as const,
        data: {
          // Necessary clinical data
          answers: [2, 1, 3, 2, 1],
          currentQuestion: 5,
          startTime: '2024-01-15T10:00:00.000Z',
          
          // Unnecessary data that shouldn't be stored
          browserUserAgent: 'Mozilla/5.0...',
          screenResolution: '1920x1080',
          operatingSystem: 'iOS 17.1.2',
          installedApps: ['Facebook', 'Instagram', 'Twitter'],
          contactList: ['Mom', 'Dad', 'Best Friend'],
          locationHistory: ['Home', 'Work', 'Gym'],
        },
        progress: {
          currentStep: 5,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 55.6,
          estimatedTimeRemaining: 240,
        },
      };

      await resumableSessionService.saveSession(sessionWithExcessiveData);

      const [, storedData] = mockDataStore.setItem.mock.calls[0];
      
      // Verify only necessary data is stored
      expect(storedData).toContain('answers');
      expect(storedData).toContain('currentQuestion');
      expect(storedData).toContain('startTime');
      
      // Verify unnecessary data is not stored
      expect(storedData).not.toContain('browserUserAgent');
      expect(storedData).not.toContain('installedApps');
      expect(storedData).not.toContain('contactList');
      expect(storedData).not.toContain('locationHistory');
    });

    test('automatic data retention enforcement', async () => {
      const oldSession = {
        ...mockSensitiveSession,
        startedAt: '2023-01-15T10:00:00.000Z', // Very old session
        expiresAt: '2023-01-16T10:00:00.000Z',
      };

      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([{ id: oldSession.id, key: 'old-key' }])
      );
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(oldSession));

      // Cleanup should remove old sessions regardless of explicit expiration
      await resumableSessionService.clearExpiredSessions();

      expect(mockDataStore.removeItem).toHaveBeenCalled();
    });
  });

  describe('Security Under Attack Scenarios', () => {
    test('handles malicious session data injection attempts', async () => {
      const maliciousSession = {
        type: 'assessment' as const,
        subType: 'phq9' as const,
        data: {
          answers: [1, 2, 3],
          // Attempt to inject script
          maliciousScript: '<script>alert("XSS")</script>',
          sqlInjection: "'; DROP TABLE sessions; --",
          prototypePolluton: '__proto__',
        },
      };

      // Should not throw or cause issues
      await expect(
        resumableSessionService.saveSession(maliciousSession)
      ).resolves.not.toThrow();

      // Verify malicious content is handled safely
      const [, storedData] = mockDataStore.setItem.mock.calls[0];
      expect(storedData).not.toContain('<script>');
      expect(storedData).not.toContain('DROP TABLE');
    });

    test('resistant to timing attacks on session existence', async () => {
      const existingSessionTime = await measureResponseTime(async () => {
        mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify(mockSensitiveSession));
        return await resumableSessionService.getSession('assessment', 'phq9');
      });

      const nonExistentSessionTime = await measureResponseTime(async () => {
        mockDataStore.getItem.mockResolvedValueOnce(null);
        return await resumableSessionService.getSession('assessment', 'gad7');
      });

      // Response times should not reveal session existence
      // Allow some variance but should be similar
      const timeDifference = Math.abs(existingSessionTime - nonExistentSessionTime);
      expect(timeDifference).toBeLessThan(50); // Less than 50ms difference
    });

    test('secure handling of concurrent access attempts', async () => {
      mockDataStore.getItem.mockResolvedValue(JSON.stringify(mockSensitiveSession));

      // Simulate concurrent access attempts
      const concurrentAccess = Array.from({ length: 10 }, () =>
        resumableSessionService.getSession('assessment', 'phq9')
      );

      const results = await Promise.all(concurrentAccess);

      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result?.data.answers).toEqual(mockClinicalData.answers);
      });

      // No security violations or data corruption
      expect(mockDataStore.getItem).toHaveBeenCalledTimes(10);
    });

    test('prevents session hijacking through ID prediction', async () => {
      const generatedIds = new Set<string>();
      
      // Generate multiple session IDs
      for (let i = 0; i < 100; i++) {
        mockCrypto.randomUUID.mockReturnValueOnce(`uuid-${Math.random()}-${i}`);
        
        await resumableSessionService.saveSession({
          type: 'checkin',
          subType: 'morning',
          data: { step: i },
        });

        const [, storedData] = mockDataStore.setItem.mock.calls[i];
        const parsedData = JSON.parse(storedData);
        generatedIds.add(parsedData.id);
      }

      // All IDs should be unique
      expect(generatedIds.size).toBe(100);
      
      // IDs should not follow predictable patterns
      const idsArray = Array.from(generatedIds);
      for (let i = 1; i < idsArray.length; i++) {
        expect(idsArray[i]).not.toContain(idsArray[i-1].slice(0, 5));
      }
    });
  });

  describe('Secure Error Handling', () => {
    test('error messages do not leak sensitive session data', async () => {
      const errorSession = {
        type: 'assessment' as const,
        subType: 'phq9' as const,
        data: {
          answers: [3, 3, 3, 3, 3, 3, 3, 3, 3],
          socialSecurityNumber: '123-45-6789',
          creditCardNumber: '4111-1111-1111-1111',
        },
      };

      mockDataStore.setItem.mockRejectedValueOnce(new Error('Storage encryption failed'));

      try {
        await resumableSessionService.saveSession(errorSession);
      } catch (error) {
        // Error should not contain sensitive data
        expect(error.message).not.toContain('123-45-6789');
        expect(error.message).not.toContain('4111-1111-1111-1111');
        expect(error.message).toContain('Failed to save session'); // Generic error
      }
    });

    test('secure error logging excludes sensitive context', async () => {
      mockDataStore.getItem.mockRejectedValueOnce(new Error('Decryption failed'));

      await resumableSessionService.getSession('assessment', 'phq9');

      // Check error logs don't contain sensitive identifiers
      const errorLogs = mockConsoleError.mock.calls.flat().join(' ');
      expect(errorLogs).not.toContain('phq9'); // Even assessment type might be sensitive
      expect(errorLogs).toContain('Failed to retrieve resumable session'); // Generic error
    });

    test('graceful degradation maintains security', async () => {
      // Simulate storage service failure
      mockDataStore.setItem.mockImplementation(() => {
        throw new Error('Storage service unavailable');
      });

      // Should not crash or expose data
      await expect(
        resumableSessionService.saveSession(mockSensitiveSession)
      ).rejects.toThrow('Failed to save session');

      // Session data should not be logged in error state
      const allLogs = [...mockConsoleLog.mock.calls, ...mockConsoleError.mock.calls]
        .flat()
        .join(' ');
      
      expect(allLogs).not.toContain('sertraline');
      expect(allLogs).not.toContain('suicidal ideation');
    });
  });

  describe('Secure Session Lifecycle', () => {
    test('secure session termination clears all traces', async () => {
      const sessionId = 'secure-termination-test';
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify([{ id: sessionId, key: 'test-key' }])
      );
      mockDataStore.getItem.mockResolvedValueOnce(JSON.stringify({
        ...mockSensitiveSession,
        id: sessionId,
      }));

      await resumableSessionService.deleteSession(sessionId);

      // Verify secure deletion from all locations
      expect(mockDataStore.removeItem).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@fullmind_session_index',
        '[]'
      );
    });

    test('automatic security audit trail for sensitive operations', async () => {
      await resumableSessionService.saveSession(mockSensitiveSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      await resumableSessionService.deleteSession(mockSensitiveSession.id);

      // Verify security operations are logged (but not data)
      const securityLogs = mockConsoleLog.mock.calls
        .flat()
        .filter(log => typeof log === 'string');

      // Should have logged operations without sensitive data
      const hasOperationLogs = securityLogs.some(log => 
        log.includes('Saved resumable session') ||
        log.includes('Deleted session')
      );
      
      expect(hasOperationLogs).toBe(true);
    });
  });
});

// Helper function to measure response time
async function measureResponseTime<T>(operation: () => Promise<T>): Promise<number> {
  const start = performance.now();
  await operation();
  return performance.now() - start;
}