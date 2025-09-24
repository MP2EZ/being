/**
 * Being. Clinical Export Demo Component
 * 
 * Demonstration component showing complete clinical export workflow
 * with all four components working together in therapeutic context.
 * 
 * This component serves as both a demo and integration example for
 * implementing the clinical export system in production.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Typography } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import {
  ExportConfiguration,
  ExportProgress,
  ConsentInterface,
  ExportResults
} from '@/components/clinical';
import type {
  ClinicalExportOptions,
  ExportStatus,
  ExportStage,
  UserConsentRecord,
  ExportResult,
  DataCategory,
  ExportIntendedUse,
  SharingMethod
} from '@/types/clinical-export';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// DEMO COMPONENT INTERFACE
// ============================================================================

export interface ClinicalExportDemoProps extends BaseComponentProps {
  onExportComplete?: (result: ExportResult) => void;
  onConsentProvided?: (consent: UserConsentRecord) => void;
  onExportShared?: (method: SharingMethod) => void;
  enableFullWorkflow?: boolean;
  showDemoControls?: boolean;
}

// ============================================================================
// DEMO STATE TYPES
// ============================================================================

type ExportWorkflowStep = 'configuration' | 'consent' | 'processing' | 'results';

interface DemoState {
  currentStep: ExportWorkflowStep;
  exportConfig: ClinicalExportOptions | null;
  userConsent: UserConsentRecord | null;
  exportProgress: {
    status: ExportStatus;
    percentage: number;
    stage: ExportStage;
    timeRemaining: number;
  };
  exportResult: ExportResult | null;
  errors: string[];
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

const generateMockDataTypes = (): DataCategory[] => [
  'assessment-scores',
  'mood-tracking',
  'session-data',
  'clinical-notes'
];

const generateMockConsent = (): UserConsentRecord => ({
  consentId: crypto.randomUUID() as any,
  userId: 'demo-user' as any,
  consentType: 'therapeutic-sharing',
  dataCategories: generateMockDataTypes(),
  exportPurpose: 'therapeutic-sharing',
  recipientInformation: {
    type: 'therapist',
    name: 'Dr. Sarah Johnson',
    organization: 'Being. Therapy Partners',
    purpose: 'Clinical consultation and treatment planning'
  },
  consentGiven: false,
  consentTimestamp: new Date().toISOString() as any,
  withdrawalMechanism: {
    method: 'app-settings',
    instructions: 'Consent can be withdrawn through app settings',
    effectiveImmediately: true
  },
  granularConsent: {
    'assessment-scores': 'full-consent',
    'mood-tracking': 'full-consent',
    'session-data': 'limited-consent',
    'clinical-notes': 'full-consent',
    'risk-assessments': 'no-consent',
    'treatment-plans': 'limited-consent'
  }
});

const generateMockExportResult = (config: ClinicalExportOptions): ExportResult => ({
  exportId: crypto.randomUUID() as any,
  success: true,
  format: config.format,
  metadata: {
    exportId: crypto.randomUUID() as any,
    createdAt: new Date().toISOString() as any,
    createdBy: 'demo-user' as any,
    version: '1.0.0' as any,
    formatVersion: '1.0' as any,
    dataVersion: '1.0' as any,
    clinicalVersion: '1.0' as any,
    sourceSystem: {
      name: 'Being. Demo',
      version: '1.0.0',
      environment: 'demo'
    },
    generation: {
      startTime: new Date(Date.now() - 45000).toISOString() as any,
      endTime: new Date().toISOString() as any,
      duration: 45000,
      processedBy: 'clinical-export-service'
    },
    quality: {
      completeness: 0.98,
      accuracy: 0.999,
      consistency: 0.995,
      reliability: 0.997
    },
    compliance: {
      hipaaCompliant: true,
      gdprCompliant: true,
      clinicalStandards: 'MBCT-2023',
      auditTrail: true
    },
    fileSize: 2450000 // ~2.45 MB
  },
  validation: {
    valid: true,
    clinicalAccuracy: true,
    dataIntegrity: true,
    privacyCompliance: true,
    formatValidation: {
      valid: true,
      formatErrors: [],
      structureValid: true,
      contentValid: true
    },
    errors: [],
    warnings: [],
    clinicalConcerns: []
  },
  performance: {
    processingTime: 45000,
    memoryPeak: 128000000, // 128 MB
    recordsProcessed: 2847,
    throughput: 63.3,
    errorRate: 0.001,
    retryCount: 0,
    cacheHitRate: 0.85,
    compressionRatio: 0.72
  },
  filePath: '/demo/exports/clinical-export-demo.pdf',
  downloadUrl: 'https://demo.being.app/exports/secure-download',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() as any // 30 days
});

// ============================================================================
// MAIN DEMO COMPONENT
// ============================================================================

export function ClinicalExportDemo({
  onExportComplete,
  onConsentProvided,
  onExportShared,
  enableFullWorkflow = true,
  showDemoControls = true,
  className,
  'data-testid': testId,
  ...props
}: ClinicalExportDemoProps) {
  // Demo state
  const [demoState, setDemoState] = useState<DemoState>({
    currentStep: 'configuration',
    exportConfig: null,
    userConsent: null,
    exportProgress: {
      status: 'pending',
      percentage: 0,
      stage: 'initializing',
      timeRemaining: 0
    },
    exportResult: null,
    errors: []
  });

  // Mock data
  const mockDataTypes = useMemo(() => generateMockDataTypes(), []);
  const mockConsent = useMemo(() => generateMockConsent(), []);
  
  const mockMBCTGuidance = useMemo(() => ({
    principles: [
      'Present-moment awareness in decision-making',
      'Non-judgmental consideration of privacy concerns',
      'Mindful intention setting for data sharing'
    ],
    reflectionPrompts: [
      'How will sharing this data support your wellbeing?',
      'What concerns do you have about privacy?',
      'How does this align with your therapeutic goals?'
    ],
    recommendations: [
      'Take time to consider your comfort level',
      'Share only what feels appropriate for your situation',
      'Remember you can change these preferences anytime'
    ]
  }), []);

  // Handle export configuration
  const handleExportStart = useCallback(async (config: ClinicalExportOptions) => {
    setDemoState(prev => ({
      ...prev,
      exportConfig: config,
      currentStep: enableFullWorkflow ? 'consent' : 'processing'
    }));

    if (!enableFullWorkflow) {
      // Skip consent and go directly to processing
      setTimeout(() => {
        simulateExportProcess(config);
      }, 500);
    }
  }, [enableFullWorkflow]);

  // Handle consent completion
  const handleConsentUpdate = useCallback((consent: UserConsentRecord) => {
    setDemoState(prev => ({
      ...prev,
      userConsent: consent
    }));
    
    onConsentProvided?.(consent);
  }, [onConsentProvided]);

  const handleConsentComplete = useCallback(() => {
    if (demoState.exportConfig) {
      setDemoState(prev => ({ ...prev, currentStep: 'processing' }));
      simulateExportProcess(demoState.exportConfig);
    }
  }, [demoState.exportConfig]);

  // Simulate export processing
  const simulateExportProcess = useCallback((config: ClinicalExportOptions) => {
    const stages: ExportStage[] = [
      'initializing',
      'validating-consent',
      'collecting-data',
      'validating-clinical-accuracy',
      'processing-privacy',
      'generating-format',
      'quality-assurance',
      'finalizing',
      'completed'
    ];

    let currentStageIndex = 0;
    let progress = 0;

    const updateProgress = () => {
      const stage = stages[currentStageIndex];
      const isCompleted = currentStageIndex >= stages.length - 1;
      
      if (!isCompleted) {
        progress += Math.random() * 15 + 5; // 5-20% progress increments
        if (progress >= (currentStageIndex + 1) * (100 / (stages.length - 1))) {
          currentStageIndex++;
          if (currentStageIndex >= stages.length - 1) {
            progress = 100;
          }
        }
      }

      setDemoState(prev => ({
        ...prev,
        exportProgress: {
          status: isCompleted ? 'completed' : 'running',
          percentage: Math.min(progress, 100),
          stage: stage,
          timeRemaining: isCompleted ? 0 : Math.max(0, (100 - progress) * 500) // Rough estimate
        }
      }));

      if (!isCompleted && currentStageIndex < stages.length - 1) {
        setTimeout(updateProgress, 2000 + Math.random() * 3000); // 2-5 second intervals
      } else {
        // Export completed
        const result = generateMockExportResult(config);
        setDemoState(prev => ({
          ...prev,
          exportResult: result,
          currentStep: 'results'
        }));
        onExportComplete?.(result);
      }
    };

    updateProgress();
  }, [onExportComplete]);

  // Handle sharing
  const handleShare = useCallback(async (method: SharingMethod) => {
    // Simulate sharing process
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          onExportShared?.(method);
          resolve();
        } else {
          reject(new Error('Demo sharing failure - please try again'));
        }
      }, 2000);
    });
  }, [onExportShared]);

  // Handle download
  const handleDownload = useCallback(async () => {
    // Simulate download
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // In a real implementation, this would trigger actual file download
        console.log('Demo: File download initiated');
        resolve();
      }, 1000);
    });
  }, []);

  // Demo controls
  const resetDemo = useCallback(() => {
    setDemoState({
      currentStep: 'configuration',
      exportConfig: null,
      userConsent: null,
      exportProgress: {
        status: 'pending',
        percentage: 0,
        stage: 'initializing',
        timeRemaining: 0
      },
      exportResult: null,
      errors: []
    });
  }, []);

  const skipToStep = useCallback((step: ExportWorkflowStep) => {
    setDemoState(prev => ({ ...prev, currentStep: step }));
  }, []);

  // Render current step
  const renderCurrentStep = () => {
    switch (demoState.currentStep) {
      case 'configuration':
        return (
          <ExportConfiguration
            onExportStart={handleExportStart}
            availableDataTypes={mockDataTypes.map(type => ({ id: type, name: type }))}
            userConsentStatus={mockConsent}
            clinicalContext={{
              clinicalValidation: { validated: true, validatedBy: 'Demo System' },
              therapeuticContext: { treatmentPhase: 'intervention', practiceLevel: 'intermediate' },
              riskContext: { currentRiskLevel: 'low', activeSafetyPlan: false },
              treatmentContext: { currentProvider: 'Dr. Demo', treatmentApproach: 'MBCT' },
              complianceContext: { hipaaRequired: false, auditingEnabled: true },
              qualityAssurance: { validated: true, reviewedBy: 'Clinical Team' }
            }}
          />
        );

      case 'consent':
        return (
          <ConsentInterface
            dataCategories={demoState.exportConfig?.dataTypes || mockDataTypes}
            intendedUse={demoState.exportConfig?.privacy?.purpose || 'therapeutic-sharing'}
            onConsentUpdate={handleConsentUpdate}
            mbctGuidance={mockMBCTGuidance}
            onConsentComplete={handleConsentComplete}
            showReflectionPrompts={true}
            enableMindfulPacing={true}
          />
        );

      case 'processing':
        return (
          <ExportProgress
            exportStatus={demoState.exportProgress.status}
            progressPercentage={demoState.exportProgress.percentage}
            currentStage={demoState.exportProgress.stage}
            estimatedTimeRemaining={demoState.exportProgress.timeRemaining}
            performanceMetrics={demoState.exportResult?.performance}
            clinicalContext={{
              dataTypes: demoState.exportConfig?.dataTypes || ['Demo Data'],
              timeRange: demoState.exportConfig?.timeRange ? 
                `${demoState.exportConfig.timeRange.startDate} to ${demoState.exportConfig.timeRange.endDate}` : 
                'Demo Range',
              purpose: demoState.exportConfig?.privacy?.purpose || 'Demo Purpose'
            }}
            showDetailedProgress={true}
            enableCancellation={true}
            accessibilityAnnouncements={true}
          />
        );

      case 'results':
        return demoState.exportResult ? (
          <ExportResults
            exportResult={demoState.exportResult}
            sharingOptions={{
              enabledMethods: ['secure-email', 'secure-link', 'device-transfer', 'print-secure'],
              defaultMethod: 'secure-email',
              requireEncryption: true,
              auditSharing: true
            }}
            onShare={handleShare}
            onDownload={handleDownload}
            onNewExport={resetDemo}
            clinicalContext={{
              purpose: demoState.exportConfig?.privacy?.purpose || 'Demo Purpose',
              dataTypes: demoState.exportConfig?.dataTypes || ['Demo Data'],
              dateRange: demoState.exportConfig?.timeRange ? 
                `${demoState.exportConfig.timeRange.startDate} to ${demoState.exportConfig.timeRange.endDate}` : 
                'Demo Range'
            }}
            showAdvancedOptions={true}
            enableSecurityWarnings={true}
            showFollowUpActions={true}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'clinical-export-demo w-full max-w-6xl mx-auto space-y-6',
        className
      )}
      data-testid={testId}
      {...props}
    >
      {/* Demo Header */}
      <div className="text-center">
        <Typography variant="h3" className="font-bold mb-2">
          Clinical Export System Demo
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Interactive demonstration of Being.'s therapeutic-grade data export workflow
        </Typography>
      </div>

      {/* Demo Controls */}
      {showDemoControls && (
        <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <Typography variant="h6" className="text-clinical-text font-medium">
              Demo Controls
            </Typography>
            <Typography variant="caption" className="text-text-tertiary">
              Current Step: {demoState.currentStep}
            </Typography>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipToStep('configuration')}
              disabled={demoState.currentStep === 'processing'}
            >
              Configuration
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipToStep('consent')}
              disabled={demoState.currentStep === 'processing'}
            >
              Consent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipToStep('processing')}
              disabled={demoState.currentStep === 'processing'}
            >
              Processing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => skipToStep('results')}
              disabled={demoState.currentStep === 'processing'}
            >
              Results
            </Button>
            <Button
              variant="clinical"
              size="sm"
              onClick={resetDemo}
              className="ml-auto"
            >
              Reset Demo
            </Button>
          </div>
        </div>
      )}

      {/* Current Step Content */}
      <div className="min-h-[600px]">
        {renderCurrentStep()}
      </div>

      {/* Demo Information */}
      <div className="bg-bg-secondary rounded-lg p-6">
        <Typography variant="h6" className="font-medium mb-3">
          About This Demo
        </Typography>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <Typography variant="body2" className="font-medium mb-2">
              What This Demonstrates:
            </Typography>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>Complete clinical export workflow</li>
              <li>MBCT-compliant consent process</li>
              <li>Real-time progress tracking</li>
              <li>Secure sharing options</li>
              <li>Clinical validation and quality assurance</li>
            </ul>
          </div>
          <div>
            <Typography variant="body2" className="font-medium mb-2">
              Clinical Features:
            </Typography>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>Therapeutic context throughout</li>
              <li>Granular privacy controls</li>
              <li>Clinical accuracy validation</li>
              <li>HIPAA-aware data handling</li>
              <li>Professional sharing guidance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}