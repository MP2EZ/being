/**
 * Crisis Button Widget Integration Tests
 * Tests the React Native bridge integration for unconditional crisis button visibility
 */

import { WidgetDataService } from '../../src/services/WidgetDataService';
import { widgetTestUtils, WidgetTestAssertions } from '../../src/utils/widgetTestUtils';
import { WidgetData, WidgetCrisisButton } from '../../src/types/widget';

// Mock dependencies
jest.mock('../../src/store/checkInStore', () => ({
  useCheckInStore: {
    getState: jest.fn(() => ({
      getTodaysProgress: () => ({ completed: 1, total: 3 }),
      getTodaysCheckIn: () => null,
      checkForPartialSession: () => Promise.resolve(false),
      getSessionProgress: () => null,
      crisisMode: { isActive: false }
    })),
    subscribe: jest.fn()
  }
}));

jest.mock('../../src/services/WidgetNativeBridge', () => ({
  widgetNativeBridge: {
    storeWidgetData: jest.fn(),
    triggerWidgetUpdate: jest.fn(),
    getNativeBridge: jest.fn(() => null),
    performHealthCheck: jest.fn(() => Promise.resolve(true)),
    getAveragePerformanceMetrics: jest.fn(() => ({
      updateLatencyMs: 100,
      nativeCallLatencyMs: 50,
      dataSerializationMs: 25,
      privacyValidationMs: 25,
      totalOperationMs: 200
    }))
  }
}));

jest.mock('../../src/services/NavigationService', () => ({
  NavigationService: {
    navigateToHome: jest.fn(),
    navigateToCheckIn: jest.fn(),
    navigateToCrisis: jest.fn()
  }
}));

describe('Crisis Button Widget Integration', () => {
  let widgetDataService: WidgetDataService;

  beforeEach(() => {
    widgetDataService = new WidgetDataService();
    jest.clearAllMocks();
  });

  describe('Widget Data Generation', () => {
    it('should generate widget data with unconditional crisis button', async () => {
      const widgetData = await widgetDataService.generateWidgetData();
      
      expect(widgetData).toBeDefined();
      expect(widgetData.crisisButton).toBeDefined();
      
      // Verify crisis button is always visible
      expect(widgetData.crisisButton.alwaysVisible).toBe(true);
      expect(widgetData.crisisButton.text).toBeTruthy();
      expect(['standard', 'enhanced']).toContain(widgetData.crisisButton.prominence);
      expect(['standard', 'urgent']).toContain(widgetData.crisisButton.style);
    });

    it('should generate standard crisis button when no active crisis', async () => {
      const widgetData = await widgetDataService.generateWidgetData();
      
      expect(widgetData.crisisButton).toEqual({
        alwaysVisible: true,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'standard',
        responseTimeMs: expect.any(Number)
      });
      
      // Backward compatibility
      expect(widgetData.hasActiveCrisis).toBe(false);
    });

    it('should generate enhanced crisis button when crisis is active', async () => {
      // Mock active crisis
      const { useCheckInStore } = require('../../src/store/checkInStore');
      useCheckInStore.getState.mockReturnValue({
        getTodaysProgress: () => ({ completed: 1, total: 3 }),
        getTodaysCheckIn: () => null,
        checkForPartialSession: () => Promise.resolve(false),
        getSessionProgress: () => null,
        crisisMode: { isActive: true }
      });

      const widgetData = await widgetDataService.generateWidgetData();
      
      expect(widgetData.crisisButton).toEqual({
        alwaysVisible: true,
        prominence: 'enhanced',
        text: 'CRISIS SUPPORT NEEDED',
        style: 'urgent',
        responseTimeMs: expect.any(Number)
      });
      
      // Backward compatibility
      expect(widgetData.hasActiveCrisis).toBe(true);
    });

    it('should include response time tracking for performance monitoring', async () => {
      const widgetData = await widgetDataService.generateWidgetData();
      
      expect(widgetData.crisisButton.responseTimeMs).toBeDefined();
      expect(typeof widgetData.crisisButton.responseTimeMs).toBe('number');
      expect(widgetData.crisisButton.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(widgetData.crisisButton.responseTimeMs).toBeLessThan(200); // Should be fast
    });

    it('should fail-safe to standard crisis button on error', async () => {
      // Mock error in crisis mode check
      const { useCheckInStore } = require('../../src/store/checkInStore');
      useCheckInStore.getState.mockImplementation(() => {
        throw new Error('Store error');
      });

      const widgetData = await widgetDataService.generateWidgetData();
      
      // Should still include crisis button with safe defaults
      expect(widgetData.crisisButton.alwaysVisible).toBe(true);
      expect(widgetData.crisisButton.prominence).toBe('standard');
      expect(widgetData.crisisButton.text).toBe('Crisis Support');
      expect(widgetData.crisisButton.style).toBe('standard');
    });
  });

  describe('Crisis Button Validation', () => {
    it('should validate crisis button structure', () => {
      const validCrisisButton: WidgetCrisisButton = {
        alwaysVisible: true,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'standard'
      };

      expect(widgetDataService.isValidCrisisButton(validCrisisButton)).toBe(true);
    });

    it('should reject crisis button with alwaysVisible false', () => {
      const invalidCrisisButton = {
        alwaysVisible: false,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'standard'
      };

      expect(widgetDataService.isValidCrisisButton(invalidCrisisButton)).toBe(false);
    });

    it('should reject crisis button with invalid prominence', () => {
      const invalidCrisisButton = {
        alwaysVisible: true,
        prominence: 'invalid',
        text: 'Crisis Support',
        style: 'standard'
      };

      expect(widgetDataService.isValidCrisisButton(invalidCrisisButton)).toBe(false);
    });

    it('should reject crisis button with invalid style', () => {
      const invalidCrisisButton = {
        alwaysVisible: true,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'invalid'
      };

      expect(widgetDataService.isValidCrisisButton(invalidCrisisButton)).toBe(false);
    });

    it('should reject crisis button with empty text', () => {
      const invalidCrisisButton = {
        alwaysVisible: true,
        prominence: 'standard',
        text: '',
        style: 'standard'
      };

      expect(widgetDataService.isValidCrisisButton(invalidCrisisButton)).toBe(false);
    });

    it('should accept optional responseTimeMs', () => {
      const validCrisisButton = {
        alwaysVisible: true,
        prominence: 'enhanced' as const,
        text: 'CRISIS SUPPORT NEEDED',
        style: 'urgent' as const,
        responseTimeMs: 150
      };

      expect(widgetDataService.isValidCrisisButton(validCrisisButton)).toBe(true);
    });
  });

  describe('Widget Test Utils', () => {
    it('should create mock crisis button with defaults', () => {
      const mockCrisisButton = widgetTestUtils.createMockCrisisButton();
      
      expect(mockCrisisButton).toEqual({
        alwaysVisible: true,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'standard'
      });
    });

    it('should create mock crisis button for active crisis', () => {
      const mockCrisisButton = widgetTestUtils.createMockCrisisButton(true, 150);
      
      expect(mockCrisisButton).toEqual({
        alwaysVisible: true,
        prominence: 'enhanced',
        text: 'CRISIS SUPPORT NEEDED',
        style: 'urgent',
        responseTimeMs: 150
      });
    });

    it('should create mock widget data with crisis button', () => {
      const mockWidgetData = widgetTestUtils.createMockWidgetData();
      
      expect(mockWidgetData.crisisButton).toBeDefined();
      expect(mockWidgetData.crisisButton.alwaysVisible).toBe(true);
      WidgetTestAssertions.assertValidCrisisButton(mockWidgetData.crisisButton);
    });

    it('should merge crisis button overrides correctly', () => {
      const mockWidgetData = widgetTestUtils.createMockWidgetData({
        crisisButton: {
          alwaysVisible: true,
          prominence: 'enhanced',
          text: 'URGENT CRISIS',
          style: 'urgent',
          responseTimeMs: 100
        }
      });
      
      expect(mockWidgetData.crisisButton.prominence).toBe('enhanced');
      expect(mockWidgetData.crisisButton.text).toBe('URGENT CRISIS');
      expect(mockWidgetData.crisisButton.responseTimeMs).toBe(100);
    });
  });

  describe('Performance Requirements', () => {
    it('should generate crisis button data within 200ms performance threshold', async () => {
      const startTime = performance.now();
      await widgetDataService.generateWidgetData();
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(200); // Crisis button must be accessible within 200ms
    });

    it('should maintain performance even during crisis state changes', async () => {
      const { useCheckInStore } = require('../../src/store/checkInStore');
      
      // Test multiple rapid crisis state changes
      const times: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        useCheckInStore.getState.mockReturnValue({
          getTodaysProgress: () => ({ completed: 1, total: 3 }),
          getTodaysCheckIn: () => null,
          checkForPartialSession: () => Promise.resolve(false),
          getSessionProgress: () => null,
          crisisMode: { isActive: i % 2 === 0 } // Alternate crisis state
        });
        
        const startTime = performance.now();
        await widgetDataService.generateWidgetData();
        const endTime = performance.now();
        
        times.push(endTime - startTime);
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      expect(averageTime).toBeLessThan(200);
      expect(Math.max(...times)).toBeLessThan(300); // Even worst case should be reasonable
    });
  });

  describe('Error Handling & Fail-safes', () => {
    it('should handle crisis mode check failures gracefully', async () => {
      const { useCheckInStore } = require('../../src/store/checkInStore');
      useCheckInStore.getState.mockImplementation(() => {
        throw new Error('Crisis mode check failed');
      });

      // Should not throw, should provide safe defaults
      await expect(widgetDataService.generateWidgetData()).resolves.toBeDefined();
      
      const widgetData = await widgetDataService.generateWidgetData();
      expect(widgetData.crisisButton.alwaysVisible).toBe(true);
      expect(widgetData.crisisButton.text).toBeTruthy();
    });

    it('should survive widget data validation with crisis button', async () => {
      const widgetData = await widgetDataService.generateWidgetData();
      
      // Should pass all validation including crisis button
      expect(widgetDataService.isValidWidgetData(widgetData)).toBe(true);
      expect(widgetDataService.hasPrivacyViolations(widgetData)).toBe(false);
    });
  });
});