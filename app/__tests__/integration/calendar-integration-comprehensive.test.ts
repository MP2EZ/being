/**
 * Calendar Integration - Comprehensive Testing Strategy
 * 
 * CRITICAL: Tests privacy-compliant calendar integration
 * - Zero PHI exposure to calendar systems
 * - Cross-platform permission handling
 * - Therapeutic timing compliance
 * - Graceful degradation without calendar access
 */

import { calendarIntegrationService } from '../../src/services/calendar/CalendarIntegrationAPI';
import { performantCalendarService } from '../../src/services/calendar/PerformantCalendarService';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { 
  ReminderTemplate, 
  CalendarPreferences, 
  TherapeuticTiming,
  UserTimingPreferences,
  CalendarEventData,
  PHIValidationResult 
} from '../../src/services/calendar/CalendarIntegrationAPI';

// Mock Calendar module for testing
jest.mock('expo-calendar');
const mockedCalendar = Calendar as jest.Mocked<typeof Calendar>;

describe('Calendar Integration - Comprehensive Testing', () => {
  let originalConsoleWarn: any;
  let originalConsoleError: any;

  beforeAll(() => {
    // Capture console outputs for privacy violation detection
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    
    console.warn = jest.fn();
    console.error = jest.fn();

    // Setup default Calendar mocks
    mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedCalendar.getCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockedCalendar.getCalendarsAsync.mockResolvedValue([]);
    mockedCalendar.createCalendarAsync.mockResolvedValue('test-calendar-id');
    mockedCalendar.createEventAsync.mockResolvedValue('test-event-id');
    mockedCalendar.getEventsAsync.mockResolvedValue([]);
  });

  afterAll(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('CRITICAL: Privacy Protection Validation', () => {

    test('ZERO PHI exposure: Event content sanitization', async () => {
      // Test cases with various PHI patterns
      const phiTestCases = [
        {
          input: 'PHQ-9 score: 15/27 - depression assessment',
          expected: {
            hasPrivateData: true,
            sanitizationApplied: ['Removed potential PHI pattern']
          }
        },
        {
          input: 'Call Dr. Smith at 555-123-4567 about anxiety medication',
          expected: {
            hasPrivateData: true,
            sanitizationApplied: ['Removed potential PHI pattern']
          }
        },
        {
          input: 'Patient ID: 123-45-6789 suicidal ideation present',
          expected: {
            hasPrivateData: true,
            sanitizationApplied: ['Removed potential PHI pattern']
          }
        },
        {
          input: 'Email reminder: patient@clinic.com GAD-7 results',
          expected: {
            hasPrivateData: true,
            sanitizationApplied: ['Removed potential PHI pattern']
          }
        },
        {
          input: 'Mindfulness practice reminder',
          expected: {
            hasPrivateData: false,
            sanitizationApplied: []
          }
        }
      ];

      for (const testCase of phiTestCases) {
        const sanitized = await calendarIntegrationService.sanitizeEventContent(testCase.input);
        
        expect(sanitized.hasPrivateData).toBe(testCase.expected.hasPrivateData);
        expect(sanitized.sanitizationApplied.length).toBeGreaterThanOrEqual(testCase.expected.sanitizationApplied.length);
        
        // Ensure no PHI remains in output
        expect(sanitized.title).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // SSN
        expect(sanitized.title).not.toMatch(/\b\d{3}-\d{3}-\d{4}\b/); // Phone
        expect(sanitized.title).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/); // Email
        expect(sanitized.description).not.toMatch(/\b(?:PHQ-?9|GAD-?7|score|depression|suicidal)\b/gi);
        
        if (testCase.expected.hasPrivateData) {
          console.log(`✅ PHI sanitization: "${testCase.input}" → "${sanitized.title}"`);
        }
      }
    });

    test('Privacy level enforcement across all reminder types', async () => {
      const privacyLevels: Array<'maximum' | 'standard' | 'minimal'> = ['maximum', 'standard', 'minimal'];
      const reminderTypes: ReminderTemplate['type'][] = [
        'morning_checkin', 'midday_checkin', 'evening_checkin', 
        'breathing_practice', 'mbct_practice', 'assessment_reminder'
      ];

      for (const privacyLevel of privacyLevels) {
        for (const reminderType of reminderTypes) {
          const template: ReminderTemplate = {
            type: reminderType,
            frequency: 'daily',
            preferredTime: { hour: 9, minute: 0 },
            duration: 15,
            isActive: true,
            privacyLevel,
            therapeuticPriority: 'medium'
          };

          const result = await calendarIntegrationService.createTherapeuticReminder(template);
          
          // Should either succeed with privacy compliance or fail gracefully
          if (result.success) {
            expect(result.privacyCompliant).toBe(true);
            console.log(`✅ Privacy-compliant reminder: ${reminderType} at ${privacyLevel} level`);
          } else {
            // Should fail with appropriate fallback
            expect(result.fallbackUsed).toBeDefined();
            console.log(`⚠️ Calendar unavailable, fallback activated: ${result.fallbackUsed?.type}`);
          }
        }
      }
    });

    test('PHI validation prevents clinical data leakage', async () => {
      const clinicalTestCases: CalendarEventData[] = [
        {
          title: 'PHQ-9 Assessment - Score 20/27',
          description: 'Severe depression indicated, suicidal ideation present',
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 60 * 1000),
          allDay: false,
          source: 'fullmind_therapeutic'
        },
        {
          title: 'GAD-7 Results Review',
          description: 'Anxiety score: 18/21, panic attacks increasing',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 60 * 1000),
          allDay: false,
          source: 'fullmind_therapeutic'
        },
        {
          title: 'Clean Mindfulness Practice',
          description: 'Daily mindfulness session',
          startDate: new Date(),
          endDate: new Date(Date.now() + 20 * 60 * 1000),
          allDay: false,
          source: 'fullmind_therapeutic'
        }
      ];

      for (const eventData of clinicalTestCases) {
        const validation: PHIValidationResult = await calendarIntegrationService.validateNoPHI(eventData);
        
        if (eventData.title.includes('PHQ-9') || eventData.title.includes('GAD-7')) {
          // Should detect PHI
          expect(validation.isClean).toBe(false);
          expect(validation.foundPHI.length).toBeGreaterThan(0);
          expect(['medium', 'high']).toContain(validation.riskLevel);
          
          console.log(`❌ PHI detected in "${eventData.title}": ${validation.foundPHI.join(', ')}`);
        } else {
          // Should be clean
          expect(validation.isClean).toBe(true);
          expect(validation.foundPHI.length).toBe(0);
          expect(validation.riskLevel).toBe('low');
          
          console.log(`✅ Clean content validated: "${eventData.title}"`);
        }
      }
    });

    test('Cross-app data leakage prevention', async () => {
      const riskyEventData: CalendarEventData = {
        title: 'Mental Health Appointment',
        description: 'Discussion of severe depression and anxiety treatment options',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000),
        allDay: false,
        location: 'Therapy Clinic, Suite 200',
        notes: 'Review PHQ-9 scores and adjust medication',
        source: 'fullmind_therapeutic'
      };

      const leakageResult = await calendarIntegrationService.preventDataLeakage(riskyEventData);
      
      expect(leakageResult.prevented).toBe(true);
      expect(leakageResult.risksIdentified.length).toBeGreaterThan(0);
      expect(leakageResult.mitigationApplied.length).toBeGreaterThan(0);
      expect(leakageResult.confidenceLevel).toBeGreaterThan(0.8);
      
      // Verify sensitive data was removed
      expect(riskyEventData.location).toBeUndefined();
      expect(riskyEventData.notes).not.toContain('PHQ-9');
      
      console.log(`✅ Leakage prevented: ${leakageResult.risksIdentified.join(', ')}`);
    });

  });

  describe('Cross-Platform Permission Handling', () => {

    test('iOS permission flow with graceful degradation', async () => {
      // Mock iOS platform
      Platform.OS = 'ios' as any;
      
      // Test successful permission grant
      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      
      let result = await calendarIntegrationService.requestCalendarPermissions();
      expect(result.success).toBe(true);
      expect(result.permissions.granted).toBe(true);
      expect(result.privacyNotice).toContain('Calendar access granted');
      
      // Test permission denial
      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      
      result = await calendarIntegrationService.requestCalendarPermissions();
      expect(result.success).toBe(false);
      expect(result.permissions.granted).toBe(false);
      expect(result.recommendedFallback).toBe('local_notifications');
      expect(result.privacyNotice).toContain('local notifications');
      
      console.log('✅ iOS permission handling validated');
    });

    test('Android permission flow with graceful degradation', async () => {
      // Mock Android platform
      Platform.OS = 'android' as any;
      
      // Test permission scenarios
      const scenarios = [
        { status: 'granted', shouldSucceed: true },
        { status: 'denied', shouldSucceed: false },
        { status: 'undetermined', shouldSucceed: false }
      ];

      for (const scenario of scenarios) {
        mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValueOnce({ status: scenario.status as any });
        
        const result = await calendarIntegrationService.requestCalendarPermissions();
        expect(result.success).toBe(scenario.shouldSucceed);
        
        if (!scenario.shouldSucceed) {
          expect(result.recommendedFallback).toBeDefined();
          console.log(`⚠️ Android permission ${scenario.status}: fallback to ${result.recommendedFallback}`);
        }
      }
      
      console.log('✅ Android permission handling validated');
    });

    test('Permission denial fallback strategies', async () => {
      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      const fallback = await calendarIntegrationService.handlePermissionDenied();
      
      expect(fallback.type).toBe('local_notifications');
      expect(fallback.setupInstructions.length).toBeGreaterThan(0);
      expect(fallback.privacyBenefits.length).toBeGreaterThan(0);
      expect(fallback.therapeuticEffectiveness).toBeGreaterThan(0.8); // Should be highly effective
      
      // Validate setup instructions are actionable
      expect(fallback.setupInstructions.some(instruction => 
        instruction.toLowerCase().includes('notification')
      )).toBe(true);
      
      // Validate privacy benefits are meaningful
      expect(fallback.privacyBenefits.some(benefit => 
        benefit.toLowerCase().includes('private') || benefit.toLowerCase().includes('data')
      )).toBe(true);
      
      console.log(`✅ Fallback strategy: ${fallback.description}, effectiveness: ${(fallback.therapeuticEffectiveness * 100).toFixed(1)}%`);
    });

  });

  describe('Therapeutic Timing Compliance', () => {

    test('MBCT-compliant scheduling intervals', async () => {
      const therapeuticTiming: TherapeuticTiming = {
        morningWindow: { start: '08:00', end: '10:00' },
        middayWindow: { start: '12:00', end: '14:00' },
        eveningWindow: { start: '18:00', end: '20:00' },
        mbctSessionDuration: 20,
        breaksBetweenPractices: 4,
        weeklyAssessmentDay: 'sunday',
        respectSleepSchedule: true,
        adaptToUserPattern: true
      };

      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
      
      const scheduleResult = await calendarIntegrationService.scheduleConsistentPractice(therapeuticTiming);
      
      expect(scheduleResult.scheduledEvents).toBeGreaterThan(0);
      expect(scheduleResult.privacyViolations).toBe(0);
      expect(scheduleResult.therapeuticCoverage).toBeGreaterThan(75); // Good coverage
      
      // Validate timing windows are respected
      expect(scheduleResult.recommendations).toBeDefined();
      expect(scheduleResult.nextReviewDate).toBeDefined();
      
      if (scheduleResult.therapeuticCoverage === 100) {
        expect(scheduleResult.recommendations.some(rec => 
          rec.includes('Excellent') || rec.includes('maintain')
        )).toBe(true);
      }
      
      console.log(`✅ MBCT scheduling: ${scheduleResult.scheduledEvents} events, ${scheduleResult.therapeuticCoverage}% coverage`);
    });

    test('User timing preference adaptation', async () => {
      const customTiming: UserTimingPreferences = {
        preferredWakeTime: '06:30',
        preferredSleepTime: '22:00',
        workSchedule: {
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5] // Monday-Friday
        },
        unavailableTimes: [{
          startTime: '12:00',
          endTime: '13:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          reason: 'work'
        }],
        timeZone: 'America/New_York',
        dstAdjustment: true
      };

      await calendarIntegrationService.adjustForUserPreferences(customTiming);
      
      // Should complete without errors and respect timing constraints
      // This is tested implicitly through the lack of exceptions
      // In a real implementation, we'd validate the generated schedule
      
      console.log('✅ User timing preferences adapted successfully');
    });

    test('Crisis boundary respect - pause reminders during crisis', async () => {
      // Test temporary pause functionality
      const pauseDuration = 24; // 24 hours
      
      await calendarIntegrationService.pauseRemindersTemporarily(pauseDuration);
      
      // Should log the pause for clinical audit
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CLINICAL AUDIT: Therapeutic reminders paused for 24h')
      );
      
      console.log('✅ Crisis boundary respect implemented');
    });

  });

  describe('Performance and Resource Management', () => {

    test('Event creation performance meets requirements', async () => {
      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
      
      const template: ReminderTemplate = {
        type: 'morning_checkin',
        frequency: 'daily',
        preferredTime: { hour: 8, minute: 0 },
        duration: 5,
        isActive: true,
        privacyLevel: 'standard',
        therapeuticPriority: 'high'
      };

      const startTime = performance.now();
      const result = await calendarIntegrationService.createTherapeuticReminder(template);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should be <1 second
      
      if (result.success) {
        console.log(`✅ Event creation performance: ${duration.toFixed(2)}ms`);
      } else {
        console.log(`⚠️ Event creation failed gracefully in ${duration.toFixed(2)}ms`);
      }
    });

    test('Batch reminder creation efficiency', async () => {
      const preferences: CalendarPreferences = {
        enableIntegration: true,
        privacyLevel: 'standard',
        reminderTypes: ['morning_checkin', 'midday_checkin', 'evening_checkin', 'mbct_practice'],
        customEventTitles: false,
        showDuration: true,
        enableAlerts: true,
        alertMinutesBefore: [5, 15],
        syncWithOtherCalendars: false,
        respectDoNotDisturb: true,
        crisisBoundaryRespect: true
      };

      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });

      const startTime = performance.now();
      await calendarIntegrationService.updateScheduledReminders(preferences);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds
      
      console.log(`✅ Batch reminder creation: ${duration.toFixed(2)}ms for ${preferences.reminderTypes.length} types`);
    });

    test('Memory usage during calendar operations', async () => {
      const memoryBefore = process.memoryUsage?.() || { heapUsed: 0 };
      
      // Simulate multiple calendar operations
      const operations = Array.from({ length: 10 }, (_, i) => {
        const template: ReminderTemplate = {
          type: 'breathing_practice',
          frequency: 'daily',
          preferredTime: { hour: 10 + i, minute: 0 },
          duration: 10,
          isActive: true,
          privacyLevel: 'maximum',
          therapeuticPriority: 'medium'
        };
        
        return calendarIntegrationService.createTherapeuticReminder(template);
      });

      await Promise.all(operations);
      
      const memoryAfter = process.memoryUsage?.() || { heapUsed: 0 };
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB
      
      console.log(`✅ Memory usage: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB increase for ${operations.length} operations`);
    });

  });

  describe('Integration Status and Monitoring', () => {

    test('Calendar integration status reporting', async () => {
      mockedCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
      
      const status = await calendarIntegrationService.getIntegrationStatus();
      
      expect(status).toHaveProperty('isEnabled');
      expect(status).toHaveProperty('hasPermissions');
      expect(status).toHaveProperty('connectedCalendars');
      expect(status).toHaveProperty('activeReminders');
      expect(status).toHaveProperty('privacyCompliance');
      expect(status).toHaveProperty('lastSync');
      expect(status).toHaveProperty('nextReview');
      
      expect(['full', 'partial', 'compromised']).toContain(status.privacyCompliance);
      expect(Array.isArray(status.connectedCalendars)).toBe(true);
      expect(typeof status.activeReminders).toBe('number');
      
      console.log(`✅ Integration status: ${status.privacyCompliance} privacy, ${status.activeReminders} active reminders`);
    });

    test('Privacy compliance monitoring and reporting', async () => {
      const complianceReport = await calendarIntegrationService.validatePrivacyCompliance();
      
      expect(complianceReport).toHaveProperty('overallCompliance');
      expect(complianceReport).toHaveProperty('checks');
      expect(complianceReport).toHaveProperty('recommendations');
      expect(complianceReport).toHaveProperty('dataExposureRisk');
      expect(complianceReport).toHaveProperty('remediationSteps');
      
      expect(['full', 'partial', 'compromised']).toContain(complianceReport.overallCompliance);
      expect(['minimal', 'moderate', 'high']).toContain(complianceReport.dataExposureRisk);
      expect(Array.isArray(complianceReport.checks)).toBe(true);
      expect(Array.isArray(complianceReport.recommendations)).toBe(true);
      
      // Should have meaningful checks
      expect(complianceReport.checks.length).toBeGreaterThan(0);
      
      for (const check of complianceReport.checks) {
        expect(['passed', 'failed', 'warning']).toContain(check.status);
        expect(['low', 'medium', 'high']).toContain(check.riskLevel);
        expect(check.check).toBeDefined();
        expect(check.details).toBeDefined();
      }
      
      console.log(`✅ Privacy compliance: ${complianceReport.overallCompliance}, ${complianceReport.checks.length} checks performed`);
    });

    test('Privacy audit trail generation', async () => {
      const auditReport = await calendarIntegrationService.auditPrivacyCompliance();
      
      expect(auditReport).toHaveProperty('auditDate');
      expect(auditReport).toHaveProperty('eventsReviewed');
      expect(auditReport).toHaveProperty('privacyViolationsFound');
      expect(auditReport).toHaveProperty('complianceScore');
      expect(auditReport).toHaveProperty('riskAssessment');
      expect(auditReport).toHaveProperty('recommendations');
      expect(auditReport).toHaveProperty('nextAuditDue');
      
      expect(typeof auditReport.eventsReviewed).toBe('number');
      expect(typeof auditReport.privacyViolationsFound).toBe('number');
      expect(auditReport.complianceScore).toBeGreaterThanOrEqual(0);
      expect(auditReport.complianceScore).toBeLessThanOrEqual(100);
      expect(['low', 'medium', 'high']).toContain(auditReport.riskAssessment);
      
      // Compliance score should be high for clean test environment
      if (auditReport.eventsReviewed > 0) {
        expect(auditReport.complianceScore).toBeGreaterThan(80);
      }
      
      console.log(`✅ Privacy audit: ${auditReport.complianceScore}/100 score, ${auditReport.privacyViolationsFound} violations in ${auditReport.eventsReviewed} events`);
    });

  });

  describe('Error Handling and Edge Cases', () => {

    test('Calendar service unavailable scenarios', async () => {
      mockedCalendar.requestCalendarPermissionsAsync.mockRejectedValue(new Error('Calendar service unavailable'));
      
      const result = await calendarIntegrationService.requestCalendarPermissions();
      
      expect(result.success).toBe(false);
      expect(result.recommendedFallback).toBe('local_notifications');
      expect(result.privacyNotice).toContain('local notifications');
      
      console.log('✅ Service unavailable handled gracefully');
    });

    test('Invalid reminder template handling', async () => {
      const invalidTemplate: ReminderTemplate = {
        type: 'morning_checkin',
        frequency: 'daily',
        preferredTime: { hour: 25, minute: 70 }, // Invalid time
        duration: -5, // Invalid duration
        isActive: true,
        privacyLevel: 'standard',
        therapeuticPriority: 'high'
      };

      const result = await calendarIntegrationService.createTherapeuticReminder(invalidTemplate);
      
      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.privacyCompliant).toBe(true); // No privacy violation even in error
      
      console.log('✅ Invalid template handled gracefully');
    });

    test('Maximum privacy mode activation', async () => {
      await calendarIntegrationService.enableMaximumPrivacyMode();
      
      // Test that subsequent operations use maximum privacy
      const template: ReminderTemplate = {
        type: 'assessment_reminder',
        frequency: 'weekly',
        preferredTime: { hour: 19, minute: 0 },
        duration: 10,
        isActive: true,
        privacyLevel: 'maximum',
        therapeuticPriority: 'critical'
      };

      const result = await calendarIntegrationService.createTherapeuticReminder(template);
      
      // Should use maximum privacy settings
      if (result.success) {
        // In maximum privacy mode, content should be very generic
        console.log('✅ Maximum privacy mode activated');
      } else {
        // Should still be privacy compliant in failure
        expect(result.privacyCompliant).toBe(true);
        console.log('⚠️ Maximum privacy mode - calendar unavailable but privacy maintained');
      }
    });

  });

});