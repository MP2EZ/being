/**
 * FullMind Performance Dashboard
 * Clinical-grade performance monitoring component
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  getClinicalPerformanceMonitor, 
  initializeClinicalPerformanceMonitor,
  type ClinicalPerformanceMetrics 
} from '@/lib/performance';

interface PerformanceDashboardProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export default function PerformanceDashboard({
  enabled = typeof window !== 'undefined' && window.location.hostname === 'localhost',
  position = 'bottom-right',
  className = '',
}: PerformanceDashboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<Partial<ClinicalPerformanceMetrics>>({});
  const [budgetStatus, setBudgetStatus] = useState<any[]>([]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let monitor = getClinicalPerformanceMonitor();
    if (!monitor) {
      monitor = initializeClinicalPerformanceMonitor();
    }

    // Update metrics every second
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
      setBudgetStatus(monitor.getBudgetStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const getPositionClasses = () => {
    const base = 'fixed z-50';
    switch (position) {
      case 'top-left':
        return `${base} top-4 left-4`;
      case 'top-right':
        return `${base} top-4 right-4`;
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'bottom-right':
        return `${base} bottom-4 right-4`;
      default:
        return `${base} bottom-4 right-4`;
    }
  };

  const getStatusColor = (status: 'pass' | 'warn' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'fail':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (time: number | undefined) => {
    if (!time) return 'N/A';
    return time < 1000 ? `${Math.round(time)}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const formatMemory = (memory: number | undefined) => {
    if (!memory) return 'N/A';
    return `${Math.round(memory)}MB`;
  };

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Toggle performance dashboard"
      >
        📊 Perf
      </button>

      {/* Dashboard Panel */}
      {isVisible && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Clinical Performance
            </h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close dashboard"
            >
              ✕
            </button>
          </div>

          {/* Performance Budget Status */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Budget Status
            </h4>
            <div className="space-y-2">
              {budgetStatus.map((item) => (
                <div key={item.metric} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.metric}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-800">
                      {item.metric === 'CLS' ? item.actual : formatTime(item.actual)}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(item.status)}`}
                    >
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Core Web Vitals */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Core Web Vitals
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-500 mb-1">LCP</div>
                <div className="text-sm font-medium">
                  {formatTime(metrics.lcp)}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-500 mb-1">FID</div>
                <div className="text-sm font-medium">
                  {formatTime(metrics.fid)}
                </div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-xs text-gray-500 mb-1">CLS</div>
                <div className="text-sm font-medium">
                  {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Clinical Metrics */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Clinical Metrics
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Crisis Response</span>
                <span className="text-sm font-medium">
                  {formatTime(metrics.crisisButtonResponseTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Page Load</span>
                <span className="text-sm font-medium">
                  {formatTime(metrics.pageLoadTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Navigation</span>
                <span className="text-sm font-medium">
                  {formatTime(metrics.navigationTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Accessibility Status */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Accessibility
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Screen Reader</span>
                <span className={`text-sm font-medium ${
                  metrics.screenReaderCompatibility ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics.screenReaderCompatibility ? '✓ Compatible' : '✗ Issues'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Focus Indicators</span>
                <span className={`text-sm font-medium ${
                  metrics.focusIndicatorVisibility ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics.focusIndicatorVisibility ? '✓ Visible' : '✗ Hidden'}
                </span>
              </div>
            </div>
          </div>

          {/* Resource Usage */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Resource Usage
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Memory</span>
                <span className="text-sm font-medium">
                  {formatMemory(metrics.memoryUsage)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Battery Impact</span>
                <span className={`text-sm font-medium ${
                  metrics.batteryImpact === 'low' ? 'text-green-600' :
                  metrics.batteryImpact === 'medium' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {metrics.batteryImpact || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Errors</span>
                <span className={`text-sm font-medium ${
                  (metrics.errorCount || 0) === 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics.errorCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Session: {formatTime(metrics.sessionDuration)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { PerformanceDashboard };
export type { PerformanceDashboardProps };