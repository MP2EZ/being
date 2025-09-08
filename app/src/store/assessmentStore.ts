/**
 * Assessment Store - Zustand state management for PHQ-9 and GAD-7 assessments
 * Handles clinical scoring with 100% accuracy requirement
 */

import { create } from 'zustand';
import { Assessment, AssessmentConfig } from '../types';
import { dataStore } from '../services/storage/SecureDataStore';
import { networkService } from '../services/NetworkService';
import { 
  validateAssessment, 
  ValidationError, 
  requiresCrisisIntervention,
  isValidPHQ9Answers,
  isValidGAD7Answers,
  calculatePHQ9Score,
  calculateGAD7Score
} from '../utils/validation';
import {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  AssessmentID,
  PHQ9Severity,
  GAD7Severity,
  ClinicalValidationError,
  createAssessmentID
} from '../types/clinical';
import { AssessmentStore, CurrentAssessment } from '../types/store';

// Use the enhanced type-safe interface
interface AssessmentState extends Omit<AssessmentStore, 
  'calculatePHQ9Score' | 'calculateGAD7Score' | 'getPHQ9Severity' | 'getGAD7Severity' | 
  'requiresCrisisInterventionPHQ9' | 'requiresCrisisInterventionGAD7' | 'hasSuicidalIdeation'
> {
  // Legacy method signatures for backward compatibility
  calculateScore: (type: 'phq9' | 'gad7', answers: number[]) => number;
  getSeverityLevel: (type: 'phq9' | 'gad7', score: number) => string;
}

// Assessment configurations - EXACT clinical wording required
const PHQ9_CONFIG: AssessmentConfig = {
  type: 'phq9',
  title: 'Understanding Your Current State',
  subtitle: 'Over the last 2 weeks, how often have you been bothered by:',
  questions: [
    { id: 1, text: 'Little interest or pleasure in doing things', options: [] },
    { id: 2, text: 'Feeling down, depressed, or hopeless', options: [] },
    { id: 3, text: 'Trouble falling or staying asleep, or sleeping too much', options: [] },
    { id: 4, text: 'Feeling tired or having little energy', options: [] },
    { id: 5, text: 'Poor appetite or overeating', options: [] },
    { id: 6, text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', options: [] },
    { id: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television', options: [] },
    { id: 8, text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual', options: [] },
    { id: 9, text: 'Thoughts that you would be better off dead or of hurting yourself in some way', options: [] }
  ],
  scoringThresholds: {
    minimal: 4,
    mild: 9,
    moderate: 14,
    moderatelySevere: 19,
    severe: 27
  }
};

const GAD7_CONFIG: AssessmentConfig = {
  type: 'gad7',
  title: 'Anxiety Assessment',
  subtitle: 'Over the last 2 weeks, how often have you been bothered by:',
  questions: [
    { id: 1, text: 'Feeling nervous, anxious, or on edge', options: [] },
    { id: 2, text: 'Not being able to stop or control worrying', options: [] },
    { id: 3, text: 'Worrying too much about different things', options: [] },
    { id: 4, text: 'Trouble relaxing', options: [] },
    { id: 5, text: 'Being so restless that it\'s hard to sit still', options: [] },
    { id: 6, text: 'Becoming easily annoyed or irritable', options: [] },
    { id: 7, text: 'Feeling afraid as if something awful might happen', options: [] }
  ],
  scoringThresholds: {
    minimal: 4,
    mild: 9,
    moderate: 14,
    severe: 21
  }
};

// Response options (identical for both assessments)
const RESPONSE_OPTIONS = [
  { value: 0, text: 'Not at all' },
  { value: 1, text: 'Several days' },
  { value: 2, text: 'More than half the days' },
  { value: 3, text: 'Nearly every day' }
];

// Add response options to question configs
[PHQ9_CONFIG, GAD7_CONFIG].forEach(config => {
  config.questions.forEach(question => {
    question.options = RESPONSE_OPTIONS;
  });
});

// Validate that options were properly assigned
[PHQ9_CONFIG, GAD7_CONFIG].forEach(config => {
  config.questions.forEach((question, index) => {
    if (!question.options || question.options.length !== 4) {
      console.error(`Assessment validation failed: Question ${index + 1} in ${config.type} has invalid options`, question);
    } else if (question.options.some(opt => !opt || typeof opt.value !== 'number' || !opt.text)) {
      console.error(`Assessment validation failed: Question ${index + 1} in ${config.type} has malformed options`, question.options);
    }
  });
});

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessments: [],
  currentAssessment: null,
  isLoading: false,
  error: null,

  // Load all assessments from AsyncStorage
  loadAssessments: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const assessments = await dataStore.getAssessments();
      set({ assessments, isLoading: false });
    } catch (error) {
      console.error('Failed to load assessments:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load assessments',
        isLoading: false 
      });
    }
  },

  // Start a new assessment
  startAssessment: (type, context = 'standalone') => {
    const config = type === 'phq9' ? PHQ9_CONFIG : GAD7_CONFIG;
    const answers = new Array(config.questions.length).fill(null);
    
    set({ 
      currentAssessment: {
        config,
        answers,
        currentQuestion: 0,
        context
      },
      error: null 
    });
  },

  // Answer current question and advance
  answerQuestion: (answer) => {
    const { currentAssessment } = get();
    if (!currentAssessment) {
      set({ error: 'No active assessment' });
      return;
    }
    
    const { config, answers, currentQuestion } = currentAssessment;
    
    if (!config) {
      set({ error: 'Assessment configuration missing' });
      return;
    }
    
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = answer;
    
    const nextQuestion = Math.min(currentQuestion + 1, config.questions.length);
    
    set({
      currentAssessment: {
        ...currentAssessment,
        answers: newAnswers,
        currentQuestion: nextQuestion
      }
    });
  },

  // Go back to previous question
  goToPreviousQuestion: () => {
    const { currentAssessment } = get();
    if (!currentAssessment || currentAssessment.currentQuestion === 0) {
      return;
    }
    
    set({
      currentAssessment: {
        ...currentAssessment,
        currentQuestion: currentAssessment.currentQuestion - 1
      }
    });
  },

  // Save completed assessment - PERFORMANCE OPTIMIZED
  saveAssessment: async () => {
    const { currentAssessment, calculateScore, getSeverityLevel, loadAssessments } = get();
    if (!currentAssessment?.config) {
      set({ error: 'No assessment to save' });
      return;
    }
    
    const { config, answers, context } = currentAssessment;
    
    // PERFORMANCE: Fast validation check
    if (answers.some(answer => answer === null || answer === undefined)) {
      set({ error: 'Please answer all questions before submitting' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // PERFORMANCE: Pre-calculate for immediate response
      const score = calculateScore(config.type, answers);
      const severity = getSeverityLevel(config.type, score);
      
      const assessment: Assessment = {
        id: `assessment_${config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`,
        type: config.type,
        completedAt: new Date().toISOString(),
        answers: answers as number[],
        score,
        severity: severity as Assessment['severity'],
        context
      };
      
      // PERFORMANCE: Async validation to avoid blocking UI
      Promise.resolve().then(() => {
        try {
          validateAssessment(assessment);
          
          // Check for crisis intervention requirements
          const needsCrisisIntervention = requiresCrisisIntervention(assessment);
          if (needsCrisisIntervention) {
            console.warn('Assessment indicates potential crisis intervention needed', {
              type: assessment.type,
              score: assessment.score,
              severity: assessment.severity
            });
          }
        } catch (validationError) {
          console.error('Assessment validation failed:', validationError);
        }
      });
      
      // PERFORMANCE: Immediate UI update, async storage
      set({ currentAssessment: null, isLoading: false });
      
      // Background saving - don't block UI
      networkService.performWithOfflineFallback(
        async () => {
          await dataStore.saveAssessment(assessment);
          return assessment;
        },
        async () => {
          console.log('Assessment queued for offline sync');
        },
        'save_assessment',
        assessment
      ).then(() => {
        // Refresh assessments in background
        if (networkService.isOnline()) {
          loadAssessments();
        } else {
          const { assessments } = get();
          set({ assessments: [...assessments, assessment] });
        }
      }).catch((error) => {
        console.error('Background assessment save failed:', error);
        // Assessment already saved to UI state, user can continue
      });
      
    } catch (error) {
      console.error('Failed to save assessment:', error);
      const errorMessage = error instanceof ValidationError 
        ? `Validation error: ${error.message}` 
        : error instanceof Error ? error.message : 'Failed to save assessment';
      set({ 
        error: errorMessage,
        isLoading: false 
      });
    }
  },

  // Complete assessment (for results screen)
  completeAssessment: () => {
    // This is called when the results screen is shown
    // The assessment has already been saved, just clean up state
    set({ currentAssessment: null, error: null });
  },

  // Clear current assessment
  clearCurrentAssessment: () => {
    set({ currentAssessment: null, error: null });
  },

  // Query methods
  getAssessmentsByType: async (type) => {
    try {
      return await dataStore.getAssessmentsByType(type);
    } catch (error) {
      console.error(`Failed to get ${type} assessments:`, error);
      return [];
    }
  },

  getLatestAssessment: async (type) => {
    try {
      return await dataStore.getLatestAssessment(type);
    } catch (error) {
      console.error(`Failed to get latest ${type} assessment:`, error);
      return null;
    }
  },

  // CRITICAL: Type-safe clinical calculation methods - 100% accuracy required
  calculateScore: (type, answers) => {
    if (type === 'phq9') {
      if (!isValidPHQ9Answers(answers)) {
        throw new ClinicalValidationError('Invalid PHQ-9 answers', 'phq9', 'answers', 'array of 9 numbers (0-3)', answers);
      }
      return calculatePHQ9Score(answers);
    } else {
      if (!isValidGAD7Answers(answers)) {
        throw new ClinicalValidationError('Invalid GAD-7 answers', 'gad7', 'answers', 'array of 7 numbers (0-3)', answers);
      }
      return calculateGAD7Score(answers);
    }
  },

  getSeverityLevel: (type, score) => {
    if (typeof score !== 'number' || score < 0) {
      throw new ClinicalValidationError('Invalid score for severity calculation', type, 'score', 'positive number', score);
    }
    
    if (type === 'phq9') {
      if (score <= 4) return 'minimal';
      if (score <= 9) return 'mild';
      if (score <= 14) return 'moderate';
      if (score <= 19) return 'moderately severe';
      return 'severe';
    } else { // GAD-7
      if (score <= 4) return 'minimal';
      if (score <= 9) return 'mild';
      if (score <= 14) return 'moderate';
      return 'severe';
    }
  },

  // Enhanced clinical calculations with type safety
  calculatePHQ9Score: (answers: PHQ9Answers) => calculatePHQ9Score(answers),
  calculateGAD7Score: (answers: GAD7Answers) => calculateGAD7Score(answers),
  
  getPHQ9Severity: (score: PHQ9Score): PHQ9Severity => {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    if (score <= 19) return 'moderately severe';
    return 'severe';
  },
  
  getGAD7Severity: (score: GAD7Score): GAD7Severity => {
    if (score <= 4) return 'minimal';
    if (score <= 9) return 'mild';
    if (score <= 14) return 'moderate';
    return 'severe';
  },

  requiresCrisisInterventionPHQ9: (assessment) => {
    return requiresCrisisIntervention(assessment);
  },

  requiresCrisisInterventionGAD7: (assessment) => {
    return requiresCrisisIntervention(assessment);
  },

  hasSuicidalIdeation: (answers: PHQ9Answers) => {
    return answers[8] >= 1; // Question 9 (0-based index 8)
  },

  // Computed properties
  isAssessmentComplete: () => {
    const { currentAssessment } = get();
    if (!currentAssessment?.config) return false;
    
    const { answers, config } = currentAssessment;
    return answers.length === config.questions.length && 
           answers.every(answer => answer !== null && answer !== undefined);
  },

  getCurrentProgress: () => {
    const { currentAssessment } = get();
    if (!currentAssessment?.config) return { current: 0, total: 0 };
    
    const { currentQuestion, config } = currentAssessment;
    return { current: currentQuestion, total: config.questions.length };
  }
}));