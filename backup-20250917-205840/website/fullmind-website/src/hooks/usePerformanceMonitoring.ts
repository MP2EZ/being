/**
 * FullMind Performance Monitoring Hook
 * Provides clinical-grade performance monitoring for React components
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { 
  initializeClinicalPerformanceMonitor, 
  getClinicalPerformanceMonitor,
  performanceUtils,
  type ClinicalPerformanceMetrics,
  type PerformanceBudget 
} from '@/lib/performance';

interface UsePerformanceMonitoringOptions {
  budget?: Partial<PerformanceBudget>;
  trackComponentRenders?: boolean;
  trackUserInteractions?: boolean;
  enabled?: boolean;
}

interface PerformanceHookResult {
  metrics: Partial<ClinicalPerformanceMetrics>;
  measureExecution: typeof performanceUtils.measureExecution;
  measureAsync: typeof performanceUtils.measureAsync;
  measureDOMOperation: typeof performanceUtils.measureDOMOperation;
  startMeasurement: (label: string) => () => void;
  reportCustomMetric: (name: string, value: number, category?: string) => void;
}

export function usePerformanceMonitoring(
  componentName: string,
  options: UsePerformanceMonitoringOptions = {}
): PerformanceHookResult {
  const {
    budget,
    trackComponentRenders = true,
    trackUserInteractions = true,
    enabled = typeof window !== 'undefined'
  } = options;

  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const componentStartTimeRef = useRef<number>(0);

  // Initialize performance monitor
  useEffect(() => {
    if (!enabled) return;

    let monitor = getClinicalPerformanceMonitor();
    if (!monitor) {
      monitor = initializeClinicalPerformanceMonitor(budget);
    }

    componentStartTimeRef.current = performance.now();

    return () => {
      // Report component lifetime metrics
      const componentLifetime = performance.now() - componentStartTimeRef.current;
      if (componentLifetime > 10000) { // Component lived longer than 10s
        console.debug(`Component ${componentName} lifetime:`, componentLifetime.toFixed(2), 'ms');
      }
    };
  }, [componentName, budget, enabled]);

  // Track component renders
  useEffect(() => {
    if (!trackComponentRenders || !enabled) return;

    const renderStart = performance.now();
    renderCountRef.current += 1;

    // Measure render time
    const measureRenderEnd = () => {
      const renderTime = performance.now() - renderStart;
      renderTimesRef.current.push(renderTime);

      // Keep only last 10 render times
      if (renderTimesRef.current.length > 10) {
        renderTimesRef.current.shift();
      }

      // Warn about slow renders
      if (renderTime > 16.67) { // Slower than 60fps
        console.warn(`Slow render in ${componentName}:`, renderTime.toFixed(2), 'ms');
      }

      // Warn about excessive re-renders
      if (renderCountRef.current > 10) {
        const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
        console.warn(`Component ${componentName} has rendered ${renderCountRef.current} times. Avg render time:`, avgRenderTime.toFixed(2), 'ms');
      }
    };

    // Use setTimeout to measure after DOM updates
    const timeoutId = setTimeout(measureRenderEnd, 0);
    return () => clearTimeout(timeoutId);
  });

  // Get current metrics
  const getMetrics = useCallback((): Partial<ClinicalPerformanceMetrics> => {
    if (!enabled) return {};
    
    const monitor = getClinicalPerformanceMonitor();
    return monitor ? monitor.getMetrics() : {};
  }, [enabled]);

  // Start a custom measurement
  const startMeasurement = useCallback((label: string) => {
    if (!enabled) return () => {};

    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.debug(`Performance measurement [${label}]:`, duration.toFixed(2), 'ms');
      
      // Warn about slow operations
      if (duration > 100) {
        console.warn(`Slow operation [${label}]:`, duration.toFixed(2), 'ms');
      }
    };
  }, [enabled]);

  // Report custom metric
  const reportCustomMetric = useCallback((
    name: string, 
    value: number, 
    category: string = 'custom'
  ) => {
    if (!enabled) return;

    console.debug(`Custom metric [${category}] ${name}:`, value);
    
    // In production, this would be sent to your monitoring service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Send to monitoring service
      console.log('Would send to monitoring:', { name, value, category, component: componentName });
    }
  }, [componentName, enabled]);

  // Track user interactions
  useEffect(() => {
    if (!trackUserInteractions || !enabled) return;

    const handleInteraction = (event: Event) => {
      const interactionStart = performance.now();
      
      // Track the interaction response time
      requestAnimationFrame(() => {
        const responseTime = performance.now() - interactionStart;
        
        if (responseTime > 16.67) { // Slower than 60fps
          console.warn(
            `Slow interaction response in ${componentName}:`, 
            responseTime.toFixed(2), 'ms',
            'Event:', event.type
          );
        }
      });
    };

    const interactionEvents = ['click', 'keydown', 'touchstart', 'input', 'change'];
    
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, handleInteraction, true);
    });

    return () => {
      interactionEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleInteraction, true);
      });
    };
  }, [componentName, trackUserInteractions, enabled]);

  return {
    metrics: getMetrics(),
    measureExecution: performanceUtils.measureExecution,
    measureAsync: performanceUtils.measureAsync,
    measureDOMOperation: performanceUtils.measureDOMOperation,
    startMeasurement,
    reportCustomMetric,
  };
}

// Specialized hooks for different use cases
export function useCrisisButtonPerformance() {
  const { startMeasurement, reportCustomMetric } = usePerformanceMonitoring('CrisisButton', {
    budget: {
      maxCrisisResponseTime: 200, // Strict 200ms requirement
    },
    trackUserInteractions: true,
  });

  const measureCrisisResponse = useCallback(() => {
    const endMeasurement = startMeasurement('crisis-button-response');
    
    return () => {
      endMeasurement();
      // Additional crisis-specific logging
      console.log('Crisis button activated - response time measured');
    };
  }, [startMeasurement]);

  const reportCrisisMetric = useCallback((value: number) => {
    reportCustomMetric('crisis-response-time', value, 'safety-critical');
    
    if (value > 200) {
      console.error('CRITICAL: Crisis button response time exceeded 200ms:', value);
    }
  }, [reportCustomMetric]);

  return { measureCrisisResponse, reportCrisisMetric };
}

export function useNavigationPerformance() {
  const { startMeasurement, reportCustomMetric } = usePerformanceMonitoring('Navigation', {
    budget: {
      maxNavigationTime: 500, // 500ms for navigation
    },
  });

  const measureNavigation = useCallback((from: string, to: string) => {
    const endMeasurement = startMeasurement(`navigation-${from}-to-${to}`);
    
    return () => {
      endMeasurement();
      reportCustomMetric(`navigation-${from}-to-${to}`, performance.now(), 'navigation');
    };
  }, [startMeasurement, reportCustomMetric]);

  return { measureNavigation };
}

export function useAnimationPerformance(animationName: string) {
  const { measureExecution, reportCustomMetric } = usePerformanceMonitoring(`Animation-${animationName}`, {
    trackComponentRenders: true,
  });

  const measureAnimation = useCallback((animationFn: () => void) => {
    const startTime = performance.now();
    
    const wrappedAnimation = measureExecution(animationFn, `animation-${animationName}`);
    wrappedAnimation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    reportCustomMetric(`animation-${animationName}-duration`, duration, 'animation');
    
    // Check for 60fps compliance (16.67ms per frame)
    if (duration > 16.67) {
      console.warn(`Animation ${animationName} may drop frames:`, duration.toFixed(2), 'ms');
    }
  }, [animationName, measureExecution, reportCustomMetric]);

  return { measureAnimation };
}

export default usePerformanceMonitoring;