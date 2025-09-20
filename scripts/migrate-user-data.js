/**
 * User Data Migration Script: Being. - COMPLETED ✅
 *
 * Migration from @fullmind_* to @being_* storage keys completed successfully.
 * AppStartupMigrationService.ts now handles this migration automatically.
 *
 * Generated: December 17, 2024
 * Completed: September 17, 2025
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Storage key mappings
const STORAGE_KEY_MAPPINGS = {
  // Core session data
  '@fullmind_session_index': '@being_session_index',
  '@fullmind_resumable_session_checkin_morning': '@being_resumable_session_checkin_morning',
  '@fullmind_resumable_session_assessment_phq9': '@being_resumable_session_assessment_phq9',
  '@fullmind_resumable_session_assessment_gad7': '@being_resumable_session_assessment_gad7',
  
  // Widget data
  'fullmind_widget_data': 'being_widget_data',
  
  // Assessment data (CRITICAL - Clinical data)
  'fullmind_assessments': 'being_assessments',
  'fullmind_assessments_encrypted': 'being_assessments_encrypted',
  'fullmind_assessments_encrypted_v1': 'being_assessments_encrypted_v1',
  
  // User data
  'fullmind_annual': 'being_annual',
  'fullmind_basic': 'being_basic',
  'fullmind_checkins': 'being_checkins',
  
  // Crisis data (CRITICAL - Safety data)
  'fullmind_crisis': 'being_crisis',
  'fullmind_crisis_config_v1': 'being_crisis_config_v1',
  
  // Clinical data (CRITICAL - PHQ-9/GAD-7 scores)
  'fullmind_clinical_key_v1': 'being_clinical_key_v1',
  
  // Authentication and security
  'fullmind_auth_store': 'being_auth_store',
  'fullmind_auth_config_v1': 'being_auth_config_v1',
  'fullmind_auth_attempts_v1': 'being_auth_attempts_v1',
  
  // Audit and compliance
  'fullmind_audit_events': 'being_audit_events',
  'fullmind_audit_log_v1': 'being_audit_log_v1',
  'fullmind_consent_audits_v1': 'being_consent_audits_v1',
  'fullmind_consent_config_v1': 'being_consent_config_v1',
  
  // Cache and performance
  'fullmind_cache_stats': 'being_cache_stats',
  'fullmind_asset_cache_': 'being_asset_cache_',
  'fullmind_asset_metadata': 'being_asset_metadata',
  
  // Conflict resolution
  'fullmind_conflict_resolution': 'being_conflict_resolution'
};

// Critical data validation patterns
const CRITICAL_DATA_PATTERNS = {
  PHQ9_SCORES: /_phq9$/,
  GAD7_SCORES: /_gad7$/,
  CRISIS_DATA: /crisis/,
  ASSESSMENTS: /assessments/,
  CLINICAL: /clinical/
};

/**
 * Logs migration events with timestamp
 */
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data
  };
  
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
  
  return logEntry;
}

/**
 * Validates that migrated data matches original data
 */
function validateDataIntegrity(originalData, migratedData, keyMapping) {
  const errors = [];
  
  // Check data structure
  if (typeof originalData !== typeof migratedData) {
    errors.push(`Data type mismatch: ${typeof originalData} vs ${typeof migratedData}`);
  }
  
  // For objects, check critical fields
  if (typeof originalData === 'object' && originalData !== null) {
    try {
      const originalStr = JSON.stringify(originalData);
      const migratedStr = JSON.stringify(migratedData);
      
      if (originalStr !== migratedStr) {
        errors.push('Data content differs after migration');
      }
    } catch (error) {
      errors.push(`JSON comparison failed: ${error.message}`);
    }
  }
  
  // For strings, direct comparison
  if (typeof originalData === 'string' && originalData !== migratedData) {
    errors.push('String data differs after migration');
  }
  
  return errors;
}

/**
 * Checks if a key contains critical clinical data
 */
function isCriticalData(key) {
  return Object.values(CRITICAL_DATA_PATTERNS).some(pattern => pattern.test(key));
}

/**
 * Creates a backup of all current data before migration
 */
async function createDataBackup() {
  log('info', 'Creating data backup...');
  
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const fullmindKeys = allKeys.filter(key => 
      key.toLowerCase().includes('fullmind') || 
      Object.keys(STORAGE_KEY_MAPPINGS).includes(key)
    );
    
    if (fullmindKeys.length === 0) {
      log('info', 'No Fullmind data found to backup');
      return { backup: {}, keyCount: 0 };
    }
    
    const backup = {};
    for (const key of fullmindKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        backup[key] = value;
        log('debug', `Backed up key: ${key}`);
      } catch (error) {
        log('error', `Failed to backup key ${key}:`, error.message);
      }
    }
    
    // Store backup with timestamp
    const backupKey = `@being_migration_backup_${Date.now()}`;
    await AsyncStorage.setItem(backupKey, JSON.stringify({
      timestamp: new Date().toISOString(),
      originalApp: 'FullMind',
      targetApp: 'Being.',
      keyCount: fullmindKeys.length,
      backup
    }));
    
    log('info', `Backup completed: ${fullmindKeys.length} keys backed up`);
    return { backup, keyCount: fullmindKeys.length, backupKey };
    
  } catch (error) {
    log('error', 'Failed to create backup:', error.message);
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * Migrates a single storage key
 */
async function migrateSingleKey(oldKey, newKey) {
  try {
    log('debug', `Migrating: ${oldKey} → ${newKey}`);
    
    // Get original data
    const originalData = await AsyncStorage.getItem(oldKey);
    
    if (originalData === null) {
      log('debug', `No data found for key: ${oldKey}`);
      return { success: true, skipped: true };
    }
    
    // Parse if JSON
    let parsedData = originalData;
    try {
      parsedData = JSON.parse(originalData);
    } catch {
      // Not JSON, keep as string
    }
    
    // Store in new location
    await AsyncStorage.setItem(newKey, originalData);
    
    // Verify migration
    const migratedData = await AsyncStorage.getItem(newKey);
    const validationErrors = validateDataIntegrity(originalData, migratedData, { [oldKey]: newKey });
    
    if (validationErrors.length > 0) {
      log('error', `Data validation failed for ${oldKey}:`, validationErrors);
      return { success: false, errors: validationErrors };
    }
    
    // Mark as critical if applicable
    const critical = isCriticalData(oldKey);
    if (critical) {
      log('warning', `CRITICAL DATA migrated: ${oldKey} → ${newKey}`);
    }
    
    log('debug', `Successfully migrated: ${oldKey} → ${newKey}`);
    return { 
      success: true, 
      critical,
      dataSize: originalData.length,
      dataType: typeof parsedData
    };
    
  } catch (error) {
    log('error', `Failed to migrate ${oldKey}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Removes old storage keys after successful migration
 */
async function cleanupOldKeys(migratedKeys) {
  log('info', 'Cleaning up old storage keys...');
  
  const cleanupResults = {
    removed: [],
    failed: [],
    totalSize: 0
  };
  
  for (const oldKey of migratedKeys) {
    try {
      const data = await AsyncStorage.getItem(oldKey);
      const size = data ? data.length : 0;
      
      await AsyncStorage.removeItem(oldKey);
      
      cleanupResults.removed.push(oldKey);
      cleanupResults.totalSize += size;
      
      log('debug', `Removed old key: ${oldKey}`);
      
    } catch (error) {
      log('error', `Failed to remove old key ${oldKey}:`, error.message);
      cleanupResults.failed.push({ key: oldKey, error: error.message });
    }
  }
  
  log('info', `Cleanup completed: ${cleanupResults.removed.length} keys removed, ${cleanupResults.failed.length} failed`);
  return cleanupResults;
}

/**
 * Main migration function
 */
async function migrateUserData(options = {}) {
  const startTime = Date.now();
  const {
    dryRun = false,
    skipBackup = false,
    skipCleanup = false,
    onProgress = null
  } = options;
  
  log('info', `Starting user data migration (dryRun: ${dryRun})`);
  
  const migrationResults = {
    startTime,
    dryRun,
    backup: null,
    migrated: [],
    failed: [],
    skipped: [],
    cleanup: null,
    criticalDataMigrated: 0,
    totalDataSize: 0
  };
  
  try {
    // Step 1: Create backup (unless explicitly skipped)
    if (!skipBackup && !dryRun) {
      migrationResults.backup = await createDataBackup();
    }
    
    // Step 2: Migrate each key
    const totalKeys = Object.keys(STORAGE_KEY_MAPPINGS).length;
    let processedKeys = 0;
    
    for (const [oldKey, newKey] of Object.entries(STORAGE_KEY_MAPPINGS)) {
      if (onProgress) {
        onProgress({ processed: processedKeys, total: totalKeys, currentKey: oldKey });
      }
      
      if (dryRun) {
        // Dry run - just check if key exists
        const exists = await AsyncStorage.getItem(oldKey) !== null;
        if (exists) {
          log('info', `[DRY RUN] Would migrate: ${oldKey} → ${newKey}`);
          migrationResults.migrated.push({ oldKey, newKey, dryRun: true });
        } else {
          migrationResults.skipped.push({ oldKey, reason: 'No data' });
        }
      } else {
        // Actual migration
        const result = await migrateSingleKey(oldKey, newKey);
        
        if (result.success && !result.skipped) {
          migrationResults.migrated.push({
            oldKey,
            newKey,
            critical: result.critical,
            dataSize: result.dataSize,
            dataType: result.dataType
          });
          
          if (result.critical) {
            migrationResults.criticalDataMigrated++;
          }
          migrationResults.totalDataSize += result.dataSize || 0;
          
        } else if (result.skipped) {
          migrationResults.skipped.push({ oldKey, reason: 'No data' });
        } else {
          migrationResults.failed.push({
            oldKey,
            newKey,
            error: result.error || result.errors
          });
        }
      }
      
      processedKeys++;
    }
    
    // Step 3: Cleanup old keys (if not dry run and no failures)
    if (!dryRun && !skipCleanup && migrationResults.failed.length === 0) {
      const migratedKeys = migrationResults.migrated.map(m => m.oldKey);
      if (migratedKeys.length > 0) {
        migrationResults.cleanup = await cleanupOldKeys(migratedKeys);
      }
    }
    
    // Final summary
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    migrationResults.endTime = endTime;
    migrationResults.duration = duration;
    
    log('info', 'Migration completed successfully!');
    log('info', `Summary: ${migrationResults.migrated.length} migrated, ${migrationResults.failed.length} failed, ${migrationResults.skipped.length} skipped`);
    log('info', `Critical data items migrated: ${migrationResults.criticalDataMigrated}`);
    log('info', `Total data size migrated: ${migrationResults.totalDataSize} bytes`);
    log('info', `Duration: ${duration}ms`);
    
    return migrationResults;
    
  } catch (error) {
    log('error', 'Migration failed:', error.message);
    migrationResults.error = error.message;
    migrationResults.endTime = Date.now();
    migrationResults.duration = migrationResults.endTime - startTime;
    
    throw error;
  }
}

/**
 * Rollback function to restore from backup
 */
async function rollbackMigration(backupKey) {
  log('info', `Starting rollback from backup: ${backupKey}`);
  
  try {
    const backupData = await AsyncStorage.getItem(backupKey);
    if (!backupData) {
      throw new Error(`Backup not found: ${backupKey}`);
    }
    
    const backup = JSON.parse(backupData);
    const { backup: originalData, keyCount } = backup;
    
    log('info', `Restoring ${keyCount} keys from backup...`);
    
    // Remove new keys first
    for (const newKey of Object.values(STORAGE_KEY_MAPPINGS)) {
      try {
        await AsyncStorage.removeItem(newKey);
        log('debug', `Removed new key: ${newKey}`);
      } catch (error) {
        log('warning', `Failed to remove new key ${newKey}:`, error.message);
      }
    }
    
    // Restore original keys
    for (const [key, value] of Object.entries(originalData)) {
      try {
        await AsyncStorage.setItem(key, value);
        log('debug', `Restored key: ${key}`);
      } catch (error) {
        log('error', `Failed to restore key ${key}:`, error.message);
      }
    }
    
    log('info', 'Rollback completed successfully');
    return { success: true, restoredKeys: Object.keys(originalData).length };
    
  } catch (error) {
    log('error', 'Rollback failed:', error.message);
    throw error;
  }
}

// Export functions for use in app
module.exports = {
  migrateUserData,
  rollbackMigration,
  createDataBackup,
  STORAGE_KEY_MAPPINGS,
  CRITICAL_DATA_PATTERNS
};

// CLI usage (if run directly)
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipBackup = args.includes('--skip-backup');
  const skipCleanup = args.includes('--skip-cleanup');
  
  migrateUserData({ 
    dryRun, 
    skipBackup, 
    skipCleanup,
    onProgress: ({ processed, total, currentKey }) => {
      console.log(`Progress: ${processed}/${total} - ${currentKey}`);
    }
  })
  .then(results => {
    console.log('\nMigration Results:');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}