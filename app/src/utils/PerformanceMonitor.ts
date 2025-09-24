/**
 * Performance Monitor - Real-time performance tracking for FullMind
 * Monitors critical metrics during therapeutic sessions
 */

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  jsThreadUsage: number;
  animationFrameDrops: number;
  crisisResponseTime: number;
  assessmentLoadTime: number;
  navigationTime: number;
}

interface PerformanceAlert {
  type: 'critical' | 'warning' | 'info';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  timestamp: number;
  context?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    frameRate: 60,
    memoryUsage: 0,
    jsThreadUsage: 0,
    animationFrameDrops: 0,
    crisisResponseTime: 0,
    assessmentLoadTime: 0,
    navigationTime: 0,
  };

  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  
  // Performance thresholds for therapeutic effectiveness
  private thresholds = {
    frameRate: { critical: 45, warning: 50 }, // Below 45fps is critical for breathing
    memoryUsage: { critical: 150 * 1024 * 1024, warning: 120 * 1024 * 1024 }, // 150MB critical
    jsThreadUsage: { critical: 80, warning: 70 }, // JS thread % usage
    animationFrameDrops: { critical: 10, warning: 5 }, // % of dropped frames
    crisisResponseTime: { critical: 300, warning: 200 }, // 200ms target, 300ms critical
    assessmentLoadTime: { critical: 500, warning: 300 }, // 300ms target
    navigationTime: { critical: 1000, warning: 500 }, // 500ms target
  };

  /**
   * Start performance monitoring for a therapeutic session
   */
  startMonitoring(context: string = 'general'): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring already active');
      return;
    }

    this.isMonitoring = true;
    this.alerts = [];
    
    console.log(`🔍 Performance monitoring started: ${context}`);

    // Monitor every 1 second during sessions
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzeMetrics();
    }, 1000);
  }

  /**
   * Stop monitoring and generate performance report
   */
  stopMonitoring(): PerformanceAlert[] {
    if (!this.isMonitoring) {
      console.warn('Performance monitoring not active');
      return [];
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    const report = this.generateReport();
    console.log('📊 Performance monitoring stopped');
    console.log(report);

    return this.alerts;
  }

  /**
   * Record specific performance event
   */
  recordEvent(metric: keyof PerformanceMetrics, value: number, context?: string): void {
    this.metrics[metric] = value;
    
    // Immediate threshold check for critical metrics
    this.checkThreshold(metric, value, context);
  }

  /**
   * Track breathing animation performance
   */
  trackBreathingAnimation(frameTime: number, memoryUsage: number): void {
    const fps = frameTime > 0 ? 1000 / frameTime : 60;
    
    this.recordEvent('frameRate', fps, 'breathing_animation');
    this.recordEvent('memoryUsage', memoryUsage, 'breathing_animation');
    
    // Track frame drops
    if (fps < 58) { // Allow 2fps tolerance
      this.metrics.animationFrameDrops += 1;
    }
  }

  /**
   * Track crisis response performance (CRITICAL)
   */
  trackCrisisResponse(startTime: number, context: string = 'crisis_button'): void {
    const responseTime = performance.now() - startTime;
    this.recordEvent('crisisResponseTime', responseTime, context);
    
    // Immediate alert for crisis response issues
    if (responseTime > this.thresholds.crisisResponseTime.critical) {
      this.createAlert('critical', 'crisisResponseTime', responseTime, context);
    }
  }

  /**
   * Track assessment loading performance
   */
  trackAssessmentLoad(startTime: number, context: string = 'assessment_load'): void {
    const loadTime = performance.now() - startTime;
    this.recordEvent('assessmentLoadTime', loadTime, context);
  }

  /**
   * Track navigation performance
   */
  trackNavigation(startTime: number, route: string): void {
    const navigationTime = performance.now() - startTime;
    this.recordEvent('navigationTime', navigationTime, `navigation_${route}`);
  }

  /**
   * Get current performance status
   */
  getStatus(): {
    isHealthy: boolean;
    criticalIssues: number;
    warnings: number;
    metrics: PerformanceMetrics;
  } {
    const criticalAlerts = this.alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = this.alerts.filter(a => a.type === 'warning').length;
    
    return {
      isHealthy: criticalAlerts === 0 && warningAlerts < 3,
      criticalIssues: criticalAlerts,
      warnings: warningAlerts,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Get performance recommendations for optimization
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const recentAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 30000); // Last 30 seconds
    
    recentAlerts.forEach(alert => {
      switch (alert.metric) {
        case 'frameRate':
          if (alert.type === 'critical') {
            recommendations.push('CRITICAL: Breathing animation dropping frames - reduce UI complexity');
            recommendations.push('Consider using native driver for all animations');
          }
          break;
          
        case 'memoryUsage':
          if (alert.type === 'critical') {
            recommendations.push('CRITICAL: Memory usage too high - check for memory leaks');
            recommendations.push('Clear unnecessary state during long sessions');
          }
          break;
          
        case 'crisisResponseTime':
          if (alert.type === 'critical') {
            recommendations.push('CRITICAL: Crisis response too slow - optimize button handling');
            recommendations.push('Remove unnecessary async operations in crisis flow');
          }
          break;
          
        case 'assessmentLoadTime':
          recommendations.push('Optimize assessment store initialization');
          recommendations.push('Consider pre-loading assessment data');
          break;
          
        case 'navigationTime':
          recommendations.push('Optimize navigation stack - reduce screen complexity');
          break;
      }
    });
    
    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  private collectMetrics(): void {
    // In a real implementation, these would collect actual metrics
    // For now, we'll use simulated values that can be overridden by real measurements
    
    // Memory usage (would use actual memory API)
    if (this.metrics.memoryUsage === 0) {
      this.metrics.memoryUsage = Math.random() * 100 * 1024 * 1024; // Random 0-100MB
    }
    
    // JS thread usage (would use React Native performance API)
    this.metrics.jsThreadUsage = Math.random() * 60 + 20; // Random 20-80%
  }

  private analyzeMetrics(): void {
    Object.entries(this.metrics).forEach(([metric, value]) => {
      this.checkThreshold(metric as keyof PerformanceMetrics, value);
    });
  }

  private checkThreshold(metric: keyof PerformanceMetrics, value: number, context?: string): void {
    const threshold = this.thresholds[metric];
    if (!threshold) return;
    
    if (value > threshold.critical || (metric === 'frameRate' && value < threshold.critical)) {
      this.createAlert('critical', metric, value, context);
    } else if (value > threshold.warning || (metric === 'frameRate' && value < threshold.warning)) {
      this.createAlert('warning', metric, value, context);
    }
  }

  private createAlert(type: PerformanceAlert['type'], metric: keyof PerformanceMetrics, value: number, context?: string): void {
    const threshold = this.thresholds[metric];
    const relevantThreshold = type === 'critical' ? threshold.critical : threshold.warning;
    
    const alert: PerformanceAlert = {
      type,
      metric,
      value,
      threshold: relevantThreshold,
      timestamp: Date.now(),
      context
    };
    
    this.alerts.push(alert);
    
    // Log critical alerts immediately
    if (type === 'critical') {
      console.error(`🚨 CRITICAL PERFORMANCE ALERT: ${metric} = ${value} (threshold: ${relevantThreshold})${context ? ` [${context}]` : ''}`);
    }
  }

  private generateReport(): string {
    const status = this.getStatus();
    const recommendations = this.getRecommendations();
    
    let report = '\n=== PERFORMANCE MONITORING REPORT ===\n';
    report += `Status: ${status.isHealthy ? '✅ HEALTHY' : '⚠️ ISSUES DETECTED'}\n`;
    report += `Critical Issues: ${status.criticalIssues}\n`;
    report += `Warnings: ${status.warnings}\n\n`;
    
    report += 'CURRENT METRICS:\n';
    Object.entries(status.metrics).forEach(([metric, value]) => {
      let formattedValue = value;
      if (metric === 'memoryUsage') {
        formattedValue = `${(value / 1024 / 1024).toFixed(2)}MB`;
      } else if (metric.includes('Time')) {
        formattedValue = `${value.toFixed(2)}ms`;
      } else if (metric === 'frameRate') {
        formattedValue = `${value.toFixed(1)}fps`;
      } else if (metric.includes('Usage')) {
        formattedValue = `${value.toFixed(1)}%`;
      }
      
      report += `- ${metric}: ${formattedValue}\n`;
    });
    
    if (recommendations.length > 0) {
      report += '\nRECOMMENDATIONS:\n';
      recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }
    
    report += '\n=== END REPORT ===\n';
    
    return report;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export types for external use
export type { PerformanceMetrics, PerformanceAlert };

// Convenience hooks for React components
export const usePerformanceTracking = () => {
  return {
    trackBreathingAnimation: (frameTime: number, memoryUsage: number) => 
      performanceMonitor.trackBreathingAnimation(frameTime, memoryUsage),
      
    trackCrisisResponse: (startTime: number, context?: string) => 
      performanceMonitor.trackCrisisResponse(startTime, context),
      
    trackAssessmentLoad: (startTime: number, context?: string) => 
      performanceMonitor.trackAssessmentLoad(startTime, context),
      
    trackNavigation: (startTime: number, route: string) => 
      performanceMonitor.trackNavigation(startTime, route),
      
    getStatus: () => performanceMonitor.getStatus(),
    
    getRecommendations: () => performanceMonitor.getRecommendations(),
  };
};