# Being. Security Architecture
## Privacy-First Mental Health Data Protection

### Document Information
```yaml
document:
  type: Security Architecture
  version: 2.1.0
  status: CURRENT
  updated: 2026-09-15  # DEBUG-624: §3/§4 rewritten; in-app auth gate and auto-lock claims removed
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
```typescript
interface PrimaryEncryption {
  algorithm: {
    cipher: "AES-256-GCM",
    key_size: 256, // bits
    block_size: 128, // bits
    iv_size: 96, // bits (12 bytes)
    auth_tag_size: 128 // bits (16 bytes)
  },

  implementation: {
    ios: "CryptoKit with Secure Enclave integration",
    android: "Android Keystore with StrongBox when available",
    fallback: "expo-crypto with hardware-backed key storage"
  },

  performance: {
    encryption_speed: "~120 MB/s on modern devices",
    decryption_speed: "~110 MB/s on modern devices",
    latency: "<5ms for typical mental health records"
  }
}
```

#### B. Key Derivation Function: PBKDF2-HMAC-SHA256
```typescript
interface KeyDerivation {
  algorithm: "PBKDF2-HMAC-SHA256",
  iterations: 120000, // Increased from OWASP minimum for mental health data
  salt_generation: {
    components: [
      "device_uuid",
      "app_installation_id",
      "random_salt_256_bits"
    ],
    total_entropy: "512 bits minimum"
  },
  key_stretching: {
    time_cost: "~300ms on average device",
    memory_hard: false, // Consider Argon2id for future
    parallelism: 1
  }
}
```

#### C. Data-at-Rest Encryption Implementation
```typescript
class LocalStorageEncryption {
  // Wellness screening data (PHQ-9/GAD-7)
  async encryptClinicalData(data: ClinicalData): Promise<EncryptedData> {
    const key = await this.deriveKey('clinical', {
      rotationPeriod: '24_hours'
    });

    return {
      algorithm: 'AES-256-GCM',
      ciphertext: await crypto.encrypt(data, key),
      iv: crypto.randomBytes(12),
      authTag: crypto.generateAuthTag(),
      keyVersion: this.currentKeyVersion,
      timestamp: Date.now()
    };
  }

  // Personal mental health data (mood tracking, reflections)
  async encryptPersonalData(data: PersonalData): Promise<EncryptedData> {
    const key = await this.deriveKey('personal', {
      rotationPeriod: '7_days'
    });

    return {
      algorithm: 'AES-256-CTR',
      ciphertext: await crypto.encrypt(data, key),
      iv: crypto.randomBytes(16),
      keyVersion: this.currentKeyVersion
    };
  }
}
```

### User-Facing Description
**"Military-Grade Encryption for Your Mental Health Data"**
- Your assessments and mood data are encrypted using AES-256, the same standard used by banks and governments
- Each piece of data has its own unique encryption key that changes regularly
- Even if someone accessed your phone's storage, they couldn't read your mental health information
- Encryption happens instantly and automatically - you won't notice any delays

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

  keychain_integration: {
    access_group: "fyi.being.app.keychain",
    accessibility: "kSecAttrAccessibleWhenUnlockedThisDeviceOnly",
    synchronization: false // Never sync to iCloud
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

  // Memory protection
  protectMemory(): void {
    // Clear sensitive data from memory immediately after use
    process.on('memoryPressure', () => this.clearSensitiveMemory());

    // Prevent memory dumps
    if (Platform.OS === 'ios') {
      NativeModules.SecurityModule.preventMemoryDumps();
    }
  }
}
```

### User-Facing Description
**"Your Data Never Leaves Your Device"**
- All your mental health information stays isolated on your phone
- Being. can't access other apps' data, and they can't access yours
- Your data is kept in a secure "vault" that only you can open
- Even if your phone is lost or stolen, your mental health data remains protected

---

## 3. Access to Sensitive Views (Device Authentication)

Being has **no in-app authentication gate**. No screen asks for Face ID, Touch ID, a fingerprint or a passcode before showing sensitive wellness data, and no export or deletion step asks for one either. Access to wellness data on a device rests on the operating system:

- **Device lock.** Anyone who can unlock the device can open Being and see everything in it. Being does not re-authenticate.
- **Key storage.** The master encryption key is held in `expo-secure-store` with no `requireAuthentication` option. On iOS it uses the library's default accessibility, `WHEN_UNLOCKED`, so the Keychain releases it only while the device is unlocked. On Android the stored value is encrypted with a key held in the Android Keystore, with no user-authentication requirement attached. No key is bound to biometric enrolment.
- **Encryption at rest.** See §1.

**Corrected (DEBUG-624).** Earlier versions of this section specified a biometric framework: `expo-local-authentication`, per-operation prompts for viewing assessments and exporting data, and a five-minute biometric-bound session key. None of it was wired. `AuthenticationService.authenticateUser` has no production caller and is the only caller of `authenticateWithBiometric`, and `AuthenticationService.initialize()` is never reached in production. The `expo-local-authentication` dependency is residue of that plan, not evidence of a control. `app.json`'s `NSFaceIDUsageDescription` must stay regardless, because `expo-secure-store` references `LAContext` natively.

**Residual.** Nothing in Being protects wellness data from someone holding an unlocked or shared device. The DPIA scores this as scenario 2(ii) and records its acceptance.

### User-Facing Description
No user-facing copy may say that Being protects data with Face ID, Touch ID, a fingerprint or an in-app passcode.

---

## 4. Session Timeout and App Lock

Being has **no auto-lock**, inactivity timeout or session lock. It does not blur, hide or lock its content when backgrounded or left idle, and it does not clear decryption keys from memory on a timer. Once the device is unlocked, the device's own auto-lock setting is the only timeout that applies.

**Corrected (DEBUG-624).** Earlier versions of this section specified a `SecureSessionManager`: sensitivity-based idle timeouts, soft and hard locks, and blur-on-background. It was never built. `AuthenticationService` contains a periodic session check, but it starts only from `initialize()`, which production never calls. `SESSION_TIMEOUT_MS` in the assessment store configuration is not read anywhere. Hiding content in the app switcher is not shipped either: that privacy-shield plugin (FEAT-522) is unmerged, and this section must not credit it until it lands.

**Residual.** Shared with §3; see DPIA scenario 2(ii).

### User-Facing Description
No user-facing copy may claim an app lock, an inactivity timeout, or hidden content when you switch apps.

---

## 5. Secure Export Mechanisms

### Technical Specifications

#### A. Export Security Framework
```typescript
interface SecureExport {
  export_formats: {
    therapy_report: {
      format: "encrypted_pdf",
      encryption: "AES-256",
      password_protected: true,
      watermarked: true
    },
    personal_backup: {
      format: "encrypted_json",
      encryption: "AES-256-GCM",
      key_derivation: "user_password_based"
    },
    provider_share: {
      format: "fhir_compliant_json",
      encryption: "end_to_end",
      time_limited: "7_days"
    }
  },

  export_channels: {
    secure_email: {
      method: "encrypted_attachment",
      requires: "provider_email_verification"
    },
    direct_transfer: {
      method: "airdrop_or_nearby_share"
    },
    cloud_backup: {
      method: "encrypted_before_upload",
      service: "user_chosen_cloud",
      key_management: "client_side_only"
    }
  }
}
```

#### B. Export Implementation
```typescript
class SecureDataExporter {
  async exportForTherapy(
    dataRange: DateRange,
    therapistEmail?: string
  ): Promise<ExportResult> {
    // Gather and validate data
    const data = await this.gatherTherapyData(dataRange);

    // Generate secure PDF
    const pdf = await this.generateSecurePDF(data, {
      watermark: `Generated for therapy - ${new Date().toISOString()}`,
      password: this.generateSecurePassword(),
      expiry: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Audit the export
    await this.auditExport({
      type: 'therapy_report',
      recipient: therapistEmail || 'self',
      dataIncluded: this.summarizeExportedData(data),
      timestamp: Date.now()
    });

    return {
      file: pdf,
      password: pdf.password,
      instructions: this.getSecureShareInstructions()
    };
  }

  private generateSecurePassword(): string {
    // Generate pronounceable yet secure password
    const words = crypto.randomWords(4);
    const numbers = crypto.randomInt(1000, 9999);
    return `${words.join('-')}-${numbers}`;
  }
}
```

### User-Facing Description
**"Share Your Data Safely with Your Therapist"**
- Export your mood tracking and assessments as password-protected reports
- Reports automatically expire after 7 days for extra security
- Your therapist receives only what you choose to share
- Every export is logged so you know exactly what was shared and when

---

## 6. Complete Data Deletion

### Technical Specifications

#### A. Secure Deletion Framework
```typescript
interface SecureDeletion {
  deletion_methods: {
    cryptographic_erasure: {
      method: "key_destruction",
      overwrites: 0, // Instant deletion via key removal
      verification: "attempt_decryption_fails"
    },
    physical_overwrites: {
      method: "random_data_overwrites",
      passes: 3, // DOD 5220.22-M standard
      patterns: ["random", "zeros", "random"]
    }
  },

  deletion_categories: {
    selective: "user_chosen_categories",
    time_based: "data_before_date",
    complete: "all_user_data",
    emergency: "crisis_triggered_deletion"
  },

  safety_checks: {
    crisis_assessment: "check_current_crisis_state",
    backup_reminder: "offer_export_before_deletion",
    confirmation: "require_typed_confirmation",
    cooling_period: "24_hour_delay_option"
  }
}
```

#### B. Data Deletion Implementation
```typescript
class SecureDataDeletion {
  async deleteAllData(confirmation: string): Promise<DeletionResult> {
    // Verify user really wants this
    if (confirmation !== 'DELETE ALL MY DATA') {
      throw new Error('Invalid confirmation');
    }

    // Check for crisis state
    const crisisCheck = await this.checkUserCrisisState();
    if (crisisCheck.inCrisis) {
      return this.offerCrisisSupport(crisisCheck);
    }

    // Offer backup
    const backupAccepted = await this.offerBackup();

    // Begin deletion process
    const deletionSteps = [
      // 1. Destroy encryption keys
      this.destroyAllEncryptionKeys(),

      // 2. Overwrite encrypted data
      this.overwriteEncryptedData(),

      // 3. Clear keychain/keystore
      this.clearSecureStorage(),

      // 4. Reset app to fresh state
      this.resetApplication(),

      // 5. Clear caches
      this.clearAllCaches()
    ];

    const results = await Promise.all(deletionSteps);

    // Verify deletion
    const verified = await this.verifyDeletion();

    return {
      success: verified,
      timestamp: Date.now(),
      categoriesDeleted: ['clinical', 'personal', 'cache', 'keys'],
      backupCreated: backupAccepted
    };
  }

  private async destroyAllEncryptionKeys(): Promise<void> {
    // iOS Keychain
    if (Platform.OS === 'ios') {
      await Keychain.resetInternetCredentials('fyi.being.app');
      await Keychain.resetGenericPasswords();
    }

    // Android Keystore
    if (Platform.OS === 'android') {
      const keystore = await AndroidKeystore.load();
      await keystore.deleteAllKeys();
    }

    // Clear runtime keys
    this.cryptoManager.destroyAllKeys();
  }
}
```

### User-Facing Description
**"Complete Control Over Your Data"**
- Delete specific types of data or everything at once
- Your data is thoroughly destroyed, not just hidden
- Option to export your data before deletion
- Safety check if you're in crisis to ensure you get support
- Once deleted, your data cannot be recovered - even by us

---

## 7. Protection Against Device-Level Threats

### Technical Specifications

#### A. Threat Detection Framework
```typescript
interface ThreatProtection {
  jailbreak_detection: {
    ios_checks: [
      "cydia_presence",
      "suspicious_files",
      "fork_detection",
      "dyld_insertion",
      "sandbox_integrity"
    ],
    android_checks: [
      "root_detection",
      "busybox_presence",
      "su_binary_check",
      "build_tags_check",
      "dangerous_props"
    ]
  },

  runtime_protection: {
    debugger_detection: true,
    hook_detection: true,
    tamper_detection: true,
    integrity_checks: "app_signature_verification"
  },

  network_security: {
    certificate_pinning: true,
    no_proxy_allowed: true,
    vpn_detection: "warn_user",
    mitm_protection: true
  }
}
```

#### B. Anti-Tampering Implementation
```typescript
class DeviceThreatProtection {
  async performSecurityChecks(): Promise<SecurityStatus> {
    const checks = {
      jailbreak: await this.checkJailbreakStatus(),
      debugger: await this.checkDebuggerAttached(),
      integrity: await this.verifyAppIntegrity(),
      certificates: await this.verifyCertificates()
    };

    // Handle different threat levels
    if (checks.jailbreak.detected) {
      this.handleJailbreakDetected();
    }

    if (checks.debugger.attached) {
      this.preventDebuggerAccess();
    }

    return {
      secure: Object.values(checks).every(c => !c.detected),
      warnings: this.generateSecurityWarnings(checks),
      recommendations: this.getSecurityRecommendations(checks)
    };
  }

  private handleJailbreakDetected(): void {
    // Warn user about risks
    Alert.alert(
      'Security Warning',
      'Your device appears to be jailbroken/rooted. This may compromise the security of your mental health data.',
      [
        { text: 'I Understand the Risks', onPress: () => this.acceptRisk() },
        { text: 'Exit App', onPress: () => this.secureExit() }
      ]
    );

    // Enhance encryption for compromised devices
    this.cryptoManager.enableEnhancedMode();

    // Disable certain features
    this.disableHighRiskFeatures();
  }

  private async verifyAppIntegrity(): Promise<IntegrityCheck> {
    // Check app signature
    const signature = await this.getAppSignature();
    const valid = await this.verifySignature(signature);

    // Check for code modifications
    const codeIntegrity = await this.checkCodeIntegrity();

    return {
      signatureValid: valid,
      codeUnmodified: codeIntegrity.valid,
      detected: !valid || !codeIntegrity.valid
    };
  }
}
```

### User-Facing Description
**"Advanced Protection Against Digital Threats"**
- Continuous monitoring for security threats on your device
- Detection of jailbreaking/rooting that could compromise your data
- Protection against hackers trying to intercept your information
- Automatic security enhancements if risks are detected
- You're always informed about your security status

---

## 8. User-Friendly Security Features

### Technical Implementation with User Messaging

#### A. Privacy Dashboard
```typescript
interface PrivacyDashboard {
  display_elements: {
    security_score: {
      calculation: "based_on_enabled_features",
      visualization: "shield_icon_with_percentage",
      recommendations: "personalized_improvement_tips"
    },

    data_inventory: {
      categories: ["Assessments", "Mood Tracking", "Reflections"],
      storage_used: "visual_bar_chart",
      last_accessed: "human_readable_timeago"
    },

    privacy_controls: {
      export_history: "chronological_list",
      data_deletion: "guided_workflow"
    }
  }
}
```

#### B. User-Facing Security Messages
```typescript
const SecurityMessages = {
  encryption: {
    title: "Bank-Level Security",
    description: "Your mental health data is protected with the same encryption used by financial institutions",
    icon: "🔐"
  },

  local_only: {
    title: "Your Phone, Your Data",
    description: "Everything stays on your device. We can't see it, and neither can anyone else",
    icon: "📱"
  },

  crisis_access: {
    title: "Help Always Available",
    description: "Even with all our security, your crisis button is always one tap away",
    icon: "🆘"
  },

  export_control: {
    title: "Share on Your Terms",
    description: "You control exactly what to share with your therapist and how",
    icon: "📤"
  },

  deletion_rights: {
    title: "True Data Ownership",
    description: "Delete your data anytime. When it's gone, it's gone forever",
    icon: "🗑️"
  },

  threat_protection: {
    title: "Guardian Mode Active",
    description: "We're constantly watching for threats to keep your data safe",
    icon: "🛡️"
  }
};
```

#### C. Security Onboarding Flow
```typescript
class SecurityOnboarding {
  async presentToNewUser(): Promise<void> {
    const steps = [
      {
        title: "Welcome to Your Private Space",
        message: "Being. is designed with your privacy at its core. Let's set up your security preferences.",
        action: () => this.showPrivacyPrinciples()
      },
      {
        title: "Emergency Access",
        message: "Your crisis button will always work.",
        action: () => this.demonstrateCrisisAccess()
      },
      {
        title: "You're in Control",
        message: "You can change these settings anytime in your Privacy Dashboard.",
        action: () => this.completOnboarding()
      }
    ];

    await this.presentSteps(steps);
  }
}
```

---

## Implementation Priority & Roadmap

### Phase 1: Core Security (Week 1-2)
```yaml
critical_implementation:
  - [ ] AES-256-GCM encryption for clinical data
  - [ ] Secure key derivation (PBKDF2)
  - [ ] iOS Keychain / Android Keystore integration
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

### Technical Requirements
- ✅ AES-256 encryption for all sensitive data
- ✅ Hardware-backed key storage
- ✅ Secure data deletion
- ✅ Jailbreak/root detection
- ✅ Memory protection
- ✅ Secure export mechanisms
- ✅ Cryptographic ID generation (no Math.random() - see `@/core/utils/id`)

### Privacy Requirements
- ✅ No network transmission of personal data
- ✅ Complete local data isolation
- ✅ User-controlled data deletion
- ✅ Granular privacy controls
- ✅ Transparent data handling
- ✅ Crisis mode exceptions
- ✅ Export audit trail
- ✅ Clear user consent flows

### Mental Health Specific
- ✅ Crisis access always available
- ✅ Therapeutic relationship protection
- ✅ Anti-stigmatization measures
- ✅ Safe deletion with crisis check
- ✅ Provider-friendly export formats
- ✅ Trauma-informed security UX
- ✅ Recovery-oriented design
- ✅ Dignity preservation

---

## Testing Requirements

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
    // Verify crisis state checks
    // Confirm data unrecoverable
  });

  test('Threat detection', async () => {
    // Test jailbreak detection
    // Test debugger detection
    // Verify integrity checks
  });
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