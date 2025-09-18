/**
 * Widget Data Service - Privacy-preserving data bridge
 * Coordinates between React Native app and native widgets
 * Implements clinical-grade privacy standards for mental health data
 * Enhanced with comprehensive TypeScript integration and error handling
 */

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useCheckInStore } from '../store/checkInStore';
import { NavigationService } from './NavigationService';
import { widgetNativeBridge } from './WidgetNativeBridge';
import { 
  WidgetData, 
  WidgetSessionStatus, 
  WidgetTodayProgress,
  WidgetCrisisButton,
  WidgetCrisisProminence,
  WidgetCrisisStyle,
  WidgetBridgeError,
  WidgetErrorCode,
  WidgetUpdateTrigger,
  WidgetConfiguration,
  PrivacyValidationResult,
  PrivacyViolation,
  WidgetNativeBridge,
  WidgetPerformanceMetrics,
  WidgetTypeGuards,
  CheckInType,
  WidgetSafeData,
  DeepReadonly
} from '../types/widget';

// Re-export core types for backward compatibility
export type { WidgetData, WidgetSessionStatus } from '../types/widget';

/**
 * Enhanced Widget Data Service with comprehensive privacy protection
 * Implements compile-time and runtime privacy validation
 */
export class WidgetDataService implements WidgetTypeGuards {
  private static readonly WIDGET_DATA_KEY = 'being_widget_data';
  private static readonly PERFORMANCE_METRICS_KEY = 'widget_performance_metrics';
  
  // Configuration
  private readonly config: WidgetConfiguration = {
    updateFrequencyMs: 60000, // 1 minute
    maxRetries: 3,
    timeoutMs: 10000,
    privacyLevel: 'standard',
    enabledFeatures: ['progress_display', 'quick_checkin', 'crisis_button', 'time_estimates']
  };

  // State
  private lastUpdateTime: number = 0;
  private performanceMetrics: WidgetPerformanceMetrics[] = [];
  private isUpdating: boolean = false;

  // Native bridge cache
  private nativeBridge: WidgetNativeBridge | null = null;

  /**
   * Type Guards Implementation (WidgetTypeGuards interface)
   */
  
  isValidWidgetData = (data: unknown): data is WidgetData => {
    if (!data || typeof data !== 'object') return false;
    
    const d = data as any;
    return (
      typeof d.lastUpdateTime === 'string' &&
      typeof d.appVersion === 'string' &&
      typeof d.encryptionHash === 'string' &&
      typeof d.hasActiveCrisis === 'boolean' &&
      this.isValidCrisisButton(d.crisisButton) &&
      this.isValidTodayProgress(d.todayProgress)
    );
  };

  isValidSessionStatus = (status: unknown): status is WidgetSessionStatus => {
    if (!status || typeof status !== 'object') return false;
    
    const s = status as any;
    const validStatuses = ['not_started', 'in_progress', 'completed', 'skipped'];
    
    return (
      validStatuses.includes(s.status) &&
      typeof s.progressPercentage === 'number' &&
      s.progressPercentage >= 0 && s.progressPercentage <= 100 &&
      typeof s.canResume === 'boolean' &&
      typeof s.estimatedTimeMinutes === 'number' &&
      s.estimatedTimeMinutes >= 0
    );
  };

  isValidDeepLinkParams = (params: unknown): params is any => {
    if (!params || typeof params !== 'object') return false;
    
    const p = params as any;
    return (
      typeof p.url === 'string' &&
      typeof p.timestamp === 'string' &&
      ['ios_widget', 'android_widget'].includes(p.source)
    );
  };

  isValidCheckInType = (type: unknown): type is CheckInType => {
    return ['morning', 'midday', 'evening'].includes(type as string);
  };

  isValidCrisisButton = (button: unknown): button is WidgetCrisisButton => {
    if (!button || typeof button !== 'object') return false;
    
    const b = button as any;
    const validProminence = ['standard', 'enhanced'].includes(b.prominence);
    const validStyle = ['standard', 'urgent'].includes(b.style);
    
    return (
      b.alwaysVisible === true && // Must be explicitly true for safety
      validProminence &&
      validStyle &&
      typeof b.text === 'string' &&
      b.text.length > 0 &&
      (b.responseTimeMs === undefined || typeof b.responseTimeMs === 'number')
    );
  };

  hasPrivacyViolations = (data: unknown): boolean => {
    const result = this.validatePrivacy(data);
    return !result.isValid;
  };

  private isValidTodayProgress = (progress: unknown): progress is WidgetTodayProgress => {
    if (!progress || typeof progress !== 'object') return false;
    
    const p = progress as any;
    return (
      this.isValidSessionStatus(p.morning) &&
      this.isValidSessionStatus(p.midday) &&
      this.isValidSessionStatus(p.evening) &&
      typeof p.completionPercentage === 'number' &&
      p.completionPercentage >= 0 && p.completionPercentage <= 100
    );
  };

  /**
   * Generate privacy-safe widget data from app state with comprehensive validation
   */
  async generateWidgetData(): Promise<WidgetData> {
    const operationId = this.startPerformanceTracking('generateWidgetData');
    
    try {
      const checkInStore = useCheckInStore.getState();
      const todayProgress = checkInStore.getTodaysProgress();
      
      // Calculate session statuses with privacy protection
      const morning = await this.getSessionStatus('morning', checkInStore);
      const midday = await this.getSessionStatus('midday', checkInStore);  
      const evening = await this.getSessionStatus('evening', checkInStore);

      const completionPercentage = Math.round(
        (todayProgress.completed / Math.max(todayProgress.total, 1)) * 100
      );

      // Check for crisis mode (no sensitive data exposed)
      const hasActiveCrisis = await this.checkCrisisMode();

      // Generate crisis button data with unconditional visibility
      const crisisButton = await this.generateCrisisButtonData(hasActiveCrisis);

      // Construct widget data with type safety
      const rawWidgetData = {
        todayProgress: {
          morning,
          midday, 
          evening,
          completionPercentage
        },
        hasActiveCrisis, // Deprecated but maintained for backward compatibility
        crisisButton,
        lastUpdateTime: new Date().toISOString(),
        appVersion: Constants.expoConfig?.version || '1.0.0',
        encryptionHash: await this.generateDataHash({
          morning: morning.status,
          midday: midday.status,
          evening: evening.status,
          completionPercentage,
          crisisButton: crisisButton.prominence,
          timestamp: new Date().toISOString()
        })
      };

      // Validate data structure
      if (!this.isValidWidgetData(rawWidgetData)) {
        throw new WidgetBridgeError(
          'Generated widget data failed validation',
          'INVALID_DATA_FORMAT',
          rawWidgetData
        );
      }

      // Apply comprehensive privacy validation
      const privacyResult = this.validatePrivacy(rawWidgetData);
      if (!privacyResult.isValid || !privacyResult.filteredData) {
        throw new WidgetBridgeError(
          `Privacy validation failed: ${privacyResult.violations.map(v => v.details).join(', ')}`,
          'PRIVACY_VIOLATION',
          privacyResult.violations
        );
      }

      // Return privacy-compliant data
      const widgetData = this.ensureReadonly(privacyResult.filteredData);
      
      this.endPerformanceTracking(operationId);
      return widgetData;

    } catch (error) {
      this.endPerformanceTracking(operationId);
      
      if (error instanceof WidgetBridgeError) {
        throw error;
      }
      
      throw new WidgetBridgeError(
        `Widget data generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INVALID_DATA_FORMAT',
        error
      );
    }
  }

  /**
   * Comprehensive privacy validation with clinical data detection
   */
  private validatePrivacy(data: unknown): PrivacyValidationResult {
    const violations: PrivacyViolation[] = [];
    
    if (!data || typeof data !== 'object') {
      violations.push({
        field: 'root',
        violationType: 'unauthorized_field',
        details: 'Data must be a valid object'
      });
      
      return {
        isValid: false,
        violations,
        filteredData: null
      };
    }

    const dataString = JSON.stringify(data).toLowerCase();
    
    // Clinical data pattern detection
    const clinicalPatterns = [
      { pattern: 'phq', type: 'assessment_data_detected' as const },
      { pattern: 'gad', type: 'assessment_data_detected' as const },
      { pattern: 'assessment', type: 'assessment_data_detected' as const },
      { pattern: 'score', type: 'clinical_data_detected' as const },
      { pattern: 'suicidal', type: 'clinical_data_detected' as const },
      { pattern: 'depression', type: 'clinical_data_detected' as const },
      { pattern: 'anxiety', type: 'clinical_data_detected' as const },
      { pattern: 'medication', type: 'clinical_data_detected' as const },
      { pattern: 'diagnosis', type: 'clinical_data_detected' as const },
      { pattern: 'therapy', type: 'clinical_data_detected' as const },
      { pattern: 'treatment', type: 'clinical_data_detected' as const },
    ];

    // Personal information patterns
    const personalPatterns = [
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'personal_information_detected' as const, name: 'email' },
      { pattern: /\d{3}-\d{3}-\d{4}|\(\d{3}\)\s*\d{3}-\d{4}/g, type: 'personal_information_detected' as const, name: 'phone' },
      { pattern: /emergency_contact/g, type: 'personal_information_detected' as const, name: 'emergency_contact' },
      { pattern: /personal_note/g, type: 'personal_information_detected' as const, name: 'personal_note' },
    ];

    // Check clinical patterns
    for (const { pattern, type } of clinicalPatterns) {
      if (dataString.includes(pattern)) {
        violations.push({
          field: 'content',
          violationType: type,
          details: `Clinical data pattern detected: ${pattern}`
        });
      }
    }

    // Check personal information patterns
    for (const { pattern, type, name } of personalPatterns) {
      if (pattern.test(dataString)) {
        violations.push({
          field: 'content',
          violationType: type,
          details: `Personal information detected: ${name}`
        });
      }
    }

    // Check data size limit
    const dataSize = dataString.length;
    const maxSize = 50000; // 50KB limit for widget data
    if (dataSize > maxSize) {
      violations.push({
        field: 'size',
        violationType: 'size_limit_exceeded',
        details: `Data size ${dataSize} bytes exceeds limit of ${maxSize} bytes`
      });
    }

    // If violations found, return invalid result
    if (violations.length > 0) {
      return {
        isValid: false,
        violations,
        filteredData: null
      };
    }

    // Data is safe - return validated copy
    return {
      isValid: true,
      violations: [],
      filteredData: JSON.parse(JSON.stringify(data)) as WidgetData
    };
  }

  /**
   * Ensure data is deeply readonly for widget safety
   */
  private ensureReadonly<T>(data: T): DeepReadonly<T> {
    // TypeScript will enforce readonly at compile time
    // This is a runtime validation for extra safety
    return Object.freeze(JSON.parse(JSON.stringify(data))) as DeepReadonly<T>;
  }

  /**
   * Performance tracking helpers
   */
  private startPerformanceTracking(operation: string): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Store start time for this operation
    (globalThis as any)[`perf_${operationId}`] = performance.now();
    return operationId;
  }

  private endPerformanceTracking(operationId: string): WidgetPerformanceMetrics {
    const startTime = (globalThis as any)[`perf_${operationId}`];
    const endTime = performance.now();
    const totalOperationMs = endTime - (startTime || endTime);

    const metrics: WidgetPerformanceMetrics = {
      updateLatencyMs: totalOperationMs,
      nativeCallLatencyMs: 0, // Would be set during native calls
      dataSerializationMs: 0, // Would be set during serialization
      privacyValidationMs: 0, // Would be set during validation
      totalOperationMs
    };

    // Store metrics for analysis
    this.performanceMetrics.push(metrics);
    
    // Clean up global tracking
    delete (globalThis as any)[`perf_${operationId}`];
    
    return metrics;
  }

  /**
   * Update widget data with enhanced error handling and performance tracking
   */
  async updateWidgetData(trigger?: WidgetUpdateTrigger): Promise<void> {
    // Prevent concurrent updates
    if (this.isUpdating) {
      console.log('Widget update already in progress, skipping');
      return;
    }

    // Throttle updates
    const now = Date.now();
    if (now - this.lastUpdateTime < this.config.updateFrequencyMs) {
      console.log('Widget update throttled');
      return;
    }

    this.isUpdating = true;
    const operationId = this.startPerformanceTracking('updateWidgetData');

    try {
      // Generate privacy-validated widget data
      const widgetData = await this.generateWidgetData();
      
      // Store in native widget storage with retry logic
      await this.storeWidgetDataWithRetry(widgetData);
      
      // Trigger native widget updates
      await this.triggerWidgetUpdateWithRetry();
      
      this.lastUpdateTime = now;
      
      // Mark widget as updated in store
      const checkInStore = useCheckInStore.getState();
      checkInStore.markWidgetUpdated();
      
      console.log('Widget data updated successfully:', {
        completion: widgetData.todayProgress.completionPercentage,
        timestamp: widgetData.lastUpdateTime,
        trigger: trigger?.source || 'manual',
        performanceMs: this.endPerformanceTracking(operationId).totalOperationMs
      });
      
    } catch (error) {
      this.endPerformanceTracking(operationId);
      
      const widgetError = error instanceof WidgetBridgeError 
        ? error 
        : new WidgetBridgeError(
            `Widget update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'UPDATE_THROTTLED',
            error
          );
      
      console.error('Widget data update failed:', {
        error: widgetError.message,
        code: widgetError.code,
        context: widgetError.context
      });
      
      // Re-throw for caller handling
      throw widgetError;
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Enhanced native bridge initialization
   */
  private initializeNativeBridge(): WidgetNativeBridge | null {
    if (this.nativeBridge) {
      return this.nativeBridge;
    }

    // Use the centralized native bridge service
    this.nativeBridge = widgetNativeBridge.getNativeBridge();
    
    if (!this.nativeBridge) {
      console.warn('Widget native bridge not available');
    }

    return this.nativeBridge;
  }

  /**
   * Store widget data with retry logic and native bridge integration
   */
  private async storeWidgetDataWithRetry(widgetData: WidgetData): Promise<void> {
    // Use the centralized native bridge service
    await widgetNativeBridge.storeWidgetData(widgetData);
  }

  /**
   * Trigger widget updates with retry logic
   */
  private async triggerWidgetUpdateWithRetry(): Promise<void> {
    // Use the centralized native bridge service
    await widgetNativeBridge.triggerWidgetUpdate();
  }

  /**
   * Generic retry execution helper
   */
  private async executeWithRetry(
    operation: () => Promise<void>, 
    operationType: string
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const operationId = this.startPerformanceTracking(`${operationType}_attempt_${attempt}`);
        await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeoutMs)
          )
        ]);
        this.endPerformanceTracking(operationId);
        
        // Success - return early
        if (attempt > 1) {
          console.log(`${operationType} succeeded on attempt ${attempt}`);
        }
        return;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`${operationType} attempt ${attempt} failed:`, lastError.message);
        
        // Wait before retry (exponential backoff)
        if (attempt < this.config.maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All retries failed
    throw new WidgetBridgeError(
      `${operationType} failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
      'STORAGE_FAILED',
      lastError
    );
  }

  /**
   * Enhanced deep link handling with comprehensive validation
   */
  async handleWidgetDeepLink(url: string): Promise<void> {
    const operationId = this.startPerformanceTracking('handleDeepLink');
    
    try {
      // Validate URL format
      if (!url || typeof url !== 'string') {
        throw new WidgetBridgeError(
          'Invalid deep link URL format',
          'DEEP_LINK_INVALID',
          { url }
        );
      }

      const urlObj = new URL(url);
      
      // Security: Validate URL scheme
      if (urlObj.protocol !== 'being:') {
        throw new WidgetBridgeError(
          `Invalid deep link protocol: ${urlObj.protocol}`,
          'DEEP_LINK_INVALID',
          { protocol: urlObj.protocol }
        );
      }

      const path = urlObj.pathname;
      const params = Object.fromEntries(urlObj.searchParams);
      
      console.log('Processing widget deep link:', { 
        path, 
        params, 
        timestamp: new Date().toISOString() 
      });
      
      // Route to appropriate handler with type safety
      if (path.startsWith('/checkin/')) {
        await this.handleCheckInDeepLink(path, params);
      } else if (path === '/crisis') {
        await this.handleCrisisDeepLink();
      } else {
        console.warn('Unhandled deep link path:', path);
        NavigationService.navigateToHome();
      }
      
      // Schedule widget data update after navigation
      const updateTrigger: WidgetUpdateTrigger = {
        source: 'manual_refresh',
        reason: 'data_refresh',
        timestamp: new Date().toISOString(),
        priority: 'normal'
      };
      
      setTimeout(() => this.updateWidgetData(updateTrigger), 1000);
      
      this.endPerformanceTracking(operationId);
      
    } catch (error) {
      this.endPerformanceTracking(operationId);
      
      const deepLinkError = error instanceof WidgetBridgeError 
        ? error 
        : new WidgetBridgeError(
            `Deep link handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'DEEP_LINK_INVALID',
            error
          );
      
      console.error('Deep link handling failed:', {
        error: deepLinkError.message,
        code: deepLinkError.code,
        url
      });
      
      // Fallback to home screen
      NavigationService.navigateToHome();
      throw deepLinkError;
    }
  }

  /**
   * Public API: Get current widget data for testing/debugging
   */
  async getCurrentWidgetData(): Promise<WidgetData | null> {
    try {
      return await this.generateWidgetData();
    } catch (error) {
      console.error('Failed to get current widget data:', error);
      return null;
    }
  }

  /**
   * Public API: Force widget update (bypass throttling)
   */
  async forceWidgetUpdate(): Promise<void> {
    this.lastUpdateTime = 0; // Reset throttling
    const trigger: WidgetUpdateTrigger = {
      source: 'manual_refresh',
      reason: 'data_refresh',
      timestamp: new Date().toISOString(),
      priority: 'high'
    };
    await this.updateWidgetData(trigger);
  }

  /**
   * Public API: Get widget configuration
   */
  getConfiguration(): WidgetConfiguration {
    return { ...this.config };
  }

  /**
   * Public API: Update configuration
   */
  updateConfiguration(updates: Partial<WidgetConfiguration>): void {
    Object.assign(this.config, updates);
    console.log('Widget configuration updated:', updates);
  }

  // Private helper methods

  private async getSessionStatus(
    type: 'morning' | 'midday' | 'evening',
    store: any
  ): Promise<WidgetSessionStatus> {
    const todayCheckIn = store.getTodaysCheckIn?.(type);
    
    if (todayCheckIn) {
      return {
        status: todayCheckIn.skipped ? 'skipped' : 'completed',
        progressPercentage: 100,
        canResume: false,
        estimatedTimeMinutes: 0
      };
    }

    // Check for resumable session
    const hasPartialSession = await store.checkForPartialSession?.(type);
    if (hasPartialSession) {
      const sessionProgress = await store.getSessionProgress?.(type);
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
    try {
      const checkInStore = useCheckInStore.getState();
      const crisisState = (checkInStore as any).crisisMode;
      return crisisState?.isActive || false;
    } catch (error) {
      console.error('Crisis mode check failed:', error);
      return false;
    }
  }

  /**
   * Generate crisis button data with unconditional visibility and variable prominence
   */
  private async generateCrisisButtonData(hasActiveCrisis: boolean): Promise<WidgetCrisisButton> {
    const startTime = performance.now();
    
    try {
      const prominence: WidgetCrisisProminence = hasActiveCrisis ? 'enhanced' : 'standard';
      const style: WidgetCrisisStyle = hasActiveCrisis ? 'urgent' : 'standard';
      const text = hasActiveCrisis ? 'CRISIS SUPPORT NEEDED' : 'Crisis Support';
      
      const crisisButton: WidgetCrisisButton = {
        alwaysVisible: true, // Always true - unconditional crisis access for safety
        prominence,
        text,
        style,
        responseTimeMs: performance.now() - startTime
      };

      return crisisButton;
      
    } catch (error) {
      console.error('Crisis button data generation failed:', error);
      
      // Fail-safe: Return safe default crisis button even on error
      return {
        alwaysVisible: true,
        prominence: 'standard',
        text: 'Crisis Support',
        style: 'standard',
        responseTimeMs: performance.now() - startTime
      };
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
    const checkInType = pathParts[2];
    
    // Type-safe validation
    if (!this.isValidCheckInType(checkInType)) {
      throw new WidgetBridgeError(
        `Invalid check-in type: ${checkInType}`,
        'DEEP_LINK_INVALID',
        { path, checkInType }
      );
    }

    const shouldResume = params.resume === 'true';
    
    console.log('Navigating to check-in:', {
      type: checkInType,
      resume: shouldResume,
      source: 'widget'
    });
    
    // Navigate to check-in flow with enhanced error handling
    try {
      NavigationService.navigateToCheckIn(checkInType, shouldResume);
    } catch (error) {
      throw new WidgetBridgeError(
        `Navigation to check-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NAVIGATION_FAILED',
        { checkInType, shouldResume, originalError: error }
      );
    }
  }

  private async handleCrisisDeepLink(): Promise<void> {
    console.log('Navigating to crisis intervention from widget');
    
    try {
      // Navigate to crisis intervention with high priority
      NavigationService.navigateToCrisis('widget_emergency_access');
    } catch (error) {
      throw new WidgetBridgeError(
        `Crisis navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CRISIS_NAVIGATION_FAILED',
        { originalError: error }
      );
    }
  }
}