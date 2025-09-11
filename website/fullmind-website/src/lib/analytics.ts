/**
 * FullMind Website - Analytics & Performance Monitoring
 * Clinical-grade analytics with privacy compliance and performance tracking
 */

import { type AnalyticsEvent, type PerformanceMetrics, type WebVitalsMetric } from '@/types/api';

// ============================================================================
// CORE WEB VITALS MONITORING
// ============================================================================

/**
 * Tracks Core Web Vitals metrics for clinical-grade performance monitoring
 */
export class WebVitalsTracker {
  private static instance: WebVitalsTracker;
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
  }

  public static getInstance(): WebVitalsTracker {
    if (!WebVitalsTracker.instance) {
      WebVitalsTracker.instance = new WebVitalsTracker();
    }
    return WebVitalsTracker.instance;
  }

  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    this.observeLCP();
    
    // First Input Delay (FID)
    this.observeFID();
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS();
    
    // First Contentful Paint (FCP)
    this.observeFCP();
    
    // Time to First Byte (TTFB)
    this.observeTTFB();
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lcpEntry = entries[entries.length - 1] as PerformanceEntry;
      
      this.recordMetric({
        name: 'LCP',
        value: lcpEntry.startTime,
        id: this.generateId(),
        url: window.location.pathname,
        timestamp: new Date(),
        connection: this.getConnectionInfo()
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP observation failed:', error);
    }
  }

  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries() as PerformanceEventTiming[];
      
      entries.forEach((entry) => {
        this.recordMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          id: this.generateId(),
          url: window.location.pathname,
          timestamp: new Date(),
          connection: this.getConnectionInfo()
        });
      });
    });

    try {
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID observation failed:', error);
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries() as PerformanceEntry[];
      
      entries.forEach((entry) => {
        // Type assertion for layout shift entries
        const layoutShiftEntry = entry as PerformanceEntry & { 
          value: number; 
          hadRecentInput: boolean; 
        };

        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
          clsEntries.push(entry);
        }
      });

      this.recordMetric({
        name: 'CLS',
        value: clsValue,
        id: this.generateId(),
        url: window.location.pathname,
        timestamp: new Date(),
        connection: this.getConnectionInfo()
      });
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS observation failed:', error);
    }
  }

  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      
      entries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric({
            name: 'FCP',
            value: entry.startTime,
            id: this.generateId(),
            url: window.location.pathname,
            timestamp: new Date(),
            connection: this.getConnectionInfo()
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FCP observation failed:', error);
    }
  }

  private observeTTFB(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      
      this.recordMetric({
        name: 'TTFB',
        value: ttfb,
        id: this.generateId(),
        url: window.location.pathname,
        timestamp: new Date(),
        connection: this.getConnectionInfo()
      });
    }
  }

  private recordMetric(metric: WebVitalsMetric): void {
    this.metrics.set(metric.id, metric);
    
    // Send to analytics service
    this.sendToAnalytics(metric);
    
    // Check against clinical performance thresholds
    this.validatePerformance(metric);
  }

  private sendToAnalytics(metric: WebVitalsMetric): void {
    // Integration with analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        custom_map: {
          metric_id: metric.id,
          metric_url: metric.url
        }
      });
    }

    // Send to internal monitoring
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metric),
    }).catch((error) => {
      console.warn('Failed to send web vitals:', error);
    });
  }

  private validatePerformance(metric: WebVitalsMetric): void {
    const thresholds = {
      LCP: 2500, // ms
      FID: 100,  // ms
      CLS: 0.1,  // score
      FCP: 1800, // ms
      TTFB: 600  // ms
    };

    const threshold = thresholds[metric.name];
    if (metric.value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric.name}:`, {
        value: metric.value,
        threshold,
        url: metric.url
      });

      // Send alert for clinical applications
      this.sendPerformanceAlert(metric, threshold);
    }
  }

  private sendPerformanceAlert(metric: WebVitalsMetric, threshold: number): void {
    // Critical for mental health applications where performance impacts user safety
    fetch('/api/alerts/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        threshold,
        url: metric.url,
        severity: metric.value > threshold * 2 ? 'critical' : 'warning',
        timestamp: metric.timestamp
      }),
    }).catch((error) => {
      console.error('Failed to send performance alert:', error);
    });
  }

  private getConnectionInfo(): WebVitalsMetric['connection'] {
    if (typeof navigator === 'undefined' || !('connection' in navigator)) {
      return undefined;
    }

    const connection = (navigator as Navigator & { 
      connection?: { 
        effectiveType: string; 
        rtt: number; 
        downlink: number; 
      } 
    }).connection;

    if (!connection) return undefined;

    return {
      effectiveType: connection.effectiveType,
      rtt: connection.rtt,
      downlink: connection.downlink
    };
  }

  private generateId(): string {
    return `wv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public getMetrics(): WebVitalsMetric[] {
    return Array.from(this.metrics.values());
  }

  public cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// ============================================================================
// USER ANALYTICS (PRIVACY-COMPLIANT)
// ============================================================================

export class PrivacyCompliantAnalytics {
  private static instance: PrivacyCompliantAnalytics;
  private consentGiven = false;
  private eventQueue: AnalyticsEvent[] = [];

  private constructor() {
    this.initializeConsent();
  }

  public static getInstance(): PrivacyCompliantAnalytics {
    if (!PrivacyCompliantAnalytics.instance) {
      PrivacyCompliantAnalytics.instance = new PrivacyCompliantAnalytics();
    }
    return PrivacyCompliantAnalytics.instance;
  }

  private initializeConsent(): void {
    if (typeof window === 'undefined') return;

    // Check for stored consent
    const storedConsent = localStorage.getItem('fullmind-analytics-consent');
    this.consentGiven = storedConsent === 'true';

    // Process queued events if consent was already given
    if (this.consentGiven) {
      this.processEventQueue();
    }
  }

  public setConsent(granted: boolean): void {
    this.consentGiven = granted;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('fullmind-analytics-consent', granted.toString());
    }

    if (granted) {
      this.processEventQueue();
    } else {
      this.clearEventQueue();
    }

    // Update Google Analytics consent
    if (typeof gtag !== 'undefined') {
      gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
        ad_storage: 'denied' // Always deny ad storage for healthcare apps
      });
    }
  }

  public trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date()
    };

    if (this.consentGiven) {
      this.sendEvent(fullEvent);
    } else {
      this.queueEvent(fullEvent);
    }
  }

  private sendEvent(event: AnalyticsEvent): void {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', event.name, {
        event_category: event.category,
        ...event.properties
      });
    }

    // Internal analytics
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...event,
        // Remove PII and sanitize data
        properties: this.sanitizeProperties(event.properties)
      }),
    }).catch((error) => {
      console.warn('Failed to send analytics event:', error);
    });
  }

  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);
    
    // Limit queue size to prevent memory issues
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift();
    }
  }

  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  }

  private clearEventQueue(): void {
    this.eventQueue = [];
  }

  private sanitizeProperties(properties: Record<string, string | number | boolean> = {}): Record<string, string | number | boolean> {
    const sanitized: Record<string, string | number | boolean> = {};
    
    // Allow-list of safe properties
    const allowedProperties = [
      'page_url', 'page_title', 'referrer', 'user_agent',
      'screen_resolution', 'viewport_size', 'color_depth',
      'language', 'timezone', 'connection_type',
      'button_text', 'link_url', 'form_type', 'error_type',
      'feature_used', 'engagement_time', 'scroll_depth'
    ];

    Object.entries(properties).forEach(([key, value]) => {
      if (allowedProperties.includes(key)) {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  // Convenience methods for common events
  public trackPageView(url: string, title: string): void {
    this.trackEvent({
      name: 'page_view',
      category: 'navigation',
      properties: {
        page_url: url,
        page_title: title
      }
    });
  }

  public trackButtonClick(buttonText: string, location: string): void {
    this.trackEvent({
      name: 'button_click',
      category: 'interaction',
      properties: {
        button_text: buttonText,
        location
      }
    });
  }

  public trackFormSubmission(formType: string, success: boolean): void {
    this.trackEvent({
      name: 'form_submission',
      category: success ? 'conversion' : 'error',
      properties: {
        form_type: formType,
        success
      }
    });
  }

  public trackError(errorType: string, errorMessage: string, location: string): void {
    this.trackEvent({
      name: 'error_occurred',
      category: 'error',
      properties: {
        error_type: errorType,
        error_message: errorMessage.substring(0, 100), // Limit message length
        location
      }
    });
  }
}

// ============================================================================
// PERFORMANCE BUDGET MONITORING
// ============================================================================

export class PerformanceBudget {
  private static readonly budgets = {
    // Bundle size limits (bytes)
    javascript: 250 * 1024,      // 250KB
    css: 50 * 1024,              // 50KB  
    images: 500 * 1024,          // 500KB per page
    fonts: 100 * 1024,           // 100KB
    total: 1000 * 1024,          // 1MB total
    
    // Timing budgets (milliseconds)
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    ttfb: 600,
    fcp: 1800
  } as const;

  public static checkBudget(): Promise<{
    passed: boolean;
    violations: Array<{
      metric: string;
      actual: number;
      budget: number;
      severity: 'warning' | 'error';
    }>;
  }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve({ passed: true, violations: [] });
        return;
      }

      const violations: Array<{
        metric: string;
        actual: number;
        budget: number;
        severity: 'warning' | 'error';
      }> = [];

      // Check performance timing budgets
      const vitalsTracker = WebVitalsTracker.getInstance();
      const metrics = vitalsTracker.getMetrics();

      metrics.forEach((metric) => {
        const budget = this.budgets[metric.name.toLowerCase() as keyof typeof this.budgets];
        if (typeof budget === 'number' && metric.value > budget) {
          violations.push({
            metric: metric.name,
            actual: metric.value,
            budget,
            severity: metric.value > budget * 1.5 ? 'error' : 'warning'
          });
        }
      });

      // Check resource sizes
      if ('performance' in window) {
        const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        let totalJS = 0;
        let totalCSS = 0;
        let totalImages = 0;
        let totalFonts = 0;

        resourceEntries.forEach((entry) => {
          const size = entry.transferSize || 0;
          
          if (entry.name.includes('.js')) {
            totalJS += size;
          } else if (entry.name.includes('.css')) {
            totalCSS += size;
          } else if (entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i)) {
            totalImages += size;
          } else if (entry.name.match(/\.(woff|woff2|ttf|otf)$/i)) {
            totalFonts += size;
          }
        });

        // Check individual budgets
        const budgetChecks = [
          { name: 'JavaScript', actual: totalJS, budget: this.budgets.javascript },
          { name: 'CSS', actual: totalCSS, budget: this.budgets.css },
          { name: 'Images', actual: totalImages, budget: this.budgets.images },
          { name: 'Fonts', actual: totalFonts, budget: this.budgets.fonts },
          { name: 'Total', actual: totalJS + totalCSS + totalImages + totalFonts, budget: this.budgets.total }
        ];

        budgetChecks.forEach(({ name, actual, budget }) => {
          if (actual > budget) {
            violations.push({
              metric: name,
              actual,
              budget,
              severity: actual > budget * 1.2 ? 'error' : 'warning'
            });
          }
        });
      }

      resolve({
        passed: violations.length === 0,
        violations
      });
    });
  }
}

// ============================================================================
// INITIALIZATION & UTILITIES
// ============================================================================

/**
 * Initializes all analytics and performance monitoring
 */
export function initializeAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Initialize Web Vitals tracking
  WebVitalsTracker.getInstance();

  // Initialize privacy-compliant analytics
  PrivacyCompliantAnalytics.getInstance();

  // Check performance budget on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      PerformanceBudget.checkBudget().then((result) => {
        if (!result.passed) {
          console.warn('Performance budget violations:', result.violations);
          
          // Send violations to monitoring
          fetch('/api/alerts/performance-budget', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
          }).catch((error) => {
            console.error('Failed to send performance budget alert:', error);
          });
        }
      });
    }, 5000); // Check after 5 seconds to ensure all resources are loaded
  });
}

// Global analytics instance for easy access
export const analytics = PrivacyCompliantAnalytics.getInstance();

// Declare global gtag function for TypeScript
declare global {
  function gtag(...args: unknown[]): void;
}