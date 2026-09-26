# Being. Security Architecture
## Privacy-First Mental Health Data Protection

### Document Information
```yaml
document:
  type: Security Architecture
  version: 2.2.2
  status: CURRENT
  updated: 2026-09-25  # MAINT-627: §1/§2 corrected. MAINT-641: §5–§8, roadmap and checklist corrected. DEBUG-645: §5/§6 export residual closed. DEBUG-655: §5 launch sweep
  application: Being. Mental Health App

# Being is a CONSUMER WELLNESS APP, not a HIPAA-covered entity.
# We implement strong security because it's the right thing to do for user trust.

applicable_regulations:
  consumer_protection: [FTC Act Section 5, FTC Health Breach Notification Rule]
  privacy_laws: [CCPA, VCDPA, GDPR (if EU users)]
  app_stores: [Apple App Privacy, Google Play Data Safety]

security_standards:  # Best practices we follow (not legal requirements)
  encryption: [AES-256-GCM, NIST guidelines]
  mobile: [iOS Security Guide, Android Security Framework]
  key_management: [OWASP Mobile Security]
```

---

## 1. Encryption Methods for Local Storage

### Technical Specifications

#### A. Primary Encryption Algorithm: AES-256-GCM

Sensitive wellness data is encrypted at rest with **AES-256-GCM**. `ENCRYPTION_CONFIG.ALGORITHM` is `'AES-GCM'` and every encryption and decryption path runs through `performAESGCMEncryption` / its decrypt counterpart with `aes-256-gcm`. The IV is 12 bytes (`IV_LENGTH: 12`), randomly generated per record.

The implementation is **`react-native-aes-crypto`** for the cipher and **`expo-crypto`** for random bytes, with a `crypto.subtle` branch used only when `Platform.OS === 'web'`. Key storage is `expo-secure-store` (see §2).

**Corrected (MAINT-627).** Earlier versions of this subsection specified `CryptoKit with Secure Enclave integration` on iOS and `Android Keystore with StrongBox when available` on Android. Neither is accurate: CryptoKit, the Secure Enclave and StrongBox appear nowhere in the codebase, and no Secure-Enclave-bound or StrongBox-backed key is ever requested. The throughput and latency figures were also unmeasured and have been removed rather than restated. The AES-256-GCM claim itself is correct and is unchanged — DPIA control 1 and the breach-notification runbook's "unsecured data" trigger both rest on it.

#### B. Key Derivation Function: PBKDF2-HMAC-SHA256

Record keys are derived with **PBKDF2-HMAC-SHA256 at 100,000 iterations** (`ENCRYPTION_CONFIG.PBKDF2_ITERATIONS`). The salt is **32 bytes of cryptographically secure random data** (`SALT_LENGTH: 32`, via `generateSecureRandomBytes`), generated fresh per encryption and stored alongside the record so it can be decrypted.

**Corrected (MAINT-627).** Earlier versions specified 120,000 iterations and a composite salt built from `device_uuid` + `app_installation_id` + random data, claiming "512 bits minimum" of entropy. The real iteration count is 100,000, and no device- or installation-derived component participates in derivation at all — `deriveEncryptionKey` uses random bytes only. A `generateSecureDeviceId()` helper does exist, but it is a stored UUIDv4 unrelated to key derivation. The stated `~300ms` time cost was unmeasured and is removed.

#### C. Data-at-Rest Encryption Implementation

There is **one** generic encryption path. `encryptData` derives a key, generates a fresh 12-byte IV and a fresh 32-byte salt, and returns the ciphertext with its salt, IV and auth tag. Sensitivity level selects a key id, not a different cipher or a different rotation policy.

Record keys are **unique per record but do not rotate.** A single `KEY_ROTATION_INTERVAL_MS` of 30 days exists, and `rotateKey()` writes a `${keyId}_v2` entry to secure storage while updating an **in-memory-only** `keyMetadata` map. Nothing persists that map and no decryption path reads it, so the scheduler does not survive a relaunch and no key has ever actually been rotated in a shipped build.

**Corrected (MAINT-627).** Earlier versions specified two distinct methods — `encryptClinicalData` with a 24-hour key rotation period and `encryptPersonalData` with 7 days — and gave personal data a different cipher, `AES-256-CTR`, with a 16-byte IV. None of that exists. There is no separate personal-data cipher path; the only `ctr` tokens in the source are unused members of the underlying library's algorithm type union. The distinction between "clinical" and "personal" encryption is not a real boundary in this codebase.

### User-Facing Description
**"Strong Encryption for Your Wellness Data"**
- Your assessments and mood data are encrypted with AES-256, the same standard used by banks and governments
- Each record is encrypted with its own uniquely derived key
- Even if someone accessed your phone's storage, they couldn't read your wellness information
- Encryption happens automatically - you won't notice any delays

**Corrected (MAINT-627).** This description previously promised that each key "changes regularly". Keys are unique per record but are never rotated, so that sentence was withdrawn rather than reworded. The heading's "Military-Grade" framing was also dropped as marketing language with no technical referent.

---

## 2. Data Isolation and Sandboxing

### Technical Specifications

#### A. iOS Data Protection
```typescript
interface iOSDataIsolation {
  app_sandbox: {
    container: "NSHomeDirectory()",
    protection_class: "NSFileProtectionCompleteUnlessOpen",
    data_protection_api: "Level 4 - Complete Protection"
  },

  // CORRECTED (MAINT-627) — see the note below this block.
  keychain_integration: {
    accessibility: "kSecAttrAccessibleWhenUnlocked (expo-secure-store default)",
    synchronization: "not specified by Being"
  },

  file_protection: {
    documents: "NSFileProtectionComplete",
    caches: "NSFileProtectionCompleteUntilFirstUserAuthentication",
    tmp: "NSFileProtectionNone" // No sensitive data in tmp
  }
}
```

#### B. Android Data Isolation
```typescript
interface AndroidDataIsolation {
  app_sandbox: {
    internal_storage: "/data/data/fyi.being.app/",
    protection_mode: "MODE_PRIVATE",
    file_based_encryption: true,
    direct_boot_aware: false // Require user authentication
  },

  keystore_integration: {
    provider: "AndroidKeyStore",
    key_alias: "being_master_key"
  },

  storage_encryption: {
    type: "File-Based Encryption (FBE)",
    credential_encrypted_storage: true,
    device_encrypted_storage: false // No sensitive data here
  }
}
```

#### C. Cross-Platform Sandboxing
```typescript
class DataSandbox {
  // Strict process isolation
  async isolateDataAccess(): Promise<void> {
    // Each data category in separate encrypted container
    this.containers = {
      clinical: new EncryptedContainer('clinical', {
        maxSize: '50MB'
      }),
      personal: new EncryptedContainer('personal', {
        maxSize: '200MB'
      }),
      cache: new EncryptedContainer('cache', {
        maxSize: '100MB'
      })
    };
  }

}
```

**Corrected (MAINT-627).** Three claims in this section were withdrawn or narrowed:

- **Keychain accessibility.** The block above previously specified an `access_group` of `fyi.being.app.keychain`, `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`, and `synchronization: false // Never sync to iCloud`. `initializeMasterKey` calls `SecureStore.setItemAsync` with **no options object**, so the library default `WHEN_UNLOCKED` applies and `ThisDeviceOnly` is not set — meaning the item can migrate to another device via an encrypted backup. Being specifies no access group and no synchronization setting. The absence is meaningful rather than incidental: `secureStoreSessionAdapter` *does* pass `keychainAccessible` deliberately, so the option is understood and used elsewhere in this codebase. This also brought §2 into contradiction with §3, which DEBUG-624 had already corrected to state the real `WHEN_UNLOCKED` behaviour. DPIA control 2 is corrected in the same change.
- **`DataSandbox` / `EncryptedContainer`.** No such classes exist. There are no per-category encrypted containers and no size caps; records are encrypted individually through the single path described in §1, and sensitivity level selects a key id rather than a container.
- **`protectMemory` / `preventMemoryDumps`.** **NOT IMPLEMENTED.** There is no `SecurityModule` native module, no memory-pressure handler and no memory-dump prevention anywhere in the codebase. The OS-level app sandbox and file protection described above are real; in-process memory hardening is not.

### User-Facing Description
**"Your Wellness Data Stays on Your Device by Default"**
- Your wellness information is stored encrypted on your phone
- Being can't access other apps' data, and they can't access yours
- Nothing is uploaded unless you turn on Cloud Backup, and crisis-safety telemetry is sent under the separate basis described in the privacy policy
- Even if your phone is lost or stolen, your wellness data remains encrypted at rest

**Corrected (MAINT-627).** This description was headed **"Your Data Never Leaves Your Device"**, which is false. Optional Cloud Backup uploads wellness data when a user enables it; crisis-detection telemetry is delivered to Supabase on a vital-interest basis; and Sentry and PostHog receive error and product analytics under consent. The claim that data "never leaves" the device cannot be made, and the "vault only you can open" metaphor was dropped for implying an access control (a lock the user holds) that §3 establishes does not exist.

---

## 3. Access to Sensitive Views (Device Authentication)

Being has **no in-app authentication gate**. No screen asks for Face ID, Touch ID, a fingerprint or a passcode before showing sensitive wellness data, and no export or deletion step asks for one either. Access to wellness data on a device rests on the operating system:

- **Device lock.** Anyone who can unlock the device can open Being and see everything in it. Being does not re-authenticate.
- **Key storage.** The master encryption key is held in `expo-secure-store` with no `requireAuthentication` option. On iOS it uses the library's default accessibility, `WHEN_UNLOCKED`, so the Keychain releases it only while the device is unlocked. On Android the stored value is encrypted with a key held in the Android Keystore, with no user-authentication requirement attached. No key is bound to biometric enrolment.
- **Encryption at rest.** See §1.

**Corrected (DEBUG-624; updated MAINT-635).** Earlier versions of this section specified a biometric framework: `expo-local-authentication`, per-operation prompts for viewing assessments and exporting data, and a five-minute biometric-bound session key. None of it was ever wired. DEBUG-624 established that `AuthenticationService.authenticateUser` had no production caller and was the only caller of `authenticateWithBiometric`, and that `AuthenticationService.initialize()` was never reached in production. **MAINT-635 then deleted that chain outright** — `AuthenticationService.ts`, `NetworkSecurityService.ts` and `CrisisSecurityProtocol.ts` — and retired the `expo-local-authentication` dependency, so the code fact is now stronger than a dormant control: there is no authentication prompt to wire. `app.json`'s `NSFaceIDUsageDescription` must stay regardless, because `expo-secure-store` references `LAContext` natively; `nativePurposeStrings.config.test.ts` derives that requirement by scanning module sources, so removing the key would fail that gate.

**Residual.** Nothing in Being protects wellness data from someone holding an unlocked or shared device. The DPIA scores this as scenario 2(ii) and records its acceptance.

### User-Facing Description
No user-facing copy may say that Being protects data with Face ID, Touch ID, a fingerprint or an in-app passcode.

---

## 4. Session Timeout and App Lock

Being has **no auto-lock**, inactivity timeout or session lock. It does not blur, hide or lock its content when backgrounded or left idle, and it does not clear decryption keys from memory on a timer. Once the device is unlocked, the device's own auto-lock setting is the only timeout that applies.

**Corrected (DEBUG-624; updated MAINT-635).** Earlier versions of this section specified a `SecureSessionManager`: sensitivity-based idle timeouts, soft and hard locks, and blur-on-background. It was never built. DEBUG-624 noted that `AuthenticationService` contained a periodic session check reachable only from `initialize()`, which production never called; **MAINT-635 deleted that file**, so no session check exists at all. `SESSION_TIMEOUT_MS` in the assessment store configuration is still not read anywhere. Hiding content in the app switcher is not shipped either: that privacy-shield plugin (FEAT-522) is unmerged, and this section must not credit it until it lands.

**Residual.** Shared with §3; see DPIA scenario 2(ii).

### User-Facing Description
No user-facing copy may claim an app lock, an inactivity timeout, or hidden content when you switch apps.

---

## 5. Secure Export Mechanisms

Being ships **one export path**: a plain-JSON copy of the user's own wellness data, handed to them through the operating system's share sheet at their own initiative. It is not encrypted, not password-protected, not watermarked, not time-limited, and not logged.

- **What runs.** `ExportDataScreen.handleExport` gathers the selected categories, calls `serializeExport(gatherExportData())`, writes `being-export-<YYYY-MM-DD>.json` into the app cache directory, and passes its URI to `Sharing.shareAsync` with `mimeType: 'application/json'` and `UTI: 'public.json'`. The destination is whatever the user picks in the share sheet; Being neither chooses it nor sees it.
- **What the file contains.** The Art. 20 portability envelope built by `DataExportService` — decrypted on device, with the master key, the raw ciphertext and the device identifier excluded by construction.
- **Transport.** None of Being's. The share sheet hands the file to another application; no Being server participates in an export.

**Corrected (MAINT-641).** Earlier versions of this section specified a `SecureDataExporter` class and a three-format export framework. None of it was built:

- `encrypted_pdf` with `password_protected: true` and `watermarked: true`, and the `generateSecurePDF` / `generateSecurePassword` methods — **NOT IMPLEMENTED.** `exportService.ts` describes a client-side PDF as the foundation for a later slice, not a shipped path.
- `provider_share` as `fhir_compliant_json` with `encryption: "end_to_end"` and `time_limited: "7_days"` — **NOT IMPLEMENTED.** There is no FHIR serialiser and no expiring artifact anywhere in the codebase.
- `secure_email` requiring `provider_email_verification`, and `direct_transfer` via `airdrop_or_nearby_share` — **NOT IMPLEMENTED.** Being addresses no recipient and verifies no provider; the share sheet is the only channel.
- `auditExport`, and the user-facing promise that every export is logged — **NOT IMPLEMENTED.** Nothing anywhere records that an export occurred.
- `personal_backup` with `key_derivation: "user_password_based"` — **NOT IMPLEMENTED.** No export is keyed to a user password.

**This is a correction, not a downgrade.** GDPR Art. 20 does not require a portability export to be encrypted, password-protected or audit-logged; a machine-readable copy delivered to the data subject at their own request is the correct posture. What changes here is the description, not the control. DPIA §7 control 12 is narrowed to match in the same commit.

**Corrected (DEBUG-645).** The exported file is written to the app cache directory and handed to the share sheet, and it is now deleted when the share settles. One `finally` covers every path — a completed share, a cancelled one (`shareAsync` resolves on cancel on both platforms), the sharing-unavailable early return, and a thrown error. Account deletion additionally sweeps the cache for export files (`exportArtifactSweeper.sweepExportArtifacts`, best-effort, before the wipe), because `clearAllWellnessData` walks storage keys rather than the filesystem. The writer and the sweeper share one filename definition, so the sweep cannot drift from what is written. Previously the file was never deleted, and an unencrypted copy of the export survived account deletion.

**Corrected (DEBUG-655): the residual is narrowed, not closed.** A process killed while the share sheet is up never reaches the delete. Account deletion still sweeps that file, and `App.tsx` now also runs `exportArtifactSweeper.sweepExportArtifacts()` at every app launch, in the init effect that runs after the first commit (not before render). It sits beside the audio sweep, `audioArtifactSweeper.sweepStaleAudioArtifacts()`, which has run there since FEAT-283 and is now pinned by the same test. What remains: a stranded export persists until the next launch, and indefinitely for a user who never opens the app again and never deletes their account. Stranded raw audio can also survive a relaunch inside its 5-minute TTL, until a later launch. The cache is on-device only and excluded from OS backup by default. The OS purging its cache under storage pressure is not counted as a control.

### User-Facing Description
No user-facing copy may say that exports are password-protected, encrypted, watermarked, expiring, logged, or delivered securely to a therapist. Being's export is a plain JSON file the user shares themselves. Copy may say that the file contains only the categories the user selected, and that Being does not receive it.

---

## 6. Complete Data Deletion

Being deletes an account by **destroying the encryption key and sweeping the stores that hold wellness data**, then hard-deleting the server-side principal. There is no overwrite pass, no cooling-off period, and no crisis check.

- **On device.** `clearAllWellnessData({ deleteMasterKey: true })` destroys the master key held in `expo-secure-store` and sweeps the AsyncStorage prefixes and exact keys enumerated in `SWEPT_ASYNC_PREFIXES` / `SWEPT_EXACT_KEYS`. Destroying the key is what makes any remaining ciphertext unreadable — cryptographic erasure, not overwriting.
- **On the server.** `supabase/functions/delete-account` runs with `verify_jwt` and a service-role client and calls `auth.admin.deleteUser(authUid, false)`, hard-deleting the caller's own `auth.users` row. Foreign keys cascade, removing every row keyed to that `auth.uid()` — backups, analytics and subscription records.
- **Ordering.** `AccountDeletionService.deleteAccountAndWipe` performs the server delete, confirms it, and only then wipes locally. That order is non-negotiable: wiping locally first would destroy the credential needed to authenticate the server delete.
- **Confirmation.** `DeleteAccountScreen` requires the user to type a confirmation word. It is `DELETE`.

**Corrected (MAINT-641).** Earlier versions of this section specified a `SecureDataDeletion` class whose mechanisms were never built:

- `physical_overwrites` with `passes: 3` on the `DOD 5220.22-M` pattern — **NOT IMPLEMENTED.** No overwrite pass exists; erasure is cryptographic.
- `Keychain.resetInternetCredentials` / `resetGenericPasswords` on iOS and `AndroidKeystore.deleteAllKeys()` on Android — **NOT IMPLEMENTED.** `react-native-keychain` and a native keystore module are not dependencies; key destruction goes through `expo-secure-store`.
- `safety_checks.crisis_assessment: "check_current_crisis_state"` — **NOT IMPLEMENTED.** `checkUserCrisisState` does not exist. No crisis check runs before deletion.
- `safety_checks.cooling_period: "24_hour_delay_option"` — **NOT IMPLEMENTED.** Deletion is immediate.
- `safety_checks.backup_reminder: "offer_export_before_deletion"` — **NOT IMPLEMENTED.** `DeleteAccountScreen` offers no pre-deletion export.
- `deletion_categories` for `selective`, `time_based` and `emergency: crisis_triggered_deletion` — **NOT IMPLEMENTED.** Deletion is all-or-nothing.
- `verifyDeletion()` — **NOT IMPLEMENTED.** No post-deletion verification runs.
- The documented confirmation string `DELETE ALL MY DATA` — the shipped `CONFIRM_WORD` is `DELETE`. The document is corrected to the code.

**Residual.** `delete-account` deletes the caller's own principal only; it is the user's erasure right, not an administrative tool. Coverage for data outside the swept namespaces is tracked by the DPIA's erasure controls, and the export file described in §5, formerly a known survivor (DEBUG-645), is now swept on deletion.

### User-Facing Description
Copy may say that deleting an account destroys the encryption key so that remaining data cannot be read, that the server-side record is deleted, and that deletion cannot be undone. No user-facing copy may promise a safety or crisis check before deletion, an offer to export first, a delay or cooling-off window, selective or time-based deletion, or a multi-pass overwrite.

---

## 7. Protection Against Device-Level Threats

Being ships **no device-threat detection**. There is no jailbreak or root check, no debugger or hook detection, no tamper or app-signature verification, and no VPN or proxy check. None of these appears anywhere in the codebase.

**Certificate pinning: NOT IN EFFECT.** This needs stating precisely, because the scaffold exists and reads as a shipped control:

- Pins for `*.supabase.co` are enumerated in `certificate-pinning.ts`, and `pinnedFetch` really is wired into `SupabaseService`, so every Supabase request does pass through the wrapper.
- But **no request is validated against a pin on any build.** The native pinning call inside `pinned-fetch.ts` is a commented-out block awaiting `react-native-ssl-public-key-pinning`, which is not a dependency. The wrapper performs a plain timed `fetch`.
- INFRA-231 removed the `pin_validation_success` audit signal from this path precisely because it was "a false assurance, logged on every request without any validation having occurred."
- `EXPO_PUBLIC_ALLOW_INSECURE_SSL` defaults to `false`, and the env schema refuses to boot if it is truthy in a production environment. **That flag governs a development bypass, not whether pinning happens** — its being false must not be read as pinning being on.
- **The control actually relied on for transport security is the platform's standard certificate validation over TLS 1.2+**, which is true, is what `privacy-policy.md` §4.3 claims, and is unaffected by this correction.
- Re-crediting pinning requires three things together: the dependency, the uncommented native call, and a test that fails on a pin mismatch.

**Corrected (MAINT-641).** Earlier versions of this section specified a `DeviceThreatProtection` class and a `ThreatProtection` framework. Withdrawn:

- `jailbreak_detection` with `cydia_presence`, `su_binary_check`, `busybox_presence` and the remainder of both platform lists — **NOT IMPLEMENTED.**
- `runtime_protection` with `debugger_detection: true`, `hook_detection: true`, `tamper_detection: true` and `app_signature_verification` — **NOT IMPLEMENTED.**
- `network_security` with `certificate_pinning: true` and `mitm_protection: true` — **NOT IN EFFECT**, per the pinning note above. `vpn_detection` and `no_proxy_allowed` — **NOT IMPLEMENTED.**
- The `handleJailbreakDetected` alert, `enableEnhancedMode()` and `disableHighRiskFeatures()` — **NOT IMPLEMENTED.** No enhanced-encryption mode and no risk-based feature gating exist.

**Residual.** Being cannot detect a compromised device and does not try. On a jailbroken or rooted device the operating-system guarantees that §1 and §3 rely on may not hold, and Being would neither know nor warn.

### User-Facing Description
No user-facing copy may claim threat monitoring, jailbreak or root detection, tamper protection, interception protection, certificate pinning, or that Being strengthens its security in response to device risk.

---

## 8. User-Friendly Security Features

Being ships **no privacy dashboard, no security score and no security onboarding**. The security-related surfaces that exist are the ordinary Profile screens — Privacy Data, Export Data, Delete Account, Cloud Backup — and the consent flow.

**Corrected (MAINT-641).** This section was draft copy for features that were never built; none of its identifiers appears anywhere in the codebase:

- `PrivacyDashboard`, with a `security_score`, a data inventory and an `export_history` list — **NOT IMPLEMENTED.**
- `SecurityOnboarding` and its welcome flow — **NOT IMPLEMENTED.**
- The `SecurityMessages` block — **NOT IMPLEMENTED**, and several of its strings are false as well as unshipped. They are recorded here so that no future reader ships them:
  - `local_only`: "Everything stays on your device. We can't see it, and neither can anyone else" — **false.** See the transmission note in the Security Compliance Checklist below.
  - `threat_protection`: "Guardian Mode Active — We're constantly watching for threats" — **false.** See §7.
  - `export_control`: "You control exactly what to share with your therapist and how" — **overstates §5.** The user chooses categories and a share destination; there is no therapist-directed channel.
  - `deletion_rights`: "Delete your data anytime. When it's gone, it's gone forever" — substantially true per §6, but only by key destruction; it must not be paired with any claim of overwriting.
  - `encryption`: "Bank-Level Security" — marketing rather than a claim; §1 states the actual algorithm.
  - `crisis_access`: "Even with all our security, your crisis button is always one tap away" — true, and unaffected by this correction.

**Residual.** Being gives users no in-app view of what security applies to their data. Those disclosures live in the privacy policy and the consent flow instead.

### User-Facing Description
No user-facing copy may reference a privacy dashboard, a security score, a guardian or monitoring mode, an export history, or a security onboarding flow. None of them exists.

---

## Implementation Priority & Roadmap

**Corrected (MAINT-641).** This roadmap is a historical plan, not a status board, and it was never reconciled against what shipped. Two kinds of error are fixed here. Three Phase 1 items **did** ship and are now checked — AES-256-GCM encryption, PBKDF2 key derivation, and Keychain/Keystore-backed key storage through `expo-secure-store`; all three are described accurately in §1 and §3, and note that §1 withdraws the Secure Enclave and StrongBox claims, so "integration" here means the library's default backing rather than hardware-bound keys. Everything still unchecked below was **never built**, and §5–§8 now say so per item rather than leaving it to be inferred from an empty box. Nothing in this list is scheduled; read it as a record of what was once planned.

### Phase 1: Core Security (Week 1-2)
```yaml
critical_implementation:
  - [x] AES-256-GCM encryption for clinical data
  - [x] Secure key derivation (PBKDF2)
  - [x] iOS Keychain / Android Keystore integration
  - [ ] Basic jailbreak/root detection
```

### Phase 2: Enhanced Protection (Week 3-4)
```yaml
enhanced_features:
  - [ ] Secure export with password protection
  - [ ] Advanced threat detection
  - [ ] Privacy dashboard UI
  - [ ] Secure data deletion with safety checks
  - [ ] Memory protection implementation
```

### Phase 3: Polish & Optimization (Week 5-6)
```yaml
optimization:
  - [ ] Performance tuning for encryption
  - [ ] User-friendly security onboarding
  - [ ] Enhanced threat detection
  - [ ] Security audit logging
  - [ ] Comprehensive security testing
  - [ ] User education materials
```

---

## Security Compliance Checklist

**Corrected (MAINT-641).** Nine boxes in this checklist were ticked for controls that do not exist, and three of them contradicted sections of this same document. A ✅ here now means the control executes on a shipping build; anything else is marked ❌ (never built) or ⚠️ (partly true, with the qualification stated). The withdrawn transmission claim is explained in full beneath the lists.

### Technical Requirements
- ✅ AES-256 encryption for all sensitive data — §1
- ⚠️ Key storage backed by Keychain / Android Keystore via `expo-secure-store` — **not hardware-bound.** Corrected from "Hardware-backed key storage"; §1 withdrew the Secure Enclave and StrongBox claims and no key is bound to biometric enrolment (§3).
- ⚠️ Data deletion by cryptographic erasure — §6. Corrected from "Secure data deletion": the key is destroyed and the stores are swept, but nothing is overwritten.
- ❌ Jailbreak/root detection — **never built.** §7.
- ❌ Memory protection — **never built.** §7.
- ⚠️ Data export as plain JSON through the OS share sheet — §5. Corrected from "Secure export mechanisms": the export is not encrypted, password-protected or logged.
- ✅ Cryptographic ID generation (no Math.random() - see `@/core/utils/id`)

### Privacy Requirements
- ❌ ~~No network transmission of personal data~~ — **withdrawn; this was false.** See the note below.
- ❌ ~~Complete local data isolation~~ — **withdrawn**, for the same reason.
- ✅ User-controlled data deletion — §6
- ✅ Granular privacy controls — per-category consent
- ✅ Transparent data handling — privacy policy and consent flow
- ✅ Crisis mode exceptions — crisis access is never gated on consent
- ❌ Export audit trail — **never built.** Nothing records that an export occurred (§5).
- ✅ Clear user consent flows

### Mental Health Specific
- ✅ Crisis access always available
- ✅ Therapeutic relationship protection
- ✅ Anti-stigmatization measures
- ❌ Safe deletion with crisis check — **never built.** `checkUserCrisisState` does not exist (§6).
- ❌ Provider-friendly export formats — **never built.** There is no FHIR serialiser and no provider channel (§5).
- ✅ Trauma-informed security UX
- ✅ Recovery-oriented design
- ✅ Dignity preservation

**Corrected (MAINT-641) — the withdrawn "no network transmission" claim.** This checklist previously ticked `No network transmission of personal data`, alongside `Complete local data isolation`. Both were false. Being transmits personal data on five disclosed paths: optional Cloud Backup (an encrypted settings blob plus operational backup records, keyed to the anonymous `auth.uid()` principal); crisis-detection telemetry to Supabase (`crisis_detected`, measured end to end at 576 ms — INFRA-412 — carrying bucketed fields only, no raw score and no Q9 value); Sentry crash events under consent; PostHog product analytics under consent; and subscription and receipt verification.

**A row keyed to an anonymous `auth.uid()` is pseudonymous personal data, not anonymous data** — GDPR Art. 4(1) and Recital 26, and "linked or reasonably linkable" under TDPSA §541.001(28), CCPA §1798.140(v)(1), VCDPA, CPA and CTDPA. The identifier is stable and re-linkable on the device, and crisis telemetry is health-derived, hence Art. 9 special-category — which is precisely why INFRA-214 processes it under Art. 6(1)(d) / 9(2)(c) vital interests. A lawful basis is only needed for personal data, so the three-sink partition is itself an acknowledgement of this.

The limit of that statement matters and must not be flattened: Being holds no name, email address or phone number, so **no transmitted record is attributable to a *named* individual from server-side data alone.** That narrows what a breach notification would contain and how rights requests are handled. It does not put the data out of scope. The lawful-basis partition across the three sinks is INFRA-214's and is recorded in `docs/legal/dpia-sensitive-wellness-data.md` §2, §4 and §7, and in `docs/legal/lia-crisis-telemetry.md`.

---

## Testing Requirements

**Corrected (MAINT-641).** This block is a test *plan*, not a record of tests that exist. The threat-detection case below describes checks for mechanisms §7 establishes were never built, and is retained only as a marker of what would be required were they ever implemented.

### Security Testing
```typescript
describe('Security Test Suite', () => {
  test('Clinical data encryption', async () => {
    // Verify AES-256-GCM implementation
    // Test key rotation
    // Verify authentication tags
  });

  test('Data deletion', async () => {
    // Test complete deletion
    // NOT IMPLEMENTED (MAINT-641): there is no crisis-state check to verify
    // Confirm data unrecoverable by key destruction
  });

  // NOT IMPLEMENTED (MAINT-641): none of the mechanisms below exists. See §7.
  test.todo('Threat detection — jailbreak, debugger and integrity checks (never built)');
});
```

---

## 10. JavaScript Bundle Security

### Technical Specifications

#### A. Hermes Bytecode Obfuscation
```typescript
interface BundleSecurityConfig {
  // Primary obfuscation via Hermes bytecode compilation
  hermes: {
    enabled: true,                          // Configured in app.json: jsEngine: "hermes"
    bytecodeCompilation: true,              // JS compiled to optimized bytecode
    securityBenefit: "defense-in-depth",    // Bytecode harder to reverse engineer than JS
    limitation: "can be decompiled with hermes-dec tools"
  },

  // Production minification via Terser
  minification: {
    enabled: true,                          // NODE_ENV=production
    dropConsole: true,                      // Remove all console.* statements
    dropDebugger: true,                     // Remove debugger statements
    deadCodeElimination: true,              // Remove unreachable code
    variableMangling: true,                 // Shorten variable names
    commentRemoval: true                    // Strip all comments
  },

  // Source map protection
  sourceMaps: {
    productionBuilds: "excluded",           // Never in production bundles
    gitIgnored: ["*.map", "*.js.map", "*.hbc.map"],
    errorMonitoring: "uploaded to Sentry only (not bundled)"
  }
}
```

#### B. Build Configuration
```javascript
// metro.config.js - Production minification settings
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  config.transformer.minifierConfig = {
    compress: {
      drop_console: true,     // Remove console.* calls
      drop_debugger: true,    // Remove debugger statements
      dead_code: true,        // Eliminate unreachable code
      conditionals: true,     // Optimize conditionals
      evaluate: true,         // Evaluate constant expressions
      unused: true            // Remove unused variables
    },
    mangle: {
      toplevel: true          // Shorten top-level variable names
    },
    output: {
      comments: false         // Remove all comments
    }
  };
}
```

### Security Analysis

#### What Hermes Bytecode Provides
1. **Bytecode Compilation**: JavaScript is compiled to Hermes bytecode (.hbc)
2. **Code Transformation**: Original source is not directly accessible
3. **Increased Effort**: Reverse engineering requires specialized tools
4. **Defense in Depth**: Complements other security measures

#### Limitations
1. **Not True Obfuscation**: Bytecode can be decompiled using tools like hermes-dec
2. **Determined Attackers**: Security researchers can still analyze app logic
3. **No Secret Storage**: Don't rely on bytecode to hide API keys or secrets

#### Security Recommendations
1. Store secrets in secure storage (expo-secure-store), not in code
2. Use Hermes as part of defense-in-depth strategy
3. Consider additional obfuscation (Jscrambler) for high-value apps
4. Enable ProGuard/R8 for native code on Android

### User-Facing Description
**"Protected Application Code"**
- App code is compiled to optimized bytecode format
- Production builds exclude debugging information
- No source maps included in production releases
- Defense-in-depth approach to code protection

---

## Conclusion

This comprehensive security framework ensures Being. provides industry-leading protection for sensitive mental health data while maintaining usability and accessibility. The local-first architecture with military-grade encryption, combined with thoughtful UX design, creates a trusted environment where users can engage with their mental health journey privately and securely.

### Key Differentiators
1. **Zero Cloud Exposure**: Complete local storage eliminates cloud vulnerabilities
2. **Mental Health Optimized**: Security designed specifically for mental health sensitivity
3. **Crisis-Resilient**: Security that doesn't compromise safety in emergencies
4. **User Empowerment**: Clear, understandable security that users can control
5. **Privacy-First**: Strong encryption because users deserve it, not because regulations require it

**Implementation Note**: Begin with Phase 1 core security features, as these provide the foundation for all other protections. The encryption must be rock-solid before adding enhanced features.