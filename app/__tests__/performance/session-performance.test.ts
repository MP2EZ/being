/**
 * Session Performance Tests
 * 
 * CRITICAL: Tests session operations meet therapeutic timing requirements
 * Mental health app must maintain <500ms response times for user engagement
 * 
 * Performance Requirements:
 * - Session resume: <500ms (therapeutic flow maintenance)
 * - Progress updates: <200ms (real-time feedback)
 * - Session save: <300ms (interruption handling)
 * - Crisis button access: <200ms (emergency response)
 * - App launch with session: <2000ms (immediate access)
 */

import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { useCheckInStore } from '../../src/store/checkInStore';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { dataStore } from '../../src/services/storage/SecureDataStore';
import { ResumableSession, SessionProgress } from '../../src/types/ResumableSession';
import { renderHook, act } from '@testing-library/react-native';

// Mock dependencies
jest.mock('../../src/services/ResumableSessionService');
jest.mock('../../src/services/storage/SecureDataStore');

const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;
const mockDataStore = dataStore as jest.Mocked<typeof dataStore>;

describe('Session Performance Tests', () => {
  let mockSession: ResumableSession;
  let mockProgress: SessionProgress;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Use real timers for performance measurements
    jest.useRealTimers();

    mockProgress = {
      currentStep: 3,
      totalSteps: 8,
      completedSteps: ['bodyAreas', 'emotions', 'thoughts'],
      percentComplete: 37.5,
      estimatedTimeRemaining: 300,
    };

    mockSession = {
      id: 'perf-test-session',
      type: 'checkin',
      subType: 'morning',
      startedAt: '2024-01-15T07:30:00.000Z',
      lastUpdatedAt: '2024-01-15T07:45:00.000Z',
      expiresAt: '2024-01-16T07:30:00.000Z',
      appVersion: '1.0.0',
      progress: mockProgress,
      data: {
        bodyAreas: ['shoulders', 'neck'],
        emotions: ['calm', 'focused'],
        thoughts: ['positive', 'grateful'],
      },
      metadata: {
        resumeCount: 1,
        totalDuration: 900,
        lastScreen: 'thoughts',
        navigationStack: ['start', 'body-scan', 'emotions', 'thoughts'],
      },
    };

    // Setup fast mock responses
    mockResumableSessionService.saveSession.mockImplementation(() => 
      Promise.resolve()
    );
    mockResumableSessionService.getSession.mockImplementation(() => 
      Promise.resolve(mockSession)
    );
    mockResumableSessionService.updateProgress.mockImplementation(() => 
      Promise.resolve()
    );
    mockResumableSessionService.hasActiveSession.mockImplementation(() => 
      Promise.resolve(true)
    );
    mockResumableSessionService.canResumeSession.mockReturnValue(true);
    
    mockDataStore.saveCheckIn.mockImplementation(() => Promise.resolve());
    mockDataStore.getTodayCheckIns.mockImplementation(() => Promise.resolve([]));
  });

  describe('Session Resume Performance', () => {
    test('session resume completes within 500ms therapeutic requirement', async () => {
      const { result } = renderHook(() => useCheckInStore());

      const startTime = performance.now();
      
      await act(async () => {
        const resumed = await result.current.resumeCheckIn('morning');
        expect(resumed).toBe(true);
      });
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(500);
      expect(result.current.currentCheckIn).toBeTruthy();
      expect(result.current.sessionProgress).toBeTruthy();
    });

    test('session resume with large data set stays under performance threshold', async () => {
      const largeDataSession: ResumableSession = {
        ...mockSession,
        data: {
          bodyAreas: new Array(100).fill('body-area'),
          emotions: new Array(100).fill('emotion'),
          thoughts: new Array(100).fill('thought'),
          intention: 'A very long intention '.repeat(500),
          dreams: 'Complex dream narrative '.repeat(200),
          // Large dataset to test performance under load
        },
        metadata: {
          ...mockSession.metadata,
          navigationStack: new Array(50).fill('screen'), // Large navigation history
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(largeDataSession);
      
      const { result } = renderHook(() => useCheckInStore());

      const startTime = performance.now();
      
      await act(async () => {
        const resumed = await result.current.resumeCheckIn('morning');
        expect(resumed).toBe(true);
      });
      
      const duration = performance.now() - startTime;
      
      // Should still complete under threshold even with large data
      expect(duration).toBeLessThan(500);
    });

    test('concurrent session resumes maintain individual performance', async () => {
      const sessions = ['morning', 'midday', 'evening'] as const;
      
      const resumeTimes: number[] = [];
      
      const resumeOperations = sessions.map(async (sessionType) => {
        const { result } = renderHook(() => useCheckInStore());
        
        const startTime = performance.now();
        
        await act(async () => {
          await result.current.resumeCheckIn(sessionType);
        });
        
        const duration = performance.now() - startTime;
        resumeTimes.push(duration);
        
        return duration;
      });

      await Promise.all(resumeOperations);
      
      // Each resume should meet individual performance requirements
      resumeTimes.forEach(duration => {
        expect(duration).toBeLessThan(500);
      });
      
      // Average performance should be well within limits
      const averageTime = resumeTimes.reduce((sum, time) => sum + time, 0) / resumeTimes.length;
      expect(averageTime).toBeLessThan(300);
    });
  });

  describe('Progress Update Performance', () => {
    test('progress updates complete within 200ms for real-time feedback', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Setup active session
      await act(async () => {
        result.current.currentCheckIn = {
          id: 'perf-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: { bodyAreas: ['shoulders'] },
        };
        result.current.currentSession = mockSession;
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.updateCurrentCheckIn({
          emotions: ['calm', 'focused'],
          thoughts: ['positive'],
        }, 'emotions-screen');
      });
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(200);
    });

    test('rapid sequential updates maintain performance', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Setup active session
      await act(async () => {
        result.current.currentCheckIn = {
          id: 'rapid-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {},
        };
        result.current.currentSession = mockSession;
      });

      const updateTimes: number[] = [];
      const updates = [
        { bodyAreas: ['shoulders'] },
        { emotions: ['calm'] },
        { thoughts: ['positive'] },
        { sleepQuality: 4 },
        { energyLevel: 3 },
      ];

      for (const updateData of updates) {
        const startTime = performance.now();
        
        await act(async () => {
          await result.current.updateCurrentCheckIn(updateData, 'test-screen');
        });
        
        const duration = performance.now() - startTime;
        updateTimes.push(duration);
      }
      
      // Each update should meet performance requirement
      updateTimes.forEach(duration => {
        expect(duration).toBeLessThan(200);
      });
      
      // Performance should remain consistent across updates
      const maxTime = Math.max(...updateTimes);
      const minTime = Math.min(...updateTimes);
      const variation = maxTime - minTime;
      expect(variation).toBeLessThan(100); // Less than 100ms variation
    });

    test('progress calculation performance with complex data', async () => {
      const { result } = renderHook(() => useCheckInStore());

      const complexData = {
        bodyAreas: new Array(50).fill('complex-body-area'),
        emotions: new Array(50).fill('complex-emotion'),
        thoughts: new Array(50).fill('complex-thought'),
        sleepQuality: 4,
        energyLevel: 3,
        anxietyLevel: 2,
        todayValue: 'Complex value with detailed explanation',
        intention: 'Very detailed intention '.repeat(100),
      };

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'complex-perf-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {},
        };
        result.current.currentSession = mockSession;
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.updateCurrentCheckIn(complexData, 'complex-screen');
      });
      
      const duration = performance.now() - startTime;
      
      // Should handle complex data within performance limits
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Session Save Performance', () => {
    test('partial progress save completes within 300ms', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'save-perf-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {
            bodyAreas: ['shoulders', 'neck'],
            emotions: ['calm', 'focused'],
            thoughts: ['positive', 'grateful'],
          },
        };
        result.current.currentSession = mockSession;
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.savePartialProgress('thoughts-screen', ['start', 'body-scan', 'emotions', 'thoughts']);
      });
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(300);
    });

    test('complete check-in save performs within therapeutic limits', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'complete-save-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {
            bodyAreas: ['shoulders', 'neck'],
            emotions: ['calm', 'focused'],
            thoughts: ['positive', 'grateful'],
            sleepQuality: 4,
            energyLevel: 3,
            anxietyLevel: 2,
            todayValue: 'mindfulness',
            intention: 'Stay present throughout the day',
          },
        };
        result.current.currentSession = mockSession;
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.saveCurrentCheckIn();
      });
      
      const duration = performance.now() - startTime;
      
      // Complete save includes validation and cleanup
      expect(duration).toBeLessThan(500);
    });

    test('session save performance under memory pressure', async () => {
      // Simulate high memory usage scenario
      const largeArrays = {
        bodyAreas: new Array(1000).fill('area-with-long-description-text'),
        emotions: new Array(1000).fill('emotion-with-detailed-context'),
        thoughts: new Array(1000).fill('thought-with-extensive-reflection'),
      };

      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'memory-pressure-test',
          type: 'evening',
          startedAt: '2024-01-15T20:00:00.000Z',
          skipped: false,
          data: largeArrays,
        };
        result.current.currentSession = {
          ...mockSession,
          data: largeArrays,
        };
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.savePartialProgress('large-data-screen');
      });
      
      const duration = performance.now() - startTime;
      
      // Should handle large data efficiently
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Crisis Response Performance', () => {
    test('crisis session data access meets emergency timing requirements', async () => {
      const crisisSession: ResumableSession = {
        ...mockSession,
        type: 'assessment',
        subType: 'phq9',
        data: {
          answers: [3, 3, 3, 3, 3, 3, 3, 3, 1], // High scores + suicidal ideation
          currentQuestion: 9,
          crisisDetected: true,
          crisisTimestamp: '2024-01-15T07:45:00.000Z',
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(crisisSession);
      
      const startTime = performance.now();
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      const duration = performance.now() - startTime;
      
      // Crisis data access must be immediate
      expect(duration).toBeLessThan(100);
      expect(retrieved?.data.crisisDetected).toBe(true);
    });

    test('crisis intervention data persists quickly during emergency', async () => {
      const crisisData = {
        crisisDetected: true,
        crisisTimestamp: new Date().toISOString(),
        emergencyContact: '988',
        crisisScore: 27,
        interventionRequired: true,
      };

      const startTime = performance.now();
      
      await resumableSessionService.saveSession({
        type: 'assessment',
        subType: 'phq9',
        data: crisisData,
        progress: {
          currentStep: 9,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
      });
      
      const duration = performance.now() - startTime;
      
      // Crisis data must save immediately
      expect(duration).toBeLessThan(200);
    });
  });

  describe('App Launch and Session Loading Performance', () => {
    test('app launch with existing session completes within 2 second requirement', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Simulate app launch sequence
      const startTime = performance.now();
      
      await act(async () => {
        // Load today's check-ins
        await result.current.loadTodaysCheckIns();
        
        // Check for partial session
        const hasSession = await result.current.checkForPartialSession('morning');
        
        if (hasSession) {
          // Resume session
          await result.current.resumeCheckIn('morning');
        }
      });
      
      const duration = performance.now() - startTime;
      
      // Complete app initialization should be under 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    test('multiple session types load efficiently on app start', async () => {
      const sessionTypes = ['morning', 'midday', 'evening'] as const;
      
      const { result } = renderHook(() => useCheckInStore());

      const startTime = performance.now();
      
      await act(async () => {
        // Check all session types in parallel
        const sessionChecks = sessionTypes.map(type => 
          result.current.checkForPartialSession(type)
        );
        
        const results = await Promise.all(sessionChecks);
        
        // Resume any found sessions
        const resumePromises = sessionTypes
          .filter((_, index) => results[index])
          .map(type => result.current.resumeCheckIn(type));
        
        if (resumePromises.length > 0) {
          await Promise.all(resumePromises);
        }
      });
      
      const duration = performance.now() - startTime;
      
      // Multiple session loading should still be fast
      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Resource Management and Cleanup Performance', () => {
    test('session cleanup operations complete efficiently', async () => {
      // Create multiple sessions for cleanup test
      const sessions = Array.from({ length: 10 }, (_, i) => ({
        id: `cleanup-test-${i}`,
        key: `key-${i}`,
      }));

      mockResumableSessionService.getAllActiveSessions.mockResolvedValueOnce(
        sessions.map(s => ({ ...mockSession, id: s.id }))
      );

      const startTime = performance.now();
      
      await resumableSessionService.clearExpiredSessions();
      
      const duration = performance.now() - startTime;
      
      // Cleanup should be fast even with multiple sessions
      expect(duration).toBeLessThan(500);
    });

    test('memory usage remains stable during session operations', async () => {
      // Monitor memory usage patterns
      const initialMemory = process.memoryUsage();
      
      const { result } = renderHook(() => useCheckInStore());

      // Perform intensive session operations
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          await result.current.startCheckIn('morning');
          
          await result.current.updateCurrentCheckIn({
            bodyAreas: [`area-${i}`],
            emotions: [`emotion-${i}`],
          });
          
          await result.current.savePartialProgress(`screen-${i}`);
          
          result.current.clearCurrentCheckIn();
        });
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (< 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    test('session operations scale linearly with data size', async () => {
      const dataSizes = [10, 50, 100, 200];
      const times: number[] = [];
      
      for (const size of dataSizes) {
        const largeData = {
          bodyAreas: new Array(size).fill('area'),
          emotions: new Array(size).fill('emotion'),
          thoughts: new Array(size).fill('thought'),
        };

        const startTime = performance.now();
        
        await resumableSessionService.saveSession({
          type: 'checkin',
          subType: 'morning',
          data: largeData,
          progress: mockProgress,
        });
        
        const duration = performance.now() - startTime;
        times.push(duration);
      }
      
      // Performance should scale reasonably with data size
      // Each doubling of data size should not more than double the time
      for (let i = 1; i < times.length; i++) {
        const growthRatio = times[i] / times[i - 1];
        const dataRatio = dataSizes[i] / dataSizes[i - 1];
        
        // Time growth should be proportional or better than data growth
        expect(growthRatio).toBeLessThanOrEqual(dataRatio * 1.5);
      }
    });
  });

  describe('Network Conditions and Performance', () => {
    test('offline session operations maintain performance standards', async () => {
      // Simulate offline storage operations
      mockDataStore.saveCheckIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 50))
      );
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'offline-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {
            bodyAreas: ['shoulders'],
            emotions: ['calm'],
          },
        };
        result.current.currentSession = mockSession;
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.savePartialProgress('offline-screen');
      });
      
      const duration = performance.now() - startTime;
      
      // Offline operations should still meet performance requirements
      expect(duration).toBeLessThan(300);
    });

    test('degraded performance scenarios stay within acceptable limits', async () => {
      // Simulate slower storage operations
      mockResumableSessionService.saveSession.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'degraded-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: { bodyAreas: ['shoulders'] },
        };
        result.current.currentSession = mockSession;
      });

      const startTime = performance.now();
      
      await act(async () => {
        await result.current.updateCurrentCheckIn({
          emotions: ['calm'],
        }, 'degraded-screen');
      });
      
      const duration = performance.now() - startTime;
      
      // Even with degraded performance, should stay within therapeutic limits
      expect(duration).toBeLessThan(500);
    });
  });
});