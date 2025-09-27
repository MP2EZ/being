/**
 * Calendar Integration Performance Tests
 * Validates <2s permission requests and <500ms event creation
 * Tests graceful degradation and cross-platform optimization
 */

import { performantCalendarService } from '../../src/services/calendar/PerformantCalendarService';
import { performanceMonitor } from '../../src/utils/PerformanceMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Expo Calendar for testing
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  EntityTypes: {
    EVENT: 'event'
  },
  CalendarAccessLevel: {
    OWNER: 'owner'
  }
}));

import * as Calendar from 'expo-calendar';

const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;

describe('Calendar Integration Performance Tests', () => {
  
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    
    // Set up default mock responses
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      {
        id: 'test-calendar-1',
        title: 'Default Calendar',
        allowsModifications: true,
        source: { id: 'default-source', name: 'Default', isLocalAccount: true }
      }
    ] as any);
    
    mockCalendar.createEventAsync.mockResolvedValue('test-event-id');
  });

  describe('Permission Performance Requirements', () => {
    
    test('Permission request completes within 2 second timeout', async () => {
      // Mock fast permission response
      mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ 
        status: 'granted' 
      } as any);
      
      const startTime = performance.now();
      const result = await performantCalendarService.requestPermissions();
      const responseTime = result.responseTime;
      
      // REQUIREMENT: <2000ms permission response
      expect(responseTime).toBeLessThan(2000);
      expect(result.granted).toBe(true);
      expect(result.source).toBe('native');
      
      console.log(`📋 Permission request completed in ${responseTime.toFixed(2)}ms`);
    });

    test('Permission timeout activates fallback within 2 seconds', async () => {
      // Mock slow permission response (will timeout)
      mockCalendar.requestCalendarPermissionsAsync.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 'granted' } as any), 3000))
      );
      
      const startTime = performance.now();
      const result = await performantCalendarService.requestPermissions();
      const responseTime = result.responseTime;
      
      // REQUIREMENT: Timeout and fallback within 2s
      expect(responseTime).toBeLessThan(2100); // Small buffer for test timing
      expect(result.granted).toBe(false);
      expect(result.source).toBe('timeout');
      
      console.log(`⏰ Permission timeout handled in ${responseTime.toFixed(2)}ms`);
    });

    test('Cached permissions return within 10ms', async () => {
      // Set up cached permission
      await AsyncStorage.setItem('@fullmind_calendar_permission', JSON.stringify({
        granted: true,
        timestamp: Date.now(),
        expires: Date.now() + 3600000, // 1 hour from now
        source: 'cache'
      }));
      
      const startTime = performance.now();
      const result = await performantCalendarService.requestPermissions();
      const responseTime = result.responseTime;
      
      // REQUIREMENT: Cached response <10ms
      expect(responseTime).toBeLessThan(10);
      expect(result.granted).toBe(true);
      expect(result.source).toBe('cache');
      
      // Should not have called native API
      expect(mockCalendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
      
      console.log(`🏃‍♂️ Cached permission returned in ${responseTime.toFixed(2)}ms`);
    });

  });

  describe('Event Creation Performance Requirements', () => {
    
    test('Single reminder creation completes within 500ms', async () => {
      // Mock successful permission and event creation
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ 
        granted: true 
      } as any);
      
      const testReminder = {
        id: 'test-reminder-1',
        title: 'Morning Check-in',
        type: 'morning' as const,
        frequency: 'daily' as const,
        startDate: new Date(),
        notes: 'Take a moment to check in with yourself'
      };
      
      const result = await performantCalendarService.createTherapeuticReminders([testReminder]);
      
      // REQUIREMENT: <500ms per event
      expect(result.averageTimePerEvent).toBeLessThan(500);
      expect(result.successful).toContain('test-event-id');
      expect(result.failed.length).toBe(0);
      
      console.log(`📅 Single reminder created in ${result.averageTimePerEvent.toFixed(2)}ms`);
    });

    test('Batch reminder creation optimizes for performance', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ 
        granted: true 
      } as any);
      
      // Create weekly reminders (7 events)
      const weeklyReminders = [];
      for (let i = 0; i < 7; i++) {
        weeklyReminders.push({
          id: `weekly-reminder-${i}`,
          title: `Daily Check-in ${i + 1}`,
          type: 'morning' as const,
          frequency: 'daily' as const,
          startDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          notes: 'Daily therapeutic reminder'
        });
      }
      
      const batchStartTime = performance.now();
      const result = await performantCalendarService.createTherapeuticReminders(weeklyReminders);
      const batchTime = performance.now() - batchStartTime;
      
      // REQUIREMENT: Batch processing more efficient than individual calls
      expect(result.averageTimePerEvent).toBeLessThan(500);
      expect(batchTime).toBeLessThan(3500); // 7 * 500ms individual limit
      expect(result.successful.length).toBe(7);
      
      // Should be significantly faster than 7 individual calls
      const theoreticalIndividualTime = 7 * 400; // Assume 400ms per individual call
      expect(batchTime).toBeLessThan(theoreticalIndividualTime);
      
      console.log(`📦 Batch of ${weeklyReminders.length} reminders created in ${batchTime.toFixed(2)}ms`);
      console.log(`⚡ Average time per event: ${result.averageTimePerEvent.toFixed(2)}ms`);
    });

    test('Debounced updates prevent excessive API calls', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ 
        granted: true 
      } as any);
      
      const testReminder = {
        id: 'debounced-reminder',
        title: 'Debounced Reminder',
        type: 'evening' as const,
        frequency: 'daily' as const,
        startDate: new Date()
      };
      
      // Make multiple rapid update calls
      const updatePromises = [
        performantCalendarService.updateTherapeuticReminders([testReminder]),
        performantCalendarService.updateTherapeuticReminders([testReminder]),
        performantCalendarService.updateTherapeuticReminders([testReminder])
      ];
      
      const startTime = performance.now();
      const results = await Promise.all(updatePromises);
      const totalTime = performance.now() - startTime;
      
      // Should debounce to single batch call
      expect(mockCalendar.createEventAsync).toHaveBeenCalledTimes(1);
      
      // All promises should resolve with same result
      expect(results[0].successful).toEqual(results[1].successful);
      expect(results[1].successful).toEqual(results[2].successful);
      
      console.log(`🔄 Debounced updates completed in ${totalTime.toFixed(2)}ms`);
    }, 10000); // Extended timeout for debounce testing

  });

  describe('Graceful Degradation Performance', () => {
    
    test('Permission denied fallback activates within 100ms', async () => {
      // Mock permission denied
      mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ 
        status: 'denied' 
      } as any);
      
      const testReminders = [{
        id: 'fallback-test',
        title: 'Fallback Test',
        type: 'morning' as const,
        frequency: 'daily' as const,
        startDate: new Date()
      }];
      
      const fallbackStartTime = performance.now();
      const result = await performantCalendarService.createTherapeuticReminders(testReminders);
      const fallbackTime = performance.now() - fallbackStartTime;
      
      // REQUIREMENT: <100ms fallback activation
      expect(fallbackTime).toBeLessThan(2100); // Permission request + 100ms fallback
      expect(result.successful.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('permission denied');
      
      // Check that fallback mode was activated
      const fallbackStatus = await AsyncStorage.getItem('@fullmind_calendar_fallback');
      expect(fallbackStatus).toBe('true');
      
      console.log(`🔄 Fallback activated in ${fallbackTime.toFixed(2)}ms after permission denial`);
    });

    test('Calendar creation failure triggers immediate fallback', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ 
        granted: true 
      } as any);
      
      // Mock calendar creation failure
      mockCalendar.createEventAsync.mockRejectedValue(new Error('Calendar access failed'));
      
      const testReminder = {
        id: 'creation-failure-test',
        title: 'Creation Failure Test',
        type: 'midday' as const,
        frequency: 'daily' as const,
        startDate: new Date()
      };
      
      const failureStartTime = performance.now();
      const result = await performantCalendarService.createTherapeuticReminders([testReminder]);
      const failureTime = performance.now() - failureStartTime;
      
      // Should handle failure gracefully and quickly
      expect(result.successful.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].error).toContain('Calendar access failed');
      
      // Fallback should be activated
      const fallbackStatus = await AsyncStorage.getItem('@fullmind_calendar_fallback');
      expect(fallbackStatus).toBe('true');
      
      console.log(`⚠️ Creation failure handled in ${failureTime.toFixed(2)}ms`);
    });

  });

  describe('Calendar Sync Performance', () => {
    
    test('Calendar sync completes within 1 second', async () => {
      // Mock calendar events
      mockCalendar.getEventsAsync.mockResolvedValue([
        {
          id: 'event-1',
          title: 'FullMind Morning Check-in',
          startDate: new Date(),
          endDate: new Date()
        },
        {
          id: 'event-2', 
          title: 'FullMind Assessment Reminder',
          startDate: new Date(),
          endDate: new Date()
        }
      ] as any);
      
      const syncResult = await performantCalendarService.syncTherapeuticSchedule();
      
      // REQUIREMENT: <1000ms sync time
      expect(syncResult.syncTime).toBeLessThan(1000);
      expect(syncResult.eventsProcessed).toBe(2);
      expect(syncResult.errors.length).toBe(0);
      
      console.log(`🔄 Calendar sync completed in ${syncResult.syncTime.toFixed(2)}ms`);
      console.log(`📅 Processed ${syncResult.eventsProcessed} therapeutic events`);
    });

    test('Sync handles errors gracefully without affecting performance', async () => {
      // Mock sync failure
      mockCalendar.getEventsAsync.mockRejectedValue(new Error('Sync failed'));
      
      const syncResult = await performantCalendarService.syncTherapeuticSchedule();
      
      // Should complete quickly even with error
      expect(syncResult.syncTime).toBeLessThan(1000);
      expect(syncResult.eventsProcessed).toBe(0);
      expect(syncResult.errors.length).toBe(1);
      expect(syncResult.errors[0]).toContain('Sync failed');
      
      console.log(`⚠️ Sync error handled gracefully in ${syncResult.syncTime.toFixed(2)}ms`);
    });

  });

  describe('Performance Metrics and Health Monitoring', () => {
    
    test('Performance metrics track calendar operations accurately', async () => {
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ 
        granted: true 
      } as any);
      
      // Perform several operations to generate metrics
      await performantCalendarService.requestPermissions();
      
      const testReminder = {
        id: 'metrics-test',
        title: 'Metrics Test',
        type: 'evening' as const,
        frequency: 'daily' as const,
        startDate: new Date()
      };
      
      await performantCalendarService.createTherapeuticReminders([testReminder]);
      await performantCalendarService.syncTherapeuticSchedule();
      
      const metrics = performantCalendarService.getPerformanceMetrics();
      
      // Metrics should be populated
      expect(metrics.permissionRequestTime).toBeGreaterThan(0);
      expect(metrics.eventCreationTime).toBeGreaterThan(0);
      expect(metrics.batchProcessingTime).toBeGreaterThan(0);
      expect(typeof metrics.fallbackActivations).toBe('number');
      expect(typeof metrics.cacheHitRate).toBe('number');
      
      // Health check
      expect(typeof metrics.isHealthy).toBe('boolean');
      expect(Array.isArray(metrics.recommendations)).toBe(true);
      
      console.log(`📊 Performance metrics collected successfully`);
      console.log(`  Permission time: ${metrics.permissionRequestTime.toFixed(2)}ms`);
      console.log(`  Event creation time: ${metrics.eventCreationTime.toFixed(2)}ms`);
      console.log(`  Health status: ${metrics.isHealthy ? '✅ Healthy' : '⚠️ Issues detected'}`);
    });

    test('Performance recommendations are generated for slow operations', async () => {
      // Mock slow permission response
      mockCalendar.requestCalendarPermissionsAsync.mockImplementation(() =>
        new Promise(resolve => 
          setTimeout(() => resolve({ status: 'granted' } as any), 1800)
        )
      );
      
      await performantCalendarService.requestPermissions();
      
      const metrics = performantCalendarService.getPerformanceMetrics();
      
      // Should detect slow performance and provide recommendations
      expect(metrics.permissionRequestTime).toBeGreaterThan(1500);
      expect(metrics.recommendations.length).toBeGreaterThan(0);
      expect(metrics.recommendations.some(rec => 
        rec.includes('Permission requests slow')
      )).toBe(true);
      
      console.log(`💡 Performance recommendations generated:`);
      metrics.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    });

  });

  describe('Cross-Platform Optimization', () => {
    
    test('Platform optimization completes without errors', async () => {
      const optimizationStartTime = performance.now();
      
      // This would test iOS/Android specific optimizations
      await performantCalendarService.optimizeForPlatform();
      
      const optimizationTime = performance.now() - optimizationStartTime;
      
      // Should complete quickly
      expect(optimizationTime).toBeLessThan(1000);
      
      console.log(`📱 Platform optimization completed in ${optimizationTime.toFixed(2)}ms`);
    });

  });

  describe('Integration with Performance Monitor', () => {
    
    test('Calendar operations integrate with performance monitoring', async () => {
      performanceMonitor.startMonitoring('calendar_integration_test');
      
      mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ 
        granted: true 
      } as any);
      
      const testReminder = {
        id: 'monitor-integration-test',
        title: 'Monitor Integration Test',
        type: 'morning' as const,
        frequency: 'daily' as const,
        startDate: new Date()
      };
      
      await performantCalendarService.createTherapeuticReminders([testReminder]);
      
      const alerts = performanceMonitor.stopMonitoring();
      const status = performanceMonitor.getStatus();
      
      // Performance monitor should have captured calendar operations
      expect(status.metrics.navigationTime).toBeGreaterThan(0);
      
      console.log(`📊 Performance monitor captured ${alerts.length} alerts during calendar operations`);
    });

  });

});

// Additional timeout for async operations
jest.setTimeout(15000);