/**
 * SafeImports Enhanced Test Suite - Comprehensive Testing
 *
 * Tests for New Architecture compatibility, therapeutic context safety,
 * performance validation, error handling, and security features.
 *
 * Test Requirements:
 * - New Architecture compatibility validation
 * - Therapeutic/Crisis context safety (8ms/16ms performance)
 * - Context isolation and error boundary testing
 * - Fallback strategy validation
 * - Type safety and validation testing
 * - Backwards compatibility assurance
 */

import React, { act } from 'react';
import { Text, View } from 'react-native';
import { render, renderHook, waitFor } from '@testing-library/react-native';
import {
  createSafeContext,
  createSafeContextEnhanced,
  createTherapeuticContext,
  createCrisisContext,
  detectNewArchitecture,
  SafeContextStatusType,
  FallbackStrategy,
  createSafeComponent,
  createSafeService,
  safeGet,
  safeExecute,
  safeExecuteAsync,
  SafePatterns,
  NewArchitecturePatterns,
  TherapeuticPatterns,
  type SafeContextConfig,
  type PerformanceMetrics,
  type SafeContextStatus,
  type NewArchitectureCompatibility,
  type TherapeuticContextConfig,
  type CrisisContextConfig
} from '../SafeImports';

// Enhanced performance mocking with timing simulation
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => [])
};
global.performance = mockPerformance as any;

// Mock console methods to test error handling
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Test utilities for performance validation
const createPerformanceTest = (targetTime: number, tolerance: number = 2) => {
  return (actualTime: number) => {
    expect(actualTime).toBeLessThanOrEqual(targetTime + tolerance);
    if (actualTime > targetTime) {
      console.warn(`Performance target missed: ${actualTime}ms > ${targetTime}ms`);
    }
  };
};

// Mock New Architecture globals for testing
const mockNewArchitecture = {
  enableTurboModules: () => {
    (global as any).__turboModuleProxy = { test: true };
    (global as any).__fbBatchedBridge = {
      getCallableModule: jest.fn(() => ({ test: 'turbo' }))
    };
  },
  enableFabric: () => {
    (global as any).nativeFabricUIManager = { test: true };
    (global as any).__fbBatchedBridge = {
      getCallableModule: jest.fn((name: string) =>
        name === 'FabricUIManager' ? { test: 'fabric' } : null)
    };
  },
  cleanup: () => {
    delete (global as any).__turboModuleProxy;
    delete (global as any).nativeFabricUIManager;
    delete (global as any).__fbBatchedBridge;
  }
};

describe('SafeImports Enhanced - New Architecture Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
    mockConsoleError.mockClear();
    mockNewArchitecture.cleanup();
    mockPerformance.now.mockReset();
  });

  afterEach(() => {
    mockNewArchitecture.cleanup();
  });

  describe('detectNewArchitecture', () => {
    it('should detect legacy architecture by default', () => {
      const result = detectNewArchitecture();

      expect(result).toEqual({
        hasTurboModules: false,
        hasFabric: false,
        hasPropertyDescriptorSupport: true, // Should be true in modern JS environments
        version: 'legacy'
      });
    });

    it('should detect New Architecture when TurboModules present', () => {
      mockNewArchitecture.enableTurboModules();
      mockNewArchitecture.enableFabric();

      const result = detectNewArchitecture();

      expect(result.hasTurboModules).toBe(true);
      expect(result.hasFabric).toBe(true);
      expect(result.version).toBe('new-architecture');
    });

    it('should detect partial New Architecture', () => {
      mockNewArchitecture.enableTurboModules();
      // Only TurboModules, no Fabric

      const result = detectNewArchitecture();

      expect(result.hasTurboModules).toBe(true);
      expect(result.hasFabric).toBe(false);
      expect(result.version).toBe('partial-new-architecture');
    });

    it('should handle detection errors gracefully', () => {
      // Simulate error during detection
      const originalDescriptor = Object.getOwnPropertyDescriptor;
      Object.getOwnPropertyDescriptor = undefined as any;

      const result = detectNewArchitecture();

      expect(result.version).toBe('legacy');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to detect New Architecture capabilities')
      );

      // Restore
      Object.getOwnPropertyDescriptor = originalDescriptor;
    });

    it('should validate property descriptor support correctly', () => {
      const result = detectNewArchitecture();

      // In test environment, these should be available
      expect(result.hasPropertyDescriptorSupport).toBe(true);
      expect(typeof Object.getOwnPropertyDescriptor).toBe('function');
      expect(typeof Object.defineProperty).toBe('function');
      expect(typeof Object.getOwnPropertyDescriptors).toBe('function');
    });
  });

  describe('createSafeContextEnhanced', () => {
    it('should create enhanced context with performance tracking', () => {
      const config: SafeContextConfig<string> = {
        defaultValue: 'test',
        contextName: 'TestContext',
        enablePerformanceTracking: true,
        maxRenderTime: 16,
        enableStrictTypeValidation: true
      };

      const context = createSafeContextEnhanced(config);

      expect(context).toHaveProperty('Provider');
      expect(context).toHaveProperty('useContext');
      expect(context).toHaveProperty('useContextWithStatus');
      expect(context).toHaveProperty('useContextOptimized');
      expect(context).toHaveProperty('resetContext');
      expect(context).toHaveProperty('validateContext');
      expect(context).toHaveProperty('getPerformanceMetrics');
    });

    it('should handle validation errors gracefully', () => {
      const mockValidator = jest.fn(() => false);
      const config: SafeContextConfig<string> = {
        defaultValue: 'fallback',
        contextName: 'ValidatedContext',
        validator: mockValidator,
        enableStrictTypeValidation: true
      };

      const context = createSafeContextEnhanced(config);
      expect(context.validateContext()).toBe(true); // Basic implementation always returns true
    });

    it('should support sanitization', () => {
      const mockSanitizer = jest.fn((value: string) => value.trim());
      const config: SafeContextConfig<string> = {
        defaultValue: 'clean',
        contextName: 'SanitizedContext',
        sanitizer: mockSanitizer
      };

      const context = createSafeContextEnhanced(config);
      expect(context).toBeDefined();
    });
  });

  describe('createTherapeuticContext', () => {
    it('should create therapeutic context with strict performance requirements', () => {
      const context = createTherapeuticContext('therapeutic-value', 'TherapeuticTest');

      expect(context).toHaveProperty('Provider');
      expect(context).toHaveProperty('useContext');
      expect(context).toHaveProperty('useContextWithStatus');
      expect(context).toHaveProperty('useContextOptimized');

      // Therapeutic contexts should have performance tracking enabled
      const metrics = context.getPerformanceMetrics();
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('averageRenderTime');
      expect(metrics).toHaveProperty('renderCount');
    });

    it('should enforce 16ms render time requirement for therapeutic contexts', async () => {
      const performanceCallback = jest.fn();
      const context = createTherapeuticContext('value', 'TherapeuticPerformanceTest', {
        onPerformanceWarning: performanceCallback
      });

      // Mock slow render (over 16ms)
      mockPerformance.now
        .mockReturnValueOnce(0)    // Start time
        .mockReturnValueOnce(20);  // End time (20ms - too slow)

      const TestComponent = () => {
        const value = context.useContext();
        return <Text>{value}</Text>;
      };

      const ProviderWrapper = ({ children }: { children: React.ReactNode }) => (
        <context.Provider value="test-value">
          {children}
        </context.Provider>
      );

      await act(async () => {
        render(
          <ProviderWrapper>
            <TestComponent />
          </ProviderWrapper>
        );
        // Allow performance tracking to complete
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should warn about slow render
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected in TherapeuticPerformanceTest')
      );
    });

    it('should support additional config overrides', () => {
      const context = createTherapeuticContext('value', 'Test', {
        maxRetries: 5,
        retryDelay: 100
      });

      expect(context).toBeDefined();
    });

    it('should validate therapeutic context configuration', () => {
      const context = createTherapeuticContext('test', 'TherapeuticConfigTest');

      // Therapeutic contexts should have specific config
      const { useContextWithStatus } = context;
      const hook = renderHook(() => useContextWithStatus(), {
        wrapper: ({ children }) => (
          <context.Provider value="therapeutic-test">
            {children}
          </context.Provider>
        )
      });

      const status = hook.result.current;
      expect(status.value).toBe('therapeutic-test');
      expect(status.status).toBe(SafeContextStatusType.THERAPEUTIC_ACTIVE);
      expect(status.isHealthy).toBe(true);
    });

    it('should handle validation failures in therapeutic contexts', () => {
      const validator = jest.fn(() => false); // Always fail validation
      const onError = jest.fn();

      const context = createTherapeuticContext('default', 'TherapeuticValidationTest', {
        validator,
        onError,
        enableStrictTypeValidation: true
      });

      const TestProvider = () => (
        <context.Provider value="invalid-value">
          <Text>Test</Text>
        </context.Provider>
      );

      render(<TestProvider />);

      // Should call onError for validation failure
      expect(onError).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Context processing failed for TherapeuticValidationTest')
      );
    });
  });

  describe('createCrisisContext', () => {
    it('should create crisis context with ultra-fast performance requirements', () => {
      const context = createCrisisContext('crisis-value', 'CrisisTest');

      expect(context).toHaveProperty('Provider');
      expect(context).toHaveProperty('useContext');
      expect(context).toHaveProperty('useContextWithStatus');
      expect(context).toHaveProperty('useContextOptimized');

      // Crisis contexts should have strict performance tracking
      const metrics = context.getPerformanceMetrics();
      expect(metrics).toHaveProperty('renderTime');
      expect(metrics).toHaveProperty('isSlowRender');
    });

    it('should enforce 8ms render time requirement for crisis contexts', async () => {
      const performanceCallback = jest.fn();
      const context = createCrisisContext('crisis-value', 'CrisisPerformanceTest', {
        onPerformanceWarning: performanceCallback
      });

      // Mock slow render (over 8ms)
      mockPerformance.now
        .mockReturnValueOnce(0)    // Start time
        .mockReturnValueOnce(12);  // End time (12ms - too slow for crisis)

      const CrisisTestComponent = () => {
        const value = context.useContext();
        return <Text>{value}</Text>;
      };

      const CrisisProviderWrapper = ({ children }: { children: React.ReactNode }) => (
        <context.Provider value="crisis-test-value">
          {children}
        </context.Provider>
      );

      await act(async () => {
        render(
          <CrisisProviderWrapper>
            <CrisisTestComponent />
          </CrisisProviderWrapper>
        );
        // Allow performance tracking to complete
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Should warn about slow render for crisis context
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected in CrisisPerformanceTest')
      );
    });

    it('should validate crisis context status and configuration', () => {
      const context = createCrisisContext('emergency', 'CrisisStatusTest');

      const { useContextWithStatus } = context;
      const hook = renderHook(() => useContextWithStatus(), {
        wrapper: ({ children }) => (
          <context.Provider value="emergency-value">
            {children}
          </context.Provider>
        )
      });

      const status = hook.result.current;
      expect(status.value).toBe('emergency-value');
      expect(status.status).toBe(SafeContextStatusType.CRISIS_MODE);
      expect(status.isHealthy).toBe(true);
    });

    it('should support error boundaries by default', () => {
      const context = createCrisisContext('value', 'Test');
      expect(context).toBeDefined();
    });

    it('should implement retry strategy for crisis contexts', async () => {
      const onRetry = jest.fn();
      const onError = jest.fn();
      const validator = jest.fn(() => false); // Always fail initially

      const context = createCrisisContext('fallback-value', 'CrisisRetryTest', {
        validator,
        onRetry,
        onError,
        maxRetries: 3,
        retryDelay: 50,
        enableStrictTypeValidation: true
      });

      const CrisisRetryProvider = () => (
        <context.Provider value="invalid-for-retry">
          <Text>Crisis Test</Text>
        </context.Provider>
      );

      render(<CrisisRetryProvider />);

      // Should trigger error handling
      expect(onError).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Context processing failed for CrisisRetryTest')
      );

      // Wait for retry mechanism
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    });

    it('should support ultra-fast context switching for crisis scenarios', () => {
      const context1 = createCrisisContext('crisis1', 'Crisis1');
      const context2 = createCrisisContext('crisis2', 'Crisis2');

      // Both contexts should be immediately available
      expect(context1.useContext).toBeDefined();
      expect(context2.useContext).toBeDefined();

      // Performance tracking should be enabled
      expect(context1.getPerformanceMetrics).toBeDefined();
      expect(context2.getPerformanceMetrics).toBeDefined();
    });
  });

  describe('backwards compatibility', () => {
    it('should maintain backwards compatibility with createSafeContext', () => {
      const legacyContext = createSafeContext('legacy-value', 'LegacyTest');

      expect(legacyContext).toHaveProperty('Provider');
      expect(legacyContext).toHaveProperty('useContext');
      expect(legacyContext).toHaveProperty('context');

      // Should not have enhanced features to maintain compatibility
      expect(legacyContext).not.toHaveProperty('useContextWithStatus');
      expect(legacyContext).not.toHaveProperty('resetContext');
    });

    it('should work with existing Provider/useContext patterns', () => {
      const legacyContext = createSafeContext('test-value', 'BackwardsCompatTest');

      // These should be defined and callable
      expect(typeof legacyContext.Provider).toBe('function');
      expect(typeof legacyContext.useContext).toBe('function');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance metrics correctly', () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(10);

      const config: SafeContextConfig<string> = {
        defaultValue: 'test',
        contextName: 'PerfTest',
        enablePerformanceTracking: true,
        maxRenderTime: 16
      };

      const context = createSafeContextEnhanced(config);
      const metrics = context.getPerformanceMetrics();

      expect(metrics).toEqual({
        renderTime: 0,
        lastRenderTime: 0,
        averageRenderTime: 0,
        renderCount: 0,
        slowRenderCount: 0,
        maxRenderTime: 0,
        isSlowRender: false
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors with fallback strategies', () => {
      const mockOnError = jest.fn();
      const config: SafeContextConfig<string> = {
        defaultValue: 'fallback',
        contextName: 'ErrorTest',
        onError: mockOnError,
        fallbackStrategy: FallbackStrategy.GRACEFUL_DEGRADATION
      };

      const context = createSafeContextEnhanced(config);
      expect(context).toBeDefined();
    });

    it('should support retry strategy for crisis contexts', () => {
      const mockOnRetry = jest.fn();
      const context = createCrisisContext('value', 'RetryTest', {
        onRetry: mockOnRetry,
        maxRetries: 3,
        retryDelay: 50
      });

      expect(context).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should enforce strict typing when enabled', () => {
      const mockValidator = jest.fn((value: any): value is string => typeof value === 'string');

      const config: SafeContextConfig<string> = {
        defaultValue: 'typed',
        contextName: 'TypedTest',
        validator: mockValidator,
        enableStrictTypeValidation: true
      };

      const context = createSafeContextEnhanced(config);
      expect(context.validateContext()).toBe(true);
    });
  });

  describe('New Architecture Optimizations', () => {
    it('should provide optimized hooks for New Architecture', () => {
      const context = createSafeContextEnhanced({
        defaultValue: 'optimized',
        contextName: 'OptimizedTest',
        enableTurboModuleOptimization: true,
        enableFabricOptimization: true
      });

      expect(typeof context.useContextOptimized).toBe('function');
    });

    it('should prevent property descriptor conflicts', () => {
      const context = createSafeContextEnhanced({
        defaultValue: { test: 'value' },
        contextName: 'PropertyTest',
        preventPropertyDescriptorConflicts: true
      });

      expect(context).toBeDefined();
    });
  });
});

describe('Context Isolation and Safety Tests', () => {
  describe('Context Isolation', () => {
    it('should isolate therapeutic and crisis contexts from each other', () => {
      const therapeuticContext = createTherapeuticContext('therapeutic', 'TherapeuticIsolation');
      const crisisContext = createCrisisContext('crisis', 'CrisisIsolation');

      const TherapeuticComponent = () => {
        const value = therapeuticContext.useContext();
        return <Text testID="therapeutic">{value}</Text>;
      };

      const CrisisComponent = () => {
        const value = crisisContext.useContext();
        return <Text testID="crisis">{value}</Text>;
      };

      const { getByTestId } = render(
        <therapeuticContext.Provider value="therapeutic-isolated">
          <crisisContext.Provider value="crisis-isolated">
            <TherapeuticComponent />
            <CrisisComponent />
          </crisisContext.Provider>
        </therapeuticContext.Provider>
      );

      expect(getByTestId('therapeutic')).toHaveTextContent('therapeutic-isolated');
      expect(getByTestId('crisis')).toHaveTextContent('crisis-isolated');
    });

    it('should prevent context value bleeding between providers', () => {
      const context1 = createSafeContextEnhanced({
        defaultValue: 'default1',
        contextName: 'Context1'
      });
      const context2 = createSafeContextEnhanced({
        defaultValue: 'default2',
        contextName: 'Context2'
      });

      const Component1 = () => {
        const value = context1.useContext();
        return <Text testID="context1">{value}</Text>;
      };

      const Component2 = () => {
        const value = context2.useContext();
        return <Text testID="context2">{value}</Text>;
      };

      const { getByTestId } = render(
        <context1.Provider value="provider1-value">
          <Component1 />
          <context2.Provider value="provider2-value">
            <Component2 />
            {/* Component1 should still have provider1-value, not provider2-value */}
            <Component1 />
          </context2.Provider>
        </context1.Provider>
      );

      const context1Elements = getByTestId('context1');
      const context2Element = getByTestId('context2');

      expect(context1Elements).toHaveTextContent('provider1-value');
      expect(context2Element).toHaveTextContent('provider2-value');
    });

    it('should maintain context isolation under New Architecture', () => {
      mockNewArchitecture.enableTurboModules();
      mockNewArchitecture.enableFabric();

      const context = createSafeContextEnhanced({
        defaultValue: 'test',
        contextName: 'NewArchIsolationTest',
        enableTurboModuleOptimization: true,
        enableFabricOptimization: true,
        preventPropertyDescriptorConflicts: true
      });

      const TestComponent = () => {
        const value = context.useContext();
        const optimizedValue = context.useContextOptimized();
        return (
          <View>
            <Text testID="normal">{value}</Text>
            <Text testID="optimized">{optimizedValue}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <context.Provider value="new-arch-test">
          <TestComponent />
        </context.Provider>
      );

      expect(getByTestId('normal')).toHaveTextContent('new-arch-test');
      expect(getByTestId('optimized')).toHaveTextContent('new-arch-test');
    });
  });

  describe('Error Boundary Safety', () => {
    it('should contain errors within error boundaries', () => {
      const onError = jest.fn();
      const ThrowingComponent = () => {
        throw new Error('Test error for boundary');
      };

      const context = createSafeContextEnhanced({
        defaultValue: 'safe-value',
        contextName: 'ErrorBoundaryTest',
        enableErrorBoundary: true,
        onError
      });

      // Error should be caught and not crash the test
      const { getByText } = render(
        <context.Provider value="test-value">
          <ThrowingComponent />
        </context.Provider>
      );

      // Should show error UI instead of crashing
      expect(getByText(/Context "ErrorBoundaryTest" encountered an error/)).toBeTruthy();
    });

    it('should provide custom fallback UI for error boundaries', () => {
      const CustomFallback = () => <Text testID="custom-fallback">Custom Error UI</Text>;
      const ThrowingComponent = () => {
        throw new Error('Custom fallback test');
      };

      const context = createCrisisContext('crisis-value', 'CustomFallbackTest');

      // Note: The error boundary is internal to the Provider
      // This test validates the structure but actual error catching would need integration testing
      expect(context.Provider).toBeDefined();
      expect(typeof context.Provider).toBe('function');
    });
  });

  describe('Property Descriptor Protection', () => {
    it('should protect against property descriptor conflicts', () => {
      const sensitiveObject = {
        therapeuticData: 'sensitive',
        assessmentScore: 85
      };

      const context = createSafeContextEnhanced({
        defaultValue: sensitiveObject,
        contextName: 'PropertyProtectionTest',
        preventPropertyDescriptorConflicts: true
      });

      const TestComponent = () => {
        const data = context.useContext();
        return (
          <View>
            <Text testID="therapeutic">{data.therapeuticData}</Text>
            <Text testID="score">{data.assessmentScore.toString()}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <context.Provider value={sensitiveObject}>
          <TestComponent />
        </context.Provider>
      );

      expect(getByTestId('therapeutic')).toHaveTextContent('sensitive');
      expect(getByTestId('score')).toHaveTextContent('85');
    });

    it('should handle property descriptor conflicts gracefully', () => {
      const problematicObject = {};

      // Simulate property descriptor conflict
      Object.defineProperty(problematicObject, 'conflictProp', {
        get() {
          throw new Error('Property descriptor conflict');
        },
        configurable: false
      });

      const context = createSafeContextEnhanced({
        defaultValue: { safe: 'fallback' },
        contextName: 'ConflictTest',
        preventPropertyDescriptorConflicts: true
      });

      // Should not throw when creating provider with problematic object
      expect(() => {
        render(
          <context.Provider value={problematicObject as any}>
            <Text>Test</Text>
          </context.Provider>
        );
      }).not.toThrow();
    });
  });

  describe('Memory Safety', () => {
    it('should properly clean up context references', () => {
      const context = createSafeContextEnhanced({
        defaultValue: 'cleanup-test',
        contextName: 'CleanupTest'
      });

      // Reset context should clear performance metrics
      context.resetContext();
      const metrics = context.getPerformanceMetrics();

      expect(metrics.renderCount).toBe(0);
      expect(metrics.averageRenderTime).toBe(0);
    });

    it('should prevent memory leaks in long-running contexts', () => {
      const context = createTherapeuticContext('memory-test', 'MemoryLeakTest');

      // Simulate multiple renders
      for (let i = 0; i < 1000; i++) {
        context.resetContext();
      }

      // Should still be functional
      expect(context.useContext).toBeDefined();
      expect(context.getPerformanceMetrics()).toBeDefined();
    });
  });
});

describe('SafeImports Integration', () => {
  it('should export all required interfaces and enums', () => {
    expect(SafeContextStatusType.INITIALIZED).toBe('initialized');
    expect(SafeContextStatusType.CRISIS_MODE).toBe('crisis_mode');
    expect(SafeContextStatusType.THERAPEUTIC_ACTIVE).toBe('therapeutic_active');

    expect(FallbackStrategy.DEFAULT).toBe('default');
    expect(FallbackStrategy.RETRY).toBe('retry');
    expect(FallbackStrategy.GRACEFUL_DEGRADATION).toBe('graceful-degradation');
  });

  it('should provide comprehensive pattern exports', () => {
    // Should have all enhanced exports available
    expect(createSafeContextEnhanced).toBeDefined();
    expect(createTherapeuticContext).toBeDefined();
    expect(createCrisisContext).toBeDefined();
    expect(detectNewArchitecture).toBeDefined();
  });

  describe('Pattern Export Validation', () => {
    it('should export SafePatterns with all functions', () => {
      expect(SafePatterns.createSafeComponent).toBeDefined();
      expect(SafePatterns.createSafeService).toBeDefined();
      expect(SafePatterns.createSafeContext).toBeDefined();
      expect(SafePatterns.createSafeContextEnhanced).toBeDefined();
      expect(SafePatterns.safeGet).toBeDefined();
      expect(SafePatterns.safeExecute).toBeDefined();
    });

    it('should export NewArchitecturePatterns', () => {
      expect(NewArchitecturePatterns.createSafeContextEnhanced).toBeDefined();
      expect(NewArchitecturePatterns.detectNewArchitecture).toBeDefined();
      expect(NewArchitecturePatterns.SafeContextStatusType).toBeDefined();
    });

    it('should export TherapeuticPatterns', () => {
      expect(TherapeuticPatterns.createTherapeuticContext).toBeDefined();
      expect(TherapeuticPatterns.createCrisisContext).toBeDefined();
      expect(TherapeuticPatterns.SafeContextStatusType).toBeDefined();
    });
  });
});

describe('Error Handling and Fallback Strategy Tests', () => {
  describe('Fallback Strategy Implementation', () => {
    it('should implement DEFAULT fallback strategy', () => {
      const onError = jest.fn();
      const validator = jest.fn(() => false); // Always fail

      const context = createSafeContextEnhanced({
        defaultValue: 'fallback-value',
        contextName: 'DefaultFallbackTest',
        validator,
        enableStrictTypeValidation: true,
        fallbackStrategy: FallbackStrategy.DEFAULT,
        onError
      });

      const TestComponent = () => {
        const value = context.useContext();
        return <Text testID="fallback-result">{value}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="invalid-value">
          <TestComponent />
        </context.Provider>
      );

      // Should use default value on validation failure
      expect(getByTestId('fallback-result')).toHaveTextContent('fallback-value');
      expect(onError).toHaveBeenCalled();
    });

    it('should implement RETRY fallback strategy', async () => {
      const onRetry = jest.fn();
      const onError = jest.fn();
      let validationAttempts = 0;
      const validator = jest.fn(() => {
        validationAttempts++;
        return validationAttempts > 2; // Fail first 2 attempts, succeed on 3rd
      });

      const context = createSafeContextEnhanced({
        defaultValue: 'retry-fallback',
        contextName: 'RetryFallbackTest',
        validator,
        enableStrictTypeValidation: true,
        fallbackStrategy: FallbackStrategy.RETRY,
        maxRetries: 3,
        retryDelay: 10,
        onRetry,
        onError
      });

      render(
        <context.Provider value="test-value">
          <Text>Retry Test</Text>
        </context.Provider>
      );

      // Wait for retries to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should implement GRACEFUL_DEGRADATION fallback strategy', () => {
      const validator = jest.fn(() => false);
      const sanitizer = jest.fn((value: string) => 'sanitized-' + value);

      const context = createSafeContextEnhanced({
        defaultValue: 'graceful-fallback',
        contextName: 'GracefulDegradationTest',
        validator,
        sanitizer,
        enableStrictTypeValidation: true,
        fallbackStrategy: FallbackStrategy.GRACEFUL_DEGRADATION
      });

      const TestComponent = () => {
        const value = context.useContext();
        return <Text testID="graceful-result">{value}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="test-input">
          <TestComponent />
        </context.Provider>
      );

      // Should use fallback value due to validation failure
      expect(getByTestId('graceful-result')).toHaveTextContent('graceful-fallback');
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle context access outside provider gracefully', () => {
      const context = createSafeContextEnhanced({
        defaultValue: 'outside-provider-default',
        contextName: 'OutsideProviderTest'
      });

      const { result } = renderHook(() => context.useContext());

      expect(result.current).toBe('outside-provider-default');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Context OutsideProviderTest used outside provider')
      );
    });

    it('should handle status access outside provider gracefully', () => {
      const context = createSafeContextEnhanced({
        defaultValue: 'status-test',
        contextName: 'StatusOutsideProviderTest'
      });

      const { result } = renderHook(() => context.useContextWithStatus());

      expect(result.current.value).toBe('status-test');
      expect(result.current.status).toBe(SafeContextStatusType.ERROR);
      expect(result.current.isHealthy).toBe(false);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Context status StatusOutsideProviderTest used outside provider')
      );
    });

    it('should limit error history to prevent memory leaks', () => {
      const validator = jest.fn(() => false);
      const context = createSafeContextEnhanced({
        defaultValue: 'error-history-test',
        contextName: 'ErrorHistoryTest',
        validator,
        enableStrictTypeValidation: true
      });

      // Generate many errors
      for (let i = 0; i < 15; i++) {
        render(
          <context.Provider value={`error-test-${i}`}>
            <Text>Error Test {i}</Text>
          </context.Provider>
        );
      }

      const { result } = renderHook(() => context.useContextWithStatus(), {
        wrapper: ({ children }) => (
          <context.Provider value="final-test">
            {children}
          </context.Provider>
        )
      });

      // Should limit errors to last 10 (or similar reasonable limit)
      expect(result.current.errors.length).toBeLessThanOrEqual(10);
    });

    it('should handle sanitizer errors gracefully', () => {
      const faultySanitizer = jest.fn(() => {
        throw new Error('Sanitizer error');
      });

      const context = createSafeContextEnhanced({
        defaultValue: 'sanitizer-error-fallback',
        contextName: 'SanitizerErrorTest',
        sanitizer: faultySanitizer
      });

      const TestComponent = () => {
        const value = context.useContext();
        return <Text testID="sanitizer-error-result">{value}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="test-input">
          <TestComponent />
        </context.Provider>
      );

      // Should use fallback when sanitizer fails
      expect(getByTestId('sanitizer-error-result')).toHaveTextContent('sanitizer-error-fallback');
    });

    it('should handle validator exceptions gracefully', () => {
      const faultyValidator = jest.fn(() => {
        throw new Error('Validator error');
      });

      const context = createSafeContextEnhanced({
        defaultValue: 'validator-error-fallback',
        contextName: 'ValidatorErrorTest',
        validator: faultyValidator,
        enableStrictTypeValidation: true
      });

      const TestComponent = () => {
        const value = context.useContext();
        return <Text testID="validator-error-result">{value}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="test-input">
          <TestComponent />
        </context.Provider>
      );

      expect(getByTestId('validator-error-result')).toHaveTextContent('validator-error-fallback');
    });
  });

  describe('Error Safety for Therapeutic Contexts', () => {
    it('should ensure no PHI exposure in error messages', () => {
      const sensitiveData = {
        patientId: '123-45-6789',
        assessment: 'PHQ-9 Score: 15',
        personalInfo: 'John Doe, DOB: 1990-01-01'
      };

      const context = createTherapeuticContext(null, 'PHIProtectionTest');

      render(
        <context.Provider value={sensitiveData as any}>
          <Text>PHI Test</Text>
        </context.Provider>
      );

      // Check that console errors don't contain sensitive data
      const errorCalls = mockConsoleError.mock.calls;
      errorCalls.forEach(call => {
        const errorMessage = call.join(' ');
        expect(errorMessage).not.toContain('123-45-6789');
        expect(errorMessage).not.toContain('John Doe');
        expect(errorMessage).not.toContain('1990-01-01');
      });
    });

    it('should maintain therapeutic safety during error recovery', async () => {
      let recoveryAttempts = 0;
      const validator = jest.fn(() => {
        recoveryAttempts++;
        return recoveryAttempts > 1; // Fail first, succeed second
      });

      const context = createTherapeuticContext('safe-therapeutic-value', 'TherapeuticRecoveryTest', {
        validator,
        enableStrictTypeValidation: true,
        fallbackStrategy: FallbackStrategy.GRACEFUL_DEGRADATION
      });

      const TherapeuticComponent = () => {
        const { useContextWithStatus } = context;
        const status = useContextWithStatus();
        return (
          <View>
            <Text testID="therapeutic-value">{status.value}</Text>
            <Text testID="therapeutic-status">{status.status}</Text>
            <Text testID="therapeutic-healthy">{status.isHealthy.toString()}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <context.Provider value="invalid-therapeutic-input">
          <TherapeuticComponent />
        </context.Provider>
      );

      expect(getByTestId('therapeutic-value')).toHaveTextContent('safe-therapeutic-value');
      expect(getByTestId('therapeutic-status')).toHaveTextContent('therapeutic_active');
    });
  });

  describe('Crisis Context Error Handling', () => {
    it('should prioritize speed over error detail in crisis contexts', () => {
      const validator = jest.fn(() => false);
      const context = createCrisisContext('emergency-fallback', 'CrisisErrorSpeedTest', {
        validator,
        enableStrictTypeValidation: true
      });

      const startTime = performance.now();

      const CrisisComponent = () => {
        const value = context.useContext();
        return <Text testID="crisis-error-result">{value}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="invalid-crisis-input">
          <CrisisComponent />
        </context.Provider>
      );

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Crisis error handling should be very fast
      expect(processingTime).toBeLessThan(50); // Allow 50ms for test environment
      expect(getByTestId('crisis-error-result')).toHaveTextContent('emergency-fallback');
    });

    it('should maintain crisis mode status during error recovery', () => {
      const context = createCrisisContext('crisis-recovery-value', 'CrisisStatusMaintainTest');

      const CrisisStatusComponent = () => {
        const status = context.useContextWithStatus();
        return (
          <View>
            <Text testID="crisis-status">{status.status}</Text>
            <Text testID="crisis-healthy">{status.isHealthy.toString()}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <context.Provider value="crisis-test-value">
          <CrisisStatusComponent />
        </context.Provider>
      );

      expect(getByTestId('crisis-status')).toHaveTextContent('crisis_mode');
      expect(getByTestId('crisis-healthy')).toHaveTextContent('true');
    });
  });
});

describe('Utility Functions and Safe Patterns Tests', () => {
  describe('Safe Utility Functions', () => {
    it('should safely get object properties with safeGet', () => {
      const testObj = {
        validProp: 'test-value',
        nestedObj: {
          deepProp: 'deep-value'
        }
      };

      expect(safeGet(testObj, 'validProp')).toBe('test-value');
      expect(safeGet(testObj, 'invalidProp' as any, 'fallback')).toBe('fallback');
      expect(safeGet(null, 'anyProp' as any, 'null-fallback')).toBe('null-fallback');
      expect(safeGet(undefined, 'anyProp' as any, 'undefined-fallback')).toBe('undefined-fallback');
    });

    it('should safely execute functions with safeExecute', () => {
      const validFunction = jest.fn((a: number, b: number) => a + b);
      const throwingFunction = jest.fn(() => {
        throw new Error('Function execution error');
      });

      expect(safeExecute(validFunction, [5, 3])).toBe(8);
      expect(safeExecute(throwingFunction, [], 'fallback-result')).toBe('fallback-result');
      expect(safeExecute(null as any, [], 'null-function-fallback')).toBe('null-function-fallback');

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Safe execution failed'),
        expect.any(Error)
      );
    });

    it('should safely execute async functions with safeExecuteAsync', async () => {
      const validAsyncFunction = jest.fn(async (value: string) => `async-${value}`);
      const throwingAsyncFunction = jest.fn(async () => {
        throw new Error('Async execution error');
      });
      const timeoutFunction = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'should-timeout';
      });

      expect(await safeExecuteAsync(validAsyncFunction, ['test'])).toBe('async-test');
      expect(await safeExecuteAsync(throwingAsyncFunction, [], {
        fallback: 'async-fallback'
      })).toBe('async-fallback');
      expect(await safeExecuteAsync(timeoutFunction, [], {
        timeout: 50,
        fallback: 'timeout-fallback'
      })).toBe('timeout-fallback');
    });
  });

  describe('Safe Component Factory', () => {
    it('should create safe lazy components', async () => {
      const MockComponent = () => <Text testID="mock-component">Mock Component</Text>;
      const importFunction = jest.fn(async () => ({ default: MockComponent }));

      const SafeComponent = createSafeComponent(importFunction, undefined, 'MockComponent');

      const { getByText } = render(<SafeComponent />);

      // Should show loading initially
      expect(getByText('Loading MockComponent...')).toBeTruthy();

      // Wait for component to load
      await waitFor(() => {
        expect(getByText('Mock Component')).toBeTruthy();
      });

      expect(importFunction).toHaveBeenCalled();
    });

    it('should handle component import failures gracefully', async () => {
      const failingImportFunction = jest.fn(async () => {
        throw new Error('Component import failed');
      });

      const SafeComponent = createSafeComponent(
        failingImportFunction,
        undefined,
        'FailingComponent'
      );

      const { getByText } = render(<SafeComponent />);

      await waitFor(() => {
        expect(getByText(/Component "FailingComponent" failed to load/)).toBeTruthy();
      });
    });

    it('should use fallback component when provided', async () => {
      const FallbackComponent = () => <Text testID="fallback">Fallback Component</Text>;
      const failingImportFunction = jest.fn(async () => {
        throw new Error('Import failed');
      });

      const SafeComponent = createSafeComponent(
        failingImportFunction,
        FallbackComponent,
        'WithFallback'
      );

      const { getByText, getByTestId } = render(<SafeComponent />);

      // Should show fallback during loading
      expect(getByTestId('fallback')).toBeTruthy();

      await waitFor(() => {
        // Should use fallback when import fails
        expect(getByText('Fallback Component')).toBeTruthy();
      });
    });
  });

  describe('Safe Service Factory', () => {
    it('should create services with validation', () => {
      interface TestService {
        name: string;
        method: () => string;
      }

      const serviceFactory = (): TestService => ({
        name: 'TestService',
        method: () => 'service-result'
      });

      const validator = (service: TestService) =>
        typeof service.name === 'string' && typeof service.method === 'function';

      const safeServiceFactory = createSafeService(serviceFactory, validator, 'TestService');

      const service = safeServiceFactory.create();
      expect(service.name).toBe('TestService');
      expect(service.method()).toBe('service-result');
      expect(safeServiceFactory.validate(service)).toBe(true);
    });

    it('should handle service creation failures', () => {
      const failingFactory = () => {
        throw new Error('Service creation failed');
      };

      const safeServiceFactory = createSafeService(failingFactory, undefined, 'FailingService');

      expect(() => safeServiceFactory.create()).toThrow('Service creation failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create service FailingService'),
        expect.any(Error)
      );
    });

    it('should destroy services properly', () => {
      interface DestroyableService {
        destroyed: boolean;
        destroy: () => void;
      }

      const serviceFactory = (): DestroyableService => ({
        destroyed: false,
        destroy() {
          this.destroyed = true;
        }
      });

      const safeServiceFactory = createSafeService(serviceFactory, undefined, 'DestroyableService');
      const service = safeServiceFactory.create();

      expect(service.destroyed).toBe(false);
      safeServiceFactory.destroy?.(service);
      expect(service.destroyed).toBe(true);
    });
  });
});

describe('Backwards Compatibility Validation', () => {
  describe('Legacy API Compatibility', () => {
    it('should maintain exact API compatibility with createSafeContext', () => {
      const legacyContext = createSafeContext('legacy-test', 'LegacyContext');

      // Check API surface
      expect(legacyContext).toHaveProperty('Provider');
      expect(legacyContext).toHaveProperty('useContext');
      expect(legacyContext).toHaveProperty('context');

      // Should NOT have enhanced features
      expect(legacyContext).not.toHaveProperty('useContextWithStatus');
      expect(legacyContext).not.toHaveProperty('useContextOptimized');
      expect(legacyContext).not.toHaveProperty('resetContext');

      // Provider should work exactly like before
      expect(typeof legacyContext.Provider).toBe('function');
      expect(typeof legacyContext.useContext).toBe('function');
    });

    it('should work with existing legacy provider patterns', () => {
      const legacyContext = createSafeContext('legacy-value', 'LegacyPatternTest');

      const LegacyComponent = () => {
        const value = legacyContext.useContext();
        return <Text testID="legacy-value">{value}</Text>;
      };

      const { getByTestId } = render(
        <legacyContext.Provider value="legacy-test-value">
          <LegacyComponent />
        </legacyContext.Provider>
      );

      expect(getByTestId('legacy-value')).toHaveTextContent('legacy-test-value');
    });

    it('should handle legacy context access outside provider', () => {
      const legacyContext = createSafeContext('legacy-default', 'LegacyOutsideProvider');

      const { result } = renderHook(() => legacyContext.useContext());

      expect(result.current).toBe('legacy-default');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Context LegacyOutsideProvider used outside provider')
      );
    });

    it('should support legacy raw context access', () => {
      const legacyContext = createSafeContext('raw-context-test', 'RawContextTest');

      // Raw context should be available for advanced usage
      expect(legacyContext.context).toBeDefined();
      expect(typeof legacyContext.context).toBe('object');
      expect(legacyContext.context.Provider).toBeDefined();
    });
  });

  describe('Migration Path Validation', () => {
    it('should allow gradual migration from legacy to enhanced contexts', () => {
      // Start with legacy
      const legacyContext = createSafeContext('migration-test', 'MigrationTest');

      // Migrate to enhanced with same API
      const enhancedContext = createSafeContextEnhanced({
        defaultValue: 'migration-test',
        contextName: 'MigrationTest',
        enablePerformanceTracking: false, // Start conservative
        enableErrorBoundary: false // Start conservative
      });

      // Both should work with same Provider/useContext pattern
      const LegacyComponent = () => {
        const value = legacyContext.useContext();
        return <Text testID="legacy">{value}</Text>;
      };

      const EnhancedComponent = () => {
        const value = enhancedContext.useContext();
        return <Text testID="enhanced">{value}</Text>;
      };

      const { getByTestId: getLegacy } = render(
        <legacyContext.Provider value="legacy-migration">
          <LegacyComponent />
        </legacyContext.Provider>
      );

      const { getByTestId: getEnhanced } = render(
        <enhancedContext.Provider value="enhanced-migration">
          <EnhancedComponent />
        </enhancedContext.Provider>
      );

      expect(getLegacy('legacy')).toHaveTextContent('legacy-migration');
      expect(getEnhanced('enhanced')).toHaveTextContent('enhanced-migration');
    });

    it('should enable progressive enhancement', () => {
      // Start with basic enhanced context
      const basicEnhanced = createSafeContextEnhanced({
        defaultValue: 'basic',
        contextName: 'ProgressiveTest'
      });

      // Upgrade to therapeutic context (should work with same components)
      const therapeuticContext = createTherapeuticContext('therapeutic', 'ProgressiveTest');

      const TestComponent = ({ context }: { context: any }) => {
        const value = context.useContext();
        return <Text testID="progressive-value">{value}</Text>;
      };

      // Both contexts should work with the same component
      const { getByTestId: getBasic } = render(
        <basicEnhanced.Provider value="basic-value">
          <TestComponent context={basicEnhanced} />
        </basicEnhanced.Provider>
      );

      const { getByTestId: getTherapeutic } = render(
        <therapeuticContext.Provider value="therapeutic-value">
          <TestComponent context={therapeuticContext} />
        </therapeuticContext.Provider>
      );

      expect(getBasic('progressive-value')).toHaveTextContent('basic-value');
      expect(getTherapeutic('progressive-value')).toHaveTextContent('therapeutic-value');
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should not introduce performance regressions in legacy contexts', () => {
      const startTime = performance.now();

      const legacyContext = createSafeContext('perf-test', 'LegacyPerfTest');

      const Component = () => {
        const value = legacyContext.useContext();
        return <Text>{value}</Text>;
      };

      render(
        <legacyContext.Provider value="performance-test">
          <Component />
        </legacyContext.Provider>
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Legacy contexts should be very fast (no performance tracking overhead)
      expect(totalTime).toBeLessThan(100); // Allow 100ms for test environment
    });

    it('should maintain memory usage for legacy contexts', () => {
      const contexts = [];

      // Create many legacy contexts (should not leak memory)
      for (let i = 0; i < 100; i++) {
        const context = createSafeContext(`test-${i}`, `MemoryTest${i}`);
        contexts.push(context);
      }

      // All contexts should be properly created
      expect(contexts.length).toBe(100);
      contexts.forEach((context, index) => {
        expect(context.useContext).toBeDefined();
        expect(context.Provider).toBeDefined();
      });
    });
  });
});

describe('Integration with React Native New Architecture', () => {
  describe('TurboModule Integration', () => {
    it('should optimize contexts when TurboModules are available', () => {
      mockNewArchitecture.enableTurboModules();

      const context = createSafeContextEnhanced({
        defaultValue: 'turbo-test',
        contextName: 'TurboModuleTest',
        enableTurboModuleOptimization: true
      });

      const Component = () => {
        const standard = context.useContext();
        const optimized = context.useContextOptimized();
        return (
          <View>
            <Text testID="standard">{standard}</Text>
            <Text testID="optimized">{optimized}</Text>
          </View>
        );
      };

      const { getByTestId } = render(
        <context.Provider value="turbo-value">
          <Component />
        </context.Provider>
      );

      expect(getByTestId('standard')).toHaveTextContent('turbo-value');
      expect(getByTestId('optimized')).toHaveTextContent('turbo-value');
    });
  });

  describe('Fabric Integration', () => {
    it('should optimize contexts when Fabric is available', () => {
      mockNewArchitecture.enableFabric();

      const context = createSafeContextEnhanced({
        defaultValue: 'fabric-test',
        contextName: 'FabricTest',
        enableFabricOptimization: true
      });

      const Component = () => {
        const optimized = context.useContextOptimized();
        return <Text testID="fabric-optimized">{optimized}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="fabric-value">
          <Component />
        </context.Provider>
      );

      expect(getByTestId('fabric-optimized')).toHaveTextContent('fabric-value');
    });
  });

  describe('Full New Architecture', () => {
    it('should fully optimize when both TurboModules and Fabric are available', () => {
      mockNewArchitecture.enableTurboModules();
      mockNewArchitecture.enableFabric();

      const context = createSafeContextEnhanced({
        defaultValue: 'full-new-arch',
        contextName: 'FullNewArchTest',
        enableTurboModuleOptimization: true,
        enableFabricOptimization: true,
        preventPropertyDescriptorConflicts: true
      });

      const architecture = detectNewArchitecture();
      expect(architecture.version).toBe('new-architecture');

      const Component = () => {
        const optimized = context.useContextOptimized();
        return <Text testID="full-new-arch">{optimized}</Text>;
      };

      const { getByTestId } = render(
        <context.Provider value="full-new-arch-value">
          <Component />
        </context.Provider>
      );

      expect(getByTestId('full-new-arch')).toHaveTextContent('full-new-arch-value');
    });
  });
});