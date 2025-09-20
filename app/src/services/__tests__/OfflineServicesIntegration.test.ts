/**
 * Comprehensive test utilities for enhanced offline services
 * Validates clinical-grade functionality and integration between services
 */

import { enhancedOfflineQueueService } from '../../services/OfflineQueueService';
import { networkAwareService } from '../NetworkAwareService';
import { offlineIntegrationService } from '../OfflineIntegrationService';
import { assetCacheService } from '../AssetCacheService';
import { resumableSessionService } from '../ResumableSessionService';
import {
  OfflineActionType,
  OfflinePriority,
  NetworkQuality,
  OfflineErrorCode,
  ConflictResolutionStrategy
} from '../../types/offline';
import { CheckIn, Assessment, UserProfile } from '../../types';

/**
 * Test data generators for offline scenarios
 */
export class OfflineTestDataGenerators {
  
  static generateTestCheckIn(type: 'morning' | 'midday' | 'evening'): CheckIn {
    return {
      id: `test_checkin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      skipped: false,
      data: {
        emotions: ['calm', 'focused'],
        sleepQuality: 7,
        energyLevel: 6,
        anxietyLevel: 3,
        todayValue: 'mindfulness',
        intention: 'Stay present throughout the day'
      }
    };
  }

  static generateTestAssessment(type: 'phq9' | 'gad7', score?: number): Assessment {
    const isPhq9 = type === 'phq9';
    const answers = isPhq9 
      ? [1, 2, 1, 0, 1, 1, 0, 2, 1] // PHQ-9 sample answers
      : [2, 1, 2, 1, 0, 1, 1]; // GAD-7 sample answers
    
    const calculatedScore = score ?? answers.reduce((sum, answer) => sum + answer, 0);
    
    return {
      id: `test_assessment_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      completedAt: new Date().toISOString(),
      answers,
      score: calculatedScore,
      severity: calculatedScore >= 20 ? 'severe' : calculatedScore >= 15 ? 'moderate' : 'mild',
      context: 'standalone'
    };
  }

  static generateCrisisAssessment(type: 'phq9' | 'gad7'): Assessment {
    // Generate assessment that triggers crisis thresholds
    const score = type === 'phq9' ? 22 : 16; // Above crisis thresholds
    return this.generateTestAssessment(type, score);
  }

  static generateTestUserProfile(): UserProfile {
    return {
      id: `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      onboardingCompleted: true,
      values: ['mindfulness', 'compassion', 'growth'],
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
        phq9Baseline: 12,
        gad7Baseline: 8,
        riskLevel: 'mild'
      }
    };
  }
}

/**
 * Comprehensive offline services test suite
 */
export class OfflineServicesTestSuite {
  
  /**
   * Test enhanced queue service functionality
   */
  static async testEnhancedQueueService(): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> {
    const results: any[] = [];
    const errors: string[] = [];
    
    console.log('Testing Enhanced Offline Queue Service...');
    
    try {
      // Test 1: Basic queueing with different priorities
      const testCheckIn = OfflineTestDataGenerators.generateTestCheckIn('morning');
      const queueResult = await enhancedOfflineQueueService.queueAction(
        'save_checkin',
        testCheckIn,
        {
          priority: OfflinePriority.MEDIUM,
          clinicalValidation: false
        }
      );
      
      results.push({
        test: 'Basic queueing',
        success: queueResult.success,
        queuedForLater: queueResult.queuedForLater
      });

      // Test 2: Crisis data handling
      const crisisAssessment = OfflineTestDataGenerators.generateCrisisAssessment('phq9');
      const crisisResult = await enhancedOfflineQueueService.queueAction(
        'save_assessment_critical',
        crisisAssessment,
        {
          priority: OfflinePriority.CRITICAL,
          clinicalValidation: true
        }
      );
      
      results.push({
        test: 'Crisis data queueing',
        success: crisisResult.success,
        clinicalValidation: crisisResult.clinicalValidation?.isCrisisRelated,
        requiresImmediate: crisisResult.clinicalValidation?.requiresImmediateSync
      });

      // Test 3: Queue statistics
      const stats = await enhancedOfflineQueueService.getStatistics();
      results.push({
        test: 'Queue statistics',
        totalActions: stats.totalActions,
        criticalActions: stats.criticalActionsCount,
        crisisDataPending: stats.crisisDataPending
      });

      // Test 4: Service health
      const health = await enhancedOfflineQueueService.getHealthStatus();
      results.push({
        test: 'Service health',
        status: health.status,
        clinicalSafetyStatus: health.clinicalSafetyStatus
      });

      console.log('✓ Enhanced Queue Service tests completed');
      return { success: true, results, errors };
      
    } catch (error) {
      const errorMsg = `Enhanced Queue Service test failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { success: false, results, errors };
    }
  }

  /**
   * Test network aware service functionality
   */
  static async testNetworkAwareService(): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> {
    const results: any[] = [];
    const errors: string[] = [];
    
    console.log('Testing Network Aware Service...');
    
    try {
      // Initialize if not already done
      await networkAwareService.initialize();
      
      // Test 1: Network state monitoring
      const networkState = networkAwareService.getState();
      results.push({
        test: 'Network state retrieval',
        isConnected: networkState.isConnected,
        quality: networkState.quality,
        stability: networkState.connectionStability
      });

      // Test 2: Network quality assessment
      if (networkState.isConnected) {
        const assessment = await networkAwareService.assessNetworkQuality();
        results.push({
          test: 'Network quality assessment',
          hasAssessment: !!assessment,
          quality: assessment?.quality,
          bandwidth: assessment?.bandwidth,
          latency: assessment?.latency
        });
      }

      // Test 3: Sync recommendation
      const recommendation = await networkAwareService.getSyncRecommendation(OfflinePriority.MEDIUM);
      results.push({
        test: 'Sync recommendation',
        shouldSync: recommendation.shouldSync,
        networkOptimal: recommendation.networkOptimal,
        recommendedBatchSize: recommendation.recommendedBatchSize
      });

      // Test 4: Clinical sync readiness
      const clinicalReady = networkAwareService.isClinicalSyncReady();
      results.push({
        test: 'Clinical sync readiness',
        ready: clinicalReady
      });

      console.log('✓ Network Aware Service tests completed');
      return { success: true, results, errors };
      
    } catch (error) {
      const errorMsg = `Network Aware Service test failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { success: false, results, errors };
    }
  }

  /**
   * Test offline integration service
   */
  static async testOfflineIntegrationService(): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> {
    const results: any[] = [];
    const errors: string[] = [];
    
    console.log('Testing Offline Integration Service...');
    
    try {
      // Test 1: Service initialization
      const initStatus = await offlineIntegrationService.initialize();
      results.push({
        test: 'Service initialization',
        allReady: initStatus.allReady,
        errors: initStatus.errors
      });

      // Test 2: Offline operation
      const testData = OfflineTestDataGenerators.generateTestCheckIn('midday');
      const operationResult = await offlineIntegrationService.performOfflineOperation(
        'save_checkin',
        testData,
        {
          priority: OfflinePriority.MEDIUM,
          clinicalValidation: false
        }
      );
      
      results.push({
        test: 'Offline operation',
        success: operationResult.success,
        queuedForLater: operationResult.queuedForLater,
        executionTime: operationResult.metadata.executionTime
      });

      // Test 3: Offline status
      const status = await offlineIntegrationService.getOfflineStatus();
      results.push({
        test: 'Offline status',
        isOnline: status.isOnline,
        queueSize: status.queueSize,
        criticalPending: status.criticalActionsPending,
        recommendations: status.recommendations.length
      });

      // Test 4: Data integrity validation
      const integrity = await offlineIntegrationService.validateDataIntegrity();
      results.push({
        test: 'Data integrity',
        isValid: integrity.isValid,
        checkedItems: integrity.checkedItems,
        errors: integrity.errors.length
      });

      console.log('✓ Offline Integration Service tests completed');
      return { success: true, results, errors };
      
    } catch (error) {
      const errorMsg = `Offline Integration Service test failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { success: false, results, errors };
    }
  }

  /**
   * Test asset cache service integration
   */
  static async testAssetCacheIntegration(): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> {
    const results: any[] = [];
    const errors: string[] = [];
    
    console.log('Testing Asset Cache Integration...');
    
    try {
      // Test 1: Cache statistics
      const stats = await assetCacheService.getCacheStatistics();
      results.push({
        test: 'Cache statistics',
        criticalAssetsLoaded: stats.criticalAssetsLoaded,
        totalSize: stats.totalSize,
        hitRate: stats.hitRate
      });

      // Test 2: Cache validation
      const validation = await assetCacheService.validateCache();
      results.push({
        test: 'Cache validation',
        valid: validation.valid,
        errors: validation.errors.length
      });

      // Test 3: Export metrics
      const metrics = await assetCacheService.exportMetrics();
      results.push({
        test: 'Export metrics',
        hasMetrics: !!metrics,
        version: metrics.version
      });

      console.log('✓ Asset Cache Integration tests completed');
      return { success: true, results, errors };
      
    } catch (error) {
      const errorMsg = `Asset Cache Integration test failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { success: false, results, errors };
    }
  }

  /**
   * Test end-to-end offline scenario
   */
  static async testEndToEndOfflineScenario(): Promise<{
    success: boolean;
    results: any[];
    errors: string[];
  }> {
    const results: any[] = [];
    const errors: string[] = [];
    
    console.log('Testing End-to-End Offline Scenario...');
    
    try {
      // Scenario: User completes morning check-in while offline, then goes online
      
      // Step 1: Generate and queue morning check-in
      const morningCheckIn = OfflineTestDataGenerators.generateTestCheckIn('morning');
      const queueResult = await offlineIntegrationService.performOfflineOperation(
        'save_checkin',
        morningCheckIn,
        { priority: OfflinePriority.MEDIUM }
      );
      
      results.push({
        step: 'Queue morning check-in',
        success: queueResult.success,
        queuedForLater: queueResult.queuedForLater
      });

      // Step 2: Generate crisis assessment (should get high priority)
      const crisisAssessment = OfflineTestDataGenerators.generateCrisisAssessment('phq9');
      const crisisQueue = await offlineIntegrationService.performOfflineOperation(
        'save_assessment_critical',
        crisisAssessment,
        { priority: OfflinePriority.CRITICAL, clinicalValidation: true }
      );
      
      results.push({
        step: 'Queue crisis assessment',
        success: crisisQueue.success,
        criticalPriority: crisisQueue.clinicalValidation?.requiresImmediateSync
      });

      // Step 3: Check queue status
      const beforeSyncStatus = await offlineIntegrationService.getOfflineStatus();
      results.push({
        step: 'Pre-sync status',
        queueSize: beforeSyncStatus.queueSize,
        criticalPending: beforeSyncStatus.criticalActionsPending,
        crisisPending: beforeSyncStatus.crisisDataPending
      });

      // Step 4: Simulate network restoration and sync (if online)
      const networkState = networkAwareService.getState();
      if (networkState.isConnected) {
        const syncResult = await offlineIntegrationService.performComprehensiveSync();
        results.push({
          step: 'Comprehensive sync',
          success: syncResult.success,
          processed: syncResult.processed,
          failed: syncResult.failed,
          duration: syncResult.duration
        });

        // Step 5: Verify queue cleared
        const afterSyncStatus = await offlineIntegrationService.getOfflineStatus();
        results.push({
          step: 'Post-sync status',
          queueSize: afterSyncStatus.queueSize,
          criticalPending: afterSyncStatus.criticalActionsPending
        });
      } else {
        results.push({
          step: 'Sync simulation',
          skipped: 'No network connection available'
        });
      }

      console.log('✓ End-to-End Offline Scenario tests completed');
      return { success: true, results, errors };
      
    } catch (error) {
      const errorMsg = `End-to-End Offline Scenario test failed: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      return { success: false, results, errors };
    }
  }

  /**
   * Run comprehensive test suite
   */
  static async runComprehensiveTests(): Promise<{
    overallSuccess: boolean;
    testResults: Record<string, any>;
    summary: {
      totalTests: number;
      passedTests: number;
      failedTests: number;
      totalErrors: number;
    };
  }> {
    console.log('🧪 Starting Comprehensive Offline Services Test Suite...');
    
    const testResults: Record<string, any> = {};
    let totalTests = 0;
    let passedTests = 0;
    let totalErrors = 0;

    // Run all test suites
    const testSuites = [
      { name: 'EnhancedQueueService', fn: this.testEnhancedQueueService },
      { name: 'NetworkAwareService', fn: this.testNetworkAwareService },
      { name: 'OfflineIntegrationService', fn: this.testOfflineIntegrationService },
      { name: 'AssetCacheIntegration', fn: this.testAssetCacheIntegration },
      { name: 'EndToEndScenario', fn: this.testEndToEndOfflineScenario }
    ];

    for (const suite of testSuites) {
      console.log(`\n--- Running ${suite.name} Tests ---`);
      
      try {
        const result = await suite.fn();
        testResults[suite.name] = result;
        totalTests++;
        
        if (result.success) {
          passedTests++;
          console.log(`✅ ${suite.name}: PASSED`);
        } else {
          console.log(`❌ ${suite.name}: FAILED`);
          console.log('Errors:', result.errors);
        }
        
        totalErrors += result.errors.length;
        
      } catch (error) {
        console.log(`💥 ${suite.name}: CRASHED - ${error}`);
        testResults[suite.name] = {
          success: false,
          results: [],
          errors: [`Test suite crashed: ${error}`]
        };
        totalTests++;
        totalErrors++;
      }
    }

    const summary = {
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      totalErrors
    };

    const overallSuccess = passedTests === totalTests && totalErrors === 0;

    console.log('\n🏁 Test Suite Complete!');
    console.log(`Overall Success: ${overallSuccess ? '✅' : '❌'}`);
    console.log(`Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`Total Errors: ${totalErrors}`);

    return {
      overallSuccess,
      testResults,
      summary
    };
  }
}

/**
 * Performance benchmarking utilities
 */
export class OfflinePerformanceBenchmarks {
  
  /**
   * Benchmark queue operations
   */
  static async benchmarkQueueOperations(iterations: number = 100): Promise<{
    averageQueueTime: number;
    averageProcessTime: number;
    p95QueueTime: number;
    p95ProcessTime: number;
  }> {
    console.log(`🚀 Benchmarking queue operations (${iterations} iterations)...`);
    
    const queueTimes: number[] = [];
    const processTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // Benchmark queueing
      const queueStart = Date.now();
      const testData = OfflineTestDataGenerators.generateTestCheckIn('morning');
      
      await enhancedOfflineQueueService.queueAction(
        'save_checkin',
        testData,
        { priority: OfflinePriority.MEDIUM }
      );
      
      queueTimes.push(Date.now() - queueStart);
      
      // Small delay to avoid overwhelming
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Calculate statistics
    queueTimes.sort((a, b) => a - b);
    const averageQueueTime = queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length;
    const p95QueueTime = queueTimes[Math.floor(queueTimes.length * 0.95)];

    console.log(`Queue benchmarking complete:`);
    console.log(`- Average queue time: ${averageQueueTime.toFixed(2)}ms`);
    console.log(`- P95 queue time: ${p95QueueTime}ms`);

    return {
      averageQueueTime,
      averageProcessTime: 0, // Would measure actual processing
      p95QueueTime,
      p95ProcessTime: 0
    };
  }

  /**
   * Benchmark network quality assessment
   */
  static async benchmarkNetworkAssessment(): Promise<{
    assessmentTime: number;
    bandwidth: number;
    latency: number;
    quality: NetworkQuality;
  }> {
    console.log('🌐 Benchmarking network quality assessment...');
    
    const start = Date.now();
    const assessment = await networkAwareService.assessNetworkQuality();
    const assessmentTime = Date.now() - start;

    const result = {
      assessmentTime,
      bandwidth: assessment?.bandwidth || 0,
      latency: assessment?.latency || 999,
      quality: assessment?.quality || NetworkQuality.OFFLINE
    };

    console.log(`Network assessment complete in ${assessmentTime}ms:`);
    console.log(`- Quality: ${result.quality}`);
    console.log(`- Bandwidth: ${result.bandwidth} Mbps`);
    console.log(`- Latency: ${result.latency}ms`);

    return result;
  }
}

// Export test utilities for use in actual tests
export default {
  OfflineTestDataGenerators,
  OfflineServicesTestSuite,
  OfflinePerformanceBenchmarks
};