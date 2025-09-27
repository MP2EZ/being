/**
 * Assessment Store Clinical Validation Tests
 * DRD-FLOW-005 Implementation Verification
 * 
 * CLINICAL REQUIREMENTS VALIDATION:
 * ✓ PHQ-9: 27 possible scores (0-27), crisis threshold ≥20
 * ✓ GAD-7: 21 possible scores (0-21), crisis threshold ≥15
 * ✓ Suicidal ideation detection (PHQ-9 question 9 > 0)
 * ✓ Crisis intervention trigger time <200ms
 * ✓ 100% scoring accuracy (regulatory requirement)
 * ✓ Encrypted storage with audit trail
 * ✓ Session recovery functionality
 * ✓ Auto-save with real-time persistence
 */

import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert, Linking } from 'react-native';

import { useAssessmentStore } from '../assessmentStore';
import {
  AssessmentType,
  AssessmentResponse,
  CRISIS_THRESHOLDS
} from '../../types/index';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn()
  }
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;
const mockLinking = Linking.openURL as jest.MockedFunction<typeof Linking.openURL>;

describe('Assessment Store - Clinical Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAssessmentStore.getState().resetAssessment();
  });

  describe('PHQ-9 Clinical Accuracy', () => {
    it('calculates all possible PHQ-9 scores correctly (0-27)', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      // Test all 27 possible scores
      for (let targetScore = 0; targetScore <= 27; targetScore++) {
        const answers = generatePHQ9Answers(targetScore);
        
        await act(async () => {
          for (const answer of answers) {
            await result.current.answerQuestion(answer.questionId, answer.response);
          }
          await result.current.completeAssessment();
        });

        const assessment = result.current.currentResult;
        expect(assessment).toBeTruthy();
        expect(assessment!.totalScore).toBe(targetScore);

        // Reset for next iteration
        act(() => {
          result.current.resetAssessment();
        });

        await act(async () => {
          await result.current.startAssessment('phq9');
        });
      }
    });

    it('correctly identifies crisis threshold at PHQ-9 ≥20', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      // Test score 19 (below threshold)
      const answers19 = generatePHQ9Answers(19);
      await act(async () => {
        for (const answer of answers19) {
          await result.current.answerQuestion(answer.questionId, answer.response);
        }
        await result.current.completeAssessment();
      });

      expect(result.current.currentResult!.isCrisis).toBe(false);
      expect(result.current.crisisDetection).toBeNull();

      // Reset and test score 20 (at threshold)
      act(() => {
        result.current.resetAssessment();
      });

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      const answers20 = generatePHQ9Answers(20);
      await act(async () => {
        for (const answer of answers20) {
          await result.current.answerQuestion(answer.questionId, answer.response);
        }
        await result.current.completeAssessment();
      });

      expect(result.current.currentResult!.isCrisis).toBe(true);
      expect(result.current.crisisDetection).toBeTruthy();
      expect(result.current.crisisDetection!.triggerType).toBe('phq9_score');
    });

    it('detects suicidal ideation immediately on question 9', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      // Answer question 9 with suicidal ideation
      await act(async () => {
        await result.current.answerQuestion('phq9_9', 1); // Any response > 0
      });

      expect(result.current.crisisDetection).toBeTruthy();
      expect(result.current.crisisDetection!.triggerType).toBe('phq9_suicidal');
      expect(result.current.crisisDetection!.triggerValue).toBe(1);
      
      // Verify crisis intervention was triggered
      expect(mockAlert.alert).toHaveBeenCalledWith(
        '🚨 Crisis Support Available',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call 988 (Crisis Lifeline)' }),
          expect.objectContaining({ text: 'Text 741741 (Crisis Text)' }),
          expect.objectContaining({ text: 'Emergency 911' })
        ]),
        { cancelable: false }
      );
    });

    it('validates PHQ-9 severity mappings', async () => {
      const severityTests = [
        { score: 2, expected: 'minimal' },
        { score: 7, expected: 'mild' },
        { score: 12, expected: 'moderate' },
        { score: 17, expected: 'moderately_severe' },
        { score: 23, expected: 'severe' }
      ];

      for (const test of severityTests) {
        const { result } = renderHook(() => useAssessmentStore());

        await act(async () => {
          await result.current.startAssessment('phq9');
        });

        const answers = generatePHQ9Answers(test.score);
        await act(async () => {
          for (const answer of answers) {
            await result.current.answerQuestion(answer.questionId, answer.response);
          }
          await result.current.completeAssessment();
        });

        expect(result.current.currentResult!.severity).toBe(test.expected);
      }
    });
  });

  describe('GAD-7 Clinical Accuracy', () => {
    it('calculates all possible GAD-7 scores correctly (0-21)', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('gad7');
      });

      // Test all 21 possible scores
      for (let targetScore = 0; targetScore <= 21; targetScore++) {
        const answers = generateGAD7Answers(targetScore);
        
        await act(async () => {
          for (const answer of answers) {
            await result.current.answerQuestion(answer.questionId, answer.response);
          }
          await result.current.completeAssessment();
        });

        const assessment = result.current.currentResult;
        expect(assessment).toBeTruthy();
        expect(assessment!.totalScore).toBe(targetScore);

        // Reset for next iteration
        act(() => {
          result.current.resetAssessment();
        });

        await act(async () => {
          await result.current.startAssessment('gad7');
        });
      }
    });

    it('correctly identifies crisis threshold at GAD-7 ≥15', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      // Test score 14 (below threshold)
      await act(async () => {
        await result.current.startAssessment('gad7');
      });

      const answers14 = generateGAD7Answers(14);
      await act(async () => {
        for (const answer of answers14) {
          await result.current.answerQuestion(answer.questionId, answer.response);
        }
        await result.current.completeAssessment();
      });

      expect(result.current.currentResult!.isCrisis).toBe(false);
      expect(result.current.crisisDetection).toBeNull();

      // Reset and test score 15 (at threshold)
      act(() => {
        result.current.resetAssessment();
      });

      await act(async () => {
        await result.current.startAssessment('gad7');
      });

      const answers15 = generateGAD7Answers(15);
      await act(async () => {
        for (const answer of answers15) {
          await result.current.answerQuestion(answer.questionId, answer.response);
        }
        await result.current.completeAssessment();
      });

      expect(result.current.currentResult!.isCrisis).toBe(true);
      expect(result.current.crisisDetection).toBeTruthy();
      expect(result.current.crisisDetection!.triggerType).toBe('gad7_score');
    });
  });

  describe('Crisis Detection Performance', () => {
    it('triggers crisis intervention within 200ms', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      const startTime = Date.now();
      
      await act(async () => {
        await result.current.answerQuestion('phq9_9', 2); // Suicidal ideation
      });

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
      expect(result.current.crisisDetection).toBeTruthy();
    });

    it('provides immediate 988 access on crisis detection', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      await act(async () => {
        await result.current.answerQuestion('phq9_9', 1);
      });

      expect(mockAlert.alert).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            text: 'Call 988 (Crisis Lifeline)',
            onPress: expect.any(Function)
          })
        ]),
        { cancelable: false }
      );

      // Simulate user pressing 988 button
      const alertCall = mockAlert.alert.mock.calls[0];
      const buttons = alertCall[2] as any[];
      const call988Button = buttons.find(b => b.text.includes('988'));
      
      call988Button.onPress();
      expect(mockLinking.openURL).toHaveBeenCalledWith('tel:988');
    });
  });

  describe('Encrypted Storage and Persistence', () => {
    it('saves assessment data to encrypted storage', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
        await result.current.answerQuestion('phq9_1', 2);
        await result.current.saveProgress();
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'assessment_store_encrypted',
        expect.any(String)
      );
    });

    it('creates audit trail for clinical compliance', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
        await result.current.saveProgress();
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'assessment_audit_trail',
        expect.stringContaining('SAVE')
      );
    });

    it('recovers interrupted sessions correctly', async () => {
      const savedSession = {
        currentSession: {
          id: 'test_session',
          type: 'phq9' as AssessmentType,
          context: 'standalone' as const,
          progress: {
            type: 'phq9' as AssessmentType,
            currentQuestionIndex: 3,
            totalQuestions: 9,
            startedAt: Date.now() - 60000,
            answers: [],
            isComplete: false
          }
        },
        currentQuestionIndex: 3,
        answers: [
          { questionId: 'phq9_1', response: 1 as AssessmentResponse, timestamp: Date.now() },
          { questionId: 'phq9_2', response: 2 as AssessmentResponse, timestamp: Date.now() },
          { questionId: 'phq9_3', response: 0 as AssessmentResponse, timestamp: Date.now() }
        ],
        completedAssessments: []
      };

      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(savedSession));

      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        const recovered = await result.current.recoverSession();
        expect(recovered).toBe(true);
      });

      expect(result.current.currentSession).toBeTruthy();
      expect(result.current.currentSession!.id).toBe('test_session');
      expect(result.current.currentQuestionIndex).toBe(3);
      expect(result.current.answers).toHaveLength(3);
      expect(result.current.hasRecoverableSession).toBe(true);
    });
  });

  describe('Auto-Save Functionality', () => {
    it('auto-saves progress after each answer when enabled', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      act(() => {
        result.current.enableAutoSave();
      });

      await act(async () => {
        await result.current.startAssessment('phq9');
        await result.current.answerQuestion('phq9_1', 1);
      });

      // Wait for debounced auto-save
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('respects auto-save disabled state', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      act(() => {
        result.current.disableAutoSave();
      });

      await act(async () => {
        await result.current.startAssessment('phq9');
        await result.current.answerQuestion('phq9_1', 1);
      });

      // Wait to ensure no auto-save occurs
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
    });
  });

  describe('Progress Tracking and Analytics', () => {
    it('calculates progress percentage correctly', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('phq9');
      });

      expect(result.current.getCurrentProgress()).toBe(0);

      await act(async () => {
        await result.current.answerQuestion('phq9_1', 1);
        await result.current.answerQuestion('phq9_2', 1);
        await result.current.answerQuestion('phq9_3', 1);
      });

      expect(Math.round(result.current.getCurrentProgress())).toBe(33); // 3/9 questions
    });

    it('estimates time remaining accurately', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      await act(async () => {
        await result.current.startAssessment('gad7');
        await result.current.answerQuestion('gad7_1', 1);
        await result.current.answerQuestion('gad7_2', 1);
      });

      const timeRemaining = result.current.getEstimatedTimeRemaining();
      expect(timeRemaining).toBe(150); // 5 remaining questions × 30 seconds
    });

    it('maintains assessment history correctly', async () => {
      const { result } = renderHook(() => useAssessmentStore());

      // Complete PHQ-9
      await act(async () => {
        await result.current.startAssessment('phq9');
        const answers = generatePHQ9Answers(10);
        for (const answer of answers) {
          await result.current.answerQuestion(answer.questionId, answer.response);
        }
        await result.current.completeAssessment();
      });

      // Complete GAD-7
      await act(async () => {
        await result.current.startAssessment('gad7');
        const answers = generateGAD7Answers(8);
        for (const answer of answers) {
          await result.current.answerQuestion(answer.questionId, answer.response);
        }
        await result.current.completeAssessment();
      });

      const allHistory = result.current.getAssessmentHistory();
      expect(allHistory).toHaveLength(2);

      const phq9History = result.current.getAssessmentHistory('phq9');
      expect(phq9History).toHaveLength(1);
      expect(phq9History[0].type).toBe('phq9');

      const lastPHQ9Result = result.current.getLastResult('phq9');
      expect(lastPHQ9Result).toBeTruthy();
      expect(lastPHQ9Result!.totalScore).toBe(10);
    });
  });
});

// Helper functions for generating test answers
function generatePHQ9Answers(targetScore: number): Array<{ questionId: string; response: AssessmentResponse }> {
  const questions = ['phq9_1', 'phq9_2', 'phq9_3', 'phq9_4', 'phq9_5', 'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9'];
  const answers: Array<{ questionId: string; response: AssessmentResponse }> = [];
  
  let remainingScore = targetScore;
  
  for (let i = 0; i < questions.length; i++) {
    const maxForThisQuestion = Math.min(3, remainingScore);
    const questionsLeft = questions.length - i;
    const minNeeded = Math.max(0, remainingScore - (questionsLeft - 1) * 3);
    
    const response = Math.max(minNeeded, Math.min(maxForThisQuestion, remainingScore)) as AssessmentResponse;
    
    answers.push({
      questionId: questions[i],
      response
    });
    
    remainingScore -= response;
  }
  
  return answers;
}

function generateGAD7Answers(targetScore: number): Array<{ questionId: string; response: AssessmentResponse }> {
  const questions = ['gad7_1', 'gad7_2', 'gad7_3', 'gad7_4', 'gad7_5', 'gad7_6', 'gad7_7'];
  const answers: Array<{ questionId: string; response: AssessmentResponse }> = [];
  
  let remainingScore = targetScore;
  
  for (let i = 0; i < questions.length; i++) {
    const maxForThisQuestion = Math.min(3, remainingScore);
    const questionsLeft = questions.length - i;
    const minNeeded = Math.max(0, remainingScore - (questionsLeft - 1) * 3);
    
    const response = Math.max(minNeeded, Math.min(maxForThisQuestion, remainingScore)) as AssessmentResponse;
    
    answers.push({
      questionId: questions[i],
      response
    });
    
    remainingScore -= response;
  }
  
  return answers;
}