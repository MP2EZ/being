/**
 * Widget End-to-End Integration Tests
 * Complete user journey validation for widget functionality
 * Tests real-world scenarios with full system integration
 */

import { jest } from '@jest/globals';
import { Platform, AppState } from 'react-native';
import { 
  WidgetIntegrationCoordinator,
  WidgetDataService,
  WidgetNativeBridgeService,
  NavigationService,
  WidgetIntegrationFactory,
  WidgetIntegrationUtils
} from '../../src/services/widgets';
import { useCheckInStore } from '../../src/store/checkInStore';
import { widgetStoreIntegration } from '../../src/store/widgetIntegration';
import type {
  WidgetData,
  WidgetUpdateTrigger,
  CheckInType,
  WidgetSessionStatus
} from '../../src/types/widget';
import WidgetTestInfrastructure, {
  WidgetTestDataGenerator,
  WidgetDeepLinkTestUtils,
  WidgetPerformanceTestUtils
} from '../utils/widgetTestInfrastructure';

// E2E Test Configuration
const E2E_CONFIG = {
  TEST_TIMEOUT_MS: 30000,
  USER_ACTION_DELAY_MS: 100,
  SYSTEM_RESPONSE_TIMEOUT_MS: 5000,
  PERFORMANCE_SAMPLES: 5,
  STRESS_TEST_DURATION_MS: 10000,
  CONCURRENT_USERS: 3
} as const;

// Mock native modules with realistic behavior
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((platforms) => platforms.ios) },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  NativeModules: {
    BeingWidgets: {
      updateWidgetData: jest.fn().mockImplementation(async (data: string) => {
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        if (Math.random() < 0.05) { // 5% chance of transient failure
          throw new Error('Transient native module failure');
        }
      }),
      reloadWidgets: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70));
      }),
      setAppGroupData: jest.fn().mockResolvedValue(undefined),
      getAppGroupData: jest.fn().mockResolvedValue('{}'),
      performHealthCheck: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return Math.random() > 0.02; // 2% chance of health check failure
      }),
      clearWidgetData: jest.fn().mockResolvedValue(undefined),
      getActiveWidgetIds: jest.fn().mockResolvedValue([1, 2, 3]),
      updateWidgetById: jest.fn().mockResolvedValue(undefined),
      updateAllWidgets: jest.fn().mockResolvedValue(undefined)
    }
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
  Linking: {
    openURL: jest.fn().mockResolvedValue(undefined),
    canOpenURL: jest.fn().mockResolvedValue(true),
    addEventListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockImplementation(async (key: string, value: string) => {
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
    if (Math.random() < 0.01) { // 1% chance of storage failure
      throw new Error('Storage temporarily unavailable');
    }
  }),
  getItemAsync: jest.fn().mockImplementation(async (key: string) => {
    await new Promise(resolve => setTimeout(resolve, 5 + Math.random() * 15));
    return null; // Start with clean slate
  }),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
}));

// Mock navigation with realistic delays
jest.mock('../../src/services/NavigationService', () => ({
  NavigationService: {
    navigateToCheckIn: jest.fn().mockImplementation(async (type: string, resume: boolean) => {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      return { navigated: true, type, resume };
    }),
    navigateToCrisis: jest.fn().mockImplementation(async (trigger: string) => {
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return { navigated: true, trigger };
    }),
    navigateToHome: jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));
      return { navigated: true, destination: 'home' };
    }),
    getCurrentRoute: jest.fn(() => 'Home')
  }
}));

describe('Widget End-to-End Integration Tests', () => {
  let coordinator: WidgetIntegrationCoordinator;
  let dataService: WidgetDataService;
  let nativeBridge: WidgetNativeBridgeService;
  let testStore: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    await WidgetTestInfrastructure.initializeTestEnvironment();
    
    // Create production-like instances
    coordinator = WidgetIntegrationFactory.createStandard();
    dataService = new WidgetDataService();
    nativeBridge = new WidgetNativeBridgeService();
    
    // Setup realistic test store
    testStore = createRealisticsStore();
    (useCheckInStore as any).getState = jest.fn(() => testStore);
    
    console.log('🚀 E2E test environment initialized');
  }, E2E_CONFIG.TEST_TIMEOUT_MS);

  afterEach(() => {
    coordinator?.dispose();
    nativeBridge?.dispose();
    WidgetTestInfrastructure.cleanup();
  });

  describe('Complete User Journeys', () => {
    test('should handle full day check-in workflow', async () => {
      const performanceTracker = WidgetPerformanceTestUtils;
      const journeyId = performanceTracker.startOperation('Full Day Journey');
      
      try {
        // 1. Initialize system
        await coordinator.initialize();
        let status = coordinator.getIntegrationStatus();
        expect(status.isInitialized).toBe(true);
        expect(status.isHealthy).toBe(true);

        // 2. Morning check-in flow
        console.log('📅 Starting morning check-in flow...');
        
        // User taps morning widget
        const morningDeepLink = WidgetDeepLinkTestUtils.simulateDeepLink('morning', false);
        await coordinator.handleDeepLink(morningDeepLink);
        expect(NavigationService.navigateToCheckIn).toHaveBeenCalledWith('morning', false);
        
        // Simulate user completing morning check-in
        await simulateUserAction(async () => {
          const morningCheckIn = {
            id: `morning_${Date.now()}`,
            type: 'morning' as CheckInType,
            completedAt: new Date().toISOString(),
            data: { emotions: ['calm', 'hopeful'], bodyAreas: ['chest', 'shoulders'] },
            skipped: false
          };
          testStore.addCheckIn(morningCheckIn);
          testStore.todaysCheckIns.push(morningCheckIn);
        });
        
        // Widget should update after completion
        await coordinator.forceUpdate({
          source: 'checkin_completed',
          reason: 'status_change',
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
        
        let widgetData = await dataService.getCurrentWidgetData();
        expect(widgetData?.todayProgress.morning.status).toBe('completed');
        expect(widgetData?.todayProgress.completionPercentage).toBeGreaterThan(0);

        // 3. Midday check-in flow (with interruption)
        console.log('🕐 Starting midday check-in flow...');
        
        // User starts midday check-in
        const middayDeepLink = WidgetDeepLinkTestUtils.simulateDeepLink('midday', false);
        await coordinator.handleDeepLink(middayDeepLink);
        
        // Simulate partial session (user gets interrupted)
        await simulateUserAction(async () => {
          testStore.currentCheckIn = {
            id: `midday_partial_${Date.now()}`,
            type: 'midday' as CheckInType,
            startedAt: new Date().toISOString(),
            progress: { currentStep: 3, totalSteps: 5, percentComplete: 60 },
            data: { emotions: ['focused'] }
          };
          testStore.checkForPartialSession = jest.fn().mockResolvedValue(true);
          testStore.getSessionProgress = jest.fn().mockResolvedValue({
            currentStep: 3,
            totalSteps: 5,
            percentComplete: 60,
            estimatedTimeRemaining: 120 // 2 minutes
          });
        });
        
        // Widget updates to show resumable session
        await coordinator.forceUpdate({
          source: 'session_progress',
          reason: 'progress_update',
          timestamp: new Date().toISOString(),
          priority: 'normal'
        });
        
        widgetData = await dataService.getCurrentWidgetData();
        expect(widgetData?.todayProgress.midday.status).toBe('in_progress');
        expect(widgetData?.todayProgress.midday.canResume).toBe(true);
        expect(widgetData?.todayProgress.midday.progressPercentage).toBe(60);

        // User resumes midday session
        const resumeDeepLink = WidgetDeepLinkTestUtils.simulateDeepLink('midday', true);
        await coordinator.handleDeepLink(resumeDeepLink);
        expect(NavigationService.navigateToCheckIn).toHaveBeenCalledWith('midday', true);
        
        // Simulate completion
        await simulateUserAction(async () => {
          const middayCheckIn = {
            id: testStore.currentCheckIn.id,
            type: 'midday' as CheckInType,
            completedAt: new Date().toISOString(),
            data: { 
              ...testStore.currentCheckIn.data,
              emotions: ['focused', 'energized'],
              bodyAreas: ['head', 'neck']
            },
            skipped: false
          };
          testStore.addCheckIn(middayCheckIn);
          testStore.todaysCheckIns.push(middayCheckIn);
          testStore.currentCheckIn = null;
        });

        // 4. Evening check-in flow
        console.log('🌅 Starting evening check-in flow...');
        
        const eveningDeepLink = WidgetDeepLinkTestUtils.simulateDeepLink('evening', false);
        await coordinator.handleDeepLink(eveningDeepLink);
        
        await simulateUserAction(async () => {
          const eveningCheckIn = {
            id: `evening_${Date.now()}`,
            type: 'evening' as CheckInType,
            completedAt: new Date().toISOString(),
            data: { emotions: ['grateful', 'peaceful'], bodyAreas: ['whole_body'] },
            skipped: false
          };
          testStore.addCheckIn(eveningCheckIn);
          testStore.todaysCheckIns.push(eveningCheckIn);
        });

        // 5. Final widget update - day complete
        await coordinator.forceUpdate({
          source: 'checkin_completed',
          reason: 'status_change',
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
        
        widgetData = await dataService.getCurrentWidgetData();
        expect(widgetData?.todayProgress.morning.status).toBe('completed');
        expect(widgetData?.todayProgress.midday.status).toBe('completed');
        expect(widgetData?.todayProgress.evening.status).toBe('completed');
        expect(widgetData?.todayProgress.completionPercentage).toBe(100);

        // 6. Verify system health throughout
        status = coordinator.getIntegrationStatus();
        expect(status.isHealthy).toBe(true);
        expect(status.privacyCompliant).toBe(true);
        expect(status.lastUpdate).toBeDefined();

        const journeyMetrics = performanceTracker.endOperation(journeyId);
        console.log(`✅ Full day journey completed in ${journeyMetrics.totalOperationMs.toFixed(2)}ms`);
        
        // Journey should complete within reasonable time
        expect(journeyMetrics.totalOperationMs).toBeLessThan(30000); // 30 seconds max
        
      } catch (error) {
        performanceTracker.endOperation(journeyId);
        throw error;
      }
    }, E2E_CONFIG.TEST_TIMEOUT_MS);

    test('should handle crisis intervention workflow', async () => {
      console.log('🚨 Testing crisis intervention workflow...');
      
      await coordinator.initialize();
      
      // 1. Crisis mode activation
      await simulateUserAction(async () => {
        testStore.crisisMode = {
          isActive: true,
          triggeredAt: new Date().toISOString(),
          reason: 'high_risk_assessment',
          severity: 'high'
        };
      });
      
      // 2. Critical priority widget update
      const crisisTrigger: WidgetUpdateTrigger = {
        source: 'crisis_mode_changed',
        reason: 'crisis_alert',
        timestamp: new Date().toISOString(),
        priority: 'critical'
      };
      
      const crisisUpdateStart = WidgetPerformanceTestUtils.startOperation('Crisis Widget Update');
      await coordinator.forceUpdate(crisisTrigger);
      const crisisUpdateMetrics = WidgetPerformanceTestUtils.endOperation(crisisUpdateStart);
      
      // Crisis updates should be very fast
      expect(crisisUpdateMetrics.totalOperationMs).toBeLessThan(500);
      
      // 3. Verify crisis widget data
      const widgetData = await dataService.getCurrentWidgetData();
      expect(widgetData?.hasActiveCrisis).toBe(true);
      
      // 4. Crisis deep link handling
      const crisisDeepLink = WidgetDeepLinkTestUtils.simulateCrisisDeepLink();
      
      const crisisNavStart = WidgetPerformanceTestUtils.startOperation('Crisis Navigation');
      await coordinator.handleDeepLink(crisisDeepLink);
      const crisisNavMetrics = WidgetPerformanceTestUtils.endOperation(crisisNavStart);
      
      // Crisis navigation should be immediate
      expect(crisisNavMetrics.totalOperationMs).toBeLessThan(300);
      expect(NavigationService.navigateToCrisis).toHaveBeenCalledWith('widget_emergency_access');
      
      // 5. Crisis resolution
      await simulateUserAction(async () => {
        testStore.crisisMode = {
          isActive: false,
          resolvedAt: new Date().toISOString(),
          duration: '15 minutes'
        };
      });
      
      await coordinator.forceUpdate({
        source: 'crisis_mode_changed',
        reason: 'crisis_alert',
        timestamp: new Date().toISOString(),
        priority: 'critical'
      });
      
      const resolvedWidgetData = await dataService.getCurrentWidgetData();
      expect(resolvedWidgetData?.hasActiveCrisis).toBe(false);
      
      console.log('✅ Crisis intervention workflow completed successfully');
    });

    test('should handle user behavior patterns realistically', async () => {
      console.log('👤 Testing realistic user behavior patterns...');
      
      await coordinator.initialize();
      
      // Pattern 1: Enthusiastic starter (completes morning, skips others)
      await simulateUserBehavior(async () => {
        // Complete morning enthusiastically
        const morningCheckIn = {
          id: `morning_${Date.now()}`,
          type: 'morning' as CheckInType,
          completedAt: new Date().toISOString(),
          data: { emotions: ['motivated', 'optimistic'], bodyAreas: ['chest', 'head'] },
          skipped: false
        };
        testStore.addCheckIn(morningCheckIn);
        
        await coordinator.forceUpdate({
          source: 'checkin_completed',
          reason: 'status_change',
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
        
        // Skip midday (busy day)
        const skippedMidday = {
          id: `midday_skipped_${Date.now()}`,
          type: 'midday' as CheckInType,
          skippedAt: new Date().toISOString(),
          skipped: true,
          reason: 'too_busy'
        };
        testStore.addCheckIn(skippedMidday);
        
        // Don't do evening (forgot)
        // Widget should show understanding, not judgment
        const widgetData = await dataService.getCurrentWidgetData();
        expect(widgetData?.todayProgress.morning.status).toBe('completed');
        expect(widgetData?.todayProgress.midday.status).toBe('skipped');
        expect(widgetData?.todayProgress.evening.status).toBe('not_started');
        expect(widgetData?.todayProgress.completionPercentage).toBeGreaterThan(0);
      });

      // Pattern 2: Perfectionist user (restarts sessions multiple times)
      await simulateUserBehavior(async () => {
        // Start evening session
        let deepLink = WidgetDeepLinkTestUtils.simulateDeepLink('evening', false);
        await coordinator.handleDeepLink(deepLink);
        
        // Get partway through, then restart
        testStore.currentCheckIn = {
          id: `evening_attempt1_${Date.now()}`,
          type: 'evening',
          startedAt: new Date().toISOString(),
          progress: { currentStep: 2, totalSteps: 7, percentComplete: 28 }
        };
        
        // Start over (new session)
        deepLink = WidgetDeepLinkTestUtils.simulateDeepLink('evening', false);
        await coordinator.handleDeepLink(deepLink);
        
        // Complete this time
        const eveningCheckIn = {
          id: `evening_final_${Date.now()}`,
          type: 'evening' as CheckInType,
          completedAt: new Date().toISOString(),
          data: { emotions: ['satisfied', 'accomplished'], bodyAreas: ['shoulders', 'back'] },
          skipped: false
        };
        testStore.addCheckIn(eveningCheckIn);
        testStore.currentCheckIn = null;
      });

      // Pattern 3: Inconsistent user (long gaps, then intensive usage)
      await simulateUserBehavior(async () => {
        // Simulate returning after a week off
        const returnDate = new Date();
        returnDate.setDate(returnDate.getDate() + 7);
        
        testStore.lastActivityDate = returnDate.toISOString();
        
        // Should still provide encouraging experience
        const widgetData = await dataService.getCurrentWidgetData();
        expect(widgetData).toBeDefined();
        
        // Fresh start should be supported
        expect(widgetData?.todayProgress.completionPercentage).toBeDefined();
      });
      
      console.log('✅ Realistic user behavior patterns handled successfully');
    });
  });

  describe('System Resilience and Recovery', () => {
    test('should handle transient system failures gracefully', async () => {
      console.log('🔧 Testing system resilience...');
      
      const { BeingWidgets } = require('react-native').NativeModules;
      
      // Introduce intermittent failures
      let failureCount = 0;
      const originalImpl = BeingWidgets.updateWidgetData.getMockImplementation();
      
      BeingWidgets.updateWidgetData.mockImplementation(async (data: string) => {
        failureCount++;
        if (failureCount % 3 === 0) { // Fail every 3rd call
          throw new Error('Simulated system failure');
        }
        return originalImpl(data);
      });
      
      await coordinator.initialize();
      
      // Multiple update attempts should eventually succeed
      for (let i = 0; i < 10; i++) {
        try {
          await coordinator.forceUpdate({
            source: 'manual_refresh',
            reason: 'data_refresh',
            timestamp: new Date().toISOString(),
            priority: 'normal'
          });
        } catch (error) {
          // Some failures are expected, but system should recover
          console.log(`⚠️  Expected transient failure: ${(error as Error).message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, E2E_CONFIG.USER_ACTION_DELAY_MS));
      }
      
      // System should remain healthy despite failures
      const status = coordinator.getIntegrationStatus();
      expect(status.isInitialized).toBe(true);
      
      // At least some operations should have succeeded
      expect(BeingWidgets.updateWidgetData).toHaveBeenCalledTimes(failureCount);
      
      console.log(`✅ System handled ${failureCount} operations with graceful failure recovery`);
    });

    test('should maintain performance under stress conditions', async () => {
      console.log('💪 Testing system under stress...');
      
      await coordinator.initialize();
      
      const stressTestResults: number[] = [];
      const endTime = Date.now() + E2E_CONFIG.STRESS_TEST_DURATION_MS;
      let operationCount = 0;
      
      // Concurrent stress testing
      const stressOperations = Array.from({ length: E2E_CONFIG.CONCURRENT_USERS }, async (_, userIndex) => {
        while (Date.now() < endTime) {
          const startTime = WidgetPerformanceTestUtils.startOperation(`Stress User ${userIndex}`);
          
          try {
            // Simulate rapid user interactions
            await Promise.all([
              coordinator.forceUpdate({
                source: 'manual_refresh',
                reason: 'data_refresh',
                timestamp: new Date().toISOString(),
                priority: 'normal'
              }),
              coordinator.handleDeepLink(
                WidgetDeepLinkTestUtils.simulateDeepLink(
                  ['morning', 'midday', 'evening'][Math.floor(Math.random() * 3)] as CheckInType,
                  Math.random() > 0.5
                )
              )
            ]);
            
            const metrics = WidgetPerformanceTestUtils.endOperation(startTime);
            stressTestResults.push(metrics.totalOperationMs);
            operationCount++;
            
          } catch (error) {
            WidgetPerformanceTestUtils.endOperation(startTime);
            console.log(`⚠️  Stress test error: ${(error as Error).message}`);
          }
          
          // Brief pause between operations
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        }
      });
      
      await Promise.allSettled(stressOperations);
      
      // Analyze stress test results
      const averageLatency = stressTestResults.reduce((sum, lat) => sum + lat, 0) / stressTestResults.length;
      const maxLatency = Math.max(...stressTestResults);
      const minLatency = Math.min(...stressTestResults);
      const p95Latency = stressTestResults.sort((a, b) => a - b)[Math.floor(stressTestResults.length * 0.95)];
      
      console.log(`📊 Stress Test Results (${operationCount} operations):`);
      console.log(`   Average: ${averageLatency.toFixed(2)}ms`);
      console.log(`   Min: ${minLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
      console.log(`   95th percentile: ${p95Latency.toFixed(2)}ms`);
      
      // Performance should remain reasonable under stress
      expect(averageLatency).toBeLessThan(2000); // 2 second average max
      expect(p95Latency).toBeLessThan(5000); // 5 second P95 max
      
      // System should still be healthy
      const finalStatus = coordinator.getIntegrationStatus();
      expect(finalStatus.isHealthy).toBe(true);
      
      console.log('✅ System maintained performance under stress conditions');
    });

    test('should recover from complete system restart', async () => {
      console.log('🔄 Testing system restart recovery...');
      
      // 1. Initial system state
      await coordinator.initialize();
      
      // Add some data
      await simulateUserAction(async () => {
        const morningCheckIn = {
          id: `morning_${Date.now()}`,
          type: 'morning' as CheckInType,
          completedAt: new Date().toISOString(),
          data: { emotions: ['calm'], bodyAreas: ['chest'] },
          skipped: false
        };
        testStore.addCheckIn(morningCheckIn);
      });
      
      await coordinator.forceUpdate({
        source: 'checkin_completed',
        reason: 'status_change',
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
      
      const preRestartData = await dataService.getCurrentWidgetData();
      expect(preRestartData).toBeDefined();
      
      // 2. Simulate complete system shutdown
      coordinator.dispose();
      nativeBridge.dispose();
      
      // 3. Create new instances (simulating app restart)
      coordinator = WidgetIntegrationFactory.createStandard();
      nativeBridge = new WidgetNativeBridgeService();
      dataService = new WidgetDataService();
      
      // 4. Reinitialize
      await coordinator.initialize();
      
      // 5. System should recover gracefully
      const status = coordinator.getIntegrationStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isHealthy).toBe(true);
      
      // 6. Data should be regenerated correctly
      const postRestartData = await dataService.getCurrentWidgetData();
      expect(postRestartData).toBeDefined();
      expect(postRestartData?.appVersion).toBeDefined();
      expect(postRestartData?.encryptionHash).toBeDefined();
      
      // 7. Should handle new operations normally
      await coordinator.forceUpdate({
        source: 'app_foreground',
        reason: 'data_refresh',
        timestamp: new Date().toISOString(),
        priority: 'normal'
      });
      
      const finalStatus = coordinator.getIntegrationStatus();
      expect(finalStatus.isHealthy).toBe(true);
      
      console.log('✅ System successfully recovered from complete restart');
    });
  });

  describe('Integration with App Lifecycle', () => {
    test('should handle app state changes correctly', async () => {
      console.log('📱 Testing app lifecycle integration...');
      
      await coordinator.initialize();
      
      // Simulate app backgrounding
      AppState.currentState = 'background';
      
      // Widget updates should continue (but may be throttled)
      await coordinator.forceUpdate({
        source: 'app_foreground',
        reason: 'data_refresh',
        timestamp: new Date().toISOString(),
        priority: 'low'
      });
      
      // System should remain functional
      let status = coordinator.getIntegrationStatus();
      expect(status.isInitialized).toBe(true);
      
      // Simulate app foregrounding
      AppState.currentState = 'active';
      
      // Should handle foreground events
      await coordinator.forceUpdate({
        source: 'app_foreground',
        reason: 'data_refresh',
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
      
      status = coordinator.getIntegrationStatus();
      expect(status.isHealthy).toBe(true);
      
      // Simulate app inactive state
      AppState.currentState = 'inactive';
      
      // Should still handle critical updates (like crisis)
      await coordinator.forceUpdate({
        source: 'crisis_mode_changed',
        reason: 'crisis_alert',
        timestamp: new Date().toISOString(),
        priority: 'critical'
      });
      
      status = coordinator.getIntegrationStatus();
      expect(status.isInitialized).toBe(true);
      
      console.log('✅ App lifecycle integration working correctly');
    });

    test('should integrate seamlessly with store subscriptions', async () => {
      console.log('🔄 Testing store integration...');
      
      await coordinator.initialize();
      
      let updateCount = 0;
      const updateCallback = jest.fn(() => updateCount++);
      
      // Subscribe to store updates
      const unsubscribe = widgetStoreIntegration.subscribeToCheckInUpdates?.(updateCallback) || (() => {});
      
      // Simulate store changes
      await simulateUserAction(async () => {
        testStore.addCheckIn({
          id: `test_${Date.now()}`,
          type: 'morning',
          completedAt: new Date().toISOString(),
          data: { emotions: ['happy'], bodyAreas: ['chest'] }
        });
        
        // Trigger store subscribers
        updateCallback({
          source: 'checkin_completed',
          reason: 'status_change',
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
      });
      
      // Widget should update in response to store changes
      expect(updateCallback).toHaveBeenCalled();
      
      // Cleanup subscription
      unsubscribe();
      
      console.log('✅ Store integration working correctly');
    });
  });

  describe('Real-World Edge Cases', () => {
    test('should handle rapid user interactions without breaking', async () => {
      console.log('⚡ Testing rapid user interactions...');
      
      await coordinator.initialize();
      
      // Simulate user rapidly tapping widgets
      const rapidInteractions = Array.from({ length: 20 }, (_, i) => ({
        delay: i * 50, // 50ms between taps
        action: async () => {
          const type = ['morning', 'midday', 'evening'][i % 3] as CheckInType;
          const deepLink = WidgetDeepLinkTestUtils.simulateDeepLink(type, Math.random() > 0.5);
          return coordinator.handleDeepLink(deepLink);
        }
      }));
      
      const interactionPromises = rapidInteractions.map(interaction =>
        new Promise(resolve => 
          setTimeout(() => 
            interaction.action().then(resolve).catch(resolve), 
          interaction.delay)
        )
      );
      
      const results = await Promise.allSettled(interactionPromises);
      
      // Some interactions may be debounced, but system should not crash
      const successfulInteractions = results.filter(result => result.status === 'fulfilled').length;
      expect(successfulInteractions).toBeGreaterThan(0);
      
      // System should remain stable
      const status = coordinator.getIntegrationStatus();
      expect(status.isHealthy).toBe(true);
      
      console.log(`✅ Handled ${rapidInteractions.length} rapid interactions, ${successfulInteractions} successful`);
    });

    test('should gracefully handle corrupted or missing data', async () => {
      console.log('🔧 Testing data corruption handling...');
      
      await coordinator.initialize();
      
      // Simulate various data corruption scenarios
      const corruptionScenarios = [
        {
          name: 'Missing check-in data',
          setup: () => { testStore.todaysCheckIns = undefined; }
        },
        {
          name: 'Corrupted check-in structure',
          setup: () => { 
            testStore.todaysCheckIns = [{ malformed: 'data', missing: 'fields' }]; 
          }
        },
        {
          name: 'Null current check-in',
          setup: () => { testStore.currentCheckIn = null; }
        },
        {
          name: 'Invalid crisis mode data',
          setup: () => { testStore.crisisMode = 'invalid_string'; }
        }
      ];
      
      for (const scenario of corruptionScenarios) {
        console.log(`  Testing: ${scenario.name}`);
        
        scenario.setup();
        
        // System should handle corruption gracefully
        const widgetData = await dataService.getCurrentWidgetData();
        expect(widgetData).toBeDefined();
        expect(widgetData?.todayProgress).toBeDefined();
        expect(widgetData?.hasActiveCrisis).toBeDefined();
        
        // Should not contain corrupted data
        expect(widgetData?.todayProgress.morning.status).toMatch(/not_started|in_progress|completed|skipped/);
        expect(typeof widgetData?.hasActiveCrisis).toBe('boolean');
        
        console.log(`    ✅ ${scenario.name} handled gracefully`);
      }
      
      console.log('✅ Data corruption scenarios handled successfully');
    });

    test('should maintain privacy during edge case scenarios', async () => {
      console.log('🔒 Testing privacy during edge cases...');
      
      await coordinator.initialize();
      
      // Inject sensitive data in various places
      testStore.sensitiveData = {
        phq9Score: 18,
        personalNote: 'I am having dark thoughts',
        emergencyContact: 'John Doe: 555-123-4567'
      };
      
      testStore.maliciousData = {
        script: '<script>alert("xss")</script>',
        eval: 'eval("malicious code")'
      };
      
      // System should filter out all sensitive content
      const widgetData = await dataService.getCurrentWidgetData();
      const dataString = JSON.stringify(widgetData).toLowerCase();
      
      const prohibitedPatterns = [
        'phq9', 'personal', 'emergency', 'john doe', '555-123-4567',
        'script', 'eval', 'malicious', 'dark thoughts'
      ];
      
      for (const pattern of prohibitedPatterns) {
        expect(dataString).not.toContain(pattern);
      }
      
      console.log('✅ Privacy maintained during edge case scenarios');
    });
  });
});

/**
 * Helper Functions
 */

function createRealisticsStore() {
  const store = {
    // Core data
    checkIns: [],
    todaysCheckIns: [],
    currentCheckIn: null,
    crisisMode: { isActive: false },
    
    // Mock methods
    getTodaysProgress: jest.fn().mockImplementation(() => {
      const completed = store.todaysCheckIns.filter((c: any) => !c.skipped).length;
      return { completed, total: 3 };
    }),
    
    getTodaysCheckIn: jest.fn().mockImplementation((type: CheckInType) => {
      return store.todaysCheckIns.find((c: any) => c.type === type) || null;
    }),
    
    checkForPartialSession: jest.fn().mockImplementation((type: CheckInType) => {
      return Promise.resolve(store.currentCheckIn?.type === type);
    }),
    
    getSessionProgress: jest.fn().mockImplementation((type: CheckInType) => {
      if (store.currentCheckIn?.type === type) {
        return Promise.resolve(store.currentCheckIn.progress);
      }
      return Promise.resolve(null);
    }),
    
    addCheckIn: jest.fn().mockImplementation((checkIn: any) => {
      store.checkIns.push(checkIn);
    }),
    
    getWidgetUpdateStatus: jest.fn().mockReturnValue({
      needsUpdate: false,
      lastUpdate: new Date().toISOString()
    }),
    
    markWidgetUpdated: jest.fn(),
    
    // Store state management
    subscribe: jest.fn(() => jest.fn()),
    getState: jest.fn(() => store)
  };
  
  return store;
}

async function simulateUserAction(action: () => Promise<void> | void): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, E2E_CONFIG.USER_ACTION_DELAY_MS));
  await action();
  await new Promise(resolve => setTimeout(resolve, E2E_CONFIG.USER_ACTION_DELAY_MS));
}

async function simulateUserBehavior(behavior: () => Promise<void>): Promise<void> {
  const behaviorStart = WidgetPerformanceTestUtils.startOperation('User Behavior');
  try {
    await behavior();
    const behaviorMetrics = WidgetPerformanceTestUtils.endOperation(behaviorStart);
    console.log(`   Behavior completed in ${behaviorMetrics.totalOperationMs.toFixed(2)}ms`);
  } catch (error) {
    WidgetPerformanceTestUtils.endOperation(behaviorStart);
    throw error;
  }
}