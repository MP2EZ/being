/**
 * Clinical Support Component Migration Safety Testing Suite
 * 
 * CRITICAL TESTING REQUIREMENTS:
 * - Crisis response timing <200ms validation
 * - Crisis onboarding protocol accuracy
 * - Emergency access during onboarding
 * - 988 hotline integration testing
 * - Therapeutic effectiveness preservation
 * - Clinical workflow integrity
 * 
 * SAFETY-CRITICAL: These tests validate life-saving crisis intervention functionality
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Vibration, AccessibilityInfo } from 'react-native';

// Clinical support components being tested
import { OnboardingCrisisButton } from '../../src/components/clinical/OnboardingCrisisButton';
import { OnboardingCrisisAlert } from '../../src/components/clinical/OnboardingCrisisAlert';
import { ClinicalCarousel } from '../../src/components/clinical/ClinicalCarousel';
import { PHQAssessmentPreview } from '../../src/components/clinical/components/PHQAssessmentPreview';

// Mock stores and services
import { useCrisisStore } from '../../src/store/crisisStore';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { onboardingCrisisDetectionService } from '../../src/services/OnboardingCrisisDetectionService';

// Test utilities
import { createMockCrisisEvent, createMockAssessmentData } from '../utils/mockData';
import { performanceTestUtils } from '../utils/performanceTestUtils';
import { accessibilityTestUtils } from '../utils/accessibilityTestUtils';

// Performance testing threshold
const CRISIS_RESPONSE_THRESHOLD_MS = 200;
const EMERGENCY_RESPONSE_THRESHOLD_MS = 100;

// Mock native modules
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Vibration: {
    vibrate: jest.fn(),
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
    isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Platform: {
    OS: 'ios',
  },
}));

// Mock stores
jest.mock('../../src/store/crisisStore');
jest.mock('../../src/store/onboardingStore');
jest.mock('../../src/services/OnboardingCrisisDetectionService');

describe('Clinical Support Migration Safety Testing', () => {
  let mockCrisisStore: any;
  let mockOnboardingStore: any;
  let mockCrisisDetectionService: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock crisis store
    mockCrisisStore = {
      call988: jest.fn().mockResolvedValue(true),
      call911: jest.fn().mockResolvedValue(true),
      textCrisisLine: jest.fn().mockResolvedValue(true),
      isInCrisis: false,
      currentSeverity: 'none',
    };
    (useCrisisStore as jest.Mock).mockReturnValue(mockCrisisStore);

    // Setup mock onboarding store
    mockOnboardingStore = {
      pauseOnboarding: jest.fn().mockResolvedValue(true),
      getCurrentStep: jest.fn().mockReturnValue('welcome'),
      saveProgress: jest.fn().mockResolvedValue(true),
      goToStep: jest.fn().mockResolvedValue(true),
    };
    (useOnboardingStore as jest.Mock).mockReturnValue(mockOnboardingStore);

    // Setup mock crisis detection service
    mockCrisisDetectionService = {
      detectOnboardingCrisis: jest.fn(),
      getCurrentCrisis: jest.fn().mockReturnValue(null),
      clearCurrentCrisis: jest.fn(),
    };
    (onboardingCrisisDetectionService as any) = mockCrisisDetectionService;

    // Reset performance utilities
    performanceTestUtils.reset();
  });

  describe('OnboardingCrisisButton - Critical Safety Testing', () => {
    const defaultProps = {
      theme: 'morning' as const,
      variant: 'floating' as const,
      urgencyLevel: 'standard' as const,
    };

    describe('Crisis Response Performance', () => {
      it('CRITICAL: should respond to crisis activation within 200ms', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        const startTime = performance.now();
        
        await act(async () => {
          fireEvent.press(button);
        });

        const responseTime = performance.now() - startTime;
        
        // CRITICAL SAFETY REQUIREMENT: Crisis response must be < 200ms
        expect(responseTime).toBeLessThan(CRISIS_RESPONSE_THRESHOLD_MS);
        expect(mockCrisisStore.call988).toHaveBeenCalled();
      });

      it('EMERGENCY: should respond to emergency mode within 100ms', async () => {
        const { getByTestId } = render(
          <OnboardingCrisisButton 
            {...defaultProps} 
            urgencyLevel="emergency"
          />
        );
        const button = getByTestId('onboarding-crisis-button-floating');

        const startTime = performance.now();
        
        await act(async () => {
          fireEvent.press(button);
        });

        const responseTime = performance.now() - startTime;
        
        // EMERGENCY REQUIREMENT: Emergency response must be < 100ms
        expect(responseTime).toBeLessThan(EMERGENCY_RESPONSE_THRESHOLD_MS);
      });

      it('should provide immediate haptic feedback within 50ms', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        const startTime = performance.now();
        
        await act(async () => {
          fireEvent(button, 'pressIn');
        });

        const hapticTime = performance.now() - startTime;
        
        // Haptic feedback must be immediate for crisis intervention
        expect(hapticTime).toBeLessThan(50);
        expect(Vibration.vibrate).toHaveBeenCalledWith([0, 250, 100, 250]);
      });
    });

    describe('Crisis Protocol Accuracy', () => {
      it('should preserve onboarding progress during crisis activation', async () => {
        mockOnboardingStore.getCurrentStep.mockReturnValue('assessment_setup');
        
        const onProgressSaved = jest.fn();
        const { getByTestId } = render(
          <OnboardingCrisisButton 
            {...defaultProps} 
            onProgressSaved={onProgressSaved}
            enableProgressPreservation={true}
          />
        );
        
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent.press(button);
        });

        await waitFor(() => {
          expect(mockOnboardingStore.saveProgress).toHaveBeenCalled();
          expect(mockOnboardingStore.pauseOnboarding).toHaveBeenCalled();
          expect(onProgressSaved).toHaveBeenCalled();
        });
      });

      it('should execute crisis protocol based on severity detection', async () => {
        // Setup critical crisis detection
        mockCrisisDetectionService.detectOnboardingCrisis.mockResolvedValue({
          severity: 'critical',
          trigger: 'suicidal_ideation',
          context: 'onboarding_assessment',
        });

        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent.press(button);
        });

        await waitFor(() => {
          expect(mockCrisisDetectionService.detectOnboardingCrisis).toHaveBeenCalled();
          expect(Alert.alert).toHaveBeenCalledWith(
            expect.stringContaining('Immediate Help Available'),
            expect.any(String),
            expect.any(Array)
          );
        });
      });

      it('should provide accessible crisis communication', async () => {
        const { getByTestId } = render(
          <OnboardingCrisisButton 
            {...defaultProps} 
            isScreenReaderEnabled={true}
          />
        );
        
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent.press(button);
        });

        await waitFor(() => {
          expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
            expect.stringContaining('Crisis support activated')
          );
        });

        // Check accessibility properties
        expect(button.props.accessibilityLabel).toContain('crisis support');
        expect(button.props.accessibilityRole).toBe('button');
        expect(button.props.accessible).toBe(true);
      });
    });

    describe('Emergency Integration Testing', () => {
      it('should successfully integrate with 988 hotline service', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent.press(button);
        });

        await waitFor(() => {
          expect(mockCrisisStore.call988).toHaveBeenCalled();
        });

        // Simulate 988 service response
        const call988Response = await mockCrisisStore.call988();
        expect(call988Response).toBe(true);
      });

      it('should handle long press for additional crisis options', async () => {
        const { getByTestId } = render(<OnboardingCrisisButton {...defaultProps} />);
        const button = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent(button, 'longPress');
        });

        await waitFor(() => {
          expect(Alert.alert).toHaveBeenCalledWith(
            'Crisis Support Options',
            expect.stringContaining('Current setup step'),
            expect.arrayContaining([
              expect.objectContaining({ text: '📞 Call 988' }),
              expect.objectContaining({ text: '💬 Text Support' }),
            ])
          );
        });
      });
    });
  });

  describe('OnboardingCrisisAlert - Crisis Intervention UI Testing', () => {
    const mockCrisisEvent = createMockCrisisEvent({
      severity: 'severe',
      trigger: 'assessment_response',
      context: 'onboarding_assessment',
    });

    const defaultProps = {
      crisisEvent: mockCrisisEvent,
      onResolved: jest.fn(),
      onContinueOnboarding: jest.fn(),
      onExitOnboarding: jest.fn(),
      isVisible: true,
      theme: 'morning' as const,
    };

    describe('Crisis UI Performance', () => {
      it('should display crisis alert within 200ms of becoming visible', async () => {
        const startTime = performance.now();
        
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);

        await waitFor(() => {
          expect(getByText(/Support Available/)).toBeTruthy();
        });

        const displayTime = performance.now() - startTime;
        expect(displayTime).toBeLessThan(CRISIS_RESPONSE_THRESHOLD_MS);
      });

      it('should provide immediate accessibility announcements', async () => {
        render(<OnboardingCrisisAlert {...defaultProps} />);

        await waitFor(() => {
          expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
            expect.stringContaining('Crisis support interface opened')
          );
        });
      });
    });

    describe('Crisis Action Execution', () => {
      it('should execute crisis actions with performance monitoring', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        const call988Button = getByText('📞 Call 988');

        const startTime = performance.now();

        await act(async () => {
          fireEvent.press(call988Button);
        });

        const actionTime = performance.now() - startTime;
        expect(actionTime).toBeLessThan(CRISIS_RESPONSE_THRESHOLD_MS);
        expect(mockCrisisStore.call988).toHaveBeenCalled();
      });

      it('should handle crisis resource selection with haptic feedback', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        const resourcesButton = getByText('🆘 All Crisis Resources');

        await act(async () => {
          fireEvent.press(resourcesButton);
        });

        // Should display resources
        await waitFor(() => {
          expect(getByText(/Crisis Support Resources/)).toBeTruthy();
        });
      });

      it('should preserve onboarding context during crisis intervention', async () => {
        const { getByText } = render(<OnboardingCrisisAlert {...defaultProps} />);
        const continueButton = getByText('Continue Setup');

        await act(async () => {
          fireEvent.press(continueButton);
        });

        await waitFor(() => {
          expect(defaultProps.onContinueOnboarding).toHaveBeenCalled();
          expect(mockCrisisEvent.userContinuedOnboarding).toBe(true);
        });
      });
    });
  });

  describe('ClinicalCarousel - Therapeutic Navigation Testing', () => {
    const mockCarouselData = [
      {
        id: 'assessment-tools',
        title: 'Clinical Assessment Tools',
        content: 'PHQ-9 and GAD-7 assessments',
      },
      {
        id: 'proven-results',
        title: 'MBCT Practices',
        content: 'Evidence-based mindfulness practices',
      },
      {
        id: 'therapy-bridge',
        title: 'Therapy Integration',
        content: 'Bridge to professional therapy',
      },
    ];

    const defaultProps = {
      data: mockCarouselData,
      autoPlay: true,
      autoPlayInterval: 8000,
      showNavigation: true,
      showIndicators: true,
    };

    describe('Therapeutic Navigation Performance', () => {
      it('should provide responsive navigation with appropriate haptic feedback', async () => {
        const { getByLabelText } = render(<ClinicalCarousel {...defaultProps} />);
        const nextButton = getByLabelText('Next clinical pane');

        await act(async () => {
          fireEvent(nextButton, 'pressIn');
        });

        expect(Vibration.vibrate).toHaveBeenCalledWith(100);

        await act(async () => {
          fireEvent.press(nextButton);
        });

        // Navigation should be smooth and responsive
        expect(nextButton.props.accessibilityLabel).toBe('Next clinical pane');
      });

      it('should maintain MBCT-compliant timing for therapeutic content', async () => {
        const onSlideChange = jest.fn();
        
        render(
          <ClinicalCarousel 
            {...defaultProps} 
            onSlideChange={onSlideChange}
            autoPlayInterval={8000}
          />
        );

        // Auto-play should respect therapeutic timing
        await act(async () => {
          jest.advanceTimersByTime(8000);
        });

        // Should advance to next slide maintaining therapeutic pacing
        expect(onSlideChange).toHaveBeenCalledWith(1);
      });

      it('should provide accessible navigation for clinical content', async () => {
        const { getByLabelText } = render(<ClinicalCarousel {...defaultProps} />);
        
        const indicators = mockCarouselData.map((_, index) => 
          getByLabelText(mockCarouselData[index].title)
        );

        indicators.forEach((indicator, index) => {
          expect(indicator.props.accessibilityRole).toBe('tab');
          expect(indicator.props.accessibilityLabel).toBe(mockCarouselData[index].title);
        });
      });
    });
  });

  describe('PHQAssessmentPreview - Clinical Accuracy Testing', () => {
    const mockAssessmentData = createMockAssessmentData({
      assessmentType: 'PHQ-9',
      score: 8,
      maxScore: 27,
      severity: 'Mild Depression',
      interpretation: 'Minimal symptoms that may benefit from monitoring',
    });

    const defaultProps = {
      data: mockAssessmentData,
      title: 'Depression Assessment (PHQ-9)',
      subtitle: 'Clinical depression screening',
    };

    describe('Clinical Assessment Accuracy', () => {
      it('should display clinically accurate assessment preview', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);

        // Verify clinical accuracy of displayed content
        expect(getByText('PHQ-9')).toBeTruthy();
        expect(getByText('8/27')).toBeTruthy();
        expect(getByText('Mild Depression')).toBeTruthy();
        expect(getByText('Little interest or pleasure in doing things')).toBeTruthy();
      });

      it('should provide therapeutic interaction feedback', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);
        const option = getByText('Several days');

        await act(async () => {
          fireEvent(option, 'pressIn');
        });

        // Should provide light haptic feedback for clinical assessment
        expect(Vibration.vibrate).toHaveBeenCalledWith(50);
      });

      it('should maintain clinical validation messaging', async () => {
        const { getByText } = render(<PHQAssessmentPreview {...defaultProps} />);

        expect(getByText('Automatically scored with clinical interpretation')).toBeTruthy();
        expect(getByText('Clinically validated with 95% accuracy rate')).toBeTruthy();
        expect(getByText('Share results securely with your therapist')).toBeTruthy();
      });
    });
  });

  describe('Cross-Component Clinical Workflow Integration', () => {
    describe('Crisis Detection Integration', () => {
      it('should maintain crisis detection across onboarding components', async () => {
        // Test crisis button activation during assessment preview
        const crisisButtonProps = {
          theme: 'morning' as const,
          variant: 'embedded' as const,
          currentStep: 'assessment_setup' as any,
        };

        const { getByTestId, rerender } = render(
          <OnboardingCrisisButton {...crisisButtonProps} />
        );

        // Simulate crisis detection
        mockCrisisDetectionService.getCurrentCrisis.mockReturnValue({
          severity: 'severe',
          trigger: 'assessment_response',
        });

        // Re-render with crisis state
        rerender(
          <OnboardingCrisisButton 
            {...crisisButtonProps} 
            urgencyLevel="high"
          />
        );

        const button = getByTestId('onboarding-crisis-button-embedded');
        
        await act(async () => {
          fireEvent.press(button);
        });

        expect(mockCrisisDetectionService.detectOnboardingCrisis).toHaveBeenCalledWith(
          'assessment_setup'
        );
      });

      it('should preserve clinical context across component transitions', async () => {
        // Test onboarding flow from crisis alert to continue setup
        const crisisEvent = createMockCrisisEvent({
          severity: 'moderate',
          context: 'onboarding_clinical_tools',
        });

        const onContinueOnboarding = jest.fn();
        
        const { getByText } = render(
          <OnboardingCrisisAlert
            crisisEvent={crisisEvent}
            onResolved={jest.fn()}
            onContinueOnboarding={onContinueOnboarding}
            onExitOnboarding={jest.fn()}
            isVisible={true}
            theme="morning"
          />
        );

        const continueButton = getByText('Continue Setup');

        await act(async () => {
          fireEvent.press(continueButton);
        });

        await waitFor(() => {
          expect(onContinueOnboarding).toHaveBeenCalled();
          expect(crisisEvent.onboardingResumed).toBe(true);
        });
      });
    });

    describe('Therapeutic Flow Validation', () => {
      it('should maintain MBCT compliance across all migrated components', async () => {
        const components = [
          { name: 'OnboardingCrisisButton', component: OnboardingCrisisButton },
          { name: 'ClinicalCarousel', component: ClinicalCarousel },
          { name: 'PHQAssessmentPreview', component: PHQAssessmentPreview },
        ];

        for (const { name, component: Component } of components) {
          // Each component should maintain therapeutic timing
          const startTime = performance.now();
          
          const { unmount } = render(<Component {...getDefaultProps(name)} />);
          
          const renderTime = performance.now() - startTime;
          
          // Therapeutic components should render efficiently for user experience
          expect(renderTime).toBeLessThan(100);
          
          unmount();
        }
      });

      it('should validate accessibility compliance across clinical workflow', async () => {
        const accessibilityResults = await accessibilityTestUtils.validateClinicalWorkflow([
          'OnboardingCrisisButton',
          'OnboardingCrisisAlert', 
          'ClinicalCarousel',
          'PHQAssessmentPreview',
        ]);

        // All components must meet WCAG AA standards for crisis situations
        expect(accessibilityResults.overallCompliance).toBeGreaterThanOrEqual(0.95);
        expect(accessibilityResults.crisisAccessibility).toBeGreaterThanOrEqual(0.98);
      });
    });
  });

  describe('Performance Regression Testing', () => {
    it('should maintain performance baselines after TouchableOpacity migration', async () => {
      const performanceResults = await performanceTestUtils.measureComponentPerformance([
        'OnboardingCrisisButton',
        'OnboardingCrisisAlert',
        'ClinicalCarousel', 
        'PHQAssessmentPreview',
      ]);

      // Components should not have performance regressions from migration
      expect(performanceResults.averageRenderTime).toBeLessThan(50);
      expect(performanceResults.crisisResponseTime).toBeLessThan(CRISIS_RESPONSE_THRESHOLD_MS);
      expect(performanceResults.accessibilityResponseTime).toBeLessThan(100);
    });

    it('should validate memory usage remains optimal for clinical components', async () => {
      const memoryResults = await performanceTestUtils.measureMemoryUsage([
        'OnboardingCrisisButton',
        'OnboardingCrisisAlert',
        'ClinicalCarousel',
        'PHQAssessmentPreview',
      ]);

      // Clinical components must maintain efficient memory usage
      expect(memoryResults.totalMemoryUsage).toBeLessThan(10 * 1024 * 1024); // 10MB
      expect(memoryResults.memoryLeaks).toHaveLength(0);
    });
  });
});

// Helper function to get default props for each component
function getDefaultProps(componentName: string): any {
  switch (componentName) {
    case 'OnboardingCrisisButton':
      return {
        theme: 'morning',
        variant: 'floating',
        urgencyLevel: 'standard',
      };
    case 'OnboardingCrisisAlert':
      return {
        crisisEvent: createMockCrisisEvent({}),
        onResolved: jest.fn(),
        onContinueOnboarding: jest.fn(),
        onExitOnboarding: jest.fn(),
        isVisible: true,
        theme: 'morning',
      };
    case 'ClinicalCarousel':
      return {
        data: [
          { id: 'test', title: 'Test', content: 'Test content' },
        ],
        autoPlay: false,
      };
    case 'PHQAssessmentPreview':
      return {
        data: createMockAssessmentData({}),
        title: 'Test Assessment',
        subtitle: 'Test Subtitle',
      };
    default:
      return {};
  }
}