/**
 * Performance Regression Detection System
 *
 * Automatically detects performance degradations across app versions
 * and therapeutic session quality metrics. Provides actionable insights
 * for maintaining optimal therapeutic timing requirements.
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TherapeuticPerformanceMetrics, PerformanceRegression } from './TherapeuticPerformanceSystem';

// ============================================================================
// REGRESSION DETECTION TYPES
// ============================================================================

interface PerformanceBaseline {
  version: string;
  timestamp: number;
  metrics: TherapeuticPerformanceMetrics;
  sessionCount: number;
  environment: 'development' | 'staging' | 'production';
}

interface RegressionDetectionConfig {
  enabled: boolean;
  sensitivityLevel: 'low' | 'medium' | 'high';
  baselineRetentionDays: number;
  alertThresholds: {
    minor: number; // % degradation
    major: number; // % degradation
    critical: number; // % degradation
  };
  criticalMetrics: (keyof TherapeuticPerformanceMetrics)[];
}

interface RegressionAnalysis {
  detected: PerformanceRegression[];
  trends: MetricTrend[];
  recommendations: string[];
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface MetricTrend {
  metric: keyof TherapeuticPerformanceMetrics;
  direction: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  confidence: number;
  dataPoints: number;
}

interface PerformanceBenchmark {
  metric: keyof TherapeuticPerformanceMetrics;
  target: number;
  tolerance: number; // % tolerance
  category: 'critical' | 'important' | 'nice-to-have';
  therapeuticImpact: string;
}

// ============================================================================
// PERFORMANCE REGRESSION DETECTOR CLASS
// ============================================================================

class PerformanceRegressionDetector {
  private config: RegressionDetectionConfig = {
    enabled: true,
    sensitivityLevel: 'medium',
    baselineRetentionDays: 30,
    alertThresholds: {
      minor: 10, // 10% degradation
      major: 25, // 25% degradation
      critical: 50, // 50% degradation
    },
    criticalMetrics: [
      'crisisResponseTime',
      'frameRate',
      'therapySessionStability',
      'crisisReadinessScore',
      'breathingCycleAccuracy',
    ],
  };

  private baselines: PerformanceBaseline[] = [];
  private currentBaseline?: PerformanceBaseline;

  // Therapeutic performance benchmarks
  private benchmarks: PerformanceBenchmark[] = [
    {
      metric: 'crisisResponseTime',
      target: 150,
      tolerance: 10,
      category: 'critical',
      therapeuticImpact: 'Delayed crisis response compromises user safety',
    },
    {
      metric: 'frameRate',
      target: 60,
      tolerance: 5,
      category: 'critical',
      therapeuticImpact: 'Frame drops during breathing affect therapeutic effectiveness',
    },
    {
      metric: 'therapySessionStability',
      target: 95,
      tolerance: 10,
      category: 'critical',
      therapeuticImpact: 'Session instability disrupts therapeutic flow',
    },
    {
      metric: 'crisisReadinessScore',
      target: 90,
      tolerance: 10,
      category: 'critical',
      therapeuticImpact: 'Poor crisis readiness affects emergency response',
    },
    {
      metric: 'breathingCycleAccuracy',
      target: 25,
      tolerance: 20,
      category: 'important',
      therapeuticImpact: 'Breathing timing inaccuracy affects mindfulness practice',
    },
    {
      metric: 'assessmentLoadTime',
      target: 200,
      tolerance: 15,
      category: 'important',
      therapeuticImpact: 'Slow assessment loading disrupts evaluation flow',
    },
    {
      metric: 'navigationTime',
      target: 300,
      tolerance: 20,
      category: 'important',
      therapeuticImpact: 'Slow navigation affects user engagement',
    },
    {
      metric: 'memoryUsage',
      target: 50 * 1024 * 1024, // 50MB
      tolerance: 30,
      category: 'important',
      therapeuticImpact: 'High memory usage causes app instability',
    },
    {
      metric: 'therapeuticFlowContinuity',
      target: 90,
      tolerance: 15,
      category: 'important',
      therapeuticImpact: 'Poor flow continuity reduces therapeutic benefit',
    },
    {
      metric: 'memoryEfficiencyScore',
      target: 85,
      tolerance: 15,
      category: 'nice-to-have',
      therapeuticImpact: 'Memory inefficiency may cause performance issues',
    },
    {
      metric: 'batteryImpactScore',
      target: 90,
      tolerance: 20,
      category: 'nice-to-have',
      therapeuticImpact: 'High battery usage reduces app accessibility',
    },
  ];

  /**
   * Initialize regression detector
   */
  async initialize(): Promise<void> {
    console.log('🔍 Initializing Performance Regression Detector');

    try {
      // Load existing baselines
      await this.loadBaselines();

      // Clean up old baselines
      await this.cleanupOldBaselines();

      console.log(`✅ Regression detector initialized with ${this.baselines.length} baselines`);
    } catch (error) {
      console.error('❌ Failed to initialize regression detector:', error);
    }
  }

  /**
   * Record new performance baseline
   */
  async recordBaseline(
    metrics: TherapeuticPerformanceMetrics,
    version: string,
    environment: 'development' | 'staging' | 'production' = 'development'
  ): Promise<void> {
    console.log(`📊 Recording performance baseline for version ${version}`);

    const baseline: PerformanceBaseline = {
      version,
      timestamp: Date.now(),
      metrics,
      sessionCount: 1,
      environment,
    };

    // Add to baselines
    this.baselines.push(baseline);
    this.currentBaseline = baseline;

    // Save to storage
    await this.saveBaselines();

    console.log(`✅ Baseline recorded for version ${version}`);
  }

  /**
   * Update current baseline with new metrics
   */
  async updateBaseline(metrics: TherapeuticPerformanceMetrics): Promise<void> {
    if (!this.currentBaseline) {
      console.warn('No current baseline to update');
      return;
    }

    // Calculate rolling average
    const sessionCount = this.currentBaseline.sessionCount + 1;
    const updatedMetrics = this.calculateRollingAverage(
      this.currentBaseline.metrics,
      metrics,
      sessionCount
    );

    this.currentBaseline = {
      ...this.currentBaseline,
      metrics: updatedMetrics,
      sessionCount,
    };

    // Update in baselines array
    const index = this.baselines.findIndex(b => b.version === this.currentBaseline?.version);
    if (index !== -1) {
      this.baselines[index] = this.currentBaseline;
    }

    // Save updated baselines
    await this.saveBaselines();
  }

  /**
   * Detect performance regressions
   */
  async detectRegressions(currentMetrics: TherapeuticPerformanceMetrics): Promise<RegressionAnalysis> {
    if (this.baselines.length < 2) {
      return {
        detected: [],
        trends: [],
        recommendations: ['Need more baseline data for regression detection'],
        confidence: 0,
        impact: 'low',
      };
    }

    const regressions: PerformanceRegression[] = [];
    const trends: MetricTrend[] = [];

    // Compare against most recent baseline
    const latestBaseline = this.baselines[this.baselines.length - 1];

    for (const benchmark of this.benchmarks) {
      const currentValue = currentMetrics[benchmark.metric] as number;
      const baselineValue = latestBaseline.metrics[benchmark.metric] as number;

      if (currentValue === undefined || baselineValue === undefined) continue;

      // Calculate regression
      const regression = this.calculateRegression(
        benchmark.metric,
        currentValue,
        baselineValue,
        benchmark
      );

      if (regression) {
        regressions.push(regression);
      }

      // Calculate trend
      const trend = this.calculateTrend(benchmark.metric);
      if (trend) {
        trends.push(trend);
      }
    }

    // Generate analysis
    const analysis = this.generateRegressionAnalysis(regressions, trends);

    console.log(`🔍 Regression detection complete: ${regressions.length} regressions found`);

    return analysis;
  }

  /**
   * Get performance recommendations based on current metrics
   */
  getPerformanceRecommendations(metrics: TherapeuticPerformanceMetrics): string[] {
    const recommendations: string[] = [];

    for (const benchmark of this.benchmarks) {
      const currentValue = metrics[benchmark.metric] as number;

      if (currentValue === undefined) continue;

      const recommendation = this.getMetricRecommendation(benchmark, currentValue);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Get performance health score
   */
  calculateHealthScore(metrics: TherapeuticPerformanceMetrics): number {
    let totalScore = 0;
    let weightedSum = 0;

    for (const benchmark of this.benchmarks) {
      const currentValue = metrics[benchmark.metric] as number;

      if (currentValue === undefined) continue;

      const score = this.calculateMetricScore(benchmark, currentValue);
      const weight = this.getMetricWeight(benchmark.category);

      totalScore += score * weight;
      weightedSum += weight;
    }

    return weightedSum > 0 ? Math.round(totalScore / weightedSum) : 0;
  }

  /**
   * Export regression detection data for analysis
   */
  async exportRegressionData(): Promise<{
    baselines: PerformanceBaseline[];
    config: RegressionDetectionConfig;
    benchmarks: PerformanceBenchmark[];
  }> {
    return {
      baselines: [...this.baselines],
      config: { ...this.config },
      benchmarks: [...this.benchmarks],
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async loadBaselines(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('being_performance_baselines');
      if (stored) {
        this.baselines = JSON.parse(stored);
        this.currentBaseline = this.baselines[this.baselines.length - 1];
      }
    } catch (error) {
      console.warn('Failed to load performance baselines:', error);
      this.baselines = [];
    }
  }

  private async saveBaselines(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'being_performance_baselines',
        JSON.stringify(this.baselines)
      );
    } catch (error) {
      console.error('Failed to save performance baselines:', error);
    }
  }

  private async cleanupOldBaselines(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.baselineRetentionDays * 24 * 60 * 60 * 1000);
    const before = this.baselines.length;

    this.baselines = this.baselines.filter(baseline => baseline.timestamp > cutoffTime);

    if (this.baselines.length !== before) {
      console.log(`🧹 Cleaned up ${before - this.baselines.length} old baselines`);
      await this.saveBaselines();
    }
  }

  private calculateRollingAverage(
    baseline: TherapeuticPerformanceMetrics,
    newMetrics: TherapeuticPerformanceMetrics,
    sessionCount: number
  ): TherapeuticPerformanceMetrics {
    const updated = { ...baseline };

    for (const key in newMetrics) {
      const metric = key as keyof TherapeuticPerformanceMetrics;
      const currentValue = baseline[metric] as number;
      const newValue = newMetrics[metric] as number;

      if (typeof currentValue === 'number' && typeof newValue === 'number') {
        // Rolling average calculation
        (updated[metric] as number) = (currentValue * (sessionCount - 1) + newValue) / sessionCount;
      }
    }

    return updated;
  }

  private calculateRegression(
    metric: keyof TherapeuticPerformanceMetrics,
    currentValue: number,
    baselineValue: number,
    benchmark: PerformanceBenchmark
  ): PerformanceRegression | null {
    // Calculate degradation percentage
    let degradation: number;

    if (metric === 'frameRate' || benchmark.category === 'critical') {
      // For metrics where higher is better
      degradation = ((baselineValue - currentValue) / baselineValue) * 100;
    } else {
      // For metrics where lower is better (like response times)
      degradation = ((currentValue - baselineValue) / baselineValue) * 100;
    }

    // Determine impact level
    let impact: 'low' | 'medium' | 'high' | 'critical';

    if (degradation >= this.config.alertThresholds.critical) {
      impact = 'critical';
    } else if (degradation >= this.config.alertThresholds.major) {
      impact = 'high';
    } else if (degradation >= this.config.alertThresholds.minor) {
      impact = 'medium';
    } else {
      return null; // No significant regression
    }

    return {
      metric,
      baseline: baselineValue,
      current: currentValue,
      degradation,
      detectedAt: Date.now(),
      impact,
    };
  }

  private calculateTrend(metric: keyof TherapeuticPerformanceMetrics): MetricTrend | null {
    if (this.baselines.length < 3) return null;

    const recentBaselines = this.baselines.slice(-5); // Last 5 baselines
    const values = recentBaselines.map(b => b.metrics[metric] as number).filter(v => v !== undefined);

    if (values.length < 3) return null;

    // Simple linear trend calculation
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction: 'improving' | 'stable' | 'degrading';
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = metric === 'frameRate' ? 'improving' : 'degrading';
    } else {
      direction = metric === 'frameRate' ? 'degrading' : 'improving';
    }

    const changePercent = Math.abs((slope / values[0]) * 100);

    return {
      metric,
      direction,
      changePercent,
      confidence: Math.min(95, values.length * 20), // More data points = higher confidence
      dataPoints: values.length,
    };
  }

  private generateRegressionAnalysis(
    regressions: PerformanceRegression[],
    trends: MetricTrend[]
  ): RegressionAnalysis {
    const recommendations: string[] = [];

    // Critical regressions
    const criticalRegressions = regressions.filter(r => r.impact === 'critical');
    if (criticalRegressions.length > 0) {
      recommendations.push('CRITICAL: Immediate performance optimization required');
      criticalRegressions.forEach(r => {
        const benchmark = this.benchmarks.find(b => b.metric === r.metric);
        if (benchmark) {
          recommendations.push(`CRITICAL: ${r.metric} - ${benchmark.therapeuticImpact}`);
        }
      });
    }

    // High impact regressions
    const highRegressions = regressions.filter(r => r.impact === 'high');
    if (highRegressions.length > 0) {
      recommendations.push('HIGH: Performance optimization recommended');
    }

    // Trending issues
    const degradingTrends = trends.filter(t => t.direction === 'degrading' && t.confidence > 60);
    if (degradingTrends.length > 0) {
      recommendations.push('Monitor degrading performance trends');
    }

    // Calculate overall impact
    let impact: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalRegressions.length > 0) {
      impact = 'critical';
    } else if (highRegressions.length > 0 || degradingTrends.length > 2) {
      impact = 'high';
    } else if (regressions.length > 0) {
      impact = 'medium';
    }

    // Calculate confidence
    const confidence = Math.min(95, this.baselines.length * 10); // More baselines = higher confidence

    return {
      detected: regressions,
      trends,
      recommendations,
      confidence,
      impact,
    };
  }

  private getMetricRecommendation(benchmark: PerformanceBenchmark, currentValue: number): string | null {
    const isWithinTolerance = this.isValueWithinTolerance(benchmark, currentValue);

    if (isWithinTolerance) return null;

    const category = benchmark.category.toUpperCase();
    return `${category}: ${benchmark.metric} (${currentValue}) - ${benchmark.therapeuticImpact}`;
  }

  private calculateMetricScore(benchmark: PerformanceBenchmark, currentValue: number): number {
    const isWithinTolerance = this.isValueWithinTolerance(benchmark, currentValue);

    if (isWithinTolerance) return 100;

    // Calculate how far off from target
    const deviation = Math.abs(currentValue - benchmark.target) / benchmark.target;
    const toleranceDeviation = deviation - (benchmark.tolerance / 100);

    // Score decreases based on how far outside tolerance
    return Math.max(0, 100 - (toleranceDeviation * 100));
  }

  private isValueWithinTolerance(benchmark: PerformanceBenchmark, currentValue: number): boolean {
    const tolerance = (benchmark.target * benchmark.tolerance) / 100;
    return Math.abs(currentValue - benchmark.target) <= tolerance;
  }

  private getMetricWeight(category: 'critical' | 'important' | 'nice-to-have'): number {
    switch (category) {
      case 'critical': return 3;
      case 'important': return 2;
      case 'nice-to-have': return 1;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE AND EXPORTS
// ============================================================================

export const performanceRegressionDetector = new PerformanceRegressionDetector();

// ============================================================================
// REACT HOOK INTEGRATION
// ============================================================================

/**
 * Hook for performance regression monitoring
 */
export const usePerformanceRegressionDetection = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [lastAnalysis, setLastAnalysis] = React.useState<RegressionAnalysis | null>(null);

  React.useEffect(() => {
    const initialize = async () => {
      await performanceRegressionDetector.initialize();
      setIsInitialized(true);
    };

    initialize();
  }, []);

  const analyzeRegressions = React.useCallback(async (metrics: TherapeuticPerformanceMetrics) => {
    if (!isInitialized) return null;

    const analysis = await performanceRegressionDetector.detectRegressions(metrics);
    setLastAnalysis(analysis);
    return analysis;
  }, [isInitialized]);

  const recordBaseline = React.useCallback(async (
    metrics: TherapeuticPerformanceMetrics,
    version: string,
    environment?: 'development' | 'staging' | 'production'
  ) => {
    if (!isInitialized) return;
    await performanceRegressionDetector.recordBaseline(metrics, version, environment);
  }, [isInitialized]);

  const getHealthScore = React.useCallback((metrics: TherapeuticPerformanceMetrics) => {
    return performanceRegressionDetector.calculateHealthScore(metrics);
  }, []);

  const getRecommendations = React.useCallback((metrics: TherapeuticPerformanceMetrics) => {
    return performanceRegressionDetector.getPerformanceRecommendations(metrics);
  }, []);

  return {
    isInitialized,
    lastAnalysis,
    analyzeRegressions,
    recordBaseline,
    getHealthScore,
    getRecommendations,
  };
};

// Export types and detector
export type {
  PerformanceBaseline,
  RegressionDetectionConfig,
  RegressionAnalysis,
  MetricTrend,
  PerformanceBenchmark,
};

export default performanceRegressionDetector;