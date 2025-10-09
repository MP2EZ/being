# Encryption Key Management - Being MBCT App

**Status**: TEMPLATE - To be completed during MAINT-17 audit
**Last Updated**: [AUDIT_DATE]
**Version**: 1.0

---

## Overview

This document describes the complete lifecycle of encryption keys used to protect PHI in the Being MBCT app, from generation through deletion.

**Key Management Principles**:
1. **Never hardcode keys** in source code or configuration
2. **Platform secure storage** (iOS Keychain, Android Keystore)
3. **Per-user keys** for multi-user security
4. **Cryptographically secure random** generation
5. **Secure deletion** on logout/account deletion

---

## Key Generation

### Generation Method

**Algorithm**: [TBD during audit]
- iOS: [TBD - SecRandomCopyBytes or Crypto.getRandomBytesAsync]
- Android: [TBD - SecureRandom or platform equivalent]

**Key Size**: [TBD - 256-bit recommended]

**Generation Trigger**:
- [ ] First app launch
- [ ] User registration
- [ ] User login (if not exists)
- [ ] Manual rotation request
- [ ] Security event (e.g., password change)

### Implementation

```typescript
// [To be documented during audit]
// File: [TBD - e.g., app/src/utils/encryption.ts]

/**
 * Generate cryptographically secure encryption key
 * @returns 256-bit key as hex string
 */
export async function generateEncryptionKey(): Promise<string> {
  // [Document actual implementation]
  // Expected: Use expo-crypto or react-native-get-random-values
  // Example:
  // const randomBytes = await Crypto.getRandomBytesAsync(32); // 256 bits
  // return Buffer.from(randomBytes).toString('hex');
}
```

**Entropy Source**:
- iOS: [TBD - /dev/random via SecRandomCopyBytes]
- Android: [TBD - /dev/urandom via SecureRandom]

**Validation**:
- [ ] No use of Math.random() for keys
- [ ] No predictable patterns (e.g., MD5(userID))
- [ ] Minimum 256-bit entropy
- [ ] Different key per generation (tested)

---

## Key Storage

### Platform Integration

**iOS Keychain Services**:
```typescript
// [To be documented]
import * as SecureStore from 'expo-secure-store';

const KEYCHAIN_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  // [Document other options]
};

await SecureStore.setItemAsync('encryption_key', key, KEYCHAIN_OPTIONS);
```

**Configuration**:
- **kSecAttrAccessible**: [TBD - WHEN_UNLOCKED_THIS_DEVICE_ONLY preferred]
- **kSecAttrSynchronizable**: [TBD - false (no iCloud sync)]
- **Biometric Protection**: [TBD - Optional, enhances security]

**Android Keystore System**:
```typescript
// [To be documented]
import EncryptedStorage from 'react-native-encrypted-storage';

await EncryptedStorage.setItem('encryption_key', key);
// Automatically uses Android Keystore with hardware backing
```

**Configuration**:
- **Hardware-backed**: [TBD - YES on newer devices]
- **User Authentication**: [TBD - Optional biometric requirement]
- **Key Size**: [TBD - 256-bit]
- **Block Mode**: [TBD - GCM preferred]

### Key Identification

**Key Naming Strategy**: [TBD]

**Option 1 - Per-User Keys (Recommended)**:
```typescript
const keyId = `encryption_key_${userId}`;
// Enables multi-user device support
// Better security isolation
```

**Option 2 - App-Level Key (Single User)**:
```typescript
const keyId = 'encryption_key';
// Simpler, acceptable for single-user apps
```

**Current Implementation**: [TBD during audit]

### Storage Location

- **iOS**: Keychain-2.db (encrypted system database)
  - Path: Not directly accessible (managed by iOS)
  - Accessible only to Being app
  - Protected by device passcode/biometric

- **Android**: /data/misc/keystore/user_0/
  - Hardware-backed when available
  - Software fallback on older devices
  - Protected by Android system

---

## Key Access

### Access Controls

**Device Security Requirements**:
- [ ] Device must be unlocked (WHEN_UNLOCKED_THIS_DEVICE_ONLY)
- [ ] Biometric or PIN required (optional enhancement)
- [ ] App must be in foreground (iOS background access limited)

**Access Pattern**:
```typescript
// [To be documented]
/**
 * Retrieve encryption key (lazy-loaded, cached)
 */
async function getEncryptionKey(): Promise<string> {
  // Check memory cache first (cleared on background >5min)
  // If not cached, retrieve from Keychain/Keystore
  // Validate key format/length
  // Return key
}
```

**Memory Management**:
- [ ] Key loaded on-demand
- [ ] Cached in memory during active session
- [ ] Cleared when app backgrounds (>5 min)
- [ ] Cleared on logout

### Biometric Protection (If Implemented)

```typescript
// [To be documented if implemented]
import * as LocalAuthentication from 'expo-local-authentication';

const authenticated = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authenticate to access encrypted data',
  fallbackLabel: 'Use passcode',
});

if (authenticated.success) {
  // Access key
}
```

**Status**: [TBD - Implemented / Not Implemented / Planned]

---

## Key Rotation

### Rotation Policy

**Rotation Triggers**:
- [ ] User logout (recommended)
- [ ] Password change (recommended)
- [ ] Security event (breach, compromise)
- [ ] Periodic rotation (90 days - optional)
- [ ] App reinstall

**Current Policy**: [TBD during audit]

### Rotation Process

```typescript
// [To be documented]
/**
 * Rotate encryption key (re-encrypt all data)
 */
async function rotateEncryptionKey(): Promise<void> {
  // 1. Generate new key
  const newKey = await generateEncryptionKey();

  // 2. Retrieve all encrypted data
  const allData = await getAllEncryptedData();

  // 3. Decrypt with old key, re-encrypt with new key
  for (const item of allData) {
    const decrypted = await decrypt(item.data, oldKey);
    const reencrypted = await encrypt(decrypted, newKey);
    await saveEncryptedData(item.key, reencrypted);
  }

  // 4. Store new key
  await SecureStore.setItemAsync('encryption_key', newKey);

  // 5. Securely delete old key (automatic on overwrite)
}
```

**Validation**:
- [ ] All data successfully re-encrypted
- [ ] Old key securely deleted
- [ ] New key verified in Keychain/Keystore
- [ ] Data decryptable with new key

### Automation Status

- [ ] Manual rotation only (documented procedure)
- [ ] Automated on specific triggers
- [ ] Fully automated periodic rotation

**Current Status**: [TBD during audit]

---

## Key Deletion

### Deletion Triggers

**Required**:
- User logout
- App uninstall
- Account deletion

**Optional**:
- Security event
- Key compromise detected
- User request (data export then delete)

### Deletion Process

```typescript
// [To be documented]
/**
 * Securely delete encryption key
 */
async function deleteEncryptionKey(): Promise<void> {
  // 1. Delete from Keychain/Keystore
  await SecureStore.deleteItemAsync('encryption_key');

  // 2. Delete all encrypted data
  await AsyncStorage.clear(); // or selective delete

  // 3. Clear memory cache
  encryptionKeyCache = null;

  // 4. Verify deletion
  const keyStillExists = await SecureStore.getItemAsync('encryption_key');
  if (keyStillExists) {
    throw new Error('Key deletion failed');
  }
}
```

**Verification**:
- [ ] Key removed from Keychain/Keystore
- [ ] Encrypted data deleted or rendered inaccessible
- [ ] Memory cleared (garbage collected)
- [ ] Tested on logout flow

### Data Cleanup Strategy

**Option 1 - Delete Data with Key (Recommended for PHI)**:
- Delete encryption key
- Delete all encrypted data
- User must re-enter data after re-login

**Option 2 - Orphan Data (Not Recommended)**:
- Delete key but leave encrypted data
- Data becomes permanently inaccessible
- Potential for storage bloat

**Current Strategy**: [TBD during audit]

---

## Key Recovery

### Recovery Policy

**Position**: [TBD]

**Option 1 - No Recovery (Recommended for Maximum Security)**:
- Lost key = lost data
- User must re-enter assessment data
- Acceptable for MBCT app (data re-enterable)

**Option 2 - Secure Backup (Complex, Not Recommended)**:
- Encrypted key backup to user's cloud account
- Requires additional encryption layer
- Adds complexity and potential vulnerabilities

**Current Implementation**: [TBD during audit]

**Rationale**: [Document decision and trade-offs]

---

## Security Considerations

### Threat Model

**Threats Mitigated**:
- ✅ Device loss/theft (key requires unlock)
- ✅ Malicious apps (key isolated in Keychain/Keystore)
- ✅ Cloud backup extraction (no iCloud sync)
- ✅ Forensic analysis (hardware-backed encryption)

**Threats NOT Mitigated**:
- ⚠️ Device jailbreak/root (Keychain accessible)
- ⚠️ Malware with device admin (potential key access)
- ⚠️ Physical coercion (user forced to unlock)

### Best Practices Compliance

- [ ] NIST SP 800-57 (Key Management Recommendations)
- [ ] OWASP Mobile Security (M2: Insecure Data Storage)
- [ ] HIPAA §164.312(a)(2)(iv) (Encryption/Decryption)

### Validation Testing

**Tests Performed**:
- [ ] Key generation randomness (Chi-square test)
- [ ] Key storage isolation (cannot access from other app)
- [ ] Key deletion on logout (verified on physical device)
- [ ] Key not in backups (iCloud, Google Drive)
- [ ] Key rotation successful (all data re-encrypted)

**Test Results**: [Document during audit]

---

## Implementation Checklist

- [ ] Key generation uses cryptographically secure random
- [ ] Keys stored in platform Keychain/Keystore
- [ ] No keys hardcoded in source code
- [ ] No keys in environment variables
- [ ] Per-user keys (or documented single-user rationale)
- [ ] Keys deleted on logout
- [ ] Key rotation policy documented
- [ ] Biometric protection implemented (optional)
- [ ] Memory cleared on background
- [ ] Recovery policy documented

---

## Approvals

- **Security Architect**: _________________ Date: _______
- **Compliance Officer**: _____________ Date: _______
- **Technical Lead**: _________________ Date: _______

---

**Document Location**: `/docs/security/key-management.md`
**Related Documents**:
- `encryption-inventory.md` (implementation details)
- `hipaa-encryption-compliance.md` (compliance validation)
- `data-flow-encryption.md` (architecture)
