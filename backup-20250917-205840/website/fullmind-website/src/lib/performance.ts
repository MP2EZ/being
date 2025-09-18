/**
 * FullMind Clinical Performance Monitoring
 * Tracks performance metrics critical for mental health users
 */

export interface ClinicalPerformanceMetrics {
  // Core Web Vitals (Clinical thresholds)
  lcp: number; // Largest Contentful Paint - Target: <2s
  fid: number; // First Input Delay - Target: <100ms
  cls: number; // Cumulative Layout Shift - Target: <0.1
  
  // Clinical-specific metrics
  crisisButtonResponseTime: number; // Target: <200ms
  pageLoadTime: number; // Target: <2s
  navigationTime: number; // Target: <500ms
  
  // Accessibility metrics
  screenReaderCompatibility: boolean;
  keyboardNavigationTime: number; // Target: <300ms
  focusIndicatorVisibility: boolean;
  
  // Battery and resource efficiency
  memoryUsage: number;
  cpuUsage: number;
  batteryImpact: 'low' | 'medium' | 'high';
  
  // User experience metrics
  timeToInteractive: number; // Target: <3s
  firstContentfulPaint: number; // Target: <1.5s
  
  // Clinical context
  userStressLevel?: 'low' | 'medium' | 'high'; // If detectable
  sessionDuration: number;
  errorCount: number;
}

export interface PerformanceBudget {
  // Bundle size limits
  maxJavaScriptSize: number; // 250KB gzipped
  maxCSSSize: number; // 50KB gzipped
  maxImageSize: number; // 500KB total
  
  // Performance limits
  maxLCP: number; // 2000ms
  maxFID: number; // 100ms
  maxCLS: number; // 0.1
  maxTTI: number; // 3000ms
  
  // Clinical limits
  maxCrisisResponseTime: number; // 200ms
  maxPageLoadTime: number; // 2000ms
  maxNavigationTime: number; // 500ms
}

class ClinicalPerformanceMonitor {
  private metrics: Partial<ClinicalPerformanceMetrics> = {};
  private budget: PerformanceBudget;
  private observers: PerformanceObserver[] = [];
  private startTime: number;

  constructor(budget?: Partial<PerformanceBudget>) {
    this.startTime = performance.now();
    this.budget = {
      maxJavaScriptSize: 250 * 1024, // 250KB
      maxCSSSize: 50 * 1024, // 50KB
      maxImageSize: 500 * 1024, // 500KB
      maxLCP: 2000,
      maxFID: 100,
      maxCLS: 0.1,
      maxTTI: 3000,
      maxCrisisResponseTime: 200,
      maxPageLoadTime: 2000,
      maxNavigationTime: 500,
      ...budget,
    };

    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring(): void {
    // Core Web Vitals monitoring
    this.observeWebVitals();
    
    // Clinical-specific monitoring
    this.observeCrisisButtonPerformance();
    this.observeNavigationPerformance();
    this.observeAccessibilityMetrics();
    this.observeResourceUsage();
    
    // Error tracking
    this.observeErrors();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.metrics.lcp = lastEntry.startTime;
        
        if (this.metrics.lcp > this.budget.maxLCP) {
          this.reportPerformanceViolation('LCP', this.metrics.lcp, this.budget.maxLCP);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.metrics.fid = (entry as any).processingStart - entry.startTime;
          
          if (this.metrics.fid > this.budget.maxFID) {
            this.reportPerformanceViolation('FID', this.metrics.fid, this.budget.maxFID);
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.cls = clsValue;
        
        if (this.metrics.cls > this.budget.maxCLS) {
          this.reportPerformanceViolation('CLS', this.metrics.cls, this.budget.maxCLS);
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }

    // First Contentful Paint
    if ('performance' in window && 'getEntriesByType' in performance) {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        }
      });
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    }
  }

  private observeCrisisButtonPerformance(): void {
    // Monitor crisis button response time
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-crisis-help="true"]')) {
        const responseStart = performance.now();
        
        // Monitor time to crisis screen display
        requestAnimationFrame(() => {
          const responseTime = performance.now() - responseStart;
          this.metrics.crisisButtonResponseTime = responseTime;
          
          if (responseTime > this.budget.maxCrisisResponseTime) {
            this.reportCriticalPerformanceIssue(
              'Crisis button response too slow',
              responseTime,
              this.budget.maxCrisisResponseTime
            );
          }
        });
      }
    });
  }

  private observeNavigationPerformance(): void {
    // Monitor page navigation performance
    const navigationObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming;
        
        // Calculate key navigation metrics
        this.metrics.pageLoadTime = navEntry.loadEventEnd - navEntry.navigationStart;
        this.metrics.timeToInteractive = navEntry.loadEventEnd - navEntry.navigationStart;
        
        if (this.metrics.pageLoadTime > this.budget.maxPageLoadTime) {
          this.reportPerformanceViolation(
            'Page Load Time', 
            this.metrics.pageLoadTime, 
            this.budget.maxPageLoadTime
          );
        }
      }
    });
    
    navigationObserver.observe({ entryTypes: ['navigation'] });
    this.observers.push(navigationObserver);
  }

  private observeAccessibilityMetrics(): void {
    // Monitor focus indicator performance
    let focusStartTime = 0;
    
    document.addEventListener('focusin', () => {
      focusStartTime = performance.now();
    });
    
    document.addEventListener('focusout', () => {
      if (focusStartTime > 0) {
        const focusTime = performance.now() - focusStartTime;
        if (focusTime > 300) { // 300ms threshold for focus indicator
          console.warn('Slow focus indicator response:', focusTime);
        }
      }
    });

    // Check screen reader compatibility
    this.metrics.screenReaderCompatibility = this.checkScreenReaderSupport();
    this.metrics.focusIndicatorVisibility = this.checkFocusIndicatorVisibility();
  }

  private observeResourceUsage(): void {
    // Monitor memory usage if available
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        
        // Alert if memory usage is high (> 100MB)
        if (this.metrics.memoryUsage > 100) {
          console.warn('High memory usage detected:', this.metrics.memoryUsage, 'MB');
        }
      }, 5000);
    }

    // Estimate battery impact based on performance
    this.estimateBatteryImpact();
  }

  private observeErrors(): void {
    this.metrics.errorCount = 0;
    
    window.addEventListener('error', () => {
      this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;
    });
    
    window.addEventListener('unhandledrejection', () => {
      this.metrics.errorCount = (this.metrics.errorCount || 0) + 1;
    });
  }

  private checkScreenReaderSupport(): boolean {
    // Check for ARIA labels and screen reader friendly elements
    const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby]');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"]');
    
    return ariaElements.length > 0 && headings.length > 0 && landmarks.length > 0;
  }

  private checkFocusIndicatorVisibility(): boolean {
    // Create a test element to check focus visibility
    const testElement = document.createElement('button');
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    document.body.appendChild(testElement);
    
    testElement.focus();
    const focusedStyles = window.getComputedStyle(testElement, ':focus');
    
    document.body.removeChild(testElement);
    
    // Check if focus indicator is visible
    const hasOutline = focusedStyles.outline !== 'none';
    const hasBoxShadow = focusedStyles.boxShadow !== 'none';
    const hasBackground = focusedStyles.backgroundColor !== 'transparent';
    
    return hasOutline || hasBoxShadow || hasBackground;
  }

  private estimateBatteryImpact(): void {
    // Estimate battery impact based on performance metrics
    const avgCPU = (this.metrics.lcp || 0) + (this.metrics.fid || 0);
    const memoryUsage = this.metrics.memoryUsage || 0;
    
    if (avgCPU < 1000 && memoryUsage < 50) {
      this.metrics.batteryImpact = 'low';
    } else if (avgCPU < 2000 && memoryUsage < 100) {
      this.metrics.batteryImpact = 'medium';
    } else {
      this.metrics.batteryImpact = 'high';
    }
  }

  private reportPerformanceViolation(metric: string, actual: number, budget: number): void {
    const violation = {
      metric,
      actual: Math.round(actual),
      budget: Math.round(budget),
      severity: actual > budget * 1.5 ? 'critical' : 'warning',
      timestamp: new Date().toISOString(),
    };
    
    console.warn(`Performance Budget Violation [${violation.severity.toUpperCase()}]:`, violation);
    
    // In production, send to monitoring service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      this.sendToMonitoring('performance_violation', violation);
    }
  }

  private reportCriticalPerformanceIssue(issue: string, actual: number, expected: number): void {
    const criticalIssue = {
      issue,
      actual: Math.round(actual),
      expected: Math.round(expected),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    console.error('CRITICAL Performance Issue:', criticalIssue);
    
    // Immediately report critical issues
    this.sendToMonitoring('critical_performance', criticalIssue);
  }

  private sendToMonitoring(event: string, data: any): void {
    // In production, send to your monitoring service (e.g., Sentry, DataDog, etc.)
    // For now, we'll just log to console
    console.log(`Monitor Event [${event}]:`, data);
    
    // Example: Send to hypothetical monitoring service
    // fetch('/api/monitoring', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ event, data, timestamp: Date.now() })
    // });
  }

  public getMetrics(): ClinicalPerformanceMetrics {
    this.metrics.sessionDuration = performance.now() - this.startTime;
    return this.metrics as ClinicalPerformanceMetrics;
  }

  public getBudgetStatus(): { metric: string; status: 'pass' | 'warn' | 'fail'; actual: number; budget: number }[] {
    const metrics = this.getMetrics();
    
    return [
      {
        metric: 'LCP',
        status: this.getStatus(metrics.lcp, this.budget.maxLCP),
        actual: Math.round(metrics.lcp || 0),
        budget: this.budget.maxLCP,
      },
      {
        metric: 'FID',
        status: this.getStatus(metrics.fid, this.budget.maxFID),
        actual: Math.round(metrics.fid || 0),
        budget: this.budget.maxFID,
      },
      {
        metric: 'CLS',
        status: this.getStatus(metrics.cls, this.budget.maxCLS),
        actual: Math.round((metrics.cls || 0) * 1000) / 1000, // 3 decimal places
        budget: this.budget.maxCLS,
      },
      {
        metric: 'Crisis Response',
        status: this.getStatus(metrics.crisisButtonResponseTime, this.budget.maxCrisisResponseTime),
        actual: Math.round(metrics.crisisButtonResponseTime || 0),
        budget: this.budget.maxCrisisResponseTime,
      },
      {
        metric: 'Page Load',
        status: this.getStatus(metrics.pageLoadTime, this.budget.maxPageLoadTime),
        actual: Math.round(metrics.pageLoadTime || 0),
        budget: this.budget.maxPageLoadTime,
      },
    ];
  }

  private getStatus(actual: number | undefined, budget: number): 'pass' | 'warn' | 'fail' {
    if (!actual) return 'pass';
    if (actual <= budget) return 'pass';
    if (actual <= budget * 1.2) return 'warn';
    return 'fail';
  }

  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
let globalPerformanceMonitor: ClinicalPerformanceMonitor | null = null;

export function initializeClinicalPerformanceMonitor(budget?: Partial<PerformanceBudget>): ClinicalPerformanceMonitor {
  if (globalPerformanceMonitor) {
    globalPerformanceMonitor.destroy();
  }
  
  globalPerformanceMonitor = new ClinicalPerformanceMonitor(budget);
  return globalPerformanceMonitor;
}

export function getClinicalPerformanceMonitor(): ClinicalPerformanceMonitor | null {
  return globalPerformanceMonitor;
}

// Performance utilities
export const performanceUtils = {
  // Measure function execution time
  measureExecution: <T extends (...args: any[]) => any>(
    fn: T,
    context: string = 'Unknown'
  ): T => {
    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      const executionTime = end - start;
      if (executionTime > 16.67) { // Longer than one frame at 60fps
        console.warn(`Slow execution in ${context}:`, executionTime.toFixed(2), 'ms');
      }
      
      return result;
    }) as T;
  },

  // Measure async function execution time
  measureAsync: async <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context: string = 'Unknown',
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    
    const executionTime = end - start;
    if (executionTime > 100) { // Async operations should complete within 100ms for good UX
      console.warn(`Slow async execution in ${context}:`, executionTime.toFixed(2), 'ms');
    }
    
    return result;
  },

  // Check if a DOM operation will cause layout thrash
  measureDOMOperation: (operation: () => void, context: string = 'DOM Operation'): void => {
    const start = performance.now();
    operation();
    const end = performance.now();
    
    const executionTime = end - start;
    if (executionTime > 8) { // DOM operations should be fast
      console.warn(`Expensive DOM operation in ${context}:`, executionTime.toFixed(2), 'ms');
    }
  },
};

export default ClinicalPerformanceMonitor;