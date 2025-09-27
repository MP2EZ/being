/**
 * Onboarding Store Utilities
 *
 * Comprehensive utility functions for therapeutic onboarding state management:
 * - Progress calculations and estimations
 * - Step validation and completion checking
 * - Clinical data processing and validation
 * - Crisis detection and safety protocols
 * - Performance monitoring and analytics
 * - Navigation helpers and route protection
 */

import {
  OnboardingStep,
  OnboardingSessionData,
  OnboardingProgress,
  ONBOARDING_STEPS,
  onboardingStoreUtils
} from '../onboardingStore';
import { Assessment, PHQ9Score, GAD7Score } from '../../types/clinical';
import { UserProfile } from '../../types';

// === PROGRESS UTILITIES ===

/**
 * Calculate detailed progress metrics for onboarding
 */
export const calculateDetailedProgress = (
  currentStep: OnboardingStep,
  stepProgress: Record<OnboardingStep, number>,
  data: OnboardingSessionData
): {
  overall: number;
  byCategory: Record<string, number>;
  timeEstimate: {
    remaining: number;
    total: number;
    completed: number;
  };
  completionRate: number;
} => {
  const stepOrder: OnboardingStep[] = [
    'welcome',
    'mbct_education',
    'baseline_assessment',
    'safety_planning',
    'personalization',
    'practice_introduction'
  ];

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;

  // Calculate overall progress
  const totalProgress = stepOrder.reduce((sum, step) => sum + (stepProgress[step] || 0), 0);
  const overall = Math.round(totalProgress / totalSteps);

  // Calculate progress by category
  const categories = {
    setup: ['welcome', 'mbct_education'],
    clinical: ['baseline_assessment', 'safety_planning'],
    preferences: ['personalization', 'practice_introduction']
  };

  const byCategory = Object.entries(categories).reduce((acc, [category, steps]) => {
    const categoryProgress = steps.reduce((sum, step) => sum + (stepProgress[step] || 0), 0);
    acc[category] = Math.round(categoryProgress / steps.length);
    return acc;
  }, {} as Record<string, number>);

  // Calculate time estimates
  const completedTime = stepOrder.slice(0, currentStepIndex).reduce(
    (sum, step) => sum + ONBOARDING_STEPS[step].estimatedDuration,
    0
  );

  const currentStepTimeRemaining = ONBOARDING_STEPS[currentStep].estimatedDuration *
    (1 - (stepProgress[currentStep] || 0) / 100);

  const remainingStepsTime = stepOrder.slice(currentStepIndex + 1).reduce(
    (sum, step) => sum + ONBOARDING_STEPS[step].estimatedDuration,
    0
  );

  const remaining = Math.round(currentStepTimeRemaining + remainingStepsTime);
  const total = stepOrder.reduce((sum, step) => sum + ONBOARDING_STEPS[step].estimatedDuration, 0);
  const completed = total - remaining;

  // Calculate completion rate (completed items vs total required items)
  const completionRate = calculateCompletionRate(data);

  return {
    overall,
    byCategory,
    timeEstimate: {
      remaining,
      total,
      completed
    },
    completionRate
  };
};

/**
 * Calculate completion rate based on required data fields
 */
export const calculateCompletionRate = (data: OnboardingSessionData): number => {
  const requirements = {
    welcome: {
      required: ['termsAccepted', 'privacyAccepted', 'clinicalDisclaimerAccepted'],
      completed: data.consent ? [
        data.consent.termsAccepted,
        data.consent.privacyAccepted,
        data.consent.clinicalDisclaimerAccepted
      ].filter(Boolean).length : 0
    },
    mbct_education: {
      required: ['conceptsMastered', 'totalTimeSpent'],
      completed: data.mbctEducation ? [
        (data.mbctEducation.conceptsMastered?.length || 0) >= 3,
        (data.mbctEducation.totalTimeSpent || 0) >= 5
      ].filter(Boolean).length : 0
    },
    baseline_assessment: {
      required: ['phq9Assessment', 'gad7Assessment'],
      completed: data.baselineAssessment ? [
        !!data.baselineAssessment.phq9Assessment,
        !!data.baselineAssessment.gad7Assessment
      ].filter(Boolean).length : 0
    },
    safety_planning: {
      required: ['emergencyContacts', 'warningSignsIdentified'],
      completed: data.safetyPlan ? [
        (data.safetyPlan.emergencyContacts?.length || 0) >= 1,
        (data.safetyPlan.warningSignsIdentified?.length || 0) >= 2
      ].filter(Boolean).length : 0
    },
    personalization: {
      required: ['selectedValues', 'therapeuticPreferences'],
      completed: data.personalization ? [
        (data.personalization.selectedValues?.length || 0) >= 3,
        !!data.personalization.therapeuticPreferences
      ].filter(Boolean).length : 0
    },
    practice_introduction: {
      required: ['breathingSessionsCompleted', 'confidenceLevel'],
      completed: data.practiceIntroduction ? [
        (data.practiceIntroduction.breathingSessionsCompleted || 0) >= 1,
        (data.practiceIntroduction.confidenceLevel || 0) >= 5
      ].filter(Boolean).length : 0
    }
  };

  const totalRequired = Object.values(requirements).reduce((sum, req) => sum + req.required.length, 0);
  const totalCompleted = Object.values(requirements).reduce((sum, req) => sum + req.completed, 0);

  return Math.round((totalCompleted / totalRequired) * 100);
};

// === VALIDATION UTILITIES ===

/**
 * Comprehensive step validation with detailed feedback
 */
export const validateStepWithFeedback = (
  step: OnboardingStep,
  data: OnboardingSessionData
): {
  isValid: boolean;
  completionPercentage: number;
  requiredFields: string[];
  missingFields: string[];
  warnings: string[];
  suggestions: string[];
} => {
  const result = {
    isValid: false,
    completionPercentage: 0,
    requiredFields: [],
    missingFields: [],
    warnings: [],
    suggestions: []
  };

  switch (step) {
    case 'welcome':
      result.requiredFields = ['Terms Accepted', 'Privacy Accepted', 'Clinical Disclaimer Accepted'];

      if (!data.consent) {
        result.missingFields = result.requiredFields;
        result.suggestions.push('Review and accept all consent agreements');
        break;
      }

      const consentChecks = [
        data.consent.termsAccepted,
        data.consent.privacyAccepted,
        data.consent.clinicalDisclaimerAccepted
      ];

      const consentCompleted = consentChecks.filter(Boolean).length;
      result.completionPercentage = Math.round((consentCompleted / 3) * 100);
      result.isValid = consentCompleted === 3;

      if (!data.consent.termsAccepted) result.missingFields.push('Terms Accepted');
      if (!data.consent.privacyAccepted) result.missingFields.push('Privacy Accepted');
      if (!data.consent.clinicalDisclaimerAccepted) result.missingFields.push('Clinical Disclaimer Accepted');

      if (!data.consent.emergencyContactConsent) {
        result.warnings.push('Emergency contact consent not provided');
      }
      break;

    case 'mbct_education':
      result.requiredFields = ['Concepts Mastered', 'Minimum Time Spent'];

      if (!data.mbctEducation) {
        result.missingFields = result.requiredFields;
        result.suggestions.push('Complete MBCT learning modules');
        break;
      }

      const conceptsComplete = (data.mbctEducation.conceptsMastered?.length || 0) >= 3;
      const timeComplete = (data.mbctEducation.totalTimeSpent || 0) >= 5;

      result.completionPercentage = Math.round(([conceptsComplete, timeComplete].filter(Boolean).length / 2) * 100);
      result.isValid = conceptsComplete && timeComplete;

      if (!conceptsComplete) {
        result.missingFields.push('Concepts Mastered');
        result.suggestions.push('Complete at least 3 MBCT concept modules');
      }
      if (!timeComplete) {
        result.missingFields.push('Minimum Time Spent');
        result.suggestions.push('Spend at least 5 minutes on education content');
      }

      if ((data.mbctEducation.totalTimeSpent || 0) < 8) {
        result.warnings.push('Consider spending more time on educational content');
      }
      break;

    case 'baseline_assessment':
      result.requiredFields = ['PHQ-9 Assessment', 'GAD-7 Assessment'];

      if (!data.baselineAssessment) {
        result.missingFields = result.requiredFields;
        result.suggestions.push('Complete baseline clinical assessments');
        break;
      }

      const phq9Complete = !!data.baselineAssessment.phq9Assessment;
      const gad7Complete = !!data.baselineAssessment.gad7Assessment;

      result.completionPercentage = Math.round(([phq9Complete, gad7Complete].filter(Boolean).length / 2) * 100);
      result.isValid = phq9Complete && gad7Complete;

      if (!phq9Complete) {
        result.missingFields.push('PHQ-9 Assessment');
        result.suggestions.push('Complete the PHQ-9 depression screening');
      }
      if (!gad7Complete) {
        result.missingFields.push('GAD-7 Assessment');
        result.suggestions.push('Complete the GAD-7 anxiety screening');
      }

      if (data.baselineAssessment.crisisDetected) {
        result.warnings.push('Crisis indicators detected - safety support available');
      }
      break;

    case 'safety_planning':
      result.requiredFields = ['Emergency Contacts', 'Warning Signs'];

      if (!data.safetyPlan) {
        result.missingFields = result.requiredFields;
        result.suggestions.push('Create safety plan with emergency contacts');
        break;
      }

      const contactsComplete = (data.safetyPlan.emergencyContacts?.length || 0) >= 1;
      const warningsComplete = (data.safetyPlan.warningSignsIdentified?.length || 0) >= 2;

      result.completionPercentage = Math.round(([contactsComplete, warningsComplete].filter(Boolean).length / 2) * 100);
      result.isValid = contactsComplete && warningsComplete;

      if (!contactsComplete) {
        result.missingFields.push('Emergency Contacts');
        result.suggestions.push('Add at least one emergency contact');
      }
      if (!warningsComplete) {
        result.missingFields.push('Warning Signs');
        result.suggestions.push('Identify at least 2 personal warning signs');
      }

      if ((data.safetyPlan.copingStrategies?.length || 0) < 2) {
        result.warnings.push('Consider adding more coping strategies');
      }
      break;

    case 'personalization':
      result.requiredFields = ['Personal Values', 'Therapeutic Preferences'];

      if (!data.personalization) {
        result.missingFields = result.requiredFields;
        result.suggestions.push('Customize therapeutic preferences');
        break;
      }

      const valuesComplete = (data.personalization.selectedValues?.length || 0) >= 3;
      const prefsComplete = !!data.personalization.therapeuticPreferences;

      result.completionPercentage = Math.round(([valuesComplete, prefsComplete].filter(Boolean).length / 2) * 100);
      result.isValid = valuesComplete && prefsComplete;

      if (!valuesComplete) {
        result.missingFields.push('Personal Values');
        result.suggestions.push('Select at least 3 core personal values');
      }
      if (!prefsComplete) {
        result.missingFields.push('Therapeutic Preferences');
        result.suggestions.push('Configure session and reminder preferences');
      }

      if (!data.personalization.notificationPreferences?.enabled) {
        result.warnings.push('Notifications disabled - may miss therapeutic reminders');
      }
      break;

    case 'practice_introduction':
      result.requiredFields = ['Breathing Session', 'Confidence Level'];

      if (!data.practiceIntroduction) {
        result.missingFields = result.requiredFields;
        result.suggestions.push('Complete practice breathing session');
        break;
      }

      const sessionComplete = (data.practiceIntroduction.breathingSessionsCompleted || 0) >= 1;
      const confidenceComplete = (data.practiceIntroduction.confidenceLevel || 0) >= 5;

      result.completionPercentage = Math.round(([sessionComplete, confidenceComplete].filter(Boolean).length / 2) * 100);
      result.isValid = sessionComplete && confidenceComplete;

      if (!sessionComplete) {
        result.missingFields.push('Breathing Session');
        result.suggestions.push('Complete at least one guided breathing session');
      }
      if (!confidenceComplete) {
        result.missingFields.push('Confidence Level');
        result.suggestions.push('Practice until comfort level reaches at least 5/10');
      }

      if ((data.practiceIntroduction.breathingAccuracy || 0) < 70) {
        result.warnings.push('Consider additional practice for better timing accuracy');
      }
      break;
  }

  return result;
};

// === CLINICAL DATA UTILITIES ===

/**
 * Analyze baseline assessment data for clinical insights
 */
export const analyzeBaselineAssessment = (
  phq9Assessment?: Assessment & { type: 'phq9' },
  gad7Assessment?: Assessment & { type: 'gad7' }
): {
  overallRiskLevel: 'minimal' | 'mild' | 'moderate' | 'severe';
  primaryConcerns: string[];
  recommendations: string[];
  crisisIndicators: string[];
  supportLevel: 'standard' | 'enhanced' | 'intensive';
} => {
  const analysis = {
    overallRiskLevel: 'minimal' as const,
    primaryConcerns: [],
    recommendations: [],
    crisisIndicators: [],
    supportLevel: 'standard' as const
  };

  // Analyze PHQ-9 results
  if (phq9Assessment) {
    const phq9Score = phq9Assessment.score;
    const severity = phq9Assessment.severity;

    if (phq9Score >= 20) {
      analysis.overallRiskLevel = 'severe';
      analysis.primaryConcerns.push('Severe depression symptoms');
      analysis.crisisIndicators.push('High PHQ-9 score indicating severe depression');
      analysis.supportLevel = 'intensive';
    } else if (phq9Score >= 15) {
      analysis.overallRiskLevel = 'moderate';
      analysis.primaryConcerns.push('Moderate depression symptoms');
      analysis.supportLevel = 'enhanced';
    } else if (phq9Score >= 10) {
      if (analysis.overallRiskLevel === 'minimal') analysis.overallRiskLevel = 'moderate';
      analysis.primaryConcerns.push('Mild to moderate depression symptoms');
    } else if (phq9Score >= 5) {
      if (analysis.overallRiskLevel === 'minimal') analysis.overallRiskLevel = 'mild';
      analysis.primaryConcerns.push('Mild depression symptoms');
    }

    // Check for suicidal ideation (question 9)
    const suicidalIdeationAnswer = phq9Assessment.answers[8]; // 0-based index
    if (suicidalIdeationAnswer > 0) {
      analysis.crisisIndicators.push('Suicidal ideation detected');
      analysis.supportLevel = 'intensive';
      if (analysis.overallRiskLevel !== 'severe') analysis.overallRiskLevel = 'severe';
    }
  }

  // Analyze GAD-7 results
  if (gad7Assessment) {
    const gad7Score = gad7Assessment.score;
    const severity = gad7Assessment.severity;

    if (gad7Score >= 15) {
      if (analysis.overallRiskLevel !== 'severe') analysis.overallRiskLevel = 'severe';
      analysis.primaryConcerns.push('Severe anxiety symptoms');
      analysis.supportLevel = 'intensive';
    } else if (gad7Score >= 10) {
      if (['minimal', 'mild'].includes(analysis.overallRiskLevel)) analysis.overallRiskLevel = 'moderate';
      analysis.primaryConcerns.push('Moderate anxiety symptoms');
      if (analysis.supportLevel === 'standard') analysis.supportLevel = 'enhanced';
    } else if (gad7Score >= 5) {
      if (analysis.overallRiskLevel === 'minimal') analysis.overallRiskLevel = 'mild';
      analysis.primaryConcerns.push('Mild anxiety symptoms');
    }
  }

  // Generate recommendations based on findings
  if (analysis.crisisIndicators.length > 0) {
    analysis.recommendations.push('Immediate safety assessment and crisis intervention resources');
    analysis.recommendations.push('Consider professional mental health support');
  }

  if (analysis.overallRiskLevel === 'severe') {
    analysis.recommendations.push('Enhanced monitoring and support features enabled');
    analysis.recommendations.push('Frequent check-ins recommended');
  } else if (analysis.overallRiskLevel === 'moderate') {
    analysis.recommendations.push('Regular therapeutic activities and monitoring');
    analysis.recommendations.push('Safety plan readily accessible');
  } else if (analysis.overallRiskLevel === 'mild') {
    analysis.recommendations.push('Consistent practice of mindfulness techniques');
    analysis.recommendations.push('Monitor symptoms with regular check-ins');
  } else {
    analysis.recommendations.push('Maintain current wellness practices');
    analysis.recommendations.push('Use app for continued mental health support');
  }

  return analysis;
};

// === NAVIGATION UTILITIES ===

/**
 * Determine if user can navigate to a specific onboarding step
 */
export const canNavigateToStep = (
  targetStep: OnboardingStep,
  currentStep: OnboardingStep,
  data: OnboardingSessionData
): {
  canNavigate: boolean;
  reason?: string;
  requiredSteps?: OnboardingStep[];
} => {
  const stepOrder: OnboardingStep[] = [
    'welcome',
    'mbct_education',
    'baseline_assessment',
    'safety_planning',
    'personalization',
    'practice_introduction'
  ];

  const currentIndex = stepOrder.indexOf(currentStep);
  const targetIndex = stepOrder.indexOf(targetStep);

  // Can always go backward
  if (targetIndex <= currentIndex) {
    return { canNavigate: true };
  }

  // Check if all intermediate steps are completed
  const intermediateSteps = stepOrder.slice(currentIndex, targetIndex);
  const incompleteSteps = intermediateSteps.filter(step => {
    const validation = validateStepWithFeedback(step, data);
    return !validation.isValid;
  });

  if (incompleteSteps.length > 0) {
    return {
      canNavigate: false,
      reason: `Complete required steps first: ${incompleteSteps.join(', ')}`,
      requiredSteps: incompleteSteps
    };
  }

  return { canNavigate: true };
};

/**
 * Get next recommended step based on current progress
 */
export const getNextRecommendedStep = (
  currentStep: OnboardingStep,
  data: OnboardingSessionData
): {
  nextStep: OnboardingStep | null;
  reason: string;
  isOptional: boolean;
} => {
  const stepOrder: OnboardingStep[] = [
    'welcome',
    'mbct_education',
    'baseline_assessment',
    'safety_planning',
    'personalization',
    'practice_introduction'
  ];

  const currentIndex = stepOrder.indexOf(currentStep);

  // Check if current step is complete
  const currentValidation = validateStepWithFeedback(currentStep, data);
  if (!currentValidation.isValid) {
    return {
      nextStep: currentStep,
      reason: `Complete ${currentStep} before proceeding`,
      isOptional: false
    };
  }

  // Get next step
  const nextStep = stepOrder[currentIndex + 1];
  if (!nextStep) {
    return {
      nextStep: null,
      reason: 'Onboarding complete',
      isOptional: false
    };
  }

  return {
    nextStep,
    reason: `Ready to proceed to ${nextStep}`,
    isOptional: false
  };
};

// === PERFORMANCE UTILITIES ===

/**
 * Calculate onboarding performance metrics
 */
export const calculatePerformanceMetrics = (
  progress: OnboardingProgress,
  performanceData: any
): {
  efficiency: number;
  timePerStep: Record<OnboardingStep, number>;
  averageStepTime: number;
  estimatedCompletion: string;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
} => {
  const totalExpectedTime = Object.values(ONBOARDING_STEPS).reduce(
    (sum, step) => sum + step.estimatedDuration,
    0
  );

  const actualTotalTime = performanceData.totalDuration || 0;
  const efficiency = Math.min(100, Math.round((totalExpectedTime / Math.max(actualTotalTime, 1)) * 100));

  const timePerStep = performanceData.stepDurations || {};
  const completedSteps = Object.keys(timePerStep).length;
  const averageStepTime = completedSteps > 0
    ? Object.values(timePerStep).reduce((sum: number, time: number) => sum + time, 0) / completedSteps
    : 0;

  // Estimate completion time
  const remainingSteps = 6 - progress.completedSteps.length;
  const estimatedRemainingTime = remainingSteps * (averageStepTime || 8); // 8 min default
  const estimatedCompletion = new Date(Date.now() + estimatedRemainingTime * 60000).toLocaleString();

  // Calculate performance grade
  let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (efficiency >= 90) performanceGrade = 'A';
  else if (efficiency >= 80) performanceGrade = 'B';
  else if (efficiency >= 70) performanceGrade = 'C';
  else if (efficiency >= 60) performanceGrade = 'D';
  else performanceGrade = 'F';

  return {
    efficiency,
    timePerStep,
    averageStepTime,
    estimatedCompletion,
    performanceGrade
  };
};

// === EXPORT UTILITIES ===

export const onboardingUtilities = {
  // Progress
  calculateDetailedProgress,
  calculateCompletionRate,

  // Validation
  validateStepWithFeedback,

  // Clinical
  analyzeBaselineAssessment,

  // Navigation
  canNavigateToStep,
  getNextRecommendedStep,

  // Performance
  calculatePerformanceMetrics,

  // Store integration
  isOnboardingActive: onboardingStoreUtils.isOnboardingActive,
  getCurrentProgress: onboardingStoreUtils.getCurrentProgress,
  getCurrentStep: onboardingStoreUtils.getCurrentStep,
  getTimeRemaining: onboardingStoreUtils.getTimeRemaining,
  isReadyToComplete: onboardingStoreUtils.isReadyToComplete,
  getCriticalErrors: onboardingStoreUtils.getCriticalErrors,
  isCrisisDetected: onboardingStoreUtils.isCrisisDetected,
  requiresCrisisIntervention: onboardingStoreUtils.requiresCrisisIntervention,
  getStepConfig: onboardingStoreUtils.getStepConfig,
  getAllSteps: onboardingStoreUtils.getAllSteps,
  getStateSummary: onboardingStoreUtils.getStateSummary
};

export default onboardingUtilities;