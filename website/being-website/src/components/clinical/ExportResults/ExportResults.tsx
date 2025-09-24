/**
 * Being. Clinical Export Results Component
 * 
 * Export completion interface with secure sharing options and therapeutic guidance.
 * Provides file information, sharing recommendations, security warnings, and
 * follow-up actions for healthcare provider collaboration.
 * 
 * Features:
 * - File metadata with clinical accuracy confirmation
 * - Secure sharing options with therapeutic context
 * - Privacy protection reminders and best practices
 * - Follow-up actions for provider collaboration
 * - Download management with security considerations
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ExportResult,
  SharingConfiguration,
  SharingMethod,
  ExportMetadata,
  ClinicalValidation
} from '@/types/clinical-export';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface ExportResultsProps extends BaseComponentProps {
  exportResult: ExportResult;
  sharingOptions: SharingConfiguration;
  onShare: (method: SharingMethod) => Promise<void>;
  onDownload: () => Promise<void>;
  onDeleteFile?: () => Promise<void>;
  onNewExport?: () => void;
  clinicalContext?: {
    purpose: string;
    dataTypes: string[];
    dateRange: string;
  };
  showAdvancedOptions?: boolean;
  enableSecurityWarnings?: boolean;
  showFollowUpActions?: boolean;
}

interface ShareModalState {
  isOpen: boolean;
  selectedMethod: SharingMethod | null;
  isSharing: boolean;
  shareError: string | null;
}

interface SecurityCheckState {
  hasReadSecurityGuidance: boolean;
  hasConfirmedSecureDevice: boolean;
  hasConfirmedRecipient: boolean;
  minimumReadingTime: number;
  readingStartTime: number | null;
}

// ============================================================================
// SHARING CONFIGURATIONS
// ============================================================================

const SHARING_METHODS = {
  'secure-email': {
    name: 'Secure Email',
    description: 'Send encrypted link via email to healthcare provider',
    icon: '📧',
    security: 'high',
    requirements: ['Recipient email verification', 'Password protection', 'Link expiration'],
    bestFor: 'Healthcare providers with secure email systems',
    guidance: 'Most secure option for sharing with licensed professionals',
    therapeuticContext: 'Ideal for ongoing therapeutic relationships and clinical consultations'
  },
  'secure-link': {
    name: 'Secure Download Link',
    description: 'Generate password-protected download link',
    icon: '🔗',
    security: 'medium',
    requirements: ['Password protection', 'Link expiration', 'Access logging'],
    bestFor: 'Temporary sharing with trusted individuals',
    guidance: 'Share password separately from link for added security',
    therapeuticContext: 'Good for one-time consultations or second opinions'
  },
  'device-transfer': {
    name: 'Device Transfer',
    description: 'Save securely to your device for manual sharing',
    icon: '📱',
    security: 'medium',
    requirements: ['Device encryption', 'Secure storage', 'Manual handling'],
    bestFor: 'In-person consultations and personal records',
    guidance: 'Ensure your device is encrypted and password-protected',
    therapeuticContext: 'Perfect for bringing to therapy appointments or medical visits'
  },
  'print-secure': {
    name: 'Secure Print',
    description: 'Print for physical sharing with healthcare providers',
    icon: '🖨️',
    security: 'low',
    requirements: ['Secure printer', 'Physical document security', 'Proper disposal'],
    bestFor: 'Providers who prefer physical documents',
    guidance: 'Use a private printer and handle physical copies carefully',
    therapeuticContext: 'Some healthcare providers prefer paper records for clinical notes'
  }
} as const;

const FOLLOW_UP_ACTIONS = [
  {
    id: 'schedule-appointment',
    title: 'Schedule Provider Appointment',
    description: 'Book a follow-up appointment to discuss your therapeutic data',
    icon: '📅',
    guidance: 'Sharing your data works best when combined with professional consultation',
    mbctPrinciple: 'Present-moment planning supports your therapeutic journey'
  },
  {
    id: 'prepare-questions',
    title: 'Prepare Discussion Questions',
    description: 'Create a list of questions about your progress and treatment',
    icon: '❓',
    guidance: 'Having specific questions helps maximize the value of your consultation',
    mbctPrinciple: 'Mindful preparation enhances therapeutic communication'
  },
  {
    id: 'continue-practices',
    title: 'Continue MBCT Practices',
    description: 'Keep engaging with mindfulness exercises while awaiting feedback',
    icon: '🧘',
    guidance: 'Consistent practice maintains your therapeutic momentum',
    mbctPrinciple: 'Regular mindfulness practice is the foundation of sustained wellbeing'
  },
  {
    id: 'track-changes',
    title: 'Monitor New Developments',
    description: 'Keep tracking mood and progress after sharing your data',
    icon: '📈',
    guidance: 'Continued data collection helps show how you respond to professional input',
    mbctPrinciple: 'Ongoing awareness supports adaptive treatment planning'
  }
] as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  
  return `${size} ${sizes[i]}`;
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function getValidationStatusIcon(isValid: boolean, critical: boolean = false): string {
  if (critical) {
    return isValid ? '🛡️' : '⚠️';
  }
  return isValid ? '✅' : '❌';
}

function getValidationStatusColor(isValid: boolean, critical: boolean = false): string {
  if (critical) {
    return isValid ? 'text-clinical-safe' : 'text-crisis-text';
  }
  return isValid ? 'text-theme-success' : 'text-crisis-text';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExportResults({
  exportResult,
  sharingOptions,
  onShare,
  onDownload,
  onDeleteFile,
  onNewExport,
  clinicalContext,
  showAdvancedOptions = true,
  enableSecurityWarnings = true,
  showFollowUpActions = true,
  className,
  'data-testid': testId,
  ...props
}: ExportResultsProps) {
  const { colors, isDark, themeColors } = useTheme();

  // Component state
  const [shareModal, setShareModal] = useState<ShareModalState>({
    isOpen: false,
    selectedMethod: null,
    isSharing: false,
    shareError: null
  });

  const [securityCheck, setSecurityCheck] = useState<SecurityCheckState>({
    hasReadSecurityGuidance: false,
    hasConfirmedSecureDevice: false,
    hasConfirmedRecipient: false,
    minimumReadingTime: 10000, // 10 seconds
    readingStartTime: null
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFollowUpActions, setSelectedFollowUpActions] = useState<Set<string>>(new Set());

  // Export result analysis
  const isExportValid = useMemo(() => {
    return exportResult.validation.valid && 
           exportResult.validation.clinicalAccuracy &&
           exportResult.validation.dataIntegrity &&
           exportResult.validation.privacyCompliance;
  }, [exportResult.validation]);

  const criticalIssues = useMemo(() => {
    const issues: string[] = [];
    
    if (!exportResult.validation.clinicalAccuracy) {
      issues.push('Clinical accuracy validation failed');
    }
    if (!exportResult.validation.dataIntegrity) {
      issues.push('Data integrity issues detected');
    }
    if (!exportResult.validation.privacyCompliance) {
      issues.push('Privacy compliance concerns');
    }
    
    return issues;
  }, [exportResult.validation]);

  // Security reading timer
  useEffect(() => {
    if (shareModal.isOpen && !securityCheck.readingStartTime) {
      setSecurityCheck(prev => ({ ...prev, readingStartTime: Date.now() }));
    }
  }, [shareModal.isOpen, securityCheck.readingStartTime]);

  const hasSpentEnoughTimeReading = useMemo(() => {
    if (!securityCheck.readingStartTime) return false;
    return Date.now() - securityCheck.readingStartTime >= securityCheck.minimumReadingTime;
  }, [securityCheck.readingStartTime, securityCheck.minimumReadingTime]);

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!isExportValid) {
      alert('Cannot download: Export has validation issues. Please contact support.');
      return;
    }

    setIsDownloading(true);
    try {
      await onDownload();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again or contact support.');
    } finally {
      setIsDownloading(false);
    }
  }, [isExportValid, onDownload]);

  // Handle sharing initiation
  const handleShareClick = useCallback((method: SharingMethod) => {
    setShareModal({
      isOpen: true,
      selectedMethod: method,
      isSharing: false,
      shareError: null
    });
    
    setSecurityCheck(prev => ({
      ...prev,
      hasReadSecurityGuidance: false,
      hasConfirmedSecureDevice: false,
      hasConfirmedRecipient: false,
      readingStartTime: Date.now()
    }));
  }, []);

  // Handle sharing confirmation
  const handleShareConfirm = useCallback(async () => {
    if (!shareModal.selectedMethod) return;

    const allChecksComplete = securityCheck.hasReadSecurityGuidance &&
                             securityCheck.hasConfirmedSecureDevice &&
                             securityCheck.hasConfirmedRecipient &&
                             hasSpentEnoughTimeReading;

    if (!allChecksComplete) {
      alert('Please complete all security confirmations before sharing.');
      return;
    }

    setShareModal(prev => ({ ...prev, isSharing: true, shareError: null }));
    
    try {
      await onShare(shareModal.selectedMethod);
      setShareModal({ isOpen: false, selectedMethod: null, isSharing: false, shareError: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sharing failed. Please try again.';
      setShareModal(prev => ({ ...prev, isSharing: false, shareError: errorMessage }));
    }
  }, [shareModal.selectedMethod, securityCheck, hasSpentEnoughTimeReading, onShare]);

  // Handle follow-up action toggle
  const handleFollowUpToggle = useCallback((actionId: string) => {
    setSelectedFollowUpActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  }, []);

  return (
    <div
      className={cn(
        'export-results w-full max-w-4xl mx-auto',
        'bg-bg-primary rounded-xl border border-border-primary',
        'shadow-medium overflow-hidden',
        className
      )}
      data-testid={testId}
      {...props}
    >
      {/* Header with Validation Status */}
      <div className={cn(
        'px-6 py-4 border-b border-border-primary',
        isExportValid ? 'bg-theme-success/5' : 'bg-crisis-bg/5'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full text-2xl',
                isExportValid ? 'bg-theme-success/10' : 'bg-crisis-bg/10'
              )}
            >
              {isExportValid ? '🎉' : '⚠️'}
            </div>
            <div>
              <Typography variant="h5" className={cn(
                'font-medium',
                isExportValid ? 'text-theme-success' : 'text-crisis-text'
              )}>
                {isExportValid ? 'Export Completed Successfully' : 'Export Completed with Issues'}
              </Typography>
              <Typography variant="body2" className="text-text-secondary">
                {isExportValid 
                  ? 'Your clinical data export is ready for secure sharing'
                  : 'Please review the issues below before sharing'
                }
              </Typography>
            </div>
          </div>
          
          <div className="text-right">
            <Typography variant="h6" className="font-medium">
              {formatFileSize(exportResult.metadata.fileSize || 0)}
            </Typography>
            <Typography variant="caption" className="text-text-tertiary">
              {exportResult.format.type.toUpperCase()} File
            </Typography>
          </div>
        </div>
      </div>

      {/* Critical Issues Warning */}
      {criticalIssues.length > 0 && (
        <div className="border-b border-border-primary bg-crisis-bg/5 px-6 py-4">
          <Typography variant="h6" className="text-crisis-text font-medium mb-2">
            Critical Issues Detected
          </Typography>
          <ul className="list-disc list-inside space-y-1 text-sm text-crisis-text">
            {criticalIssues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
          <Typography variant="body2" className="text-text-secondary mt-2">
            Please contact support before sharing this export. Your data may not be clinically accurate.
          </Typography>
        </div>
      )}

      {/* Export Information */}
      <div className="p-6 space-y-6">
        {/* File Details */}
        <div className="border border-border-primary rounded-lg p-6">
          <Typography variant="h6" className="font-medium mb-4">
            Export Details
          </Typography>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <Typography variant="caption" className="text-text-secondary">
                  Export ID
                </Typography>
                <Typography variant="body2" className="font-mono text-text-primary">
                  {exportResult.exportId}
                </Typography>
              </div>
              
              <div>
                <Typography variant="caption" className="text-text-secondary">
                  Created
                </Typography>
                <Typography variant="body2" className="text-text-primary">
                  {new Date(exportResult.metadata.createdAt).toLocaleString()}
                </Typography>
              </div>
              
              <div>
                <Typography variant="caption" className="text-text-secondary">
                  Processing Time
                </Typography>
                <Typography variant="body2" className="text-text-primary">
                  {formatDuration(exportResult.performance?.processingTime || 0)}
                </Typography>
              </div>
            </div>
            
            <div className="space-y-3">
              {clinicalContext && (
                <>
                  <div>
                    <Typography variant="caption" className="text-text-secondary">
                      Purpose
                    </Typography>
                    <Typography variant="body2" className="text-text-primary">
                      {clinicalContext.purpose}
                    </Typography>
                  </div>
                  
                  <div>
                    <Typography variant="caption" className="text-text-secondary">
                      Data Types
                    </Typography>
                    <Typography variant="body2" className="text-text-primary">
                      {clinicalContext.dataTypes.join(', ')}
                    </Typography>
                  </div>
                  
                  <div>
                    <Typography variant="caption" className="text-text-secondary">
                      Date Range
                    </Typography>
                    <Typography variant="body2" className="text-text-primary">
                      {clinicalContext.dateRange}
                    </Typography>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Validation Results */}
        <div className="border border-border-primary rounded-lg p-6">
          <Typography variant="h6" className="font-medium mb-4">
            Clinical Validation Results
          </Typography>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span>{getValidationStatusIcon(exportResult.validation.clinicalAccuracy, true)}</span>
                <Typography variant="body2" className={getValidationStatusColor(exportResult.validation.clinicalAccuracy, true)}>
                  Clinical Accuracy
                </Typography>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{getValidationStatusIcon(exportResult.validation.dataIntegrity)}</span>
                <Typography variant="body2" className={getValidationStatusColor(exportResult.validation.dataIntegrity)}>
                  Data Integrity
                </Typography>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span>{getValidationStatusIcon(exportResult.validation.privacyCompliance, true)}</span>
                <Typography variant="body2" className={getValidationStatusColor(exportResult.validation.privacyCompliance, true)}>
                  Privacy Compliance
                </Typography>
              </div>
              
              <div className="flex items-center gap-2">
                <span>{getValidationStatusIcon(exportResult.validation.formatValidation?.valid || false)}</span>
                <Typography variant="body2" className={getValidationStatusColor(exportResult.validation.formatValidation?.valid || false)}>
                  Format Validation
                </Typography>
              </div>
            </div>
          </div>
          
          {showAdvancedOptions && exportResult.performance && (
            <div className="mt-4 pt-4 border-t border-border-primary">
              <Typography variant="caption" className="text-text-secondary mb-2 block">
                Performance Metrics:
              </Typography>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-text-primary">Records</div>
                  <div className="text-text-secondary">
                    {exportResult.performance.recordsProcessed.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-text-primary">Memory</div>
                  <div className="text-text-secondary">
                    {formatFileSize(exportResult.performance.memoryPeak)}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-text-primary">Accuracy</div>
                  <div className="text-text-secondary">
                    {((1 - exportResult.performance.errorRate) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium text-text-primary">Throughput</div>
                  <div className="text-text-secondary">
                    {exportResult.performance.throughput.toFixed(1)}/sec
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sharing Options */}
        {isExportValid && (
          <div className="border border-border-primary rounded-lg p-6">
            <Typography variant="h6" className="font-medium mb-4">
              Secure Sharing Options
            </Typography>
            
            <Typography variant="body2" className="text-text-secondary mb-4">
              Choose how you'd like to share your therapeutic data. Each method has different security considerations.
            </Typography>
            
            <div className="grid md:grid-cols-2 gap-4">
              {Object.entries(SHARING_METHODS).map(([method, config]) => (
                <button
                  key={method}
                  onClick={() => handleShareClick(method as SharingMethod)}
                  className="p-4 text-left border border-border-primary rounded-lg hover:border-border-secondary hover:bg-surface-hover transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl" role="img" aria-hidden="true">
                      {config.icon}
                    </span>
                    <Typography variant="h6" className="font-medium">
                      {config.name}
                    </Typography>
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        config.security === 'high'
                          ? 'bg-theme-success/10 text-theme-success'
                          : config.security === 'medium'
                          ? 'bg-theme-primary/10 text-theme-primary'
                          : 'bg-crisis-bg/10 text-crisis-text'
                      )}
                    >
                      {config.security.toUpperCase()} SECURITY
                    </span>
                  </div>
                  
                  <Typography variant="body2" className="text-text-secondary mb-2">
                    {config.description}
                  </Typography>
                  
                  <Typography variant="caption" className="text-text-tertiary">
                    Best for: {config.bestFor}
                  </Typography>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Download Option */}
        <div className="border border-border-primary rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h6" className="font-medium mb-2">
                Download to Device
              </Typography>
              <Typography variant="body2" className="text-text-secondary">
                Save the export file to your device for manual sharing or personal records.
              </Typography>
            </div>
            
            <Button
              variant="primary"
              onClick={handleDownload}
              disabled={!isExportValid || isDownloading}
              loading={isDownloading}
              className="min-w-[120px]"
            >
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </div>
          
          {enableSecurityWarnings && (
            <div className="mt-4 p-3 bg-clinical-bg/5 border border-clinical-border rounded-md">
              <Typography variant="caption" className="text-clinical-text font-medium">
                Security Reminder:
              </Typography>
              <Typography variant="body2" className="text-text-secondary mt-1">
                Ensure your device is encrypted and password-protected. Store the file securely and delete it when no longer needed.
              </Typography>
            </div>
          )}
        </div>

        {/* Follow-up Actions */}
        {showFollowUpActions && isExportValid && (
          <div className="border border-border-primary rounded-lg p-6">
            <Typography variant="h6" className="font-medium mb-4">
              Recommended Next Steps
            </Typography>
            
            <Typography variant="body2" className="text-text-secondary mb-4">
              Consider these actions to maximize the therapeutic benefit of sharing your data:
            </Typography>
            
            <div className="space-y-3">
              {FOLLOW_UP_ACTIONS.map((action) => (
                <label key={action.id} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFollowUpActions.has(action.id)}
                    onChange={() => handleFollowUpToggle(action.id)}
                    className="mt-1 w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg" role="img" aria-hidden="true">
                        {action.icon}
                      </span>
                      <Typography variant="body2" className="font-medium">
                        {action.title}
                      </Typography>
                    </div>
                    <Typography variant="body2" className="text-text-secondary mb-2">
                      {action.description}
                    </Typography>
                    <div className="bg-clinical-bg/5 rounded-md p-2">
                      <Typography variant="caption" className="text-clinical-text font-medium">
                        MBCT Principle:
                      </Typography>
                      <Typography variant="caption" className="text-text-secondary ml-1">
                        {action.mbctPrinciple}
                      </Typography>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="border-t border-border-primary bg-bg-secondary px-6 py-4 flex justify-between items-center">
        <div className="flex gap-3">
          {onDeleteFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteFile}
              className="border-crisis-border text-crisis-text hover:bg-crisis-bg/10"
            >
              Delete File
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          {onNewExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNewExport}
            >
              New Export
            </Button>
          )}
          
          <Typography variant="caption" className="text-text-tertiary py-2">
            Export will be available for 30 days
          </Typography>
        </div>
      </div>

      {/* Sharing Modal */}
      {shareModal.isOpen && shareModal.selectedMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-bg-primary rounded-lg border border-border-primary shadow-strong max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-border-primary px-6 py-4">
              <div className="flex items-center justify-between">
                <Typography variant="h6" className="font-medium">
                  Share via {SHARING_METHODS[shareModal.selectedMethod].name}
                </Typography>
                <button
                  onClick={() => setShareModal({ isOpen: false, selectedMethod: null, isSharing: false, shareError: null })}
                  className="text-text-secondary hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Security Guidance */}
              <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-4">
                <Typography variant="h6" className="text-clinical-text font-medium mb-3">
                  Security Guidelines
                </Typography>
                
                <div className="space-y-3">
                  <Typography variant="body2" className="text-text-secondary">
                    {SHARING_METHODS[shareModal.selectedMethod].guidance}
                  </Typography>
                  
                  <div>
                    <Typography variant="caption" className="text-clinical-text font-medium">
                      Security Requirements:
                    </Typography>
                    <ul className="list-disc list-inside mt-1 text-sm text-text-secondary">
                      {SHARING_METHODS[shareModal.selectedMethod].requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-bg-secondary rounded-md p-3">
                    <Typography variant="caption" className="text-clinical-text font-medium">
                      Therapeutic Context:
                    </Typography>
                    <Typography variant="body2" className="text-text-secondary mt-1">
                      {SHARING_METHODS[shareModal.selectedMethod].therapeuticContext}
                    </Typography>
                  </div>
                </div>
              </div>

              {/* Security Confirmations */}
              <div className="space-y-4">
                <Typography variant="h6" className="font-medium">
                  Security Confirmations
                </Typography>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityCheck.hasReadSecurityGuidance}
                    onChange={(e) => setSecurityCheck(prev => ({ ...prev, hasReadSecurityGuidance: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-clinical-safe border-border-primary rounded focus:ring-clinical-safe/50"
                  />
                  <div>
                    <Typography variant="body2" className="font-medium">
                      I have read and understood the security guidelines
                    </Typography>
                    <Typography variant="caption" className="text-text-secondary">
                      Please take time to review the security requirements for this sharing method
                    </Typography>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityCheck.hasConfirmedSecureDevice}
                    onChange={(e) => setSecurityCheck(prev => ({ ...prev, hasConfirmedSecureDevice: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-clinical-safe border-border-primary rounded focus:ring-clinical-safe/50"
                  />
                  <div>
                    <Typography variant="body2" className="font-medium">
                      I confirm my device and connection are secure
                    </Typography>
                    <Typography variant="caption" className="text-text-secondary">
                      Ensure you're using a trusted device and secure internet connection
                    </Typography>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={securityCheck.hasConfirmedRecipient}
                    onChange={(e) => setSecurityCheck(prev => ({ ...prev, hasConfirmedRecipient: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-clinical-safe border-border-primary rounded focus:ring-clinical-safe/50"
                  />
                  <div>
                    <Typography variant="body2" className="font-medium">
                      I have verified the recipient's identity and credentials
                    </Typography>
                    <Typography variant="caption" className="text-text-secondary">
                      Only share with licensed professionals or trusted individuals
                    </Typography>
                  </div>
                </label>
              </div>

              {/* Minimum Reading Time Warning */}
              {!hasSpentEnoughTimeReading && (
                <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-4">
                  <Typography variant="caption" className="text-clinical-text font-medium">
                    Take Your Time:
                  </Typography>
                  <Typography variant="body2" className="text-text-secondary mt-1">
                    Please spend a moment reviewing the security information before proceeding.
                  </Typography>
                </div>
              )}

              {/* Share Error */}
              {shareModal.shareError && (
                <div className="bg-crisis-bg/5 border border-crisis-border rounded-lg p-4">
                  <Typography variant="caption" className="text-crisis-text font-medium">
                    Sharing Failed:
                  </Typography>
                  <Typography variant="body2" className="text-text-secondary mt-1">
                    {shareModal.shareError}
                  </Typography>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="border-t border-border-primary px-6 py-4 flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShareModal({ isOpen: false, selectedMethod: null, isSharing: false, shareError: null })}
                disabled={shareModal.isSharing}
              >
                Cancel
              </Button>
              
              <Button
                variant="clinical"
                onClick={handleShareConfirm}
                disabled={
                  shareModal.isSharing ||
                  !securityCheck.hasReadSecurityGuidance ||
                  !securityCheck.hasConfirmedSecureDevice ||
                  !securityCheck.hasConfirmedRecipient ||
                  !hasSpentEnoughTimeReading
                }
                loading={shareModal.isSharing}
                className="min-w-[120px]"
              >
                {shareModal.isSharing ? 'Sharing...' : 'Share Securely'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}