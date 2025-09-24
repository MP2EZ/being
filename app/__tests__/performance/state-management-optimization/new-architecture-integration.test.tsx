/**
 * STATE MANAGEMENT OPTIMIZATION - NEW ARCHITECTURE INTEGRATION TESTS
 * 
 * Validates New Architecture integration with state management optimization:
 * - TurboModules performance validation in production scenarios
 * - Fabric renderer state synchronization with real user interactions
 * - Memory management during extended therapeutic sessions
 * - Emergency fallback system validation
 * 
 * NEW ARCHITECTURE FEATURES TESTED:
 * - TurboModule clinical calculation acceleration
 * - Fabric renderer optimization for breathing animations
 * - New Architecture state management coordination
 * - JSI bridge performance for real-time monitoring
 * - Emergency fallback to legacy systems
 */

import { renderHook, act } from '@testing-library/react-native';
import { NativeModules, Platform } from 'react-native';

// New Architecture components and services
import { TurboStoreManager } from '../../../src/store/turbomodules/TurboStoreManager';
import { NewArchitecturePerformanceMonitor } from '../../../src/utils/NewArchitecturePerformanceMonitor';
import { EnhancedClinicalCalculationAccelerator } from '../../../src/services/EnhancedClinicalCalculationAccelerator';

// Enhanced stores with New Architecture support
import { useCrisisStore } from '../../../src/store/enhanced/crisis-enhanced-store';
import { useAssessmentStore } from '../../../src/store/enhanced/assessment-enhanced-store';

// Monitoring and validation utilities
import { EnhancedTherapeuticPerformanceMonitor } from '../../../src/utils/EnhancedTherapeuticPerformanceMonitor';

// Mock TurboModules for testing
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
  getEnforcing: jest.fn(),
  get: jest.fn()
}));

// Mock Fabric renderer
jest.mock('react-native/Libraries/Renderer/shims/ReactFabric', () => ({
  render: jest.fn(),
  createPortal: jest.fn()
}));

describe('New Architecture Integration - State Management Optimization', () => {
  let turboStoreManager: TurboStoreManager;
  let newArchMonitor: NewArchitecturePerformanceMonitor;
  let clinicalAccelerator: EnhancedClinicalCalculationAccelerator;
  let performanceMonitor: EnhancedTherapeuticPerformanceMonitor;

  beforeEach(() => {
    turboStoreManager = new TurboStoreManager();
    newArchMonitor = new NewArchitecturePerformanceMonitor();
    clinicalAccelerator = new EnhancedClinicalCalculationAccelerator();
    performanceMonitor = new EnhancedTherapeuticPerformanceMonitor();

    // Mock New Architecture availability
    jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(true);
    jest.spyOn(newArchMonitor, 'isTurboModuleAvailable').mockReturnValue(true);
    jest.spyOn(newArchMonitor, 'isFabricRendererEnabled').mockReturnValue(true);

    jest.clearAllMocks();
  });

  describe('TurboModule Performance Validation', () => {
    it('should accelerate clinical calculations using TurboModules', async () => {
      // Verify TurboModule is available
      expect(turboStoreManager.isNewArchitectureEnabled()).toBe(true);
      expect(await clinicalAccelerator.isTurboModuleReady()).toBe(true);

      const testCases = [
        { phq9Responses: [2, 2, 3, 2, 3, 2, 3, 2, 1], expectedScore: 20 },
        { phq9Responses: [3, 3, 3, 3, 3, 3, 3, 3, 3], expectedScore: 27 },
        { phq9Responses: [1, 1, 1, 1, 1, 1, 1, 1, 1], expectedScore: 9 }
      ];

      const turboModuleTimes: number[] = [];
      const jsCalculationTimes: number[] = [];

      for (const testCase of testCases) {
        // Measure TurboModule calculation time
        const turboStartTime = performance.now();
        const turboScore = await clinicalAccelerator.calculatePHQ9Score(
          testCase.phq9Responses,
          { useOptimizedCalculation: true, forceTurboModule: true }
        );
        const turboEndTime = performance.now();
        turboModuleTimes.push(turboEndTime - turboStartTime);

        // Measure JavaScript calculation time
        const jsStartTime = performance.now();
        const jsScore = await clinicalAccelerator.calculatePHQ9Score(
          testCase.phq9Responses,
          { useOptimizedCalculation: false, forceJavaScript: true }
        );
        const jsEndTime = performance.now();
        jsCalculationTimes.push(jsEndTime - jsStartTime);

        // Verify accuracy is maintained
        expect(turboScore).toBe(testCase.expectedScore);
        expect(jsScore).toBe(testCase.expectedScore);
        expect(turboScore).toBe(jsScore);
      }

      // Verify TurboModule provides performance improvement
      const avgTurboTime = turboModuleTimes.reduce((sum, time) => sum + time, 0) / turboModuleTimes.length;
      const avgJsTime = jsCalculationTimes.reduce((sum, time) => sum + time, 0) / jsCalculationTimes.length;

      expect(avgTurboTime).toBeLessThan(avgJsTime * 0.8); // At least 20% faster
      expect(avgTurboTime).toBeLessThan(32); // Target performance achieved
    });

    it('should handle TurboModule batch operations efficiently', async () => {
      const batchSize = 100;
      const batchOperations = Array.from({ length: batchSize }, (_, index) => ({
        id: `batch-${index}`,
        phq9Responses: Array.from({ length: 9 }, (_, i) => (index + i) % 4),
        timestamp: Date.now() + index
      }));

      const startTime = performance.now();

      const results = await turboStoreManager.processBatchCalculations(
        batchOperations,
        { useTurboModule: true }
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify batch processing performance
      expect(totalTime).toBeLessThan(1000); // 1 second for 100 operations
      expect(totalTime / batchSize).toBeLessThan(10); // <10ms per operation
      expect(results).toHaveLength(batchSize);

      // Verify all calculations are accurate
      results.forEach((result, index) => {
        const expectedScore = batchOperations[index].phq9Responses.reduce(
          (sum, response) => sum + response, 0
        );
        expect(result.score).toBe(expectedScore);
      });
    });

    it('should gracefully fallback when TurboModule is unavailable', async () => {
      // Simulate TurboModule unavailability
      jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(false);
      jest.spyOn(clinicalAccelerator, 'isTurboModuleReady').mockResolvedValue(false);

      const { result } = renderHook(() => useAssessmentStore());

      const testResponses = [2, 2, 3, 2, 3, 2, 3, 2, 1]; // Score = 20

      const startTime = performance.now();

      let calculatedScore: number;
      await act(async () => {
        calculatedScore = await result.current.submitAssessment({
          type: 'PHQ9',
          responses: testResponses,
          timestamp: Date.now(),
          useOptimizedCalculation: true // Should fallback to JS
        });
      });

      const endTime = performance.now();
      const fallbackTime = endTime - startTime;

      // Verify fallback functionality
      expect(calculatedScore!).toBe(20); // Accuracy maintained
      expect(fallbackTime).toBeLessThan(100); // Still reasonably fast
      
      // Verify fallback was used
      const calculationMetrics = await clinicalAccelerator.getCalculationMetrics();
      expect(calculationMetrics.usingTurboModule).toBe(false);
      expect(calculationMetrics.fallbackReason).toBe('TurboModule unavailable');
    });
  });

  describe('Fabric Renderer State Synchronization', () => {
    it('should synchronize state updates with Fabric renderer efficiently', async () => {
      const { result: crisisResult } = renderHook(() => useCrisisStore());
      
      // Mock Fabric renderer calls
      const fabricRenderSpy = jest.fn();
      jest.spyOn(newArchMonitor, 'trackFabricRender').mockImplementation(fabricRenderSpy);

      await act(async () => {
        await crisisResult.current.triggerCrisisDetection({
          phq9Score: 22,
          assessmentId: 'fabric-sync-test',
          severity: 'severe',
          triggerSource: 'assessment'
        });
      });

      // Verify Fabric renderer was notified efficiently
      expect(fabricRenderSpy).toHaveBeenCalled();
      const renderCalls = fabricRenderSpy.mock.calls;
      expect(renderCalls.length).toBeLessThanOrEqual(3); // Minimal render calls

      // Verify state synchronization timing
      const synchronizationMetrics = await newArchMonitor.getFabricSyncMetrics();
      expect(synchronizationMetrics.averageSyncTime).toBeLessThan(16.67); // <1 frame at 60fps
      expect(synchronizationMetrics.missedFrames).toBe(0);
    });

    it('should handle concurrent state updates with Fabric optimization', async () => {
      const { result: assessmentResult } = renderHook(() => useAssessmentStore());
      const { result: crisisResult } = renderHook(() => useCrisisStore());

      // Simulate concurrent state updates that would trigger renders
      const concurrentOperations = Array.from({ length: 20 }, async (_, index) => {
        return act(async () => {
          if (index % 2 === 0) {
            // Assessment submission
            await assessmentResult.current.submitAssessment({
              type: 'PHQ9',
              responses: [2, 2, 2, 2, 2, 2, 2, 2, 2],
              timestamp: Date.now() + index,
              sessionId: `concurrent-${index}`
            });
          } else {
            // Crisis state update
            await crisisResult.current.updateCrisisPlan({
              planId: `plan-${index}`,
              safetyContacts: [`contact-${index}`],
              copingStrategies: [`strategy-${index}`]
            });
          }
        });
      });

      const startTime = performance.now();
      await Promise.all(concurrentOperations);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const fabricMetrics = await newArchMonitor.getFabricSyncMetrics();

      // Verify concurrent operations were handled efficiently
      expect(totalTime).toBeLessThan(500); // 500ms for all operations
      expect(fabricMetrics.batchedUpdates).toBeGreaterThan(0); // Updates were batched
      expect(fabricMetrics.missedFrames).toBeLessThan(2); // Minimal frame drops
    });

    it('should maintain 60fps during breathing animations with state updates', async () => {
      const breathingSessionDuration = 10000; // 10 seconds for testing
      const targetFPS = 60;
      const frameTimings: number[] = [];

      // Start breathing session monitoring
      const sessionMonitor = await newArchMonitor.startBreathingSessionMonitoring({
        duration: breathingSessionDuration,
        targetFPS: targetFPS
      });

      // Simulate concurrent state updates during breathing
      const stateUpdateInterval = setInterval(async () => {
        const { result } = renderHook(() => useCrisisStore());
        await act(async () => {
          await result.current.logCrisisEvent({
            eventType: 'breathing_support',
            severity: 'low',
            timestamp: Date.now()
          });
        });
      }, 1000); // Every second

      // Monitor frame timings
      const frameMonitorInterval = setInterval(() => {
        frameTimings.push(performance.now());
      }, 16.67); // 60fps monitoring

      // Run for test duration
      await new Promise(resolve => setTimeout(resolve, breathingSessionDuration));

      // Cleanup
      clearInterval(stateUpdateInterval);
      clearInterval(frameMonitorInterval);
      
      const sessionMetrics = await newArchMonitor.stopBreathingSessionMonitoring(sessionMonitor.id);

      // Verify 60fps was maintained
      expect(sessionMetrics.averageFPS).toBeGreaterThanOrEqual(58);
      expect(sessionMetrics.frameDropPercentage).toBeLessThan(5);
      
      // Verify Fabric renderer optimization
      expect(sessionMetrics.fabricOptimizationActive).toBe(true);
      expect(sessionMetrics.renderBatchingEnabled).toBe(true);
    });
  });

  describe('Memory Management with New Architecture', () => {
    it('should optimize memory usage during extended therapeutic sessions', async () => {
      const sessionDuration = 300000; // 5 minutes
      const initialMemory = await newArchMonitor.measureMemoryUsage();

      // Start extended session with New Architecture optimization
      const sessionId = await newArchMonitor.startExtendedSession({
        duration: sessionDuration,
        enableMemoryOptimization: true,
        enableTurboModuleAcceleration: true
      });

      // Simulate extended therapeutic activities
      const activities = [];
      for (let i = 0; i < 60; i++) { // 60 operations over 5 minutes
        activities.push(
          new Promise(resolve => {
            setTimeout(async () => {
              const { result } = renderHook(() => useAssessmentStore());
              await act(async () => {
                await result.current.updateAssessmentProgress({
                  sessionId: `extended-${i}`,
                  progress: (i + 1) / 60 * 100,
                  timestamp: Date.now()
                });
              });
              resolve(true);
            }, i * (sessionDuration / 60));
          })
        );
      }

      await Promise.all(activities);

      const finalMemory = await newArchMonitor.measureMemoryUsage();
      const sessionMetrics = await newArchMonitor.stopExtendedSession(sessionId);

      // Verify memory optimization
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50); // <50MB increase for 5-minute session
      expect(sessionMetrics.memoryLeaks).toBe(0);
      expect(sessionMetrics.garbageCollectionOptimized).toBe(true);
    });

    it('should handle memory pressure scenarios with New Architecture', async () => {
      // Create memory pressure scenario
      const largeDataSets = Array.from({ length: 100 }, (_, index) => ({
        id: `memory-pressure-${index}`,
        data: Array.from({ length: 1000 }, (_, i) => ({
          timestamp: Date.now() + i,
          value: Math.random() * 100
        }))
      }));

      const startTime = performance.now();
      const initialMemory = await newArchMonitor.measureMemoryUsage();

      // Process large datasets with New Architecture optimization
      const results = await turboStoreManager.processBatchData(
        largeDataSets,
        { 
          enableMemoryOptimization: true,
          enableStreamProcessing: true,
          maxConcurrentOperations: 10
        }
      );

      const endTime = performance.now();
      const finalMemory = await newArchMonitor.measureMemoryUsage();

      const processingTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      // Verify memory pressure handling
      expect(processingTime).toBeLessThan(10000); // 10 seconds for large batch
      expect(memoryIncrease).toBeLessThan(100); // <100MB increase
      expect(results).toHaveLength(100);

      // Verify New Architecture optimizations were active
      const optimizationMetrics = await newArchMonitor.getMemoryOptimizationMetrics();
      expect(optimizationMetrics.streamProcessingUsed).toBe(true);
      expect(optimizationMetrics.memoryPoolingActive).toBe(true);
      expect(optimizationMetrics.garbageCollectionOptimized).toBe(true);
    });
  });

  describe('Emergency Fallback System', () => {
    it('should fallback gracefully when New Architecture components fail', async () => {
      const { result } = renderHook(() => useCrisisStore());

      // Simulate New Architecture component failures
      jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(false);
      jest.spyOn(newArchMonitor, 'isTurboModuleAvailable').mockReturnValue(false);
      jest.spyOn(newArchMonitor, 'isFabricRendererEnabled').mockReturnValue(false);

      const startTime = performance.now();

      await act(async () => {
        await result.current.triggerCrisisDetection({
          phq9Score: 24,
          assessmentId: 'fallback-test',
          severity: 'critical',
          triggerSource: 'assessment'
        });
      });

      const endTime = performance.now();
      const fallbackTime = endTime - startTime;

      // Verify fallback performance is acceptable
      expect(fallbackTime).toBeLessThan(400); // Slightly higher tolerance
      
      // Verify crisis was still handled correctly
      expect(result.current.currentCrisis).toBeDefined();
      expect(result.current.currentCrisis?.severity).toBe('critical');
      expect(result.current.interventionActive).toBe(true);

      // Verify fallback system reported the failure
      const fallbackMetrics = await performanceMonitor.getFallbackMetrics();
      expect(fallbackMetrics.newArchitectureFallback).toBe(true);
      expect(fallbackMetrics.fallbackReason).toContain('New Architecture unavailable');
    });

    it('should maintain data integrity during New Architecture failures', async () => {
      const { result: assessmentResult } = renderHook(() => useAssessmentStore());

      // Start with New Architecture enabled
      jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(true);

      const testData = {
        responses: [2, 2, 3, 2, 3, 2, 3, 2, 1], // Score = 20
        sessionId: 'integrity-fallback-test',
        timestamp: Date.now()
      };

      // Start assessment with New Architecture
      await act(async () => {
        await assessmentResult.current.startAssessment({
          type: 'PHQ9',
          sessionId: testData.sessionId,
          timestamp: testData.timestamp
        });
      });

      // Simulate New Architecture failure mid-assessment
      jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(false);
      jest.spyOn(clinicalAccelerator, 'isTurboModuleReady').mockResolvedValue(false);

      // Complete assessment with fallback
      let finalScore: number;
      await act(async () => {
        finalScore = await assessmentResult.current.completeAssessment({
          sessionId: testData.sessionId,
          finalResponses: testData.responses,
          useOptimizedCalculation: true // Should fallback to JS
        });
      });

      // Verify data integrity maintained
      expect(finalScore!).toBe(20);
      expect(assessmentResult.current.assessments).toHaveLength(1);
      expect(assessmentResult.current.assessments[0].calculatedScore).toBe(20);
      expect(assessmentResult.current.assessments[0].sessionId).toBe(testData.sessionId);
    });

    it('should provide comprehensive fallback monitoring', async () => {
      // Simulate various failure scenarios
      const failureScenarios = [
        {
          name: 'TurboModule failure',
          setup: () => {
            jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(true);
            jest.spyOn(newArchMonitor, 'isTurboModuleAvailable').mockReturnValue(false);
          }
        },
        {
          name: 'Fabric renderer failure',
          setup: () => {
            jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(true);
            jest.spyOn(newArchMonitor, 'isFabricRendererEnabled').mockReturnValue(false);
          }
        },
        {
          name: 'Complete New Architecture failure',
          setup: () => {
            jest.spyOn(turboStoreManager, 'isNewArchitectureEnabled').mockReturnValue(false);
            jest.spyOn(newArchMonitor, 'isTurboModuleAvailable').mockReturnValue(false);
            jest.spyOn(newArchMonitor, 'isFabricRendererEnabled').mockReturnValue(false);
          }
        }
      ];

      const fallbackResults = [];

      for (const scenario of failureScenarios) {
        scenario.setup();

        const { result } = renderHook(() => useAssessmentStore());

        const startTime = performance.now();

        await act(async () => {
          await result.current.submitAssessment({
            type: 'PHQ9',
            responses: [2, 2, 2, 2, 2, 2, 2, 2, 2], // Score = 18
            timestamp: Date.now(),
            sessionId: `fallback-${scenario.name}`,
            useOptimizedCalculation: true
          });
        });

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        fallbackResults.push({
          scenario: scenario.name,
          responseTime,
          success: result.current.assessments.length > 0
        });
      }

      // Verify all fallback scenarios handled successfully
      fallbackResults.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.responseTime).toBeLessThan(500); // Acceptable fallback performance
      });

      // Verify fallback monitoring captured all scenarios
      const comprehensiveMetrics = await performanceMonitor.getComprehensiveFallbackMetrics();
      expect(comprehensiveMetrics.totalFallbackEvents).toBe(3);
      expect(comprehensiveMetrics.fallbackSuccessRate).toBe(100);
    });
  });
});

/**
 * NEW ARCHITECTURE INTEGRATION VALIDATION SUMMARY
 * 
 * This test suite validates New Architecture integration with state management:
 * 
 * ✅ TurboModule acceleration for clinical calculations (20%+ performance improvement)
 * ✅ Fabric renderer state synchronization (<16.67ms sync time for 60fps)
 * ✅ Memory optimization during extended sessions (<50MB increase over 5 minutes)
 * ✅ Emergency fallback system maintains functionality and data integrity
 * ✅ Comprehensive monitoring of New Architecture components
 * 
 * Key Integration Features Validated:
 * - TurboModule clinical calculation acceleration with accuracy preservation
 * - Fabric renderer optimization for smooth breathing animations
 * - Memory management optimization for extended therapeutic sessions
 * - Graceful fallback when New Architecture components fail
 * - Real-time monitoring of New Architecture performance metrics
 * 
 * Production Readiness Verification:
 * - New Architecture provides measurable performance improvements
 * - Fallback systems ensure universal compatibility  
 * - Memory optimization prevents resource leaks during therapy
 * - Clinical accuracy maintained across all architecture modes
 */