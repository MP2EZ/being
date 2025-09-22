/**
 * Input Validation Middleware for Being. MBCT App
 *
 * Comprehensive input validation and sanitization middleware
 * for clinical data protection and security threat prevention.
 *
 * SECURITY FEATURES:
 * - Clinical data format validation
 * - Injection attack prevention
 * - PII detection and redaction
 * - Rate limiting and abuse detection
 * - Memory-safe processing
 */

import { SecurityFoundations, SecurityErrorType } from '../core/SecurityFoundations';
import { DataSensitivity } from '../../types/security';

/**
 * Validation rule interface
 */
export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T, context?: ValidationContext) => Promise<ValidationResult>;
  priority: 'low' | 'medium' | 'high' | 'critical';
  applicableTypes: string[];
}

/**
 * Validation context for contextual validation
 */
export interface ValidationContext {
  sensitivity: DataSensitivity;
  operation: 'create' | 'read' | 'update' | 'delete';
  source: 'user_input' | 'api' | 'storage' | 'sync';
  sessionId: string;
  userId?: string;
  componentContext?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: any;
  confidence: number; // 0-1 scale
  processingTime: number;
}

/**
 * Validation statistics
 */
interface ValidationStats {
  totalValidations: number;
  failureRate: number;
  averageProcessingTime: number;
  threatAttempts: number;
  lastThreatDetection: string | null;
}

/**
 * Input Validation Middleware
 */
export class InputValidationMiddleware {
  private static instance: InputValidationMiddleware;
  private rules: Map<string, ValidationRule[]> = new Map();
  private stats: ValidationStats = {
    totalValidations: 0,
    failureRate: 0,
    averageProcessingTime: 0,
    threatAttempts: 0,
    lastThreatDetection: null
  };
  private ruleCache: Map<string, ValidationResult> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_VALIDATIONS_PER_WINDOW = 100;
  private rateLimitMap: Map<string, { count: number; window: number }> = new Map();

  private constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): InputValidationMiddleware {
    if (!InputValidationMiddleware.instance) {
      InputValidationMiddleware.instance = new InputValidationMiddleware();
    }
    return InputValidationMiddleware.instance;
  }

  /**
   * Validate input with comprehensive security checks
   */
  async validateInput<T>(
    value: T,
    type: string,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const operationId = `validation_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    try {
      // Register memory operation
      SecurityFoundations.registerMemoryOp(operationId, () => {
        console.log(`[SECURITY] Cleanup validation operation: ${operationId}`);
      });

      // Rate limiting check
      if (!this.checkRateLimit(context.sessionId)) {
        await SecurityFoundations.handleIncident(
          new Error('Rate limit exceeded for validation requests'),
          SecurityErrorType.INJECTION_ATTEMPT,
          'input_validation_rate_limit',
          { severity: 'medium', actionTaken: 'rate_limit_enforced' }
        );

        return {
          isValid: false,
          errors: ['Rate limit exceeded'],
          warnings: [],
          confidence: 0,
          processingTime: Date.now() - startTime
        };
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(value, type, context);
      const cachedResult = this.ruleCache.get(cacheKey);
      if (cachedResult) {
        return {
          ...cachedResult,
          processingTime: Date.now() - startTime
        };
      }

      // Get applicable rules
      const applicableRules = this.getApplicableRules(type, context);

      // Run validations
      const results = await Promise.all(
        applicableRules.map(rule => this.runRule(rule, value, context))
      );

      // Aggregate results
      const aggregatedResult = this.aggregateResults(results, startTime);

      // Cache result if successful
      if (aggregatedResult.isValid && this.ruleCache.size < this.MAX_CACHE_SIZE) {
        this.ruleCache.set(cacheKey, {
          ...aggregatedResult,
          processingTime: 0 // Don't cache processing time
        });
      }

      // Update statistics
      this.updateStats(aggregatedResult);

      // Log threats
      if (!aggregatedResult.isValid && aggregatedResult.confidence < 0.3) {
        this.stats.threatAttempts++;
        this.stats.lastThreatDetection = new Date().toISOString();

        await SecurityFoundations.handleIncident(
          new Error(`High-confidence threat detected: ${aggregatedResult.errors.join(', ')}`),
          SecurityErrorType.INJECTION_ATTEMPT,
          'input_validation_threat',
          { severity: 'high', actionTaken: 'input_rejected' }
        );
      }

      return aggregatedResult;

    } catch (error) {
      await SecurityFoundations.handleIncident(
        error as Error,
        SecurityErrorType.DATA_VALIDATION_ERROR,
        'input_validation_system',
        { severity: 'high', actionTaken: 'validation_failed' }
      );

      return {
        isValid: false,
        errors: ['Validation system error'],
        warnings: [],
        confidence: 0,
        processingTime: Date.now() - startTime
      };

    } finally {
      SecurityFoundations.unregisterMemoryOp(operationId);
    }
  }

  /**
   * Sanitize input safely
   */
  sanitizeInput<T>(
    value: T,
    type: string,
    context: ValidationContext
  ): T {
    try {
      if (typeof value === 'string') {
        let sanitized = value;

        // Clinical data sanitization
        if (context.sensitivity === DataSensitivity.CLINICAL) {
          sanitized = this.sanitizeClinicalData(sanitized);
        }

        // General sanitization
        sanitized = this.sanitizeGeneralInput(sanitized);

        // Type-specific sanitization
        switch (type) {
          case 'assessment_response':
            sanitized = this.sanitizeAssessmentResponse(sanitized);
            break;
          case 'user_text':
            sanitized = this.sanitizeUserText(sanitized);
            break;
          case 'search_query':
            sanitized = this.sanitizeSearchQuery(sanitized);
            break;
        }

        return sanitized as unknown as T;
      }

      if (typeof value === 'object' && value !== null) {
        return this.sanitizeObject(value, type, context) as T;
      }

      return value;

    } catch (error) {
      SecurityFoundations.handleIncident(
        error as Error,
        SecurityErrorType.DATA_VALIDATION_ERROR,
        'input_sanitization',
        { severity: 'medium', actionTaken: 'sanitization_failed' }
      );

      // Return safe fallback
      return (typeof value === 'string' ? '' : value) as T;
    }
  }

  /**
   * Register custom validation rule
   */
  registerRule(type: string, rule: ValidationRule): void {
    if (!this.rules.has(type)) {
      this.rules.set(type, []);
    }

    const typeRules = this.rules.get(type)!;
    typeRules.push(rule);

    // Sort by priority
    typeRules.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    console.log(`[SECURITY] Registered validation rule: ${rule.name} for type: ${type}`);
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): ValidationStats {
    return { ...this.stats };
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.ruleCache.clear();
    console.log('[SECURITY] Validation cache cleared');
  }

  // PRIVATE METHODS

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Clinical assessment validation
    this.registerRule('assessment_response', {
      name: 'PHQ9_GAD7_Format',
      priority: 'critical',
      applicableTypes: ['assessment_response', 'clinical_data'],
      validate: async (value: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof value === 'object' && value !== null) {
          // Validate PHQ-9/GAD-7 structure
          if ('responses' in value && Array.isArray(value.responses)) {
            const responses = value.responses;

            if (responses.length > 9) {
              errors.push('Too many assessment responses');
            }

            responses.forEach((response: any, index: number) => {
              const score = Number(response);
              if (isNaN(score) || score < 0 || score > 3) {
                errors.push(`Invalid response value at index ${index}: ${response}`);
              }
            });
          }

          if ('score' in value) {
            const totalScore = Number(value.score);
            if (isNaN(totalScore) || totalScore < 0 || totalScore > 27) {
              errors.push(`Invalid total score: ${value.score}`);
            }
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          confidence: errors.length === 0 ? 1.0 : 0.0,
          processingTime: 0
        };
      }
    });

    // PII detection rule
    this.registerRule('user_input', {
      name: 'PII_Detection',
      priority: 'high',
      applicableTypes: ['user_input', 'user_text', 'clinical_data'],
      validate: async (value: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof value === 'string') {
          const piiPatterns = [
            { pattern: /\b\d{3}-\d{2}-\d{4}\b/, name: 'SSN' },
            { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, name: 'Email' },
            { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, name: 'Credit Card' },
            { pattern: /\b\d{3}-\d{3}-\d{4}\b/, name: 'Phone Number' }
          ];

          piiPatterns.forEach(({ pattern, name }) => {
            if (pattern.test(value)) {
              warnings.push(`Potential ${name} detected in input`);
            }
          });
        }

        return {
          isValid: true, // PII detection doesn't invalidate, just warns
          errors,
          warnings,
          confidence: warnings.length === 0 ? 1.0 : 0.8,
          processingTime: 0
        };
      }
    });

    // Injection attack detection
    this.registerRule('security', {
      name: 'Injection_Detection',
      priority: 'critical',
      applicableTypes: ['user_input', 'search_query', 'user_text'],
      validate: async (value: any) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof value === 'string') {
          const maliciousPatterns = [
            { pattern: /<script[\s\S]*?<\/script>/gi, name: 'Script injection' },
            { pattern: /javascript:/gi, name: 'JavaScript protocol' },
            { pattern: /data:text\/html/gi, name: 'Data URL injection' },
            { pattern: /vbscript:/gi, name: 'VBScript protocol' },
            { pattern: /on\w+\s*=/gi, name: 'Event handler injection' },
            { pattern: /eval\s*\(/gi, name: 'Eval function call' },
            { pattern: /expression\s*\(/gi, name: 'CSS expression injection' }
          ];

          maliciousPatterns.forEach(({ pattern, name }) => {
            if (pattern.test(value)) {
              errors.push(`${name} detected`);
            }
          });

          // Check for suspicious character sequences
          const suspiciousChars = ['\0', '\x01', '\x02', '\x03', '\x04', '\x05'];
          if (suspiciousChars.some(char => value.includes(char))) {
            errors.push('Suspicious control characters detected');
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          confidence: errors.length === 0 ? 1.0 : 0.1,
          processingTime: 0
        };
      }
    });

    // Length validation
    this.registerRule('length', {
      name: 'Length_Validation',
      priority: 'medium',
      applicableTypes: ['user_input', 'user_text', 'search_query'],
      validate: async (value: any, context?: ValidationContext) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (typeof value === 'string') {
          const maxLength = context?.sensitivity === DataSensitivity.CLINICAL ? 5000 :
                           context?.sensitivity === DataSensitivity.PERSONAL ? 2000 : 1000;

          if (value.length > maxLength) {
            errors.push(`Input exceeds maximum length of ${maxLength} characters`);
          }

          if (value.length > maxLength * 0.8) {
            warnings.push(`Input approaching maximum length limit`);
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          confidence: 1.0,
          processingTime: 0
        };
      }
    });
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(sessionId: string): boolean {
    const now = Date.now();
    const sessionData = this.rateLimitMap.get(sessionId);

    if (!sessionData) {
      this.rateLimitMap.set(sessionId, { count: 1, window: now });
      return true;
    }

    // Reset window if expired
    if (now - sessionData.window > this.RATE_LIMIT_WINDOW) {
      this.rateLimitMap.set(sessionId, { count: 1, window: now });
      return true;
    }

    // Check if within limits
    if (sessionData.count >= this.MAX_VALIDATIONS_PER_WINDOW) {
      return false;
    }

    // Increment count
    sessionData.count++;
    return true;
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey<T>(value: T, type: string, context: ValidationContext): string {
    try {
      const valueHash = typeof value === 'string' ?
        value.substring(0, 50) :
        JSON.stringify(value).substring(0, 50);

      return `${type}_${context.sensitivity}_${context.operation}_${valueHash}`;
    } catch {
      return `${type}_${context.sensitivity}_${Date.now()}`;
    }
  }

  /**
   * Get applicable validation rules
   */
  private getApplicableRules(type: string, context: ValidationContext): ValidationRule[] {
    const typeSpecificRules = this.rules.get(type) || [];
    const generalRules = this.rules.get('security') || [];

    return [...typeSpecificRules, ...generalRules].filter(rule =>
      rule.applicableTypes.includes(type) || rule.applicableTypes.includes('*')
    );
  }

  /**
   * Run individual validation rule
   */
  private async runRule<T>(
    rule: ValidationRule,
    value: T,
    context: ValidationContext
  ): Promise<ValidationResult & { ruleName: string }> {
    const startTime = Date.now();

    try {
      const result = await rule.validate(value, context);
      return {
        ...result,
        ruleName: rule.name,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      await SecurityFoundations.handleIncident(
        error as Error,
        SecurityErrorType.DATA_VALIDATION_ERROR,
        `validation_rule_${rule.name}`,
        { severity: 'medium', actionTaken: 'rule_failed' }
      );

      return {
        isValid: false,
        errors: [`Validation rule ${rule.name} failed`],
        warnings: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
        ruleName: rule.name
      };
    }
  }

  /**
   * Aggregate validation results
   */
  private aggregateResults(
    results: (ValidationResult & { ruleName: string })[],
    startTime: number
  ): ValidationResult {
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);
    const isValid = results.every(r => r.isValid);
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      isValid,
      errors: allErrors,
      warnings: allWarnings,
      confidence: avgConfidence,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Update validation statistics
   */
  private updateStats(result: ValidationResult): void {
    this.stats.totalValidations++;

    if (!result.isValid) {
      const totalFailures = this.stats.totalValidations * this.stats.failureRate + 1;
      this.stats.failureRate = totalFailures / this.stats.totalValidations;
    }

    // Update average processing time (exponential moving average)
    const alpha = 0.1;
    this.stats.averageProcessingTime =
      alpha * result.processingTime + (1 - alpha) * this.stats.averageProcessingTime;
  }

  /**
   * Sanitize clinical data
   */
  private sanitizeClinicalData(input: string): string {
    return input
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * General input sanitization
   */
  private sanitizeGeneralInput(input: string): string {
    return input
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Sanitize assessment response
   */
  private sanitizeAssessmentResponse(input: string): string {
    // Only allow numbers and basic punctuation for assessments
    return input.replace(/[^0-9.,\s-]/g, '').trim();
  }

  /**
   * Sanitize user text input
   */
  private sanitizeUserText(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/&(?!#?\w+;)/g, '&amp;') // Escape unescaped ampersands
      .trim();
  }

  /**
   * Sanitize search query
   */
  private sanitizeSearchQuery(input: string): string {
    return input
      .replace(/[^\w\s-.,]/g, '') // Only allow word characters, spaces, hyphens, periods, commas
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit search query length
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject<T>(obj: T, type: string, context: ValidationContext): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj } as any;

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeInput(value, 'user_text', context);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, type, context);
      }
    });

    return sanitized;
  }
}

// Export singleton instance
export const inputValidationMiddleware = InputValidationMiddleware.getInstance();