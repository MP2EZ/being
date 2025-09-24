/**
 * Being. Clinical Export Configuration Component
 * 
 * Therapeutic-grade export configuration interface with MBCT compliance
 * and mindful decision-making support for clinical data exports.
 * 
 * Features:
 * - Data type selection with clinical context
 * - Date range picker with therapeutic timeline guidance
 * - Format selection with clear explanations
 * - Privacy level controls with granular consent
 * - Intent declaration for appropriate sharing
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ClinicalExportOptions,
  DataTypeOption,
  UserConsentRecord,
  ClinicalContext,
  ExportFormat,
  ConsentLevel,
  ExportPurpose,
  DataCategory
} from '@/types/clinical-export';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

export interface ExportConfigurationProps extends BaseComponentProps {
  onExportStart: (config: ClinicalExportOptions) => Promise<void>;
  availableDataTypes: DataTypeOption[];
  userConsentStatus: UserConsentRecord;
  clinicalContext: ClinicalContext;
  disabled?: boolean;
  loading?: boolean;
  onConfigChange?: (config: Partial<ClinicalExportOptions>) => void;
}

interface DataTypeSelectionState {
  assessments: boolean;
  progressTracking: boolean;
  sessionData: boolean;
  clinicalReports: boolean;
  riskAssessments: boolean;
  crisisData: boolean;
}

interface DateRangeState {
  startDate: string;
  endDate: string;
  preset: 'custom' | '1month' | '3months' | '6months' | '1year' | 'all';
}

interface FormatSelectionState {
  format: ExportFormat['type'];
  includeCharts: boolean;
  includeSummary: boolean;
  clinicalFormatting: boolean;
}

interface PrivacyConfigState {
  purpose: ExportPurpose;
  granularConsent: Record<DataCategory, ConsentLevel>;
  anonymize: boolean;
  includeMetadata: boolean;
}

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

const DATA_TYPE_OPTIONS = [
  {
    id: 'assessments' as const,
    label: 'Assessment Scores',
    description: 'PHQ-9, GAD-7, and custom assessment results with trend analysis',
    clinicalImportance: 'high',
    consentRequired: 'full-consent' as ConsentLevel,
    mbctGuidance: 'These scores track your therapeutic progress and may be valuable for continuity of care.',
    estimatedSize: 'Small (2-5 MB)',
    icon: '📊'
  },
  {
    id: 'progressTracking' as const,
    label: 'Progress Tracking',
    description: 'Daily mood data, check-in responses, and therapeutic milestone tracking',
    clinicalImportance: 'high',
    consentRequired: 'full-consent' as ConsentLevel,
    mbctGuidance: 'Your progress data shows patterns in your mental health journey and mindfulness practice.',
    estimatedSize: 'Medium (5-20 MB)',
    icon: '📈'
  },
  {
    id: 'sessionData' as const,
    label: 'Session Data',
    description: 'MBCT practice sessions, breathing exercises, and meditation engagement',
    clinicalImportance: 'medium',
    consentRequired: 'limited-consent' as ConsentLevel,
    mbctGuidance: 'Session data reflects your commitment to mindfulness practice and skill development.',
    estimatedSize: 'Medium (10-30 MB)',
    icon: '🧘'
  },
  {
    id: 'clinicalReports' as const,
    label: 'Clinical Reports',
    description: 'Therapeutic summaries, progress analyses, and professional recommendations',
    clinicalImportance: 'high',
    consentRequired: 'full-consent' as ConsentLevel,
    mbctGuidance: 'Clinical reports provide professional context for sharing with healthcare providers.',
    estimatedSize: 'Small (1-3 MB)',
    icon: '📋'
  },
  {
    id: 'riskAssessments' as const,
    label: 'Risk Assessments',
    description: 'Safety evaluations, crisis indicators, and intervention recommendations',
    clinicalImportance: 'critical',
    consentRequired: 'full-consent' as ConsentLevel,
    mbctGuidance: 'Risk assessments are crucial for safety and should be shared thoughtfully with professionals.',
    estimatedSize: 'Small (<1 MB)',
    icon: '⚠️',
    requiresExtraConsent: true
  },
  {
    id: 'crisisData' as const,
    label: 'Crisis Event Data',
    description: 'Emergency contact usage, crisis plan activations, and safety interventions',
    clinicalImportance: 'critical',
    consentRequired: 'full-consent' as ConsentLevel,
    mbctGuidance: 'Crisis data is highly sensitive and should only be shared with trusted healthcare providers.',
    estimatedSize: 'Small (<1 MB)',
    icon: '🚨',
    requiresExtraConsent: true
  }
] as const;

const DATE_RANGE_PRESETS = [
  { value: '1month', label: 'Last Month', description: 'Recent therapeutic progress' },
  { value: '3months', label: 'Last 3 Months', description: 'Short-term progress patterns' },
  { value: '6months', label: 'Last 6 Months', description: 'Medium-term therapeutic outcomes' },
  { value: '1year', label: 'Last Year', description: 'Long-term progress and trends' },
  { value: 'all', label: 'All Data', description: 'Complete therapeutic history' },
  { value: 'custom', label: 'Custom Range', description: 'Choose specific dates' }
] as const;

const EXPORT_FORMATS = [
  {
    type: 'pdf' as const,
    name: 'PDF Report',
    description: 'Clinical-grade report with charts and analysis, ideal for sharing with therapists',
    bestFor: 'Healthcare providers, personal records',
    accessibility: 'Screen reader compatible, high contrast',
    estimatedTime: '30-60 seconds',
    icon: '📄'
  },
  {
    type: 'csv' as const,
    name: 'CSV Data',
    description: 'Raw data in spreadsheet format, perfect for research or data analysis',
    bestFor: 'Researchers, data analysis, system migration',
    accessibility: 'Compatible with assistive technologies',
    estimatedTime: '10-30 seconds',
    icon: '📊'
  }
] as const;

const EXPORT_PURPOSES = [
  {
    value: 'therapeutic-sharing' as ExportPurpose,
    label: 'Share with Healthcare Provider',
    description: 'For therapeutic consultation, treatment planning, or continuity of care',
    guidance: 'Consider sharing with licensed mental health professionals for best outcomes.',
    privacy: 'high',
    consentLevel: 'full-consent' as ConsentLevel
  },
  {
    value: 'personal-records' as ExportPurpose,
    label: 'Personal Records',
    description: 'For your own records, backup, or personal analysis',
    guidance: 'Keep your data secure and consider encrypting sensitive information.',
    privacy: 'medium',
    consentLevel: 'limited-consent' as ConsentLevel
  },
  {
    value: 'research-participation' as ExportPurpose,
    label: 'Research Participation',
    description: 'Contributing to mental health research and MBCT effectiveness studies',
    guidance: 'Research participation helps advance mental health treatment for others.',
    privacy: 'high',
    consentLevel: 'full-consent' as ConsentLevel
  }
] as const;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExportConfiguration({
  onExportStart,
  availableDataTypes,
  userConsentStatus,
  clinicalContext,
  disabled = false,
  loading = false,
  onConfigChange,
  className,
  'data-testid': testId,
  ...props
}: ExportConfigurationProps) {
  const { colors, isDark, themeColors } = useTheme();

  // Component state
  const [currentStep, setCurrentStep] = useState<'dataTypes' | 'dateRange' | 'format' | 'privacy' | 'review'>('dataTypes');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Configuration state
  const [dataTypeSelection, setDataTypeSelection] = useState<DataTypeSelectionState>({
    assessments: true,
    progressTracking: true,
    sessionData: false,
    clinicalReports: false,
    riskAssessments: false,
    crisisData: false
  });

  const [dateRange, setDateRange] = useState<DateRangeState>({
    startDate: '',
    endDate: '',
    preset: '3months'
  });

  const [formatSelection, setFormatSelection] = useState<FormatSelectionState>({
    format: 'pdf',
    includeCharts: true,
    includeSummary: true,
    clinicalFormatting: true
  });

  const [privacyConfig, setPrivacyConfig] = useState<PrivacyConfigState>({
    purpose: 'therapeutic-sharing',
    granularConsent: {
      'assessment-scores': 'full-consent',
      'mood-tracking': 'full-consent',
      'session-data': 'limited-consent',
      'clinical-notes': 'full-consent',
      'risk-assessments': 'no-consent',
      'treatment-plans': 'no-consent'
    },
    anonymize: false,
    includeMetadata: true
  });

  // Initialize date range based on preset
  useEffect(() => {
    if (dateRange.preset !== 'custom') {
      const endDate = new Date();
      let startDate = new Date();

      switch (dateRange.preset) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'all':
          startDate = new Date('2020-01-01'); // App launch date
          break;
      }

      setDateRange(prev => ({
        ...prev,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }));
    }
  }, [dateRange.preset]);

  // Validation logic
  const validateCurrentStep = useCallback((): boolean => {
    const errors: string[] = [];

    switch (currentStep) {
      case 'dataTypes':
        const hasSelectedData = Object.values(dataTypeSelection).some(Boolean);
        if (!hasSelectedData) {
          errors.push('Please select at least one data type to export.');
        }
        break;

      case 'dateRange':
        if (!dateRange.startDate || !dateRange.endDate) {
          errors.push('Please select a valid date range.');
        } else if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
          errors.push('Start date must be before end date.');
        }
        break;

      case 'format':
        if (!formatSelection.format) {
          errors.push('Please select an export format.');
        }
        break;

      case 'privacy':
        const selectedDataTypes = Object.entries(dataTypeSelection)
          .filter(([_, selected]) => selected)
          .map(([type]) => type);
        
        const hasRequiredConsent = selectedDataTypes.every(type => {
          const option = DATA_TYPE_OPTIONS.find(opt => opt.id === type);
          return option && privacyConfig.granularConsent[option.id as DataCategory] !== 'no-consent';
        });

        if (!hasRequiredConsent) {
          errors.push('Please provide consent for all selected data types.');
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [currentStep, dataTypeSelection, dateRange, formatSelection, privacyConfig]);

  // Build export configuration
  const buildExportConfig = useCallback((): ClinicalExportOptions => {
    return {
      dataTypes: Object.entries(dataTypeSelection)
        .filter(([_, selected]) => selected)
        .map(([type]) => type as DataCategory),
      timeRange: {
        startDate: dateRange.startDate as any, // ISO8601Timestamp
        endDate: dateRange.endDate as any,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        precision: 'day'
      },
      format: {
        type: formatSelection.format,
        ...(formatSelection.format === 'pdf' ? {
          template: 'clinical' as const,
          clinicalFormatting: {
            headerInclusion: true,
            chartGeneration: formatSelection.includeCharts,
            trendVisualization: true,
            riskHighlighting: true,
            progressSummaries: formatSelection.includeSummary,
            clinicalNotes: true
          },
          charts: { enabled: formatSelection.includeCharts },
          branding: { enabled: true },
          accessibility: { level: 'AA' as const },
          compression: { enabled: true }
        } : {
          structure: 'normalized' as const,
          headers: { style: 'clinical' as const },
          encoding: 'UTF-8' as const,
          validation: { enabled: true },
          clinicalMetadata: formatSelection.includeMetadata
        })
      } as ExportFormat,
      privacy: {
        purpose: privacyConfig.purpose,
        anonymize: privacyConfig.anonymize,
        includeMetadata: privacyConfig.includeMetadata,
        granularConsent: privacyConfig.granularConsent
      },
      validation: {
        clinicalAccuracy: true,
        dataIntegrity: true,
        privacyCompliance: true
      },
      performance: {
        maxProcessingTime: 300000, // 5 minutes
        progressReporting: true,
        cancellationSupport: true
      }
    };
  }, [dataTypeSelection, dateRange, formatSelection, privacyConfig]);

  // Handle export initiation
  const handleExportStart = useCallback(async () => {
    if (!validateCurrentStep()) return;

    setIsProcessing(true);
    try {
      const config = buildExportConfig();
      await onExportStart(config);
    } catch (error) {
      console.error('Export configuration error:', error);
      setValidationErrors(['Failed to start export. Please try again.']);
    } finally {
      setIsProcessing(false);
    }
  }, [validateCurrentStep, buildExportConfig, onExportStart]);

  // Step navigation
  const handleNextStep = useCallback(() => {
    if (!validateCurrentStep()) return;

    const steps: typeof currentStep[] = ['dataTypes', 'dateRange', 'format', 'privacy', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep, validateCurrentStep]);

  const handlePreviousStep = useCallback(() => {
    const steps: typeof currentStep[] = ['dataTypes', 'dateRange', 'format', 'privacy', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  // Notify parent of config changes
  useEffect(() => {
    if (onConfigChange) {
      try {
        const config = buildExportConfig();
        onConfigChange(config);
      } catch (error) {
        // Silent fail for config building during intermediate states
      }
    }
  }, [dataTypeSelection, dateRange, formatSelection, privacyConfig, onConfigChange, buildExportConfig]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'dataTypes':
        return (
          <DataTypeSelection
            selection={dataTypeSelection}
            onChange={setDataTypeSelection}
            userConsent={userConsentStatus}
            clinicalContext={clinicalContext}
          />
        );

      case 'dateRange':
        return (
          <DateRangeSelection
            dateRange={dateRange}
            onChange={setDateRange}
            clinicalContext={clinicalContext}
          />
        );

      case 'format':
        return (
          <FormatSelection
            selection={formatSelection}
            onChange={setFormatSelection}
            selectedDataTypes={Object.entries(dataTypeSelection).filter(([_, selected]) => selected).map(([type]) => type)}
          />
        );

      case 'privacy':
        return (
          <PrivacyConfiguration
            config={privacyConfig}
            onChange={setPrivacyConfig}
            selectedDataTypes={Object.entries(dataTypeSelection).filter(([_, selected]) => selected).map(([type]) => type)}
            userConsent={userConsentStatus}
          />
        );

      case 'review':
        return (
          <ReviewConfiguration
            dataTypes={dataTypeSelection}
            dateRange={dateRange}
            format={formatSelection}
            privacy={privacyConfig}
            onExportStart={handleExportStart}
            isProcessing={isProcessing}
          />
        );

      default:
        return null;
    }
  };

  const steps = [
    { id: 'dataTypes', label: 'Select Data', description: 'Choose what to export' },
    { id: 'dateRange', label: 'Date Range', description: 'Choose time period' },
    { id: 'format', label: 'Format', description: 'Choose export format' },
    { id: 'privacy', label: 'Privacy', description: 'Review consent & privacy' },
    { id: 'review', label: 'Review', description: 'Final review & export' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <div
      className={cn(
        'export-configuration w-full max-w-4xl mx-auto',
        'bg-bg-primary rounded-xl border border-border-primary',
        'shadow-medium overflow-hidden',
        className
      )}
      data-testid={testId}
      {...props}
    >
      {/* Progress Steps */}
      <div className="border-b border-border-primary bg-bg-secondary px-6 py-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 text-sm',
                index === currentStepIndex ? 'text-theme-primary font-medium' : 'text-text-secondary',
                index < currentStepIndex ? 'text-theme-success' : ''
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  index === currentStepIndex
                    ? 'bg-theme-primary text-white'
                    : index < currentStepIndex
                    ? 'bg-theme-success text-white'
                    : 'bg-surface-depressed text-text-tertiary border border-border-primary'
                )}
              >
                {index < currentStepIndex ? '✓' : index + 1}
              </div>
              <div className="hidden md:block">
                <div className="font-medium">{step.label}</div>
                <div className="text-xs text-text-tertiary">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6">
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-crisis-bg/10 border border-crisis-border rounded-lg">
            <Typography variant="h6" className="text-crisis-text mb-2">
              Please address the following issues:
            </Typography>
            <ul className="list-disc list-inside space-y-1 text-sm text-crisis-text">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="border-t border-border-primary bg-bg-secondary px-6 py-4 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePreviousStep}
          disabled={currentStepIndex === 0 || disabled}
          className="min-w-[100px]"
        >
          Previous
        </Button>

        <div className="text-sm text-text-tertiary">
          Step {currentStepIndex + 1} of {steps.length}
        </div>

        {currentStep !== 'review' ? (
          <Button
            variant="primary"
            onClick={handleNextStep}
            disabled={disabled || loading}
            className="min-w-[100px]"
          >
            Next
          </Button>
        ) : (
          <Button
            variant="clinical"
            onClick={handleExportStart}
            disabled={disabled || isProcessing}
            loading={isProcessing}
            className="min-w-[120px]"
          >
            {isProcessing ? 'Processing...' : 'Start Export'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DataTypeSelectionProps {
  selection: DataTypeSelectionState;
  onChange: (selection: DataTypeSelectionState) => void;
  userConsent: UserConsentRecord;
  clinicalContext: ClinicalContext;
}

function DataTypeSelection({ selection, onChange, userConsent, clinicalContext }: DataTypeSelectionProps) {
  const handleToggle = (id: keyof DataTypeSelectionState) => {
    onChange({ ...selection, [id]: !selection[id] });
  };

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Select Data to Export
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Choose which types of therapeutic data to include in your export. Consider your sharing purpose and privacy preferences.
        </Typography>
      </div>

      <div className="grid gap-4">
        {DATA_TYPE_OPTIONS.map((option) => {
          const isSelected = selection[option.id];
          const needsExtraConsent = option.requiresExtraConsent && isSelected;

          return (
            <div
              key={option.id}
              className={cn(
                'border rounded-lg p-4 transition-all duration-200',
                isSelected
                  ? 'border-theme-primary bg-theme-primary/5'
                  : 'border-border-primary hover:border-border-secondary hover:bg-surface-hover'
              )}
            >
              <label className="flex items-start gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(option.id)}
                  className="mt-1 w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg" role="img" aria-hidden="true">
                      {option.icon}
                    </span>
                    <Typography variant="h6" className="font-medium">
                      {option.label}
                    </Typography>
                    <span
                      className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        option.clinicalImportance === 'critical'
                          ? 'bg-crisis-bg/10 text-crisis-text border border-crisis-border'
                          : option.clinicalImportance === 'high'
                          ? 'bg-theme-primary/10 text-theme-primary'
                          : 'bg-surface-depressed text-text-secondary'
                      )}
                    >
                      {option.clinicalImportance.toUpperCase()}
                    </span>
                  </div>
                  
                  <Typography variant="body2" className="text-text-secondary mb-2">
                    {option.description}
                  </Typography>
                  
                  <div className="bg-bg-secondary rounded-md p-3 mb-2">
                    <Typography variant="caption" className="text-text-clinical font-medium">
                      MBCT Guidance:
                    </Typography>
                    <Typography variant="body2" className="text-text-secondary mt-1">
                      {option.mbctGuidance}
                    </Typography>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-text-tertiary">
                    <span>{option.estimatedSize}</span>
                    <span>Consent: {option.consentRequired.replace('-', ' ')}</span>
                  </div>

                  {needsExtraConsent && (
                    <div className="mt-3 p-3 bg-clinical-bg/5 border border-clinical-border rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-clinical-text">⚠️</span>
                        <Typography variant="caption" className="text-clinical-text font-medium">
                          Extra Consent Required
                        </Typography>
                      </div>
                      <Typography variant="body2" className="text-text-secondary">
                        This sensitive data requires additional confirmation for export.
                      </Typography>
                    </div>
                  )}
                </div>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DateRangeSelectionProps {
  dateRange: DateRangeState;
  onChange: (dateRange: DateRangeState) => void;
  clinicalContext: ClinicalContext;
}

function DateRangeSelection({ dateRange, onChange, clinicalContext }: DateRangeSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Select Time Period
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Choose the timeframe for your therapeutic data export. Consider your purpose and the therapeutic relevance of different periods.
        </Typography>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DATE_RANGE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => onChange({ ...dateRange, preset: preset.value })}
            className={cn(
              'p-4 text-left border rounded-lg transition-all duration-200',
              dateRange.preset === preset.value
                ? 'border-theme-primary bg-theme-primary/5'
                : 'border-border-primary hover:border-border-secondary hover:bg-surface-hover'
            )}
          >
            <Typography variant="h6" className="font-medium mb-1">
              {preset.label}
            </Typography>
            <Typography variant="body2" className="text-text-secondary">
              {preset.description}
            </Typography>
          </button>
        ))}
      </div>

      {dateRange.preset === 'custom' && (
        <div className="p-4 border border-border-primary rounded-lg space-y-4">
          <Typography variant="h6" className="font-medium">
            Custom Date Range
          </Typography>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-text-primary mb-2">
                Start Date
              </label>
              <input
                id="start-date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => onChange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-border-primary rounded-md bg-bg-primary text-text-primary focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-text-primary mb-2">
                End Date
              </label>
              <input
                id="end-date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => onChange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-border-primary rounded-md bg-bg-primary text-text-primary focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-bg-secondary rounded-lg p-4">
        <Typography variant="caption" className="text-text-clinical font-medium">
          Therapeutic Considerations:
        </Typography>
        <Typography variant="body2" className="text-text-secondary mt-1">
          Longer time periods provide better context for therapeutic progress, while shorter periods focus on recent developments.
          Consider your healthcare provider's needs when selecting the timeframe.
        </Typography>
      </div>
    </div>
  );
}

interface FormatSelectionProps {
  selection: FormatSelectionState;
  onChange: (selection: FormatSelectionState) => void;
  selectedDataTypes: string[];
}

function FormatSelection({ selection, onChange, selectedDataTypes }: FormatSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Choose Export Format
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Select the format that best suits your intended use. Each format has different strengths for different purposes.
        </Typography>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format.type}
            onClick={() => onChange({ ...selection, format: format.type })}
            className={cn(
              'p-6 text-left border rounded-lg transition-all duration-200',
              selection.format === format.type
                ? 'border-theme-primary bg-theme-primary/5'
                : 'border-border-primary hover:border-border-secondary hover:bg-surface-hover'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl" role="img" aria-hidden="true">
                {format.icon}
              </span>
              <Typography variant="h6" className="font-medium">
                {format.name}
              </Typography>
            </div>
            
            <Typography variant="body2" className="text-text-secondary mb-3">
              {format.description}
            </Typography>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-text-primary">Best for: </span>
                <span className="text-text-secondary">{format.bestFor}</span>
              </div>
              <div>
                <span className="font-medium text-text-primary">Accessibility: </span>
                <span className="text-text-secondary">{format.accessibility}</span>
              </div>
              <div>
                <span className="font-medium text-text-primary">Generation time: </span>
                <span className="text-text-secondary">{format.estimatedTime}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Format-specific options */}
      <div className="border border-border-primary rounded-lg p-4 space-y-4">
        <Typography variant="h6" className="font-medium">
          Format Options
        </Typography>
        
        {selection.format === 'pdf' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selection.includeCharts}
                onChange={(e) => onChange({ ...selection, includeCharts: e.target.checked })}
                className="w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
              />
              <div>
                <Typography variant="body2" className="font-medium">
                  Include Charts & Graphs
                </Typography>
                <Typography variant="caption" className="text-text-secondary">
                  Visual representations of your progress
                </Typography>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selection.includeSummary}
                onChange={(e) => onChange({ ...selection, includeSummary: e.target.checked })}
                className="w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
              />
              <div>
                <Typography variant="body2" className="font-medium">
                  Include Summary Analysis
                </Typography>
                <Typography variant="caption" className="text-text-secondary">
                  Professional insights and recommendations
                </Typography>
              </div>
            </label>
          </div>
        )}

        {selection.format === 'csv' && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={selection.includeMetadata}
              onChange={(e) => onChange({ ...selection, includeMetadata: e.target.checked })}
              className="w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
            />
            <div>
              <Typography variant="body2" className="font-medium">
                Include Clinical Metadata
              </Typography>
              <Typography variant="caption" className="text-text-secondary">
                Validation status, timestamps, and technical details
              </Typography>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}

interface PrivacyConfigurationProps {
  config: PrivacyConfigState;
  onChange: (config: PrivacyConfigState) => void;
  selectedDataTypes: string[];
  userConsent: UserConsentRecord;
}

function PrivacyConfiguration({ config, onChange, selectedDataTypes, userConsent }: PrivacyConfigurationProps) {
  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Privacy & Consent Configuration
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Review your privacy settings and provide consent for sharing specific types of therapeutic data.
        </Typography>
      </div>

      {/* Export Purpose */}
      <div className="space-y-4">
        <Typography variant="h6" className="font-medium">
          Export Purpose
        </Typography>
        <div className="space-y-3">
          {EXPORT_PURPOSES.map((purpose) => (
            <label key={purpose.value} className="block cursor-pointer">
              <div
                className={cn(
                  'p-4 border rounded-lg transition-all duration-200',
                  config.purpose === purpose.value
                    ? 'border-theme-primary bg-theme-primary/5'
                    : 'border-border-primary hover:border-border-secondary'
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="export-purpose"
                    value={purpose.value}
                    checked={config.purpose === purpose.value}
                    onChange={(e) => onChange({ ...config, purpose: e.target.value as ExportPurpose })}
                    className="mt-1 w-4 h-4 text-theme-primary border-border-primary focus:ring-theme-primary/50"
                  />
                  <div className="flex-1">
                    <Typography variant="body1" className="font-medium mb-1">
                      {purpose.label}
                    </Typography>
                    <Typography variant="body2" className="text-text-secondary mb-2">
                      {purpose.description}
                    </Typography>
                    <div className="bg-bg-secondary rounded-md p-3">
                      <Typography variant="caption" className="text-text-clinical font-medium">
                        Guidance:
                      </Typography>
                      <Typography variant="body2" className="text-text-secondary mt-1">
                        {purpose.guidance}
                      </Typography>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Privacy Options */}
      <div className="border border-border-primary rounded-lg p-4 space-y-4">
        <Typography variant="h6" className="font-medium">
          Privacy Options
        </Typography>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.anonymize}
            onChange={(e) => onChange({ ...config, anonymize: e.target.checked })}
            className="mt-1 w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
          />
          <div>
            <Typography variant="body2" className="font-medium">
              Anonymize Personal Information
            </Typography>
            <Typography variant="caption" className="text-text-secondary">
              Remove or obfuscate identifying information where possible
            </Typography>
          </div>
        </label>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeMetadata}
            onChange={(e) => onChange({ ...config, includeMetadata: e.target.checked })}
            className="mt-1 w-4 h-4 text-theme-primary border-border-primary rounded focus:ring-theme-primary/50"
          />
          <div>
            <Typography variant="body2" className="font-medium">
              Include Technical Metadata
            </Typography>
            <Typography variant="caption" className="text-text-secondary">
              Export timestamps, validation status, and data quality information
            </Typography>
          </div>
        </label>
      </div>
    </div>
  );
}

interface ReviewConfigurationProps {
  dataTypes: DataTypeSelectionState;
  dateRange: DateRangeState;
  format: FormatSelectionState;
  privacy: PrivacyConfigState;
  onExportStart: () => void;
  isProcessing: boolean;
}

function ReviewConfiguration({
  dataTypes,
  dateRange,
  format,
  privacy,
  onExportStart,
  isProcessing
}: ReviewConfigurationProps) {
  const selectedDataTypes = Object.entries(dataTypes).filter(([_, selected]) => selected);
  const selectedPurpose = EXPORT_PURPOSES.find(p => p.value === privacy.purpose);

  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" className="mb-2">
          Review Export Configuration
        </Typography>
        <Typography variant="body1" className="text-text-secondary">
          Please review your export settings before proceeding. Your data will be processed securely according to these specifications.
        </Typography>
      </div>

      <div className="grid gap-6">
        {/* Data Types */}
        <div className="border border-border-primary rounded-lg p-4">
          <Typography variant="h6" className="font-medium mb-3">
            Selected Data Types ({selectedDataTypes.length})
          </Typography>
          <div className="space-y-2">
            {selectedDataTypes.map(([type]) => {
              const option = DATA_TYPE_OPTIONS.find(opt => opt.id === type);
              return option ? (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm" role="img" aria-hidden="true">
                    {option.icon}
                  </span>
                  <Typography variant="body2">{option.label}</Typography>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* Date Range */}
        <div className="border border-border-primary rounded-lg p-4">
          <Typography variant="h6" className="font-medium mb-3">
            Time Period
          </Typography>
          <Typography variant="body2" className="text-text-secondary">
            {dateRange.preset !== 'custom' 
              ? DATE_RANGE_PRESETS.find(p => p.value === dateRange.preset)?.label
              : `Custom: ${dateRange.startDate} to ${dateRange.endDate}`
            }
          </Typography>
        </div>

        {/* Format */}
        <div className="border border-border-primary rounded-lg p-4">
          <Typography variant="h6" className="font-medium mb-3">
            Export Format
          </Typography>
          <div className="space-y-2">
            <Typography variant="body2" className="text-text-secondary">
              {EXPORT_FORMATS.find(f => f.type === format.format)?.name}
            </Typography>
            <div className="text-sm text-text-tertiary">
              {format.format === 'pdf' && (
                <>
                  {format.includeCharts && '• Charts & graphs included'}<br />
                  {format.includeSummary && '• Summary analysis included'}
                </>
              )}
              {format.format === 'csv' && format.includeMetadata && '• Clinical metadata included'}
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="border border-border-primary rounded-lg p-4">
          <Typography variant="h6" className="font-medium mb-3">
            Privacy Settings
          </Typography>
          <div className="space-y-2">
            <Typography variant="body2" className="text-text-secondary">
              Purpose: {selectedPurpose?.label}
            </Typography>
            {privacy.anonymize && (
              <Typography variant="body2" className="text-text-tertiary">
                • Personal information will be anonymized
              </Typography>
            )}
            {privacy.includeMetadata && (
              <Typography variant="body2" className="text-text-tertiary">
                • Technical metadata will be included
              </Typography>
            )}
          </div>
        </div>
      </div>

      {/* Final Consent */}
      <div className="bg-clinical-bg/5 border border-clinical-border rounded-lg p-4">
        <Typography variant="h6" className="text-clinical-text font-medium mb-2">
          Final Consent Confirmation
        </Typography>
        <Typography variant="body2" className="text-text-secondary">
          By proceeding with this export, you confirm that you understand the data being exported and consent to its use for the stated purpose.
          Your data will be processed according to our privacy policy and applicable data protection regulations.
        </Typography>
      </div>
    </div>
  );
}