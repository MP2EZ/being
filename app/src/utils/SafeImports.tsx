/**
 * Safe Import Patterns for Being. MBCT App
 *
 * Factory functions and safe import patterns to prevent property descriptor
 * errors and enable stable concurrent development.
 *
 * PRINCIPLES:
 * - Factory functions over class instantiation
 * - Lazy loading with error boundaries
 * - Safe property access patterns
 * - Defensive programming for clinical safety
 */

import React, { ComponentType, lazy, Suspense, ReactNode } from 'react';
import { View, Text } from 'react-native';

/**
 * Safe Factory Pattern Interface
 */
export interface SafeFactory<T> {
  create: (...args: any[]) => T;
  validate: (instance: T) => boolean;
  destroy?: (instance: T) => void;
}

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
 * Safe Context Factory
 *
 * Creates React contexts with safe defaults and error handling.
 */
export const createSafeContext = <T,>(
  defaultValue: T,
  contextName?: string
) => {
  const context = React.createContext<T | null>(null);

  const Provider: React.FC<{
    value: T;
    children: ReactNode;
  }> = ({ value, children }) => {
    // Validate context value
    if (value === null || value === undefined) {
      console.warn(`Context ${contextName} received null/undefined value`);
    }

    return (
      <context.Provider value={value}>
        {children}
      </context.Provider>
    );
  };

  const useContext = (): T => {
    const contextValue = React.useContext(context);

    if (contextValue === null) {
      console.warn(`Context ${contextName} used outside provider, returning default`);
      return defaultValue;
    }

    return contextValue;
  };

  return {
    Provider,
    useContext,
    context, // Raw context for advanced usage
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

/**
 * Export all safe patterns for easy import
 */
export const SafePatterns = {
  createSafeComponent,
  createSafeService,
  createSafeStore,
  createSafeContext,
  createSafeHook,
  safeGet,
  safeExecute,
  safeExecuteAsync,
  safeImport,
  createSafeObject,
  validateSafely,
} as const;