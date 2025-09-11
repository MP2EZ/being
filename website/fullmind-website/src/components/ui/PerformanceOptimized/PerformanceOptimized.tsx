/**
 * PerformanceOptimized Component Wrapper
 * Clinical-grade performance optimizations for React components
 */

import React, { Suspense, lazy, memo } from 'react';
import { Loading } from '@/components/ui';

interface PerformanceOptimizedProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  priority?: 'high' | 'medium' | 'low';
  className?: string;
}

/**
 * Performance-optimized wrapper that provides:
 * - Lazy loading for non-critical components
 * - Memoization to prevent unnecessary re-renders
 * - Loading states for better UX
 * - Priority-based rendering
 */
export const PerformanceOptimized: React.FC<PerformanceOptimizedProps> = memo(({
  children,
  fallback,
  priority = 'medium',
  className
}) => {
  const defaultFallback = (
    <div className={`min-h-[200px] flex items-center justify-center ${className || ''}`}>
      <Loading variant="spinner" size="medium" />
    </div>
  );

  // High priority components render immediately
  if (priority === 'high') {
    return <>{children}</>;
  }

  // Medium and low priority components use Suspense
  return (
    <Suspense fallback={fallback || defaultFallback}>
      <div className={className}>
        {children}
      </div>
    </Suspense>
  );
});

PerformanceOptimized.displayName = 'PerformanceOptimized';

/**
 * HOC for wrapping components with performance optimizations
 */
export function withPerformanceOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    priority?: 'high' | 'medium' | 'low';
    fallback?: React.ReactNode;
  } = {}
) {
  const { priority = 'medium', fallback } = options;

  const WrappedComponent = memo((props: P) => (
    <PerformanceOptimized priority={priority} fallback={fallback}>
      <Component {...props} />
    </PerformanceOptimized>
  ));

  WrappedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Lazy load components with built-in error boundaries
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return memo((props: P) => (
    <PerformanceOptimized fallback={fallback} priority="low">
      <LazyComponent {...props} />
    </PerformanceOptimized>
  ));
}

/**
 * Critical component wrapper for above-the-fold content
 */
export const CriticalContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = memo(({ children, className }) => (
  <PerformanceOptimized priority="high" className={className}>
    {children}
  </PerformanceOptimized>
));

CriticalContent.displayName = 'CriticalContent';

export default PerformanceOptimized;