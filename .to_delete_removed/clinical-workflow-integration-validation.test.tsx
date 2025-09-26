/**
 * Clinical Workflow Integration Validation Testing Suite
 * 
 * WORKFLOW INTEGRATION REQUIREMENTS:
 * - Onboarding to crisis transition testing
 * - Clinical tool access workflow validation
 * - MBCT practice engagement testing  
 * - Cross-component clinical integration
 * - Therapeutic state preservation across transitions
 * - Crisis detection integration across components
 * 
 * CLINICAL INTEGRITY: Validates seamless therapeutic workflow across migrated components
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, AccessibilityInfo } from 'react-native';

// Clinical workflow components
import { OnboardingCrisisButton } from '../../src/components/clinical/OnboardingCrisisButton';
import { OnboardingCrisisAlert } from '../../src/components/clinical/OnboardingCrisisAlert';
import { ClinicalCarousel } from '../../src/components/clinical/ClinicalCarousel';
import { PHQAssessmentPreview } from '../../src/components/clinical/components/PHQAssessmentPreview';

// Clinical workflow services
import { ClinicalWorkflowOrchestrator } from '../../src/services/ClinicalWorkflowOrchestrator';
import { TherapeuticStateManager } from '../../src/services/TherapeuticStateManager';
import { CrisisWorkflowIntegrator } from '../../src/services/CrisisWorkflowIntegrator';
import { MBCTWorkflowValidator } from '../../src/services/MBCTWorkflowValidator';

// Stores
import { useCrisisStore } from '../../src/store/crisisStore';
import { useOnboardingStore } from '../../src/store/onboardingStore';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useTherapeuticStateStore } from '../../src/store/therapeuticStateStore';

// Workflow testing utilities
import { WorkflowTestOrchestrator } from '../utils/WorkflowTestOrchestrator';
import { ClinicalIntegrationValidator } from '../utils/ClinicalIntegrationValidator';
import { TherapeuticContinuityValidator } from '../utils/TherapeuticContinuityValidator';
import { CrisisWorkflowValidator } from '../utils/CrisisWorkflowValidator';

// Test data
import { 
  createMockCrisisEvent,
  createMockAssessmentData,
  createMockOnboardingState,
  createMockTherapeuticSession 
} from '../utils/mockData';

// Clinical workflow standards
const CLINICAL_WORKFLOW_STANDARDS = {
  CRISIS_ESCALATION_TIME: 500, // ms max for crisis workflow escalation
  THERAPEUTIC_CONTINUITY_THRESHOLD: 0.95, // Minimum continuity across transitions
  ONBOARDING_PRESERVATION_RATE: 1.0, // Must preserve 100% of progress
  ASSESSMENT_INTEGRATION_ACCURACY: 1.0, // Perfect accuracy for clinical data
  MBCT_WORKFLOW_COMPLIANCE: 0.98, // Minimum MBCT compliance throughout
  CRISIS_DETECTION_RESPONSE_TIME: 200, // ms max for crisis detection response
};

// Mock clinical services
jest.mock('../../src/services/ClinicalWorkflowOrchestrator');
jest.mock('../../src/services/TherapeuticStateManager');
jest.mock('../../src/services/CrisisWorkflowIntegrator');
jest.mock('../../src/services/MBCTWorkflowValidator');

// Mock stores
jest.mock('../../src/store/crisisStore');
jest.mock('../../src/store/onboardingStore');
jest.mock('../../src/store/assessmentStore');
jest.mock('../../src/store/therapeuticStateStore');

describe('Clinical Workflow Integration Validation', () => {
  let workflowOrchestrator: WorkflowTestOrchestrator;
  let integrationValidator: ClinicalIntegrationValidator;
  let continuityValidator: TherapeuticContinuityValidator;
  let crisisWorkflowValidator: CrisisWorkflowValidator;

  // Mock store instances
  let mockCrisisStore: any;
  let mockOnboardingStore: any;
  let mockAssessmentStore: any;
  let mockTherapeuticStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize workflow testing utilities
    workflowOrchestrator = new WorkflowTestOrchestrator();
    integrationValidator = new ClinicalIntegrationValidator();
    continuityValidator = new TherapeuticContinuityValidator();
    crisisWorkflowValidator = new CrisisWorkflowValidator();

    // Setup mock stores with clinical state
    mockCrisisStore = {
      isInCrisis: false,
      currentSeverity: 'none',
      call988: jest.fn().mockResolvedValue(true),
      activateCrisisProtocol: jest.fn(),
      getCrisisHistory: jest.fn().mockReturnValue([]),
      updateCrisisState: jest.fn(),
    };
    (useCrisisStore as jest.Mock).mockReturnValue(mockCrisisStore);

    mockOnboardingStore = {
      currentStep: 'welcome',
      completedSteps: [],
      pauseOnboarding: jest.fn().mockResolvedValue(true),
      resumeOnboarding: jest.fn().mockResolvedValue(true),
      saveProgress: jest.fn().mockResolvedValue(true),
      getCurrentStep: jest.fn().mockReturnValue('welcome'),
      goToStep: jest.fn().mockResolvedValue(true),
      getProgress: jest.fn().mockReturnValue(0.3),
    };
    (useOnboardingStore as jest.Mock).mockReturnValue(mockOnboardingStore);

    mockAssessmentStore = {
      currentAssessment: null,
      assessmentResults: [],
      startAssessment: jest.fn(),
      submitAssessment: jest.fn().mockResolvedValue(true),
      getLatestResults: jest.fn(),
      detectCrisisThreshold: jest.fn(),
    };
    (useAssessmentStore as jest.Mock).mockReturnValue(mockAssessmentStore);

    mockTherapeuticStore = {
      currentSession: null,
      sessionHistory: [],
      startTherapeuticSession: jest.fn(),
      updateSessionState: jest.fn(),
      preserveTherapeuticContext: jest.fn(),
    };
    (useTherapeuticStateStore as jest.Mock).mockReturnValue(mockTherapeuticStore);
  });

  describe('Onboarding → Crisis Transition Integration', () => {
    describe('Crisis Button Activation During Onboarding', () => {
      it('should seamlessly transition from onboarding to crisis intervention', async () => {
        // Setup onboarding state
        mockOnboardingStore.currentStep = 'assessment_setup';
        mockOnboardingStore.getProgress.mockReturnValue(0.6);

        const { getByTestId, rerender } = render(
          <OnboardingCrisisButton 
            theme="morning"
            variant="floating"
            currentStep="assessment_setup"
            enableProgressPreservation={true}
          />
        );

        const crisisButton = getByTestId('onboarding-crisis-button-floating');

        // Start workflow timing
        const workflowStart = performance.now();

        // Activate crisis intervention
        await act(async () => {
          fireEvent.press(crisisButton);
        });

        // Verify workflow transition
        await waitFor(() => {
          expect(mockOnboardingStore.saveProgress).toHaveBeenCalled();
          expect(mockOnboardingStore.pauseOnboarding).toHaveBeenCalled();
        });

        const transitionTime = performance.now() - workflowStart;

        // Workflow integration validation
        const workflowValidation = await integrationValidator.validateOnboardingCrisisTransition({
          transitionTime,
          progressPreserved: true,
          onboardingPaused: true,
          crisisActivated: true,
        });

        expect(workflowValidation.isSeamless).toBe(true);
        expect(workflowValidation.preservesUserState).toBe(true);
        expect(workflowValidation.maintainsTherapeuticContext).toBe(true);
        expect(transitionTime).toBeLessThan(CLINICAL_WORKFLOW_STANDARDS.CRISIS_ESCALATION_TIME);
      });

      it('should maintain therapeutic state across crisis intervention', async () => {
        const therapeuticSession = createMockTherapeuticSession({
          sessionType: 'onboarding',
          currentPhase: 'assessment_introduction',
          therapeuticElements: ['safety_establishment', 'rapport_building'],
        });

        mockTherapeuticStore.currentSession = therapeuticSession;

        const { getByTestId } = render(
          <OnboardingCrisisButton 
            theme="morning"
            variant="floating"
            currentStep="assessment_setup"
          />
        );

        const crisisButton = getByTestId('onboarding-crisis-button-floating');

        await act(async () => {
          fireEvent.press(crisisButton);
        });

        // Verify therapeutic state preservation
        const stateValidation = await continuityValidator.validateTherapeuticStatePreservation({
          beforeCrisis: therapeuticSession,
          afterCrisisActivation: mockTherapeuticStore.currentSession,
        });

        expect(stateValidation.therapeuticContinuityMaintained).toBe(true);
        expect(stateValidation.contextPreserved).toBe(true);
        expect(stateValidation.rapportMaintained).toBe(true);
        expect(stateValidation.continuityScore).toBeGreaterThanOrEqual(
          CLINICAL_WORKFLOW_STANDARDS.THERAPEUTIC_CONTINUITY_THRESHOLD
        );
      });

      it('should handle crisis escalation during different onboarding phases', async () => {
        const onboardingPhases = [
          'welcome',
          'safety_planning_intro',
          'assessment_setup',
          'mbct_introduction',
          'therapeutic_goal_setting',
        ];

        for (const phase of onboardingPhases) {
          mockOnboardingStore.currentStep = phase;
          
          const { getByTestId, unmount } = render(
            <OnboardingCrisisButton 
              theme="morning"
              variant="floating"
              currentStep={phase as any}
            />
          );

          const crisisButton = getByTestId('onboarding-crisis-button-floating');

          await act(async () => {
            fireEvent.press(crisisButton);
          });

          // Validate phase-specific crisis handling
          const phaseValidation = await crisisWorkflowValidator.validatePhaseSpecificCrisisHandling(phase);

          expect(phaseValidation.handlesCrisisAppropriately).toBe(true);
          expect(phaseValidation.preservesPhaseContext).toBe(true);
          expect(phaseValidation.providesPhaseSpecificSupport).toBe(true);

          unmount();
        }
      });
    });

    describe('Crisis Alert Integration with Onboarding Flow', () => {
      it('should integrate crisis alert with onboarding continuation', async () => {
        const mockCrisisEvent = createMockCrisisEvent({
          severity: 'moderate',
          trigger: 'onboarding_assessment_response',
          context: 'assessment_setup',
          userOnboardingStep: 'assessment_setup',
        });

        const onContinueOnboarding = jest.fn();
        const { getByText } = render(
          <OnboardingCrisisAlert
            crisisEvent={mockCrisisEvent}
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

        // Verify onboarding integration
        await waitFor(() => {
          expect(onContinueOnboarding).toHaveBeenCalled();
          expect(mockCrisisEvent.userContinuedOnboarding).toBe(true);
          expect(mockCrisisEvent.onboardingResumed).toBe(true);
        });

        // Validate seamless onboarding resumption
        const resumptionValidation = await integrationValidator.validateOnboardingResumption({
          crisisEvent: mockCrisisEvent,
          onboardingResumed: true,
          contextPreserved: true,
        });

        expect(resumptionValidation.isSeamless).toBe(true);
        expect(resumptionValidation.preservesProgress).toBe(true);
        expect(resumptionValidation.maintainsTherapeuticFlow).toBe(true);
      });

      it('should handle safety planning integration during crisis intervention', async () => {
        const mockCrisisEvent = createMockCrisisEvent({
          severity: 'severe',
          trigger: 'safety_concern',
          context: 'onboarding_safety_planning',
        });

        const { getByText } = render(
          <OnboardingCrisisAlert
            crisisEvent={mockCrisisEvent}
            onResolved={jest.fn()}
            onContinueOnboarding={jest.fn()}
            onExitOnboarding={jest.fn()}
            isVisible={true}
            theme="morning"
          />
        );

        const safetyPlanButton = getByText('🔒 Create Safety Plan');

        await act(async () => {
          fireEvent.press(safetyPlanButton);
        });

        // Verify safety planning integration
        await waitFor(() => {
          expect(mockOnboardingStore.goToStep).toHaveBeenCalledWith('safety_planning');
        });

        const safetyIntegration = await integrationValidator.validateSafetyPlanningIntegration({
          crisisTriggered: true,
          safetyPlanningActivated: true,
          onboardingIntegrated: true,
        });

        expect(safetyIntegration.integratesSeamlessly).toBe(true);
        expect(safetyIntegration.preservesCrisisContext).toBe(true);
        expect(safetyIntegration.enhancesOnboardingFlow).toBe(true);
      });
    });
  });

  describe('Clinical Carousel → Assessment Integration', () => {
    describe('Therapeutic Content to Assessment Workflow', () => {
      it('should transition from clinical content to assessment workflow', async () => {
        const mockCarouselData = [
          {
            id: 'assessment-tools',
            title: 'Clinical Assessment Tools',
            content: 'Comprehensive mental health assessments',
            actionType: 'start_assessment',
            assessmentType: 'PHQ-9',
          },
          {
            id: 'mbct-practices',
            title: 'MBCT Practices',
            content: 'Mindfulness-based interventions',
          },
        ];

        const onSlideChange = jest.fn();
        const { getByLabelText } = render(
          <ClinicalCarousel
            data={mockCarouselData}
            autoPlay={false}
            onSlideChange={onSlideChange}
          />
        );

        // Navigate to assessment tools slide
        const nextButton = getByLabelText('Next clinical pane');
        await act(async () => {
          fireEvent.press(nextButton);
        });

        // Verify workflow integration
        await waitFor(() => {
          expect(onSlideChange).toHaveBeenCalledWith(1);
        });

        const carouselIntegration = await integrationValidator.validateCarouselAssessmentIntegration({
          currentSlide: 'assessment-tools',
          assessmentType: 'PHQ-9',
          workflowTransition: true,
        });

        expect(carouselIntegration.facilitatesAssessmentAccess).toBe(true);
        expect(carouselIntegration.maintainsTherapeuticContext).toBe(true);
        expect(carouselIntegration.preservesUserChoiceAutonomy).toBe(true);
      });

      it('should preserve MBCT practice context during assessment integration', async () => {
        const mockMBCTData = [
          {
            id: 'mbct-practices',
            title: 'Mindful Assessment Preparation',
            content: 'Preparing mindfully for self-assessment',
            mbctElements: ['present_moment_awareness', 'non_judgmental_observation'],
          },
        ];

        const { getByLabelText } = render(
          <ClinicalCarousel
            data={mockMBCTData}
            autoPlay={false}
            showNavigation={true}
          />
        );

        // Simulate MBCT practice engagement
        const therapeuticSession = createMockTherapeuticSession({
          sessionType: 'mbct_preparation',
          currentPhase: 'mindful_assessment_intro',
          mbctElements: ['present_moment_awareness', 'non_judgmental_observation'],
        });

        mockTherapeuticStore.currentSession = therapeuticSession;

        // Transition to assessment
        const assessmentValidation = await integrationValidator.validateMBCTAssessmentIntegration({
          mbctContext: therapeuticSession,
          assessmentPreparation: true,
          mindfulTransition: true,
        });

        expect(assessmentValidation.preservesMBCTContext).toBe(true);
        expect(assessmentValidation.enhancesAssessmentQuality).toBe(true);
        expect(assessmentValidation.maintainsTherapeuticIntegrity).toBe(true);
      });
    });

    describe('Assessment Preview Integration', () => {
      it('should integrate assessment preview with clinical workflow', async () => {
        const mockAssessmentData = createMockAssessmentData({
          assessmentType: 'PHQ-9',
          score: 8,
          maxScore: 27,
          severity: 'Mild Depression',
          interpretation: 'Minimal symptoms that may benefit from monitoring',
          workflowIntegration: {
            onboardingPhase: 'assessment_setup',
            therapeuticContext: 'initial_screening',
            nextSteps: ['continue_onboarding', 'consider_mbct_practices'],
          },
        });

        const { getByText } = render(
          <PHQAssessmentPreview
            data={mockAssessmentData}
            title="Depression Assessment (PHQ-9)"
            subtitle="Clinical screening integration"
          />
        );

        // Verify clinical integration elements
        const shareFeature = getByText('Share results securely with your therapist');
        const trackFeature = getByText('Track progress over time with detailed history');

        const integrationValidation = await integrationValidator.validateAssessmentWorkflowIntegration({
          assessmentData: mockAssessmentData,
          clinicalFeatures: ['share_results', 'track_progress', 'clinical_validation'],
          workflowContext: 'onboarding_assessment',
        });

        expect(integrationValidation.facilitatesClinicalWorkflow).toBe(true);
        expect(integrationValidation.supportsTherapeuticCollaboration).toBe(true);
        expect(integrationValidation.enhancesLongTermCare).toBe(true);
      });

      it('should handle crisis detection within assessment preview workflow', async () => {
        const mockCrisisAssessmentData = createMockAssessmentData({
          assessmentType: 'PHQ-9',
          score: 22,
          maxScore: 27,
          severity: 'Severe Depression',
          interpretation: 'Significant symptoms requiring immediate professional attention',
          crisisIndicators: ['suicidal_ideation', 'severe_depression'],
        });

        const { getByText } = render(
          <PHQAssessmentPreview
            data={mockCrisisAssessmentData}
            title="Depression Assessment (PHQ-9)"
            subtitle="Crisis detection integration"
          />
        );

        // Assessment should trigger crisis workflow integration
        const crisisIntegration = await crisisWorkflowValidator.validateAssessmentCrisisIntegration({
          assessmentScore: 22,
          crisisThreshold: 20,
          crisisIndicators: ['suicidal_ideation', 'severe_depression'],
          workflowActivated: true,
        });

        expect(crisisIntegration.detectsCrisisAccurately).toBe(true);
        expect(crisisIntegration.triggersWorkflowAppropriately).toBe(true);
        expect(crisisIntegration.preservesAssessmentContext).toBe(true);
        expect(crisisIntegration.responseTime).toBeLessThan(
          CLINICAL_WORKFLOW_STANDARDS.CRISIS_DETECTION_RESPONSE_TIME
        );
      });
    });
  });

  describe('Cross-Component Crisis Detection Integration', () => {
    describe('Crisis Detection Propagation', () => {
      it('should propagate crisis detection across all clinical components', async () => {
        // Simulate crisis detection in assessment
        const crisisAssessmentData = createMockAssessmentData({
          score: 24,
          crisisDetected: true,
          severity: 'Severe Depression',
        });

        mockAssessmentStore.detectCrisisThreshold.mockReturnValue({
          crisisDetected: true,
          severity: 'critical',
          recommendedAction: 'immediate_intervention',
        });

        // Test crisis propagation across components
        const components = [
          { name: 'OnboardingCrisisButton', component: OnboardingCrisisButton },
          { name: 'ClinicalCarousel', component: ClinicalCarousel },
          { name: 'PHQAssessmentPreview', component: PHQAssessmentPreview },
        ];

        for (const { name, component: Component } of components) {
          const { unmount } = render(<Component {...getComponentProps(name)} />);
          
          // Simulate crisis state update
          mockCrisisStore.isInCrisis = true;
          mockCrisisStore.currentSeverity = 'critical';

          const propagationValidation = await crisisWorkflowValidator.validateCrisisPropagation({
            component: name,
            crisisDetected: true,
            severity: 'critical',
          });

          expect(propagationValidation.detectsCrisisState).toBe(true);
          expect(propagationValidation.respondsAppropriately).toBe(true);
          expect(propagationValidation.maintainsWorkflow).toBe(true);
          
          unmount();
        }
      });

      it('should coordinate crisis response across component ecosystem', async () => {
        const crisisEvent = createMockCrisisEvent({
          severity: 'critical',
          trigger: 'assessment_score',
          affectedComponents: [
            'OnboardingCrisisButton',
            'OnboardingCrisisAlert',
            'ClinicalCarousel',
            'PHQAssessmentPreview',
          ],
        });

        const ecosystemResponse = await crisisWorkflowValidator.validateEcosystemCrisisResponse({
          crisisEvent,
          allComponentsAffected: true,
          coordinatedResponse: true,
        });

        expect(ecosystemResponse.allComponentsRespond).toBe(true);
        expect(ecosystemResponse.responseIsCoordinated).toBe(true);
        expect(ecosystemResponse.maintainsUserExperience).toBe(true);
        expect(ecosystemResponse.preservesTherapeuticIntegrity).toBe(true);
        expect(ecosystemResponse.responseTime).toBeLessThan(
          CLINICAL_WORKFLOW_STANDARDS.CRISIS_DETECTION_RESPONSE_TIME
        );
      });
    });
  });

  describe('MBCT Practice Engagement Workflow', () => {
    describe('Mindfulness Integration Across Components', () => {
      it('should maintain MBCT engagement throughout clinical workflow', async () => {
        const mbctSession = createMockTherapeuticSession({
          sessionType: 'mbct_practice',
          currentPhase: 'mindful_assessment_preparation',
          mbctElements: [
            'present_moment_awareness',
            'non_judgmental_observation',
            'compassionate_self_observation',
          ],
        });

        mockTherapeuticStore.currentSession = mbctSession;

        // Test MBCT engagement across workflow components
        const workflowComponents = [
          'ClinicalCarousel',
          'PHQAssessmentPreview',
          'OnboardingCrisisButton',
        ];

        const mbctIntegration = await integrationValidator.validateMBCTWorkflowIntegration({
          therapeuticSession: mbctSession,
          workflowComponents,
          mbctContinuity: true,
        });

        expect(mbctIntegration.maintainsMBCTContext).toBe(true);
        expect(mbctIntegration.enhancesTherapeuticEngagement).toBe(true);
        expect(mbctIntegration.preservesMindfulnessState).toBe(true);
        expect(mbctIntegration.mbctComplianceScore).toBeGreaterThanOrEqual(
          CLINICAL_WORKFLOW_STANDARDS.MBCT_WORKFLOW_COMPLIANCE
        );
      });

      it('should integrate mindful transitions between clinical activities', async () => {
        const transitionScenarios = [
          {
            from: 'ClinicalCarousel',
            to: 'PHQAssessmentPreview',
            transitionType: 'mindful_assessment_preparation',
          },
          {
            from: 'PHQAssessmentPreview',
            to: 'OnboardingCrisisButton',
            transitionType: 'compassionate_crisis_awareness',
          },
          {
            from: 'OnboardingCrisisButton',
            to: 'ClinicalCarousel',
            transitionType: 'mindful_recovery_integration',
          },
        ];

        for (const scenario of transitionScenarios) {
          const transitionValidation = await integrationValidator.validateMindfulTransition(scenario);

          expect(transitionValidation.isMindful).toBe(true);
          expect(transitionValidation.preservesPresenceAwareness).toBe(true);
          expect(transitionValidation.maintainsCompassion).toBe(true);
          expect(transitionValidation.supportsTherapeuticFlow).toBe(true);
        }
      });
    });
  });

  describe('Therapeutic State Preservation Across Workflow', () => {
    describe('State Continuity Validation', () => {
      it('should preserve therapeutic state across complex workflow transitions', async () => {
        const complexWorkflow = [
          { step: 'onboarding_welcome', component: 'ClinicalCarousel' },
          { step: 'assessment_introduction', component: 'PHQAssessmentPreview' },
          { step: 'crisis_awareness', component: 'OnboardingCrisisButton' },
          { step: 'crisis_intervention', component: 'OnboardingCrisisAlert' },
          { step: 'mbct_integration', component: 'ClinicalCarousel' },
        ];

        const initialTherapeuticState = createMockTherapeuticSession({
          sessionType: 'comprehensive_onboarding',
          therapeuticElements: [
            'safety_establishment',
            'rapport_building',
            'assessment_preparation',
            'crisis_awareness',
            'mbct_introduction',
          ],
        });

        mockTherapeuticStore.currentSession = initialTherapeuticState;

        for (const workflowStep of complexWorkflow) {
          const stateValidation = await continuityValidator.validateWorkflowStepContinuity({
            step: workflowStep.step,
            component: workflowStep.component,
            previousState: mockTherapeuticStore.currentSession,
          });

          expect(stateValidation.preservesTherapeuticContext).toBe(true);
          expect(stateValidation.maintainsContinuity).toBe(true);
          expect(stateValidation.enhancesTherapeuticProgression).toBe(true);
          expect(stateValidation.continuityScore).toBeGreaterThanOrEqual(
            CLINICAL_WORKFLOW_STANDARDS.THERAPEUTIC_CONTINUITY_THRESHOLD
          );
        }
      });

      it('should handle workflow interruptions with therapeutic grace', async () => {
        const interruptionScenarios = [
          'user_initiated_pause',
          'crisis_intervention_activation',
          'technical_interruption',
          'accessibility_accommodation',
          'therapeutic_break_needed',
        ];

        for (const interruption of interruptionScenarios) {
          const interruptionHandling = await continuityValidator.validateWorkflowInterruption({
            interruptionType: interruption,
            therapeuticContextPreserved: true,
            resumptionSupported: true,
          });

          expect(interruptionHandling.handlesGracefully).toBe(true);
          expect(interruptionHandling.preservesProgress).toBe(true);
          expect(interruptionHandling.supportsResumption).toBe(true);
          expect(interruptionHandling.maintainsTherapeuticBond).toBe(true);
        }
      });
    });
  });

  describe('Workflow Performance Integration', () => {
    describe('End-to-End Workflow Performance', () => {
      it('should maintain performance standards across complete clinical workflow', async () => {
        const completeWorkflow = await workflowOrchestrator.executeCompleteWorkflow({
          startPoint: 'onboarding_welcome',
          includeCrisisScenario: true,
          includeAssessment: true,
          includeMBCTPractice: true,
          endPoint: 'therapeutic_goal_setting',
        });

        const performanceValidation = await integrationValidator.validateWorkflowPerformance({
          totalExecutionTime: completeWorkflow.executionTime,
          componentTransitionTimes: completeWorkflow.transitionTimes,
          crisisResponseTime: completeWorkflow.crisisResponseTime,
          therapeuticContinuity: completeWorkflow.continuityScore,
        });

        expect(performanceValidation.meetsPerformanceStandards).toBe(true);
        expect(performanceValidation.totalExecutionTime).toBeLessThan(30000); // 30s max
        expect(performanceValidation.averageTransitionTime).toBeLessThan(500); // 500ms max
        expect(performanceValidation.crisisResponseTime).toBeLessThan(
          CLINICAL_WORKFLOW_STANDARDS.CRISIS_DETECTION_RESPONSE_TIME
        );
      });
    });
  });

  describe('Clinical Workflow Regression Testing', () => {
    it('should maintain workflow integrity after TouchableOpacity migration', async () => {
      const regressionValidation = await integrationValidator.validateMigrationWorkflowImpact({
        preMigrationBaseline: {
          workflowIntegrity: 0.98,
          therapeuticContinuity: 0.97,
          crisisResponseAccuracy: 0.99,
          mbctCompliance: 0.96,
        },
        postMigrationComponents: [
          'OnboardingCrisisButton',
          'OnboardingCrisisAlert',
          'ClinicalCarousel',
          'PHQAssessmentPreview',
        ],
      });

      expect(regressionValidation.workflowIntegrity).toBeGreaterThanOrEqual(0.98);
      expect(regressionValidation.therapeuticContinuity).toBeGreaterThanOrEqual(0.97);
      expect(regressionValidation.crisisResponseAccuracy).toBeGreaterThanOrEqual(0.99);
      expect(regressionValidation.mbctCompliance).toBeGreaterThanOrEqual(0.96);
      expect(regressionValidation.workflowRegressionDetected).toBe(false);
    });
  });
});

// Helper function to get component props for testing
function getComponentProps(componentName: string): any {
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
        data: [{ id: 'test', title: 'Test', content: 'Test' }],
        autoPlay: false,
      };
    case 'PHQAssessmentPreview':
      return {
        data: createMockAssessmentData({}),
        title: 'Test Assessment',
        subtitle: 'Test',
      };
    default:
      return {};
  }
}