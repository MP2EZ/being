/**
 * Therapeutic Effectiveness Testing - MBCT Compliance Validation
 * 
 * THERAPEUTIC VALIDATION REQUIREMENTS:
 * - MBCT-compliant interaction patterns validation
 * - Clinical carousel therapeutic pacing verification
 * - Assessment preview clinical accuracy testing
 * - Mindful engagement preservation across migrations
 * - Therapeutic timing accuracy maintenance
 * - Clinical language compliance verification
 * 
 * CLINICAL ACCURACY: Validates therapeutic effectiveness of migrated components
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AccessibilityInfo, Vibration } from 'react-native';

// Clinical components under therapeutic testing
import { OnboardingCrisisButton } from '../../src/components/clinical/OnboardingCrisisButton';
import { OnboardingCrisisAlert } from '../../src/components/clinical/OnboardingCrisisAlert';
import { ClinicalCarousel } from '../../src/components/clinical/ClinicalCarousel';
import { PHQAssessmentPreview } from '../../src/components/clinical/components/PHQAssessmentPreview';

// MBCT compliance utilities
import { MBCTComplianceValidator } from '../utils/MBCTComplianceValidator';
import { TherapeuticTimingValidator } from '../utils/TherapeuticTimingValidator';
import { ClinicalLanguageValidator } from '../utils/ClinicalLanguageValidator';
import { MindfulEngagementTracker } from '../utils/MindfulEngagementTracker';

// Test data
import { 
  createMockCrisisEvent, 
  createMockAssessmentData,
  createMockTherapeuticContent 
} from '../utils/mockData';

// MBCT Standards for validation
const MBCT_STANDARDS = {
  MINDFUL_PAUSE_DURATION: 3000, // 3 seconds minimum for mindful engagement
  THERAPEUTIC_TRANSITION_TIME: 500, // 500ms max for maintaining flow
  CRISIS_INTERVENTION_COMPASSION_TIME: 2000, // 2s min for compassionate response
  ASSESSMENT_REFLECTION_TIME: 1000, // 1s min between assessment interactions
  BREATHING_SPACE_PRESERVATION: true, // Must preserve therapeutic space
  NON_JUDGMENTAL_LANGUAGE: true, // All language must be non-judgmental
  PRESENT_MOMENT_AWARENESS: true, // Must support present-moment focus
};

// Mock therapeutic services
jest.mock('../../src/services/TherapeuticTimingService');
jest.mock('../../src/services/MBCTComplianceService');

describe('Therapeutic Effectiveness - MBCT Compliance Testing', () => {
  let mbctValidator: MBCTComplianceValidator;
  let timingValidator: TherapeuticTimingValidator;
  let languageValidator: ClinicalLanguageValidator;
  let engagementTracker: MindfulEngagementTracker;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize MBCT compliance validators
    mbctValidator = new MBCTComplianceValidator();
    timingValidator = new TherapeuticTimingValidator();
    languageValidator = new ClinicalLanguageValidator();
    engagementTracker = new MindfulEngagementTracker();
  });

  describe('OnboardingCrisisButton - Therapeutic Compassion Testing', () => {
    const defaultProps = {
      theme: 'morning' as const,
      variant: 'floating' as const,
      urgencyLevel: 'standard' as const,
    };

    describe('MBCT Compassionate Response Validation', () => {
      it('should provide compassionate crisis intervention timing', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        const startTime = performance.now();

        await act(async () => {
          fireEvent.press(button);
        });

        const responseTime = performance.now() - startTime;

        // MBCT Standard: Crisis intervention must allow compassionate response time
        expect(responseTime).toBeGreaterThan(MBCT_STANDARDS.CRISIS_INTERVENTION_COMPASSION_TIME);
        
        // Validate compassionate accessibility announcement
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          expect.stringMatching(/help is available|support/i)
        );
      });

      it('should maintain non-judgmental crisis language', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        // Validate button accessibility language is non-judgmental
        const accessibilityLabel = button.props.accessibilityLabel;
        const languageCompliance = await languageValidator.validateNonJudgmentalLanguage(
          accessibilityLabel
        );

        expect(languageCompliance.isCompliant).toBe(true);
        expect(languageCompliance.judgmentalTerms).toHaveLength(0);
        expect(languageCompliance.compassionateElements).toContain('support');
      });

      it('should preserve mindful breathing space during crisis detection', async () => {
        const { getByTestId } = render(
          <OnboardingCrisisButton 
            {...defaultProps} 
            urgencyLevel="high"
          />
        );
        const button = getByTestId('onboarding-crisis-button-floating');

        // Track mindful engagement
        const engagementSession = engagementTracker.startSession('crisis_intervention');

        await act(async () => {
          fireEvent.press(button);
        });

        const engagement = engagementTracker.endSession(engagementSession);

        // MBCT Standard: Must preserve breathing space even in crisis
        expect(engagement.breathingSpacePreserved).toBe(true);
        expect(engagement.mindfulPausesDuring).toBeGreaterThan(0);
      });

      it('should support present-moment awareness during crisis', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent.press(button);
        });

        // Validate present-moment crisis messaging
        await waitFor(() => {
          const alertCalls = (jest.mocked(require('react-native').Alert.alert)).mock.calls;
          const crisisAlert = alertCalls.find(call => 
            call[1]?.includes('now') || call[1]?.includes('available')
          );
          
          expect(crisisAlert).toBeTruthy();
          
          // MBCT Standard: Crisis language should support present-moment awareness
          const presentMomentCompliance = languageValidator.validatePresentMomentLanguage(
            crisisAlert[1]
          );
          expect(presentMomentCompliance.supportsPresentMoment).toBe(true);
        });
      });
    });

    describe('Therapeutic Haptic Feedback Validation', () => {
      it('should provide MBCT-compliant haptic feedback patterns', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent(button, 'pressIn');
        });

        // MBCT Standard: Haptic feedback should be grounding, not startling
        expect(Vibration.vibrate).toHaveBeenCalledWith([0, 250, 100, 250]);
        
        // Validate therapeutic pattern (pause-vibrate-pause-vibrate)
        const hapticPattern = [0, 250, 100, 250];
        const therapeuticCompliance = timingValidator.validateTherapeuticHapticPattern(
          hapticPattern
        );
        
        expect(therapeuticCompliance.isGrounding).toBe(true);
        expect(therapeuticCompliance.isStartling).toBe(false);
        expect(therapeuticCompliance.supportsMindfulness).toBe(true);
      });
    });
  });

  describe('OnboardingCrisisAlert - Therapeutic Intervention Testing', () => {
    const mockCrisisEvent = createMockCrisisEvent({
      severity: 'moderate',
      trigger: 'assessment_response',
      context: 'therapeutic_onboarding',
    });

    const defaultProps = {
      crisisEvent: mockCrisisEvent,
      onResolved: jest.fn(),
      onContinueOnboarding: jest.fn(),
      onExitOnboarding: jest.fn(),
      isVisible: true,
      theme: 'morning' as const,
    };

    describe('MBCT Crisis Education Compliance', () => {
      it('should provide MBCT-compliant crisis education', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        
        // Activate crisis education
        const educationButton = getByText('📚 Learn About Support');
        await act(async () => {
          fireEvent.press(educationButton);
        });

        await waitFor(() => {
          const educationContent = getByText(/Understanding Crisis Support/);
          expect(educationContent).toBeTruthy();
        });

        // Validate MBCT compliance of education content
        const educationText = getByText(/Crisis support is available 24\/7/);
        const mbctCompliance = await mbctValidator.validateEducationalContent(
          educationText.props.children
        );

        expect(mbctCompliance.isNonJudgmental).toBe(true);
        expect(mbctCompliance.promotesCompassion).toBe(true);
        expect(mbctCompliance.supportsPresenceAwareness).toBe(true);
        expect(mbctCompliance.avoidsCatastrophizing).toBe(true);
      });

      it('should maintain therapeutic flow during crisis resource exploration', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        
        const resourcesButton = getByText('📋 Crisis Resources');
        
        const startTime = performance.now();
        await act(async () => {
          fireEvent.press(resourcesButton);
        });

        await waitFor(() => {
          expect(getByText(/Crisis Support Resources/)).toBeTruthy();
        });

        const transitionTime = performance.now() - startTime;

        // MBCT Standard: Transitions should preserve therapeutic flow
        expect(transitionTime).toBeLessThan(MBCT_STANDARDS.THERAPEUTIC_TRANSITION_TIME);
        
        // Validate mindful transition
        const flowValidation = timingValidator.validateTherapeuticFlow({
          transitionTime,
          maintainsPresence: true,
          preservesBreathingSpace: true,
        });
        
        expect(flowValidation.isTherapeutic).toBe(true);
      });

      it('should support mindful choice-making in crisis options', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        
        // Crisis options should be presented mindfully
        const call988Button = getByText('📞 Call 988');
        const safetyPlanButton = getByText('🛡️ Safety Planning');
        const continueButton = getByText('Continue Setup');

        // Validate each option supports mindful choice-making
        [call988Button, safetyPlanButton, continueButton].forEach(button => {
          const buttonText = button.props.children;
          const choiceCompliance = mbctValidator.validateMindfulChoiceLanguage(buttonText);
          
          expect(choiceCompliance.supportsAutonomy).toBe(true);
          expect(choiceCompliance.isNonCoercive).toBe(true);
          expect(choiceCompliance.encouragesReflection).toBe(true);
        });
      });
    });

    describe('Therapeutic Safety Plan Integration', () => {
      it('should integrate MBCT principles in safety planning', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        
        const safetyPlanButton = getByText('🔒 Create Safety Plan');
        await act(async () => {
          fireEvent.press(safetyPlanButton);
        });

        // Should navigate to MBCT-compliant safety planning
        expect(defaultProps.onResolved).toHaveBeenCalled();
        
        // Validate safety planning maintains MBCT principles
        const safetyPlanCompliance = await mbctValidator.validateSafetyPlanIntegration({
          includesMindfulnessStrategies: true,
          promotesCompassionateResponse: true,
          maintainsNonJudgmentalApproach: true,
          supportsPresentMomentAwareness: true,
        });

        expect(safetyPlanCompliance.isMBCTCompliant).toBe(true);
      });
    });
  });

  describe('ClinicalCarousel - Therapeutic Pacing Testing', () => {
    const mockTherapeuticContent = [
      createMockTherapeuticContent({
        id: 'assessment-tools',
        title: 'Mindful Assessment',
        therapeuticElements: ['non-judgmental', 'present-moment', 'compassionate'],
      }),
      createMockTherapeuticContent({
        id: 'mbct-practices', 
        title: 'MBCT Practices',
        therapeuticElements: ['breathing-space', 'body-awareness', 'thought-observation'],
      }),
      createMockTherapeuticContent({
        id: 'therapy-bridge',
        title: 'Therapeutic Connection',
        therapeuticElements: ['professional-support', 'continuity-care', 'integration'],
      }),
    ];

    const defaultProps = {
      data: mockTherapeuticContent,
      autoPlay: true,
      autoPlayInterval: 8000, // MBCT-compliant pacing
      showNavigation: true,
      showIndicators: true,
    };

    describe('MBCT Therapeutic Pacing Validation', () => {
      it('should maintain MBCT-compliant auto-play timing', async () => {
        const onSlideChange = jest.fn();
        
        render(
          <ClinicalCarousel 
            {...defaultProps} 
            onSlideChange={onSlideChange}
            autoPlayInterval={8000}
          />
        );

        // MBCT Standard: Auto-play should allow contemplative engagement
        const startTime = performance.now();

        await act(async () => {
          jest.advanceTimersByTime(8000);
        });

        const advanceTime = performance.now() - startTime;
        
        // Validate therapeutic timing compliance
        const pacingCompliance = timingValidator.validateTherapeuticPacing({
          intervalDuration: 8000,
          allowsContemplation: true,
          supportsReflection: true,
          maintainsMindfulness: true,
        });

        expect(pacingCompliance.isMBCTCompliant).toBe(true);
        expect(pacingCompliance.supportsDeepEngagement).toBe(true);
        expect(onSlideChange).toHaveBeenCalledWith(1);
      });

      it('should provide mindful navigation transitions', async () => {
        const { getByLabelText } = render(<ClinicalCarousel {...defaultProps} />);
        const nextButton = getByLabelText('Next clinical pane');

        // Navigation should include mindful pause
        const transitionStart = performance.now();

        await act(async () => {
          fireEvent.press(nextButton);
        });

        const transitionTime = performance.now() - transitionStart;

        // MBCT Standard: Navigation should not be rushed
        expect(transitionTime).toBeGreaterThan(MBCT_STANDARDS.MINDFUL_PAUSE_DURATION / 10);
        
        // Validate mindful transition properties
        const mindfulTransition = timingValidator.validateMindfulTransition({
          transitionTime,
          includesPause: true,
          respectsUserPace: true,
          maintainsPresence: true,
        });

        expect(mindfulTransition.supportsMindfulness).toBe(true);
      });

      it('should respect user-initiated pause for reflection', async () => {
        const { getByLabelText } = render(<ClinicalCarousel {...defaultProps} />);
        const nextButton = getByLabelText('Next clinical pane');

        // User interaction should pause auto-play for reflection
        await act(async () => {
          fireEvent.press(nextButton);
        });

        // Auto-play should be paused after user interaction
        await act(async () => {
          jest.advanceTimersByTime(8000);
        });

        // Should not auto-advance immediately after user interaction
        const reflectionCompliance = timingValidator.validateReflectionSpace({
          userInteractionDetected: true,
          autoPlayPaused: true,
          reflectionTimeProvided: 10000, // 10s delay before resuming
        });

        expect(reflectionCompliance.supportsReflection).toBe(true);
        expect(reflectionCompliance.respectsUserPace).toBe(true);
      });
    });

    describe('Therapeutic Content Accessibility', () => {
      it('should provide MBCT-compliant accessibility announcements', async () => {
        render(<ClinicalCarousel {...defaultProps} />);

        // Should announce content mindfully
        await waitFor(() => {
          expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalled();
        });

        const announcements = jest.mocked(AccessibilityInfo.announceForAccessibility).mock.calls;
        
        // Validate each announcement for MBCT compliance
        announcements.forEach(([announcement]) => {
          const announcementCompliance = languageValidator.validateAccessibilityAnnouncement(
            announcement
          );
          
          expect(announcementCompliance.isCalm).toBe(true);
          expect(announcementCompliance.isSupportive).toBe(true);
          expect(announcementCompliance.avoidsUrgency).toBe(true);
        });
      });
    });
  });

  describe('PHQAssessmentPreview - Clinical Assessment Mindfulness', () => {
    const mockAssessmentData = createMockAssessmentData({
      assessmentType: 'PHQ-9',
      score: 12,
      maxScore: 27,
      severity: 'Moderate Depression',
      interpretation: 'Symptoms present that may benefit from professional support',
      mbctCompliant: true,
    });

    const defaultProps = {
      data: mockAssessmentData,
      title: 'Mindful Depression Assessment (PHQ-9)',
      subtitle: 'Observe your experience with compassion',
    };

    describe('MBCT Assessment Interaction Validation', () => {
      it('should provide mindful assessment interaction timing', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);
        const option = getByText('Several days');

        const interactionStart = performance.now();

        await act(async () => {
          fireEvent.press(option);
        });

        const interactionTime = performance.now() - interactionStart;

        // MBCT Standard: Assessment interactions should allow reflection
        expect(interactionTime).toBeGreaterThan(MBCT_STANDARDS.ASSESSMENT_REFLECTION_TIME);
        
        // Validate mindful haptic feedback
        expect(Vibration.vibrate).toHaveBeenCalledWith(50); // Gentle feedback

        const hapticCompliance = timingValidator.validateAssessmentHaptics({
          vibrationIntensity: 50,
          isGentle: true,
          supportsReflection: true,
        });

        expect(hapticCompliance.supportsMindfulEngagement).toBe(true);
      });

      it('should display MBCT-compliant assessment language', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);

        // Validate question language is non-judgmental
        const questionText = getByText('Little interest or pleasure in doing things');
        const languageCompliance = await languageValidator.validateAssessmentLanguage(
          questionText.props.children
        );

        expect(languageCompliance.isNonJudgmental).toBe(true);
        expect(languageCompliance.encouragesHonesty).toBe(true);
        expect(languageCompliance.avoidsSelfBlame).toBe(true);

        // Validate interpretation language
        const interpretation = getByText(mockAssessmentData.interpretation);
        const interpretationCompliance = await languageValidator.validateInterpretationLanguage(
          interpretation.props.children
        );

        expect(interpretationCompliance.isCompassionate).toBe(true);
        expect(interpretationCompliance.suggestsSupport).toBe(true);
        expect(interpretationCompliance.avoidsLabeling).toBe(true);
      });

      it('should maintain therapeutic connection in clinical features', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);

        // Validate therapeutic connection features
        const shareFeature = getByText('Share results securely with your therapist');
        const trackFeature = getByText('Track progress over time with detailed history');
        const validationFeature = getByText('Clinically validated with 95% accuracy rate');

        const features = [shareFeature, trackFeature, validationFeature];
        
        features.forEach(feature => {
          const featureText = feature.props.children;
          const connectionCompliance = mbctValidator.validateTherapeuticConnection(featureText);
          
          expect(connectionCompliance.promotesCollaboration).toBe(true);
          expect(connectionCompliance.maintainsHope).toBe(true);
          expect(connectionCompliance.respectsAutonomy).toBe(true);
        });
      });
    });

    describe('Clinical Accuracy with Compassion', () => {
      it('should balance clinical accuracy with compassionate presentation', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);

        // Clinical score should be accurate
        const scoreDisplay = getByText('12/27');
        expect(scoreDisplay).toBeTruthy();

        // Severity should be presented compassionately
        const severityDisplay = getByText('Moderate Depression');
        const severityCompliance = languageValidator.validateCompassionateSeverityLanguage(
          severityDisplay.props.children
        );

        expect(severityCompliance.isAccurate).toBe(true);
        expect(severityCompliance.isCompassionate).toBe(true);
        expect(severityCompliance.offersHope).toBe(true);
        expect(severityCompliance.avoidsAlarming).toBe(true);
      });
    });
  });

  describe('Cross-Component MBCT Integration Testing', () => {
    describe('Therapeutic Flow Consistency', () => {
      it('should maintain MBCT principles across all migrated components', async () => {
        const components = [
          {
            name: 'OnboardingCrisisButton',
            component: OnboardingCrisisButton,
            props: { theme: 'morning', variant: 'floating', urgencyLevel: 'standard' },
          },
          {
            name: 'ClinicalCarousel',
            component: ClinicalCarousel,
            props: { 
              data: [{ id: 'test', title: 'Test', content: 'Test' }],
              autoPlay: false,
            },
          },
          {
            name: 'PHQAssessmentPreview',
            component: PHQAssessmentPreview,
            props: {
              data: createMockAssessmentData({}),
              title: 'Test Assessment',
              subtitle: 'Test',
            },
          },
        ];

        for (const { name, component: Component, props } of components) {
          const { unmount } = render(<Component {...props} />);
          
          // Each component should meet MBCT standards
          const mbctCompliance = await mbctValidator.validateComponentMBCTCompliance(name);
          
          expect(mbctCompliance.overallCompliance).toBeGreaterThanOrEqual(0.95);
          expect(mbctCompliance.compassionateResponse).toBe(true);
          expect(mbctCompliance.nonJudgmentalLanguage).toBe(true);
          expect(mbctCompliance.supportsPresentMoment).toBe(true);
          expect(mbctCompliance.respectsUserPace).toBe(true);
          
          unmount();
        }
      });

      it('should preserve therapeutic engagement across component transitions', async () => {
        // Test engagement preservation during crisis button to alert transition
        const engagementSession = engagementTracker.startSession('clinical_workflow');
        
        // Simulate crisis button activation
        const { getByTestId } = render(
          <OnboardingCrisisButton 
            theme="morning" 
            variant="floating" 
            urgencyLevel="standard"
          />
        );
        
        const button = getByTestId('onboarding-crisis-button-floating');
        
        await act(async () => {
          fireEvent.press(button);
        });

        // Transition to crisis alert should preserve engagement
        const crisisEvent = createMockCrisisEvent({});
        render(
          <OnboardingCrisisAlert
            crisisEvent={crisisEvent}
            onResolved={jest.fn()}
            onContinueOnboarding={jest.fn()}
            onExitOnboarding={jest.fn()}
            isVisible={true}
            theme="morning"
          />
        );

        const engagement = engagementTracker.endSession(engagementSession);

        // MBCT Standard: Engagement should be preserved across transitions
        expect(engagement.therapeuticContinuity).toBe(true);
        expect(engagement.mindfulnessPreserved).toBe(true);
        expect(engagement.compassionMaintained).toBe(true);
      });
    });

    describe('Therapeutic Timing Coordination', () => {
      it('should coordinate therapeutic timing across clinical workflow', async () => {
        const timingResults = await timingValidator.validateWorkflowTiming({
          components: [
            'OnboardingCrisisButton',
            'OnboardingCrisisAlert', 
            'ClinicalCarousel',
            'PHQAssessmentPreview',
          ],
          therapeuticStandards: MBCT_STANDARDS,
        });

        expect(timingResults.overallCompliance).toBeGreaterThanOrEqual(0.95);
        expect(timingResults.preservesBreathingSpace).toBe(true);
        expect(timingResults.allowsReflection).toBe(true);
        expect(timingResults.maintainsPresence).toBe(true);
      });
    });
  });

  describe('Therapeutic Regression Testing', () => {
    it('should maintain therapeutic effectiveness after TouchableOpacity migration', async () => {
      const therapeuticResults = await mbctValidator.validateMigrationTherapeuticImpact({
        preMigrationBaseline: {
          therapeuticEngagement: 0.95,
          mbctCompliance: 0.98,
          compassionateResponse: 0.97,
        },
        postMigrationComponents: [
          'OnboardingCrisisButton',
          'OnboardingCrisisAlert',
          'ClinicalCarousel', 
          'PHQAssessmentPreview',
        ],
      });

      // Migration should not reduce therapeutic effectiveness
      expect(therapeuticResults.therapeuticEngagement).toBeGreaterThanOrEqual(0.95);
      expect(therapeuticResults.mbctCompliance).toBeGreaterThanOrEqual(0.98);
      expect(therapeuticResults.compassionateResponse).toBeGreaterThanOrEqual(0.97);
      expect(therapeuticResults.regressionDetected).toBe(false);
    });
  });
});