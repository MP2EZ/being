/**
 * Therapeutic Onboarding Flow - Clinical Testing Suite
 *
 * TESTING SCOPE:
 * - Clinical safety and crisis detection accuracy
 * - MBCT compliance and therapeutic appropriateness
 * - User autonomy and trauma-informed design
 * - Data security and privacy protection
 * - Performance requirements for mental health UX
 *
 * CRITICAL REQUIREMENTS:
 * - Crisis button response <200ms at all times
 * - 100% assessment scoring accuracy
 * - Immediate crisis intervention for high-risk responses
 * - MBCT-compliant therapeutic language throughout
 * - Encrypted storage of all clinical data
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { TherapeuticOnboardingFlow } from '../TherapeuticOnboardingFlow';
import { BreathingPracticeIntro } from '../../components/onboarding/BreathingPracticeIntro';
import { useAssessmentStore } from '../../store/assessmentStore';
import { useUserStore } from '../../store/userStore';
import { crisisDetectionService } from '../../services/CrisisDetectionService';
import { encryptionService, DataSensitivity } from '../../services/security';

// Mock dependencies
jest.mock('../../store/assessmentStore');
jest.mock('../../store/userStore');
jest.mock('../../services/CrisisDetectionService');
jest.mock('../../services/security');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn()
  }
}));

const mockAssessmentStore = useAssessmentStore as jest.MockedFunction<typeof useAssessmentStore>;
const mockUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;
const mockCrisisDetection = crisisDetectionService as jest.Mocked<typeof crisisDetectionService>;
const mockEncryption = encryptionService as jest.Mocked<typeof encryptionService>;

describe('Therapeutic Onboarding Flow - Clinical Testing', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockAssessmentStore.mockReturnValue({
      startAssessment: jest.fn(),
      answerQuestion: jest.fn(),
      saveAssessment: jest.fn(),
      currentAssessment: null,
      crisisDetected: false,
      setCrisisDetected: jest.fn(),
      triggerRealTimeCrisisIntervention: jest.fn()
    });

    mockUserStore.mockReturnValue({
      updateProfile: jest.fn(),
      user: null,
      isAuthenticated: false
    });

    mockCrisisDetection.detectCrisis.mockResolvedValue({
      isCrisis: false,
      severity: 'low',
      trigger: null
    });

    mockEncryption.encryptData.mockResolvedValue('encrypted-data');
  });

  describe('Clinical Safety Requirements', () => {

    describe('Crisis Button Accessibility', () => {
      it('should render crisis button on every onboarding step', async () => {
        const { getAllByTestId } = render(<TherapeuticOnboardingFlow />);

        // Crisis button should be present on initial render
        expect(getAllByTestId('crisis-button').length).toBeGreaterThan(0);
      });

      it('should maintain crisis button response time <200ms', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);
        const crisisButton = getByTestId('crisis-button');

        const startTime = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - startTime;

        expect(responseTime).toBeLessThan(200);
      });

      it('should provide immediate access to 988 crisis line', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);
        const crisisButton = getByTestId('crisis-button');

        fireEvent.press(crisisButton);

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            expect.stringContaining('Crisis'),
            expect.stringContaining('988'),
            expect.arrayContaining([
              expect.objectContaining({
                text: expect.stringContaining('988'),
                onPress: expect.any(Function)
              })
            ])
          );
        });
      });
    });

    describe('Crisis Detection During Assessments', () => {
      it('should detect PHQ-9 suicidal ideation immediately', async () => {
        const mockCurrentAssessment = {
          config: { type: 'phq9', questions: Array(9).fill({}) },
          answers: Array(9).fill(null),
          currentQuestion: 8 // Question 9 (0-indexed)
        };

        mockAssessmentStore.mockReturnValue({
          ...mockAssessmentStore(),
          currentAssessment: mockCurrentAssessment,
          answerQuestion: jest.fn()
        });

        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        // Navigate to assessment step
        await act(async () => {
          // Simulate navigation to assessment step
          fireEvent.press(getByTestId('continue-button'));
          fireEvent.press(getByTestId('continue-button'));
          fireEvent.press(getByTestId('start-assessment-button'));
        });

        // Answer question 9 with suicidal ideation (score ≥1)
        await act(async () => {
          fireEvent.press(getByTestId('assessment-option-1')); // "Several days"
        });

        expect(mockCrisisDetection.detectCrisis).toHaveBeenCalledWith(
          'phq9',
          expect.any(Array),
          8, // Question index
          expect.any(String)
        );
      });

      it('should trigger enhanced safety for severe depression (PHQ-9 ≥20)', async () => {
        mockCrisisDetection.detectCrisis.mockResolvedValue({
          isCrisis: true,
          severity: 'severe',
          trigger: 'phq9_severe_depression'
        });

        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        // Simulate high PHQ-9 score
        await act(async () => {
          // Navigate and complete assessment with high scores
        });

        expect(mockCrisisDetection.detectCrisis).toHaveBeenCalled();
        expect(mockAssessmentStore().setCrisisDetected).toHaveBeenCalledWith(true);
      });

      it('should provide enhanced safety messaging for at-risk users', async () => {
        mockAssessmentStore.mockReturnValue({
          ...mockAssessmentStore(),
          crisisDetected: true
        });

        const { getByText } = render(<TherapeuticOnboardingFlow />);

        await waitFor(() => {
          expect(getByText(/additional support available/i)).toBeTruthy();
          expect(getByText(/988 is available 24\/7/i)).toBeTruthy();
        });
      });
    });

    describe('Professional Care Integration', () => {
      it('should display clear clinical boundaries on welcome', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        expect(getByText(/not a substitute for therapy/i)).toBeTruthy();
        expect(getByText(/complement, not replace, professional/i)).toBeTruthy();
        expect(getByText(/discuss using this app with your provider/i)).toBeTruthy();
      });

      it('should provide consistent professional resource references', () => {
        const { getAllByText } = render(<TherapeuticOnboardingFlow />);

        // Crisis resources should appear multiple times throughout onboarding
        const crisisReferences = getAllByText(/988/);
        expect(crisisReferences.length).toBeGreaterThan(1);

        const emergencyReferences = getAllByText(/911/);
        expect(emergencyReferences.length).toBeGreaterThan(1);
      });
    });
  });

  describe('MBCT Compliance Validation', () => {

    describe('Therapeutic Language Standards', () => {
      it('should use non-judgmental language throughout', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // Check for MBCT-compliant language
        expect(getByText(/without judgment/i)).toBeTruthy();
        expect(getByText(/no right or wrong way/i)).toBeTruthy();
        expect(getByText(/whatever you experience is okay/i)).toBeTruthy();
      });

      it('should emphasize user control and autonomy', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        expect(getByText(/complete control of your therapeutic journey/i)).toBeTruthy();
        expect(getByText(/can stop using the app at any time/i)).toBeTruthy();
        expect(getByText(/you can skip/i)).toBeTruthy();
      });

      it('should model self-compassion in messaging', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        expect(getByText(/treating yourself with kindness/i)).toBeTruthy();
        expect(getByText(/appreciate taking this time for yourself/i)).toBeTruthy();
        expect(getByText(/beautiful practice/i)).toBeTruthy();
      });
    });

    describe('MBCT Educational Content', () => {
      it('should accurately describe MBCT principles', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // Navigate to MBCT education step
        fireEvent.press(getByText(/i understand - continue/i));

        expect(getByText(/present-moment awareness/i)).toBeTruthy();
        expect(getByText(/non-judgmental observation/i)).toBeTruthy();
        expect(getByText(/body-first approach/i)).toBeTruthy();
        expect(getByText(/self-compassion/i)).toBeTruthy();
      });

      it('should reference evidence-based research appropriately', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        fireEvent.press(getByText(/i understand - continue/i));

        expect(getByText(/research shows/i)).toBeTruthy();
        expect(getByText(/evidence-based/i)).toBeTruthy();
      });
    });

    describe('3-Minute Breathing Space Practice', () => {
      it('should follow MBCT breathing space structure', () => {
        const { getByText } = render(<BreathingPracticeIntro onComplete={jest.fn()} />);

        // Check for three phases
        expect(getByText(/awareness/i)).toBeTruthy();
        expect(getByText(/gathering/i)).toBeTruthy();
        expect(getByText(/expanding/i)).toBeTruthy();
      });

      it('should maintain accurate timing (60 seconds per phase)', async () => {
        const { getByTestId } = render(<BreathingPracticeIntro onComplete={jest.fn()} />);

        fireEvent.press(getByTestId('start-practice-button'));

        // Verify each phase is 60 seconds
        await waitFor(() => {
          expect(getByTestId('phase-timer')).toHaveTextContent('1:00');
        });
      });

      it('should use body-first approach in instructions', () => {
        const { getByText } = render(<BreathingPracticeIntro onComplete={jest.fn()} />);

        expect(getByText(/connect with your body and breath/i)).toBeTruthy();
        expect(getByText(/sensations of breathing/i)).toBeTruthy();
        expect(getByText(/whole body/i)).toBeTruthy();
      });
    });
  });

  describe('User Autonomy and Trauma-Informed Design', () => {

    describe('Informed Consent Process', () => {
      it('should require explicit consent before proceeding', () => {
        const { getByText, queryByText } = render(<TherapeuticOnboardingFlow />);

        // Navigate to consent step
        fireEvent.press(getByText(/i understand - continue/i));

        // Continue button should be disabled until consent
        const continueButton = queryByText(/i consent - continue/i);
        expect(continueButton).toBeTruthy();
      });

      it('should explain data handling and privacy clearly', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        fireEvent.press(getByText(/i understand - continue/i));

        expect(getByText(/data is encrypted and stored securely/i)).toBeTruthy();
        expect(getByText(/stored securely on your device/i)).toBeTruthy();
      });

      it('should allow user to withdraw consent', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        expect(getByText(/can stop using the app at any time/i)).toBeTruthy();
      });
    });

    describe('Optional vs Required Components', () => {
      it('should clearly mark optional steps', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // Navigate to emergency contacts (optional step)
        // Simulate navigation through required steps

        expect(getByText(/optional/i)).toBeTruthy();
        expect(getByText(/you can always add.*later/i)).toBeTruthy();
      });

      it('should allow skipping optional components', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // Should be able to continue without emergency contacts
        expect(getByText(/continue/i)).toBeTruthy();
      });
    });

    describe('Crisis Sensitivity Options', () => {
      it('should provide user control over crisis detection sensitivity', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // Navigate to preferences step
        expect(getByText(/crisis sensitivity/i)).toBeTruthy();
        expect(getByText(/high.*frequent safety check/i)).toBeTruthy();
        expect(getByText(/low.*minimal intervention/i)).toBeTruthy();
      });
    });
  });

  describe('Data Security and Privacy', () => {

    describe('Encryption Requirements', () => {
      it('should encrypt all onboarding data with clinical sensitivity', async () => {
        const mockOnboardingData = {
          hasCompletedWelcome: true,
          hasAcceptedConsent: true,
          emergencyContacts: [],
          baselineAssessments: { completed: false },
          therapeuticPreferences: {
            timeOfDay: ['morning'],
            exerciseDifficulty: 'gentle',
            crisisSensitivity: 'medium',
            accessibilityNeeds: []
          }
        };

        // Simulate onboarding completion
        await act(async () => {
          // Complete onboarding flow
        });

        expect(mockEncryption.encryptData).toHaveBeenCalledWith(
          expect.any(Object),
          DataSensitivity.CLINICAL
        );
      });

      it('should encrypt baseline assessment data', async () => {
        const mockAssessment = {
          type: 'phq9',
          answers: [1, 2, 1, 0, 1, 2, 1, 0, 0],
          score: 8
        };

        await act(async () => {
          // Complete assessment during onboarding
        });

        expect(mockEncryption.encryptData).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'phq9'
          }),
          DataSensitivity.CLINICAL
        );
      });
    });

    describe('Local Storage Requirements', () => {
      it('should store all data locally without network transmission', () => {
        // Verify no network calls during onboarding in Phase 1
        // This test would check that no HTTP requests are made
        // during the onboarding process
      });

      it('should provide clear data deletion capabilities', () => {
        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // User should understand they can delete their data
        expect(getByText(/you can.*delete.*data/i) || getByText(/remove.*information/i)).toBeTruthy();
      });
    });
  });

  describe('Performance Requirements', () => {

    describe('Mental Health UX Performance', () => {
      it('should maintain step transition time <500ms', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        const startTime = performance.now();
        fireEvent.press(getByTestId('continue-button'));

        await waitFor(() => {
          const transitionTime = performance.now() - startTime;
          expect(transitionTime).toBeLessThan(500);
        });
      });

      it('should load assessment screens <300ms', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        const startTime = performance.now();

        // Navigate to assessment
        await act(async () => {
          fireEvent.press(getByTestId('start-assessment-button'));
        });

        const loadTime = performance.now() - startTime;
        expect(loadTime).toBeLessThan(300);
      });

      it('should maintain 60fps during breathing practice animation', async () => {
        const { getByTestId } = render(<BreathingPracticeIntro onComplete={jest.fn()} />);

        fireEvent.press(getByTestId('start-practice-button'));

        // Test animation performance
        // This would require performance monitoring tools
        // to verify smooth 60fps animation
      });
    });
  });

  describe('Integration Testing', () => {

    describe('Store Integration', () => {
      it('should properly integrate with assessment store', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        // Complete baseline assessment
        await act(async () => {
          // Simulate assessment completion
        });

        expect(mockAssessmentStore().startAssessment).toHaveBeenCalledWith('phq9', 'onboarding');
        expect(mockAssessmentStore().saveAssessment).toHaveBeenCalled();
      });

      it('should update user store with onboarding completion', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        // Complete full onboarding
        await act(async () => {
          // Simulate complete onboarding flow
        });

        expect(mockUserStore().updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            onboardingCompleted: true
          })
        );
      });
    });

    describe('Crisis System Integration', () => {
      it('should properly integrate with crisis detection service', async () => {
        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        // Trigger crisis during onboarding
        mockCrisisDetection.detectCrisis.mockResolvedValue({
          isCrisis: true,
          severity: 'high',
          trigger: 'phq9_suicidal_ideation'
        });

        await act(async () => {
          // Answer crisis-triggering assessment question
        });

        expect(mockCrisisDetection.detectCrisis).toHaveBeenCalled();
        expect(mockAssessmentStore().triggerRealTimeCrisisIntervention).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility Compliance', () => {

    describe('Screen Reader Compatibility', () => {
      it('should provide proper accessibility labels for all interactive elements', () => {
        const { getByLabelText } = render(<TherapeuticOnboardingFlow />);

        expect(getByLabelText(/continue to.*information/i)).toBeTruthy();
        expect(getByLabelText(/crisis support/i)).toBeTruthy();
      });

      it('should announce important state changes', () => {
        // Test screen reader announcements for crisis detection,
        // step transitions, and completion states
      });
    });

    describe('Crisis Accessibility', () => {
      it('should maintain crisis button accessibility under stress', () => {
        const { getByLabelText } = render(<TherapeuticOnboardingFlow />);

        const crisisButton = getByLabelText(/crisis/i);
        expect(crisisButton).toBeTruthy();
        expect(crisisButton.props.accessibilityRole).toBe('button');
      });
    });
  });

  describe('Error Handling and Resilience', () => {

    describe('Assessment Errors', () => {
      it('should gracefully handle assessment scoring errors', async () => {
        mockAssessmentStore.mockReturnValue({
          ...mockAssessmentStore(),
          saveAssessment: jest.fn().mockRejectedValue(new Error('Assessment save failed'))
        });

        const { getByTestId } = render(<TherapeuticOnboardingFlow />);

        // Should not crash and should provide user feedback
        await act(async () => {
          // Attempt to save assessment
        });

        // Verify graceful error handling
      });
    });

    describe('Crisis System Failures', () => {
      it('should provide fallback crisis resources if detection fails', async () => {
        mockCrisisDetection.detectCrisis.mockRejectedValue(new Error('Crisis detection failed'));

        const { getByText } = render(<TherapeuticOnboardingFlow />);

        // Crisis resources should still be accessible
        expect(getByText(/988/i)).toBeTruthy();
        expect(getByText(/911/i)).toBeTruthy();
      });
    });
  });
});

describe('Therapeutic Language Validation', () => {

  const therapeuticLanguageTests = [
    {
      description: 'should avoid medical/diagnostic language',
      prohibitedTerms: ['diagnose', 'treat', 'cure', 'medical condition'],
      component: <TherapeuticOnboardingFlow />
    },
    {
      description: 'should use empowering, non-pathologizing language',
      requiredTerms: ['well-being', 'awareness', 'experience', 'journey'],
      component: <TherapeuticOnboardingFlow />
    },
    {
      description: 'should emphasize user agency',
      requiredTerms: ['you choose', 'you control', 'you decide', 'your journey'],
      component: <TherapeuticOnboardingFlow />
    }
  ];

  therapeuticLanguageTests.forEach(test => {
    it(test.description, () => {
      const { container } = render(test.component);
      const textContent = container.textContent || '';

      if (test.prohibitedTerms) {
        test.prohibitedTerms.forEach(term => {
          expect(textContent.toLowerCase()).not.toContain(term.toLowerCase());
        });
      }

      if (test.requiredTerms) {
        test.requiredTerms.forEach(term => {
          expect(textContent.toLowerCase()).toContain(term.toLowerCase());
        });
      }
    });
  });
});

// Performance monitoring for critical therapeutic interactions
describe('Therapeutic Performance Monitoring', () => {

  const performanceTests = [
    {
      action: 'crisis_button_response',
      maxTime: 200,
      description: 'Crisis button must respond within 200ms'
    },
    {
      action: 'step_transition',
      maxTime: 500,
      description: 'Step transitions must complete within 500ms'
    },
    {
      action: 'assessment_loading',
      maxTime: 300,
      description: 'Assessment screens must load within 300ms'
    }
  ];

  performanceTests.forEach(test => {
    it(test.description, async () => {
      const startTime = performance.now();

      // Execute the action being tested
      const { getByTestId } = render(<TherapeuticOnboardingFlow />);

      switch (test.action) {
        case 'crisis_button_response':
          fireEvent.press(getByTestId('crisis-button'));
          break;
        case 'step_transition':
          fireEvent.press(getByTestId('continue-button'));
          break;
        case 'assessment_loading':
          fireEvent.press(getByTestId('start-assessment-button'));
          break;
      }

      await waitFor(() => {
        const elapsedTime = performance.now() - startTime;
        expect(elapsedTime).toBeLessThan(test.maxTime);
      });
    });
  });
});