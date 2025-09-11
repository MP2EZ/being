/**
 * Comprehensive Widget Integration Tests
 * Clinical-grade testing suite for FullMind MBCT app widget implementation
 * Ensures clinical accuracy, privacy compliance, and performance requirements
 */

import { jest } from '@jest/globals';
import { Platform, AppState } from 'react-native';
import { 
  WidgetIntegrationCoordinator,
  WidgetDataService,
  WidgetNativeBridgeService,
  NavigationService,
  widgetTestUtils,
  widgetTestAssertions,
  widgetTestScenarios,
  WIDGET_CONFIG,
  WidgetIntegrationFactory
} from '../../src/services/widgets';
import { useCheckInStore } from '../../src/store/checkInStore';
import { widgetStoreIntegration } from '../../src/store/widgetIntegration';
import {
  useWidgetIntegration,
  useSimpleWidgetIntegration,
  useCrisisAwareWidgetIntegration
} from '../../src/hooks/useWidgetIntegration';
import type {
  WidgetData,
  WidgetBridgeError,
  WidgetUpdateTrigger,
  PrivacyValidationResult,
  WidgetSessionStatus,
  WidgetPerformanceMetrics,
  CheckInType
} from '../../src/types/widget';
import { renderHook, waitFor, act } from '@testing-library/react-native';

// Mock native modules with comprehensive implementation
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((platforms) => platforms.ios) },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  NativeModules: {
    FullMindWidgets: {
      updateWidgetData: jest.fn().mockResolvedValue(undefined),
      reloadWidgets: jest.fn().mockResolvedValue(undefined),
      setAppGroupData: jest.fn().mockResolvedValue(undefined),
      getAppGroupData: jest.fn().mockResolvedValue('{}'),
      performHealthCheck: jest.fn().mockResolvedValue(true),
      clearWidgetData: jest.fn().mockResolvedValue(undefined),
      getActiveWidgetIds: jest.fn().mockResolvedValue([1, 2]),
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
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true)
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.7.0' },
  platform: { ios: { buildNumber: '100' } }
}));

// Mock navigation service
jest.mock('../../src/services/NavigationService', () => ({
  NavigationService: {
    navigateToCheckIn: jest.fn(),
    navigateToCrisis: jest.fn(),
    navigateToHome: jest.fn(),
    getCurrentRoute: jest.fn(() => 'Home')
  }
}));

describe('Comprehensive Widget Integration Tests', () => {
  let coordinator: WidgetIntegrationCoordinator;
  let dataService: WidgetDataService;
  let nativeBridge: WidgetNativeBridgeService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Reset performance measurements
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn()
    } as any;

    // Create fresh instances with clinical-grade configuration
    coordinator = WidgetIntegrationFactory.createEnhanced();
    dataService = new WidgetDataService();
    nativeBridge = new WidgetNativeBridgeService();

    // Initialize test environment
    await setupClinicalTestEnvironment();
  });

  afterEach(() => {
    coordinator?.dispose();
    nativeBridge?.dispose();
    widgetStoreIntegration.cleanup?.();
  });

  describe('1. End-to-End Widget Functionality', () => {
    test('should handle complete widget lifecycle with clinical accuracy', async () => {
      // Initialize widget system
      await coordinator.initialize();
      
      // Simulate user completing morning check-in
      const store = useCheckInStore.getState();
      const mockCheckIn = {
        id: `checkin_${Date.now()}`,
        type: 'morning' as CheckInType,
        completedAt: new Date().toISOString(),
        data: { emotions: ['calm', 'focused'], bodyAreas: ['chest', 'shoulders'] },
        skipped: false
      };
      
      store.addCheckIn(mockCheckIn);
      
      // Force widget update
      const updateTrigger: WidgetUpdateTrigger = {
        source: 'checkin_completed',
        reason: 'status_change',
        timestamp: new Date().toISOString(),
        priority: 'high'
      };
      
      await coordinator.forceUpdate(updateTrigger);
      
      // Validate widget data accuracy
      const widgetData = await dataService.getCurrentWidgetData();
      expect(widgetData).toBeDefined();
      expect(widgetData!.todayProgress.morning.status).toBe('completed');
      expect(widgetData!.todayProgress.morning.progressPercentage).toBe(100);
      
      // Verify privacy compliance
      widgetTestAssertions.assertNoPrivacyViolations(widgetData!);
      
      // Test deep link navigation
      const deepLink = widgetTestUtils.simulateDeepLink('midday', false);
      await coordinator.handleDeepLink(deepLink);
      
      // Verify navigation was triggered
      expect(NavigationService.navigateToCheckIn).toHaveBeenCalledWith('midday', false);
      
      // Validate system health after operations
      const healthStatus = coordinator.getIntegrationStatus();
      expect(healthStatus.isHealthy).toBe(true);
      expect(healthStatus.privacyCompliant).toBe(true);
    });

    test('should maintain widget state synchronization across platforms', async () => {
      await coordinator.initialize();
      
      // Test iOS widget update
      Platform.OS = 'ios';
      const mockData = widgetTestUtils.createMockWidgetData();
      await nativeBridge.storeWidgetData(mockData);
      
      const { FullMindWidgets } = require('react-native').NativeModules;
      expect(FullMindWidgets.updateWidgetData).toHaveBeenCalledWith(
        JSON.stringify(mockData)
      );
      expect(FullMindWidgets.setAppGroupData).toHaveBeenCalled();
      expect(FullMindWidgets.reloadWidgets).toHaveBeenCalled();
      
      // Test Android widget update
      Platform.OS = 'android';
      await nativeBridge.storeWidgetData(mockData);
      
      expect(FullMindWidgets.updateAllWidgets).toHaveBeenCalled();
      expect(FullMindWidgets.getActiveWidgetIds).toHaveBeenCalled();
    });

    test('should handle session resumption from widgets correctly', async () => {
      const store = useCheckInStore.getState();
      
      // Mock partial session
      const partialSession = {
        id: 'partial_session',
        type: 'evening' as CheckInType,
        startedAt: new Date().toISOString(),
        progress: { currentStep: 3, totalSteps: 7, percentComplete: 43 },
        data: { emotions: ['tired'], bodyAreas: ['shoulders'] }
      };
      
      (store as any).currentCheckIn = partialSession;
      (store as any).checkForPartialSession = jest.fn().mockResolvedValue(true);
      (store as any).getSessionProgress = jest.fn().mockResolvedValue(partialSession.progress);
      
      const widgetData = await dataService.generateWidgetData();
      
      expect(widgetData.todayProgress.evening.status).toBe('in_progress');
      expect(widgetData.todayProgress.evening.progressPercentage).toBe(43);
      expect(widgetData.todayProgress.evening.canResume).toBe(true);
      
      // Test resume navigation
      const resumeLink = widgetTestUtils.simulateDeepLink('evening', true);
      await coordinator.handleDeepLink(resumeLink);
      
      expect(NavigationService.navigateToCheckIn).toHaveBeenCalledWith('evening', true);
    });
  });

  describe('2. Clinical Data Safety Testing', () => {
    test('should prevent any clinical data from reaching widgets', async () => {
      const store = useCheckInStore.getState();
      
      // Inject dangerous clinical data into store
      (store as any).assessmentData = {
        phq9Score: 18,
        gad7Score: 15,
        suicidalIdeation: true,
        severityLevel: 'severe',
        clinicalNotes: 'Patient shows severe depression symptoms',
        treatmentRecommendations: ['medication', 'intensive_therapy'],
        emergencyContact: { name: 'John Doe', phone: '555-1234' },
        personalNote: 'Having thoughts of self-harm'
      };
      
      // Generate widget data - should filter out all clinical content
      const widgetData = await dataService.generateWidgetData();
      
      // Comprehensive clinical data detection
      const dataString = JSON.stringify(widgetData).toLowerCase();
      const prohibitedPatterns = [
        'phq', 'gad', 'assessment', 'score', 'suicidal', 'severity',
        'depression', 'anxiety', 'clinical', 'treatment', 'medication',
        'therapy', 'emergency', 'contact', 'personal', 'harm', 'crisis',
        'john doe', '555-1234', 'severe', 'intensive'
      ];
      
      for (const pattern of prohibitedPatterns) {
        expect(dataString).not.toContain(pattern);
      }
      
      // Verify privacy validation catches violations
      const violationResult = widgetTestUtils.validatePrivacy((store as any).assessmentData);
      expect(violationResult.isValid).toBe(false);
      expect(violationResult.violations.length).toBeGreaterThan(0);
    });

    test('should enforce HIPAA-aware data handling', async () => {
      const testData = {
        personalHealthInfo: 'Patient ID: 12345',
        medicalRecord: 'MRN: 67890',
        diagnosis: 'Major Depressive Disorder',
        prescription: 'Sertraline 50mg',
        provider: 'Dr. Smith, MD',
        insuranceInfo: 'BlueCross Policy 123-456-789'
      };
      
      const privacyResult = widgetTestUtils.validatePrivacy(testData);
      
      expect(privacyResult.isValid).toBe(false);
      expect(privacyResult.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            violationType: 'clinical_data_detected'
          })
        ])
      );
      expect(privacyResult.filteredData).toBeNull();
    });

    test('should maintain data integrity checksums', async () => {
      const originalData = await dataService.generateWidgetData();
      const originalHash = originalData.encryptionHash;
      
      // Simulate data change
      const store = useCheckInStore.getState();
      const newCheckIn = {
        id: `checkin_${Date.now()}`,
        type: 'midday' as CheckInType,
        completedAt: new Date().toISOString(),
        data: { emotions: ['energized'], bodyAreas: ['chest'] }
      };
      store.addCheckIn(newCheckIn);
      
      const updatedData = await dataService.generateWidgetData();
      
      // Hash should change with different data
      expect(updatedData.encryptionHash).not.toBe(originalHash);
      expect(updatedData.encryptionHash).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('3. Cross-Platform Consistency', () => {
    test('should provide identical user experience across platforms', async () => {
      const testScenarios = [
        { platform: 'ios', expectedMethods: ['updateWidgetData', 'reloadWidgets', 'setAppGroupData'] },
        { platform: 'android', expectedMethods: ['updateWidgetData', 'updateAllWidgets', 'getActiveWidgetIds'] }
      ];
      
      for (const scenario of testScenarios) {
        // Reset mocks
        jest.clearAllMocks();
        Platform.OS = scenario.platform as any;
        
        const bridge = new WidgetNativeBridgeService();
        await bridge.initialize();
        
        const mockData = widgetTestUtils.createMockWidgetData();
        await bridge.storeWidgetData(mockData);
        await bridge.triggerWidgetUpdate();
        
        const { FullMindWidgets } = require('react-native').NativeModules;
        
        // Verify platform-specific methods were called
        for (const method of scenario.expectedMethods) {
          expect(FullMindWidgets[method]).toHaveBeenCalled();
        }
        
        // Verify consistent data format regardless of platform
        const calls = FullMindWidgets.updateWidgetData.mock.calls;
        if (calls.length > 0) {
          const sentData = JSON.parse(calls[0][0]);
          widgetTestAssertions.assertValidWidgetData(sentData);
        }
      }
    });

    test('should handle deep linking consistently across platforms', async () => {
      const deepLinkScenarios = [
        { type: 'morning', resume: false },
        { type: 'midday', resume: true },
        { type: 'evening', resume: false }
      ] as const;
      
      for (const platform of ['ios', 'android'] as const) {
        Platform.OS = platform;
        
        for (const scenario of deepLinkScenarios) {
          jest.clearAllMocks();
          
          const deepLink = widgetTestUtils.simulateDeepLink(scenario.type, scenario.resume);
          await coordinator.handleDeepLink(deepLink);
          
          expect(NavigationService.navigateToCheckIn).toHaveBeenCalledWith(
            scenario.type,
            scenario.resume
          );
        }
      }
    });
  });

  describe('4. Performance & Reliability Testing', () => {
    test('should meet clinical timing requirements', async () => {
      const performanceTests = [
        {
          operation: 'Widget data generation',
          maxLatencyMs: 1000,
          fn: () => dataService.generateWidgetData()
        },
        {
          operation: 'Deep link navigation',
          maxLatencyMs: 500,
          fn: () => coordinator.handleDeepLink(widgetTestUtils.simulateDeepLink('morning'))
        },
        {
          operation: 'Widget update trigger',
          maxLatencyMs: 1000,
          fn: () => coordinator.forceUpdate()
        }
      ];
      
      for (const test of performanceTests) {
        const startTime = performance.now();
        await test.fn();
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        expect(latency).toBeLessThan(test.maxLatencyMs);
        console.log(`✅ ${test.operation}: ${latency.toFixed(2)}ms (< ${test.maxLatencyMs}ms)`);
      }
    });

    test('should handle memory pressure gracefully', async () => {
      // Simulate high memory usage
      const largeDataArray: WidgetData[] = [];
      
      for (let i = 0; i < 100; i++) {
        largeDataArray.push(await dataService.generateWidgetData());
      }
      
      // Should still function under memory pressure
      const finalData = await dataService.generateWidgetData();
      widgetTestAssertions.assertValidWidgetData(finalData);
      
      // Verify no memory leaks in performance tracking
      const metrics = nativeBridge.getPerformanceMetrics();
      expect(metrics.length).toBeLessThan(1000); // Should not accumulate indefinitely
    });

    test('should maintain reliability under network failures', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Simulate intermittent failures
      FullMindWidgets.updateWidgetData
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce(undefined);
      
      const mockData = widgetTestUtils.createMockWidgetData();
      
      // Should eventually succeed with retries
      await expect(
        nativeBridge.storeWidgetData(mockData)
      ).resolves.not.toThrow();
      
      // Verify retry attempts were made
      expect(FullMindWidgets.updateWidgetData).toHaveBeenCalledTimes(3);
    });

    test('should track performance metrics accurately', async () => {
      // Perform multiple operations
      await coordinator.initialize();
      await coordinator.forceUpdate();
      await dataService.generateWidgetData();
      
      const metrics = nativeBridge.getPerformanceMetrics();
      const averageMetrics = nativeBridge.getAveragePerformanceMetrics();
      
      expect(metrics.length).toBeGreaterThan(0);
      expect(averageMetrics.totalOperationMs).toBeGreaterThan(0);
      expect(averageMetrics.updateLatencyMs).toBeGreaterThanOrEqual(0);
      expect(averageMetrics.nativeCallLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('5. Crisis Functionality Testing', () => {
    test('should handle crisis mode with maximum priority', async () => {
      const store = useCheckInStore.getState();
      
      // Activate crisis mode
      (store as any).crisisMode = {
        isActive: true,
        triggeredAt: new Date().toISOString(),
        reason: 'high_risk_assessment'
      };
      
      // Generate widget data in crisis mode
      const widgetData = await dataService.generateWidgetData();
      expect(widgetData.hasActiveCrisis).toBe(true);
      
      // Crisis updates should bypass throttling
      const crisisTrigger: WidgetUpdateTrigger = {
        source: 'crisis_mode_changed',
        reason: 'crisis_alert',
        timestamp: new Date().toISOString(),
        priority: 'critical'
      };
      
      await coordinator.forceUpdate(crisisTrigger);
      
      // Verify crisis deep link handling
      const crisisLink = widgetTestUtils.simulateCrisisDeepLink();
      await coordinator.handleDeepLink(crisisLink);
      
      expect(NavigationService.navigateToCrisis).toHaveBeenCalledWith('widget_emergency_access');
    });

    test('should provide emergency access within response time limits', async () => {
      const crisisResponseTests = [
        {
          scenario: 'Crisis button tap',
          maxResponseMs: 200,
          fn: () => coordinator.handleDeepLink(widgetTestUtils.simulateCrisisDeepLink())
        },
        {
          scenario: 'Crisis mode activation',
          maxResponseMs: 1000,
          fn: () => {
            const trigger: WidgetUpdateTrigger = {
              source: 'crisis_mode_changed',
              reason: 'crisis_alert',
              timestamp: new Date().toISOString(),
              priority: 'critical'
            };
            return coordinator.forceUpdate(trigger);
          }
        }
      ];
      
      for (const test of crisisResponseTests) {
        const startTime = performance.now();
        await test.fn();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        expect(responseTime).toBeLessThan(test.maxResponseMs);
        console.log(`🚨 ${test.scenario}: ${responseTime.toFixed(2)}ms (< ${test.maxResponseMs}ms)`);
      }
    });

    test('should maintain crisis accessibility during system stress', async () => {
      // Simulate system under stress
      const { FullMindWidgets } = require('react-native').NativeModules;
      FullMindWidgets.updateWidgetData.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      // Crisis navigation should still be fast
      const startTime = performance.now();
      const crisisLink = widgetTestUtils.simulateCrisisDeepLink();
      await coordinator.handleDeepLink(crisisLink);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(500); // Should not be affected by widget update delays
      expect(NavigationService.navigateToCrisis).toHaveBeenCalled();
    });
  });

  describe('6. Mental Health UX Testing', () => {
    test('should provide encouraging progress messaging', async () => {
      const progressScenarios = [
        { completed: 0, total: 3, expectedRange: [0, 10] },
        { completed: 1, total: 3, expectedRange: [25, 40] },
        { completed: 2, total: 3, expectedRange: [60, 75] },
        { completed: 3, total: 3, expectedRange: [95, 100] }
      ];
      
      for (const scenario of progressScenarios) {
        const store = useCheckInStore.getState();
        store.getTodaysProgress = jest.fn().mockReturnValue(scenario);
        
        const widgetData = await dataService.generateWidgetData();
        const completionPercentage = widgetData.todayProgress.completionPercentage;
        
        expect(completionPercentage).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
        expect(completionPercentage).toBeLessThanOrEqual(scenario.expectedRange[1]);
      }
    });

    test('should handle user stress scenarios gracefully', async () => {
      // Simulate rapid user interactions (stress tapping)
      const rapidOperations = Array.from({ length: 10 }, (_, i) => 
        coordinator.handleDeepLink(widgetTestUtils.simulateDeepLink('morning'))
      );
      
      // Should handle rapid requests without crashing
      await Promise.allSettled(rapidOperations);
      
      // System should remain stable
      const status = coordinator.getIntegrationStatus();
      expect(status.isHealthy).toBe(true);
      
      // Only one navigation should have occurred (debouncing)
      expect(NavigationService.navigateToCheckIn).toHaveBeenCalledTimes(1);
    });

    test('should provide accessibility support for mental health users', async () => {
      // Test with accessibility features enabled
      const accessibilityScenarios = widgetTestScenarios.generateAccessibilityScenarios();
      
      for (const scenario of accessibilityScenarios) {
        const widgetData = await dataService.generateWidgetData();
        
        // Verify accessibility-friendly data structure
        expect(widgetData.todayProgress.morning.estimatedTimeMinutes).toBeGreaterThan(0);
        expect(widgetData.todayProgress.morning.canResume).toBeDefined();
        
        // Ensure clear status messaging
        const status = widgetData.todayProgress.morning.status;
        expect(['not_started', 'in_progress', 'completed', 'skipped']).toContain(status);
      }
    });
  });

  describe('7. Hook Integration Testing', () => {
    test('should provide stable hook integration', async () => {
      const TestComponent = () => {
        const { widgetData, isUpdating, updateWidgetData } = useWidgetIntegration({
          autoUpdate: true,
          updateOnForeground: true,
          throttleMs: 1000
        });
        
        return { widgetData, isUpdating, updateWidgetData };
      };
      
      const { result } = renderHook(() => TestComponent());
      
      // Initial state
      expect(result.current.isUpdating).toBe(false);
      
      // Trigger update
      await act(async () => {
        await result.current.updateWidgetData();
      });
      
      await waitFor(() => {
        expect(result.current.widgetData).toBeDefined();
      });
      
      if (result.current.widgetData) {
        widgetTestAssertions.assertValidWidgetData(result.current.widgetData);
      }
    });

    test('should handle crisis-aware widget integration', async () => {
      const TestComponent = () => {
        return useCrisisAwareWidgetIntegration();
      };
      
      const { result } = renderHook(() => TestComponent());
      
      // Simulate crisis mode
      const store = useCheckInStore.getState();
      (store as any).crisisMode = { isActive: true };
      
      await waitFor(() => {
        expect(result.current.widgetData?.hasActiveCrisis).toBe(true);
      });
    });
  });

  describe('8. Error Recovery and Fault Tolerance', () => {
    test('should recover from complete system failures', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Simulate complete native bridge failure
      FullMindWidgets.updateWidgetData.mockImplementation(() => {
        throw new Error('Native module crashed');
      });
      FullMindWidgets.performHealthCheck.mockResolvedValue(false);
      
      // System should detect failure and attempt recovery
      await coordinator.initialize();
      
      const initialStatus = coordinator.getIntegrationStatus();
      expect(initialStatus.isHealthy).toBe(false);
      
      // Restore functionality
      FullMindWidgets.updateWidgetData.mockResolvedValue(undefined);
      FullMindWidgets.performHealthCheck.mockResolvedValue(true);
      
      // Should recover
      await coordinator.performHealthCheck();
      
      const recoveredStatus = coordinator.getIntegrationStatus();
      expect(recoveredStatus.isHealthy).toBe(true);
    });

    test('should maintain partial functionality during degraded states', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Simulate partial failure (widget update fails, but health check works)
      FullMindWidgets.updateWidgetData.mockRejectedValue(new Error('Widget update failed'));
      
      // Should still generate valid data even if widget update fails
      const widgetData = await dataService.generateWidgetData();
      widgetTestAssertions.assertValidWidgetData(widgetData);
      
      // Deep links should still work
      const deepLink = widgetTestUtils.simulateDeepLink('morning');
      await expect(
        coordinator.handleDeepLink(deepLink)
      ).resolves.not.toThrow();
    });

    test('should handle data corruption gracefully', async () => {
      const SecureStore = require('expo-secure-store');
      
      // Simulate corrupted stored data
      SecureStore.getItemAsync.mockResolvedValue('{"corrupted": json data}');
      
      // Should fallback to generating fresh data
      const widgetData = await dataService.generateWidgetData();
      widgetTestAssertions.assertValidWidgetData(widgetData);
    });
  });
});

/**
 * Test Environment Setup Helper
 */
async function setupClinicalTestEnvironment(): Promise<void> {
  // Create consistent mock store state
  const mockStore = {
    checkIns: [],
    todaysCheckIns: [],
    currentCheckIn: null,
    crisisMode: { isActive: false },
    assessmentData: null,
    
    // Mock store methods
    getTodaysProgress: jest.fn().mockReturnValue({ completed: 0, total: 3 }),
    getTodaysCheckIn: jest.fn().mockReturnValue(null),
    getWidgetUpdateStatus: jest.fn().mockReturnValue({ needsUpdate: false, lastUpdate: null }),
    checkForPartialSession: jest.fn().mockResolvedValue(false),
    getSessionProgress: jest.fn().mockResolvedValue(null),
    addCheckIn: jest.fn(),
    markWidgetUpdated: jest.fn(),
    
    // Subscribe methods for store integration
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
    getState: jest.fn(() => mockStore)
  };
  
  // Mock the store
  (useCheckInStore as any).getState = jest.fn(() => mockStore);
  (useCheckInStore as any).subscribe = jest.fn(() => jest.fn());
  
  // Initialize test utilities
  await widgetTestUtils.initializeTestEnvironment();
  
  // Set up performance monitoring
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
      mark: jest.fn(),
      measure: jest.fn()
    } as any;
  }
}

export default setupClinicalTestEnvironment;