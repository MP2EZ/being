/**
 * SyncAccessibilityCoordinator - Centralized accessibility management for sync operations
 *
 * Features:
 * - Unified live region management across sync components
 * - Priority-based announcement coordination
 * - Crisis-aware accessibility enhancements
 * - Mental health state-responsive announcements
 * - Performance-optimized accessibility caching
 */

import { AccessibilityInfo, Platform } from 'react-native';
import { MentalHealthState } from '../../types/mental-health';
import { SyncStatus } from '../../types/sync';

interface AnnouncementEntry {
  text: string;
  priority: 'assertive' | 'polite';
  timestamp: number;
  component: string;
  category: 'crisis' | 'therapeutic' | 'general';
}

interface AccessibilityCache {
  announcement: string;
  lastUsed: number;
  priority: 'high' | 'medium' | 'low';
  preProcessed?: boolean;
}

export class SyncAccessibilityCoordinator {
  private static announcements: Map<string, AnnouncementEntry> = new Map();
  private static cache: Map<string, AccessibilityCache> = new Map();
  private static currentMentalHealthState: MentalHealthState = 'stable';
  private static announcementThrottleTime = 2000; // 2 seconds
  private static initialized = false;

  /**
   * Initialize the accessibility coordinator
   */
  static initialize(initialMentalHealthState: MentalHealthState = 'stable'): void {
    if (this.initialized) return;

    this.currentMentalHealthState = initialMentalHealthState;
    this.preloadCriticalAnnouncements();
    this.setupPerformanceOptimizations();
    this.initialized = true;
  }

  /**
   * Update mental health state context for accessibility adaptations
   */
  static updateMentalHealthState(state: MentalHealthState): void {
    this.currentMentalHealthState = state;

    // Adjust throttle time based on mental health state
    this.announcementThrottleTime = this.getStateAwareThrottleTime(state);
  }

  /**
   * Coordinated announcement with conflict prevention and prioritization
   */
  static announceForComponent(
    componentId: string,
    text: string,
    priority: 'assertive' | 'polite' = 'polite',
    category: 'crisis' | 'therapeutic' | 'general' = 'general'
  ): void {
    try {
      // Enhanced text with mental health awareness
      const enhancedText = this.enhanceTextForMentalHealthState(text, category);

      // Check for announcement conflicts and throttling
      if (!this.shouldAnnounce(componentId, enhancedText, priority)) {
        return;
      }

      // Handle priority conflicts
      this.handlePriorityConflicts(priority, category);

      // Store announcement entry
      const announcement: AnnouncementEntry = {
        text: enhancedText,
        priority,
        timestamp: Date.now(),
        component: componentId,
        category
      };

      this.announcements.set(componentId, announcement);

      // Make the announcement
      this.performAnnouncement(enhancedText, priority);

      // Schedule cleanup
      this.scheduleAnnouncementCleanup(componentId);

    } catch (error) {
      console.warn('SyncAccessibilityCoordinator announcement failed:', error);
      // Fallback to basic announcement
      AccessibilityInfo.announceForAccessibility(text);
    }
  }

  /**
   * Crisis-specific announcement with maximum priority
   */
  static announceCrisis(componentId: string, text: string): void {
    // Crisis announcements always get through immediately
    this.clearAllNonCrisisAnnouncements();

    const crisisText = this.enhanceTextForCrisis(text);
    this.announceForComponent(componentId, crisisText, 'assertive', 'crisis');

    // Ensure crisis announcement is heard by triggering multiple times if needed
    setTimeout(() => {
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(crisisText);
      }
    }, 500);
  }

  /**
   * Sync status announcement with context awareness
   */
  static announceSyncStatus(
    componentId: string,
    status: SyncStatus,
    entityType?: string,
    details?: any
  ): void {
    const announcement = this.generateSyncStatusAnnouncement(status, entityType, details);
    const priority = this.getSyncStatusPriority(status);
    const category = this.getSyncStatusCategory(status, entityType);

    this.announceForComponent(componentId, announcement, priority, category);
  }

  /**
   * Generate comprehensive sync status announcement
   */
  private static generateSyncStatusAnnouncement(
    status: SyncStatus,
    entityType?: string,
    details?: any
  ): string {
    const entityContext = entityType ? this.getEntityDisplayName(entityType) : '';
    const baseMessage = this.getBaseStatusMessage(status);
    const contextualInfo = this.getContextualInfo(status, entityType, details);
    const encouragement = this.getStateAppropriateEncouragement(status);

    return [entityContext, baseMessage, contextualInfo, encouragement]
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Enhance text based on current mental health state
   */
  private static enhanceTextForMentalHealthState(
    text: string,
    category: 'crisis' | 'therapeutic' | 'general'
  ): string {
    if (category === 'crisis') {
      return this.enhanceTextForCrisis(text);
    }

    switch (this.currentMentalHealthState) {
      case 'depression':
        return this.enhanceTextForDepression(text);
      case 'anxiety':
        return this.enhanceTextForAnxiety(text);
      case 'crisis':
        return this.enhanceTextForCrisis(text);
      default:
        return text;
    }
  }

  /**
   * Enhance text for depression - encouraging and gentle
   */
  private static enhanceTextForDepression(text: string): string {
    // Add gentle, encouraging context for depression
    const depressionEnhancements = {
      'sync completed': 'sync completed. You\'re taking care of your progress',
      'sync failed': 'sync had trouble connecting. Your progress is still safe here',
      'conflict detected': 'found different information. We can help you choose what works best',
      'device connected': 'device connected. Your healing journey is backed up safely'
    };

    for (const [pattern, enhancement] of Object.entries(depressionEnhancements)) {
      if (text.toLowerCase().includes(pattern)) {
        return text.replace(new RegExp(pattern, 'gi'), enhancement);
      }
    }

    return text;
  }

  /**
   * Enhance text for anxiety - reassuring and predictable
   */
  private static enhanceTextForAnxiety(text: string): string {
    // Add calming, reassuring context for anxiety
    const anxietyEnhancements = {
      'sync starting': 'sync starting quietly in the background',
      'sync completed': 'sync completed successfully. Everything is secure',
      'sync failed': 'brief connection issue. Everything is still working normally',
      'conflict detected': 'different versions found. You have full control to choose'
    };

    for (const [pattern, enhancement] of Object.entries(anxietyEnhancements)) {
      if (text.toLowerCase().includes(pattern)) {
        return text.replace(new RegExp(pattern, 'gi'), enhancement);
      }
    }

    return text;
  }

  /**
   * Enhance text for crisis - supportive and clear
   */
  private static enhanceTextForCrisis(text: string): string {
    // Ensure crisis context and available support
    if (!text.toLowerCase().includes('emergency') && !text.toLowerCase().includes('support')) {
      return `${text}. Emergency support remains available.`;
    }
    return text;
  }

  /**
   * Check if announcement should proceed based on throttling and conflicts
   */
  private static shouldAnnounce(
    componentId: string,
    text: string,
    priority: 'assertive' | 'polite'
  ): boolean {
    const existing = this.announcements.get(componentId);
    const now = Date.now();

    // Always allow crisis announcements
    if (priority === 'assertive') {
      return true;
    }

    // Check throttling for same component
    if (existing && (now - existing.timestamp) < this.announcementThrottleTime) {
      return false;
    }

    // Check for identical text within throttle period
    for (const [, announcement] of this.announcements) {
      if (announcement.text === text && (now - announcement.timestamp) < this.announcementThrottleTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle priority conflicts between announcements
   */
  private static handlePriorityConflicts(
    priority: 'assertive' | 'polite',
    category: 'crisis' | 'therapeutic' | 'general'
  ): void {
    if (priority === 'assertive' || category === 'crisis') {
      // Clear all polite announcements for assertive/crisis announcements
      this.clearAnnouncementsWithPriority('polite');
    }
  }

  /**
   * Clear announcements with specific priority
   */
  private static clearAnnouncementsWithPriority(priority: 'assertive' | 'polite'): void {
    for (const [key, announcement] of this.announcements.entries()) {
      if (announcement.priority === priority) {
        this.announcements.delete(key);
      }
    }
  }

  /**
   * Clear all non-crisis announcements for emergency situations
   */
  private static clearAllNonCrisisAnnouncements(): void {
    for (const [key, announcement] of this.announcements.entries()) {
      if (announcement.category !== 'crisis') {
        this.announcements.delete(key);
      }
    }
  }

  /**
   * Perform the actual announcement with platform optimization
   */
  private static performAnnouncement(text: string, priority: 'assertive' | 'polite'): void {
    // Use cached version if available
    const cached = this.cache.get(text);
    const announcementText = cached?.announcement || text;

    // Platform-specific announcement optimization
    if (Platform.OS === 'ios') {
      // iOS VoiceOver optimization
      AccessibilityInfo.announceForAccessibility(announcementText);
    } else {
      // Android TalkBack optimization
      AccessibilityInfo.announceForAccessibility(announcementText);
    }

    // Update cache usage
    if (cached) {
      cached.lastUsed = Date.now();
    }
  }

  /**
   * Preload critical announcements for instant delivery
   */
  private static preloadCriticalAnnouncements(): void {
    const criticalAnnouncements = [
      'Crisis support activated. Emergency access available.',
      'Emergency mode active. Help is ready immediately.',
      'Sync conflict detected in crisis plan. Emergency access preserved.',
      'Device disconnected. Emergency features still available.',
      'Crisis data syncing. Support remains accessible.',
      'Sync failed. Crisis button still works.',
      'Emergency backup complete. Safety plan secured.'
    ];

    criticalAnnouncements.forEach(announcement => {
      this.cache.set(announcement, {
        announcement,
        lastUsed: Date.now(),
        priority: 'high',
        preProcessed: true
      });
    });
  }

  /**
   * Setup performance optimizations
   */
  private static setupPerformanceOptimizations(): void {
    // Cleanup cache periodically
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Every minute

    // Cleanup old announcements
    setInterval(() => {
      this.cleanupOldAnnouncements();
    }, 30000); // Every 30 seconds
  }

  /**
   * Get mental health state aware throttle time
   */
  private static getStateAwareThrottleTime(state: MentalHealthState): number {
    switch (state) {
      case 'crisis':
        return 500; // Faster announcements during crisis
      case 'anxiety':
        return 3000; // Slower announcements to avoid overwhelming
      case 'depression':
        return 2500; // Slightly slower for processing time
      default:
        return 2000; // Standard throttling
    }
  }

  /**
   * Get sync status priority for announcements
   */
  private static getSyncStatusPriority(status: SyncStatus): 'assertive' | 'polite' {
    switch (status) {
      case 'error':
      case 'conflict':
        return 'assertive';
      default:
        return 'polite';
    }
  }

  /**
   * Get sync status category
   */
  private static getSyncStatusCategory(
    status: SyncStatus,
    entityType?: string
  ): 'crisis' | 'therapeutic' | 'general' {
    if (entityType === 'CRISIS_PLAN' || entityType === 'emergency_contacts') {
      return 'crisis';
    }
    if (entityType === 'CHECK_IN' || entityType === 'ASSESSMENT' || entityType === 'SESSION_DATA') {
      return 'therapeutic';
    }
    return 'general';
  }

  /**
   * Get base status message for sync operations
   */
  private static getBaseStatusMessage(status: SyncStatus): string {
    switch (status) {
      case 'syncing':
        return 'sharing your information between devices';
      case 'success':
        return 'all devices updated successfully';
      case 'error':
        return 'connection had trouble, will try again';
      case 'conflict':
        return 'found different information that needs your attention';
      case 'paused':
        return 'sync paused, will resume when connection improves';
      default:
        return 'sync status updated';
    }
  }

  /**
   * Get contextual information based on sync details
   */
  private static getContextualInfo(status: SyncStatus, entityType?: string, details?: any): string {
    if (entityType === 'CRISIS_PLAN') {
      switch (status) {
        case 'syncing':
          return 'Emergency access remains available';
        case 'error':
          return 'Local crisis plan still accessible';
        case 'conflict':
          return 'Emergency features preserved during resolution';
        default:
          return '';
      }
    }

    if (details?.hasConflicts) {
      return 'You can choose which version to keep';
    }

    return '';
  }

  /**
   * Get state-appropriate encouragement
   */
  private static getStateAppropriateEncouragement(status: SyncStatus): string {
    if (status === 'success' && this.currentMentalHealthState === 'depression') {
      return 'You\'re taking good care of your progress.';
    }
    if (status === 'error' && this.currentMentalHealthState === 'anxiety') {
      return 'Everything important is still working.';
    }
    return '';
  }

  /**
   * Get display name for entity types
   */
  private static getEntityDisplayName(entityType: string): string {
    const displayNames: Record<string, string> = {
      'CHECK_IN': 'Daily check-in',
      'ASSESSMENT': 'Assessment',
      'CRISIS_PLAN': 'Crisis plan',
      'USER_PROFILE': 'Profile',
      'SESSION_DATA': 'Session progress',
      'WIDGET_DATA': 'Widget'
    };

    return displayNames[entityType] || entityType.toLowerCase().replace('_', ' ');
  }

  /**
   * Schedule announcement cleanup
   */
  private static scheduleAnnouncementCleanup(componentId: string): void {
    setTimeout(() => {
      this.announcements.delete(componentId);
    }, 10000); // Clean up after 10 seconds
  }

  /**
   * Cleanup old cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [key, cached] of this.cache.entries()) {
      if (cached.priority !== 'high' && (now - cached.lastUsed) > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup old announcements
   */
  private static cleanupOldAnnouncements(): void {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds

    for (const [key, announcement] of this.announcements.entries()) {
      if ((now - announcement.timestamp) > maxAge) {
        this.announcements.delete(key);
      }
    }
  }

  /**
   * Get current accessibility statistics for monitoring
   */
  static getAccessibilityStats(): {
    activeAnnouncements: number;
    cacheSize: number;
    currentState: MentalHealthState;
    throttleTime: number;
  } {
    return {
      activeAnnouncements: this.announcements.size,
      cacheSize: this.cache.size,
      currentState: this.currentMentalHealthState,
      throttleTime: this.announcementThrottleTime
    };
  }

  /**
   * Reset coordinator (for testing)
   */
  static reset(): void {
    this.announcements.clear();
    this.cache.clear();
    this.currentMentalHealthState = 'stable';
    this.initialized = false;
  }
}

export default SyncAccessibilityCoordinator;