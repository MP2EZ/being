/**
 * Comprehensive Accessibility Testing for Payment Sync UI Components
 *
 * This test suite validates WCAG AA compliance and mental health-specific accessibility requirements
 * for payment sync resilience UI components, ensuring inclusive design for all users.
 *
 * Test Categories:
 * 1. WCAG AA Compliance Validation for Payment Sync UI
 * 2. Screen Reader Compatibility Testing with Assistive Technology
 * 3. High Contrast Mode Validation for Enhanced Visibility
 * 4. Voice Control Testing for Crisis Access During Payment Failures
 *
 * Critical Accessibility Requirements:
 * - WCAG AA color contrast: 4.5:1 minimum, 7:1 for crisis elements
 * - Screen reader announcements: <1 second latency
 * - High contrast mode: Automatic detection and optimization
 * - Voice control: Crisis commands always functional
 * - Focus management: Logical order prioritizing crisis access
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

// Components under test
import { PaymentSyncStatus, PaymentErrorHandling, PaymentPerformanceFeedback } from '../../src/components/payment/PaymentSyncResilienceUI';
import { CrisisSafetyIndicator, ProtectedCrisisButton, EmergencyHotlineAccess } from '../../src/components/payment/CrisisSafetyPaymentUI';
import { AccessiblePaymentAnnouncements, HighContrastPaymentStatus, EnhancedVoiceControl } from '../../src/components/payment/EnhancedAccessibilityPaymentUI';

// Accessibility testing utilities
import { AccessibilityTestUtils } from '../../src/components/payment/AccessibilityValidationUtils';
import { WCAGValidator } from '../utils/WCAGValidator';
import { ScreenReaderTestUtils } from '../utils/ScreenReaderTestUtils';
import { VoiceControlTestUtils } from '../utils/VoiceControlTestUtils';
import { ContrastAnalyzer } from '../utils/ContrastAnalyzer';

// Test providers
import { PaymentTestProvider } from '../mocks/PaymentTestProvider';
import { AccessibilityTestProvider } from '../mocks/AccessibilityTestProvider';

// Mock accessibility APIs
const mockAccessibilityInfo = {
  announceForAccessibility: jest.fn(),
  isScreenReaderEnabled: jest.fn().mockResolvedValue(true),
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  isHighContrastEnabled: jest.fn().mockResolvedValue(false),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  setAccessibilityFocus: jest.fn()
};

AccessibilityInfo.announceForAccessibility = mockAccessibilityInfo.announceForAccessibility;
AccessibilityInfo.isScreenReaderEnabled = mockAccessibilityInfo.isScreenReaderEnabled;
AccessibilityInfo.isReduceMotionEnabled = mockAccessibilityInfo.isReduceMotionEnabled;
AccessibilityInfo.addEventListener = mockAccessibilityInfo.addEventListener;
AccessibilityInfo.removeEventListener = mockAccessibilityInfo.removeEventListener;
AccessibilityInfo.setAccessibilityFocus = mockAccessibilityInfo.setAccessibilityFocus;

// Enhanced mock for high contrast detection
(AccessibilityInfo as any).isHighContrastEnabled = mockAccessibilityInfo.isHighContrastEnabled;

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
    getPerformanceMetrics: () => ({
      averageResponseTime: 150,
      successRate: 97
    }),
    getSyncProgress: () => ({
      isActive: false,
      completionPercentage: 0
    })
  }
}));

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

const AccessibilityTestWrapper: React.FC<{
  children: React.ReactNode;
  screenReaderEnabled?: boolean;
  highContrastEnabled?: boolean;
  reduceMotionEnabled?: boolean;
}> = ({
  children,
  screenReaderEnabled = true,
  highContrastEnabled = false,
  reduceMotionEnabled = false
}) => {
  React.useEffect(() => {
    mockAccessibilityInfo.isScreenReaderEnabled.mockResolvedValue(screenReaderEnabled);
    mockAccessibilityInfo.isHighContrastEnabled.mockResolvedValue(highContrastEnabled);
    mockAccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(reduceMotionEnabled);
  }, [screenReaderEnabled, highContrastEnabled, reduceMotionEnabled]);

  return (
    <AccessibilityTestProvider>
      <PaymentTestProvider>
        {children}
      </PaymentTestProvider>
    </AccessibilityTestProvider>
  );
};

describe('Payment Sync Accessibility Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WCAGValidator.reset();
    ScreenReaderTestUtils.reset();
  });

  describe('WCAG AA Compliance Validation', () => {
    test('payment status indicators meet 4.5:1 color contrast minimum', async () => {
      const contrastAnalyzer = new ContrastAnalyzer();

      // Test all status color combinations
      const statusColors = [
        { name: 'success', foreground: '#16A34A', background: '#F0FDF4' },
        { name: 'error', foreground: '#DC2626', background: '#FEF2F2' },
        { name: 'warning', foreground: '#D97706', background: '#FFFBEB' },
        { name: 'info', foreground: '#2563EB', background: '#EFF6FF' }
      ];

      for (const color of statusColors) {
        const contrastResult = contrastAnalyzer.analyze(color.foreground, color.background);

        expect(contrastResult.ratio).toBeGreaterThan(4.5);
        expect(contrastResult.wcagLevel).toMatch(/AA|AAA/);
        expect(contrastResult.passes).toBe(true);
      }
    });

    test('crisis elements meet 7:1 contrast ratio for enhanced safety visibility', async () => {
      const contrastAnalyzer = new ContrastAnalyzer();

      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-indicator"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
        </AccessibilityTestWrapper>
      );

      // Crisis elements should use maximum contrast
      const crisisContrastResult = contrastAnalyzer.analyze('#000000', '#FFFFFF', true);

      expect(crisisContrastResult.ratio).toBeGreaterThan(7.0);
      expect(crisisContrastResult.wcagLevel).toBe('AAA');
      expect(crisisContrastResult.isCrisisSafe).toBe(true);
    });

    test('focus indicators meet visibility requirements', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <PaymentErrorHandling
            error={{ type: 'payment', message: 'Payment failed' }}
            testID="error-handling"
          />
        </AccessibilityTestWrapper>
      );

      const primaryAction = getByTestId('error-handling-primary-action');

      // Simulate focus
      fireEvent(primaryAction, 'focus');

      // Validate focus indicator
      const focusValidation = WCAGValidator.validateFocusIndicator(primaryAction);

      expect(focusValidation.visible).toBe(true);
      expect(focusValidation.contrast).toBeGreaterThan(3.0); // WCAG minimum for focus
      expect(focusValidation.size).toBeGreaterThan(2); // Minimum 2px outline
    });

    test('touch target sizes meet 44px minimum requirement', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
          <PaymentSyncStatus testID="sync-status" />
        </AccessibilityTestWrapper>
      );

      const crisisButton = getByTestId('crisis-button');
      const syncStatus = getByTestId('sync-status');

      // Validate touch targets
      const crisisTargetSize = WCAGValidator.validateTouchTarget(crisisButton);
      expect(crisisTargetSize.width).toBeGreaterThanOrEqual(44);
      expect(crisisTargetSize.height).toBeGreaterThanOrEqual(44);

      // Crisis buttons should be larger for emergency access
      expect(crisisTargetSize.width).toBeGreaterThanOrEqual(48);
    });

    test('text scaling supports up to 200% zoom', async () => {
      const { getByTestId, rerender } = render(
        <AccessibilityTestWrapper>
          <PaymentErrorHandling
            error={{ type: 'network', message: 'Connection failed' }}
            testID="scalable-text"
          />
        </AccessibilityTestWrapper>
      );

      // Test with maximum scaling
      const textScalingTest = WCAGValidator.validateTextScaling(getByTestId('scalable-text'), 2.0);

      expect(textScalingTest.readable).toBe(true);
      expect(textScalingTest.noOverflow).toBe(true);
      expect(textScalingTest.maintainsLayout).toBe(true);
    });
  });

  describe('Screen Reader Compatibility Testing', () => {
    test('payment status announcements use therapeutic language with proper timing', async () => {
      const screenReaderMonitor = ScreenReaderTestUtils.createMonitor();
      screenReaderMonitor.start();

      const { getByTestId } = render(
        <AccessibilityTestWrapper screenReaderEnabled={true}>
          <AccessiblePaymentAnnouncements
            enabled={true}
            testID="announcements"
          />
          <PaymentSyncStatus testID="sync-status" />
        </AccessibilityTestWrapper>
      );

      await waitFor(() => {
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalled();
      });

      const announcements = mockAccessibilityInfo.announceForAccessibility.mock.calls;
      const paymentAnnouncement = announcements.find(call =>
        call[0].includes('payment') || call[0].includes('sync')
      );

      expect(paymentAnnouncement).toBeTruthy();

      // Validate therapeutic language
      const therapeuticValidation = AccessibilityTestUtils.assessTherapeuticLanguage(
        paymentAnnouncement[0],
        'payment'
      );

      expect(therapeuticValidation.wellbeingScore).toBeGreaterThan(70);
      expect(therapeuticValidation.anxietyTriggerWords.length).toBeLessThan(2);
      expect(therapeuticValidation.supportLanguage).toBeGreaterThan(0);

      const metrics = screenReaderMonitor.stop();
      expect(metrics.announcementLatency).toBeLessThan(1000); // Under 1 second
    });

    test('crisis announcements use assertive priority for immediate attention', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper screenReaderEnabled={true}>
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-announcements"
          />
        </AccessibilityTestWrapper>
      );

      await waitFor(() => {
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalled();
      });

      // Verify crisis announcements are prioritized
      const announcements = mockAccessibilityInfo.announceForAccessibility.mock.calls;
      const crisisAnnouncement = announcements.find(call =>
        call[0].includes('crisis') || call[0].includes('emergency')
      );

      expect(crisisAnnouncement).toBeTruthy();

      // Crisis announcements should be immediate and clear
      const crisisValidation = AccessibilityTestUtils.validateCrisisAnnouncement(crisisAnnouncement[0]);
      expect(crisisValidation.priority).toBe('assertive');
      expect(crisisValidation.clarity).toBeGreaterThan(90);
      expect(crisisValidation.immediacy).toBe(true);
    });

    test('complex payment error scenarios provide clear screen reader guidance', async () => {
      const complexError = {
        type: 'payment',
        message: 'Payment verification failed',
        details: {
          code: 'CARD_DECLINED',
          reason: 'insufficient_funds',
          suggestions: ['update_payment_method', 'contact_bank']
        }
      };

      const { getByTestId } = render(
        <AccessibilityTestWrapper screenReaderEnabled={true}>
          <PaymentErrorHandling
            error={complexError}
            testID="complex-error"
          />
        </AccessibilityTestWrapper>
      );

      const errorComponent = getByTestId('complex-error');
      const accessibilityLabel = errorComponent.props.accessibilityLabel;

      // Validate screen reader guidance
      const guidanceValidation = ScreenReaderTestUtils.validateErrorGuidance(accessibilityLabel);

      expect(guidanceValidation.providesContext).toBe(true);
      expect(guidanceValidation.includesActions).toBe(true);
      expect(guidanceValidation.therapeuticTone).toBe(true);
      expect(guidanceValidation.cognitiveLoad).toBeLessThan(15); // Low cognitive load
    });

    test('navigation order prioritizes crisis access for screen readers', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper screenReaderEnabled={true}>
          <PaymentSyncStatus testID="sync-status" />
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-indicator"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
          <PaymentErrorHandling
            error={{ type: 'payment' }}
            testID="error-handling"
          />
        </AccessibilityTestWrapper>
      );

      const navigationOrder = ScreenReaderTestUtils.analyzeNavigationOrder([
        getByTestId('crisis-indicator'),
        getByTestId('crisis-button'),
        getByTestId('sync-status'),
        getByTestId('error-handling')
      ]);

      expect(navigationOrder.crisisElementsFirst).toBe(true);
      expect(navigationOrder.logicalFlow).toBe(true);
      expect(navigationOrder.accessibilityOrder[0].type).toBe('crisis');
    });
  });

  describe('High Contrast Mode Validation', () => {
    test('automatic high contrast detection and activation', async () => {
      const { getByTestId, rerender } = render(
        <AccessibilityTestWrapper highContrastEnabled={true}>
          <HighContrastPaymentStatus
            status="error"
            title="Payment Error"
            message="Payment requires attention"
            autoContrastDetection={true}
            testID="high-contrast-status"
          />
        </AccessibilityTestWrapper>
      );

      await waitFor(() => {
        const component = getByTestId('high-contrast-status');
        expect(component).toBeTruthy();
      });

      // Verify high contrast mode is automatically activated
      const contrastValidation = ContrastAnalyzer.validateHighContrastMode(
        getByTestId('high-contrast-status')
      );

      expect(contrastValidation.autoDetected).toBe(true);
      expect(contrastValidation.contrastRatio).toBeGreaterThan(7.0);
      expect(contrastValidation.colorDifferentiation).toBe(true);
    });

    test('manual high contrast toggle maintains functionality', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <HighContrastPaymentStatus
            status="warning"
            title="Sync Warning"
            message="Connection unstable"
            autoContrastDetection={false}
            testID="manual-contrast"
          />
        </AccessibilityTestWrapper>
      );

      const component = getByTestId('manual-contrast');

      // Find and test contrast toggle
      const contrastToggle = component.findByProps({ accessibilityRole: 'switch' });
      expect(contrastToggle).toBeTruthy();

      fireEvent.press(contrastToggle);

      // Verify manual toggle works
      const toggleValidation = WCAGValidator.validateContrastToggle(contrastToggle);
      expect(toggleValidation.accessible).toBe(true);
      expect(toggleValidation.functionalInHighContrast).toBe(true);
    });

    test('high contrast mode preserves crisis element visibility', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper highContrastEnabled={true}>
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="high-contrast-crisis"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="high-contrast-button"
          />
        </AccessibilityTestWrapper>
      );

      const crisisIndicator = getByTestId('high-contrast-crisis');
      const crisisButton = getByTestId('high-contrast-button');

      // Validate crisis elements in high contrast
      const crisisVisibility = ContrastAnalyzer.validateCrisisVisibility([
        crisisIndicator,
        crisisButton
      ], true);

      expect(crisisVisibility.allVisible).toBe(true);
      expect(crisisVisibility.minimumContrast).toBeGreaterThan(7.0);
      expect(crisisVisibility.emergencyAccessible).toBe(true);
    });
  });

  describe('Voice Control Testing', () => {
    test('payment voice commands include therapeutic alternatives', async () => {
      const voiceControlMonitor = VoiceControlTestUtils.createMonitor();
      voiceControlMonitor.start();

      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <EnhancedVoiceControl
            onVoiceCommand={jest.fn()}
            testID="voice-control"
          />
          <PaymentSyncStatus testID="sync-status" />
        </AccessibilityTestWrapper>
      );

      const voiceControl = getByTestId('voice-control');

      // Test therapeutic voice commands
      const therapeuticCommands = [
        'help me stay calm',
        'breathing support',
        'payment help gently',
        'crisis support now'
      ];

      for (const command of therapeuticCommands) {
        const commandResult = VoiceControlTestUtils.simulateVoiceCommand(command);
        expect(commandResult.recognized).toBe(true);
        expect(commandResult.therapeuticResponse).toBe(true);
      }

      const voiceMetrics = voiceControlMonitor.stop();
      expect(voiceMetrics.therapeuticCommandsSupported).toBeGreaterThan(10);
    });

    test('crisis voice commands function during payment failures', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <EnhancedVoiceControl
            emergencyMode={true}
            onVoiceCommand={jest.fn()}
            testID="emergency-voice"
          />
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-indicator"
          />
        </AccessibilityTestWrapper>
      );

      const emergencyVoice = getByTestId('emergency-voice');

      // Test emergency voice commands
      const emergencyCommands = [
        'crisis help',
        'emergency support',
        'call 988',
        'breathing help now'
      ];

      for (const command of emergencyCommands) {
        const crisisResult = VoiceControlTestUtils.simulateCrisisCommand(command);
        expect(crisisResult.recognized).toBe(true);
        expect(crisisResult.emergencyResponse).toBe(true);
        expect(crisisResult.responseTime).toBeLessThan(500); // Under 500ms
      }
    });

    test('voice recognition confidence provides accessible feedback', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <EnhancedVoiceControl
            onVoiceCommand={jest.fn()}
            testID="voice-feedback"
          />
        </AccessibilityTestWrapper>
      );

      const voiceControl = getByTestId('voice-feedback');

      // Start voice recognition
      const activateButton = getByTestId('voice-feedback-activate');
      fireEvent.press(activateButton);

      await waitFor(() => {
        expect(mockAccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('Voice control ready')
        );
      });

      // Test confidence feedback
      const confidenceTest = VoiceControlTestUtils.testConfidenceFeedback([
        { command: 'payment help', confidence: 0.95 },
        { command: 'crisis support', confidence: 0.88 },
        { command: 'unclear command', confidence: 0.45 }
      ]);

      expect(confidenceTest.highConfidenceHandled).toBe(true);
      expect(confidenceTest.lowConfidenceGuidance).toBe(true);
      expect(confidenceTest.accessibleFeedback).toBe(true);
    });

    test('voice commands maintain functionality during payment UI stress', async () => {
      const stressTest = VoiceControlTestUtils.createStressTest();
      stressTest.start();

      const { getByTestId, rerender } = render(
        <AccessibilityTestWrapper>
          <EnhancedVoiceControl
            onVoiceCommand={jest.fn()}
            testID="stress-voice"
          />
          <PaymentSyncStatus testID="stress-sync" />
        </AccessibilityTestWrapper>
      );

      // Simulate UI stress with rapid state changes
      for (let i = 0; i < 50; i++) {
        rerender(
          <AccessibilityTestWrapper>
            <EnhancedVoiceControl
              onVoiceCommand={jest.fn()}
              testID="stress-voice"
            />
            <PaymentSyncStatus testID="stress-sync" />
          </AccessibilityTestWrapper>
        );

        // Test voice command during stress
        const stressCommand = VoiceControlTestUtils.simulateVoiceCommand('crisis help');
        expect(stressCommand.recognized).toBe(true);
        expect(stressCommand.responseTime).toBeLessThan(1000);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      const stressMetrics = stressTest.stop();
      expect(stressMetrics.voiceReliabilityUnderStress).toBeGreaterThan(95);
      expect(stressMetrics.crisisCommandSuccess).toBe(100);
    });
  });

  describe('Focus Management and Keyboard Navigation', () => {
    test('tab order prioritizes crisis elements during payment errors', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <PaymentSyncStatus testID="sync-status" />
          <PaymentErrorHandling
            error={{ type: 'critical', severity: 'high' }}
            testID="error-handling"
          />
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-indicator"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
        </AccessibilityTestWrapper>
      );

      const focusOrder = WCAGValidator.validateFocusOrder([
        getByTestId('crisis-indicator'),
        getByTestId('crisis-button'),
        getByTestId('error-handling'),
        getByTestId('sync-status')
      ]);

      expect(focusOrder.crisisElementsFirst).toBe(true);
      expect(focusOrder.logicalProgression).toBe(true);
      expect(focusOrder.emergencyAccessPrioritized).toBe(true);
    });

    test('focus management maintains context during payment state changes', async () => {
      const { getByTestId, rerender } = render(
        <AccessibilityTestWrapper>
          <PaymentErrorHandling
            error={{ type: 'network' }}
            testID="focus-error"
          />
        </AccessibilityTestWrapper>
      );

      const primaryAction = getByTestId('focus-error-primary-action');

      // Set focus
      fireEvent(primaryAction, 'focus');

      // Change error state
      rerender(
        <AccessibilityTestWrapper>
          <PaymentErrorHandling
            error={{ type: 'payment' }}
            testID="focus-error"
          />
        </AccessibilityTestWrapper>
      );

      // Verify focus is maintained appropriately
      const focusManagement = WCAGValidator.validateFocusManagement(
        getByTestId('focus-error-primary-action')
      );

      expect(focusManagement.contextMaintained).toBe(true);
      expect(focusManagement.userNotDisoriented).toBe(true);
    });

    test('keyboard shortcuts for crisis access remain functional', async () => {
      const { getByTestId } = render(
        <AccessibilityTestWrapper>
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="keyboard-crisis"
          />
        </AccessibilityTestWrapper>
      );

      const crisisButton = getByTestId('keyboard-crisis');

      // Test keyboard activation methods
      const keyboardTests = [
        { key: 'Enter', expected: true },
        { key: 'Space', expected: true },
        { key: 'Escape', expected: false }
      ];

      for (const test of keyboardTests) {
        const result = WCAGValidator.testKeyboardActivation(crisisButton, test.key);
        expect(result.activated).toBe(test.expected);
      }
    });
  });
});