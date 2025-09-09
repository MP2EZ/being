/**
 * Enhanced CheckInStore Tests - Zustand Store with Session Integration
 * 
 * CRITICAL: Tests session-enhanced check-in flows for mental health app
 * Must ensure 100% reliability for clinical data and resume functionality
 * 
 * Focus Areas:
 * - Session creation and resume flows
 * - Clinical data integrity during interruptions
 * - Progress calculation accuracy
 * - Error handling and recovery
 * - Performance of session operations
 */

import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCheckInStore } from '../../src/store/checkInStore';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { dataStore } from '../../src/services/storage/SecureDataStore';
import { networkService } from '../../src/services/NetworkService';
import { CheckIn } from '../../src/types';
import { ResumableSession, SessionProgress } from '../../src/types/ResumableSession';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/ResumableSessionService');
jest.mock('../../src/services/storage/SecureDataStore');
jest.mock('../../src/services/NetworkService');

const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;
const mockDataStore = dataStore as jest.Mocked<typeof dataStore>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;

describe('Enhanced CheckInStore - Session Integration Tests', () => {
  let mockCheckIn: CheckIn;
  let mockSession: ResumableSession;
  let mockProgress: SessionProgress;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T08:00:00.000Z'));

    mockProgress = {
      currentStep: 3,
      totalSteps: 8,
      completedSteps: ['bodyAreas', 'emotions', 'thoughts'],
      percentComplete: 37.5,
      estimatedTimeRemaining: 300,
    };

    mockCheckIn = {
      id: 'checkin_morning_123',
      type: 'morning',
      startedAt: '2024-01-15T07:30:00.000Z',
      completedAt: '2024-01-15T07:45:00.000Z',
      skipped: false,
      data: {
        bodyAreas: ['shoulders', 'neck'],
        emotions: ['calm', 'focused'],
        thoughts: ['positive', 'grateful'],
        sleepQuality: 4,
        energyLevel: 3,
      },
    };

    mockSession = {
      id: 'checkin_morning_123',
      type: 'checkin',
      subType: 'morning',
      startedAt: '2024-01-15T07:30:00.000Z',
      lastUpdatedAt: '2024-01-15T07:45:00.000Z',
      expiresAt: '2024-01-16T07:30:00.000Z',
      appVersion: '1.0.0',
      progress: mockProgress,
      data: mockCheckIn.data,
      metadata: {
        resumeCount: 0,
        totalDuration: 900,
        lastScreen: 'thoughts',
        navigationStack: ['start', 'body-scan', 'emotions', 'thoughts'],
        interruptionReason: 'app_background',
      },
    };

    // Default mock responses
    mockDataStore.getCheckIns.mockResolvedValue([]);
    mockDataStore.getTodayCheckIns.mockResolvedValue([]);
    mockDataStore.saveCheckIn.mockResolvedValue();
    mockDataStore.getPartialCheckIn.mockResolvedValue(null);
    mockDataStore.savePartialCheckIn.mockResolvedValue();
    mockDataStore.clearPartialCheckIn.mockResolvedValue();
    
    mockResumableSessionService.saveSession.mockResolvedValue();
    mockResumableSessionService.getSession.mockResolvedValue(null);
    mockResumableSessionService.deleteSession.mockResolvedValue();
    mockResumableSessionService.hasActiveSession.mockResolvedValue(false);
    mockResumableSessionService.canResumeSession.mockReturnValue(true);
    mockResumableSessionService.updateProgress.mockResolvedValue();
    
    mockNetworkService.isOnline.mockReturnValue(true);
    mockNetworkService.performWithOfflineFallback.mockImplementation((onlineAction) => onlineAction());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Session-Enhanced Check-in Creation', () => {
    test('startCheckIn creates session with accurate progress tracking', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.startCheckIn('morning', 'welcome-screen');
      });

      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkin',
          subType: 'morning',
          progress: expect.objectContaining({
            currentStep: 0,
            totalSteps: 8, // Morning check-in has 8 steps
            completedSteps: [],
            percentComplete: 0,
            estimatedTimeRemaining: 480, // 8 steps * 60 seconds
          }),
          metadata: expect.objectContaining({
            resumeCount: 0,
            totalDuration: 0,
            lastScreen: 'welcome-screen',
            navigationStack: ['welcome-screen'],
          }),
        })
      );

      expect(result.current.currentCheckIn).toBeTruthy();
      expect(result.current.currentSession).toBeTruthy();
      expect(result.current.sessionProgress).toBeTruthy();
    });

    test('startCheckIn calculates correct total steps for each check-in type', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Morning: 8 steps
      await act(async () => {
        await result.current.startCheckIn('morning');
      });
      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({ totalSteps: 8 })
        })
      );

      // Midday: 5 steps
      await act(async () => {
        await result.current.startCheckIn('midday');
      });
      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({ totalSteps: 5 })
        })
      );

      // Evening: 12 steps
      await act(async () => {
        await result.current.startCheckIn('evening');
      });
      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.objectContaining({ totalSteps: 12 })
        })
      );
    });

    test('startCheckIn handles creation errors gracefully', async () => {
      mockResumableSessionService.saveSession.mockRejectedValueOnce(new Error('Storage error'));
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.startCheckIn('morning');
      });

      expect(result.current.error).toBe('Failed to start check-in');
      expect(result.current.currentCheckIn).toBeNull();
      expect(result.current.currentSession).toBeNull();
    });
  });

  describe('Progress Tracking and Updates', () => {
    test('updateCurrentCheckIn accurately calculates progress', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Setup initial session
      await act(async () => {
        result.current.currentCheckIn = {
          id: 'test-123',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {},
        };
        result.current.currentSession = { ...mockSession };
      });

      // Update with partial data
      await act(async () => {
        await result.current.updateCurrentCheckIn({
          bodyAreas: ['shoulders', 'neck'],
          emotions: ['calm'],
          sleepQuality: 4,
        }, 'sleep-quality-screen');
      });

      expect(mockResumableSessionService.updateProgress).toHaveBeenCalledWith(
        mockSession.id,
        expect.objectContaining({
          completedSteps: ['bodyAreas', 'emotions', 'sleepQuality'],
          percentComplete: 37.5, // 3 of 8 steps completed
          estimatedTimeRemaining: 300, // 5 remaining steps * 60 seconds
        })
      );

      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            lastScreen: 'sleep-quality-screen',
            navigationStack: expect.arrayContaining(['sleep-quality-screen']),
          }),
        })
      );
    });

    test('updateCurrentCheckIn handles missing session gracefully', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.updateCurrentCheckIn({ emotions: ['happy'] });
      });

      expect(result.current.error).toBe('No active check-in to update');
    });

    test('progress calculation accuracy for different check-in types', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Test morning check-in progress calculation
      await act(async () => {
        result.current.currentCheckIn = {
          id: 'test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {
            bodyAreas: ['shoulders'],
            emotions: ['calm'],
            thoughts: ['positive'],
            sleepQuality: 4,
            energyLevel: 3,
            // Missing: anxietyLevel, todayValue, intention
          },
        };
        result.current.currentSession = { ...mockSession };

        await result.current.updateCurrentCheckIn({}, 'test-screen');
      });

      // Should calculate 5/8 = 62.5% complete
      expect(mockResumableSessionService.updateProgress).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          completedSteps: ['bodyAreas', 'emotions', 'thoughts', 'sleepQuality', 'energyLevel'],
          percentComplete: 62.5,
        })
      );
    });
  });

  describe('Session Resume Functionality', () => {
    test('resumeCheckIn successfully restores session state', async () => {
      mockResumableSessionService.getSession.mockResolvedValueOnce(mockSession);
      mockResumableSessionService.canResumeSession.mockReturnValueOnce(true);
      
      const { result } = renderHook(() => useCheckInStore());

      let resumeResult: boolean = false;
      await act(async () => {
        resumeResult = await result.current.resumeCheckIn('morning');
      });

      expect(resumeResult).toBe(true);
      expect(result.current.currentCheckIn).toMatchObject({
        id: mockSession.id,
        type: 'morning',
        startedAt: mockSession.startedAt,
        data: mockSession.data,
      });
      expect(result.current.currentSession).toEqual(expect.objectContaining({
        ...mockSession,
        metadata: expect.objectContaining({
          resumeCount: 1, // Incremented
        }),
      }));
      expect(result.current.hasPartialSession).toBe(true);
    });

    test('resumeCheckIn falls back to legacy partial session', async () => {
      mockResumableSessionService.getSession.mockResolvedValueOnce(null);
      mockDataStore.getPartialCheckIn.mockResolvedValueOnce({
        id: 'legacy-session',
        type: 'morning',
        startedAt: '2024-01-15T07:30:00.000Z',
        skipped: false,
        data: { emotions: ['calm'] },
      });
      
      const { result } = renderHook(() => useCheckInStore());

      let resumeResult: boolean = false;
      await act(async () => {
        resumeResult = await result.current.resumeCheckIn('morning');
      });

      expect(resumeResult).toBe(true);
      expect(result.current.currentCheckIn?.id).toBe('legacy-session');
      expect(result.current.currentSession).toBeNull();
      expect(result.current.hasPartialSession).toBe(true);
    });

    test('resumeCheckIn returns false when no session exists', async () => {
      mockResumableSessionService.getSession.mockResolvedValueOnce(null);
      mockDataStore.getPartialCheckIn.mockResolvedValueOnce(null);
      
      const { result } = renderHook(() => useCheckInStore());

      let resumeResult: boolean = false;
      await act(async () => {
        resumeResult = await result.current.resumeCheckIn('morning');
      });

      expect(resumeResult).toBe(false);
      expect(result.current.hasPartialSession).toBe(false);
    });

    test('resumeCheckIn handles corrupted session data', async () => {
      mockResumableSessionService.getSession.mockRejectedValueOnce(new Error('Corrupted data'));
      
      const { result } = renderHook(() => useCheckInStore());

      let resumeResult: boolean = false;
      await act(async () => {
        resumeResult = await result.current.resumeCheckIn('morning');
      });

      expect(resumeResult).toBe(false);
      expect(result.current.error).toBe('Failed to resume check-in');
    });
  });

  describe('Session Completion and Cleanup', () => {
    test('saveCurrentCheckIn completes session and cleans up', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = { ...mockCheckIn };
        result.current.currentSession = { ...mockSession };
        
        await result.current.saveCurrentCheckIn();
      });

      expect(mockDataStore.saveCheckIn).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockCheckIn,
          completedAt: expect.any(String),
        })
      );

      expect(mockResumableSessionService.deleteSession).toHaveBeenCalledWith(mockSession.id);
      expect(mockDataStore.clearPartialCheckIn).toHaveBeenCalledWith(mockCheckIn.type);

      expect(result.current.currentCheckIn).toBeNull();
      expect(result.current.currentSession).toBeNull();
      expect(result.current.hasPartialSession).toBe(false);
    });

    test('saveCurrentCheckIn sanitizes text inputs before saving', async () => {
      const { result } = renderHook(() => useCheckInStore());

      const checkInWithUnsafeData = {
        ...mockCheckIn,
        data: {
          ...mockCheckIn.data,
          intention: '<script>alert("xss")</script>Good intentions',
          dayHighlight: 'Normal text with\n\nnewlines',
        },
      };

      await act(async () => {
        result.current.currentCheckIn = checkInWithUnsafeData;
        result.current.currentSession = mockSession;
        
        await result.current.saveCurrentCheckIn();
      });

      const savedCheckIn = mockDataStore.saveCheckIn.mock.calls[0][0];
      expect(savedCheckIn.data.intention).not.toContain('<script>');
      expect(savedCheckIn.data.intention).toBe('Good intentions'); // Script stripped
    });

    test('saveCurrentCheckIn handles offline conditions', async () => {
      mockNetworkService.isOnline.mockReturnValueOnce(false);
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = mockCheckIn;
        result.current.currentSession = mockSession;
        
        await result.current.saveCurrentCheckIn();
      });

      expect(mockNetworkService.performWithOfflineFallback).toHaveBeenCalled();
      // Should still clean up session even offline
      expect(mockResumableSessionService.deleteSession).toHaveBeenCalled();
    });
  });

  describe('Partial Session Management', () => {
    test('savePartialProgress updates session with current state', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'test-123',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {
            bodyAreas: ['shoulders'],
            emotions: ['calm'],
            sleepQuality: 4,
          },
        };
        result.current.currentSession = mockSession;

        await result.current.savePartialProgress('sleep-quality', ['start', 'body-scan', 'emotions', 'sleep-quality']);
      });

      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bodyAreas: ['shoulders'],
            emotions: ['calm'],
            sleepQuality: 4,
          }),
          metadata: expect.objectContaining({
            lastScreen: 'sleep-quality',
            navigationStack: ['start', 'body-scan', 'emotions', 'sleep-quality'],
            interruptionReason: 'manual',
          }),
        })
      );
    });

    test('clearPartialSession removes both new and legacy sessions', async () => {
      mockResumableSessionService.getSession.mockResolvedValueOnce(mockSession);
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.clearPartialSession('morning');
      });

      expect(mockResumableSessionService.deleteSession).toHaveBeenCalledWith(mockSession.id);
      expect(mockDataStore.clearPartialCheckIn).toHaveBeenCalledWith('morning');
      expect(result.current.hasPartialSession).toBe(false);
    });

    test('checkForPartialSession detects resumable sessions', async () => {
      mockResumableSessionService.hasActiveSession.mockResolvedValueOnce(true);
      
      const { result } = renderHook(() => useCheckInStore());

      let hasSession: boolean = false;
      await act(async () => {
        hasSession = await result.current.checkForPartialSession('morning');
      });

      expect(hasSession).toBe(true);
      expect(result.current.hasPartialSession).toBe(true);
    });
  });

  describe('Clinical Data Integrity', () => {
    test('preserves all clinical data fields during session updates', async () => {
      const { result } = renderHook(() => useCheckInStore());

      const clinicalData = {
        sleepQuality: 4,
        energyLevel: 3,
        anxietyLevel: 2,
        bodyAreas: ['shoulders', 'neck', 'back'],
        emotions: ['calm', 'focused', 'hopeful'],
        thoughts: ['positive', 'grateful', 'mindful'],
        intention: 'Focus on mindfulness throughout the day',
        dreams: 'Peaceful dreams about nature',
      };

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'clinical-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {},
        };
        result.current.currentSession = mockSession;

        await result.current.updateCurrentCheckIn(clinicalData, 'review-screen');
      });

      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining(clinicalData),
        })
      );
    });

    test('maintains assessment timeframe context during resume', async () => {
      const phq9Session = {
        ...mockSession,
        type: 'assessment' as const,
        subType: 'phq9' as const,
        data: {
          answers: [2, 1, 3, 2, 1], // Partial PHQ-9
          currentQuestion: 5,
          startTime: '2024-01-15T07:30:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(phq9Session);
      mockResumableSessionService.canResumeSession.mockReturnValueOnce(true);
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.resumeCheckIn('phq9' as 'morning');
      });

      expect(result.current.currentCheckIn?.data).toEqual(
        expect.objectContaining({
          timeframeReminder: 'Over the last 2 weeks',
        })
      );
    });

    test('prevents data corruption during concurrent updates', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'concurrent-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: { sleepQuality: 3 },
        };
        result.current.currentSession = mockSession;

        // Simulate concurrent updates
        const updates = [
          result.current.updateCurrentCheckIn({ energyLevel: 4 }),
          result.current.updateCurrentCheckIn({ anxietyLevel: 2 }),
          result.current.updateCurrentCheckIn({ emotions: ['calm'] }),
        ];

        await Promise.all(updates);
      });

      // All updates should have been processed
      expect(mockResumableSessionService.saveSession).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance and Response Times', () => {
    test('session operations complete within therapeutic timing requirements', async () => {
      jest.useRealTimers();
      const { result } = renderHook(() => useCheckInStore());

      // Start check-in should complete < 500ms
      const startTime = performance.now();
      await act(async () => {
        await result.current.startCheckIn('morning');
      });
      const startDuration = performance.now() - startTime;
      expect(startDuration).toBeLessThan(500);

      // Updates should complete < 200ms
      const updateTime = performance.now();
      await act(async () => {
        await result.current.updateCurrentCheckIn({ emotions: ['happy'] });
      });
      const updateDuration = performance.now() - updateTime;
      expect(updateDuration).toBeLessThan(200);

      // Resume should complete < 500ms
      mockResumableSessionService.getSession.mockResolvedValueOnce(mockSession);
      const resumeTime = performance.now();
      await act(async () => {
        await result.current.resumeCheckIn('morning');
      });
      const resumeDuration = performance.now() - resumeTime;
      expect(resumeDuration).toBeLessThan(500);
    });

    test('progress calculations are accurate under rapid updates', async () => {
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'rapid-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {},
        };
        result.current.currentSession = mockSession;

        // Rapid sequential updates
        for (let i = 1; i <= 8; i++) {
          const data = i === 1 ? { bodyAreas: ['shoulders'] } :
                       i === 2 ? { emotions: ['calm'] } :
                       i === 3 ? { thoughts: ['positive'] } :
                       i === 4 ? { sleepQuality: 4 } :
                       i === 5 ? { energyLevel: 3 } :
                       i === 6 ? { anxietyLevel: 2 } :
                       i === 7 ? { todayValue: 'mindfulness' } :
                       { intention: 'be present' };

          await result.current.updateCurrentCheckIn(data);
        }
      });

      // Final progress should be 100% (all 8 morning steps completed)
      const lastCall = mockResumableSessionService.updateProgress.mock.calls.pop();
      expect(lastCall?.[1]).toMatchObject({
        percentComplete: 100,
        estimatedTimeRemaining: 0,
      });
    });
  });

  describe('Edge Cases and Error Recovery', () => {
    test('handles session service failures gracefully', async () => {
      mockResumableSessionService.saveSession.mockRejectedValue(new Error('Service unavailable'));
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.startCheckIn('morning');
      });

      expect(result.current.error).toContain('Failed to start check-in');
      expect(result.current.currentCheckIn).toBeNull();
    });

    test('recovers from corrupted session state', async () => {
      mockResumableSessionService.getSession.mockResolvedValueOnce({
        ...mockSession,
        data: null, // Corrupted data
      } as any);
      
      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.resumeCheckIn('morning');
      });

      // Should handle gracefully and not crash
      expect(result.current.error).toBeFalsy();
    });

    test('handles memory pressure during large session operations', async () => {
      const { result } = renderHook(() => useCheckInStore());

      const largeData = {
        bodyAreas: new Array(1000).fill('area'),
        emotions: new Array(1000).fill('emotion'),
        thoughts: new Array(1000).fill('thought'),
      };

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'memory-test',
          type: 'morning',
          startedAt: '2024-01-15T07:30:00.000Z',
          skipped: false,
          data: {},
        };
        result.current.currentSession = mockSession;

        await result.current.updateCurrentCheckIn(largeData);
      });

      // Should handle large data without errors
      expect(result.current.error).toBeFalsy();
      expect(mockResumableSessionService.saveSession).toHaveBeenCalled();
    });
  });
});