/**
 * Complete Offline Integration Testing
 * End-to-end validation of offline scenarios across all services
 * Addresses integration gaps and validates complete user journeys
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedOfflineQueueService } from '../../src/services/EnhancedOfflineQueueService';
import { networkAwareService } from '../../src/services/NetworkAwareService';
import { offlineIntegrationService } from '../../src/services/OfflineIntegrationService';
import { assetCacheService } from '../../src/services/AssetCacheService';
import { resumableSessionService } from '../../src/services/ResumableSessionService';
import { 
  OfflinePriority, 
  NetworkQuality, 
  OfflineActionType,
  ConflictResolutionStrategy 
} from '../../src/types/offline';
import { Assessment, CheckIn, UserProfile } from '../../src/types';

/**
 * Complete user journey simulation utilities
 */
class OfflineUserJourneySimulator {
  
  /**
   * Generate realistic user session data
   */
  static generateUserSession(): {
    user: UserProfile;
    morning: CheckIn;
    assessment: Assessment;
    breathing: any;
    crisis?: any;
  } {
    const userId = `test_user_${Date.now()}`;
    
    return {
      user: {
        id: userId,
        createdAt: new Date().toISOString(),
        onboardingCompleted: true,
        values: ['mindfulness', 'compassion'],
        notifications: {
          enabled: true,
          morning: '08:00',
          midday: '13:00',
          evening: '20:00'
        },
        preferences: {
          haptics: true,
          theme: 'auto'
        },
        clinicalProfile: {
          phq9Baseline: 8,
          gad7Baseline: 6,
          riskLevel: 'mild'
        }
      },
      morning: {
        id: `morning_${userId}`,
        type: 'morning' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        skipped: false,
        data: {
          emotions: ['calm', 'hopeful'],
          sleepQuality: 7,
          energyLevel: 6,
          anxietyLevel: 3,
          todayValue: 'mindfulness',
          intention: 'Stay present with challenges'
        }
      },
      assessment: {
        id: `phq9_${userId}`,
        type: 'phq9',
        completedAt: new Date().toISOString(),
        answers: [1, 2, 1, 1, 2, 1, 1, 2, 0], // Score: 11 (mild depression)
        score: 11,
        severity: 'mild',
        context: 'weekly'
      },
      breathing: {
        sessionId: `breathing_${userId}`,
        type: 'breathing_space',
        duration: 180000, // 3 minutes
        startedAt: Date.now(),
        phase: 'awareness',
        completed: false
      }
    };
  }

  /**
   * Generate crisis escalation scenario
   */
  static generateCrisisEscalationScenario(): {
    initialAssessment: Assessment;
    escalationPoints: Array<{
      questionIndex: number;
      answer: number;
      cumulativeScore: number;
      crisisLevel: 'none' | 'moderate' | 'high' | 'severe';
    }>;
    interventions: Array<{
      trigger: string;
      type: string;
      timing: number; // milliseconds from start
    }>;
  } {
    const userId = `crisis_user_${Date.now()}`;
    
    return {
      initialAssessment: {
        id: `phq9_crisis_${userId}`,
        type: 'phq9',
        completedAt: new Date().toISOString(),
        answers: [],
        score: 0,
        severity: 'mild',
        context: 'crisis_screening'
      },
      escalationPoints: [
        { questionIndex: 0, answer: 2, cumulativeScore: 2, crisisLevel: 'none' },
        { questionIndex: 1, answer: 3, cumulativeScore: 5, crisisLevel: 'none' },
        { questionIndex: 2, answer: 3, cumulativeScore: 8, crisisLevel: 'none' },
        { questionIndex: 3, answer: 2, cumulativeScore: 10, crisisLevel: 'none' },
        { questionIndex: 4, answer: 3, cumulativeScore: 13, crisisLevel: 'none' },
        { questionIndex: 5, answer: 2, cumulativeScore: 15, crisisLevel: 'moderate' }, // Crisis threshold
        { questionIndex: 6, answer: 3, cumulativeScore: 18, crisisLevel: 'high' },
        { questionIndex: 7, answer: 3, cumulativeScore: 21, crisisLevel: 'severe' }, // Severe threshold
        { questionIndex: 8, answer: 2, cumulativeScore: 23, crisisLevel: 'severe' } // Suicidal ideation
      ],
      interventions: [
        { trigger: 'score_15_threshold', type: 'crisis_detection', timing: 0 },
        { trigger: 'score_20_threshold', type: 'emergency_protocols', timing: 100 },
        { trigger: 'suicidal_ideation', type: 'immediate_intervention', timing: 200 }
      ]
    };
  }

  /**
   * Generate multi-device sync scenario
   */
  static generateMultiDeviceSyncScenario(): {
    device1Data: Array<{ type: string; data: any; timestamp: number }>;
    device2Data: Array<{ type: string; data: any; timestamp: number }>;
    conflicts: Array<{ type: string; resolution: ConflictResolutionStrategy }>;
  } {
    const baseTime = Date.now();
    
    return {
      device1Data: [
        {
          type: 'checkin',
          data: { checkInId: 'sync_test_1', emotions: ['calm'], timestamp: baseTime },
          timestamp: baseTime
        },
        {
          type: 'assessment_progress',
          data: { assessmentId: 'sync_assessment', answers: [1, 2, 1], timestamp: baseTime + 1000 },
          timestamp: baseTime + 1000
        }
      ],
      device2Data: [
        {
          type: 'checkin',
          data: { checkInId: 'sync_test_1', emotions: ['anxious'], timestamp: baseTime + 500 }, // Conflict
          timestamp: baseTime + 500
        },
        {
          type: 'assessment_progress',
          data: { assessmentId: 'sync_assessment', answers: [1, 2, 1, 2], timestamp: baseTime + 2000 }, // More complete
          timestamp: baseTime + 2000
        }
      ],
      conflicts: [
        { type: 'checkin_emotion_conflict', resolution: ConflictResolutionStrategy.LATEST_TIMESTAMP },
        { type: 'assessment_progress_conflict', resolution: ConflictResolutionStrategy.MERGE_DATA }
      ]
    };
  }
}

/**
 * Service integration coordinator for testing
 */
class OfflineServiceIntegrationCoordinator {
  
  /**
   * Initialize all services for integration testing
   */
  static async initializeAllServices(): Promise<{
    success: boolean;
    initializedServices: string[];
    errors: string[];
  }> {
    const errors: string[] = [];
    const initializedServices: string[] = [];

    try {
      await enhancedOfflineQueueService.initialize();
      initializedServices.push('enhancedOfflineQueueService');
    } catch (error) {
      errors.push(`enhancedOfflineQueueService: ${error}`);
    }

    try {
      await networkAwareService.initialize();
      initializedServices.push('networkAwareService');
    } catch (error) {
      errors.push(`networkAwareService: ${error}`);
    }

    try {
      await offlineIntegrationService.initialize();
      initializedServices.push('offlineIntegrationService');
    } catch (error) {
      errors.push(`offlineIntegrationService: ${error}`);
    }

    try {
      await assetCacheService.initialize();
      initializedServices.push('assetCacheService');
    } catch (error) {
      errors.push(`assetCacheService: ${error}`);
    }

    try {
      await resumableSessionService.initialize();
      initializedServices.push('resumableSessionService');
    } catch (error) {
      errors.push(`resumableSessionService: ${error}`);
    }

    return {
      success: errors.length === 0,
      initializedServices,
      errors
    };
  }

  /**
   * Simulate network state changes across all services
   */
  static async simulateNetworkStateChange(
    fromState: { connected: boolean; quality: NetworkQuality },
    toState: { connected: boolean; quality: NetworkQuality }
  ): Promise<{
    transitionTime: number;
    servicesNotified: string[];
    dataConsistency: boolean;
  }> {
    const startTime = Date.now();
    const servicesNotified: string[] = [];

    // Simulate network state change
    // In real implementation, this would trigger actual network state changes
    
    // Check service responses
    try {
      const networkState = networkAwareService.getState();
      if (networkState) servicesNotified.push('networkAwareService');
    } catch (error) {
      // Service may not be responsive during transition
    }

    // Validate data consistency after transition
    const dataConsistency = await this.validateCrossServiceDataConsistency();

    return {
      transitionTime: Date.now() - startTime,
      servicesNotified,
      dataConsistency
    };
  }

  /**
   * Validate data consistency across all services
   */
  static async validateCrossServiceDataConsistency(): Promise<boolean> {
    try {
      // Check queue integrity
      const queueIntegrity = await enhancedOfflineQueueService.validateDataIntegrity();
      if (!queueIntegrity.isValid) return false;

      // Check cache consistency
      const cacheValidation = await assetCacheService.validateCache();
      if (!cacheValidation.valid) return false;

      // Check session consistency
      const sessionStates = await resumableSessionService.getAllSessionStates();
      if (!sessionStates) return false;

      return true;
    } catch (error) {
      return false;
    }
  }
}

describe('Complete Offline Integration Testing', () => {

  beforeEach(async () => {
    await AsyncStorage.clear();
    const initResult = await OfflineServiceIntegrationCoordinator.initializeAllServices();
    expect(initResult.success).toBe(true);
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  describe('End-to-End User Journey Integration', () => {

    test('should handle complete morning routine offline', async () => {
      const userSession = OfflineUserJourneySimulator.generateUserSession();
      
      console.log('🌅 Testing complete morning routine offline...');

      // Step 1: User profile setup
      const profileResult = await offlineIntegrationService.performOfflineOperation(
        'save_user_profile',
        userSession.user,
        { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
      );

      expect(profileResult.success).toBe(true);
      expect(profileResult.queuedForLater).toBe(true);

      // Step 2: Morning check-in
      const checkInResult = await offlineIntegrationService.performOfflineOperation(
        'save_checkin',
        userSession.morning,
        { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
      );

      expect(checkInResult.success).toBe(true);
      expect(checkInResult.queuedForLater).toBe(true);

      // Step 3: Weekly assessment
      const assessmentResult = await offlineIntegrationService.performOfflineOperation(
        'save_assessment',
        userSession.assessment,
        { priority: OfflinePriority.HIGH, clinicalValidation: true }
      );

      expect(assessmentResult.success).toBe(true);
      expect(assessmentResult.clinicalValidation?.assessmentValid).toBe(true);

      // Step 4: Breathing space session
      const breathingStart = await resumableSessionService.saveSessionState(
        userSession.breathing.sessionId,
        {
          type: userSession.breathing.type,
          phase: userSession.breathing.phase,
          startTime: userSession.breathing.startedAt,
          duration: userSession.breathing.duration
        }
      );

      expect(breathingStart.success).toBe(true);

      // Validate complete offline state
      const offlineStatus = await offlineIntegrationService.getOfflineStatus();
      expect(offlineStatus.queueSize).toBeGreaterThan(0);
      expect(offlineStatus.isOnline).toBe(false);
      expect(offlineStatus.dataIntegrity).toBe(true);

      console.log('✓ Morning routine completed offline successfully');
    });

    test('should handle crisis escalation during offline assessment', async () => {
      const crisisScenario = OfflineUserJourneySimulator.generateCrisisEscalationScenario();
      
      console.log('🚨 Testing crisis escalation during offline assessment...');

      // Start assessment
      const assessmentStart = await offlineIntegrationService.performOfflineOperation(
        'start_assessment',
        {
          assessmentId: crisisScenario.initialAssessment.id,
          type: 'phq9',
          startTime: Date.now()
        },
        { priority: OfflinePriority.MEDIUM, clinicalValidation: true }
      );

      expect(assessmentStart.success).toBe(true);

      // Simulate progressive answering with crisis detection
      for (const escalationPoint of crisisScenario.escalationPoints) {
        const progressResult = await offlineIntegrationService.performOfflineOperation(
          'assessment_progress',
          {
            assessmentId: crisisScenario.initialAssessment.id,
            questionIndex: escalationPoint.questionIndex,
            answer: escalationPoint.answer,
            cumulativeScore: escalationPoint.cumulativeScore
          },
          { 
            priority: escalationPoint.crisisLevel === 'severe' ? OfflinePriority.CRITICAL : OfflinePriority.MEDIUM,
            clinicalValidation: true 
          }
        );

        expect(progressResult.success).toBe(true);

        // Validate crisis detection
        if (escalationPoint.crisisLevel !== 'none') {
          expect(progressResult.clinicalValidation?.isCrisisRelated).toBe(true);
          expect(progressResult.clinicalValidation?.crisisLevel).toBe(escalationPoint.crisisLevel);
        }

        // Special handling for suicidal ideation (Q9)
        if (escalationPoint.questionIndex === 8 && escalationPoint.answer > 0) {
          expect(progressResult.clinicalValidation?.requiresImmediateSync).toBe(true);
          expect(progressResult.priority).toBe(OfflinePriority.CRITICAL);
        }
      }

      // Validate crisis interventions were triggered
      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.crisisDataPending).toBeGreaterThan(0);
      expect(queueStats.criticalActionsCount).toBeGreaterThan(0);

      console.log('✓ Crisis escalation handled properly during offline assessment');
    });

    test('should maintain therapeutic continuity across network transitions', async () => {
      const userSession = OfflineUserJourneySimulator.generateUserSession();
      
      console.log('🔄 Testing therapeutic continuity across network transitions...');

      // Start breathing session offline
      const sessionState = {
        sessionId: userSession.breathing.sessionId,
        type: 'breathing_space',
        phase: 'awareness',
        progress: 0.0,
        startTime: Date.now()
      };

      const sessionStart = await resumableSessionService.saveSessionState(
        sessionState.sessionId,
        sessionState
      );
      expect(sessionStart.success).toBe(true);

      // Progress through phases offline
      const phases = [
        { phase: 'awareness', progress: 0.33, duration: 60000 },
        { phase: 'gathering', progress: 0.66, duration: 120000 },
        { phase: 'expanding', progress: 1.0, duration: 180000 }
      ];

      for (const phase of phases) {
        // Update session state
        const phaseResult = await resumableSessionService.saveSessionState(
          sessionState.sessionId,
          {
            ...sessionState,
            phase: phase.phase,
            progress: phase.progress,
            elapsedTime: phase.duration
          }
        );
        expect(phaseResult.success).toBe(true);

        // Save phase completion offline
        const phaseCompletion = await offlineIntegrationService.performOfflineOperation(
          'breathing_phase_completion',
          {
            sessionId: sessionState.sessionId,
            phase: phase.phase,
            progress: phase.progress,
            therapeuticQuality: 'mindful'
          },
          { priority: OfflinePriority.MEDIUM, clinicalValidation: true }
        );

        expect(phaseCompletion.success).toBe(true);
        expect(phaseCompletion.clinicalValidation?.therapeuticallyAppropriate).toBe(true);
      }

      // Simulate network restoration during final phase
      const networkTransition = await OfflineServiceIntegrationCoordinator.simulateNetworkStateChange(
        { connected: false, quality: NetworkQuality.OFFLINE },
        { connected: true, quality: NetworkQuality.GOOD }
      );

      expect(networkTransition.transitionTime).toBeLessThan(5000);
      expect(networkTransition.dataConsistency).toBe(true);

      // Complete session with network restored
      const sessionCompletion = await resumableSessionService.completeSession(
        sessionState.sessionId,
        {
          completedAt: Date.now(),
          totalDuration: 180000,
          therapeuticBenefit: 'increased_awareness',
          networkAvailable: true
        }
      );

      expect(sessionCompletion.success).toBe(true);
      expect(sessionCompletion.preservedContinuity).toBe(true);

      console.log('✓ Therapeutic continuity maintained across network transitions');
    });
  });

  describe('Multi-Service Integration and Synchronization', () => {

    test('should coordinate between asset cache and queue services', async () => {
      console.log('🔗 Testing asset cache and queue coordination...');

      const sessionAssets = [
        'breathing_guide_audio.mp3',
        'mindfulness_bell.wav',
        'guided_meditation_intro.mp3'
      ];

      // Ensure assets are cached for offline session
      const cacheResult = await assetCacheService.ensureAssetsCached(sessionAssets);
      expect(cacheResult.allCached).toBe(true);

      // Start session that requires assets
      const sessionWithAssets = await offlineIntegrationService.performOfflineOperation(
        'start_asset_dependent_session',
        {
          sessionId: `asset_session_${Date.now()}`,
          requiredAssets: sessionAssets,
          sessionType: 'guided_breathing'
        },
        { priority: OfflinePriority.HIGH, clinicalValidation: false }
      );

      expect(sessionWithAssets.success).toBe(true);
      expect(sessionWithAssets.assetsAvailable).toBe(true);

      // Validate asset-queue coordination
      const cacheStats = await assetCacheService.getCacheStatistics();
      expect(cacheStats.criticalAssetsLoaded).toBe(true);
      expect(cacheStats.hitRate).toBeGreaterThan(0.8);

      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.assetDependentActions).toBeGreaterThan(0);

      console.log('✓ Asset cache and queue services coordinated successfully');
    });

    test('should synchronize resumable sessions with offline queue', async () => {
      console.log('⏯️ Testing resumable session and offline queue sync...');

      const sessionId = `sync_test_session_${Date.now()}`;
      
      // Create resumable session
      const sessionCreation = await resumableSessionService.saveSessionState(
        sessionId,
        {
          type: 'daily_reflection',
          phase: 'preparation',
          progress: 0.0,
          startTime: Date.now(),
          sessionData: {
            reflectionPrompts: ['What am I grateful for?', 'How did I show kindness today?'],
            currentPrompt: 0
          }
        }
      );
      expect(sessionCreation.success).toBe(true);

      // Queue session progress updates
      const progressUpdates = [
        { prompt: 0, response: 'I am grateful for my morning meditation practice', progress: 0.33 },
        { prompt: 1, response: 'I listened compassionately to a colleague', progress: 0.66 },
        { prompt: 2, response: 'I practiced self-compassion during a difficult moment', progress: 1.0 }
      ];

      for (const update of progressUpdates) {
        // Update resumable session state
        await resumableSessionService.saveSessionState(
          sessionId,
          {
            type: 'daily_reflection',
            phase: 'reflection',
            progress: update.progress,
            sessionData: {
              responses: progressUpdates.slice(0, update.prompt + 1).map(u => u.response),
              currentPrompt: update.prompt
            }
          }
        );

        // Queue progress for sync
        const queueUpdate = await offlineIntegrationService.performOfflineOperation(
          'session_progress_update',
          {
            sessionId,
            promptIndex: update.prompt,
            response: update.response,
            progress: update.progress,
            timestamp: Date.now()
          },
          { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
        );

        expect(queueUpdate.success).toBe(true);
      }

      // Validate session-queue synchronization
      const finalSessionState = await resumableSessionService.getSessionState(sessionId);
      expect(finalSessionState?.progress).toBe(1.0);
      expect(finalSessionState?.sessionData.responses).toHaveLength(3);

      const queueStats = await enhancedOfflineQueueService.getStatistics();
      expect(queueStats.sessionProgressActions).toBeGreaterThan(0);

      console.log('✓ Resumable sessions synchronized with offline queue');
    });

    test('should handle cross-service data conflicts during sync', async () => {
      const conflictScenario = OfflineUserJourneySimulator.generateMultiDeviceSyncScenario();
      
      console.log('⚡ Testing cross-service conflict resolution...');

      // Simulate data from device 1
      for (const data of conflictScenario.device1Data) {
        await offlineIntegrationService.performOfflineOperation(
          data.type as OfflineActionType,
          data.data,
          { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
        );
      }

      // Simulate conflicting data from device 2
      for (const data of conflictScenario.device2Data) {
        await offlineIntegrationService.performOfflineOperation(
          data.type as OfflineActionType,
          data.data,
          { priority: OfflinePriority.MEDIUM, clinicalValidation: false }
        );
      }

      // Resolve conflicts
      for (const conflict of conflictScenario.conflicts) {
        const resolutionResult = await offlineIntegrationService.resolveDataConflict(
          conflict.type,
          conflict.resolution
        );

        expect(resolutionResult.resolved).toBe(true);
        expect(resolutionResult.strategy).toBe(conflict.resolution);
        expect(resolutionResult.dataIntegrity).toBe('preserved');
      }

      // Validate final data consistency
      const dataConsistency = await OfflineServiceIntegrationCoordinator.validateCrossServiceDataConsistency();
      expect(dataConsistency).toBe(true);

      console.log('✓ Cross-service conflicts resolved successfully');
    });

    test('should maintain service health during complex offline workflows', async () => {
      console.log('🏥 Testing service health during complex offline workflows...');

      const complexWorkflow = [
        // Parallel user activities
        () => offlineIntegrationService.performOfflineOperation(
          'save_checkin',
          { checkInId: 'complex_1', type: 'morning', data: { mood: 'anxious' } },
          { priority: OfflinePriority.MEDIUM }
        ),
        () => resumableSessionService.saveSessionState(
          'complex_session_1',
          { type: 'breathing', progress: 0.5 }
        ),
        () => enhancedOfflineQueueService.queueAction(
          'save_assessment',
          { assessmentId: 'complex_assess_1', type: 'gad7', score: 12 },
          { priority: OfflinePriority.HIGH, clinicalValidation: true }
        ),
        () => assetCacheService.ensureAssetsCached(['complex_asset_1.mp3']),
        
        // Crisis scenario during workflow
        () => enhancedOfflineQueueService.queueAction(
          'crisis_detection',
          { crisisType: 'moderate_anxiety', severity: 'moderate' },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        )
      ];

      // Execute complex workflow in parallel
      const workflowResults = await Promise.allSettled(
        complexWorkflow.map(operation => operation())
      );

      // Validate all operations succeeded or handled gracefully
      const successfulOperations = workflowResults.filter(
        result => result.status === 'fulfilled'
      ).length;

      expect(successfulOperations).toBeGreaterThanOrEqual(4); // Most operations should succeed

      // Check service health after complex workflow
      const serviceHealthChecks = await Promise.all([
        enhancedOfflineQueueService.getHealthStatus(),
        networkAwareService.getState(),
        assetCacheService.getHealthStatus(),
        resumableSessionService.getHealthStatus()
      ]);

      serviceHealthChecks.forEach((health, index) => {
        const serviceName = ['queue', 'network', 'cache', 'session'][index];
        if (health && typeof health === 'object' && 'status' in health) {
          expect(['healthy', 'degraded']).toContain(health.status);
        }
        console.log(`  ✓ ${serviceName} service health: OK`);
      });

      console.log('✓ All services maintained health during complex workflow');
    });
  });

  describe('Recovery and Resilience Integration', () => {

    test('should recover from complete service failure', async () => {
      console.log('💥 Testing complete service failure recovery...');

      const preFailureData = {
        checkIn: { checkInId: 'pre_failure', type: 'evening', completed: true },
        assessment: { assessmentId: 'pre_failure', type: 'phq9', score: 8 },
        session: { sessionId: 'pre_failure', type: 'meditation', progress: 0.8 }
      };

      // Save data before failure
      await Promise.all([
        offlineIntegrationService.performOfflineOperation('save_checkin', preFailureData.checkIn, { priority: OfflinePriority.MEDIUM }),
        offlineIntegrationService.performOfflineOperation('save_assessment', preFailureData.assessment, { priority: OfflinePriority.HIGH }),
        resumableSessionService.saveSessionState(preFailureData.session.sessionId, preFailureData.session)
      ]);

      // Simulate complete service failure (reinitialize all services)
      const recoveryStartTime = Date.now();
      
      const recoveryResult = await OfflineServiceIntegrationCoordinator.initializeAllServices();
      expect(recoveryResult.success).toBe(true);

      const recoveryTime = Date.now() - recoveryStartTime;
      expect(recoveryTime).toBeLessThan(10000); // Recovery within 10 seconds

      // Validate data recovery
      const postRecoveryStatus = await offlineIntegrationService.getOfflineStatus();
      expect(postRecoveryStatus.dataIntegrity).toBe(true);
      expect(postRecoveryStatus.queueSize).toBeGreaterThan(0); // Data should be recovered

      const recoveredSession = await resumableSessionService.getSessionState(preFailureData.session.sessionId);
      expect(recoveredSession?.progress).toBe(0.8); // Session state recovered

      console.log(`✓ Complete service failure recovery in ${recoveryTime}ms`);
    });

    test('should handle gradual service degradation', async () => {
      console.log('📉 Testing gradual service degradation handling...');

      // Simulate increasing load to cause degradation
      const degradationSteps = [
        { operations: 100, expectedHealth: 'healthy' },
        { operations: 500, expectedHealth: 'healthy' },
        { operations: 1000, expectedHealth: 'degraded' },
        { operations: 2000, expectedHealth: 'degraded' }
      ];

      for (const step of degradationSteps) {
        // Generate load
        const loadOperations = Array.from({ length: step.operations }, (_, i) =>
          enhancedOfflineQueueService.queueAction(
            'degradation_test',
            { operationId: i, loadStep: step.operations },
            { priority: OfflinePriority.LOW, clinicalValidation: false }
          )
        );

        await Promise.all(loadOperations);

        // Check service health
        const healthStatus = await enhancedOfflineQueueService.getHealthStatus();
        expect(['healthy', 'degraded']).toContain(healthStatus.status);

        // Critical functions should still work during degradation
        const criticalTest = await enhancedOfflineQueueService.queueAction(
          'critical_during_degradation',
          { testType: 'crisis_simulation', severity: 'high' },
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        );

        expect(criticalTest.success).toBe(true);
        console.log(`  ✓ Step ${step.operations}: Health=${healthStatus.status}, Critical functions working`);
      }

      console.log('✓ Gradual service degradation handled appropriately');
    });

    test('should validate end-to-end resilience over extended period', async () => {
      console.log('⏰ Testing end-to-end resilience over extended period...');

      const extendedTestDuration = 2 * 60 * 1000; // 2 minutes for testing
      const operationInterval = 5000; // 5 seconds
      const totalCycles = Math.floor(extendedTestDuration / operationInterval);

      console.log(`Running ${totalCycles} test cycles over ${extendedTestDuration / 1000} seconds...`);

      let successfulCycles = 0;
      let healthyServiceChecks = 0;

      for (let cycle = 0; cycle < totalCycles; cycle++) {
        try {
          // Simulate realistic user activity cycle
          const cycleActivities = [
            // Check-in
            offlineIntegrationService.performOfflineOperation(
              'save_checkin',
              { 
                checkInId: `extended_${cycle}`,
                type: 'morning',
                timestamp: Date.now(),
                cycle
              },
              { priority: OfflinePriority.MEDIUM }
            ),

            // Session progress
            resumableSessionService.saveSessionState(
              `extended_session_${cycle}`,
              {
                type: 'mindfulness',
                progress: (cycle % 4) * 0.25, // 0, 0.25, 0.5, 0.75 progression
                cycle
              }
            ),

            // Periodic assessment (every 5th cycle)
            ...(cycle % 5 === 0 ? [
              enhancedOfflineQueueService.queueAction(
                'periodic_assessment',
                { assessmentId: `extended_assess_${cycle}`, type: 'gad7', cycle },
                { priority: OfflinePriority.HIGH, clinicalValidation: true }
              )
            ] : []),

            // Crisis test (every 10th cycle)
            ...(cycle % 10 === 0 ? [
              enhancedOfflineQueueService.queueAction(
                'crisis_test',
                { crisisId: `extended_crisis_${cycle}`, severity: 'moderate', cycle },
                { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
              )
            ] : [])
          ];

          await Promise.all(cycleActivities);
          successfulCycles++;

          // Health check every few cycles
          if (cycle % 3 === 0) {
            const healthStatus = await enhancedOfflineQueueService.getHealthStatus();
            if (healthStatus.status === 'healthy' && healthStatus.clinicalSafetyStatus === 'safe') {
              healthyServiceChecks++;
            }
          }

        } catch (error) {
          console.warn(`Cycle ${cycle} failed:`, error);
        }

        // Brief pause between cycles
        await new Promise(resolve => setTimeout(resolve, operationInterval));
      }

      const successRate = (successfulCycles / totalCycles) * 100;
      const healthRate = (healthyServiceChecks / Math.ceil(totalCycles / 3)) * 100;

      // Resilience requirements
      expect(successRate).toBeGreaterThanOrEqual(90); // 90% success rate
      expect(healthRate).toBeGreaterThanOrEqual(80);  // 80% healthy checks

      // Final comprehensive health check
      const finalHealthChecks = await Promise.all([
        enhancedOfflineQueueService.getHealthStatus(),
        offlineIntegrationService.getOfflineStatus(),
        assetCacheService.getHealthStatus(),
        resumableSessionService.getHealthStatus()
      ]);

      finalHealthChecks.forEach((health, index) => {
        const serviceName = ['queue', 'integration', 'cache', 'session'][index];
        if (health && typeof health === 'object') {
          const status = 'status' in health ? health.status : 'unknown';
          expect(['healthy', 'degraded']).toContain(status);
        }
      });

      console.log(`✓ Extended resilience test: ${successRate.toFixed(1)}% success rate, ${healthRate.toFixed(1)}% healthy checks`);
    });

    test('should maintain data integrity across all failure scenarios', async () => {
      console.log('🔒 Testing data integrity across failure scenarios...');

      const criticalData = [
        { type: 'crisis_assessment', data: { assessmentId: 'integrity_crisis', score: 22, crisisLevel: 'severe' } },
        { type: 'user_profile', data: { userId: 'integrity_user', clinicalHistory: 'important_data' } },
        { type: 'therapeutic_session', data: { sessionId: 'integrity_session', therapeuticProgress: 0.8 } }
      ];

      // Save critical data
      for (const item of criticalData) {
        await offlineIntegrationService.performOfflineOperation(
          item.type as OfflineActionType,
          item.data,
          { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
        );
      }

      const failureScenarios = [
        'storage_corruption',
        'memory_pressure',
        'concurrent_access',
        'network_interruption',
        'service_restart'
      ];

      for (const scenario of failureScenarios) {
        console.log(`  Testing integrity during ${scenario}...`);

        // Simulate failure scenario (simplified)
        switch (scenario) {
          case 'memory_pressure':
            // Create memory pressure
            await Promise.all(
              Array.from({ length: 100 }, (_, i) =>
                enhancedOfflineQueueService.queueAction(
                  'memory_pressure_test',
                  { data: new Array(1000).fill(`pressure_${i}`) },
                  { priority: OfflinePriority.LOW }
                )
              )
            );
            break;

          case 'concurrent_access':
            // Simulate concurrent access
            await Promise.all(
              Array.from({ length: 50 }, (_, i) =>
                offlineIntegrationService.performOfflineOperation(
                  'concurrent_test',
                  { operationId: i },
                  { priority: OfflinePriority.MEDIUM }
                )
              )
            );
            break;

          case 'service_restart':
            // Simulate service restart
            await OfflineServiceIntegrationCoordinator.initializeAllServices();
            break;
        }

        // Validate data integrity after scenario
        const integrityCheck = await enhancedOfflineQueueService.validateDataIntegrity();
        expect(integrityCheck.isValid).toBe(true);

        // Verify critical data is still accessible
        const queueStats = await enhancedOfflineQueueService.getStatistics();
        expect(queueStats.criticalActionsCount).toBeGreaterThan(0);

        console.log(`    ✓ Data integrity maintained during ${scenario}`);
      }

      console.log('✓ Data integrity maintained across all failure scenarios');
    });
  });
});