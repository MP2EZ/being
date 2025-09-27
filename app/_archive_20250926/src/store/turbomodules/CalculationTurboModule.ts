/**
 * CalculationTurboModule - Native clinical calculation acceleration
 *
 * TurboModule implementation for enhanced clinical calculation performance
 * with 100% accuracy guarantee and crisis detection optimization.
 */

import { TurboModule, TurboModuleRegistry } from 'react-native';

// Clinical calculation types
export interface PHQ9CalculationResult {
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'moderately severe' | 'severe';
  requiresCrisisIntervention: boolean;
  suicidalIdeation: boolean;
  calculationTime: number;
}

export interface GAD7CalculationResult {
  score: number;
  severity: 'minimal' | 'mild' | 'moderate' | 'severe';
  requiresCrisisIntervention: boolean;
  calculationTime: number;
}

export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggers: string[];
  recommendedActions: string[];
  detectionTime: number;
}

// TurboModule specification for clinical calculations
export interface Spec extends TurboModule {
  // PHQ-9 calculations
  calculatePHQ9Score(answers: number[]): Promise<number>;
  calculatePHQ9WithDetails(answers: number[]): Promise<PHQ9CalculationResult>;
  validatePHQ9Answers(answers: number[]): Promise<boolean>;

  // GAD-7 calculations
  calculateGAD7Score(answers: number[]): Promise<number>;
  calculateGAD7WithDetails(answers: number[]): Promise<GAD7CalculationResult>;
  validateGAD7Answers(answers: number[]): Promise<boolean>;

  // Crisis detection
  detectCrisisFromPHQ9(answers: number[]): Promise<CrisisDetectionResult>;
  detectCrisisFromGAD7(answers: number[]): Promise<CrisisDetectionResult>;
  detectSuicidalIdeation(phq9Answers: number[]): Promise<boolean>;
  validateCrisisThreshold(score: number, type: 'phq9' | 'gad7'): Promise<boolean>;

  // Real-time calculation during assessment
  calculatePartialScore(
    answers: number[],
    assessmentType: 'phq9' | 'gad7',
    currentQuestion: number
  ): Promise<{
    currentScore: number;
    projectedScore: number;
    crisisRisk: 'low' | 'medium' | 'high';
  }>;

  // Performance monitoring
  getCalculationMetrics(): Promise<{
    avgCalculationTime: number;
    totalCalculations: number;
    accuracyValidations: number;
    crisisDetections: number;
  }>;

  // Validation and accuracy
  validateCalculationAccuracy(): Promise<{
    phq9Accuracy: number;
    gad7Accuracy: number;
    lastValidation: number;
  }>;
}

// JavaScript fallback implementation
class CalculationTurboModuleImpl implements Spec {
  private performanceTracker: {
    calculationTimes: number[];
    totalCalculations: number;
    accuracyValidations: number;
    crisisDetections: number;
  };

  constructor() {
    this.performanceTracker = {
      calculationTimes: [],
      totalCalculations: 0,
      accuracyValidations: 0,
      crisisDetections: 0
    };
  }

  // PHQ-9 calculations with 100% accuracy guarantee
  async calculatePHQ9Score(answers: number[]): Promise<number> {
    const startTime = performance.now();

    // Validate input
    if (!this.isValidPHQ9Input(answers)) {
      throw new Error('Invalid PHQ-9 answers: must be array of 9 numbers (0-3)');
    }

    // Calculate score with clinical accuracy
    const score = answers.reduce((sum, answer) => sum + answer, 0);

    const calculationTime = performance.now() - startTime;
    this.recordCalculationTime(calculationTime);

    // Validate calculation target: <50ms
    if (calculationTime > 50) {
      console.warn(`PHQ-9 calculation exceeded 50ms target: ${calculationTime}ms`);
    }

    return score;
  }

  async calculatePHQ9WithDetails(answers: number[]): Promise<PHQ9CalculationResult> {
    const startTime = performance.now();

    const score = await this.calculatePHQ9Score(answers);
    const severity = this.getPHQ9Severity(score);
    const requiresCrisisIntervention = score >= 20; // Clinical threshold
    const suicidalIdeation = answers[8] >= 1; // Question 9 (0-based index 8)

    const calculationTime = performance.now() - startTime;

    return {
      score,
      severity,
      requiresCrisisIntervention,
      suicidalIdeation,
      calculationTime
    };
  }

  async validatePHQ9Answers(answers: number[]): Promise<boolean> {
    return this.isValidPHQ9Input(answers);
  }

  // GAD-7 calculations with 100% accuracy guarantee
  async calculateGAD7Score(answers: number[]): Promise<number> {
    const startTime = performance.now();

    // Validate input
    if (!this.isValidGAD7Input(answers)) {
      throw new Error('Invalid GAD-7 answers: must be array of 7 numbers (0-3)');
    }

    // Calculate score with clinical accuracy
    const score = answers.reduce((sum, answer) => sum + answer, 0);

    const calculationTime = performance.now() - startTime;
    this.recordCalculationTime(calculationTime);

    // Validate calculation target: <50ms
    if (calculationTime > 50) {
      console.warn(`GAD-7 calculation exceeded 50ms target: ${calculationTime}ms`);
    }

    return score;
  }

  async calculateGAD7WithDetails(answers: number[]): Promise<GAD7CalculationResult> {
    const startTime = performance.now();

    const score = await this.calculateGAD7Score(answers);
    const severity = this.getGAD7Severity(score);
    const requiresCrisisIntervention = score >= 15; // Clinical threshold

    const calculationTime = performance.now() - startTime;

    return {
      score,
      severity,
      requiresCrisisIntervention,
      calculationTime
    };
  }

  async validateGAD7Answers(answers: number[]): Promise<boolean> {
    return this.isValidGAD7Input(answers);
  }

  // Crisis detection with <100ms response time
  async detectCrisisFromPHQ9(answers: number[]): Promise<CrisisDetectionResult> {
    const startTime = performance.now();

    const score = await this.calculatePHQ9Score(answers);
    const suicidalIdeation = answers[8] >= 1;

    let isCrisis = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const triggers: string[] = [];
    const recommendedActions: string[] = [];

    // Critical crisis: Suicidal ideation
    if (suicidalIdeation) {
      isCrisis = true;
      severity = 'critical';
      triggers.push('suicidal_ideation');
      recommendedActions.push('immediate_intervention', 'call_988', 'emergency_contacts');
    }

    // High crisis: Severe depression (score >= 20)
    if (score >= 20) {
      isCrisis = true;
      if (severity !== 'critical') severity = 'high';
      triggers.push('severe_depression_score');
      recommendedActions.push('crisis_assessment', 'professional_referral');
    }

    // Medium crisis: Moderately severe depression (score 15-19)
    if (score >= 15 && score < 20 && !isCrisis) {
      isCrisis = true;
      severity = 'medium';
      triggers.push('moderately_severe_depression');
      recommendedActions.push('enhanced_monitoring', 'check_in_frequency_increase');
    }

    const detectionTime = performance.now() - startTime;

    if (isCrisis) {
      this.performanceTracker.crisisDetections++;
    }

    // Crisis detection must complete in <100ms
    if (detectionTime > 100) {
      console.warn(`PHQ-9 crisis detection exceeded 100ms target: ${detectionTime}ms`);
    }

    return {
      isCrisis,
      severity,
      triggers,
      recommendedActions,
      detectionTime
    };
  }

  async detectCrisisFromGAD7(answers: number[]): Promise<CrisisDetectionResult> {
    const startTime = performance.now();

    const score = await this.calculateGAD7Score(answers);

    let isCrisis = false;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const triggers: string[] = [];
    const recommendedActions: string[] = [];

    // High crisis: Severe anxiety (score >= 15)
    if (score >= 15) {
      isCrisis = true;
      severity = 'high';
      triggers.push('severe_anxiety_score');
      recommendedActions.push('anxiety_intervention', 'breathing_exercises', 'professional_consultation');
    }

    // Medium crisis: Moderate anxiety (score 10-14)
    if (score >= 10 && score < 15 && !isCrisis) {
      isCrisis = true;
      severity = 'medium';
      triggers.push('moderate_anxiety');
      recommendedActions.push('mindfulness_practices', 'stress_management');
    }

    const detectionTime = performance.now() - startTime;

    if (isCrisis) {
      this.performanceTracker.crisisDetections++;
    }

    // Crisis detection must complete in <100ms
    if (detectionTime > 100) {
      console.warn(`GAD-7 crisis detection exceeded 100ms target: ${detectionTime}ms`);
    }

    return {
      isCrisis,
      severity,
      triggers,
      recommendedActions,
      detectionTime
    };
  }

  async detectSuicidalIdeation(phq9Answers: number[]): Promise<boolean> {
    if (!this.isValidPHQ9Input(phq9Answers)) {
      throw new Error('Invalid PHQ-9 answers for suicidal ideation detection');
    }

    // Question 9 (0-based index 8): "Thoughts that you would be better off dead..."
    return phq9Answers[8] >= 1;
  }

  async validateCrisisThreshold(score: number, type: 'phq9' | 'gad7'): Promise<boolean> {
    const thresholds = {
      phq9: 20, // Severe depression
      gad7: 15  // Severe anxiety
    };

    return score >= thresholds[type];
  }

  // Real-time calculation during assessment
  async calculatePartialScore(
    answers: number[],
    assessmentType: 'phq9' | 'gad7',
    currentQuestion: number
  ): Promise<{
    currentScore: number;
    projectedScore: number;
    crisisRisk: 'low' | 'medium' | 'high';
  }> {
    const startTime = performance.now();

    // Validate inputs
    const maxQuestions = assessmentType === 'phq9' ? 9 : 7;
    if (currentQuestion < 0 || currentQuestion >= maxQuestions) {
      throw new Error(`Invalid question index for ${assessmentType}: ${currentQuestion}`);
    }

    // Calculate current partial score
    const answeredQuestions = answers.slice(0, currentQuestion + 1);
    const currentScore = answeredQuestions.reduce((sum, answer) => sum + (answer || 0), 0);

    // Project full score based on current average
    const avgResponseValue = currentScore / (currentQuestion + 1);
    const projectedScore = Math.round(avgResponseValue * maxQuestions);

    // Determine crisis risk based on projection
    let crisisRisk: 'low' | 'medium' | 'high' = 'low';

    if (assessmentType === 'phq9') {
      // Check for immediate suicidal ideation (Question 9)
      if (currentQuestion === 8 && answers[8] >= 1) {
        crisisRisk = 'high';
      } else if (projectedScore >= 20) {
        crisisRisk = 'high';
      } else if (projectedScore >= 15) {
        crisisRisk = 'medium';
      }
    } else { // GAD-7
      if (projectedScore >= 15) {
        crisisRisk = 'high';
      } else if (projectedScore >= 10) {
        crisisRisk = 'medium';
      }
    }

    const calculationTime = performance.now() - startTime;

    // Real-time calculations must be very fast
    if (calculationTime > 25) {
      console.warn(`Partial score calculation exceeded 25ms target: ${calculationTime}ms`);
    }

    return {
      currentScore,
      projectedScore,
      crisisRisk
    };
  }

  // Performance monitoring
  async getCalculationMetrics(): Promise<{
    avgCalculationTime: number;
    totalCalculations: number;
    accuracyValidations: number;
    crisisDetections: number;
  }> {
    const avgCalculationTime = this.performanceTracker.calculationTimes.length > 0
      ? this.performanceTracker.calculationTimes.reduce((sum, time) => sum + time, 0) / this.performanceTracker.calculationTimes.length
      : 0;

    return {
      avgCalculationTime,
      totalCalculations: this.performanceTracker.totalCalculations,
      accuracyValidations: this.performanceTracker.accuracyValidations,
      crisisDetections: this.performanceTracker.crisisDetections
    };
  }

  // Validation and accuracy testing
  async validateCalculationAccuracy(): Promise<{
    phq9Accuracy: number;
    gad7Accuracy: number;
    lastValidation: number;
  }> {
    const startTime = performance.now();

    // Run accuracy validation test cases
    const phq9TestCases = this.getPHQ9TestCases();
    const gad7TestCases = this.getGAD7TestCases();

    let phq9Correct = 0;
    let gad7Correct = 0;

    // Test PHQ-9 accuracy
    for (const testCase of phq9TestCases) {
      try {
        const calculatedScore = await this.calculatePHQ9Score(testCase.answers);
        if (calculatedScore === testCase.expectedScore) {
          phq9Correct++;
        }
      } catch (error) {
        console.error('PHQ-9 accuracy test failed:', error);
      }
    }

    // Test GAD-7 accuracy
    for (const testCase of gad7TestCases) {
      try {
        const calculatedScore = await this.calculateGAD7Score(testCase.answers);
        if (calculatedScore === testCase.expectedScore) {
          gad7Correct++;
        }
      } catch (error) {
        console.error('GAD-7 accuracy test failed:', error);
      }
    }

    const phq9Accuracy = phq9TestCases.length > 0 ? phq9Correct / phq9TestCases.length : 1;
    const gad7Accuracy = gad7TestCases.length > 0 ? gad7Correct / gad7TestCases.length : 1;

    this.performanceTracker.accuracyValidations++;

    const validationTime = performance.now() - startTime;
    console.log(`Accuracy validation completed in ${validationTime}ms`);

    return {
      phq9Accuracy,
      gad7Accuracy,
      lastValidation: Date.now()
    };
  }

  // Private helper methods
  private isValidPHQ9Input(answers: number[]): boolean {
    return Array.isArray(answers) &&
           answers.length === 9 &&
           answers.every(answer =>
             typeof answer === 'number' &&
             Number.isInteger(answer) &&
             answer >= 0 &&
             answer <= 3
           );
  }

  private isValidGAD7Input(answers: number[]): boolean {
    return Array.isArray(answers) &&
           answers.length === 7 &&
           answers.every(answer =>
             typeof answer === 'number' &&
             Number.isInteger(answer) &&
             answer >= 0 &&
             answer <= 3
           );
  }

  private getPHQ9Severity(score: number): 'minimal' | 'mild' | 'moderate' | 'moderately severe' | 'severe' {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    if (score <= 19) return 'moderately severe';
    return 'severe';
  }

  private getGAD7Severity(score: number): 'minimal' | 'mild' | 'moderate' | 'severe' {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    return 'severe';
  }

  private recordCalculationTime(duration: number): void {
    this.performanceTracker.calculationTimes.push(duration);
    this.performanceTracker.totalCalculations++;

    // Keep only last 1000 measurements
    if (this.performanceTracker.calculationTimes.length > 1000) {
      this.performanceTracker.calculationTimes.shift();
    }
  }

  private getPHQ9TestCases(): Array<{ answers: number[]; expectedScore: number }> {
    return [
      { answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], expectedScore: 0 },
      { answers: [1, 1, 1, 1, 1, 1, 1, 1, 1], expectedScore: 9 },
      { answers: [2, 2, 2, 2, 2, 2, 2, 2, 2], expectedScore: 18 },
      { answers: [3, 3, 3, 3, 3, 3, 3, 3, 3], expectedScore: 27 },
      { answers: [1, 2, 1, 0, 1, 2, 1, 0, 3], expectedScore: 11 }, // Mixed case with suicidal ideation
      { answers: [3, 3, 2, 2, 2, 2, 2, 2, 0], expectedScore: 18 }, // Severe without suicidal ideation
    ];
  }

  private getGAD7TestCases(): Array<{ answers: number[]; expectedScore: number }> {
    return [
      { answers: [0, 0, 0, 0, 0, 0, 0], expectedScore: 0 },
      { answers: [1, 1, 1, 1, 1, 1, 1], expectedScore: 7 },
      { answers: [2, 2, 2, 2, 2, 2, 2], expectedScore: 14 },
      { answers: [3, 3, 3, 3, 3, 3, 3], expectedScore: 21 },
      { answers: [1, 2, 1, 0, 2, 1, 3], expectedScore: 10 }, // Mixed case
      { answers: [2, 3, 2, 3, 2, 3, 0], expectedScore: 15 }, // Severe anxiety
    ];
  }
}

// Get TurboModule instance or fallback to JavaScript implementation
export const CalculationTurbo: Spec =
  TurboModuleRegistry.get<Spec>('CalculationTurbo') ??
  new CalculationTurboModuleImpl();

/**
 * Enhanced calculation service with TurboModule integration
 */
export class EnhancedCalculationService {
  private turboModule: Spec;
  private isNativeTurboModule: boolean;

  constructor() {
    this.turboModule = CalculationTurbo;
    this.isNativeTurboModule = TurboModuleRegistry.get('CalculationTurbo') !== null;

    if (this.isNativeTurboModule) {
      console.log('Using native CalculationTurbo module');
    } else {
      console.log('Using JavaScript calculation fallback');
    }

    // Run initial accuracy validation
    this.validateAccuracy();
  }

  // Enhanced PHQ-9 calculations
  async calculatePHQ9Score(answers: number[]): Promise<number> {
    return this.turboModule.calculatePHQ9Score(answers);
  }

  async calculatePHQ9WithDetails(answers: number[]): Promise<PHQ9CalculationResult> {
    return this.turboModule.calculatePHQ9WithDetails(answers);
  }

  async validatePHQ9Answers(answers: number[]): Promise<boolean> {
    return this.turboModule.validatePHQ9Answers(answers);
  }

  // Enhanced GAD-7 calculations
  async calculateGAD7Score(answers: number[]): Promise<number> {
    return this.turboModule.calculateGAD7Score(answers);
  }

  async calculateGAD7WithDetails(answers: number[]): Promise<GAD7CalculationResult> {
    return this.turboModule.calculateGAD7WithDetails(answers);
  }

  async validateGAD7Answers(answers: number[]): Promise<boolean> {
    return this.turboModule.validateGAD7Answers(answers);
  }

  // Enhanced crisis detection
  async detectCrisis(
    assessmentType: 'phq9' | 'gad7',
    answers: number[]
  ): Promise<CrisisDetectionResult> {
    if (assessmentType === 'phq9') {
      return this.turboModule.detectCrisisFromPHQ9(answers);
    } else {
      return this.turboModule.detectCrisisFromGAD7(answers);
    }
  }

  async detectSuicidalIdeation(phq9Answers: number[]): Promise<boolean> {
    return this.turboModule.detectSuicidalIdeation(phq9Answers);
  }

  // Real-time calculation for progressive assessment
  async calculatePartialScore(
    answers: number[],
    assessmentType: 'phq9' | 'gad7',
    currentQuestion: number
  ): Promise<{
    currentScore: number;
    projectedScore: number;
    crisisRisk: 'low' | 'medium' | 'high';
  }> {
    return this.turboModule.calculatePartialScore(answers, assessmentType, currentQuestion);
  }

  // Performance and accuracy monitoring
  async getPerformanceReport(): Promise<{
    metrics: {
      avgCalculationTime: number;
      totalCalculations: number;
      accuracyValidations: number;
      crisisDetections: number;
    };
    accuracy: {
      phq9Accuracy: number;
      gad7Accuracy: number;
      lastValidation: number;
    };
    recommendations: string[];
  }> {
    const [metrics, accuracy] = await Promise.all([
      this.turboModule.getCalculationMetrics(),
      this.turboModule.validateCalculationAccuracy()
    ]);

    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.avgCalculationTime > 25) {
      recommendations.push('Calculation performance is below optimal, consider native optimization');
    }

    if (accuracy.phq9Accuracy < 1.0 || accuracy.gad7Accuracy < 1.0) {
      recommendations.push('Calculation accuracy issues detected, requires immediate attention');
    }

    if (metrics.crisisDetections > 0) {
      recommendations.push(`${metrics.crisisDetections} crisis situations detected - ensure proper follow-up`);
    }

    return {
      metrics,
      accuracy,
      recommendations
    };
  }

  async validateAccuracy(): Promise<void> {
    try {
      const accuracy = await this.turboModule.validateCalculationAccuracy();

      if (accuracy.phq9Accuracy < 1.0) {
        console.error(`PHQ-9 calculation accuracy issue: ${accuracy.phq9Accuracy * 100}%`);
      }

      if (accuracy.gad7Accuracy < 1.0) {
        console.error(`GAD-7 calculation accuracy issue: ${accuracy.gad7Accuracy * 100}%`);
      }

      console.log('Calculation accuracy validation completed:', accuracy);
    } catch (error) {
      console.error('Calculation accuracy validation failed:', error);
    }
  }

  // Utility methods
  get isUsingNativeTurboModule(): boolean {
    return this.isNativeTurboModule;
  }

  async healthCheck(): Promise<{
    isWorking: boolean;
    phq9Test: boolean;
    gad7Test: boolean;
    crisisDetectionTest: boolean;
    error?: string;
  }> {
    try {
      // Test PHQ-9 calculation
      const phq9Score = await this.calculatePHQ9Score([1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const phq9Test = phq9Score === 9;

      // Test GAD-7 calculation
      const gad7Score = await this.calculateGAD7Score([2, 2, 2, 2, 2, 2, 2]);
      const gad7Test = gad7Score === 14;

      // Test crisis detection
      const crisisResult = await this.detectSuicidalIdeation([0, 0, 0, 0, 0, 0, 0, 0, 1]);
      const crisisDetectionTest = crisisResult === true;

      const isWorking = phq9Test && gad7Test && crisisDetectionTest;

      return {
        isWorking,
        phq9Test,
        gad7Test,
        crisisDetectionTest,
        error: isWorking ? undefined : 'One or more calculation tests failed'
      };
    } catch (error) {
      return {
        isWorking: false,
        phq9Test: false,
        gad7Test: false,
        crisisDetectionTest: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Singleton instance for global use
export const enhancedCalculationService = new EnhancedCalculationService();

// Export default enhanced instance
export default enhancedCalculationService;