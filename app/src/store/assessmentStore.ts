/**
 * Assessment Store - Zustand state management for PHQ-9 and GAD-7 assessments
 * Handles clinical scoring with 100% accuracy requirement
 */

import { create } from 'zustand';
import { Assessment, AssessmentConfig } from '../types';
import { dataStore } from '../services/storage/DataStore';
import { networkService } from '../services/NetworkService';
import { validateAssessment, ValidationError, requiresCrisisIntervention } from '../utils/validation';

interface AssessmentState {
  assessments: Assessment[];
  currentAssessment: {
    config: AssessmentConfig | null;
    answers: number[];
    currentQuestion: number;
    context: 'onboarding' | 'standalone' | 'clinical';
  } | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAssessments: () => Promise<void>;
  startAssessment: (type: 'phq9' | 'gad7', context?: 'onboarding' | 'standalone' | 'clinical') => void;
  answerQuestion: (answer: number) => void;
  goToPreviousQuestion: () => void;
  saveAssessment: () => Promise<void>;
  completeAssessment: () => void;
  clearCurrentAssessment: () => void;
  
  // Queries
  getAssessmentsByType: (type: 'phq9' | 'gad7') => Promise<Assessment[]>;
  getLatestAssessment: (type: 'phq9' | 'gad7') => Promise<Assessment | null>;
  
  // Clinical calculations - CRITICAL ACCURACY REQUIRED
  calculateScore: (type: 'phq9' | 'gad7', answers: number[]) => number;
  getSeverityLevel: (type: 'phq9' | 'gad7', score: number) => string;
  
  // Computed properties
  isAssessmentComplete: () => boolean;
  getCurrentProgress: () => { current: number; total: number };
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

  // Save completed assessment
  saveAssessment: async () => {
    const { currentAssessment, calculateScore, getSeverityLevel, loadAssessments } = get();
    if (!currentAssessment?.config) {
      set({ error: 'No assessment to save' });
      return;
    }
    
    const { config, answers, context } = currentAssessment;
    
    // Validate all questions answered
    if (answers.some(answer => answer === null || answer === undefined)) {
      set({ error: 'Please answer all questions before submitting' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const score = calculateScore(config.type, answers);
      const severity = getSeverityLevel(config.type, score);
      
      const assessment: Assessment = {
        id: `assessment_${config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: config.type,
        completedAt: new Date().toISOString(),
        answers: answers as number[],
        score,
        severity: severity as Assessment['severity'],
        context
      };
      
      // Validate assessment data before saving
      validateAssessment(assessment);
      
      // Check for crisis intervention requirements
      const needsCrisisIntervention = requiresCrisisIntervention(assessment);
      if (needsCrisisIntervention) {
        console.warn('Assessment indicates potential crisis intervention needed', {
          type: assessment.type,
          score: assessment.score,
          severity: assessment.severity
        });
        // Crisis intervention will be handled in the results screen
      }
      
      // Use offline-aware saving
      await networkService.performWithOfflineFallback(
        // Online action
        async () => {
          await dataStore.saveAssessment(assessment);
          return assessment;
        },
        // Offline fallback
        async () => {
          console.log('Assessment queued for offline sync');
        },
        'save_assessment',
        assessment
      );
      
      set({ currentAssessment: null, isLoading: false });
      
      // Refresh assessments (only if online)
      if (networkService.isOnline()) {
        await loadAssessments();
      } else {
        // If offline, add to local state optimistically
        const { assessments } = get();
        set({ assessments: [...assessments, assessment] });
      }
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

  // CRITICAL: Clinical calculation methods - 100% accuracy required
  calculateScore: (type, answers) => {
    // Validate input
    if (!Array.isArray(answers) || answers.some(a => typeof a !== 'number' || a < 0 || a > 3)) {
      throw new Error('Invalid assessment answers');
    }
    
    const expectedLength = type === 'phq9' ? 9 : 7;
    if (answers.length !== expectedLength) {
      throw new Error(`${type.toUpperCase()} requires exactly ${expectedLength} answers`);
    }
    
    // Simple sum - verified against clinical specifications
    return answers.reduce((sum, answer) => sum + answer, 0);
  },

  getSeverityLevel: (type, score) => {
    if (typeof score !== 'number' || score < 0) {
      throw new Error('Invalid score for severity calculation');
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