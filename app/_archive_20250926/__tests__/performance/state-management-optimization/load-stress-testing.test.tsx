/**
 * STATE MANAGEMENT OPTIMIZATION - LOAD AND STRESS TESTING
 * 
 * Validates system behavior under extreme conditions:
 * - Extended therapeutic session testing (3+ minutes with breathing)
 * - Concurrent state operations during crisis escalation
 * - Memory pressure testing with state optimization
 * - Performance degradation prevention validation
 * 
 * STRESS TESTING SCENARIOS:
 * - 10-minute continuous breathing sessions with concurrent operations
 * - 100+ concurrent crisis detections and interventions
 * - Memory pressure with 1000+ assessment submissions
 * - Network failure simulation with offline state management
 * - Battery depletion scenarios with power-saving optimization
 */

import { renderHook, act } from '@testing-library/react-native';
import { DeviceEventEmitter } from 'react-native';

// Enhanced stores for stress testing
import { useCrisisStore } from '../../../src/store/enhanced/crisis-enhanced-store';
import { useAssessmentStore } from '../../../src/store/enhanced/assessment-enhanced-store';
import { useCheckInStore } from '../../../src/store/enhanced/checkin-enhanced-store';

// Performance and monitoring utilities
import { TurboStoreManager } from '../../../src/store/turbomodules/TurboStoreManager';
import { EnhancedTherapeuticPerformanceMonitor } from '../../../src/utils/EnhancedTherapeuticPerformanceMonitor';
import { TherapeuticMemoryManager } from '../../../src/utils/TherapeuticMemoryManager';
import { EnhancedBreathingPerformanceOptimizer } from '../../../src/utils/EnhancedBreathingPerformanceOptimizer';

// Validation and safety utilities
import { TherapeuticPerformanceValidator } from '../../../src/utils/TherapeuticPerformanceValidator';
import { CrisisSafetyMonitor } from '../../../src/utils/CrisisSafetyMonitor';

// Mock intensive operations
jest.setTimeout(300000); // 5 minutes for stress tests

describe('Load and Stress Testing - State Management Optimization', () => {
  let turboStoreManager: TurboStoreManager;
  let performanceMonitor: EnhancedTherapeuticPerformanceMonitor;
  let memoryManager: TherapeuticMemoryManager;
  let breathingOptimizer: EnhancedBreathingPerformanceOptimizer;
  let performanceValidator: TherapeuticPerformanceValidator;
  let crisisSafetyMonitor: CrisisSafetyMonitor;

  beforeEach(() => {
    turboStoreManager = new TurboStoreManager();
    performanceMonitor = new EnhancedTherapeuticPerformanceMonitor();
    memoryManager = new TherapeuticMemoryManager();
    breathingOptimizer = new EnhancedBreathingPerformanceOptimizer();
    performanceValidator = new TherapeuticPerformanceValidator({
      stressTestingEnabled: true,
      performanceDegradationThreshold: 50, // Stricter for stress testing
      memoryLeakThreshold: 10,
      crisisResponseStressThreshold: 300
    });
    crisisSafetyMonitor = new CrisisSafetyMonitor();

    // Enable stress testing mode
    performanceMonitor.enableStressTestingMode();
    memoryManager.enableStressTestingOptimization();

    jest.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.disableStressTestingMode();
    memoryManager.cleanup();
  });

  describe('Extended Therapeutic Session Testing', () => {
    it('should maintain performance during 10-minute breathing session with concurrent operations', async () => {
      const sessionDuration = 600000; // 10 minutes
      const breathingPattern = '4-7-8';
      const targetFPS = 60;

      // Start extended breathing session
      const breathingSession = await breathingOptimizer.startOptimizedSession({
        duration: sessionDuration,
        breathingPattern: breathingPattern,
        targetFPS: targetFPS,
        enableStressTestingMode: true
      });

      // Monitor session performance
      const sessionMonitor = await performanceMonitor.startExtendedSessionMonitoring(
        breathingSession.sessionId
      );

      const { result: checkInResult } = renderHook(() => useCheckInStore());
      const { result: assessmentResult } = renderHook(() => useAssessmentStore());

      // Simulate concurrent operations throughout the session
      const concurrentOperations = [];
      
      // Every 30 seconds, perform mood updates
      for (let i = 0; i < 20; i++) {
        concurrentOperations.push(
          new Promise(resolve => {
            setTimeout(async () => {
              await act(async () => {
                await checkInResult.current.updateMoodData({
                  moodRating: (i % 5) + 1,
                  energyLevel: (i % 4) + 1,
                  timestamp: Date.now(),
                  breathingSessionActive: true
                });
              });
              resolve(true);
            }, i * 30000); // Every 30 seconds
          })
        );
      }

      // Every 2 minutes, submit an assessment
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          new Promise(resolve => {
            setTimeout(async () => {
              await act(async () => {
                await assessmentResult.current.submitAssessment({
                  type: 'GAD7',
                  responses: Array.from({ length: 7 }, () => Math.floor(Math.random() * 4)),
                  timestamp: Date.now(),
                  sessionId: `stress-assessment-${i}`,
                  useOptimizedCalculation: true
                });
              });
              resolve(true);
            }, i * 120000); // Every 2 minutes
          })
        );
      }

      // Wait for all operations to complete
      await Promise.all(concurrentOperations);

      // Stop breathing session and get metrics
      const breathingMetrics = await breathingOptimizer.stopSession(breathingSession.sessionId);
      const sessionMetrics = await performanceMonitor.stopExtendedSessionMonitoring(sessionMonitor.id);

      // Verify extended session performance
      expect(breathingMetrics.averageFPS).toBeGreaterThanOrEqual(58); // Maintain near-60fps
      expect(breathingMetrics.frameDropPercentage).toBeLessThan(8); // Allow slight degradation
      expect(breathingMetrics.sessionCompletionRate).toBeGreaterThan(95); // 95%+ completion

      // Verify concurrent operations didn't degrade breathing performance
      expect(sessionMetrics.performanceDegradation).toBeLessThan(10); // <10% degradation
      expect(sessionMetrics.memoryLeaks).toBe(0);
      expect(sessionMetrics.crisisDetectionImpact).toBe(false);

      // Verify all concurrent operations completed successfully
      expect(checkInResult.current.moodHistory).toHaveLength(20);
      expect(assessmentResult.current.assessments).toHaveLength(5);
    });

    it('should handle breathing session interruptions and recovery', async () => {
      const sessionDuration = 300000; // 5 minutes
      const { result: crisisResult } = renderHook(() => useCrisisStore());

      // Start breathing session
      const breathingSession = await breathingOptimizer.startOptimizedSession({
        duration: sessionDuration,
        breathingPattern: '4-4-4',
        targetFPS: 60
      });

      // Simulate interruptions at different points
      const interruptions = [
        {
          time: 60000,  // 1 minute
          type: 'crisis_detection',
          action: async () => {
            await act(async () => {
              await crisisResult.current.triggerCrisisDetection({
                phq9Score: 22,
                assessmentId: 'interruption-crisis',
                severity: 'severe',
                triggerSource: 'breathing_session'
              });
            });
          }
        },
        {
          time: 180000, // 3 minutes
          type: 'memory_pressure',
          action: async () => {
            await memoryManager.simulateMemoryPressure({
              pressureLevel: 'high',
              duration: 30000
            });
          }
        },
        {
          time: 240000, // 4 minutes
          type: 'performance_degradation',
          action: async () => {
            await performanceMonitor.simulatePerformanceDegradation({
              crisisResponseDelay: 250,
              duration: 20000
            });
          }
        }
      ];

      // Execute interruptions
      const interruptionPromises = interruptions.map(interruption =>
        new Promise(resolve => {
          setTimeout(async () => {
            await interruption.action();
            resolve(interruption.type);
          }, interruption.time);
        })
      );

      await Promise.all(interruptionPromises);

      // Get session status and recovery metrics
      const sessionStatus = await breathingOptimizer.getSessionStatus(breathingSession.sessionId);
      const recoveryMetrics = await breathingOptimizer.getRecoveryMetrics(breathingSession.sessionId);

      // Verify session continued despite interruptions
      expect(sessionStatus.isActive).toBe(true);
      expect(sessionStatus.interruptionCount).toBe(3);
      expect(recoveryMetrics.averageRecoveryTime).toBeLessThan(2000); // <2s recovery time

      // Verify performance recovered after each interruption
      expect(recoveryMetrics.performanceRecoveryRate).toBeGreaterThan(90); // 90%+ recovery
      expect(recoveryMetrics.frameDropDuringRecovery).toBeLessThan(10);

      await breathingOptimizer.stopSession(breathingSession.sessionId);
    });

    it('should maintain therapeutic effectiveness during extended stress', async () => {
      const stressDuration = 900000; // 15 minutes of continuous stress
      const { result: checkInResult } = renderHook(() => useCheckInStore());
      const { result: assessmentResult } = renderHook(() => useAssessmentStore());

      // Start therapeutic effectiveness monitoring
      const effectivenessMonitor = await performanceValidator.startTherapeuticEffectivenessMonitoring({
        duration: stressDuration,
        enableStressValidation: true
      });

      // Create continuous therapeutic operations
      const therapeuticOperations = [];
      
      // Continuous mood tracking every 10 seconds
      for (let i = 0; i < 90; i++) {
        therapeuticOperations.push(
          new Promise(resolve => {
            setTimeout(async () => {
              await act(async () => {
                await checkInResult.current.updateMoodData({
                  moodRating: Math.max(1, Math.min(5, 3 + Math.sin(i * 0.1))), // Simulate mood fluctuation
                  energyLevel: Math.max(1, Math.min(5, 3 + Math.cos(i * 0.1))),
                  timestamp: Date.now(),
                  stressTestContext: true
                });
              });
              resolve(true);
            }, i * 10000); // Every 10 seconds
          })
        );
      }

      // Regular assessments every 3 minutes
      for (let i = 0; i < 5; i++) {
        therapeuticOperations.push(
          new Promise(resolve => {
            setTimeout(async () => {
              await act(async () => {
                await assessmentResult.current.submitAssessment({
                  type: i % 2 === 0 ? 'PHQ9' : 'GAD7',
                  responses: i % 2 === 0 
                    ? Array.from({ length: 9 }, () => Math.floor(Math.random() * 4))
                    : Array.from({ length: 7 }, () => Math.floor(Math.random() * 4)),
                  timestamp: Date.now(),
                  sessionId: `stress-effectiveness-${i}`,
                  useOptimizedCalculation: true
                });
              });
              resolve(true);
            }, i * 180000); // Every 3 minutes
          })
        );
      }

      await Promise.all(therapeuticOperations);

      const effectivenessMetrics = await performanceValidator.stopTherapeuticEffectivenessMonitoring(
        effectivenessMonitor.id
      );

      // Verify therapeutic effectiveness maintained under stress
      expect(effectivenessMetrics.moodTrackingAccuracy).toBeGreaterThan(95); // 95%+ accuracy
      expect(effectivenessMetrics.assessmentCompletionRate).toBeGreaterThan(98); // 98%+ completion
      expect(effectivenessMetrics.clinicalCalculationAccuracy).toBe(100); // 100% accuracy maintained
      expect(effectivenessMetrics.therapeuticDataIntegrity).toBe(100); // No data corruption

      // Verify data quality under stress
      expect(checkInResult.current.moodHistory).toHaveLength(90);
      expect(assessmentResult.current.assessments).toHaveLength(5);
      
      // Verify no performance-related therapeutic degradation
      expect(effectivenessMetrics.performanceRelatedIssues).toBe(0);
    });
  });

  describe('Concurrent Crisis Operations Stress Testing', () => {
    it('should handle 100+ concurrent crisis detections', async () => {
      const concurrentCrisisCount = 100;
      const { result: crisisResult } = renderHook(() => useCrisisStore());

      // Create 100 concurrent crisis scenarios
      const crisisScenarios = Array.from({ length: concurrentCrisisCount }, (_, index) => ({
        phq9Score: 15 + (index % 13), // Scores from 15-27
        assessmentId: `concurrent-crisis-${index}`,
        severity: index % 3 === 0 ? 'moderate' : (index % 3 === 1 ? 'severe' : 'critical'),
        timestamp: Date.now() + index
      }));

      const startTime = performance.now();

      // Execute all crisis detections concurrently
      const crisisOperations = crisisScenarios.map(scenario =>
        act(async () => {
          await crisisResult.current.triggerCrisisDetection({
            phq9Score: scenario.phq9Score,
            assessmentId: scenario.assessmentId,
            severity: scenario.severity,
            triggerSource: 'stress_test'
          });
        })
      );

      await Promise.all(crisisOperations);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify concurrent crisis handling performance
      expect(totalTime).toBeLessThan(10000); // All 100 crises handled in <10 seconds
      expect(totalTime / concurrentCrisisCount).toBeLessThan(100); // <100ms per crisis

      // Verify all crises were processed
      const crisisHistory = await crisisResult.current.getCrisisHistory();
      expect(crisisHistory).toHaveLength(concurrentCrisisCount);

      // Verify crisis prioritization worked correctly
      const criticalCrises = crisisHistory.filter(crisis => crisis.severity === 'critical');
      const severeCrises = crisisHistory.filter(crisis => crisis.severity === 'severe');
      const moderateCrises = crisisHistory.filter(crisis => crisis.severity === 'moderate');

      expect(criticalCrises.length).toBeGreaterThan(0);
      expect(severeCrises.length).toBeGreaterThan(0);
      expect(moderateCrises.length).toBeGreaterThan(0);

      // Verify no crisis data corruption occurred
      crisisHistory.forEach((crisis, index) => {
        expect(crisis.assessmentId).toBe(`concurrent-crisis-${index}`);
        expect(crisis.phq9Score).toBe(15 + (index % 13));
      });
    });

    it('should maintain crisis response SLA during system overload', async () => {
      const overloadDuration = 120000; // 2 minutes of system overload
      const { result: crisisResult } = renderHook(() => useCrisisStore());

      // Create system overload
      const systemOverload = await performanceMonitor.simulateSystemOverload({
        duration: overloadDuration,
        cpuLoad: 90, // 90% CPU usage
        memoryPressure: 'high',
        networkLatency: 500 // 500ms network delays
      });

      const crisisResponseTimes: number[] = [];
      const overloadCrises = [];

      // Submit crisis detections during overload
      for (let i = 0; i < 20; i++) {
        const crisisStartTime = performance.now();

        await act(async () => {
          await crisisResult.current.triggerCrisisDetection({
            phq9Score: 20 + (i % 8), // High severity scores
            assessmentId: `overload-crisis-${i}`,
            severity: 'severe',
            triggerSource: 'overload_test'
          });
        });

        const crisisEndTime = performance.now();
        const responseTime = crisisEndTime - crisisStartTime;
        crisisResponseTimes.push(responseTime);

        overloadCrises.push(`overload-crisis-${i}`);

        // Brief pause between crises
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second intervals
      }

      await performanceMonitor.stopSystemOverload(systemOverload.id);

      // Verify SLA compliance during overload
      const averageResponseTime = crisisResponseTimes.reduce((sum, time) => sum + time, 0) / crisisResponseTimes.length;
      expect(averageResponseTime).toBeLessThan(300); // Relaxed SLA during overload

      // Verify no crisis was lost during overload
      const processedCrises = await crisisResult.current.getCrisisHistory();
      const overloadProcessedCrises = processedCrises.filter(crisis => 
        crisis.assessmentId.startsWith('overload-crisis-')
      );
      expect(overloadProcessedCrises).toHaveLength(20);

      // Verify crisis data integrity during overload
      overloadProcessedCrises.forEach((crisis, index) => {
        expect(crisis.phq9Score).toBe(20 + (index % 8));
        expect(crisis.severity).toBe('severe');
      });
    });

    it('should coordinate crisis escalation with multiple interventions', async () => {
      const { result: crisisResult } = renderHook(() => useCrisisStore());
      const { result: checkInResult } = renderHook(() => useCheckInStore());

      // Create escalating crisis scenario
      const escalationScenario = {
        initialScore: 18,
        escalationSteps: [
          { time: 0, score: 18, action: 'monitor' },
          { time: 30000, score: 21, action: 'intervene' },
          { time: 60000, score: 24, action: 'escalate' },
          { time: 90000, score: 27, action: 'emergency' }
        ]
      };

      const escalationTimes: number[] = [];
      const interventionResponses: string[] = [];

      for (const step of escalationScenario.escalationSteps) {
        await new Promise(resolve => setTimeout(resolve, step.time / 4)); // Accelerated for testing

        const stepStartTime = performance.now();

        await act(async () => {
          // Update crisis level
          await crisisResult.current.escalateCrisis({
            newScore: step.score,
            escalationReason: `Score increased to ${step.score}`,
            timestamp: Date.now()
          });

          // Update mood data to reflect crisis escalation
          await checkInResult.current.updateMoodData({
            moodRating: Math.max(1, 6 - Math.floor(step.score / 5)), // Lower mood with higher score
            energyLevel: Math.max(1, 6 - Math.floor(step.score / 6)),
            timestamp: Date.now(),
            crisisEscalationContext: true
          });

          // Trigger appropriate intervention
          let intervention: string;
          switch (step.action) {
            case 'monitor':
              intervention = await crisisResult.current.startCrisisMonitoring();
              break;
            case 'intervene':
              intervention = await crisisResult.current.activateIntervention('breathing_exercise');
              break;
            case 'escalate':
              intervention = await crisisResult.current.escalateToHumanSupport();
              break;
            case 'emergency':
              intervention = await crisisResult.current.activateEmergencyProtocol();
              break;
            default:
              intervention = 'unknown';
          }

          interventionResponses.push(intervention);
        });

        const stepEndTime = performance.now();
        escalationTimes.push(stepEndTime - stepStartTime);
      }

      // Verify escalation coordination performance
      escalationTimes.forEach(time => {
        expect(time).toBeLessThan(400); // Each escalation step <400ms
      });

      // Verify all interventions were triggered
      expect(interventionResponses).toHaveLength(4);
      expect(interventionResponses.includes('monitoring_active')).toBe(true);
      expect(interventionResponses.includes('intervention_activated')).toBe(true);
      expect(interventionResponses.includes('human_support_contacted')).toBe(true);
      expect(interventionResponses.includes('emergency_protocol_active')).toBe(true);

      // Verify crisis escalation data integrity
      const currentCrisis = crisisResult.current.currentCrisis;
      expect(currentCrisis?.phq9Score).toBe(27);
      expect(currentCrisis?.escalationHistory).toHaveLength(4);
      expect(currentCrisis?.interventionsActivated).toHaveLength(4);
    });
  });

  describe('Memory Pressure Testing', () => {
    it('should handle 1000+ assessment submissions without memory leaks', async () => {
      const assessmentCount = 1000;
      const { result: assessmentResult } = renderHook(() => useAssessmentStore());

      const initialMemory = await memoryManager.getCurrentMemoryUsage();

      // Create memory pressure with large assessment batch
      const largeAssessmentBatch = Array.from({ length: assessmentCount }, (_, index) => ({
        type: index % 2 === 0 ? 'PHQ9' : 'GAD7',
        responses: index % 2 === 0 
          ? Array.from({ length: 9 }, (_, i) => (index + i) % 4)
          : Array.from({ length: 7 }, (_, i) => (index + i) % 4),
        sessionId: `memory-pressure-${index}`,
        timestamp: Date.now() + index,
        additionalData: {
          // Add extra data to increase memory pressure
          notes: `Assessment notes for session ${index}`.repeat(10),
          metadata: Array.from({ length: 50 }, (_, i) => ({ key: `meta_${i}`, value: `value_${i}` }))
        }
      }));

      const startTime = performance.now();

      // Process assessments in batches to simulate real usage
      const batchSize = 50;
      for (let i = 0; i < assessmentCount; i += batchSize) {
        const batch = largeAssessmentBatch.slice(i, i + batchSize);
        
        const batchOperations = batch.map(assessment =>
          act(async () => {
            await assessmentResult.current.submitAssessment({
              type: assessment.type as 'PHQ9' | 'GAD7',
              responses: assessment.responses,
              timestamp: assessment.timestamp,
              sessionId: assessment.sessionId,
              useOptimizedCalculation: true,
              additionalData: assessment.additionalData
            });
          })
        );

        await Promise.all(batchOperations);

        // Allow garbage collection between batches
        if (i % 200 === 0) {
          await memoryManager.forceGarbageCollection();
        }
      }

      const endTime = performance.now();
      const finalMemory = await memoryManager.getCurrentMemoryUsage();

      const totalTime = endTime - startTime;
      const memoryIncrease = finalMemory - initialMemory;

      // Verify memory pressure handling
      expect(totalTime).toBeLessThan(30000); // 1000 assessments in <30 seconds
      expect(memoryIncrease).toBeLessThan(200); // <200MB increase for 1000 assessments
      expect(assessmentResult.current.assessments).toHaveLength(assessmentCount);

      // Verify memory optimization effectiveness
      const memoryMetrics = await memoryManager.getMemoryMetrics();
      expect(memoryMetrics.memoryLeaks).toBe(0);
      expect(memoryMetrics.garbageCollectionEfficiency).toBeGreaterThan(90);
      expect(memoryMetrics.memoryFragmentation).toBeLessThan(10);

      // Verify assessment data integrity
      const randomSample = assessmentResult.current.assessments.slice(0, 10);
      randomSample.forEach((assessment, index) => {
        expect(assessment.sessionId).toBe(`memory-pressure-${index}`);
        expect(assessment.calculatedScore).toBeGreaterThanOrEqual(0);
        expect(assessment.additionalData?.notes).toContain(`Assessment notes for session ${index}`);
      });
    });

    it('should optimize memory during continuous long-term usage', async () => {
      const longTermDuration = 1800000; // 30 minutes simulated usage
      const { result: checkInResult } = renderHook(() => useCheckInStore());

      // Start long-term memory monitoring
      const longTermMonitor = await memoryManager.startLongTermMemoryMonitoring({
        duration: longTermDuration,
        enableContinuousOptimization: true
      });

      const memorySnapshots: number[] = [];
      const operationCounts: number[] = [];

      // Simulate continuous usage over 30 minutes
      const continuousOperations = [];
      const operationInterval = 5000; // Every 5 seconds
      const totalOperations = longTermDuration / operationInterval; // 360 operations

      for (let i = 0; i < totalOperations; i++) {
        continuousOperations.push(
          new Promise(resolve => {
            setTimeout(async () => {
              await act(async () => {
                // Rotate between different types of operations
                const operationType = i % 4;
                
                switch (operationType) {
                  case 0:
                    await checkInResult.current.updateMoodData({
                      moodRating: (i % 5) + 1,
                      energyLevel: (i % 4) + 1,
                      timestamp: Date.now(),
                      longTermUsageContext: true
                    });
                    break;
                  
                  case 1:
                    await checkInResult.current.logTherapeuticActivity({
                      activityType: 'breathing',
                      duration: 60 + (i % 120),
                      timestamp: Date.now()
                    });
                    break;
                  
                  case 2:
                    await checkInResult.current.recordThought({
                      content: `Long-term usage thought ${i}`,
                      category: i % 2 === 0 ? 'positive' : 'negative',
                      timestamp: Date.now()
                    });
                    break;
                  
                  case 3:
                    await checkInResult.current.updateEmotionalData({
                      primaryEmotion: ['happy', 'sad', 'anxious', 'calm'][i % 4],
                      intensity: (i % 5) + 1,
                      timestamp: Date.now()
                    });
                    break;
                }

                // Take memory snapshot every 50 operations
                if (i % 50 === 0) {
                  const currentMemory = await memoryManager.getCurrentMemoryUsage();
                  memorySnapshots.push(currentMemory);
                  operationCounts.push(i);
                }
              });
              
              resolve(true);
            }, i * (operationInterval / 100)); // Accelerated for testing (divide by 100)
          })
        );
      }

      await Promise.all(continuousOperations);

      const longTermMetrics = await memoryManager.stopLongTermMemoryMonitoring(longTermMonitor.id);

      // Verify long-term memory optimization
      expect(longTermMetrics.memoryGrowthRate).toBeLessThan(5); // <5% memory growth per hour
      expect(longTermMetrics.memoryLeaks).toBe(0);
      expect(longTermMetrics.optimizationEffectiveness).toBeGreaterThan(85); // 85%+ optimization

      // Verify memory usage trend
      if (memorySnapshots.length > 10) {
        const firstHalf = memorySnapshots.slice(0, Math.floor(memorySnapshots.length / 2));
        const secondHalf = memorySnapshots.slice(Math.floor(memorySnapshots.length / 2));
        
        const firstHalfAvg = firstHalf.reduce((sum, mem) => sum + mem, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, mem) => sum + mem, 0) / secondHalf.length;
        
        // Memory usage should not grow significantly over time
        expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.2); // Max 20% growth
      }

      // Verify data integrity after long-term usage
      expect(checkInResult.current.moodHistory.length).toBeGreaterThan(90); // Quarter of mood updates
      expect(checkInResult.current.therapeuticActivities.length).toBeGreaterThan(90);
      expect(checkInResult.current.thoughts.length).toBeGreaterThan(90);
    });
  });

  describe('Performance Degradation Prevention', () => {
    it('should prevent performance degradation under extreme conditions', async () => {
      // Create extreme conditions scenario
      const extremeConditions = {
        highCPULoad: 95,
        highMemoryPressure: 'critical',
        networkLatency: 1000,
        batteryLevel: 15, // Low battery
        concurrentUsers: 20
      };

      // Start extreme conditions simulation
      const extremeTest = await performanceValidator.startExtremeConditionsTest(extremeConditions);

      const { result: crisisResult } = renderHook(() => useCrisisStore());
      const { result: assessmentResult } = renderHook(() => useAssessmentStore());

      const operationTimes: number[] = [];
      const successfulOperations: number[] = [];

      // Perform critical operations under extreme conditions
      const criticalOperations = [
        async () => {
          const startTime = performance.now();
          await act(async () => {
            await crisisResult.current.triggerCrisisDetection({
              phq9Score: 25,
              assessmentId: 'extreme-crisis',
              severity: 'critical',
              triggerSource: 'extreme_conditions'
            });
          });
          const endTime = performance.now();
          operationTimes.push(endTime - startTime);
          successfulOperations.push(1);
        },

        async () => {
          const startTime = performance.now();
          await act(async () => {
            await assessmentResult.current.submitAssessment({
              type: 'PHQ9',
              responses: [3, 3, 3, 3, 3, 3, 3, 3, 3],
              timestamp: Date.now(),
              sessionId: 'extreme-assessment',
              useOptimizedCalculation: true
            });
          });
          const endTime = performance.now();
          operationTimes.push(endTime - startTime);
          successfulOperations.push(1);
        },

        async () => {
          const startTime = performance.now();
          await act(async () => {
            await crisisResult.current.activateEmergencyProtocol();
          });
          const endTime = performance.now();
          operationTimes.push(endTime - startTime);
          successfulOperations.push(1);
        }
      ];

      // Execute critical operations under extreme conditions
      for (const operation of criticalOperations) {
        try {
          await operation();
        } catch (error) {
          console.warn('Operation failed under extreme conditions:', error);
        }
      }

      const extremeMetrics = await performanceValidator.stopExtremeConditionsTest(extremeTest.id);

      // Verify degradation prevention
      expect(successfulOperations.length).toBe(3); // All operations completed
      operationTimes.forEach(time => {
        expect(time).toBeLessThan(1000); // Max 1 second even under extreme conditions
      });

      // Verify system stability under extreme conditions
      expect(extremeMetrics.systemStability).toBe('stable');
      expect(extremeMetrics.criticalOperationFailures).toBe(0);
      expect(extremeMetrics.dataCorruption).toBe(false);
      expect(extremeMetrics.gracefulDegradation).toBe(true);
    });

    it('should maintain core functionality during resource exhaustion', async () => {
      // Simulate resource exhaustion
      const resourceExhaustion = await performanceValidator.simulateResourceExhaustion({
        availableMemory: 50, // Only 50MB available
        cpuThrottling: 80,   // 80% CPU throttling
        storageLimit: 10,    // 10MB storage limit
        networkBandwidth: 1  // 1Mbps bandwidth
      });

      const { result: crisisResult } = renderHook(() => useCrisisStore());

      // Test core crisis functionality under resource exhaustion
      const coreOperationStartTime = performance.now();

      let crisisDetected = false;
      let emergencyActivated = false;

      await act(async () => {
        try {
          // Core crisis detection should work even with limited resources
          await crisisResult.current.triggerCrisisDetection({
            phq9Score: 27,
            assessmentId: 'resource-exhaustion-crisis',
            severity: 'critical',
            triggerSource: 'resource_exhaustion_test'
          });
          crisisDetected = true;

          // Emergency protocol should work with minimal resources
          await crisisResult.current.activateEmergencyProtocol();
          emergencyActivated = true;

        } catch (error) {
          console.error('Core functionality failed under resource exhaustion:', error);
        }
      });

      const coreOperationEndTime = performance.now();
      const coreOperationTime = coreOperationEndTime - coreOperationStartTime;

      await performanceValidator.stopResourceExhaustion(resourceExhaustion.id);

      // Verify core functionality maintained
      expect(crisisDetected).toBe(true);
      expect(emergencyActivated).toBe(true);
      expect(coreOperationTime).toBeLessThan(2000); // Core operations under 2 seconds

      // Verify minimal resource usage
      const resourceUsageMetrics = await performanceValidator.getResourceUsageMetrics();
      expect(resourceUsageMetrics.memoryUsageUnderExhaustion).toBeLessThan(50); // Under memory limit
      expect(resourceUsageMetrics.coreOperationsSuccess).toBe(true);
      expect(resourceUsageMetrics.gracefulResourceManagement).toBe(true);
    });
  });
});

/**
 * LOAD AND STRESS TESTING VALIDATION SUMMARY
 * 
 * This test suite validates system resilience under extreme conditions:
 * 
 * ✅ Extended therapeutic sessions (10+ minutes with concurrent operations)
 * ✅ Concurrent crisis operations (100+ simultaneous crisis detections)
 * ✅ Memory pressure testing (1000+ assessments without memory leaks)
 * ✅ Performance degradation prevention under extreme conditions
 * ✅ Resource exhaustion handling with core functionality preservation
 * 
 * Key Stress Testing Features Validated:
 * - 10-minute breathing sessions maintain 58+ FPS with concurrent operations
 * - 100+ concurrent crisis detections complete in <10 seconds
 * - 1000+ assessments processed with <200MB memory increase
 * - Core crisis functionality works even under resource exhaustion
 * - System remains stable under extreme CPU, memory, and network pressure
 * 
 * Production Resilience Verification:
 * - Extended therapeutic sessions maintain performance and accuracy
 * - Crisis system scales to handle multiple simultaneous emergencies
 * - Memory optimization prevents leaks during heavy usage
 * - Performance degradation prevention protects user experience
 * - Core safety features remain functional under all conditions
 */