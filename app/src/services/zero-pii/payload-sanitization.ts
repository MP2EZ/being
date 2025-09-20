/**
 * Payload Sanitization Service - Zero-PII Data Cleaning
 *
 * Implements secure payload sanitization with PII removal and masking
 * for healthcare compliance and crisis-safe data handling.
 */

import { PIIType, PIIDetectionResult, piiDetectionEngine, PIIScanContext } from './pii-detection-engine';

export interface SanitizationResult {
  sanitized: string;
  piiDetected: boolean;
  removedTypes: PIIType[];
  confidence: number;
  isCompliant: boolean;
  warnings: string[];
}

export interface SanitizationOptions {
  maskCharacter?: string;
  preserveLength?: boolean;
  allowedTypes?: PIIType[];
  context?: PIIScanContext;
  strictMode?: boolean;
}

class PayloadSanitizationService {
  private readonly defaultMaskCharacter = '*';

  sanitize(data: string, options: SanitizationOptions = {}): SanitizationResult {
    const {
      maskCharacter = this.defaultMaskCharacter,
      preserveLength = true,
      allowedTypes = [],
      context = {},
      strictMode = false
    } = options;

    // Detect PII in the payload
    const detectionResults = piiDetectionEngine.scan(data, context);

    let sanitizedData = data;
    const removedTypes: PIIType[] = [];
    const warnings: string[] = [];
    let overallConfidence = 1.0;

    // Process each detected PII
    for (const result of detectionResults) {
      // Skip if this type is explicitly allowed
      if (allowedTypes.includes(result.type)) {
        continue;
      }

      // In strict mode, block high-risk PII entirely
      if (strictMode && (result.riskLevel === 'high' || result.riskLevel === 'critical')) {
        warnings.push(`High-risk PII detected and blocked: ${result.type}`);
        return {
          sanitized: '',
          piiDetected: true,
          removedTypes: [result.type],
          confidence: result.confidence,
          isCompliant: false,
          warnings
        };
      }

      // Apply sanitization based on recommendation
      switch (result.recommendation) {
        case 'block':
          warnings.push(`Blocked PII: ${result.type}`);
          return {
            sanitized: '',
            piiDetected: true,
            removedTypes: [result.type],
            confidence: result.confidence,
            isCompliant: false,
            warnings
          };

        case 'sanitize':
        case 'encrypt':
          if (result.location) {
            const originalValue = sanitizedData.substring(result.location.start, result.location.end);
            const maskedValue = this.maskValue(originalValue, maskCharacter, preserveLength);

            sanitizedData =
              sanitizedData.substring(0, result.location.start) +
              maskedValue +
              sanitizedData.substring(result.location.end);
          }

          removedTypes.push(result.type);
          overallConfidence = Math.min(overallConfidence, result.confidence);
          break;

        case 'allow':
          // Keep as-is but note detection
          warnings.push(`PII detected but allowed: ${result.type}`);
          break;
      }
    }

    return {
      sanitized: sanitizedData,
      piiDetected: detectionResults.length > 0,
      removedTypes,
      confidence: overallConfidence,
      isCompliant: this.assessCompliance(detectionResults, removedTypes, strictMode),
      warnings
    };
  }

  private maskValue(value: string, maskChar: string, preserveLength: boolean): string {
    if (!preserveLength) {
      return '[REDACTED]';
    }

    // For certain PII types, use specific masking patterns
    if (this.isEmail(value)) {
      return this.maskEmail(value, maskChar);
    }

    if (this.isPhone(value)) {
      return this.maskPhone(value, maskChar);
    }

    if (this.isCreditCard(value)) {
      return this.maskCreditCard(value, maskChar);
    }

    // Default masking
    return maskChar.repeat(value.length);
  }

  private isEmail(value: string): boolean {
    return /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(value);
  }

  private isPhone(value: string): boolean {
    return /\b\d{3}-\d{3}-\d{4}\b|\b\(\d{3}\)\s?\d{3}-\d{4}\b|\b\d{10}\b/.test(value);
  }

  private isCreditCard(value: string): boolean {
    return /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/.test(value);
  }

  private maskEmail(email: string, maskChar: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${maskChar.repeat(local.length)}@${domain}`;
    }
    return `${local[0]}${maskChar.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  private maskPhone(phone: string, maskChar: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${maskChar.repeat(3)}-${maskChar.repeat(3)}-${cleaned.slice(-4)}`;
    }
    return maskChar.repeat(phone.length);
  }

  private maskCreditCard(card: string, maskChar: string): string {
    const cleaned = card.replace(/\D/g, '');
    if (cleaned.length >= 13) {
      const lastFour = cleaned.slice(-4);
      const masked = maskChar.repeat(cleaned.length - 4);
      return `${masked}${lastFour}`;
    }
    return maskChar.repeat(card.length);
  }

  private assessCompliance(
    detectionResults: PIIDetectionResult[],
    removedTypes: PIIType[],
    strictMode: boolean
  ): boolean {
    // In strict mode, any high-risk PII makes it non-compliant
    if (strictMode) {
      const highRiskDetected = detectionResults.some(result =>
        result.riskLevel === 'high' || result.riskLevel === 'critical'
      );

      if (highRiskDetected) {
        const highRiskRemoved = detectionResults.every(result =>
          (result.riskLevel !== 'high' && result.riskLevel !== 'critical') ||
          removedTypes.includes(result.type)
        );
        return highRiskRemoved;
      }
    }

    // Standard compliance: critical PII must be handled
    const criticalPII = detectionResults.filter(result => result.riskLevel === 'critical');
    return criticalPII.every(result => removedTypes.includes(result.type));
  }

  // Utility methods
  validatePayload(data: string, context: PIIScanContext = {}): boolean {
    const result = this.sanitize(data, { context, strictMode: true });
    return result.isCompliant;
  }

  hasHighRiskPII(data: string, context: PIIScanContext = {}): boolean {
    const results = piiDetectionEngine.getHighRiskPII(data, context);
    return results.length > 0;
  }

  sanitizeForCrisis(data: string): SanitizationResult {
    return this.sanitize(data, {
      context: { context: 'crisis', sensitivity: 'critical' },
      strictMode: true,
      preserveLength: false
    });
  }

  sanitizeForPayment(data: string): SanitizationResult {
    return this.sanitize(data, {
      context: { context: 'payment', sensitivity: 'high' },
      strictMode: true,
      allowedTypes: [] // No PII allowed in payment context
    });
  }
}

export const payloadSanitizationService = new PayloadSanitizationService();
export default payloadSanitizationService;