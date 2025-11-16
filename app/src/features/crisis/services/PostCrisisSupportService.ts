/**
 * POST-CRISIS SUPPORT SERVICE
 * 7-day follow-up support after crisis detection
 *
 * CLINICAL RATIONALE:
 * Research shows first 7 days after crisis are highest risk period
 * Regular check-ins and supportive interventions reduce re-crisis risk
 *
 * FEATURES:
 * - Automatic activation after crisis detection
 * - Daily check-in reminders
 * - Resource access tracking
 * - Crisis plan engagement
 * - Auto-deactivation after 7 days
 *
 * COMPLIANCE:
 * - Check-in notes may contain PHI - stored in SecureStore
 * - User can opt-out at any time
 * - Hardware-encrypted local storage (SecureStore)
 * - No external notifications without consent
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logPerformance, logSecurity, logError, logDebug, LogCategory } from '@/services/logging';
import { crisisAnalyticsService } from './CrisisAnalyticsService';

export interface PostCrisisSupport {
  id: string;
  activatedAt: number;
  expiresAt: number;
  crisisType: 'phq9_moderate' | 'phq9_severe' | 'gad7_severe' | 'suicidal_ideation';
  crisisScore: number;

  // Check-in tracking
  checkIns: Array<{
    day: number;
    completedAt: number;
    moodRating?: (1 | 2 | 3 | 4 | 5) | undefined;
    notes?: string | undefined;
  }>;

  // Engagement tracking
  resourcesViewed: number;
  crisisPlanAccessed: boolean;
  copingStrategiesUsed: number;

  // Status
  isActive: boolean;
  userOptedOut: boolean;
  completedSuccessfully: boolean;
}

const STORAGE_KEY = 'post_crisis_support_secure_v2';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Post-Crisis Support Service
 * Manages 7-day follow-up support after crisis detection
 */
class PostCrisisSupportService {
  private currentSupport: PostCrisisSupport | null = null;

  /**
   * Initialize service and load active support
   * Includes migration from AsyncStorage v1 to SecureStore v2
   */
  async initialize(): Promise<void> {
    try {
      // Try new SecureStore key first
      let data = await SecureStore.getItemAsync(STORAGE_KEY);

      // If not found, try migrating from old AsyncStorage key
      if (!data) {
        const oldKey = '@post_crisis_support_v1';
        const oldData = await AsyncStorage.getItem(oldKey);

        if (oldData) {
          logDebug(LogCategory.CRISIS, 'Migrating post-crisis support from AsyncStorage to SecureStore');

          // Migrate to SecureStore
          await SecureStore.setItemAsync(STORAGE_KEY, oldData);

          // Delete old unencrypted data
          await AsyncStorage.removeItem(oldKey);

          data = oldData;
          logDebug(LogCategory.CRISIS, 'Post-crisis support migration complete');
        }
      }

      if (data) {
        const support = JSON.parse(data) as PostCrisisSupport;

        // Check if expired
        if (support.expiresAt < Date.now()) {
          await this.completeSupport(support.id);
        } else if (support.isActive && !support.userOptedOut) {
          this.currentSupport = support;
        }
      }

      logDebug(LogCategory.CRISIS, 'Post-crisis support service initialized');
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to initialize post-crisis support service', error as Error);
    }
  }

  /**
   * Activate 7-day support after crisis detection
   */
  async activateSupport(
    crisisType: PostCrisisSupport['crisisType'],
    crisisScore: number
  ): Promise<PostCrisisSupport> {
    const support: PostCrisisSupport = {
      id: `pcs_${Date.now()}`,
      activatedAt: Date.now(),
      expiresAt: Date.now() + SEVEN_DAYS_MS,
      crisisType,
      crisisScore,
      checkIns: [],
      resourcesViewed: 0,
      crisisPlanAccessed: false,
      copingStrategiesUsed: 0,
      isActive: true,
      userOptedOut: false,
      completedSuccessfully: false
    };

    this.currentSupport = support;

    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(support));

      // Track analytics
      await crisisAnalyticsService.trackEvent('post_crisis_support_activated');

      logSecurity('7-day post-crisis support activated', 'high', {
        supportId: support.id,
        crisisType,
        crisisScore
      });
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to save post-crisis support', error as Error);
    }

    return support;
  }

  /**
   * Record daily check-in
   */
  async recordCheckIn(
    day: number,
    moodRating?: 1 | 2 | 3 | 4 | 5,
    notes?: string
  ): Promise<void> {
    if (!this.currentSupport || !this.currentSupport.isActive) {
      throw new Error('No active post-crisis support');
    }

    this.currentSupport.checkIns.push({
      day,
      completedAt: Date.now(),
      moodRating,
      notes
    });

    await this.saveSupport();

    // Track analytics
    await crisisAnalyticsService.trackEvent('check_in_completed');

    logDebug(LogCategory.CRISIS, 'Post-crisis check-in completed', {
      supportId: this.currentSupport.id,
      day,
      totalCheckIns: this.currentSupport.checkIns.length
    });
  }

  /**
   * Record resource view
   */
  async recordResourceView(): Promise<void> {
    if (!this.currentSupport || !this.currentSupport.isActive) return;

    this.currentSupport.resourcesViewed++;
    await this.saveSupport();
  }

  /**
   * Record crisis plan access
   */
  async recordCrisisPlanAccess(): Promise<void> {
    if (!this.currentSupport || !this.currentSupport.isActive) return;

    this.currentSupport.crisisPlanAccessed = true;
    await this.saveSupport();
  }

  /**
   * Record coping strategy use
   */
  async recordCopingStrategyUse(): Promise<void> {
    if (!this.currentSupport || !this.currentSupport.isActive) return;

    this.currentSupport.copingStrategiesUsed++;
    await this.saveSupport();
  }

  /**
   * User opts out of support
   */
  async optOut(): Promise<void> {
    if (!this.currentSupport) return;

    this.currentSupport.userOptedOut = true;
    this.currentSupport.isActive = false;
    await this.saveSupport();

    // Track analytics
    await crisisAnalyticsService.trackEvent('support_opted_out');

    logSecurity('User opted out of post-crisis support', 'low', {
      supportId: this.currentSupport.id,
      daysActive: this.getDaysActive()
    });
  }

  /**
   * Complete support (after 7 days or user completion)
   */
  async completeSupport(supportId: string): Promise<void> {
    if (!this.currentSupport || this.currentSupport.id !== supportId) return;

    const wasSuccessful = this.currentSupport.checkIns.length >= 5; // At least 5 check-ins

    this.currentSupport.isActive = false;
    this.currentSupport.completedSuccessfully = wasSuccessful;
    await this.saveSupport();

    // Track analytics
    if (wasSuccessful) {
      await crisisAnalyticsService.trackEvent('support_completed_successfully');
    }

    logDebug(LogCategory.CRISIS, 'Post-crisis support completed', {
      supportId,
      checkInsCompleted: this.currentSupport.checkIns.length,
      successful: wasSuccessful
    });

    this.currentSupport = null;
  }

  /**
   * Get current support status
   */
  getCurrentSupport(): PostCrisisSupport | null {
    return this.currentSupport;
  }

  /**
   * Check if support is active
   */
  isActive(): boolean {
    return this.currentSupport?.isActive ?? false;
  }

  /**
   * Get days since activation
   */
  getDaysActive(): number {
    if (!this.currentSupport) return 0;

    const msSinceActivation = Date.now() - this.currentSupport.activatedAt;
    return Math.floor(msSinceActivation / (24 * 60 * 60 * 1000));
  }

  /**
   * Get next check-in day
   */
  getNextCheckInDay(): number {
    if (!this.currentSupport) return 1;

    const completedDays = this.currentSupport.checkIns.map(c => c.day);
    const maxDay = Math.max(0, ...completedDays);

    return Math.min(maxDay + 1, 7);
  }

  /**
   * Check if check-in is due
   */
  isCheckInDue(): boolean {
    if (!this.currentSupport || !this.currentSupport.isActive) return false;

    const daysActive = this.getDaysActive();
    const lastCheckInDay = this.currentSupport.checkIns.length > 0
      ? Math.max(...this.currentSupport.checkIns.map(c => c.day))
      : 0;

    // Check-in due if current day hasn't been checked in
    return daysActive > lastCheckInDay;
  }

  /**
   * Get supportive message for current day
   */
  getSupportiveMessage(day: number): string {
    const messages: Record<number, string> = {
      1: "You've taken an important first step by reaching out for support. Today, focus on one small thing that brings you comfort.",
      2: "You're making progress. Each day is an opportunity to practice the coping strategies that work for you.",
      3: "Halfway through the week. Remember, healing isn't linear. Be gentle with yourself today.",
      4: "You've shown strength by continuing to check in. Your well-being matters.",
      5: "You're building resilience with each passing day. Notice the small victories.",
      6: "Almost there. You've demonstrated real commitment to your mental health this week.",
      7: "You've completed your 7-day check-in journey. That takes courage. Continue using the tools and connections you've built."
    };

    return (messages[day] || messages[1]) as string;
  }

  /**
   * Save support to storage
   */
  private async saveSupport(): Promise<void> {
    if (!this.currentSupport) return;

    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(this.currentSupport));
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to save post-crisis support', error as Error);
    }
  }
}

// Export singleton instance
export const postCrisisSupportService = new PostCrisisSupportService();