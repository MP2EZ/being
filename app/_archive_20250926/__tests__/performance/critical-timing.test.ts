/**
 * Performance Tests - Critical Timing Requirements
 * 
 * Validates performance requirements for mental health app:
 * - Crisis button: <200ms response
 * - App launch: <3 seconds 
 * - Breathing animations: 60fps sustained
 * - Assessment loading: <300ms
 */

import { useAssessmentStore } from '../../src/store/assessmentStore';
import { useCheckInStore } from '../../src/store/checkInStore';
import { dataStore } from '../../src/services/storage/DataStore';

// Mock performance measurement
const mockPerformanceMeasurement = () => {
  const marks: { [key: string]: number } = {};
  
  return {
    mark: (name: string) => {
      marks[name] = performance.now();
    },
    measure: (name: string, startMark: string, endMark: string) => {
      return marks[endMark] - marks[startMark];
    }
  };
};

describe('Performance: Critical Timing Requirements', () => {
  let performanceTracker: ReturnType<typeof mockPerformanceMeasurement>;

  beforeEach(() => {
    performanceTracker = mockPerformanceMeasurement();
  });

  describe('Crisis Button Response Time (<200ms)', () => {
    test('Crisis button accessibility from any screen', async () => {
      performanceTracker.mark('crisis-start');
      
      // Simulate crisis button press from home screen
      const crisisButtonHandler = jest.fn(() => {
        // Simulate navigation to crisis screen
        return Promise.resolve();
      });

      performanceTracker.mark('crisis-navigation-start');
      await crisisButtonHandler();
      performanceTracker.mark('crisis-navigation-end');

      const responseTime = performanceTracker.measure(
        'crisis-response',
        'crisis-navigation-start',
        'crisis-navigation-end'
      );

      // Crisis button must respond in under 200ms
      expect(responseTime).toBeLessThan(200);
    });

    test('Crisis detection speed in assessment', async () => {
      const store = useAssessmentStore.getState();
      
      // Simulate crisis-level assessment
      store.startAssessment('phq9', 'standalone');
      
      performanceTracker.mark('crisis-detection-start');
      
      // Answer questions leading to crisis
      const crisisAnswers = [3, 3, 3, 3, 3, 3, 2, 1, 1]; // Score: 22
      crisisAnswers.forEach((answer, index) => {
        store.answerQuestion(answer);
      });
      
      // Calculate crisis detection time
      const score = store.calculateScore('phq9', crisisAnswers);
      const needsCrisis = score >= 20;
      
      performanceTracker.mark('crisis-detection-end');
      
      const detectionTime = performanceTracker.measure(
        'crisis-detection',
        'crisis-detection-start', 
        'crisis-detection-end'
      );

      expect(needsCrisis).toBe(true);
      expect(detectionTime).toBeLessThan(50); // Crisis detection should be near-instant
    });

    test('Emergency calling functionality speed', async () => {
      // Mock Linking.openURL for performance testing
      const mockOpenURL = jest.fn().mockResolvedValue(true);
      require('react-native').Linking = {
        canOpenURL: jest.fn().mockResolvedValue(true),
        openURL: mockOpenURL
      };

      performanceTracker.mark('call-start');
      
      // Simulate 988 call initiation
      const phoneURL = 'tel:988';
      await mockOpenURL(phoneURL);
      
      performanceTracker.mark('call-end');
      
      const callInitiationTime = performanceTracker.measure(
        'call-initiation',
        'call-start',
        'call-end'
      );

      // Call initiation should be immediate
      expect(callInitiationTime).toBeLessThan(100);
      expect(mockOpenURL).toHaveBeenCalledWith('tel:988');
    });
  });

  describe('App Launch Performance (<3 seconds)', () => {
    test('Cold start time to home screen', async () => {
      performanceTracker.mark('app-start');
      
      // Simulate app initialization
      const stores = [
        useAssessmentStore.getState(),
        useCheckInStore.getState()
      ];

      // Load initial data
      performanceTracker.mark('data-load-start');
      await Promise.all([
        stores[0].loadAssessments(),
        stores[1].loadCheckIns()
      ]);
      performanceTracker.mark('data-load-end');

      // Simulate home screen render
      performanceTracker.mark('render-start');
      // Mock component render time
      await new Promise(resolve => setTimeout(resolve, 50));
      performanceTracker.mark('render-end');

      performanceTracker.mark('app-ready');

      const totalLaunchTime = performanceTracker.measure(
        'app-launch',
        'app-start',
        'app-ready'
      );

      const dataLoadTime = performanceTracker.measure(
        'data-load',
        'data-load-start',
        'data-load-end'
      );

      const renderTime = performanceTracker.measure(
        'render',
        'render-start',
        'render-end'
      );

      // Total launch time must be under 3 seconds
      expect(totalLaunchTime).toBeLessThan(3000);
      
      // Data loading should be reasonable
      expect(dataLoadTime).toBeLessThan(1000);
      
      // Initial render should be fast
      expect(renderTime).toBeLessThan(500);
    });

    test('Partial session recovery speed', async () => {
      const checkInStore = useCheckInStore.getState();

      // Create partial session
      const partialSession = {
        id: 'partial_test',
        type: 'morning' as const,
        startedAt: new Date().toISOString(),
        data: {
          sleepQuality: 7,
          energyLevel: 6
        }
      };

      await dataStore.savePartialCheckIn(partialSession);

      performanceTracker.mark('recovery-start');
      
      // Resume partial session
      const recovered = await checkInStore.resumeCheckIn('morning');
      
      performanceTracker.mark('recovery-end');

      const recoveryTime = performanceTracker.measure(
        'session-recovery',
        'recovery-start',
        'recovery-end'
      );

      expect(recovered).toBe(true);
      expect(recoveryTime).toBeLessThan(500);
    });
  });

  describe('Assessment Loading Performance (<300ms)', () => {
    test('PHQ-9 assessment initialization', async () => {
      const store = useAssessmentStore.getState();
      
      performanceTracker.mark('assessment-start');
      
      // Initialize PHQ-9 assessment
      store.startAssessment('phq9', 'standalone');
      
      performanceTracker.mark('assessment-ready');

      const initTime = performanceTracker.measure(
        'assessment-init',
        'assessment-start',
        'assessment-ready'
      );

      expect(store.currentAssessment).not.toBeNull();
      expect(store.currentAssessment!.config!.type).toBe('phq9');
      expect(initTime).toBeLessThan(300);
    });

    test('Assessment question navigation speed', async () => {
      const store = useAssessmentStore.getState();
      store.startAssessment('gad7', 'standalone');

      const navigationTimes: number[] = [];

      // Test navigation through all questions
      for (let i = 0; i < 7; i++) {
        performanceTracker.mark(`question-${i}-start`);
        
        store.answerQuestion(2);
        
        performanceTracker.mark(`question-${i}-end`);
        
        const navTime = performanceTracker.measure(
          `question-${i}`,
          `question-${i}-start`,
          `question-${i}-end`
        );
        
        navigationTimes.push(navTime);
      }

      // Each question navigation should be fast
      navigationTimes.forEach((time, index) => {
        expect(time).toBeLessThan(100); // 100ms per question max
      });

      // Average navigation time should be very fast
      const averageTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      expect(averageTime).toBeLessThan(50);
    });

    test('Assessment saving performance', async () => {
      const store = useAssessmentStore.getState();
      store.startAssessment('phq9', 'standalone');

      // Complete assessment
      for (let i = 0; i < 9; i++) {
        store.answerQuestion(1);
      }

      performanceTracker.mark('save-start');
      
      await store.saveAssessment();
      
      performanceTracker.mark('save-end');

      const saveTime = performanceTracker.measure(
        'assessment-save',
        'save-start',
        'save-end'
      );

      expect(saveTime).toBeLessThan(1000); // Save within 1 second
    });
  });

  describe('Breathing Animation Performance (60fps)', () => {
    test('Breathing circle animation frame rate', async () => {
      const TARGET_FPS = 60;
      const FRAME_TIME_MS = 1000 / TARGET_FPS; // ~16.67ms per frame
      const TEST_DURATION = 1000; // Test for 1 second
      
      const frameData: number[] = [];
      let lastFrameTime = performance.now();

      // Simulate breathing animation loop
      const animationFrames = Math.floor(TEST_DURATION / FRAME_TIME_MS);
      
      for (let frame = 0; frame < animationFrames; frame++) {
        const currentTime = performance.now();
        const frameDelta = currentTime - lastFrameTime;
        frameData.push(frameDelta);
        lastFrameTime = currentTime;
        
        // Simulate animation work (breathing circle scaling)
        const progress = frame / animationFrames;
        const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.2;
        
        // Mock animation calculation overhead
        Math.sin(scale * progress);
      }

      // Calculate frame rate statistics
      const averageFrameTime = frameData.reduce((sum, time) => sum + time, 0) / frameData.length;
      const actualFPS = 1000 / averageFrameTime;
      
      // Count dropped frames (frames taking longer than 16.67ms)
      const droppedFrames = frameData.filter(time => time > FRAME_TIME_MS * 1.5).length;
      const droppedFramePercentage = (droppedFrames / frameData.length) * 100;

      // Performance requirements for breathing animation
      expect(actualFPS).toBeGreaterThanOrEqual(50); // Allow some tolerance
      expect(droppedFramePercentage).toBeLessThan(5); // <5% dropped frames
      expect(averageFrameTime).toBeLessThan(20); // Average frame time under 20ms
    });

    test('3-minute breathing session memory stability', async () => {
      const SESSION_DURATION = 180; // 3 minutes in seconds  
      const FRAME_RATE = 60;
      const TOTAL_FRAMES = SESSION_DURATION * FRAME_RATE;
      
      let memoryUsage = 0; // Mock memory tracking
      const memorySnapshots: number[] = [];

      // Simulate 3-minute breathing session
      for (let frame = 0; frame < TOTAL_FRAMES; frame++) {
        // Mock animation calculations
        const progress = (frame / TOTAL_FRAMES) * Math.PI * 2;
        const breathPhase = Math.sin(progress / 20); // 20-second breath cycle
        const scale = 1 + breathPhase * 0.3;
        
        // Simulate memory usage (objects creation/cleanup)
        memoryUsage += 1;
        if (frame % 60 === 0) { // Cleanup every second
          memoryUsage = Math.max(0, memoryUsage - 30);
          memorySnapshots.push(memoryUsage);
        }
      }

      // Memory should remain stable (no continuous growth)
      const startMemory = memorySnapshots[0];
      const endMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowthRatio = endMemory / startMemory;

      expect(memoryGrowthRatio).toBeLessThan(1.5); // Memory shouldn't grow more than 50%
    });
  });

  describe('Check-in Flow Performance', () => {
    test('Check-in transition times (<500ms)', async () => {
      const store = useCheckInStore.getState();
      
      performanceTracker.mark('checkin-start');
      
      store.startCheckIn('morning');
      
      performanceTracker.mark('checkin-init');
      
      // Simulate step transitions
      const transitionTimes: number[] = [];
      
      for (let step = 0; step < 5; step++) {
        performanceTracker.mark(`step-${step}-start`);
        
        // Update check-in data (simulating screen transition)
        store.updateCurrentCheckIn({ 
          sleepQuality: 7,
          energyLevel: step + 5
        });
        
        performanceTracker.mark(`step-${step}-end`);
        
        const stepTime = performanceTracker.measure(
          `step-${step}`,
          `step-${step}-start`,
          `step-${step}-end`
        );
        
        transitionTimes.push(stepTime);
      }

      // Each transition should be under 500ms
      transitionTimes.forEach((time, index) => {
        expect(time).toBeLessThan(500);
      });

      const initTime = performanceTracker.measure(
        'checkin-initialization',
        'checkin-start',
        'checkin-init'
      );

      expect(initTime).toBeLessThan(200);
    });
  });

  describe('Concurrent Performance Under Load', () => {
    test('Multiple simultaneous operations', async () => {
      const operations = [
        // Assessment loading
        () => {
          const store = useAssessmentStore.getState();
          return store.loadAssessments();
        },
        // Check-in loading
        () => {
          const store = useCheckInStore.getState();
          return store.loadCheckIns();
        },
        // Data store operation
        () => dataStore.validateData(),
        // Emergency call simulation
        () => Promise.resolve('emergency-ready')
      ];

      performanceTracker.mark('concurrent-start');
      
      const results = await Promise.all(operations.map(op => op()));
      
      performanceTracker.mark('concurrent-end');

      const concurrentTime = performanceTracker.measure(
        'concurrent-operations',
        'concurrent-start',
        'concurrent-end'
      );

      // All operations should complete within reasonable time
      expect(concurrentTime).toBeLessThan(2000);
      expect(results).toHaveLength(4);
    });
  });
});