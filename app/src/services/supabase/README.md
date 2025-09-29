# Supabase Cloud Sync Implementation

## Overview

This implementation provides encrypted cloud backup and privacy-preserving analytics for the Being MBCT app using Supabase free tier. No BAA required as only encrypted blobs are stored.

### Key Features

- ✅ **Anonymous Authentication** - Device-based, no PII
- ✅ **Encrypted Backups** - Client-side AES-256-GCM encryption
- ✅ **Privacy-Preserving Analytics** - Severity buckets only, no PHI
- ✅ **Offline Support** - Works without internet connection
- ✅ **Free Tier Optimized** - Supports ~5,000 users
- ✅ **HIPAA Compliant** - "Conduit exception" approach

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy URL and anon key from Settings > API

### 2. Setup Database

1. Go to SQL Editor in Supabase dashboard
2. Run the `schema.sql` file to create tables and policies

### 3. Configure Environment

1. Copy `.env.example` to `.env`
2. Fill in your Supabase project details:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Initialize Services

Add to your app's initialization code:

```typescript
import CloudServices from './src/services/supabase';

// In App.tsx or similar
useEffect(() => {
  CloudServices.initializeCloudServices();
}, []);
```

### 5. Add Settings UI

Import and use the settings component:

```typescript
import CloudBackupSettings from './src/components/settings/CloudBackupSettings';

// In your Settings screen
<CloudBackupSettings
  onRestoreComplete={(stores) => {
    console.log('Restored:', stores);
    // Refresh your app state
  }}
/>
```

## Integration Guide

### Store Integration

The cloud backup service automatically integrates with Zustand stores. To add a new store:

1. **Import your store** in `CloudBackupService.ts`:

```typescript
import { yourStore } from '../path/to/yourStore';
```

2. **Add to collectStoreData method**:

```typescript
private async collectStoreData(): Promise<BackupData> {
  return {
    version: 1,
    timestamp: Date.now(),
    stores: {
      assessment: assessmentStore.getState(),
      user: userStore.getState(),           // Add this
      yourStore: yourStore.getState(),      // Add this
    },
    metadata: {
      platform: 'react-native',
    },
  };
}
```

3. **Add restore logic** in `restoreFromBackup method`:

```typescript
if (backupData.stores.yourStore) {
  try {
    yourStore.setState(backupData.stores.yourStore);
    restoredStores.push('yourStore');
  } catch (error) {
    errors.push(`Failed to restore yourStore: ${error}`);
  }
}
```

### Analytics Integration

Track events anywhere in your app:

```typescript
import { useCloudAnalytics } from './src/services/supabase/hooks/useCloudSync';

const { trackEvent, trackAssessmentCompletion } = useCloudAnalytics();

// Track assessment completion
await trackAssessmentCompletion('PHQ9', 14);

// Track feature usage
await trackEvent('feature_use', {
  feature_name: 'breathing_exercise',
  duration_seconds: 180,
});
```

### Error Handling

The system includes comprehensive error handling:

```typescript
import cloudErrorHandler from './src/services/supabase/ErrorHandler';

try {
  await cloudBackupService.createBackup();
} catch (error) {
  const enhancedError = await cloudErrorHandler.handleError(error, {
    operation: 'backup',
    timestamp: Date.now(),
  });

  // Show user-friendly message
  Alert.alert('Backup Error', enhancedError.userMessage);
}
```

## React Hooks API

### useCloudSync()

Main hook for cloud sync operations:

```typescript
const {
  // Status
  isInitialized,
  isOnline,
  isLoading,
  error,
  lastBackupTime,

  // Operations
  createBackup,
  restoreFromBackup,
  forceSync,

  // Utilities
  clearError,
  refreshStatus,
} = useCloudSync();
```

### useCloudBackupConfig()

Configuration management:

```typescript
const {
  config,
  updateConfig,
  isLoading,
  error,
} = useCloudBackupConfig();

// Update settings
await updateConfig({
  autoBackupEnabled: true,
  compressionEnabled: false,
});
```

### useCloudAnalytics()

Analytics tracking:

```typescript
const {
  trackEvent,
  trackAssessmentCompletion,
  trackCrisisEvent,
  trackFeatureUse,
} = useCloudAnalytics();
```

## Security & Privacy

### Data Flow

1. **Local Data** → Client-side encryption → **Encrypted Blob**
2. **Encrypted Blob** → Supabase storage (server cannot decrypt)
3. **Analytics Events** → Privacy-preserving (severity buckets only)

### What's Stored

**Supabase Database:**
- ✅ Encrypted blobs (undecryptable by server)
- ✅ Anonymous user IDs (device-based hashes)
- ✅ Severity buckets (mild/moderate/severe)
- ❌ No PHI, no actual scores, no PII

### Keys Never Leave Device

- Encryption keys stored in device SecureStore
- Supabase has no access to decryption keys
- Even Supabase admin cannot read your data

## Performance Optimization

### Free Tier Limits

| Resource | Limit | Usage per User |
|----------|-------|----------------|
| Storage | 500MB | ~100KB |
| API Calls | 50K/month | ~5/day |
| Bandwidth | 2GB/month | ~100KB |

### Capacity Planning

- **~5,000 users** on free tier
- **~150 daily active users** with batching
- **Compression** reduces backup size by ~70%

### Performance Features

- **Circuit breaker** prevents cascade failures
- **Offline queue** handles connectivity issues
- **Batch operations** reduce API calls
- **Non-blocking** operations don't affect crisis detection

## Testing

### Unit Tests

```bash
npm test -- --testPathPattern=supabase
```

### Integration Tests

```bash
npm run test:integration -- --testPathPattern=cloud
```

### Manual Testing

1. **Backup Test**: Create manual backup in settings
2. **Restore Test**: Clear app data, restore from cloud
3. **Offline Test**: Disable network, ensure app still works
4. **Error Test**: Invalid credentials, network failures

## Troubleshooting

### Common Issues

**"Supabase configuration missing"**
- Check `.env` file has correct URL and key
- Ensure environment variables start with `EXPO_PUBLIC_`

**"Connection failed"**
- Check internet connection
- Verify Supabase project is active
- Test with `CloudServices.testCloudConnectivity()`

**"Authentication failed"**
- Clear app cache and restart
- Check RLS policies are enabled
- Verify anonymous auth is enabled in Supabase

**"Backup integrity check failed"**
- Data corruption during transfer
- Try creating new backup
- Check network stability

### Debug Mode

Enable debug logging:

```env
EXPO_PUBLIC_SUPABASE_DEBUG=true
```

### Error History

Check error patterns:

```typescript
const stats = cloudErrorHandler.getErrorStats();
const recentErrors = cloudErrorHandler.getRecentErrors(5);
```

## Production Deployment

### Environment Variables

Set production values:

```env
NODE_ENV=production
EXPO_PUBLIC_SUPABASE_DEBUG=false
EXPO_PUBLIC_BACKUP_INTERVAL_HOURS=6
EXPO_PUBLIC_CIRCUIT_BREAKER_THRESHOLD=3
```

### Monitoring

Monitor free tier usage:

```sql
-- Check storage usage
SELECT * FROM free_tier_usage;

-- Check analytics summary
SELECT * FROM analytics_summary WHERE event_date > NOW() - INTERVAL '7 days';
```

### Security Checklist

- [ ] Row Level Security enabled
- [ ] Environment variables not committed
- [ ] Database policies tested
- [ ] Error messages don't leak data
- [ ] Analytics contain no PHI

## Migration Path

### To Paid Tier (Future)

When ready for therapist portal:

1. **Subscribe to Supabase Pro** ($25/month)
2. **Get BAA** ($599/month)
3. **Add therapist tables** to schema
4. **Decrypt historical data** for therapist access
5. **Implement therapist authentication**

The encrypted blob approach makes this migration seamless.

## Support

### Documentation

- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous)

### Getting Help

1. Check error logs: `cloudErrorHandler.getRecentErrors()`
2. Test connectivity: `CloudServices.testCloudConnectivity()`
3. Review database policies in Supabase dashboard
4. Contact support with error ID for specific issues

## Architecture Notes

This implementation follows the architect-validated approach:
- ✅ Encrypted blobs (no PHI in cloud)
- ✅ Anonymous authentication
- ✅ Privacy-preserving analytics
- ✅ Circuit breaker protection
- ✅ Offline-first design
- ✅ Free tier optimization

The design prioritizes user privacy and regulatory compliance while providing robust cloud backup functionality.