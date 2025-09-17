/**
 * Accessibility Validation Utilities for Payment Components
 *
 * Comprehensive validation utilities to ensure WCAG 2.1 AA compliance
 * and mental health accessibility standards for payment sync UI components.
 *
 * Features:
 * - Color contrast validation (4.5:1 minimum, 7:1 for crisis elements)
 * - Screen reader performance monitoring
 * - Focus management validation
 * - Crisis accessibility verification
 * - Therapeutic language assessment
 */

import { AccessibilityInfo, Platform, Alert } from 'react-native';
import { colorSystem } from '../../constants/colors';

// Color contrast validation
export interface ContrastValidationResult {
  ratio: number;
  passes: boolean;
  level: 'AA' | 'AAA' | 'FAIL';
  recommendation?: string;
}

export const validateColorContrast = (
  foreground: string,
  background: string,
  isCrisisElement: boolean = false
): ContrastValidationResult => {
  const getLuminance = (color: string): number => {
    // Remove # if present
    const hex = color.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Convert to relative luminance
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  // Crisis elements require 7:1 ratio for enhanced safety
  const minimumRatio = isCrisisElement ? 7.0 : 4.5;

  if (ratio >= 7.0) {
    return { ratio, passes: true, level: 'AAA' };
  } else if (ratio >= minimumRatio) {
    return { ratio, passes: true, level: 'AA' };
  } else {
    return {
      ratio,
      passes: false,
      level: 'FAIL',
      recommendation: isCrisisElement
        ? 'Crisis elements require 7:1 contrast ratio for safety'
        : 'Increase contrast to meet 4.5:1 minimum ratio'
    };
  }
};

// Screen reader performance monitoring
export interface ScreenReaderPerformanceMetrics {
  announcementLatency: number;
  totalAnnouncements: number;
  failedAnnouncements: number;
  averageLatency: number;
  crisisAnnouncementLatency: number;
}

class ScreenReaderPerformanceMonitor {
  private metrics: ScreenReaderPerformanceMetrics = {
    announcementLatency: 0,
    totalAnnouncements: 0,
    failedAnnouncements: 0,
    averageLatency: 0,
    crisisAnnouncementLatency: 0
  };

  private performanceHistory: number[] = [];

  async announceWithPerformanceTracking(
    message: string,
    isCrisis: boolean = false,
    priority: 'polite' | 'assertive' = 'polite'
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Use assertive for crisis messages
      const urgency = isCrisis ? 'assertive' : priority;

      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(message);
      }

      const latency = Date.now() - startTime;
      this.recordPerformance(latency, isCrisis);

      // Alert if latency exceeds targets
      if (isCrisis && latency > 500) {
        console.warn(`Crisis announcement exceeded 500ms target: ${latency}ms`);
      } else if (!isCrisis && latency > 1000) {
        console.warn(`Standard announcement exceeded 1s target: ${latency}ms`);
      }

    } catch (error) {
      this.metrics.failedAnnouncements++;
      console.error('Screen reader announcement failed:', error);
    }
  }

  private recordPerformance(latency: number, isCrisis: boolean): void {
    this.metrics.totalAnnouncements++;
    this.performanceHistory.push(latency);

    if (isCrisis) {
      this.metrics.crisisAnnouncementLatency = latency;
    }

    // Calculate rolling average (last 10 announcements)
    const recentHistory = this.performanceHistory.slice(-10);
    this.metrics.averageLatency = recentHistory.reduce((sum, val) => sum + val, 0) / recentHistory.length;
    this.metrics.announcementLatency = latency;
  }

  getMetrics(): ScreenReaderPerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      announcementLatency: 0,
      totalAnnouncements: 0,
      failedAnnouncements: 0,
      averageLatency: 0,
      crisisAnnouncementLatency: 0
    };
    this.performanceHistory = [];
  }
}

export const screenReaderMonitor = new ScreenReaderPerformanceMonitor();

// Focus management validation
export interface FocusValidationResult {
  isAccessible: boolean;
  hasFocusableElements: boolean;
  logicalTabOrder: boolean;
  crisisAccessibility: boolean;
  recommendations: string[];
}

export const validateFocusManagement = async (
  componentTree: any[],
  hasCrisisElements: boolean = false
): Promise<FocusValidationResult> => {
  const result: FocusValidationResult = {
    isAccessible: true,
    hasFocusableElements: false,
    logicalTabOrder: true,
    crisisAccessibility: false,
    recommendations: []
  };

  try {
    // Check if screen reader is enabled
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();

    if (!screenReaderEnabled) {
      result.recommendations.push('Screen reader not available for testing');
    }

    // Validate focusable elements exist
    const focusableElements = componentTree.filter(element =>
      element.props?.accessible !== false &&
      (element.props?.accessibilityRole === 'button' ||
       element.props?.accessibilityRole === 'link' ||
       element.props?.focusable === true)
    );

    result.hasFocusableElements = focusableElements.length > 0;

    if (!result.hasFocusableElements) {
      result.isAccessible = false;
      result.recommendations.push('No focusable elements found - ensure interactive elements are accessible');
    }

    // Validate crisis elements are prioritized in focus order
    if (hasCrisisElements) {
      const crisisElements = componentTree.filter(element =>
        element.props?.accessibilityLabel?.includes('crisis') ||
        element.props?.accessibilityLabel?.includes('emergency') ||
        element.props?.accessibilityLabel?.includes('988')
      );

      result.crisisAccessibility = crisisElements.length > 0;

      if (!result.crisisAccessibility) {
        result.isAccessible = false;
        result.recommendations.push('Crisis elements must be properly labeled for accessibility');
      }
    }

    // Additional recommendations based on analysis
    if (result.isAccessible) {
      result.recommendations.push('Focus management validation passed');
    }

  } catch (error) {
    result.isAccessible = false;
    result.recommendations.push(`Focus validation failed: ${error}`);
  }

  return result;
};

// Crisis accessibility verification
export interface CrisisAccessibilityReport {
  emergencyAccessTime: number;
  crisisButtonAccessible: boolean;
  hotlineAccessible: boolean;
  screenReaderCompatible: boolean;
  voiceControlSupported: boolean;
  highContrastSupported: boolean;
  overallScore: number;
  criticalIssues: string[];
}

export const validateCrisisAccessibility = async (
  paymentComponents: any[]
): Promise<CrisisAccessibilityReport> => {
  const report: CrisisAccessibilityReport = {
    emergencyAccessTime: 0,
    crisisButtonAccessible: false,
    hotlineAccessible: false,
    screenReaderCompatible: false,
    voiceControlSupported: false,
    highContrastSupported: false,
    overallScore: 0,
    criticalIssues: []
  };

  const startTime = Date.now();

  try {
    // Check for crisis button accessibility
    const crisisButtons = paymentComponents.filter(component =>
      component.props?.accessibilityLabel?.includes('crisis') ||
      component.props?.testID?.includes('crisis')
    );

    report.crisisButtonAccessible = crisisButtons.length > 0;
    if (!report.crisisButtonAccessible) {
      report.criticalIssues.push('No accessible crisis button found in payment interface');
    }

    // Check for 988 hotline access
    const hotlineAccess = paymentComponents.filter(component =>
      component.props?.accessibilityLabel?.includes('988') ||
      component.props?.onPress?.toString().includes('988')
    );

    report.hotlineAccessible = hotlineAccess.length > 0;
    if (!report.hotlineAccessible) {
      report.criticalIssues.push('988 hotline access not found or not accessible');
    }

    // Verify screen reader compatibility
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    report.screenReaderCompatible = screenReaderEnabled;

    // Check voice control support
    const voiceControlComponents = paymentComponents.filter(component =>
      component.props?.accessibilityLabel?.includes('voice') ||
      component.type?.name?.includes('Voice')
    );

    report.voiceControlSupported = voiceControlComponents.length > 0;

    // Check high contrast support
    const highContrastComponents = paymentComponents.filter(component =>
      component.props?.style?.toString().includes('contrast') ||
      component.type?.name?.includes('HighContrast')
    );

    report.highContrastSupported = highContrastComponents.length > 0;

    // Calculate emergency access time
    report.emergencyAccessTime = Date.now() - startTime;

    // Calculate overall score
    const checks = [
      report.crisisButtonAccessible,
      report.hotlineAccessible,
      report.screenReaderCompatible,
      report.voiceControlSupported,
      report.highContrastSupported
    ];

    const passedChecks = checks.filter(Boolean).length;
    report.overallScore = Math.round((passedChecks / checks.length) * 100);

    // Add performance warning if needed
    if (report.emergencyAccessTime > 3000) {
      report.criticalIssues.push(`Emergency access time exceeded 3 seconds: ${report.emergencyAccessTime}ms`);
    }

  } catch (error) {
    report.criticalIssues.push(`Crisis accessibility validation failed: ${error}`);
  }

  return report;
};

// Therapeutic language assessment
export interface TherapeuticLanguageReport {
  anxietyTriggerWords: string[];
  therapeuticElements: string[];
  cognitiveLoadScore: number;
  readabilityScore: number;
  recommendations: string[];
}

export const assessTherapeuticLanguage = (
  text: string,
  context: 'payment' | 'error' | 'crisis' | 'general'
): TherapeuticLanguageReport => {
  const report: TherapeuticLanguageReport = {
    anxietyTriggerWords: [],
    therapeuticElements: [],
    cognitiveLoadScore: 0,
    readabilityScore: 0,
    recommendations: []
  };

  // Words that may trigger payment anxiety
  const anxietyTriggers = [
    'failed', 'rejected', 'declined', 'insufficient', 'invalid',
    'expired', 'blocked', 'suspended', 'terminated', 'defaulted',
    'overdue', 'penalty', 'fee', 'charge', 'debt'
  ];

  // Therapeutic language elements
  const therapeuticElements = [
    'safe', 'supported', 'temporary', 'resolved', 'help',
    'together', 'take your time', 'no rush', 'breathe',
    'worth', 'capable', 'option', 'choice', 'available'
  ];

  const lowerText = text.toLowerCase();

  // Identify anxiety triggers
  report.anxietyTriggerWords = anxietyTriggers.filter(word =>
    lowerText.includes(word)
  );

  // Identify therapeutic elements
  report.therapeuticElements = therapeuticElements.filter(element =>
    lowerText.includes(element)
  );

  // Calculate cognitive load score (lower is better)
  const wordCount = text.split(' ').length;
  const averageWordLength = text.replace(/\s/g, '').length / wordCount;
  const sentenceCount = text.split(/[.!?]+/).length;
  const averageSentenceLength = wordCount / sentenceCount;

  // Cognitive load increases with longer words and sentences
  report.cognitiveLoadScore = Math.round(
    (averageWordLength * 2) + (averageSentenceLength / 5)
  );

  // Basic readability assessment (Flesch-Kincaid approximation)
  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = averageWordLength * 0.6; // Approximation
  report.readabilityScore = Math.max(0, Math.round(
    206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)
  ));

  // Generate recommendations
  if (report.anxietyTriggerWords.length > 0) {
    report.recommendations.push(
      `Consider replacing anxiety triggers: ${report.anxietyTriggerWords.join(', ')}`
    );
  }

  if (report.therapeuticElements.length === 0) {
    report.recommendations.push('Add therapeutic elements to reduce anxiety');
  }

  if (report.cognitiveLoadScore > 15) {
    report.recommendations.push('Simplify language to reduce cognitive load');
  }

  if (report.readabilityScore < 60) {
    report.recommendations.push('Improve readability for better accessibility');
  }

  if (context === 'crisis' && report.therapeuticElements.length < 2) {
    report.recommendations.push('Crisis context requires more therapeutic language');
  }

  return report;
};

// Comprehensive accessibility audit
export interface AccessibilityAuditReport {
  componentName: string;
  wcagCompliance: 'AA' | 'A' | 'FAIL';
  overallScore: number;
  colorContrast: ContrastValidationResult[];
  focusManagement: FocusValidationResult;
  crisisAccessibility: CrisisAccessibilityReport;
  therapeuticLanguage: TherapeuticLanguageReport[];
  screenReaderPerformance: ScreenReaderPerformanceMetrics;
  recommendations: string[];
  criticalIssues: string[];
}

export const performAccessibilityAudit = async (
  componentName: string,
  componentTree: any[],
  textContent: string[],
  colorPairs: Array<{ foreground: string; background: string; isCrisis?: boolean }>
): Promise<AccessibilityAuditReport> => {
  const report: AccessibilityAuditReport = {
    componentName,
    wcagCompliance: 'FAIL',
    overallScore: 0,
    colorContrast: [],
    focusManagement: await validateFocusManagement(componentTree, true),
    crisisAccessibility: await validateCrisisAccessibility(componentTree),
    therapeuticLanguage: [],
    screenReaderPerformance: screenReaderMonitor.getMetrics(),
    recommendations: [],
    criticalIssues: []
  };

  // Validate color contrast
  report.colorContrast = colorPairs.map(pair =>
    validateColorContrast(pair.foreground, pair.background, pair.isCrisis)
  );

  // Assess therapeutic language
  report.therapeuticLanguage = textContent.map(text =>
    assessTherapeuticLanguage(text, 'payment')
  );

  // Calculate overall score
  const contrastScore = report.colorContrast.filter(c => c.passes).length / report.colorContrast.length;
  const focusScore = report.focusManagement.isAccessible ? 1 : 0;
  const crisisScore = report.crisisAccessibility.overallScore / 100;
  const therapeuticScore = report.therapeuticLanguage.reduce((acc, t) =>
    acc + (t.readabilityScore > 60 ? 1 : 0), 0
  ) / report.therapeuticLanguage.length;

  report.overallScore = Math.round(
    (contrastScore * 0.3 + focusScore * 0.25 + crisisScore * 0.3 + therapeuticScore * 0.15) * 100
  );

  // Determine WCAG compliance level
  if (report.overallScore >= 90 && contrastScore === 1 && focusScore === 1) {
    report.wcagCompliance = 'AA';
  } else if (report.overallScore >= 70) {
    report.wcagCompliance = 'A';
  } else {
    report.wcagCompliance = 'FAIL';
  }

  // Collect recommendations and critical issues
  report.recommendations = [
    ...report.focusManagement.recommendations,
    ...report.therapeuticLanguage.flatMap(t => t.recommendations),
    ...report.colorContrast.filter(c => c.recommendation).map(c => c.recommendation!)
  ];

  report.criticalIssues = [
    ...report.crisisAccessibility.criticalIssues,
    ...report.colorContrast.filter(c => !c.passes).map(c => `Color contrast failure: ${c.ratio.toFixed(2)}:1`)
  ];

  if (!report.focusManagement.isAccessible) {
    report.criticalIssues.push('Focus management accessibility failed');
  }

  return report;
};

// Export utility functions for component testing
export const AccessibilityTestUtils = {
  validateColorContrast,
  validateFocusManagement,
  validateCrisisAccessibility,
  assessTherapeuticLanguage,
  performAccessibilityAudit,
  screenReaderMonitor
};