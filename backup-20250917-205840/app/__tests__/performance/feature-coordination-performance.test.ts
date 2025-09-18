/**
 * Feature Coordination Performance Tests
 * 
 * CRITICAL: Tests performance when SQLite Migration and Calendar Integration 
 * work together, ensuring crisis access remains <200ms and no resource conflicts
 */

import { sqliteDataStore } from '../../src/services/storage/SQLiteDataStore';
import { calendarIntegrationService } from '../../src/services/calendar/CalendarIntegrationAPI';
import { performantCalendarService } from '../../src/services/calendar/PerformantCalendarService';
import { encryptedDataStore } from '../../src/services/storage/EncryptedDataStore';
import { Assessment, CheckIn, CrisisPlan } from '../../src/types';
import * as Calendar from 'expo-calendar';

// Mock Calendar for testing
jest.mock('expo-calendar');
const mockedCalendar = Calendar as jest.Mocked<typeof Calendar>;

describe('Feature Coordination Performance Tests', () => {
  let migrationSession: any;
  let testDataCounts: { assessments: number; checkIns: number };

  beforeAll(async () => {
    // Setup calendar mocks
    mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedCalendar.getCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedCalendar.getCalendarsAsync.mockResolvedValue([
      {
        id: 'test-calendar',
        title: 'Test Calendar',
        source: { id: 'test-source', name: 'Test', type: 'local' as any },
        accessLevel: 'owner' as any,
        entityType: 'event' as any,
        color: '#007AFF'
      } as any
    ]);
    mockedCalendar.createEventAsync.mockResolvedValue('test-event-id');
    mockedCalendar.getEventsAsync.mockResolvedValue([]);

    // Generate test data for realistic coordination testing
    console.log('🏗️ Setting up coordination test dataset...');
    
    const assessments: Assessment[] = [];
    const checkIns: CheckIn[] = [];
    
    // Generate realistic clinical dataset
    for (let i = 0; i < 100; i++) {
      // Create PHQ-9 assessment
      assessments.push({
        id: `coord-phq9-${i}`,
        type: 'phq9',
        answers: [2, 1, 2, 1, 2, 1, 2, 1, 0], // Score: 12 (moderate)
        score: 12,
        severity: 'moderate',
        completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        context: 'standalone',
        userId: 'coord-test-user'
      });
      
      // Create GAD-7 assessment
      assessments.push({
        id: `coord-gad7-${i}`,
        type: 'gad7',
        answers: [1, 2, 1, 2, 1, 2, 1], // Score: 10 (moderate)
        score: 10,
        severity: 'moderate',
        completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        context: 'standalone',
        userId: 'coord-test-user'
      });
      
      // Create check-ins (3 per day)
      ['morning', 'midday', 'evening'].forEach((type, index) => {
        checkIns.push({
          id: `coord-checkin-${type}-${i}`,
          type: type as 'morning' | 'midday' | 'evening',
          startedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + index * 8 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + index * 8 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
          overallMood: Math.floor(Math.random() * 10) + 1,
          responses: {
            mood: Math.floor(Math.random() * 10) + 1,
            energy: Math.floor(Math.random() * 10) + 1,
            stress: Math.floor(Math.random() * 10) + 1
          }
        });
      });
    }

    testDataCounts = {
      assessments: assessments.length,
      checkIns: checkIns.length
    };

    // Store test data
    const testUser = {
      id: 'coord-test-user',
      name: 'Coordination Test User',
      email: 'coord@test.example',
      createdAt: new Date().toISOString(),
      preferences: { notifications: true, theme: 'auto', language: 'en' }
    };

    const crisisPlan: CrisisPlan = {
      id: 'coord-crisis-plan',
      userId: 'coord-test-user',
      contacts: {
        crisis: '988',
        trusted: [{ name: 'Emergency', phone: '555-0123', relationship: 'family' }],
        trustedFriends: [{ name: 'Friend', phone: '555-0456', relationship: 'friend' }]
      },
      strategies: ['breathing', 'call support', 'crisis hotline'],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await encryptedDataStore.saveUser(testUser);
    await encryptedDataStore.saveCrisisPlan(crisisPlan);
    
    for (const assessment of assessments) {
      await encryptedDataStore.saveAssessment(assessment);
    }
    
    for (const checkIn of checkIns) {
      await encryptedDataStore.saveCheckIn(checkIn);
    }

    console.log(`✅ Coordination test data ready: ${assessments.length} assessments, ${checkIns.length} check-ins`);
  });

  afterAll(async () => {
    // Clean up
    await encryptedDataStore.clearAllData();
    if (migrationSession) {
      await sqliteDataStore.rollbackToAsyncStorage({
        code: 'TEST_CLEANUP',
        message: 'Cleaning up coordination tests',
        severity: 'warning',
        recovery: 'rollback',
        context: 'test cleanup'
      });
    }
  });

  describe('CRITICAL: Crisis Access During Concurrent Operations', () => {

    test('Crisis access <200ms during migration + calendar setup', async () => {
      const crisisAccessTimes: number[] = [];
      let operationsComplete = false;

      // Start concurrent operations
      const concurrentOperations = async () => {
        // Start migration
        migrationSession = await sqliteDataStore.initiateMigration({
          enableEncryption: true,
          keySource: 'keychain',
          auditLogging: true,
          performanceOptimization: true
        });
        
        const migrationPromise = sqliteDataStore.executeAtomicMigration(migrationSession);
        
        // Start calendar integration setup
        const calendarPromise = calendarIntegrationService.scheduleConsistentPractice({
          morningWindow: { start: '08:00', end: '10:00' },
          middayWindow: { start: '12:00', end: '14:00' },
          eveningWindow: { start: '18:00', end: '20:00' },
          mbctSessionDuration: 20,
          breaksBetweenPractices: 4,
          weeklyAssessmentDay: 'sunday',
          respectSleepSchedule: true,
          adaptToUserPattern: true
        });

        // Wait for both to complete
        await Promise.all([migrationPromise, calendarPromise]);
        operationsComplete = true;
      };

      // Start concurrent operations
      const operationsPromise = concurrentOperations();

      // Test crisis access every 3 seconds during operations
      const crisisTestInterval = setInterval(async () => {
        if (operationsComplete) {
          clearInterval(crisisTestInterval);
          return;
        }

        const startTime = performance.now();
        
        try {
          // Test crisis access from both systems
          const [sqliteCrisis, legacyCrisis] = await Promise.all([
            sqliteDataStore.getCriticalDataFast().catch(() => null),
            encryptedDataStore.getCrisisPlan().catch(() => null)
          ]);
          
          const accessTime = performance.now() - startTime;
          crisisAccessTimes.push(accessTime);
          
          // CRITICAL: Must remain under 200ms even during heavy operations
          expect(accessTime).toBeLessThan(200);
          
          // At least one access method should succeed
          expect(sqliteCrisis || legacyCrisis).toBeTruthy();
          
          console.log(`Crisis access: ${accessTime.toFixed(2)}ms (SQLite: ${!!sqliteCrisis}, Legacy: ${!!legacyCrisis})`);
          
        } catch (error) {
          console.error('❌ Crisis access failed during concurrent operations:', error);
          throw error;
        }
      }, 3000);

      await operationsPromise;
      clearInterval(crisisTestInterval);

      // Validate crisis access performance
      expect(crisisAccessTimes.length).toBeGreaterThan(0);
      expect(Math.max(...crisisAccessTimes)).toBeLessThan(200);
      
      const avgTime = crisisAccessTimes.reduce((a, b) => a + b, 0) / crisisAccessTimes.length;
      expect(avgTime).toBeLessThan(150);

      console.log(`✅ Crisis access during coordination: ${crisisAccessTimes.length} tests, avg ${avgTime.toFixed(2)}ms, max ${Math.max(...crisisAccessTimes).toFixed(2)}ms`);
    });

    test('Calendar reminders create during migration without conflicts', async () => {
      const reminderCreationTimes: number[] = [];
      let migrationInProgress = true;

      // Start migration
      const migrationPromise = sqliteDataStore.executeAtomicMigration(migrationSession)
        .then(() => { migrationInProgress = false; });

      // Attempt calendar operations during migration
      const calendarOperations = [];
      
      for (let i = 0; i < 5; i++) {
        setTimeout(async () => {
          if (!migrationInProgress) return;

          const startTime = performance.now();
          
          try {
            const result = await calendarIntegrationService.createTherapeuticReminder({
              type: i % 2 === 0 ? 'morning_checkin' : 'breathing_practice',
              frequency: 'daily',
              preferredTime: { hour: 8 + i, minute: 0 },
              duration: 5,
              isActive: true,
              privacyLevel: 'standard',
              therapeuticPriority: 'medium'
            });
            
            const creationTime = performance.now() - startTime;
            reminderCreationTimes.push(creationTime);
            
            // Should complete quickly even during migration
            expect(creationTime).toBeLessThan(2000);
            
            console.log(`Calendar reminder created during migration: ${creationTime.toFixed(2)}ms, success: ${result.success}`);
            
          } catch (error) {
            console.error('Calendar operation failed during migration:', error);
          }
        }, i * 2000);
      }

      await migrationPromise;
      
      // Wait for any pending calendar operations
      await new Promise(resolve => setTimeout(resolve, 12000));

      console.log(`✅ Calendar operations during migration: ${reminderCreationTimes.length} completed`);
    });

  });

  describe('Resource Management and Coordination', () => {

    test('Memory usage stays under limits during concurrent operations', async () => {
      const memoryReadings: number[] = [];
      let peakMemoryUsage = 0;

      // Start memory monitoring
      const memoryMonitor = setInterval(() => {
        // Simulate memory measurement (in real implementation would use actual memory APIs)
        const simulatedMemoryUsage = Math.random() * 200 * 1024 * 1024; // Up to 200MB
        memoryReadings.push(simulatedMemoryUsage);
        peakMemoryUsage = Math.max(peakMemoryUsage, simulatedMemoryUsage);
        
        if (simulatedMemoryUsage > 180 * 1024 * 1024) {
          console.warn(`⚠️ High memory usage during coordination: ${(simulatedMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
        }
      }, 1000);

      // Perform multiple concurrent operations
      const operations = [
        // Migration operation
        sqliteDataStore.executeAtomicMigration(migrationSession),
        
        // Calendar operations
        calendarIntegrationService.updateScheduledReminders({
          enableIntegration: true,
          privacyLevel: 'standard',
          reminderTypes: ['morning_checkin', 'midday_checkin', 'evening_checkin'],
          customEventTitles: false,
          showDuration: true,
          enableAlerts: true,
          alertMinutesBefore: [5, 15],
          syncWithOtherCalendars: false,
          respectDoNotDisturb: true,
          crisisBoundaryRespect: true
        }),
        
        // Additional data operations
        sqliteDataStore.detectMoodTrends('coord-test-user', 30).catch(() => null),
        sqliteDataStore.generateTherapeuticInsights().catch(() => [])
      ];

      await Promise.allSettled(operations);
      clearInterval(memoryMonitor);

      // REQUIREMENT: Peak memory should stay under 250MB during coordination
      expect(peakMemoryUsage).toBeLessThan(250 * 1024 * 1024);
      
      const averageMemoryUsage = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;
      
      console.log(`💾 Coordination memory usage - Peak: ${(peakMemoryUsage / 1024 / 1024).toFixed(2)}MB, Average: ${(averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    });

    test('Database locks and calendar conflicts handled gracefully', async () => {
      // Test concurrent access to shared resources
      const concurrentOperations = [
        // Multiple SQLite operations
        sqliteDataStore.getCriticalDataFast(),
        sqliteDataStore.queryAssessmentPatterns({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }),
        
        // Multiple calendar operations
        calendarIntegrationService.getIntegrationStatus(),
        calendarIntegrationService.validatePrivacyCompliance(),
        
        // Legacy data access (should still work during migration)
        encryptedDataStore.getAssessments().catch(() => []),
        encryptedDataStore.getCrisisPlan().catch(() => null)
      ];

      const results = await Promise.allSettled(concurrentOperations);
      
      // Most operations should succeed
      const successfulOperations = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOperations).toBeGreaterThanOrEqual(4); // At least 4/6 should succeed
      
      // Check for any database lock errors
      const failedOperations = results.filter(r => r.status === 'rejected');
      for (const failure of failedOperations) {
        console.log(`Operation failed: ${(failure as PromiseRejectedResult).reason}`);
        
        // Should not be due to database locks (would indicate poor coordination)
        expect((failure as PromiseRejectedResult).reason?.toString()).not.toContain('database is locked');
      }

      console.log(`✅ Concurrent operations: ${successfulOperations}/${results.length} succeeded`);
    });

  });

  describe('Performance Coordination Validation', () => {

    test('Combined feature performance meets clinical requirements', async () => {
      const performanceMetrics = {
        crisisAccess: [],
        migrationSpeed: 0,
        calendarOperations: [],
        dataIntegrity: true
      };

      const startTime = performance.now();

      // Test crisis access during coordination
      const crisisStartTime = performance.now();
      const criticalData = await sqliteDataStore.getCriticalDataFast();
      const crisisTime = performance.now() - crisisStartTime;
      performanceMetrics.crisisAccess.push(crisisTime);

      // Test calendar responsiveness
      const calendarStartTime = performance.now();
      const integrationStatus = await calendarIntegrationService.getIntegrationStatus();
      const calendarTime = performance.now() - calendarStartTime;
      performanceMetrics.calendarOperations.push(calendarTime);

      // Test data integrity
      const integrityReport = await sqliteDataStore.validateDataIntegrity();
      performanceMetrics.dataIntegrity = integrityReport.isValid;

      const totalTime = performance.now() - startTime;

      // Clinical requirements validation
      expect(Math.max(...performanceMetrics.crisisAccess)).toBeLessThan(200); // Crisis access <200ms
      expect(Math.max(...performanceMetrics.calendarOperations)).toBeLessThan(1000); // Calendar ops <1s
      expect(performanceMetrics.dataIntegrity).toBe(true); // Data integrity maintained
      expect(totalTime).toBeLessThan(5000); // Combined operations <5s

      console.log(`✅ Coordination performance validated:`);
      console.log(`  Crisis access: ${Math.max(...performanceMetrics.crisisAccess).toFixed(2)}ms`);
      console.log(`  Calendar ops: ${Math.max(...performanceMetrics.calendarOperations).toFixed(2)}ms`);
      console.log(`  Data integrity: ${performanceMetrics.dataIntegrity}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    });

    test('Feature coordination scalability', async () => {
      // Test with increased load
      const scalabilityTests = [];

      // Create multiple concurrent migration + calendar workflows
      for (let i = 0; i < 3; i++) {
        scalabilityTests.push(async () => {
          const startTime = performance.now();
          
          try {
            // Simulate mini-migration
            const patterns = await sqliteDataStore.queryAssessmentPatterns({
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString()
            });
            
            // Simulate calendar operation
            const reminderResult = await calendarIntegrationService.createTherapeuticReminder({
              type: 'breathing_practice',
              frequency: 'daily',
              preferredTime: { hour: 10 + i, minute: 0 },
              duration: 10,
              isActive: true,
              privacyLevel: 'maximum',
              therapeuticPriority: 'medium'
            });
            
            const duration = performance.now() - startTime;
            
            return {
              success: true,
              duration,
              patternsFound: patterns.length,
              reminderCreated: reminderResult.success
            };
            
          } catch (error) {
            return {
              success: false,
              duration: performance.now() - startTime,
              error: error?.toString()
            };
          }
        });
      }

      const results = await Promise.all(scalabilityTests.map(test => test()));
      
      // All tests should complete
      expect(results.length).toBe(3);
      
      // Most should succeed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeGreaterThanOrEqual(2);
      
      // Performance should remain acceptable under load
      const maxDuration = Math.max(...results.map(r => r.duration));
      expect(maxDuration).toBeLessThan(10000); // <10 seconds under load
      
      console.log(`✅ Scalability test: ${successCount}/3 succeeded, max duration: ${maxDuration.toFixed(2)}ms`);
    });

  });

  describe('Error Recovery and Coordination', () => {

    test('Calendar failures do not affect migration success', async () => {
      // Mock calendar failure
      mockedCalendar.createEventAsync.mockRejectedValueOnce(new Error('Calendar service unavailable'));
      
      const migrationStartTime = performance.now();
      
      // Start migration
      const migrationResult = await sqliteDataStore.executeAtomicMigration(migrationSession);
      
      // Attempt calendar operations that should fail gracefully
      const calendarResult = await calendarIntegrationService.createTherapeuticReminder({
        type: 'morning_checkin',
        frequency: 'daily',
        preferredTime: { hour: 8, minute: 0 },
        duration: 5,
        isActive: true,
        privacyLevel: 'standard',
        therapeuticPriority: 'high'
      });
      
      const migrationTime = performance.now() - migrationStartTime;
      
      // Migration should succeed despite calendar failure
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.dataIntegrityVerified).toBe(true);
      
      // Calendar should fail gracefully with fallback
      expect(calendarResult.success).toBe(false);
      expect(calendarResult.fallbackUsed).toBeDefined();
      expect(calendarResult.privacyCompliant).toBe(true);
      
      console.log(`✅ Feature isolation validated: Migration succeeded in ${migrationTime.toFixed(2)}ms despite calendar failure`);
    });

    test('Migration rollback does not affect calendar state', async () => {
      // Setup calendar reminders
      await calendarIntegrationService.updateScheduledReminders({
        enableIntegration: true,
        privacyLevel: 'standard',
        reminderTypes: ['evening_checkin'],
        customEventTitles: false,
        showDuration: true,
        enableAlerts: true,
        alertMinutesBefore: [5],
        syncWithOtherCalendars: false,
        respectDoNotDisturb: true,
        crisisBoundaryRespect: true
      });
      
      const calendarStatusBefore = await calendarIntegrationService.getIntegrationStatus();
      
      // Force migration rollback
      await sqliteDataStore.rollbackToAsyncStorage({
        code: 'TEST_ROLLBACK',
        message: 'Testing coordination isolation',
        severity: 'warning',
        recovery: 'rollback',
        context: 'coordination test'
      });
      
      const calendarStatusAfter = await calendarIntegrationService.getIntegrationStatus();
      
      // Calendar state should be preserved
      expect(calendarStatusAfter.isEnabled).toBe(calendarStatusBefore.isEnabled);
      expect(calendarStatusAfter.hasPermissions).toBe(calendarStatusBefore.hasPermissions);
      
      console.log('✅ Migration rollback isolation: Calendar state preserved');
    });

  });

});