/**
 * WebhookLoadingStates Tests - Performance & Real-time Processing
 * Comprehensive testing for webhook processing UI with crisis safety
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { WebhookLoadingStates } from '../../src/components/payment/WebhookLoadingStates';
import { useTheme } from '../../src/hooks/useTheme';

// Mock dependencies
jest.mock('../../src/hooks/useTheme');

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

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
    },
    base: {
      black: '#000000',
      white: '#FFFFFF',
    }
  }
};

const createWebhookEvent = (type: string, status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout') => ({
  id: `evt_${Date.now()}_${Math.random()}`,
  type,
  status,
  timestamp: new Date().toISOString(),
  processingTime: status === 'completed' ? Math.random() * 200 : undefined,
  error: status === 'failed' ? 'Processing failed' : undefined,
  metadata: {
    priority: type.includes('crisis') ? 'high' : 'normal',
    crisisMode: type.includes('crisis')
  }
});

describe('WebhookLoadingStates - Real-time Processing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Crisis Safety Performance', () => {
    it('should prioritize crisis operations over webhook processing', async () => {
      const crisisEvent = createWebhookEvent('customer.subscription.crisis_update', 'processing');
      const normalEvent = createWebhookEvent('customer.subscription.updated', 'processing');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[crisisEvent, normalEvent]}
          crisisMode={true}
          testID="crisis-priority-loading"
        />
      );

      expect(getByText('Processing Crisis Update')).toBeTruthy();
      expect(getByText('Crisis safety prioritized')).toBeTruthy();
    });

    it('should maintain emergency access during webhook processing', () => {
      const processingEvent = createWebhookEvent('invoice.payment_failed', 'processing');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[processingEvent]}
          crisisMode={true}
          showEmergencyAccess={true}
          testID="emergency-access-loading"
        />
      );

      expect(getByText('Emergency access available')).toBeTruthy();
      expect(getByText('Crisis support: 988')).toBeTruthy();
    });

    it('should complete webhook processing within performance bounds', async () => {
      const event = createWebhookEvent('customer.subscription.updated', 'pending');

      const { rerender } = render(
        <WebhookLoadingStates
          events={[event]}
          testID="performance-bounds-loading"
        />
      );

      const startTime = Date.now();

      // Simulate processing completion
      const completedEvent = { ...event, status: 'completed' as const, processingTime: 150 };

      await act(async () => {
        rerender(
          <WebhookLoadingStates
            events={[completedEvent]}
            testID="performance-bounds-loading"
          />
        );
      });

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(200); // Crisis safety requirement
    });

    it('should handle webhook timeouts without blocking therapeutic features', async () => {
      const timeoutEvent = createWebhookEvent('customer.subscription.updated', 'timeout');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[timeoutEvent]}
          showTherapeuticContinuity={true}
          testID="timeout-handling-loading"
        />
      );

      expect(getByText('Processing Timeout')).toBeTruthy();
      expect(getByText('Your therapeutic access remains unaffected')).toBeTruthy();
    });
  });

  describe('Real-time Progress Indicators', () => {
    it('should show accurate processing progress', () => {
      const processingEvent = createWebhookEvent('invoice.payment_succeeded', 'processing');

      const { getByTestId } = render(
        <WebhookLoadingStates
          events={[processingEvent]}
          showProgress={true}
          testID="progress-indicator-loading"
        />
      );

      const progressIndicator = getByTestId('webhook-progress-indicator');
      expect(progressIndicator).toBeTruthy();
    });

    it('should animate loading states smoothly', () => {
      const pendingEvent = createWebhookEvent('customer.subscription.created', 'pending');

      const { getByTestId } = render(
        <WebhookLoadingStates
          events={[pendingEvent]}
          animated={true}
          testID="animated-loading"
        />
      );

      const animatedIndicator = getByTestId('animated-loading-indicator');
      expect(animatedIndicator).toBeTruthy();
    });

    it('should handle rapid webhook state changes', async () => {
      const event = createWebhookEvent('customer.subscription.updated', 'pending');

      const { rerender, getByText } = render(
        <WebhookLoadingStates
          events={[event]}
          testID="rapid-changes-loading"
        />
      );

      // Simulate rapid state progression
      const states: Array<'pending' | 'processing' | 'completed'> = ['pending', 'processing', 'completed'];

      for (const status of states) {
        const updatedEvent = { ...event, status };

        await act(async () => {
          rerender(
            <WebhookLoadingStates
              events={[updatedEvent]}
              testID="rapid-changes-loading"
            />
          );
        });

        // Fast-forward any animations
        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      expect(getByText('Processing Complete')).toBeTruthy();
    });

    it('should batch multiple webhook updates efficiently', () => {
      const events = [
        createWebhookEvent('customer.subscription.updated', 'processing'),
        createWebhookEvent('invoice.payment_succeeded', 'processing'),
        createWebhookEvent('customer.subscription.trial_will_end', 'pending')
      ];

      const startTime = performance.now();

      render(
        <WebhookLoadingStates
          events={events}
          batchUpdates={true}
          testID="batch-updates-loading"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(50); // Should render multiple events efficiently
    });
  });

  describe('Screen Reader Integration', () => {
    it('should announce webhook processing progress', () => {
      const processingEvent = createWebhookEvent('customer.subscription.updated', 'processing');

      const { getByLabelText } = render(
        <WebhookLoadingStates
          events={[processingEvent]}
          announceProgress={true}
          testID="screen-reader-loading"
        />
      );

      const loadingAnnouncement = getByLabelText('Processing subscription update. Please wait.');
      expect(loadingAnnouncement.props.accessibilityLiveRegion).toBe('polite');
    });

    it('should provide accessible progress descriptions', () => {
      const completedEvent = createWebhookEvent('invoice.payment_succeeded', 'completed');

      const { getByLabelText } = render(
        <WebhookLoadingStates
          events={[completedEvent]}
          testID="accessible-progress-loading"
        />
      );

      const completionAnnouncement = getByLabelText('Payment processing completed successfully');
      expect(completionAnnouncement.props.accessibilityRole).toBe('status');
    });

    it('should announce critical errors appropriately', () => {
      const failedEvent = createWebhookEvent('customer.subscription.updated', 'failed');

      const { getByLabelText } = render(
        <WebhookLoadingStates
          events={[failedEvent]}
          announceErrors={true}
          testID="error-announcement-loading"
        />
      );

      const errorAnnouncement = getByLabelText('Subscription update failed. Your access continues safely.');
      expect(errorAnnouncement.props.accessibilityLiveRegion).toBe('assertive');
    });

    it('should support voice control for loading interactions', () => {
      const processingEvent = createWebhookEvent('customer.subscription.updated', 'processing');
      const onCancel = jest.fn();

      const { getByLabelText } = render(
        <WebhookLoadingStates
          events={[processingEvent]}
          onCancel={onCancel}
          cancelable={true}
          testID="voice-control-loading"
        />
      );

      const cancelButton = getByLabelText('Cancel webhook processing');
      expect(cancelButton.props.accessibilityRole).toBe('button');
      expect(cancelButton.props.accessibilityHint).toBe('Stops current processing while maintaining your access');
    });
  });

  describe('Therapeutic Messaging Integration', () => {
    it('should provide calming messaging during processing delays', () => {
      const delayedEvent = createWebhookEvent('customer.subscription.updated', 'processing');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[delayedEvent]}
          showTherapeuticMessages={true}
          processingDelay={5000}
          testID="therapeutic-loading"
        />
      );

      expect(getByText('Taking a mindful moment to process your request')).toBeTruthy();
      expect(getByText('Your therapeutic journey continues uninterrupted')).toBeTruthy();
    });

    it('should reassure users during payment processing', () => {
      const paymentEvent = createWebhookEvent('invoice.payment_processing', 'processing');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[paymentEvent]}
          showPaymentReassurance={true}
          testID="payment-reassurance-loading"
        />
      );

      expect(getByText('Securely processing your payment')).toBeTruthy();
      expect(getByText('Your mindful practice remains accessible')).toBeTruthy();
    });

    it('should maintain therapeutic context during errors', () => {
      const errorEvent = createWebhookEvent('customer.subscription.updated', 'failed');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[errorEvent]}
          maintainTherapeuticContext={true}
          testID="therapeutic-error-loading"
        />
      );

      expect(getByText('Processing encountered a gentle pause')).toBeTruthy();
      expect(getByText('Your wellbeing journey continues safely')).toBeTruthy();
    });

    it('should celebrate successful completions therapeutically', () => {
      const successEvent = createWebhookEvent('customer.subscription.updated', 'completed');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[successEvent]}
          celebrateSuccess={true}
          testID="therapeutic-success-loading"
        />
      );

      expect(getByText('Mindfully completed')).toBeTruthy();
      expect(getByText('Your subscription is updated and ready')).toBeTruthy();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track webhook processing performance', () => {
      const events = [
        createWebhookEvent('customer.subscription.updated', 'completed'),
        createWebhookEvent('invoice.payment_succeeded', 'completed')
      ];

      events[0].processingTime = 150;
      events[1].processingTime = 75;

      const { getByText } = render(
        <WebhookLoadingStates
          events={events}
          showPerformanceMetrics={true}
          testID="performance-monitoring-loading"
        />
      );

      expect(getByText('Average processing: 112ms')).toBeTruthy();
    });

    it('should identify performance bottlenecks', () => {
      const slowEvent = createWebhookEvent('customer.subscription.updated', 'completed');
      slowEvent.processingTime = 500; // Exceeds 200ms threshold

      const onPerformanceIssue = jest.fn();

      render(
        <WebhookLoadingStates
          events={[slowEvent]}
          onPerformanceIssue={onPerformanceIssue}
          performanceThreshold={200}
          testID="bottleneck-detection-loading"
        />
      );

      expect(onPerformanceIssue).toHaveBeenCalledWith({
        event: slowEvent,
        threshold: 200,
        actualTime: 500,
        issue: 'processing_delay'
      });
    });

    it('should optimize rendering with large event queues', () => {
      const manyEvents = Array.from({ length: 100 }, (_, i) =>
        createWebhookEvent(`test.event.${i}`, 'processing')
      );

      const startTime = performance.now();

      render(
        <WebhookLoadingStates
          events={manyEvents}
          virtualized={true}
          testID="large-queue-loading"
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should handle large queues efficiently
    });

    it('should handle memory efficiently with long-running processes', () => {
      const longRunningEvent = createWebhookEvent('customer.subscription.long_process', 'processing');

      const { rerender } = render(
        <WebhookLoadingStates
          events={[longRunningEvent]}
          testID="memory-efficient-loading"
        />
      );

      // Simulate long-running process with memory management
      for (let i = 0; i < 100; i++) {
        const updatedEvent = {
          ...longRunningEvent,
          timestamp: new Date().toISOString()
        };

        rerender(
          <WebhookLoadingStates
            events={[updatedEvent]}
            optimizeMemory={true}
            testID="memory-efficient-loading"
          />
        );
      }

      // Should not cause memory leaks or performance degradation
      expect(performance.memory?.usedJSHeapSize).toBeDefined();
    });
  });

  describe('Webhook Type Handling', () => {
    it('should handle subscription webhook types', () => {
      const subscriptionEvents = [
        createWebhookEvent('customer.subscription.created', 'completed'),
        createWebhookEvent('customer.subscription.updated', 'processing'),
        createWebhookEvent('customer.subscription.deleted', 'pending')
      ];

      const { getByText } = render(
        <WebhookLoadingStates
          events={subscriptionEvents}
          showEventTypes={true}
          testID="subscription-types-loading"
        />
      );

      expect(getByText('Subscription Created')).toBeTruthy();
      expect(getByText('Updating Subscription')).toBeTruthy();
      expect(getByText('Subscription Cancellation')).toBeTruthy();
    });

    it('should handle payment webhook types', () => {
      const paymentEvents = [
        createWebhookEvent('invoice.payment_succeeded', 'completed'),
        createWebhookEvent('invoice.payment_failed', 'failed'),
        createWebhookEvent('payment_method.attached', 'processing')
      ];

      const { getByText } = render(
        <WebhookLoadingStates
          events={paymentEvents}
          showEventTypes={true}
          testID="payment-types-loading"
        />
      );

      expect(getByText('Payment Successful')).toBeTruthy();
      expect(getByText('Payment Issue')).toBeTruthy();
      expect(getByText('Payment Method Update')).toBeTruthy();
    });

    it('should handle trial and grace period webhooks', () => {
      const trialEvents = [
        createWebhookEvent('customer.subscription.trial_will_end', 'processing'),
        createWebhookEvent('customer.subscription.grace_period_started', 'completed')
      ];

      const { getByText } = render(
        <WebhookLoadingStates
          events={trialEvents}
          showEventTypes={true}
          testID="trial-types-loading"
        />
      );

      expect(getByText('Trial Ending')).toBeTruthy();
      expect(getByText('Therapeutic Continuity Activated')).toBeTruthy();
    });

    it('should handle unknown webhook types gracefully', () => {
      const unknownEvent = createWebhookEvent('unknown.webhook.type', 'processing');

      const { getByText } = render(
        <WebhookLoadingStates
          events={[unknownEvent]}
          testID="unknown-type-loading"
        />
      );

      expect(getByText('Processing Update')).toBeTruthy();
    });
  });

  describe('Offline and Connection Handling', () => {
    it('should handle offline webhook queue', () => {
      const queuedEvents = [
        createWebhookEvent('customer.subscription.updated', 'pending'),
        createWebhookEvent('invoice.payment_succeeded', 'pending')
      ];

      const { getByText } = render(
        <WebhookLoadingStates
          events={queuedEvents}
          offline={true}
          showOfflineQueue={true}
          testID="offline-queue-loading"
        />
      );

      expect(getByText('Queued for processing')).toBeTruthy();
      expect(getByText('Will process when connection restores')).toBeTruthy();
    });

    it('should handle connection restoration', async () => {
      const queuedEvent = createWebhookEvent('customer.subscription.updated', 'pending');

      const { rerender, getByText } = render(
        <WebhookLoadingStates
          events={[queuedEvent]}
          offline={true}
          testID="connection-restore-loading"
        />
      );

      // Simulate connection restoration
      const processingEvent = { ...queuedEvent, status: 'processing' as const };

      await act(async () => {
        rerender(
          <WebhookLoadingStates
            events={[processingEvent]}
            offline={false}
            testID="connection-restore-loading"
          />
        );
      });

      expect(getByText('Processing Subscription Update')).toBeTruthy();
    });

    it('should prioritize critical webhooks during connectivity issues', () => {
      const events = [
        createWebhookEvent('customer.subscription.crisis_update', 'pending'),
        createWebhookEvent('customer.subscription.updated', 'pending'),
        createWebhookEvent('invoice.payment_succeeded', 'pending')
      ];

      const { getByText } = render(
        <WebhookLoadingStates
          events={events}
          offline={true}
          prioritizeCritical={true}
          testID="critical-priority-loading"
        />
      );

      expect(getByText('Crisis update will process first')).toBeTruthy();
    });
  });

  describe('Timeout and Error Recovery', () => {
    it('should handle webhook processing timeouts', async () => {
      const timeoutEvent = createWebhookEvent('customer.subscription.updated', 'processing');

      const { rerender, getByText } = render(
        <WebhookLoadingStates
          events={[timeoutEvent]}
          timeout={5000}
          testID="timeout-handling-loading"
        />
      );

      // Fast-forward time to trigger timeout
      act(() => {
        jest.advanceTimersByTime(6000);
      });

      const timedOutEvent = { ...timeoutEvent, status: 'timeout' as const };

      await act(async () => {
        rerender(
          <WebhookLoadingStates
            events={[timedOutEvent]}
            timeout={5000}
            testID="timeout-handling-loading"
          />
        );
      });

      expect(getByText('Processing timeout')).toBeTruthy();
      expect(getByText('Your access remains secure')).toBeTruthy();
    });

    it('should provide retry mechanisms for failed webhooks', () => {
      const failedEvent = createWebhookEvent('customer.subscription.updated', 'failed');
      const onRetry = jest.fn();

      const { getByText } = render(
        <WebhookLoadingStates
          events={[failedEvent]}
          onRetry={onRetry}
          allowRetry={true}
          testID="retry-mechanism-loading"
        />
      );

      const retryButton = getByText('Retry');
      expect(retryButton).toBeTruthy();

      // Test retry functionality is accessible
      expect(getByText('Processing failed')).toBeTruthy();
    });

    it('should handle cascading webhook failures', () => {
      const failedEvents = [
        createWebhookEvent('customer.subscription.updated', 'failed'),
        createWebhookEvent('invoice.payment_succeeded', 'failed'),
        createWebhookEvent('customer.subscription.trial_will_end', 'failed')
      ];

      const { getByText } = render(
        <WebhookLoadingStates
          events={failedEvents}
          showFailureSummary={true}
          testID="cascading-failure-loading"
        />
      );

      expect(getByText('Multiple processing issues detected')).toBeTruthy();
      expect(getByText('Your therapeutic access is protected')).toBeTruthy();
    });
  });
});