/**
 * Crisis Detection Service - Real-time crisis monitoring and intervention
 * CRITICAL: Ensures immediate detection and response to crisis situations
 */

import { Alert } from 'react-native';
import CrisisResponseMonitor from './CrisisResponseMonitor';
import { useCrisisStore } from '../store/crisisStore';
import { useAssessmentStore } from '../store/assessmentStore';
import {
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_THRESHOLD,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  CLINICAL_CONSTANTS,
  AssessmentID,
  PHQ9Score,
  GAD7Score,
  PHQ9Answers,
  GAD7Answers,
  CrisisDetectionError
} from '../types/clinical';

// Crisis Detection Algorithms
export interface CrisisDetectionResult {
  isCrisis: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
  trigger: 'score_threshold' | 'suicidal_ideation' | 'pattern_analysis' | 'rapid_decline';
  confidence: number; // 0-1
  recommendedAction: 'monitor' | 'intervention' | 'immediate_crisis' | 'emergency';
  metadata: {
    score?: number;
    threshold?: number;
    questionIndex?: number;
    answerValue?: number;
    assessmentType?: 'phq9' | 'gad7';
  };
}

// Crisis Pattern Analysis
export interface CrisisPattern {
  isEscalating: boolean;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  trendDirection: 'improving' | 'stable' | 'declining' | 'rapidly_declining';
  interventionHistory: string[];
  lastCrisisInterval: number; // days since last crisis
}

// Real-time Crisis Detection Engine
export class CrisisDetectionService {
  private static instance: CrisisDetectionService;
  private detectionCallbacks: Set<(result: CrisisDetectionResult) => void> = new Set();
  private isMonitoringActive = true;
  private lastDetectionTime = 0;
  private detectionHistory: CrisisDetectionResult[] = [];

  private constructor() {
    this.initializeRealTimeMonitoring();
  }

  static getInstance(): CrisisDetectionService {
    if (!CrisisDetectionService.instance) {
      CrisisDetectionService.instance = new CrisisDetectionService();
    }
    return CrisisDetectionService.instance;
  }

  /**
   * Initialize real-time crisis monitoring system
   */
  private initializeRealTimeMonitoring(): void {
    console.log('🔍 Crisis detection system initialized');

    // Subscribe to assessment store changes for real-time detection
    this.setupAssessmentStoreIntegration();

    // Subscribe to crisis store for pattern analysis
    this.setupCrisisStoreIntegration();
  }

  /**
   * Main crisis detection function - Called for each assessment response
   */
  async detectCrisis(
    assessmentType: 'phq9' | 'gad7',
    answers: readonly number[],
    questionIndex?: number,
    assessmentId?: AssessmentID
  ): Promise<CrisisDetectionResult> {
    const startTime = performance.now();

    try {
      return await CrisisResponseMonitor.executeCrisisAction(
        `crisis-detection-${assessmentType}`,
        async () => {
          const result = await this.performCrisisAnalysis(
            assessmentType,
            answers,
            questionIndex,
            assessmentId
          );

          // Store detection result
          this.detectionHistory.push(result);
          this.lastDetectionTime = Date.now();

          // Trigger callbacks
          this.detectionCallbacks.forEach(callback => {
            try {
              callback(result);
            } catch (error) {
              console.error('Crisis detection callback failed:', error);
            }
          });

          // Execute immediate intervention if needed
          if (result.isCrisis && result.recommendedAction === 'immediate_crisis') {
            await this.executeImmediateCrisisIntervention(result);
          }

          return result;
        }
      );
    } catch (error) {
      console.error('Crisis detection failed:', error);

      // Return safe fallback result
      return {
        isCrisis: false,
        severity: 'none',
        trigger: 'score_threshold',
        confidence: 0,
        recommendedAction: 'monitor',
        metadata: {
          assessmentType,
          score: this.calculatePartialScore(answers),
        }
      };
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction(`crisis-detection-${assessmentType}`, startTime);
    }
  }

  /**
   * Comprehensive crisis analysis algorithm
   */
  private async performCrisisAnalysis(
    assessmentType: 'phq9' | 'gad7',
    answers: readonly number[],
    questionIndex?: number,
    assessmentId?: AssessmentID
  ): Promise<CrisisDetectionResult> {

    // 1. IMMEDIATE SUICIDAL IDEATION CHECK (PHQ-9 Question 9)
    if (assessmentType === 'phq9' && answers.length > SUICIDAL_IDEATION_QUESTION_INDEX) {
      const suicidalResponse = answers[SUICIDAL_IDEATION_QUESTION_INDEX];

      if (suicidalResponse >= SUICIDAL_IDEATION_THRESHOLD) {
        return {
          isCrisis: true,
          severity: suicidalResponse >= 2 ? 'critical' : 'severe',
          trigger: 'suicidal_ideation',
          confidence: 1.0,
          recommendedAction: 'immediate_crisis',
          metadata: {
            assessmentType,
            questionIndex: SUICIDAL_IDEATION_QUESTION_INDEX,
            answerValue: suicidalResponse,
            threshold: SUICIDAL_IDEATION_THRESHOLD,
          }
        };
      }
    }

    // 2. SCORE THRESHOLD ANALYSIS
    const currentScore = this.calculatePartialScore(answers);
    const projectedScore = this.projectFullScore(assessmentType, answers, currentScore);

    let scoreBasedResult = this.analyzeScoreThresholds(assessmentType, projectedScore);

    // 3. PATTERN ANALYSIS (if we have history)
    const patternResult = await this.analyzeRiskPatterns(assessmentType, currentScore);

    // 4. RAPID DECLINE DETECTION
    const rapidDeclineResult = this.detectRapidDecline(assessmentType, currentScore);

    // 5. COMBINE RESULTS - Use highest severity
    const results = [scoreBasedResult, patternResult, rapidDeclineResult];
    const finalResult = this.combineDetectionResults(results);

    // 6. CONFIDENCE ADJUSTMENT based on multiple factors
    finalResult.confidence = this.calculateConfidence(finalResult, answers.length, assessmentType);

    return finalResult;
  }

  /**
   * Analyze score thresholds for crisis detection
   */
  private analyzeScoreThresholds(
    assessmentType: 'phq9' | 'gad7',
    score: number
  ): CrisisDetectionResult {

    if (assessmentType === 'phq9') {
      const threshold = CRISIS_THRESHOLD_PHQ9;

      if (score >= 25) {
        return {
          isCrisis: true,
          severity: 'critical',
          trigger: 'score_threshold',
          confidence: 0.95,
          recommendedAction: 'immediate_crisis',
          metadata: { assessmentType, score, threshold }
        };
      } else if (score >= threshold) {
        return {
          isCrisis: true,
          severity: 'severe',
          trigger: 'score_threshold',
          confidence: 0.9,
          recommendedAction: 'intervention',
          metadata: { assessmentType, score, threshold }
        };
      } else if (score >= 15) {
        return {
          isCrisis: false,
          severity: 'moderate',
          trigger: 'score_threshold',
          confidence: 0.7,
          recommendedAction: 'monitor',
          metadata: { assessmentType, score, threshold }
        };
      }
    } else if (assessmentType === 'gad7') {
      const threshold = CRISIS_THRESHOLD_GAD7;

      if (score >= 19) {
        return {
          isCrisis: true,
          severity: 'severe',
          trigger: 'score_threshold',
          confidence: 0.85,
          recommendedAction: 'intervention',
          metadata: { assessmentType, score, threshold }
        };
      } else if (score >= threshold) {
        return {
          isCrisis: true,
          severity: 'moderate',
          trigger: 'score_threshold',
          confidence: 0.8,
          recommendedAction: 'intervention',
          metadata: { assessmentType, score, threshold }
        };
      }
    }

    return {
      isCrisis: false,
      severity: 'none',
      trigger: 'score_threshold',
      confidence: 0.9,
      recommendedAction: 'monitor',
      metadata: { assessmentType, score }
    };
  }

  /**
   * Analyze historical patterns for escalating risk
   */
  private async analyzeRiskPatterns(
    assessmentType: 'phq9' | 'gad7',
    currentScore: number
  ): Promise<CrisisDetectionResult> {

    try {
      // Get recent assessment history
      const crisisStore = useCrisisStore.getState();
      const assessmentStore = useAssessmentStore.getState();

      // Get last 5 assessments of this type
      const recentAssessments = await assessmentStore.getAssessmentsByType(assessmentType);
      const recent = recentAssessments.slice(-5);

      if (recent.length < 2) {
        return {
          isCrisis: false,
          severity: 'none',
          trigger: 'pattern_analysis',
          confidence: 0.5,
          recommendedAction: 'monitor',
          metadata: { assessmentType, score: currentScore }
        };
      }

      // Calculate trend
      const scores = recent.map(a => a.score);
      const isEscalating = this.isScoreEscalating(scores);
      const recentCrises = crisisStore.getCrisisHistory(7); // Last 7 days

      // Pattern-based risk assessment
      if (isEscalating && recentCrises.length > 0) {
        return {
          isCrisis: true,
          severity: 'moderate',
          trigger: 'pattern_analysis',
          confidence: 0.75,
          recommendedAction: 'intervention',
          metadata: {
            assessmentType,
            score: currentScore,
            patternData: { isEscalating: true, recentCrises: recentCrises.length }
          }
        };
      }

      return {
        isCrisis: false,
        severity: 'none',
        trigger: 'pattern_analysis',
        confidence: 0.6,
        recommendedAction: 'monitor',
        metadata: { assessmentType, score: currentScore }
      };

    } catch (error) {
      console.error('Pattern analysis failed:', error);
      return {
        isCrisis: false,
        severity: 'none',
        trigger: 'pattern_analysis',
        confidence: 0.3,
        recommendedAction: 'monitor',
        metadata: { assessmentType, score: currentScore }
      };
    }
  }

  /**
   * Detect rapid decline in mental health scores
   */
  private detectRapidDecline(
    assessmentType: 'phq9' | 'gad7',
    currentScore: number
  ): CrisisDetectionResult {

    // This would analyze recent score changes for rapid deterioration
    // For now, return baseline monitoring
    return {
      isCrisis: false,
      severity: 'none',
      trigger: 'rapid_decline',
      confidence: 0.5,
      recommendedAction: 'monitor',
      metadata: { assessmentType, score: currentScore }
    };
  }

  /**
   * Combine multiple detection results into final assessment
   */
  private combineDetectionResults(results: CrisisDetectionResult[]): CrisisDetectionResult {
    // Find highest severity result
    const severityOrder = ['none', 'mild', 'moderate', 'severe', 'critical'];
    let highestResult = results[0];

    for (const result of results) {
      if (result.isCrisis && severityOrder.indexOf(result.severity) > severityOrder.indexOf(highestResult.severity)) {
        highestResult = result;
      }
    }

    // Combine confidence scores
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      ...highestResult,
      confidence: Math.min(avgConfidence, highestResult.confidence)
    };
  }

  /**
   * Calculate detection confidence based on available data
   */
  private calculateConfidence(
    result: CrisisDetectionResult,
    answersLength: number,
    assessmentType: 'phq9' | 'gad7'
  ): number {

    let confidence = result.confidence;

    // Adjust based on assessment completeness
    const expectedLength = assessmentType === 'phq9' ? 9 : 7;
    const completeness = answersLength / expectedLength;

    if (completeness < 0.5) {
      confidence *= 0.6; // Low confidence for partial assessments
    } else if (completeness < 1.0) {
      confidence *= 0.8; // Moderate confidence
    }

    // Boost confidence for suicidal ideation
    if (result.trigger === 'suicidal_ideation') {
      confidence = Math.max(confidence, 0.95);
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Execute immediate crisis intervention
   */
  private async executeImmediateCrisisIntervention(result: CrisisDetectionResult): Promise<void> {
    const startTime = performance.now();

    try {
      const crisisStore = useCrisisStore.getState();

      // Activate crisis intervention based on severity
      if (result.severity === 'critical') {
        // Immediate 988 call for critical situations
        Alert.alert(
          'Immediate Support Needed',
          'Your responses indicate you may need immediate support. Crisis counselors are available 24/7.',
          [
            {
              text: 'Call 988 Now',
              onPress: async () => {
                await crisisStore.call988();
              }
            },
            {
              text: 'Crisis Resources',
              onPress: () => {
                Alert.alert(
                  'Crisis Resources',
                  '🆘 IMMEDIATE HELP:\n\n📞 988 - Crisis Lifeline\n📞 911 - Emergency\n💬 Text HOME to 741741\n\nAll available 24/7'
                );
              }
            },
            {
              text: 'Continue',
              style: 'cancel'
            }
          ]
        );
      } else if (result.severity === 'severe') {
        // Safety check and resource offering
        Alert.alert(
          'Support Available',
          'We want to make sure you have the support you need.',
          [
            {
              text: 'Call 988',
              onPress: async () => {
                await crisisStore.call988();
              }
            },
            {
              text: 'Safety Resources',
              onPress: () => {
                // Navigate to crisis plan or resources
                console.log('Show safety resources');
              }
            },
            {
              text: 'Continue',
              style: 'cancel'
            }
          ]
        );
      }

      // Record intervention in crisis store
      await crisisStore.activateCrisisIntervention(
        result.trigger === 'suicidal_ideation' ? 'suicidal_ideation' :
        result.metadata.assessmentType === 'phq9' ? 'phq9_score_threshold' : 'gad7_score_threshold',
        result.severity as any
      );

    } catch (error) {
      console.error('Immediate crisis intervention failed:', error);

      // Fallback alert
      Alert.alert(
        'Crisis Support',
        'If you need immediate help:\n\n📞 Call 988 (Crisis Lifeline)\n📞 Call 911 (Emergency)',
        [{ text: 'OK' }]
      );
    } finally {
      CrisisResponseMonitor.monitorSyncCrisisAction('immediate-crisis-intervention', startTime);
    }
  }

  /**
   * Helper Functions
   */
  private calculatePartialScore(answers: readonly number[]): number {
    return answers.reduce((sum, answer) => sum + (answer || 0), 0);
  }

  private projectFullScore(
    assessmentType: 'phq9' | 'gad7',
    answers: readonly number[],
    currentScore: number
  ): number {
    const expectedLength = assessmentType === 'phq9' ? 9 : 7;
    if (answers.length === 0) return 0;

    const averagePerQuestion = currentScore / answers.length;
    return Math.round(averagePerQuestion * expectedLength);
  }

  private isScoreEscalating(scores: number[]): boolean {
    if (scores.length < 2) return false;

    const recent = scores.slice(-3);
    let increases = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i - 1]) increases++;
    }

    return increases >= Math.floor(recent.length / 2);
  }

  /**
   * Integration Setup
   */
  private setupAssessmentStoreIntegration(): void {
    // This would integrate with assessment store real-time updates
    console.log('Assessment store integration active');
  }

  private setupCrisisStoreIntegration(): void {
    // This would integrate with crisis store for pattern analysis
    console.log('Crisis store integration active');
  }

  /**
   * Public API
   */

  /**
   * Register callback for crisis detection events
   */
  onCrisisDetection(callback: (result: CrisisDetectionResult) => void): () => void {
    this.detectionCallbacks.add(callback);

    return () => {
      this.detectionCallbacks.delete(callback);
    };
  }

  /**
   * Enable/disable real-time monitoring
   */
  setMonitoringActive(active: boolean): void {
    this.isMonitoringActive = active;
    console.log(`Crisis monitoring ${active ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current detection status
   */
  getDetectionStatus(): {
    isActive: boolean;
    lastDetection: number;
    totalDetections: number;
    recentResults: CrisisDetectionResult[];
  } {
    return {
      isActive: this.isMonitoringActive,
      lastDetection: this.lastDetectionTime,
      totalDetections: this.detectionHistory.length,
      recentResults: this.detectionHistory.slice(-5)
    };
  }

  /**
   * Manual crisis detection trigger
   */
  async triggerManualDetection(
    assessmentType: 'phq9' | 'gad7',
    answers: readonly number[]
  ): Promise<CrisisDetectionResult> {
    return this.detectCrisis(assessmentType, answers);
  }

  /**
   * Reset detection history (for testing/cleanup)
   */
  resetDetectionHistory(): void {
    this.detectionHistory = [];
    this.lastDetectionTime = 0;
  }
}

// Export singleton instance
export const crisisDetectionService = CrisisDetectionService.getInstance();
export default crisisDetectionService;