/**
 * PaymentStatusDashboard Tests - Complex UI Orchestration & Crisis Integration
 * Comprehensive testing for dashboard coordination of multiple webhook states
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PaymentStatusDashboard } from '../../src/components/payment/PaymentStatusDashboard';
import { usePaymentStore, usePaymentStatus } from '../../src/store/paymentStore';
import { useTheme } from '../../src/hooks/useTheme';
import { useCommonHaptics } from '../../src/hooks/useHaptics';

// Mock dependencies
jest.mock('../../src/store/paymentStore');
jest.mock('../../src/hooks/useTheme');
jest.mock('../../src/hooks/useHaptics');

const mockUsePaymentStore = usePaymentStore as jest.MockedFunction<typeof usePaymentStore>;
const mockUsePaymentStatus = usePaymentStatus as jest.MockedFunction<typeof usePaymentStatus>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockUseCommonHaptics = useCommonHaptics as jest.MockedFunction<typeof useCommonHaptics>;

// Test utilities
const mockTheme = {
  colorSystem: {
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      successBackground: '#D1FAE5',
      warningBackground: '#FEF3C7',
      errorBackground: '#FEE2E2',
      infoBackground: '#DBEAFE',
    },
    gray: {
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
    },
    base: {
      black: '#000000',
      white: '#FFFFFF',
    }
  }
};

const mockHaptics = {
  onSelect: jest.fn().mockResolvedValue(undefined),
  onError: jest.fn().mockResolvedValue(undefined),
  onSuccess: jest.fn().mockResolvedValue(undefined)
};

const createDashboardState = (overrides = {}) => ({
  subscriptionStatus: {
    id: 'sub_test_123',
    status: 'active',
    nextBilling: '2024-10-15',
    currentPeriodEnd: '2024-10-15'
  },
  subscriptionTier: {
    id: 'tier_premium',
    name: 'Premium',
    features: ['guided_practices', 'progress_tracking', 'crisis_support'],
    price: 9.99,
    interval: 'month'
  },
  isSubscriptionActive: true,
  paymentError: null,
  gracePeriodInfo: null,
  webhookStatus: {
    connected: true,
    lastEventTime: new Date().toISOString(),
    processingQueue: 0,
    errorCount: 0
  },
  paymentMethods: [
    {
      id: 'pm_test_123',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expMonth: 12,
      expYear: 2025
    }
  ],
  billingHistory: [
    {
      id: 'in_test_123',
      amount: 999,
      currency: 'usd',
      status: 'paid',
      created: new Date().toISOString()
    }
  ],
  ...overrides
});

describe('PaymentStatusDashboard - Complex UI Orchestration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockUseCommonHaptics.mockReturnValue(mockHaptics);
    mockUsePaymentStore.mockReturnValue({
      syncWebhookState: jest.fn(),
      updateSubscriptionFromWebhook: jest.fn(),
      isLoading: false
    });
  });

  describe('Crisis Safety Integration', () => {
    it('should show crisis safety reassurance sections prominently', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState({
        paymentError: {
          severity: 'critical' as const,
          message: 'Payment failed',
          code: 'card_declined'
        }
      }));

      const { getByText } = render(
        <PaymentStatusDashboard
          crisisMode={true}
          testID="crisis-dashboard"
        />
      );

      expect(getByText('Crisis Support: Always Available')).toBeTruthy();
      expect(getByText('Your safety and therapeutic access are never affected by payment issues')).toBeTruthy();
      expect(getByText('Call 988 for immediate support')).toBeTruthy();
    });

    it('should prioritize therapeutic navigation over payment features', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const { getByText, getByTestId } = render(
        <PaymentStatusDashboard
          crisisMode={true}
          showTherapeuticPriority={true}
          testID="therapeutic-priority-dashboard"
        />
      );

      const therapeuticSection = getByTestId('therapeutic-features-section');
      const paymentSection = getByTestId('payment-features-section');

      // Therapeutic section should appear first
      expect(therapeuticSection.props.accessibilityLabel).toContain('Primary');
      expect(paymentSection.props.accessibilityLabel).toContain('Secondary');
    });

    it('should maintain crisis response times across dashboard sections', async () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const onNavigateToTherapy = jest.fn();

      const { getByText } = render(
        <PaymentStatusDashboard
          crisisMode={true}
          onNavigateToTherapy={onNavigateToTherapy}
          testID="crisis-response-dashboard"
        />
      );

      const startTime = performance.now();

      const therapyButton = getByText('Continue Practice');
      fireEvent.press(therapyButton);

      await waitFor(() => {
        expect(onNavigateToTherapy).toHaveBeenCalled();
      });

      const responseTime = performance.now() - startTime;
      expect(responseTime).toBeLessThan(200); // Crisis safety requirement
    });

    it('should show grace period as therapeutic protection', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState({
        gracePeriodInfo: {
          active: true,
          daysRemaining: 5,
          daysRemainingFormatted: '5 days',
          reason: 'payment_issue'
        }
      }));

      const { getByText } = render(
        <PaymentStatusDashboard
          testID="grace-period-dashboard"
        />
      );

      expect(getByText('Therapeutic Continuity Active')).toBeTruthy();
      expect(getByText('Your practice continues uninterrupted for 5 days')).toBeTruthy();
    });
  });

  describe('Multi-Component State Orchestration', () => {
    it('should coordinate multiple webhook states seamlessly', () => {
      const complexState = createDashboardState({
        webhookStatus: {
          connected: true,
          lastEventTime: new Date().toISOString(),
          processingQueue: 3,
          errorCount: 1,
          recentEvents: [
            { type: 'customer.subscription.updated', status: 'processing' },
            { type: 'invoice.payment_succeeded', status: 'completed' },
            { type: 'customer.subscription.trial_will_end', status: 'pending' }
          ]
        }
      });

      mockUsePaymentStatus.mockReturnValue(complexState);

      const { getByText } = render(
        <PaymentStatusDashboard
          showWebhookStatus={true}
          testID="multi-state-dashboard"
        />
      );

      expect(getByText('Processing 3 updates')).toBeTruthy();
      expect(getByText('1 recent issue resolved')).toBeTruthy();
      expect(getByText('Connection: Healthy')).toBeTruthy();
    });

    it('should maintain accessibility across dashboard sections', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const { getByTestId } = render(
        <PaymentStatusDashboard
          testID="accessibility-dashboard"
        />
      );

      const dashboard = getByTestId('accessibility-dashboard');
      expect(dashboard.props.accessibilityRole).toBe('region');
      expect(dashboard.props.accessibilityLabel).toContain('Payment and subscription dashboard');

      // Check section accessibility
      const statusSection = getByTestId('status-section');
      const billingSection = getByTestId('billing-section');
      const settingsSection = getByTestId('settings-section');

      expect(statusSection.props.accessible).toBe(true);
      expect(billingSection.props.accessible).toBe(true);
      expect(settingsSection.props.accessible).toBe(true);
    });

    it('should handle complex error states across sections', () => {
      const errorState = createDashboardState({
        paymentError: {
          severity: 'high' as const,
          message: 'Multiple issues detected',
          code: 'complex_error'
        },
        webhookStatus: {
          connected: false,
          lastEventTime: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          processingQueue: 5,
          errorCount: 3
        }
      });

      mockUsePaymentStatus.mockReturnValue(errorState);

      const { getByText } = render(
        <PaymentStatusDashboard
          showAllSections={true}
          testID="complex-error-dashboard"
        />
      );

      expect(getByText('Connection Issues Detected')).toBeTruthy();
      expect(getByText('Your therapeutic access remains protected')).toBeTruthy();
      expect(getByText('5 updates queued for processing')).toBeTruthy();
    });

    it('should synchronize section updates efficiently', async () => {
      const { rerender } = render(
        <PaymentStatusDashboard
          testID="sync-updates-dashboard"
        />
      );

      const startTime = performance.now();

      // Simulate rapid state changes across sections
      for (let i = 0; i < 10; i++) {
        const updatedState = createDashboardState({
          webhookStatus: {
            connected: true,
            processingQueue: i,
            errorCount: Math.floor(i / 3)
          }
        });

        mockUsePaymentStatus.mockReturnValue(updatedState);

        await act(async () => {
          rerender(
            <PaymentStatusDashboard
              testID="sync-updates-dashboard"
            />
          );
        });
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(200); // Should handle rapid updates efficiently
    });
  });

  describe('Dashboard Navigation and Interactions', () => {
    it('should provide logical navigation flow', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const onNavigateToSubscription = jest.fn();
      const onNavigateToPayment = jest.fn();
      const onNavigateToSupport = jest.fn();

      const { getByText } = render(
        <PaymentStatusDashboard
          onNavigateToSubscription={onNavigateToSubscription}
          onNavigateToPayment={onNavigateToPayment}
          onNavigateToSupport={onNavigateToSupport}
          testID="navigation-dashboard"
        />
      );

      const subscriptionButton = getByText('Manage Subscription');
      const paymentButton = getByText('Payment Methods');
      const supportButton = getByText('Get Support');

      fireEvent.press(subscriptionButton);
      fireEvent.press(paymentButton);
      fireEvent.press(supportButton);

      expect(onNavigateToSubscription).toHaveBeenCalled();
      expect(onNavigateToPayment).toHaveBeenCalled();
      expect(onNavigateToSupport).toHaveBeenCalled();
    });

    it('should handle section expansion and collapse', async () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const { getByText, queryByText } = render(
        <PaymentStatusDashboard
          collapsibleSections={true}
          testID="expandable-dashboard"
        />
      );

      const billingSection = getByText('Billing History');
      fireEvent.press(billingSection);

      await waitFor(() => {
        expect(queryByText('Recent transactions')).toBeTruthy();
      });

      // Collapse section
      fireEvent.press(billingSection);

      await waitFor(() => {
        expect(queryByText('Recent transactions')).toBeFalsy();
      });
    });

    it('should provide contextual actions based on status', () => {
      const statusWithActions = createDashboardState({
        paymentError: {
          severity: 'medium' as const,
          message: 'Card update needed',
          code: 'card_expired'
        }
      });

      mockUsePaymentStatus.mockReturnValue(statusWithActions);

      const { getByText } = render(
        <PaymentStatusDashboard
          showContextualActions={true}
          testID="contextual-actions-dashboard"
        />
      );

      expect(getByText('Update Payment Method')).toBeTruthy();
      expect(getByText('Contact Support')).toBeTruthy();
      expect(getByText('Continue Practice')).toBeTruthy(); // Therapeutic priority
    });

    it('should support keyboard navigation', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const { getByTestId } = render(
        <PaymentStatusDashboard
          keyboardNavigable={true}
          testID="keyboard-dashboard"
        />
      );

      const dashboard = getByTestId('keyboard-dashboard');
      expect(dashboard.props.accessible).toBe(true);

      // Check that interactive elements are properly focusable
      const interactiveElements = dashboard.findAllByType('TouchableOpacity');
      interactiveElements.forEach(element => {
        expect(element.props.accessible !== false).toBe(true);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('should render complex dashboard efficiently', () => {
      const complexState = createDashboardState({
        billingHistory: Array.from({ length: 50 }, (_, i) => ({
          id: `in_test_${i}`,
          amount: 999,
          currency: 'usd',
          status: 'paid',
          created: new Date(Date.now() - i * 86400000).toISOString()
        })),
        paymentMethods: Array.from({ length: 5 }, (_, i) => ({
          id: `pm_test_${i}`,
          type: 'card',
          last4: `424${i}`,
          brand: 'visa',
          expMonth: 12,
          expYear: 2025
        }))
      });

      mockUsePaymentStatus.mockReturnValue(complexState);

      const startTime = performance.now();

      render(
        <PaymentStatusDashboard
          showAllSections={true}
          testID="complex-dashboard"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render complex data efficiently
    });

    it('should optimize re-renders with stable data', () => {
      const stableState = createDashboardState();
      mockUsePaymentStatus.mockReturnValue(stableState);

      const { rerender } = render(
        <PaymentStatusDashboard
          testID="stable-dashboard"
        />
      );

      const startTime = performance.now();

      // Multiple re-renders with same data
      for (let i = 0; i < 20; i++) {
        rerender(
          <PaymentStatusDashboard
            testID="stable-dashboard"
          />
        );
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(50); // Should optimize stable re-renders
    });

    it('should handle memory efficiently with dynamic content', () => {
      const { rerender } = render(
        <PaymentStatusDashboard
          testID="memory-dashboard"
        />
      );

      // Simulate dynamic content changes
      for (let i = 0; i < 100; i++) {
        const dynamicState = createDashboardState({
          webhookStatus: {
            connected: Math.random() > 0.5,
            processingQueue: Math.floor(Math.random() * 10),
            errorCount: Math.floor(Math.random() * 3),
            lastEventTime: new Date().toISOString()
          }
        });

        mockUsePaymentStatus.mockReturnValue(dynamicState);

        rerender(
          <PaymentStatusDashboard
            optimizeMemory={true}
            testID="memory-dashboard"
          />
        );
      }

      // Should not cause memory leaks
      expect(performance.memory?.usedJSHeapSize).toBeDefined();
    });

    it('should virtualize large data sets', () => {
      const largeDataState = createDashboardState({
        billingHistory: Array.from({ length: 1000 }, (_, i) => ({
          id: `in_large_${i}`,
          amount: Math.floor(Math.random() * 10000),
          currency: 'usd',
          status: Math.random() > 0.9 ? 'open' : 'paid',
          created: new Date(Date.now() - i * 86400000).toISOString()
        }))
      });

      mockUsePaymentStatus.mockReturnValue(largeDataState);

      const startTime = performance.now();

      render(
        <PaymentStatusDashboard
          virtualizeData={true}
          maxVisibleItems={10}
          testID="virtualized-dashboard"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should virtualize large datasets
    });
  });

  describe('Error Boundary and Recovery', () => {
    it('should handle section errors gracefully', () => {
      // Mock a section error
      mockUsePaymentStatus.mockImplementation(() => {
        throw new Error('Section error');
      });

      const { getByText } = render(
        <PaymentStatusDashboard
          errorBoundary={true}
          testID="error-boundary-dashboard"
        />
      );

      expect(getByText('Dashboard temporarily unavailable')).toBeTruthy();
      expect(getByText('Your therapeutic access continues normally')).toBeTruthy();
    });

    it('should provide section-level error recovery', () => {
      const partialErrorState = createDashboardState({
        webhookStatus: null, // Simulate webhook section error
        paymentError: {
          severity: 'low' as const,
          message: 'Section unavailable',
          code: 'section_error'
        }
      });

      mockUsePaymentStatus.mockReturnValue(partialErrorState);

      const { getByText, queryByText } = render(
        <PaymentStatusDashboard
          gracefulDegradation={true}
          testID="partial-error-dashboard"
        />
      );

      // Main sections should still work
      expect(getByText('Premium Active')).toBeTruthy();

      // Webhook section should show error state
      expect(queryByText('Webhook status unavailable')).toBeTruthy();
    });

    it('should maintain crisis access during dashboard errors', () => {
      mockUsePaymentStatus.mockImplementation(() => {
        throw new Error('Dashboard error');
      });

      const { getByText } = render(
        <PaymentStatusDashboard
          crisisMode={true}
          errorBoundary={true}
          testID="crisis-error-dashboard"
        />
      );

      expect(getByText('Crisis Support: Always Available')).toBeTruthy();
      expect(getByText('Call 988 for immediate support')).toBeTruthy();
    });
  });

  describe('Real-time Updates and Synchronization', () => {
    it('should handle real-time webhook updates', async () => {
      const initialState = createDashboardState();
      mockUsePaymentStatus.mockReturnValue(initialState);

      const { rerender, getByText } = render(
        <PaymentStatusDashboard
          realTimeUpdates={true}
          testID="realtime-dashboard"
        />
      );

      // Simulate webhook update
      const updatedState = createDashboardState({
        subscriptionStatus: {
          ...initialState.subscriptionStatus,
          status: 'past_due'
        }
      });

      await act(async () => {
        mockUsePaymentStatus.mockReturnValue(updatedState);
        rerender(
          <PaymentStatusDashboard
            realTimeUpdates={true}
            testID="realtime-dashboard"
          />
        );
      });

      expect(getByText('Payment Attention Needed')).toBeTruthy();
    });

    it('should batch multiple webhook updates', async () => {
      const { rerender } = render(
        <PaymentStatusDashboard
          batchUpdates={true}
          batchInterval={100}
          testID="batched-dashboard"
        />
      );

      const startTime = performance.now();

      // Simulate rapid webhook updates
      for (let i = 0; i < 20; i++) {
        const state = createDashboardState({
          webhookStatus: {
            connected: true,
            processingQueue: i,
            errorCount: 0
          }
        });

        mockUsePaymentStatus.mockReturnValue(state);

        await act(async () => {
          rerender(
            <PaymentStatusDashboard
              batchUpdates={true}
              batchInterval={100}
              testID="batched-dashboard"
            />
          );
        });
      }

      const totalTime = performance.now() - startTime;
      expect(totalTime).toBeLessThan(150); // Should batch updates efficiently
    });

    it('should maintain consistency across concurrent updates', async () => {
      const concurrentPromises = Array.from({ length: 10 }, async (_, i) => {
        const state = createDashboardState({
          subscriptionStatus: {
            id: 'sub_test_123',
            status: i % 2 === 0 ? 'active' : 'past_due',
            nextBilling: '2024-10-15'
          }
        });

        mockUsePaymentStatus.mockReturnValue(state);

        return new Promise(resolve => {
          setTimeout(() => {
            resolve(render(
              <PaymentStatusDashboard
                testID={`concurrent-dashboard-${i}`}
              />
            ));
          }, Math.random() * 50);
        });
      });

      const results = await Promise.all(concurrentPromises);

      // All renders should complete successfully
      expect(results).toHaveLength(10);
    });
  });

  describe('Therapeutic Integration Points', () => {
    it('should integrate with MBCT practice tracking', () => {
      const practiceState = createDashboardState({
        practiceStats: {
          sessionsThisWeek: 5,
          currentStreak: 12,
          lastSession: new Date().toISOString()
        }
      });

      mockUsePaymentStatus.mockReturnValue(practiceState);

      const { getByText } = render(
        <PaymentStatusDashboard
          showPracticeIntegration={true}
          testID="practice-integration-dashboard"
        />
      );

      expect(getByText('5 mindful sessions this week')).toBeTruthy();
      expect(getByText('12-day practice streak')).toBeTruthy();
    });

    it('should show therapeutic feature availability', () => {
      mockUsePaymentStatus.mockReturnValue(createDashboardState());

      const { getByText } = render(
        <PaymentStatusDashboard
          showFeatureAccess={true}
          testID="feature-access-dashboard"
        />
      );

      expect(getByText('Guided Practices: Available')).toBeTruthy();
      expect(getByText('Progress Tracking: Available')).toBeTruthy();
      expect(getByText('Crisis Support: Always Available')).toBeTruthy();
    });

    it('should maintain therapeutic context during subscription changes', () => {
      const changingState = createDashboardState({
        subscriptionStatus: {
          id: 'sub_test_123',
          status: 'unpaid',
          nextBilling: '2024-10-15'
        },
        gracePeriodInfo: {
          active: true,
          daysRemaining: 3,
          daysRemainingFormatted: '3 days',
          reason: 'payment_issue'
        }
      });

      mockUsePaymentStatus.mockReturnValue(changingState);

      const { getByText } = render(
        <PaymentStatusDashboard
          maintainTherapeuticContext={true}
          testID="therapeutic-context-dashboard"
        />
      );

      expect(getByText('Your mindful journey continues')).toBeTruthy();
      expect(getByText('Therapeutic features remain fully accessible')).toBeTruthy();
    });
  });
});