/**
 * Data Validation Utilities - Ensures clinical data integrity
 * Critical: Never modify scoring algorithms without clinical approval
 */

import { CheckIn, Assessment, UserProfile } from '../types';
import {
  PHQ9Answers,
  GAD7Answers,
  PHQ9Score,
  GAD7Score,
  AssessmentID,
  CheckInID,
  CRISIS_THRESHOLD_PHQ9,
  CRISIS_THRESHOLD_GAD7,
  SUICIDAL_IDEATION_QUESTION_INDEX,
  SUICIDAL_IDEATION_THRESHOLD,
  ClinicalValidationError,
  createISODateString
} from '../types/clinical';

// Validation errors
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Check-in data validation
export const validateCheckInData = (checkIn: Partial<CheckIn>): void => {
  if (!checkIn.type) {
    throw new ValidationError('Check-in type is required', 'type');
  }

  if (!['morning', 'midday', 'evening'].includes(checkIn.type)) {
    throw new ValidationError('Invalid check-in type', 'type');
  }

  if (!checkIn.id || typeof checkIn.id !== 'string') {
    throw new ValidationError('Check-in ID is required', 'id');
  }

  if (!checkIn.startedAt || !isValidISODate(checkIn.startedAt)) {
    throw new ValidationError('Valid start date is required', 'startedAt');
  }

  if (checkIn.completedAt && !isValidISODate(checkIn.completedAt)) {
    throw new ValidationError('Invalid completion date', 'completedAt');
  }

  // Validate specific data fields based on type
  if (checkIn.data) {
    switch (checkIn.type) {
      case 'morning':
        validateMorningData(checkIn.data);
        break;
      case 'midday':
        validateMiddayData(checkIn.data);
        break;
      case 'evening':
        validateEveningData(checkIn.data);
        break;
    }
  }
};

// Morning check-in validation
const validateMorningData = (data: CheckIn['data']): void => {
  if (data.sleepQuality !== undefined && (data.sleepQuality < 0 || data.sleepQuality > 10)) {
    throw new ValidationError('Sleep quality must be between 0-10', 'sleepQuality');
  }

  if (data.energyLevel !== undefined && (data.energyLevel < 0 || data.energyLevel > 10)) {
    throw new ValidationError('Energy level must be between 0-10', 'energyLevel');
  }

  if (data.anxietyLevel !== undefined && (data.anxietyLevel < 0 || data.anxietyLevel > 10)) {
    throw new ValidationError('Anxiety level must be between 0-10', 'anxietyLevel');
  }

  if (data.bodyAreas && !Array.isArray(data.bodyAreas)) {
    throw new ValidationError('Body areas must be an array', 'bodyAreas');
  }

  if (data.emotions && !Array.isArray(data.emotions)) {
    throw new ValidationError('Emotions must be an array', 'emotions');
  }

  if (data.thoughts && !Array.isArray(data.thoughts)) {
    throw new ValidationError('Thoughts must be an array', 'thoughts');
  }
};

// Midday check-in validation
const validateMiddayData = (data: CheckIn['data']): void => {
  if (data.currentEmotions && !Array.isArray(data.currentEmotions)) {
    throw new ValidationError('Current emotions must be an array', 'currentEmotions');
  }

  if (data.breathingCompleted !== undefined && typeof data.breathingCompleted !== 'boolean') {
    throw new ValidationError('Breathing completed must be boolean', 'breathingCompleted');
  }
};

// Evening check-in validation
const validateEveningData = (data: CheckIn['data']): void => {
  if (data.overallMood !== undefined && (data.overallMood < 0 || data.overallMood > 10)) {
    throw new ValidationError('Overall mood must be between 0-10', 'overallMood');
  }

  if (data.energyManagement !== undefined && (data.energyManagement < 0 || data.energyManagement > 10)) {
    throw new ValidationError('Energy management must be between 0-10', 'energyManagement');
  }

  if (data.valuesAlignment !== undefined && (data.valuesAlignment < 0 || data.valuesAlignment > 10)) {
    throw new ValidationError('Values alignment must be between 0-10', 'valuesAlignment');
  }

  if (data.dayEmotions && !Array.isArray(data.dayEmotions)) {
    throw new ValidationError('Day emotions must be an array', 'dayEmotions');
  }

  if (data.tensionAreas && !Array.isArray(data.tensionAreas)) {
    throw new ValidationError('Tension areas must be an array', 'tensionAreas');
  }

  if (data.sleepIntentions && !Array.isArray(data.sleepIntentions)) {
    throw new ValidationError('Sleep intentions must be an array', 'sleepIntentions');
  }
};

// Assessment validation - Critical for clinical accuracy
export const validateAssessment = (assessment: Partial<Assessment>): void => {
  if (!assessment.type || !['phq9', 'gad7'].includes(assessment.type)) {
    throw new ValidationError('Invalid assessment type', 'type');
  }

  if (!assessment.answers || !Array.isArray(assessment.answers)) {
    throw new ValidationError('Assessment answers are required', 'answers');
  }

  // Validate answer counts
  const expectedQuestions = assessment.type === 'phq9' ? 9 : 7;
  if (assessment.answers.length !== expectedQuestions) {
    throw new ValidationError(
      `${assessment.type.toUpperCase()} requires ${expectedQuestions} answers`,
      'answers'
    );
  }

  // Validate answer values (0-3 for both PHQ-9 and GAD-7)
  for (let i = 0; i < assessment.answers.length; i++) {
    const answer = assessment.answers[i];
    if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
      throw new ValidationError(
        `Answer ${i + 1} must be an integer between 0-3`,
        `answers[${i}]`
      );
    }
  }

  // Validate calculated score matches answers
  const calculatedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
  if (assessment.score !== undefined && assessment.score !== calculatedScore) {
    throw new ValidationError('Score does not match calculated total', 'score');
  }

  if (!assessment.completedAt || !isValidISODate(assessment.completedAt)) {
    throw new ValidationError('Valid completion date is required', 'completedAt');
  }
};

// User profile validation
export const validateUserProfile = (user: Partial<UserProfile>): void => {
  if (!user.id || typeof user.id !== 'string') {
    throw new ValidationError('User ID is required', 'id');
  }

  if (!user.createdAt || !isValidISODate(user.createdAt)) {
    throw new ValidationError('Valid creation date is required', 'createdAt');
  }

  if (user.values && (!Array.isArray(user.values) || user.values.length < 3 || user.values.length > 5)) {
    throw new ValidationError('User must select 3-5 values', 'values');
  }

  if (user.notifications) {
    if (!user.notifications.morning || !isValidTimeString(user.notifications.morning)) {
      throw new ValidationError('Valid morning notification time required', 'notifications.morning');
    }
    if (!user.notifications.midday || !isValidTimeString(user.notifications.midday)) {
      throw new ValidationError('Valid midday notification time required', 'notifications.midday');
    }
    if (!user.notifications.evening || !isValidTimeString(user.notifications.evening)) {
      throw new ValidationError('Valid evening notification time required', 'notifications.evening');
    }
  }
};

// Utility functions
const isValidISODate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString === date.toISOString();
};

const isValidTimeString = (timeString: string): boolean => {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeString);
};

// Crisis threshold constants - DO NOT MODIFY WITHOUT CLINICAL APPROVAL
export const CRISIS_THRESHOLDS = {
  PHQ9_SEVERE: CRISIS_THRESHOLD_PHQ9,
  GAD7_SEVERE: CRISIS_THRESHOLD_GAD7,
  PHQ9_SUICIDAL_IDEATION_QUESTION: SUICIDAL_IDEATION_QUESTION_INDEX,
  SUICIDAL_IDEATION_THRESHOLD: SUICIDAL_IDEATION_THRESHOLD,
} as const;

// Type-safe Crisis Detection Functions - DO NOT MODIFY WITHOUT CLINICAL APPROVAL
export const requiresCrisisIntervention = (assessment: Assessment): boolean => {
  if (assessment.type === 'phq9') {
    // Type-safe access to PHQ-9 specific data
    const hasHighScore = assessment.score >= CRISIS_THRESHOLD_PHQ9;
    const hasSuicidalThoughts = assessment.answers[SUICIDAL_IDEATION_QUESTION_INDEX] >= SUICIDAL_IDEATION_THRESHOLD;
    return hasHighScore || hasSuicidalThoughts;
  }
  
  if (assessment.type === 'gad7') {
    return assessment.score >= CRISIS_THRESHOLD_GAD7;
  }
  
  return false;
};

// Type-safe PHQ-9 Answer Validation
export const isValidPHQ9Answers = (answers: unknown): answers is PHQ9Answers => {
  if (!Array.isArray(answers) || answers.length !== 9) {
    return false;
  }
  
  return answers.every(answer => 
    typeof answer === 'number' && 
    Number.isInteger(answer) && 
    answer >= 0 && 
    answer <= 3
  );
};

// Type-safe GAD-7 Answer Validation
export const isValidGAD7Answers = (answers: unknown): answers is GAD7Answers => {
  if (!Array.isArray(answers) || answers.length !== 7) {
    return false;
  }
  
  return answers.every(answer => 
    typeof answer === 'number' && 
    Number.isInteger(answer) && 
    answer >= 0 && 
    answer <= 3
  );
};

// Type-safe Score Validation
export const isValidPHQ9Score = (score: number): score is PHQ9Score => {
  return Number.isInteger(score) && score >= 0 && score <= 27;
};

export const isValidGAD7Score = (score: number): score is GAD7Score => {
  return Number.isInteger(score) && score >= 0 && score <= 21;
};

// Clinical Calculation Functions with Type Safety
export const calculatePHQ9Score = (answers: PHQ9Answers): PHQ9Score => {
  const sum = answers.reduce((total: number, answer: number) => total + answer, 0);
  if (!isValidPHQ9Score(sum)) {
    throw new ClinicalValidationError(
      `Invalid PHQ-9 score calculated: ${sum}`,
      'phq9',
      'score',
      'score between 0-27',
      sum
    );
  }
  return sum;
};

export const calculateGAD7Score = (answers: GAD7Answers): GAD7Score => {
  const sum = answers.reduce((total: number, answer: number) => total + answer, 0);
  if (!isValidGAD7Score(sum)) {
    throw new ClinicalValidationError(
      `Invalid GAD-7 score calculated: ${sum}`,
      'gad7',
      'score',
      'score between 0-21',
      sum
    );
  }
  return sum;
};

// ID Validation Functions
export const isValidAssessmentID = (id: string): id is AssessmentID => {
  return /^assessment_(phq9|gad7)_\d+_[a-z0-9]+$/.test(id);
};

export const isValidCheckInID = (id: string): id is CheckInID => {
  return /^checkin_(morning|midday|evening)_\d+_[a-z0-9]+$/.test(id);
};

// Sanitize text input to prevent injection attacks
export const sanitizeTextInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .substring(0, 2000) // Limit length
    .replace(/[<>]/g, ''); // Remove potential HTML tags
};

// Validate and sanitize array inputs
export const sanitizeArrayInput = (input: any[]): string[] => {
  if (!Array.isArray(input)) return [];
  
  return input
    .filter(item => typeof item === 'string')
    .map(item => sanitizeTextInput(item))
    .filter(item => item.length > 0)
    .slice(0, 20); // Limit array size
};