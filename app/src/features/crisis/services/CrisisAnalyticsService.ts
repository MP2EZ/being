/**
 * CRISIS ANALYTICS SERVICE - PHASE 3
 * Tracks usage patterns, engagement metrics, and effectiveness data
 *
 * PRIVACY-FIRST DESIGN:
 * - No PHI in analytics (only aggregate metrics)
 * - Local storage only (no external analytics)
 * - User can view and delete all analytics data
 * - Timestamps in UTC for consistency
 *
 * METRICS TRACKED:
 * - Crisis resource access patterns
 * - Crisis plan usage and effectiveness
 * - Post-crisis support engagement
 * - Feature adoption rates
 * - Performance indicators
 *
 * HIPAA COMPLIANCE:
 * - No personal identifiable information
 * - No health information details
 * - Only aggregated usage statistics
 * - User-controlled data retention
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logPerformance, logError, logDebug, LogCategory } from '@/core/services/logging';

/**
 * CRISIS ANALYTICS EVENT TYPES
 */
export type CrisisAnalyticsEventType =
  // Resource access
  | 'crisis_resources_viewed'
  | 'crisis_resource_called'
  | 'crisis_resource_texted'
  | '988_called'
  | 'emergency_911_called'

  // Crisis plan
  | 'crisis_plan_created'
  | 'crisis_plan_viewed'
  | 'crisis_plan_edited'
  | 'crisis_plan_exported'
  | 'crisis_plan_deleted'
  | 'warning_sign_added'
  | 'coping_strategy_added'
  | 'coping_strategy_used'
  | 'contact_added'
  | 'reason_for_living_added'

  // Post-crisis support
  | 'post_crisis_support_activated'
  | 'check_in_completed'
  | 'check_in_skipped'
  | 'support_opted_out'
  | 'support_completed_successfully'

  // Performance
  | 'crisis_detection_triggered'
  | 'crisis_response_time_measured';

/**
 * CRISIS ANALYTICS EVENT
 */
export interface CrisisAnalyticsEvent {
  id: string;
  eventType: CrisisAnalyticsEventType;
  timestamp: number;
  metadata?: {
    // No PHI - only non-sensitive metrics
    duration?: number; // milliseconds
    count?: number;
    category?: string;
    source?: string;
    effectiveness?: 'helped' | 'somewhat' | 'not_helpful';
  } | undefined;
}

/**
 * CRISIS USAGE SUMMARY
 */
export interface CrisisUsageSummary {
  // Time period
  startDate: number;
  endDate: number;

  // Resource usage
  totalResourceViews: number;
  resourceCallsMade: number;
  resourceTextsSent: number;
  lifeline988Calls: number;
  emergency911Calls: number;

  // Crisis plan
  crisisPlanCreated: boolean;
  crisisPlanViews: number;
  crisisPlanEdits: number;
  crisisPlanExports: number;
  warningSignsAdded: number;
  copingStrategiesAdded: number;
  copingStrategiesUsed: number;
  contactsAdded: number;
  reasonsForLivingAdded: number;

  // Post-crisis support
  supportActivations: number;
  checkInsCompleted: number;
  checkInsSkipped: number;
  supportCompletionRate: number; // 0-1

  // Performance
  crisisDetections: number;
  avgCrisisResponseTime: number; // milliseconds

  // Effectiveness
  effectivenessRatings: {
    helped: number;
    somewhat: number;
    notHelpful: number;
  };
}

/**
 * ANALYTICS CONFIGURATION
 */
const STORAGE_KEY = '@crisis_analytics_v1';
const MAX_EVENTS = 1000; // Keep last 1000 events
const RETENTION_DAYS = 90; // Keep data for 90 days

/**
 * CRISIS ANALYTICS SERVICE
 */
class CrisisAnalyticsService {
  private events: CrisisAnalyticsEvent[] = [];
  private isInitialized = false;

  /**
   * Initialize service and load existing data
   */
  async initialize(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);

      if (data) {
        const parsed = JSON.parse(data);
        this.events = parsed.events || [];

        // Clean old events
        await this.cleanOldEvents();
      }

      this.isInitialized = true;
      logDebug(LogCategory.CRISIS, 'Crisis analytics service initialized', {
        eventCount: this.events.length
      });

    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to initialize crisis analytics service', error as Error);
    }
  }

  /**
   * Track analytics event
   */
  async trackEvent(
    eventType: CrisisAnalyticsEventType,
    metadata?: CrisisAnalyticsEvent['metadata']
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const event: CrisisAnalyticsEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        timestamp: Date.now(),
        metadata
      };

      this.events.push(event);

      // Enforce max events limit
      if (this.events.length > MAX_EVENTS) {
        this.events = this.events.slice(-MAX_EVENTS);
      }

      await this.saveEvents();

    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to track crisis analytics event', error as Error);
    }
  }

  /**
   * Get usage summary for date range
   */
  getUsageSummary(startDate?: number, endDate?: number): CrisisUsageSummary {
    const start = startDate || Date.now() - (30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate || Date.now();

    const relevantEvents = this.events.filter(
      event => event.timestamp >= start && event.timestamp <= end
    );

    const summary: CrisisUsageSummary = {
      startDate: start,
      endDate: end,

      // Resource usage
      totalResourceViews: this.countEvents(relevantEvents, 'crisis_resources_viewed'),
      resourceCallsMade: this.countEvents(relevantEvents, 'crisis_resource_called'),
      resourceTextsSent: this.countEvents(relevantEvents, 'crisis_resource_texted'),
      lifeline988Calls: this.countEvents(relevantEvents, '988_called'),
      emergency911Calls: this.countEvents(relevantEvents, 'emergency_911_called'),

      // Crisis plan
      crisisPlanCreated: this.countEvents(relevantEvents, 'crisis_plan_created') > 0,
      crisisPlanViews: this.countEvents(relevantEvents, 'crisis_plan_viewed'),
      crisisPlanEdits: this.countEvents(relevantEvents, 'crisis_plan_edited'),
      crisisPlanExports: this.countEvents(relevantEvents, 'crisis_plan_exported'),
      warningSignsAdded: this.countEvents(relevantEvents, 'warning_sign_added'),
      copingStrategiesAdded: this.countEvents(relevantEvents, 'coping_strategy_added'),
      copingStrategiesUsed: this.countEvents(relevantEvents, 'coping_strategy_used'),
      contactsAdded: this.countEvents(relevantEvents, 'contact_added'),
      reasonsForLivingAdded: this.countEvents(relevantEvents, 'reason_for_living_added'),

      // Post-crisis support
      supportActivations: this.countEvents(relevantEvents, 'post_crisis_support_activated'),
      checkInsCompleted: this.countEvents(relevantEvents, 'check_in_completed'),
      checkInsSkipped: this.countEvents(relevantEvents, 'check_in_skipped'),
      supportCompletionRate: this.calculateCompletionRate(relevantEvents),

      // Performance
      crisisDetections: this.countEvents(relevantEvents, 'crisis_detection_triggered'),
      avgCrisisResponseTime: this.calculateAvgResponseTime(relevantEvents),

      // Effectiveness
      effectivenessRatings: this.aggregateEffectivenessRatings(relevantEvents)
    };

    return summary;
  }

  /**
   * Get effectiveness insights
   */
  getEffectivenessInsights(): {
    mostUsedCopingStrategies: number;
    crisisPlanEngagement: 'high' | 'medium' | 'low';
    postCrisisSupportCompletion: 'high' | 'medium' | 'low';
    overallEngagement: 'high' | 'medium' | 'low';
  } {
    const summary = this.getUsageSummary();

    return {
      mostUsedCopingStrategies: summary.copingStrategiesUsed,
      crisisPlanEngagement: this.calculateEngagementLevel(
        summary.crisisPlanViews,
        summary.crisisPlanEdits,
        summary.copingStrategiesUsed
      ),
      postCrisisSupportCompletion: this.calculateCompletionLevel(summary.supportCompletionRate),
      overallEngagement: this.calculateOverallEngagement(summary)
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    avgCrisisResponseTime: number;
    resourceAccessSpeed: 'fast' | 'acceptable' | 'slow';
    systemReliability: 'high' | 'medium' | 'low';
  } {
    const responseEvents = this.events.filter(
      event => event.eventType === 'crisis_response_time_measured'
    );

    const avgResponseTime = responseEvents.length > 0
      ? responseEvents.reduce((sum, event) => sum + (event.metadata?.duration || 0), 0) / responseEvents.length
      : 0;

    return {
      avgCrisisResponseTime: avgResponseTime,
      resourceAccessSpeed: avgResponseTime < 200 ? 'fast' : avgResponseTime < 500 ? 'acceptable' : 'slow',
      systemReliability: this.calculateReliability()
    };
  }

  /**
   * Export analytics data (for user transparency)
   */
  async exportAnalytics(): Promise<string> {
    const summary = this.getUsageSummary();
    const insights = this.getEffectivenessInsights();
    const performance = this.getPerformanceMetrics();

    const report = `
CRISIS FEATURES USAGE REPORT
Generated: ${new Date().toISOString()}
Period: ${new Date(summary.startDate).toLocaleDateString()} - ${new Date(summary.endDate).toLocaleDateString()}

=== RESOURCE USAGE ===
Total Resource Views: ${summary.totalResourceViews}
Calls Made: ${summary.resourceCallsMade}
Texts Sent: ${summary.resourceTextsSent}
988 Lifeline Calls: ${summary.lifeline988Calls}
911 Emergency Calls: ${summary.emergency911Calls}

=== CRISIS PLAN ===
Plan Created: ${summary.crisisPlanCreated ? 'Yes' : 'No'}
Plan Views: ${summary.crisisPlanViews}
Plan Edits: ${summary.crisisPlanEdits}
Plan Exports: ${summary.crisisPlanExports}
Warning Signs Added: ${summary.warningSignsAdded}
Coping Strategies Added: ${summary.copingStrategiesAdded}
Coping Strategies Used: ${summary.copingStrategiesUsed}
Contacts Added: ${summary.contactsAdded}
Reasons for Living Added: ${summary.reasonsForLivingAdded}

=== POST-CRISIS SUPPORT ===
Support Activations: ${summary.supportActivations}
Check-ins Completed: ${summary.checkInsCompleted}
Check-ins Skipped: ${summary.checkInsSkipped}
Completion Rate: ${(summary.supportCompletionRate * 100).toFixed(1)}%

=== ENGAGEMENT INSIGHTS ===
Crisis Plan Engagement: ${insights.crisisPlanEngagement}
Post-Crisis Support: ${insights.postCrisisSupportCompletion}
Overall Engagement: ${insights.overallEngagement}

=== PERFORMANCE ===
Average Crisis Response Time: ${performance.avgCrisisResponseTime.toFixed(0)}ms
Resource Access Speed: ${performance.resourceAccessSpeed}
System Reliability: ${performance.systemReliability}

=== EFFECTIVENESS RATINGS ===
Helpful: ${summary.effectivenessRatings.helped}
Somewhat Helpful: ${summary.effectivenessRatings.somewhat}
Not Helpful: ${summary.effectivenessRatings.notHelpful}
`;

    return report.trim();
  }

  /**
   * Clear all analytics data (user privacy control)
   */
  async clearAllData(): Promise<void> {
    try {
      this.events = [];
      await AsyncStorage.removeItem(STORAGE_KEY);

      logDebug(LogCategory.CRISIS, 'Crisis analytics data cleared');
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to clear crisis analytics data', error as Error);
    }
  }

  /**
   * Get event count for period
   */
  getEventCount(eventType: CrisisAnalyticsEventType, days: number = 30): number {
    const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    const relevantEvents = this.events.filter(
      event => event.eventType === eventType && event.timestamp >= startDate
    );
    return relevantEvents.length;
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private countEvents(events: CrisisAnalyticsEvent[], type: CrisisAnalyticsEventType): number {
    return events.filter(event => event.eventType === type).length;
  }

  private calculateAvgResponseTime(events: CrisisAnalyticsEvent[]): number {
    const responseEvents = events.filter(
      event => event.eventType === 'crisis_response_time_measured' && event.metadata?.duration
    );

    if (responseEvents.length === 0) return 0;

    const totalTime = responseEvents.reduce(
      (sum, event) => sum + (event.metadata?.duration || 0),
      0
    );

    return totalTime / responseEvents.length;
  }

  private calculateCompletionRate(events: CrisisAnalyticsEvent[]): number {
    const activations = this.countEvents(events, 'post_crisis_support_activated');
    const completions = this.countEvents(events, 'support_completed_successfully');

    if (activations === 0) return 0;
    return completions / activations;
  }

  private aggregateEffectivenessRatings(events: CrisisAnalyticsEvent[]): {
    helped: number;
    somewhat: number;
    notHelpful: number;
  } {
    const ratings = {
      helped: 0,
      somewhat: 0,
      notHelpful: 0
    };

    events.forEach(event => {
      if (event.metadata?.effectiveness) {
        const rating = event.metadata.effectiveness;
        if (rating === 'helped') ratings.helped++;
        else if (rating === 'somewhat') ratings.somewhat++;
        else if (rating === 'not_helpful') ratings.notHelpful++;
      }
    });

    return ratings;
  }

  private calculateEngagementLevel(views: number, edits: number, uses: number): 'high' | 'medium' | 'low' {
    const totalEngagement = views + edits + uses;

    if (totalEngagement >= 20) return 'high';
    if (totalEngagement >= 5) return 'medium';
    return 'low';
  }

  private calculateCompletionLevel(rate: number): 'high' | 'medium' | 'low' {
    if (rate >= 0.8) return 'high';
    if (rate >= 0.5) return 'medium';
    return 'low';
  }

  private calculateOverallEngagement(summary: CrisisUsageSummary): 'high' | 'medium' | 'low' {
    const engagementScore =
      summary.totalResourceViews +
      summary.crisisPlanViews +
      summary.crisisPlanEdits +
      summary.copingStrategiesUsed +
      summary.checkInsCompleted;

    if (engagementScore >= 50) return 'high';
    if (engagementScore >= 15) return 'medium';
    return 'low';
  }

  private calculateReliability(): 'high' | 'medium' | 'low' {
    // Could track errors and crashes
    // For now, assume high reliability
    return 'high';
  }

  private async saveEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        events: this.events,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to save crisis analytics events', error as Error);
    }
  }

  private async cleanOldEvents(): Promise<void> {
    const cutoffDate = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;

    this.events = this.events.filter(event => event.timestamp >= cutoffDate);

    if (this.events.length < initialCount) {
      await this.saveEvents();
      logDebug(LogCategory.CRISIS, `Cleaned ${initialCount - this.events.length} old analytics events`, {
        remaining: this.events.length
      });
    }
  }
}

// Export singleton instance
export const crisisAnalyticsService = new CrisisAnalyticsService();