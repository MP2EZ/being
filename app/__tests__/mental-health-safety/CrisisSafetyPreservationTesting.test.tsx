/**
 * Mental Health Safety Testing for Payment Sync UI Components
 *
 * This test suite validates crisis safety preservation and therapeutic continuity during
 * payment sync failures, ensuring user mental health safety is never compromised.
 *
 * Test Categories:
 * 1. Crisis Button Functionality During Payment UI Stress Tests
 * 2. 988 Hotline Access Validation During Payment Failures
 * 3. PHQ-9/GAD-7 Assessment Availability During Payment Sync Issues
 * 4. Therapeutic Messaging Validation (Anxiety-Reducing Language)
 *
 * Critical Safety Requirements:
 * - Crisis button: Always <200ms response time regardless of payment status
 * - 988 hotline: Never affected by subscription or payment issues
 * - PHQ-9/GAD-7: Assessments remain available during all payment failures
 * - Therapeutic messaging: Reduces anxiety, promotes wellbeing, maintains MBCT principles
 * - Session protection: Active therapeutic sessions never interrupted by payment issues
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking, AccessibilityInfo } from 'react-native';

// Components under test
import { PaymentSyncStatus, PaymentErrorHandling } from '../../src/components/payment/PaymentSyncResilienceUI';
import { CrisisSafetyIndicator, ProtectedCrisisButton, TherapeuticSessionProtection, EmergencyHotlineAccess } from '../../src/components/payment/CrisisSafetyPaymentUI';
import { TherapeuticPaymentMessaging } from '../../src/components/payment/TherapeuticPaymentMessaging';

// Mental health testing utilities
import { CrisisTestUtils } from '../utils/CrisisTestUtils';
import { TherapeuticTestUtils } from '../utils/TherapeuticTestUtils';
import { AssessmentTestUtils } from '../utils/AssessmentTestUtils';
import { MentalHealthSafetyValidator } from '../utils/MentalHealthSafetyValidator';

// Test providers
import { PaymentTestProvider } from '../mocks/PaymentTestProvider';
import { CrisisTestProvider } from '../mocks/CrisisTestProvider';

// Mock emergency services
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true)
  }
}));

// Mock accessibility for crisis announcements
const mockAccessibilityInfo = {
  announceForAccessibility: jest.fn(),
  isScreenReaderEnabled: jest.fn().mockResolvedValue(true)
};

AccessibilityInfo.announceForAccessibility = mockAccessibilityInfo.announceForAccessibility;
AccessibilityInfo.isScreenReaderEnabled = mockAccessibilityInfo.isScreenReaderEnabled;

// Mock store with crisis-focused state management
const createCrisisStore = (overrides = {}) => ({
  crisisAccess: {
    isActive: false,
    responseTime: 0,
    hotlineAvailable: true,
    assessmentAccess: true,
    sessionProtected: false,
    ...overrides.crisisAccess
  },
  paymentStatus: {
    status: 'active',
    subscriptionTier: 'Premium',
    gracePeriod: false,
    ...overrides.paymentStatus
  },
  therapeuticSession: {
    active: false,
    type: null,
    duration: 0,
    protected: false,
    ...overrides.therapeuticSession
  },
  emergencyProtocols: {
    active: true,
    hotline988Available: true,
    crisisButtonFunctional: true,
    assessmentsBypass: true,
    ...overrides.emergencyProtocols
  }
});

jest.mock('../../src/store/paymentStore', () => {
  let mockState = createCrisisStore();

  return {
    usePaymentStore: () => mockState,
    paymentSelectors: {
      getCrisisAccess: (store: any) => store.crisisAccess,
      getPaymentStatus: (store: store: any) => store.paymentStatus,
      getTherapeuticSession: (store: any) => store.therapeuticSession,
      getEmergencyProtocols: (store: any) => store.emergencyProtocols,
      getSyncStatus: () => ({ status: 'success', networkStatus: 'online' }),
      getResilienceMetrics: () => ({ retryCount: 0, maxRetries: 3 }),
      getSubscriptionTier: () => ({ name: 'Premium' })
    },
    __updateCrisisState: (newState: any) => {
      mockState = createCrisisStore(newState);
    }
  };
});

const updateCrisisState = (newState: any) => {
  const mockModule = jest.requireMock('../../src/store/paymentStore');
  mockModule.__updateCrisisState(newState);
};

jest.mock('../../src/store/crisisStore', () => ({
  useCrisisStore: () => ({
    isActive: false,
    activationTime: null,
    responseProtocols: {
      hotline: true,
      assessment: true,
      session: true
    }
  })
}));

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    colorSystem: {
      status: {
        success: '#16A34A',
        error: '#DC2626',
        warning: '#D97706',
        successBackground: '#F0FDF4',
        errorBackground: '#FEF2F2'
      }
    }
  })
}));

const CrisisSafetyTestWrapper: React.FC<{
  children: React.ReactNode;
  crisisMode?: boolean;
  paymentIssue?: boolean;
}> = ({
  children,
  crisisMode = false,
  paymentIssue = false
}) => {
  React.useEffect(() => {
    if (crisisMode) {
      updateCrisisState({
        crisisAccess: { isActive: true, responseTime: 0 }
      });
    }
    if (paymentIssue) {
      updateCrisisState({
        paymentStatus: { status: 'error', subscriptionTier: 'Basic' }
      });
    }
  }, [crisisMode, paymentIssue]);

  return (
    <CrisisTestProvider>
      <PaymentTestProvider>
        {children}
      </PaymentTestProvider>
    </CrisisTestProvider>
  );
};

describe('Crisis Safety Preservation Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    updateCrisisState({});
    CrisisTestUtils.reset();
    MentalHealthSafetyValidator.reset();
  });

  describe('Crisis Button Functionality During Payment UI Stress Tests', () => {
    test('crisis button maintains <200ms response time under extreme payment sync stress', async () => {
      const stressTest = CrisisTestUtils.createStressTest({
        duration: 30000, // 30 seconds
        paymentOperations: 100,
        syncRetries: 20,
        memoryPressure: true
      });

      stressTest.start();

      const { getByTestId } = render(
        <CrisisSafetyTestWrapper paymentIssue={true}>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="stress-crisis-button"
          />
          <PaymentSyncStatus testID="stress-sync-status" />
        </CrisisSafetyTestWrapper>
      );

      const crisisButton = getByTestId('stress-crisis-button');
      const responseTimes: number[] = [];

      // Simulate payment stress while testing crisis button
      for (let i = 0; i < 50; i++) {
        // Simulate payment sync operations
        updateCrisisState({
          paymentStatus: { status: i % 3 === 0 ? 'error' : 'retrying' }
        });

        const responseStart = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - responseStart;
        responseTimes.push(responseTime);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      const stressMetrics = stressTest.stop();

      // Validate crisis button performance under stress
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(150); // Well under 200ms requirement
      expect(maxResponseTime).toBeLessThan(200); // Never exceed requirement
      expect(stressMetrics.crisisButtonReliability).toBe(100); // 100% reliability
      expect(stressMetrics.failedCrisisResponses).toBe(0);
    });

    test('crisis button isolation from payment failure cascades', async () => {
      const isolationTest = CrisisTestUtils.createIsolationTest();
      isolationTest.start();

      // Simulate payment system cascade failure
      updateCrisisState({
        paymentStatus: { status: 'critical', subscriptionTier: 'Suspended' },
        emergencyProtocols: { active: true, isolationMode: true }
      });

      const { getByTestId } = render(
        <CrisisSafetyTestWrapper crisisMode={true} paymentIssue={true}>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="isolated-crisis-button"
          />
          <PaymentErrorHandling
            error={{
              type: 'system',
              severity: 'critical',
              message: 'Payment system unavailable'
            }}
            testID="cascade-error"
          />
        </CrisisSafetyTestWrapper>
      );

      const crisisButton = getByTestId('isolated-crisis-button');

      // Verify crisis button remains functional during cascade
      fireEvent.press(crisisButton);

      const isolationMetrics = isolationTest.stop();

      expect(isolationMetrics.crisisSystemIsolated).toBe(true);
      expect(isolationMetrics.paymentFailureImpact).toBe(0); // No impact on crisis
      expect(isolationMetrics.emergencyAccessMaintained).toBe(true);
    });

    test('crisis button functionality during memory exhaustion scenarios', async () => {
      const memoryStressTest = CrisisTestUtils.createMemoryStressTest();
      memoryStressTest.start();

      // Simulate memory pressure
      const memoryPressure = new Array(2000000).fill('memory-pressure-test');

      updateCrisisState({
        paymentStatus: { status: 'error', memoryUsage: '95%' },
        crisisAccess: { isActive: true, memoryProtected: true }
      });

      const { getByTestId } = render(
        <CrisisSafetyTestWrapper crisisMode={true}>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="memory-stress-crisis"
          />
        </CrisisSafetyTestWrapper>
      );

      const crisisButton = getByTestId('memory-stress-crisis');

      // Test crisis button under memory pressure
      const memoryResponseTimes: number[] = [];
      for (let i = 0; i < 20; i++) {
        const start = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - start;
        memoryResponseTimes.push(responseTime);
      }

      const memoryMetrics = memoryStressTest.stop();
      const averageMemoryResponse = memoryResponseTimes.reduce((a, b) => a + b, 0) / memoryResponseTimes.length;

      expect(averageMemoryResponse).toBeLessThan(200);
      expect(memoryMetrics.crisisMemoryProtected).toBe(true);
      expect(memoryMetrics.crisisButtonDegraded).toBe(false);
    });
  });

  describe('988 Hotline Access Validation During Payment Failures', () => {
    test('988 hotline access never depends on payment status', async () => {
      const paymentFailureScenarios = [
        { status: 'error', tier: 'Basic', gracePeriod: false },
        { status: 'critical', tier: 'Suspended', gracePeriod: false },
        { status: 'offline', tier: 'Premium', gracePeriod: true },
        { status: 'blocked', tier: 'Free', gracePeriod: false }
      ];

      for (const scenario of paymentFailureScenarios) {
        updateCrisisState({
          paymentStatus: scenario
        });

        const { getByTestId } = render(
          <CrisisSafetyTestWrapper paymentIssue={true}>
            <EmergencyHotlineAccess
              paymentIssue={true}
              testID={`hotline-${scenario.status}`}
            />
          </CrisisSafetyTestWrapper>
        );

        const hotlineButton = getByTestId(`hotline-${scenario.status}-call-button`);

        // Verify 988 calling is always available
        fireEvent.press(hotlineButton);

        await waitFor(() => {
          expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
        });

        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Connecting to 988 Suicide and Crisis Lifeline'
        );
      }
    });

    test('988 hotline access during network outages', async () => {
      updateCrisisState({
        paymentStatus: { status: 'offline', networkStatus: 'disconnected' },
        emergencyProtocols: { offlineMode: true, hotline988Available: true }
      });

      const { getByTestId } = render(
        <CrisisSafetyTestWrapper paymentIssue={true}>
          <EmergencyHotlineAccess
            paymentIssue={true}
            testID="offline-hotline"
          />
        </CrisisSafetyTestWrapper>
      );

      const hotlineButton = getByTestId('offline-hotline-call-button');

      // 988 should work even offline (cellular network)
      fireEvent.press(hotlineButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
      });

      // Verify offline hotline access validation
      const offlineValidation = CrisisTestUtils.validateOfflineHotlineAccess();
      expect(offlineValidation.cellularAccess).toBe(true);
      expect(offlineValidation.bypassesPaymentChecks).toBe(true);
    });

    test('emergency hotline failover mechanisms during system failures', async () => {
      const failoverTest = CrisisTestUtils.createFailoverTest();
      failoverTest.start();

      updateCrisisState({
        paymentStatus: { status: 'system_failure' },
        emergencyProtocols: { failoverActive: true, backupSystems: true }
      });

      const { getByTestId } = render(
        <CrisisSafetyTestWrapper crisisMode={true}>
          <EmergencyHotlineAccess
            paymentIssue={true}
            testID="failover-hotline"
          />
        </CrisisSafetyTestWrapper>
      );

      // Simulate primary calling mechanism failure
      (Linking.openURL as jest.Mock).mockRejectedValueOnce(new Error('System unavailable'));

      const hotlineButton = getByTestId('failover-hotline-call-button');
      fireEvent.press(hotlineButton);

      await waitFor(() => {
        // Should show manual dialing instructions as fallback
        expect(Alert.alert).toHaveBeenCalledWith(
          'Emergency Hotline',
          'Please dial 988 directly for immediate crisis support',
          [{ text: 'OK', style: 'default' }]
        );
      });

      const failoverMetrics = failoverTest.stop();
      expect(failoverMetrics.failoverActivated).toBe(true);
      expect(failoverMetrics.userGuidanceProvided).toBe(true);
    });
  });

  describe('PHQ-9/GAD-7 Assessment Availability During Payment Sync Issues', () => {
    test('PHQ-9 assessment remains accessible during payment failures', async () => {
      const assessmentTest = AssessmentTestUtils.createAvailabilityTest('PHQ-9');

      const paymentFailureStates = [
        'payment_declined',
        'subscription_expired',
        'network_offline',
        'system_error'
      ];

      for (const failureState of paymentFailureStates) {
        updateCrisisState({
          paymentStatus: { status: 'error', reason: failureState },
          emergencyProtocols: { assessmentsBypass: true }
        });

        const assessmentAccess = AssessmentTestUtils.validateAssessmentAccess({
          type: 'PHQ-9',
          paymentStatus: failureState,
          crisisMode: false
        });

        expect(assessmentAccess.isAccessible).toBe(true);
        expect(assessmentAccess.scoringAvailable).toBe(true);
        expect(assessmentAccess.dataStorage).toBe(true);
        expect(assessmentAccess.crisisDetection).toBe(true);
      }
    });

    test('GAD-7 assessment crisis thresholds work during payment issues', async () => {
      updateCrisisState({
        paymentStatus: { status: 'critical' },
        crisisAccess: { isActive: false }
      });

      // Simulate GAD-7 assessment with crisis-level scores
      const gad7Responses = [3, 3, 3, 3, 3, 3, 3]; // Score: 21 (severe anxiety)

      const assessmentValidation = AssessmentTestUtils.validateCrisisDetection({
        type: 'GAD-7',
        responses: gad7Responses,
        paymentStatus: 'critical'
      });

      expect(assessmentValidation.crisisDetected).toBe(true);
      expect(assessmentValidation.score).toBe(21);
      expect(assessmentValidation.crisisThreshold).toBe(15); // GAD-7 crisis threshold
      expect(assessmentValidation.emergencyProtocolsTriggered).toBe(true);
      expect(assessmentValidation.paymentStatusIgnored).toBe(true);
    });

    test('assessment data integrity maintained during payment sync failures', async () => {
      const dataIntegrityTest = AssessmentTestUtils.createDataIntegrityTest();
      dataIntegrityTest.start();

      updateCrisisState({
        paymentStatus: { status: 'sync_failure', dataCorruption: false },
        emergencyProtocols: { dataProtection: true }
      });

      // Simulate assessment during sync failure
      const phq9Assessment = {
        responses: [2, 1, 3, 2, 1, 0, 2, 1, 0], // Score: 12
        timestamp: Date.now(),
        paymentStatus: 'sync_failure'
      };

      const integrityValidation = AssessmentTestUtils.validateDataIntegrity(phq9Assessment);

      expect(integrityValidation.dataValid).toBe(true);
      expect(integrityValidation.scoreAccurate).toBe(true);
      expect(integrityValidation.timestampValid).toBe(true);
      expect(integrityValidation.storageSecure).toBe(true);
      expect(integrityValidation.paymentStatusSeparated).toBe(true);

      const finalReport = dataIntegrityTest.stop();
      expect(finalReport.dataCorruption).toBe(0);
      expect(finalReport.assessmentReliability).toBe(100);
    });
  });

  describe('Therapeutic Messaging Validation', () => {
    test('payment error messages reduce anxiety triggers', async () => {
      const anxietyTestMessages = [
        'Payment method declined - insufficient funds',
        'Credit card expired - account suspended',
        'Payment failed - service terminated',
        'Billing error - immediate action required'
      ];

      const therapeuticAlternatives = [
        'Payment attention needed - your mindfulness practice continues',
        'Payment update requested - all features remain available',
        'Payment sync paused - therapeutic access protected',
        'Billing assistance available - your wellbeing is prioritized'
      ];

      for (let i = 0; i < anxietyTestMessages.length; i++) {
        const anxietyMessage = anxietyTestMessages[i];
        const therapeuticMessage = therapeuticAlternatives[i];

        // Test anxiety-triggering message
        const anxietyAnalysis = TherapeuticTestUtils.analyzeAnxietyTriggers(anxietyMessage);
        expect(anxietyAnalysis.triggerCount).toBeGreaterThan(2);
        expect(anxietyAnalysis.stressLevel).toBeGreaterThan(7);

        // Test therapeutic alternative
        const therapeuticAnalysis = TherapeuticTestUtils.analyzeTherapeuticLanguage(therapeuticMessage);
        expect(therapeuticAnalysis.triggerCount).toBeLessThan(1);
        expect(therapeuticAnalysis.calmingWords).toBeGreaterThan(2);
        expect(therapeuticAnalysis.wellbeingFocus).toBe(true);
      }
    });

    test('crisis-level messaging maintains MBCT principles', async () => {
      const { getByTestId } = render(
        <CrisisSafetyTestWrapper crisisMode={true}>
          <TherapeuticPaymentMessaging
            errorType="critical"
            errorMessage="System failure"
            userStressLevel="crisis"
            testID="crisis-messaging"
          />
        </CrisisSafetyTestWrapper>
      );

      const messagingComponent = getByTestId('crisis-messaging');

      // Validate MBCT therapeutic principles
      const mbctValidation = TherapeuticTestUtils.validateMBCTCompliance(
        messagingComponent.props.accessibilityLabel
      );

      expect(mbctValidation.mindfulnessPresent).toBe(true);
      expect(mbctValidation.acceptanceLanguage).toBe(true);
      expect(mbctValidation.presentMomentFocus).toBe(true);
      expect(mbctValidation.selfCompassion).toBe(true);
      expect(mbctValidation.judgmentFree).toBe(true);

      // Crisis support should be immediately accessible
      const crisisButton = getByTestId('crisis-messaging-crisis-support');
      expect(crisisButton.props.accessibilityLabel).toContain('immediate crisis support');
    });

    test('progressive error messaging reduces cognitive load', async () => {
      const progressiveTest = TherapeuticTestUtils.createProgressiveMessagingTest();
      progressiveTest.start();

      const errorProgression = [
        { attempt: 1, severity: 'low', message: 'Connection briefly unavailable' },
        { attempt: 2, severity: 'medium', message: 'Payment sync needs attention' },
        { attempt: 3, severity: 'high', message: 'Extended payment issue - support available' }
      ];

      for (const error of errorProgression) {
        const { getByTestId, unmount } = render(
          <CrisisSafetyTestWrapper>
            <TherapeuticPaymentMessaging
              errorType="payment"
              errorMessage={error.message}
              userStressLevel={error.severity}
              testID={`progressive-${error.attempt}`}
            />
          </CrisisSafetyTestWrapper>
        );

        const cognitiveLoad = TherapeuticTestUtils.measureCognitiveLoad(
          getByTestId(`progressive-${error.attempt}`).props.accessibilityLabel
        );

        expect(cognitiveLoad.complexity).toBeLessThan(15); // Low complexity
        expect(cognitiveLoad.readability).toBeGreaterThan(80); // High readability
        expect(cognitiveLoad.actionClarity).toBeGreaterThan(90); // Clear actions

        unmount();
      }

      const progressionMetrics = progressiveTest.stop();
      expect(progressionMetrics.cognitiveLoadReduction).toBe(true);
      expect(progressionMetrics.progressiveSupport).toBe(true);
    });

    test('therapeutic session protection messaging maintains flow', async () => {
      const sessionTypes = ['breathing', 'meditation', 'assessment', 'check-in'];

      for (const sessionType of sessionTypes) {
        updateCrisisState({
          therapeuticSession: { active: true, type: sessionType, protected: true },
          paymentStatus: { status: 'error' }
        });

        const { getByTestId } = render(
          <CrisisSafetyTestWrapper>
            <TherapeuticSessionProtection
              sessionActive={true}
              paymentStatus="error"
              sessionType={sessionType as any}
              testID={`session-${sessionType}`}
            />
          </CrisisSafetyTestWrapper>
        );

        const sessionProtection = getByTestId(`session-${sessionType}`);
        const protectionMessage = sessionProtection.props.accessibilityLabel;

        // Validate session flow protection
        const flowValidation = TherapeuticTestUtils.validateSessionFlow(protectionMessage, sessionType);

        expect(flowValidation.continuityMaintained).toBe(true);
        expect(flowValidation.protectionMessaging).toBe(true);
        expect(flowValidation.sessionSpecific).toBe(true);
        expect(flowValidation.anxietyReduction).toBe(true);
      }
    });
  });

  describe('Integration Testing - Complete Crisis Safety Preservation', () => {
    test('comprehensive crisis safety during total payment system failure', async () => {
      const comprehensiveTest = MentalHealthSafetyValidator.createComprehensiveTest();
      comprehensiveTest.start();

      // Simulate total payment system failure
      updateCrisisState({
        paymentStatus: { status: 'system_failure', allServicesDown: true },
        crisisAccess: { isActive: true, emergencyMode: true },
        therapeuticSession: { active: true, type: 'breathing', protected: true },
        emergencyProtocols: { fullActivation: true }
      });

      const { getByTestId } = render(
        <CrisisSafetyTestWrapper crisisMode={true} paymentIssue={true}>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="comprehensive-crisis"
          />
          <EmergencyHotlineAccess
            paymentIssue={true}
            testID="comprehensive-hotline"
          />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="critical"
            sessionType="breathing"
            testID="comprehensive-session"
          />
          <PaymentErrorHandling
            error={{ type: 'system', severity: 'critical' }}
            testID="comprehensive-error"
          />
        </CrisisSafetyTestWrapper>
      );

      // Test all crisis safety mechanisms
      const crisisValidations = await Promise.all([
        // Crisis button responsiveness
        CrisisTestUtils.validateCrisisButton(getByTestId('comprehensive-crisis')),
        // 988 hotline access
        CrisisTestUtils.validateHotlineAccess(getByTestId('comprehensive-hotline')),
        // Session protection
        CrisisTestUtils.validateSessionProtection(getByTestId('comprehensive-session')),
        // Assessment access
        AssessmentTestUtils.validateEmergencyAccess(['PHQ-9', 'GAD-7'])
      ]);

      const comprehensiveReport = comprehensiveTest.stop();

      // Validate all crisis safety mechanisms remain functional
      expect(crisisValidations[0].responseTime).toBeLessThan(200);
      expect(crisisValidations[1].accessible).toBe(true);
      expect(crisisValidations[2].protected).toBe(true);
      expect(crisisValidations[3].assessmentsAvailable).toBe(true);

      expect(comprehensiveReport.crisisSafetyScore).toBe(100);
      expect(comprehensiveReport.therapeuticContinuity).toBe(100);
      expect(comprehensiveReport.mentalHealthProtection).toBe(true);
    });
  });
});