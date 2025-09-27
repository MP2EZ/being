/**
 * PII Detection Engine - Zero-PII Validation Core
 *
 * Implements real-time PII detection with healthcare compliance
 * and crisis-safe validation patterns for Being. MBCT app.
 */

export enum PIIType {
  SSN = 'ssn',
  EMAIL = 'email',
  PHONE = 'phone',
  CREDIT_CARD = 'credit_card',
  MEDICAL_ID = 'medical_id',
  NAME = 'name',
  ADDRESS = 'address',
  DATE_OF_BIRTH = 'date_of_birth',
  HEALTH_INFO = 'health_info',
  FINANCIAL_INFO = 'financial_info',
  BIOMETRIC = 'biometric',
  UNKNOWN = 'unknown'
}

export interface PIIScanContext {
  fieldName?: string;
  dataType?: string;
  context?: 'clinical' | 'payment' | 'user_profile' | 'crisis' | 'general';
  sensitivity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PIIDetectionResult {
  detected: boolean;
  type: PIIType;
  confidence: number;
  location?: {
    start: number;
    end: number;
  };
  context: PIIScanContext;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'allow' | 'sanitize' | 'encrypt' | 'block';
}

class PIIDetectionEngine {
  private readonly patterns: Map<PIIType, RegExp[]> = new Map();

  constructor() {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    // SSN patterns
    this.patterns.set(PIIType.SSN, [
      /\b\d{3}-\d{2}-\d{4}\b/g,
      /\b\d{9}\b/g
    ]);

    // Email patterns
    this.patterns.set(PIIType.EMAIL, [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ]);

    // Phone patterns
    this.patterns.set(PIIType.PHONE, [
      /\b\d{3}-\d{3}-\d{4}\b/g,
      /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g,
      /\b\d{10}\b/g
    ]);

    // Credit card patterns
    this.patterns.set(PIIType.CREDIT_CARD, [
      /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Visa
      /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // MasterCard
      /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g // Amex
    ]);

    // Date of birth patterns
    this.patterns.set(PIIType.DATE_OF_BIRTH, [
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\b\d{4}-\d{2}-\d{2}\b/g
    ]);
  }

  scan(data: string, context: PIIScanContext = {}): PIIDetectionResult[] {
    const results: PIIDetectionResult[] = [];

    for (const [type, patterns] of this.patterns) {
      for (const pattern of patterns) {
        const matches = Array.from(data.matchAll(pattern));

        for (const match of matches) {
          const result: PIIDetectionResult = {
            detected: true,
            type,
            confidence: this.calculateConfidence(type, match[0], context),
            location: {
              start: match.index || 0,
              end: (match.index || 0) + match[0].length
            },
            context,
            riskLevel: this.assessRiskLevel(type, context),
            recommendation: this.getRecommendation(type, context)
          };

          results.push(result);
        }
      }
    }

    return results;
  }

  private calculateConfidence(type: PIIType, value: string, context: PIIScanContext): number {
    // Base confidence based on pattern match
    let confidence = 0.8;

    // Adjust based on context
    if (context.context === 'clinical' && type === PIIType.HEALTH_INFO) {
      confidence = 0.95;
    }

    if (context.context === 'payment' && type === PIIType.CREDIT_CARD) {
      confidence = 0.9;
    }

    // Additional validation for specific types
    if (type === PIIType.SSN && this.isValidSSN(value)) {
      confidence = 0.95;
    }

    return Math.min(confidence, 1.0);
  }

  private isValidSSN(ssn: string): boolean {
    const cleanSSN = ssn.replace(/\D/g, '');
    return cleanSSN.length === 9 && cleanSSN !== '000000000';
  }

  private assessRiskLevel(type: PIIType, context: PIIScanContext): 'low' | 'medium' | 'high' | 'critical' {
    const highRiskTypes = [PIIType.SSN, PIIType.CREDIT_CARD, PIIType.MEDICAL_ID, PIIType.HEALTH_INFO];
    const criticalContexts = ['clinical', 'crisis'];

    if (criticalContexts.includes(context.context || '')) {
      return 'critical';
    }

    if (highRiskTypes.includes(type)) {
      return 'high';
    }

    if (type === PIIType.EMAIL || type === PIIType.PHONE) {
      return 'medium';
    }

    return 'low';
  }

  private getRecommendation(type: PIIType, context: PIIScanContext): 'allow' | 'sanitize' | 'encrypt' | 'block' {
    const highRiskTypes = [PIIType.SSN, PIIType.CREDIT_CARD, PIIType.MEDICAL_ID];

    if (context.context === 'crisis' && highRiskTypes.includes(type)) {
      return 'block';
    }

    if (highRiskTypes.includes(type)) {
      return 'encrypt';
    }

    if (type === PIIType.EMAIL || type === PIIType.PHONE) {
      return 'sanitize';
    }

    return 'allow';
  }

  hasPII(data: string, context: PIIScanContext = {}): boolean {
    const results = this.scan(data, context);
    return results.length > 0;
  }

  getHighRiskPII(data: string, context: PIIScanContext = {}): PIIDetectionResult[] {
    const results = this.scan(data, context);
    return results.filter(result =>
      result.riskLevel === 'high' || result.riskLevel === 'critical'
    );
  }
}

export const piiDetectionEngine = new PIIDetectionEngine();
export default piiDetectionEngine;