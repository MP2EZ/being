/**
 * Widget Store Integration
 * Enhanced checkInStore with widget-aware methods and real-time updates
 * Provides seamless integration between Zustand state and widget data bridge
 */

import { useCheckInStore } from './checkInStore';
import { WidgetDataService } from '../services/WidgetDataService';
import { 
  WidgetUpdateTrigger, 
  WidgetStoreIntegration, 
  WidgetUpdateCallback,
  WidgetProgressCallback,
  WidgetEventCallback,
  WidgetEvent,
  CheckInType 
} from '../types/widget';

class WidgetStoreIntegrationService implements WidgetStoreIntegration {
  private widgetDataService: WidgetDataService;
  private updateCallbacks: Set<WidgetUpdateCallback> = new Set();
  private progressCallbacks: Set<WidgetProgressCallback> = new Set();
  private eventCallbacks: Set<WidgetEventCallback> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    this.widgetDataService = new WidgetDataService();
  }

  /**
   * Initialize widget integration with store subscriptions
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to checkIn store changes
    useCheckInStore.subscribe((state, prevState) => {
      this.handleStoreStateChange(state, prevState);
    });

    this.isInitialized = true;
    console.log('Widget store integration initialized');
  }

  /**
   * Handle store state changes and trigger appropriate widget updates
   */
  private async handleStoreStateChange(state: any, prevState: any): Promise<void> {
    try {
      // Check for check-in completion
      if (this.hasCheckInCompleted(state, prevState)) {
        await this.triggerWidgetUpdate('checkin_completed', 'status_change', 'high');
        this.emitEvent('checkin_status_changed', { 
          newStatus: 'completed',
          previousStatus: 'in_progress'
        });
      }

      // Check for check-in start
      if (this.hasCheckInStarted(state, prevState)) {
        await this.triggerWidgetUpdate('checkin_started', 'status_change', 'normal');
        this.emitEvent('checkin_status_changed', {
          newStatus: 'in_progress',
          previousStatus: 'not_started'
        });
      }

      // Check for session progress updates
      if (this.hasSessionProgressUpdated(state, prevState)) {
        await this.triggerWidgetUpdate('session_progress', 'progress_update', 'normal');
        this.emitProgressUpdate(state);
      }

      // Check for crisis mode changes
      if (this.hasCrisisModeChanged(state, prevState)) {
        const isActive = state.crisisMode?.isActive || false;
        await this.triggerWidgetUpdate('crisis_mode_changed', 'crisis_alert', 'critical');
        this.emitEvent(isActive ? 'crisis_mode_activated' : 'crisis_mode_deactivated', {
          isActive,
          trigger: state.crisisMode?.trigger
        });
      }

    } catch (error) {
      console.error('Widget store integration error:', error);
    }
  }

  /**
   * Check if a check-in was completed
   */
  private hasCheckInCompleted(state: any, prevState: any): boolean {
    const prevCurrentCheckIn = prevState?.currentCheckIn;
    const currentCheckIn = state?.currentCheckIn;
    
    return (
      prevCurrentCheckIn && 
      !prevCurrentCheckIn.completedAt &&
      (!currentCheckIn || currentCheckIn === null) &&
      state.todaysCheckIns?.length > prevState.todaysCheckIns?.length
    );
  }

  /**
   * Check if a check-in was started
   */
  private hasCheckInStarted(state: any, prevState: any): boolean {
    const prevCurrentCheckIn = prevState?.currentCheckIn;
    const currentCheckIn = state?.currentCheckIn;
    
    return (
      !prevCurrentCheckIn &&
      currentCheckIn &&
      currentCheckIn.startedAt &&
      !currentCheckIn.completedAt
    );
  }

  /**
   * Check if session progress was updated
   */
  private hasSessionProgressUpdated(state: any, prevState: any): boolean {
    const prevProgress = prevState?.sessionProgress;
    const currentProgress = state?.sessionProgress;
    
    if (!prevProgress || !currentProgress) {
      return false;
    }

    return (
      prevProgress.percentComplete !== currentProgress.percentComplete ||
      prevProgress.completedSteps?.length !== currentProgress.completedSteps?.length
    );
  }

  /**
   * Check if crisis mode state changed
   */
  private hasCrisisModeChanged(state: any, prevState: any): boolean {
    const prevCrisisMode = prevState?.crisisMode;
    const currentCrisisMode = state?.crisisMode;
    
    return (
      (prevCrisisMode?.isActive || false) !== (currentCrisisMode?.isActive || false)
    );
  }

  /**
   * Trigger widget update with specified parameters
   */
  private async triggerWidgetUpdate(
    source: WidgetUpdateTrigger['source'],
    reason: WidgetUpdateTrigger['reason'],
    priority: WidgetUpdateTrigger['priority']
  ): Promise<void> {
    const trigger: WidgetUpdateTrigger = {
      source,
      reason,
      priority,
      timestamp: new Date().toISOString()
    };

    // Notify all update callbacks
    this.updateCallbacks.forEach(callback => {
      try {
        callback(trigger);
      } catch (error) {
        console.error('Widget update callback error:', error);
      }
    });

    // Update widget data
    try {
      await this.widgetDataService.updateWidgetData(trigger);
    } catch (error) {
      console.error('Widget data update failed:', error);
    }
  }

  /**
   * Emit progress update to callbacks
   */
  private emitProgressUpdate(state: any): void {
    try {
      const todayProgress = state.getTodaysProgress?.() || { completed: 0, total: 3 };
      const sessionProgress = state.sessionProgress;
      
      const widgetProgress = {
        morning: this.getSessionStatusFromState(state, 'morning'),
        midday: this.getSessionStatusFromState(state, 'midday'),
        evening: this.getSessionStatusFromState(state, 'evening'),
        completionPercentage: Math.round((todayProgress.completed / todayProgress.total) * 100)
      };

      this.progressCallbacks.forEach(callback => {
        try {
          callback(widgetProgress);
        } catch (error) {
          console.error('Widget progress callback error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to emit progress update:', error);
    }
  }

  /**
   * Get session status for a specific check-in type from store state
   */
  private getSessionStatusFromState(state: any, type: CheckInType) {
    const todayCheckIn = state.getTodaysCheckIn?.(type);
    
    if (todayCheckIn) {
      return {
        status: todayCheckIn.skipped ? 'skipped' : 'completed',
        progressPercentage: 100,
        canResume: false,
        estimatedTimeMinutes: 0
      };
    }

    // Check for current session
    if (state.currentCheckIn?.type === type) {
      return {
        status: 'in_progress',
        progressPercentage: state.sessionProgress?.percentComplete || 0,
        canResume: true,
        estimatedTimeMinutes: Math.ceil((state.sessionProgress?.estimatedTimeRemaining || 0) / 60)
      };
    }

    return {
      status: 'not_started',
      progressPercentage: 0,
      canResume: false,
      estimatedTimeMinutes: this.getEstimatedDuration(type)
    };
  }

  /**
   * Get estimated duration for check-in type
   */
  private getEstimatedDuration(type: CheckInType): number {
    switch (type) {
      case 'morning': return 5;
      case 'midday': return 3;
      case 'evening': return 7;
      default: return 5;
    }
  }

  /**
   * Emit widget event to callbacks
   */
  private emitEvent(eventType: WidgetEvent['type'], data: unknown): void {
    const event: WidgetEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Widget event callback error:', error);
      }
    });
  }

  /**
   * WidgetStoreIntegration interface implementation
   */
  subscribeToCheckInUpdates = (callback: WidgetUpdateCallback): (() => void) => {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  };

  subscribeToSessionProgress = (callback: WidgetProgressCallback): (() => void) => {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  };

  subscribeToUserEvents = (callback: WidgetEventCallback): (() => void) => {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  };

  /**
   * Public API methods
   */
  
  /**
   * Force immediate widget update
   */
  async forceUpdate(): Promise<void> {
    await this.triggerWidgetUpdate('manual_refresh', 'data_refresh', 'high');
  }

  /**
   * Get widget data service instance
   */
  getWidgetDataService(): WidgetDataService {
    return this.widgetDataService;
  }

  /**
   * Get current subscription counts (for debugging)
   */
  getSubscriptionCounts(): {
    updateCallbacks: number;
    progressCallbacks: number;
    eventCallbacks: number;
  } {
    return {
      updateCallbacks: this.updateCallbacks.size,
      progressCallbacks: this.progressCallbacks.size,
      eventCallbacks: this.eventCallbacks.size
    };
  }
}

// Export singleton instance
export const widgetStoreIntegration = new WidgetStoreIntegrationService();

/**
 * Enhanced checkInStore methods for widget integration
 * Adds widget-aware methods to the existing store
 */
export const enhanceCheckInStoreWithWidgets = () => {
  const originalStore = useCheckInStore;
  
  // Initialize widget integration
  widgetStoreIntegration.initialize();
  
  return {
    ...originalStore,
    
    /**
     * Start check-in with widget update notification
     */
    startCheckInWithWidgetUpdate: async (type: CheckInType, currentScreen = 'start') => {
      await originalStore.getState().startCheckIn(type, currentScreen);
      await widgetStoreIntegration.forceUpdate();
    },

    /**
     * Complete check-in with widget update notification
     */
    saveCurrentCheckInWithWidgetUpdate: async () => {
      await originalStore.getState().saveCurrentCheckIn();
      await widgetStoreIntegration.forceUpdate();
    },

    /**
     * Update check-in with widget progress notification
     */
    updateCurrentCheckInWithWidgetUpdate: async (data: any, currentScreen = 'unknown') => {
      await originalStore.getState().updateCurrentCheckIn(data, currentScreen);
      // Widget update will be triggered automatically by store subscription
    },

    /**
     * Resume check-in with widget notification
     */
    resumeCheckInWithWidgetUpdate: async (type: CheckInType) => {
      const success = await originalStore.getState().resumeCheckIn(type);
      if (success) {
        await widgetStoreIntegration.forceUpdate();
      }
      return success;
    },

    /**
     * Get widget integration service
     */
    getWidgetIntegration: () => widgetStoreIntegration,
  };
};

// Export enhanced store hook
export const useCheckInStoreWithWidgets = enhanceCheckInStoreWithWidgets();