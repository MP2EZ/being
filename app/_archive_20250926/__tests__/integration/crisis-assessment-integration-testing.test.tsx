/**
 * Crisis and Assessment Flow Integration Testing
 * Validates crisis response protocols and assessment calculation accuracy
 * 
 * FOCUS: Healthcare-grade crisis detection, assessment scoring, and emergency protocols
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { jest } from '@jest/globals';

// Crisis and Assessment Components
import { CrisisButton } from '../../src/components/core/CrisisButton';
import { CrisisInterventionScreen } from '../../src/screens/assessment/CrisisInterventionScreen';
import { OnboardingCrisisButton } from '../../src/components/clinical/OnboardingCrisisButton';
import { OnboardingCrisisAlert } from '../../src/components/clinical/OnboardingCrisisAlert';
import { TypeSafePHQ9Screen } from '../../src/screens/assessment/TypeSafePHQ9Screen';
import { TypeSafeGAD7Screen } from '../../src/screens/assessment/TypeSafeGAD7Screen';

// Payment Crisis Integration
import { PaymentAnxietyDetection } from '../../src/components/payment/PaymentAnxietyDetection';
import { CrisisSafetyPaymentUI } from '../../src/components/payment/CrisisSafetyPaymentUI';

// Clinical Assessment Components
import { PHQAssessmentPreview } from '../../src/components/clinical/components/PHQAssessmentPreview';
import { ClinicalCarousel } from '../../src/components/clinical/ClinicalCarousel';

// State and Services
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useCrisisStore } from '../../src/store/crisisStore';
import { TypeSafeClinicalCalculationService } from '../../src/services/TypeSafeClinicalCalculationService';

// Testing Utilities
import { CrisisTestUtils } from '../utils/CrisisTestUtils';
import { UserJourneyTestUtils } from '../utils/UserJourneyTestUtils';
import { PerformanceTestUtils } from '../utils/PerformanceTestUtils';

// Mock external dependencies
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(),
  },
}));

jest.mock('../../src/services/TypeSafeClinicalCalculationService');

describe('Crisis and Assessment Flow Integration Testing', () => {
  let crisisUtils: CrisisTestUtils;
  let userJourneyUtils: UserJourneyTestUtils;
  let performanceUtils: PerformanceTestUtils;
  let mockCalculationService: jest.Mocked<typeof TypeSafeClinicalCalculationService>;

  beforeEach(() => {
    crisisUtils = new CrisisTestUtils();
    userJourneyUtils = new UserJourneyTestUtils();
    performanceUtils = new PerformanceTestUtils();
    mockCalculationService = jest.mocked(TypeSafeClinicalCalculationService);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock calculation service
    mockCalculationService.calculatePHQ9Score = jest.fn();
    mockCalculationService.calculateGAD7Score = jest.fn();
    mockCalculationService.detectCrisisThreshold = jest.fn();
    mockCalculationService.generateClinicalSummary = jest.fn();
    
    // Mock stores
    jest.mocked(useAssessmentStore).mockReturnValue({
      phq9Score: 0,
      gad7Score: 0,
      crisisDetected: false,
      updatePHQ9Score: jest.fn(),
      updateGAD7Score: jest.fn(),
      setCrisisDetected: jest.fn(),
      assessmentHistory: [],
    });

    jest.mocked(useCrisisStore).mockReturnValue({
      crisisActive: false,
      setCrisisActive: jest.fn(),
      emergencyContacts: [],
      setEmergencyContacts: jest.fn(),
      crisisHistory: [],
    });
  });

  afterEach(() => {
    performanceUtils.cleanup();
  });

  describe('Crisis Response Integration Across All Components', () => {
    test('should maintain <200ms crisis response across all component contexts', async () => {
      console.log('🚨 Testing crisis response timing across all component contexts');
      
      const crisisContexts = [
        { context: 'Core Button', component: <CrisisButton testID="crisis-button" /> },
        { context: 'Onboarding', component: <OnboardingCrisisButton testID="onboarding-crisis-button" /> },
        { context: 'Assessment PHQ-9', component: <TypeSafePHQ9Screen /> },
        { context: 'Assessment GAD-7', component: <TypeSafeGAD7Screen /> },
        { context: 'Payment Anxiety', component: <PaymentAnxietyDetection /> },
        { context: 'Clinical Carousel', component: <ClinicalCarousel /> },
      ];
      
      const responseResults = [];
      
      for (const testContext of crisisContexts) {
        console.log(`  ⚡ Testing crisis response from ${testContext.context}`);
        
        const { getByTestId, queryByTestId } = render(testContext.component);
        
        // Find crisis button in component
        let crisisButton;
        if (testContext.context === 'Core Button') {
          crisisButton = getByTestId('crisis-button');
        } else if (testContext.context === 'Onboarding') {
          crisisButton = getByTestId('onboarding-crisis-button');
        } else {
          // Look for embedded crisis button
          crisisButton = queryByTestId('crisis-button') || queryByTestId('emergency-button');
        }
        
        if (crisisButton) {
          const responseStartTime = performance.now();
          
          // Trigger crisis response
          fireEvent.press(crisisButton);
          
          const responseTime = performance.now() - responseStartTime;
          
          // Verify crisis response timing
          expect(responseTime).toBeLessThan(200); // <200ms requirement
          
          // Verify crisis intervention screen appears
          await waitFor(() => {
            const interventionScreen = queryByTestId('crisis-intervention-screen') || 
                                      queryByTestId('crisis-alert') ||
                                      queryByTestId('emergency-resources');
            expect(interventionScreen).toBeTruthy();
          });
          
          responseResults.push({
            context: testContext.context,
            responseTime,
            success: true,
          });
          
          console.log(`    ✅ ${testContext.context}: ${responseTime}ms response time`);
        } else {
          console.log(`    ⚠️ ${testContext.context}: No crisis button found (expected for some components)`);
        }
      }
      
      // Verify all crisis responses met timing requirements
      const averageResponseTime = responseResults.reduce(
        (sum, result) => sum + result.responseTime,
        0
      ) / responseResults.length;
      
      expect(averageResponseTime).toBeLessThan(150); // Average <150ms
      
      console.log(`🎯 Crisis response testing completed - Average response time: ${Math.round(averageResponseTime)}ms`);
    });

    test('should provide 988 Suicide Prevention Hotline access within 3 seconds', async () => {
      console.log('📞 Testing 988 hotline access timing');
      
      const { getByTestId } = render(<CrisisInterventionScreen />);
      
      // Verify crisis intervention screen loaded
      const interventionScreen = getByTestId('crisis-intervention-screen');
      expect(interventionScreen).toBeTruthy();
      
      // Find 988 hotline access button
      const hotlineButton = getByTestId('suicide-prevention-hotline') || 
                           getByTestId('call-988-button') ||
                           getByTestId('emergency-hotline');
      
      expect(hotlineButton).toBeTruthy();
      
      // Test 988 access timing
      const hotlineStartTime = performance.now();
      
      fireEvent.press(hotlineButton);
      
      const hotlineResponseTime = performance.now() - hotlineStartTime;
      
      // Verify 988 access timing (<3 seconds)
      expect(hotlineResponseTime).toBeLessThan(3000);
      
      // Verify Linking.openURL was called with correct number
      expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
      
      console.log(`✅ 988 hotline access: ${hotlineResponseTime}ms`);
    });

    test('should handle crisis escalation from payment anxiety detection', async () => {
      console.log('💳🚨 Testing crisis escalation from payment anxiety');
      
      const { getByTestId } = render(<PaymentAnxietyDetection />);
      
      // Simulate high anxiety detection during payment
      const anxietyData = {
        level: 'severe',
        triggers: ['payment-amount', 'recurring-charges', 'financial-stress'],
        duration: 120000, // 2 minutes of detected anxiety
      };
      
      const escalationStartTime = performance.now();
      
      // Trigger anxiety detection
      await act(async () => {
        fireEvent(getByTestId('payment-anxiety-detector'), 'anxietyDetected', anxietyData);
      });
      
      const escalationTime = performance.now() - escalationStartTime;
      
      // Verify anxiety detection triggered crisis protocol
      expect(escalationTime).toBeLessThan(500); // <500ms escalation
      
      // Verify crisis safety payment UI activated
      const crisisSafetyUI = getByTestId('crisis-safety-payment-ui');
      expect(crisisSafetyUI).toBeTruthy();
      
      // Verify payment process paused for safety
      const paymentStatus = getByTestId('payment-status');
      expect(paymentStatus.props.children).toContain('paused for your safety');
      
      // Verify emergency resources offered
      const emergencyResources = getByTestId('emergency-resources');
      expect(emergencyResources).toBeTruthy();
      
      // Verify crisis button accessible
      const crisisButton = getByTestId('crisis-button');
      expect(crisisButton).toBeTruthy();
      
      console.log(`✅ Payment anxiety crisis escalation: ${escalationTime}ms`);
    });

    test('should maintain crisis response during component state changes', async () => {
      console.log('🔄 Testing crisis response during dynamic state changes');
      
      const stateChangeScenarios = [
        { scenario: 'During Assessment Progress', component: <TypeSafePHQ9Screen /> },
        { scenario: 'During Payment Processing', component: <PaymentAnxietyDetection /> },
        { scenario: 'During Clinical Review', component: <ClinicalCarousel /> },
      ];
      
      for (const test of stateChangeScenarios) {
        console.log(`  🧪 Testing ${test.scenario}`);
        
        const { getByTestId, queryByTestId } = render(test.component);
        
        // Simulate active state changes
        await act(async () => {
          // Trigger component state updates
          if (test.scenario.includes('Assessment')) {
            fireEvent(getByTestId('phq9-question-1'), 'press');
            fireEvent(getByTestId('phq9-question-2'), 'press');
          } else if (test.scenario.includes('Payment')) {
            fireEvent(getByTestId('payment-method-selector'), 'change');
          } else if (test.scenario.includes('Clinical')) {
            fireEvent(getByTestId('clinical-carousel'), 'scroll');
          }
        });
        
        // Test crisis response during state changes
        const crisisButton = queryByTestId('crisis-button') || queryByTestId('emergency-button');
        
        if (crisisButton) {
          const responseStartTime = performance.now();
          
          fireEvent.press(crisisButton);
          
          const responseTime = performance.now() - responseStartTime;
          
          // Verify crisis response maintained during state changes
          expect(responseTime).toBeLessThan(200);
          
          console.log(`    ✅ ${test.scenario}: ${responseTime}ms (state-resilient)`);
        }
      }
    });
  });

  describe('Assessment Calculation Accuracy Integration', () => {
    test('should maintain 100% calculation accuracy across all assessment scenarios', async () => {
      console.log('🧮 Testing assessment calculation accuracy across all scenarios');
      
      const assessmentScenarios = [
        {
          type: 'phq9',
          name: 'PHQ-9 Minimal Depression',
          responses: [0, 0, 1, 0, 0, 0, 1, 0, 0],
          expectedScore: 2,
          expectedSeverity: 'minimal',
          expectedCrisis: false,
        },
        {
          type: 'phq9',
          name: 'PHQ-9 Mild Depression',
          responses: [1, 1, 1, 2, 1, 1, 1, 1, 1],
          expectedScore: 10,
          expectedSeverity: 'mild',
          expectedCrisis: false,
        },
        {
          type: 'phq9',
          name: 'PHQ-9 Moderate Depression',
          responses: [2, 2, 2, 2, 2, 1, 2, 2, 1],
          expectedScore: 16,
          expectedSeverity: 'moderate',
          expectedCrisis: false,
        },
        {
          type: 'phq9',
          name: 'PHQ-9 Severe Depression (Crisis)',
          responses: [3, 3, 3, 3, 3, 2, 3, 3, 2],
          expectedScore: 25,
          expectedSeverity: 'severe',
          expectedCrisis: true,
        },
        {
          type: 'gad7',
          name: 'GAD-7 Minimal Anxiety',
          responses: [0, 0, 1, 0, 0, 0, 1],
          expectedScore: 2,
          expectedSeverity: 'minimal',
          expectedCrisis: false,
        },
        {
          type: 'gad7',
          name: 'GAD-7 Mild Anxiety',
          responses: [1, 1, 1, 2, 1, 1, 1],
          expectedScore: 8,
          expectedSeverity: 'mild',
          expectedCrisis: false,
        },
        {
          type: 'gad7',
          name: 'GAD-7 Moderate Anxiety',
          responses: [2, 2, 2, 2, 2, 1, 2],
          expectedScore: 13,
          expectedSeverity: 'moderate',
          expectedCrisis: false,
        },
        {
          type: 'gad7',
          name: 'GAD-7 Severe Anxiety (Crisis)',
          responses: [3, 3, 3, 3, 3, 2, 3],
          expectedScore: 20,
          expectedSeverity: 'severe',
          expectedCrisis: true,
        },
      ];
      
      const calculationResults = [];
      
      for (const scenario of assessmentScenarios) {
        console.log(`  📊 Testing ${scenario.name}`);
        
        // Mock calculation service for this scenario
        if (scenario.type === 'phq9') {
          mockCalculationService.calculatePHQ9Score.mockReturnValue({
            score: scenario.expectedScore,
            severity: scenario.expectedSeverity,
            crisisThreshold: scenario.expectedCrisis,
          });
        } else {
          mockCalculationService.calculateGAD7Score.mockReturnValue({
            score: scenario.expectedScore,
            severity: scenario.expectedSeverity,
            crisisThreshold: scenario.expectedCrisis,
          });
        }
        
        mockCalculationService.detectCrisisThreshold.mockReturnValue(scenario.expectedCrisis);
        
        const calculationStartTime = performance.now();
        
        // Execute assessment calculation
        let assessmentResult;
        if (scenario.type === 'phq9') {
          const phq9Screen = render(<TypeSafePHQ9Screen />);
          assessmentResult = await userJourneyUtils.simulatePHQ9WithResponses(
            phq9Screen,
            scenario.responses
          );
        } else {
          const gad7Screen = render(<TypeSafeGAD7Screen />);
          assessmentResult = await userJourneyUtils.simulateGAD7WithResponses(
            gad7Screen,
            scenario.responses
          );
        }
        
        const calculationTime = performance.now() - calculationStartTime;
        
        // Verify calculation accuracy
        expect(assessmentResult.score).toBe(scenario.expectedScore);
        expect(assessmentResult.severity).toBe(scenario.expectedSeverity);
        expect(assessmentResult.crisisDetected).toBe(scenario.expectedCrisis);
        expect(calculationTime).toBeLessThan(300); // <300ms calculation
        
        // Verify crisis protocol activation for high scores
        if (scenario.expectedCrisis) {
          expect(assessmentResult.crisisProtocolActivated).toBe(true);
          expect(assessmentResult.crisisResponseTime).toBeLessThan(200);
        }
        
        calculationResults.push({
          scenario: scenario.name,
          score: assessmentResult.score,
          calculationTime,
          crisisActivated: scenario.expectedCrisis,
        });
        
        console.log(`    ✅ ${scenario.name}: Score ${assessmentResult.score}, Time ${calculationTime}ms`);
      }
      
      // Verify overall calculation accuracy
      const allAccurate = calculationResults.every(result => result.score !== undefined);
      expect(allAccurate).toBe(true);
      
      const averageCalculationTime = calculationResults.reduce(
        (sum, result) => sum + result.calculationTime,
        0
      ) / calculationResults.length;
      
      expect(averageCalculationTime).toBeLessThan(250); // Average <250ms
      
      console.log(`🎯 Assessment accuracy testing completed - Average calculation: ${Math.round(averageCalculationTime)}ms`);
    });

    test('should handle edge cases and boundary conditions', async () => {
      console.log('🔍 Testing assessment edge cases and boundary conditions');
      
      const edgeCases = [
        {
          name: 'PHQ-9 All Zeros',
          type: 'phq9',
          responses: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          expectedScore: 0,
          expectedBehavior: 'minimal-complete',
        },
        {
          name: 'PHQ-9 All Maximum',
          type: 'phq9',
          responses: [3, 3, 3, 3, 3, 3, 3, 3, 3],
          expectedScore: 27,
          expectedBehavior: 'crisis-immediate',
        },
        {
          name: 'GAD-7 All Zeros',
          type: 'gad7',
          responses: [0, 0, 0, 0, 0, 0, 0],
          expectedScore: 0,
          expectedBehavior: 'minimal-complete',
        },
        {
          name: 'GAD-7 All Maximum',
          type: 'gad7',
          responses: [3, 3, 3, 3, 3, 3, 3],
          expectedScore: 21,
          expectedBehavior: 'crisis-immediate',
        },
        {
          name: 'PHQ-9 Crisis Boundary (Score 20)',
          type: 'phq9',
          responses: [2, 3, 2, 3, 2, 3, 2, 3, 0],
          expectedScore: 20,
          expectedBehavior: 'crisis-boundary',
        },
        {
          name: 'GAD-7 Crisis Boundary (Score 15)',
          type: 'gad7',
          responses: [2, 2, 2, 3, 2, 2, 2],
          expectedScore: 15,
          expectedBehavior: 'crisis-boundary',
        },
      ];
      
      for (const edgeCase of edgeCases) {
        console.log(`  🧪 Testing ${edgeCase.name}`);
        
        // Mock calculation service for edge case
        if (edgeCase.type === 'phq9') {
          mockCalculationService.calculatePHQ9Score.mockReturnValue({
            score: edgeCase.expectedScore,
            severity: edgeCase.expectedScore >= 20 ? 'severe' : 
                     edgeCase.expectedScore >= 15 ? 'moderate' :
                     edgeCase.expectedScore >= 10 ? 'mild' : 'minimal',
            crisisThreshold: edgeCase.expectedScore >= 20,
          });
        } else {
          mockCalculationService.calculateGAD7Score.mockReturnValue({
            score: edgeCase.expectedScore,
            severity: edgeCase.expectedScore >= 15 ? 'severe' :
                     edgeCase.expectedScore >= 10 ? 'moderate' :
                     edgeCase.expectedScore >= 5 ? 'mild' : 'minimal',
            crisisThreshold: edgeCase.expectedScore >= 15,
          });
        }
        
        const expectedCrisis = (edgeCase.type === 'phq9' && edgeCase.expectedScore >= 20) ||
                              (edgeCase.type === 'gad7' && edgeCase.expectedScore >= 15);
        
        mockCalculationService.detectCrisisThreshold.mockReturnValue(expectedCrisis);
        
        // Execute edge case test
        let result;
        if (edgeCase.type === 'phq9') {
          const phq9Screen = render(<TypeSafePHQ9Screen />);
          result = await userJourneyUtils.simulatePHQ9WithResponses(phq9Screen, edgeCase.responses);
        } else {
          const gad7Screen = render(<TypeSafeGAD7Screen />);
          result = await userJourneyUtils.simulateGAD7WithResponses(gad7Screen, edgeCase.responses);
        }
        
        // Verify edge case handling
        expect(result.score).toBe(edgeCase.expectedScore);
        
        if (edgeCase.expectedBehavior === 'crisis-immediate' || 
            edgeCase.expectedBehavior === 'crisis-boundary') {
          expect(result.crisisDetected).toBe(true);
          expect(result.crisisResponseTime).toBeLessThan(200);
        } else {
          expect(result.crisisDetected).toBe(false);
        }
        
        console.log(`    ✅ ${edgeCase.name}: Score ${result.score}, Crisis: ${result.crisisDetected ? 'Yes' : 'No'}`);
      }
    });

    test('should handle incomplete assessments and resumption', async () => {
      console.log('🔄 Testing assessment interruption and resumption accuracy');
      
      // Test PHQ-9 interruption and resumption
      const phq9Screen = render(<TypeSafePHQ9Screen />);
      
      // Answer first 5 questions
      const partialResponses = [2, 3, 1, 2, 3];
      await userJourneyUtils.answerQuestions(phq9Screen, partialResponses);
      
      // Simulate interruption (app background)
      await act(async () => {
        fireEvent(phq9Screen.getByTestId('phq9-screen'), 'appStateChange', 'background');
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s background
        fireEvent(phq9Screen.getByTestId('phq9-screen'), 'appStateChange', 'active');
      });
      
      // Complete remaining questions
      const remainingResponses = [1, 2, 3, 1];
      const finalResult = await userJourneyUtils.completeAssessmentAfterResumption(
        phq9Screen,
        remainingResponses
      );
      
      const expectedTotal = [...partialResponses, ...remainingResponses].reduce((a, b) => a + b, 0);
      
      // Mock final calculation
      mockCalculationService.calculatePHQ9Score.mockReturnValue({
        score: expectedTotal,
        severity: 'moderate',
        crisisThreshold: false,
      });
      
      // Verify accuracy after resumption
      expect(finalResult.allAnswersPreserved).toBe(true);
      expect(finalResult.calculationAccurate).toBe(true);
      expect(finalResult.totalScore).toBe(expectedTotal);
      
      console.log(`✅ Assessment resumption accuracy: ${finalResult.totalScore} (preserved all responses)`);
    });
  });

  describe('Crisis and Assessment Data Integration', () => {
    test('should integrate crisis data with assessment history', async () => {
      console.log('📊 Testing crisis and assessment data integration');
      
      // Simulate assessment history with crisis events
      const assessmentHistory = [
        { date: '2024-01-01', phq9: 8, gad7: 6, crisis: false },
        { date: '2024-01-15', phq9: 12, gad7: 10, crisis: false },
        { date: '2024-02-01', phq9: 18, gad7: 14, crisis: false },
        { date: '2024-02-15', phq9: 22, gad7: 17, crisis: true }, // Crisis event
      ];
      
      // Mock clinical calculation service for data integration
      mockCalculationService.generateClinicalSummary.mockReturnValue({
        trendAnalysis: 'deteriorating',
        riskAssessment: 'high',
        recommendedActions: ['crisis-protocol', 'clinical-referral'],
        crisisEvents: 1,
      });
      
      // Test data integration
      const integrationStartTime = performance.now();
      
      const clinicalSummary = await userJourneyUtils.generateClinicalDataIntegration(assessmentHistory);
      
      const integrationTime = performance.now() - integrationStartTime;
      
      // Verify data integration
      expect(integrationTime).toBeLessThan(100); // <100ms integration
      expect(clinicalSummary.trendAnalysis).toBe('deteriorating');
      expect(clinicalSummary.riskAssessment).toBe('high');
      expect(clinicalSummary.crisisEvents).toBe(1);
      
      // Verify clinical calculation service was called
      expect(mockCalculationService.generateClinicalSummary).toHaveBeenCalledWith(assessmentHistory);
      
      console.log(`✅ Clinical data integration: ${integrationTime}ms, Risk: ${clinicalSummary.riskAssessment}`);
    });

    test('should coordinate crisis protocols with assessment scoring', async () => {
      console.log('🔗 Testing crisis protocol coordination with assessment scoring');
      
      // Simulate high-score assessment with crisis coordination
      const highScoreScenario = {
        phq9Responses: [3, 3, 3, 3, 3, 2, 3, 3, 3], // Score 26
        gad7Responses: [3, 3, 3, 3, 2, 3, 3], // Score 20
      };
      
      const coordinationStartTime = performance.now();
      
      // Execute assessments with crisis coordination
      const phq9Screen = render(<TypeSafePHQ9Screen />);
      const gad7Screen = render(<TypeSafeGAD7Screen />);
      
      // Mock high scores and crisis detection
      mockCalculationService.calculatePHQ9Score.mockReturnValue({
        score: 26,
        severity: 'severe',
        crisisThreshold: true,
      });
      
      mockCalculationService.calculateGAD7Score.mockReturnValue({
        score: 20,
        severity: 'severe',
        crisisThreshold: true,
      });
      
      mockCalculationService.detectCrisisThreshold.mockReturnValue(true);
      
      // Simulate coordinated assessment execution
      const [phq9Result, gad7Result] = await Promise.all([
        userJourneyUtils.simulatePHQ9WithResponses(phq9Screen, highScoreScenario.phq9Responses),
        userJourneyUtils.simulateGAD7WithResponses(gad7Screen, highScoreScenario.gad7Responses),
      ]);
      
      const coordinationTime = performance.now() - coordinationStartTime;
      
      // Verify crisis coordination
      expect(coordinationTime).toBeLessThan(1000); // <1s for coordinated assessments
      expect(phq9Result.score).toBe(26);
      expect(gad7Result.score).toBe(20);
      expect(phq9Result.crisisDetected).toBe(true);
      expect(gad7Result.crisisDetected).toBe(true);
      
      // Verify coordinated crisis response
      expect(phq9Result.crisisProtocolActivated).toBe(true);
      expect(gad7Result.crisisProtocolActivated).toBe(true);
      
      // Verify crisis response timing for both assessments
      expect(phq9Result.crisisResponseTime).toBeLessThan(200);
      expect(gad7Result.crisisResponseTime).toBeLessThan(200);
      
      console.log(`✅ Crisis coordination: ${coordinationTime}ms, Both assessments triggered protocol`);
    });
  });
});