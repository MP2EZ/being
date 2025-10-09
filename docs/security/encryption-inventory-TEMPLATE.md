# Encryption Inventory - Being MBCT App

**Status**: TEMPLATE - To be completed during MAINT-17 audit execution
**Last Updated**: [AUDIT_DATE]
**Auditor**: [NAME]
**App Version**: [VERSION]

---

## Summary

- **Data-at-Rest Encryption**: [ ] ✅ Active / [ ] ⚠️ Partial / [ ] ❌ None
- **Data-in-Transit Encryption**: [ ] ✅ Active / [ ] ⚠️ Partial / [ ] ❌ None
- **Key Management**: [ ] ✅ Secure / [ ] ⚠️ Needs Improvement / [ ] ❌ Insecure
- **Overall Compliance**: [ ] ✅ HIPAA Compliant / [ ] ⚠️ Gaps Identified / [ ] ❌ Non-Compliant

---

## Data Classification

| Data Type | Sensitivity | Encryption Required | Current Status | Location |
|-----------|-------------|---------------------|----------------|----------|
| PHQ-9 Scores | CRITICAL (PHI) | YES | [TBD] | [TBD] |
| GAD-7 Scores | CRITICAL (PHI) | YES | [TBD] | [TBD] |
| Mood Check-ins | HIGH (PHI) | YES | [TBD] | [TBD] |
| Journal Entries | HIGH (PHI) | YES | [TBD] | [TBD] |
| Crisis Contacts | HIGH (PII) | YES | [TBD] | [TBD] |
| User Profile (name, email) | MEDIUM (PII) | YES | [TBD] | [TBD] |
| User Preferences | LOW | NO | [TBD] | [TBD] |
| Session Tokens | CRITICAL | YES | [TBD] | [TBD] |
| Refresh Tokens | CRITICAL | YES | [TBD] | [TBD] |

---

## Encryption Implementation

### Data-at-Rest

**Primary Storage Library**: [TBD - expo-secure-store OR react-native-encrypted-storage]
- **Library Version**: [TBD]
- **Algorithm**: [TBD - AES-256-GCM preferred]
- **Platform Integration**:
  - iOS: [TBD - Keychain Services with kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
  - Android: [TBD - Android Keystore System]
- **Key Management**: [TBD - Platform-managed, per-device, per-user]
- **Implementation Files**: [TBD - List file paths]

#### Sensitive Data Storage Details

| Data Type | Storage Key | Encryption Status | Algorithm | Notes |
|-----------|-------------|-------------------|-----------|-------|
| PHQ-9 Assessments | [TBD] | [TBD] | [TBD] | [TBD] |
| GAD-7 Assessments | [TBD] | [TBD] | [TBD] | [TBD] |
| Mood Check-ins | [TBD] | [TBD] | [TBD] | [TBD] |
| Crisis Contacts | [TBD] | [TBD] | [TBD] | [TBD] |
| Session Tokens | [TBD] | [TBD] | [TBD] | [TBD] |

### Data-in-Transit

**API Provider**: [TBD - Supabase]
- **Protocol**: [TBD - HTTPS/TLS 1.3]
- **Certificate**: [TBD - Valid, issued by trusted CA]
- **Certificate Pinning**: [TBD - Implemented / Not Implemented]
- **Base URL**: [TBD]
- **Endpoints**: [TBD - List all PHI endpoints]

#### Network Security Configuration

```typescript
// [To be documented during audit]
// File: app/src/lib/supabase.ts or equivalent

const supabaseUrl = '[TBD]';
const supabaseAnonKey = '[TBD]';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // [Document actual configuration]
});
```

---

## Cryptographic Standards

### Algorithms in Use

- **Symmetric Encryption**: [TBD - AES-256-GCM preferred]
- **Key Derivation**: [TBD - N/A if platform-generated, or PBKDF2/Argon2]
- **Transport Encryption**: [TBD - TLS 1.3, ChaCha20-Poly1305 or AES-256-GCM]
- **Hashing**: [TBD - SHA-256 for integrity checks]

### Compliance Validation

- [ ] NIST FIPS 140-2 compliant algorithms
- [ ] HIPAA §164.312(a)(2)(iv) (Encryption/Decryption)
- [ ] HIPAA §164.312(e)(1) (Transmission Security)
- [ ] Key rotation policy documented
- [ ] Key rotation automated

---

## Dependencies

| Library | Version | Purpose | Security Status | Notes |
|---------|---------|---------|-----------------|-------|
| [TBD] | [TBD] | Data-at-rest encryption | [TBD] | [TBD] |
| @supabase/supabase-js | [TBD] | Backend API client | [TBD] | [TBD] |
| expo-local-authentication | [TBD] | Biometric auth | [TBD] | Optional |
| react-native-get-random-values | [TBD] | Secure random | [TBD] | Polyfill |

### Vulnerability Scan Results

```bash
# [To be completed during audit]
# Command: npm audit --production
# Date: [DATE]
# Results: [SUMMARY]
```

---

## Test Results

### Storage Inspection (iOS)

**Platform**: iOS [VERSION] on [DEVICE]
**Date Tested**: [DATE]

```
Test Results:
[ ] Keychain items verified
[ ] Keys accessible only when unlocked
[ ] iCloud backup excluded
[ ] No plaintext PHI in:
    [ ] Library/Preferences/*.plist
    [ ] Documents/
    [ ] Library/Application Support/
```

**Findings**: [Document any issues found]

### Storage Inspection (Android)

**Platform**: Android [VERSION] on [DEVICE]
**Date Tested**: [DATE]

```
Test Results:
[ ] Keystore entries verified
[ ] Hardware-backed encryption confirmed
[ ] No plaintext PHI in:
    [ ] shared_prefs/*.xml
    [ ] files/
    [ ] databases/
```

**Findings**: [Document any issues found]

### Network Traffic Analysis

**Tool**: [Proxyman/Charles Proxy]
**Date Tested**: [DATE]

```
Test Scenarios:
[ ] PHQ-9 submission → HTTPS confirmed, TLS 1.2+
[ ] Mood check-in → No PHI in URL params
[ ] Authentication → Tokens encrypted
[ ] Analytics → No PHI transmitted

TLS Version: [TBD]
Cipher Suite: [TBD]
Certificate Valid: [YES/NO]
```

**Findings**: [Document any issues]

---

## Gaps & Recommendations

### CRITICAL (Immediate)
[To be identified during audit]

### HIGH (30 Days)
[To be identified during audit]

### MEDIUM (90 Days)
[To be identified during audit]

### LOW (Backlog)
[To be identified during audit]

---

## Approvals

- **Security Lead**: _________________ Date: _______
- **Compliance Officer**: _____________ Date: _______
- **Technical Lead**: _________________ Date: _______
- **Founder/CEO**: ___________________ Date: _______

---

**Document Location**: `/docs/security/encryption-inventory.md`
**Related Documents**:
- `hipaa-encryption-compliance.md` (compliance matrix)
- `data-flow-encryption.md` (architecture)
- `key-management.md` (key lifecycle)
- `encryption-audit-guide.md` (methodology)
