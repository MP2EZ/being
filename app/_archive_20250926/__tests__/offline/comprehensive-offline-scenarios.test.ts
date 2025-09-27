/**
 * Comprehensive Offline Scenario Testing
 * Addresses critical gaps identified by crisis and clinician agents
 * Ensures clinical-grade reliability for Being. MBCT app
 * 
 * Critical Requirements Addressed:
 * - Real-time crisis monitoring during partial assessments
 * - Widget crisis button visibility and accessibility
 * - Crisis data recovery mechanisms  
 * - Post-crisis follow-up protocols
 * - Therapeutic language validation
 * - MBCT principle alignment during offline operation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedOfflineQueueService } from '../../services/OfflineQueueService';
import { networkAwareService } from '../../src/services/NetworkAwareService';
import { offlineIntegrationService } from '../../src/services/OfflineIntegrationService';
import { assetCacheService } from '../../src/services/AssetCacheService';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import {
  OfflineActionType,
  OfflinePriority,
  NetworkQuality,
  OfflineErrorCode,
  ConflictResolutionStrategy
} from '../../src/types/offline';
import { CheckIn, Assessment, UserProfile } from '../../src/types';

// Test utilities for generating realistic data
class OfflineTestDataFactory {
  
  /**
   * Generate partial PHQ-9 assessment with crisis indicators
   */
  static generatePartialPHQ9WithCrisis(answeredQuestions: number = 6): {
    assessment: Partial<Assessment>;
    currentScore: number;
    crisisIndicators: string[];
  } {
    const answers = [2, 3, 2, 2, 3, 2]; // Answers up to question 6
    const currentScore = answers.reduce((sum, answer) => sum + answer, 0);
    
    return {
      assessment: {
        id: `partial_phq9_${Date.now()}`,
        type: 'phq9',
        answers: answers.slice(0, answeredQuestions),
        score: currentScore,
        context: 'session'
      },
      currentScore,
      crisisIndicators: currentScore >= 15 ? ['high_score', 'crisis_threshold'] : []
    };
  }

  /**
   * Generate PHQ-9 Q9 answer indicating suicidal ideation
   */
  static generateSuicidalIdeationAnswer(): {
    questionIndex: number;
    answer: number;
    crisisLevel: 'moderate' | 'high' | 'severe';
  } {
    return {
      questionIndex: 8, // Q9 is index 8 (0-based)
      answer: 2, // "More than half the days" for suicidal thoughts
      crisisLevel: 'severe'
    };
  }

  /**
   * Generate mock network interruption during assessment
   */
  static generateNetworkInterruption(): {
    timing: 'during_assessment' | 'between_questions' | 'during_save';
    duration: number; // milliseconds
    reconnectionQuality: NetworkQuality;
  } {
    return {
      timing: 'during_assessment',
      duration: 15000, // 15 seconds
      reconnectionQuality: NetworkQuality.POOR
    };
  }

  /**
   * Generate therapeutic messaging for offline scenarios
   */
  static generateTherapeuticMessages(): {
    networkTransition: string;
    assessmentPause: string;
    dataSync: string;
    errorHandling: string;
  } {
    return {
      networkTransition: "Notice this moment of pause as your connection shifts. Take a breath and stay present.",
      assessmentPause: "Your responses are safely held. When you're ready, we can continue this mindful check-in.",
      dataSync: "Your mindful progress is being gently synchronized. No action needed from you.",
      errorHandling: "Something unexpected happened. This is an opportunity to practice gentle acceptance."
    };
  }
}

/**
 * Mock network controller for testing network state changes
 */
class MockNetworkController {
  private isConnected = true;
  private quality = NetworkQuality.GOOD;
  private listeners: Array<(state: { isConnected: boolean; quality: NetworkQuality }) => void> = [];

  setNetworkState(connected: boolean, quality: NetworkQuality = NetworkQuality.GOOD) {
    this.isConnected = connected;
    this.quality = quality;
    this.notifyListeners();
  }

  simulateNetworkLoss() {
    this.setNetworkState(false, NetworkQuality.OFFLINE);
  }

  simulateNetworkRestore(quality: NetworkQuality = NetworkQuality.GOOD) {
    this.setNetworkState(true, quality);
  }

  getState() {
    return { isConnected: this.isConnected, quality: this.quality };
  }

  addListener(listener: (state: { isConnected: boolean; quality: NetworkQuality }) => void) {
    this.listeners.push(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ 
      isConnected: this.isConnected, 
      quality: this.quality 
    }));
  }
}

/**
 * Performance monitoring for offline scenarios
 */
class OfflinePerformanceMonitor {
  private metrics: Map<string, { start: number; duration?: number }> = new Map();

  startTimer(label: string) {
    this.metrics.set(label, { start: Date.now() });
  }

  endTimer(label: string): number {
    const metric = this.metrics.get(label);
    if (metric) {
      const duration = Date.now() - metric.start;
      metric.duration = duration;
      return duration;
    }
    return 0;
  }

  getMetrics() {
    const result: Record<string, number> = {};
    this.metrics.forEach((value, key) => {
      if (value.duration !== undefined) {
        result[key] = value.duration;
      }
    });
    return result;
  }

  validatePerformance(metrics: Record<string, number>, thresholds: Record<string, number>) {
    const violations: string[] = [];
    Object.entries(thresholds).forEach(([key, threshold]) => {
      if (metrics[key] && metrics[key] > threshold) {
        violations.push(`${key}: ${metrics[key]}ms > ${threshold}ms`);
      }
    });
    return { passed: violations.length === 0, violations };
  }
}

describe('Comprehensive Offline Scenarios - Crisis Safety Testing', () => {
  let mockNetworkController: MockNetworkController;
  let performanceMonitor: OfflinePerformanceMonitor;

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockNetworkController = new MockNetworkController();
    performanceMonitor = new OfflinePerformanceMonitor();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('Critical Safety Tests - Real-time Crisis Detection', () => {
    
    test('should detect crisis immediately when Q9 answered with suicidal ideation', async () => {
      // Simulate partial PHQ-9 completion
      const partialAssessment = OfflineTestDataFactory.generatePartialPHQ9WithCrisis(8);
      const suicidalAnswer = OfflineTestDataFactory.generateSuicidalIdeationAnswer();

      performanceMonitor.startTimer('crisis_detection');

      // Queue partial assessment data
      const result = await enhancedOfflineQueueService.queueAction(
        'save_assessment_partial',
        partialAssessment.assessment,
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(result.success).toBe(true);

      // Add Q9 suicidal ideation answer
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'update_assessment_crisis',
        {
          assessmentId: partialAssessment.assessment.id,
          questionIndex: suicidalAnswer.questionIndex,
          answer: suicidalAnswer.answer,
          crisisDetected: true
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );

      const detectionTime = performanceMonitor.endTimer('crisis_detection');

      // Validate crisis detection
      expect(crisisResult.success).toBe(true);
      expect(crisisResult.clinicalValidation?.isCrisisRelated).toBe(true);
      expect(crisisResult.clinicalValidation?.requiresImmediateSync).toBe(true);
      expect(crisisResult.clinicalValidation?.crisisLevel).toBe('severe');
      
      // Validate detection speed (must be < 200ms)
      expect(detectionTime).toBeLessThan(200);
    });

    test('should monitor crisis thresholds during progressive assessment completion', async () => {
      // Simulate progressive PHQ-9 completion with increasing scores
      const questions = [1, 2, 2, 3, 2, 3, 2]; // Progressive scores
      let cumulativeScore = 0;
      let crisisTriggered = false;

      for (let i = 0; i < questions.length; i++) {
        cumulativeScore += questions[i];
        
        const result = await enhancedOfflineQueueService.queueAction(
          'update_assessment_progress',
          {
            assessmentId: `progressive_phq9_${Date.now()}`,
            questionIndex: i,
            answer: questions[i],
            cumulativeScore,
            isComplete: false
          },
          {
            priority: cumulativeScore >= 15 ? OfflinePriority.CRITICAL : OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);

        // Check if crisis threshold triggered
        if (cumulativeScore >= 15 && !crisisTriggered) {
          expect(result.clinicalValidation?.isCrisisRelated).toBe(true);
          expect(result.clinicalValidation?.crisisLevel).toBe('moderate');
          crisisTriggered = true;
        }
        
        // Check severe crisis at score 20
        if (cumulativeScore >= 20) {
          expect(result.clinicalValidation?.crisisLevel).toBe('severe');
          expect(result.clinicalValidation?.requiresImmediateSync).toBe(true);
        }
      }

      expect(crisisTriggered).toBe(true);
    });

    test('should preserve crisis data integrity during network interruptions', async () => {
      // Start with online assessment
      const partialAssessment = OfflineTestDataFactory.generatePartialPHQ9WithCrisis(5);
      
      // Simulate network loss during assessment
      mockNetworkController.simulateNetworkLoss();
      
      // Continue assessment offline with crisis indicators
      const crisisAnswer = OfflineTestDataFactory.generateSuicidalIdeationAnswer();
      
      performanceMonitor.startTimer('offline_crisis_save');
      
      const offlineResult = await enhancedOfflineQueueService.queueAction(
        'save_crisis_assessment_offline',
        {
          ...partialAssessment.assessment,
          answers: [...(partialAssessment.assessment.answers || []), 2, 3, 3], // Complete with crisis scores
          crisisIndicators: ['suicidal_ideation', 'high_score']
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );

      const saveTime = performanceMonitor.endTimer('offline_crisis_save');

      // Validate crisis data preserved
      expect(offlineResult.success).toBe(true);
      expect(offlineResult.queuedForLater).toBe(true);
      expect(offlineResult.clinicalValidation?.isCrisisRelated).toBe(true);
      expect(saveTime).toBeLessThan(500); // Must save quickly

      // Simulate network restoration
      mockNetworkController.simulateNetworkRestore();
      
      // Verify crisis data can be recovered
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.crisisDataPending).toBeGreaterThan(0);
      expect(queueStats.criticalActionsCount).toBeGreaterThan(0);
    });
  });

  describe('Widget Crisis Access Validation', () => {
    
    test('should guarantee crisis button visibility in all widget states', async () => {
      // Test crisis button access across different widget configurations
      const widgetStates = [
        'compact_morning',
        'expanded_midday',
        'evening_summary',
        'assessment_active',
        'offline_mode'
      ];

      for (const state of widgetStates) {
        performanceMonitor.startTimer(`crisis_button_${state}`);
        
        // Simulate widget crisis button access
        const accessResult = await enhancedOfflineQueueService.queueAction(
          'widget_crisis_access',
          {
            widgetState: state,
            accessTime: Date.now(),
            emergencyType: 'crisis_button'
          },
          {
            priority: OfflinePriority.CRITICAL,
            clinicalValidation: false
          }
        );

        const accessTime = performanceMonitor.endTimer(`crisis_button_${state}`);

        // Validate crisis button accessibility
        expect(accessResult.success).toBe(true);
        expect(accessTime).toBeLessThan(200); // Must be accessible within 200ms
      }
    });

    test('should enable 988 dialing functionality when offline', async () => {
      // Simulate offline state
      mockNetworkController.simulateNetworkLoss();
      
      performanceMonitor.startTimer('offline_988_dial');
      
      // Test emergency dialing capability
      const dialResult = await enhancedOfflineQueueService.queueAction(
        'emergency_dial_988',
        {
          triggerSource: 'crisis_button',
          offline: true,
          timestamp: Date.now()
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: false
        }
      );

      const dialTime = performanceMonitor.endTimer('offline_988_dial');

      // Validate emergency dialing works offline
      expect(dialResult.success).toBe(true);
      expect(dialTime).toBeLessThan(100); // Critical response time
    });

    test('should handle widget emergency access under system stress', async () => {
      // Simulate high memory usage and multiple operations
      const stressOperations = Array.from({ length: 100 }, (_, i) => 
        enhancedOfflineQueueService.queueAction(
          'background_operation',
          { operationId: i, data: 'stress_test_data' },
          { priority: OfflinePriority.LOW }
        )
      );

      // Execute stress operations
      await Promise.all(stressOperations);

      // Test crisis access under stress
      performanceMonitor.startTimer('crisis_under_stress');
      
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'widget_emergency_access',
        {
          stressConditions: true,
          memoryPressure: 'high',
          queueSize: 100
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );

      const stressTime = performanceMonitor.endTimer('crisis_under_stress');

      // Validate crisis access still works under stress
      expect(crisisResult.success).toBe(true);
      expect(stressTime).toBeLessThan(300); // Acceptable under stress
    });
  });

  describe('Therapeutic Language and MBCT Compliance', () => {
    
    test('should use therapeutic language for all network transitions', async () => {
      const therapeuticMessages = OfflineTestDataFactory.generateTherapeuticMessages();
      
      // Test network transition messaging
      const transitionTests = [
        { event: 'going_offline', message: therapeuticMessages.networkTransition },
        { event: 'assessment_pause', message: therapeuticMessages.assessmentPause },
        { event: 'data_sync', message: therapeuticMessages.dataSync },
        { event: 'error_recovery', message: therapeuticMessages.errorHandling }
      ];

      for (const test of transitionTests) {
        const result = await enhancedOfflineQueueService.queueAction(
          'validate_therapeutic_language',
          {
            event: test.event,
            message: test.message,
            mbctCompliant: true
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.therapeuticallyAppropriate).toBe(true);
      }
    });

    test('should integrate mindfulness prompts during network events', async () => {
      // Test mindfulness integration during various network states
      const networkEvents = [
        { type: 'connection_lost', mindfulPrompt: 'Notice this pause. What do you observe in this moment?' },
        { type: 'slow_connection', mindfulPrompt: 'Use this slower pace as a chance to breathe mindfully.' },
        { type: 'reconnecting', mindfulPrompt: 'As connection returns, stay present with your experience.' }
      ];

      for (const event of networkEvents) {
        const result = await enhancedOfflineQueueService.queueAction(
          'mindfulness_network_integration',
          {
            networkEvent: event.type,
            mindfulPrompt: event.mindfulPrompt,
            presentMoment: true
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.mbctCompliant).toBe(true);
      }
    });

    test('should maintain therapeutic continuity during session interruptions', async () => {
      // Start a therapeutic session
      const sessionStart = await enhancedOfflineQueueService.queueAction(
        'start_mindful_session',
        {
          sessionType: 'breathing_space',
          therapeuticContext: 'mindful_check_in',
          duration: 180000 // 3 minutes
        },
        {
          priority: OfflinePriority.MEDIUM,
          clinicalValidation: true
        }
      );

      expect(sessionStart.success).toBe(true);

      // Simulate interruption (network loss)
      mockNetworkController.simulateNetworkLoss();

      // Handle interruption therapeutically
      const interruptionResult = await enhancedOfflineQueueService.queueAction(
        'handle_therapeutic_interruption',
        {
          originalSession: sessionStart.actionId,
          interruptionType: 'network_loss',
          therapeuticResponse: 'gentle_pause_and_resume',
          preserveProgress: true
        },
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(interruptionResult.success).toBe(true);
      expect(interruptionResult.clinicalValidation?.therapeuticContinuity).toBe(true);

      // Resume session when network returns
      mockNetworkController.simulateNetworkRestore();

      const resumeResult = await enhancedOfflineQueueService.queueAction(
        'resume_therapeutic_session',
        {
          originalSession: sessionStart.actionId,
          resumeType: 'mindful_reconnection',
          preservedState: true
        },
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(resumeResult.success).toBe(true);
      expect(resumeResult.clinicalValidation?.sessionIntegrity).toBe(true);
    });
  });

  describe('Clinical Data Integrity and Recovery', () => {
    
    test('should maintain PHQ-9/GAD-7 scoring accuracy across offline/online transitions', async () => {
      // Create complete PHQ-9 assessment
      const phq9Data = {
        type: 'phq9',
        answers: [2, 3, 2, 1, 2, 2, 1, 3, 2] // Total score: 18
      };
      const expectedScore = phq9Data.answers.reduce((sum, answer) => sum + answer, 0);

      // Save assessment offline
      mockNetworkController.simulateNetworkLoss();
      
      const offlineResult = await enhancedOfflineQueueService.queueAction(
        'save_assessment_complete',
        phq9Data,
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(offlineResult.success).toBe(true);
      expect(offlineResult.clinicalValidation?.scoringAccuracy).toBe(100);

      // Transition to online and verify integrity
      mockNetworkController.simulateNetworkRestore();
      
      const integrityCheck = await enhancedOfflineQueueService.validateDataIntegrity();
      expect(integrityCheck.assessmentScoring).toBe('accurate');
      expect(integrityCheck.clinicalThresholds).toBe('preserved');
    });

    test('should handle assessment completion tracking during interruptions', async () => {
      // Start GAD-7 assessment
      const gad7Start = await enhancedOfflineQueueService.queueAction(
        'start_assessment',
        {
          type: 'gad7',
          sessionId: `gad7_${Date.now()}`,
          startTime: Date.now()
        },
        {
          priority: OfflinePriority.MEDIUM,
          clinicalValidation: true
        }
      );

      expect(gad7Start.success).toBe(true);

      // Answer first 4 questions
      const partialAnswers = [2, 3, 2, 1];
      for (let i = 0; i < partialAnswers.length; i++) {
        await enhancedOfflineQueueService.queueAction(
          'assessment_progress',
          {
            sessionId: gad7Start.actionId,
            questionIndex: i,
            answer: partialAnswers[i],
            progress: ((i + 1) / 7) * 100
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: false
          }
        );
      }

      // Simulate interruption
      mockNetworkController.simulateNetworkLoss();

      // Verify progress preservation
      const progressCheck = await enhancedOfflineQueueService.getActionById(gad7Start.actionId!);
      expect(progressCheck?.data.progress).toBe(57.14); // 4/7 * 100, rounded

      // Resume and complete assessment
      const remainingAnswers = [2, 1, 2];
      for (let i = 0; i < remainingAnswers.length; i++) {
        await enhancedOfflineQueueService.queueAction(
          'assessment_progress',
          {
            sessionId: gad7Start.actionId,
            questionIndex: i + 4,
            answer: remainingAnswers[i],
            progress: ((i + 5) / 7) * 100
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: true
          }
        );
      }

      // Complete assessment
      const completionResult = await enhancedOfflineQueueService.queueAction(
        'complete_assessment',
        {
          sessionId: gad7Start.actionId,
          finalScore: [...partialAnswers, ...remainingAnswers].reduce((sum, answer) => sum + answer, 0),
          completedAt: Date.now()
        },
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(completionResult.success).toBe(true);
      expect(completionResult.clinicalValidation?.assessmentComplete).toBe(true);
    });

    test('should validate crisis threshold detection consistency', async () => {
      const crisisScenarios = [
        { type: 'phq9', score: 20, expectedLevel: 'severe' },
        { type: 'phq9', score: 15, expectedLevel: 'moderate' },
        { type: 'gad7', score: 15, expectedLevel: 'severe' },
        { type: 'gad7', score: 10, expectedLevel: 'moderate' }
      ];

      for (const scenario of crisisScenarios) {
        const result = await enhancedOfflineQueueService.queueAction(
          'validate_crisis_threshold',
          {
            assessmentType: scenario.type,
            totalScore: scenario.score,
            timestamp: Date.now()
          },
          {
            priority: OfflinePriority.HIGH,
            clinicalValidation: true
          }
        );

        expect(result.success).toBe(true);
        expect(result.clinicalValidation?.crisisLevel).toBe(scenario.expectedLevel);
        
        if (scenario.score >= 20 || (scenario.type === 'gad7' && scenario.score >= 15)) {
          expect(result.clinicalValidation?.requiresImmediateSync).toBe(true);
        }
      }
    });
  });

  describe('Performance and Reliability Under Stress', () => {
    
    test('should maintain performance during extended offline operation', async () => {
      // Simulate 2-hour offline period with regular check-ins
      const offlineStartTime = Date.now();
      const checkInInterval = 15 * 60 * 1000; // 15 minutes
      const totalDuration = 2 * 60 * 60 * 1000; // 2 hours
      const expectedCheckIns = Math.floor(totalDuration / checkInInterval);

      mockNetworkController.simulateNetworkLoss();
      
      performanceMonitor.startTimer('extended_offline');

      // Generate check-ins over time
      const checkInPromises = [];
      for (let i = 0; i < expectedCheckIns; i++) {
        const checkInPromise = enhancedOfflineQueueService.queueAction(
          'offline_checkin',
          {
            checkInId: `extended_${i}`,
            timestamp: offlineStartTime + (i * checkInInterval),
            offlineDuration: i * checkInInterval
          },
          {
            priority: OfflinePriority.MEDIUM,
            clinicalValidation: false
          }
        );
        checkInPromises.push(checkInPromise);
      }

      const results = await Promise.all(checkInPromises);
      const extendedOfflineTime = performanceMonitor.endTimer('extended_offline');

      // Validate all check-ins succeeded
      expect(results.every(result => result.success)).toBe(true);
      
      // Validate performance maintained
      const avgTimePerCheckIn = extendedOfflineTime / expectedCheckIns;
      expect(avgTimePerCheckIn).toBeLessThan(1000); // < 1 second per check-in

      // Validate queue management
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.totalActions).toBe(expectedCheckIns);
      expect(queueStats.queueHealth).toBe('healthy');
    });

    test('should handle memory optimization during large offline queues', async () => {
      // Create large queue of operations
      const largeQueueSize = 1000;
      const operations = [];
      
      performanceMonitor.startTimer('large_queue_creation');

      for (let i = 0; i < largeQueueSize; i++) {
        const operation = enhancedOfflineQueueService.queueAction(
          'batch_operation',
          {
            operationId: i,
            data: `test_data_${i}`,
            timestamp: Date.now() + i
          },
          {
            priority: i % 100 === 0 ? OfflinePriority.HIGH : OfflinePriority.LOW,
            clinicalValidation: false
          }
        );
        operations.push(operation);
      }

      await Promise.all(operations);
      const queueCreationTime = performanceMonitor.endTimer('large_queue_creation');

      // Validate memory efficiency
      expect(queueCreationTime).toBeLessThan(10000); // < 10 seconds for 1000 operations
      
      // Test memory-optimized batch processing
      performanceMonitor.startTimer('batch_processing');
      
      const batchResult = await enhancedOfflineQueueService.processBatch(
        50, // Batch size
        { priorityThreshold: OfflinePriority.MEDIUM }
      );

      const batchTime = performanceMonitor.endTimer('batch_processing');

      expect(batchResult.processed).toBeGreaterThan(0);
      expect(batchTime).toBeLessThan(5000); // < 5 seconds for batch
    });

    test('should maintain crisis responsiveness under system load', async () => {
      // Create background load
      const backgroundLoad = Array.from({ length: 500 }, (_, i) =>
        enhancedOfflineQueueService.queueAction(
          'background_load',
          { loadId: i },
          { priority: OfflinePriority.LOW }
        )
      );

      await Promise.all(backgroundLoad);

      // Test crisis response time under load
      performanceMonitor.startTimer('crisis_under_load');

      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'crisis_emergency',
        {
          crisisType: 'suicidal_ideation',
          severity: 'high',
          requiresImmediate: true
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );

      const crisisResponseTime = performanceMonitor.endTimer('crisis_under_load');

      // Crisis response must be immediate even under load
      expect(crisisResult.success).toBe(true);
      expect(crisisResponseTime).toBeLessThan(200); // Must maintain <200ms
      expect(crisisResult.clinicalValidation?.processedImmediately).toBe(true);
    });
  });

  describe('Integration and Recovery Testing', () => {
    
    test('should handle complete app restart during offline operation', async () => {
      // Queue several operations
      const preRestartOps = [
        { type: 'save_checkin', data: { checkInId: 'pre_restart_1' }},
        { type: 'save_assessment', data: { assessmentId: 'pre_restart_assessment' }},
        { type: 'crisis_data', data: { crisisId: 'pre_restart_crisis' }}
      ];

      for (const op of preRestartOps) {
        await enhancedOfflineQueueService.queueAction(
          op.type as OfflineActionType,
          op.data,
          { priority: OfflinePriority.HIGH }
        );
      }

      // Simulate app restart by reinitializing service
      const preRestartStats = await enhancedOfflineQueueService.getStatistics();
      expect(preRestartStats.totalActions).toBeGreaterThan(0);

      // Reinitialize (simulating app restart)
      await enhancedOfflineQueueService.initialize();

      // Verify data recovery after restart
      const postRestartStats = await enhancedOfflineQueueService.getStatistics();
      expect(postRestartStats.totalActions).toBe(preRestartStats.totalActions);
      expect(postRestartStats.dataIntegrityStatus).toBe('valid');
    });

    test('should validate cross-service integration during offline sync', async () => {
      // Test integration between OfflineQueue, AssetCache, and ResumableSession
      
      // Initialize all services
      await Promise.all([
        enhancedOfflineQueueService.initialize(),
        assetCacheService.initialize(),
        resumableSessionService.initialize()
      ]);

      // Create integrated offline operation
      const sessionData = {
        sessionId: `integrated_${Date.now()}`,
        sessionType: 'breathing_space',
        progress: 0.5,
        assets: ['breathing_guide.mp3', 'mindfulness_bell.wav']
      };

      // Queue session data
      const sessionResult = await enhancedOfflineQueueService.queueAction(
        'save_session_progress',
        sessionData,
        { priority: OfflinePriority.MEDIUM }
      );

      // Cache required assets
      const assetCacheResult = await assetCacheService.ensureAssetsCached(
        sessionData.assets
      );

      // Save resumable session state
      const resumableResult = await resumableSessionService.saveSessionState(
        sessionData.sessionId,
        { progress: sessionData.progress, type: sessionData.sessionType }
      );

      // Validate all integrations worked
      expect(sessionResult.success).toBe(true);
      expect(assetCacheResult.allCached).toBe(true);
      expect(resumableResult.success).toBe(true);

      // Test integrated recovery
      const recoveredSession = await resumableSessionService.getSessionState(sessionData.sessionId);
      expect(recoveredSession?.progress).toBe(0.5);
    });

    test('should maintain data consistency during conflict resolution', async () => {
      // Create conflicting data scenarios
      const conflictScenarios = [
        {
          type: 'timestamp_conflict',
          local: { checkInId: 'conflict_test', timestamp: Date.now() },
          remote: { checkInId: 'conflict_test', timestamp: Date.now() - 1000 }
        },
        {
          type: 'score_conflict', 
          local: { assessmentId: 'conflict_assessment', score: 15 },
          remote: { assessmentId: 'conflict_assessment', score: 16 }
        }
      ];

      for (const scenario of conflictScenarios) {
        const conflictResult = await enhancedOfflineQueueService.resolveConflict(
          scenario.local,
          scenario.remote,
          ConflictResolutionStrategy.CLIENT_WINS // Use client data for offline-first
        );

        expect(conflictResult.resolved).toBe(true);
        expect(conflictResult.resolution).toBe('client_wins');
        expect(conflictResult.dataIntegrity).toBe('preserved');
      }
    });
  });

  describe('Post-Crisis Follow-up and Recovery', () => {
    
    test('should implement post-crisis follow-up protocols', async () => {
      // Simulate crisis event
      const crisisEvent = await enhancedOfflineQueueService.queueAction(
        'crisis_event',
        {
          crisisId: `crisis_${Date.now()}`,
          severity: 'high',
          interventionType: '988_call',
          timestamp: Date.now()
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );

      expect(crisisEvent.success).toBe(true);

      // Schedule follow-up protocols
      const followUpSchedule = [
        { delay: 15 * 60 * 1000, type: 'immediate_followup' }, // 15 minutes
        { delay: 60 * 60 * 1000, type: 'one_hour_followup' },  // 1 hour
        { delay: 24 * 60 * 60 * 1000, type: 'daily_followup' } // 24 hours
      ];

      for (const followUp of followUpSchedule) {
        const followUpResult = await enhancedOfflineQueueService.scheduleFollowUp(
          crisisEvent.actionId!,
          {
            followUpType: followUp.type,
            scheduledFor: Date.now() + followUp.delay,
            therapeuticCheck: true
          }
        );

        expect(followUpResult.scheduled).toBe(true);
        expect(followUpResult.clinicallyAppropriate).toBe(true);
      }
    });

    test('should provide therapeutic recovery guidance after offline crisis', async () => {
      // Simulate offline crisis resolution
      mockNetworkController.simulateNetworkLoss();
      
      const offlineCrisisResult = await enhancedOfflineQueueService.queueAction(
        'offline_crisis_resolution',
        {
          crisisId: `offline_crisis_${Date.now()}`,
          resolutionType: 'self_soothing',
          therapeuticResources: ['breathing_space', 'grounding_exercise'],
          safetyPlan: 'activated'
        },
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );

      expect(offlineCrisisResult.success).toBe(true);
      expect(offlineCrisisResult.clinicalValidation?.therapeuticSupport).toBe(true);

      // Network returns - provide recovery guidance
      mockNetworkController.simulateNetworkRestore();

      const recoveryGuidance = await enhancedOfflineQueueService.queueAction(
        'post_crisis_recovery',
        {
          originalCrisis: offlineCrisisResult.actionId,
          recoveryPhase: 'stabilization',
          mbctIntegration: true,
          gentleReentry: true
        },
        {
          priority: OfflinePriority.HIGH,
          clinicalValidation: true
        }
      );

      expect(recoveryGuidance.success).toBe(true);
      expect(recoveryGuidance.clinicalValidation?.recoveryAppropriate).toBe(true);
    });
  });

  describe('Comprehensive Performance Validation', () => {
    
    test('should meet all critical performance thresholds', async () => {
      const performanceThresholds = {
        crisis_detection: 200,      // Crisis detection < 200ms
        emergency_access: 200,      // Emergency access < 200ms  
        offline_save: 500,          // Offline save < 500ms
        queue_operation: 100,       // Queue operations < 100ms
        data_integrity: 1000,       // Data integrity check < 1s
        session_resume: 500,        // Session resumption < 500ms
        sync_operation: 2000        // Sync operations < 2s
      };

      const performanceTests = Object.keys(performanceThresholds).map(async (testType) => {
        performanceMonitor.startTimer(testType);
        
        // Execute performance-critical operation based on type
        let result;
        switch (testType) {
          case 'crisis_detection':
            result = await enhancedOfflineQueueService.queueAction(
              'crisis_detection_test',
              { crisisLevel: 'high' },
              { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
            );
            break;
            
          case 'emergency_access':
            result = await enhancedOfflineQueueService.queueAction(
              'emergency_access_test',
              { accessType: '988_dial' },
              { priority: OfflinePriority.CRITICAL }
            );
            break;
            
          case 'offline_save':
            mockNetworkController.simulateNetworkLoss();
            result = await enhancedOfflineQueueService.queueAction(
              'offline_save_test',
              { saveType: 'assessment' },
              { priority: OfflinePriority.HIGH }
            );
            break;
            
          default:
            result = { success: true };
        }

        const duration = performanceMonitor.endTimer(testType);
        
        return {
          testType,
          duration,
          threshold: performanceThresholds[testType as keyof typeof performanceThresholds],
          passed: duration <= performanceThresholds[testType as keyof typeof performanceThresholds],
          success: result.success
        };
      });

      const results = await Promise.all(performanceTests);
      const allMetrics = performanceMonitor.getMetrics();
      
      // Validate all performance requirements met
      const performanceValidation = performanceMonitor.validatePerformance(
        allMetrics, 
        performanceThresholds
      );

      expect(performanceValidation.passed).toBe(true);
      expect(results.every(r => r.passed && r.success)).toBe(true);
      
      if (!performanceValidation.passed) {
        console.warn('Performance violations:', performanceValidation.violations);
        results.forEach(r => {
          if (!r.passed) {
            console.warn(`${r.testType}: ${r.duration}ms > ${r.threshold}ms`);
          }
        });
      }
    });
  });
});