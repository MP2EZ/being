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
    USER: '@fullmind_user',
    CHECKINS: '@fullmind_checkins',
    ASSESSMENTS: '@fullmind_assessments',
    CRISIS_PLAN: '@fullmind_crisis'
  };

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
      await Promise.all([
        AsyncStorage.removeItem(this.KEYS.USER),
        AsyncStorage.removeItem(this.KEYS.CHECKINS),
        AsyncStorage.removeItem(this.KEYS.ASSESSMENTS),
        AsyncStorage.removeItem(this.KEYS.CRISIS_PLAN)
      ]);
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
}

// Singleton instance
export const dataStore = new DataStore();