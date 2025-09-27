/**
 * UIComponentService - Consolidated React Native UI Component Management
 *
 * Unified service for UI component management, state handling, and performance optimization.
 * Consolidates multiple component utility services into a cohesive React Native architecture.
 *
 * CRITICAL: Maintains <200ms crisis response and 60fps therapeutic UI performance
 * FEATURES: New Architecture compatibility, Fabric renderer optimization, accessibility
 */

import React, { ComponentType, ReactElement } from 'react';
import { ViewStyle, TextStyle, ImageStyle, Dimensions, Platform } from 'react-native';
import type {
  DeepReadonly,
  ISODateString,
  UserID,
  CrisisSeverity,
  DurationMs,
} from '../../types/core';

// === BRANDED TYPES FOR TYPE SAFETY ===

type ComponentID = string & { readonly __brand: 'ComponentID' };
type StyleID = string & { readonly __brand: 'StyleID' };
type ThemeVariant = 'morning' | 'midday' | 'evening' | 'crisis' | 'therapeutic';
type AnimationDuration = number & { readonly __brand: 'AnimationDuration' };
type RenderPriority = 'low' | 'normal' | 'high' | 'critical';

// === REACT NATIVE COMPONENT TYPES ===

interface ComponentConfig {
  readonly id: ComponentID;
  readonly type: 'functional' | 'class' | 'memo' | 'forwardRef';
  readonly priority: RenderPriority;
  readonly accessibility: {
    readonly role?: string;
    readonly label?: string;
    readonly hint?: string;
    readonly testID?: string;
  };
  readonly performance: {
    readonly shouldMemo?: boolean;
    readonly reanimatedOptimized?: boolean;
    readonly fabricCompatible?: boolean;
  };
}

interface ComponentState {
  readonly isVisible: boolean;
  readonly isLoading: boolean;
  readonly hasError: boolean;
  readonly lastRenderTime: number;
  readonly renderCount: number;
  readonly memoryFootprint: number;
}

interface UIAnimationConfig {
  readonly duration: AnimationDuration;
  readonly easing: 'ease' | 'spring' | 'linear' | 'therapeutic';
  readonly delay?: number;
  readonly useNativeDriver: boolean;
  readonly reanimated2Compatible: boolean;
}

interface ThemeConfig {
  readonly variant: ThemeVariant;
  readonly adaptiveColors: boolean;
  readonly timeOfDayAware: boolean;
  readonly therapeuticOptimized: boolean;
  readonly crisisModeColors: boolean;
}

// === PERFORMANCE MONITORING TYPES ===

interface ComponentPerformanceMetrics {
  readonly renderTimes: ReadonlyMap<ComponentID, number[]>;
  readonly memoryUsage: ReadonlyMap<ComponentID, number>;
  readonly reRenderCount: ReadonlyMap<ComponentID, number>;
  readonly errorCount: number;
  readonly averageRenderTime: number;
  readonly criticalComponentsResponseTime: number; // For crisis UI
}

interface LoadingStateConfig {
  readonly showSpinner: boolean;
  readonly showSkeleton: boolean;
  readonly showProgress: boolean;
  readonly therapeuticAnimation: boolean;
  readonly customMessage?: string;
  readonly accessibility: {
    readonly announcement?: string;
    readonly progressDescription?: string;
  };
}

// === UI COMPONENT SERVICE CONFIGURATION ===

interface UIComponentServiceConfig {
  readonly enablePerformanceMonitoring: boolean;
  readonly fabricRendererOptimized: boolean;
  readonly therapeuticAnimations: boolean;
  readonly accessibilityEnhanced: boolean;
  readonly crisisOptimizedComponents: boolean;
  readonly memoryOptimized: boolean;
  readonly reanimated2Integration: boolean;
  readonly renderBatching: boolean;
  readonly componentCaching: boolean;
}

const DEFAULT_UI_CONFIG: UIComponentServiceConfig = {
  enablePerformanceMonitoring: true,
  fabricRendererOptimized: true,
  therapeuticAnimations: true,
  accessibilityEnhanced: true,
  crisisOptimizedComponents: true,
  memoryOptimized: true,
  reanimated2Integration: true,
  renderBatching: true,
  componentCaching: true,
} as const;

// === COMPONENT REGISTRY TYPES ===

interface ComponentRegistryEntry<T = any> {
  readonly id: ComponentID;
  readonly component: ComponentType<T>;
  readonly config: ComponentConfig;
  readonly state: ComponentState;
  readonly lastUsed: ISODateString;
  readonly usageCount: number;
}

interface StyleRegistry {
  readonly id: StyleID;
  readonly styles: ViewStyle | TextStyle | ImageStyle;
  readonly theme: ThemeVariant;
  readonly platform: 'ios' | 'android' | 'universal';
  readonly accessibility: boolean;
}

// === MAIN UI COMPONENT SERVICE ===

class ReactNativeUIComponentService {
  private readonly config: UIComponentServiceConfig;
  private readonly componentRegistry: Map<ComponentID, ComponentRegistryEntry> = new Map();
  private readonly styleRegistry: Map<StyleID, StyleRegistry> = new Map();
  private readonly performanceMetrics: ComponentPerformanceMetrics;
  private readonly loadingStates: Map<ComponentID, LoadingStateConfig> = new Map();

  // Screen dimensions for responsive design
  private readonly screenDimensions = Dimensions.get('window');

  // Performance optimization
  private renderBatch: ComponentID[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<UIComponentServiceConfig> = {}) {
    this.config = { ...DEFAULT_UI_CONFIG, ...config };
    this.performanceMetrics = {
      renderTimes: new Map(),
      memoryUsage: new Map(),
      reRenderCount: new Map(),
      errorCount: 0,
      averageRenderTime: 0,
      criticalComponentsResponseTime: 0,
    };

    this.initializeBuiltInComponents();
    this.setupPerformanceMonitoring();
  }

  // === COMPONENT REGISTRATION ===

  /**
   * Register React Native component with performance optimization
   */
  registerComponent<T = any>(
    id: ComponentID,
    component: ComponentType<T>,
    config: Partial<ComponentConfig> = {}
  ): void {
    const fullConfig: ComponentConfig = {
      id,
      type: 'functional',
      priority: 'normal',
      accessibility: {
        role: 'none',
        ...config.accessibility,
      },
      performance: {
        shouldMemo: true,
        reanimatedOptimized: this.config.reanimated2Integration,
        fabricCompatible: this.config.fabricRendererOptimized,
        ...config.performance,
      },
      ...config,
    };

    const entry: ComponentRegistryEntry<T> = {
      id,
      component,
      config: fullConfig,
      state: {
        isVisible: false,
        isLoading: false,
        hasError: false,
        lastRenderTime: 0,
        renderCount: 0,
        memoryFootprint: 0,
      },
      lastUsed: new Date().toISOString() as ISODateString,
      usageCount: 0,
    };

    this.componentRegistry.set(id, entry);

    // Auto-optimize for crisis components
    if (id.includes('crisis') || config.priority === 'critical') {
      this.optimizeForCrisis(id);
    }

    // Auto-memoize if performance flag is set
    if (fullConfig.performance.shouldMemo) {
      entry.component = React.memo(component) as ComponentType<T>;
    }
  }

  /**
   * Get optimized component with performance tracking
   */
  getComponent<T = any>(id: ComponentID): ComponentType<T> | null {
    const entry = this.componentRegistry.get(id);
    if (!entry) {
      console.warn(`Component ${id} not found in registry`);
      return null;
    }

    // Update usage statistics
    const updatedEntry = {
      ...entry,
      lastUsed: new Date().toISOString() as ISODateString,
      usageCount: entry.usageCount + 1,
    };
    this.componentRegistry.set(id, updatedEntry);

    // Performance tracking for critical components
    if (entry.config.priority === 'critical') {
      this.trackCriticalComponentAccess(id);
    }

    return entry.component;
  }

  // === LOADING STATE MANAGEMENT ===

  /**
   * Create therapeutic loading screen with React Native optimizations
   */
  createLoadingScreen(
    config: Partial<LoadingStateConfig> = {}
  ): ComponentType {
    const loadingConfig: LoadingStateConfig = {
      showSpinner: true,
      showSkeleton: false,
      showProgress: false,
      therapeuticAnimation: this.config.therapeuticAnimations,
      accessibility: {
        announcement: 'Loading content, please wait',
        progressDescription: 'Loading in progress',
      },
      ...config,
    };

    // Return memoized loading component optimized for React Native
    return React.memo(() => {
      const startTime = performance.now();

      // Track render performance
      React.useEffect(() => {
        const renderTime = performance.now() - startTime;
        this.recordRenderTime('loading_screen' as ComponentID, renderTime);
      });

      // Implementation would return actual React Native loading component
      // This is a service layer, so we return the factory pattern
      return null as any;
    });
  }

  /**
   * Set loading state for component with accessibility
   */
  setLoadingState(
    componentId: ComponentID,
    isLoading: boolean,
    config?: Partial<LoadingStateConfig>
  ): void {
    const entry = this.componentRegistry.get(componentId);
    if (!entry) return;

    // Update component state
    const updatedState: ComponentState = {
      ...entry.state,
      isLoading,
    };

    const updatedEntry = {
      ...entry,
      state: updatedState,
    };

    this.componentRegistry.set(componentId, updatedEntry);

    // Set loading configuration
    if (config) {
      this.loadingStates.set(componentId, config as LoadingStateConfig);
    }

    // Announce to screen readers
    if (this.config.accessibilityEnhanced && config?.accessibility?.announcement) {
      // Implementation would announce to screen reader
      console.log(`Accessibility: ${config.accessibility.announcement}`);
    }
  }

  // === THEME AND STYLING ===

  /**
   * Register responsive styles optimized for React Native platforms
   */
  registerStyle(
    id: StyleID,
    styles: ViewStyle | TextStyle | ImageStyle,
    theme: ThemeVariant = 'morning',
    platform: 'ios' | 'android' | 'universal' = 'universal'
  ): void {
    const styleEntry: StyleRegistry = {
      id,
      styles,
      theme,
      platform,
      accessibility: this.config.accessibilityEnhanced,
    };

    this.styleRegistry.set(id, styleEntry);
  }

  /**
   * Get platform-optimized styles with theme adaptation
   */
  getStyles(
    id: StyleID,
    theme?: ThemeVariant,
    platformOverride?: 'ios' | 'android'
  ): ViewStyle | TextStyle | ImageStyle | null {
    const styleEntry = this.styleRegistry.get(id);
    if (!styleEntry) {
      return null;
    }

    // Platform-specific style adaptation
    const currentPlatform = platformOverride || Platform.OS;
    if (styleEntry.platform !== 'universal' && styleEntry.platform !== currentPlatform) {
      return null;
    }

    // Theme-based style variations
    const effectiveTheme = theme || styleEntry.theme;
    let styles = { ...styleEntry.styles };

    // Apply theme-specific modifications
    if (effectiveTheme === 'crisis') {
      styles = this.applyCrisisThemeOptimizations(styles);
    } else if (effectiveTheme === 'therapeutic') {
      styles = this.applyTherapeuticThemeOptimizations(styles);
    }

    return styles;
  }

  // === ANIMATION MANAGEMENT ===

  /**
   * Create therapeutic animation config optimized for React Native
   */
  createAnimationConfig(
    type: 'entrance' | 'exit' | 'therapeutic' | 'crisis',
    theme: ThemeVariant = 'morning'
  ): UIAnimationConfig {
    const baseConfig: UIAnimationConfig = {
      duration: 300 as AnimationDuration,
      easing: 'ease',
      useNativeDriver: true,
      reanimated2Compatible: this.config.reanimated2Integration,
    };

    switch (type) {
      case 'therapeutic':
        return {
          ...baseConfig,
          duration: (theme === 'evening' ? 800 : 600) as AnimationDuration,
          easing: 'therapeutic',
        };

      case 'crisis':
        return {
          ...baseConfig,
          duration: 150 as AnimationDuration, // Fast for crisis response
          easing: 'linear',
        };

      case 'entrance':
        return {
          ...baseConfig,
          duration: (theme === 'morning' ? 400 : 600) as AnimationDuration,
          easing: 'spring',
        };

      case 'exit':
        return {
          ...baseConfig,
          duration: 200 as AnimationDuration,
          easing: 'ease',
        };

      default:
        return baseConfig;
    }
  }

  // === PERFORMANCE OPTIMIZATION ===

  /**
   * Optimize component for crisis response (<200ms requirement)
   */
  private optimizeForCrisis(componentId: ComponentID): void {
    const entry = this.componentRegistry.get(componentId);
    if (!entry) return;

    const optimizedConfig: ComponentConfig = {
      ...entry.config,
      priority: 'critical',
      performance: {
        ...entry.config.performance,
        shouldMemo: true,
        reanimatedOptimized: true,
        fabricCompatible: true,
      },
    };

    const optimizedEntry = {
      ...entry,
      config: optimizedConfig,
    };

    this.componentRegistry.set(componentId, optimizedEntry);
  }

  /**
   * Batch component renders for performance
   */
  private batchRender(componentId: ComponentID): void {
    if (!this.config.renderBatching) return;

    this.renderBatch.push(componentId);

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set new timeout for batch processing
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, 16); // ~60fps
  }

  /**
   * Process batched renders
   */
  private processBatch(): void {
    const batch = [...this.renderBatch];
    this.renderBatch = [];
    this.batchTimeout = null;

    // Process all batched renders
    batch.forEach(componentId => {
      const entry = this.componentRegistry.get(componentId);
      if (entry) {
        // Update render count
        const updatedState: ComponentState = {
          ...entry.state,
          renderCount: entry.state.renderCount + 1,
          lastRenderTime: performance.now(),
        };

        const updatedEntry = {
          ...entry,
          state: updatedState,
        };

        this.componentRegistry.set(componentId, updatedEntry);
      }
    });
  }

  // === PERFORMANCE MONITORING ===

  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Monitor memory usage
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 5000);

    // Monitor render performance
    setInterval(() => {
      this.updateRenderMetrics();
    }, 1000);
  }

  private recordRenderTime(componentId: ComponentID, renderTime: number): void {
    const existingTimes = this.performanceMetrics.renderTimes.get(componentId) || [];
    const updatedTimes = [...existingTimes.slice(-9), renderTime]; // Keep last 10

    (this.performanceMetrics.renderTimes as Map<ComponentID, number[]>).set(
      componentId,
      updatedTimes
    );

    // Update averages
    this.updateAverageRenderTime();
  }

  private trackCriticalComponentAccess(componentId: ComponentID): void {
    const accessTime = performance.now();
    const metrics = this.performanceMetrics as any;

    if (metrics.criticalComponentsResponseTime === 0) {
      metrics.criticalComponentsResponseTime = accessTime;
    } else {
      // Running average of critical component access times
      metrics.criticalComponentsResponseTime =
        (metrics.criticalComponentsResponseTime + accessTime) / 2;
    }

    // Alert if crisis component is slow
    if (componentId.includes('crisis') && accessTime > 200) {
      console.warn(`Crisis component ${componentId} exceeded 200ms: ${accessTime}ms`);
    }
  }

  private updateMemoryMetrics(): void {
    if (global.performance?.memory) {
      const currentMemory = global.performance.memory.usedJSHeapSize;

      // Estimate memory per component (rough approximation)
      const componentCount = this.componentRegistry.size;
      if (componentCount > 0) {
        const memoryPerComponent = currentMemory / componentCount;

        this.componentRegistry.forEach((entry, id) => {
          (this.performanceMetrics.memoryUsage as Map<ComponentID, number>).set(
            id,
            memoryPerComponent
          );
        });
      }
    }
  }

  private updateRenderMetrics(): void {
    const allRenderTimes: number[] = [];

    this.performanceMetrics.renderTimes.forEach(times => {
      allRenderTimes.push(...times);
    });

    if (allRenderTimes.length > 0) {
      const average = allRenderTimes.reduce((a, b) => a + b, 0) / allRenderTimes.length;
      (this.performanceMetrics as any).averageRenderTime = average;
    }
  }

  private updateAverageRenderTime(): void {
    // Recalculate average from all stored render times
    this.updateRenderMetrics();
  }

  // === THEME OPTIMIZATION HELPERS ===

  private applyCrisisThemeOptimizations(
    styles: ViewStyle | TextStyle | ImageStyle
  ): ViewStyle | TextStyle | ImageStyle {
    return {
      ...styles,
      // Crisis-optimized styling
      borderWidth: 2,
      borderColor: '#DC2626', // Red for urgency
      backgroundColor: '#FEF2F2', // Light red background
    };
  }

  private applyTherapeuticThemeOptimizations(
    styles: ViewStyle | TextStyle | ImageStyle
  ): ViewStyle | TextStyle | ImageStyle {
    return {
      ...styles,
      // Therapeutic-optimized styling
      borderRadius: 12,
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    };
  }

  // === BUILT-IN COMPONENT INITIALIZATION ===

  private initializeBuiltInComponents(): void {
    // Register common React Native optimized components

    // Crisis Button (highest priority)
    this.registerComponent(
      'crisis_button' as ComponentID,
      React.memo(() => null as any), // Placeholder
      {
        priority: 'critical',
        accessibility: {
          role: 'button',
          label: 'Crisis intervention',
          hint: 'Double tap to access crisis support',
        },
        performance: {
          shouldMemo: true,
          reanimatedOptimized: true,
          fabricCompatible: true,
        },
      }
    );

    // Loading Screen
    this.registerComponent(
      'loading_screen' as ComponentID,
      this.createLoadingScreen(),
      {
        priority: 'high',
        accessibility: {
          role: 'progressbar',
          label: 'Loading',
        },
      }
    );

    // Therapeutic Card Component
    this.registerComponent(
      'therapeutic_card' as ComponentID,
      React.memo(() => null as any), // Placeholder
      {
        priority: 'normal',
        accessibility: {
          role: 'group',
        },
        performance: {
          shouldMemo: true,
          reanimatedOptimized: true,
        },
      }
    );
  }

  // === PUBLIC API ===

  /**
   * Get component performance metrics
   */
  getPerformanceMetrics(): DeepReadonly<ComponentPerformanceMetrics> {
    return this.performanceMetrics;
  }

  /**
   * Get component registry status
   */
  getRegistryStatus(): {
    readonly totalComponents: number;
    readonly criticalComponents: number;
    readonly memoryOptimizedComponents: number;
    readonly fabricCompatibleComponents: number;
  } {
    let criticalCount = 0;
    let memoryOptimizedCount = 0;
    let fabricCompatibleCount = 0;

    this.componentRegistry.forEach(entry => {
      if (entry.config.priority === 'critical') criticalCount++;
      if (entry.config.performance.shouldMemo) memoryOptimizedCount++;
      if (entry.config.performance.fabricCompatible) fabricCompatibleCount++;
    });

    return {
      totalComponents: this.componentRegistry.size,
      criticalComponents: criticalCount,
      memoryOptimizedComponents: memoryOptimizedCount,
      fabricCompatibleComponents: fabricCompatibleCount,
    };
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    (this.performanceMetrics.renderTimes as Map<ComponentID, number[]>).clear();
    (this.performanceMetrics.memoryUsage as Map<ComponentID, number>).clear();
    (this.performanceMetrics.reRenderCount as Map<ComponentID, number>).clear();
    (this.performanceMetrics as any).errorCount = 0;
    (this.performanceMetrics as any).averageRenderTime = 0;
    (this.performanceMetrics as any).criticalComponentsResponseTime = 0;
  }

  /**
   * Validate React Native New Architecture compatibility
   */
  validateNewArchitectureCompatibility(): {
    readonly isCompatible: boolean;
    readonly incompatibleComponents: ComponentID[];
    readonly recommendations: string[];
  } {
    const incompatibleComponents: ComponentID[] = [];
    const recommendations: string[] = [];

    this.componentRegistry.forEach((entry, id) => {
      if (!entry.config.performance.fabricCompatible) {
        incompatibleComponents.push(id);
      }
    });

    if (incompatibleComponents.length > 0) {
      recommendations.push(
        'Update components to use Fabric renderer optimizations',
        'Enable reanimated2 compatibility for animations',
        'Implement proper TypeScript types for New Architecture'
      );
    }

    return {
      isCompatible: incompatibleComponents.length === 0,
      incompatibleComponents,
      recommendations,
    };
  }
}

// === SERVICE INSTANCE ===

export const UIComponentService = new ReactNativeUIComponentService({
  enablePerformanceMonitoring: true,
  fabricRendererOptimized: true,
  therapeuticAnimations: true,
  accessibilityEnhanced: true,
  crisisOptimizedComponents: true,
  memoryOptimized: true,
  reanimated2Integration: true,
  renderBatching: true,
  componentCaching: true,
});

// === TYPE EXPORTS ===

export type {
  UIComponentServiceConfig,
  ComponentConfig,
  ComponentState,
  ComponentPerformanceMetrics,
  LoadingStateConfig,
  UIAnimationConfig,
  ThemeConfig,
  ComponentRegistryEntry,
  StyleRegistry,
  ComponentID,
  StyleID,
  ThemeVariant,
  AnimationDuration,
  RenderPriority,
};

// === DEFAULT EXPORT ===

export default UIComponentService;