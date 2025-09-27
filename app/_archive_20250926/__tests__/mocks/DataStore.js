/**
 * Mock implementation of DataStore for testing
 * Provides in-memory storage for clinical data validation tests
 */

export class DataStore {
  constructor() {
    this.users = new Map();
    this.checkIns = [];
    this.assessments = [];
    this.crisisPlans = new Map();
    this.storage = new Map();
  }

  // Clinical Data Validation - mirrors production validation
  validateAssessment(assessment) {
    const errors = [];

    if (!assessment.id) errors.push('Assessment ID is required');
    if (!assessment.type || !['phq9', 'gad7'].includes(assessment.type)) {
      errors.push('Assessment type must be phq9 or gad7');
    }
    if (!Array.isArray(assessment.answers)) {
      errors.push('Assessment answers must be an array');
    } else {
      if (assessment.type === 'phq9') {
        if (assessment.answers.length !== 9) {
          errors.push('PHQ-9 must have exactly 9 answers');
        }
        assessment.answers.forEach((answer, index) => {
          if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
            errors.push(`PHQ-9 Q${index + 1} must be integer 0-3, got ${answer}`);
          }
        });
        const expectedScore = assessment.answers.reduce((sum, val) => sum + val, 0);
        if (assessment.score !== expectedScore) {
          errors.push(`PHQ-9 score mismatch: calculated ${expectedScore}, stored ${assessment.score}`);
        }
        if (assessment.score < 0 || assessment.score > 27) {
          errors.push(`PHQ-9 score must be 0-27, got ${assessment.score}`);
        }
      }
      
      if (assessment.type === 'gad7') {
        if (assessment.answers.length !== 7) {
          errors.push('GAD-7 must have exactly 7 answers');
        }
        assessment.answers.forEach((answer, index) => {
          if (!Number.isInteger(answer) || answer < 0 || answer > 3) {
            errors.push(`GAD-7 Q${index + 1} must be integer 0-3, got ${answer}`);
          }
        });
        const expectedScore = assessment.answers.reduce((sum, val) => sum + val, 0);
        if (assessment.score !== expectedScore) {
          errors.push(`GAD-7 score mismatch: calculated ${expectedScore}, stored ${assessment.score}`);
        }
        if (assessment.score < 0 || assessment.score > 21) {
          errors.push(`GAD-7 score must be 0-21, got ${assessment.score}`);
        }
      }
    }

    if (!assessment.completedAt) {
      errors.push('Assessment completedAt timestamp is required');
    } else {
      const date = new Date(assessment.completedAt);
      if (isNaN(date.getTime())) {
        errors.push('Assessment completedAt must be valid ISO date string');
      }
    }

    const validSeverities = ['minimal', 'mild', 'moderate', 'moderately severe', 'severe'];
    if (assessment.severity && !validSeverities.includes(assessment.severity)) {
      errors.push(`Assessment severity must be one of: ${validSeverities.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  validateCheckIn(checkIn) {
    const errors = [];

    if (!checkIn.id) errors.push('CheckIn ID is required');
    if (!checkIn.type || !['morning', 'midday', 'evening'].includes(checkIn.type)) {
      errors.push('CheckIn type must be morning, midday, or evening');
    }
    if (!checkIn.startedAt) {
      errors.push('CheckIn startedAt timestamp is required');
    } else {
      const date = new Date(checkIn.startedAt);
      if (isNaN(date.getTime())) {
        errors.push('CheckIn startedAt must be valid ISO date string');
      }
    }

    if (typeof checkIn.skipped !== 'boolean') {
      errors.push('CheckIn skipped must be boolean');
    }

    return { valid: errors.length === 0, errors };
  }

  // User Profile Management
  async saveUser(user) {
    this.users.set('current', user);
    return Promise.resolve();
  }

  async getUser() {
    return Promise.resolve(this.users.get('current') || null);
  }

  // Check-in Management
  async saveCheckIn(checkIn) {
    const validation = this.validateCheckIn(checkIn);
    if (!validation.valid) {
      console.error('CheckIn validation failed:', validation.errors);
      throw new Error(`CheckIn validation failed: ${validation.errors.join('; ')}`);
    }

    this.checkIns.push(checkIn);
    return Promise.resolve();
  }

  async getCheckIns() {
    return Promise.resolve([...this.checkIns]);
  }

  async updateCheckIn(checkInId, updates) {
    const index = this.checkIns.findIndex(c => c.id === checkInId);
    if (index === -1) {
      throw new Error('Check-in not found');
    }
    this.checkIns[index] = { ...this.checkIns[index], ...updates };
    return Promise.resolve();
  }

  async getRecentCheckIns(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return Promise.resolve(
      this.checkIns.filter(c => new Date(c.completedAt || c.startedAt) > cutoff)
    );
  }

  async getTodayCheckIns() {
    const today = new Date().toDateString();
    return Promise.resolve(
      this.checkIns.filter(c => 
        new Date(c.completedAt || c.startedAt).toDateString() === today
      )
    );
  }

  async getCheckInsByType(type, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return Promise.resolve(
      this.checkIns.filter(c => 
        c.type === type && new Date(c.completedAt || c.startedAt) > cutoff
      )
    );
  }

  // Assessment Management
  async saveAssessment(assessment) {
    const validation = this.validateAssessment(assessment);
    if (!validation.valid) {
      console.error('Assessment validation failed:', validation.errors);
      throw new Error(`Assessment validation failed: ${validation.errors.join('; ')}`);
    }

    this.assessments.push(assessment);
    return Promise.resolve();
  }

  async getAssessments() {
    return Promise.resolve([...this.assessments]);
  }

  async getAssessmentsByType(type) {
    return Promise.resolve(
      this.assessments
        .filter(a => a.type === type)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    );
  }

  async getLatestAssessment(type) {
    const assessments = await this.getAssessmentsByType(type);
    return Promise.resolve(assessments.length > 0 ? assessments[0] : null);
  }

  // Crisis Plan Management
  async saveCrisisPlan(crisisPlan) {
    this.crisisPlans.set('current', crisisPlan);
    return Promise.resolve();
  }

  async getCrisisPlan() {
    return Promise.resolve(this.crisisPlans.get('current') || null);
  }

  async deleteCrisisPlan() {
    this.crisisPlans.delete('current');
    return Promise.resolve();
  }

  // Data Export
  async exportData() {
    const user = await this.getUser();
    const checkIns = await this.getCheckIns();
    const assessments = await this.getAssessments();
    const crisisPlan = await this.getCrisisPlan();
    
    return Promise.resolve({
      exportDate: new Date().toISOString(),
      version: '1.0',
      user: user || {},
      checkIns,
      assessments,
      crisisPlan,
      disclaimer: 'This data is for personal use only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.'
    });
  }

  // Data Management Utilities
  async clearAllData() {
    this.users.clear();
    this.checkIns = [];
    this.assessments = [];
    this.crisisPlans.clear();
    this.storage.clear();
    return Promise.resolve();
  }

  // Test helper methods
  reset() {
    this.users.clear();
    this.checkIns = [];
    this.assessments = [];
    this.crisisPlans.clear();
    this.storage.clear();
  }

  async getStorageInfo() {
    const user = await this.getUser();
    const checkIns = await this.getCheckIns();
    const assessments = await this.getAssessments();
    const crisisPlan = await this.getCrisisPlan();

    const dataSize = JSON.stringify({
      user, checkIns, assessments, crisisPlan
    }).length;

    return Promise.resolve({
      userExists: !!user,
      checkInCount: checkIns.length,
      assessmentCount: assessments.length,
      hasCrisisPlan: !!crisisPlan,
      dataSize
    });
  }

  async validateData() {
    const errors = [];
    
    try {
      const user = await this.getUser();
      if (user && !user.id) {
        errors.push('User profile missing ID');
      }
      
      const checkIns = await this.getCheckIns();
      checkIns.forEach((checkIn, index) => {
        if (!checkIn.id) {
          errors.push(`CheckIn ${index} missing ID`);
        }
        if (!['morning', 'midday', 'evening'].includes(checkIn.type)) {
          errors.push(`CheckIn ${checkIn.id} has invalid type: ${checkIn.type}`);
        }
      });
      
      const assessments = await this.getAssessments();
      assessments.forEach((assessment, index) => {
        if (!assessment.id) {
          errors.push(`Assessment ${index} missing ID`);
        }
        if (!['phq9', 'gad7'].includes(assessment.type)) {
          errors.push(`Assessment ${assessment.id} has invalid type: ${assessment.type}`);
        }
      });
      
    } catch (error) {
      errors.push(`Data validation failed: ${error}`);
    }
    
    return Promise.resolve({
      valid: errors.length === 0,
      errors
    });
  }

  // Partial Session Management
  async savePartialCheckIn(checkIn) {
    if (!checkIn.type || !checkIn.id) {
      throw new Error('Partial check-in must have type and ID');
    }
    
    const key = `partial_${checkIn.type}_${Date.now()}`;
    this.storage.set(key, {
      ...checkIn,
      partialKey: key,
      savedAt: new Date().toISOString()
    });
    
    return Promise.resolve();
  }

  async getPartialCheckIn(type) {
    // Find most recent partial session for type
    const entries = Array.from(this.storage.entries());
    const partialSessions = entries
      .filter(([key, value]) => key.startsWith(`partial_${type}_`))
      .sort((a, b) => {
        const timestampA = parseInt(a[0].split('_').pop() || '0');
        const timestampB = parseInt(b[0].split('_').pop() || '0');
        return timestampB - timestampA;
      });
    
    if (partialSessions.length === 0) {
      return Promise.resolve(null);
    }
    
    const [, session] = partialSessions[0];
    
    // Check if expired (24 hours)
    const savedAt = new Date(session.savedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return Promise.resolve(null);
    }
    
    return Promise.resolve(session);
  }

  async clearPartialCheckIn(type) {
    const keysToDelete = [];
    for (const [key] of this.storage.entries()) {
      if (key.startsWith(`partial_${type}_`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.storage.delete(key));
    return Promise.resolve();
  }

  async cleanupExpiredPartialSessions() {
    const now = new Date();
    const keysToDelete = [];
    
    for (const [key, session] of this.storage.entries()) {
      if (key.startsWith('partial_')) {
        try {
          const savedAt = new Date(session.savedAt);
          const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff > 24) {
            keysToDelete.push(key);
          }
        } catch {
          keysToDelete.push(key);
        }
      }
    }
    
    keysToDelete.forEach(key => this.storage.delete(key));
    return Promise.resolve();
  }

  async getAllPartialSessions() {
    const sessions = [];
    
    for (const [key, session] of this.storage.entries()) {
      if (key.startsWith('partial_')) {
        sessions.push({
          type: session.type,
          savedAt: session.savedAt,
          data: session
        });
      }
    }
    
    return Promise.resolve(sessions);
  }
}

// Export singleton instance
export const dataStore = new DataStore();