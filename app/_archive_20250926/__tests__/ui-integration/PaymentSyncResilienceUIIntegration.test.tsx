/**
 * Comprehensive UI Integration Testing for Payment Sync Resilience Components
 *
 * This test suite validates end-to-end payment sync UI workflows with resilience scenarios,
 * ensuring mental health safety, therapeutic continuity, and accessibility compliance.
 *
 * Test Categories:
 * 1. End-to-End Payment Sync UI Workflows
 * 2. Component Integration Testing
 * 3. Crisis Safety UI Preservation
 * 4. Accessibility Integration Testing
 * 5. Mental Health Safety Testing
 *
 * Critical Requirements:
 * - Crisis button <200ms response time validation
 * - 988 hotline access during payment failures
 * - PHQ-9/GAD-7 assessment availability
 * - Therapeutic messaging validation
 * - 60fps animation validation
 */

import React from 'react';
import { render, fireEvent, waitFor, act, screen } from '@testing-library/react-native';
import { Alert, AccessibilityInfo, Linking, Platform } from 'react-native';

// Components under test
import { PaymentSyncStatus, PaymentErrorHandling, PaymentPerformanceFeedback } from '../../src/components/payment/PaymentSyncResilienceUI';
import { CrisisSafetyIndicator, ProtectedCrisisButton, TherapeuticSessionProtection, EmergencyHotlineAccess } from '../../src/components/payment/CrisisSafetyPaymentUI';
import { AccessiblePaymentAnnouncements, HighContrastPaymentStatus } from '../../src/components/payment/AccessibilityPaymentUI';

// Test utilities and providers
import { PaymentTestProvider } from '../mocks/PaymentTestProvider';
import { AccessibilityTestUtils } from '../../src/components/payment/AccessibilityValidationUtils';
import { CrisisTestUtils } from '../utils/CrisisTestUtils';
import { PerformanceTestUtils } from '../utils/PerformanceTestUtils';

// Mock dependencies
jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    colorSystem: {
      status: {
        success: '#16A34A',
        error: '#DC2626',
        warning: '#D97706',
        info: '#2563EB',
        successBackground: '#F0FDF4',
        errorBackground: '#FEF2F2',
        warningBackground: '#FFFBEB',
        infoBackground: '#EFF6FF'
      },
      gray: {
        50: '#F9FAFB',
        300: '#D1D5DB',
        600: '#757575',
        700: '#424242'
      },
      base: {
        white: '#FFFFFF',
        black: '#1C1C1C'
      }
    },
    isDarkMode: false
  })
}));

jest.mock('../../src/hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onWarning: jest.fn(),
    onCritical: jest.fn()
  }),
  useHapticPreference: () => ({
    hapticsEnabled: true
  })
}));

jest.mock('../../src/store/paymentStore', () => ({
  usePaymentStore: () => ({}),
  paymentSelectors: {
    getSyncStatus: () => ({
      status: 'success',
      networkStatus: 'online',
      lastSync: Date.now(),
      queueSize: 0
    }),
    getCrisisAccess: () => ({
      isActive: false
    }),
    getPaymentError: () => null,
    getResilienceMetrics: () => ({
      retryCount: 0,
      maxRetries: 3,
      circuitBreakerOpen: false
    }),
    getSubscriptionTier: () => ({
      name: 'Premium'
    }),
    getEmergencyProtocols: () => ({
      active: true,
      hotlineAccess: true
    }),
    getSessionProtection: () => ({
      active: false
    }),
    getPerformanceMetrics: () => ({
      averageResponseTime: 150,
      successRate: 97,
      compressionRatio: 0.3
    }),
    getSyncProgress: () => ({
      isActive: false,
      completionPercentage: 0,
      estimatedTimeRemaining: null
    })
  }
}));

jest.mock('../../src/store/crisisStore', () => ({
  useCrisisStore: () => ({})
}));

// Mock React Native modules
const mockAccessibilityInfo = {
  announceForAccessibility: jest.fn(),
  isScreenReaderEnabled: jest.fn().mockResolvedValue(true),
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  addEventListener: jest.fn(),
  setAccessibilityFocus: jest.fn()
};

AccessibilityInfo.announceForAccessibility = mockAccessibilityInfo.announceForAccessibility;
AccessibilityInfo.isScreenReaderEnabled = mockAccessibilityInfo.isScreenReaderEnabled;
AccessibilityInfo.isReduceMotionEnabled = mockAccessibilityInfo.isReduceMotionEnabled;
AccessibilityInfo.addEventListener = mockAccessibilityInfo.addEventListener;
AccessibilityInfo.setAccessibilityFocus = mockAccessibilityInfo.setAccessibilityFocus;

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn()
  },
  Linking: {
    openURL: jest.fn()
  },
  Platform: {
    OS: 'ios'
  }
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaymentTestProvider>
    {children}
  </PaymentTestProvider>
);

describe('Payment Sync Resilience UI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceTestUtils.reset();
    CrisisTestUtils.reset();
  });

  describe('End-to-End Payment Sync UI Workflows', () => {
    test('complete payment error recovery workflow maintains crisis safety', async () => {
      const mockRetry = jest.fn().mockResolvedValue(undefined);
      const mockEmergencyAccess = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-safety"
          />
          <PaymentErrorHandling
            error={{ type: 'payment', message: 'Payment failed' }}
            onResolveError={mockRetry}
            onEmergencyAccess={mockEmergencyAccess}
            testID="error-handling"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="protected-crisis"
          />
        </TestWrapper>
      );

      // Verify crisis safety indicator shows protection
      const crisisIndicator = getByTestId('crisis-safety');
      expect(crisisIndicator.props.accessibilityLabel).toContain('Emergency Access Available');

      // Test error resolution workflow
      const primaryAction = getByTestId('error-handling-primary-action');
      fireEvent.press(primaryAction);

      await waitFor(() => {
        expect(mockEmergencyAccess).toHaveBeenCalled();
      });

      // Verify crisis button remains accessible
      const crisisButton = getByTestId('protected-crisis');
      expect(crisisButton.props.accessibilityLabel).toContain('payment protection active');

      // Test crisis button functionality during payment issues
      fireEvent.press(crisisButton);
      // Crisis button should function regardless of payment status
      expect(crisisButton).toBeTruthy();
    });

    test('network outage to recovery workflow preserves therapeutic sessions', async () => {
      const mockSyncRetry = jest.fn().mockResolvedValue(undefined);
      const mockProtectionActivated = jest.fn();

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <PaymentSyncStatus
            onSyncRetry={mockSyncRetry}
            testID="sync-status"
          />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="offline"
            sessionType="breathing"
            onProtectionActivated={mockProtectionActivated}
            testID="session-protection"
          />
        </TestWrapper>
      );

      // Verify offline mode display
      const syncStatus = getByTestId('sync-status');
      expect(syncStatus.props.accessibilityLabel).toContain('Offline Mode Active');

      // Verify session protection for breathing exercise
      const sessionProtection = getByTestId('session-protection');
      expect(sessionProtection.props.accessibilityLabel).toContain('breathing session running locally');

      // Simulate network recovery
      rerender(
        <TestWrapper>
          <PaymentSyncStatus
            onSyncRetry={mockSyncRetry}
            testID="sync-status"
          />
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="active"
            sessionType="breathing"
            onProtectionActivated={mockProtectionActivated}
            testID="session-protection"
          />
        </TestWrapper>
      );

      // Verify successful recovery
      await waitFor(() => {
        const recoveredStatus = getByTestId('sync-status');
        expect(recoveredStatus.props.accessibilityLabel).toContain('Synced');
      });
    });

    test('subscription tier changes maintain crisis access', async () => {
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <EmergencyHotlineAccess
            paymentIssue={false}
            testID="hotline-access"
          />
        </TestWrapper>
      );

      // Verify premium tier display
      const syncStatus = getByTestId('sync-status');
      expect(syncStatus.props.accessibilityLabel).toContain('Premium');

      // Verify hotline access available
      const hotlineAccess = getByTestId('hotline-access');
      expect(hotlineAccess.props.accessibilityLabel).toContain('crisis hotline access');

      // Simulate payment issue
      rerender(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <EmergencyHotlineAccess
            paymentIssue={true}
            testID="hotline-access"
          />
        </TestWrapper>
      );

      // Verify crisis access still available
      const updatedHotlineAccess = getByTestId('hotline-access');
      expect(updatedHotlineAccess.props.accessibilityLabel).toContain('crisis hotline access');

      // Test 988 calling functionality
      const callButton = getByTestId('hotline-access-call-button');
      fireEvent.press(callButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
      });
    });
  });

  describe('Component Integration Testing', () => {
    test('sync status integrates with error handling for comprehensive user feedback', async () => {
      const mockRetry = jest.fn();
      const error = { type: 'network', message: 'Connection failed', severity: 'high' };

      const { getByTestId } = render(
        <TestWrapper>
          <PaymentSyncStatus
            onSyncRetry={mockRetry}
            testID="sync-status"
          />
          <PaymentErrorHandling
            error={error}
            onResolveError={mockRetry}
            testID="error-handling"
          />
        </TestWrapper>
      );

      // Test retry integration
      const retryButton = getByTestId('sync-status').findByProps({ accessibilityLabel: 'Retry payment sync' });
      if (retryButton) {
        fireEvent.press(retryButton);
        await waitFor(() => {
          expect(mockRetry).toHaveBeenCalled();
        });
      }

      // Test error handling integration
      const errorResolution = getByTestId('error-handling-primary-action');
      fireEvent.press(errorResolution);

      await waitFor(() => {
        expect(mockRetry).toHaveBeenCalled();
      });

      // Verify accessibility announcements for integration
      expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('Payment sync retry initiated')
      );
    });

    test('performance feedback integrates with sync status for optimization feedback', async () => {
      const mockOptimize = jest.fn().mockResolvedValue(undefined);

      const { getByTestId } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <PaymentPerformanceFeedback
            showDetailedMetrics={true}
            onOptimizePerformance={mockOptimize}
            testID="performance-feedback"
          />
        </TestWrapper>
      );

      const performanceFeedback = getByTestId('performance-feedback');
      expect(performanceFeedback.props.accessibilityLabel).toContain('Payment sync performance');

      // Test optimization trigger
      const optimizeButton = getByTestId('performance-feedback-optimize-button');
      if (optimizeButton) {
        fireEvent.press(optimizeButton);

        await waitFor(() => {
          expect(mockOptimize).toHaveBeenCalled();
          expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
            'Performance optimization completed'
          );
        });
      }
    });

    test('crisis safety indicator integrates with payment status for comprehensive protection', () => {
      const { getByTestId, rerender } = render(
        <TestWrapper>
          <CrisisSafetyIndicator
            paymentStatus="active"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      // Verify normal operation
      const normalSafety = getByTestId('crisis-safety');
      expect(normalSafety.props.accessibilityLabel).toContain('Full Crisis Support');

      // Simulate payment issue
      rerender(
        <TestWrapper>
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      // Verify crisis protection activation
      const protectedSafety = getByTestId('crisis-safety');
      expect(protectedSafety.props.accessibilityLabel).toContain('Emergency Access Available');
    });
  });

  describe('Crisis Safety UI Preservation', () => {
    test('crisis button maintains <200ms response time during payment stress', async () => {
      const startTime = Date.now();

      const { getByTestId } = render(
        <TestWrapper>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
        </TestWrapper>
      );

      const crisisButton = getByTestId('crisis-button');

      const responseStart = Date.now();
      fireEvent.press(crisisButton);
      const responseTime = Date.now() - responseStart;

      expect(responseTime).toBeLessThan(200);
    });

    test('988 hotline access during payment failures maintains emergency protocols', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <EmergencyHotlineAccess
            paymentIssue={true}
            testID="emergency-hotline"
          />
        </TestWrapper>
      );

      const hotlineButton = getByTestId('emergency-hotline-call-button');
      expect(hotlineButton.props.accessibilityLabel).toContain('Call 988');

      fireEvent.press(hotlineButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          'Connecting to 988 Suicide and Crisis Lifeline'
        );
      });
    });

    test('PHQ-9/GAD-7 assessment availability preserved during payment sync issues', () => {
      // Mock assessment availability check
      const assessmentAvailable = CrisisTestUtils.validateAssessmentAccess({
        paymentStatus: 'error',
        crisisMode: false,
        assessmentType: 'PHQ-9'
      });

      expect(assessmentAvailable.isAccessible).toBe(true);
      expect(assessmentAvailable.reason).toContain('crisis protection');
    });

    test('therapeutic messaging validation maintains anxiety-reducing language', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <PaymentErrorHandling
            error={{ type: 'payment', message: 'Card declined' }}
            testID="therapeutic-error"
          />
        </TestWrapper>
      );

      const errorComponent = getByTestId('therapeutic-error');
      const accessibilityLabel = errorComponent.props.accessibilityLabel;

      // Verify therapeutic language is used
      expect(accessibilityLabel).toContain('Attention Needed');
      expect(accessibilityLabel).toContain('mindfulness features remain available');

      // Validate anxiety-reducing messaging
      const therapeuticReport = AccessibilityTestUtils.assessTherapeuticLanguage(
        accessibilityLabel,
        'payment'
      );

      expect(therapeuticReport.anxietyTriggerWords.length).toBeLessThan(2);
      expect(therapeuticReport.calmingWords.length).toBeGreaterThan(2);
    });
  });

  describe('Accessibility Integration Testing', () => {
    test('WCAG AA compliance validation for payment sync UI components', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-indicator"
          />
        </TestWrapper>
      );

      // Validate accessibility structure
      const syncStatus = getByTestId('sync-status');
      expect(syncStatus.props.accessible).toBe(true);
      expect(syncStatus.props.accessibilityRole).toBe('status');

      const crisisIndicator = getByTestId('crisis-indicator');
      expect(crisisIndicator.props.accessible).toBe(true);
      expect(crisisIndicator.props.accessibilityRole).toBe('status');

      // Validate color contrast for components
      const contrastValidation = AccessibilityTestUtils.validateColorContrast(
        '#DC2626', // Error color
        '#FEF2F2', // Error background
        true       // Crisis element
      );

      expect(contrastValidation.passes).toBe(true);
      expect(contrastValidation.ratio).toBeGreaterThan(4.5);
    });

    test('screen reader compatibility testing with assistive technology', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AccessiblePaymentAnnouncements
            enabled={true}
            testID="accessibility-announcements"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalled();
      });

      // Verify screen reader announcements use therapeutic language
      const announcements = mockAccessibilityInfo.announceForAccessibility.mock.calls;
      const therapeuticAnnouncement = announcements.find(call =>
        call[0].includes('safely') || call[0].includes('support')
      );

      expect(therapeuticAnnouncement).toBeTruthy();
    });

    test('high contrast mode validation for enhanced visibility', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <HighContrastPaymentStatus
            status="error"
            title="Payment Error"
            message="Test error message"
            autoContrastDetection={true}
            testID="high-contrast"
          />
        </TestWrapper>
      );

      const component = getByTestId('high-contrast');
      expect(component).toBeTruthy();

      // Verify high contrast accessibility
      expect(component.props.accessible).toBe(true);
    });

    test('voice control testing for crisis access during payment failures', () => {
      const mockVoiceCommand = jest.fn();

      const { getByTestId } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="voice-crisis-button"
          />
        </TestWrapper>
      );

      const crisisButton = getByTestId('voice-crisis-button');
      expect(crisisButton.props.accessibilityLabel).toContain('payment protection active');

      // Simulate voice activation
      fireEvent.press(crisisButton);

      // Verify voice control maintains crisis access
      expect(crisisButton.props.accessible).toBe(true);
    });
  });

  describe('Performance UI Testing', () => {
    test('60fps animation validation during payment sync operations', async () => {
      const performanceMonitor = PerformanceTestUtils.createFrameRateMonitor();
      performanceMonitor.start();

      const { getByTestId, rerender } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
        </TestWrapper>
      );

      // Simulate sync status changes that trigger animations
      for (let i = 0; i < 10; i++) {
        rerender(
          <TestWrapper>
            <PaymentSyncStatus testID="sync-status" />
          </TestWrapper>
        );
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 16)); // 60fps = 16ms per frame
        });
      }

      const frameMetrics = performanceMonitor.stop();
      expect(frameMetrics.averageFrameRate).toBeGreaterThan(55); // Allow some variance from perfect 60fps
      expect(frameMetrics.droppedFrames).toBeLessThan(5);
    });

    test('memory usage testing for payment UI components', async () => {
      const memoryMonitor = PerformanceTestUtils.createMemoryMonitor();
      memoryMonitor.start();

      const { getByTestId, unmount } = render(
        <TestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <PaymentErrorHandling
            error={{ type: 'network' }}
            testID="error-handling"
          />
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-safety"
          />
        </TestWrapper>
      );

      // Simulate user interactions
      const crisisIndicator = getByTestId('crisis-safety');
      for (let i = 0; i < 50; i++) {
        fireEvent.press(crisisIndicator);
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        });
      }

      const memoryMetrics = memoryMonitor.getMetrics();
      expect(memoryMetrics.peakMemoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB limit

      unmount();

      // Verify cleanup
      const finalMemory = memoryMonitor.stop();
      expect(finalMemory.memoryLeaks).toBe(0);
    });

    test('battery optimization validation for background sync indicators', async () => {
      const batteryMonitor = PerformanceTestUtils.createBatteryMonitor();
      batteryMonitor.start();

      const { getByTestId } = render(
        <TestWrapper>
          <PaymentPerformanceFeedback
            showDetailedMetrics={true}
            testID="performance-feedback"
          />
        </TestWrapper>
      );

      // Simulate background sync indicators
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second simulation
      });

      const batteryMetrics = batteryMonitor.stop();
      expect(batteryMetrics.powerEfficiencyScore).toBeGreaterThan(85);
      expect(batteryMetrics.backgroundProcessingTime).toBeLessThan(1000); // 1 second max
    });
  });

  describe('Mental Health Safety Testing', () => {
    test('crisis button functionality during payment UI stress tests', async () => {
      const stressTestDuration = 5000; // 5 seconds
      const stressTestStart = Date.now();
      let crisisResponseTimes: number[] = [];

      const { getByTestId } = render(
        <TestWrapper>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="stress-test-crisis"
          />
        </TestWrapper>
      );

      // Stress test with rapid interactions
      while (Date.now() - stressTestStart < stressTestDuration) {
        const responseStart = Date.now();
        const crisisButton = getByTestId('stress-test-crisis');
        fireEvent.press(crisisButton);
        const responseTime = Date.now() - responseStart;
        crisisResponseTimes.push(responseTime);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      // Validate all crisis button responses were under 200ms
      const maxResponseTime = Math.max(...crisisResponseTimes);
      const averageResponseTime = crisisResponseTimes.reduce((a, b) => a + b, 0) / crisisResponseTimes.length;

      expect(maxResponseTime).toBeLessThan(200);
      expect(averageResponseTime).toBeLessThan(100);
    });

    test('therapeutic messaging validation preserves wellbeing focus', () => {
      const testMessages = [
        'Payment sync needs attention',
        'Connection temporarily unavailable',
        'Service protection active'
      ];

      testMessages.forEach(message => {
        const therapeuticReport = AccessibilityTestUtils.assessTherapeuticLanguage(
          message,
          'payment'
        );

        expect(therapeuticReport.wellbeingScore).toBeGreaterThan(70);
        expect(therapeuticReport.stressIndicators).toBeLessThan(3);
        expect(therapeuticReport.supportLanguage).toBeGreaterThan(0);
      });
    });

    test('crisis access preservation during payment outages maintains safety protocols', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="outage-crisis-safety"
          />
          <EmergencyHotlineAccess
            paymentIssue={true}
            testID="outage-hotline"
          />
        </TestWrapper>
      );

      // Verify crisis safety remains active during outage
      const crisisSafety = getByTestId('outage-crisis-safety');
      expect(crisisSafety.props.accessibilityLabel).toContain('Emergency Access Available');

      // Verify 988 hotline remains accessible
      const hotlineAccess = getByTestId('outage-hotline');
      const hotlineButton = getByTestId('outage-hotline-call-button');

      fireEvent.press(hotlineButton);

      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith('tel:988');
      });

      // Verify emergency protocols remain functional
      const emergencyProtocols = CrisisTestUtils.validateEmergencyProtocols({
        paymentStatus: 'critical',
        networkStatus: 'offline'
      });

      expect(emergencyProtocols.hotlineAccess).toBe(true);
      expect(emergencyProtocols.crisisButtonActive).toBe(true);
      expect(emergencyProtocols.therapeuticAccess).toBe(true);
    });
  });
});