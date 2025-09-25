/**
 * FormValidationService - Clinical Form Validation with Strict TypeScript
 * 
 * Consolidated form validation service with PHQ-9/GAD-7 clinical accuracy, 
 * strict TypeScript typing, and HIPAA-compliant validation patterns.
 * 
 * CRITICAL: 100% accuracy required for PHQ-9/GAD-7 scoring and thresholds
 * FEATURES: Branded types, clinical validation, real-time validation, accessibility support
 */

import type { 
  DeepReadonly, 
  ISODateString, 
  UserID,
  CrisisSeverity,
  ValidationResult,
} from '../types/core';
import type { 
  PHQ9Score, 
  GAD7Score, 
  PHQ9Response, 
  GAD7Response,
  AssessmentID,
  ClinicalSeverity,
} from '../types/clinical';

// === BRANDED TYPES FOR TYPE SAFETY ===

type ValidationRuleID = string & { readonly __brand: 'ValidationRuleID' };
type FormFieldID = string & { readonly __brand: 'FormFieldID' };
type SanitizedString = string & { readonly __brand: 'SanitizedString' };
type PhoneNumber = string & { readonly __brand: 'PhoneNumber' };
type EmailAddress = string & { readonly __brand: 'EmailAddress' };
type ClinicalResponseValue = number & { readonly __brand: 'ClinicalResponseValue' };
type ValidatedAssessmentScore = number & { readonly __brand: 'ValidatedAssessmentScore' };

// === CLINICAL VALIDATION TYPES ===

interface PHQ9ValidationResult extends ValidationResult {
  readonly score: PHQ9Score;
  readonly severity: ClinicalSeverity;
  readonly crisisRisk: boolean;
  readonly recommendedActions: readonly string[];
  readonly validationTimestamp: ISODateString;
}

interface GAD7ValidationResult extends ValidationResult {
  readonly score: GAD7Score;
  readonly severity: ClinicalSeverity;
  readonly anxietyLevel: 'minimal' | 'mild' | 'moderate' | 'severe';
  readonly recommendedActions: readonly string[];
  readonly validationTimestamp: ISODateString;
}

// === FORM VALIDATION CONFIGURATION ===

interface FormValidationConfig {
  readonly enableRealTimeValidation: boolean;
  readonly strictMode: boolean;
  readonly clinicalAccuracyRequired: boolean;
  readonly accessibilityValidation: boolean;
  readonly sanitizeInputs: boolean;
  readonly maxFieldLength: number;
  readonly crisisThresholds: {
    readonly phq9: PHQ9Score;
    readonly gad7: GAD7Score;
  };
}

const DEFAULT_VALIDATION_CONFIG: FormValidationConfig = {
  enableRealTimeValidation: true,
  strictMode: true,
  clinicalAccuracyRequired: true,
  accessibilityValidation: true,
  sanitizeInputs: true,
  maxFieldLength: 1000,
  crisisThresholds: {
    phq9: 20 as PHQ9Score, // PHQ-9 ≥20 indicates severe depression
    gad7: 15 as GAD7Score, // GAD-7 ≥15 indicates severe anxiety
  },
} as const;

// === VALIDATION RULE TYPES ===

interface ValidationRule<T = any> {
  readonly id: ValidationRuleID;
  readonly field: FormFieldID;
  readonly required: boolean;
  readonly validator: (value: T, context?: ValidationContext) => ValidationRuleResult;
  readonly errorMessage: string;
  readonly accessibilityHint?: string;
  readonly clinicalRelevance?: 'low' | 'medium' | 'high' | 'critical';
}

interface ValidationRuleResult {
  readonly isValid: boolean;
  readonly error?: string;
  readonly warning?: string;
  readonly sanitizedValue?: any;
  readonly accessibilityMessage?: string;
}

interface ValidationContext {
  readonly userId?: UserID;
  readonly formType: 'phq9' | 'gad7' | 'checkin' | 'crisis' | 'profile' | 'contact';
  readonly isEmergency?: boolean;
  readonly previousValues?: Record<string, any>;
  readonly validationStrict?: boolean;
}

// === CLINICAL ASSESSMENT TYPES (STRICT VALIDATION) ===

/**
 * PHQ-9 Clinical Assessment Response Values (0-3 scale)
 * 0 = Not at all, 1 = Several days, 2 = More than half the days, 3 = Nearly every day
 */
type PHQ9ResponseValue = 0 | 1 | 2 | 3;

/**
 * GAD-7 Clinical Assessment Response Values (0-3 scale)
 * 0 = Not at all, 1 = Several days, 2 = More than half the days, 3 = Nearly every day
 */
type GAD7ResponseValue = 0 | 1 | 2 | 3;

/**
 * Difficulty Level Response (if any score > 0)
 * 0 = Not difficult at all, 1 = Somewhat difficult, 2 = Very difficult, 3 = Extremely difficult
 */
type DifficultyLevelValue = 0 | 1 | 2 | 3;

interface PHQ9FormData {
  readonly question1: PHQ9ResponseValue; // Little interest or pleasure in doing things
  readonly question2: PHQ9ResponseValue; // Feeling down, depressed, or hopeless
  readonly question3: PHQ9ResponseValue; // Trouble falling or staying asleep, sleeping too much
  readonly question4: PHQ9ResponseValue; // Feeling tired or having little energy
  readonly question5: PHQ9ResponseValue; // Poor appetite or overeating
  readonly question6: PHQ9ResponseValue; // Feeling bad about yourself
  readonly question7: PHQ9ResponseValue; // Trouble concentrating
  readonly question8: PHQ9ResponseValue; // Moving or speaking slowly or fidgety/restless
  readonly question9: PHQ9ResponseValue; // Thoughts that you would be better off dead
  readonly difficultyLevel?: DifficultyLevelValue; // Follow-up question if score > 0
}

interface GAD7FormData {
  readonly question1: GAD7ResponseValue; // Feeling nervous, anxious, or on edge
  readonly question2: GAD7ResponseValue; // Not being able to stop or control worrying
  readonly question3: GAD7ResponseValue; // Worrying too much about different things
  readonly question4: GAD7ResponseValue; // Trouble relaxing
  readonly question5: GAD7ResponseValue; // Being so restless it's hard to sit still
  readonly question6: GAD7ResponseValue; // Becoming easily annoyed or irritable
  readonly question7: GAD7ResponseValue; // Feeling afraid as if something awful might happen
  readonly difficultyLevel?: DifficultyLevelValue; // Follow-up question if score > 0
}

// === FORM VALIDATION SERVICE ===

class TypeSafeFormValidationService {
  private readonly config: FormValidationConfig;
  private readonly validationRules: Map<FormFieldID, ValidationRule[]> = new Map();
  private readonly sanitizationRules: Map<string, (input: string) => SanitizedString> = new Map();

  constructor(config: Partial<FormValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    this.initializeValidationRules();
    this.initializeSanitizationRules();
  }

  // === PHQ-9 CLINICAL VALIDATION ===

  /**
   * Validate PHQ-9 assessment with 100% clinical accuracy
   * CRITICAL: Must maintain exact clinical scoring standards
   */
  validatePHQ9(formData: PHQ9FormData, context?: ValidationContext): PHQ9ValidationResult {
    const validationTimestamp = new Date().toISOString() as ISODateString;

    try {
      // Validate individual questions (0-3 scale)
      const questionValidation = this.validatePHQ9Questions(formData);
      if (!questionValidation.isValid) {
        return {
          isValid: false,
          errors: questionValidation.errors,
          score: 0 as PHQ9Score,
          severity: 'minimal',
          crisisRisk: false,
          recommendedActions: [],
          validationTimestamp,
        };
      }

      // Calculate clinical score
      const score = this.calculatePHQ9Score(formData);
      const severity = this.getPHQ9Severity(score);
      const crisisRisk = this.assessPHQ9CrisisRisk(formData, score);

      // Generate clinical recommendations
      const recommendedActions = this.getPHQ9Recommendations(score, severity, crisisRisk);

      return {
        isValid: true,
        errors: [],
        score,
        severity,
        crisisRisk,
        recommendedActions,
        validationTimestamp,
      };
    } catch (error) {
      console.error('PHQ-9 validation error:', error);
      return {
        isValid: false,
        errors: ['PHQ-9 validation failed - please try again'],
        score: 0 as PHQ9Score,
        severity: 'minimal',
        crisisRisk: false,
        recommendedActions: ['Contact healthcare provider if symptoms persist'],
        validationTimestamp,
      };
    }
  }

  /**
   * Calculate PHQ-9 score with clinical precision
   */
  private calculatePHQ9Score(formData: PHQ9FormData): PHQ9Score {
    const questions = [
      formData.question1,
      formData.question2,
      formData.question3,
      formData.question4,
      formData.question5,
      formData.question6,
      formData.question7,
      formData.question8,
      formData.question9,
    ];

    const totalScore = questions.reduce((sum, value) => sum + value, 0);
    
    // Validate score is within clinical range (0-27)
    if (totalScore < 0 || totalScore > 27) {
      throw new Error(`Invalid PHQ-9 score: ${totalScore}. Must be 0-27.`);
    }

    return totalScore as PHQ9Score;
  }

  /**
   * Determine PHQ-9 clinical severity with exact thresholds
   */
  private getPHQ9Severity(score: PHQ9Score): ClinicalSeverity {
    if (score >= 20) return 'severe';
    if (score >= 15) return 'moderately_severe';
    if (score >= 10) return 'moderate';
    if (score >= 5) return 'mild';
    return 'minimal';
  }

  /**
   * Assess crisis risk from PHQ-9 responses
   * CRITICAL: Question 9 (suicidal ideation) requires immediate attention
   */
  private assessPHQ9CrisisRisk(formData: PHQ9FormData, score: PHQ9Score): boolean {
    // Question 9: Thoughts of death or self-harm
    const suicidalIdeation = formData.question9 > 0;
    
    // High overall score indicates severe depression
    const severeDepression = score >= this.config.crisisThresholds.phq9;
    
    return suicidalIdeation || severeDepression;
  }

  /**
   * Generate PHQ-9 clinical recommendations
   */
  private getPHQ9Recommendations(
    score: PHQ9Score, 
    severity: ClinicalSeverity, 
    crisisRisk: boolean
  ): readonly string[] {
    const recommendations: string[] = [];

    if (crisisRisk) {
      recommendations.push('Immediate professional mental health evaluation recommended');
      recommendations.push('Consider crisis intervention services');
      recommendations.push('Ensure safety plan is in place');
    }

    switch (severity) {
      case 'severe':
        recommendations.push('Professional treatment strongly recommended');
        recommendations.push('Consider intensive outpatient or inpatient care');
        break;
      case 'moderately_severe':
        recommendations.push('Professional treatment recommended');
        recommendations.push('Consider psychotherapy and/or medication');
        break;
      case 'moderate':
        recommendations.push('Professional treatment may be beneficial');
        recommendations.push('Monitor symptoms closely');
        break;
      case 'mild':
        recommendations.push('Self-monitoring and lifestyle modifications may help');
        recommendations.push('Consider professional consultation if symptoms worsen');
        break;
      case 'minimal':
        recommendations.push('Continue healthy lifestyle practices');
        break;
    }

    return recommendations;
  }

  // === GAD-7 CLINICAL VALIDATION ===

  /**
   * Validate GAD-7 assessment with 100% clinical accuracy
   */
  validateGAD7(formData: GAD7FormData, context?: ValidationContext): GAD7ValidationResult {
    const validationTimestamp = new Date().toISOString() as ISODateString;

    try {
      // Validate individual questions (0-3 scale)
      const questionValidation = this.validateGAD7Questions(formData);
      if (!questionValidation.isValid) {
        return {
          isValid: false,
          errors: questionValidation.errors,
          score: 0 as GAD7Score,
          severity: 'minimal',
          anxietyLevel: 'minimal',
          recommendedActions: [],
          validationTimestamp,
        };
      }

      // Calculate clinical score
      const score = this.calculateGAD7Score(formData);
      const severity = this.getGAD7Severity(score);
      const anxietyLevel = this.getGAD7AnxietyLevel(score);

      // Generate clinical recommendations
      const recommendedActions = this.getGAD7Recommendations(score, severity);

      return {
        isValid: true,
        errors: [],
        score,
        severity,
        anxietyLevel,
        recommendedActions,
        validationTimestamp,
      };
    } catch (error) {
      console.error('GAD-7 validation error:', error);
      return {
        isValid: false,
        errors: ['GAD-7 validation failed - please try again'],
        score: 0 as GAD7Score,
        severity: 'minimal',
        anxietyLevel: 'minimal',
        recommendedActions: ['Contact healthcare provider if symptoms persist'],
        validationTimestamp,
      };
    }
  }

  /**
   * Calculate GAD-7 score with clinical precision
   */
  private calculateGAD7Score(formData: GAD7FormData): GAD7Score {
    const questions = [
      formData.question1,
      formData.question2,
      formData.question3,
      formData.question4,
      formData.question5,
      formData.question6,
      formData.question7,
    ];

    const totalScore = questions.reduce((sum, value) => sum + value, 0);
    
    // Validate score is within clinical range (0-21)
    if (totalScore < 0 || totalScore > 21) {
      throw new Error(`Invalid GAD-7 score: ${totalScore}. Must be 0-21.`);
    }

    return totalScore as GAD7Score;
  }

  /**
   * Determine GAD-7 clinical severity
   */
  private getGAD7Severity(score: GAD7Score): ClinicalSeverity {
    if (score >= 15) return 'severe';
    if (score >= 10) return 'moderate';
    if (score >= 5) return 'mild';
    return 'minimal';
  }

  /**
   * Get GAD-7 anxiety level classification
   */
  private getGAD7AnxietyLevel(score: GAD7Score): 'minimal' | 'mild' | 'moderate' | 'severe' {
    if (score >= 15) return 'severe';
    if (score >= 10) return 'moderate';
    if (score >= 5) return 'mild';
    return 'minimal';
  }

  /**
   * Generate GAD-7 clinical recommendations
   */
  private getGAD7Recommendations(score: GAD7Score, severity: ClinicalSeverity): readonly string[] {
    const recommendations: string[] = [];

    switch (severity) {
      case 'severe':
        recommendations.push('Professional treatment strongly recommended');
        recommendations.push('Consider cognitive behavioral therapy (CBT)');
        recommendations.push('Medication evaluation may be appropriate');
        break;
      case 'moderate':
        recommendations.push('Professional treatment recommended');
        recommendations.push('Consider therapy and stress management techniques');
        break;
      case 'mild':
        recommendations.push('Self-help strategies and monitoring may be beneficial');
        recommendations.push('Consider professional consultation if symptoms worsen');
        break;
      case 'minimal':
        recommendations.push('Continue healthy coping strategies');
        break;
    }

    return recommendations;
  }

  // === GENERAL FORM VALIDATION ===

  /**
   * Validate generic form fields with type safety
   */
  validateField<T>(
    fieldId: FormFieldID,
    value: T,
    context?: ValidationContext
  ): ValidationRuleResult {
    const rules = this.validationRules.get(fieldId) || [];
    
    for (const rule of rules) {
      const result = rule.validator(value, context);
      if (!result.isValid) {
        return result;
      }
    }

    return {
      isValid: true,
      sanitizedValue: this.sanitizeValue(String(value)),
    };
  }

  /**
   * Validate entire form with comprehensive checks
   */
  validateForm(
    formData: Record<string, any>,
    context: ValidationContext
  ): ValidationResult & {
    readonly fieldResults: Record<string, ValidationRuleResult>;
    readonly crisisDetected: boolean;
  } {
    const fieldResults: Record<string, ValidationRuleResult> = {};
    const errors: string[] = [];
    let crisisDetected = false;

    // Validate each field
    for (const [fieldName, value] of Object.entries(formData)) {
      const fieldId = fieldName as FormFieldID;
      const result = this.validateField(fieldId, value, context);
      
      fieldResults[fieldName] = result;
      
      if (!result.isValid && result.error) {
        errors.push(`${fieldName}: ${result.error}`);
      }
    }

    // Check for crisis indicators
    if (context.formType === 'phq9' || context.formType === 'gad7') {
      crisisDetected = this.detectCrisisFromForm(formData, context.formType);
    }

    return {
      isValid: errors.length === 0,
      errors,
      fieldResults,
      crisisDetected,
    };
  }

  // === INPUT SANITIZATION ===

  /**
   * Sanitize string input with security measures
   */
  sanitizeString(input: string): SanitizedString {
    if (typeof input !== 'string') {
      return '' as SanitizedString;
    }

    let sanitized = input
      .trim()
      .substring(0, this.config.maxFieldLength)
      // Remove potentially dangerous characters
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '');

    return sanitized as SanitizedString;
  }

  /**
   * Validate and sanitize phone number
   */
  sanitizePhoneNumber(phone: string): PhoneNumber {
    if (typeof phone !== 'string') {
      return '' as PhoneNumber;
    }

    // Keep only digits and common phone characters
    const cleaned = phone
      .replace(/[^\d\+\-\(\)\s\.]/g, '')
      .substring(0, 20);

    return cleaned as PhoneNumber;
  }

  /**
   * Validate and sanitize email address
   */
  sanitizeEmail(email: string): EmailAddress {
    if (typeof email !== 'string') {
      return '' as EmailAddress;
    }

    const cleaned = email
      .trim()
      .toLowerCase()
      .substring(0, 254); // RFC 5321 limit

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned)) {
      return '' as EmailAddress;
    }

    return cleaned as EmailAddress;
  }

  // === PRIVATE HELPER METHODS ===

  private initializeValidationRules(): void {
    // Initialize built-in validation rules
    this.addValidationRule('email' as FormFieldID, {
      id: 'email_format' as ValidationRuleID,
      field: 'email' as FormFieldID,
      required: true,
      validator: (value: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: emailRegex.test(value),
          error: emailRegex.test(value) ? undefined : 'Please enter a valid email address',
          sanitizedValue: this.sanitizeEmail(value),
        };
      },
      errorMessage: 'Please enter a valid email address',
      accessibilityHint: 'Enter your email address in the format name@domain.com',
    });

    this.addValidationRule('phone' as FormFieldID, {
      id: 'phone_format' as ValidationRuleID,
      field: 'phone' as FormFieldID,
      required: false,
      validator: (value: string) => {
        if (!value) return { isValid: true };
        const phoneRegex = /^[\d\+\-\(\)\s\.]{10,20}$/;
        return {
          isValid: phoneRegex.test(value),
          error: phoneRegex.test(value) ? undefined : 'Please enter a valid phone number',
          sanitizedValue: this.sanitizePhoneNumber(value),
        };
      },
      errorMessage: 'Please enter a valid phone number',
      accessibilityHint: 'Enter your phone number with area code',
    });
  }

  private initializeSanitizationRules(): void {
    this.sanitizationRules.set('string', (input: string) => this.sanitizeString(input));
    this.sanitizationRules.set('phone', (input: string) => this.sanitizePhoneNumber(input) as SanitizedString);
    this.sanitizationRules.set('email', (input: string) => this.sanitizeEmail(input) as SanitizedString);
  }

  private addValidationRule(fieldId: FormFieldID, rule: ValidationRule): void {
    const existingRules = this.validationRules.get(fieldId) || [];
    this.validationRules.set(fieldId, [...existingRules, rule]);
  }

  private sanitizeValue(value: string): SanitizedString {
    return this.sanitizeString(value);
  }

  private validatePHQ9Questions(formData: PHQ9FormData): ValidationResult {
    const errors: string[] = [];

    // Strict type checking for each PHQ-9 response
    const questions: Array<{ value: any; questionNum: number; description: string }> = [
      { value: formData.question1, questionNum: 1, description: 'Little interest or pleasure in doing things' },
      { value: formData.question2, questionNum: 2, description: 'Feeling down, depressed, or hopeless' },
      { value: formData.question3, questionNum: 3, description: 'Trouble falling or staying asleep, sleeping too much' },
      { value: formData.question4, questionNum: 4, description: 'Feeling tired or having little energy' },
      { value: formData.question5, questionNum: 5, description: 'Poor appetite or overeating' },
      { value: formData.question6, questionNum: 6, description: 'Feeling bad about yourself' },
      { value: formData.question7, questionNum: 7, description: 'Trouble concentrating' },
      { value: formData.question8, questionNum: 8, description: 'Moving or speaking slowly or fidgety/restless' },
      { value: formData.question9, questionNum: 9, description: 'Thoughts that you would be better off dead' },
    ];

    questions.forEach(({ value, questionNum, description }) => {
      if (value === undefined || value === null) {
        errors.push(`PHQ-9 Question ${questionNum} is required: ${description}`);
      } else if (typeof value !== 'number') {
        errors.push(`PHQ-9 Question ${questionNum} must be a number (received: ${typeof value})`);
      } else if (!Number.isInteger(value)) {
        errors.push(`PHQ-9 Question ${questionNum} must be a whole number (received: ${value})`);
      } else if (!(value >= 0 && value <= 3)) {
        errors.push(`PHQ-9 Question ${questionNum} must be 0-3 (received: ${value}). 0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day`);
      }
    });

    // Validate difficulty level if any questions answered > 0
    const hasSymptoms = questions.some(({ value }) => typeof value === 'number' && value > 0);
    if (hasSymptoms && formData.difficultyLevel !== undefined) {
      if (typeof formData.difficultyLevel !== 'number' || !Number.isInteger(formData.difficultyLevel) || !(formData.difficultyLevel >= 0 && formData.difficultyLevel <= 3)) {
        errors.push(`PHQ-9 Difficulty Level must be 0-3 if symptoms are present (received: ${formData.difficultyLevel}). 0=Not difficult, 1=Somewhat, 2=Very, 3=Extremely difficult`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private validateGAD7Questions(formData: GAD7FormData): ValidationResult {
    const errors: string[] = [];

    // Strict type checking for each GAD-7 response
    const questions: Array<{ value: any; questionNum: number; description: string }> = [
      { value: formData.question1, questionNum: 1, description: 'Feeling nervous, anxious, or on edge' },
      { value: formData.question2, questionNum: 2, description: 'Not being able to stop or control worrying' },
      { value: formData.question3, questionNum: 3, description: 'Worrying too much about different things' },
      { value: formData.question4, questionNum: 4, description: 'Trouble relaxing' },
      { value: formData.question5, questionNum: 5, description: 'Being so restless it\'s hard to sit still' },
      { value: formData.question6, questionNum: 6, description: 'Becoming easily annoyed or irritable' },
      { value: formData.question7, questionNum: 7, description: 'Feeling afraid as if something awful might happen' },
    ];

    questions.forEach(({ value, questionNum, description }) => {
      if (value === undefined || value === null) {
        errors.push(`GAD-7 Question ${questionNum} is required: ${description}`);
      } else if (typeof value !== 'number') {
        errors.push(`GAD-7 Question ${questionNum} must be a number (received: ${typeof value})`);
      } else if (!Number.isInteger(value)) {
        errors.push(`GAD-7 Question ${questionNum} must be a whole number (received: ${value})`);
      } else if (!(value >= 0 && value <= 3)) {
        errors.push(`GAD-7 Question ${questionNum} must be 0-3 (received: ${value}). 0=Not at all, 1=Several days, 2=More than half the days, 3=Nearly every day`);
      }
    });

    // Validate difficulty level if any questions answered > 0
    const hasSymptoms = questions.some(({ value }) => typeof value === 'number' && value > 0);
    if (hasSymptoms && formData.difficultyLevel !== undefined) {
      if (typeof formData.difficultyLevel !== 'number' || !Number.isInteger(formData.difficultyLevel) || !(formData.difficultyLevel >= 0 && formData.difficultyLevel <= 3)) {
        errors.push(`GAD-7 Difficulty Level must be 0-3 if symptoms are present (received: ${formData.difficultyLevel}). 0=Not difficult, 1=Somewhat, 2=Very, 3=Extremely difficult`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private detectCrisisFromForm(formData: Record<string, any>, formType: 'phq9' | 'gad7'): boolean {
    if (formType === 'phq9') {
      // Check for suicidal ideation (Question 9)
      return formData.question9 > 0;
    }
    
    if (formType === 'gad7') {
      // Check for severe anxiety scores
      const score = this.calculateGAD7Score(formData as GAD7FormData);
      return score >= this.config.crisisThresholds.gad7;
    }

    return false;
  }

  // === PUBLIC API ===

  /**
   * Get validation configuration
   */
  getConfig(): DeepReadonly<FormValidationConfig> {
    return this.config;
  }

  /**
   * Check if form field is valid
   */
  isFieldValid(fieldId: FormFieldID, value: any, context?: ValidationContext): boolean {
    return this.validateField(fieldId, value, context).isValid;
  }

  /**
   * Get accessibility hint for field
   */
  getAccessibilityHint(fieldId: FormFieldID): string {
    const rules = this.validationRules.get(fieldId);
    return rules?.[0]?.accessibilityHint || '';
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    // Clear any cached validation results if implemented
  }
}

// === SERVICE INSTANCE ===

export const FormValidationService = new TypeSafeFormValidationService({
  enableRealTimeValidation: true,
  strictMode: true,
  clinicalAccuracyRequired: true,
  accessibilityValidation: true,
  sanitizeInputs: true,
});

// === TYPE EXPORTS ===

export type {
  FormValidationConfig,
  ValidationRule,
  ValidationRuleResult,
  ValidationContext,
  PHQ9FormData,
  GAD7FormData,
  PHQ9ValidationResult,
  GAD7ValidationResult,
  FormFieldID,
  ValidationRuleID,
  SanitizedString,
  PhoneNumber,
  EmailAddress,
  ClinicalResponseValue,
  ValidatedAssessmentScore,
  PHQ9ResponseValue,
  GAD7ResponseValue,
  DifficultyLevelValue,
};

// === DEFAULT EXPORT ===

export default FormValidationService;