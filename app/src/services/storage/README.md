# Storage Key Migration System for Being. MBCT App

## Overview

This comprehensive migration system handles the transition from Fullmind to Being. storage keys while ensuring **zero data loss** and maintaining the highest standards of clinical data safety. The system is specifically designed for mental health applications where data integrity is critical.

## 🔒 Critical Safety Features

- **100% Data Integrity**: Clinical assessment data (PHQ-9/GAD-7) preserved with absolute fidelity
- **Crisis Data Protection**: Emergency contacts and safety plans maintain full integrity
- **Automatic Backup**: Comprehensive backup created before any migration
- **Emergency Rollback**: One-click data restoration in case of issues
- **Real-time Validation**: Continuous data integrity checking during migration
- **Progress Tracking**: Real-time user feedback on migration status

## 📁 System Components

### Core Services

1. **StorageKeyMigrator.ts** - Handles individual storage key migrations
2. **MigrationOrchestrator.ts** - Coordinates complete migration process
3. **AppStartupMigrationService.ts** - Integrates migration into app startup
4. **DataStoreMigrator.ts** - Handles encryption migrations (existing)

### UI Components

1. **useMigration.ts** - React hook for migration state management
2. **MigrationScreen.tsx** - Full-featured migration UI component

### Testing

1. **StorageKeyMigrator.test.ts** - Comprehensive test suite

## 🚀 Quick Integration

### 1. App Startup Integration

Add to your main App component:

```typescript
import { appStartupMigrationService } from './src/services/AppStartupMigrationService';
import { MigrationScreen } from './src/components/migration/MigrationScreen';

export default function App() {
  const [migrationResult, setMigrationResult] = useState<StartupMigrationResult | null>(null);

  useEffect(() => {
    checkMigration();
  }, []);

  const checkMigration = async () => {
    const result = await appStartupMigrationService.checkAndHandleStartupMigration({
      allowAutoMigration: true,
      requireUserConsent: false,
      showProgressToUser: false,
      skipNonCritical: false
    });

    setMigrationResult(result);
  };

  // Show migration screen if required
  if (migrationResult?.showMigrationScreen) {
    return (
      <MigrationScreen
        onComplete={() => setMigrationResult(null)}
        onError={(error) => console.error('Migration error:', error)}
        allowSkip={false}
        showDetailedProgress={true}
      />
    );
  }

  // Continue with normal app flow
  return <YourAppContent />;
}
```

### 2. Manual Migration Trigger

For settings screens or manual migration:

```typescript
import { useMigration } from '../hooks/useMigration';

function SettingsScreen() {
  const { state, actions } = useMigration({
    autoCheck: true,
    autoMigrate: false,
    showDetailedProgress: true
  });

  return (
    <View>
      {state.isRequired && (
        <TouchableOpacity onPress={actions.startMigration}>
          <Text>Migrate Data for Enhanced Security</Text>
        </TouchableOpacity>
      )}

      {state.isInProgress && (
        <Text>Migration Progress: {state.progress?.overallProgress}%</Text>
      )}
    </View>
  );
}
```

### 3. Migration Status Checking

Simple status checking:

```typescript
import { useMigrationStatus } from '../hooks/useMigration';

function DataSecurityIndicator() {
  const { isRequired, isComplete, hasError, refresh } = useMigrationStatus();

  return (
    <View>
      <Text>
        Data Security: {isComplete ? '🔒 Secure' : isRequired ? '⚠️ Needs Migration' : '✅ Up to Date'}
      </Text>
      {hasError && (
        <TouchableOpacity onPress={refresh}>
          <Text>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

## 🗂️ Storage Key Mappings

The system migrates the following storage keys:

### Clinical Data (Highest Priority)
- `@fullmind_assessments` → `@being_assessments` (PHQ-9/GAD-7 results)
- `@fullmind_resumable_session_assessment_phq9` → `@being_resumable_session_assessment_phq9`
- `@fullmind_resumable_session_assessment_gad7` → `@being_resumable_session_assessment_gad7`
- `@fullmind_clinical_key_v1` → `@being_clinical_key_v1` (SecureStore)

### Crisis and Safety Data
- `@fullmind_crisis` → `@being_crisis` (Crisis plans and safety contacts)
- `@fullmind_emergency_contacts` → `@being_emergency_contacts` (SecureStore)
- `@fullmind_crisis_config_v1` → `@being_crisis_config_v1`

### User Data
- `@fullmind_user` → `@being_user` (User profile and preferences)
- `@fullmind_checkins` → `@being_checkins` (Daily mood tracking)
- `@fullmind_resumable_session_*` → `@being_resumable_session_*` (Partial sessions)

### System Data
- `@fullmind_master_key_v1` → `@being_master_key_v1` (SecureStore)
- `@fullmind_device_id` → `@being_device_id` (SecureStore)
- `@fullmind_auth_store` → `@being_auth_store`
- Widget data keys
- Cache and performance keys

## 🔄 Migration Process Flow

### 1. Assessment Phase
- Scan AsyncStorage and SecureStore for old keys
- Identify critical vs. non-critical data
- Calculate estimated migration time
- Check safety conditions

### 2. Backup Phase
- Create comprehensive backup of all existing data
- Include metadata and validation information
- Store backup with unique ID for rollback

### 3. Migration Phase (Priority Order)
1. **Crisis Data** (Highest priority for user safety)
2. **Clinical Data** (PHQ-9/GAD-7 assessments)
3. **User Data** (Daily check-ins, preferences)
4. **System Data** (Authentication, device info)
5. **Cache Data** (Lowest priority)

### 4. Validation Phase
- Verify all migrated data matches original
- Validate clinical data structure integrity
- Check encryption status
- Confirm crisis data accessibility

### 5. Cleanup Phase
- Remove old storage keys (only after successful validation)
- Update migration status records
- Log completion for audit trail

## 🚨 Emergency Procedures

### Rollback Process
If migration fails, the system can automatically rollback:

```typescript
// Emergency rollback
const rollbackResult = await migrationOrchestrator.performEmergencyRollback();

if (rollbackResult.success) {
  console.log(`Rollback completed: ${rollbackResult.restoredItems} items restored`);
} else {
  console.error('Rollback failed:', rollbackResult.errors);
}
```

### Manual Data Recovery
```typescript
// Get available backups
const backups = await storageKeyMigrator.getAvailableBackups();

// Restore from specific backup
if (backups.length > 0) {
  const restoreResult = await storageKeyMigrator.rollbackMigration(backups[0]);
}
```

## 🧪 Testing

### Running Tests
```bash
# Run migration tests
npm test -- --testPathPattern=StorageKeyMigrator

# Run with coverage
npm test -- --coverage --testPathPattern=migration
```

### Test Coverage
- ✅ Basic key migration (AsyncStorage & SecureStore)
- ✅ Clinical data validation and integrity
- ✅ Crisis data preservation
- ✅ Backup and rollback functionality
- ✅ Error handling and recovery
- ✅ Data corruption detection
- ✅ Progress tracking
- ✅ Edge cases and failure scenarios

### Manual Testing Checklist

#### Before Migration
- [ ] Create test data in old storage keys
- [ ] Include PHQ-9/GAD-7 assessment data
- [ ] Add crisis contact information
- [ ] Set up user preferences and check-in history

#### During Migration
- [ ] Monitor progress updates
- [ ] Verify no data loss at each stage
- [ ] Test emergency rollback (if safe)
- [ ] Check crisis support remains accessible

#### After Migration
- [ ] Verify all data accessible with new keys
- [ ] Confirm old keys removed
- [ ] Test app functionality with migrated data
- [ ] Validate backup integrity

## 📊 Monitoring and Analytics

### Migration Metrics
The system tracks:
- Migration success/failure rates
- Data volume migrated
- Migration duration
- Error types and frequency
- Rollback usage

### Logging
```typescript
// Migration events are logged with:
console.log('CRITICAL DATA MIGRATED: @fullmind_assessments → @being_assessments');
console.log('Migration completed: 156 keys migrated in 3247ms');
console.error('CRITICAL DATA MIGRATION FAILED: Data validation error');
```

## 🔧 Configuration Options

### Startup Migration Options
```typescript
interface StartupMigrationOptions {
  allowAutoMigration: boolean;     // Auto-migrate non-critical data
  requireUserConsent: boolean;     // Ask before migrating clinical data
  showProgressToUser: boolean;     // Show migration screen
  skipNonCritical: boolean;        // Only migrate critical data
}
```

### Migration Hook Options
```typescript
interface UseMigrationOptions {
  autoCheck?: boolean;             // Check status on mount
  autoMigrate?: boolean;           // Start migration automatically
  pollInterval?: number;           // Progress polling frequency
  retryAttempts?: number;          // Max retry attempts
  showDetailedProgress?: boolean;  // Detailed progress information
}
```

## 🚫 What NOT to Modify

⚠️ **CRITICAL: Never modify these without clinical validation:**
- PHQ-9/GAD-7 scoring algorithms
- Crisis hotline numbers (988)
- Assessment question wording
- Storage key validation logic

## 📞 Crisis Support Integration

The migration system ensures crisis support remains accessible throughout the process:

```typescript
// Crisis support is always available during migration
const CrisisButton = () => (
  <TouchableOpacity
    onPress={() => {
      Alert.alert('Crisis Support', 'Crisis support: 988\nEmergency: 911');
    }}
  >
    <Text>🆘 Crisis Support Always Available</Text>
  </TouchableOpacity>
);
```

## 🔗 Related Documentation

- [Being. TRD v2.0](../../../documentation/mobile-app/Being.%20TRD%20v2.0.md) - Technical requirements
- [DataStore.ts](./DataStore.ts) - Basic storage implementation
- [EncryptedDataStore.ts](./EncryptedDataStore.ts) - Encrypted storage
- [Crisis Safety Protocols](../../../documentation/clinical/safety-protocols/) - Safety requirements

## 📝 Contributing

When modifying the migration system:

1. **Test with real data**: Use actual PHQ-9/GAD-7 data for testing
2. **Validate clinically**: Ensure no impact on therapeutic accuracy
3. **Safety first**: Always prioritize data preservation over features
4. **Document changes**: Update this README and inline documentation
5. **Test rollback**: Verify emergency rollback works in all scenarios

## 📜 License and Compliance

This migration system is designed to support:
- HIPAA compliance (when applicable)
- Clinical data integrity requirements
- Mental health app store guidelines
- Data protection regulations

---

**Remember**: This system handles sensitive mental health data. Always prioritize user safety and data integrity over convenience or performance.