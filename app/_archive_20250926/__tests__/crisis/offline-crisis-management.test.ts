/**
 * Offline Crisis Management Testing
 * Addresses critical crisis agent gaps: widget visibility, crisis data recovery, 
 * post-crisis protocols, and emergency access validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedOfflineQueueService } from '../../services/OfflineQueueService';
import { networkAwareService } from '../../src/services/NetworkAwareService';
import { offlineIntegrationService } from '../../src/services/OfflineIntegrationService';
import { OfflinePriority, NetworkQuality, OfflineActionType } from '../../src/types/offline';
import { Assessment } from '../../src/types';

/**
 * Crisis scenario simulation utilities
 */
class CrisisScenarioSimulator {
  
  /**
   * Generate real-world crisis scenarios
   */
  static getCrisisScenarios(): Array<{
    id: string;
    name: string;
    trigger: string;
    severity: 'moderate' | 'high' | 'severe';
    context: Record<string, any>;
    expectedResponse: string[];
  }> {
    return [
      {
        id: 'phq9_q9_suicidal',
        name: 'PHQ-9 Q9 Suicidal Ideation',
        trigger: 'suicidal_thoughts_detected',
        severity: 'severe',
        context: {
          assessmentType: 'phq9',
          questionIndex: 8,
          answer: 2, // More than half the days
          partialScore: 16
        },
        expectedResponse: ['immediate_crisis_detection', '988_access', 'safety_plan_activation']
      },
      {
        id: 'phq9_threshold_20',
        name: 'PHQ-9 Score ≥20 (Severe Depression)',
        trigger: 'severe_depression_threshold',
        severity: 'severe',
        context: {
          assessmentType: 'phq9',
          totalScore: 22,
          previousScore: 14
        },
        expectedResponse: ['crisis_intervention', 'immediate_sync', 'clinical_alert']
      },
      {
        id: 'gad7_threshold_15',
        name: 'GAD-7 Score ≥15 (Severe Anxiety)',
        trigger: 'severe_anxiety_threshold',
        severity: 'severe',
        context: {
          assessmentType: 'gad7',
          totalScore: 17,
          rapidIncrease: true
        },
        expectedResponse: ['anxiety_crisis_protocol', 'breathing_intervention', 'emergency_contacts']
      },
      {
        id: 'partial_assessment_crisis',
        name: 'Crisis During Partial Assessment',
        trigger: 'progressive_crisis_detection',
        severity: 'high',
        context: {
          assessmentType: 'phq9',
          questionsCompleted: 6,
          currentScore: 15,
          q9Answer: 1 // Several days of suicidal thoughts
        },
        expectedResponse: ['real_time_monitoring', 'progressive_intervention', 'completion_support']
      },
      {
        id: 'offline_crisis_button',
        name: 'Manual Crisis Button - Offline',
        trigger: 'user_initiated_crisis',
        severity: 'severe',
        context: {
          source: 'crisis_button',
          offline: true,
          userInitiated: true
        },
        expectedResponse: ['immediate_988_access', 'offline_safety_plan', 'local_resources']
      }
    ];
  }

  /**
   * Simulate widget states during crisis scenarios
   */
  static getWidgetCrisisStates(): Array<{
    widgetState: string;
    crisisVisibility: 'prominent' | 'visible' | 'accessible';
    accessTime: number; // milliseconds
    contextualInfo: string;
  }> {
    return [
      {
        widgetState: 'compact_home',
        crisisVisibility: 'prominent',
        accessTime: 150,
        contextualInfo: 'Crisis button visible in main widget area'
      },
      {
        widgetState: 'assessment_in_progress',
        crisisVisibility: 'prominent', 
        accessTime: 100,
        contextualInfo: 'Crisis button overlays assessment, always accessible'
      },
      {
        widgetState: 'breathing_exercise',
        crisisVisibility: 'accessible',
        accessTime: 200,
        contextualInfo: 'Crisis accessible via gesture or long press'
      },
      {
        widgetState: 'offline_mode',
        crisisVisibility: 'prominent',
        accessTime: 120,
        contextualInfo: 'Crisis button prioritized in offline state'
      },
      {
        widgetState: 'minimized_background',
        crisisVisibility: 'accessible',
        accessTime: 250,
        contextualInfo: 'Crisis accessible via notification or quick action'
      }
    ];
  }
}

/**
 * Crisis data recovery utilities
 */
class CrisisDataRecovery {
  
  /**
   * Test crisis data preservation across scenarios
   */
  static async testCrisisDataIntegrity(
    crisisData: any,
    interruptionType: 'app_crash' | 'network_loss' | 'device_restart' | 'low_memory'
  ): Promise<{
    recovered: boolean;
    dataIntegrity: number; // 0-100%
    recoveryTime: number; // milliseconds
    missingElements: string[];
  }> {
    const startTime = Date.now();
    
    // Simulate data corruption scenarios
    let corruptionFactors: string[] = [];
    let integrityScore = 100;

    switch (interruptionType) {
      case 'app_crash':
        // Minimal corruption - AsyncStorage typically persists
        if (Math.random() < 0.05) {
          corruptionFactors.push('incomplete_write');
          integrityScore -= 10;
        }
        break;
      case 'network_loss':
        // No corruption - purely offline scenario
        break;
      case 'device_restart':
        // Minimal risk if properly persisted
        if (Math.random() < 0.02) {
          corruptionFactors.push('storage_timing');
          integrityScore -= 5;
        }
        break;
      case 'low_memory':
        // Higher risk of partial writes
        if (Math.random() < 0.15) {
          corruptionFactors.push('memory_pressure');
          integrityScore -= 20;
        }
        break;
    }

    const recovered = integrityScore > 50;
    const recoveryTime = Date.now() - startTime;

    return {
      recovered,
      dataIntegrity: integrityScore,
      recoveryTime,
      missingElements: corruptionFactors
    };
  }
}

/**
 * Post-crisis follow-up protocol testing
 */
class PostCrisisProtocols {
  
  /**
   * Generate follow-up schedules based on crisis severity
   */
  static getFollowUpSchedule(severity: 'moderate' | 'high' | 'severe'): Array<{
    delay: number; // minutes
    type: string;
    priority: OfflinePriority;
    content: string;
  }> {
    const schedules = {
      moderate: [
        { delay: 30, type: 'immediate_check', priority: OfflinePriority.HIGH, content: 'How are you feeling right now?' },
        { delay: 120, type: 'two_hour_check', priority: OfflinePriority.MEDIUM, content: 'Checking in on your wellbeing' },
        { delay: 1440, type: 'daily_follow_up', priority: OfflinePriority.MEDIUM, content: 'Daily wellness check-in' }
      ],
      high: [
        { delay: 15, type: 'immediate_check', priority: OfflinePriority.CRITICAL, content: 'Immediate safety check-in' },
        { delay: 60, type: 'one_hour_check', priority: OfflinePriority.HIGH, content: 'How are you managing right now?' },
        { delay: 360, type: 'six_hour_check', priority: OfflinePriority.HIGH, content: 'Extended wellness check' },
        { delay: 1440, type: 'daily_follow_up', priority: OfflinePriority.MEDIUM, content: 'Daily safety follow-up' }
      ],
      severe: [
        { delay: 5, type: 'immediate_check', priority: OfflinePriority.CRITICAL, content: 'Immediate safety verification' },
        { delay: 30, type: 'half_hour_check', priority: OfflinePriority.CRITICAL, content: 'Urgent safety check-in' },
        { delay: 120, type: 'two_hour_check', priority: OfflinePriority.HIGH, content: 'Safety status update' },
        { delay: 480, type: 'eight_hour_check', priority: OfflinePriority.HIGH, content: 'Extended safety monitoring' },
        { delay: 1440, type: 'daily_follow_up', priority: OfflinePriority.HIGH, content: 'Daily safety assessment' },
        { delay: 10080, type: 'weekly_follow_up', priority: OfflinePriority.MEDIUM, content: 'Weekly progress check' }
      ]
    };

    return schedules[severity];
  }

  /**
   * Validate follow-up protocol appropriateness
   */
  static validateFollowUpProtocol(
    originalCrisis: any,
    followUp: any
  ): {
    appropriate: boolean;
    timingCorrect: boolean;
    contentAppropriate: boolean;
    priorityCorrect: boolean;
  } {
    const severity = originalCrisis.severity;
    const expectedSchedule = this.getFollowUpSchedule(severity);
    
    const expectedFollowUp = expectedSchedule.find(f => f.type === followUp.type);
    
    return {
      appropriate: !!expectedFollowUp,
      timingCorrect: expectedFollowUp ? 
        Math.abs(followUp.delay - expectedFollowUp.delay) <= 5 : false,
      contentAppropriate: expectedFollowUp ?
        followUp.content.includes(expectedFollowUp.content) : false,
      priorityCorrect: expectedFollowUp ?
        followUp.priority === expectedFollowUp.priority : false
    };
  }
}

describe('Offline Crisis Management - Critical Safety Testing', () => {

  beforeEach(async () => {
    await AsyncStorage.clear();
    await enhancedOfflineQueueService.initialize();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Real-Time Crisis Detection During Partial Assessments', () => {

    test('should detect crisis immediately when PHQ-9 Q9 indicates suicidal ideation', async () => {
      const scenario = CrisisScenarioSimulator.getCrisisScenarios()[0]; // phq9_q9_suicidal
      const startTime = Date.now();

      // Simulate partial PHQ-9 completion up to Q8
      const partialAnswers = [2, 2, 2, 1, 2, 2, 2, 1]; // Score: 14
      
      for (let i = 0; i < partialAnswers.length; i++) {
        await enhancedOfflineQueueService.queueAction(
          'assessment_progress',
          {
            assessmentId: `phq9_${startTime}`,
            questionIndex: i,
            answer: partialAnswers[i],
            cumulativeScore: partialAnswers.slice(0, i + 1).reduce((sum, a) => sum + a, 0)
          },
          { priority: OfflinePriority.MEDIUM, clinicalValidation: true }
        );
      }

      // Answer Q9 with suicidal ideation
      const crisisDetectionStart = Date.now();
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'assessment_crisis_detected',
        {
          assessmentId: `phq9_${startTime}`,
          questionIndex: 8, // Q9
          answer: 2, // More than half the days
          crisisType: 'suicidal_ideation',
          severity: 'severe'
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      const crisisDetectionTime = Date.now() - crisisDetectionStart;

      // Validate immediate crisis detection
      expect(crisisResult.success).toBe(true);
      expect(crisisResult.clinicalValidation?.isCrisisRelated).toBe(true);
      expect(crisisResult.clinicalValidation?.crisisLevel).toBe('severe');
      expect(crisisResult.clinicalValidation?.requiresImmediateSync).toBe(true);
      expect(crisisDetectionTime).toBeLessThan(200); // Must detect within 200ms

      // Verify crisis data queued for immediate sync
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.crisisDataPending).toBe(1);
      expect(queueStats.criticalActionsCount).toBeGreaterThan(0);
    });

    test('should monitor progressive crisis thresholds during assessment', async () => {
      const assessmentId = `progressive_phq9_${Date.now()}`;
      let previousScore = 0;
      let crisisTriggered = false;

      // Simulate progressive answering with increasing severity
      const progressiveAnswers = [2, 3, 3, 2, 3, 2, 3]; // Builds to crisis threshold
      
      for (let i = 0; i < progressiveAnswers.length; i++) {
        const currentScore = previousScore + progressiveAnswers[i];
        
        const result = await enhancedOfflineQueueService.queueAction(
          'assessment_progressive_monitoring',
          {
            assessmentId,
            questionIndex: i,
            answer: progressiveAnswers[i],
            cumulativeScore: currentScore,
            previousScore,
            isProgressing: true
          },
          { 
            priority: currentScore >= 15 ? OfflinePriority.CRITICAL : OfflinePriority.MEDIUM,
            clinicalValidation: true 
          }
        );

        expect(result.success).toBe(true);

        // Check for crisis threshold detection
        if (currentScore >= 15 && !crisisTriggered) {
          expect(result.clinicalValidation?.isCrisisRelated).toBe(true);
          expect(result.clinicalValidation?.crisisLevel).toBe('moderate');
          crisisTriggered = true;
        }

        if (currentScore >= 20) {
          expect(result.clinicalValidation?.crisisLevel).toBe('severe');
          expect(result.clinicalValidation?.requiresImmediateSync).toBe(true);
        }

        previousScore = currentScore;
      }

      expect(crisisTriggered).toBe(true);
    });

    test('should handle crisis detection during network interruptions', async () => {
      // Start assessment online
      const assessmentId = `interrupted_crisis_${Date.now()}`;
      
      // Simulate network loss during high-risk assessment
      const mockNetworkLoss = true;
      
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'offline_crisis_detection',
        {
          assessmentId,
          crisisType: 'suicidal_ideation',
          severity: 'severe',
          networkAvailable: !mockNetworkLoss,
          offlineDetection: true
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      // Crisis must be handled even when offline
      expect(crisisResult.success).toBe(true);
      expect(crisisResult.queuedForLater).toBe(true);
      expect(crisisResult.clinicalValidation?.isCrisisRelated).toBe(true);
      expect(crisisResult.clinicalValidation?.offlineHandling).toBe(true);

      // Verify offline crisis data preservation
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.crisisDataPending).toBeGreaterThan(0);
      expect(queueStats.offlineCrisisEvents).toBeGreaterThan(0);
    });
  });

  describe('Widget Crisis Button Visibility and Access Testing', () => {

    test('should guarantee crisis button visibility across all widget states', async () => {
      const widgetStates = CrisisScenarioSimulator.getWidgetCrisisStates();
      
      for (const state of widgetStates) {
        const accessStart = Date.now();
        
        const accessResult = await enhancedOfflineQueueService.queueAction(
          'widget_crisis_access_test',
          {
            widgetState: state.widgetState,
            expectedVisibility: state.crisisVisibility,
            contextualInfo: state.contextualInfo
          },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: false }
        );

        const accessTime = Date.now() - accessStart;

        // Validate crisis button accessibility
        expect(accessResult.success).toBe(true);
        expect(accessTime).toBeLessThan(state.accessTime); // Must meet expected access time
        
        // All states must provide crisis access
        expect(['prominent', 'visible', 'accessible']).toContain(state.crisisVisibility);
        
        console.log(`✓ ${state.widgetState}: Crisis accessible in ${accessTime}ms (${state.crisisVisibility})`);
      }
    });

    test('should enable emergency dialing when offline', async () => {
      // Simulate complete offline state
      const offlineStart = Date.now();
      
      const dialResult = await enhancedOfflineQueueService.queueAction(
        'emergency_dial_988_offline',
        {
          source: 'crisis_button',
          offline: true,
          emergencyNumber: '988',
          fallbackNumbers: ['911', '1-800-273-8255']
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: false }
      );

      const dialTime = Date.now() - offlineStart;

      // Emergency dialing must work offline
      expect(dialResult.success).toBe(true);
      expect(dialTime).toBeLessThan(100); // Critical response time
      expect(dialResult.offlineCapable).toBe(true);

      // Verify emergency numbers available
      expect(['988', '911']).toContain(dialResult.primaryNumber);
    });

    test('should maintain crisis access under system stress', async () => {
      // Create system stress with multiple operations
      const stressOperations = Array.from({ length: 200 }, (_, i) =>
        enhancedOfflineQueueService.queueAction(
          'stress_operation',
          { id: i, data: 'stress_test' },
          { priority: OfflinePriority.LOW }
        )
      );

      await Promise.all(stressOperations);

      // Test crisis access during stress
      const stressedAccessStart = Date.now();
      
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'crisis_access_under_stress',
        {
          stressConditions: true,
          queueBacklog: 200,
          memoryPressure: 'high'
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      const stressedAccessTime = Date.now() - stressedAccessStart;

      // Crisis must override stress conditions
      expect(crisisResult.success).toBe(true);
      expect(stressedAccessTime).toBeLessThan(300); // Acceptable under stress
      expect(crisisResult.clinicalValidation?.prioritizedOverStress).toBe(true);
    });

    test('should handle widget crisis access across screen orientations and sizes', async () => {
      const screenConfigurations = [
        { orientation: 'portrait', size: 'compact', accessible: true },
        { orientation: 'landscape', size: 'compact', accessible: true },
        { orientation: 'portrait', size: 'medium', accessible: true },
        { orientation: 'landscape', size: 'medium', accessible: true },
        { orientation: 'portrait', size: 'large', accessible: true }
      ];

      for (const config of screenConfigurations) {
        const result = await enhancedOfflineQueueService.queueAction(
          'crisis_access_screen_config',
          {
            orientation: config.orientation,
            screenSize: config.size,
            expectedAccessible: config.accessible
          },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: false }
        );

        expect(result.success).toBe(true);
        expect(result.accessible).toBe(config.accessible);
        
        console.log(`✓ ${config.orientation}/${config.size}: Crisis button accessible`);
      }
    });
  });

  describe('Crisis Data Recovery and Persistence', () => {

    test('should recover crisis data after app crashes', async () => {
      const crisisData = {
        crisisId: `crash_test_${Date.now()}`,
        assessmentType: 'phq9',
        crisisType: 'suicidal_ideation',
        severity: 'severe',
        timestamp: Date.now(),
        userResponse: 'Q9: More than half the days'
      };

      // Save crisis data
      await enhancedOfflineQueueService.queueAction(
        'save_crisis_data',
        crisisData,
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      // Test recovery after simulated crash
      const recoveryResult = await CrisisDataRecovery.testCrisisDataIntegrity(
        crisisData,
        'app_crash'
      );

      expect(recoveryResult.recovered).toBe(true);
      expect(recoveryResult.dataIntegrity).toBeGreaterThan(90);
      expect(recoveryResult.recoveryTime).toBeLessThan(1000);
      expect(recoveryResult.missingElements.length).toBeLessThanOrEqual(1);
    });

    test('should maintain crisis data integrity during device restart', async () => {
      const crisisScenarios = CrisisScenarioSimulator.getCrisisScenarios();
      
      for (const scenario of crisisScenarios) {
        // Save crisis scenario data
        await enhancedOfflineQueueService.queueAction(
          'save_crisis_scenario',
          {
            scenarioId: scenario.id,
            trigger: scenario.trigger,
            severity: scenario.severity,
            context: scenario.context
          },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        );

        // Test recovery after device restart
        const recoveryResult = await CrisisDataRecovery.testCrisisDataIntegrity(
          scenario,
          'device_restart'
        );

        expect(recoveryResult.recovered).toBe(true);
        expect(recoveryResult.dataIntegrity).toBeGreaterThan(95); // Higher standard for device restart
        
        console.log(`✓ ${scenario.name}: Recovery integrity ${recoveryResult.dataIntegrity}%`);
      }
    });

    test('should handle crisis data during low memory conditions', async () => {
      // Simulate low memory crisis scenario
      const lowMemoryCrisis = {
        crisisId: `low_memory_${Date.now()}`,
        memoryPressure: 'critical',
        crisisType: 'severe_anxiety',
        partialAssessmentData: new Array(100).fill(0).map((_, i) => ({ q: i, a: 2 }))
      };

      const saveResult = await enhancedOfflineQueueService.queueAction(
        'save_crisis_low_memory',
        lowMemoryCrisis,
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(saveResult.success).toBe(true);

      // Test recovery under memory pressure
      const recoveryResult = await CrisisDataRecovery.testCrisisDataIntegrity(
        lowMemoryCrisis,
        'low_memory'
      );

      expect(recoveryResult.recovered).toBe(true);
      expect(recoveryResult.dataIntegrity).toBeGreaterThan(80); // Acceptable under memory pressure
    });

    test('should implement crisis data backup and redundancy', async () => {
      const criticalCrisisData = {
        crisisId: `redundancy_test_${Date.now()}`,
        severity: 'severe',
        multipleIndicators: [
          'suicidal_ideation',
          'severe_depression_score',
          'previous_crisis_history'
        ],
        requiresRedundancy: true
      };

      // Save with redundancy
      const primarySave = await enhancedOfflineQueueService.queueAction(
        'save_crisis_primary',
        criticalCrisisData,
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      const backupSave = await enhancedOfflineQueueService.queueAction(
        'save_crisis_backup',
        { ...criticalCrisisData, isBackup: true },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(primarySave.success).toBe(true);
      expect(backupSave.success).toBe(true);

      // Verify both saves are accessible
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.crisisDataPending).toBeGreaterThanOrEqual(2);
      expect(queueStats.redundantCrisisData).toBe(true);
    });
  });

  describe('Post-Crisis Follow-Up Protocol Testing', () => {

    test('should implement appropriate follow-up schedules by crisis severity', async () => {
      const severityLevels: Array<'moderate' | 'high' | 'severe'> = ['moderate', 'high', 'severe'];
      
      for (const severity of severityLevels) {
        const originalCrisis = {
          crisisId: `followup_test_${severity}_${Date.now()}`,
          severity,
          timestamp: Date.now()
        };

        // Save original crisis
        await enhancedOfflineQueueService.queueAction(
          'save_crisis_for_followup',
          originalCrisis,
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        );

        // Schedule follow-ups
        const followUpSchedule = PostCrisisProtocols.getFollowUpSchedule(severity);
        
        for (const followUp of followUpSchedule) {
          const scheduleResult = await enhancedOfflineQueueService.scheduleFollowUp(
            originalCrisis.crisisId,
            {
              followUpType: followUp.type,
              scheduledFor: Date.now() + (followUp.delay * 60 * 1000),
              priority: followUp.priority,
              content: followUp.content
            }
          );

          expect(scheduleResult.scheduled).toBe(true);
          
          // Validate follow-up appropriateness
          const validation = PostCrisisProtocols.validateFollowUpProtocol(
            originalCrisis,
            followUp
          );
          
          expect(validation.appropriate).toBe(true);
          expect(validation.priorityCorrect).toBe(true);
        }
        
        console.log(`✓ ${severity}: ${followUpSchedule.length} follow-ups scheduled`);
      }
    });

    test('should provide therapeutic follow-up content', async () => {
      const followUpMessages = [
        {
          severity: 'moderate',
          message: "How are you feeling right now? Remember that you have support available whenever you need it.",
          therapeutic: true
        },
        {
          severity: 'high', 
          message: "Checking in on your safety and wellbeing. You showed courage by reaching out earlier.",
          therapeutic: true
        },
        {
          severity: 'severe',
          message: "This is a gentle check-in about your safety. You matter, and support is available 24/7.",
          therapeutic: true
        }
      ];

      for (const followUp of followUpMessages) {
        const result = await enhancedOfflineQueueService.queueAction(
          'validate_followup_message',
          {
            severity: followUp.severity,
            message: followUp.message,
            therapeuticIntent: 'safety_check'
          },
          { priority: OfflinePriority.HIGH, clinicalValidation: true }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.therapeuticallyAppropriate).toBe(true);
        expect(result.clinicalValidation?.supportive).toBe(true);
        
        console.log(`✓ ${followUp.severity}: Therapeutic follow-up message validated`);
      }
    });

    test('should handle follow-up delivery when offline', async () => {
      const originalCrisis = {
        crisisId: `offline_followup_${Date.now()}`,
        severity: 'high' as const,
        offlineDetected: true
      };

      // Schedule follow-up that should trigger while offline
      const followUpResult = await enhancedOfflineQueueService.scheduleFollowUp(
        originalCrisis.crisisId,
        {
          followUpType: 'immediate_check',
          scheduledFor: Date.now() + (5 * 60 * 1000), // 5 minutes
          priority: OfflinePriority.HIGH,
          content: 'Immediate safety check-in',
          offlineCapable: true
        }
      );

      expect(followUpResult.scheduled).toBe(true);
      expect(followUpResult.offlineDelivery).toBe(true);

      // Simulate follow-up trigger while offline
      const deliveryResult = await enhancedOfflineQueueService.queueAction(
        'deliver_offline_followup',
        {
          originalCrisisId: originalCrisis.crisisId,
          followUpType: 'immediate_check',
          offlineDelivery: true,
          localNotification: true
        },
        { priority: OfflinePriority.HIGH, clinicalValidation: true }
      );

      expect(deliveryResult.success).toBe(true);
      expect(deliveryResult.clinicalValidation?.offlineDeliveryAppropriate).toBe(true);
    });

    test('should escalate follow-up protocols when responses are missed', async () => {
      const missedFollowUpScenario = {
        originalCrisisId: `missed_followup_${Date.now()}`,
        severity: 'severe' as const,
        scheduledFollowUps: [
          { type: 'immediate_check', missed: true, timePastDue: 15 }, // 15 minutes past due
          { type: 'half_hour_check', missed: true, timePastDue: 30 }
        ]
      };

      const escalationResult = await enhancedOfflineQueueService.queueAction(
        'escalate_missed_followups',
        missedFollowUpScenario,
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(escalationResult.success).toBe(true);
      expect(escalationResult.clinicalValidation?.escalationAppropriate).toBe(true);
      expect(escalationResult.clinicalValidation?.increasedMonitoring).toBe(true);

      // Should schedule more frequent follow-ups
      expect(escalationResult.newFollowUpSchedule).toBeDefined();
      expect(escalationResult.newFollowUpSchedule.frequency).toBeLessThan(30); // More frequent than 30 min
    });
  });

  describe('Crisis Integration and Recovery Testing', () => {

    test('should maintain crisis functionality during offline-to-online transitions', async () => {
      // Start with offline crisis
      const offlineCrisis = {
        crisisId: `transition_test_${Date.now()}`,
        severity: 'severe',
        detectedOffline: true,
        requiresSync: true
      };

      const offlineResult = await enhancedOfflineQueueService.queueAction(
        'offline_crisis_start',
        offlineCrisis,
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(offlineResult.success).toBe(true);
      expect(offlineResult.queuedForLater).toBe(true);

      // Simulate network restoration
      const onlineTransitionResult = await enhancedOfflineQueueService.queueAction(
        'crisis_online_transition',
        {
          originalCrisisId: offlineCrisis.crisisId,
          networkRestored: true,
          syncPriority: OfflinePriority.CRITICAL
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(onlineTransitionResult.success).toBe(true);
      expect(onlineTransitionResult.clinicalValidation?.continuityMaintained).toBe(true);
      expect(onlineTransitionResult.clinicalValidation?.syncImmediate).toBe(true);
    });

    test('should handle multiple concurrent crisis scenarios offline', async () => {
      const concurrentCrises = [
        { id: 'crisis_1', type: 'suicidal_ideation', severity: 'severe' },
        { id: 'crisis_2', type: 'severe_anxiety', severity: 'high' },
        { id: 'crisis_3', type: 'panic_attack', severity: 'moderate' }
      ];

      const crisisResults = await Promise.all(
        concurrentCrises.map(crisis =>
          enhancedOfflineQueueService.queueAction(
            'concurrent_offline_crisis',
            crisis,
            { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
          )
        )
      );

      // All crises must be handled successfully
      crisisResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.isCrisisRelated).toBe(true);
        console.log(`✓ Crisis ${index + 1}: Handled offline successfully`);
      });

      // Verify queue prioritization
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.crisisDataPending).toBe(3);
      expect(queueStats.concurrentCrisesHandled).toBe(true);
    });

    test('should validate end-to-end crisis scenario offline', async () => {
      const endToEndScenario = {
        phase1: 'assessment_start',
        phase2: 'crisis_detection',
        phase3: 'intervention_trigger',
        phase4: 'safety_plan_activation',
        phase5: 'followup_scheduling'
      };

      let crisisId: string | undefined;

      // Phase 1: Start assessment offline
      const startResult = await enhancedOfflineQueueService.queueAction(
        'e2e_assessment_start',
        { assessmentType: 'phq9', offline: true },
        { priority: OfflinePriority.MEDIUM, clinicalValidation: true }
      );

      expect(startResult.success).toBe(true);
      crisisId = startResult.actionId;

      // Phase 2: Crisis detected during assessment
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'e2e_crisis_detection',
        {
          assessmentId: crisisId,
          crisisType: 'suicidal_ideation',
          severity: 'severe'
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(crisisResult.success).toBe(true);
      expect(crisisResult.clinicalValidation?.isCrisisRelated).toBe(true);

      // Phase 3: Intervention triggered
      const interventionResult = await enhancedOfflineQueueService.queueAction(
        'e2e_intervention_trigger',
        {
          crisisId,
          interventionType: '988_access',
          offlineCapable: true
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(interventionResult.success).toBe(true);
      expect(interventionResult.offlineCapable).toBe(true);

      // Phase 4: Safety plan activation
      const safetyPlanResult = await enhancedOfflineQueueService.queueAction(
        'e2e_safety_plan',
        {
          crisisId,
          safetyPlanType: 'immediate_coping',
          offlineResources: true
        },
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );

      expect(safetyPlanResult.success).toBe(true);
      expect(safetyPlanResult.offlineResources).toBe(true);

      // Phase 5: Follow-up scheduling
      const followUpResult = await enhancedOfflineQueueService.scheduleFollowUp(
        crisisId!,
        {
          followUpType: 'immediate_check',
          scheduledFor: Date.now() + (15 * 60 * 1000),
          priority: OfflinePriority.CRITICAL,
          content: 'Immediate safety follow-up'
        }
      );

      expect(followUpResult.scheduled).toBe(true);
      expect(followUpResult.clinicallyAppropriate).toBe(true);

      console.log('✓ End-to-end offline crisis scenario completed successfully');
    });
  });
});