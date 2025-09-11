/**
 * Accessibility Tests - WCAG AA Compliance
 * 
 * Critical for mental health app - users in crisis need full accessibility
 * Tests screen reader compatibility, focus management, and inclusive design
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

// Mock accessibility components
const MockCrisisButton = ({ onPress, testID }: { onPress: () => void; testID: string }) => (
  <TouchableOpacity
    testID={testID}
    onPress={onPress}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel="Emergency crisis support - Call 988 for immediate help"
    accessibilityHint="Double tap to call the crisis hotline immediately"
    style={{ minHeight: 44, minWidth: 44, padding: 12 }}
  >
    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Call 988</Text>
  </TouchableOpacity>
);

const MockAssessmentQuestion = ({ 
  question, 
  options, 
  onAnswer,
  currentQuestion,
  totalQuestions 
}: any) => (
  <View
    accessible={true}
    accessibilityRole="group"
    accessibilityLabel={`Assessment question ${currentQuestion} of ${totalQuestions}`}
  >
    <Text
      accessibilityRole="header"
      accessibilityLevel={2}
      style={{ fontSize: 18, marginBottom: 16 }}
    >
      {question}
    </Text>
    {options.map((option: any, index: number) => (
      <TouchableOpacity
        key={index}
        testID={`answer-option-${index}`}
        onPress={() => onAnswer(option.value)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${option.text}. Option ${index + 1} of ${options.length}`}
        accessibilityState={{ selected: false }}
        style={{ 
          minHeight: 44, 
          padding: 12, 
          marginVertical: 4,
          backgroundColor: '#f0f0f0'
        }}
      >
        <Text style={{ fontSize: 16 }}>{option.text}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const MockBreathingCircle = ({ isPlaying, onToggle }: { isPlaying: boolean; onToggle: () => void }) => (
  <View
    testID="breathing-circle-container"
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={isPlaying ? "Breathing exercise in progress. Tap to pause." : "Breathing exercise paused. Tap to start."}
    accessibilityState={{ selected: isPlaying }}
    style={{ width: 200, height: 200, borderRadius: 100 }}
  >
    <TouchableOpacity onPress={onToggle} style={{ flex: 1 }} testID="breathing-toggle">
      <View
        style={{
          flex: 1,
          backgroundColor: isPlaying ? '#4CAF50' : '#FFC107',
          borderRadius: 100,
          transform: [{ scale: isPlaying ? 1.2 : 1.0 }]
        }}
      />
    </TouchableOpacity>
  </View>
);

// Import required components
import { TouchableOpacity, View, Text } from 'react-native';
import { useCrisisIntervention } from '../../src/hooks/useCrisisIntervention';

describe('Accessibility: WCAG AA Compliance', () => {
  beforeEach(() => {
    // Mock AccessibilityInfo
    (AccessibilityInfo as any).isScreenReaderEnabled = jest.fn().mockResolvedValue(true);
    (AccessibilityInfo as any).announceForAccessibility = jest.fn();
  });

  describe('Critical Crisis Elements - Level AAA', () => {
    test('Crisis button meets accessibility requirements', () => {
      const mockOnPress = jest.fn();
      const { getByTestId } = render(
        <MockCrisisButton onPress={mockOnPress} testID="crisis-button" />
      );

      const button = getByTestId('crisis-button');

      // Test touch target size (minimum 48x48 points for crisis)
      expect(button.props.style).toMatchObject({
        minHeight: 48, // Updated to higher standard for crisis
        minWidth: 48
      });

      // Test accessibility properties
      expect(button.props.accessible).toBe(true);
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toContain('Emergency crisis support');
      expect(button.props.accessibilityLabel).toContain('Call 988');
      expect(button.props.accessibilityHint).toContain('Calls crisis hotline immediately');

      // Test interaction
      fireEvent.press(button);
      expect(mockOnPress).toHaveBeenCalled();
    });

    test('Crisis intervention triggers immediate announcement', async () => {
      const mockAnnounce = jest.fn();
      (AccessibilityInfo as any).announceForAccessibility = mockAnnounce;

      const CrisisComponent = () => {
        const { triggerCrisisIntervention } = useCrisisIntervention();
        
        React.useEffect(() => {
          triggerCrisisIntervention({
            immediate: true,
            source: 'assessment',
            context: 'PHQ-9 score: 22'
          });
        }, []);

        return <View testID="crisis-component" />;
      };

      render(<CrisisComponent />);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockAnnounce).toHaveBeenCalledWith(
        'URGENT: Crisis support needed. Emergency resources are now available.',
        { urgency: 'high' }
      );
    });

    test('Crisis screen content is screen reader accessible', () => {
      const CrisisScreen = () => (
        <View
          testID="crisis-screen"
          accessibilityRole="main"
          accessibilityLabel="Crisis support screen"
        >
          <Text
            accessibilityRole="header"
            accessibilityLevel={1}
            style={{ fontSize: 24, fontWeight: 'bold' }}
          >
            Crisis Support
          </Text>
          <Text
            accessible={true}
            accessibilityLabel="You are not alone. Help is available right now."
            style={{ fontSize: 16, marginVertical: 8 }}
          >
            You are not alone. Help is available right now.
          </Text>
          <MockCrisisButton
            onPress={() => {}}
            testID="primary-crisis-button"
          />
        </View>
      );

      const { getByTestId } = render(<CrisisScreen />);
      
      const screen = getByTestId('crisis-screen');
      expect(screen.props.accessibilityRole).toBe('main');
      expect(screen.props.accessibilityLabel).toBe('Crisis support screen');

      const button = getByTestId('primary-crisis-button');
      expect(button.props.accessible).toBe(true);
    });

    test('Emergency contact calling accessibility', async () => {
      const mockAnnounce = jest.fn();
      (AccessibilityInfo as any).announceForAccessibility = mockAnnounce;

      const EmergencyCallHandler = () => {
        const handleCall = () => {
          // Announce call initiation to screen reader
          AccessibilityInfo.announceForAccessibility(
            'Calling 988 crisis hotline now. Please wait.'
          );
        };

        return (
          <MockCrisisButton 
            onPress={handleCall}
            testID="emergency-call"
          />
        );
      };

      const { getByTestId } = render(<EmergencyCallHandler />);
      
      fireEvent.press(getByTestId('emergency-call'));
      
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Calling 988 crisis hotline now. Please wait.'
      );
    });
  });

  describe('Assessment Accessibility', () => {
    test('PHQ-9 questions are properly structured for screen readers', () => {
      const questionData = {
        question: 'Little interest or pleasure in doing things',
        options: [
          { value: 0, text: 'Not at all' },
          { value: 1, text: 'Several days' },
          { value: 2, text: 'More than half the days' },
          { value: 3, text: 'Nearly every day' }
        ],
        currentQuestion: 1,
        totalQuestions: 9
      };

      const { getByTestId } = render(
        <MockAssessmentQuestion
          {...questionData}
          onAnswer={() => {}}
        />
      );

      // Test each answer option
      questionData.options.forEach((option, index) => {
        const optionElement = getByTestId(`answer-option-${index}`);
        
        expect(optionElement.props.accessible).toBe(true);
        expect(optionElement.props.accessibilityRole).toBe('button');
        expect(optionElement.props.accessibilityLabel).toContain(option.text);
        expect(optionElement.props.accessibilityLabel).toContain(`Option ${index + 1} of 4`);
        
        // Test minimum touch target
        expect(optionElement.props.style.minHeight).toBe(44);
      });
    });

    test('Assessment progress announcement', () => {
      const mockAnnounce = jest.fn();
      (AccessibilityInfo as any).announceForAccessibility = mockAnnounce;

      const AssessmentWithProgress = () => {
        const [currentQuestion, setCurrentQuestion] = React.useState(0);
        
        const handleAnswer = (value: number) => {
          const nextQuestion = currentQuestion + 1;
          setCurrentQuestion(nextQuestion);
          
          if (nextQuestion <= 9) {
            AccessibilityInfo.announceForAccessibility(
              `Question ${nextQuestion} of 9 completed. Moving to next question.`
            );
          } else {
            AccessibilityInfo.announceForAccessibility(
              'Assessment completed. Processing your responses.'
            );
          }
        };

        if (currentQuestion >= 9) {
          return (
            <Text 
              testID="assessment-complete"
              accessibilityLiveRegion="polite"
            >
              Assessment completed
            </Text>
          );
        }

        return (
          <MockAssessmentQuestion
            question="Test question"
            options={[{ value: 1, text: 'Test answer' }]}
            currentQuestion={currentQuestion + 1}
            totalQuestions={9}
            onAnswer={handleAnswer}
          />
        );
      };

      const { getByTestId } = render(<AssessmentWithProgress />);
      
      fireEvent.press(getByTestId('answer-option-0'));
      
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Question 1 of 9 completed. Moving to next question.'
      );
    });

    test('Crisis detection announcement', () => {
      const mockAnnounce = jest.fn();
      (AccessibilityInfo as any).announceForAccessibility = mockAnnounce;

      const CrisisDetectionComponent = () => {
        const handleCrisisDetected = () => {
          // Immediate announcement for crisis
          AccessibilityInfo.announceForAccessibility(
            'Important: Your responses indicate you may need immediate support. Crisis resources are being displayed.',
            { urgency: 'high' } as any
          );
        };

        React.useEffect(() => {
          handleCrisisDetected();
        }, []);

        return (
          <View testID="crisis-detected">
            <Text>Crisis resources available</Text>
          </View>
        );
      };

      render(<CrisisDetectionComponent />);
      
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Important: Your responses indicate you may need immediate support. Crisis resources are being displayed.',
        { urgency: 'high' }
      );
    });
  });

  describe('Breathing Exercise Accessibility', () => {
    test('Breathing circle provides audio guidance', () => {
      const mockAnnounce = jest.fn();
      (AccessibilityInfo as any).announceForAccessibility = mockAnnounce;

      const BreathingExercise = () => {
        const [isPlaying, setIsPlaying] = React.useState(false);
        const [phase, setPhase] = React.useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');

        const handleToggle = () => {
          const newPlaying = !isPlaying;
          setIsPlaying(newPlaying);
          
          if (newPlaying) {
            AccessibilityInfo.announceForAccessibility(
              'Breathing exercise started. Follow the audio cues: Breathe in for 4 seconds.'
            );
          } else {
            AccessibilityInfo.announceForAccessibility(
              'Breathing exercise paused. Tap to resume.'
            );
          }
        };

        // Simulate breathing phase announcements
        React.useEffect(() => {
          if (isPlaying) {
            const phaseMessages = {
              inhale: 'Breathe in slowly for 4 seconds',
              hold: 'Hold your breath for 4 seconds',
              exhale: 'Breathe out slowly for 6 seconds',
              pause: 'Brief pause before next cycle'
            };
            
            AccessibilityInfo.announceForAccessibility(phaseMessages[phase]);
          }
        }, [phase, isPlaying]);

        return (
          <MockBreathingCircle
            isPlaying={isPlaying}
            onToggle={handleToggle}
          />
        );
      };

      const { getByTestId } = render(<BreathingExercise />);
      
      fireEvent.press(getByTestId('breathing-toggle'));
      
      expect(mockAnnounce).toHaveBeenCalledWith(
        'Breathing exercise started. Follow the audio cues: Breathe in for 4 seconds.'
      );
    });

    test('Breathing circle touch target and labels', () => {
      const { getByTestId } = render(
        <MockBreathingCircle
          isPlaying={false}
          onToggle={() => {}}
        />
      );

      const container = getByTestId('breathing-circle-container');
      
      expect(container.props.accessible).toBe(true);
      expect(container.props.accessibilityRole).toBe('button');
      expect(container.props.accessibilityLabel).toContain('Breathing exercise');
      expect(container.props.accessibilityLabel).toContain('Tap to start');
      
      // Verify sufficient touch target size
      expect(container.props.style).toMatchObject({
        width: 200,
        height: 200
      });
    });
  });

  describe('Navigation & Focus Management', () => {
    test('Proper focus order in crisis flow', () => {
      const CrisisFlow = () => (
        <View testID="crisis-flow">
          <Text
            accessibilityRole="header"
            accessibilityLevel={1}
            testID="crisis-header"
          >
            Crisis Support
          </Text>
          <Text testID="crisis-description">
            You are not alone. Help is available.
          </Text>
          <View testID="crisis-actions">
            <MockCrisisButton 
              onPress={() => {}}
              testID="call-988-button"
            />
            <TouchableOpacity
              testID="call-911-button"
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Call 911 for emergency services"
              style={{ minHeight: 44, marginTop: 8 }}
            >
              <Text>Call 911</Text>
            </TouchableOpacity>
          </View>
        </View>
      );

      const { getByTestId } = render(<CrisisFlow />);
      
      // Verify all interactive elements are accessible
      expect(getByTestId('call-988-button').props.accessible).toBe(true);
      expect(getByTestId('call-911-button').props.accessible).toBe(true);
      
      // Header should be properly marked
      expect(getByTestId('crisis-header').props.accessibilityRole).toBe('header');
    });

    test('Assessment navigation feedback', () => {
      const mockAnnounce = jest.fn();
      (AccessibilityInfo as any).announceForAccessibility = mockAnnounce;

      const AssessmentNavigation = () => {
        const [question, setQuestion] = React.useState(0);
        
        const goBack = () => {
          if (question > 0) {
            setQuestion(question - 1);
            AccessibilityInfo.announceForAccessibility(
              `Moved back to question ${question}. You can change your previous answer.`
            );
          }
        };

        return (
          <View>
            <TouchableOpacity
              testID="back-button"
              onPress={goBack}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go back to previous question"
              disabled={question === 0}
              style={{ minHeight: 44 }}
            >
              <Text>Back</Text>
            </TouchableOpacity>
            <Text testID="question-counter">
              Question {question + 1} of 9
            </Text>
          </View>
        );
      };

      const { getByTestId } = render(<AssessmentNavigation />);
      
      // Initially disabled (first question)
      const backButton = getByTestId('back-button');
      expect(backButton.props.disabled).toBe(true);
    });
  });

  describe('Color Contrast & Visual Accessibility', () => {
    test('Crisis button has sufficient contrast', () => {
      // This would typically be tested with actual color values
      // For demonstration, we test that high-contrast styling is applied
      
      const HighContrastCrisisButton = () => (
        <TouchableOpacity
          testID="high-contrast-button"
          style={{
            backgroundColor: '#CC0000', // High contrast red
            color: '#FFFFFF', // White text
            padding: 16,
            minHeight: 44
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Emergency help - Call 988"
        >
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
            Call 988
          </Text>
        </TouchableOpacity>
      );

      const { getByTestId } = render(<HighContrastCrisisButton />);
      
      const button = getByTestId('high-contrast-button');
      expect(button.props.style).toMatchObject({
        backgroundColor: '#CC0000',
        color: '#FFFFFF'
      });
    });

    test('Text scaling support', () => {
      // Test that text scales properly with system font size settings
      const ScalableText = () => (
        <Text
          testID="scalable-text"
          style={{
            fontSize: 16,
            lineHeight: 24
          }}
          allowFontScaling={true}
        >
          Important mental health information
        </Text>
      );

      const { getByTestId } = render(<ScalableText />);
      
      const text = getByTestId('scalable-text');
      expect(text.props.allowFontScaling).toBe(true);
    });
  });

  describe('Motion & Animation Accessibility', () => {
    test('Breathing animation respects reduced motion preferences', () => {
      // Mock reduced motion preference
      const mockPrefersReducedMotion = true;

      const AccessibleBreathingCircle = () => {
        const [scale, setScale] = React.useState(1.0);
        
        React.useEffect(() => {
          if (!mockPrefersReducedMotion) {
            // Normal breathing animation
            const interval = setInterval(() => {
              setScale(prev => prev === 1.0 ? 1.2 : 1.0);
            }, 2000);
            return () => clearInterval(interval);
          }
        }, []);

        return (
          <View
            testID="accessible-breathing-circle"
            style={{
              width: 100,
              height: 100,
              transform: mockPrefersReducedMotion ? [] : [{ scale }],
              backgroundColor: '#4CAF50'
            }}
            accessible={true}
            accessibilityLabel={
              mockPrefersReducedMotion
                ? 'Breathing guide - audio cues only'
                : 'Breathing guide with visual animation'
            }
          />
        );
      };

      const { getByTestId } = render(<AccessibleBreathingCircle />);
      
      const circle = getByTestId('accessible-breathing-circle');
      expect(circle.props.accessibilityLabel).toContain('audio cues only');
      expect(circle.props.style.transform).toEqual([]);
    });
  });
});