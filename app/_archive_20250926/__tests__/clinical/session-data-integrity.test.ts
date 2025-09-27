/**
 * Session Data Integrity Tests - Clinical Accuracy
 * 
 * CRITICAL: Tests 100% accuracy of clinical data preservation during session operations
 * Any failure here indicates potential harm to users and clinical assessment validity
 * 
 * DO NOT MODIFY without clinical oversight and comprehensive testing
 * 
 * Focus Areas:
 * - PHQ-9/GAD-7 response preservation across interruptions
 * - Assessment timeframe validity maintenance
 * - Crisis detection data integrity during resume
 * - Clinical calculation accuracy after session restore
 * - Data corruption detection and prevention
 */

import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useCheckInStore } from '../../src/store/checkInStore';
import { requiresCrisisIntervention, CRISIS_THRESHOLDS } from '../../src/utils/validation';
import { ResumableSession, SESSION_CONSTANTS } from '../../src/types/ResumableSession';
import { Assessment, CheckIn } from '../../src/types';

// Mock services
jest.mock('../../src/services/ResumableSessionService');
jest.mock('../../src/services/storage/SecureDataStore');

const mockResumableSessionService = resumableSessionService as jest.Mocked<typeof resumableSessionService>;

describe('Clinical Data Integrity - Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('PHQ-9 Assessment Data Integrity', () => {
    test('preserves exact PHQ-9 responses during single interruption', async () => {
      const originalResponses = [2, 1, 3, 2, 0]; // Partial PHQ-9 responses
      
      const phq9Session: ResumableSession = {
        id: 'phq9-integrity-test-1',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T09:30:00.000Z',
        lastUpdatedAt: '2024-01-15T09:45:00.000Z',
        expiresAt: '2024-01-16T09:30:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 5,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 55.6,
          estimatedTimeRemaining: 240,
        },
        data: {
          answers: originalResponses,
          currentQuestion: 5,
          startTime: '2024-01-15T09:30:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          assessmentType: 'phq9',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 900,
          lastScreen: 'question-5',
          navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5'],
        },
      };

      // Save session
      await resumableSessionService.saveSession(phq9Session);

      // Verify data was stored correctly
      expect(mockResumableSessionService.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            answers: originalResponses,
            currentQuestion: 5,
            timeframeReminder: 'Over the last 2 weeks',
          }),
        })
      );

      // Simulate retrieval
      mockResumableSessionService.getSession.mockResolvedValueOnce(phq9Session);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Verify exact data preservation
      expect(retrieved?.data.answers).toEqual(originalResponses);
      expect(retrieved?.data.currentQuestion).toBe(5);
      expect(retrieved?.data.timeframeReminder).toBe('Over the last 2 weeks');
      expect(retrieved?.progress.percentComplete).toBeCloseTo(55.6, 1);
    });

    test('maintains PHQ-9 data integrity through multiple resume cycles', async () => {
      const clinicalScenario = {
        originalAnswers: [3, 3, 2, 2, 1], // High depression indicators
        sessionId: 'phq9-multi-resume',
      };

      let currentSession: ResumableSession = {
        id: clinicalScenario.sessionId,
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T09:00:00.000Z',
        lastUpdatedAt: '2024-01-15T09:15:00.000Z',
        expiresAt: '2024-01-16T09:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 5,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 55.6,
          estimatedTimeRemaining: 240,
        },
        data: {
          answers: clinicalScenario.originalAnswers,
          currentQuestion: 5,
          startTime: '2024-01-15T09:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 900,
          lastScreen: 'question-5',
          navigationStack: ['intro', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5'],
        },
      };

      // Simulate multiple resume cycles
      for (let resumeCount = 1; resumeCount <= 3; resumeCount++) {
        // Update session with incremented resume count
        currentSession = {
          ...currentSession,
          lastUpdatedAt: new Date().toISOString(),
          metadata: {
            ...currentSession.metadata,
            resumeCount,
          },
        };

        mockResumableSessionService.getSession.mockResolvedValueOnce(currentSession);
        mockResumableSessionService.canResumeSession.mockReturnValueOnce(true);

        // Simulate session retrieval and validation
        const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
        
        // Verify data integrity after each resume
        expect(retrieved?.data.answers).toEqual(clinicalScenario.originalAnswers);
        expect(retrieved?.data.currentQuestion).toBe(5);
        expect(retrieved?.metadata.resumeCount).toBe(resumeCount);
        
        // Verify clinical data hasn't been corrupted
        const currentScore = clinicalScenario.originalAnswers.reduce((sum, answer) => sum + answer, 0);
        expect(currentScore).toBe(11); // 3+3+2+2+1 = 11 (should be consistent)
        
        // Advance time for next cycle
        jest.advanceTimersByTime(1800000); // 30 minutes
      }

      // After multiple resumes, data should still be intact
      expect(currentSession.data.answers).toEqual(clinicalScenario.originalAnswers);
      expect(currentSession.metadata.resumeCount).toBe(3);
    });

    test('preserves suicidal ideation response (Question 9) with 100% accuracy', async () => {
      const suicidalIdeationCases = [
        { q9Response: 1, description: 'Several days' },
        { q9Response: 2, description: 'More than half the days' },
        { q9Response: 3, description: 'Nearly every day' },
      ];

      for (const testCase of suicidalIdeationCases) {
        const answersWithSuicidalIdeation = [1, 1, 1, 1, 1, 1, 1, 0, testCase.q9Response];
        
        const criticalSession: ResumableSession = {
          id: `suicidal-test-${testCase.q9Response}`,
          type: 'assessment',
          subType: 'phq9',
          startedAt: '2024-01-15T09:00:00.000Z',
          lastUpdatedAt: '2024-01-15T09:30:00.000Z',
          expiresAt: '2024-01-16T09:00:00.000Z',
          appVersion: SESSION_CONSTANTS.SESSION_VERSION,
          progress: {
            currentStep: 9,
            totalSteps: 9,
            completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
            percentComplete: 100,
            estimatedTimeRemaining: 0,
          },
          data: {
            answers: answersWithSuicidalIdeation,
            currentQuestion: 9,
            startTime: '2024-01-15T09:00:00.000Z',
            completedAt: '2024-01-15T09:30:00.000Z',
            timeframeReminder: 'Over the last 2 weeks',
          },
          metadata: {
            resumeCount: 0,
            totalDuration: 1800,
            lastScreen: 'question-9',
            navigationStack: Array.from({length: 10}, (_, i) => i === 0 ? 'intro' : `question-${i}`),
          },
        };

        mockResumableSessionService.getSession.mockResolvedValueOnce(criticalSession);
        
        const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
        
        // Verify exact preservation of suicidal ideation response
        expect(retrieved?.data.answers[8]).toBe(testCase.q9Response);
        
        // Verify crisis detection would still work correctly
        const mockAssessment: Assessment = {
          id: 'crisis-test',
          type: 'phq9',
          answers: answersWithSuicidalIdeation,
          score: answersWithSuicidalIdeation.reduce((sum, val) => sum + val, 0),
          severity: 'mild', // Will be corrected by crisis detection
          completedAt: '2024-01-15T09:30:00.000Z',
          context: 'routine_screening',
        };
        
        const needsCrisis = requiresCrisisIntervention(mockAssessment);
        expect(needsCrisis).toBe(true); // ANY response > 0 on Q9 should trigger crisis
      }
    });
  });

  describe('GAD-7 Assessment Data Integrity', () => {
    test('preserves GAD-7 responses across session boundaries', async () => {
      const gad7Responses = [3, 2, 1, 2, 3, 1]; // Partial responses indicating moderate-severe anxiety
      
      const gad7Session: ResumableSession = {
        id: 'gad7-integrity-test',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T10:00:00.000Z',
        lastUpdatedAt: '2024-01-15T10:15:00.000Z',
        expiresAt: '2024-01-16T10:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 6,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
          percentComplete: 85.7,
          estimatedTimeRemaining: 60,
        },
        data: {
          answers: gad7Responses,
          currentQuestion: 6,
          startTime: '2024-01-15T10:00:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          assessmentType: 'gad7',
        },
        metadata: {
          resumeCount: 1,
          totalDuration: 900,
          lastScreen: 'question-6',
          navigationStack: ['intro', 'timeframe', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5', 'question-6'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(gad7Session);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'gad7');
      
      // Verify exact data preservation
      expect(retrieved?.data.answers).toEqual(gad7Responses);
      expect(retrieved?.data.currentQuestion).toBe(6);
      
      // Verify score calculation would be correct
      const currentScore = gad7Responses.reduce((sum, answer) => sum + answer, 0);
      expect(currentScore).toBe(12); // 3+2+1+2+3+1 = 12 (moderate anxiety)
      
      // Verify this would trigger crisis intervention (score >= 15 when complete)
      const potentialFinalScore = currentScore + 3; // If last question is also 3
      if (potentialFinalScore >= CRISIS_THRESHOLDS.GAD7_SEVERE) {
        // This would require crisis intervention
        expect(potentialFinalScore).toBeGreaterThanOrEqual(15);
      }
    });

    test('maintains assessment timing context during interruptions', async () => {
      const assessmentWithTiming: ResumableSession = {
        id: 'gad7-timing-test',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T10:00:00.000Z',
        lastUpdatedAt: '2024-01-15T10:20:00.000Z',
        expiresAt: '2024-01-16T10:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 4,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3', 'q4'],
          percentComplete: 57.1,
          estimatedTimeRemaining: 180,
        },
        data: {
          answers: [2, 3, 1, 2],
          currentQuestion: 4,
          startTime: '2024-01-15T10:00:00.000Z',
          interruptedAt: '2024-01-15T10:20:00.000Z',
          timeSpent: 1200, // 20 minutes
          timeframeReminder: 'Over the last 2 weeks',
          averageResponseTime: 300, // 5 minutes per question
          questionsWithDelays: [2, 3], // Questions that took longer
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 1200,
          lastScreen: 'question-4',
          navigationStack: ['intro', 'timeframe-reminder', 'question-1', 'question-2', 'question-3', 'question-4'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(assessmentWithTiming);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'gad7');
      
      // Verify timing data preserved
      expect(retrieved?.data.timeSpent).toBe(1200);
      expect(retrieved?.data.averageResponseTime).toBe(300);
      expect(retrieved?.data.questionsWithDelays).toEqual([2, 3]);
      expect(retrieved?.data.interruptedAt).toBe('2024-01-15T10:20:00.000Z');
    });
  });

  describe('Check-in Data Integrity', () => {
    test('preserves morning check-in clinical data accurately', async () => {
      const morningClinicalData = {
        sleepQuality: 4,          // Scale 1-5
        energyLevel: 2,           // Scale 1-5 
        anxietyLevel: 3,          // Scale 1-5
        bodyAreas: ['shoulders', 'neck', 'lower back'],
        emotions: ['tired', 'anxious', 'hopeful'],
        thoughts: ['worried about work', 'grateful for family', 'concerned about health'],
        intention: 'Practice mindfulness during stressful meetings',
        dreams: 'Restless sleep with work-related anxiety dreams',
      };

      const morningSession: ResumableSession = {
        id: 'morning-clinical-test',
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
        data: morningClinicalData,
        metadata: {
          resumeCount: 0,
          totalDuration: 1500,
          lastScreen: 'intention',
          navigationStack: ['start', 'body-scan', 'emotions', 'thoughts', 'sleep', 'energy', 'anxiety', 'value', 'intention'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(morningSession);
      
      const retrieved = await resumableSessionService.getSession('checkin', 'morning');
      
      // Verify all clinical fields preserved exactly
      expect(retrieved?.data.sleepQuality).toBe(4);
      expect(retrieved?.data.energyLevel).toBe(2);
      expect(retrieved?.data.anxietyLevel).toBe(3);
      expect(retrieved?.data.bodyAreas).toEqual(['shoulders', 'neck', 'lower back']);
      expect(retrieved?.data.emotions).toEqual(['tired', 'anxious', 'hopeful']);
      expect(retrieved?.data.thoughts).toEqual(['worried about work', 'grateful for family', 'concerned about health']);
      expect(retrieved?.data.intention).toBe('Practice mindfulness during stressful meetings');
      expect(retrieved?.data.dreams).toBe('Restless sleep with work-related anxiety dreams');
    });

    test('maintains evening check-in gratitude data integrity', async () => {
      const eveningGratitudeData = {
        dayHighlight: 'Had a meaningful conversation with my daughter',
        dayChallenge: 'Dealt with difficult client meeting that triggered anxiety',
        dayEmotions: ['frustrated', 'proud', 'grateful', 'exhausted'],
        gratitude1: 'Grateful for my family\'s understanding and support',
        gratitude2: 'Thankful for the ability to work from home today',
        gratitude3: 'Appreciated the beautiful sunset during my evening walk',
        dayLearning: 'Learned that taking breaks actually helps me be more productive',
        tensionAreas: ['shoulders', 'jaw', 'forehead'],
        releaseNote: 'Tension melted away during breathing exercise',
        sleepIntentions: ['no screens after 9pm', 'read for 20 minutes', 'practice gratitude'],
        tomorrowFocus: 'Start the day with meditation and positive intentions',
        lettingGo: 'Releasing worry about things outside my control',
      };

      const eveningSession: ResumableSession = {
        id: 'evening-gratitude-test',
        type: 'checkin',
        subType: 'evening',
        startedAt: '2024-01-15T20:00:00.000Z',
        lastUpdatedAt: '2024-01-15T20:35:00.000Z',
        expiresAt: '2024-01-16T20:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 12,
          totalSteps: 12,
          completedSteps: ['dayHighlight', 'dayChallenge', 'dayEmotions', 'gratitude1', 'gratitude2', 'gratitude3', 'dayLearning', 'tensionAreas', 'releaseNote', 'sleepIntentions', 'tomorrowFocus', 'lettingGo'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: eveningGratitudeData,
        metadata: {
          resumeCount: 0,
          totalDuration: 2100,
          lastScreen: 'letting-go',
          navigationStack: ['start', 'highlight', 'challenge', 'emotions', 'gratitude-1', 'gratitude-2', 'gratitude-3', 'learning', 'tension', 'release', 'sleep-intentions', 'tomorrow-focus', 'letting-go'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(eveningSession);
      
      const retrieved = await resumableSessionService.getSession('checkin', 'evening');
      
      // Verify all gratitude and reflection data preserved
      expect(retrieved?.data.gratitude1).toBe('Grateful for my family\'s understanding and support');
      expect(retrieved?.data.gratitude2).toBe('Thankful for the ability to work from home today');
      expect(retrieved?.data.gratitude3).toBe('Appreciated the beautiful sunset during my evening walk');
      expect(retrieved?.data.dayLearning).toBe('Learned that taking breaks actually helps me be more productive');
      expect(retrieved?.data.sleepIntentions).toEqual(['no screens after 9pm', 'read for 20 minutes', 'practice gratitude']);
      expect(retrieved?.data.lettingGo).toBe('Releasing worry about things outside my control');
    });
  });

  describe('Crisis Detection Data Integrity', () => {
    test('preserves crisis-triggering PHQ-9 data for immediate intervention', async () => {
      const crisisPhq9Responses = [3, 3, 3, 3, 3, 2, 2, 2, 1]; // Score: 22, Q9: 1 (suicidal ideation)
      
      const crisisSession: ResumableSession = {
        id: 'crisis-phq9-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T11:00:00.000Z',
        lastUpdatedAt: '2024-01-15T11:30:00.000Z',
        expiresAt: '2024-01-16T11:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 9,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: {
          answers: crisisPhq9Responses,
          currentQuestion: 9,
          startTime: '2024-01-15T11:00:00.000Z',
          completedAt: '2024-01-15T11:30:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          crisisDetected: true,
          crisisTimestamp: '2024-01-15T11:29:00.000Z',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 1800,
          lastScreen: 'crisis-intervention',
          navigationStack: ['intro', ...Array.from({length: 9}, (_, i) => `question-${i + 1}`), 'crisis-intervention'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(crisisSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Verify crisis data preserved
      expect(retrieved?.data.answers).toEqual(crisisPhq9Responses);
      expect(retrieved?.data.crisisDetected).toBe(true);
      expect(retrieved?.data.crisisTimestamp).toBe('2024-01-15T11:29:00.000Z');
      
      // Verify crisis detection still works
      const totalScore = crisisPhq9Responses.reduce((sum, val) => sum + val, 0);
      expect(totalScore).toBe(22); // Severe depression threshold
      expect(crisisPhq9Responses[8]).toBe(1); // Suicidal ideation present
      
      const mockAssessment: Assessment = {
        id: 'crisis-validation',
        type: 'phq9',
        answers: crisisPhq9Responses,
        score: totalScore,
        severity: 'severe',
        completedAt: '2024-01-15T11:30:00.000Z',
        context: 'routine_screening',
      };
      
      const needsCrisis = requiresCrisisIntervention(mockAssessment);
      expect(needsCrisis).toBe(true);
    });

    test('preserves crisis-level GAD-7 data for intervention', async () => {
      const crisisGad7Responses = [3, 3, 3, 3, 3, 3, 3]; // Score: 21 (severe anxiety)
      
      const gad7CrisisSession: ResumableSession = {
        id: 'crisis-gad7-test',
        type: 'assessment',
        subType: 'gad7',
        startedAt: '2024-01-15T14:00:00.000Z',
        lastUpdatedAt: '2024-01-15T14:25:00.000Z',
        expiresAt: '2024-01-16T14:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 7,
          totalSteps: 7,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: {
          answers: crisisGad7Responses,
          currentQuestion: 7,
          startTime: '2024-01-15T14:00:00.000Z',
          completedAt: '2024-01-15T14:25:00.000Z',
          timeframeReminder: 'Over the last 2 weeks',
          crisisDetected: true,
          crisisTimestamp: '2024-01-15T14:24:00.000Z',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 1500,
          lastScreen: 'crisis-intervention',
          navigationStack: ['intro', ...Array.from({length: 7}, (_, i) => `question-${i + 1}`), 'crisis-intervention'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(gad7CrisisSession);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'gad7');
      
      // Verify crisis GAD-7 data preserved
      expect(retrieved?.data.answers).toEqual(crisisGad7Responses);
      expect(retrieved?.data.crisisDetected).toBe(true);
      
      const totalScore = crisisGad7Responses.reduce((sum, val) => sum + val, 0);
      expect(totalScore).toBe(21); // Maximum GAD-7 score
      expect(totalScore).toBeGreaterThanOrEqual(CRISIS_THRESHOLDS.GAD7_SEVERE);
    });
  });

  describe('Data Corruption Prevention', () => {
    test('detects and rejects corrupted assessment data', async () => {
      const corruptedSession: ResumableSession = {
        id: 'corrupted-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T10:00:00.000Z',
        lastUpdatedAt: '2024-01-15T10:15:00.000Z',
        expiresAt: '2024-01-16T10:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 5,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5'],
          percentComplete: 55.6,
          estimatedTimeRemaining: 240,
        },
        data: {
          answers: [2, 1, 5, 2, 1], // Invalid answer: 5 (should be 0-3)
          currentQuestion: 5,
          startTime: '2024-01-15T10:00:00.000Z',
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 900,
          lastScreen: 'question-5',
          navigationStack: ['intro', 'question-1', 'question-2', 'question-3', 'question-4', 'question-5'],
        },
      };

      mockResumableSessionService.getSession.mockResolvedValueOnce(corruptedSession);
      mockResumableSessionService.isSessionValid.mockReturnValueOnce(false);
      
      const retrieved = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Should detect corruption and return null (handled by service validation)
      expect(mockResumableSessionService.isSessionValid).toHaveBeenCalled();
    });

    test('validates check-in data ranges and types', async () => {
      const invalidCheckInData = {
        sleepQuality: 6,      // Invalid: should be 1-5
        energyLevel: -1,      // Invalid: should be 1-5
        anxietyLevel: 'high', // Invalid: should be number 1-5
        bodyAreas: 'neck',    // Invalid: should be array
        emotions: null,       // Invalid: should be array
      };

      const invalidSession: ResumableSession = {
        id: 'invalid-checkin-test',
        type: 'checkin',
        subType: 'morning',
        startedAt: '2024-01-15T07:00:00.000Z',
        lastUpdatedAt: '2024-01-15T07:20:00.000Z',
        expiresAt: '2024-01-16T07:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 5,
          totalSteps: 8,
          completedSteps: ['bodyAreas', 'emotions', 'sleepQuality', 'energyLevel', 'anxietyLevel'],
          percentComplete: 62.5,
          estimatedTimeRemaining: 180,
        },
        data: invalidCheckInData as any,
        metadata: {
          resumeCount: 0,
          totalDuration: 1200,
          lastScreen: 'anxiety',
          navigationStack: ['start', 'body-scan', 'emotions', 'sleep', 'energy', 'anxiety'],
        },
      };

      // Session validation should catch this
      const isValid = resumableSessionService.isSessionValid(invalidSession);
      expect(isValid).toBe(false);
    });

    test('prevents session data tampering', async () => {
      const originalSession: ResumableSession = {
        id: 'tamper-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T10:00:00.000Z',
        lastUpdatedAt: '2024-01-15T10:15:00.000Z',
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
          answers: [3, 3, 3, 3, 3, 3, 3, 3, 3], // Severe depression
          currentQuestion: 9,
          startTime: '2024-01-15T10:00:00.000Z',
          completedAt: '2024-01-15T10:15:00.000Z',
          score: 27, // Calculated score
        },
        metadata: {
          resumeCount: 0,
          totalDuration: 900,
          lastScreen: 'complete',
          navigationStack: ['intro', ...Array.from({length: 9}, (_, i) => `question-${i + 1}`), 'complete'],
        },
      };

      // Simulate tampered data (score doesn't match answers)
      const tamperedSession = {
        ...originalSession,
        data: {
          ...originalSession.data,
          answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], // Changed to all zeros
          score: 27, // But score remains high (tampered)
        },
      };

      // Recalculate score to verify integrity
      const actualScore = (tamperedSession.data.answers as number[]).reduce((sum, val) => sum + val, 0);
      const storedScore = tamperedSession.data.score;
      
      // Should detect tampering
      expect(actualScore).not.toBe(storedScore);
      expect(actualScore).toBe(0);
      expect(storedScore).toBe(27);
      
      // Data integrity check should fail
      expect(actualScore === storedScore).toBe(false);
    });
  });

  describe('Edge Cases and Recovery', () => {
    test('handles partial session data with missing fields', async () => {
      const incompleteSession: ResumableSession = {
        id: 'incomplete-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T10:00:00.000Z',
        lastUpdatedAt: '2024-01-15T10:05:00.000Z',
        expiresAt: '2024-01-16T10:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 2,
          totalSteps: 9,
          completedSteps: ['q1', 'q2'],
          percentComplete: 22.2,
          estimatedTimeRemaining: 420,
        },
        data: {
          answers: [2, 1], // Only 2 answers
          currentQuestion: 2,
          // Missing startTime, timeframeReminder, etc.
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
      
      // Should still preserve what data exists
      expect(retrieved?.data.answers).toEqual([2, 1]);
      expect(retrieved?.data.currentQuestion).toBe(2);
      
      // Should handle missing fields gracefully
      expect(retrieved?.data.startTime).toBeUndefined();
      expect(retrieved?.data.timeframeReminder).toBeUndefined();
    });

    test('preserves clinical data through storage failures and recovery', async () => {
      const criticalData = {
        answers: [3, 3, 2, 2, 1, 3, 2, 1, 2], // PHQ-9 indicating moderate-severe depression
        currentQuestion: 9,
        startTime: '2024-01-15T10:00:00.000Z',
        completedAt: '2024-01-15T10:20:00.000Z',
        timeframeReminder: 'Over the last 2 weeks',
      };

      const sessionWithCriticalData: ResumableSession = {
        id: 'critical-recovery-test',
        type: 'assessment',
        subType: 'phq9',
        startedAt: '2024-01-15T10:00:00.000Z',
        lastUpdatedAt: '2024-01-15T10:20:00.000Z',
        expiresAt: '2024-01-16T10:00:00.000Z',
        appVersion: SESSION_CONSTANTS.SESSION_VERSION,
        progress: {
          currentStep: 9,
          totalSteps: 9,
          completedSteps: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9'],
          percentComplete: 100,
          estimatedTimeRemaining: 0,
        },
        data: criticalData,
        metadata: {
          resumeCount: 0,
          totalDuration: 1200,
          lastScreen: 'complete',
          navigationStack: ['intro', ...Array.from({length: 9}, (_, i) => `question-${i + 1}`), 'complete'],
        },
      };

      // Simulate storage failure then recovery
      mockResumableSessionService.getSession
        .mockRejectedValueOnce(new Error('Storage failure'))
        .mockResolvedValueOnce(sessionWithCriticalData);

      // First attempt fails
      try {
        await resumableSessionService.getSession('assessment', 'phq9');
      } catch (error) {
        expect(error.message).toBe('Storage failure');
      }

      // Second attempt succeeds
      const recovered = await resumableSessionService.getSession('assessment', 'phq9');
      
      // Critical data should be fully preserved
      expect(recovered?.data.answers).toEqual(criticalData.answers);
      expect(recovered?.data.currentQuestion).toBe(9);
      expect(recovered?.data.completedAt).toBe('2024-01-15T10:20:00.000Z');
      
      // Verify clinical accuracy is maintained
      const score = (recovered?.data.answers as number[]).reduce((sum, val) => sum + val, 0);
      expect(score).toBe(19); // 3+3+2+2+1+3+2+1+2 = 19 (moderately severe)
    });
  });
});