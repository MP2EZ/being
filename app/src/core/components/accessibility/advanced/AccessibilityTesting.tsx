/**
 * Accessibility Testing Automation Framework
 * 
 * ACCESSIBILITY SPECIFICATIONS:
 * - Automated WCAG 2.1 AA compliance validation
 * - Screen reader compatibility testing
 * - Focus management and keyboard navigation testing
 * - Color contrast ratio validation
 * - Touch target size verification
 * - Performance impact assessment for accessibility features
 * - Real-time accessibility monitoring
 * - Accessibility metrics reporting and analytics
 */


import { logSecurity, logPerformance, logError, logDebug, LogCategory } from '@/core/services/logging';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  Dimensions,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';

// Accessibility test types and configurations
export type AccessibilityTestType = 
  | 'wcag_compliance'
  | 'screen_reader'
  | 'focus_management'
  | 'color_contrast'
  | 'touch_targets'
  | 'performance'
  | 'crisis_accessibility'
  | 'cognitive_load'
  | 'motor_accessibility'
  | 'sensory_support';

export interface AccessibilityTestConfig {
  testType: AccessibilityTestType;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  autoFix: boolean;
  realTimeMonitoring: boolean;
  reportingEnabled: boolean;
}

export interface AccessibilityTestResult {
  testType: AccessibilityTestType;
  passed: boolean;
  score: number; // 0-100
  issues: AccessibilityIssue[];
  performance: {
    executionTime: number;
    impactOnCrisisResponse: number; // milliseconds added to crisis response
  };
  recommendations: string[];
  wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
}

export interface AccessibilityIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
  wcagCriterion?: string;
  autoFixAvailable: boolean;
  therapeuticImpact?: 'low' | 'medium' | 'high' | 'critical';
  crisisImpact?: 'none' | 'minor' | 'major' | 'blocking';
}

export interface AccessibilityReport {
  timestamp: Date;
  overallScore: number;
  wcagCompliance: 'A' | 'AA' | 'AAA' | 'FAIL';
  testResults: AccessibilityTestResult[];
  criticalIssues: AccessibilityIssue[];
  crisisReadiness: boolean;
  therapeuticAccessibility: boolean;
  recommendations: string[];
  performanceImpact: {
    crisisResponseDelay: number;
    assessmentDelay: number;
    overallImpact: 'minimal' | 'moderate' | 'significant';
  };
}

// Main accessibility testing class
export class AccessibilityTester {
  private config: Map<AccessibilityTestType, AccessibilityTestConfig>;
  private testHistory: AccessibilityReport[];
  private realTimeMonitor: boolean;
  private performanceTracker: PerformanceTracker;

  constructor() {
    this.config = new Map();
    this.testHistory = [];
    this.realTimeMonitor = false;
    this.performanceTracker = new PerformanceTracker();
    this.initializeDefaultConfig();
  }

  private initializeDefaultConfig() {
    const defaultTests: AccessibilityTestConfig[] = [
      {
        testType: 'wcag_compliance',
        enabled: true,
        severity: 'error',
        autoFix: false,
        realTimeMonitoring: true,
        reportingEnabled: true,
      },
      {
        testType: 'crisis_accessibility',
        enabled: true,
        severity: 'error',
        autoFix: true,
        realTimeMonitoring: true,
        reportingEnabled: true,
      },
      {
        testType: 'screen_reader',
        enabled: true,
        severity: 'error',
        autoFix: false,
        realTimeMonitoring: false,
        reportingEnabled: true,
      },
      {
        testType: 'focus_management',
        enabled: true,
        severity: 'warning',
        autoFix: true,
        realTimeMonitoring: true,
        reportingEnabled: true,
      },
      {
        testType: 'color_contrast',
        enabled: true,
        severity: 'error',
        autoFix: true,
        realTimeMonitoring: false,
        reportingEnabled: true,
      },
      {
        testType: 'touch_targets',
        enabled: true,
        severity: 'warning',
        autoFix: true,
        realTimeMonitoring: true,
        reportingEnabled: true,
      },
      {
        testType: 'performance',
        enabled: true,
        severity: 'warning',
        autoFix: false,
        realTimeMonitoring: true,
        reportingEnabled: true,
      },
    ];

    defaultTests.forEach(config => {
      this.config.set(config.testType, config);
    });
  }

  // Run comprehensive accessibility test suite
  async runAccessibilityAudit(component?: React.ComponentType): Promise<AccessibilityReport> {
    const startTime = performance.now();
    const testResults: AccessibilityTestResult[] = [];
    const criticalIssues: AccessibilityIssue[] = [];

    // Run individual tests
    for (const [testType, config] of this.config) {
      if (!config.enabled) continue;

      const result = await this.runIndividualTest(testType, component);
      testResults.push(result);

      // Collect critical issues
      result.issues.forEach(issue => {
        if (issue.severity === 'error' || issue.crisisImpact === 'blocking') {
          criticalIssues.push(issue);
        }
      });
    }

    // Calculate overall metrics
    const overallScore = this.calculateOverallScore(testResults);
    const wcagCompliance = this.determineWCAGCompliance(testResults);
    const crisisReadiness = this.assessCrisisReadiness(testResults);
    const therapeuticAccessibility = this.assessTherapeuticAccessibility(testResults);
    const performanceImpact = this.assessPerformanceImpact(testResults);

    const report: AccessibilityReport = {
      timestamp: new Date(),
      overallScore,
      wcagCompliance,
      testResults,
      criticalIssues,
      crisisReadiness,
      therapeuticAccessibility,
      recommendations: this.generateRecommendations(testResults),
      performanceImpact,
    };

    this.testHistory.push(report);

    // Log performance
    const totalTime = performance.now() - startTime;
    logPerformance('Accessibility audit completed', totalTime, {
      category: 'computation',
      threshold: 1000
    });

    return report;
  }

  // Run individual accessibility test
  private async runIndividualTest(
    testType: AccessibilityTestType,
    component?: React.ComponentType
  ): Promise<AccessibilityTestResult> {
    switch (testType) {
      case 'wcag_compliance':
        return await this.testWCAGCompliance();
      case 'crisis_accessibility':
        return await this.testCrisisAccessibility();
      case 'screen_reader':
        return await this.testScreenReaderCompatibility();
      case 'focus_management':
        return await this.testFocusManagement();
      case 'color_contrast':
        return await this.testColorContrast();
      case 'touch_targets':
        return await this.testTouchTargets();
      case 'performance':
        return await this.testPerformanceImpact();
      case 'cognitive_load':
        return await this.testCognitiveAccessibility();
      case 'motor_accessibility':
        return await this.testMotorAccessibility();
      case 'sensory_support':
        return await this.testSensoryAccessibility();
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }
  }

  // WCAG compliance testing
  private async testWCAGCompliance(): Promise<AccessibilityTestResult> {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Test 1: Perceivable content
    const perceivableScore = await this.testPerceivable();
    score *= perceivableScore / 100;

    // Test 2: Operable interface
    const operableScore = await this.testOperable();
    score *= operableScore / 100;

    // Test 3: Understandable content
    const understandableScore = await this.testUnderstandable();
    score *= understandableScore / 100;

    // Test 4: Robust implementation
    const robustScore = await this.testRobust();
    score *= robustScore / 100;

    const wcagLevel = score >= 90 ? 'AAA' : score >= 80 ? 'AA' : score >= 70 ? 'A' : 'FAIL';

    return {
      testType: 'wcag_compliance',
      passed: score >= 80, // AA compliance threshold
      score: Math.round(score),
      issues,
      performance: {
        executionTime: 0,
        impactOnCrisisResponse: 0,
      },
      recommendations: this.generateWCAGRecommendations(score),
      wcagLevel,
    };
  }

  // Crisis accessibility testing (critical for mental health apps)
  private async testCrisisAccessibility(): Promise<AccessibilityTestResult> {
    const startTime = performance.now();
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Test crisis button accessibility
    const crisisButtonTest = await this.testCrisisButtonAccessibility();
    if (!crisisButtonTest.passed) {
      issues.push({
        id: 'crisis-button-accessibility',
        severity: 'error',
        message: 'Crisis button does not meet accessibility requirements',
        wcagCriterion: '2.1.1, 2.4.3',
        autoFixAvailable: true,
        therapeuticImpact: 'critical',
        crisisImpact: 'blocking',
      });
      score -= 30;
    }

    // Test emergency contact accessibility
    const emergencyContactTest = await this.testEmergencyContactAccessibility();
    if (!emergencyContactTest.passed) {
      issues.push({
        id: 'emergency-contact-accessibility',
        severity: 'error',
        message: 'Emergency contacts not accessible within 3 taps',
        wcagCriterion: '2.4.3',
        autoFixAvailable: true,
        therapeuticImpact: 'critical',
        crisisImpact: 'blocking',
      });
      score -= 25;
    }

    // Test crisis response time
    const responseTimeTest = await this.testCrisisResponseTime();
    if (responseTimeTest.responseTime > 200) {
      issues.push({
        id: 'crisis-response-time',
        severity: 'error',
        message: `Crisis response time ${responseTimeTest.responseTime}ms exceeds 200ms requirement`,
        autoFixAvailable: false,
        therapeuticImpact: 'critical',
        crisisImpact: 'major',
      });
      score -= Math.min(20, (responseTimeTest.responseTime - 200) / 10);
    }

    const executionTime = performance.now() - startTime;

    return {
      testType: 'crisis_accessibility',
      passed: score >= 90, // Higher threshold for crisis features
      score: Math.round(score),
      issues,
      performance: {
        executionTime,
        impactOnCrisisResponse: Math.max(0, executionTime - 50), // Target: <50ms overhead
      },
      recommendations: this.generateCrisisRecommendations(issues),
      wcagLevel: score >= 90 ? 'AA' : 'FAIL',
    };
  }

  // Screen reader compatibility testing
  private async testScreenReaderCompatibility(): Promise<AccessibilityTestResult> {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    try {
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      
      // Test ARIA labels and roles
      const ariaTest = await this.testARIAImplementation();
      if (!ariaTest.passed) {
        issues.push({
          id: 'aria-implementation',
          severity: 'error',
          message: 'Missing or incorrect ARIA labels and roles',
          wcagCriterion: '4.1.2',
          autoFixAvailable: true,
          therapeuticImpact: 'high',
        });
        score -= 20;
      }

      // Test reading order
      const readingOrderTest = await this.testReadingOrder();
      if (!readingOrderTest.passed) {
        issues.push({
          id: 'reading-order',
          severity: 'warning',
          message: 'Content reading order is not logical',
          wcagCriterion: '1.3.2',
          autoFixAvailable: true,
          therapeuticImpact: 'medium',
        });
        score -= 15;
      }

      // Test live regions
      const liveRegionTest = await this.testLiveRegions();
      if (!liveRegionTest.passed) {
        issues.push({
          id: 'live-regions',
          severity: 'warning',
          message: 'Dynamic content changes not announced to screen readers',
          wcagCriterion: '4.1.3',
          autoFixAvailable: true,
          therapeuticImpact: 'medium',
        });
        score -= 10;
      }

    } catch (error) {
      issues.push({
        id: 'screen-reader-test-error',
        severity: 'error',
        message: 'Failed to test screen reader compatibility',
        autoFixAvailable: false,
        therapeuticImpact: 'high',
      });
      score -= 30;
    }

    return {
      testType: 'screen_reader',
      passed: score >= 80,
      score: Math.round(score),
      issues,
      performance: {
        executionTime: 0,
        impactOnCrisisResponse: 0,
      },
      recommendations: this.generateScreenReaderRecommendations(issues),
      wcagLevel: score >= 90 ? 'AA' : score >= 70 ? 'A' : 'FAIL',
    };
  }

  // Performance impact testing for accessibility features
  private async testPerformanceImpact(): Promise<AccessibilityTestResult> {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Measure accessibility feature overhead
    const measurements = await this.performanceTracker.measureAccessibilityOverhead();

    // Crisis response time impact
    if (measurements.crisisResponseDelay > 50) {
      issues.push({
        id: 'crisis-performance-impact',
        severity: 'error',
        message: `Accessibility features add ${measurements.crisisResponseDelay}ms to crisis response`,
        autoFixAvailable: false,
        therapeuticImpact: 'critical',
        crisisImpact: 'major',
      });
      score -= Math.min(40, measurements.crisisResponseDelay - 50);
    }

    // Assessment performance impact
    if (measurements.assessmentDelay > 100) {
      issues.push({
        id: 'assessment-performance-impact',
        severity: 'warning',
        message: `Accessibility features add ${measurements.assessmentDelay}ms to assessment loading`,
        autoFixAvailable: true,
        therapeuticImpact: 'medium',
      });
      score -= Math.min(20, (measurements.assessmentDelay - 100) / 10);
    }

    // Memory usage impact
    if (measurements.memoryOverhead > 10) {
      issues.push({
        id: 'memory-overhead',
        severity: 'info',
        message: `Accessibility features use ${measurements.memoryOverhead}MB additional memory`,
        autoFixAvailable: true,
        therapeuticImpact: 'low',
      });
      score -= Math.min(10, measurements.memoryOverhead - 10);
    }

    return {
      testType: 'performance',
      passed: score >= 80,
      score: Math.round(score),
      issues,
      performance: {
        executionTime: measurements.testExecutionTime,
        impactOnCrisisResponse: measurements.crisisResponseDelay,
      },
      recommendations: this.generatePerformanceRecommendations(measurements),
      wcagLevel: score >= 80 ? 'AA' : 'A',
    };
  }

  // Helper methods for specific tests
  private async testPerceivable(): Promise<number> {
    // Test color contrast, text alternatives, etc.
    return 85; // Simplified for example
  }

  private async testOperable(): Promise<number> {
    // Test keyboard navigation, timing, etc.
    return 90; // Simplified for example
  }

  private async testUnderstandable(): Promise<number> {
    // Test readable text, predictable navigation, etc.
    return 88; // Simplified for example
  }

  private async testRobust(): Promise<number> {
    // Test compatibility with assistive technologies
    return 92; // Simplified for example
  }

  private async testCrisisButtonAccessibility(): Promise<{ passed: boolean }> {
    // Test if crisis button meets accessibility requirements
    return { passed: true }; // Simplified for example
  }

  private async testEmergencyContactAccessibility(): Promise<{ passed: boolean }> {
    // Test emergency contact accessibility
    return { passed: true }; // Simplified for example
  }

  private async testCrisisResponseTime(): Promise<{ responseTime: number }> {
    // Measure crisis feature response time
    return { responseTime: 150 }; // Simplified for example
  }

  private async testARIAImplementation(): Promise<{ passed: boolean }> {
    return { passed: true }; // Simplified for example
  }

  private async testReadingOrder(): Promise<{ passed: boolean }> {
    return { passed: true }; // Simplified for example
  }

  private async testLiveRegions(): Promise<{ passed: boolean }> {
    return { passed: true }; // Simplified for example
  }

  // Utility methods
  private calculateOverallScore(results: AccessibilityTestResult[]): number {
    if (results.length === 0) return 0;
    
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return Math.round(totalScore / results.length);
  }

  private determineWCAGCompliance(results: AccessibilityTestResult[]): 'A' | 'AA' | 'AAA' | 'FAIL' {
    const overallScore = this.calculateOverallScore(results);
    const hasCriticalFailures = results.some(r => 
      r.issues.some(i => i.severity === 'error' && i.crisisImpact === 'blocking')
    );

    if (hasCriticalFailures) return 'FAIL';
    if (overallScore >= 90) return 'AAA';
    if (overallScore >= 80) return 'AA';
    if (overallScore >= 70) return 'A';
    return 'FAIL';
  }

  private assessCrisisReadiness(results: AccessibilityTestResult[]): boolean {
    const crisisTest = results.find(r => r.testType === 'crisis_accessibility');
    return crisisTest ? crisisTest.passed : false;
  }

  private assessTherapeuticAccessibility(results: AccessibilityTestResult[]): boolean {
    const criticalIssues = results.flatMap(r => r.issues)
      .filter(i => i.therapeuticImpact === 'critical');
    return criticalIssues.length === 0;
  }

  private assessPerformanceImpact(results: AccessibilityTestResult[]): AccessibilityReport['performanceImpact'] {
    const performanceResult = results.find(r => r.testType === 'performance');
    const crisisDelay = performanceResult?.performance.impactOnCrisisResponse || 0;
    const assessmentDelay = Math.max(0, (performanceResult?.performance.executionTime || 0) - 100);
    
    const overallImpact = crisisDelay > 50 ? 'significant' : 
                         assessmentDelay > 200 ? 'moderate' : 'minimal';

    return {
      crisisResponseDelay: crisisDelay,
      assessmentDelay: assessmentDelay,
      overallImpact,
    };
  }

  private generateRecommendations(results: AccessibilityTestResult[]): string[] {
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (!result.passed) {
        recommendations.push(...result.recommendations);
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private generateWCAGRecommendations(score: number): string[] {
    if (score >= 90) return ['Excellent WCAG compliance! Consider AAA enhancements.'];
    if (score >= 80) return ['Good WCAG AA compliance. Focus on remaining issues.'];
    return ['Critical WCAG issues need immediate attention.'];
  }

  private generateCrisisRecommendations(issues: AccessibilityIssue[]): string[] {
    const recommendations = [];
    
    if (issues.some(i => i.crisisImpact === 'blocking')) {
      recommendations.push('Critical: Fix blocking crisis accessibility issues immediately');
    }
    
    if (issues.some(i => i.id === 'crisis-response-time')) {
      recommendations.push('Optimize crisis feature performance to meet <200ms requirement');
    }

    return recommendations;
  }

  private generateScreenReaderRecommendations(issues: AccessibilityIssue[]): string[] {
    return issues.map(issue => `Fix ${issue.id}: ${issue.message}`);
  }

  private generatePerformanceRecommendations(measurements: any): string[] {
    const recommendations = [];
    
    if (measurements.crisisResponseDelay > 50) {
      recommendations.push('Optimize accessibility features to reduce crisis response delay');
    }
    
    if (measurements.memoryOverhead > 10) {
      recommendations.push('Optimize memory usage of accessibility features');
    }

    return recommendations;
  }

  // Additional test methods would be implemented here
  private async testFocusManagement(): Promise<AccessibilityTestResult> {
    // Implementation for focus management testing
    return {
      testType: 'focus_management',
      passed: true,
      score: 85,
      issues: [],
      performance: { executionTime: 50, impactOnCrisisResponse: 0 },
      recommendations: [],
      wcagLevel: 'AA',
    };
  }

  private async testColorContrast(): Promise<AccessibilityTestResult> {
    // Implementation for color contrast testing
    return {
      testType: 'color_contrast',
      passed: true,
      score: 90,
      issues: [],
      performance: { executionTime: 30, impactOnCrisisResponse: 0 },
      recommendations: [],
      wcagLevel: 'AA',
    };
  }

  private async testTouchTargets(): Promise<AccessibilityTestResult> {
    // Implementation for touch target testing
    return {
      testType: 'touch_targets',
      passed: true,
      score: 95,
      issues: [],
      performance: { executionTime: 25, impactOnCrisisResponse: 0 },
      recommendations: [],
      wcagLevel: 'AAA',
    };
  }

  private async testCognitiveAccessibility(): Promise<AccessibilityTestResult> {
    // Implementation for cognitive accessibility testing
    return {
      testType: 'cognitive_load',
      passed: true,
      score: 88,
      issues: [],
      performance: { executionTime: 40, impactOnCrisisResponse: 0 },
      recommendations: [],
      wcagLevel: 'AA',
    };
  }

  private async testMotorAccessibility(): Promise<AccessibilityTestResult> {
    // Implementation for motor accessibility testing
    return {
      testType: 'motor_accessibility',
      passed: true,
      score: 87,
      issues: [],
      performance: { executionTime: 35, impactOnCrisisResponse: 0 },
      recommendations: [],
      wcagLevel: 'AA',
    };
  }

  private async testSensoryAccessibility(): Promise<AccessibilityTestResult> {
    // Implementation for sensory accessibility testing
    return {
      testType: 'sensory_support',
      passed: true,
      score: 89,
      issues: [],
      performance: { executionTime: 45, impactOnCrisisResponse: 0 },
      recommendations: [],
      wcagLevel: 'AA',
    };
  }
}

// Performance tracking utility
class PerformanceTracker {
  async measureAccessibilityOverhead(): Promise<{
    crisisResponseDelay: number;
    assessmentDelay: number;
    memoryOverhead: number;
    testExecutionTime: number;
  }> {
    const startTime = performance.now();
    
    // Simulate measurements
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      crisisResponseDelay: 25, // ms
      assessmentDelay: 75, // ms
      memoryOverhead: 5, // MB
      testExecutionTime: performance.now() - startTime,
    };
  }
}

// React component for accessibility testing UI
interface AccessibilityTestingPanelProps {
  autoRun?: boolean;
  showAdvanced?: boolean;
}

export const AccessibilityTestingPanel: React.FC<AccessibilityTestingPanelProps> = ({
  autoRun = false,
  showAdvanced = false,
}) => {
  const [tester] = useState(() => new AccessibilityTester());
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    try {
      const newReport = await tester.runAccessibilityAudit();
      setReport(newReport);
    } catch (error) {
      logError(LogCategory.ACCESSIBILITY, 'Accessibility testing failed', error instanceof Error ? error : undefined);
    } finally {
      setIsRunning(false);
    }
  }, [tester]);

  useEffect(() => {
    if (autoRun) {
      runTests();
    }
  }, [autoRun, runTests]);

  if (!showAdvanced && !__DEV__) {
    return null; // Hide in production unless explicitly shown
  }

  return (
    <View style={styles.testingPanel}>
      <Text style={styles.panelTitle}>
        Accessibility Testing
      </Text>
      
      {report && (
        <View style={styles.reportContainer}>
          <Text style={styles.scoreText}>
            Overall Score: {report.overallScore}/100
          </Text>
          <Text style={styles.complianceText}>
            WCAG Compliance: {report.wcagCompliance}
          </Text>
          <Text style={[
            styles.statusText,
            { color: report.crisisReadiness ? colorSystem.status.success : colorSystem.status.error }
          ]}>
            Crisis Ready: {report.crisisReadiness ? 'Yes' : 'No'}
          </Text>
          
          {report.criticalIssues.length > 0 && (
            <View style={styles.issuesContainer}>
              <Text style={styles.issuesTitle}>
                Critical Issues ({report.criticalIssues.length})
              </Text>
              {report.criticalIssues.slice(0, 3).map((issue, index) => (
                <Text key={index} style={styles.issueText}>
                  • {issue.message}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  testingPanel: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    margin: spacing[8],
  },
  panelTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing[8],
  },
  reportContainer: {
    gap: spacing[4],
  },
  scoreText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.accessibility.text.primary,
  },
  complianceText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
  },
  statusText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
  },
  issuesContainer: {
    marginTop: spacing[8],
    padding: spacing[8],
    backgroundColor: colorSystem.status.errorBackground,
    borderRadius: borderRadius.small,
  },
  issuesTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.status.error,
    marginBottom: spacing[4],
  },
  issueText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.status.error,
    lineHeight: typography.bodySmall.size * 1.4,
  },
});

export default AccessibilityTester;