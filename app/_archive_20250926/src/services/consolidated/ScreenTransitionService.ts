/**
 * ScreenTransitionService - React Native Screen Navigation & Transition Management
 *
 * Consolidated service for screen transitions, navigation state management, and therapeutic UX.
 * Optimized for React Native performance, New Architecture compatibility, and crisis response.
 *
 * CRITICAL: <200ms crisis transitions, 60fps therapeutic animations, accessibility compliance
 * FEATURES: Fabric renderer optimization, gesture handling, state preservation, memory management
 */

import { NavigationState, CommonActions, StackActions } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import type {
  DeepReadonly,
  ISODateString,
  DurationMs,
  UserID,
  CrisisSeverity,
} from '../../types/core';
import type {
  RootStackParamList,
  NavigationContext,
  CrisisTriggerInfo,
} from '../../types/navigation';

// === BRANDED TYPES FOR TYPE SAFETY ===

type ScreenID = string & { readonly __brand: 'ScreenID' };
type TransitionID = string & { readonly __brand: 'TransitionID' };
type GestureID = string & { readonly __brand: 'GestureID' };
type TransitionDuration = number & { readonly __brand: 'TransitionDuration' };
type ScreenDepth = number & { readonly __brand: 'ScreenDepth' };

// === SCREEN TRANSITION TYPES ===

interface ScreenTransition {
  readonly id: TransitionID;
  readonly fromScreen: ScreenID;
  readonly toScreen: ScreenID;
  readonly type: 'push' | 'pop' | 'replace' | 'reset' | 'modal' | 'crisis';
  readonly duration: TransitionDuration;
  readonly animation: 'slide' | 'fade' | 'modal' | 'therapeutic' | 'crisis';
  readonly gesture: boolean;
  readonly accessibility: {
    readonly announcement?: string;
    readonly focusOnTransition?: boolean;
    readonly screenReaderNotification?: string;
  };
  readonly therapeutic: {
    readonly mindfulTransition?: boolean;
    readonly breathingSpace?: DurationMs;
    readonly calmingAnimation?: boolean;
  };
}

interface ScreenState {
  readonly id: ScreenID;
  readonly name: string;
  readonly isActive: boolean;
  readonly isVisible: boolean;
  readonly depth: ScreenDepth;
  readonly params: Record<string, any>;
  readonly timestamp: ISODateString;
  readonly loadTime: number;
  readonly renderTime: number;
  readonly memoryUsage: number;
  readonly errorState?: string;
}

interface NavigationStack {
  readonly screens: ReadonlyArray<ScreenState>;
  readonly currentDepth: ScreenDepth;
  readonly maxDepth: number;
  readonly crisisMode: boolean;
  readonly therapeuticMode: boolean;
  readonly lastTransition: TransitionID | null;
}

interface GestureConfig {
  readonly id: GestureID;
  readonly screenId: ScreenID;
  readonly type: 'swipe' | 'pinch' | 'pan' | 'tap' | 'longPress';
  readonly direction?: 'left' | 'right' | 'up' | 'down';
  readonly enabled: boolean;
  readonly therapeutic: boolean;
  readonly crisisOverride: boolean;
  readonly accessibility: {
    readonly alternativeAction?: string;
    readonly gestureDescription?: string;
  };
}

// === PERFORMANCE MONITORING ===

interface TransitionPerformanceMetrics {
  readonly transitionTimes: ReadonlyMap<ScreenID, number[]>;
  readonly crisisTransitionTimes: readonly number[];
  readonly therapeuticTransitionTimes: readonly number[];
  readonly averageTransitionTime: number;
  readonly memoryUsagePerScreen: ReadonlyMap<ScreenID, number>;
  readonly errorCount: number;
  readonly gestureResponseTimes: ReadonlyMap<GestureID, number>;
}

interface ScreenMemoryProfile {
  readonly screenId: ScreenID;
  readonly baseMemory: number;
  readonly peakMemory: number;
  readonly averageMemory: number;
  readonly leakDetected: boolean;
  readonly optimizationLevel: 'low' | 'medium' | 'high' | 'critical';
}

// === SERVICE CONFIGURATION ===

interface ScreenTransitionServiceConfig {
  readonly enablePerformanceMonitoring: boolean;
  readonly therapeuticTransitions: boolean;
  readonly crisisOptimized: boolean;
  readonly accessibilityEnhanced: boolean;
  readonly gestureSupport: boolean;
  readonly memoryOptimized: boolean;
  readonly fabricRendererOptimized: boolean;
  readonly maxStackDepth: number;
  readonly crisisResponseLimit: DurationMs;
  readonly therapeuticPacing: DurationMs;
  readonly statePreservation: boolean;
}

const DEFAULT_TRANSITION_CONFIG: ScreenTransitionServiceConfig = {
  enablePerformanceMonitoring: true,
  therapeuticTransitions: true,
  crisisOptimized: true,
  accessibilityEnhanced: true,
  gestureSupport: true,
  memoryOptimized: true,
  fabricRendererOptimized: true,
  maxStackDepth: 10,
  crisisResponseLimit: 200 as DurationMs,
  therapeuticPacing: 800 as DurationMs,
  statePreservation: true,
} as const;

// === MAIN SCREEN TRANSITION SERVICE ===

class ReactNativeScreenTransitionService {
  private navigationRef: NavigationContainerRef<RootStackParamList> | null = null;
  private readonly config: ScreenTransitionServiceConfig;
  private readonly navigationStack: NavigationStack;
  private readonly performanceMetrics: TransitionPerformanceMetrics;
  private readonly gestureConfigs: Map<GestureID, GestureConfig> = new Map();
  private readonly screenStates: Map<ScreenID, ScreenState> = new Map();
  private readonly memoryProfiles: Map<ScreenID, ScreenMemoryProfile> = new Map();

  // Transition queue for batching
  private transitionQueue: ScreenTransition[] = [];
  private isProcessingQueue = false;

  constructor(config: Partial<ScreenTransitionServiceConfig> = {}) {
    this.config = { ...DEFAULT_TRANSITION_CONFIG, ...config };

    this.navigationStack = {
      screens: [],
      currentDepth: 0 as ScreenDepth,
      maxDepth: this.config.maxStackDepth,
      crisisMode: false,
      therapeuticMode: false,
      lastTransition: null,
    };

    this.performanceMetrics = {
      transitionTimes: new Map(),
      crisisTransitionTimes: [],
      therapeuticTransitionTimes: [],
      averageTransitionTime: 0,
      memoryUsagePerScreen: new Map(),
      errorCount: 0,
      gestureResponseTimes: new Map(),
    };

    this.setupPerformanceMonitoring();
    this.initializeDefaultTransitions();
  }

  // === NAVIGATION REFERENCE MANAGEMENT ===

  /**
   * Set navigation reference with React Native optimization
   */
  setNavigationRef(ref: NavigationContainerRef<RootStackParamList>): void {
    this.navigationRef = ref;
    this.setupNavigationListeners();
  }

  /**
   * Check if navigation system is ready
   */
  isNavigationReady(): boolean {
    return this.navigationRef?.isReady() === true;
  }

  // === CRISIS-OPTIMIZED TRANSITIONS ===

  /**
   * Execute crisis transition with <200ms performance requirement
   * CRITICAL: Must maintain crisis response time for safety
   */
  async executeCrisisTransition(
    toScreen: ScreenID,
    params: {
      readonly crisisInfo: CrisisTriggerInfo;
      readonly severity: CrisisSeverity;
      readonly emergencyMode: boolean;
    }
  ): Promise<boolean> {
    const startTime = performance.now();

    try {
      if (!this.validateTransition()) {
        return false;
      }

      // Create optimized crisis transition
      const crisisTransition: ScreenTransition = {
        id: this.generateTransitionId(),
        fromScreen: this.getCurrentScreenId(),
        toScreen,
        type: 'crisis',
        duration: 150 as TransitionDuration, // Ultra-fast for crisis
        animation: 'crisis',
        gesture: false, // Disable gestures during crisis
        accessibility: {
          announcement: 'Entering crisis support',
          focusOnTransition: true,
          screenReaderNotification: 'Crisis intervention activated',
        },
        therapeutic: {
          mindfulTransition: false, // Speed over therapeutic pacing
          breathingSpace: 0 as DurationMs,
          calmingAnimation: false,
        },
      };

      // Execute immediate transition bypassing queue
      const success = await this.executeTransitionImmediate(crisisTransition, params);

      // Record crisis performance
      const responseTime = performance.now() - startTime;
      this.recordCrisisTransitionTime(responseTime);

      if (responseTime > this.config.crisisResponseLimit) {
        console.warn(`Crisis transition exceeded limit: ${responseTime}ms`);
      }

      // Update crisis mode
      this.setCrisisMode(true);

      return success;
    } catch (error) {
      console.error('Crisis transition failed:', error);
      this.recordError('crisis_transition_failed', String(error));
      return false;
    }
  }

  /**
   * Exit crisis mode with safe transition
   */
  async exitCrisisMode(toScreen: ScreenID = 'home' as ScreenID): Promise<boolean> {
    try {
      const transition: ScreenTransition = {
        id: this.generateTransitionId(),
        fromScreen: this.getCurrentScreenId(),
        toScreen,
        type: 'reset',
        duration: 400 as TransitionDuration,
        animation: 'therapeutic',
        gesture: true,
        accessibility: {
          announcement: 'Returning to main application',
          focusOnTransition: true,
        },
        therapeutic: {
          mindfulTransition: true,
          breathingSpace: 200 as DurationMs,
          calmingAnimation: true,
        },
      };

      const success = await this.executeTransition(transition);

      if (success) {
        this.setCrisisMode(false);
      }

      return success;
    } catch (error) {
      console.error('Exit crisis mode failed:', error);
      return false;
    }
  }

  // === THERAPEUTIC TRANSITIONS ===

  /**
   * Execute therapeutic transition with mindful pacing
   */
  async executeTherapeuticTransition(
    toScreen: ScreenID,
    params: {
      readonly mindfulPacing: boolean;
      readonly breathingSpace: DurationMs;
      readonly calmingAnimation: boolean;
    }
  ): Promise<boolean> {
    const transition: ScreenTransition = {
      id: this.generateTransitionId(),
      fromScreen: this.getCurrentScreenId(),
      toScreen,
      type: 'push',
      duration: this.config.therapeuticPacing as TransitionDuration,
      animation: 'therapeutic',
      gesture: true,
      accessibility: {
        announcement: 'Transitioning to next screen',
        focusOnTransition: true,
      },
      therapeutic: {
        mindfulTransition: params.mindfulPacing,
        breathingSpace: params.breathingSpace,
        calmingAnimation: params.calmingAnimation,
      },
    };

    const success = await this.executeTransition(transition);

    if (success) {
      this.recordTherapeuticTransitionTime(this.config.therapeuticPacing);
    }

    return success;
  }

  /**
   * Execute transition with breathing space for mindfulness
   */
  async executeTransitionWithBreathingSpace(
    toScreen: ScreenID,
    breathingDuration: DurationMs = 500 as DurationMs
  ): Promise<boolean> {
    return new Promise((resolve) => {
      // Add breathing space before transition
      setTimeout(async () => {
        const success = await this.executeTherapeuticTransition(toScreen, {
          mindfulPacing: true,
          breathingSpace: breathingDuration,
          calmingAnimation: true,
        });
        resolve(success);
      }, breathingDuration);
    });
  }

  // === GENERAL TRANSITIONS ===

  /**
   * Execute standard screen transition with performance monitoring
   */
  async executeTransition(transition: ScreenTransition): Promise<boolean> {
    const startTime = performance.now();

    try {
      if (!this.validateTransition()) {
        return false;
      }

      // Add to queue if not crisis
      if (transition.type !== 'crisis') {
        return this.queueTransition(transition);
      }

      // Execute immediately for crisis
      return this.executeTransitionImmediate(transition);
    } catch (error) {
      console.error('Transition failed:', error);
      this.recordError('transition_failed', String(error));
      return false;
    } finally {
      const transitionTime = performance.now() - startTime;
      this.recordTransitionTime(transition.toScreen, transitionTime);
    }
  }

  /**
   * Navigate back with therapeutic consideration
   */
  async navigateBack(
    options: {
      readonly therapeutic: boolean;
      readonly preserveState: boolean;
    } = { therapeutic: true, preserveState: true }
  ): Promise<boolean> {
    if (!this.navigationRef || this.navigationStack.currentDepth <= 1) {
      return false;
    }

    try {
      const currentScreen = this.getCurrentScreenId();
      const previousScreen = this.getPreviousScreenId();

      const backTransition: ScreenTransition = {
        id: this.generateTransitionId(),
        fromScreen: currentScreen,
        toScreen: previousScreen,
        type: 'pop',
        duration: (options.therapeutic ? 600 : 300) as TransitionDuration,
        animation: options.therapeutic ? 'therapeutic' : 'slide',
        gesture: true,
        accessibility: {
          announcement: 'Navigating back',
          focusOnTransition: true,
        },
        therapeutic: {
          mindfulTransition: options.therapeutic,
          breathingSpace: options.therapeutic ? 200 as DurationMs : 0 as DurationMs,
          calmingAnimation: options.therapeutic,
        },
      };

      if (options.preserveState && this.config.statePreservation) {
        await this.preserveScreenState(currentScreen);
      }

      return this.executeTransition(backTransition);
    } catch (error) {
      console.error('Navigate back failed:', error);
      return false;
    }
  }

  // === GESTURE MANAGEMENT ===

  /**
   * Register gesture configuration for screen
   */
  registerGesture(config: GestureConfig): void {
    this.gestureConfigs.set(config.id, config);

    // Crisis override handling
    if (this.navigationStack.crisisMode && !config.crisisOverride) {
      const disabledConfig = { ...config, enabled: false };
      this.gestureConfigs.set(config.id, disabledConfig);
    }
  }

  /**
   * Handle gesture with performance tracking
   */
  async handleGesture(
    gestureId: GestureID,
    gestureData: any
  ): Promise<boolean> {
    const startTime = performance.now();
    const gestureConfig = this.gestureConfigs.get(gestureId);

    if (!gestureConfig || !gestureConfig.enabled) {
      return false;
    }

    try {
      // Process gesture based on type
      let success = false;

      switch (gestureConfig.type) {
        case 'swipe':
          success = await this.handleSwipeGesture(gestureConfig, gestureData);
          break;
        case 'pan':
          success = await this.handlePanGesture(gestureConfig, gestureData);
          break;
        case 'tap':
          success = await this.handleTapGesture(gestureConfig, gestureData);
          break;
        default:
          console.warn(`Unsupported gesture type: ${gestureConfig.type}`);
          return false;
      }

      // Record gesture performance
      const gestureTime = performance.now() - startTime;
      (this.performanceMetrics.gestureResponseTimes as Map<GestureID, number>).set(
        gestureId,
        gestureTime
      );

      return success;
    } catch (error) {
      console.error('Gesture handling failed:', error);
      this.recordError('gesture_failed', String(error));
      return false;
    }
  }

  // === SCREEN STATE MANAGEMENT ===

  /**
   * Update screen state with performance tracking
   */
  updateScreenState(screenId: ScreenID, updates: Partial<ScreenState>): void {
    const existingState = this.screenStates.get(screenId);

    if (!existingState) {
      console.warn(`Screen state not found: ${screenId}`);
      return;
    }

    const updatedState: ScreenState = {
      ...existingState,
      ...updates,
      timestamp: new Date().toISOString() as ISODateString,
    };

    this.screenStates.set(screenId, updatedState);

    // Update memory profile
    this.updateMemoryProfile(screenId);
  }

  /**
   * Preserve screen state for restoration
   */
  private async preserveScreenState(screenId: ScreenID): Promise<void> {
    const screenState = this.screenStates.get(screenId);
    if (!screenState || !this.config.statePreservation) {
      return;
    }

    try {
      // Store state for restoration
      // Implementation would serialize and store state
      console.log(`Preserving state for screen: ${screenId}`);
    } catch (error) {
      console.error('State preservation failed:', error);
    }
  }

  /**
   * Restore previously preserved screen state
   */
  private async restoreScreenState(screenId: ScreenID): Promise<ScreenState | null> {
    try {
      // Implementation would restore serialized state
      console.log(`Restoring state for screen: ${screenId}`);
      return null;
    } catch (error) {
      console.error('State restoration failed:', error);
      return null;
    }
  }

  // === PERFORMANCE MONITORING ===

  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Monitor memory usage per screen
    setInterval(() => {
      this.updateAllMemoryProfiles();
    }, 5000);

    // Monitor transition performance
    setInterval(() => {
      this.updateTransitionMetrics();
    }, 1000);
  }

  private recordTransitionTime(screenId: ScreenID, time: number): void {
    const existingTimes = this.performanceMetrics.transitionTimes.get(screenId) || [];
    const updatedTimes = [...existingTimes.slice(-9), time]; // Keep last 10

    (this.performanceMetrics.transitionTimes as Map<ScreenID, number[]>).set(
      screenId,
      updatedTimes
    );

    this.updateAverageTransitionTime();
  }

  private recordCrisisTransitionTime(time: number): void {
    const metrics = this.performanceMetrics as any;
    metrics.crisisTransitionTimes = [...metrics.crisisTransitionTimes.slice(-9), time];
  }

  private recordTherapeuticTransitionTime(time: number): void {
    const metrics = this.performanceMetrics as any;
    metrics.therapeuticTransitionTimes = [...metrics.therapeuticTransitionTimes.slice(-9), time];
  }

  private updateMemoryProfile(screenId: ScreenID): void {
    if (!global.performance?.memory) return;

    const currentMemory = global.performance.memory.usedJSHeapSize;
    const existingProfile = this.memoryProfiles.get(screenId);

    const updatedProfile: ScreenMemoryProfile = {
      screenId,
      baseMemory: existingProfile?.baseMemory || currentMemory,
      peakMemory: Math.max(existingProfile?.peakMemory || 0, currentMemory),
      averageMemory: existingProfile
        ? (existingProfile.averageMemory + currentMemory) / 2
        : currentMemory,
      leakDetected: existingProfile ?
        currentMemory > existingProfile.peakMemory * 1.2 : false,
      optimizationLevel: this.calculateOptimizationLevel(currentMemory),
    };

    this.memoryProfiles.set(screenId, updatedProfile);
  }

  private calculateOptimizationLevel(memoryUsage: number): 'low' | 'medium' | 'high' | 'critical' {
    const MB = 1024 * 1024;

    if (memoryUsage > 100 * MB) return 'critical';
    if (memoryUsage > 50 * MB) return 'high';
    if (memoryUsage > 25 * MB) return 'medium';
    return 'low';
  }

  private updateAllMemoryProfiles(): void {
    this.screenStates.forEach((_, screenId) => {
      this.updateMemoryProfile(screenId);
    });
  }

  private updateTransitionMetrics(): void {
    const allTimes: number[] = [];

    this.performanceMetrics.transitionTimes.forEach(times => {
      allTimes.push(...times);
    });

    if (allTimes.length > 0) {
      const average = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
      (this.performanceMetrics as any).averageTransitionTime = average;
    }
  }

  private updateAverageTransitionTime(): void {
    this.updateTransitionMetrics();
  }

  // === HELPER METHODS ===

  private setupNavigationListeners(): void {
    if (!this.navigationRef) return;

    // Listen to state changes for performance tracking
    this.navigationRef.addListener('state', (e) => {
      this.handleNavigationStateChange(e.data.state);
    });
  }

  private handleNavigationStateChange(state: NavigationState): void {
    // Update internal navigation stack based on React Navigation state
    const currentRoute = state.routes[state.index];
    const screenId = currentRoute.name as ScreenID;

    this.updateScreenState(screenId, {
      isActive: true,
      params: currentRoute.params || {},
      depth: state.routes.length as ScreenDepth,
    });

    // Update navigation stack
    (this.navigationStack as any).currentDepth = state.routes.length as ScreenDepth;
    (this.navigationStack as any).lastTransition = this.generateTransitionId();
  }

  private validateTransition(): boolean {
    if (!this.navigationRef || !this.isNavigationReady()) {
      this.recordError('navigation_not_ready', 'Navigation system not ready');
      return false;
    }

    if (this.navigationStack.currentDepth >= this.navigationStack.maxDepth) {
      this.recordError('max_depth_exceeded', 'Maximum navigation depth exceeded');
      return false;
    }

    return true;
  }

  private async queueTransition(transition: ScreenTransition): Promise<boolean> {
    this.transitionQueue.push(transition);

    if (!this.isProcessingQueue) {
      this.processTransitionQueue();
    }

    return true;
  }

  private async processTransitionQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.transitionQueue.length > 0) {
      const transition = this.transitionQueue.shift();
      if (transition) {
        await this.executeTransitionImmediate(transition);

        // Add therapeutic spacing if enabled
        if (transition.therapeutic.mindfulTransition && transition.therapeutic.breathingSpace) {
          await new Promise(resolve =>
            setTimeout(resolve, transition.therapeutic.breathingSpace)
          );
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async executeTransitionImmediate(
    transition: ScreenTransition,
    params?: any
  ): Promise<boolean> {
    if (!this.navigationRef) return false;

    try {
      // Announce to screen readers
      if (this.config.accessibilityEnhanced && transition.accessibility.announcement) {
        // Implementation would announce to accessibility services
        console.log(`Accessibility: ${transition.accessibility.announcement}`);
      }

      // Execute navigation action based on transition type
      switch (transition.type) {
        case 'push':
          this.navigationRef.dispatch(
            CommonActions.navigate({
              name: transition.toScreen,
              params: params || {},
            })
          );
          break;

        case 'pop':
          this.navigationRef.dispatch(CommonActions.goBack());
          break;

        case 'replace':
          this.navigationRef.dispatch(
            StackActions.replace(transition.toScreen, params || {})
          );
          break;

        case 'reset':
        case 'crisis':
          this.navigationRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: transition.toScreen,
                  params: params || {},
                },
              ],
            })
          );
          break;

        default:
          console.warn(`Unsupported transition type: ${transition.type}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Immediate transition execution failed:', error);
      this.recordError('transition_execution_failed', String(error));
      return false;
    }
  }

  // === GESTURE HANDLERS ===

  private async handleSwipeGesture(
    config: GestureConfig,
    gestureData: any
  ): Promise<boolean> {
    if (config.direction === 'right') {
      // Swipe right typically means go back
      return this.navigateBack({ therapeutic: config.therapeutic, preserveState: true });
    }

    return false;
  }

  private async handlePanGesture(
    config: GestureConfig,
    gestureData: any
  ): Promise<boolean> {
    // Implementation for pan gesture handling
    return false;
  }

  private async handleTapGesture(
    config: GestureConfig,
    gestureData: any
  ): Promise<boolean> {
    // Implementation for tap gesture handling
    return false;
  }

  // === CRISIS MODE MANAGEMENT ===

  private setCrisisMode(enabled: boolean): void {
    (this.navigationStack as any).crisisMode = enabled;

    // Update gesture configurations for crisis mode
    this.gestureConfigs.forEach((config, id) => {
      if (!config.crisisOverride) {
        const updatedConfig = { ...config, enabled: !enabled };
        this.gestureConfigs.set(id, updatedConfig);
      }
    });
  }

  // === UTILITY METHODS ===

  private getCurrentScreenId(): ScreenID {
    const currentRoute = this.navigationRef?.getCurrentRoute();
    return (currentRoute?.name || 'unknown') as ScreenID;
  }

  private getPreviousScreenId(): ScreenID {
    const state = this.navigationRef?.getState();
    if (state && state.routes.length > 1) {
      const previousRoute = state.routes[state.routes.length - 2];
      return previousRoute.name as ScreenID;
    }
    return 'home' as ScreenID;
  }

  private generateTransitionId(): TransitionID {
    return `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as TransitionID;
  }

  private recordError(type: string, message: string): void {
    (this.performanceMetrics as any).errorCount++;
    console.error(`ScreenTransition Error [${type}]: ${message}`);
  }

  private initializeDefaultTransitions(): void {
    // Initialize common gesture configurations
    this.registerGesture({
      id: 'swipe_back' as GestureID,
      screenId: 'any' as ScreenID,
      type: 'swipe',
      direction: 'right',
      enabled: true,
      therapeutic: true,
      crisisOverride: false,
      accessibility: {
        alternativeAction: 'Use back button',
        gestureDescription: 'Swipe right to go back',
      },
    });
  }

  // === PUBLIC API ===

  /**
   * Get current navigation stack information
   */
  getNavigationStack(): DeepReadonly<NavigationStack> {
    return this.navigationStack;
  }

  /**
   * Get transition performance metrics
   */
  getPerformanceMetrics(): DeepReadonly<TransitionPerformanceMetrics> {
    return this.performanceMetrics;
  }

  /**
   * Get memory profiles for all screens
   */
  getMemoryProfiles(): DeepReadonly<Map<ScreenID, ScreenMemoryProfile>> {
    return this.memoryProfiles;
  }

  /**
   * Clear all metrics and reset service state
   */
  clearMetrics(): void {
    (this.performanceMetrics.transitionTimes as Map<ScreenID, number[]>).clear();
    (this.performanceMetrics as any).crisisTransitionTimes = [];
    (this.performanceMetrics as any).therapeuticTransitionTimes = [];
    (this.performanceMetrics as any).averageTransitionTime = 0;
    (this.performanceMetrics.memoryUsagePerScreen as Map<ScreenID, number>).clear();
    (this.performanceMetrics as any).errorCount = 0;
    (this.performanceMetrics.gestureResponseTimes as Map<GestureID, number>).clear();
  }

  /**
   * Validate React Native New Architecture compatibility
   */
  validateNewArchitectureCompatibility(): {
    readonly isCompatible: boolean;
    readonly issues: string[];
    readonly recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!this.config.fabricRendererOptimized) {
      issues.push('Fabric renderer optimizations not enabled');
      recommendations.push('Enable Fabric renderer optimizations for better performance');
    }

    if (!this.config.gestureSupport) {
      recommendations.push('Enable gesture support for better user experience');
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// === SERVICE INSTANCE ===

export const ScreenTransitionService = new ReactNativeScreenTransitionService({
  enablePerformanceMonitoring: true,
  therapeuticTransitions: true,
  crisisOptimized: true,
  accessibilityEnhanced: true,
  gestureSupport: true,
  memoryOptimized: true,
  fabricRendererOptimized: true,
  maxStackDepth: 10,
  crisisResponseLimit: 200 as DurationMs,
  therapeuticPacing: 800 as DurationMs,
  statePreservation: true,
});

// === TYPE EXPORTS ===

export type {
  ScreenTransitionServiceConfig,
  ScreenTransition,
  ScreenState,
  NavigationStack,
  GestureConfig,
  TransitionPerformanceMetrics,
  ScreenMemoryProfile,
  ScreenID,
  TransitionID,
  GestureID,
  TransitionDuration,
  ScreenDepth,
};

// === DEFAULT EXPORT ===

export default ScreenTransitionService;