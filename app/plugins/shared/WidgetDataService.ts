/**
 * Widget Data Service - Privacy-preserving data bridge
 * Coordinates between React Native app and native widgets
 * Implements clinical-grade privacy standards for mental health data
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useCheckInStore } from '../store/checkInStore';

export interface WidgetData {
  // Safe for widget display (no PHQ-9/GAD-7 data)
  readonly todayProgress: {
    readonly morning: WidgetSessionStatus;
    readonly midday: WidgetSessionStatus;
    readonly evening: WidgetSessionStatus;
    readonly completionPercentage: number; // 0-100
  };
  readonly hasActiveCrisis: boolean; // Crisis button accessibility
  readonly lastUpdateTime: string; // ISO timestamp
  readonly appVersion: string;
  readonly encryptionHash: string; // Data integrity verification
}

export interface WidgetSessionStatus {
  readonly status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  readonly progressPercentage: number; // 0-100 for in_progress
  readonly canResume: boolean;
  readonly estimatedTimeMinutes: number; // Only for in_progress
}

export class WidgetDataService {
  private static readonly WIDGET_DATA_KEY = 'being_widget_data';
  private static readonly MAX_UPDATE_FREQUENCY_MS = 60000; // 1 minute
  private lastUpdateTime: number = 0;

  /**
   * Generate privacy-safe widget data from app state
   */
  async generateWidgetData(): Promise<WidgetData> {
    const checkInStore = useCheckInStore.getState();
    const todayProgress = checkInStore.getTodaysProgress();
    
    // Calculate session statuses
    const morning = await this.getSessionStatus('morning', checkInStore);
    const midday = await this.getSessionStatus('midday', checkInStore);  
    const evening = await this.getSessionStatus('evening', checkInStore);

    const completionPercentage = Math.round(
      (todayProgress.completed / Math.max(todayProgress.total, 1)) * 100
    );

    // Check for crisis mode (no sensitive data exposed)
    const hasActiveCrisis = await this.checkCrisisMode();

    const widgetData: WidgetData = {
      todayProgress: {
        morning,
        midday, 
        evening,
        completionPercentage
      },
      hasActiveCrisis,
      lastUpdateTime: new Date().toISOString(),
      appVersion: Constants.expoConfig?.version || '1.0.0',
      encryptionHash: await this.generateDataHash({
        morning: morning.status,
        midday: midday.status,
        evening: evening.status,
        completionPercentage,
        timestamp: new Date().toISOString()
      })
    };

    return widgetData;
  }

  /**
   * Update widget data with throttling
   */
  async updateWidgetData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdateTime < WidgetDataService.MAX_UPDATE_FREQUENCY_MS) {
      return; // Throttle updates
    }

    try {
      const widgetData = await this.generateWidgetData();
      
      // Apply privacy filtering
      const filteredData = await this.applyPrivacyFilter(widgetData);
      if (!filteredData) {
        console.error('Widget data failed privacy filtering');
        return;
      }
      
      // Store in native widget storage
      await this.storeWidgetData(filteredData);
      
      // Notify native widgets
      await this.triggerWidgetUpdate();
      
      this.lastUpdateTime = now;
      
      console.log('Widget data updated:', {
        completion: widgetData.todayProgress.completionPercentage,
        timestamp: widgetData.lastUpdateTime
      });
      
    } catch (error) {
      console.error('Widget data update failed:', error);
    }
  }

  /**
   * Handle deep link from widget tap
   */
  async handleWidgetDeepLink(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      
      // Security: Validate URL scheme
      if (urlObj.protocol !== 'being:') {
        console.warn('Invalid deep link protocol:', urlObj.protocol);
        return;
      }

      const path = urlObj.pathname;
      const params = Object.fromEntries(urlObj.searchParams);
      
      // Route to appropriate handler
      if (path.startsWith('/checkin/')) {
        await this.handleCheckInDeepLink(path, params);
      } else if (path === '/crisis') {
        await this.handleCrisisDeepLink();
      } else {
        console.warn('Unhandled deep link path:', path);
        // Navigate to home screen as fallback
        this.navigateToHome();
      }
      
      // Update widget data after navigation
      setTimeout(() => this.updateWidgetData(), 1000);
      
    } catch (error) {
      console.error('Deep link handling failed:', error);
      this.navigateToHome();
    }
  }

  /**
   * Privacy filter to ensure no sensitive data reaches widgets
   */
  private async applyPrivacyFilter(data: WidgetData): Promise<WidgetData | null> {
    // Comprehensive privacy check
    const dataString = JSON.stringify(data).toLowerCase();
    
    // Prohibited patterns (clinical data indicators)
    const prohibitedPatterns = [
      'phq', 'gad', 'assessment', 'score', 'suicidal', 'depression',
      'anxiety', 'medication', 'diagnosis', 'emergency_contact',
      'personal_note', 'therapy', 'treatment'
    ];
    
    // Check for clinical data leakage
    for (const pattern of prohibitedPatterns) {
      if (dataString.includes(pattern)) {
        console.error(`PRIVACY VIOLATION: Clinical data detected in widget payload: ${pattern}`);
        return null;
      }
    }
    
    // Check for email or phone patterns
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phonePattern = /\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/;
    
    if (emailPattern.test(dataString) || phonePattern.test(dataString)) {
      console.error('PRIVACY VIOLATION: Personal contact information detected in widget payload');
      return null;
    }
    
    return data;
  }

  /**
   * Store widget data in native storage
   */
  private async storeWidgetData(widgetData: WidgetData): Promise<void> {
    const jsonData = JSON.stringify(widgetData);
    
    if (Platform.OS === 'ios') {
      // iOS: Store in App Groups UserDefaults via native bridge
      // This will be handled by the native iOS WidgetDataManager
      await this.callNativeMethod('storeWidgetData', { jsonData });
    } else if (Platform.OS === 'android') {
      // Android: Store via native bridge
      await this.callNativeMethod('storeWidgetData', { jsonData });
    }
    
    // Also store encrypted backup in SecureStore
    try {
      await SecureStore.setItemAsync(WidgetDataService.WIDGET_DATA_KEY, jsonData);
    } catch (error) {
      console.warn('SecureStore backup failed:', error);
    }
  }

  /**
   * Trigger native widget updates
   */
  private async triggerWidgetUpdate(): Promise<void> {
    if (Platform.OS === 'ios') {
      // iOS: Reload WidgetKit timelines
      await this.callNativeMethod('reloadWidgets', {});
    } else if (Platform.OS === 'android') {
      // Android: Send broadcast to widget provider
      await this.callNativeMethod('updateWidgets', {});
    }
  }

  // Private helper methods

  private async getSessionStatus(
    type: 'morning' | 'midday' | 'evening',
    store: any
  ): Promise<WidgetSessionStatus> {
    const todayCheckIn = store.getTodaysCheckIn(type);
    
    if (todayCheckIn) {
      return {
        status: todayCheckIn.skipped ? 'skipped' : 'completed',
        progressPercentage: 100,
        canResume: false,
        estimatedTimeMinutes: 0
      };
    }

    // Check for resumable session
    const hasPartialSession = await store.checkForPartialSession(type);
    if (hasPartialSession) {
      const sessionProgress = await store.getSessionProgress(type);
      return {
        status: 'in_progress',
        progressPercentage: sessionProgress?.percentComplete || 0,
        canResume: true,
        estimatedTimeMinutes: Math.ceil((sessionProgress?.estimatedTimeRemaining || 0) / 60)
      };
    }

    return {
      status: 'not_started',
      progressPercentage: 0,
      canResume: false,
      estimatedTimeMinutes: this.getEstimatedDuration(type)
    };
  }

  private getEstimatedDuration(type: 'morning' | 'midday' | 'evening'): number {
    // Return estimated session duration in minutes
    switch (type) {
      case 'morning': return 5;
      case 'midday': return 3;
      case 'evening': return 7;
      default: return 5;
    }
  }

  private async checkCrisisMode(): Promise<boolean> {
    // Check if crisis mode is active without exposing clinical data
    // This should be based on crisis flag state, not assessment scores
    try {
      const crisisState = useCheckInStore.getState().crisisMode;
      return crisisState?.isActive || false;
    } catch (error) {
      console.error('Crisis mode check failed:', error);
      return false;
    }
  }

  private async generateDataHash(data: any): Promise<string> {
    // Generate secure hash for data integrity without exposing content
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    
    // Use a simple hash for data integrity (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  private async handleCheckInDeepLink(path: string, params: any): Promise<void> {
    const pathParts = path.split('/');
    const checkInType = pathParts[2] as 'morning' | 'midday' | 'evening';
    
    if (!['morning', 'midday', 'evening'].includes(checkInType)) {
      console.warn('Invalid check-in type:', checkInType);
      return;
    }

    const shouldResume = params.resume === 'true';
    
    // Navigate using React Navigation
    // This would be implemented in the actual navigation service
    console.log(`Navigate to check-in: ${checkInType}, resume: ${shouldResume}`);
  }

  private async handleCrisisDeepLink(): Promise<void> {
    // Navigate to crisis intervention
    console.log('Navigate to crisis intervention');
  }

  private navigateToHome(): void {
    // Navigate to home screen
    console.log('Navigate to home screen');
  }

  private async callNativeMethod(method: string, params: any): Promise<any> {
    // Placeholder for native bridge calls
    // In actual implementation, this would use React Native's NativeModules
    console.log(`Native call: ${method}`, params);
    
    return Promise.resolve();
  }
}