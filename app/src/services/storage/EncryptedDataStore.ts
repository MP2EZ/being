/**
 * HIPAA-Compliant Encrypted Data Store for Being. MBCT App
 * 
 * Provides transparent encryption for sensitive mental health data while
 * maintaining the same API as the original DataStore for seamless migration.
 * 
 * Compliance Features:
 * - AES-256 encryption for clinical data (PHQ-9/GAD-7 responses)
 * - Secure key management using device keychain
 * - Audit logging for clinical data access
 * - Data integrity validation
 * - Key rotation support
 * - Secure data deletion
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  UserProfile, 
  CheckIn, 
  Assessment, 
  CrisisPlan, 
  ExportData 
} from '../../types';
import { 
  encryptionService, 
  DataSensitivity, 
  EncryptionResult 
} from '../security/EncryptionService';

export interface MigrationStatus {
  isRequired: boolean;
  unencryptedKeys: string[];
  estimatedItems: number;
  lastMigration: string | null;
}

export interface EncryptedStorageInfo {
  userExists: boolean;
  checkInCount: number;
  assessmentCount: number;
  hasCrisisPlan: boolean;
  dataSize: number;
  encryptionStatus: {
    initialized: boolean;
    keyVersion: number;
    lastRotation: string | null;
  };
  migrationStatus: MigrationStatus;
}

export class EncryptedDataStore {
  private readonly KEYS = {
    USER: 'being_user',
    CHECKINS: 'being_checkins',
    ASSESSMENTS: 'being_assessments',
    CRISIS_PLAN: 'being_crisis',
    PARTIAL_SESSIONS: 'being_partial_sessions'
  };

  // Migration tracking
  private readonly MIGRATION_KEY = 'being_encryption_migration';
  private readonly ENCRYPTED_MARKER = '__ENCRYPTED_V1__';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the encrypted data store
   */
  private async initialize(): Promise<void> {
    try {
      // Initialize encryption service
      await encryptionService.initialize();
      
      // Check if migration is needed
      const migrationStatus = await this.checkMigrationStatus();
      if (migrationStatus.isRequired && migrationStatus.unencryptedKeys.length > 0) {
        console.warn('Unencrypted data detected - migration recommended');
        // In production, you might want to trigger automatic migration
      }

    } catch (error) {
      console.error('Encrypted data store initialization failed:', error);
      throw new Error('Cannot initialize secure storage');
    }
  }

  // USER PROFILE MANAGEMENT (PERSONAL SENSITIVITY)

  async saveUser(user: UserProfile): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        user,
        DataSensitivity.PERSONAL,
        { dataType: 'UserProfile' }
      );

      const storageData = {
        ...encryptedData,
        [this.ENCRYPTED_MARKER]: true,
        sensitivity: DataSensitivity.PERSONAL
      };

      await AsyncStorage.setItem(this.KEYS.USER, JSON.stringify(storageData));

    } catch (error) {
      console.error('Failed to save encrypted user profile:', error);
      throw new Error('Failed to save user profile');
    }
  }

  async getUser(): Promise<UserProfile | null> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.USER);
      if (!data) return null;

      const parsedData = JSON.parse(data);

      // Handle unencrypted legacy data
      if (!parsedData[this.ENCRYPTED_MARKER]) {
        console.warn('Loading legacy unencrypted user data');
        return parsedData as UserProfile;
      }

      // Decrypt the data
      return await encryptionService.decryptData(
        parsedData,
        DataSensitivity.PERSONAL,
        { dataType: 'UserProfile' }
      );

    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

  // CHECK-IN MANAGEMENT (PERSONAL SENSITIVITY)

  async saveCheckIn(checkIn: CheckIn): Promise<void> {
    try {
      const existing = await this.getCheckIns();
      existing.push(checkIn);
      
      // Keep last 90 days only for performance and privacy
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const filtered = existing.filter(c => 
        new Date(c.completedAt || c.startedAt) > cutoff
      );

      const encryptedData = await encryptionService.encryptData(
        filtered,
        DataSensitivity.PERSONAL,
        { 
          dataType: 'CheckInArray', 
          count: filtered.length,
          retention: '90days'
        }
      );

      const storageData = {
        ...encryptedData,
        [this.ENCRYPTED_MARKER]: true,
        sensitivity: DataSensitivity.PERSONAL
      };

      await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(storageData));

    } catch (error) {
      console.error('Failed to save encrypted check-in:', error);
      throw new Error('Failed to save check-in');
    }
  }

  async getCheckIns(): Promise<CheckIn[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CHECKINS);
      if (!data) return [];

      const parsedData = JSON.parse(data);

      // Handle unencrypted legacy data
      if (!parsedData[this.ENCRYPTED_MARKER]) {
        console.warn('Loading legacy unencrypted check-in data');
        return parsedData as CheckIn[];
      }

      // Decrypt the data
      return await encryptionService.decryptData(
        parsedData,
        DataSensitivity.PERSONAL,
        { dataType: 'CheckInArray' }
      );

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

      // Re-encrypt the updated data
      const encryptedData = await encryptionService.encryptData(
        checkIns,
        DataSensitivity.PERSONAL,
        { 
          dataType: 'CheckInArray',
          operation: 'update',
          checkInId
        }
      );

      const storageData = {
        ...encryptedData,
        [this.ENCRYPTED_MARKER]: true,
        sensitivity: DataSensitivity.PERSONAL
      };

      await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(storageData));

    } catch (error) {
      console.error('Failed to update check-in:', error);
      throw new Error('Failed to update check-in');
    }
  }

  // QUERY METHODS (maintain existing API)

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

  // ASSESSMENT MANAGEMENT (CLINICAL SENSITIVITY - HIGHEST PROTECTION)

  async saveAssessment(assessment: Assessment): Promise<void> {
    try {
      const existing = await this.getAssessments();
      existing.push(assessment);

      // CLINICAL DATA - Highest encryption level + audit logging
      const encryptedData = await encryptionService.encryptData(
        existing,
        DataSensitivity.CLINICAL,
        { 
          dataType: 'AssessmentArray',
          assessmentType: assessment.type,
          score: assessment.score,
          severity: assessment.severity,
          containsSuicidalIdeation: assessment.type === 'phq9' && assessment.answers[8] > 0
        }
      );

      const storageData = {
        ...encryptedData,
        [this.ENCRYPTED_MARKER]: true,
        sensitivity: DataSensitivity.CLINICAL
      };

      await AsyncStorage.setItem(this.KEYS.ASSESSMENTS, JSON.stringify(storageData));

      // Log clinical data access for HIPAA audit requirements
      console.log(`CLINICAL AUDIT: Assessment ${assessment.type} saved - Score: ${assessment.score}, Severity: ${assessment.severity}`);

    } catch (error) {
      console.error('Failed to save encrypted assessment:', error);
      throw new Error('Failed to save assessment - clinical data security breach');
    }
  }

  async getAssessments(): Promise<Assessment[]> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.ASSESSMENTS);
      if (!data) return [];

      const parsedData = JSON.parse(data);

      // Handle unencrypted legacy data
      if (!parsedData[this.ENCRYPTED_MARKER]) {
        console.warn('Loading legacy unencrypted assessment data - SECURITY RISK');
        return parsedData as Assessment[];
      }

      // Decrypt clinical data with audit logging
      const assessments = await encryptionService.decryptData(
        parsedData,
        DataSensitivity.CLINICAL,
        { dataType: 'AssessmentArray', operation: 'read' }
      );

      console.log(`CLINICAL AUDIT: ${assessments.length} assessments accessed`);
      return assessments;

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

  // CRISIS PLAN MANAGEMENT (CLINICAL SENSITIVITY)

  async saveCrisisPlan(crisisPlan: CrisisPlan): Promise<void> {
    try {
      const encryptedData = await encryptionService.encryptData(
        crisisPlan,
        DataSensitivity.CLINICAL,
        { 
          dataType: 'CrisisPlan',
          isActive: crisisPlan.isActive,
          contactCount: crisisPlan.contacts.trustedFriends.length
        }
      );

      const storageData = {
        ...encryptedData,
        [this.ENCRYPTED_MARKER]: true,
        sensitivity: DataSensitivity.CLINICAL
      };

      await AsyncStorage.setItem(this.KEYS.CRISIS_PLAN, JSON.stringify(storageData));

      console.log('CLINICAL AUDIT: Crisis plan saved');

    } catch (error) {
      console.error('Failed to save encrypted crisis plan:', error);
      throw new Error('Failed to save crisis plan');
    }
  }

  async getCrisisPlan(): Promise<CrisisPlan | null> {
    try {
      const data = await AsyncStorage.getItem(this.KEYS.CRISIS_PLAN);
      if (!data) return null;

      const parsedData = JSON.parse(data);

      // Handle unencrypted legacy data
      if (!parsedData[this.ENCRYPTED_MARKER]) {
        console.warn('Loading legacy unencrypted crisis plan - SECURITY RISK');
        return parsedData as CrisisPlan;
      }

      const crisisPlan = await encryptionService.decryptData(
        parsedData,
        DataSensitivity.CLINICAL,
        { dataType: 'CrisisPlan', operation: 'read' }
      );

      console.log('CLINICAL AUDIT: Crisis plan accessed');
      return crisisPlan;

    } catch (error) {
      console.error('Failed to load crisis plan:', error);
      return null;
    }
  }

  async deleteCrisisPlan(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.KEYS.CRISIS_PLAN);
      console.log('CLINICAL AUDIT: Crisis plan deleted');
    } catch (error) {
      console.error('Failed to delete crisis plan:', error);
      throw new Error('Failed to delete crisis plan');
    }
  }

  // DATA EXPORT WITH ENCRYPTION STATUS

  async exportData(): Promise<ExportData> {
    try {
      const user = await this.getUser();
      const checkIns = await this.getCheckIns();
      const assessments = await this.getAssessments();
      const crisisPlan = await this.getCrisisPlan();
      
      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        version: '1.1-encrypted',
        user: user!,
        checkIns,
        assessments,
        crisisPlan,
        disclaimer: 'This data has been exported from an encrypted mental health application. This data is for personal use only and is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Keep this data secure and do not share with unauthorized parties.'
      };
      
      console.log('CLINICAL AUDIT: Data export completed');
      return exportData;

    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Failed to export data');
    }
  }

  // SECURE DATA MANAGEMENT

  async clearAllData(): Promise<void> {
    try {
      // Clear main data
      await Promise.all([
        AsyncStorage.removeItem(this.KEYS.USER),
        AsyncStorage.removeItem(this.KEYS.CHECKINS),
        AsyncStorage.removeItem(this.KEYS.ASSESSMENTS),
        AsyncStorage.removeItem(this.KEYS.CRISIS_PLAN),
        AsyncStorage.removeItem(this.MIGRATION_KEY)
      ]);
      
      // Clear all partial sessions
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_`)
      );
      
      await Promise.all(
        partialKeys.map(key => AsyncStorage.removeItem(key))
      );

      // Securely delete encryption keys
      await encryptionService.secureDeleteKeys();

      console.log('CLINICAL AUDIT: All data securely cleared');

    } catch (error) {
      console.error('Failed to clear data:', error);
      throw new Error('Failed to clear data');
    }
  }

  async getStorageInfo(): Promise<EncryptedStorageInfo> {
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

      const encryptionStatus = await encryptionService.getEncryptionStatus();
      const migrationStatus = await this.checkMigrationStatus();

      return {
        userExists: !!user,
        checkInCount: checkIns.length,
        assessmentCount: assessments.length,
        hasCrisisPlan: !!crisisPlan,
        dataSize,
        encryptionStatus,
        migrationStatus
      };

    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw new Error('Failed to get storage info');
    }
  }

  // DATA VALIDATION AND INTEGRITY

  async validateData(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // Check user profile
      const user = await this.getUser();
      if (user && !user.id) {
        errors.push('User profile missing ID');
      }
      
      // Validate check-ins
      const checkIns = await this.getCheckIns();
      checkIns.forEach((checkIn, index) => {
        if (!checkIn.id) {
          errors.push(`CheckIn ${index} missing ID`);
        }
        if (!['morning', 'midday', 'evening'].includes(checkIn.type)) {
          errors.push(`CheckIn ${checkIn.id} has invalid type: ${checkIn.type}`);
        }
      });
      
      // Validate assessments (critical for clinical accuracy)
      const assessments = await this.getAssessments();
      assessments.forEach((assessment, index) => {
        if (!assessment.id) {
          errors.push(`Assessment ${index} missing ID`);
        }
        if (!['phq9', 'gad7'].includes(assessment.type)) {
          errors.push(`Assessment ${assessment.id} has invalid type: ${assessment.type}`);
        }
        // Validate score calculation
        const expectedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
        if (assessment.score !== expectedScore) {
          errors.push(`Assessment ${assessment.id} score mismatch: stored ${assessment.score}, calculated ${expectedScore}`);
        }
      });

      // Check encryption integrity
      const encryptionStatus = await encryptionService.getEncryptionStatus();
      if (!encryptionStatus.initialized) {
        errors.push('Encryption service not properly initialized');
      }
      
    } catch (error) {
      errors.push(`Data validation failed: ${error}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // PARTIAL SESSION MANAGEMENT (PERSONAL SENSITIVITY)

  async savePartialCheckIn(checkIn: Partial<CheckIn>): Promise<void> {
    try {
      if (!checkIn.type || !checkIn.id) {
        throw new Error('Partial check-in must have type and ID');
      }

      const timestamp = Date.now();
      const key = `current_checkin_${checkIn.type}_${timestamp}`;
      
      const partialSession = {
        ...checkIn,
        partialKey: key,
        savedAt: new Date().toISOString()
      };
      
      // Encrypt partial session data
      const encryptedData = await encryptionService.encryptData(
        partialSession,
        DataSensitivity.PERSONAL,
        { dataType: 'PartialCheckIn', checkInType: checkIn.type }
      );

      const storageData = {
        ...encryptedData,
        [this.ENCRYPTED_MARKER]: true,
        sensitivity: DataSensitivity.PERSONAL
      };
      
      // Clean up expired sessions first
      await this.cleanupExpiredPartialSessions();
      
      await AsyncStorage.setItem(
        `${this.KEYS.PARTIAL_SESSIONS}_${key}`, 
        JSON.stringify(storageData)
      );
      
    } catch (error) {
      console.error('Failed to save partial check-in:', error);
      throw new Error('Failed to save partial check-in');
    }
  }

  async getPartialCheckIn(type: 'morning' | 'midday' | 'evening'): Promise<Partial<CheckIn> | null> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_${type}_`)
      );
      
      if (partialKeys.length === 0) {
        return null;
      }
      
      // Get the most recent session
      partialKeys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampB - timestampA;
      });
      
      const mostRecentKey = partialKeys[0];
      const data = await AsyncStorage.getItem(mostRecentKey);
      
      if (!data) return null;

      const parsedData = JSON.parse(data);

      // Handle unencrypted legacy data
      if (!parsedData[this.ENCRYPTED_MARKER]) {
        console.warn('Loading legacy unencrypted partial session');
        const partialSession = parsedData;
        
        // Check expiration
        const savedAt = new Date(partialSession.savedAt);
        const hoursDiff = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          await AsyncStorage.removeItem(mostRecentKey);
          return null;
        }
        
        return partialSession;
      }

      // Decrypt the partial session
      const partialSession = await encryptionService.decryptData(
        parsedData,
        DataSensitivity.PERSONAL,
        { dataType: 'PartialCheckIn' }
      );
      
      // Check expiration
      const savedAt = new Date(partialSession.savedAt);
      const hoursDiff = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
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
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_${type}_`)
      );
      
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
      const allKeys = await AsyncStorage.getAllKeys();
      const partialKeys = allKeys.filter(key => 
        key.startsWith(`${this.KEYS.PARTIAL_SESSIONS}_current_checkin_`)
      );
      
      const keysToRemove: string[] = [];
      const now = new Date();
      
      for (const key of partialKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsedData = JSON.parse(data);
            
            let savedAt: Date;
            if (parsedData[this.ENCRYPTED_MARKER]) {
              // Encrypted data - need to decrypt to check timestamp
              try {
                const session = await encryptionService.decryptData(
                  parsedData,
                  DataSensitivity.PERSONAL,
                  { dataType: 'PartialCheckIn' }
                );
                savedAt = new Date(session.savedAt);
              } catch (decryptError) {
                // Can't decrypt - remove corrupted session
                keysToRemove.push(key);
                continue;
              }
            } else {
              // Legacy unencrypted data
              savedAt = new Date(parsedData.savedAt);
            }
            
            const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);
            if (hoursDiff > 24) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          keysToRemove.push(key);
        }
      }
      
      await Promise.all(
        keysToRemove.map(key => AsyncStorage.removeItem(key))
      );
      
    } catch (error) {
      console.error('Failed to cleanup expired partial sessions:', error);
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
            const parsedData = JSON.parse(data);
            
            let session: any;
            if (parsedData[this.ENCRYPTED_MARKER]) {
              session = await encryptionService.decryptData(
                parsedData,
                DataSensitivity.PERSONAL,
                { dataType: 'PartialCheckIn' }
              );
            } else {
              session = parsedData;
            }
            
            sessions.push({
              type: session.type,
              savedAt: session.savedAt,
              data: session
            });
          }
        } catch (error) {
          continue;
        }
      }
      
      return sessions;

    } catch (error) {
      console.error('Failed to get all partial sessions:', error);
      return [];
    }
  }

  // MIGRATION UTILITIES

  async checkMigrationStatus(): Promise<MigrationStatus> {
    try {
      const migrationData = await AsyncStorage.getItem(this.MIGRATION_KEY);
      const lastMigration = migrationData ? JSON.parse(migrationData).date : null;

      // Check all main data keys for encryption markers
      const unencryptedKeys: string[] = [];
      let estimatedItems = 0;

      for (const [keyName, storageKey] of Object.entries(this.KEYS)) {
        if (keyName === 'PARTIAL_SESSIONS') continue; // Skip partial sessions prefix

        try {
          const data = await AsyncStorage.getItem(storageKey);
          if (data) {
            const parsedData = JSON.parse(data);
            if (!parsedData[this.ENCRYPTED_MARKER]) {
              unencryptedKeys.push(keyName);
              
              // Estimate item count for arrays
              if (Array.isArray(parsedData)) {
                estimatedItems += parsedData.length;
              } else {
                estimatedItems += 1;
              }
            }
          }
        } catch (error) {
          // Skip corrupted data
          continue;
        }
      }

      return {
        isRequired: unencryptedKeys.length > 0,
        unencryptedKeys,
        estimatedItems,
        lastMigration
      };

    } catch (error) {
      console.error('Failed to check migration status:', error);
      return {
        isRequired: false,
        unencryptedKeys: [],
        estimatedItems: 0,
        lastMigration: null
      };
    }
  }

  async migrateUnencryptedData(): Promise<{ success: boolean; migratedKeys: string[]; errors: string[] }> {
    const migratedKeys: string[] = [];
    const errors: string[] = [];

    try {
      console.log('Starting encryption migration...');

      // Migrate user profile
      const userData = await AsyncStorage.getItem(this.KEYS.USER);
      if (userData) {
        const parsedUser = JSON.parse(userData);
        if (!parsedUser[this.ENCRYPTED_MARKER]) {
          await this.saveUser(parsedUser as UserProfile);
          migratedKeys.push('USER');
        }
      }

      // Migrate check-ins
      const checkInData = await AsyncStorage.getItem(this.KEYS.CHECKINS);
      if (checkInData) {
        const parsedCheckIns = JSON.parse(checkInData);
        if (!parsedCheckIns[this.ENCRYPTED_MARKER]) {
          // Re-encrypt as array
          const encryptedData = await encryptionService.encryptData(
            parsedCheckIns,
            DataSensitivity.PERSONAL,
            { dataType: 'CheckInArray', migration: true }
          );

          const storageData = {
            ...encryptedData,
            [this.ENCRYPTED_MARKER]: true,
            sensitivity: DataSensitivity.PERSONAL
          };

          await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(storageData));
          migratedKeys.push('CHECKINS');
        }
      }

      // Migrate assessments (CRITICAL - clinical data)
      const assessmentData = await AsyncStorage.getItem(this.KEYS.ASSESSMENTS);
      if (assessmentData) {
        const parsedAssessments = JSON.parse(assessmentData);
        if (!parsedAssessments[this.ENCRYPTED_MARKER]) {
          const encryptedData = await encryptionService.encryptData(
            parsedAssessments,
            DataSensitivity.CLINICAL,
            { 
              dataType: 'AssessmentArray', 
              migration: true,
              count: Array.isArray(parsedAssessments) ? parsedAssessments.length : 1
            }
          );

          const storageData = {
            ...encryptedData,
            [this.ENCRYPTED_MARKER]: true,
            sensitivity: DataSensitivity.CLINICAL
          };

          await AsyncStorage.setItem(this.KEYS.ASSESSMENTS, JSON.stringify(storageData));
          migratedKeys.push('ASSESSMENTS');
        }
      }

      // Migrate crisis plan
      const crisisData = await AsyncStorage.getItem(this.KEYS.CRISIS_PLAN);
      if (crisisData) {
        const parsedCrisis = JSON.parse(crisisData);
        if (!parsedCrisis[this.ENCRYPTED_MARKER]) {
          await this.saveCrisisPlan(parsedCrisis as CrisisPlan);
          migratedKeys.push('CRISIS_PLAN');
        }
      }

      // Record migration completion
      await AsyncStorage.setItem(this.MIGRATION_KEY, JSON.stringify({
        date: new Date().toISOString(),
        migratedKeys,
        version: '1.0'
      }));

      console.log(`Migration completed. Migrated keys: ${migratedKeys.join(', ')}`);

      return {
        success: true,
        migratedKeys,
        errors
      };

    } catch (error) {
      const errorMessage = `Migration failed: ${error}`;
      console.error(errorMessage);
      errors.push(errorMessage);

      return {
        success: false,
        migratedKeys,
        errors
      };
    }
  }

  /**
   * Force key rotation for compliance
   */
  async rotateEncryptionKeys(): Promise<void> {
    try {
      console.log('Starting key rotation...');

      // Get all data before rotation
      const [user, checkIns, assessments, crisisPlan] = await Promise.all([
        this.getUser(),
        this.getCheckIns(), 
        this.getAssessments(),
        this.getCrisisPlan()
      ]);

      // Rotate the encryption keys
      await encryptionService.rotateKeys();

      // Re-encrypt all data with new keys
      if (user) await this.saveUser(user);
      if (checkIns.length > 0) {
        // Re-encrypt check-ins array
        const encryptedData = await encryptionService.encryptData(
          checkIns,
          DataSensitivity.PERSONAL,
          { dataType: 'CheckInArray', keyRotation: true }
        );
        const storageData = {
          ...encryptedData,
          [this.ENCRYPTED_MARKER]: true,
          sensitivity: DataSensitivity.PERSONAL
        };
        await AsyncStorage.setItem(this.KEYS.CHECKINS, JSON.stringify(storageData));
      }
      if (assessments.length > 0) {
        // Re-encrypt assessments with new clinical key
        const encryptedData = await encryptionService.encryptData(
          assessments,
          DataSensitivity.CLINICAL,
          { dataType: 'AssessmentArray', keyRotation: true }
        );
        const storageData = {
          ...encryptedData,
          [this.ENCRYPTED_MARKER]: true,
          sensitivity: DataSensitivity.CLINICAL
        };
        await AsyncStorage.setItem(this.KEYS.ASSESSMENTS, JSON.stringify(storageData));
      }
      if (crisisPlan) await this.saveCrisisPlan(crisisPlan);

      console.log('Key rotation completed successfully');

    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error('Key rotation failed - manual intervention required');
    }
  }
}

// Export singleton instance
export const encryptedDataStore = new EncryptedDataStore();