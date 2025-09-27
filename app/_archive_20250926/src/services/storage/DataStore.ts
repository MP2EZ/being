/**
 * AsyncStorage Data Layer - Complete implementation from TRD v2.0
 * Handles all data persistence for offline-first architecture
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserProfile, 
  CheckIn, 
  Assessment, 
  CrisisPlan, 
  ExportData 
} from '../../types';

export class DataStore {
  private readonly KEYS = {
    USER: 'being_user',
    CHECKINS: 'being_checkins',
    ASSESSMENTS: 'being_assessments',
    CRISIS_PLAN: 'being_crisis',
    PARTIAL_SESSIONS: 'being_partial_sessions'
  };

  // Clinical Data Validation Rules
  private validateAssessment(assessment: Assessment): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!assessment.id) errors.push('Assessment ID is required');
    if (!assessment.type || !['phq9', 'gad7'].includes(assessment.type)) {
      errors.push('Assessment type must be phq9 or gad7');
    }
    if (!Array.isArray(assessment.answers)) {
      errors.push('Assessment answers must be an array');
    } else {
      // PHQ-9 validation: 9 questions, each 0-3
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
      
      // GAD-7 validation: 7 questions, each 0-3
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

  private validateCheckIn(checkIn: CheckIn): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

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
  async saveUser(user: UserProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  async getUser(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

  // Check-in Management with 90-day retention
  async saveCheckIn(checkIn: CheckIn): Promise<void> {
    // CRITICAL: Validate check-in data for therapeutic accuracy
    const validation = this.validateCheckIn(checkIn);
    if (!validation.valid) {
      console.error('CheckIn validation failed:', validation.errors);
      throw new Error(`CheckIn validation failed: ${validation.errors.join('; ')}`);
    }

    try {
      const existing = await this.getCheckIns();
      existing.push(checkIn);
      
      // Keep last 90 days only for performance
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const filtered = existing.filter(c => 
        new Date(c.completedAt || c.startedAt) > cutoff
      );
      
      await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(filtered));
      
      // Clear partial session for this check-in type after successful save
      await this.clearPartialCheckIn(checkIn.type);
    } catch (error) {
      console.error('Failed to save check-in:', error);
      throw new Error('Failed to save check-in');
    }
  }

  async getCheckIns(): Promise<CheckIn[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CHECKINS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load check-ins:', error);
      return [];
    }
  }

  async updateCheckIn(checkInId: string, updates: Partial<CheckIn>): Promise<void> {
    try {
      const checkIns = await this.getCheckIns();
      const index = checkIns.findIndex(c => c.id === checkInId);
      
      if (index === -1) {
        throw new Error('Check-in not found');
      }
      
      checkIns[index] = { ...checkIns[index], ...updates };
      await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(checkIns));
    } catch (error) {
      console.error('Failed to update check-in:', error);
      throw new Error('Failed to update check-in');
    }
  }

  // Query methods (in-memory filtering)
  async getRecentCheckIns(days: number = 7): Promise<CheckIn[]> {
    const all = await this.getCheckIns();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all.filter(c => new Date(c.completedAt || c.startedAt) > cutoff);
  }

  async getTodayCheckIns(): Promise<CheckIn[]> {
    const all = await this.getCheckIns();
    const today = new Date().toDateString();
    return all.filter(c => 
      new Date(c.completedAt || c.startedAt).toDateString() === today
    );
  }

  async getCheckInsByType(type: 'morning' | 'midday' | 'evening', days: number = 30): Promise<CheckIn[]> {
    const all = await this.getCheckIns();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return all.filter(c => 
      c.type === type && new Date(c.completedAt || c.startedAt) > cutoff
    );
  }

  // Assessment Management
  async saveAssessment(assessment: Assessment): Promise<void> {
    // CRITICAL: Validate clinical data for 100% accuracy
    const validation = this.validateAssessment(assessment);
    if (!validation.valid) {
      console.error('Assessment validation failed:', validation.errors);
      throw new Error(`Assessment validation failed: ${validation.errors.join('; ')}`);
    }

    try {
      const existing = await this.getAssessments();
      existing.push(assessment);
      await AsyncStorage.setItem(this.KEYS.ASSESSMENTS, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to save assessment:', error);
      throw new Error('Failed to save assessment');
    }
  }

  async getAssessments(): Promise<Assessment[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.ASSESSMENTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load assessments:', error);
      return [];
    }
  }

  async getAssessmentsByType(type: 'phq9' | 'gad7'): Promise<Assessment[]> {
    const all = await this.getAssessments();
    return all.filter(a => a.type === type)
              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }

  async getLatestAssessment(type: 'phq9' | 'gad7'): Promise<Assessment | null> {
    const assessments = await this.getAssessmentsByType(type);
    return assessments.length > 0 ? assessments[0] : null;
  }

  // Crisis Plan Management
  async saveCrisisPlan(crisisPlan: CrisisPlan): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEYS.CRISIS_PLAN, JSON.stringify(crisisPlan));
    } catch (error) {
      console.error('Failed to save crisis plan:', error);
      throw new Error('Failed to save crisis plan');
    }
  }

  async getCrisisPlan(): Promise<CrisisPlan | null> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CRISIS_PLAN);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load crisis plan:', error);
      return null;
    }
  }

  async deleteCrisisPlan(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.CRISIS_PLAN);
    } catch (error) {
      console.error('Failed to delete crisis plan:', error);
      throw new Error('Failed to delete crisis plan');
    }
  }

  // Data Export with Clinical Disclaimer
  async exportData(): Promise<ExportData> {
    try {
      const user = await this.getUser();
      const checkIns = await this.getCheckIns();
      const assessments = await this.getAssessments();
      const crisisPlan = await this.getCrisisPlan();
      
      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        user: user!,
        checkIns,
        assessments,
        crisisPlan,
        disclaimer: 'This data is for personal use only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.'
      };
      
      return exportData;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Failed to export data');
    }
  }

  // Data Management Utilities
  async clearAllData(): Promise<void> {
    try {
      // Clear main data
      await Promise.all([
        AsyncStorage.removeItem(this.KEYS.USER),
        AsyncStorage.removeItem(this.KEYS.CHECKINS),
        AsyncStorage.removeItem(this.KEYS.ASSESSMENTS),
        AsyncStorage.removeItem(this.KEYS.CRISIS_PLAN)
      ]);
      
      // Clear all partial sessions
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_`)
      );
      
      await Promise.all(
        partialKeys.map(key => AsyncStorage.removeItem(key))
      );
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw new Error('Failed to clear data');
    }
  }

  async getStorageInfo(): Promise<{
    userExists: boolean;
    checkInCount: number;
    assessmentCount: number;
    hasCrisisPlan: boolean;
    dataSize: number;
  }> {
    try {
      const [user, checkIns, assessments, crisisPlan] = await Promise.all([
        this.getUser(),
        this.getCheckIns(),
        this.getAssessments(),
        this.getCrisisPlan()
      ]);

      // Estimate data size in bytes
      const dataSize = JSON.stringify({
        user, checkIns, assessments, crisisPlan
      }).length;

      return {
        userExists: !!user,
        checkInCount: checkIns.length,
        assessmentCount: assessments.length,
        hasCrisisPlan: !!crisisPlan,
        dataSize
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw new Error('Failed to get storage info');
    }
  }

  // Data validation and repair
  async validateData(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
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
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Partial Session Management (Resume Interrupted Sessions)
  async savePartialCheckIn(checkIn: Partial<CheckIn>): Promise<void> {
    try {
      if (!checkIn.type || !checkIn.id) {
        throw new Error('Partial check-in must have type and ID');
      }

      // Create the storage key based on roadmap spec: current_checkin_{type}_{timestamp}
      const timestamp = Date.now();
      const key = `current_checkin_${checkIn.type}_${timestamp}`;
      
      const partialSession = {
        ...checkIn,
        partialKey: key,
        savedAt: new Date().toISOString()
      };
      
      // Clean up any expired sessions first
      await this.cleanupExpiredPartialSessions();
      
      // Save the current partial session
      await AsyncStorage.setItem(`${this.KEYS.PARTIAL_SESSIONS}_${key}`, JSON.stringify(partialSession));
      
    } catch (error) {
      console.error('Failed to save partial check-in:', error);
      throw new Error('Failed to save partial check-in');
    }
  }

  async getPartialCheckIn(type: 'morning' | 'midday' | 'evening'): Promise<Partial<CheckIn> | null> {
    try {
      // Get all partial session keys
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_${type}_`)
      );
      
      if (partialKeys.length === 0) {
        return null;
      }
      
      // Get the most recent session (highest timestamp)
      partialKeys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampB - timestampA;
      });
      
      const mostRecentKey = partialKeys[0];
      const data = await AsyncStorage.getItem(mostRecentKey);
      
      if (!data) {
        return null;
      }
      
      const partialSession = JSON.parse(data);
      
      // Check if session is expired (24 hours)
      const savedAt = new Date(partialSession.savedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // Session expired, remove it
        await AsyncStorage.removeItem(mostRecentKey);
        return null;
      }
      
      return partialSession;
    } catch (error) {
      console.error('Failed to get partial check-in:', error);
      return null;
    }
  }

  async clearPartialCheckIn(type: 'morning' | 'midday' | 'evening'): Promise<void> {
    try {
      // Get all partial session keys for this type
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_${type}_`)
      );
      
      // Remove all partial sessions for this type
      await Promise.all(
        partialKeys.map(key => AsyncStorage.removeItem(key))
      );
    } catch (error) {
      console.error('Failed to clear partial check-in:', error);
      throw new Error('Failed to clear partial check-in');
    }
  }

  async cleanupExpiredPartialSessions(): Promise<void> {
    try {
      // Get all partial session keys
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_`)
      );
      
      const keysToRemove: string[] = [];
      const now = new Date();
      
      // Check each partial session for expiration
      for (const key of partialKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const session = JSON.parse(data);
            const savedAt = new Date(session.savedAt);
            const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // If we can't parse, remove the corrupted session
          keysToRemove.push(key);
        }
      }
      
      // Remove expired sessions
      await Promise.all(
        keysToRemove.map(key => AsyncStorage.removeItem(key))
      );
      
    } catch (error) {
      console.error('Failed to cleanup expired partial sessions:', error);
      // Don't throw here - cleanup is a maintenance operation
    }
  }

  async getAllPartialSessions(): Promise<Array<{ type: string; savedAt: string; data: any }>> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_`)
      );
      
      const sessions = [];
      
      for (const key of partialKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const session = JSON.parse(data);
            sessions.push({
              type: session.type,
              savedAt: session.savedAt,
              data: session
            });
          }
        } catch (parseError) {
          // Skip corrupted sessions
          continue;
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Failed to get all partial sessions:', error);
      return [];
    }
  }
}

// Singleton instance
export const dataStore = new DataStore();