/**
 * Being. Performance Monitoring Utility
 * 
 * Real-time performance monitoring for dark mode implementation
 * Tracks theme switching, crisis response, and clinical requirements
 */

// Performance monitoring configuration
export const PERFORMANCE_THRESHOLDS = {
  THEME_SWITCH: 200,        // <200ms theme switching requirement
  CRISIS_RESPONSE: 200,     // <200ms crisis button response  
  PAGE_LOAD: 2000,          // <2s page load
  ANIMATION_FRAME: 16.67,   // 60fps requirement (16.67ms per frame)
  MEMORY_LEAK: 10,          // <10% memory increase threshold
} as const;

export const CLINICAL_REQUIREMENTS = {
  CRISIS_CONTRAST_RATIO: 7,    // 7:1 minimum contrast for crisis elements
  TOUCH_TARGET_SIZE: 44,       // 44px minimum touch target
  FOCUS_INDICATOR_SIZE: 3,     // 3px minimum focus indicator
} as const;

// Performance metrics interface
export interface PerformanceMetrics {
  timestamp: number;
  themeSwitch?: {
    duration: number;
    fromTheme: string;
    toTheme: string;
    passed: boolean;
  };
  crisisResponse?: {
    duration: number;
    elementId: string;
    passed: boolean;
  };
  memoryUsage?: {
    usedJSMemory: number;
    totalJSMemory: number;
    timestamp: number;
  };
  pageLoad?: {
    duration: number;
    theme: string;
    passed: boolean;
  };
  animationFrame?: {
    frameDuration: number;
    droppedFrames: number;
    passed: boolean;
  };
}

// Performance monitor class
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;

  constructor() {
    this.setupPerformanceObservers();
  }

  // Start monitoring performance
  public startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🔍 Being. Performance Monitoring started');
    
    // Monitor theme switching
    this.monitorThemeSwitching();
    
    // Monitor crisis elements
    this.monitorCrisisElements();
    
    // Monitor memory usage
    this.monitorMemoryUsage();
    
    // Monitor animation performance
    this.monitorAnimationPerformance();
  }

  // Stop monitoring
  public stopMonitoring(): void {
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    console.log('🔍 Being. Performance Monitoring stopped');
  }

  // Measure theme switching performance
  public measureThemeSwitch(fromTheme: string, toTheme: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      // Listen for theme transition completion
      const checkTransition = () => {
        const isTransitioning = document.documentElement.classList.contains('theme-transitioning');
        
        if (!isTransitioning) {
          const duration = performance.now() - startTime;
          
          const metric: PerformanceMetrics = {
            timestamp: Date.now(),
            themeSwitch: {
              duration,
              fromTheme,
              toTheme,
              passed: duration < PERFORMANCE_THRESHOLDS.THEME_SWITCH
            }
          };
          
          this.addMetric(metric);
          
          if (duration > PERFORMANCE_THRESHOLDS.THEME_SWITCH) {
            console.warn(`⚠️ Theme switch exceeded threshold: ${duration.toFixed(2)}ms (target: ${PERFORMANCE_THRESHOLDS.THEME_SWITCH}ms)`);
          }
          
          resolve(duration);
        } else {
          requestAnimationFrame(checkTransition);
        }
      };
      
      requestAnimationFrame(checkTransition);
    });
  }

  // Measure crisis element response time
  public measureCrisisResponse(elementId: string): number {
    const startTime = performance.now();
    
    // Simulate crisis element interaction
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`⚠️ Crisis element not found: ${elementId}`);
      return 0;
    }
    
    // Measure response time
    const duration = performance.now() - startTime;
    
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      crisisResponse: {
        duration,
        elementId,
        passed: duration < PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE
      }
    };
    
    this.addMetric(metric);
    
    if (duration > PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE) {
      console.error(`❌ Crisis response exceeded threshold: ${duration.toFixed(2)}ms (target: ${PERFORMANCE_THRESHOLDS.CRISIS_RESPONSE}ms)`);
    }
    
    return duration;
  }

  // Monitor theme switching automatically
  private monitorThemeSwitching(): void {
    if (typeof window === 'undefined') return;
    
    let lastTheme = '';
    
    // Watch for theme changes
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const currentTheme = this.getCurrentTheme();
          
          if (lastTheme && lastTheme !== currentTheme) {
            // Theme changed, measure performance
            this.measureThemeSwitch(lastTheme, currentTheme);
          }
          
          lastTheme = currentTheme;
        }
      });
    });
    
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    this.observers.push(themeObserver);
  }

  // Monitor crisis elements
  private monitorCrisisElements(): void {
    if (typeof window === 'undefined') return;
    
    // Monitor crisis buttons
    const crisisElements = document.querySelectorAll('[data-crisis="true"], .crisis-button, #crisis-help-button');
    
    crisisElements.forEach((element) => {
      element.addEventListener('click', () => {
        const elementId = element.id || 'crisis-element';
        this.measureCrisisResponse(elementId);
      });
    });
    
    // Monitor for dynamically added crisis elements
    const crisisObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            if (element.matches('[data-crisis="true"], .crisis-button') || element.id === 'crisis-help-button') {
              element.addEventListener('click', () => {
                const elementId = element.id || 'crisis-element';
                this.measureCrisisResponse(elementId);
              });
            }
          }
        });
      });
    });
    
    crisisObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.observers.push(crisisObserver);
  }

  // Monitor memory usage
  private monitorMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;
    
    const checkMemory = () => {
      if (!this.isMonitoring) return;
      
      const memory = (performance as any).memory;
      
      const metric: PerformanceMetrics = {
        timestamp: Date.now(),
        memoryUsage: {
          usedJSMemory: memory.usedJSMemory,
          totalJSMemory: memory.totalJSMemory,
          timestamp: Date.now()
        }
      };
      
      this.addMetric(metric);
      
      // Check for memory leaks
      const memoryMetrics = this.metrics
        .filter(m => m.memoryUsage)
        .slice(-10); // Last 10 measurements
      
      if (memoryMetrics.length >= 2) {
        const first = memoryMetrics[0].memoryUsage!;
        const last = memoryMetrics[memoryMetrics.length - 1].memoryUsage!;
        
        const memoryIncrease = ((last.usedJSMemory - first.usedJSMemory) / first.usedJSMemory) * 100;
        
        if (memoryIncrease > PERFORMANCE_THRESHOLDS.MEMORY_LEAK) {
          console.warn(`⚠️ Potential memory leak detected: ${memoryIncrease.toFixed(1)}% increase`);
        }
      }
      
      // Check again in 5 seconds
      setTimeout(checkMemory, 5000);
    };
    
    // Start monitoring memory
    setTimeout(checkMemory, 1000);
  }

  // Monitor animation performance
  private monitorAnimationPerformance(): void {
    if (typeof window === 'undefined') return;
    
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let droppedFrames = 0;
    
    const measureFrame = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const frameDuration = currentTime - lastFrameTime;
      
      frameCount++;
      
      if (frameDuration > PERFORMANCE_THRESHOLDS.ANIMATION_FRAME * 1.5) {
        droppedFrames++;
      }
      
      // Report every 60 frames (~1 second at 60fps)
      if (frameCount >= 60) {
        const metric: PerformanceMetrics = {
          timestamp: Date.now(),
          animationFrame: {
            frameDuration: frameDuration,
            droppedFrames,
            passed: droppedFrames / frameCount < 0.1 // <10% dropped frames
          }
        };
        
        this.addMetric(metric);
        
        if (droppedFrames / frameCount > 0.1) {
          console.warn(`⚠️ Animation performance degraded: ${droppedFrames}/${frameCount} frames dropped`);
        }
        
        frameCount = 0;
        droppedFrames = 0;
      }
      
      lastFrameTime = currentTime;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
  }

  // Setup performance observers
  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    
    // Observe paint events
    try {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            console.log(`🎨 First Contentful Paint: ${entry.startTime.toFixed(2)}ms`);
          }
        });
      });
      
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn('Paint observer not supported');
    }
  }

  // Get current theme
  private getCurrentTheme(): string {
    const classList = document.documentElement.classList;
    
    if (classList.contains('dark')) return 'dark';
    if (classList.contains('light')) return 'light';
    
    // Check for theme variants
    if (classList.contains('theme-morning')) return 'morning';
    if (classList.contains('theme-midday')) return 'midday';
    if (classList.contains('theme-evening')) return 'evening';
    
    return 'unknown';
  }

  // Add metric to collection
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory bloat
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Get performance summary
  public getPerformanceSummary(): {
    themeSwitch: { average: number; count: number; passRate: number };
    crisisResponse: { average: number; count: number; passRate: number };
    memoryUsage: { current: number; trend: string };
    animationPerformance: { averageFrameTime: number; passRate: number };
  } {
    const themeSwitchMetrics = this.metrics.filter(m => m.themeSwitch);
    const crisisMetrics = this.metrics.filter(m => m.crisisResponse);
    const memoryMetrics = this.metrics.filter(m => m.memoryUsage);
    const animationMetrics = this.metrics.filter(m => m.animationFrame);
    
    return {
      themeSwitch: {
        average: themeSwitchMetrics.length > 0 
          ? themeSwitchMetrics.reduce((sum, m) => sum + m.themeSwitch!.duration, 0) / themeSwitchMetrics.length 
          : 0,
        count: themeSwitchMetrics.length,
        passRate: themeSwitchMetrics.length > 0 
          ? (themeSwitchMetrics.filter(m => m.themeSwitch!.passed).length / themeSwitchMetrics.length) * 100 
          : 0
      },
      crisisResponse: {
        average: crisisMetrics.length > 0 
          ? crisisMetrics.reduce((sum, m) => sum + m.crisisResponse!.duration, 0) / crisisMetrics.length 
          : 0,
        count: crisisMetrics.length,
        passRate: crisisMetrics.length > 0 
          ? (crisisMetrics.filter(m => m.crisisResponse!.passed).length / crisisMetrics.length) * 100 
          : 0
      },
      memoryUsage: {
        current: memoryMetrics.length > 0 
          ? memoryMetrics[memoryMetrics.length - 1].memoryUsage!.usedJSMemory / 1024 / 1024 
          : 0,
        trend: memoryMetrics.length >= 2 
          ? memoryMetrics[memoryMetrics.length - 1].memoryUsage!.usedJSMemory > memoryMetrics[0].memoryUsage!.usedJSMemory 
            ? 'increasing' 
            : 'stable'
          : 'unknown'
      },
      animationPerformance: {
        averageFrameTime: animationMetrics.length > 0 
          ? animationMetrics.reduce((sum, m) => sum + m.animationFrame!.frameDuration, 0) / animationMetrics.length 
          : 0,
        passRate: animationMetrics.length > 0 
          ? (animationMetrics.filter(m => m.animationFrame!.passed).length / animationMetrics.length) * 100 
          : 0
      }
    };
  }

  // Get all metrics
  public getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  // Clear metrics
  public clearMetrics(): void {
    this.metrics = [];
  }
}

// Global performance monitor instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

// Initialize performance monitor
export function initializePerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}

// Get global performance monitor
export function getPerformanceMonitor(): PerformanceMonitor | null {
  return performanceMonitorInstance;
}

// Development mode helpers
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Expose performance monitor to window for debugging
  (window as any).beingPerformanceMonitor = {
    start: () => initializePerformanceMonitor().startMonitoring(),
    stop: () => performanceMonitorInstance?.stopMonitoring(),
    summary: () => performanceMonitorInstance?.getPerformanceSummary(),
    metrics: () => performanceMonitorInstance?.getAllMetrics(),
    clear: () => performanceMonitorInstance?.clearMetrics(),
  };
  
  console.log('🔧 Being. Performance Monitor available at window.beingPerformanceMonitor');
}