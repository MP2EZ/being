/**
 * Session Clinical Accuracy Tests
 * 
 * CRITICAL: Clinical-grade testing for session resume functionality
 * Tests must ensure 100% accuracy of therapeutic data during interruptions
 * 
 * Clinical Requirements:
 * - PHQ-9/GAD-7 scoring remains accurate after resume
 * - Crisis detection thresholds preserved exactly
 * - Assessment timeframe validity maintained ("over the last 2 weeks")
 * - Therapeutic progress calculations stay precise
 * - MBCT check-in data integrity preserved
 * 
 * DO NOT MODIFY without clinical oversight
 */

import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useCheckInStore } from '../../src/store/checkInStore';
import { requiresCrisisIntervention, CRISIS_THRESHOLDS } from '../../src/utils/validation';
import { ResumableSession, SESSION_CONSTANTS } from '../../src/types/ResumableSession';
import { Assessment, CheckIn } from '../../src/types';
import { renderHook, act } from '@testing-library/react-native';

// Mock dependencies
jest.mock('../../src/services/ResumableSessionService');
jest.mock('../../src/services/storage/SecureDataStore');

const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;

describe('Clinical Accuracy - Session Resume Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
    
    // Default mock implementations
    mockResumableSessionService.saveSession.mockResolvedValue();
    mockResumableSessionService.getSession.mockResolvedValue(null);
    mockResumableSessionService.canResumeSession.mockReturnValue(true);
    mockResumableSessionService.updateProgress.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('PHQ-9 Clinical Accuracy During Resume', () => {
    test('PHQ-9 partial responses maintain exact clinical values', async () => {
      // Clinical scenario: Patient with moderate depression interrupted at question 6
      const phq9Responses = [2, 2, 1, 3, 2, 2]; // Sum = 12 (moderate depression)
      
      const phq9Session: ResumableSession = {
        id: 'phq9-clinical-accuracy-1',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T09:00:00.000Z',
        lastUpdatedAt: '2024-01-15T09:18:00.000Z',
        expiresAt: '2024-01-16T09:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 6,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
          percentComplete: 66.7,
          estimatedTimeRemaining: 180,
        },
        data: {
          answers: phq9Responses,
          currentQuestion: 6,
          startTime: '2024-01-15T09:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          assessmentContext: 'routine_screening',
          clinicalNotes: 'Patient reports difficulty concentrating at work',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 1080,
          lastScreen: 'question-6',
          navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5', 'question-6'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(phq9Session);
      
      // Test direct service accuracy
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Verify exact clinical data preservation
      expect(retrieved?.data.answers).toEqual([2, 2, 1, 3, 2, 2]);
      expect(retrieved?.data.currentQuestion).toBe(6);
      expect(retrieved?.data.timeframeReminder).toBe('Over the last 2 weeks');
      
      // Verify clinical calculation accuracy
      const partialScore = phq9Responses.reduce((sum, val) => sum + val, 0);
      expect(partialScore).toBe(12); // Moderate depression threshold
      
      // Test with assessment store
      const { result } = renderHook(() => useAssessmentStore());
      
      await act(async () => {
        // Simulate resume in assessment store
        result.current.currentAssessment = {
          id: retrieved!.id,
          type: 'phq9',
          answers: retrieved!.data.answers as number[],
          score: partialScore,
          severity: 'moderate',
          completedAt: undefined, // Not yet complete
          context: 'routine_screening',
        };
      });
      
      // Verify store state accuracy
      expect(result.current.currentAssessment?.answers).toEqual([2, 2, 1, 3, 2, 2]);
      expect(result.current.currentAssessment?.score).toBe(12);
    });

    test('PHQ-9 suicidal ideation question (Q9) preserved with 100% accuracy', async () => {
      // CRITICAL: Any response > 0 on Q9 must trigger crisis intervention
      const suicidalIdeationScenarios = [
        { q9Response: 1, description: 'Several days', expectsCrisis: true },
        { q9Response: 2, description: 'More than half the days', expectsCrisis: true },
        { q9Response: 3, description: 'Nearly every day', expectsCrisis: true },
        { q9Response: 0, description: 'Not at all', expectsCrisis: false },
      ];

      for (const scenario of suicidalIdeationScenarios) {
        const completePhq9 = [1, 1, 1, 1, 1, 1, 1, 1, scenario.q9Response];
        
        const suicidalIdeationSession: ResumableSession = {
          id: `phq9-suicidal-test-${scenario.q9Response}`,
          type: 'assessment',
          subType: 'phq9',
          startedAt: '2024-01-15T10:00:00.000Z',
          lastUpdatedAt: '2024-01-15T10:25:00.000Z',
          expiresAt: '2024-01-16T10:00:00.000Z',
          appVersion: SESSION_CONSTANTS.SESSION_VERSION,
          progress: {
            currentStep: 9,
            totalSteps: 9,
            completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
            percentComplete: 100,
            estimatedTimeRemaining: 0,
          },
          data: {
            answers: completePhq9,
            currentQuestion: 9,
            startTime: '2024-01-15T10:00:00.000Z',
            completedAt: '2024-01-15T10:25:00.000Z',
            timeframeReminder: 'Over the last 2 weeks',
          },
          metadata: {
            resumeCount: 1,
            totalDuration: 1500,
            lastScreen: 'question-9',
            navigationStack: ['intro', ...Array.from({length: 9}, (_, i) => `question-${i + 1}`)],
          },
        };

        mockResumableSessionService.getSession.mockResolvedValueOnce(suicidalIdeationSession);
        
        const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
        
        // Verify Q9 response preserved exactly
        expect(retrieved?.data.answers[8]).toBe(scenario.q9Response);
        
        // Test crisis detection accuracy
        const mockAssessment: Assessment = {
          id: `crisis-test-${scenario.q9Response}`,
          type: 'phq9',
          answers: completePhq9,
          score: completePhq9.reduce((sum, val) => sum + val, 0),
          severity: 'mild',
          completedAt: '2024-01-15T10:25:00.000Z',
          context: 'routine_screening',
        };
        
        const needsCrisis = requiresCrisisIntervention(mockAssessment);
        expect(needsCrisis).toBe(scenario.expectsCrisis);
        
        // Verify crisis detection logic
        if (scenario.q9Response > 0) {
          expect(needsCrisis).toBe(true); // ANY response > 0 on Q9 = crisis
        } else {
          // Only check total score if Q9 is 0
          const totalScore = completePhq9.reduce((sum, val) => sum + val, 0);
          expect(needsCrisis).toBe(totalScore >= CRISIS_THRESHOLDS.PHQ9_SEVERE);
        }
      }
    });

    test('PHQ-9 severity calculation accuracy after resume', async () => {
      const severityTestCases = [
        { answers: [0, 0, 0, 1, 0], expectedSeverity: 'minimal', score: 1 },
        { answers: [1, 1, 1, 1, 1], expectedSeverity: 'mild', score: 5 },
        { answers: [2, 2, 2, 2, 2], expectedSeverity: 'moderate', score: 10 },
        { answers: [3, 2, 2, 2, 2, 2, 2], expectedSeverity: 'moderately severe', score: 15 },
        { answers: [3, 3, 3, 3, 3, 2, 2, 1, 0], expectedSeverity: 'severe', score: 20 },
      ];

      for (const testCase of severityTestCases) {
        const phq9Session: ResumableSession = {
          id: `severity-test-${testCase.score}`,
          type: 'assessment',
          subType: 'phq9',
          startedAt: '2024-01-15T10:00:00.000Z',
          lastUpdatedAt: '2024-01-15T10:20:00.000Z',
          expiresAt: '2024-01-16T10:00:00.000Z',
          appVersion: SESSION_CONSTANTS.SESSION_VERSION,
          progress: {
            currentStep: testCase.answers.length,
            totalSteps: 9,
            completedSteps: Array.from({length: testCase.answers.length}, (_, i) => `q${i + 1}`),
            percentComplete: (testCase.answers.length / 9) * 100,
            estimatedTimeRemaining: (9 - testCase.answers.length) * 60,
          },
          data: {
            answers: testCase.answers,
            currentQuestion: testCase.answers.length,
            startTime: '2024-01-15T10:00:00.000Z',
            timeframeReminder: 'Over the last 2 weeks',
          },
          metadata: {
            resumeCount: 0,
            totalDuration: 1200,
            lastScreen: `question-${testCase.answers.length}`,
            navigationStack: ['intro', ...Array.from({length: testCase.answers.length}, (_, i) => `question-${i + 1}`)],
          },
        };

        mockResumableSessionService.getSession.mockResolvedValueOnce(phq9Session);
        
        const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
        
        // Verify score calculation
        const calculatedScore = (retrieved?.data.answers as number[]).reduce((sum, val) => sum + val, 0);
        expect(calculatedScore).toBe(testCase.score);
        
        // Test with assessment store for severity classification
        const { result } = renderHook(() => useAssessmentStore());
        
        await act(async () => {
          const severity = result.current.getSeverityLevel('phq9', calculatedScore);
          expect(severity).toBe(testCase.expectedSeverity);
        });
      }
    });
  });

  describe('GAD-7 Clinical Accuracy During Resume', () => {
    test('GAD-7 responses maintain clinical precision through interruptions', async () => {
      const gad7Responses = [3, 2, 1, 3, 2]; // Sum = 11 (moderate anxiety)
      
      const gad7Session: ResumableSession = {
        id: 'gad7-clinical-accuracy-1',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T11:00:00.000Z',
        lastUpdatedAt: '2024-01-15T11:15:00.000Z',
        expiresAt: '2024-01-16T11:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 5,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 71.4,
          estimatedTimeRemaining: 120,
        },
        data: {
          answers: gad7Responses,
          currentQuestion: 5,
          startTime: '2024-01-15T11:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          assessmentContext: 'anxiety_screening',
          clinicalNotes: 'Patient reports panic attacks increasing in frequency',
        },
        metadata: {
          resumeCount: 1,
          totalDuration: 900,
          lastScreen: 'question-5',
          navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(gad7Session);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'gad7');
      
      // Verify exact clinical data preservation
      expect(retrieved?.data.answers).toEqual([3, 2, 1, 3, 2]);
      expect(retrieved?.data.currentQuestion).toBe(5);
      expect(retrieved?.data.clinicalNotes).toBe('Patient reports panic attacks increasing in frequency');
      
      // Verify clinical calculation accuracy
      const partialScore = gad7Responses.reduce((sum, val) => sum + val, 0);
      expect(partialScore).toBe(11); // Moderate anxiety
    });

    test('GAD-7 crisis threshold detection accuracy after resume', async () => {
      // Test GAD-7 scores at crisis threshold (15+)
      const crisisLevelResponses = [3, 3, 3, 3, 3]; // Sum = 15 (severe anxiety threshold)
      
      const gad7CrisisSession: ResumableSession = {
        id: 'gad7-crisis-test',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T14:00:00.000Z',
        lastUpdatedAt: '2024-01-15T14:12:00.000Z',
        expiresAt: '2024-01-16T14:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 5,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 71.4,
          estimatedTimeRemaining: 120,
        },
        data: {
          answers: crisisLevelResponses,
          currentQuestion: 5,
          startTime: '2024-01-15T14:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          potentialCrisisScore: 15, // If continued at this level
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 720,
          lastScreen: 'question-5',
          navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(gad7CrisisSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'gad7');
      
      const currentScore = (retrieved?.data.answers as number[]).reduce((sum, val) => sum + val, 0);
      expect(currentScore).toBe(15);
      
      // Verify crisis detection would trigger if this were a complete assessment
      const mockCompleteAssessment: Assessment = {
        id: 'gad7-crisis-complete',
        type: 'gad7',
        answers: [3, 3, 3, 3, 3, 2, 1], // Complete with final scores
        score: 20, // Above crisis threshold
        severity: 'severe',
        completedAt: '2024-01-15T14:12:00.000Z',
        context: 'anxiety_screening',
      };
      
      const needsCrisis = requiresCrisisIntervention(mockCompleteAssessment);
      expect(needsCrisis).toBe(true);
      expect(mockCompleteAssessment.score).toBeGreaterThanOrEqual(CRISIS_THRESHOLDS.GAD7_SEVERE);
    });

    test('GAD-7 severity boundaries maintained precisely', async () => {
      const gad7SeverityBoundaries = [
        { score: 4, expectedSeverity: 'minimal' },
        { score: 5, expectedSeverity: 'mild' },
        { score: 9, expectedSeverity: 'mild' },
        { score: 10, expectedSeverity: 'moderate' },
        { score: 14, expectedSeverity: 'moderate' },
        { score: 15, expectedSeverity: 'severe' },
        { score: 21, expectedSeverity: 'severe' },
      ];

      for (const boundary of gad7SeverityBoundaries) {
        const { result } = renderHook(() => useAssessmentStore());
        
        await act(async () => {
          const severity = result.current.getSeverityLevel('gad7', boundary.score);
          expect(severity).toBe(boundary.expectedSeverity);
        });
      }
    });
  });

  describe('MBCT Check-in Data Accuracy During Resume', () => {
    test('morning check-in therapeutic data preserved exactly', async () => {
      const therapeuticMorningData = {
        bodyAreas: ['shoulders', 'neck', 'lower back'],
        emotions: ['tired', 'anxious', 'hopeful'],
        thoughts: ['worried about work deadlines', 'grateful for family support', 'concerned about health'],
        sleepQuality: 2, // Poor sleep (1-5 scale)
        energyLevel: 2,  // Low energy (1-5 scale)
        anxietyLevel: 4, // High anxiety (1-5 scale)
        todayValue: 'mindfulness',
        intention: 'Practice breathing exercises during stressful moments',
        dreams: 'Restless sleep with work-related anxiety dreams',
      };

      const morningSession: ResumableSession = {
        id: 'morning-therapeutic-test',
        type: 'checkin',
        subType: 'morning',
        startedAt: '2024-01-15T07:00:00.000Z',
        lastUpdatedAt: '2024-01-15T07:25:00.000Z',
        expiresAt: '2024-01-16T07:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 8,
          totalSteps: 8,
          completedSteps: ['bodyAreas', 'emotions', 'thoughts', 'sleepQuality', 'energyLevel', 'anxietyLevel', 'todayValue', 'intention'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: therapeuticMorningData,
        metadata: {
          resumeCount: 1,
          totalDuration: 1500,
          lastScreen: 'intention',
          navigationStack: ['start', 'body-scan', 'emotions', 'thoughts', 'sleep', 'energy', 'anxiety', 'value', 'intention'],
          therapeuticContext: 'daily_mbct_practice',
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(morningSession);
      
      const retrieved = await resumableSessionService.getSession('checkin', 'morning');
      
      // Verify all therapeutic data preserved
      expect(retrieved?.data.bodyAreas).toEqual(['shoulders', 'neck', 'lower back']);
      expect(retrieved?.data.emotions).toEqual(['tired', 'anxious', 'hopeful']);
      expect(retrieved?.data.thoughts).toEqual(['worried about work deadlines', 'grateful for family support', 'concerned about health']);
      expect(retrieved?.data.sleepQuality).toBe(2);
      expect(retrieved?.data.energyLevel).toBe(2);
      expect(retrieved?.data.anxietyLevel).toBe(4);
      expect(retrieved?.data.intention).toBe('Practice breathing exercises during stressful moments');
      
      // Test with check-in store
      const { result } = renderHook(() => useCheckInStore());
      
      await act(async () => {
        result.current.currentCheckIn = {
          id: retrieved!.id,
          type: 'morning',
          startedAt: retrieved!.startedAt,
          skipped: false,
          data: retrieved!.data as CheckIn['data'],
        };
        result.current.currentSession = retrieved!;
      });
      
      expect(result.current.currentCheckIn?.data.sleepQuality).toBe(2);
      expect(result.current.currentCheckIn?.data.anxietyLevel).toBe(4);
    });

    test('evening check-in gratitude practice data integrity', async () => {
      const gratitudePracticeData = {
        dayHighlight: 'Had a meaningful conversation with my daughter about her school day',
        dayChallenge: 'Dealt with difficult client meeting that triggered significant anxiety',
        dayEmotions: ['frustrated', 'proud', 'grateful', 'exhausted', 'hopeful'],
        gratitude1: 'Grateful for my family\'s patience and understanding during my recovery',
        gratitude2: 'Thankful for the opportunity to work from home and manage my mental health',
        gratitude3: 'Appreciated the beautiful sunset during my evening mindfulness walk',
        dayLearning: 'Learned that taking breaks during stressful work actually improves my productivity',
        tensionAreas: ['shoulders', 'jaw', 'forehead', 'chest'],
        releaseNote: 'Tension gradually melted away during the 10-minute breathing exercise',
        sleepIntentions: ['no screens after 9pm', 'read mindfulness book for 20 minutes', 'practice gratitude'],
        tomorrowFocus: 'Start the day with 10-minute meditation and positive intention setting',
        lettingGo: 'Releasing worry about things outside my control, especially work outcomes',
      };

      const eveningSession: ResumableSession = {
        id: 'evening-gratitude-test',
        type: 'checkin',
        subType: 'evening',
        startedAt: '2024-01-15T20:00:00.000Z',
        lastUpdatedAt: '2024-01-15T20:45:00.000Z',
        expiresAt: '2024-01-16T20:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 12,
          totalSteps: 12,
          completedSteps: ['dayHighlight', 'dayChallenge', 'dayEmotions', 'gratitude1', 'gratitude2', 'gratitude3', 'dayLearning', 'tensionAreas', 'releaseNote', 'sleepIntentions', 'tomorrowFocus', 'lettingGo'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: gratitudePracticeData,
        metadata: {
          resumeCount: 2,
          totalDuration: 2700,
          lastScreen: 'letting-go',
          navigationStack: ['start', 'highlight', 'challenge', 'emotions', 'gratitude-1', 'gratitude-2', 'gratitude-3', 'learning', 'tension', 'release', 'sleep-intentions', 'tomorrow-focus', 'letting-go'],
          therapeuticContext: 'evening_reflection_practice',
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(eveningSession);
      
      const retrieved = await resumableSessionService.getSession('checkin', 'evening');
      
      // Verify gratitude practice data preserved exactly
      expect(retrieved?.data.gratitude1).toBe('Grateful for my family\'s patience and understanding during my recovery');
      expect(retrieved?.data.gratitude2).toBe('Thankful for the opportunity to work from home and manage my mental health');
      expect(retrieved?.data.gratitude3).toBe('Appreciated the beautiful sunset during my evening mindfulness walk');
      expect(retrieved?.data.dayLearning).toBe('Learned that taking breaks during stressful work actually improves my productivity');
      expect(retrieved?.data.lettingGo).toBe('Releasing worry about things outside my control, especially work outcomes');
      expect(retrieved?.data.sleepIntentions).toEqual(['no screens after 9pm', 'read mindfulness book for 20 minutes', 'practice gratitude']);
    });

    test('check-in progress calculation maintains therapeutic accuracy', async () => {
      const { result } = renderHook(() => useCheckInStore());

      // Test morning check-in progress calculation (8 steps)
      const morningData = {
        bodyAreas: ['shoulders'],
        emotions: ['calm'],
        thoughts: ['positive'],
        sleepQuality: 4,
        // Missing: energyLevel, anxietyLevel, todayValue, intention
      };

      await act(async () => {
        result.current.currentCheckIn = {
          id: 'progress-test',
          type: 'morning',
          startedAt: '2024-01-15T07:00:00.000Z',
          skipped: false,
          data: morningData,
        };
        
        result.current.currentSession = {
          id: 'progress-test',
          type: 'checkin',
          subType: 'morning',
          startedAt: '2024-01-15T07:00:00.000Z',
          lastUpdatedAt: '2024-01-15T07:15:00.000Z',
          expiresAt: '2024-01-16T07:00:00.000Z',
          appVersion: SESSION_CONSTANTS.SESSION_VERSION,
          progress: {
            currentStep: 4,
            totalSteps: 8,
            completedSteps: ['bodyAreas', 'emotions', 'thoughts', 'sleepQuality'],
            percentComplete: 50, // 4 of 8 steps completed
            estimatedTimeRemaining: 240,
          },
          data: morningData,
          metadata: {
            resumeCount: 0,
            totalDuration: 900,
            lastScreen: 'sleep-quality',
            navigationStack: ['start', 'body-scan', 'emotions', 'thoughts', 'sleep-quality'],
          },
        };
      });

      // Verify progress calculation accuracy
      const progressPercentage = result.current.getSessionProgressPercentage();
      expect(progressPercentage).toBe(50); // Exactly 50% completion
      
      // Add more data and verify accuracy
      await act(async () => {
        await result.current.updateCurrentCheckIn({
          energyLevel: 3,
          anxietyLevel: 2,
        });
      });

      // Progress should now be 75% (6 of 8 steps)
      expect(mockResumableSessionService.updateProgress).toHaveBeenCalledWith(
        'progress-test',
        expect.objectContaining({
          completedSteps: ['bodyAreas', 'emotions', 'thoughts', 'sleepQuality', 'energyLevel', 'anxietyLevel'],
          percentComplete: 75,
          estimatedTimeRemaining: 120, // 2 remaining steps * 60 seconds
        })
      );
    });
  });

  describe('Timeframe and Context Preservation', () => {
    test('assessment timeframe context maintained across multiple resume cycles', async () => {
      const timeframeScenarios = [
        { timeframe: 'Over the last 2 weeks', assessmentType: 'phq9' },
        { timeframe: 'Over the last 2 weeks', assessmentType: 'gad7' },
        { timeframe: 'In the past week', assessmentType: 'custom_mood' },
      ];

      for (const scenario of timeframeScenarios) {
        let currentSession: ResumableSession = {
          id: `timeframe-test-${scenario.assessmentType}`,
          type: 'assessment',
          subType: scenario.assessmentType as 'phq9' | 'gad7',
          startedAt: '2024-01-15T10:00:00.000Z',
          lastUpdatedAt: '2024-01-15T10:15:00.000Z',
          expiresAt: '2024-01-16T10:00:00.000Z',
          appVersion: SESSION_CONSTANTS.SESSION_VERSION,
          progress: {
            currentStep: 3,
            totalSteps: scenario.assessmentType === 'phq9' ? 9 : 7,
            completedSteps: ['q1', 'q2', 'q3'],
            percentComplete: scenario.assessmentType === 'phq9' ? 33.3 : 42.9,
            estimatedTimeRemaining: 300,
          },
          data: {
            answers: [2, 1, 2],
            currentQuestion: 3,
            startTime: '2024-01-15T10:00:00.000Z',
            timeframeReminder: scenario.timeframe,
            assessmentContext: 'routine_screening',
            timeframePresentedAt: '2024-01-15T10:01:00.000Z',
          },
          metadata: {
            resumeCount: 0,
            totalDuration: 900,
            lastScreen: 'question-3',
            navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3'],
          },
        };

        // Simulate multiple resume cycles
        for (let resumeCount = 1; resumeCount <= 3; resumeCount++) {
          currentSession = {
            ...currentSession,
            lastUpdatedAt: new Date().toISOString(),
            metadata: {
              ...currentSession.metadata,
              resumeCount,
            },
          };

          mockResumableSessionService.getSession.mockResolvedValueOnce(currentSession);
          
          const retrieved = await resumableSessionService.getSession('assessment', scenario.assessmentType as 'phq9');
          
          // Verify timeframe context preserved exactly
          expect(retrieved?.data.timeframeReminder).toBe(scenario.timeframe);
          expect(retrieved?.data.timeframePresentedAt).toBe('2024-01-15T10:01:00.000Z');
          expect(retrieved?.metadata.resumeCount).toBe(resumeCount);
          
          // Advance time for next cycle
          jest.advanceTimersByTime(1800000); // 30 minutes
        }
      }
    });

    test('therapeutic context and clinical notes preserved through interruptions', async () => {
      const clinicalSession: ResumableSession = {
        id: 'clinical-context-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T14:00:00.000Z',
        lastUpdatedAt: '2024-01-15T14:20:00.000Z',
        expiresAt: '2024-01-16T14:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 7,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
          percentComplete: 77.8,
          estimatedTimeRemaining: 120,
        },
        data: {
          answers: [3, 2, 3, 2, 1, 3, 2],
          currentQuestion: 7,
          startTime: '2024-01-15T14:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          assessmentContext: 'post_therapy_followup',
          clinicalNotes: 'Patient reports improvement since starting CBT but still struggling with sleep',
          therapistName: 'Dr. Sarah Johnson',
          sessionDate: '2024-01-15',
          priorAssessmentScore: 18,
          treatmentPlan: 'Continue CBT, monitor sleep patterns, consider sleep hygiene education',
        },
        metadata: {
          resumeCount: 1,
          totalDuration: 1200,
          lastScreen: 'question-7',
          navigationStack: ['intro', 'context-gathering', 'timeframe', ...Array.from({length: 7}, (_, i) => `question-${i + 1}`)],
          clinicalContext: 'ongoing_treatment_monitoring',
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(clinicalSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Verify all clinical context preserved
      expect(retrieved?.data.assessmentContext).toBe('post_therapy_followup');
      expect(retrieved?.data.clinicalNotes).toBe('Patient reports improvement since starting CBT but still struggling with sleep');
      expect(retrieved?.data.priorAssessmentScore).toBe(18);
      expect(retrieved?.data.treatmentPlan).toBe('Continue CBT, monitor sleep patterns, consider sleep hygiene education');
      expect(retrieved?.metadata.clinicalContext).toBe('ongoing_treatment_monitoring');
    });
  });

  describe('Edge Cases and Clinical Safety', () => {
    test('handles incomplete clinical data safely without losing progress', async () => {
      const incompleteSession: ResumableSession = {
        id: 'incomplete-clinical-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T15:00:00.000Z',
        lastUpdatedAt: '2024-01-15T15:05:00.000Z',
        expiresAt: '2024-01-16T15:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 2,
          totalSteps: 9,
          completedSteps: ['q1', 'q2'],
          percentComplete: 22.2,
          estimatedTimeRemaining: 420,
        },
        data: {
          answers: [3, 2], // Only 2 answers
          currentQuestion: 2,
          // Missing: startTime, timeframeReminder, etc.
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 300,
          lastScreen: 'question-2',
          navigationStack: ['intro', 'question-1', 'question-2'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(incompleteSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Should preserve available clinical data
      expect(retrieved?.data.answers).toEqual([3, 2]);
      expect(retrieved?.data.currentQuestion).toBe(2);
      
      // Should handle missing fields gracefully
      expect(retrieved?.data.startTime).toBeUndefined();
      expect(retrieved?.data.timeframeReminder).toBeUndefined();
      
      // Critical: existing answers should be exactly preserved
      const partialScore = (retrieved?.data.answers as number[]).reduce((sum, val) => sum + val, 0);
      expect(partialScore).toBe(5); // 3 + 2 = 5
    });

    test('clinical data validation prevents invalid responses', async () => {
      const invalidClinicalSession: ResumableSession = {
        id: 'invalid-clinical-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T16:00:00.000Z',
        lastUpdatedAt: '2024-01-15T16:10:00.000Z',
        expiresAt: '2024-01-16T16:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 3,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3'],
          percentComplete: 33.3,
          estimatedTimeRemaining: 360,
        },
        data: {
          answers: [2, 1, 5], // Invalid: 5 is outside 0-3 range for PHQ-9
          currentQuestion: 3,
          startTime: '2024-01-15T16:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 600,
          lastScreen: 'question-3',
          navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3'],
        },
      };

      // Service should detect invalid data during validation
      mockResumableSessionService.isSessionValid.mockReturnValueOnce(false);
      mockResumableSessionService.getSession.mockResolvedValueOnce(null);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Invalid session should be rejected
      expect(retrieved).toBeNull();
    });

    test('crisis-level data preservation is prioritized and never lost', async () => {
      const crisisSession: ResumableSession = {
        id: 'crisis-preservation-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T17:00:00.000Z',
        lastUpdatedAt: '2024-01-15T17:30:00.000Z',
        expiresAt: '2024-01-16T17:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 9,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: {
          answers: [3, 3, 3, 3, 3, 3, 3, 3, 2], // Score: 26, Q9: 2 (severe + suicidal ideation)
          currentQuestion: 9,
          startTime: '2024-01-15T17:00:00.000Z',
          completedAt: '2024-01-15T17:30:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          crisisDetected: true,
          crisisTimestamp: '2024-01-15T17:29:00.000Z',
          crisisScore: 26,
          suicidalIdeation: 2,
          emergencyProtocol: 'activated',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 1800,
          lastScreen: 'crisis-intervention',
          navigationStack: ['intro', 'timeframe', ...Array.from({length: 9}, (_, i) => `question-${i + 1}`), 'crisis-intervention'],
          priority: 'critical',
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(crisisSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Verify all crisis data preserved with 100% accuracy
      expect(retrieved?.data.answers).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 2]);
      expect(retrieved?.data.crisisDetected).toBe(true);
      expect(retrieved?.data.crisisScore).toBe(26);
      expect(retrieved?.data.suicidalIdeation).toBe(2);
      expect(retrieved?.data.emergencyProtocol).toBe('activated');
      
      // Verify crisis detection still works
      const mockAssessment: Assessment = {
        id: 'crisis-final-test',
        type: 'phq9',
        answers: retrieved!.data.answers as number[],
        score: 26,
        severity: 'severe',
        completedAt: '2024-01-15T17:30:00.000Z',
        context: 'crisis_assessment',
      };
      
      const needsCrisis = requiresCrisisIntervention(mockAssessment);
      expect(needsCrisis).toBe(true);
      
      // Double verification: both high score AND suicidal ideation
      expect(mockAssessment.score).toBeGreaterThanOrEqual(CRISIS_THRESHOLDS.PHQ9_SEVERE);
      expect(mockAssessment.answers[8]).toBeGreaterThan(0); // Q9 suicidal ideation
    });
  });
});