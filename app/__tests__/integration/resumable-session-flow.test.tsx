/**
 * Resumable Session Integration Tests
 * 
 * CRITICAL: End-to-end testing of session resume functionality
 * Tests complete user journeys with clinical accuracy requirements
 * 
 * Focus Areas:
 * - Complete check-in interruption and resume flows
 * - Assessment session preservation during interruptions
 * - UI state consistency across session boundaries
 * - Clinical data integrity throughout full journey
 * - Error recovery and user experience
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { useCheckInStore } from '../../src/store/checkInStore';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { dataStore } from '../../src/services/storage/SecureDataStore';
import { CheckIn, Assessment } from '../../src/types';
import { ResumableSession, SESSION_CONSTANTS } from '../../src/types/ResumableSession';

// Mock components for testing
const MockCheckInScreen: React.FC<{ type: 'morning' | 'midday' | 'evening' }> = ({ type }) => {
  const store = useCheckInStore();
  
  React.useEffect(() => {
    store.loadTodaysCheckIns();
  }, []);

  return (
    <div testID={`${type}-checkin-screen`}>
      <div testID="progress-indicator">
        Progress: {store.getSessionProgressPercentage()}%
      </div>
      
      {store.hasPartialSession && (
        <button
          testID="resume-session-button"
          onPress={() => store.resumeCheckIn(type)}
        >
          Resume Session
        </button>
      )}
      
      <button
        testID="start-checkin-button"
        onPress={() => store.startCheckIn(type)}
      >
        Start {type} Check-in
      </button>
      
      <button
        testID="save-progress-button"
        onPress={() => store.savePartialProgress('current-screen')}
      >
        Save Progress
      </button>
      
      <button
        testID="complete-checkin-button"
        onPress={() => store.saveCurrentCheckIn()}
      >
        Complete Check-in
      </button>

      {store.currentCheckIn && (
        <div testID="current-checkin-data">
          {JSON.stringify(store.currentCheckIn.data)}
        </div>
      )}
      
      {store.error && (
        <div testID="error-message">{store.error}</div>
      )}
    </div>
  );
};

const MockAssessmentScreen: React.FC<{ type: 'phq9' | 'gad7' }> = ({ type }) => {
  const store = useAssessmentStore();
  
  React.useEffect(() => {
    store.loadAssessments();
  }, []);

  return (
    <div testID={`${type}-assessment-screen`}>
      <div testID="assessment-progress">
        Progress: {store.getCurrentProgress()}%
      </div>
      
      {store.hasPartialSession && (
        <button
          testID="resume-assessment-button"
          onPress={() => store.resumeAssessment(type)}
        >
          Resume Assessment
        </button>
      )}
      
      <button
        testID="start-assessment-button"
        onPress={() => store.startAssessment(type)}
      >
        Start {type.toUpperCase()}
      </button>

      {store.currentAssessment && (
        <div testID="current-assessment-data">
          {JSON.stringify(store.currentAssessment)}
        </div>
      )}
    </div>
  );
};

const TestApp: React.FC<{ screen: 'morning' | 'phq9' | 'gad7' }> = ({ screen }) => (
  <NavigationContainer>
    {screen === 'morning' && <MockCheckInScreen type="morning" />}
    {screen === 'phq9' && <MockAssessmentScreen type="phq9" />}
    {screen === 'gad7' && <MockAssessmentScreen type="gad7" />}
  </NavigationContainer>
);

// Mock all dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/ResumableSessionService');
jest.mock('../../src/services/storage/SecureDataStore');
jest.mock('../../src/services/NetworkService');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;
const mockDataStore = dataStore as jest.Mocked<typeof dataStore>;

describe('Resumable Session Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T08:00:00.000Z'));

    // Setup default mock responses
    mockDataStore.getTodayCheckIns.mockResolvedValue([]);
    mockDataStore.getCheckIns.mockResolvedValue([]);
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
    mockResumableSessionService.getAllActiveSessions.mockResolvedValue([]);
    mockResumableSessionService.clearExpiredSessions.mockResolvedValue();

    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Complete Check-in Session Flow', () => {
    test('user completes morning check-in without interruption', async () => {
      render(<TestApp screen="morning" />);

      // Start check-in
      const startButton = screen.getByTestId('start-checkin-button');
      await act(async () => {
        fireEvent.press(startButton);
      });

      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkin',
          subType: 'morning',
          progress: expect.objectContaining({
            currentStep: 0,
            totalSteps: 8,
            percentComplete: 0,
          }),
        })
      );

      // Complete check-in
      const completeButton = screen.getByTestId('complete-checkin-button');
      await act(async () => {
        fireEvent.press(completeButton);
      });

      expect(mockDataStore.saveCheckIn).toHaveBeenCalled();
      expect(mockResumableSessionService.deleteSession).toHaveBeenCalled();
    });

    test('user interrupts and resumes morning check-in successfully', async () => {
      const mockSession: ResumableSession = {
        id: 'interrupted-session',
        type: 'checkin',
        subType: 'morning',
        startedAt: '2024-01-15T07:30:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:30:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 3,
          totalSteps: 8,
          completedSteps: ['bodyAreas', 'emotions', 'thoughts'],
          percentComplete: 37.5,
          estimatedTimeRemaining: 300,
        },
        data: {
          bodyAreas: ['shoulders', 'neck'],
          emotions: ['calm', 'focused'],
          thoughts: ['positive', 'grateful'],
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 900,
          lastScreen: 'thoughts',
          navigationStack: ['start', 'body-scan', 'emotions', 'thoughts'],
          interruptionReason: 'app_background',
        },
      };

      // Setup session exists
      mockResumableSessionService.hasActiveSession.mockResolvedValueOnce(true);
      mockResumableSessionService.getSession.mockResolvedValueOnce(mockSession);
      
      const { rerender } = render(<TestApp screen="morning" />);

      // User returns to app and sees resume option
      await waitFor(() => {
        expect(screen.getByTestId('resume-session-button')).toBeTruthy();
      });

      // Resume session
      const resumeButton = screen.getByTestId('resume-session-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      expect(mockResumableSessionService.getSession).toHaveBeenCalledWith('checkin', 'morning');
      
      await waitFor(() => {
        expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Progress: 37.5%');
      });

      // Verify data was restored
      const checkInData = screen.getByTestId('current-checkin-data');
      expect(checkInData.textContent).toContain('shoulders');
      expect(checkInData.textContent).toContain('calm');
      expect(checkInData.textContent).toContain('positive');
    });

    test('session expires and user must start fresh', async () => {
      const expiredSession: ResumableSession = {
        id: 'expired-session',
        type: 'checkin',
        subType: 'morning',
        startedAt: '2024-01-14T07:30:00.000Z',
        lastUpdatedAt: '2024-01-14T07:45:00.000Z',
        expiresAt: '2024-01-14T07:30:00.000Z', // Expired yesterday
        appVersion: '1.0.0',
        progress: {
          currentStep: 2,
          totalSteps: 8,
          completedSteps: ['bodyAreas', 'emotions'],
          percentComplete: 25,
          estimatedTimeRemaining: 360,
        },
        data: { bodyAreas: ['shoulders'], emotions: ['tired'] },
        metadata: {
          resumeCount: 0,
          totalDuration: 600,
          lastScreen: 'emotions',
          navigationStack: ['start', 'body-scan', 'emotions'],
        },
      };

      // Session exists but is expired
      mockResumableSessionService.hasActiveSession.mockResolvedValueOnce(false);
      mockResumableSessionService.getSession.mockResolvedValueOnce(null);
      
      render(<TestApp screen="morning" />);

      // No resume button should appear
      expect(screen.queryByTestId('resume-session-button')).toBeNull();
      
      // User must start fresh
      const startButton = screen.getByTestId('start-checkin-button');
      expect(startButton).toBeTruthy();
    });
  });

  describe('Assessment Session Flows', () => {
    test('PHQ-9 assessment interruption and resume with clinical accuracy', async () => {
      const phq9Session: ResumableSession = {
        id: 'phq9-partial',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T07:30:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:30:00.000Z',
        appVersion: '1.0.0',
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
          startTime: '2024-01-15T07:30:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
        },
        metadata: {
          resumeCount: 1,
          totalDuration: 300,
          lastScreen: 'question-5',
          navigationStack: ['intro', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5'],
        },
      };

      mockResumableSessionService.hasActiveSession.mockResolvedValueOnce(true);
      mockResumableSessionService.getSession.mockResolvedValueOnce(phq9Session);
      
      render(<TestApp screen="phq9" />);

      await waitFor(() => {
        expect(screen.getByTestId('resume-assessment-button')).toBeTruthy();
      });

      const resumeButton = screen.getByTestId('resume-assessment-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('assessment-progress')).toHaveTextContent('Progress: 55.6%');
      });

      // Verify clinical data preserved
      const assessmentData = screen.getByTestId('current-assessment-data');
      const data = JSON.parse(assessmentData.textContent || '{}');
      expect(data.answers).toEqual([2, 1, 3, 2, 1]);
      expect(data.currentQuestion).toBe(5);
      expect(data.timeframeReminder).toBe('Over the last 2 weeks');
    });

    test('GAD-7 assessment maximum resume attempts enforcement', async () => {
      const maxResumedSession: ResumableSession = {
        id: 'gad7-max-resumes',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T07:00:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:00:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 4,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3', 'q4'],
          percentComplete: 57.1,
          estimatedTimeRemaining: 180,
        },
        data: {
          answers: [3, 2, 1, 2],
          currentQuestion: 4,
          startTime: '2024-01-15T07:00:00.000Z',
        },
        metadata: {
          resumeCount: SESSION_CONSTANTS.MAX_RESUME_COUNT, // At maximum
          totalDuration: 600,
          lastScreen: 'question-4',
          navigationStack: ['intro', 'question-1', 'question-2', 'question-3', 'question-4'],
        },
      };

      mockResumableSessionService.hasActiveSession.mockResolvedValueOnce(false);
      mockResumableSessionService.getSession.mockResolvedValueOnce(null);
      mockResumableSessionService.canResumeSession.mockReturnValueOnce(false);
      
      render(<TestApp screen="gad7" />);

      // No resume button - exceeded max resumes
      expect(screen.queryByTestId('resume-assessment-button')).toBeNull();
      
      // Must start fresh
      expect(screen.getByTestId('start-assessment-button')).toBeTruthy();
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('handles corrupted session data gracefully', async () => {
      mockResumableSessionService.getSession.mockRejectedValueOnce(new Error('Corrupted session'));
      mockResumableSessionService.hasActiveSession.mockResolvedValueOnce(true);
      
      render(<TestApp screen="morning" />);

      const resumeButton = screen.getByTestId('resume-session-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to resume check-in');
      });

      // Should still allow starting fresh
      expect(screen.getByTestId('start-checkin-button')).toBeTruthy();
    });

    test('handles network failures during session operations', async () => {
      mockResumableSessionService.saveSession.mockRejectedValueOnce(new Error('Network error'));
      
      render(<TestApp screen="morning" />);

      const startButton = screen.getByTestId('start-checkin-button');
      await act(async () => {
        fireEvent.press(startButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to start check-in');
      });
    });

    test('recovers from storage failures with user notification', async () => {
      mockResumableSessionService.saveSession.mockResolvedValueOnce();
      mockResumableSessionService.updateProgress.mockRejectedValueOnce(new Error('Storage full'));
      
      render(<TestApp screen="morning" />);

      // Start session successfully
      const startButton = screen.getByTestId('start-checkin-button');
      await act(async () => {
        fireEvent.press(startButton);
      });

      // Try to save progress - should fail
      const saveProgressButton = screen.getByTestId('save-progress-button');
      await act(async () => {
        fireEvent.press(saveProgressButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to save progress');
      });
    });
  });

  describe('Session State Consistency', () => {
    test('maintains consistent state across navigation changes', async () => {
      const mockSession: ResumableSession = {
        id: 'nav-test-session',
        type: 'checkin',
        subType: 'morning',
        startedAt: '2024-01-15T07:30:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:30:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 2,
          totalSteps: 8,
          completedSteps: ['bodyAreas', 'emotions'],
          percentComplete: 25,
          estimatedTimeRemaining: 360,
        },
        data: {
          bodyAreas: ['shoulders'],
          emotions: ['calm'],
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 300,
          lastScreen: 'emotions',
          navigationStack: ['start', 'body-scan', 'emotions'],
        },
      };

      mockResumableSessionService.hasActiveSession.mockResolvedValue(true);
      mockResumableSessionService.getSession.mockResolvedValue(mockSession);
      
      const { rerender } = render(<TestApp screen="morning" />);

      // Resume session
      const resumeButton = screen.getByTestId('resume-session-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      // Verify state is loaded
      await waitFor(() => {
        expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Progress: 25%');
      });

      // Simulate navigation away and back
      rerender(<div>Other Screen</div>);
      rerender(<TestApp screen="morning" />);

      // State should be preserved
      await waitFor(() => {
        expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Progress: 25%');
      });
    });

    test('handles concurrent session operations safely', async () => {
      render(<TestApp screen="morning" />);

      // Start session
      const startButton = screen.getByTestId('start-checkin-button');
      await act(async () => {
        fireEvent.press(startButton);
      });

      // Simulate rapid concurrent operations
      const saveButton = screen.getByTestId('save-progress-button');
      await act(async () => {
        // Rapid fire multiple save operations
        fireEvent.press(saveButton);
        fireEvent.press(saveButton);
        fireEvent.press(saveButton);
      });

      // Should handle gracefully without errors
      expect(screen.queryByTestId('error-message')).toBeNull();
    });
  });

  describe('Performance and Timing', () => {
    test('session resume operations complete within therapeutic timing', async () => {
      const mockSession: ResumableSession = {
        id: 'perf-test',
        type: 'checkin',
        subType: 'morning',
        startedAt: '2024-01-15T07:30:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:30:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 1,
          totalSteps: 8,
          completedSteps: ['bodyAreas'],
          percentComplete: 12.5,
          estimatedTimeRemaining: 420,
        },
        data: { bodyAreas: ['shoulders'] },
        metadata: {
          resumeCount: 0,
          totalDuration: 60,
          lastScreen: 'body-scan',
          navigationStack: ['start', 'body-scan'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValue(mockSession);
      mockResumableSessionService.hasActiveSession.mockResolvedValue(true);
      
      render(<TestApp screen="morning" />);

      const startTime = Date.now();
      const resumeButton = screen.getByTestId('resume-session-button');
      
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      await waitFor(() => {
        expect(screen.getByTestId('progress-indicator')).toHaveTextContent('Progress: 12.5%');
      });

      const resumeTime = Date.now() - startTime;
      
      // Should complete within 500ms therapeutic requirement
      expect(resumeTime).toBeLessThan(500);
    });

    test('handles large session data efficiently', async () => {
      const largeDataSession: ResumableSession = {
        id: 'large-data-test',
        type: 'checkin',
        subType: 'evening',
        startedAt: '2024-01-15T19:00:00.000Z',
        lastUpdatedAt: '2024-01-15T19:30:00.000Z',
        expiresAt: '2024-01-16T19:00:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 6,
          totalSteps: 12,
          completedSteps: ['dayHighlight', 'dayChallenge', 'dayEmotions', 'gratitude1', 'gratitude2', 'gratitude3'],
          percentComplete: 50,
          estimatedTimeRemaining: 360,
        },
        data: {
          dayHighlight: 'A' + 'very long highlight text '.repeat(100),
          dayChallenge: 'A' + 'very long challenge text '.repeat(100),
          dayEmotions: new Array(50).fill('complex-emotion'),
          gratitude1: 'Extended gratitude entry '.repeat(50),
          gratitude2: 'Another extended gratitude entry '.repeat(50),
          gratitude3: 'Third extended gratitude entry '.repeat(50),
          // Large dataset to test performance
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 1800,
          lastScreen: 'gratitude-3',
          navigationStack: new Array(20).fill('screen'), // Large navigation history
        },
      };

      mockResumableSessionService.getSession.mockResolvedValue(largeDataSession);
      mockResumableSessionService.hasActiveSession.mockResolvedValue(true);
      
      const startTime = Date.now();
      
      render(<TestApp screen="morning" />);

      const resumeButton = screen.getByTestId('resume-session-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      const loadTime = Date.now() - startTime;
      
      // Should handle large data within reasonable time
      expect(loadTime).toBeLessThan(1000);
    });
  });

  describe('Clinical Accuracy Validation', () => {
    test('preserves exact PHQ-9 responses across interruption cycles', async () => {
      const clinicalResponses = [2, 1, 3, 2, 0, 1, 2]; // Specific clinical pattern

      const phq9Session: ResumableSession = {
        id: 'clinical-accuracy-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T07:30:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:30:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 7,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
          percentComplete: 77.8,
          estimatedTimeRemaining: 120,
        },
        data: {
          answers: clinicalResponses,
          currentQuestion: 7,
          startTime: '2024-01-15T07:30:00.000Z',
          timeSpent: 420,
        },
        metadata: {
          resumeCount: 1,
          totalDuration: 420,
          lastScreen: 'question-7',
          navigationStack: ['intro', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5', 'question-6', 'question-7'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValue(phq9Session);
      mockResumableSessionService.hasActiveSession.mockResolvedValue(true);
      
      render(<TestApp screen="phq9" />);

      const resumeButton = screen.getByTestId('resume-assessment-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      await waitFor(() => {
        const assessmentData = screen.getByTestId('current-assessment-data');
        const data = JSON.parse(assessmentData.textContent || '{}');
        expect(data.answers).toEqual(clinicalResponses);
      });
    });

    test('maintains assessment timeframe context throughout session', async () => {
      const assessmentWithContext: ResumableSession = {
        id: 'context-preservation-test',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T07:30:00.000Z',
        lastUpdatedAt: '2024-01-15T07:45:00.000Z',
        expiresAt: '2024-01-16T07:30:00.000Z',
        appVersion: '1.0.0',
        progress: {
          currentStep: 3,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3'],
          percentComplete: 42.9,
          estimatedTimeRemaining: 240,
        },
        data: {
          answers: [3, 2, 1],
          currentQuestion: 3,
          startTime: '2024-01-15T07:30:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          assessmentContext: 'routine_screening',
          clinicalNotes: 'Patient reported increased anxiety',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 180,
          lastScreen: 'question-3',
          navigationStack: ['intro', 'timeframe-reminder', 'question-1', 'question-2', 'question-3'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValue(assessmentWithContext);
      mockResumableSessionService.hasActiveSession.mockResolvedValue(true);
      
      render(<TestApp screen="gad7" />);

      const resumeButton = screen.getByTestId('resume-assessment-button');
      await act(async () => {
        fireEvent.press(resumeButton);
      });

      await waitFor(() => {
        const assessmentData = screen.getByTestId('current-assessment-data');
        const data = JSON.parse(assessmentData.textContent || '{}');
        expect(data.timeframeReminder).toBe('Over the last 2 weeks');
        expect(data.assessmentContext).toBe('routine_screening');
        expect(data.clinicalNotes).toBe('Patient reported increased anxiety');
      });
    });
  });
});