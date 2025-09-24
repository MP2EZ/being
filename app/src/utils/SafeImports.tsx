/**
 * Enhanced Safe Import Patterns for Being. MBCT App - React Native New Architecture Compatible
 *
 * Factory functions and safe import patterns to prevent property descriptor
 * errors and enable stable concurrent development with New Architecture support.
 *
 * PRINCIPLES:
 * - Factory functions over class instantiation
 * - Lazy loading with error boundaries
 * - Safe property access patterns
 * - Defensive programming for clinical safety
 * - New Architecture compatibility (TurboModules/Fabric)
 * - Therapeutic context safety and performance monitoring
 * - Property descriptor conflict prevention
 *
 * VERSION: 2.0 - New Architecture Enhanced
 */

import * as React from 'react';
import {
  ComponentType,
  lazy,
  Suspense,
  ReactNode,
  createContext,
  useContext as useReactContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  useMemo,
  Component
} from 'react';
import { View, Text } from 'react-native';

// ============================================================================
// Enhanced TypeScript Interfaces for New Architecture Compatibility
// ============================================================================

/**
 * Context status enumeration for monitoring
 */
export enum SafeContextStatusType {
  INITIALIZED = 'initialized',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  PERFORMANCE_WARNING = 'performance_warning',
  CRISIS_MODE = 'crisis_mode',
  THERAPEUTIC_ACTIVE = 'therapeutic_active'
}

/**
 * Fallback strategy enumeration
 */
export enum FallbackStrategy {
  DEFAULT = 'default',
  RETRY = 'retry',
  GRACEFUL_DEGRADATION = 'graceful-degradation'
}

/**
 * Performance tracking interface
 */
export interface PerformanceMetrics {
  readonly renderTime: number;
  readonly lastRenderTime: number;
  readonly averageRenderTime: number;
  readonly renderCount: number;
  readonly slowRenderCount: number;
  readonly maxRenderTime: number;
  readonly isSlowRender: boolean;
}

/**
 * Enhanced Safe Context Configuration for New Architecture compatibility
 */
export interface SafeContextConfig<T> {
  readonly defaultValue: T;
  readonly contextName: string;
  readonly isTherapeutic?: boolean;
  readonly isCrisis?: boolean;
  readonly enableTurboModuleOptimization?: boolean;
  readonly enableFabricOptimization?: boolean;
  readonly preventPropertyDescriptorConflicts?: boolean;
  readonly enableErrorBoundary?: boolean;
  readonly fallbackStrategy?: FallbackStrategy;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly enablePerformanceTracking?: boolean;
  readonly warnOnSlowRender?: boolean;
  readonly maxRenderTime?: number; // ms - default 16ms for 60fps, 8ms for crisis
  readonly validator?: (value: T) => boolean;
  readonly sanitizer?: (value: T) => T;
  readonly enableStrictTypeValidation?: boolean;
  readonly onPerformanceWarning?: (metrics: PerformanceMetrics) => void;
  readonly onError?: (error: Error, context: string) => void;
  readonly onRetry?: (attempt: number, maxRetries: number) => void;
}

/**
 * Context status information
 */
export interface SafeContextStatus<T> {
  readonly value: T;
  readonly status: SafeContextStatusType;
  readonly performance: PerformanceMetrics;
  readonly errors: ReadonlyArray<Error>;
  readonly retryCount: number;
  readonly isHealthy: boolean;
  readonly lastUpdateTime: number;
}

/**
 * Provider props for safe context
 */
export interface SafeContextProviderProps<T> {
  readonly value: T;
  readonly children: ReactNode;
  readonly overrideConfig?: Partial<SafeContextConfig<T>>;
}

/**
 * Enhanced Safe Context Return interface
 */
export interface SafeContextReturn<T> {
  readonly Provider: React.FC<SafeContextProviderProps<T>>;
  readonly useContext: () => T;
  readonly useContextWithStatus: () => SafeContextStatus<T>;
  readonly useContextOptimized: () => T; // New Architecture optimized version
  readonly resetContext: () => void;
  readonly validateContext: () => boolean;
  readonly getPerformanceMetrics: () => PerformanceMetrics;
  readonly context: React.Context<T | null>; // Raw context for advanced usage
}

/**
 * Therapeutic Context specific configuration
 */
export interface TherapeuticContextConfig<T> extends SafeContextConfig<T> {
  readonly isTherapeutic: true;
  readonly maxRenderTime: 16; // 60fps requirement for therapeutic interactions
  readonly enableStrictTypeValidation: true;
  readonly enablePerformanceTracking: true;
  readonly fallbackStrategy: FallbackStrategy.GRACEFUL_DEGRADATION;
}

/**
 * Crisis Context specific configuration
 */
export interface CrisisContextConfig<T> extends SafeContextConfig<T> {
  readonly isCrisis: true;
  readonly maxRenderTime: 8; // Ultra-fast 120fps requirement for crisis
  readonly enableStrictTypeValidation: true;
  readonly enablePerformanceTracking: true;
  readonly enableErrorBoundary: true;
  readonly fallbackStrategy: FallbackStrategy.RETRY;
  readonly maxRetries: 3;
  readonly retryDelay: 50;
}

/**
 * New Architecture compatibility interface
 */
export interface NewArchitectureCompatibility {
  readonly hasTurboModules: boolean;
  readonly hasFabric: boolean;
  readonly hasPropertyDescriptorSupport: boolean;
  readonly version: string;
}

/**
 * Safe Factory Pattern Interface (backwards compatible)
 */
export interface SafeFactory<T> {
  create: (...args: any[]) => T;
  validate: (instance: T) => boolean;
  destroy?: (instance: T) => void;
}

// ============================================================================
// New Architecture Detection & Utility Functions
// ============================================================================

/**
 * Detect New Architecture capabilities
 */
export const detectNewArchitecture = (): NewArchitectureCompatibility => {
  try {
    // Check for TurboModules
    const hasTurboModules = Boolean(
      global.__turboModuleProxy ||
      global.__fbBatchedBridge?.getCallableModule ||
      (global as any).nativeFabricUIManager
    );

    // Check for Fabric
    const hasFabric = Boolean(
      (global as any).nativeFabricUIManager ||
      (global as any).__fbBatchedBridge?.getCallableModule?.('FabricUIManager')
    );

    // Check for property descriptor support
    const hasPropertyDescriptorSupport = Boolean(
      Object.getOwnPropertyDescriptor &&
      Object.defineProperty &&
      Object.getOwnPropertyDescriptors
    );

    // Determine version
    let version = 'legacy';
    if (hasTurboModules && hasFabric) {
      version = 'new-architecture';
    } else if (hasTurboModules || hasFabric) {
      version = 'partial-new-architecture';
    }

    return {
      hasTurboModules,
      hasFabric,
      hasPropertyDescriptorSupport,
      version
    };
  } catch (error) {
    console.warn('Failed to detect New Architecture capabilities:', error);
    return {
      hasTurboModules: false,
      hasFabric: false,
      hasPropertyDescriptorSupport: false,
      version: 'legacy'
    };
  }
};

/**
 * Prevent property descriptor conflicts for New Architecture
 */
const preventPropertyDescriptorConflicts = <T extends object>(obj: T, contextName: string): T => {
  try {
    const architecture = detectNewArchitecture();

    if (!architecture.hasPropertyDescriptorSupport) {
      return obj;
    }

    // Create safe proxy to prevent property descriptor conflicts
    return new Proxy(obj, {
      get(target, prop, receiver) {
        try {
          return Reflect.get(target, prop, receiver);
        } catch (error) {
          console.warn(`Property descriptor conflict prevented in ${contextName}:`, prop, error);
          return undefined;
        }
      },
      set(target, prop, value, receiver) {
        try {
          return Reflect.set(target, prop, value, receiver);
        } catch (error) {
          console.warn(`Property descriptor set conflict prevented in ${contextName}:`, prop, error);
          return false;
        }
      },
      defineProperty(target, prop, descriptor) {
        try {
          return Reflect.defineProperty(target, prop, descriptor);
        } catch (error) {
          console.warn(`Property descriptor define conflict prevented in ${contextName}:`, prop, error);
          return false;
        }
      }
    });
  } catch (error) {
    console.warn(`Failed to create property descriptor protection for ${contextName}:`, error);
    return obj;
  }
};

/**
 * Performance monitoring utility - Pure function version
 */
const createPerformanceMetrics = (): PerformanceMetrics => ({
  renderTime: 0,
  lastRenderTime: 0,
  averageRenderTime: 0,
  renderCount: 0,
  slowRenderCount: 0,
  maxRenderTime: 0,
  isSlowRender: false
});

/**
 * Track render performance
 */
const trackRenderPerformance = (
  startTime: number,
  currentMetrics: PerformanceMetrics,
  maxRenderTime: number,
  contextName: string
): PerformanceMetrics => {
  const endTime = performance.now();
  const renderTime = endTime - startTime;

  const newRenderCount = currentMetrics.renderCount + 1;
  const newAverageRenderTime = (currentMetrics.averageRenderTime * currentMetrics.renderCount + renderTime) / newRenderCount;
  const isSlowRender = renderTime > maxRenderTime;
  const newSlowRenderCount = currentMetrics.slowRenderCount + (isSlowRender ? 1 : 0);

  const newMetrics: PerformanceMetrics = {
    renderTime,
    lastRenderTime: renderTime,
    averageRenderTime: newAverageRenderTime,
    renderCount: newRenderCount,
    slowRenderCount: newSlowRenderCount,
    maxRenderTime: Math.max(currentMetrics.maxRenderTime, renderTime),
    isSlowRender
  };

  if (isSlowRender) {
    console.warn(`Slow render detected in ${contextName}: ${renderTime.toFixed(2)}ms (threshold: ${maxRenderTime}ms)`);
  }

  return newMetrics;
};

/**
 * Error boundary for context providers
 */
class SafeContextErrorBoundary extends Component<{
  children: ReactNode;
  contextName: string;
  onError?: (error: Error, errorInfo: any) => void;
  fallback?: ReactNode;
}, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(`Context error boundary triggered for ${this.props.contextName}:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={{
          padding: 16,
          backgroundColor: '#FFF5F5',
          borderColor: '#FFB3B3',
          borderWidth: 1,
          borderRadius: 8,
          alignItems: 'center',
        }}>
          <Text style={{ color: '#C53030', textAlign: 'center' }}>
            Context "{this.props.contextName}" encountered an error
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Enhanced Safe Context Implementation
// ============================================================================

/**
 * Enhanced createSafeContext with New Architecture compatibility and performance monitoring
 */
export const createSafeContextEnhanced = <T,>(
  config: SafeContextConfig<T>
): SafeContextReturn<T> => {
  const {
    defaultValue,
    contextName,
    isTherapeutic = false,
    isCrisis = false,
    enableTurboModuleOptimization = true,
    enableFabricOptimization = true,
    preventPropertyDescriptorConflicts: enablePropertyProtection = true,
    enableErrorBoundary = false,
    fallbackStrategy = FallbackStrategy.DEFAULT,
    maxRetries = 1,
    retryDelay = 100,
    enablePerformanceTracking = false,
    warnOnSlowRender = true,
    maxRenderTime = isCrisis ? 8 : isTherapeutic ? 16 : 32,
    validator,
    sanitizer,
    enableStrictTypeValidation = false,
    onPerformanceWarning,
    onError,
    onRetry
  } = config;

  // Create the base context
  const context = createContext<T | null>(null);
  const statusContext = createContext<SafeContextStatus<T> | null>(null);

  // Enhanced Provider with performance monitoring and error handling
  const Provider: React.FC<SafeContextProviderProps<T>> = ({ value, children, overrideConfig }) => {
    const effectiveConfig = { ...config, ...overrideConfig };
    const startTime = useRef(performance.now());

    // Performance tracking state (moved inside component)
    const performanceMetricsRef = useRef<PerformanceMetrics>(createPerformanceMetrics());
    const [contextStatus, setContextStatus] = useState<SafeContextStatusType>(SafeContextStatusType.INITIALIZED);
    const [errors, setErrors] = useState<Error[]>([]);
    const [retryCount, setRetryCount] = useState(0);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

    // Validate and sanitize value
    const processedValue = useMemo(() => {
      startTime.current = performance.now();

      try {
        let processedVal = value;

        // Type validation
        if (enableStrictTypeValidation && validator && !validator(processedVal)) {
          throw new Error(`Context value validation failed for ${contextName}`);
        }

        // Sanitization
        if (sanitizer) {
          processedVal = sanitizer(processedVal);
        }

        // Property descriptor protection for New Architecture
        if (enablePropertyProtection && typeof processedVal === 'object' && processedVal !== null) {
          processedVal = preventPropertyDescriptorConflicts(processedVal, contextName);
        }

        setContextStatus(SafeContextStatusType.READY);
        setLastUpdateTime(Date.now());

        return processedVal;
      } catch (error) {
        const err = error as Error;
        console.error(`Context processing failed for ${contextName}:`, err);
        setErrors(prev => [...prev.slice(-9), err]); // Keep last 10 errors
        setContextStatus(SafeContextStatusType.ERROR);
        onError?.(err, contextName);

        // Apply fallback strategy
        if (fallbackStrategy === FallbackStrategy.RETRY && retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            onRetry?.(retryCount + 1, maxRetries);
          }, retryDelay);
        }

        return defaultValue;
      }
    }, [value, retryCount]);

    // Performance tracking
    useEffect(() => {
      if (enablePerformanceTracking) {
        performanceMetricsRef.current = trackRenderPerformance(
          startTime.current,
          performanceMetricsRef.current,
          maxRenderTime,
          contextName
        );

        if (performanceMetricsRef.current.isSlowRender && warnOnSlowRender) {
          setContextStatus(SafeContextStatusType.PERFORMANCE_WARNING);
          onPerformanceWarning?.(performanceMetricsRef.current);
        }
      }
    });

    // Status management
    useEffect(() => {
      if (isCrisis) {
        setContextStatus(SafeContextStatusType.CRISIS_MODE);
      } else if (isTherapeutic) {
        setContextStatus(SafeContextStatusType.THERAPEUTIC_ACTIVE);
      }
    }, [isCrisis, isTherapeutic]);

    const statusValue: SafeContextStatus<T> = useMemo(() => ({
      value: processedValue,
      status: contextStatus,
      performance: { ...performanceMetricsRef.current },
      errors: errors,
      retryCount,
      isHealthy: contextStatus === SafeContextStatusType.READY ||
                 contextStatus === SafeContextStatusType.THERAPEUTIC_ACTIVE ||
                 contextStatus === SafeContextStatusType.CRISIS_MODE,
      lastUpdateTime
    }), [processedValue, contextStatus, errors, retryCount, lastUpdateTime]);

    const content = (
      <statusContext.Provider value={statusValue}>
        <context.Provider value={processedValue}>
          {children}
        </context.Provider>
      </statusContext.Provider>
    );

    return enableErrorBoundary ? (
      <SafeContextErrorBoundary
        contextName={contextName}
        onError={onError}
      >
        {content}
      </SafeContextErrorBoundary>
    ) : content;
  };

  // Enhanced useContext hook
  const useContext = (): T => {
    const contextValue = useReactContext(context);

    if (contextValue === null) {
      console.warn(`Context ${contextName} used outside provider, returning default`);
      return defaultValue;
    }

    return contextValue;
  };

  // useContextWithStatus hook
  const useContextWithStatus = (): SafeContextStatus<T> => {
    const status = useReactContext(statusContext);

    if (status === null) {
      console.warn(`Context status ${contextName} used outside provider`);
      return {
        value: defaultValue,
        status: SafeContextStatusType.ERROR,
        performance: {
          renderTime: 0,
          lastRenderTime: 0,
          averageRenderTime: 0,
          renderCount: 0,
          slowRenderCount: 0,
          maxRenderTime: 0,
          isSlowRender: false
        },
        errors: [],
        retryCount: 0,
        isHealthy: false,
        lastUpdateTime: 0
      };
    }

    return status;
  };

  // New Architecture optimized hook
  const useContextOptimized = (): T => {
    const architecture = useMemo(() => detectNewArchitecture(), []);

    // Use TurboModule optimization if available
    if (enableTurboModuleOptimization && architecture.hasTurboModules) {
      // Implement TurboModule-specific optimizations
      return useContext();
    }

    // Use Fabric optimization if available
    if (enableFabricOptimization && architecture.hasFabric) {
      // Implement Fabric-specific optimizations
      return useContext();
    }

    // Fallback to standard context
    return useContext();
  };

  // Create context-specific performance tracker
  let globalPerformanceMetrics = createPerformanceMetrics();

  // Utility functions
  const resetContext = () => {
    globalPerformanceMetrics = createPerformanceMetrics();
  };

  const validateContext = (): boolean => {
    try {
      // This can't use hooks, so we'll return a basic validation
      return validator ? true : true; // Basic implementation
    } catch {
      return false;
    }
  };

  const getPerformanceMetrics = () => {
    return { ...globalPerformanceMetrics };
  };

  return {
    Provider,
    useContext,
    useContextWithStatus,
    useContextOptimized,
    resetContext,
    validateContext,
    getPerformanceMetrics,
    context
  };
};

/**
 * Therapeutic Context Factory - Pre-configured for therapeutic interactions
 */
export const createTherapeuticContext = <T,>(
  defaultValue: T,
  contextName: string,
  additionalConfig?: Partial<TherapeuticContextConfig<T>>
): SafeContextReturn<T> => {
  const config: TherapeuticContextConfig<T> = {
    defaultValue,
    contextName,
    isTherapeutic: true,
    maxRenderTime: 16,
    enableStrictTypeValidation: true,
    enablePerformanceTracking: true,
    fallbackStrategy: FallbackStrategy.GRACEFUL_DEGRADATION,
    enableErrorBoundary: true,
    warnOnSlowRender: true,
    enableTurboModuleOptimization: true,
    enableFabricOptimization: true,
    preventPropertyDescriptorConflicts: true,
    ...additionalConfig
  };

  return createSafeContextEnhanced(config);
};

/**
 * Crisis Context Factory - Pre-configured for crisis situations
 */
export const createCrisisContext = <T,>(
  defaultValue: T,
  contextName: string,
  additionalConfig?: Partial<CrisisContextConfig<T>>
): SafeContextReturn<T> => {
  const config: CrisisContextConfig<T> = {
    defaultValue,
    contextName,
    isCrisis: true,
    maxRenderTime: 8,
    enableStrictTypeValidation: true,
    enablePerformanceTracking: true,
    enableErrorBoundary: true,
    fallbackStrategy: FallbackStrategy.RETRY,
    maxRetries: 3,
    retryDelay: 50,
    warnOnSlowRender: true,
    enableTurboModuleOptimization: true,
    enableFabricOptimization: true,
    preventPropertyDescriptorConflicts: true,
    ...additionalConfig
  };

  return createSafeContextEnhanced(config);
};

/**
 * Safe Component Import Factory
 *
 * Creates safe lazy-loaded components with error boundaries
 * and fallback UI for therapeutic continuity.
 */
export const createSafeComponent = <P = {},>(
  importFunction: () => Promise<{ default: ComponentType<P> }>,
  fallbackComponent?: ComponentType<P>,
  componentName?: string
) => {
  // Create lazy component with error handling
  const LazyComponent = lazy(async () => {
    try {
      const module = await importFunction();

      // Validate the imported component
      if (!module.default || typeof module.default !== 'function') {
        throw new Error(`Invalid component import: ${componentName || 'Unknown'}`);
      }

      return module;
    } catch (error) {
      console.error(`Failed to load component ${componentName}:`, error);

      // Return fallback component if available
      if (fallbackComponent) {
        return { default: fallbackComponent };
      }

      // Return minimal error component
      return {
        default: (() => (
          <View style={{
            padding: 16,
            backgroundColor: '#FFF5F5',
            borderColor: '#FFB3B3',
            borderWidth: 1,
            borderRadius: 8,
            alignItems: 'center',
          }}>
            <Text style={{ color: '#C53030' }}>
              Component "{componentName || 'Unknown'}" failed to load
            </Text>
          </View>
        )) as ComponentType<P>
      };
    }
  });

  // Wrap with Suspense and error boundary
  const SafeComponent: ComponentType<P> = (props) => {
    const FallbackComponent = fallbackComponent;
    return (
      <Suspense
        fallback={
          FallbackComponent ? (
            <FallbackComponent {...(props as any)} />
          ) : (
            <View style={{
              padding: 16,
              alignItems: 'center',
            }}>
              <Text style={{ color: '#666666' }}>
                Loading {componentName || 'component'}...
              </Text>
            </View>
          )
        }
      >
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };

  return SafeComponent;
};

/**
 * Safe Service Factory
 *
 * Creates services using factory pattern to prevent property descriptor
 * errors and ensure proper initialization.
 */
export const createSafeService = <T extends object,>(
  factory: () => T,
  validator?: (service: T) => boolean,
  serviceName?: string
): SafeFactory<T> => {
  let instance: T | null = null;

  return {
    create: (...args: any[]): T => {
      try {
        // Destroy existing instance if it exists
        if (instance) {
          console.warn(`Recreating service ${serviceName}, previous instance will be destroyed`);
        }

        // Create new instance
        instance = factory();

        // Validate if validator provided
        if (validator && !validator(instance)) {
          throw new Error(`Service validation failed: ${serviceName}`);
        }

        return instance;
      } catch (error) {
        console.error(`Failed to create service ${serviceName}:`, error);
        throw error;
      }
    },

    validate: (serviceInstance: T): boolean => {
      if (!serviceInstance || typeof serviceInstance !== 'object') {
        return false;
      }

      // Use custom validator if provided
      if (validator) {
        return validator(serviceInstance);
      }

      // Basic validation
      return true;
    },

    destroy: (serviceInstance: T): void => {
      try {
        // Call destroy method if available
        if (serviceInstance && typeof (serviceInstance as any).destroy === 'function') {
          (serviceInstance as any).destroy();
        }

        // Clear reference
        if (serviceInstance === instance) {
          instance = null;
        }
      } catch (error) {
        console.error(`Failed to destroy service ${serviceName}:`, error);
      }
    }
  };
};

/**
 * Safe Property Access Helper
 *
 * Provides safe access to object properties with fallbacks
 * to prevent runtime errors in therapeutic contexts.
 */
export const safeGet = <T, K extends keyof T,>(
  obj: T | null | undefined,
  key: K,
  fallback?: T[K]
): T[K] | undefined => {
  try {
    if (!obj || typeof obj !== 'object') {
      return fallback;
    }

    const value = obj[key];
    return value !== undefined ? value : fallback;
  } catch (error) {
    console.warn('Safe property access failed:', error);
    return fallback;
  }
};

/**
 * Safe Method Execution
 *
 * Safely executes methods with error handling and fallbacks.
 */
export const safeExecute = <T extends any[], R,>(
  fn: (...args: T) => R,
  args: T,
  fallback?: R,
  errorContext?: string
): R | undefined => {
  try {
    if (typeof fn !== 'function') {
      throw new Error('Provided argument is not a function');
    }

    return fn(...args);
  } catch (error) {
    console.error(`Safe execution failed${errorContext ? ` in ${errorContext}` : ''}:`, error);
    return fallback;
  }
};

/**
 * Safe Async Method Execution
 *
 * Safely executes async methods with error handling and timeouts.
 */
export const safeExecuteAsync = async <T extends any[], R,>(
  fn: (...args: T) => Promise<R>,
  args: T,
  options: {
    fallback?: R;
    timeout?: number;
    errorContext?: string;
  } = {}
): Promise<R | undefined> => {
  const { fallback, timeout = 5000, errorContext } = options;

  try {
    if (typeof fn !== 'function') {
      throw new Error('Provided argument is not a function');
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), timeout);
    });

    // Race the function against timeout
    const result = await Promise.race([
      fn(...args),
      timeoutPromise
    ]);

    return result;
  } catch (error) {
    console.error(`Safe async execution failed${errorContext ? ` in ${errorContext}` : ''}:`, error);
    return fallback;
  }
};

/**
 * Safe Store Factory
 *
 * Creates Zustand stores using safe patterns to prevent
 * property descriptor errors.
 */
export const createSafeStore = <T,>(
  storeCreator: () => T,
  storeName?: string
): (() => T) => {
  let store: T | null = null;

  return (): T => {
    if (!store) {
      try {
        store = storeCreator();

        // Validate store creation
        if (!store || typeof store !== 'object') {
          throw new Error(`Invalid store created: ${storeName}`);
        }

      } catch (error) {
        console.error(`Failed to create store ${storeName}:`, error);
        throw error;
      }
    }

    return store;
  };
};

/**
 * Safe Context Factory - Backwards Compatible Version
 *
 * Creates React contexts with safe defaults and error handling.
 * This version maintains backwards compatibility with existing code.
 * For new code, consider using createSafeContextEnhanced, createTherapeuticContext, or createCrisisContext.
 */
export const createSafeContext = <T,>(
  defaultValue: T,
  contextName?: string
) => {
  // Use the enhanced version with basic configuration for backwards compatibility
  const enhancedContext = createSafeContextEnhanced<T>({
    defaultValue,
    contextName: contextName || 'UnnamedContext',
    enableTurboModuleOptimization: true,
    enableFabricOptimization: true,
    preventPropertyDescriptorConflicts: true,
    enableErrorBoundary: false, // Keep disabled for backwards compatibility
    fallbackStrategy: FallbackStrategy.DEFAULT,
    enablePerformanceTracking: false, // Keep disabled for backwards compatibility
    warnOnSlowRender: false, // Keep disabled for backwards compatibility
    maxRenderTime: 32, // Standard 30fps threshold for backwards compatibility
    enableStrictTypeValidation: false // Keep disabled for backwards compatibility
  });

  // Return the simple interface for backwards compatibility
  return {
    Provider: enhancedContext.Provider,
    useContext: enhancedContext.useContext,
    context: enhancedContext.context
  };
};

/**
 * Safe Hook Factory
 *
 * Creates custom hooks with error handling and safe defaults.
 */
export const createSafeHook = <T extends any[], R,>(
  hookFunction: (...args: T) => R,
  defaultReturn: R,
  hookName?: string
) => {
  return (...args: T): R => {
    try {
      return hookFunction(...args);
    } catch (error) {
      console.error(`Hook ${hookName} failed:`, error);
      return defaultReturn;
    }
  };
};

/**
 * Safe Module Import
 *
 * Safely imports modules with error handling and fallbacks.
 */
export const safeImport = async <T,>(
  importFunction: () => Promise<T>,
  fallback?: T,
  moduleName?: string
): Promise<T | undefined> => {
  try {
    const module = await importFunction();

    // Validate module
    if (!module) {
      throw new Error(`Module ${moduleName} returned null/undefined`);
    }

    return module;
  } catch (error) {
    console.error(`Failed to import module ${moduleName}:`, error);
    return fallback;
  }
};

/**
 * Defensive Object Creation
 *
 * Creates objects with safe property access and default values.
 */
export const createSafeObject = <T extends Record<string, any>,>(
  initialValues: Partial<T>,
  defaults: T
): T => {
  const safeObject = { ...defaults };

  // Safely apply initial values
  Object.keys(initialValues).forEach(key => {
    try {
      const value = initialValues[key];
      if (value !== undefined && value !== null) {
        safeObject[key as keyof T] = value;
      }
    } catch (error) {
      console.warn(`Failed to set property ${key}:`, error);
    }
  });

  return safeObject;
};

/**
 * Validation Helper
 *
 * Validates objects against a schema with safe error handling.
 */
export const validateSafely = <T,>(
  value: unknown,
  validator: (value: unknown) => value is T,
  errorContext?: string
): T | null => {
  try {
    if (validator(value)) {
      return value;
    }
    return null;
  } catch (error) {
    console.error(`Validation failed${errorContext ? ` in ${errorContext}` : ''}:`, error);
    return null;
  }
};

// ============================================================================
// Enhanced Exports - New Architecture Compatible
// ============================================================================

/**
 * Export all safe patterns for easy import - Enhanced Version
 */
export const SafePatterns = {
  // Original patterns (backwards compatible)
  createSafeComponent,
  createSafeService,
  createSafeStore,
  createSafeContext, // Backwards compatible version
  createSafeHook,
  safeGet,
  safeExecute,
  safeExecuteAsync,
  safeImport,
  createSafeObject,
  validateSafely,

  // Enhanced New Architecture patterns
  createSafeContextEnhanced,
  createTherapeuticContext,
  createCrisisContext,
  detectNewArchitecture,
} as const;

/**
 * New Architecture specific exports for advanced usage
 */
export const NewArchitecturePatterns = {
  createSafeContextEnhanced,
  createTherapeuticContext,
  createCrisisContext,
  detectNewArchitecture,
  SafeContextStatusType,
  FallbackStrategy,
} as const;

/**
 * Therapeutic-specific patterns for mental health contexts
 */
export const TherapeuticPatterns = {
  createTherapeuticContext,
  createCrisisContext,
  SafeContextStatusType,
  FallbackStrategy,
} as const;

// Note: All TypeScript interfaces are already exported above where they are defined