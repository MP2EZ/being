/**
 * Performance UI Testing for Payment Sync Resilience Components
 *
 * This test suite validates performance requirements specific to mental health applications,
 * ensuring UI responsiveness maintains therapeutic effectiveness and crisis safety.
 *
 * Test Categories:
 * 1. 60fps Animation Validation During Payment Sync Operations
 * 2. <200ms Crisis Button Response Time Validation
 * 3. Memory Usage Testing for Payment UI Components
 * 4. Battery Optimization Validation for Background Sync Indicators
 *
 * Critical Performance Requirements:
 * - Crisis button: <200ms response time under all conditions
 * - Breathing animations: Consistent 60fps for therapeutic effectiveness
 * - Memory usage: <50MB peak for payment UI stack
 * - Battery efficiency: >85% power efficiency score
 * - Therapeutic timing: Exact 60s breathing intervals maintained
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Animated, Platform } from 'react-native';

// Components under test
import { PaymentSyncStatus, PaymentErrorHandling, PaymentPerformanceFeedback } from '../../src/components/payment/PaymentSyncResilienceUI';
import { CrisisSafetyIndicator, ProtectedCrisisButton, TherapeuticSessionProtection } from '../../src/components/payment/CrisisSafetyPaymentUI';
import { PaymentSyncResilienceDashboard } from '../../src/components/payment/PaymentSyncResilienceDashboard';

// Performance testing utilities
import { PerformanceTestUtils } from '../utils/PerformanceTestUtils';
import { FrameRateMonitor } from '../utils/FrameRateMonitor';
import { MemoryMonitor } from '../utils/MemoryMonitor';
import { BatteryMonitor } from '../utils/BatteryMonitor';
import { TherapeuticTimingValidator } from '../utils/TherapeuticTimingValidator';

// Test providers
import { PaymentTestProvider } from '../mocks/PaymentTestProvider';

// Mock store with performance tracking
const createPerformanceStore = (overrides = {}) => ({
  syncStatus: {
    status: 'success',
    networkStatus: 'online',
    lastSync: Date.now(),
    queueSize: 0,
    ...overrides.syncStatus
  },
  performanceMetrics: {
    averageResponseTime: 120,
    successRate: 98,
    compressionRatio: 0.25,
    framerate: 60,
    memoryUsage: 35 * 1024 * 1024, // 35MB
    ...overrides.performanceMetrics
  },
  resilienceMetrics: {
    retryCount: 0,
    maxRetries: 3,
    circuitBreakerOpen: false,
    ...overrides.resilienceMetrics
  },
  crisisAccess: {
    isActive: false,
    responseTime: 0,
    ...overrides.crisisAccess
  }
});

jest.mock('../../src/store/paymentStore', () => {
  let mockState = createPerformanceStore();

  return {
    usePaymentStore: () => mockState,
    paymentSelectors: {
      getSyncStatus: (store: any) => store.syncStatus,
      getPerformanceMetrics: (store: any) => store.performanceMetrics,
      getResilienceMetrics: (store: any) => store.resilienceMetrics,
      getCrisisAccess: (store: any) => store.crisisAccess,
      getSubscriptionTier: () => ({ name: 'Premium' }),
      getSyncProgress: () => ({ isActive: false, completionPercentage: 0 }),
      getEmergencyProtocols: () => ({ active: true })
    },
    __updatePerformanceState: (newState: any) => {
      mockState = createPerformanceStore(newState);
    }
  };
});

const updatePerformanceState = (newState: any) => {
  const mockModule = jest.requireMock('../../src/store/paymentStore');
  mockModule.__updatePerformanceState(newState);
};

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    colorSystem: {
      status: {
        success: '#16A34A',
        error: '#DC2626',
        warning: '#D97706',
        info: '#2563EB',
        successBackground: '#F0FDF4',
        errorBackground: '#FEF2F2'
      }
    }
  })
}));

jest.mock('../../src/hooks/useHaptics', () => ({
  useCommonHaptics: () => ({
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onWarning: jest.fn(),
    onCritical: jest.fn()
  })
}));

// Performance test wrapper
const PerformanceTestWrapper: React.FC<{ children: React.ReactNode; monitorId: string }> = ({
  children,
  monitorId
}) => {
  React.useEffect(() => {
    PerformanceTestUtils.startMonitoring(monitorId);
    return () => PerformanceTestUtils.stopMonitoring(monitorId);
  }, [monitorId]);

  return (
    <PaymentTestProvider>
      {children}
    </PaymentTestProvider>
  );
};

describe('Payment UI Performance Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PerformanceTestUtils.reset();
    updatePerformanceState({});
  });

  afterEach(() => {
    PerformanceTestUtils.cleanup();
  });

  describe('60fps Animation Validation During Payment Sync Operations', () => {
    test('payment sync status animations maintain 60fps during rapid state changes', async () => {
      const frameMonitor = new FrameRateMonitor('sync-status-animations');
      frameMonitor.start();

      const { rerender } = render(
        <PerformanceTestWrapper monitorId="sync-status-test">
          <PaymentSyncStatus testID="sync-status" />
        </PerformanceTestWrapper>
      );

      // Simulate rapid state changes that trigger animations
      const states = ['success', 'retrying', 'error', 'success'];

      for (let i = 0; i < states.length; i++) {
        updatePerformanceState({
          syncStatus: { status: states[i] }
        });

        rerender(
          <PerformanceTestWrapper monitorId="sync-status-test">
            <PaymentSyncStatus testID="sync-status" />
          </PerformanceTestWrapper>
        );

        // Wait for animation frames
        await act(async () => {
          for (let frame = 0; frame < 18; frame++) { // 300ms animation at 60fps
            await new Promise(resolve => setTimeout(resolve, 16.67)); // 60fps = 16.67ms per frame
          }
        });
      }

      const frameMetrics = frameMonitor.stop();

      expect(frameMetrics.averageFrameRate).toBeGreaterThan(58); // Allow 2fps variance
      expect(frameMetrics.droppedFrames).toBeLessThan(3);
      expect(frameMetrics.frameTimeVariance).toBeLessThan(2); // Consistent timing
    });

    test('crisis safety indicator pulse animation maintains smooth 60fps', async () => {
      const frameMonitor = new FrameRateMonitor('crisis-pulse-animation');
      frameMonitor.start();

      updatePerformanceState({
        crisisAccess: { isActive: true }
      });

      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="crisis-pulse-test">
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-indicator"
          />
        </PerformanceTestWrapper>
      );

      // Let pulse animation run for several cycles
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds of pulse
      });

      const frameMetrics = frameMonitor.stop();

      expect(frameMetrics.averageFrameRate).toBeGreaterThan(58);
      expect(frameMetrics.animationSmoothness).toBeGreaterThan(95); // Smooth pulse
    });

    test('payment performance feedback progress animations maintain therapeutic timing', async () => {
      const timingValidator = new TherapeuticTimingValidator();
      timingValidator.start();

      updatePerformanceState({
        performanceMetrics: { averageResponseTime: 180 },
        syncProgress: { isActive: true, completionPercentage: 0 }
      });

      const { rerender } = render(
        <PerformanceTestWrapper monitorId="progress-test">
          <PaymentPerformanceFeedback
            showDetailedMetrics={true}
            testID="performance-feedback"
          />
        </PerformanceTestWrapper>
      );

      // Simulate progress animation
      for (let progress = 0; progress <= 100; progress += 10) {
        updatePerformanceState({
          syncProgress: { isActive: true, completionPercentage: progress }
        });

        rerender(
          <PerformanceTestWrapper monitorId="progress-test">
            <PaymentPerformanceFeedback
              showDetailedMetrics={true}
              testID="performance-feedback"
            />
          </PerformanceTestWrapper>
        );

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms per step
        });
      }

      const timingMetrics = timingValidator.stop();

      expect(timingMetrics.progressConsistency).toBeGreaterThan(95);
      expect(timingMetrics.therapeuticTiming).toBe(true); // No jarring animations
    });
  });

  describe('<200ms Crisis Button Response Time Validation', () => {
    test('crisis button response time under normal conditions', async () => {
      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="crisis-normal">
          <ProtectedCrisisButton
            paymentIssue={false}
            testID="crisis-button"
          />
        </PerformanceTestWrapper>
      );

      const crisisButton = getByTestId('crisis-button');
      const responseTimes: number[] = [];

      // Test multiple taps for consistency
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(100); // Well under 200ms requirement
      expect(maxResponseTime).toBeLessThan(200); // Never exceed 200ms
      expect(responseTimes.filter(time => time > 150).length).toBe(0); // No slow responses
    });

    test('crisis button response time during payment sync stress', async () => {
      // Simulate high stress conditions
      updatePerformanceState({
        syncStatus: { status: 'retrying', queueSize: 50 },
        resilienceMetrics: { retryCount: 2, circuitBreakerOpen: true },
        performanceMetrics: { averageResponseTime: 400, memoryUsage: 45 * 1024 * 1024 }
      });

      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="crisis-stress">
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button-stress"
          />
        </PerformanceTestWrapper>
      );

      const crisisButton = getByTestId('crisis-button-stress');
      const stressResponseTimes: number[] = [];

      // Test under stress conditions
      for (let i = 0; i < 15; i++) {
        const startTime = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - startTime;
        stressResponseTimes.push(responseTime);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }

      const averageStressResponse = stressResponseTimes.reduce((a, b) => a + b, 0) / stressResponseTimes.length;
      const maxStressResponse = Math.max(...stressResponseTimes);

      expect(averageStressResponse).toBeLessThan(150); // Still responsive under stress
      expect(maxStressResponse).toBeLessThan(200); // Never exceed requirement
    });

    test('crisis button response time during memory pressure', async () => {
      // Simulate memory pressure
      const memoryMonitor = new MemoryMonitor('crisis-memory-pressure');
      memoryMonitor.start();

      // Create memory pressure
      const largeData = new Array(1000000).fill('test'); // Create memory pressure

      updatePerformanceState({
        performanceMetrics: { memoryUsage: 48 * 1024 * 1024 } // Near limit
      });

      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="crisis-memory">
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button-memory"
          />
        </PerformanceTestWrapper>
      );

      const crisisButton = getByTestId('crisis-button-memory');
      const memoryPressureResponseTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        fireEvent.press(crisisButton);
        const responseTime = performance.now() - startTime;
        memoryPressureResponseTimes.push(responseTime);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
      }

      const memoryMetrics = memoryMonitor.stop();
      const averageMemoryResponse = memoryPressureResponseTimes.reduce((a, b) => a + b, 0) / memoryPressureResponseTimes.length;

      expect(averageMemoryResponse).toBeLessThan(200); // Maintains performance under memory pressure
      expect(memoryMetrics.memoryLeaks).toBe(0); // No memory leaks
    });
  });

  describe('Memory Usage Testing for Payment UI Components', () => {
    test('payment UI stack memory usage stays under 50MB', async () => {
      const memoryMonitor = new MemoryMonitor('payment-ui-stack');
      memoryMonitor.start();

      const { getByTestId, rerender } = render(
        <PerformanceTestWrapper monitorId="memory-stack">
          <PaymentSyncStatus testID="sync-status" />
          <PaymentErrorHandling
            error={{ type: 'network', message: 'Connection failed' }}
            testID="error-handling"
          />
          <CrisisSafetyIndicator
            paymentStatus="error"
            testID="crisis-safety"
          />
          <PaymentPerformanceFeedback
            showDetailedMetrics={true}
            testID="performance-feedback"
          />
        </PerformanceTestWrapper>
      );

      // Simulate heavy usage
      for (let i = 0; i < 100; i++) {
        // Change states to trigger re-renders
        updatePerformanceState({
          syncStatus: { status: i % 2 === 0 ? 'success' : 'error' }
        });

        rerender(
          <PerformanceTestWrapper monitorId="memory-stack">
            <PaymentSyncStatus testID="sync-status" />
            <PaymentErrorHandling
              error={{ type: 'network', message: 'Connection failed' }}
              testID="error-handling"
            />
            <CrisisSafetyIndicator
              paymentStatus={i % 2 === 0 ? 'active' : 'error'}
              testID="crisis-safety"
            />
            <PaymentPerformanceFeedback
              showDetailedMetrics={true}
              testID="performance-feedback"
            />
          </PerformanceTestWrapper>
        );

        if (i % 10 === 0) {
          await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
          });
        }
      }

      const memoryMetrics = memoryMonitor.stop();

      expect(memoryMetrics.peakMemoryUsage).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      expect(memoryMetrics.averageMemoryUsage).toBeLessThan(35 * 1024 * 1024); // 35MB average
      expect(memoryMetrics.memoryLeaks).toBe(0);
      expect(memoryMetrics.gcPressure).toBeLessThan(20); // Low garbage collection pressure
    });

    test('component cleanup prevents memory leaks', async () => {
      const memoryMonitor = new MemoryMonitor('component-cleanup');
      memoryMonitor.start();

      const components = [];

      // Create and destroy components repeatedly
      for (let i = 0; i < 20; i++) {
        const { unmount } = render(
          <PerformanceTestWrapper monitorId={`cleanup-${i}`}>
            <PaymentSyncResilienceDashboard testID={`dashboard-${i}`} />
          </PerformanceTestWrapper>
        );

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });

        unmount();
        components.push(i);
      }

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Allow cleanup
      });

      const memoryMetrics = memoryMonitor.stop();

      expect(memoryMetrics.memoryLeaks).toBe(0);
      expect(memoryMetrics.finalMemoryUsage).toBeLessThan(memoryMetrics.initialMemoryUsage * 1.1); // Max 10% increase
    });
  });

  describe('Battery Optimization Validation for Background Sync Indicators', () => {
    test('background sync indicators maintain >85% power efficiency', async () => {
      const batteryMonitor = new BatteryMonitor('background-sync');
      batteryMonitor.start();

      updatePerformanceState({
        syncStatus: { status: 'retrying', queueSize: 10 },
        performanceMetrics: { averageResponseTime: 200 }
      });

      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="battery-test">
          <PaymentSyncStatus testID="sync-status" />
          <PaymentPerformanceFeedback
            showDetailedMetrics={true}
            testID="performance-feedback"
          />
        </PerformanceTestWrapper>
      );

      // Simulate background operation for 10 seconds
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
      });

      const batteryMetrics = batteryMonitor.stop();

      expect(batteryMetrics.powerEfficiencyScore).toBeGreaterThan(85);
      expect(batteryMetrics.backgroundProcessingTime).toBeLessThan(2000); // Max 2 seconds
      expect(batteryMetrics.cpuUsagePercentage).toBeLessThan(15); // Low CPU usage
    });

    test('sync progress animations optimize for battery life', async () => {
      const batteryMonitor = new BatteryMonitor('progress-animations');
      batteryMonitor.start();

      updatePerformanceState({
        syncProgress: { isActive: true, completionPercentage: 0, estimatedTimeRemaining: 30000 }
      });

      const { rerender } = render(
        <PerformanceTestWrapper monitorId="battery-progress">
          <PaymentPerformanceFeedback
            showDetailedMetrics={true}
            testID="progress-animations"
          />
        </PerformanceTestWrapper>
      );

      // Simulate long-running progress
      for (let progress = 0; progress <= 100; progress += 5) {
        updatePerformanceState({
          syncProgress: { isActive: true, completionPercentage: progress }
        });

        rerender(
          <PerformanceTestWrapper monitorId="battery-progress">
            <PaymentPerformanceFeedback
              showDetailedMetrics={true}
              testID="progress-animations"
            />
          </PerformanceTestWrapper>
        );

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second per step
        });
      }

      const batteryMetrics = batteryMonitor.stop();

      expect(batteryMetrics.animationEfficiency).toBeGreaterThan(90);
      expect(batteryMetrics.powerOptimization).toBe(true);
    });

    test('crisis safety components minimize battery impact', async () => {
      const batteryMonitor = new BatteryMonitor('crisis-battery');
      batteryMonitor.start();

      updatePerformanceState({
        crisisAccess: { isActive: true }
      });

      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="crisis-battery">
          <CrisisSafetyIndicator
            paymentStatus="critical"
            testID="crisis-indicator"
          />
          <ProtectedCrisisButton
            paymentIssue={true}
            testID="crisis-button"
          />
        </PerformanceTestWrapper>
      );

      // Test crisis components for extended period
      for (let i = 0; i < 60; i++) { // 1 minute test
        const crisisButton = getByTestId('crisis-button');
        fireEvent.press(crisisButton);

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
        });
      }

      const batteryMetrics = batteryMonitor.stop();

      expect(batteryMetrics.crisisComponentEfficiency).toBeGreaterThan(95); // Crisis components highly optimized
      expect(batteryMetrics.batteryDrainRate).toBeLessThan(2); // <2% per hour
    });
  });

  describe('Therapeutic Timing Validation', () => {
    test('breathing circle animations maintain exact 60-second intervals', async () => {
      const timingValidator = new TherapeuticTimingValidator();
      timingValidator.startBreathingValidation();

      updatePerformanceState({
        therapeuticSession: { active: true, type: 'breathing', timing: 'exact' }
      });

      const { getByTestId } = render(
        <PerformanceTestWrapper monitorId="breathing-timing">
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="active"
            sessionType="breathing"
            testID="breathing-session"
          />
        </PerformanceTestWrapper>
      );

      // Validate timing for 3 breathing cycles (180 seconds)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 180000));
      });

      const timingMetrics = timingValidator.stopBreathingValidation();

      expect(timingMetrics.cycleAccuracy).toBeGreaterThan(99.5); // 99.5% accuracy
      expect(timingMetrics.maxDeviation).toBeLessThan(100); // <100ms deviation
      expect(timingMetrics.averageDeviation).toBeLessThan(50); // <50ms average
    });

    test('payment sync operations do not interfere with therapeutic timing', async () => {
      const timingValidator = new TherapeuticTimingValidator();
      timingValidator.startInterferenceTest();

      updatePerformanceState({
        therapeuticSession: { active: true, type: 'breathing' },
        syncStatus: { status: 'retrying', networkStatus: 'unstable' }
      });

      const { getByTestId, rerender } = render(
        <PerformanceTestWrapper monitorId="timing-interference">
          <TherapeuticSessionProtection
            sessionActive={true}
            paymentStatus="error"
            sessionType="breathing"
            testID="protected-session"
          />
          <PaymentSyncStatus testID="sync-status" />
        </PerformanceTestWrapper>
      );

      // Simulate payment sync interference during breathing
      for (let i = 0; i < 10; i++) {
        updatePerformanceState({
          syncStatus: { status: i % 2 === 0 ? 'retrying' : 'error' }
        });

        rerender(
          <PerformanceTestWrapper monitorId="timing-interference">
            <TherapeuticSessionProtection
              sessionActive={true}
              paymentStatus="error"
              sessionType="breathing"
              testID="protected-session"
            />
            <PaymentSyncStatus testID="sync-status" />
          </PerformanceTestWrapper>
        );

        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds per change
        });
      }

      const interferenceMetrics = timingValidator.stopInterferenceTest();

      expect(interferenceMetrics.therapeuticTimingMaintained).toBe(true);
      expect(interferenceMetrics.breathingInterruptions).toBe(0);
      expect(interferenceMetrics.timingStability).toBeGreaterThan(99);
    });
  });
});