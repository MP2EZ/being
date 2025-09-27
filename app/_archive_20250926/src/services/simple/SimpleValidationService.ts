class SimpleValidationService {
  private static instance: SimpleValidationService;

  static getInstance(): SimpleValidationService {
    if (!SimpleValidationService.instance) {
      SimpleValidationService.instance = new SimpleValidationService();
    }
    return SimpleValidationService.instance;
  }

  // User data validation
  validateUserData(userData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData) {
      errors.push('User data is required');
      return { isValid: false, errors };
    }

    if (!userData.id || typeof userData.id !== 'string') {
      errors.push('Valid user ID is required');
    }

    if (!userData.name || typeof userData.name !== 'string' || userData.name.trim().length === 0) {
      errors.push('Valid user name is required');
    }

    if (typeof userData.isFirstTime !== 'boolean') {
      errors.push('isFirstTime must be a boolean');
    }

    if (typeof userData.completedOnboarding !== 'boolean') {
      errors.push('completedOnboarding must be a boolean');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Crisis data validation
  validateCrisisData(crisisData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!crisisData) {
      errors.push('Crisis data is required');
      return { isValid: false, errors };
    }

    if (typeof crisisData.isInCrisis !== 'boolean') {
      errors.push('isInCrisis must be a boolean');
    }

    if (!Array.isArray(crisisData.emergencyContacts)) {
      errors.push('emergencyContacts must be an array');
    } else {
      crisisData.emergencyContacts.forEach((contact: any, index: number) => {
        if (!contact.id || !contact.name || !contact.phone) {
          errors.push(`Emergency contact ${index + 1} is missing required fields`);
        }
      });
    }

    if (!Array.isArray(crisisData.safetyPlan)) {
      errors.push('safetyPlan must be an array');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Input sanitization
  sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input.trim().substring(0, 1000); // Limit length and trim
  }

  sanitizePhoneNumber(phone: string): string {
    if (typeof phone !== 'string') return '';
    // Keep only digits and common phone characters
    return phone.replace(/[^\d\+\-\(\)\s]/g, '').substring(0, 20);
  }

  // Basic security checks
  isValidId(id: string): boolean {
    if (typeof id !== 'string') return false;
    // Simple validation: alphanumeric and hyphens, reasonable length
    return /^[a-zA-Z0-9\-]{1,50}$/.test(id);
  }

  isSafeContent(content: string): boolean {
    if (typeof content !== 'string') return false;
    // Basic checks for potentially harmful content
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:text\/html/i
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }
}

export const simpleValidation = SimpleValidationService.getInstance();