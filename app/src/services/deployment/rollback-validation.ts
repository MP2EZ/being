/**
 * ROLLBACK SAFETY VALIDATION SCRIPT
 * Ensures deployment rollbacks preserve critical data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface RollbackValidation {
  canRollback: boolean;
  criticalDataPreserved: boolean;
  userDataSafe: boolean;
  validationErrors: string[];
}

export async function validateRollbackSafety(): Promise<RollbackValidation> {
  const errors: string[] = [];
  let criticalDataPreserved = true;
  let userDataSafe = true;
  
  try {
    // Check assessment data preservation
    const assessmentData = await AsyncStorage.getItem('assessment_store');
    if (!assessmentData) {
      errors.push('Assessment data not found - rollback may lose user progress');
      userDataSafe = false;
    }
    
    // Check secure storage accessibility
    try {
      await SecureStore.getItemAsync('test_key');
    } catch (error) {
      errors.push('Secure storage inaccessible - rollback may fail');
      criticalDataPreserved = false;
    }
    
    // Check crisis detection system
    const crisisConfig = await AsyncStorage.getItem('crisis_config');
    if (!crisisConfig) {
      errors.push('Crisis detection config missing - safety feature may be lost');
      criticalDataPreserved = false;
    }
    
  } catch (error) {
    errors.push(`Rollback validation failed: ${(error instanceof Error ? error.message : String(error))}`);
    criticalDataPreserved = false;
    userDataSafe = false;
  }
  
  return {
    canRollback: errors.length === 0,
    criticalDataPreserved,
    userDataSafe,
    validationErrors: errors
  };
}

export async function performPreRollbackBackup(): Promise<boolean> {
  try {
    const timestamp = Date.now();
    const backupKey = `rollback_backup_${timestamp}`;
    
    // Backup critical data before rollback
    const criticalData = {
      assessments: await AsyncStorage.getItem('assessment_store'),
      crisis_config: await AsyncStorage.getItem('crisis_config'),
      user_preferences: await AsyncStorage.getItem('user_preferences'),
      backup_timestamp: timestamp
    };
    
    await AsyncStorage.setItem(backupKey, JSON.stringify(criticalData));
    console.log(`Pre-rollback backup created: ${backupKey}`);
    
    return true;
  } catch (error) {
    console.error('Pre-rollback backup failed:', error);
    return false;
  }
}
