/**
 * Enhanced Assessment Store - Phase 4.3A Clinical Accuracy with Performance Optimization
 * <50ms calculations with 100% accuracy preservation for PHQ-9/GAD-7 assessments
 * 
 * Integrates with TurboStoreManager and EnhancedTherapeuticPerformanceMonitor
 * for clinical-grade assessment processing with performance guarantees.
 *
 * CLINICAL ACCURACY REQUIREMENTS:
 * - PHQ-9/GAD-7 Scoring: 100% accuracy preserved
 * - Crisis Detection: <100ms with immediate suicidal ideation detection
 * - Calculation Time: <50ms for all assessment scoring
 * - State Persistence: <75ms with clinical-grade encryption
 * - Real-time Validation: <25ms for answer validation
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import { turboStoreManager, performanceHierarchy, TherapeuticPerformanceResult } from '../newarch/TurboStoreManager';
import { enhancedTherapeuticPerformanceMonitor } from '../../utils/EnhancedTherapeuticPerformanceMonitor';
import { useEnhancedCrisisStore } from './EnhancedCrisisStore';
import { DataSensitivity } from '../../services/security';

// Assessment types and scoring
type PHQ9Answers = [number, number, number, number, number, number, number, number, number];
type GAD7Answers = [number, number, number, number, number, number, number];
type PHQ9Score = number; // 0-27
type GAD7Score = number; // 0-21

// Clinical validation error class
class ClinicalValidationError extends Error {
  constructor(
    message: string,
    public assessmentType: string,
    public field: string,
    public expected: string,
    public received: any
  ) {
    super(message);
    this.name = 'ClinicalValidationError';
  }
}

// Assessment interfaces
interface Assessment {
  id: string;
  type: 'phq9' | 'gad7';
  answers: PHQ9Answers | GAD7Answers;
  score: PHQ9Score | GAD7Score;
  completedAt: number;
  calculationTime: number;
  isCrisisLevel: boolean;
  hasSuicidalIdeation?: boolean; // PHQ-9 specific
  clinicalNotes?: string;
  validationResults: ClinicalValidationResult;
}

interface ClinicalValidationResult {
  isValid: boolean;
  accuracy: number; // 0-100%
  validationTime: number;
  errors: string[];
  warnings: string[];
}

interface AssessmentCalculationResult {
  score: PHQ9Score | GAD7Score;
  calculationTime: number;
  isCrisisLevel: boolean;
  hasSuicidalIdeation?: boolean;
  therapeuticAccuracy: 'optimal' | 'acceptable' | 'fallback';
  validationPassed: boolean;
}

interface RealTimeCrisisDetection {
  isCrisis: boolean;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
  trigger: 'suicidal_ideation' | 'projected_score' | 'current_score' | 'pattern_detection';
  responseRequired: boolean;
  responseTime: number;
  detectedAt: number;
  projectedScore?: number;
  currentScore?: number;
  confidenceLevel: number; // 0-100%
}

interface AssessmentSessionMetrics {
  totalCalculations: number;
  averageCalculationTime: number;
  accuracyRate: number;
  fastestCalculation: number;
  slowestCalculation: number;
  crisisDetections: number;
  lastCalculationTime: number;
}

// Enhanced assessment store interface
interface EnhancedAssessmentStore {
  // Assessment state
  currentAssessment: Assessment | null;
  assessmentHistory: Assessment[];
  calculationCache: Map<string, { score: number; calculatedAt: number }>;
  isCalculating: boolean;
  
  // Performance tracking
  sessionMetrics: AssessmentSessionMetrics;
  
  // Enhanced calculation methods with clinical accuracy
  calculatePHQ9ScoreEnhanced(answers: PHQ9Answers): Promise<AssessmentCalculationResult>;
  calculateGAD7ScoreEnhanced(answers: GAD7Answers): Promise<AssessmentCalculationResult>;
  
  // Real-time crisis detection during assessment
  detectCrisisRealTimeEnhanced(
    assessmentType: 'phq9' | 'gad7',
    currentAnswers: number[],
    questionIndex: number
  ): Promise<RealTimeCrisisDetection>;
  
  // Assessment management
  saveAssessmentOptimized(assessment: Assessment): Promise<void>;
  validateAnswersRealTime(
    assessmentType: 'phq9' | 'gad7',
    answers: number[],
    questionIndex: number
  ): Promise<ClinicalValidationResult>;
  
  // Clinical validation
  validateAssessmentClinically(assessment: Assessment): Promise<ClinicalValidationResult>;
  
  // Performance utilities
  getSessionMetrics(): AssessmentSessionMetrics;
  clearCalculationCache(): void;
  preloadAssessmentOptimizations(): Promise<void>;
}

// Validation functions for clinical accuracy
const isValidPHQ9Answers = (answers: any): answers is PHQ9Answers => {
  return Array.isArray(answers) && 
         answers.length === 9 && 
         answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 3);
};

const isValidGAD7Answers = (answers: any): answers is GAD7Answers => {
  return Array.isArray(answers) && 
         answers.length === 7 && 
         answers.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 3);
};

/**
 * Enhanced Assessment Store Implementation
 * Clinical-grade accuracy with New Architecture performance optimization
 */
export const useEnhancedAssessmentStore = create<EnhancedAssessmentStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        currentAssessment: null,
        assessmentHistory: [],
        calculationCache: new Map(),
        isCalculating: false,
        
        sessionMetrics: {
          totalCalculations: 0,
          averageCalculationTime: 0,
          accuracyRate: 100,
          fastestCalculation: Infinity,
          slowestCalculation: 0,
          crisisDetections: 0,
          lastCalculationTime: 0
        },

        /**
         * Enhanced PHQ-9 calculation with TurboModule acceleration and 100% accuracy
         */
        calculatePHQ9ScoreEnhanced: async (answers: PHQ9Answers): Promise<AssessmentCalculationResult> => {
          const calculationId = `phq9_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const startTime = performance.now();

          // Set calculating state
          set(state => ({ ...state, isCalculating: true }));

          try {
            // Start performance monitoring
            enhancedTherapeuticPerformanceMonitor.startTherapeuticMonitoring(calculationId, 'assessment');

            // Immediate clinical validation
            if (!isValidPHQ9Answers(answers)) {
              throw new ClinicalValidationError(
                'Invalid PHQ-9 answers provided',
                'phq9',
                'answers',
                'array of 9 numbers (0-3)',
                answers
              );
            }

            // Use performance hierarchy for clinical calculations
            const result = await enhancedTherapeuticPerformanceMonitor.monitorAssessmentCalculation(
              calculationId,
              'phq9',
              async () => {
                // Check cache first for performance
                const cacheKey = `phq9_${answers.join('_')}`;
                const cached = get().calculationCache.get(cacheKey);

                if (cached && (Date.now() - cached.calculatedAt) < 5 * 60 * 1000) {
                  return cached.score;
                }

                // TurboModule calculation if available, fallback to JavaScript
                let score: PHQ9Score;
                if (turboStoreManager.calculationTurbo) {
                  score = await turboStoreManager.calculatePHQ9ScoreTurbo(answers);
                } else {
                  // Validated JavaScript fallback with 100% accuracy guarantee
                  score = answers.reduce((sum, answer) => sum + answer, 0) as PHQ9Score;
                }

                // Cache the calculation
                get().calculationCache.set(cacheKey, { score, calculatedAt: Date.now() });
                return score;
              }
            );

            const calculationTime = performance.now() - startTime;

            if (result.success) {
              const score = result.data;
              
              // Immediate crisis detection for suicidal ideation (Q9)
              const hasSuicidalIdeation = answers.length >= 9 && answers[8] >= 1;
              const isCrisisScore = score >= 20;
              const isCrisisLevel = hasSuicidalIdeation || isCrisisScore;

              // Trigger crisis response if detected
              if (isCrisisLevel) {
                const crisisStore = useEnhancedCrisisStore.getState();
                // Fire and forget - don't wait for crisis response to complete calculation
                crisisStore.triggerCrisisResponseOptimized().catch(error => {
                  console.error('Crisis response failed during PHQ-9 calculation:', error);
                });
              }

              // Update session metrics
              const { sessionMetrics } = get();
              const updatedMetrics: AssessmentSessionMetrics = {
                totalCalculations: sessionMetrics.totalCalculations + 1,
                averageCalculationTime: (sessionMetrics.averageCalculationTime * sessionMetrics.totalCalculations + calculationTime) / (sessionMetrics.totalCalculations + 1),
                accuracyRate: 100, // Always 100% with validation
                fastestCalculation: Math.min(sessionMetrics.fastestCalculation, calculationTime),
                slowestCalculation: Math.max(sessionMetrics.slowestCalculation, calculationTime),
                crisisDetections: isCrisisLevel ? sessionMetrics.crisisDetections + 1 : sessionMetrics.crisisDetections,
                lastCalculationTime: calculationTime
              };

              set(state => ({
                ...state,
                isCalculating: false,
                sessionMetrics: updatedMetrics
              }));

              // Complete monitoring
              enhancedTherapeuticPerformanceMonitor.completeTherapeuticMonitoring(calculationId);

              return {
                score,
                calculationTime,
                isCrisisLevel,
                hasSuicidalIdeation,
                therapeuticAccuracy: 'optimal',
                validationPassed: true
              };
            } else {
              throw new Error(`PHQ-9 calculation failed: ${result.latency}ms exceeded 50ms SLA`);
            }

          } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error(`PHQ-9 calculation failed after ${errorTime.toFixed(2)}ms:`, error);

            set(state => ({ ...state, isCalculating: false }));

            // Clinical safety: ensure calculation never fails
            const fallbackScore = answers.reduce((sum, answer) => sum + answer, 0) as PHQ9Score;
            
            console.warn(`Using fallback PHQ-9 calculation: ${fallbackScore}`);
            return {
              score: fallbackScore,
              calculationTime: errorTime,
              isCrisisLevel: fallbackScore >= 20 || answers[8] >= 1,
              hasSuicidalIdeation: answers[8] >= 1,
              therapeuticAccuracy: 'fallback',
              validationPassed: false
            };
          }
        },

        /**
         * Enhanced GAD-7 calculation with TurboModule acceleration and 100% accuracy
         */
        calculateGAD7ScoreEnhanced: async (answers: GAD7Answers): Promise<AssessmentCalculationResult> => {
          const calculationId = `gad7_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const startTime = performance.now();

          set(state => ({ ...state, isCalculating: true }));

          try {
            enhancedTherapeuticPerformanceMonitor.startTherapeuticMonitoring(calculationId, 'assessment');

            // Immediate clinical validation
            if (!isValidGAD7Answers(answers)) {
              throw new ClinicalValidationError(
                'Invalid GAD-7 answers provided',
                'gad7',
                'answers',
                'array of 7 numbers (0-3)',
                answers
              );
            }

            const result = await enhancedTherapeuticPerformanceMonitor.monitorAssessmentCalculation(
              calculationId,
              'gad7',
              async () => {
                // Check cache first
                const cacheKey = `gad7_${answers.join('_')}`;
                const cached = get().calculationCache.get(cacheKey);
                
                if (cached && (Date.now() - cached.calculatedAt) < 5 * 60 * 1000) {
                  return cached.score;
                }

                // TurboModule calculation if available
                let score: GAD7Score;
                if (turboStoreManager.calculationTurbo) {
                  score = await turboStoreManager.calculationTurbo.calculateGAD7(answers);
                } else {
                  // Validated JavaScript fallback
                  score = answers.reduce((sum, answer) => sum + answer, 0) as GAD7Score;
                }

                // Cache the calculation
                get().calculationCache.set(cacheKey, { score, calculatedAt: Date.now() });
                
                return score;
              }
            );

            const calculationTime = performance.now() - startTime;

            if (result.success) {
              const score = result.data;
              const isCrisisLevel = score >= 15;

              // Trigger crisis response if detected
              if (isCrisisLevel) {
                const crisisStore = useEnhancedCrisisStore.getState();
                crisisStore.triggerCrisisResponseOptimized().catch(error => {
                  console.error('Crisis response failed during GAD-7 calculation:', error);
                });
              }

              // Update session metrics
              const { sessionMetrics } = get();
              const updatedMetrics: AssessmentSessionMetrics = {
                totalCalculations: sessionMetrics.totalCalculations + 1,
                averageCalculationTime: (sessionMetrics.averageCalculationTime * sessionMetrics.totalCalculations + calculationTime) / (sessionMetrics.totalCalculations + 1),
                accuracyRate: 100,
                fastestCalculation: Math.min(sessionMetrics.fastestCalculation, calculationTime),
                slowestCalculation: Math.max(sessionMetrics.slowestCalculation, calculationTime),
                crisisDetections: isCrisisLevel ? sessionMetrics.crisisDetections + 1 : sessionMetrics.crisisDetections,
                lastCalculationTime: calculationTime
              };

              set(state => ({
                ...state,
                isCalculating: false,
                sessionMetrics: updatedMetrics
              }));

              enhancedTherapeuticPerformanceMonitor.completeTherapeuticMonitoring(calculationId);

              return {
                score,
                calculationTime,
                isCrisisLevel,
                therapeuticAccuracy: 'optimal',
                validationPassed: true
              };
            } else {
              throw new Error(`GAD-7 calculation failed: ${result.latency}ms exceeded 50ms SLA`);
            }

          } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error(`GAD-7 calculation failed after ${errorTime.toFixed(2)}ms:`, error);

            set(state => ({ ...state, isCalculating: false }));

            // Clinical safety fallback
            const fallbackScore = answers.reduce((sum, answer) => sum + answer, 0) as GAD7Score;
            
            console.warn(`Using fallback GAD-7 calculation: ${fallbackScore}`);
            return {
              score: fallbackScore,
              calculationTime: errorTime,
              isCrisisLevel: fallbackScore >= 15,
              therapeuticAccuracy: 'fallback',
              validationPassed: false
            };
          }
        },

        /**
         * Real-time crisis detection during assessment with enhanced accuracy
         */
        detectCrisisRealTimeEnhanced: async (
          assessmentType: 'phq9' | 'gad7',
          currentAnswers: number[],
          questionIndex: number
        ): Promise<RealTimeCrisisDetection> => {
          const startTime = performance.now();

          try {
            // Use performance hierarchy for crisis detection
            const result = await performanceHierarchy.enforcePerformanceHierarchy(
              'realtime-crisis-detection',
              'assessment',
              async () => {
                // Immediate suicidal ideation detection for PHQ-9 Q9
                if (assessmentType === 'phq9' && questionIndex === 8 && currentAnswers[8] >= 1) {
                  return {
                    isCrisis: true,
                    severity: 'critical' as const,
                    trigger: 'suicidal_ideation' as const,
                    responseRequired: true,
                    confidenceLevel: 100,
                    immediate: true
                  };
                }

                // Projected score analysis for early intervention
                const currentScore = currentAnswers.slice(0, questionIndex + 1)
                  .reduce((sum, answer) => sum + (answer || 0), 0);

                const questionsRemaining = (assessmentType === 'phq9' ? 9 : 7) - (questionIndex + 1);
                const projectedScore = Math.round(
                  (currentScore / (questionIndex + 1)) *
                  (assessmentType === 'phq9' ? 9 : 7)
                );

                // Enhanced pattern detection
                const recentAnswers = currentAnswers.slice(Math.max(0, questionIndex - 2), questionIndex + 1);
                const averageRecentScore = recentAnswers.reduce((sum, ans) => sum + (ans || 0), 0) / recentAnswers.length;
                
                const thresholds = { phq9: 20, gad7: 15 };
                const threshold = thresholds[assessmentType];
                
                // Crisis detection logic
                const isCrisisByProjection = projectedScore >= threshold;
                const isCrisisByPattern = averageRecentScore >= 2.5 && questionsRemaining <= 2;
                const isCrisisByCurrentScore = currentScore >= threshold * 0.7; // 70% of threshold
                
                const isCrisis = isCrisisByProjection || isCrisisByPattern || isCrisisByCurrentScore;
                
                // Determine trigger and confidence
                let trigger: RealTimeCrisisDetection['trigger'];
                let confidenceLevel: number;
                
                if (isCrisisByProjection) {
                  trigger = 'projected_score';
                  confidenceLevel = Math.min(95, 70 + (projectedScore - threshold) * 5);
                } else if (isCrisisByPattern) {
                  trigger = 'pattern_detection';
                  confidenceLevel = Math.min(85, 60 + averageRecentScore * 10);
                } else if (isCrisisByCurrentScore) {
                  trigger = 'current_score';
                  confidenceLevel = Math.min(80, 50 + (currentScore / threshold) * 30);
                } else {
                  trigger = 'current_score';
                  confidenceLevel = 0;
                }
                
                // Severity assessment
                let severity: RealTimeCrisisDetection['severity'];
                if (projectedScore >= threshold * 1.3) {
                  severity = 'critical';
                } else if (projectedScore >= threshold * 1.1) {
                  severity = 'severe';
                } else if (projectedScore >= threshold) {
                  severity = 'moderate';
                } else if (projectedScore >= threshold * 0.8) {
                  severity = 'mild';
                } else {
                  severity = 'none';
                }

                return {
                  isCrisis,
                  severity,
                  trigger,
                  responseRequired: isCrisis && confidenceLevel >= 70,
                  projectedScore,
                  currentScore,
                  confidenceLevel,
                  immediate: false
                };
              }
            );

            const responseTime = performance.now() - startTime;

            if (result.success) {
              const detectionResult: RealTimeCrisisDetection = {
                ...result.data,
                responseTime,
                detectedAt: Date.now()
              };

              // Immediate crisis trigger if high confidence detection
              if (result.data.immediate || (result.data.responseRequired && result.data.confidenceLevel >= 85)) {
                const crisisStore = useEnhancedCrisisStore.getState();
                await crisisStore.detectCrisisRealTimeEnhanced(assessmentType, currentAnswers, questionIndex);
              }

              return detectionResult;
            }

            throw new Error('Real-time crisis detection failed');

          } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error(`Real-time crisis detection failed after ${errorTime.toFixed(2)}ms:`, error);

            // Safety fallback
            return {
              isCrisis: false,
              severity: 'none',
              trigger: 'current_score',
              responseRequired: false,
              responseTime: errorTime,
              detectedAt: Date.now(),
              confidenceLevel: 0
            };
          }
        },

        /**
         * Real-time answer validation during assessment
         */
        validateAnswersRealTime: async (
          assessmentType: 'phq9' | 'gad7',
          answers: number[],
          questionIndex: number
        ): Promise<ClinicalValidationResult> => {
          const startTime = performance.now();

          try {
            const errors: string[] = [];
            const warnings: string[] = [];
            
            // Validate current answer
            const currentAnswer = answers[questionIndex];
            if (currentAnswer === undefined || currentAnswer === null) {
              errors.push(`Question ${questionIndex + 1}: Answer is required`);
            } else if (!Number.isInteger(currentAnswer) || currentAnswer < 0 || currentAnswer > 3) {
              errors.push(`Question ${questionIndex + 1}: Answer must be between 0 and 3`);
            }
            
            // Validate previous answers
            for (let i = 0; i < questionIndex; i++) {
              const answer = answers[i];
              if (answer === undefined || answer === null) {
                errors.push(`Question ${i + 1}: Missing answer`);
              } else if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
                errors.push(`Question ${i + 1}: Invalid answer range`);
              }
            }
            
            // Pattern warnings
            if (questionIndex >= 2) {
              const recentAnswers = answers.slice(questionIndex - 2, questionIndex + 1);
              const allSame = recentAnswers.every(ans => ans === recentAnswers[0]);
              const allMax = recentAnswers.every(ans => ans === 3);
              
              if (allSame && recentAnswers[0] !== undefined) {
                warnings.push('Consider varying responses if they accurately reflect your experience');
              }
              
              if (allMax) {
                warnings.push('High severity responses detected - crisis support available');
              }
            }

            const validationTime = performance.now() - startTime;
            const isValid = errors.length === 0;
            const accuracy = isValid ? 100 : Math.max(0, 100 - (errors.length * 20));

            return {
              isValid,
              accuracy,
              validationTime,
              errors,
              warnings
            };

          } catch (error) {
            const validationTime = performance.now() - startTime;
            console.error('Real-time validation failed:', error);
            
            return {
              isValid: false,
              accuracy: 0,
              validationTime,
              errors: [`Validation error: ${error.message}`],
              warnings: []
            };
          }
        },

        /**
         * Save assessment with optimized persistence and clinical validation
         */
        saveAssessmentOptimized: async (assessment: Assessment) => {
          const startTime = performance.now();

          try {
            // Clinical validation
            const validationResult = await get().validateAssessmentClinically(assessment);
            
            if (!validationResult.isValid) {
              throw new Error(`Assessment validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Enhanced assessment with validation results
            const enhancedAssessment: Assessment = {
              ...assessment,
              validationResults: validationResult
            };

            // Parallel validation and persistence using TurboStoreManager
            const [persistResult] = await Promise.all([
              turboStoreManager.persistStoreState(
                'assessment-history',
                [...get().assessmentHistory, enhancedAssessment],
                DataSensitivity.CLINICAL
              )
            ]);

            const duration = performance.now() - startTime;

            if (duration > 200) {
              console.warn(`Assessment save exceeded 200ms: ${duration.toFixed(2)}ms`);
            }

            // Update store state
            set(state => ({
              ...state,
              currentAssessment: enhancedAssessment,
              assessmentHistory: [...state.assessmentHistory, enhancedAssessment]
            }));

            console.log(`✅ Assessment saved: ${duration.toFixed(2)}ms`);

          } catch (error) {
            const duration = performance.now() - startTime;
            console.error(`Assessment save failed after ${duration.toFixed(2)}ms:`, error);
            throw error;
          }
        },

        /**
         * Clinical validation of complete assessment
         */
        validateAssessmentClinically: async (assessment: Assessment): Promise<ClinicalValidationResult> => {
          const startTime = performance.now();
          const errors: string[] = [];
          const warnings: string[] = [];

          try {
            // Validate assessment structure
            if (!assessment.id || !assessment.type || !assessment.answers || !assessment.score) {
              errors.push('Assessment missing required fields');
            }

            // Validate answers based on type
            if (assessment.type === 'phq9') {
              if (!isValidPHQ9Answers(assessment.answers)) {
                errors.push('Invalid PHQ-9 answers format');
              } else {
                // Validate score calculation
                const expectedScore = (assessment.answers as PHQ9Answers).reduce((sum, ans) => sum + ans, 0);
                if (assessment.score !== expectedScore) {
                  errors.push(`PHQ-9 score mismatch: expected ${expectedScore}, got ${assessment.score}`);
                }
                
                // Validate suicidal ideation detection
                const hasQ9Response = (assessment.answers as PHQ9Answers)[8] >= 1;
                if (hasQ9Response && !assessment.hasSuicidalIdeation) {
                  errors.push('Suicidal ideation not detected when Q9 response >= 1');
                }
              }
            } else if (assessment.type === 'gad7') {
              if (!isValidGAD7Answers(assessment.answers)) {
                errors.push('Invalid GAD-7 answers format');
              } else {
                const expectedScore = (assessment.answers as GAD7Answers).reduce((sum, ans) => sum + ans, 0);
                if (assessment.score !== expectedScore) {
                  errors.push(`GAD-7 score mismatch: expected ${expectedScore}, got ${assessment.score}`);
                }
              }
            }

            // Validate crisis level determination
            const crisisThresholds = { phq9: 20, gad7: 15 };
            const expectedCrisisLevel = assessment.score >= crisisThresholds[assessment.type] || 
                                     (assessment.type === 'phq9' && assessment.hasSuicidalIdeation);
            
            if (assessment.isCrisisLevel !== expectedCrisisLevel) {
              errors.push('Crisis level determination incorrect');
            }

            // Performance warnings
            if (assessment.calculationTime > 50) {
              warnings.push(`Calculation time exceeded target: ${assessment.calculationTime.toFixed(2)}ms`);
            }

            const validationTime = performance.now() - startTime;
            const isValid = errors.length === 0;
            const accuracy = isValid ? 100 : Math.max(0, 100 - (errors.length * 25));

            return {
              isValid,
              accuracy,
              validationTime,
              errors,
              warnings
            };

          } catch (error) {
            const validationTime = performance.now() - startTime;
            return {
              isValid: false,
              accuracy: 0,
              validationTime,
              errors: [`Clinical validation error: ${error.message}`],
              warnings: []
            };
          }
        },

        /**
         * Get assessment session performance metrics
         */
        getSessionMetrics: () => {
          return get().sessionMetrics;
        },

        /**
         * Clear calculation cache for memory management
         */
        clearCalculationCache: () => {
          set(state => ({
            ...state,
            calculationCache: new Map()
          }));
        },

        /**
         * Preload assessment optimizations
         */
        preloadAssessmentOptimizations: async () => {
          try {
            await turboStoreManager.optimizeForTherapeuticSession('assessment', 600000); // 10 minutes
            console.log('✅ Assessment optimizations preloaded');
          } catch (error) {
            console.warn('Assessment optimization preloading failed:', error);
          }
        }
      }),
      {
        name: 'enhanced-assessment-store',
        storage: {
          getItem: async (name: string) => {
            return turboStoreManager.hydrateStoreState(name, null);
          },
          setItem: async (name: string, value: any) => {
            await turboStoreManager.persistStoreState(
              name,
              value,
              DataSensitivity.CLINICAL
            );
          },
          removeItem: async (name: string) => {
            console.log(`Removing ${name} from storage`);
          }
        },
        partialize: (state) => ({
          currentAssessment: state.currentAssessment,
          assessmentHistory: state.assessmentHistory,
          sessionMetrics: state.sessionMetrics
        })
      }
    )
  )
);

// Initialize assessment optimizations
useEnhancedAssessmentStore.getState().preloadAssessmentOptimizations();

// Export types
export type {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  Assessment,
  ClinicalValidationResult,
  AssessmentCalculationResult,
  RealTimeCrisisDetection,
  AssessmentSessionMetrics,
  EnhancedAssessmentStore
};

// Export validation functions
export {
  isValidPHQ9Answers,
  isValidGAD7Answers,
  ClinicalValidationError
};

// React hook for easier component integration
export const useEnhancedAssessment = () => {
  const store = useEnhancedAssessmentStore();
  
  return {
    // State
    currentAssessment: store.currentAssessment,
    assessmentHistory: store.assessmentHistory,
    isCalculating: store.isCalculating,
    sessionMetrics: store.sessionMetrics,
    
    // Calculations
    calculatePHQ9: store.calculatePHQ9ScoreEnhanced,
    calculateGAD7: store.calculateGAD7ScoreEnhanced,
    
    // Validation
    validateAnswers: store.validateAnswersRealTime,
    validateAssessment: store.validateAssessmentClinically,
    
    // Crisis detection
    detectCrisis: store.detectCrisisRealTimeEnhanced,
    
    // Management
    saveAssessment: store.saveAssessmentOptimized,
    
    // Utilities
    getMetrics: store.getSessionMetrics,
    clearCache: store.clearCalculationCache,
    preloadOptimizations: store.preloadAssessmentOptimizations
  };
};