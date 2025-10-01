/**
 * CRISIS METRICS REPORTING - PHASE 3
 * Dashboard and reporting utilities for crisis feature metrics
 *
 * PURPOSE:
 * - Provide insights into crisis feature usage and effectiveness
 * - Generate reports for clinical review
 * - Track engagement trends over time
 * - Identify areas for improvement
 *
 * PRIVACY:
 * - All metrics are aggregated and non-PHI
 * - No personal information included in reports
 * - User can export their own data
 * - Local storage only
 */

import { crisisAnalyticsService, CrisisUsageSummary } from './CrisisAnalyticsService';
import { useCrisisPlanStore } from '../../stores/crisisPlanStore';
import { postCrisisSupportService } from './PostCrisisSupportService';
import { logPerformance, LogCategory } from '../logging';

/**
 * METRICS DASHBOARD DATA
 */
export interface CrisisMetricsDashboard {
  // Overview
  summary: {
    crisisPlanActive: boolean;
    postCrisisSupportActive: boolean;
    totalResourceAccess: number;
    overallEngagement: 'high' | 'medium' | 'low';
  };

  // Detailed metrics
  usage: CrisisUsageSummary;

  // Trends (last 7 days vs previous 7 days)
  trends: {
    resourceViewsTrend: 'up' | 'down' | 'stable';
    crisisPlanEngagementTrend: 'up' | 'down' | 'stable';
    checkInComplianceTrend: 'up' | 'down' | 'stable';
  };

  // Recommendations
  recommendations: string[];

  // Generated timestamp
  generatedAt: number;
}

/**
 * WEEKLY REPORT DATA
 */
export interface WeeklyReport {
  weekStart: number;
  weekEnd: number;

  highlights: {
    totalResourceViews: number;
    crisisPlanUpdates: number;
    checkInsCompleted: number;
    copingStrategiesUsed: number;
  };

  effectiveness: {
    crisisPlanEngagement: 'high' | 'medium' | 'low';
    postCrisisSupportCompletion: 'high' | 'medium' | 'low';
    overallWellness: 'improving' | 'stable' | 'needs_attention';
  };

  notes: string[];
}

/**
 * CRISIS METRICS REPORTING SERVICE
 */
class CrisisMetricsReporting {
  /**
   * Get current metrics dashboard
   */
  async getDashboard(): Promise<CrisisMetricsDashboard> {
    const performanceStart = performance.now();

    try {
      await crisisAnalyticsService.initialize();

      const crisisPlanStore = useCrisisPlanStore.getState();
      const currentSupport = postCrisisSupportService.getCurrentSupport();

      // Get usage summary for last 30 days
      const usage = crisisAnalyticsService.getUsageSummary();

      // Get effectiveness insights
      const insights = crisisAnalyticsService.getEffectivenessInsights();

      // Calculate trends
      const trends = this.calculateTrends();

      // Generate recommendations
      const recommendations = this.generateRecommendations(usage, insights);

      const dashboard: CrisisMetricsDashboard = {
        summary: {
          crisisPlanActive: crisisPlanStore.crisisPlan !== null,
          postCrisisSupportActive: currentSupport?.isActive || false,
          totalResourceAccess: usage.totalResourceViews + usage.resourceCallsMade,
          overallEngagement: insights.overallEngagement
        },
        usage,
        trends,
        recommendations,
        generatedAt: Date.now()
      };

      logPerformance('Crisis metrics dashboard generated', {
        generationTime: performance.now() - performanceStart
      }, LogCategory.CRISIS);

      return dashboard;

    } catch (error) {
      throw new Error(`Failed to generate metrics dashboard: ${error}`);
    }
  }

  /**
   * Get weekly report
   */
  async getWeeklyReport(weekStart?: number): Promise<WeeklyReport> {
    try {
      await crisisAnalyticsService.initialize();

      const start = weekStart || this.getLastWeekStart();
      const end = start + (7 * 24 * 60 * 60 * 1000);

      const usage = crisisAnalyticsService.getUsageSummary(start, end);
      const insights = crisisAnalyticsService.getEffectivenessInsights();

      const report: WeeklyReport = {
        weekStart: start,
        weekEnd: end,
        highlights: {
          totalResourceViews: usage.totalResourceViews,
          crisisPlanUpdates: usage.crisisPlanEdits,
          checkInsCompleted: usage.checkInsCompleted,
          copingStrategiesUsed: usage.copingStrategiesUsed
        },
        effectiveness: {
          crisisPlanEngagement: insights.crisisPlanEngagement,
          postCrisisSupportCompletion: insights.postCrisisSupportCompletion,
          overallWellness: this.assessWellnessTrend(usage)
        },
        notes: this.generateWeeklyNotes(usage, insights)
      };

      return report;

    } catch (error) {
      throw new Error(`Failed to generate weekly report: ${error}`);
    }
  }

  /**
   * Export metrics as formatted text
   */
  async exportMetricsReport(): Promise<string> {
    const dashboard = await this.getDashboard();
    const weeklyReport = await this.getWeeklyReport();

    const lines: string[] = [
      'CRISIS FEATURES METRICS REPORT',
      '='.repeat(60),
      '',
      `Generated: ${new Date(dashboard.generatedAt).toLocaleString()}`,
      '',
      '=== CURRENT STATUS ===',
      `Crisis Plan: ${dashboard.summary.crisisPlanActive ? 'Active' : 'Not Created'}`,
      `Post-Crisis Support: ${dashboard.summary.postCrisisSupportActive ? 'Active' : 'Inactive'}`,
      `Overall Engagement: ${dashboard.summary.overallEngagement.toUpperCase()}`,
      `Total Resource Access: ${dashboard.summary.totalResourceAccess}`,
      '',
      '=== USAGE METRICS (Last 30 Days) ===',
      '',
      'CRISIS RESOURCES:',
      `  Total Views: ${dashboard.usage.totalResourceViews}`,
      `  Calls Made: ${dashboard.usage.resourceCallsMade}`,
      `  Texts Sent: ${dashboard.usage.resourceTextsSent}`,
      `  988 Lifeline Calls: ${dashboard.usage.lifeline988Calls}`,
      `  911 Emergency Calls: ${dashboard.usage.emergency911Calls}`,
      '',
      'CRISIS PLAN:',
      `  Created: ${dashboard.usage.crisisPlanCreated ? 'Yes' : 'No'}`,
      `  Views: ${dashboard.usage.crisisPlanViews}`,
      `  Edits: ${dashboard.usage.crisisPlanEdits}`,
      `  Exports: ${dashboard.usage.crisisPlanExports}`,
      `  Warning Signs Added: ${dashboard.usage.warningSignsAdded}`,
      `  Coping Strategies Added: ${dashboard.usage.copingStrategiesAdded}`,
      `  Coping Strategies Used: ${dashboard.usage.copingStrategiesUsed}`,
      `  Contacts Added: ${dashboard.usage.contactsAdded}`,
      `  Reasons for Living Added: ${dashboard.usage.reasonsForLivingAdded}`,
      '',
      'POST-CRISIS SUPPORT:',
      `  Activations: ${dashboard.usage.supportActivations}`,
      `  Check-ins Completed: ${dashboard.usage.checkInsCompleted}`,
      `  Check-ins Skipped: ${dashboard.usage.checkInsSkipped}`,
      `  Completion Rate: ${(dashboard.usage.supportCompletionRate * 100).toFixed(1)}%`,
      '',
      '=== TRENDS ===',
      `Resource Views: ${this.getTrendEmoji(dashboard.trends.resourceViewsTrend)} ${dashboard.trends.resourceViewsTrend}`,
      `Crisis Plan Engagement: ${this.getTrendEmoji(dashboard.trends.crisisPlanEngagementTrend)} ${dashboard.trends.crisisPlanEngagementTrend}`,
      `Check-in Compliance: ${this.getTrendEmoji(dashboard.trends.checkInComplianceTrend)} ${dashboard.trends.checkInComplianceTrend}`,
      '',
      '=== THIS WEEK\'S HIGHLIGHTS ===',
      `Resource Views: ${weeklyReport.highlights.totalResourceViews}`,
      `Crisis Plan Updates: ${weeklyReport.highlights.crisisPlanUpdates}`,
      `Check-ins: ${weeklyReport.highlights.checkInsCompleted}`,
      `Coping Strategies Used: ${weeklyReport.highlights.copingStrategiesUsed}`,
      '',
      '=== EFFECTIVENESS RATINGS ===',
      `Helpful: ${dashboard.usage.effectivenessRatings.helped}`,
      `Somewhat Helpful: ${dashboard.usage.effectivenessRatings.somewhat}`,
      `Not Helpful: ${dashboard.usage.effectivenessRatings.notHelpful}`,
      '',
      '=== RECOMMENDATIONS ===',
      ...dashboard.recommendations.map(r => `• ${r}`),
      '',
      '='.repeat(60),
      '',
      'Note: All metrics are aggregated and contain no personal health information.',
      'This report is for personal review only and can be shared with your provider.',
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Get engagement statistics
   */
  async getEngagementStats(): Promise<{
    daily: { date: number; events: number }[];
    weekly: { week: number; events: number }[];
    mostUsedFeatures: { feature: string; count: number }[];
  }> {
    // Get last 30 days of data
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const usage = crisisAnalyticsService.getUsageSummary(thirtyDaysAgo);

    const stats = {
      daily: this.calculateDailyEngagement(),
      weekly: this.calculateWeeklyEngagement(),
      mostUsedFeatures: [
        { feature: 'Crisis Resources', count: usage.totalResourceViews },
        { feature: 'Crisis Plan', count: usage.crisisPlanViews },
        { feature: 'Coping Strategies', count: usage.copingStrategiesUsed },
        { feature: 'Check-ins', count: usage.checkInsCompleted }
      ].sort((a, b) => b.count - a.count)
    };

    return stats;
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private calculateTrends(): CrisisMetricsDashboard['trends'] {
    const last7Days = crisisAnalyticsService.getUsageSummary(
      Date.now() - (7 * 24 * 60 * 60 * 1000)
    );
    const previous7Days = crisisAnalyticsService.getUsageSummary(
      Date.now() - (14 * 24 * 60 * 60 * 1000),
      Date.now() - (7 * 24 * 60 * 60 * 1000)
    );

    return {
      resourceViewsTrend: this.compareTrend(
        last7Days.totalResourceViews,
        previous7Days.totalResourceViews
      ),
      crisisPlanEngagementTrend: this.compareTrend(
        last7Days.crisisPlanViews + last7Days.crisisPlanEdits,
        previous7Days.crisisPlanViews + previous7Days.crisisPlanEdits
      ),
      checkInComplianceTrend: this.compareTrend(
        last7Days.checkInsCompleted,
        previous7Days.checkInsCompleted
      )
    };
  }

  private compareTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    if (previous === 0) return current > 0 ? 'up' : 'stable';

    const change = ((current - previous) / previous) * 100;

    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }

  private generateRecommendations(
    usage: CrisisUsageSummary,
    insights: ReturnType<typeof crisisAnalyticsService.getEffectivenessInsights>
  ): string[] {
    const recommendations: string[] = [];

    // Crisis plan recommendations
    if (!usage.crisisPlanCreated) {
      recommendations.push('Consider creating a personal safety plan to prepare for difficult moments');
    } else if (usage.crisisPlanViews === 0) {
      recommendations.push('Review your crisis plan regularly to keep it top of mind');
    } else if (usage.copingStrategiesAdded > 0 && usage.copingStrategiesUsed === 0) {
      recommendations.push('Try using one of your coping strategies when you notice warning signs');
    }

    // Post-crisis support recommendations
    if (usage.supportActivations > 0 && usage.supportCompletionRate < 0.7) {
      recommendations.push('Try to complete daily check-ins during your 7-day support period');
    }

    // Resource access recommendations
    if (usage.totalResourceViews === 0) {
      recommendations.push('Familiarize yourself with available crisis resources before you need them');
    }

    // Engagement recommendations
    if (insights.overallEngagement === 'low') {
      recommendations.push('Regular engagement with crisis tools can improve their effectiveness when needed');
    }

    // Default positive recommendation
    if (recommendations.length === 0) {
      recommendations.push('You\'re engaging well with crisis support features. Keep up the self-care!');
    }

    return recommendations;
  }

  private assessWellnessTrend(usage: CrisisUsageSummary): 'improving' | 'stable' | 'needs_attention' {
    // Simple heuristic based on usage patterns
    if (usage.crisisDetections === 0 && usage.copingStrategiesUsed > 0) {
      return 'improving';
    }
    if (usage.emergency911Calls > 0 || usage.crisisDetections > 3) {
      return 'needs_attention';
    }
    return 'stable';
  }

  private generateWeeklyNotes(
    usage: CrisisUsageSummary,
    insights: ReturnType<typeof crisisAnalyticsService.getEffectivenessInsights>
  ): string[] {
    const notes: string[] = [];

    if (usage.copingStrategiesUsed > 5) {
      notes.push('Strong use of coping strategies this week');
    }
    if (usage.checkInsCompleted >= 5) {
      notes.push('Excellent check-in compliance');
    }
    if (insights.crisisPlanEngagement === 'high') {
      notes.push('Actively engaged with crisis plan');
    }

    return notes;
  }

  private getLastWeekStart(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek - 7; // Last Sunday
    return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
  }

  private getTrendEmoji(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
    }
  }

  private calculateDailyEngagement(): { date: number; events: number }[] {
    // Simplified - would need to track events by day
    return [];
  }

  private calculateWeeklyEngagement(): { week: number; events: number }[] {
    // Simplified - would need to track events by week
    return [];
  }
}

// Export singleton instance
export const crisisMetricsReporting = new CrisisMetricsReporting();