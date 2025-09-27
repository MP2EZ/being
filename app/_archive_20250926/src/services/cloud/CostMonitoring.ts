/**
 * Cost Monitoring and Budget Management Service
 *
 * Tracks Supabase usage, monitors costs, and provides budget alerts
 * Ensures cloud features stay within budget constraints
 */

import { cloudMonitoring } from './CloudMonitoring';

export interface UsageMetrics {
  service: 'supabase' | 'storage' | 'auth' | 'realtime';
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  requests: number;
  storage_mb: number;
  bandwidth_mb: number;
  activeUsers: number;
  timestamp: string;
}

export interface CostBreakdown {
  service: string;
  category: string;
  usage: number;
  unit: string;
  ratePerUnit: number;
  cost: number;
  percentage: number;
}

export interface BudgetAlert {
  id: string;
  type: 'warning' | 'critical' | 'exceeded';
  service: string;
  threshold: number;
  current: number;
  projected: number;
  timestamp: string;
  message: string;
  recommendations: string[];
}

export interface BudgetConfiguration {
  daily: {
    total: number;
    requests: number;
    storage_mb: number;
    bandwidth_mb: number;
  };
  weekly: {
    total: number;
    requests: number;
    storage_mb: number;
    bandwidth_mb: number;
  };
  monthly: {
    total: number;
    requests: number;
    storage_mb: number;
    bandwidth_mb: number;
  };
  alertThresholds: {
    warning: number; // 0.75 = 75%
    critical: number; // 0.90 = 90%
    exceeded: number; // 1.0 = 100%
  };
}

/**
 * Cost monitoring and budget management service
 */
export class CostMonitoringService {
  private environment: string;
  private budgetConfig: BudgetConfiguration;
  private usageCache: Map<string, UsageMetrics> = new Map();
  private alertHistory: BudgetAlert[] = [];
  private monitoringActive = false;
  private costCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.environment = process.env.EXPO_PUBLIC_ENV || 'development';
    this.budgetConfig = this.initializeBudgetConfiguration();
    this.startMonitoring();
  }

  /**
   * Initialize budget configuration based on environment
   */
  private initializeBudgetConfiguration(): BudgetConfiguration {
    const defaultConfig: BudgetConfiguration = {
      daily: {
        total: 10.0, // $10 daily budget
        requests: 1000000, // 1M requests
        storage_mb: 1000, // 1GB storage
        bandwidth_mb: 10000 // 10GB bandwidth
      },
      weekly: {
        total: 50.0,
        requests: 5000000,
        storage_mb: 5000,
        bandwidth_mb: 50000
      },
      monthly: {
        total: 200.0,
        requests: 20000000,
        storage_mb: 20000,
        bandwidth_mb: 200000
      },
      alertThresholds: {
        warning: 0.75,
        critical: 0.85,
        exceeded: 1.0
      }
    };

    // Adjust budget based on environment
    switch (this.environment) {
      case 'development':
        return {
          ...defaultConfig,
          daily: { ...defaultConfig.daily, total: 5.0, requests: 100000 },
          weekly: { ...defaultConfig.weekly, total: 20.0, requests: 500000 },
          monthly: { ...defaultConfig.monthly, total: 50.0, requests: 2000000 }
        };

      case 'staging':
        return {
          ...defaultConfig,
          daily: { ...defaultConfig.daily, total: 15.0, requests: 500000 },
          weekly: { ...defaultConfig.weekly, total: 75.0, requests: 2500000 },
          monthly: { ...defaultConfig.monthly, total: 300.0, requests: 10000000 }
        };

      case 'production':
        return {
          ...defaultConfig,
          daily: { ...defaultConfig.daily, total: 100.0, requests: 10000000 },
          weekly: { ...defaultConfig.weekly, total: 500.0, requests: 50000000 },
          monthly: { ...defaultConfig.monthly, total: 2000.0, requests: 200000000 }
        };

      default:
        return defaultConfig;
    }
  }

  /**
   * Start cost monitoring
   */
  public startMonitoring(): void {
    if (this.monitoringActive) {
      return;
    }

    const monitoringEnabled = process.env.EXPO_PUBLIC_SUPABASE_COST_MONITORING_ENABLED === 'true';
    if (!monitoringEnabled) {
      console.log('[CostMonitoring] Cost monitoring disabled in environment');
      return;
    }

    this.monitoringActive = true;
    console.log(`[CostMonitoring] Starting cost monitoring for ${this.environment}...`);

    // Check costs every 15 minutes
    this.costCheckInterval = setInterval(() => {
      this.checkCostsAndBudget();
    }, 15 * 60 * 1000);

    // Initial check
    this.checkCostsAndBudget();
  }

  /**
   * Stop cost monitoring
   */
  public stopMonitoring(): void {
    this.monitoringActive = false;

    if (this.costCheckInterval) {
      clearInterval(this.costCheckInterval);
      this.costCheckInterval = null;
    }

    console.log('[CostMonitoring] Cost monitoring stopped');
  }

  /**
   * Get current usage metrics
   */
  public async getCurrentUsage(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<UsageMetrics> {
    const timestamp = new Date().toISOString();

    try {
      // In a real implementation, this would query Supabase usage API
      // For now, we'll simulate based on environment and feature flags
      const isCloudEnabled = process.env.EXPO_PUBLIC_CLOUD_FEATURES_ENABLED === 'true';
      const requestMultiplier = isCloudEnabled ? 1.0 : 0.1; // 10% usage when cloud disabled

      // Simulate usage based on environment
      const baseUsage = this.getBaseUsageByEnvironment();
      const currentUsage: UsageMetrics = {
        service: 'supabase',
        period,
        requests: Math.floor(baseUsage.requests * requestMultiplier),
        storage_mb: Math.floor(baseUsage.storage_mb * requestMultiplier),
        bandwidth_mb: Math.floor(baseUsage.bandwidth_mb * requestMultiplier),
        activeUsers: Math.floor(baseUsage.activeUsers * requestMultiplier),
        timestamp
      };

      // Cache usage data
      this.usageCache.set(`${period}_${new Date().toDateString()}`, currentUsage);

      return currentUsage;

    } catch (error) {
      console.error('[CostMonitoring] Failed to get usage metrics:', error);

      // Return minimal usage on error
      return {
        service: 'supabase',
        period,
        requests: 0,
        storage_mb: 0,
        bandwidth_mb: 0,
        activeUsers: 0,
        timestamp
      };
    }
  }

  /**
   * Get base usage patterns by environment
   */
  private getBaseUsageByEnvironment() {
    switch (this.environment) {
      case 'development':
        return {
          requests: 5000, // 5K requests per day
          storage_mb: 10, // 10MB storage
          bandwidth_mb: 50, // 50MB bandwidth
          activeUsers: 5 // 5 active developers
        };

      case 'staging':
        return {
          requests: 25000, // 25K requests per day
          storage_mb: 100, // 100MB storage
          bandwidth_mb: 500, // 500MB bandwidth
          activeUsers: 20 // 20 active testers
        };

      case 'production':
        return {
          requests: 500000, // 500K requests per day
          storage_mb: 2000, // 2GB storage
          bandwidth_mb: 10000, // 10GB bandwidth
          activeUsers: 1000 // 1000 active users
        };

      default:
        return {
          requests: 1000,
          storage_mb: 5,
          bandwidth_mb: 25,
          activeUsers: 2
        };
    }
  }

  /**
   * Calculate cost breakdown
   */
  public async calculateCostBreakdown(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<CostBreakdown[]> {
    const usage = await this.getCurrentUsage(period);
    const breakdown: CostBreakdown[] = [];

    // Supabase pricing (simplified)
    const pricing = {
      requests: 0.000025, // $0.000025 per request (after free tier)
      storage: 0.125, // $0.125 per GB per month
      bandwidth: 0.09 // $0.09 per GB
    };

    // Requests cost
    const requestsCost = Math.max(0, usage.requests - 50000) * pricing.requests; // First 50K free
    breakdown.push({
      service: 'supabase',
      category: 'API Requests',
      usage: usage.requests,
      unit: 'requests',
      ratePerUnit: pricing.requests,
      cost: requestsCost,
      percentage: 0 // Will be calculated after total
    });

    // Storage cost
    const storageCost = Math.max(0, usage.storage_mb - 500) * (pricing.storage / 1024); // First 500MB free
    breakdown.push({
      service: 'supabase',
      category: 'Database Storage',
      usage: usage.storage_mb,
      unit: 'MB',
      ratePerUnit: pricing.storage / 1024,
      cost: storageCost,
      percentage: 0
    });

    // Bandwidth cost
    const bandwidthCost = Math.max(0, usage.bandwidth_mb - 2048) * (pricing.bandwidth / 1024); // First 2GB free
    breakdown.push({
      service: 'supabase',
      category: 'Bandwidth',
      usage: usage.bandwidth_mb,
      unit: 'MB',
      ratePerUnit: pricing.bandwidth / 1024,
      cost: bandwidthCost,
      percentage: 0
    });

    // Calculate percentages
    const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
    breakdown.forEach(item => {
      item.percentage = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
    });

    return breakdown;
  }

  /**
   * Check costs against budget and generate alerts
   */
  public async checkCostsAndBudget(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    try {
      // Check daily, weekly, and monthly budgets
      for (const period of ['daily', 'weekly', 'monthly'] as const) {
        const usage = await this.getCurrentUsage(period);
        const breakdown = await this.calculateCostBreakdown(period);
        const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);
        const budget = this.budgetConfig[period].total;
        const utilization = totalCost / budget;

        // Check alert thresholds
        if (utilization >= this.budgetConfig.alertThresholds.exceeded) {
          alerts.push(this.createBudgetAlert('exceeded', period, utilization, totalCost, budget));
        } else if (utilization >= this.budgetConfig.alertThresholds.critical) {
          alerts.push(this.createBudgetAlert('critical', period, utilization, totalCost, budget));
        } else if (utilization >= this.budgetConfig.alertThresholds.warning) {
          alerts.push(this.createBudgetAlert('warning', period, utilization, totalCost, budget));
        }

        // Check individual resource budgets
        if (usage.requests > this.budgetConfig[period].requests * 0.9) {
          alerts.push({
            id: `requests_${period}_${Date.now()}`,
            type: 'warning',
            service: 'supabase',
            threshold: this.budgetConfig[period].requests,
            current: usage.requests,
            projected: usage.requests * 1.2, // 20% growth projection
            timestamp: new Date().toISOString(),
            message: `${period} request usage approaching limit`,
            recommendations: [
              'Monitor API request patterns',
              'Consider implementing request caching',
              'Review feature flag settings to reduce unnecessary requests'
            ]
          });
        }
      }

      // Store alerts in history
      this.alertHistory.push(...alerts);

      // Keep only last 100 alerts
      if (this.alertHistory.length > 100) {
        this.alertHistory = this.alertHistory.slice(-100);
      }

      // Trigger alert callbacks if any critical alerts
      const criticalAlerts = alerts.filter(a => a.type === 'critical' || a.type === 'exceeded');
      if (criticalAlerts.length > 0) {
        this.triggerCostAlerts(criticalAlerts);
      }

      return alerts;

    } catch (error) {
      console.error('[CostMonitoring] Budget check failed:', error);
      return [];
    }
  }

  /**
   * Create budget alert
   */
  private createBudgetAlert(
    type: 'warning' | 'critical' | 'exceeded',
    period: 'daily' | 'weekly' | 'monthly',
    utilization: number,
    currentCost: number,
    budget: number
  ): BudgetAlert {
    const percentage = Math.round(utilization * 100);
    const projected = currentCost * 1.2; // 20% growth projection

    let message: string;
    let recommendations: string[];

    switch (type) {
      case 'warning':
        message = `${period} budget at ${percentage}% usage ($${currentCost.toFixed(2)}/$${budget.toFixed(2)})`;
        recommendations = [
          'Monitor usage trends closely',
          'Consider optimizing API calls',
          'Review feature rollout schedule'
        ];
        break;

      case 'critical':
        message = `${period} budget critically high at ${percentage}% usage ($${currentCost.toFixed(2)}/$${budget.toFixed(2)})`;
        recommendations = [
          'Implement immediate usage controls',
          'Disable non-essential cloud features',
          'Contact team for budget review'
        ];
        break;

      case 'exceeded':
        message = `${period} budget EXCEEDED at ${percentage}% usage ($${currentCost.toFixed(2)}/$${budget.toFixed(2)})`;
        recommendations = [
          'URGENT: Disable cloud features immediately',
          'Investigate usage spike',
          'Emergency budget approval required'
        ];
        break;
    }

    return {
      id: `budget_${type}_${period}_${Date.now()}`,
      type,
      service: 'supabase',
      threshold: budget,
      current: currentCost,
      projected,
      timestamp: new Date().toISOString(),
      message,
      recommendations
    };
  }

  /**
   * Trigger cost alert callbacks
   */
  private triggerCostAlerts(alerts: BudgetAlert[]): void {
    for (const alert of alerts) {
      console.warn(`[CostMonitoring] ${alert.type.toUpperCase()} ALERT:`, alert.message);

      // Register with cloud monitoring for centralized alerting
      cloudMonitoring.registerAlertCallback('cost', (alertData) => {
        console.log('[CostMonitoring] Cost alert triggered:', alertData);
      });
    }
  }

  /**
   * Get budget utilization summary
   */
  public async getBudgetSummary(): Promise<{
    daily: { usage: number; budget: number; percentage: number };
    weekly: { usage: number; budget: number; percentage: number };
    monthly: { usage: number; budget: number; percentage: number };
    alerts: number;
    status: 'good' | 'warning' | 'critical';
  }> {
    const daily = await this.calculateCostBreakdown('daily');
    const weekly = await this.calculateCostBreakdown('weekly');
    const monthly = await this.calculateCostBreakdown('monthly');

    const dailyCost = daily.reduce((sum, item) => sum + item.cost, 0);
    const weeklyCost = weekly.reduce((sum, item) => sum + item.cost, 0);
    const monthlyCost = monthly.reduce((sum, item) => sum + item.cost, 0);

    const dailyPercentage = (dailyCost / this.budgetConfig.daily.total) * 100;
    const weeklyPercentage = (weeklyCost / this.budgetConfig.weekly.total) * 100;
    const monthlyPercentage = (monthlyCost / this.budgetConfig.monthly.total) * 100;

    const maxPercentage = Math.max(dailyPercentage, weeklyPercentage, monthlyPercentage);
    const activeAlerts = this.alertHistory.filter(alert => {
      const alertAge = Date.now() - new Date(alert.timestamp).getTime();
      return alertAge < 24 * 60 * 60 * 1000; // Last 24 hours
    }).length;

    let status: 'good' | 'warning' | 'critical';
    if (maxPercentage >= 90) {
      status = 'critical';
    } else if (maxPercentage >= 75) {
      status = 'warning';
    } else {
      status = 'good';
    }

    return {
      daily: {
        usage: dailyCost,
        budget: this.budgetConfig.daily.total,
        percentage: dailyPercentage
      },
      weekly: {
        usage: weeklyCost,
        budget: this.budgetConfig.weekly.total,
        percentage: weeklyPercentage
      },
      monthly: {
        usage: monthlyCost,
        budget: this.budgetConfig.monthly.total,
        percentage: monthlyPercentage
      },
      alerts: activeAlerts,
      status
    };
  }

  /**
   * Get cost optimization recommendations
   */
  public async getCostOptimizations(): Promise<string[]> {
    const summary = await this.getBudgetSummary();
    const usage = await this.getCurrentUsage('daily');
    const recommendations: string[] = [];

    // High-level recommendations based on status
    if (summary.status === 'critical') {
      recommendations.push('🚨 URGENT: Consider disabling non-essential cloud features');
      recommendations.push('📊 Implement request rate limiting');
      recommendations.push('💾 Review data storage and implement cleanup policies');
    } else if (summary.status === 'warning') {
      recommendations.push('⚠️ Monitor usage patterns and optimize API calls');
      recommendations.push('🔄 Implement caching to reduce database requests');
      recommendations.push('📈 Consider gradual feature rollout to control costs');
    }

    // Specific recommendations based on usage
    if (usage.requests > 100000) {
      recommendations.push('🔍 Optimize API queries to reduce request count');
      recommendations.push('📱 Implement client-side caching for repeated requests');
    }

    if (usage.storage_mb > 1000) {
      recommendations.push('🗄️ Implement data archiving for old records');
      recommendations.push('🗜️ Enable data compression for large payloads');
    }

    // Cloud feature specific recommendations
    const cloudEnabled = process.env.EXPO_PUBLIC_CLOUD_FEATURES_ENABLED === 'true';
    if (!cloudEnabled) {
      recommendations.push('✅ Cloud features disabled - good for cost control');
      recommendations.push('📋 Plan gradual rollout when ready to enable features');
    }

    return recommendations;
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit = 20): BudgetAlert[] {
    return this.alertHistory.slice(-limit).reverse();
  }

  /**
   * Update budget configuration
   */
  public updateBudgetConfiguration(newConfig: Partial<BudgetConfiguration>): void {
    this.budgetConfig = { ...this.budgetConfig, ...newConfig };
    console.log('[CostMonitoring] Budget configuration updated:', this.budgetConfig);
  }

  /**
   * Cleanup and destroy service
   */
  public destroy(): void {
    this.stopMonitoring();
    this.usageCache.clear();
    this.alertHistory.length = 0;
  }
}

// Export singleton instance
export const costMonitoring = new CostMonitoringService();