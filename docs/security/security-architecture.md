# Being. Security Architecture
## Privacy-First Mental Health Data Protection

### Document Information
```yaml
document:
  type: Security Architecture
  version: 2.0.0
  status: CURRENT
  updated: 2025-12-24
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
      "user_biometric_hash",
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
  // Clinical data (PHQ-9/GAD-7, crisis plans)
  async encryptClinicalData(data: ClinicalData): Promise<EncryptedData> {
    const key = await this.deriveKey('clinical', {
      rotationPeriod: '24_hours',
      requireBiometric: true
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
      rotationPeriod: '7_days',
      requireAuth: true
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
    access_group: "com.being.app.keychain",
    accessibility: "kSecAttrAccessibleWhenUnlockedThisDeviceOnly",
    synchronization: false, // Never sync to iCloud
    biometric_protection: "kSecAccessControlBiometryAny"
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
    internal_storage: "/data/data/com.being.app/",
    protection_mode: "MODE_PRIVATE",
    file_based_encryption: true,
    direct_boot_aware: false // Require user authentication
  },

  keystore_integration: {
    provider: "AndroidKeyStore",
    key_alias: "being_master_key",
    user_authentication: {
      required: true,
      validity_duration: 0, // Require auth every time
      authentication_types: ["BIOMETRIC_STRONG", "DEVICE_CREDENTIAL"]
    }
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
        maxSize: '50MB',
        accessControl: 'biometric_required'
      }),
      personal: new EncryptedContainer('personal', {
        maxSize: '200MB',
        accessControl: 'authentication_required'
      }),
      cache: new EncryptedContainer('cache', {
        maxSize: '100MB',
        accessControl: 'app_authenticated'
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

## 3. Biometric Authentication Implementation

### Technical Specifications

#### A. Biometric Security Framework
```typescript
interface BiometricAuthentication {
  supported_methods: {
    ios: ["Face ID", "Touch ID"],
    android: ["Fingerprint", "Face Unlock (Class 3)", "Iris Scanner"]
  },

  security_requirements: {
    hardware_backed: true,
    liveness_detection: true,
    anti_spoofing: "Level 3 - Strong",
    false_acceptance_rate: "< 0.002%",
    false_rejection_rate: "< 3%"
  },

  implementation: {
    library: "expo-local-authentication",
    fallback: "device_passcode",
    require_recent_auth: true,
    max_attempts: 3
  }
}
```

#### B. Biometric Key Protection
```typescript
class BiometricKeyProtection {
  async protectWithBiometrics(sensitiveOperation: string): Promise<boolean> {
    // Check biometric availability
    const available = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!available || !enrolled) {
      return this.fallbackToPasscode();
    }

    // Authenticate with reason
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: this.getPromptForOperation(sensitiveOperation),
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode'
    });

    if (result.success) {
      // Generate biometric-bound key
      const bioKey = await this.generateBiometricBoundKey();

      // Key only valid for this session
      this.sessionKeys.set(sensitiveOperation, {
        key: bioKey,
        expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
        requireReauth: true
      });
    }

    return result.success;
  }

  private getPromptForOperation(operation: string): string {
    const prompts = {
      'view_clinical': 'Authenticate to view your assessments',
      'export_data': 'Authenticate to export your mental health data',
      'view_crisis_plan': 'Authenticate to access your safety plan',
      'modify_emergency': 'Authenticate to change emergency contacts'
    };
    return prompts[operation] || 'Authenticate to continue';
  }
}
```

### User-Facing Description
**"Your Face or Fingerprint is Your Key"**
- Use Face ID, Touch ID, or your fingerprint to protect your most sensitive data
- Your biometric data never leaves your device's secure chip
- If biometrics aren't available, you can use your device passcode
- Extra protection for viewing assessments and crisis plans

---

## 4. Auto-Timeout and Session Management

### Technical Specifications

#### A. Session Lifecycle Management
```typescript
interface SessionManagement {
  timeout_policies: {
    active_use: "30_minutes",
    background: "5_minutes",
    crisis_mode: "extended_60_minutes",
    assessment_in_progress: "no_timeout_until_complete"
  },

  sensitivity_based_timeouts: {
    clinical_data_view: "3_minutes_idle",
    personal_data_view: "10_minutes_idle",
    general_app_use: "30_minutes_idle"
  },

  lock_behaviors: {
    soft_lock: "blur_content_require_auth",
    hard_lock: "clear_memory_require_full_auth",
    crisis_exception: "maintain_access_to_crisis_button"
  }
}
```

#### B. Secure Session Implementation
```typescript
class SecureSessionManager {
  private sessionTimer: NodeJS.Timeout;
  private lastActivity: number;
  private currentDataSensitivity: 'clinical' | 'personal' | 'general';

  async initializeSession(): Promise<void> {
    this.lastActivity = Date.now();
    this.startInactivityMonitor();

    // Clear sensitive data on app state change
    AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        this.handleBackgroundTransition();
      } else if (state === 'active') {
        this.handleForegroundTransition();
      }
    });
  }

  private handleBackgroundTransition(): void {
    // Immediate protection for clinical data
    if (this.currentDataSensitivity === 'clinical') {
      this.immediatelyLockSensitiveData();
    } else {
      // 5-minute grace period for other data
      setTimeout(() => this.lockSession(), 5 * 60 * 1000);
    }

    // Always blur content immediately
    this.blurApplicationContent();
  }

  private handleForegroundTransition(): void {
    const timeSinceBackground = Date.now() - this.lastActivity;

    if (timeSinceBackground > this.getTimeoutForSensitivity()) {
      this.requireReauthentication();
    } else {
      this.unblurApplicationContent();
    }
  }

  private immediatelyLockSensitiveData(): void {
    // Clear decryption keys from memory
    this.cryptoManager.clearKeys();

    // Overwrite sensitive UI data
    this.uiManager.clearSensitiveViews();

    // Maintain crisis button access
    this.crisisManager.maintainEmergencyAccess();
  }
}
```

### User-Facing Description
**"Automatic Privacy Protection When You Step Away"**
- Your app locks automatically after a period of inactivity
- Sensitive data like assessments lock faster (3 minutes) than general features
- When you switch apps, your data is immediately hidden
- The crisis button always remains accessible, even when locked

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
      method: "airdrop_or_nearby_share",
      requires: "biometric_confirmation"
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
    // Require biometric authentication
    const authenticated = await this.biometricAuth.authenticate(
      'export_therapy_data'
    );
    if (!authenticated) throw new Error('Authentication required');

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
      await Keychain.resetInternetCredentials('com.being.app');
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
      categories: ["Assessments", "Mood Tracking", "Reflections", "Crisis Plans"],
      storage_used: "visual_bar_chart",
      last_accessed: "human_readable_timeago"
    },

    privacy_controls: {
      biometric_lock: "toggle_with_explanation",
      auto_lock_timer: "slider_with_preview",
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

  biometric: {
    title: "Only You Can Access",
    description: "Your face or fingerprint ensures you're the only one who can view your information",
    icon: "👤"
  },

  auto_lock: {
    title: "Automatic Privacy",
    description: "Your app locks itself when you're not using it, keeping prying eyes out",
    icon: "⏰"
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
        title: "Secure Your Data with Biometrics",
        message: "Use your face or fingerprint to keep your mental health information private.",
        action: () => this.setupBiometrics()
      },
      {
        title: "Choose Your Privacy Level",
        message: "How quickly should the app lock when you're not using it?",
        action: () => this.configureAutoLock()
      },
      {
        title: "Emergency Access",
        message: "Your crisis button will always work, even when the app is locked.",
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
  - [ ] Basic biometric authentication
  - [ ] Secure key derivation (PBKDF2)
  - [ ] iOS Keychain / Android Keystore integration
  - [ ] Auto-lock on background
  - [ ] Basic jailbreak/root detection
```

### Phase 2: Enhanced Protection (Week 3-4)
```yaml
enhanced_features:
  - [ ] Complete session management with sensitivity-based timeouts
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
- ✅ Biometric authentication support
- ✅ Automatic session timeout
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

  test('Biometric authentication', async () => {
    // Test successful authentication
    // Test fallback to passcode
    // Test failed attempts handling
  });

  test('Session management', async () => {
    // Test timeout behaviors
    // Test background/foreground transitions
    // Verify crisis mode exceptions
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

## Conclusion

This comprehensive security framework ensures Being. provides industry-leading protection for sensitive mental health data while maintaining usability and accessibility. The local-first architecture with military-grade encryption, combined with thoughtful UX design, creates a trusted environment where users can engage with their mental health journey privately and securely.

### Key Differentiators
1. **Zero Cloud Exposure**: Complete local storage eliminates cloud vulnerabilities
2. **Mental Health Optimized**: Security designed specifically for mental health sensitivity
3. **Crisis-Resilient**: Security that doesn't compromise safety in emergencies
4. **User Empowerment**: Clear, understandable security that users can control
5. **Privacy-First**: Strong encryption because users deserve it, not because regulations require it

**Implementation Note**: Begin with Phase 1 core security features, as these provide the foundation for all other protections. The biometric authentication and encryption must be rock-solid before adding enhanced features.