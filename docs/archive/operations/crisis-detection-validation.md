# Crisis Detection System Validation

## Overview

This document outlines the comprehensive validation framework for the FullMind crisis detection system. The system must achieve 100% accuracy in identifying users at risk while minimizing false positives that could lead to crisis fatigue. This validation ensures clinical-grade reliability for a safety-critical mental health application.

## Crisis Detection Algorithm Specifications

### Core Detection Logic

#### Primary Crisis Triggers
```typescript
// From assessmentStore.ts - Clinical validation required for any changes
const requiresCrisisIntervention = (assessment: Assessment): boolean => {
  if (assessment.type === 'phq9') {
    // PHQ-9 Crisis Detection
    const severeDepression = assessment.score >= 20;  // CRISIS_THRESHOLD_PHQ9
    const suicidalIdeation = assessment.answers[8] >= 1;  // Question 9 (0-indexed)
    return severeDepression || suicidalIdeation;
  }
  
  if (assessment.type === 'gad7') {
    // GAD-7 Crisis Detection  
    const severeAnxiety = assessment.score >= 15;  // CRISIS_THRESHOLD_GAD7
    return severeAnxiety;
  }
  
  return false;
};
```

#### Clinical Thresholds Validation
```typescript
// Clinical constants - NEVER modify without clinical director approval
const CRISIS_THRESHOLD_PHQ9 = 20;  // Severe depression
const CRISIS_THRESHOLD_GAD7 = 15;  // Severe anxiety
const SUICIDAL_IDEATION_QUESTION_INDEX = 8;  // PHQ-9 Question 9 (0-indexed)
const SUICIDAL_IDEATION_THRESHOLD = 1;  // Any suicidal thoughts
```

### Secondary Risk Factors

#### Pattern-Based Detection
- **Rapid Deterioration**: 5+ point increase in assessment scores within 7 days
- **Sustained High Risk**: PHQ-9 ≥ 15 for 3+ consecutive assessments
- **Dual Presentation**: PHQ-9 ≥ 15 + GAD-7 ≥ 10 simultaneously
- **Crisis Button History**: Multiple crisis button activations within 30 days
- **Functional Impairment**: High assessment scores + inability to complete daily check-ins

#### Behavioral Indicators
- **Assessment Frequency**: Completing assessments multiple times per day
- **Check-in Abandonment**: Starting but not completing daily check-ins
- **Resource Seeking**: Repeatedly accessing crisis resources without calling
- **Time Patterns**: Completing assessments during high-risk hours (late night/early morning)

## Algorithm Testing Framework

### PHQ-9 Threshold Testing

#### Comprehensive Score Testing
```typescript
describe('PHQ-9 Crisis Detection', () => {
  // Test all possible score combinations
  const testCases = [
    // Boundary testing around crisis threshold
    { score: 19, suicidalIdeation: 0, shouldTrigger: false, description: 'High but below crisis' },
    { score: 20, suicidalIdeation: 0, shouldTrigger: true, description: 'Crisis threshold reached' },
    { score: 21, suicidalIdeation: 0, shouldTrigger: true, description: 'Above crisis threshold' },
    
    // Suicidal ideation testing
    { score: 5, suicidalIdeation: 1, shouldTrigger: true, description: 'Low score but suicidal thoughts' },
    { score: 10, suicidalIdeation: 2, shouldTrigger: true, description: 'Moderate score with frequent suicidal thoughts' },
    { score: 15, suicidalIdeation: 3, shouldTrigger: true, description: 'High score with daily suicidal thoughts' },
    
    // Edge cases
    { score: 0, suicidalIdeation: 0, shouldTrigger: false, description: 'Minimal depression' },
    { score: 27, suicidalIdeation: 3, shouldTrigger: true, description: 'Maximum severity' },
  ];
  
  testCases.forEach(({ score, suicidalIdeation, shouldTrigger, description }) => {
    test(description, () => {
      const answers = generatePHQ9Answers(score, suicidalIdeation);
      const assessment = createTestAssessment('phq9', answers, score);
      expect(requiresCrisisIntervention(assessment)).toBe(shouldTrigger);
    });
  });
});
```

#### All Possible PHQ-9 Combinations
```typescript
// Exhaustive testing of all 3^9 possible PHQ-9 answer combinations
describe('PHQ-9 Exhaustive Testing', () => {
  test('All possible answer combinations', () => {
    const results = {
      totalCombinations: 0,
      crisisDetected: 0,
      falsePositives: 0,
      falseNegatives: 0
    };
    
    // Generate all possible combinations (0-3 for each of 9 questions)
    for (let combo = 0; combo < Math.pow(4, 9); combo++) {
      const answers = generateAnswersFromCombination(combo);
      const score = calculatePHQ9Score(answers);
      const assessment = createTestAssessment('phq9', answers, score);
      
      const crisisDetected = requiresCrisisIntervention(assessment);
      const shouldTriggerCrisis = score >= 20 || answers[8] >= 1;
      
      results.totalCombinations++;
      if (crisisDetected) results.crisisDetected++;
      if (crisisDetected && !shouldTriggerCrisis) results.falsePositives++;
      if (!crisisDetected && shouldTriggerCrisis) results.falseNegatives++;
    }
    
    // Validation requirements
    expect(results.falseNegatives).toBe(0); // 100% sensitivity required
    expect(results.falsePositives / results.totalCombinations).toBeLessThan(0.05); // <5% false positive rate
  });
});
```

### GAD-7 Threshold Testing

#### Anxiety Crisis Detection Validation
```typescript
describe('GAD-7 Crisis Detection', () => {
  const testCases = [
    // Boundary testing
    { score: 14, shouldTrigger: false, description: 'Moderate anxiety below crisis' },
    { score: 15, shouldTrigger: true, description: 'Crisis threshold reached' },
    { score: 16, shouldTrigger: true, description: 'Above crisis threshold' },
    { score: 21, shouldTrigger: true, description: 'Maximum severity' },
    
    // Edge cases
    { score: 0, shouldTrigger: false, description: 'No anxiety' },
    { score: 7, shouldTrigger: false, description: 'Mild anxiety' },
    { score: 10, shouldTrigger: false, description: 'Moderate anxiety' },
  ];
  
  testCases.forEach(({ score, shouldTrigger, description }) => {
    test(description, () => {
      const answers = generateGAD7Answers(score);
      const assessment = createTestAssessment('gad7', answers, score);
      expect(requiresCrisisIntervention(assessment)).toBe(shouldTrigger);
    });
  });
});
```

### Combined Assessment Testing

#### Dual Assessment Crisis Detection
```typescript
describe('Combined PHQ-9 and GAD-7 Crisis Detection', () => {
  test('Independent crisis detection', () => {
    // Test that PHQ-9 and GAD-7 crisis detection work independently
    const phq9Crisis = createTestAssessment('phq9', generatePHQ9Answers(20, 0), 20);
    const gad7Crisis = createTestAssessment('gad7', generateGAD7Answers(15), 15);
    
    expect(requiresCrisisIntervention(phq9Crisis)).toBe(true);
    expect(requiresCrisisIntervention(gad7Crisis)).toBe(true);
  });
  
  test('Combined risk patterns', () => {
    // Test patterns that may indicate crisis even below individual thresholds
    const moderateDepression = createTestAssessment('phq9', generatePHQ9Answers(15, 0), 15);
    const moderateAnxiety = createTestAssessment('gad7', generateGAD7Answers(12), 12);
    
    // Individual assessments below crisis threshold
    expect(requiresCrisisIntervention(moderateDepression)).toBe(false);
    expect(requiresCrisisIntervention(moderateAnxiety)).toBe(false);
    
    // Future enhancement: Combined risk assessment
    // expect(requiresCombinedCrisisIntervention([moderateDepression, moderateAnxiety])).toBe(true);
  });
});
```

## False Positive/Negative Analysis

### Sensitivity Analysis (False Negatives)

#### Zero Tolerance for False Negatives
The crisis detection system must achieve 100% sensitivity for true positive cases:

```typescript
interface SensitivityRequirements {
  phq9ScoreAbove20: 100; // % detection rate
  anyS suicidalIdeation: 100; // % detection rate  
  gad7ScoreAbove15: 100; // % detection rate
  combinedHighRisk: 95; // % detection rate (future enhancement)
}

// Automated sensitivity testing
describe('Crisis Detection Sensitivity', () => {
  test('Zero false negatives for PHQ-9 ≥ 20', () => {
    const testCases = generatePHQ9TestCases(20, 27); // Scores 20-27
    testCases.forEach(assessment => {
      expect(requiresCrisisIntervention(assessment)).toBe(true);
    });
  });
  
  test('Zero false negatives for suicidal ideation', () => {
    const testCases = generateSuicidalIdeationCases(); // All cases with Q9 ≥ 1
    testCases.forEach(assessment => {
      expect(requiresCrisisIntervention(assessment)).toBe(true);
    });
  });
  
  test('Zero false negatives for GAD-7 ≥ 15', () => {
    const testCases = generateGAD7TestCases(15, 21); // Scores 15-21
    testCases.forEach(assessment => {
      expect(requiresCrisisIntervention(assessment)).toBe(true);
    });
  });
});
```

### Specificity Analysis (False Positives)

#### Acceptable False Positive Rate
Target: <5% false positive rate to prevent crisis fatigue while maintaining safety:

```typescript
interface SpecificityTargets {
  overallFalsePositiveRate: number; // <5%
  phq9BelowThreshold: number; // <3% for scores 15-19
  gad7BelowThreshold: number; // <3% for scores 10-14
  minimalScores: number; // <1% for minimal depression/anxiety
}

// False positive monitoring
describe('Crisis Detection Specificity', () => {
  test('Low false positive rate for PHQ-9 below threshold', () => {
    const testCases = generatePHQ9TestCases(0, 19); // Scores below crisis threshold
    const falsePositives = testCases.filter(assessment => 
      requiresCrisisIntervention(assessment) && assessment.answers[8] === 0
    );
    
    const falsePositiveRate = falsePositives.length / testCases.length;
    expect(falsePositiveRate).toBeLessThan(0.05); // <5%
  });
  
  test('Minimal false positives for low-risk scores', () => {
    const lowRiskPHQ9 = generatePHQ9TestCases(0, 9); // Minimal to mild
    const lowRiskGAD7 = generateGAD7TestCases(0, 9); // Minimal to mild
    
    const allLowRisk = [...lowRiskPHQ9, ...lowRiskGAD7];
    const falsePositives = allLowRisk.filter(assessment => 
      requiresCrisisIntervention(assessment)
    );
    
    const falsePositiveRate = falsePositives.length / allLowRisk.length;
    expect(falsePositiveRate).toBeLessThan(0.01); // <1%
  });
});
```

### Edge Case Testing

#### Boundary Condition Validation
```typescript
describe('Crisis Detection Edge Cases', () => {
  test('Exact threshold boundaries', () => {
    // PHQ-9 boundary cases
    expect(requiresCrisisIntervention(createTestAssessment('phq9', generatePHQ9Answers(19, 0), 19))).toBe(false);
    expect(requiresCrisisIntervention(createTestAssessment('phq9', generatePHQ9Answers(20, 0), 20))).toBe(true);
    
    // GAD-7 boundary cases
    expect(requiresCrisisIntervention(createTestAssessment('gad7', generateGAD7Answers(14), 14))).toBe(false);
    expect(requiresCrisisIntervention(createTestAssessment('gad7', generateGAD7Answers(15), 15))).toBe(true);
    
    // Suicidal ideation boundary
    expect(requiresCrisisIntervention(createTestAssessment('phq9', [0,0,0,0,0,0,0,0,0], 0))).toBe(false);
    expect(requiresCrisisIntervention(createTestAssessment('phq9', [0,0,0,0,0,0,0,0,1], 1))).toBe(true);
  });
  
  test('Invalid input handling', () => {
    // Test system behavior with invalid inputs
    expect(() => requiresCrisisIntervention(null)).toThrow();
    expect(() => requiresCrisisIntervention(undefined)).toThrow();
    expect(() => requiresCrisisIntervention({})).toThrow();
  });
  
  test('Malformed assessment data', () => {
    // Test handling of corrupted or incomplete data
    const incompleteAssessment = {
      type: 'phq9',
      answers: [1, 2, 3], // Incomplete answers
      score: 6
    };
    
    expect(() => requiresCrisisIntervention(incompleteAssessment)).toThrow();
  });
});
```

## Response Time Requirements

### Performance Benchmarks

#### Crisis Detection Speed Requirements
```typescript
interface ResponseTimeTargets {
  crisisDetection: number; // <100ms from assessment completion
  crisisScreenDisplay: number; // <3 seconds total response time
  resourceLoading: number; // <500ms for crisis resources
  emergencyContactNotification: number; // <10 seconds
}

// Performance testing
describe('Crisis Detection Performance', () => {
  test('Crisis detection algorithm speed', async () => {
    const startTime = performance.now();
    
    // Test with complex crisis case
    const complexAssessment = createTestAssessment('phq9', [3,3,3,3,3,3,3,3,3], 27);
    const result = requiresCrisisIntervention(complexAssessment);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    expect(result).toBe(true);
    expect(executionTime).toBeLessThan(100); // <100ms
  });
  
  test('Batch crisis detection performance', async () => {
    const assessments = generateLargeAssessmentBatch(1000);
    const startTime = performance.now();
    
    const results = assessments.map(assessment => requiresCrisisIntervention(assessment));
    
    const endTime = performance.now();
    const averageTime = (endTime - startTime) / assessments.length;
    
    expect(averageTime).toBeLessThan(10); // <10ms per assessment on average
  });
});
```

### User Experience Performance

#### Crisis Response Time Monitoring
```typescript
interface CrisisResponseMetrics {
  assessmentToDetection: number; // Time from assessment completion to crisis detection
  detectionToScreen: number; // Time from detection to crisis screen display
  screenToResources: number; // Time from screen load to usable crisis resources
  totalResponseTime: number; // End-to-end crisis response time
}

// Real-time performance monitoring
class CrisisPerformanceMonitor {
  async measureCrisisResponse(assessment: Assessment): Promise<CrisisResponseMetrics> {
    const metrics: CrisisResponseMetrics = {
      assessmentToDetection: 0,
      detectionToScreen: 0,
      screenToResources: 0,
      totalResponseTime: 0
    };
    
    const startTime = performance.now();
    
    // Measure crisis detection time
    const detectionStart = performance.now();
    const crisisDetected = requiresCrisisIntervention(assessment);
    metrics.assessmentToDetection = performance.now() - detectionStart;
    
    if (crisisDetected) {
      // Measure navigation to crisis screen
      const navigationStart = performance.now();
      await this.navigateToCrisisScreen();
      metrics.detectionToScreen = performance.now() - navigationStart;
      
      // Measure resource loading
      const resourceStart = performance.now();
      await this.loadCrisisResources();
      metrics.screenToResources = performance.now() - resourceStart;
    }
    
    metrics.totalResponseTime = performance.now() - startTime;
    return metrics;
  }
  
  private async navigateToCrisisScreen(): Promise<void> {
    // Simulate navigation to crisis screen
  }
  
  private async loadCrisisResources(): Promise<void> {
    // Simulate loading crisis resources and emergency contacts
  }
}
```

## Fail-Safe Mechanisms and Redundancy

### Primary Fail-Safe Systems

#### Algorithm Redundancy
```typescript
// Primary and backup crisis detection algorithms
class CrisisDetectionSystem {
  primaryDetection(assessment: Assessment): boolean {
    return requiresCrisisIntervention(assessment);
  }
  
  backupDetection(assessment: Assessment): boolean {
    // Simplified backup algorithm for system failures
    if (assessment.type === 'phq9') {
      return assessment.score >= 20 || assessment.answers[8] >= 1;
    }
    if (assessment.type === 'gad7') {
      return assessment.score >= 15;
    }
    return false;
  }
  
  async detectCrisis(assessment: Assessment): Promise<boolean> {
    try {
      // Try primary detection
      return this.primaryDetection(assessment);
    } catch (error) {
      console.error('Primary crisis detection failed, using backup:', error);
      
      try {
        // Fall back to backup detection
        return this.backupDetection(assessment);
      } catch (backupError) {
        console.error('Backup crisis detection failed:', backupError);
        
        // Ultimate fail-safe: err on side of caution
        return this.conservativeDetection(assessment);
      }
    }
  }
  
  private conservativeDetection(assessment: Assessment): boolean {
    // Ultra-conservative detection when all else fails
    if (assessment.type === 'phq9' && assessment.score >= 15) return true;
    if (assessment.type === 'gad7' && assessment.score >= 12) return true;
    return false;
  }
}
```

#### Data Validation Fail-Safes
```typescript
// Input validation with crisis-specific safeguards
class CrisisDataValidator {
  validateAssessmentForCrisis(assessment: Assessment): Assessment {
    // Validate basic assessment structure
    if (!assessment || !assessment.type || !assessment.answers || !Array.isArray(assessment.answers)) {
      throw new Error('Invalid assessment data for crisis detection');
    }
    
    // Validate answer array length and values
    const expectedLength = assessment.type === 'phq9' ? 9 : 7;
    if (assessment.answers.length !== expectedLength) {
      throw new Error(`Invalid answer count for ${assessment.type}: expected ${expectedLength}, got ${assessment.answers.length}`);
    }
    
    // Validate answer values (0-3)
    const invalidAnswers = assessment.answers.filter(answer => 
      typeof answer !== 'number' || answer < 0 || answer > 3 || !Number.isInteger(answer)
    );
    
    if (invalidAnswers.length > 0) {
      throw new Error(`Invalid answer values detected: ${invalidAnswers.join(', ')}`);
    }
    
    // Validate calculated score
    const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    if (assessment.score !== calculatedScore) {
      console.warn(`Score mismatch detected: provided ${assessment.score}, calculated ${calculatedScore}`);
      // Use calculated score for crisis detection
      return { ...assessment, score: calculatedScore };
    }
    
    return assessment;
  }
}
```

### Emergency Override Systems

#### Manual Crisis Override
```typescript
interface ManualCrisisOverride {
  userId: string;
  overrideReason: 'user_request' | 'staff_assessment' | 'emergency_situation';
  activatedBy: string; // Staff member ID
  activatedAt: string;
  duration: number; // Hours
  notes?: string;
}

class EmergencyCrisisOverride {
  async activateManualCrisis(
    userId: string, 
    reason: ManualCrisisOverride['overrideReason'],
    staffId: string,
    notes?: string
  ): Promise<void> {
    const override: ManualCrisisOverride = {
      userId,
      overrideReason: reason,
      activatedBy: staffId,
      activatedAt: new Date().toISOString(),
      duration: 24, // 24-hour default duration
      notes
    };
    
    // Store override in secure system
    await this.storeOverride(override);
    
    // Immediately trigger crisis resources for user
    await this.triggerCrisisResponse(userId, 'manual_override');
    
    // Notify crisis team
    await this.notifyCrisisTeam(override);
  }
  
  async isManualCrisisActive(userId: string): Promise<boolean> {
    const activeOverrides = await this.getActiveOverrides(userId);
    return activeOverrides.length > 0;
  }
}
```

#### System Failure Crisis Mode
```typescript
// Crisis mode activation during system failures
class SystemFailureCrisisMode {
  async activateFailureMode(): Promise<void> {
    // Lower all crisis thresholds for safety
    const emergencyThresholds = {
      PHQ9_CRISIS: 15, // Lowered from 20
      GAD7_CRISIS: 12, // Lowered from 15
      SUICIDAL_IDEATION: 1 // Unchanged - any suicidal ideation
    };
    
    // Activate conservative crisis detection
    await this.updateCrisisThresholds(emergencyThresholds);
    
    // Enable all crisis resources regardless of user settings
    await this.enableAllCrisisResources();
    
    // Notify all users about enhanced crisis monitoring
    await this.notifyUsersOfEnhancedMode();
    
    // Alert crisis team to system status
    await this.alertCrisisTeam('system_failure_mode_active');
  }
}
```

## Continuous Monitoring and Validation

### Real-Time Monitoring Dashboard

#### Crisis Detection Metrics
```typescript
interface CrisisDetectionMetrics {
  timestamp: string;
  totalAssessments: number;
  crisisDetected: number;
  falsePositiveRate: number;
  responseTimeAverage: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  activeOverrides: number;
}

class CrisisMonitoringDashboard {
  async getCurrentMetrics(): Promise<CrisisDetectionMetrics> {
    const metrics: CrisisDetectionMetrics = {
      timestamp: new Date().toISOString(),
      totalAssessments: await this.getTotalAssessmentsToday(),
      crisisDetected: await this.getCrisisDetectedToday(),
      falsePositiveRate: await this.calculateFalsePositiveRate(),
      responseTimeAverage: await this.getAverageResponseTime(),
      systemHealth: await this.getSystemHealth(),
      activeOverrides: await this.getActiveOverridesCount()
    };
    
    // Alert if metrics exceed thresholds
    await this.checkMetricThresholds(metrics);
    
    return metrics;
  }
  
  private async checkMetricThresholds(metrics: CrisisDetectionMetrics): Promise<void> {
    // Alert if false positive rate too high
    if (metrics.falsePositiveRate > 0.05) {
      await this.sendAlert('high_false_positive_rate', metrics);
    }
    
    // Alert if response time too slow
    if (metrics.responseTimeAverage > 3000) { // 3 seconds
      await this.sendAlert('slow_response_time', metrics);
    }
    
    // Alert if system health degraded
    if (metrics.systemHealth !== 'healthy') {
      await this.sendAlert('system_health_degraded', metrics);
    }
  }
}
```

### Automated Testing Pipeline

#### Continuous Validation
```typescript
// Automated testing pipeline for crisis detection
class CrisisDetectionCIPipeline {
  async runContinuousValidation(): Promise<void> {
    // Run every 15 minutes
    setInterval(async () => {
      try {
        await this.runFullValidationSuite();
      } catch (error) {
        await this.handleValidationFailure(error);
      }
    }, 15 * 60 * 1000); // 15 minutes
  }
  
  private async runFullValidationSuite(): Promise<void> {
    // Test crisis detection accuracy
    await this.testCrisisDetectionAccuracy();
    
    // Test response time performance
    await this.testResponseTimePerformance();
    
    // Test fail-safe mechanisms
    await this.testFailSafeMechanisms();
    
    // Test emergency override systems
    await this.testEmergencyOverrides();
    
    // Validate data integrity
    await this.validateDataIntegrity();
  }
  
  private async handleValidationFailure(error: Error): Promise<void> {
    // Immediate alert to crisis team
    await this.sendImmediateAlert('validation_failure', error);
    
    // Activate conservative crisis mode
    await this.activateConservativeMode();
    
    // Log detailed error information
    await this.logValidationFailure(error);
  }
}
```

### Performance Optimization

#### Continuous Performance Monitoring
```typescript
interface PerformanceOptimization {
  algorithmOptimization: {
    executionTime: number;
    memoryUsage: number;
    cacheHitRate: number;
  };
  userExperience: {
    crisisResponseTime: number;
    resourceLoadTime: number;
    userSatisfaction: number;
  };
  systemReliability: {
    uptime: number;
    errorRate: number;
    failoverTime: number;
  };
}

class CrisisPerformanceOptimizer {
  async optimizeCrisisDetection(): Promise<void> {
    // Optimize algorithm performance
    await this.optimizeAlgorithmExecution();
    
    // Preload crisis resources
    await this.preloadCrisisResources();
    
    // Optimize database queries
    await this.optimizeCrisisDataQueries();
    
    // Cache frequently accessed crisis data
    await this.implementCrisisDataCaching();
  }
  
  private async optimizeAlgorithmExecution(): Promise<void> {
    // Memoize crisis detection results for identical inputs
    // Optimize mathematical calculations
    // Reduce memory allocations during crisis detection
  }
}
```

---

**Document Control**
- **Version**: 1.0
- **Last Updated**: 2024-09-10
- **Next Review**: 2024-10-10 (Monthly)
- **Technical Lead**: [CTO]
- **Clinical Validator**: [Clinical Director]
- **QA Lead**: [QA Director]