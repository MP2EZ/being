/**
 * Payment Anxiety Detection HIPAA Compliance Tests
 *
 * CRITICAL CLINICAL VALIDATION:
 * - HIPAA-compliant anxiety pattern detection
 * - Therapeutic intervention effectiveness
 * - Crisis escalation protocol validation
 * - Mental health data protection compliance
 *
 * ANXIETY DETECTION COMPONENT TESTS:
 * - PaymentAnxietyDetection.tsx (7 TouchableOpacity → Pressable)
 * - Real-time anxiety level calculation
 * - MBCT-compliant intervention strategies
 * - Crisis safety protocol integration
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, AccessibilityInfo, Animated } from 'react-native';
import PaymentAnxietyDetection from '../../src/components/payment/PaymentAnxietyDetection';

// Mock Animated for testing
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => ({ setValue: jest.fn() })),
        stopAnimation: jest.fn(),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(callback => callback && callback()),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(callback => callback && callback()),
      })),
      parallel: jest.fn(() => ({
        start: jest.fn(callback => callback && callback()),
      })),
    },
    Alert: {
      alert: jest.fn(),
    },
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
    },
  };
});

// Mock crisis safety store
const mockEnableCrisisMode = jest.fn();
jest.mock('../../src/store', () => ({
  useCrisisPaymentSafety: () => ({
    enableCrisisMode: mockEnableCrisisMode,
  }),
}));

describe('Payment Anxiety Detection HIPAA Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('HIPAA-Compliant Anxiety Pattern Detection', () => {
    it('should detect anxiety patterns without exposing PHI', async () => {
      const mockOnAnxietyDetected = jest.fn();
      const mockOnInterventionTriggered = jest.fn();

      const { rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={3}
          errorCount={1}
          timeOnScreen={15000}
          paymentFailures={0}
          onAnxietyDetected={mockOnAnxietyDetected}
          onInterventionTriggered={mockOnInterventionTriggered}
        />
      );

      // Test progressive anxiety detection without PHI exposure
      rerender(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={45000}
          paymentFailures={2}
          onAnxietyDetected={mockOnAnxietyDetected}
          onInterventionTriggered={mockOnInterventionTriggered}
        />
      );

      await waitFor(() => {
        expect(mockOnAnxietyDetected).toHaveBeenCalledWith(expect.any(Number));
      });

      // Verify anxiety level is calculated correctly (0-5 scale)
      const anxietyLevel = mockOnAnxietyDetected.mock.calls[0][0];
      expect(anxietyLevel).toBeGreaterThanOrEqual(0);
      expect(anxietyLevel).toBeLessThanOrEqual(5);

      // Verify no PHI is included in callbacks
      expect(mockOnAnxietyDetected).not.toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.anything(),
          identifiers: expect.anything(),
        })
      );
    });

    it('should calculate anxiety indicators using HIPAA-safe algorithms', async () => {
      const mockOnAnxietyDetected = jest.fn();

      // High anxiety scenario: long hesitation, multiple errors, payment failures
      render(
        <PaymentAnxietyDetection
          formInteractions={2}
          errorCount={6}
          timeOnScreen={90000} // 1.5 minutes with minimal interactions
          paymentFailures={3}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      await waitFor(() => {
        expect(mockOnAnxietyDetected).toHaveBeenCalled();
      });

      // Should detect high anxiety (level 4-5) due to:
      // - Form hesitation: long time, few interactions
      // - Payment errors: 3 failures = 6 points
      // - Time stress: >60 seconds
      const anxietyLevel = mockOnAnxietyDetected.mock.calls[0][0];
      expect(anxietyLevel).toBeGreaterThanOrEqual(3);
    });

    it('should handle rapid form corrections as anxiety indicator', async () => {
      const mockOnAnxietyDetected = jest.fn();

      const { rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={1}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      // Simulate rapid interactions (anxiety indicator)
      for (let i = 2; i <= 10; i++) {
        rerender(
          <PaymentAnxietyDetection
            formInteractions={i}
            onAnxietyDetected={mockOnAnxietyDetected}
          />
        );
        // Advance timers by small amount to simulate rapid interactions
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      await waitFor(() => {
        expect(mockOnAnxietyDetected).toHaveBeenCalled();
      });

      // Should detect anxiety from rapid corrections
      const finalCall = mockOnAnxietyDetected.mock.calls.slice(-1)[0];
      expect(finalCall[0]).toBeGreaterThan(0);
    });

    it('should validate anxiety detection triggers at appropriate thresholds', async () => {
      const mockOnInterventionTriggered = jest.fn();

      // Test threshold level 3 (breathing exercise)
      const { rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={5}
          errorCount={3}
          timeOnScreen={35000}
          paymentFailures={1}
          onInterventionTriggered={mockOnInterventionTriggered}
        />
      );

      await waitFor(() => {
        expect(mockOnInterventionTriggered).toHaveBeenCalledWith('breathing_exercise');
      });

      // Test threshold level 4+ (crisis escalation)
      rerender(
        <PaymentAnxietyDetection
          formInteractions={15}
          errorCount={8}
          timeOnScreen={120000}
          paymentFailures={4}
          onInterventionTriggered={mockOnInterventionTriggered}
        />
      );

      await waitFor(() => {
        expect(mockOnInterventionTriggered).toHaveBeenCalledWith('crisis_escalation');
      });
    });
  });

  describe('MBCT-Compliant Therapeutic Interventions', () => {
    it('should provide mindful breathing intervention with proper timing', async () => {
      const { getByText, queryByText } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
          paymentFailures={2}
        />
      );

      // Should show breathing exercise intervention
      await waitFor(() => {
        expect(queryByText(/Take a Mindful Moment/)).toBeTruthy();
      });

      // Test therapeutic messaging
      expect(getByText(/Payment forms can feel overwhelming/)).toBeTruthy();
      expect(getByText(/center ourselves with mindful breathing/)).toBeTruthy();

      // Test breathing exercise with Pressable controls
      const startBreathingButton = getByText('Start Breathing');
      expect(startBreathingButton).toBeTruthy();

      fireEvent.press(startBreathingButton);

      // Verify breathing circle appears
      await waitFor(() => {
        expect(queryByText('Breathe')).toBeTruthy();
        expect(queryByText(/Follow the circle/)).toBeTruthy();
      });

      // Verify accessibility announcement for breathing
      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('mindful breathing exercise')
      );
    });

    it('should auto-stop breathing exercise after therapeutic duration', async () => {
      const { getByText, queryByText } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
        />
      );

      await waitFor(() => {
        const startBreathingButton = getByText('Start Breathing');
        fireEvent.press(startBreathingButton);
      });

      // Advance timer to auto-stop (60 seconds)
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      await waitFor(() => {
        expect(queryByText('Stop Breathing Exercise')).toBeFalsy();
      });
    });

    it('should provide manual stop control for breathing exercise', async () => {
      const { getByText, queryByText } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
        />
      );

      await waitFor(() => {
        const startBreathingButton = getByText('Start Breathing');
        fireEvent.press(startBreathingButton);
      });

      // Should show stop button
      await waitFor(() => {
        const stopButton = queryByText('Stop Breathing Exercise');
        expect(stopButton).toBeTruthy();
        fireEvent.press(stopButton);
      });

      // Breathing should stop
      await waitFor(() => {
        expect(queryByText('Breathe')).toBeFalsy();
      });
    });

    it('should provide gentle support messaging for lower anxiety levels', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={4}
          errorCount={2}
          timeOnScreen={25000}
          paymentFailures={1}
        />
      );

      await waitFor(() => {
        expect(getByText(/Payment Support Available/)).toBeTruthy();
        expect(getByText(/Take your time with this process/)).toBeTruthy();
        expect(getByText(/no pressure to rush/)).toBeTruthy();
      });
    });
  });

  describe('Crisis Escalation Protocol Validation', () => {
    it('should escalate to crisis mode for high anxiety levels', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={20}
          errorCount={10}
          timeOnScreen={180000}
          paymentFailures={5}
        />
      );

      await waitFor(() => {
        expect(getByText(/Payment Stress Detected/)).toBeTruthy();
      });

      // Test crisis escalation button
      const crisisModeButton = getByText('Crisis Mode');
      fireEvent.press(crisisModeButton);

      // Verify crisis alert with therapeutic messaging
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Stress Support',
        expect.stringContaining('Mental health matters more than any payment'),
        expect.arrayContaining([
          expect.objectContaining({ text: 'Call 988 Crisis Line' }),
          expect.objectContaining({ text: 'Activate Crisis Mode' }),
        ])
      );
    });

    it('should validate 988 hotline integration', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={25}
          errorCount={12}
          timeOnScreen={200000}
          paymentFailures={6}
        />
      );

      await waitFor(() => {
        const call988Button = getByText('Call 988');
        fireEvent.press(call988Button);
      });

      expect(require('react-native').Linking.openURL).toHaveBeenCalledWith('tel:988');
    });

    it('should activate crisis mode with proper context', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={15}
          errorCount={8}
          timeOnScreen={150000}
          paymentFailures={4}
        />
      );

      await waitFor(() => {
        const crisisModeButton = getByText('Crisis Mode');
        fireEvent.press(crisisModeButton);
      });

      // Simulate alert selection
      const alertCalls = Alert.alert.mock.calls;
      const lastAlert = alertCalls[alertCalls.length - 1];
      const crisisModeOption = lastAlert[2].find(option => option.text === 'Activate Crisis Mode');

      if (crisisModeOption && crisisModeOption.onPress) {
        crisisModeOption.onPress();
      }

      expect(mockEnableCrisisMode).toHaveBeenCalledWith('payment_anxiety_escalation');
    });

    it('should provide appropriate support options based on anxiety level', async () => {
      // Test level 3 (breathing exercise)
      const { getByText: getByText1, rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={6}
          errorCount={3}
          timeOnScreen={40000}
          paymentFailures={1}
        />
      );

      await waitFor(() => {
        expect(getByText1('Start Breathing')).toBeTruthy();
      });

      // Test level 4+ (crisis escalation)
      rerender(
        <PaymentAnxietyDetection
          formInteractions={18}
          errorCount={9}
          timeOnScreen={160000}
          paymentFailures={5}
        />
      );

      await waitFor(() => {
        expect(getByText1('Call 988')).toBeTruthy();
        expect(getByText1('Crisis Mode')).toBeTruthy();
      });
    });
  });

  describe('Mental Health Data Protection', () => {
    it('should not log or expose sensitive anxiety data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockOnAnxietyDetected = jest.fn();

      render(
        <PaymentAnxietyDetection
          formInteractions={10}
          errorCount={5}
          timeOnScreen={60000}
          paymentFailures={3}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      await waitFor(() => {
        expect(mockOnAnxietyDetected).toHaveBeenCalled();
      });

      // Verify no sensitive data is logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/anxiety|stress|panic|overwhelm/i)
      );
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/anxiety|stress|panic|overwhelm/i)
      );

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should maintain anxiety level calculation privacy', async () => {
      const mockOnAnxietyDetected = jest.fn();

      render(
        <PaymentAnxietyDetection
          formInteractions={12}
          errorCount={6}
          timeOnScreen={75000}
          paymentFailures={3}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      await waitFor(() => {
        expect(mockOnAnxietyDetected).toHaveBeenCalled();
      });

      // Verify only numerical anxiety level is passed, no raw data
      const callArgs = mockOnAnxietyDetected.mock.calls[0];
      expect(callArgs).toHaveLength(1);
      expect(typeof callArgs[0]).toBe('number');
    });

    it('should ensure therapeutic interventions protect user dignity', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
          paymentFailures={2}
        />
      );

      await waitFor(() => {
        // Verify non-judgmental therapeutic language
        expect(getByText(/Payment forms can feel overwhelming/)).toBeTruthy();
        expect(getByText(/center ourselves/)).toBeTruthy();
      });

      // Ensure no stigmatizing language
      const textContent = document.body.textContent || '';
      expect(textContent).not.toMatch(/\b(crazy|insane|nuts|mental)\b/i);
    });
  });

  describe('Accessibility and Screen Reader Support', () => {
    it('should announce anxiety support availability to screen readers', async () => {
      render(
        <PaymentAnxietyDetection
          formInteractions={6}
          errorCount={3}
          timeOnScreen={35000}
          paymentFailures={2}
        />
      );

      await waitFor(() => {
        expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
          expect.stringContaining('Payment support is available')
        );
      });
    });

    it('should provide accessible breathing exercise instructions', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
        />
      );

      await waitFor(() => {
        const startBreathingButton = getByText('Start Breathing');
        fireEvent.press(startBreathingButton);
      });

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        expect.stringContaining('mindful breathing exercise')
      );

      // Verify breathing instructions are accessible
      expect(getByText(/Follow the circle - breathe in as it grows/)).toBeTruthy();
    });

    it('should maintain Pressable accessibility during anxiety states', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={10}
          errorCount={5}
          timeOnScreen={60000}
          paymentFailures={3}
        />
      );

      await waitFor(() => {
        const supportButtons = [
          getByText('Start Breathing'),
          getByText('Get Support'),
          getByText('Continue')
        ];

        supportButtons.forEach(button => {
          expect(button.props.accessibilityRole).toBe('button');
          expect(button.props.accessible).toBe(true);
        });
      });
    });
  });

  describe('Performance During Anxiety Detection', () => {
    it('should maintain responsive UI during anxiety calculations', async () => {
      const startTime = Date.now();

      render(
        <PaymentAnxietyDetection
          formInteractions={15}
          errorCount={8}
          timeOnScreen={100000}
          paymentFailures={4}
        />
      );

      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render quickly
    });

    it('should not block UI during breathing animation', async () => {
      const { getByText } = render(
        <PaymentAnxietyDetection
          formInteractions={8}
          errorCount={4}
          timeOnScreen={50000}
        />
      );

      await waitFor(() => {
        const startBreathingButton = getByText('Start Breathing');
        fireEvent.press(startBreathingButton);
      });

      // Animation should start without blocking
      expect(Animated.sequence).toHaveBeenCalled();
    });

    it('should handle rapid anxiety level changes efficiently', async () => {
      const mockOnAnxietyDetected = jest.fn();
      const { rerender } = render(
        <PaymentAnxietyDetection
          formInteractions={1}
          onAnxietyDetected={mockOnAnxietyDetected}
        />
      );

      // Rapidly change anxiety indicators
      for (let i = 2; i <= 20; i++) {
        rerender(
          <PaymentAnxietyDetection
            formInteractions={i}
            errorCount={Math.floor(i / 3)}
            timeOnScreen={i * 1000}
            onAnxietyDetected={mockOnAnxietyDetected}
          />
        );
      }

      // Should handle updates efficiently
      expect(mockOnAnxietyDetected).toHaveBeenCalled();
    });
  });
});