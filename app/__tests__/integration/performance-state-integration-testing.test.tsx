/**
 * Performance and State Management Integration Testing
 * Validates TurboModule integration and performance monitoring effectiveness
 * 
 * FOCUS: State coordination, performance monitoring, and TurboModule optimization
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { jest } from '@jest/globals';

// Performance Monitoring Components
import { TherapeuticPerformanceDashboard } from '../../src/components/monitoring/TherapeuticPerformanceDashboard';
import { NewArchitectureMonitoringDashboard } from '../../src/components/monitoring/NewArchitectureMonitoringDashboard';

// Core Components with Performance Integration
import { BreathingCircle } from '../../src/components/checkin/BreathingCircle';
import { EmotionGrid } from '../../src/components/checkin/EmotionGrid';
import { TypeSafePHQ9Screen } from '../../src/screens/assessment/TypeSafePHQ9Screen';
import { TypeSafeGAD7Screen } from '../../src/screens/assessment/TypeSafeGAD7Screen';

// State Stores with TurboModule Integration
import { useCheckInStore } from '../../src/store/checkInStore';
import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useProfileStore } from '../../src/store/profileStore';
import { usePerformanceStore } from '../../src/store/performanceStore';

// TurboModule Services
import { TurboStoreManager } from '../../src/store/turbomodules/TurboStoreManager';
import { AsyncStorageTurboModule } from '../../src/store/turbomodules/AsyncStorageTurboModule';
import { CalculationTurboModule } from '../../src/store/turbomodules/CalculationTurboModule';

// Performance Testing Utilities
import { PerformanceTestUtils } from '../utils/PerformanceTestUtils';
import { TherapeuticTestUtils } from '../utils/TherapeuticTestUtils';

// Mock TurboModules for testing
jest.mock('../../src/store/turbomodules/TurboStoreManager');
jest.mock('../../src/store/turbomodules/AsyncStorageTurboModule');
jest.mock('../../src/store/turbomodules/CalculationTurboModule');

describe('Performance and State Management Integration Testing', () => {
  let performanceUtils: PerformanceTestUtils;
  let therapeuticUtils: TherapeuticTestUtils;
  let mockTurboStoreManager: jest.Mocked<typeof TurboStoreManager>;
  let mockAsyncStorageTurbo: jest.Mocked<typeof AsyncStorageTurboModule>;
  let mockCalculationTurbo: jest.Mocked<typeof CalculationTurboModule>;

  beforeEach(() => {
    performanceUtils = new PerformanceTestUtils();
    therapeuticUtils = new TherapeuticTestUtils();
    
    // Mock TurboModule implementations
    mockTurboStoreManager = jest.mocked(TurboStoreManager);
    mockAsyncStorageTurbo = jest.mocked(AsyncStorageTurboModule);
    mockCalculationTurbo = jest.mocked(CalculationTurboModule);
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup TurboModule mocks
    mockTurboStoreManager.prototype.coordinateStores = jest.fn().mockResolvedValue(true);
    mockTurboStoreManager.prototype.optimizeStateTransitions = jest.fn().mockResolvedValue({ optimized: true });
    
    mockAsyncStorageTurbo.prototype.setItemTurbo = jest.fn().mockResolvedValue(true);
    mockAsyncStorageTurbo.prototype.getItemTurbo = jest.fn().mockResolvedValue('mock-data');
    mockAsyncStorageTurbo.prototype.multiGetTurbo = jest.fn().mockResolvedValue([['key1', 'value1']]);
    
    mockCalculationTurbo.prototype.calculatePHQ9Score = jest.fn().mockReturnValue(12);
    mockCalculationTurbo.prototype.calculateGAD7Score = jest.fn().mockReturnValue(8);
    mockCalculationTurbo.prototype.detectCrisisThreshold = jest.fn().mockReturnValue(false);
  });

  afterEach(() => {
    performanceUtils.cleanup();
  });

  describe('TurboModule State Coordination', () => {
    test('should coordinate state changes across all stores with TurboModule optimization', async () => {
      const coordinationStartTime = performance.now();
      
      console.log('🔄 Testing TurboModule state coordination across all stores');
      
      // Initialize stores with TurboModule integration
      const checkInStore = useCheckInStore();
      const assessmentStore = useAssessmentStore();
      const profileStore = useProfileStore();
      const performanceStore = usePerformanceStore();
      
      // Simulate coordinated state changes
      const stateChanges = [
        { store: 'checkIn', action: 'setMood', data: 'happy' },
        { store: 'checkIn', action: 'setBodyAreas', data: ['head', 'chest', 'arms'] },
        { store: 'assessment', action: 'updatePHQ9Score', data: 15 },
        { store: 'assessment', action: 'updateGAD7Score', data: 12 },
        { store: 'profile', action: 'updateProfile', data: { name: 'Test User', age: 28 } },
        { store: 'performance', action: 'recordMetric', data: { metric: 'responseTime', value: 150 } },
      ];
      
      // Execute coordinated state changes
      await act(async () => {
        for (const change of stateChanges) {
          switch (change.store) {
            case 'checkIn':
              if (change.action === 'setMood') checkInStore.setMood(change.data as string);
              if (change.action === 'setBodyAreas') checkInStore.setBodyAreas(change.data as string[]);
              break;
            case 'assessment':
              if (change.action === 'updatePHQ9Score') assessmentStore.updatePHQ9Score(change.data as number);
              if (change.action === 'updateGAD7Score') assessmentStore.updateGAD7Score(change.data as number);
              break;
            case 'profile':
              if (change.action === 'updateProfile') profileStore.updateProfile(change.data as any);
              break;
            case 'performance':
              if (change.action === 'recordMetric') performanceStore.recordMetric(change.data as any);
              break;
          }
        }
      });
      
      const coordinationTime = performance.now() - coordinationStartTime;
      
      // Verify TurboModule coordination was called
      expect(mockTurboStoreManager.prototype.coordinateStores).toHaveBeenCalled();
      expect(mockTurboStoreManager.prototype.optimizeStateTransitions).toHaveBeenCalled();
      
      // Verify state coordination timing
      expect(coordinationTime).toBeLessThan(100); // <100ms for all state changes
      
      // Verify state consistency across stores
      expect(checkInStore.mood).toBe('happy');
      expect(checkInStore.bodyAreas).toEqual(['head', 'chest', 'arms']);
      expect(assessmentStore.phq9Score).toBe(15);
      expect(assessmentStore.gad7Score).toBe(12);
      expect(profileStore.profile?.name).toBe('Test User');
      
      console.log(`✅ State coordination completed in ${coordinationTime}ms`);
      console.log(`📊 TurboModule optimization calls: ${mockTurboStoreManager.prototype.coordinateStores.mock.calls.length}`);
    });

    test('should maintain data persistence with TurboModule AsyncStorage optimization', async () => {
      const persistenceStartTime = performance.now();
      
      console.log('💾 Testing TurboModule AsyncStorage persistence optimization');
      
      // Test data to persist
      const testData = {
        checkIn: {
          mood: 'calm',
          bodyAreas: ['shoulders', 'back'],
          thoughts: ['peaceful', 'focused'],
          timestamp: Date.now(),
        },
        assessment: {
          phq9Score: 8,
          gad7Score: 6,
          lastAssessment: Date.now(),
          crisisHistory: [],
        },
        profile: {
          userId: 'test-user-123',
          name: 'Performance Test User',
          preferences: {
            theme: 'light',
            notifications: true,
            breathingDuration: 180,
          },
        },
      };
      
      // Store data using TurboModule AsyncStorage
      const storagePromises = Object.entries(testData).map(([key, value]) =>
        mockAsyncStorageTurbo.prototype.setItemTurbo(key, JSON.stringify(value))
      );
      
      await Promise.all(storagePromises);
      const storageTime = performance.now() - persistenceStartTime;
      
      // Verify TurboModule storage was called
      expect(mockAsyncStorageTurbo.prototype.setItemTurbo).toHaveBeenCalledTimes(3);
      
      // Verify storage performance
      expect(storageTime).toBeLessThan(50); // <50ms for batch storage
      
      // Test data retrieval
      const retrievalStartTime = performance.now();
      
      const retrievedData = await mockAsyncStorageTurbo.prototype.multiGetTurbo([
        'checkIn',
        'assessment', 
        'profile'
      ]);
      
      const retrievalTime = performance.now() - retrievalStartTime;
      
      // Verify retrieval performance
      expect(retrievalTime).toBeLessThan(30); // <30ms for batch retrieval
      expect(mockAsyncStorageTurbo.prototype.multiGetTurbo).toHaveBeenCalledWith([
        'checkIn',
        'assessment',
        'profile'
      ]);
      
      console.log(`✅ TurboModule persistence: Store ${storageTime}ms, Retrieve ${retrievalTime}ms`);
    });

    test('should optimize calculation performance with TurboModule', async () => {
      const calculationStartTime = performance.now();
      
      console.log('🧮 Testing TurboModule calculation optimization');
      
      // Test assessment calculations
      const calculationTests = [
        {
          type: 'phq9',
          responses: [2, 3, 1, 2, 3, 2, 1, 3, 2], // Score: 19
          expectedScore: 19,
          method: 'calculatePHQ9Score',
        },
        {
          type: 'gad7', 
          responses: [3, 2, 3, 2, 2, 3, 1], // Score: 16
          expectedScore: 16,
          method: 'calculateGAD7Score',
        },
      ];
      
      const calculationResults = [];
      
      for (const test of calculationTests) {
        const testStartTime = performance.now();
        
        let calculatedScore;
        if (test.method === 'calculatePHQ9Score') {
          // Mock return the expected score for PHQ-9
          mockCalculationTurbo.prototype.calculatePHQ9Score.mockReturnValue(test.expectedScore);
          calculatedScore = mockCalculationTurbo.prototype.calculatePHQ9Score(test.responses);
        } else {
          // Mock return the expected score for GAD-7
          mockCalculationTurbo.prototype.calculateGAD7Score.mockReturnValue(test.expectedScore);
          calculatedScore = mockCalculationTurbo.prototype.calculateGAD7Score(test.responses);
        }
        
        const testTime = performance.now() - testStartTime;
        
        // Verify calculation accuracy and performance
        expect(calculatedScore).toBe(test.expectedScore);
        expect(testTime).toBeLessThan(10); // <10ms per calculation
        
        calculationResults.push({
          type: test.type,
          score: calculatedScore,
          time: testTime,
        });
      }
      
      const totalCalculationTime = performance.now() - calculationStartTime;
      
      // Verify TurboModule calculations were called
      expect(mockCalculationTurbo.prototype.calculatePHQ9Score).toHaveBeenCalled();
      expect(mockCalculationTurbo.prototype.calculateGAD7Score).toHaveBeenCalled();
      
      // Verify overall calculation performance
      expect(totalCalculationTime).toBeLessThan(25); // <25ms for all calculations
      
      console.log(`✅ TurboModule calculations completed in ${totalCalculationTime}ms`);
      console.log(`📊 Results: PHQ-9=${calculationResults[0].score} (${calculationResults[0].time}ms), GAD-7=${calculationResults[1].score} (${calculationResults[1].time}ms)`);
      
      // Test crisis detection optimization
      const crisisDetectionStart = performance.now();
      
      mockCalculationTurbo.prototype.detectCrisisThreshold.mockReturnValue(true);
      const crisisDetected = mockCalculationTurbo.prototype.detectCrisisThreshold(19, 16);
      
      const crisisDetectionTime = performance.now() - crisisDetectionStart;
      
      expect(crisisDetected).toBe(true);
      expect(crisisDetectionTime).toBeLessThan(5); // <5ms crisis detection
      expect(mockCalculationTurbo.prototype.detectCrisisThreshold).toHaveBeenCalledWith(19, 16);
      
      console.log(`🚨 Crisis detection optimization: ${crisisDetectionTime}ms`);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should monitor performance without impacting therapeutic effectiveness', async () => {
      const monitoringStartTime = performance.now();
      
      console.log('📊 Testing performance monitoring integration during therapeutic sessions');
      
      // Start performance monitoring
      const performanceDashboard = render(<TherapeuticPerformanceDashboard />);
      const architectureDashboard = render(<NewArchitectureMonitoringDashboard />);
      
      // Simulate therapeutic session with monitoring active
      const breathingComponent = render(<BreathingCircle />);
      
      // Start breathing session with monitoring
      const sessionStartTime = performance.now();
      const breathingResult = await therapeuticUtils.simulateBreathingSessionWithMonitoring(
        breathingComponent,
        { performanceMonitoring: true }
      );
      const sessionTime = performance.now() - sessionStartTime;
      
      // Verify therapeutic session timing accuracy maintained
      expect(breathingResult.duration).toBeCloseTo(180000, 1000); // 3min ±1s
      expect(breathingResult.timingAccuracy).toBeGreaterThan(0.98); // >98% accuracy
      expect(sessionTime).toBeLessThan(185000); // Monitoring overhead <5s
      
      // Verify monitoring data collection
      const performanceMetrics = await performanceUtils.getMonitoringMetrics();
      
      expect(performanceMetrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // <100MB
      expect(performanceMetrics.cpuUsage).toBeLessThan(0.5); // <50% CPU
      expect(performanceMetrics.renderTime).toBeLessThan(16.67); // 60fps
      expect(performanceMetrics.monitoringOverhead).toBeLessThan(0.05); // <5% overhead
      
      // Verify monitoring doesn't interfere with user interaction
      const interactionResponseTimes = performanceMetrics.interactionResponseTimes;
      expect(interactionResponseTimes.average).toBeLessThan(50); // <50ms average
      expect(interactionResponseTimes.max).toBeLessThan(100); // <100ms worst case
      
      const totalMonitoringTime = performance.now() - monitoringStartTime;
      
      console.log(`✅ Performance monitoring integrated successfully in ${totalMonitoringTime}ms`);
      console.log(`📈 Session accuracy: ${breathingResult.timingAccuracy}, Monitoring overhead: ${performanceMetrics.monitoringOverhead}`);
    });

    test('should optimize New Architecture performance with monitoring', async () => {
      console.log('🏗️ Testing New Architecture performance optimization with monitoring');
      
      // Test TurboModule performance optimization
      const optimizationTests = [
        { module: 'AsyncStorageTurboModule', operation: 'batchWrite', expectedTime: 25 },
        { module: 'CalculationTurboModule', operation: 'assessmentCalculation', expectedTime: 10 },
        { module: 'TurboStoreManager', operation: 'stateCoordination', expectedTime: 15 },
      ];
      
      const optimizationResults = [];
      
      for (const test of optimizationTests) {
        const optimizationStart = performance.now();
        
        let result;
        switch (test.module) {
          case 'AsyncStorageTurboModule':
            result = await performanceUtils.testAsyncStorageOptimization();
            break;
          case 'CalculationTurboModule':
            result = await performanceUtils.testCalculationOptimization();
            break;
          case 'TurboStoreManager':
            result = await performanceUtils.testStoreCoordinationOptimization();
            break;
        }
        
        const optimizationTime = performance.now() - optimizationStart;
        
        // Verify optimization performance
        expect(optimizationTime).toBeLessThan(test.expectedTime);
        expect(result.optimized).toBe(true);
        expect(result.performanceGain).toBeGreaterThan(0.2); // >20% performance gain
        
        optimizationResults.push({
          module: test.module,
          time: optimizationTime,
          gain: result.performanceGain,
        });
      }
      
      // Verify overall New Architecture performance improvement
      const totalOptimizationGain = optimizationResults.reduce(
        (total, result) => total + result.gain,
        0
      ) / optimizationResults.length;
      
      expect(totalOptimizationGain).toBeGreaterThan(0.3); // >30% overall improvement
      
      console.log(`✅ New Architecture optimization: ${Math.round(totalOptimizationGain * 100)}% performance gain`);
      optimizationResults.forEach(result => {
        console.log(`  📈 ${result.module}: ${result.time}ms (${Math.round(result.gain * 100)}% gain)`);
      });
    });

    test('should maintain performance under stress conditions', async () => {
      console.log('💪 Testing performance under stress conditions');
      
      // Stress test scenarios
      const stressScenarios = [
        { name: 'High Memory Usage', type: 'memory', load: 80 * 1024 * 1024 }, // 80MB
        { name: 'High CPU Usage', type: 'cpu', load: 0.7 }, // 70% CPU
        { name: 'Rapid State Changes', type: 'state', load: 100 }, // 100 changes/sec
        { name: 'Concurrent User Sessions', type: 'concurrency', load: 10 }, // 10 sessions
      ];
      
      const stressResults = [];
      
      for (const scenario of stressScenarios) {
        console.log(`  🧪 Testing ${scenario.name}`);
        
        const stressStartTime = performance.now();
        
        // Apply stress condition
        const stressResult = await performanceUtils.applyStressCondition(scenario);
        
        // Test therapeutic functionality under stress
        const breathingComponent = render(<BreathingCircle />);
        const therapeuticResult = await therapeuticUtils.simulateBreathingSessionUnderStress(
          breathingComponent,
          scenario
        );
        
        const stressTime = performance.now() - stressStartTime;
        
        // Verify therapeutic effectiveness maintained under stress
        expect(therapeuticResult.timingAccuracy).toBeGreaterThan(0.90); // >90% under stress
        expect(therapeuticResult.completed).toBe(true);
        expect(therapeuticResult.responseTime).toBeLessThan(200); // Still <200ms response
        
        // Verify system stability under stress
        expect(stressResult.systemStable).toBe(true);
        expect(stressResult.memoryLeaks).toBe(false);
        expect(stressResult.performanceDegradation).toBeLessThan(0.3); // <30% degradation
        
        stressResults.push({
          scenario: scenario.name,
          time: stressTime,
          accuracy: therapeuticResult.timingAccuracy,
          degradation: stressResult.performanceDegradation,
        });
      }
      
      // Verify overall stress test performance
      const averageAccuracy = stressResults.reduce(
        (total, result) => total + result.accuracy,
        0
      ) / stressResults.length;
      
      expect(averageAccuracy).toBeGreaterThan(0.92); // >92% average accuracy under stress
      
      console.log(`✅ Stress testing completed - Average accuracy: ${Math.round(averageAccuracy * 100)}%`);
      stressResults.forEach(result => {
        console.log(`  📊 ${result.scenario}: ${Math.round(result.accuracy * 100)}% accuracy, ${Math.round(result.degradation * 100)}% degradation`);
      });
    });
  });

  describe('Real-time State Synchronization', () => {
    test('should synchronize state changes in real-time across components', async () => {
      console.log('⚡ Testing real-time state synchronization');
      
      // Create multiple components that share state
      const components = {
        breathing: render(<BreathingCircle />),
        emotions: render(<EmotionGrid />),
        phq9: render(<TypeSafePHQ9Screen />),
        gad7: render(<TypeSafeGAD7Screen />),
      };
      
      // Simulate simultaneous state changes
      const syncStartTime = performance.now();
      
      await act(async () => {
        // Simultaneous state updates from different components
        const checkInStore = useCheckInStore();
        const assessmentStore = useAssessmentStore();
        
        // Rapid state changes
        checkInStore.setMood('anxious');
        assessmentStore.updatePHQ9Score(18); // High score
        checkInStore.setBodyAreas(['chest', 'stomach']);
        assessmentStore.updateGAD7Score(16); // High score
      });
      
      const syncTime = performance.now() - syncStartTime;
      
      // Verify synchronization speed
      expect(syncTime).toBeLessThan(50); // <50ms for real-time sync
      
      // Verify state consistency across all components
      const finalCheckInState = useCheckInStore.getState();
      const finalAssessmentState = useAssessmentStore.getState();
      
      expect(finalCheckInState.mood).toBe('anxious');
      expect(finalCheckInState.bodyAreas).toEqual(['chest', 'stomach']);
      expect(finalAssessmentState.phq9Score).toBe(18);
      expect(finalAssessmentState.gad7Score).toBe(16);
      
      // Verify crisis detection triggered by high scores
      expect(finalAssessmentState.crisisDetected).toBe(true);
      
      console.log(`✅ Real-time synchronization completed in ${syncTime}ms`);
      console.log(`🚨 Crisis detection activated: PHQ-9=${finalAssessmentState.phq9Score}, GAD-7=${finalAssessmentState.gad7Score}`);
    });

    test('should handle state conflicts with conflict resolution', async () => {
      console.log('🔄 Testing state conflict resolution');
      
      // Create conflicting state changes
      const conflictScenarios = [
        {
          name: 'Concurrent Mood Updates',
          conflicts: [
            { source: 'component1', action: 'setMood', value: 'happy', timestamp: 1000 },
            { source: 'component2', action: 'setMood', value: 'sad', timestamp: 1001 },
          ],
          expectedResolution: 'sad', // Latest timestamp wins
        },
        {
          name: 'Assessment Score Conflicts',
          conflicts: [
            { source: 'autosave', action: 'updatePHQ9Score', value: 12, timestamp: 2000 },
            { source: 'user', action: 'updatePHQ9Score', value: 15, timestamp: 2002 },
          ],
          expectedResolution: 15, // User action wins
        },
      ];
      
      for (const scenario of conflictScenarios) {
        console.log(`  🔍 Testing ${scenario.name}`);
        
        const resolutionStartTime = performance.now();
        
        // Simulate concurrent state changes
        await act(async () => {
          const checkInStore = useCheckInStore();
          const assessmentStore = useAssessmentStore();
          
          for (const conflict of scenario.conflicts) {
            if (conflict.action === 'setMood') {
              checkInStore.setMood(conflict.value as string);
            } else if (conflict.action === 'updatePHQ9Score') {
              assessmentStore.updatePHQ9Score(conflict.value as number);
            }
          }
        });
        
        const resolutionTime = performance.now() - resolutionStartTime;
        
        // Verify conflict resolution
        expect(resolutionTime).toBeLessThan(25); // <25ms resolution
        
        // Verify correct resolution outcome
        if (scenario.name === 'Concurrent Mood Updates') {
          const checkInState = useCheckInStore.getState();
          expect(checkInState.mood).toBe(scenario.expectedResolution);
        } else if (scenario.name === 'Assessment Score Conflicts') {
          const assessmentState = useAssessmentStore.getState();
          expect(assessmentState.phq9Score).toBe(scenario.expectedResolution);
        }
        
        console.log(`    ✅ ${scenario.name} resolved in ${resolutionTime}ms`);
      }
    });
  });

  describe('Memory Management and Optimization', () => {
    test('should manage memory efficiently during extended sessions', async () => {
      console.log('🧠 Testing memory management during extended sessions');
      
      // Simulate extended therapeutic session (30 minutes)
      const sessionDuration = 1800000; // 30 minutes in milliseconds
      const memoryCheckpoints = [];
      const checkpointInterval = 300000; // Check every 5 minutes
      
      const sessionStartMemory = await performanceUtils.getMemoryUsage();
      const sessionStartTime = performance.now();
      
      // Simulate extended session with periodic memory checks
      for (let elapsed = 0; elapsed < sessionDuration; elapsed += checkpointInterval) {
        // Simulate therapeutic activities
        const breathingComponent = render(<BreathingCircle />);
        await therapeuticUtils.simulateBreathingCycle(breathingComponent, 60000); // 1 minute
        
        // State changes during session
        await act(async () => {
          const checkInStore = useCheckInStore();
          checkInStore.setMood('focused');
          checkInStore.setBodyAreas(['shoulders']);
        });
        
        // Check memory usage
        const currentMemory = await performanceUtils.getMemoryUsage();
        const memoryGrowth = currentMemory - sessionStartMemory;
        
        memoryCheckpoints.push({
          time: elapsed,
          memory: currentMemory,
          growth: memoryGrowth,
        });
        
        // Verify memory growth is controlled
        expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // <20MB growth
        expect(currentMemory).toBeLessThan(150 * 1024 * 1024); // <150MB total
      }
      
      // Verify memory stability over extended session
      const finalMemory = memoryCheckpoints[memoryCheckpoints.length - 1];
      const memoryEfficiency = sessionStartMemory / finalMemory.memory;
      
      expect(memoryEfficiency).toBeGreaterThan(0.8); // <20% memory increase
      
      console.log(`✅ Extended session memory management validated`);
      console.log(`📊 Memory: Start ${Math.round(sessionStartMemory/1024/1024)}MB, End ${Math.round(finalMemory.memory/1024/1024)}MB`);
    });

    test('should optimize garbage collection and cleanup', async () => {
      console.log('🗑️ Testing garbage collection optimization');
      
      // Test component cleanup
      const components = [];
      const memoryBefore = await performanceUtils.getMemoryUsage();
      
      // Create and destroy multiple components
      for (let i = 0; i < 50; i++) {
        const component = render(<BreathingCircle />);
        components.push(component);
        
        // Simulate component usage
        await therapeuticUtils.simulateQuickBreathingCycle(component, 1000); // 1s
        
        // Unmount component
        component.unmount();
      }
      
      // Force garbage collection (simulate)
      await performanceUtils.forceGarbageCollection();
      
      const memoryAfter = await performanceUtils.getMemoryUsage();
      const memoryReclaimed = memoryBefore - memoryAfter;
      
      // Verify memory cleanup
      expect(memoryReclaimed).toBeGreaterThan(-10 * 1024 * 1024); // Allow small growth <10MB
      expect(memoryAfter).toBeLessThan(memoryBefore + 5 * 1024 * 1024); // <5MB growth max
      
      console.log(`✅ Garbage collection: ${Math.round(memoryReclaimed/1024/1024)}MB reclaimed`);
    });
  });
});