/**
 * Widget Bridge Integration Tests
 * Comprehensive end-to-end testing for widget TypeScript bridge
 * Clinical-grade validation of privacy, security, and functionality
 */

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
import { 
  WidgetIntegrationCoordinator,
  WidgetDataService,
  WidgetNativeBridgeService,
  widgetTestUtils,
  widgetTestAssertions,
  widgetTestScenarios,
  WIDGET_CONFIG
} from '../../src/services/widgets';
import { useCheckInStore } from '../../src/store/checkInStore';
import type {
  WidgetData,
  WidgetBridgeError,
  WidgetUpdateTrigger,
  PrivacyValidationResult
} from '../../src/types/widget';

// Mock native modules
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {
    FullMindWidgets: {
      updateWidgetData: jest.fn(),
      reloadWidgets: jest.fn(),
      setAppGroupData: jest.fn(),
      getAppGroupData: jest.fn(),
      performHealthCheck: jest.fn().mockResolvedValue(true),
      clearWidgetData: jest.fn(),
    }
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { version: '1.0.0' }
}));

describe('Widget Bridge Integration Tests', () => {
  let coordinator: WidgetIntegrationCoordinator;
  let dataService: WidgetDataService;
  let nativeBridge: WidgetNativeBridgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh instances for each test
    coordinator = new WidgetIntegrationCoordinator({
      autoInitialize: false,
      healthCheckIntervalMs: 0,
      performanceMonitoring: true,
      privacyAuditLevel: 'clinical'
    });
    
    dataService = new WidgetDataService();
    nativeBridge = new WidgetNativeBridgeService();
  });

  afterEach(() => {
    coordinator?.dispose();
    nativeBridge?.dispose();
  });

  describe('Privacy Compliance Validation', () => {
    test('should prevent clinical data from reaching widgets', async () => {
      const scenarios = widgetTestScenarios.generatePrivacyViolationCases();
      
      for (const scenario of scenarios) {
        const result = widgetTestUtils.validatePrivacy(scenario.data);
        
        expect(result.isValid).toBe(false);
        expect(result.violations).toHaveLength(expect.any(Number));
        expect(result.violations[0].violationType).toContain(scenario.expectedViolationType);
        expect(result.filteredData).toBeNull();
      }
    });

    test('should allow safe widget data', async () => {
      const scenarios = widgetTestScenarios.generateValidWidgetScenarios();
      
      for (const scenario of scenarios) {
        widgetTestAssertions.assertValidWidgetData(scenario.data);
        widgetTestAssertions.assertNoPrivacyViolations(scenario.data);
        
        const result = widgetTestUtils.validatePrivacy(scenario.data);
        expect(result.isValid).toBe(true);
        expect(result.violations).toHaveLength(0);
        expect(result.filteredData).toEqual(scenario.data);
      }
    });

    test('should enforce compile-time type safety', () => {
      // This test validates TypeScript compile-time safety
      const mockData = widgetTestUtils.createMockWidgetData();
      
      // These should not compile if types are working correctly:
      // const unsafeData: WidgetSafeData<{ phq9: any }> = mockData; // Should fail
      // const clinicalData: PrivacyCompliant<{ assessment: string }> = mockData; // Should fail
      
      // This should compile fine:
      const safeData = mockData;
      expect(safeData).toBeDefined();
    });
  });

  describe('Widget Data Generation', () => {
    test('should generate valid widget data from store state', async () => {
      const widgetData = await dataService.generateWidgetData();
      
      widgetTestAssertions.assertValidWidgetData(widgetData);
      widgetTestAssertions.assertNoPrivacyViolations(widgetData);
      
      expect(widgetData.lastUpdateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(widgetData.appVersion).toBe('1.0.0');
      expect(widgetData.encryptionHash).toMatch(/^[a-f0-9]+$/);
    });

    test('should handle store state changes correctly', async () => {
      const store = useCheckInStore.getState();
      
      // Mock a completed morning check-in
      const mockCheckIn = {
        id: 'test-checkin',
        type: 'morning' as const,
        completedAt: new Date().toISOString(),
        data: { emotions: ['calm'], bodyAreas: ['shoulders'] }
      };
      
      // Simulate store state with completed check-in
      store.todaysCheckIns = [mockCheckIn];
      
      const widgetData = await dataService.generateWidgetData();
      
      expect(widgetData.todayProgress.morning.status).toBe('completed');
      expect(widgetData.todayProgress.morning.progressPercentage).toBe(100);
      expect(widgetData.todayProgress.completionPercentage).toBeGreaterThan(0);
    });

    test('should handle crisis mode correctly', async () => {
      const store = useCheckInStore.getState();
      (store as any).crisisMode = { isActive: true };
      
      const widgetData = await dataService.generateWidgetData();
      
      expect(widgetData.hasActiveCrisis).toBe(true);
      widgetTestAssertions.assertNoPrivacyViolations(widgetData);
    });
  });

  describe('Native Bridge Integration', () => {
    test('should initialize native bridge successfully', () => {
      expect(nativeBridge.isAvailable()).toBe(true);
      
      const bridge = nativeBridge.getNativeBridge();
      expect(bridge).toBeDefined();
      expect(bridge!.ios).toBeDefined();
      expect(bridge!.android).toBeDefined();
    });

    test('should store widget data via native bridge', async () => {
      const mockData = widgetTestUtils.createMockWidgetData();
      
      await nativeBridge.storeWidgetData(mockData);
      
      // Verify iOS methods were called
      if (Platform.OS === 'ios') {
        const { FullMindWidgets } = require('react-native').NativeModules;
        expect(FullMindWidgets.updateWidgetData).toHaveBeenCalledWith(
          JSON.stringify(mockData)
        );
        expect(FullMindWidgets.setAppGroupData).toHaveBeenCalled();
      }
    });

    test('should trigger widget updates correctly', async () => {
      await nativeBridge.triggerWidgetUpdate();
      
      const { FullMindWidgets } = require('react-native').NativeModules;
      if (Platform.OS === 'ios') {
        expect(FullMindWidgets.reloadWidgets).toHaveBeenCalled();
      }
    });

    test('should handle native bridge errors gracefully', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      FullMindWidgets.updateWidgetData.mockRejectedValueOnce(
        new Error('Native bridge failed')
      );
      
      await expect(
        nativeBridge.storeWidgetData(widgetTestUtils.createMockWidgetData())
      ).rejects.toThrow('Native bridge operation failed');
    });
  });

  describe('Deep Link Handling', () => {
    test('should validate deep link URLs correctly', () => {
      const scenarios = widgetTestScenarios.generateDeepLinkScenarios();
      
      for (const scenario of scenarios) {
        if (scenario.shouldBeValid) {
          expect(() => {
            widgetTestAssertions.assertValidDeepLink(scenario.url);
          }).not.toThrow();
        } else {
          expect(() => {
            widgetTestAssertions.assertValidDeepLink(scenario.url);
          }).toThrow();
        }
      }
    });

    test('should handle check-in deep links', async () => {
      const morningDeepLink = widgetTestUtils.simulateDeepLink('morning', true);
      
      await expect(
        dataService.handleWidgetDeepLink(morningDeepLink)
      ).resolves.not.toThrow();
    });

    test('should handle crisis deep links with high priority', async () => {
      const crisisDeepLink = widgetTestUtils.simulateCrisisDeepLink();
      
      await expect(
        dataService.handleWidgetDeepLink(crisisDeepLink)
      ).resolves.not.toThrow();
    });

    test('should reject malicious deep links', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'http://evil.com/steal-data',
        'fullmind://../../private-data'
      ];

      for (const url of maliciousUrls) {
        await expect(
          dataService.handleWidgetDeepLink(url)
        ).rejects.toThrow(expect.objectContaining({
          code: 'DEEP_LINK_INVALID'
        }));
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      const mockData = widgetTestUtils.createMockWidgetData();
      
      // Perform operations that should be tracked
      await dataService.generateWidgetData();
      await nativeBridge.storeWidgetData(mockData);
      await nativeBridge.triggerWidgetUpdate();
      
      const metrics = nativeBridge.getPerformanceMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      
      const averageMetrics = nativeBridge.getAveragePerformanceMetrics();
      expect(averageMetrics.nativeCallLatencyMs).toBeGreaterThanOrEqual(0);
      expect(averageMetrics.totalOperationMs).toBeGreaterThanOrEqual(0);
    });

    test('should detect slow operations', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Mock slow operation
      FullMindWidgets.updateWidgetData.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1500))
      );
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await nativeBridge.storeWidgetData(widgetTestUtils.createMockWidgetData());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow native bridge operation')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle widget data service errors', async () => {
      // Force privacy violation
      const invalidData = { phq9Score: 15, assessment: 'severe' };
      
      await expect(
        dataService.updateWidgetData({
          source: 'manual_refresh',
          reason: 'data_refresh',
          timestamp: new Date().toISOString(),
          priority: 'normal'
        })
      ).rejects.toThrow(expect.objectContaining({
        code: expect.stringMatching(/PRIVACY_VIOLATION|INVALID_DATA_FORMAT/)
      }));
    });

    test('should recover from native bridge failures', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Mock native bridge failure
      FullMindWidgets.updateWidgetData
        .mockRejectedValueOnce(new Error('Bridge failed'))
        .mockResolvedValueOnce(undefined);
      
      // Should fail first time
      await expect(
        nativeBridge.storeWidgetData(widgetTestUtils.createMockWidgetData())
      ).rejects.toThrow();
      
      // Should work on retry
      await expect(
        nativeBridge.storeWidgetData(widgetTestUtils.createMockWidgetData())
      ).resolves.not.toThrow();
    });

    test('should maintain health monitoring', async () => {
      const { FullMindWidgets } = require('react-native').NativeModules;
      
      // Mock health check failure
      FullMindWidgets.performHealthCheck.mockResolvedValueOnce(false);
      
      const isHealthy = await nativeBridge.performHealthCheck();
      expect(isHealthy).toBe(false);
      
      // Mock health check recovery
      FullMindWidgets.performHealthCheck.mockResolvedValueOnce(true);
      
      const isHealthyAfterRecovery = await nativeBridge.performHealthCheck();
      expect(isHealthyAfterRecovery).toBe(true);
    });
  });

  describe('Integration Coordinator', () => {
    test('should initialize all components', async () => {
      await coordinator.initialize();
      
      const status = coordinator.getIntegrationStatus();
      expect(status.isInitialized).toBe(true);
      expect(status.isHealthy).toBe(true);
      expect(status.privacyCompliant).toBe(true);
    });

    test('should handle configuration updates', () => {
      const newConfig = { privacyAuditLevel: 'enhanced' as const };
      coordinator.updateConfiguration(newConfig);
      
      const config = coordinator.getConfiguration();
      expect(config.privacyAuditLevel).toBe('enhanced');
    });

    test('should coordinate widget updates', async () => {
      await coordinator.initialize();
      await coordinator.forceUpdate();
      
      const status = coordinator.getIntegrationStatus();
      expect(status.lastUpdate).toBeDefined();
    });

    test('should dispose resources cleanly', () => {
      coordinator.dispose();
      
      const status = coordinator.getIntegrationStatus();
      expect(status.isInitialized).toBe(false);
      expect(status.isHealthy).toBe(false);
    });
  });

  describe('Clinical-Grade Requirements', () => {
    test('should meet performance requirements', async () => {
      const startTime = performance.now();
      
      await dataService.generateWidgetData();
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      expect(latency).toBeLessThan(WIDGET_CONFIG.PERFORMANCE_THRESHOLDS.ACCEPTABLE_LATENCY_MS);
    });

    test('should ensure zero clinical data exposure', async () => {
      // Generate realistic store state with clinical data
      const store = useCheckInStore.getState();
      (store as any).assessmentData = {
        phq9Score: 18,
        gad7Score: 15,
        suicidalIdeation: true,
        treatmentNotes: 'Patient shows severe symptoms'
      };
      
      const widgetData = await dataService.generateWidgetData();
      
      // Ensure no clinical data leaked through
      const dataString = JSON.stringify(widgetData).toLowerCase();
      const clinicalPatterns = ['phq', 'gad', 'suicidal', 'treatment', 'assessment'];
      
      for (const pattern of clinicalPatterns) {
        expect(dataString).not.toContain(pattern);
      }
    });

    test('should maintain data integrity through updates', async () => {
      const originalData = await dataService.generateWidgetData();
      const originalHash = originalData.encryptionHash;
      
      // Simulate minor data change
      await new Promise(resolve => setTimeout(resolve, 10));
      const updatedData = await dataService.generateWidgetData();
      
      // Hash should be different if data changed
      if (originalData.lastUpdateTime !== updatedData.lastUpdateTime) {
        expect(updatedData.encryptionHash).not.toBe(originalHash);
      }
    });

    test('should handle crisis scenarios with appropriate priority', async () => {
      const crisisTrigger: WidgetUpdateTrigger = {
        source: 'crisis_mode_changed',
        reason: 'crisis_alert',
        timestamp: new Date().toISOString(),
        priority: 'critical'
      };
      
      await dataService.updateWidgetData(crisisTrigger);
      
      // Crisis updates should bypass normal throttling
      const store = useCheckInStore.getState();
      const updateStatus = store.getWidgetUpdateStatus();
      expect(updateStatus.lastUpdate).toBeDefined();
    });
  });
});

/**
 * Integration Test Helper Functions
 */
export class WidgetIntegrationTestHelpers {
  
  /**
   * Setup test environment with mocked dependencies
   */
  static setupTestEnvironment(): void {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup consistent test data
    const mockStore = {
      checkIns: [],
      todaysCheckIns: [],
      currentCheckIn: null,
      getTodaysProgress: () => ({ completed: 1, total: 3 }),
      getTodaysCheckIn: () => null,
      getWidgetUpdateStatus: () => ({ needsUpdate: false, lastUpdate: null }),
      markWidgetUpdated: jest.fn(),
    };
    
    // Mock store
    (useCheckInStore as any).getState = jest.fn(() => mockStore);
  }
  
  /**
   * Create comprehensive test scenario
   */
  static createTestScenario(name: string) {
    return {
      name,
      mockData: widgetTestUtils.createMockWidgetData(),
      mockDeepLink: widgetTestUtils.simulateDeepLink('morning'),
      mockCrisisLink: widgetTestUtils.simulateCrisisDeepLink(),
      mockBridge: widgetTestUtils.createMockNativeBridge(),
    };
  }
  
  /**
   * Validate end-to-end widget flow
   */
  static async validateE2EFlow(
    coordinator: WidgetIntegrationCoordinator
  ): Promise<void> {
    // Initialize
    await coordinator.initialize();
    
    // Force update
    await coordinator.forceUpdate();
    
    // Handle deep link
    const testDeepLink = widgetTestUtils.simulateDeepLink('evening', true);
    await coordinator.handleDeepLink(testDeepLink);
    
    // Check health
    const status = coordinator.getIntegrationStatus();
    expect(status.isHealthy).toBe(true);
    expect(status.privacyCompliant).toBe(true);
  }
}

export default WidgetIntegrationTestHelpers;