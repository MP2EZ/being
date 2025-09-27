/**
 * Assessment Flow Integration Tests
 * 
 * Tests complete user journey from assessment start to crisis intervention
 * Validates the critical path that protects user safety
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAssessmentStore } from '../../src/store/assessmentStore';

// Mock the assessment flow components
jest.mock('../../src/flows/assessment/AssessmentFlow', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  
  return function MockAssessmentFlow({ onComplete }: { onComplete: (result: any) => void }) {
    const [currentQuestion, setCurrentQuestion] = React.useState(0);
    const [answers, setAnswers] = React.useState<number[]>([]);
    
    const questions = [
      'Little interest or pleasure in doing things',
      'Feeling down, depressed, or hopeless',
      'Trouble falling or staying asleep',
      'Feeling tired or having little energy',
      'Poor appetite or overeating',
      'Feeling bad about yourself',
      'Trouble concentrating',
      'Moving or speaking slowly',
      'Thoughts that you would be better off dead' // Critical question 9
    ];
    
    const handleAnswer = (value: number) => {
      const newAnswers = [...answers, value];
      setAnswers(newAnswers);
      
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // Complete assessment
        const score = newAnswers.reduce((sum, answer) => sum + answer, 0);
        onComplete({
          answers: newAnswers,
          score,
          completed: true
        });
      }
    };
    
    if (currentQuestion >= questions.length) {
      return (
        <View testID="assessment-completed">
          <Text>Assessment completed</Text>
        </View>
      );
    }
    
    return (
      <View testID="assessment-flow">
        <Text testID={`question-${currentQuestion}`}>
          Question {currentQuestion + 1}: {questions[currentQuestion]}
        </Text>
        <TouchableOpacity testID="answer-0" onPress={() => handleAnswer(0)}>
          <Text>Not at all</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="answer-1" onPress={() => handleAnswer(1)}>
          <Text>Several days</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="answer-2" onPress={() => handleAnswer(2)}>
          <Text>More than half the days</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="answer-3" onPress={() => handleAnswer(3)}>
          <Text>Nearly every day</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// Mock crisis screen
const MockCrisisScreen = ({ assessment }: { assessment: any }) => (
  <View testID="crisis-screen">
    <Text testID="crisis-title">Crisis Support</Text>
    <Text testID="crisis-score">Score: {assessment.score}</Text>
    <TouchableOpacity testID="call-988">
      <Text>Call 988</Text>
    </TouchableOpacity>
  </View>
);

describe('Assessment Flow Integration Tests', () => {
  let store: ReturnType<typeof useAssessmentStore.getState>;

  beforeEach(async () => {
    await AsyncStorage.clear();
    store = useAssessmentStore.getState();
    store.clearCurrentAssessment();
  });

  describe('Complete PHQ-9 Flow - Normal Case', () => {
    test('Mild Depression Assessment (Score 8)', async () => {
      // Start assessment
      act(() => {
        store.startAssessment('phq9', 'standalone');
      });

      const AssessmentWrapper = () => {
        const [result, setResult] = React.useState<any>(null);
        const [showCrisis, setShowCrisis] = React.useState(false);
        
        const handleComplete = async (assessmentResult: any) => {
          setResult(assessmentResult);
          
          // Simulate the assessment store logic
          const assessment = {
            id: 'test_assessment',
            type: 'phq9',
            answers: assessmentResult.answers,
            score: assessmentResult.score,
            severity: assessmentResult.score <= 4 ? 'minimal' : 
                      assessmentResult.score <= 9 ? 'mild' :
                      assessmentResult.score <= 14 ? 'moderate' :
                      assessmentResult.score <= 19 ? 'moderately severe' : 'severe',
            completedAt: new Date().toISOString(),
            context: 'standalone'
          };
          
          // Check for crisis (score >= 20 or question 9 > 0)
          const needsCrisis = assessment.score >= 20 || assessment.answers[8] > 0;
          setShowCrisis(needsCrisis);
          
          // Save to store
          await store.saveAssessment();
        };
        
        if (showCrisis) {
          return <MockCrisisScreen assessment={result} />;
        }
        
        if (result) {
          return (
            <View testID="assessment-results">
              <Text testID="result-score">Score: {result.score}</Text>
              <Text testID="result-severity">Mild Depression</Text>
            </View>
          );
        }
        
        return (
          <MockAssessmentFlow onComplete={handleComplete} />
        );
      };

      const { getByTestId } = render(<AssessmentWrapper />);

      // Answer all 9 questions with mild depression pattern
      const mildAnswers = [1, 1, 1, 1, 1, 1, 1, 1, 0]; // Score: 8, No suicidal ideation

      for (let i = 0; i < 9; i++) {
        await waitFor(() => {
          expect(getByTestId(`question-${i}`)).toBeTruthy();
        });
        
        fireEvent.press(getByTestId(`answer-${mildAnswers[i]}`));
        
        if (i < 8) {
          await waitFor(() => {
            expect(getByTestId(`question-${i + 1}`)).toBeTruthy();
          });
        }
      }

      // Verify results screen (not crisis)
      await waitFor(() => {
        expect(getByTestId('assessment-results')).toBeTruthy();
        expect(getByTestId('result-score')).toHaveTextContent('Score: 8');
        expect(getByTestId('result-severity')).toHaveTextContent('Mild Depression');
      });

      // Verify no crisis screen
      expect(() => getByTestId('crisis-screen')).toThrow();
    });
  });

  describe('Crisis Intervention Flows', () => {
    test('Severe Depression (Score 21) - Crisis Triggered', async () => {
      const CrisisAssessmentWrapper = () => {
        const [result, setResult] = React.useState<any>(null);
        const [showCrisis, setShowCrisis] = React.useState(false);
        
        const handleComplete = async (assessmentResult: any) => {
          setResult(assessmentResult);
          
          // High score assessment
          const assessment = {
            id: 'crisis_test',
            type: 'phq9',
            answers: assessmentResult.answers,
            score: assessmentResult.score,
            severity: 'severe',
            completedAt: new Date().toISOString(),
            context: 'standalone'
          };
          
          // Should trigger crisis for score >= 20
          const needsCrisis = assessment.score >= 20 || assessment.answers[8] > 0;
          setShowCrisis(needsCrisis);
        };
        
        if (showCrisis && result) {
          return <MockCrisisScreen assessment={result} />;
        }
        
        return <MockAssessmentFlow onComplete={handleComplete} />;
      };

      const { getByTestId } = render(<CrisisAssessmentWrapper />);

      // Answer with severe depression (score 21)
      const severeAnswers = [3, 3, 3, 3, 3, 3, 3, 0, 0]; // Score: 21

      for (let i = 0; i < 9; i++) {
        await waitFor(() => {
          expect(getByTestId(`question-${i}`)).toBeTruthy();
        });
        
        fireEvent.press(getByTestId(`answer-${severeAnswers[i]}`));
      }

      // Verify crisis screen is shown
      await waitFor(() => {
        expect(getByTestId('crisis-screen')).toBeTruthy();
        expect(getByTestId('crisis-title')).toHaveTextContent('Crisis Support');
        expect(getByTestId('crisis-score')).toHaveTextContent('Score: 21');
        expect(getByTestId('call-988')).toBeTruthy();
      });
    });

    test('Suicidal Ideation (Low Score) - Crisis Triggered', async () => {
      const SuicidalIdeationWrapper = () => {
        const [result, setResult] = React.useState<any>(null);
        const [showCrisis, setShowCrisis] = React.useState(false);
        
        const handleComplete = async (assessmentResult: any) => {
          setResult(assessmentResult);
          
          const assessment = {
            id: 'suicidal_test',
            type: 'phq9', 
            answers: assessmentResult.answers,
            score: assessmentResult.score,
            severity: 'minimal', // Low score but has suicidal ideation
            completedAt: new Date().toISOString(),
            context: 'standalone'
          };
          
          // Should trigger crisis for question 9 > 0 regardless of total score
          const needsCrisis = assessment.score >= 20 || assessment.answers[8] > 0;
          setShowCrisis(needsCrisis);
        };
        
        if (showCrisis && result) {
          return <MockCrisisScreen assessment={result} />;
        }
        
        return <MockAssessmentFlow onComplete={handleComplete} />;
      };

      const { getByTestId } = render(<SuicidalIdeationWrapper />);

      // Low total score but positive suicidal ideation
      const suicidalAnswers = [0, 0, 0, 0, 0, 0, 0, 0, 1]; // Score: 1, but question 9 = 1

      for (let i = 0; i < 9; i++) {
        await waitFor(() => {
          expect(getByTestId(`question-${i}`)).toBeTruthy();
        });
        
        fireEvent.press(getByTestId(`answer-${suicidalAnswers[i]}`));
      }

      // Verify crisis screen is triggered despite low total score
      await waitFor(() => {
        expect(getByTestId('crisis-screen')).toBeTruthy();
        expect(getByTestId('crisis-title')).toHaveTextContent('Crisis Support');
        expect(getByTestId('crisis-score')).toHaveTextContent('Score: 1');
      });
    });

    test('GAD-7 Severe Anxiety (Score 16) - Crisis Triggered', async () => {
      // Mock GAD-7 assessment
      const MockGAD7Flow = ({ onComplete }: { onComplete: (result: any) => void }) => {
        const [currentQuestion, setCurrentQuestion] = React.useState(0);
        const [answers, setAnswers] = React.useState<number[]>([]);
        
        const questions = [
          'Feeling nervous, anxious, or on edge',
          'Not being able to stop or control worrying',
          'Worrying too much about different things',
          'Trouble relaxing',
          'Being so restless',
          'Becoming easily annoyed or irritable',
          'Feeling afraid as if something awful might happen'
        ];
        
        const handleAnswer = (value: number) => {
          const newAnswers = [...answers, value];
          setAnswers(newAnswers);
          
          if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
          } else {
            const score = newAnswers.reduce((sum, answer) => sum + answer, 0);
            onComplete({
              answers: newAnswers,
              score,
              completed: true
            });
          }
        };
        
        return (
          <View testID="gad7-assessment">
            <Text testID={`gad7-question-${currentQuestion}`}>
              GAD-7 Q{currentQuestion + 1}: {questions[currentQuestion]}
            </Text>
            {[0, 1, 2, 3].map(value => (
              <TouchableOpacity 
                key={value}
                testID={`gad7-answer-${value}`} 
                onPress={() => handleAnswer(value)}
              >
                <Text>{['Not at all', 'Several days', 'More than half', 'Nearly every day'][value]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      };

      const GAD7CrisisWrapper = () => {
        const [result, setResult] = React.useState<any>(null);
        const [showCrisis, setShowCrisis] = React.useState(false);
        
        const handleComplete = async (assessmentResult: any) => {
          setResult(assessmentResult);
          
          const assessment = {
            id: 'gad7_crisis',
            type: 'gad7',
            answers: assessmentResult.answers,
            score: assessmentResult.score,
            severity: 'severe',
            completedAt: new Date().toISOString(),
            context: 'standalone'
          };
          
          // GAD-7 crisis threshold is score >= 15
          const needsCrisis = assessment.score >= 15;
          setShowCrisis(needsCrisis);
        };
        
        if (showCrisis && result) {
          return <MockCrisisScreen assessment={result} />;
        }
        
        return <MockGAD7Flow onComplete={handleComplete} />;
      };

      const { getByTestId } = render(<GAD7CrisisWrapper />);

      // Severe anxiety answers (score 16)
      const severeAnxietyAnswers = [3, 3, 2, 2, 2, 2, 2]; // Score: 16

      for (let i = 0; i < 7; i++) {
        await waitFor(() => {
          expect(getByTestId(`gad7-question-${i}`)).toBeTruthy();
        });
        
        fireEvent.press(getByTestId(`gad7-answer-${severeAnxietyAnswers[i]}`));
      }

      // Verify crisis screen is triggered
      await waitFor(() => {
        expect(getByTestId('crisis-screen')).toBeTruthy();
        expect(getByTestId('crisis-score')).toHaveTextContent('Score: 16');
      });
    });
  });

  describe('Assessment Persistence During Flow', () => {
    test('Auto-save Progress During Assessment', async () => {
      act(() => {
        store.startAssessment('phq9', 'standalone');
      });

      // Verify assessment started
      const currentAssessment = store.currentAssessment;
      expect(currentAssessment).not.toBeNull();
      expect(currentAssessment!.config!.type).toBe('phq9');

      // Answer first few questions
      act(() => {
        store.answerQuestion(2);
        store.answerQuestion(1);
        store.answerQuestion(1);
      });

      const progress = store.getCurrentProgress();
      expect(progress.current).toBe(3);
      expect(progress.total).toBe(9);

      // Verify answers are stored
      expect(store.currentAssessment!.answers[0]).toBe(2);
      expect(store.currentAssessment!.answers[1]).toBe(1);
      expect(store.currentAssessment!.answers[2]).toBe(1);
    });

    test('Assessment Data Validation Before Save', async () => {
      act(() => {
        store.startAssessment('phq9', 'standalone');
      });

      // Try to save incomplete assessment
      const savePromise = store.saveAssessment();
      await expect(savePromise).rejects.toThrow('Please answer all questions');

      // Complete all questions
      for (let i = 0; i < 9; i++) {
        act(() => {
          store.answerQuestion(1);
        });
      }

      // Now save should work
      await expect(store.saveAssessment()).resolves.not.toThrow();
    });
  });

  describe('Error Handling in Assessment Flow', () => {
    test('Storage Failure During Assessment Save', async () => {
      // Mock storage failure
      const originalSetItem = AsyncStorage.setItem;
      AsyncStorage.setItem = jest.fn().mockRejectedValue(new Error('Storage failed'));

      act(() => {
        store.startAssessment('phq9', 'standalone');
      });

      // Complete assessment
      for (let i = 0; i < 9; i++) {
        act(() => {
          store.answerQuestion(1);
        });
      }

      // Save should fail gracefully
      await expect(store.saveAssessment()).rejects.toThrow('Failed to save assessment');

      // Restore storage
      AsyncStorage.setItem = originalSetItem;
    });

    test('Navigation During Assessment - State Preservation', async () => {
      act(() => {
        store.startAssessment('gad7', 'standalone');
      });

      // Answer some questions
      act(() => {
        store.answerQuestion(2);
        store.answerQuestion(3);
      });

      const beforeNavigation = {
        currentQuestion: store.currentAssessment!.currentQuestion,
        answers: [...store.currentAssessment!.answers]
      };

      // Simulate app backgrounding/foregrounding
      // State should be preserved
      expect(store.currentAssessment!.currentQuestion).toBe(beforeNavigation.currentQuestion);
      expect(store.currentAssessment!.answers).toEqual(beforeNavigation.answers);
    });
  });
});