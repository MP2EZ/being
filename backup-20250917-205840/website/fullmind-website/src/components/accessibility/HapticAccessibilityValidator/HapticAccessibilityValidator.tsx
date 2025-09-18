/**
 * FullMind Haptic Accessibility Validator Component
 * Comprehensive validation tool for haptic accessibility compliance
 * Provides real-time WCAG AA validation and mental health accessibility assessment
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useHapticAccessibilityTesting, useHapticAccessibilityContext } from '@/hooks/useHapticAccessibility';
import type { 
  HapticAccessibilityTest,
  HapticAccessibilityValidationResult,
  HapticAccessibilityAudit,
} from '@/types/haptic-accessibility';
import type { BaseComponentProps } from '@/types/components';

// ============================================================================
// HAPTIC ACCESSIBILITY VALIDATOR INTERFACES
// ============================================================================

interface HapticAccessibilityValidatorProps extends BaseComponentProps {
  targetComponent?: string;
  autoValidate?: boolean;
  showDetailedResults?: boolean;
  onValidationComplete?: (result: HapticAccessibilityValidationResult) => void;
  onAuditComplete?: (audit: HapticAccessibilityAudit) => void;
  validateOnMount?: boolean;
  realTimeValidation?: boolean;
  includePerformanceTests?: boolean;
  includeMentalHealthTests?: boolean;
}

interface ValidationProgress {
  currentTest: string;
  completed: number;
  total: number;
  phase: 'initialization' | 'wcag-tests' | 'mental-health-tests' | 'performance-tests' | 'complete';
}

// ============================================================================
// VALIDATION TEST RESULT COMPONENT
// ============================================================================

const ValidationTestResult: React.FC<{
  test: HapticAccessibilityTest;
  expanded?: boolean;
  onToggle?: () => void;
}> = ({ test, expanded = false, onToggle }) => {
  const getStatusIcon = () => {
    if (test.passed) {
      return <span className="text-clinical-safe text-xl" aria-label="Test passed">✅</span>;
    } else {
      return <span className="text-clinical-warning text-xl" aria-label="Test failed">❌</span>;
    }
  };

  const getStatusColor = () => {
    if (test.passed) {
      return 'border-clinical-safe/20 bg-clinical-safe/5';
    } else {
      return 'border-clinical-warning/20 bg-clinical-warning/5';
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg transition-all duration-200',
        getStatusColor(),
        expanded && 'ring-2 ring-theme-primary/20'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-surface-hover/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
        aria-expanded={expanded}
        aria-describedby={`test-${test.testId}-details`}
      >
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <Typography variant="h6" className="font-medium">
                {test.name}
              </Typography>
              <div className="flex items-center gap-2 text-sm">
                <span 
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    test.testType === 'crisis-safety' ? 'bg-crisis-bg/10 text-crisis-text' :
                    test.testType === 'consent' ? 'bg-clinical-bg/10 text-clinical-text' :
                    test.testType === 'alternative-access' ? 'bg-theme-primary/10 text-theme-primary' :
                    'bg-surface-depressed text-text-secondary'
                  )}
                >
                  {test.testType.replace('-', ' ').toUpperCase()}
                </span>
                <span className="text-text-tertiary">
                  WCAG {test.wcagCriteria}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Typography variant="body2" className="text-text-secondary">
                Component: {test.hapticComponent}
              </Typography>
              <span className="text-sm text-text-tertiary">
                {expanded ? '↑ Collapse' : '↓ Expand'}
              </span>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div id={`test-${test.testId}-details`} className="px-4 pb-4 border-t border-border-primary/50 mt-4 pt-4">
          {/* Test issues */}
          {test.accessibilityIssues.length > 0 && (
            <div className="mb-4">
              <Typography variant="h6" className="text-clinical-warning font-medium mb-2">
                ⚠️ Issues Found
              </Typography>
              <ul className="space-y-1">
                {test.accessibilityIssues.map((issue, index) => (
                  <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-clinical-warning mt-1">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {test.recommendations.length > 0 && (
            <div className="mb-4">
              <Typography variant="h6" className="text-clinical-primary font-medium mb-2">
                💡 Recommendations
              </Typography>
              <ul className="space-y-1">
                {test.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-clinical-primary mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mental health safety status */}
          <div className="flex items-center justify-between p-3 bg-bg-secondary rounded-md">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {test.mentalHealthSafetyValidated ? '🛡️' : '⚠️'}
              </span>
              <Typography variant="body2" className="font-medium">
                Mental Health Safety
              </Typography>
            </div>
            <span className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              test.mentalHealthSafetyValidated
                ? 'bg-clinical-safe/20 text-clinical-safe'
                : 'bg-clinical-warning/20 text-clinical-warning'
            )}>
              {test.mentalHealthSafetyValidated ? 'VALIDATED' : 'NEEDS REVIEW'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// VALIDATION PROGRESS COMPONENT
// ============================================================================

const ValidationProgressIndicator: React.FC<{
  progress: ValidationProgress;
  className?: string;
}> = ({ progress, className }) => {
  const progressPercentage = (progress.completed / progress.total) * 100;

  const getPhaseDescription = () => {
    switch (progress.phase) {
      case 'initialization': return 'Initializing accessibility validation...';
      case 'wcag-tests': return 'Running WCAG compliance tests...';
      case 'mental-health-tests': return 'Validating mental health safety...';
      case 'performance-tests': return 'Testing performance with accessibility features...';
      case 'complete': return 'Validation complete!';
    }
  };

  return (
    <div className={cn('validation-progress space-y-3', className)}>
      <div className="flex items-center justify-between">
        <Typography variant="h6" className="font-medium">
          Accessibility Validation
        </Typography>
        <span className="text-sm text-text-secondary">
          {progress.completed} / {progress.total} tests
        </span>
      </div>

      <div className="w-full bg-surface-depressed rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-clinical-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progressPercentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Validation progress: ${Math.round(progressPercentage)}% complete`}
        />
      </div>

      <div className="flex items-center gap-2">
        {progress.phase !== 'complete' && (
          <div className="animate-spin w-4 h-4 border-2 border-clinical-primary border-t-transparent rounded-full" />
        )}
        <Typography variant="body2" className="text-text-secondary">
          {progress.currentTest || getPhaseDescription()}
        </Typography>
      </div>
    </div>
  );
};

// ============================================================================
// VALIDATION SUMMARY COMPONENT
// ============================================================================

const ValidationSummary: React.FC<{
  result: HapticAccessibilityValidationResult;
  onRetry?: () => void;
  onExport?: () => void;
}> = ({ result, onRetry, onExport }) => {
  const getScoreColor = () => {
    if (result.score >= 95) return 'text-clinical-safe';
    if (result.score >= 80) return 'text-clinical-primary';
    if (result.score >= 60) return 'text-clinical-warning';
    return 'text-clinical-error';
  };

  const getScoreLabel = () => {
    if (result.score >= 95) return 'Excellent';
    if (result.score >= 80) return 'Good';
    if (result.score >= 60) return 'Needs Improvement';
    return 'Critical Issues';
  };

  return (
    <div className="validation-summary space-y-6">
      {/* Overall score */}
      <div className="text-center">
        <div className={cn('text-6xl font-bold mb-2', getScoreColor())}>
          {result.score}
        </div>
        <Typography variant="h4" className="font-bold mb-2">
          Accessibility Score
        </Typography>
        <div className={cn(
          'inline-flex px-4 py-2 rounded-full text-sm font-medium',
          result.score >= 95 ? 'bg-clinical-safe/20 text-clinical-safe' :
          result.score >= 80 ? 'bg-clinical-primary/20 text-clinical-primary' :
          result.score >= 60 ? 'bg-clinical-warning/20 text-clinical-warning' :
          'bg-clinical-error/20 text-clinical-error'
        )}>
          {getScoreLabel()}
        </div>
      </div>

      {/* Compliance indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-border-primary rounded-lg text-center">
          <div className={cn(
            'text-2xl font-bold mb-1',
            result.wcagAACompliant ? 'text-clinical-safe' : 'text-clinical-warning'
          )}>
            {result.wcagAACompliant ? '✅' : '⚠️'}
          </div>
          <Typography variant="body2" className="font-medium">
            WCAG AA
          </Typography>
          <Typography variant="caption" className="text-text-secondary">
            {result.wcagAACompliant ? 'Compliant' : 'Issues Found'}
          </Typography>
        </div>

        <div className="p-4 border border-border-primary rounded-lg text-center">
          <div className={cn(
            'text-2xl font-bold mb-1',
            result.mentalHealthSafe ? 'text-clinical-safe' : 'text-clinical-warning'
          )}>
            {result.mentalHealthSafe ? '🛡️' : '⚠️'}
          </div>
          <Typography variant="body2" className="font-medium">
            Mental Health Safe
          </Typography>
          <Typography variant="caption" className="text-text-secondary">
            {result.mentalHealthSafe ? 'Validated' : 'Needs Review'}
          </Typography>
        </div>
      </div>

      {/* Feature status grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className={result.traumaInformed ? 'text-clinical-safe' : 'text-clinical-warning'}>
            {result.traumaInformed ? '✅' : '❌'}
          </span>
          <span>Trauma-Informed Design</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={result.crisisSafe ? 'text-clinical-safe' : 'text-clinical-warning'}>
            {result.crisisSafe ? '✅' : '❌'}
          </span>
          <span>Crisis-Safe Operations</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={result.alternativesProvided ? 'text-clinical-safe' : 'text-clinical-warning'}>
            {result.alternativesProvided ? '✅' : '❌'}
          </span>
          <span>Alternative Access</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={result.consentRespected ? 'text-clinical-safe' : 'text-clinical-warning'}>
            {result.consentRespected ? '✅' : '❌'}
          </span>
          <span>Consent Respected</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={result.batteryOptimized ? 'text-clinical-safe' : 'text-text-secondary'}>
            {result.batteryOptimized ? '✅' : '⚪'}
          </span>
          <span>Battery Optimized</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={result.performanceOptimized ? 'text-clinical-safe' : 'text-text-secondary'}>
            {result.performanceOptimized ? '✅' : '⚪'}
          </span>
          <span>Performance Optimized</span>
        </div>
      </div>

      {/* Critical issues */}
      {result.criticalIssues.length > 0 && (
        <div className="p-4 bg-clinical-error/5 border border-clinical-error/20 rounded-lg">
          <Typography variant="h6" className="text-clinical-error font-bold mb-2">
            🚨 Critical Issues
          </Typography>
          <ul className="space-y-1">
            {result.criticalIssues.map((issue, index) => (
              <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-clinical-error mt-1">•</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Top recommendations */}
      {result.recommendations.length > 0 && (
        <div className="p-4 bg-clinical-primary/5 border border-clinical-primary/20 rounded-lg">
          <Typography variant="h6" className="text-clinical-primary font-bold mb-2">
            💡 Top Recommendations
          </Typography>
          <ul className="space-y-1">
            {result.recommendations.slice(0, 5).map((rec, index) => (
              <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                <span className="text-clinical-primary mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
          {result.recommendations.length > 5 && (
            <Typography variant="caption" className="text-text-tertiary mt-2 block">
              +{result.recommendations.length - 5} more recommendations available
            </Typography>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onRetry}>
          🔄 Re-validate
        </Button>
        <Button variant="primary" onClick={onExport}>
          📄 Export Report
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN HAPTIC ACCESSIBILITY VALIDATOR COMPONENT
// ============================================================================

export const HapticAccessibilityValidator: React.FC<HapticAccessibilityValidatorProps> = ({
  targetComponent = 'haptic-system',
  autoValidate = false,
  showDetailedResults = true,
  onValidationComplete,
  onAuditComplete,
  validateOnMount = false,
  realTimeValidation = false,
  includePerformanceTests = true,
  includeMentalHealthTests = true,
  className,
  'data-testid': testId,
  ...props
}) => {
  const {
    validateHapticAccessibility,
    generateAccessibilityReport,
    capabilities,
    preferences,
  } = useHapticAccessibilityTesting();
  
  const { announceToScreenReader } = useHapticAccessibilityContext();
  
  // State management
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<HapticAccessibilityValidationResult | null>(null);
  const [testResults, setTestResults] = useState<HapticAccessibilityTest[]>([]);
  const [progress, setProgress] = useState<ValidationProgress>({
    currentTest: '',
    completed: 0,
    total: 0,
    phase: 'initialization',
  });
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  
  // Refs
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Run comprehensive validation
  const runValidation = useCallback(async () => {
    setIsValidating(true);
    setValidationResult(null);
    setTestResults([]);
    
    try {
      announceToScreenReader(
        'Starting comprehensive haptic accessibility validation. This may take a few moments.',
        'assertive'
      );

      // Initialize progress
      const totalTests = includeMentalHealthTests ? 8 : 6;
      setProgress({
        currentTest: 'Initializing validation suite...',
        completed: 0,
        total: totalTests,
        phase: 'initialization',
      });

      // Simulate validation steps with realistic timing
      await new Promise(resolve => setTimeout(resolve, 500));

      // WCAG Compliance Tests
      setProgress(prev => ({
        ...prev,
        phase: 'wcag-tests',
        currentTest: 'Testing keyboard accessibility...',
        completed: 1,
      }));
      await new Promise(resolve => setTimeout(resolve, 800));

      setProgress(prev => ({
        ...prev,
        currentTest: 'Validating alternative content access...',
        completed: 2,
      }));
      await new Promise(resolve => setTimeout(resolve, 600));

      setProgress(prev => ({
        ...prev,
        currentTest: 'Checking timing and control accessibility...',
        completed: 3,
      }));
      await new Promise(resolve => setTimeout(resolve, 700));

      // Mental Health Tests (if enabled)
      if (includeMentalHealthTests) {
        setProgress(prev => ({
          ...prev,
          phase: 'mental-health-tests',
          currentTest: 'Validating crisis safety protocols...',
          completed: 4,
        }));
        await new Promise(resolve => setTimeout(resolve, 900));

        setProgress(prev => ({
          ...prev,
          currentTest: 'Testing trauma-informed design compliance...',
          completed: 5,
        }));
        await new Promise(resolve => setTimeout(resolve, 600));

        setProgress(prev => ({
          ...prev,
          currentTest: 'Validating consent mechanisms...',
          completed: 6,
        }));
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Performance Tests (if enabled)
      if (includePerformanceTests) {
        setProgress(prev => ({
          ...prev,
          phase: 'performance-tests',
          currentTest: 'Testing battery optimization...',
          completed: includePerformanceTests ? 7 : 6,
        }));
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Generate actual test results
      const tests = validateHapticAccessibility(targetComponent);
      const report = generateAccessibilityReport();

      setTestResults(tests);
      setValidationResult(report);

      setProgress(prev => ({
        ...prev,
        phase: 'complete',
        currentTest: 'Validation complete!',
        completed: prev.total,
      }));

      // Callbacks
      onValidationComplete?.(report);
      
      const audit: HapticAccessibilityAudit = {
        auditId: `audit-${Date.now()}`,
        scope: 'haptic-system',
        wcagLevel: 'AA',
        mentalHealthAccessibilityScore: report.score,
        traumaInformedCompliance: report.traumaInformed,
        tests,
        overallRecommendations: report.recommendations,
      };
      
      onAuditComplete?.(audit);

      announceToScreenReader(
        `Validation complete. Accessibility score: ${report.score} out of 100. ${
          report.wcagAACompliant ? 'WCAG AA compliant.' : 'WCAG compliance issues found.'
        } ${
          report.mentalHealthSafe ? 'Mental health safety validated.' : 'Mental health safety needs review.'
        }`,
        'assertive'
      );

    } catch (error) {
      console.error('Validation failed:', error);
      announceToScreenReader(
        'Validation failed due to an error. Please try again.',
        'assertive'
      );
    } finally {
      setIsValidating(false);
    }
  }, [
    targetComponent,
    includeMentalHealthTests,
    includePerformanceTests,
    validateHapticAccessibility,
    generateAccessibilityReport,
    onValidationComplete,
    onAuditComplete,
    announceToScreenReader,
  ]);

  // Toggle test expansion
  const toggleTestExpansion = useCallback((testId: string) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  }, []);

  // Export validation report
  const exportReport = useCallback(() => {
    if (!validationResult || !testResults.length) return;

    const reportData = {
      timestamp: new Date().toISOString(),
      component: targetComponent,
      overallScore: validationResult.score,
      wcagAACompliant: validationResult.wcagAACompliant,
      mentalHealthSafe: validationResult.mentalHealthSafe,
      traumaInformed: validationResult.traumaInformed,
      crisisSafe: validationResult.crisisSafe,
      capabilities,
      preferences,
      tests: testResults,
      recommendations: validationResult.recommendations,
      criticalIssues: validationResult.criticalIssues,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `haptic-accessibility-report-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    announceToScreenReader(
      'Accessibility report exported successfully. Check your downloads folder.',
      'polite'
    );
  }, [validationResult, testResults, targetComponent, capabilities, preferences, announceToScreenReader]);

  // Auto-validate on mount
  useEffect(() => {
    if (validateOnMount || autoValidate) {
      runValidation();
    }
  }, [validateOnMount, autoValidate, runValidation]);

  // Real-time validation
  useEffect(() => {
    if (realTimeValidation && !isValidating) {
      validationTimeoutRef.current = setTimeout(() => {
        runValidation();
      }, 5000); // Re-validate every 5 seconds
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [realTimeValidation, isValidating, runValidation]);

  return (
    <div
      className={cn(
        'haptic-accessibility-validator w-full max-w-4xl mx-auto',
        'bg-bg-primary rounded-xl border border-border-primary',
        'shadow-medium overflow-hidden',
        className
      )}
      data-testid={testId}
      role="region"
      aria-label="Haptic accessibility validation tool"
      {...props}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Typography variant="h3" className="font-bold text-clinical-text mb-2">
            🔍 Haptic Accessibility Validator
          </Typography>
          <Typography variant="body1" className="text-text-secondary">
            Comprehensive WCAG AA compliance and mental health safety validation for haptic feedback features
          </Typography>
        </div>

        {/* Validation controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="clinical"
            size="lg"
            onClick={runValidation}
            disabled={isValidating}
            loading={isValidating}
            className="px-6"
          >
            {isValidating ? 'Validating...' : '🔍 Start Validation'}
          </Button>
          
          {validationResult && (
            <Button
              variant="outline"
              size="lg"
              onClick={exportReport}
              className="px-6"
            >
              📄 Export Report
            </Button>
          )}
        </div>

        {/* Validation progress */}
        {isValidating && (
          <ValidationProgressIndicator progress={progress} />
        )}

        {/* Validation results */}
        {validationResult && !isValidating && (
          <ValidationSummary
            result={validationResult}
            onRetry={runValidation}
            onExport={exportReport}
          />
        )}

        {/* Detailed test results */}
        {showDetailedResults && testResults.length > 0 && !isValidating && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="h5" className="font-bold">
                Detailed Test Results
              </Typography>
              <div className="text-sm text-text-secondary">
                {testResults.filter(t => t.passed).length} / {testResults.length} tests passed
              </div>
            </div>
            
            <div className="space-y-3">
              {testResults.map((test) => (
                <ValidationTestResult
                  key={test.testId}
                  test={test}
                  expanded={expandedTests.has(test.testId)}
                  onToggle={() => toggleTestExpansion(test.testId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Help information */}
        {!isValidating && !validationResult && (
          <div className="p-4 bg-clinical-bg/5 border border-clinical-border rounded-lg">
            <Typography variant="h6" className="text-clinical-text font-bold mb-2">
              💡 About Haptic Accessibility Validation
            </Typography>
            <Typography variant="body2" className="text-text-secondary mb-3">
              This validator comprehensively tests haptic feedback features for:
            </Typography>
            <ul className="text-sm text-text-secondary space-y-1 ml-4">
              <li>• WCAG 2.1 AA compliance for all interaction patterns</li>
              <li>• Mental health safety and trauma-informed design</li>
              <li>• Crisis-safe operation during emergency scenarios</li>
              <li>• Alternative access methods for all haptic features</li>
              <li>• Body consent and user boundary respect</li>
              <li>• Battery optimization and performance impact</li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Live region for validation updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="false">
        {isValidating && progress.currentTest && (
          `Validation progress: ${progress.currentTest} ${progress.completed} of ${progress.total} tests complete.`
        )}
      </div>
    </div>
  );
};

export default HapticAccessibilityValidator;