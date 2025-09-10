/**
 * FullMind Clinical Export Progress Component
 * 
 * Real-time progress indicator for clinical data export operations with
 * therapeutic context and clinical accuracy preservation feedback.
 * 
 * Features:
 * - Real-time progress updates with clinical stage indicators
 * - Time estimation with therapeutic context
 * - Cancellation support with data safety confirmation
 * - Error handling with clinical guidance
 * - Accessibility-optimized progress announcements
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ExportStatus,
  ExportStage,
  ExportError,
  ExportPerformanceMetrics
} from '@/types/clinical-export';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface ExportProgressProps extends BaseComponentProps {
  exportStatus: ExportStatus;
  progressPercentage: number;
  currentStage: ExportStage;
  estimatedTimeRemaining: number;
  performanceMetrics?: ExportPerformanceMetrics;
  onCancel?: () => void;
  onRetry?: () => void;
  onSupport?: () => void;
  errors?: ExportError[];
  warnings?: string[];
  clinicalContext?: {
    dataTypes: string[];
    timeRange: string;
    purpose: string;
  };
  showDetailedProgress?: boolean;
  enableCancellation?: boolean;
  accessibilityAnnouncements?: boolean;
}

// ============================================================================
// PROGRESS STAGE CONFIGURATIONS
// ============================================================================

const EXPORT_STAGES = {
  'initializing': {
    label: 'Initializing Export',
    description: 'Preparing your therapeutic data for secure export',
    icon: '🔄',
    clinicalContext: 'Setting up clinical data validation and privacy safeguards',
    estimatedDuration: 2000, // 2 seconds
    color: 'text-theme-primary'
  },
  'validating-consent': {
    label: 'Validating Consent',
    description: 'Verifying data sharing permissions and privacy settings',
    icon: '🔒',
    clinicalContext: 'Ensuring HIPAA compliance and consent verification',
    estimatedDuration: 3000, // 3 seconds
    color: 'text-clinical-text'
  },
  'collecting-data': {
    label: 'Collecting Clinical Data',
    description: 'Gathering assessment scores, progress data, and session information',
    icon: '📊',
    clinicalContext: 'Retrieving therapeutic data while preserving clinical accuracy',
    estimatedDuration: 15000, // 15 seconds
    color: 'text-theme-primary'
  },
  'validating-clinical-accuracy': {
    label: 'Validating Clinical Accuracy',
    description: 'Ensuring 100% accuracy of assessment scores and therapeutic data',
    icon: '✅',
    clinicalContext: 'PHQ-9/GAD-7 score verification and trend calculation validation',
    estimatedDuration: 8000, // 8 seconds
    color: 'text-theme-success'
  },
  'processing-privacy': {
    label: 'Processing Privacy Settings',
    description: 'Applying anonymization and data minimization according to your preferences',
    icon: '🛡️',
    clinicalContext: 'Implementing privacy protections while maintaining therapeutic value',
    estimatedDuration: 5000, // 5 seconds
    color: 'text-clinical-text'
  },
  'generating-format': {
    label: 'Generating Export Format',
    description: 'Creating your clinical report or data file with professional formatting',
    icon: '📄',
    clinicalContext: 'Applying clinical formatting standards and accessibility features',
    estimatedDuration: 20000, // 20 seconds
    color: 'text-theme-primary'
  },
  'quality-assurance': {
    label: 'Quality Assurance Check',
    description: 'Final validation of export completeness and clinical integrity',
    icon: '🔍',
    clinicalContext: 'Comprehensive review ensuring therapeutic data preservation',
    estimatedDuration: 5000, // 5 seconds
    color: 'text-theme-success'
  },
  'finalizing': {
    label: 'Finalizing Export',
    description: 'Completing export process and preparing for download',
    icon: '✨',
    clinicalContext: 'Generating secure download link and audit trail',
    estimatedDuration: 3000, // 3 seconds
    color: 'text-theme-success'
  },
  'completed': {
    label: 'Export Complete',
    description: 'Your clinical data export is ready for download',
    icon: '🎉',
    clinicalContext: 'Export completed successfully with full clinical validation',
    estimatedDuration: 0,
    color: 'text-theme-success'
  },
  'error': {
    label: 'Export Error',
    description: 'An error occurred during the export process',
    icon: '❌',
    clinicalContext: 'Export failed - your therapeutic data remains secure and unchanged',
    estimatedDuration: 0,
    color: 'text-crisis-text'
  },
  'cancelled': {
    label: 'Export Cancelled',
    description: 'Export process was cancelled by user request',
    icon: '⏹️',
    clinicalContext: 'Export safely cancelled - no data was exported or compromised',
    estimatedDuration: 0,
    color: 'text-text-secondary'
  }
} as const;

const STATUS_CONFIGURATIONS = {
  'pending': {
    color: 'text-text-secondary',
    bgColor: 'bg-surface-depressed',
    borderColor: 'border-border-primary'
  },
  'running': {
    color: 'text-theme-primary',
    bgColor: 'bg-theme-primary/5',
    borderColor: 'border-theme-primary'
  },
  'completed': {
    color: 'text-theme-success',
    bgColor: 'bg-theme-success/5',
    borderColor: 'border-theme-success'
  },
  'error': {
    color: 'text-crisis-text',
    bgColor: 'bg-crisis-bg/5',
    borderColor: 'border-crisis-border'
  },
  'cancelled': {
    color: 'text-text-secondary',
    bgColor: 'bg-surface-depressed',
    borderColor: 'border-border-secondary'
  }
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatTimeRemaining(milliseconds: number): string {
  if (milliseconds <= 0) return 'Completing...';
  
  const seconds = Math.ceil(milliseconds / 1000);
  
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
}

function formatDataSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  
  return `${size} ${sizes[i]}`;
}

function formatPerformanceMetric(value: number, unit: string): string {
  if (unit === 'ms') {
    return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
  }
  if (unit === 'bytes') {
    return formatDataSize(value);
  }
  if (unit === 'rate') {
    return `${value.toFixed(1)}/sec`;
  }
  return `${value} ${unit}`;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExportProgress({
  exportStatus,
  progressPercentage,
  currentStage,
  estimatedTimeRemaining,
  performanceMetrics,
  onCancel,
  onRetry,
  onSupport,
  errors = [],
  warnings = [],
  clinicalContext,
  showDetailedProgress = true,
  enableCancellation = true,
  accessibilityAnnouncements = true,
  className,
  'data-testid': testId,
  ...props
}: ExportProgressProps) {
  const { colors, isDark, themeColors } = useTheme();
  
  // State for user interactions
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [lastAnnouncedProgress, setLastAnnouncedProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Current stage configuration
  const stageConfig = EXPORT_STAGES[currentStage] || EXPORT_STAGES.initializing;
  const statusConfig = STATUS_CONFIGURATIONS[exportStatus] || STATUS_CONFIGURATIONS.pending;

  // Progress calculation with smooth animation
  const displayProgress = useMemo(() => {
    return Math.min(Math.max(progressPercentage, 0), 100);
  }, [progressPercentage]);

  // Accessibility announcements for progress changes
  useEffect(() => {
    if (!accessibilityAnnouncements) return;

    const progressDiff = Math.abs(progressPercentage - lastAnnouncedProgress);
    const shouldAnnounce = progressDiff >= 10 || exportStatus === 'completed' || exportStatus === 'error';

    if (shouldAnnounce) {
      const announcement = exportStatus === 'completed' 
        ? 'Export completed successfully'
        : exportStatus === 'error'
        ? 'Export failed, please review errors'
        : `Export progress: ${Math.round(progressPercentage)}% complete, ${stageConfig.label}`;

      // Create live region announcement
      const announcement_element = document.createElement('div');
      announcement_element.setAttribute('aria-live', 'polite');
      announcement_element.setAttribute('aria-atomic', 'true');
      announcement_element.className = 'sr-only';
      announcement_element.textContent = announcement;
      
      document.body.appendChild(announcement_element);
      setTimeout(() => document.body.removeChild(announcement_element), 1000);
      
      setLastAnnouncedProgress(progressPercentage);
    }
  }, [progressPercentage, exportStatus, currentStage, accessibilityAnnouncements, lastAnnouncedProgress, stageConfig.label]);

  // Animation trigger for progress changes
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [currentStage, exportStatus]);

  // Handle cancellation with confirmation
  const handleCancelRequest = useCallback(() => {
    if (exportStatus === 'completed' || exportStatus === 'error') return;
    setShowCancelConfirmation(true);
  }, [exportStatus]);

  const handleCancelConfirm = useCallback(() => {
    setShowCancelConfirmation(false);
    onCancel?.();
  }, [onCancel]);

  const handleCancelCancel = useCallback(() => {
    setShowCancelConfirmation(false);
  }, []);

  // Calculate overall progress color
  const progressColor = useMemo(() => {
    if (exportStatus === 'error') return 'bg-crisis-bg';
    if (exportStatus === 'completed') return 'bg-theme-success';
    if (exportStatus === 'cancelled') return 'bg-text-secondary';
    return 'bg-theme-primary';
  }, [exportStatus]);

  return (
    <div
      className={cn(
        'export-progress w-full max-w-2xl mx-auto',
        'bg-bg-primary rounded-xl border',
        statusConfig.borderColor,
        'shadow-medium overflow-hidden',
        className
      )}
      data-testid={testId}
      role="region"
      aria-label="Export progress"
      {...props}
    >
      {/* Header */}
      <div className={cn('px-6 py-4 border-b border-border-primary', statusConfig.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full text-lg',
                statusConfig.bgColor,
                isAnimating ? 'animate-pulse' : ''
              )}
              role="img"
              aria-label={stageConfig.label}
            >
              {stageConfig.icon}
            </div>
            <div>
              <Typography variant="h6" className={cn('font-medium', statusConfig.color)}>
                {stageConfig.label}
              </Typography>
              <Typography variant="body2" className="text-text-secondary">
                {stageConfig.description}
              </Typography>
            </div>
          </div>
          
          {/* Progress Percentage */}
          <div className="text-right">
            <Typography variant="h4" className={cn('font-bold', statusConfig.color)}>
              {Math.round(displayProgress)}%
            </Typography>
            <Typography variant="caption" className="text-text-tertiary">
              {exportStatus === 'running' ? formatTimeRemaining(estimatedTimeRemaining) : 'Complete'}
            </Typography>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <div className="relative">
          {/* Progress Track */}
          <div 
            className="w-full h-3 bg-surface-depressed rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={displayProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Export progress: ${Math.round(displayProgress)}%`}
          >
            {/* Progress Fill */}
            <div
              className={cn(
                'h-full transition-all duration-500 ease-out',
                progressColor,
                exportStatus === 'running' ? 'animate-pulse' : ''
              )}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          
          {/* Progress Labels */}
          <div className="flex justify-between text-xs text-text-tertiary mt-2">
            <span>0%</span>
            <span className={statusConfig.color}>
              {exportStatus === 'completed' ? 'Complete' : `${Math.round(displayProgress)}%`}
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Clinical Context */}
      {showDetailedProgress && (
        <div className="px-6 py-4 border-t border-border-primary bg-clinical-bg/5">
          <Typography variant="caption" className="text-clinical-text font-medium mb-2 block">
            Clinical Processing:
          </Typography>
          <Typography variant="body2" className="text-text-secondary">
            {stageConfig.clinicalContext}
          </Typography>
          
          {clinicalContext && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="font-medium text-text-primary">Data Types:</span>
                <span className="text-text-secondary ml-1">
                  {clinicalContext.dataTypes.join(', ')}
                </span>
              </div>
              <div>
                <span className="font-medium text-text-primary">Time Range:</span>
                <span className="text-text-secondary ml-1">
                  {clinicalContext.timeRange}
                </span>
              </div>
              <div>
                <span className="font-medium text-text-primary">Purpose:</span>
                <span className="text-text-secondary ml-1">
                  {clinicalContext.purpose}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Metrics */}
      {showDetailedProgress && performanceMetrics && (
        <div className="px-6 py-4 border-t border-border-primary">
          <Typography variant="caption" className="text-text-secondary font-medium mb-3 block">
            Performance Metrics:
          </Typography>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-text-primary">Processing Time</div>
              <div className="text-text-secondary">
                {formatPerformanceMetric(performanceMetrics.processingTime, 'ms')}
              </div>
            </div>
            <div>
              <div className="font-medium text-text-primary">Memory Usage</div>
              <div className="text-text-secondary">
                {formatPerformanceMetric(performanceMetrics.memoryPeak, 'bytes')}
              </div>
            </div>
            <div>
              <div className="font-medium text-text-primary">Records Processed</div>
              <div className="text-text-secondary">
                {performanceMetrics.recordsProcessed.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="font-medium text-text-primary">Throughput</div>
              <div className="text-text-secondary">
                {formatPerformanceMetric(performanceMetrics.throughput, 'rate')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-6 py-4 border-t border-border-primary bg-clinical-bg/5">
          <Typography variant="caption" className="text-clinical-text font-medium mb-2 block">
            Processing Warnings:
          </Typography>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <span className="text-clinical-text mt-0.5">⚠️</span>
                <span className="text-text-secondary">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="px-6 py-4 border-t border-border-primary bg-crisis-bg/5">
          <Typography variant="caption" className="text-crisis-text font-medium mb-2 block">
            Export Errors:
          </Typography>
          <div className="space-y-3">
            {errors.map((error, index) => (
              <div key={index} className="border border-crisis-border rounded-md p-3">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-crisis-text mt-0.5">❌</span>
                  <div className="flex-1">
                    <Typography variant="body2" className="text-crisis-text font-medium">
                      {error.message}
                    </Typography>
                    {error.userMessage && (
                      <Typography variant="body2" className="text-text-secondary mt-1">
                        {error.userMessage}
                      </Typography>
                    )}
                  </div>
                </div>
                
                {error.recoverySuggestions && error.recoverySuggestions.length > 0 && (
                  <div className="mt-2 pl-6">
                    <Typography variant="caption" className="text-crisis-text font-medium">
                      Suggested Solutions:
                    </Typography>
                    <ul className="list-disc list-inside mt-1 text-sm text-text-secondary">
                      {error.recoverySuggestions.map((suggestion, suggestionIndex) => (
                        <li key={suggestionIndex}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-border-primary bg-bg-secondary flex justify-between items-center">
        <div className="text-sm text-text-tertiary">
          {exportStatus === 'running' && (
            <span>
              Processing therapeutic data with clinical-grade accuracy...
            </span>
          )}
          {exportStatus === 'completed' && (
            <span className="text-theme-success">
              ✅ Export completed successfully with full validation
            </span>
          )}
          {exportStatus === 'error' && (
            <span className="text-crisis-text">
              Export failed - your data remains secure
            </span>
          )}
          {exportStatus === 'cancelled' && (
            <span>
              Export cancelled safely - no data was exported
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {/* Support Button */}
          {(exportStatus === 'error' || errors.length > 0) && onSupport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSupport}
              className="min-w-[80px]"
            >
              Get Help
            </Button>
          )}

          {/* Retry Button */}
          {exportStatus === 'error' && onRetry && (
            <Button
              variant="primary"
              size="sm"
              onClick={onRetry}
              className="min-w-[80px]"
            >
              Retry
            </Button>
          )}

          {/* Cancel Button */}
          {exportStatus === 'running' && enableCancellation && onCancel && !showCancelConfirmation && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelRequest}
              className="min-w-[80px] border-crisis-border text-crisis-text hover:bg-crisis-bg/10"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirmation && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-bg-primary rounded-lg border border-border-primary shadow-strong max-w-md w-full">
            <div className="p-6">
              <Typography variant="h6" className="font-medium mb-2">
                Cancel Export Process?
              </Typography>
              <Typography variant="body2" className="text-text-secondary mb-4">
                Are you sure you want to cancel the export? Your therapeutic data will remain secure and unchanged,
                but you'll need to restart the export process if you want to try again.
              </Typography>
              
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelCancel}
                  className="min-w-[80px]"
                >
                  Continue Export
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCancelConfirm}
                  className="min-w-[80px] bg-crisis-bg hover:bg-crisis-hover text-white"
                >
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}