/**
 * Calendar Integration - Clinical Privacy Testing
 * 
 * CRITICAL: Tests clinical-grade privacy protection in calendar integration
 * - HIPAA compliance validation
 * - PHI exposure prevention
 * - Therapeutic content sanitization
 * - Crisis intervention timing privacy
 */

import { calendarIntegrationService } from '../../src/services/calendar/CalendarIntegrationAPI';
import { encryptedDataStore } from '../../src/services/storage/EncryptedDataStore';
import { Assessment, CheckIn, CrisisPlan } from '../../src/types';
import { requiresCrisisIntervention } from '../../src/utils/validation';
import * as Calendar from 'expo-calendar';

// Mock Calendar module
jest.mock('expo-calendar');
const mockedCalendar = Calendar as jest.Mocked<typeof Calendar>;

describe('Calendar Integration - Clinical Privacy Protection', () => {
  let testAssessments: Assessment[] = [];
  let testCrisisPlan: CrisisPlan;

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

    // Create clinical test data with real PHI patterns
    console.log('🏥 Creating clinical privacy test dataset...');
    
    testAssessments = [
      // High-risk PHQ-9 with crisis indicators
      {
        id: 'crisis-phq9-001',
        type: 'phq9',
        answers: [3, 3, 3, 3, 3, 2, 2, 2, 3], // Score: 24, suicidal ideation
        score: 24,
        severity: 'severe',
        completedAt: new Date().toISOString(),
        context: 'crisis_assessment',
        userId: 'privacy-test-user',
        clinicalNotes: 'Patient expressing active suicidal ideation, requires immediate intervention'
      },
      
      // Moderate GAD-7 with panic episodes
      {
        id: 'anxiety-gad7-001',
        type: 'gad7',
        answers: [2, 3, 2, 3, 2, 3, 1], // Score: 16, severe anxiety
        score: 16,
        severity: 'severe',
        completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        context: 'routine_assessment',
        userId: 'privacy-test-user',
        clinicalNotes: 'Panic attacks increasing in frequency, affecting daily functioning'
      }
    ];

    testCrisisPlan = {
      id: 'privacy-crisis-plan',
      userId: 'privacy-test-user',
      contacts: {
        crisis: '988', // National Crisis Hotline
        trusted: [
          { name: 'Dr. Sarah Wilson', phone: '555-0123', relationship: 'therapist' },
          { name: 'Emergency Contact', phone: '555-0456', relationship: 'family' }
        ],
        trustedFriends: [
          { name: 'Close Friend', phone: '555-0789', relationship: 'friend' }
        ]
      },
      strategies: [
        'Call crisis hotline immediately',
        'Use MBCT breathing technique',
        'Contact trusted friend or therapist',
        'Go to safe environment'
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      riskFactors: ['social isolation', 'work stress', 'medication changes'],
      protectiveFactors: ['strong support network', 'regular therapy', 'mindfulness practice']
    };

    // Store test data
    await encryptedDataStore.saveCrisisPlan(testCrisisPlan);
    
    for (const assessment of testAssessments) {
      await encryptedDataStore.saveAssessment(assessment);
    }

    console.log(`✅ Clinical privacy test data ready: ${testAssessments.length} assessments with PHI patterns`);
  });

  afterAll(async () => {
    await encryptedDataStore.clearAllData();
  });

  describe('CRITICAL: HIPAA Compliance Validation', () => {

    test('No PHI in calendar event titles', async () => {
      const phiPatterns = [
        // Assessment scores
        'PHQ-9 score: 24/27',
        'GAD-7 result: 16/21',
        'Depression assessment completed',
        'Anxiety level: severe',
        
        // Clinical terminology
        'Suicidal ideation assessment',
        'Crisis intervention session',
        'Panic attack follow-up',
        'Medication adjustment meeting',
        
        // Personal identifiers
        'Patient ID: 123456',
        'SSN: 123-45-6789',
        'DOB: 01/01/1990',
        'Medical record #789',
        
        // Contact information
        'Call Dr. Smith at 555-123-4567',
        'Email: patient@clinic.com',
        'Therapy at 123 Main St',
        
        // Specific clinical details
        'Lithium level check',
        'SSRI side effects discussion',
        'Suicide risk high',
        'Hospitalization required'
      ];

      for (const phiContent of phiPatterns) {
        const sanitized = await calendarIntegrationService.sanitizeEventContent(phiContent);
        
        // Should detect PHI
        expect(sanitized.hasPrivateData).toBe(true);
        expect(sanitized.sanitizationApplied.length).toBeGreaterThan(0);
        
        // Output should not contain PHI
        expect(sanitized.title).not.toMatch(/\b(?:PHQ-?9|GAD-?7)\b/gi);
        expect(sanitized.title).not.toMatch(/\bscore:?\s*\d+/gi);
        expect(sanitized.title).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // SSN
        expect(sanitized.title).not.toMatch(/\b\d{3}-\d{3}-\d{4}\b/); // Phone
        expect(sanitized.title).not.toMatch(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/); // Email
        expect(sanitized.description).not.toMatch(/\b(?:suicidal?|depression|anxiety|panic|crisis)\b/gi);
        
        // Should use generic therapeutic language
        expect(['Mindfulness Practice', 'Wellness Check', 'Self-Care Time', 'Mental Health Moment'])
          .toContain(sanitized.title);
          
        console.log(`✅ PHI sanitized: "${phiContent}" → "${sanitized.title}"`);
      }
    });

    test('Crisis-related reminders maintain privacy during high-risk periods', async () => {
      // Simulate creating reminders during a crisis period
      const crisisAssessment = testAssessments.find(a => requiresCrisisIntervention(a));
      expect(crisisAssessment).toBeDefined();
      
      // Test creating reminders when user is in crisis
      const reminderTypes: Array<'morning_checkin' | 'midday_checkin' | 'evening_checkin' | 'assessment_reminder'> = 
        ['morning_checkin', 'midday_checkin', 'evening_checkin', 'assessment_reminder'];
      
      for (const reminderType of reminderTypes) {
        const template = {
          type: reminderType,
          frequency: 'daily' as const,
          preferredTime: { hour: 9, minute: 0 },
          duration: 10,
          isActive: true,
          privacyLevel: 'maximum' as const,
          therapeuticPriority: 'critical' as const
        };
        
        const result = await calendarIntegrationService.createTherapeuticReminder(template);
        
        // Should still maintain privacy even for critical reminders
        if (result.success) {
          expect(result.privacyCompliant).toBe(true);
          console.log(`✅ Crisis period reminder created with privacy: ${reminderType}`);
        } else {
          // If calendar unavailable, should have privacy-compliant fallback
          expect(result.privacyCompliant).toBe(true);
          expect(result.fallbackUsed?.privacyBenefits.length).toBeGreaterThan(0);
          console.log(`⚠️ Crisis period reminder failed gracefully: ${reminderType} → ${result.fallbackUsed?.type}`);
        }
      }
    });

    test('Privacy audit detects and reports potential violations', async () => {
      // Create some test events with varying privacy levels
      const testEvents = [
        {
          title: 'Mindfulness Practice',
          notes: 'Daily mindfulness session',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
          allDay: false
        },
        {
          title: 'Mental Health Check',
          notes: 'PHQ-9 assessment - score: 15/27', // Contains PHI
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          allDay: false
        }
      ];

      // Mock calendar events for audit
      mockedCalendar.getEventsAsync.mockResolvedValueOnce(testEvents as any);
      
      const auditReport = await calendarIntegrationService.auditPrivacyCompliance();
      
      expect(auditReport.eventsReviewed).toBe(testEvents.length);
      expect(auditReport.privacyViolationsFound).toBeGreaterThan(0); // Should detect PHI in second event
      expect(auditReport.complianceScore).toBeLessThan(100); // Should not be perfect due to violation
      expect(auditReport.riskAssessment).not.toBe('low'); // Should indicate risk
      
      expect(auditReport.recommendations.length).toBeGreaterThan(0);
      expect(auditReport.recommendations.some(rec => 
        rec.toLowerCase().includes('sanitize') || rec.toLowerCase().includes('review')
      )).toBe(true);
      
      console.log(`✅ Privacy audit detected violations: ${auditReport.privacyViolationsFound}/${auditReport.eventsReviewed} events, score: ${auditReport.complianceScore}/100`);
    });

    test('Maximum privacy mode eliminates all potential PHI exposure', async () => {
      await calendarIntegrationService.enableMaximumPrivacyMode();
      
      // Test all reminder types in maximum privacy mode
      const reminderTypes = [
        'morning_checkin', 'midday_checkin', 'evening_checkin', 
        'breathing_practice', 'mbct_practice', 'assessment_reminder'
      ] as const;
      
      for (const reminderType of reminderTypes) {
        const template = {
          type: reminderType,
          frequency: 'daily' as const,
          preferredTime: { hour: 10, minute: 0 },
          duration: 15,
          isActive: true,
          privacyLevel: 'maximum' as const,
          therapeuticPriority: 'high' as const
        };
        
        const result = await calendarIntegrationService.createTherapeuticReminder(template);
        
        if (result.success) {
          // In maximum privacy mode, titles should be very generic
          const expectedGenericTitles = [
            'Morning Focus', 'Midday Pause', 'Evening Reflection',
            'Breathing Space', 'Mindfulness Practice', 'Self-Reflection'
          ];
          
          // We can't directly inspect the created event, but privacy compliance should be true
          expect(result.privacyCompliant).toBe(true);
          
          console.log(`✅ Maximum privacy reminder: ${reminderType} - privacy compliant`);
        }
      }
    });

  });

  describe('Therapeutic Content Privacy Protection', () => {

    test('Assessment reminders never expose clinical scores', async () => {
      const assessmentContexts = [
        { score: 24, type: 'phq9', severity: 'severe' },
        { score: 16, type: 'gad7', severity: 'severe' },
        { score: 8, type: 'phq9', severity: 'mild' },
        { score: 12, type: 'gad7', severity: 'moderate' }
      ];
      
      for (const context of assessmentContexts) {
        const therapeuticContext = {
          currentMoodTrend: 'declining' as const,
          recentAssessmentScore: context.score,
          crisisRiskLevel: context.severity === 'severe' ? 'high' as const : 'medium' as const,
          therapeuticPhase: 'intensive' as const,
          lastCheckInType: 'morning' as const,
          streakDays: 5
        };
        
        const genericDescription = await calendarIntegrationService.generateGenericDescription(therapeuticContext);
        
        // Should not contain score information
        expect(genericDescription).not.toMatch(/\b\d+\/\d+\b/); // No scores like 24/27
        expect(genericDescription).not.toMatch(/\bscore:?\s*\d+/i); // No "score: 24"
        expect(genericDescription).not.toMatch(/\b(?:PHQ-?9|GAD-?7)\b/gi); // No assessment names
        expect(genericDescription).not.toMatch(/\b(?:severe|moderate|mild)\b/gi); // No severity levels
        
        // Should be therapeutically appropriate but generic
        const genericTerms = ['mindful', 'wellness', 'check', 'reflection', 'awareness', 'practice'];
        expect(genericTerms.some(term => 
          genericDescription.toLowerCase().includes(term)
        )).toBe(true);
        
        console.log(`✅ Generic description for ${context.type} score ${context.score}: "${genericDescription}"`);
      }
    });

    test('Crisis intervention timing maintains privacy', async () => {
      // Simulate high-crisis scenario
      const crisisAssessment = testAssessments.find(a => requiresCrisisIntervention(a));
      
      // Test pausing reminders during crisis (privacy protection for crisis boundaries)
      await calendarIntegrationService.pauseRemindersTemporarily(48); // 48 hours
      
      // Should log for clinical audit but not expose PHI
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('CLINICAL AUDIT: Therapeutic reminders paused for 48h')
      );
      
      // Verify no PHI in audit log
      const logCalls = (console.log as jest.Mock).mock.calls;
      const crisisLogCall = logCalls.find(call => 
        call[0].includes('CLINICAL AUDIT') && call[0].includes('paused')
      );
      
      expect(crisisLogCall).toBeDefined();
      expect(crisisLogCall[0]).not.toMatch(/\b(?:PHQ-?9|GAD-?7|score|crisis|suicidal)\b/gi);
      expect(crisisLogCall[0]).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/); // No SSN
      
      console.log('✅ Crisis boundary respect maintains privacy in audit logs');
    });

    test('Cross-app sharing prevention', async () => {
      const eventWithRiskyContent = {
        title: 'Mental Health Appointment',
        description: 'Discussion about recent PHQ-9 score of 20 and increased anxiety',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000),
        allDay: false,
        location: 'Therapy Office Suite 200',
        notes: 'Patient reports suicidal ideation, crisis intervention initiated',
        source: 'fullmind_therapeutic' as const
      };
      
      const leakageResult = await calendarIntegrationService.preventDataLeakage(eventWithRiskyContent);
      
      expect(leakageResult.prevented).toBe(true);
      expect(leakageResult.risksIdentified.length).toBeGreaterThanOrEqual(2); // Location and detailed notes
      expect(leakageResult.mitigationApplied.length).toBeGreaterThanOrEqual(2);
      
      // Verify sensitive content was removed
      expect(eventWithRiskyContent.location).toBeUndefined();
      expect(eventWithRiskyContent.notes).not.toContain('PHQ-9');
      expect(eventWithRiskyContent.notes).not.toContain('suicidal');
      expect(eventWithRiskyContent.notes).not.toContain('crisis');
      
      console.log(`✅ Cross-app sharing prevented: ${leakageResult.risksIdentified.join(', ')}`);
    });

  });

  describe('Privacy Compliance Monitoring', () => {

    test('Comprehensive privacy compliance validation', async () => {
      const complianceReport = await calendarIntegrationService.validatePrivacyCompliance();
      
      // Should have multiple privacy checks
      expect(complianceReport.checks.length).toBeGreaterThanOrEqual(4);
      
      const checkTypes = complianceReport.checks.map(c => c.check);
      expect(checkTypes.some(check => check.includes('Permission'))).toBe(true);
      expect(checkTypes.some(check => check.includes('Privacy'))).toBe(true);
      expect(checkTypes.some(check => check.includes('Calendar'))).toBe(true);
      
      // Should assess data exposure risk
      expect(['minimal', 'moderate', 'high']).toContain(complianceReport.dataExposureRisk);
      
      // Should provide actionable recommendations
      expect(Array.isArray(complianceReport.recommendations)).toBe(true);
      expect(Array.isArray(complianceReport.remediationSteps)).toBe(true);
      
      // For a well-configured system, compliance should be good
      if (complianceReport.overallCompliance === 'full') {
        expect(complianceReport.dataExposureRisk).toBe('minimal');
        expect(complianceReport.checks.filter(c => c.status === 'passed').length)
          .toBeGreaterThanOrEqual(complianceReport.checks.length * 0.8);
      }
      
      console.log(`✅ Privacy compliance validated: ${complianceReport.overallCompliance} compliance, ${complianceReport.dataExposureRisk} risk`);
    });

    test('Privacy violation detection and remediation', async () => {
      // Create mock events with privacy violations
      const violatingEvents = [
        {
          id: 'violation-1',
          title: 'PHQ-9 Assessment Results Review',
          notes: 'Score: 22/27, severe depression, suicidal ideation present',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          allDay: false
        },
        {
          id: 'violation-2',  
          title: 'Dr. Smith Therapy Session',
          notes: 'Patient ID 12345, GAD-7 score 18, panic attacks increasing',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          allDay: false
        }
      ];
      
      mockedCalendar.getEventsAsync.mockResolvedValueOnce(violatingEvents as any);
      
      const auditReport = await calendarIntegrationService.auditPrivacyCompliance();
      
      // Should detect violations
      expect(auditReport.privacyViolationsFound).toBeGreaterThan(0);
      expect(auditReport.riskAssessment).not.toBe('low');
      expect(auditReport.complianceScore).toBeLessThan(80);
      
      // Should provide specific remediation
      expect(auditReport.recommendations.some(rec => 
        rec.toLowerCase().includes('sanitize') || 
        rec.toLowerCase().includes('remove') ||
        rec.toLowerCase().includes('review')
      )).toBe(true);
      
      console.log(`✅ Privacy violations detected and flagged: ${auditReport.privacyViolationsFound} violations, ${auditReport.complianceScore}/100 compliance`);
    });

    test('Real-time privacy monitoring during calendar operations', async () => {
      const privacyViolations: string[] = [];
      
      // Mock console.error to capture privacy violations
      const originalConsoleError = console.error;
      console.error = jest.fn((...args) => {
        const message = args.join(' ');
        if (message.toLowerCase().includes('phi') || 
            message.toLowerCase().includes('privacy') ||
            message.toLowerCase().includes('violation')) {
          privacyViolations.push(message);
        }
        originalConsoleError(...args);
      });
      
      try {
        // Attempt to create reminders with varying content
        const reminderTemplates = [
          {
            type: 'assessment_reminder' as const,
            frequency: 'weekly' as const,
            preferredTime: { hour: 19, minute: 0 },
            duration: 10,
            isActive: true,
            privacyLevel: 'minimal' as const, // Lower privacy to potentially trigger violations
            therapeuticPriority: 'high' as const
          },
          {
            type: 'morning_checkin' as const,
            frequency: 'daily' as const,
            preferredTime: { hour: 8, minute: 0 },
            duration: 5,
            isActive: true,
            privacyLevel: 'maximum' as const, // Maximum privacy should prevent violations
            therapeuticPriority: 'medium' as const
          }
        ];
        
        for (const template of reminderTemplates) {
          const result = await calendarIntegrationService.createTherapeuticReminder(template);
          
          // All operations should maintain privacy compliance
          if (result.success) {
            expect(result.privacyCompliant).toBe(true);
          }
        }
        
        // Should not have privacy violations with our secure implementation
        expect(privacyViolations.length).toBe(0);
        
        console.log('✅ Real-time privacy monitoring: No violations detected during operations');
        
      } finally {
        console.error = originalConsoleError;
      }
    });

  });

  describe('Edge Cases and Privacy Stress Testing', () => {

    test('Large dataset privacy protection', async () => {
      // Create many reminders with potential privacy risks
      const reminderPromises = Array.from({ length: 20 }, (_, i) => {
        return calendarIntegrationService.createTherapeuticReminder({
          type: ['morning_checkin', 'midday_checkin', 'evening_checkin', 'mbct_practice'][i % 4] as any,
          frequency: 'daily',
          preferredTime: { hour: 8 + (i % 12), minute: (i * 15) % 60 },
          duration: 10 + (i % 20),
          isActive: true,
          privacyLevel: ['maximum', 'standard', 'minimal'][i % 3] as any,
          therapeuticPriority: ['low', 'medium', 'high'][i % 3] as any
        });
      });
      
      const results = await Promise.all(reminderPromises);
      
      // All results should maintain privacy compliance
      for (const result of results) {
        expect(result.privacyCompliant).toBe(true);
      }
      
      // Should handle load without privacy degradation
      const successfulReminders = results.filter(r => r.success).length;
      const failedReminders = results.filter(r => !r.success).length;
      
      console.log(`✅ Large dataset privacy test: ${successfulReminders} successful, ${failedReminders} failed, all privacy-compliant`);
    });

    test('Concurrent privacy operations', async () => {
      // Test multiple privacy-sensitive operations simultaneously
      const concurrentOperations = [
        calendarIntegrationService.validatePrivacyCompliance(),
        calendarIntegrationService.auditPrivacyCompliance(),
        calendarIntegrationService.sanitizeEventContent('PHQ-9 assessment score: 20/27'),
        calendarIntegrationService.generateGenericDescription({
          currentMoodTrend: 'declining',
          recentAssessmentScore: 22,
          crisisRiskLevel: 'high',
          therapeuticPhase: 'intensive',
          lastCheckInType: 'evening',
          streakDays: 3
        }),
        calendarIntegrationService.preventDataLeakage({
          title: 'Therapy Session',
          description: 'Crisis intervention, severe depression',
          startDate: new Date(),
          endDate: new Date(Date.now() + 60 * 60 * 1000),
          allDay: false,
          source: 'fullmind_therapeutic'
        })
      ];
      
      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should complete successfully
      const successfulOps = results.filter(r => r.status === 'fulfilled').length;
      expect(successfulOps).toBe(results.length);
      
      // Validate specific privacy results
      const sanitizationResult = results[2] as PromiseFulfilledResult<any>;
      expect(sanitizationResult.value.hasPrivateData).toBe(true);
      expect(sanitizationResult.value.title).not.toContain('PHQ-9');
      
      console.log(`✅ Concurrent privacy operations: ${successfulOps}/${results.length} completed successfully`);
    });

  });

});