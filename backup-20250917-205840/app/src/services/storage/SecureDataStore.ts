/**
 * Secure Data Store - HIPAA-Compliant Replacement for DataStore
 * 
 * This is the new primary interface for all data operations in FullMind.
 * It provides the same API as the original DataStore but with encryption
 * for sensitive mental health data.
 * 
 * Usage: Simply replace imports from './DataStore' to './SecureDataStore'
 */

import { 
  UserProfile, 
  CheckIn, 
  Assessment, 
  CrisisPlan, 
  ExportData 
} from '../../types';
import { encryptedDataStore, EncryptedStorageInfo } from './EncryptedDataStore';
import { dataStoreMigrator } from './DataStoreMigrator';

export interface SecureStorageInfo extends EncryptedStorageInfo {
  securityLevel: 'encrypted' | 'migrating' | 'legacy';
  complianceStatus: 'hipaa_ready' | 'partial_compliance' | 'non_compliant';
}

/**
 * Secure Data Store with transparent encryption for mental health data
 * Maintains identical API to original DataStore for seamless migration
 */
export class SecureDataStore {
  private initialized = false;

  constructor() {
    this.initializeAsync();
  }

  /**
   * Async initialization - handles migration and encryption setup
   */
  private async initializeAsync(): Promise<void> {
    try {
      // Auto-migrate if needed
      const migrationSuccess = await dataStoreMigrator.checkAndAutoMigrate();
      
      if (!migrationSuccess) {
        console.warn('Data migration incomplete - some data may not be encrypted');
      }

      this.initialized = true;

    } catch (error) {
      console.error('Secure data store initialization failed:', error);
      // Continue with degraded functionality
      this.initialized = false;
    }
  }

  /**
   * Ensure initialization is complete before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initializeAsync();
    }
  }

  // USER PROFILE MANAGEMENT

  async saveUser(user: UserProfile): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.saveUser(user);
  }

  async getUser(): Promise<UserProfile | null> {
    await this.ensureInitialized();
    return encryptedDataStore.getUser();
  }

  // CHECK-IN MANAGEMENT

  async saveCheckIn(checkIn: CheckIn): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.saveCheckIn(checkIn);
  }

  async getCheckIns(): Promise<CheckIn[]> {
    await this.ensureInitialized();
    return encryptedDataStore.getCheckIns();
  }

  async updateCheckIn(checkInId: string, updates: Partial<CheckIn>): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.updateCheckIn(checkInId, updates);
  }

  // QUERY METHODS

  async getRecentCheckIns(days: number = 7): Promise<CheckIn[]> {
    await this.ensureInitialized();
    return encryptedDataStore.getRecentCheckIns(days);
  }

  async getTodayCheckIns(): Promise<CheckIn[]> {
    await this.ensureInitialized();
    return encryptedDataStore.getTodayCheckIns();
  }

  async getCheckInsByType(type: 'morning' | 'midday' | 'evening', days: number = 30): Promise<CheckIn[]> {
    await this.ensureInitialized();
    return encryptedDataStore.getCheckInsByType(type, days);
  }

  // ASSESSMENT MANAGEMENT (CLINICAL DATA)

  async saveAssessment(assessment: Assessment): Promise<void> {
    await this.ensureInitialized();
    
    // Extra validation for clinical data
    if (!assessment.id || !assessment.type || !assessment.answers) {
      throw new Error('Invalid assessment data - clinical accuracy required');
    }

    // Validate scoring accuracy (critical for clinical compliance)
    const expectedScore = assessment.answers.reduce((sum, answer) => sum + answer, 0);
    if (assessment.score !== expectedScore) {
      throw new Error(`Assessment scoring error: expected ${expectedScore}, got ${assessment.score}`);
    }

    return encryptedDataStore.saveAssessment(assessment);
  }

  async getAssessments(): Promise<Assessment[]> {
    await this.ensureInitialized();
    return encryptedDataStore.getAssessments();
  }

  async getAssessmentsByType(type: 'phq9' | 'gad7'): Promise<Assessment[]> {
    await this.ensureInitialized();
    return encryptedDataStore.getAssessmentsByType(type);
  }

  async getLatestAssessment(type: 'phq9' | 'gad7'): Promise<Assessment | null> {
    await this.ensureInitialized();
    return encryptedDataStore.getLatestAssessment(type);
  }

  // CRISIS PLAN MANAGEMENT

  async saveCrisisPlan(crisisPlan: CrisisPlan): Promise<void> {
    await this.ensureInitialized();
    
    // Validate crisis plan data
    if (!crisisPlan.contacts.crisisLine) {
      crisisPlan.contacts.crisisLine = '988'; // Default crisis line
    }

    return encryptedDataStore.saveCrisisPlan(crisisPlan);
  }

  async getCrisisPlan(): Promise<CrisisPlan | null> {
    await this.ensureInitialized();
    return encryptedDataStore.getCrisisPlan();
  }

  async deleteCrisisPlan(): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.deleteCrisisPlan();
  }

  // DATA EXPORT

  async exportData(): Promise<ExportData> {
    await this.ensureInitialized();
    return encryptedDataStore.exportData();
  }

  // DATA MANAGEMENT

  async clearAllData(): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.clearAllData();
  }

  async getStorageInfo(): Promise<SecureStorageInfo> {
    await this.ensureInitialized();
    
    const encryptedInfo = await encryptedDataStore.getStorageInfo();
    
    // Determine security level
    let securityLevel: 'encrypted' | 'migrating' | 'legacy' = 'encrypted';
    let complianceStatus: 'hipaa_ready' | 'partial_compliance' | 'non_compliant' = 'hipaa_ready';

    if (dataStoreMigrator.isMigrationInProgress()) {
      securityLevel = 'migrating';
      complianceStatus = 'partial_compliance';
    } else if (encryptedInfo.migrationStatus.isRequired) {
      securityLevel = 'legacy';
      complianceStatus = encryptedInfo.migrationStatus.unencryptedKeys.includes('ASSESSMENTS') 
        ? 'non_compliant' 
        : 'partial_compliance';
    }

    return {
      ...encryptedInfo,
      securityLevel,
      complianceStatus
    };
  }

  async validateData(): Promise<{ valid: boolean; errors: string[] }> {
    await this.ensureInitialized();
    return encryptedDataStore.validateData();
  }

  // PARTIAL SESSION MANAGEMENT

  async savePartialCheckIn(checkIn: Partial<CheckIn>): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.savePartialCheckIn(checkIn);
  }

  async getPartialCheckIn(type: 'morning' | 'midday' | 'evening'): Promise<Partial<CheckIn> | null> {
    await this.ensureInitialized();
    return encryptedDataStore.getPartialCheckIn(type);
  }

  async clearPartialCheckIn(type: 'morning' | 'midday' | 'evening'): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.clearPartialCheckIn(type);
  }

  async cleanupExpiredPartialSessions(): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.cleanupExpiredPartialSessions();
  }

  async getAllPartialSessions(): Promise<Array<{ type: string; savedAt: string; data: any }>> {
    await this.ensureInitialized();
    return encryptedDataStore.getAllPartialSessions();
  }

  // SECURITY AND COMPLIANCE METHODS

  /**
   * Force migration of any remaining unencrypted data
   */
  async forceMigration(): Promise<{ success: boolean; errors: string[] }> {
    try {
      const result = await dataStoreMigrator.performMigration((progress) => {
        console.log(`Forced migration: ${progress.stage} (${progress.progress}%)`);
      });

      return {
        success: result.success,
        errors: result.errors
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Forced migration failed: ${error}`]
      };
    }
  }

  /**
   * Rotate encryption keys for compliance
   */
  async rotateEncryptionKeys(): Promise<void> {
    await this.ensureInitialized();
    return encryptedDataStore.rotateEncryptionKeys();
  }

  /**
   * Get comprehensive security status for compliance reporting
   */
  async getSecurityStatus(): Promise<{
    encrypted: boolean;
    keyRotationDue: boolean;
    migrationRequired: boolean;
    clinicalDataSecure: boolean;
    complianceLevel: 'full' | 'partial' | 'none';
    recommendations: string[];
  }> {
    try {
      await this.ensureInitialized();
      
      const storageInfo = await this.getStorageInfo();
      const recommendations: string[] = [];

      // Check if clinical data is encrypted
      const clinicalDataSecure = !storageInfo.migrationStatus.unencryptedKeys.includes('ASSESSMENTS');
      
      if (!clinicalDataSecure) {
        recommendations.push('CRITICAL: Encrypt PHQ-9/GAD-7 assessment data immediately');
      }

      // Check key rotation
      const keyRotationDue = storageInfo.encryptionStatus.lastRotation 
        ? ((Date.now() - new Date(storageInfo.encryptionStatus.lastRotation).getTime()) / (1000 * 60 * 60 * 24)) > 90
        : false;

      if (keyRotationDue) {
        recommendations.push('Encryption key rotation overdue');
      }

      // Check migration status
      if (storageInfo.migrationStatus.isRequired) {
        if (storageInfo.migrationStatus.unencryptedKeys.includes('CRISIS_PLAN')) {
          recommendations.push('Encrypt crisis plan data');
        }
        if (storageInfo.migrationStatus.unencryptedKeys.includes('CHECKINS')) {
          recommendations.push('Encrypt daily check-in data');
        }
      }

      // Determine compliance level
      let complianceLevel: 'full' | 'partial' | 'none' = 'full';
      if (!clinicalDataSecure) {
        complianceLevel = 'none';
      } else if (storageInfo.migrationStatus.isRequired) {
        complianceLevel = 'partial';
      }

      return {
        encrypted: storageInfo.encryptionStatus.initialized,
        keyRotationDue,
        migrationRequired: storageInfo.migrationStatus.isRequired,
        clinicalDataSecure,
        complianceLevel,
        recommendations
      };

    } catch (error) {
      console.error('Security status check failed:', error);
      return {
        encrypted: false,
        keyRotationDue: true,
        migrationRequired: true,
        clinicalDataSecure: false,
        complianceLevel: 'none',
        recommendations: ['Security system malfunction - immediate review required']
      };
    }
  }

  /**
   * Emergency data export for compliance/backup
   */
  async emergencyExport(): Promise<{
    success: boolean;
    exportData?: ExportData;
    error?: string;
  }> {
    try {
      await this.ensureInitialized();
      
      const exportData = await this.exportData();
      
      // Add security metadata
      const securityStatus = await this.getSecurityStatus();
      const enhancedExport: ExportData = {
        ...exportData,
        disclaimer: `${exportData.disclaimer}\n\nSecurity Status: Compliance Level ${securityStatus.complianceLevel.toUpperCase()}. Clinical data secure: ${securityStatus.clinicalDataSecure ? 'YES' : 'NO'}.`
      };

      console.log('EMERGENCY AUDIT: Data export completed for compliance/backup');

      return {
        success: true,
        exportData: enhancedExport
      };

    } catch (error) {
      console.error('Emergency export failed:', error);
      return {
        success: false,
        error: `Emergency export failed: ${error}`
      };
    }
  }
}

// Export singleton instance with same name as original for seamless replacement
export const dataStore = new SecureDataStore();

// Also export as secureDataStore for explicit usage
export const secureDataStore = dataStore;