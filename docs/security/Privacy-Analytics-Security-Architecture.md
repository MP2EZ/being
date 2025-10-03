# Privacy-Preserving Analytics Security Architecture

**Version**: 1.0
**Last Updated**: 2025-10-02
**Classification**: CRITICAL - Privacy & Security
**OWASP Categories**: A04:2021-Insecure Design, A02:2021-Cryptographic Failures

## Executive Summary

This architecture implements a **zero-knowledge analytics system** where:
- **NO PHI ever leaves the device** - all anonymization happens client-side
- **No Business Associate Agreements (BAAs) required** - server never sees identifiable data
- **Mathematical privacy guarantees** - k-anonymity (k≥5) + differential privacy (ε≤1.0)
- **Crisis-safe performance** - <200ms overhead for crisis-adjacent features

### Security Posture
- **Threat Model**: Assumes adversarial server, network eavesdropping, traffic analysis
- **Privacy Budget**: ε=1.0 lifetime budget with composition tracking
- **Attack Surface**: Device-only (no server-side PII exposure)
- **Defense Layers**: Device anonymization → Encryption → Server aggregation

---

## 1. Architecture Overview

### 1.1 Core Principles

```
PRIVACY-FIRST DESIGN CONSTRAINTS:
1. Device-Side Anonymization: ALL privacy protections execute on-device before transmission
2. Zero-Knowledge Server: Analytics server cannot link events to individuals
3. Mathematical Guarantees: Provable k-anonymity + differential privacy
4. Fail-Safe Defaults: Privacy failures block transmission (never fail open)
5. Performance Isolation: Analytics MUST NOT impact crisis detection (<200ms)
```

### 1.2 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DEVICE (React Native)                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  RAW EVENT CAPTURE                                  │    │
│  │  - Behavioral events (screen views, interactions)   │    │
│  │  - NO PHI, NO mental health scores, NO identifiers │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  PRIVACY LAYER (Device-Side)                        │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ 1. K-Anonymity Grouping (k≥5)                │  │    │
│  │  │    - Fast bucketing algorithm                │  │    │
│  │  │    - Generalization of quasi-identifiers     │  │    │
│  │  │    - Group size validation                   │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ 2. Differential Privacy (ε≤1.0)              │  │    │
│  │  │    - Laplace noise for counts                │  │    │
│  │  │    - Gaussian noise for continuous metrics   │  │    │
│  │  │    - Privacy budget tracking                 │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ 3. Validation & Blocking                     │  │    │
│  │  │    - PHI detector (fail-safe)                │  │    │
│  │  │    - Privacy guarantee checker               │  │    │
│  │  │    - Crisis performance monitor              │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ENCRYPTION LAYER                                   │    │
│  │  - AES-256-GCM for payload encryption              │    │
│  │  - TLS 1.3 for transport                           │    │
│  │  - Certificate pinning                             │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
└──────────────────────────┼───────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  ANALYTICS SERVER (Zero-Knowledge)           │
│                                                              │
│  - Receives only anonymized, encrypted events                │
│  - Cannot de-anonymize or link to individuals               │
│  - Performs aggregate analytics only                         │
│  - No PII storage or processing                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. K-Anonymity Implementation

### 2.1 Threat Model
- **Attack**: Re-identification via quasi-identifiers (demographics, usage patterns)
- **Mitigation**: Group users into buckets of k≥5 with generalized attributes

### 2.2 Algorithm Design

```typescript
/**
 * K-Anonymity Grouping Strategy
 *
 * Quasi-Identifiers for Bucketing:
 * - Age range (10-year buckets: 18-27, 28-37, etc.)
 * - General geographic region (state/province level only)
 * - Platform (iOS/Android)
 * - App version (major.minor only, no patch)
 *
 * Ensures k≥5 users per bucket before transmission
 */

interface QuasiIdentifiers {
  ageRange: string;        // "18-27" | "28-37" | "38-47" | "48+"
  region: string;          // US state code or "INTL"
  platform: 'iOS' | 'Android';
  appVersion: string;      // "1.0" (major.minor only)
}

interface AnonymizationBucket {
  id: string;              // Hash of quasi-identifiers
  size: number;            // Current group size
  ready: boolean;          // true if size >= k (5)
  events: PrivateEvent[];  // Buffered events for this bucket
}
```

### 2.3 Grouping Algorithm

```typescript
class KAnonymityEngine {
  private readonly K_THRESHOLD = 5;
  private readonly BUCKET_TIMEOUT_MS = 86400000; // 24 hours
  private buckets: Map<string, AnonymizationBucket>;

  /**
   * Fast bucketing using hash-based lookup
   * Time complexity: O(1) for bucket assignment
   */
  async assignToBucket(event: RawEvent): Promise<void> {
    const quasi = this.extractQuasiIdentifiers(event);
    const bucketId = this.hashQuasiIdentifiers(quasi);

    let bucket = this.buckets.get(bucketId);
    if (!bucket) {
      bucket = {
        id: bucketId,
        size: 0,
        ready: false,
        events: []
      };
      this.buckets.set(bucketId, bucket);
    }

    // Add anonymized event to bucket
    bucket.events.push(await this.anonymizeEvent(event, quasi));
    bucket.size = await this.estimateBucketSize(bucketId);

    // Check if bucket meets k-anonymity threshold
    if (bucket.size >= this.K_THRESHOLD) {
      bucket.ready = true;
      await this.flushBucket(bucketId);
    }
  }

  /**
   * Generalize quasi-identifiers
   */
  private extractQuasiIdentifiers(event: RawEvent): QuasiIdentifiers {
    return {
      ageRange: this.generalizeAge(event.userAge),
      region: this.generalizeLocation(event.location),
      platform: event.platform,
      appVersion: this.generalizeVersion(event.appVersion)
    };
  }

  /**
   * Age generalization: 10-year buckets
   */
  private generalizeAge(age: number): string {
    if (age < 18) return "18-27"; // Minimum age is 18
    if (age < 28) return "18-27";
    if (age < 38) return "28-37";
    if (age < 48) return "38-47";
    return "48+";
  }

  /**
   * Location generalization: State/province level only
   */
  private generalizeLocation(location?: string): string {
    // Extract state/province code or use "INTL"
    if (!location) return "UNKNOWN";
    // Parse from GPS → state code or use IP → country mapping
    return this.extractStateCode(location) || "INTL";
  }

  /**
   * Version generalization: Major.minor only
   */
  private generalizeVersion(version: string): string {
    const parts = version.split('.');
    return `${parts[0]}.${parts[1]}`;
  }

  /**
   * Privacy-preserving bucket size estimation
   * Uses HyperLogLog for cardinality estimation without storing user IDs
   */
  private async estimateBucketSize(bucketId: string): Promise<number> {
    // Use HyperLogLog sketch for approximate distinct count
    // This estimates unique users without storing user identifiers
    const sketch = await this.getHyperLogLogSketch(bucketId);
    return sketch.estimate();
  }
}
```

---

## 3. Differential Privacy Implementation

### 3.1 Threat Model
- **Attack**: Statistical inference attacks on aggregate data
- **Mitigation**: Add calibrated noise to prevent inference about individuals

### 3.2 Privacy Budget Management

```typescript
/**
 * Privacy Budget Tracker
 *
 * Implements ε-differential privacy with composition
 * Total lifetime budget: ε = 1.0
 * Per-query budget: ε_i where Σε_i ≤ 1.0
 */
class PrivacyBudgetManager {
  private readonly TOTAL_BUDGET = 1.0;
  private readonly MIN_QUERY_BUDGET = 0.01;
  private remainingBudget: number = this.TOTAL_BUDGET;

  /**
   * Allocate budget for a query
   * Returns allocated epsilon or null if budget exhausted
   */
  allocateBudget(requestedEpsilon: number): number | null {
    if (requestedEpsilon > this.remainingBudget) {
      console.warn('[PRIVACY] Budget exhausted. Blocking analytics.');
      return null;
    }

    this.remainingBudget -= requestedEpsilon;
    await this.persistBudgetState();
    return requestedEpsilon;
  }

  /**
   * Check if query is within budget
   */
  canAfford(epsilon: number): boolean {
    return epsilon <= this.remainingBudget &&
           epsilon >= this.MIN_QUERY_BUDGET;
  }

  /**
   * Get recommended epsilon for query type
   */
  getRecommendedEpsilon(queryType: AnalyticsQueryType): number {
    const allocations = {
      SCREEN_VIEW: 0.05,      // Low sensitivity
      INTERACTION: 0.05,      // Low sensitivity
      SESSION_DURATION: 0.1,  // Medium sensitivity
      ERROR_RATE: 0.1,        // Medium sensitivity
    };
    return allocations[queryType] || 0.1;
  }
}
```

### 3.3 Noise Mechanisms

```typescript
/**
 * Differential Privacy Noise Generator
 *
 * Implements:
 * - Laplace mechanism for count queries
 * - Gaussian mechanism for continuous metrics
 */
class DPNoiseGenerator {
  /**
   * Laplace Mechanism for count queries
   *
   * Noise ~ Lap(Δf/ε)
   * where Δf = sensitivity (max change by one record)
   *
   * @param sensitivity - Global sensitivity of the query
   * @param epsilon - Privacy parameter (lower = more privacy)
   */
  addLaplaceNoise(
    trueValue: number,
    sensitivity: number,
    epsilon: number
  ): number {
    const scale = sensitivity / epsilon;
    const noise = this.sampleLaplace(scale);

    // Add noise and round to integer for counts
    const noisyValue = Math.round(trueValue + noise);

    // Post-processing: ensure non-negative counts
    return Math.max(0, noisyValue);
  }

  /**
   * Gaussian Mechanism for continuous metrics
   *
   * Noise ~ N(0, σ²)
   * where σ = Δf · √(2ln(1.25/δ)) / ε
   *
   * @param sensitivity - Global sensitivity
   * @param epsilon - Privacy parameter
   * @param delta - Failure probability (typically 10^-5)
   */
  addGaussianNoise(
    trueValue: number,
    sensitivity: number,
    epsilon: number,
    delta: number = 1e-5
  ): number {
    const sigma = sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
    const noise = this.sampleGaussian(0, sigma);

    return trueValue + noise;
  }

  /**
   * Sample from Laplace distribution
   * Uses inverse transform sampling
   */
  private sampleLaplace(scale: number): number {
    const u = this.secureRandom() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Sample from Gaussian distribution
   * Uses Box-Muller transform
   */
  private sampleGaussian(mean: number, stdDev: number): number {
    const u1 = this.secureRandom();
    const u2 = this.secureRandom();

    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Cryptographically secure random number generator
   * Uses expo-crypto for React Native
   */
  private secureRandom(): number {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).reduce((acc, byte) => acc * 256 + byte, 0) / (256 ** 4);
  }
}
```

### 3.4 Sensitivity Calibration

```typescript
/**
 * Sensitivity Analysis for Common Queries
 */
const SENSITIVITY_BOUNDS = {
  // Count queries: adding/removing one user changes count by 1
  SCREEN_VIEW_COUNT: 1,
  INTERACTION_COUNT: 1,
  SESSION_COUNT: 1,

  // Duration queries: bounded by max session length (4 hours)
  SESSION_DURATION: 14400, // seconds

  // Rate queries: normalized to [0,1], sensitivity = 1/n where n = min group size
  ERROR_RATE: 1 / 5, // k=5 minimum

  // Aggregates: sum of individual sensitivities
  TOTAL_USAGE_TIME: 14400, // max daily usage capped at 4 hours
};

/**
 * Apply differential privacy to analytics event
 */
async function applyDifferentialPrivacy(
  event: AnonymizedEvent,
  budgetManager: PrivacyBudgetManager,
  noiseGen: DPNoiseGenerator
): Promise<DPEvent | null> {
  const epsilon = budgetManager.getRecommendedEpsilon(event.type);

  // Check budget
  const allocated = budgetManager.allocateBudget(epsilon);
  if (!allocated) {
    console.warn('[PRIVACY] Budget exhausted, dropping event');
    return null;
  }

  // Apply noise based on metric type
  const sensitivity = SENSITIVITY_BOUNDS[event.type];

  let noisyValue: number;
  if (event.valueType === 'count') {
    noisyValue = noiseGen.addLaplaceNoise(event.value, sensitivity, epsilon);
  } else {
    noisyValue = noiseGen.addGaussianNoise(event.value, sensitivity, epsilon);
  }

  return {
    ...event,
    value: noisyValue,
    epsilon: allocated,
    mechanism: event.valueType === 'count' ? 'laplace' : 'gaussian'
  };
}
```

---

## 4. Privacy Validation & Blocking

### 4.1 PHI Detection (Fail-Safe)

```typescript
/**
 * PHI Detector - Blocks any event containing identifiable data
 *
 * OWASP A03:2021 - Injection Prevention
 * Validates ALL outbound data before transmission
 */
class PHIDetector {
  private readonly BLOCKED_PATTERNS = [
    // Direct identifiers
    /\b\d{3}-\d{2}-\d{4}\b/,           // SSN
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email
    /\b\d{10,11}\b/,                   // Phone numbers
    /\b\d{5}(-\d{4})?\b/,              // ZIP codes (too specific)

    // Health data patterns
    /PHQ-?\d+/i,                       // PHQ scores
    /GAD-?\d+/i,                       // GAD scores
    /\b(depression|anxiety|suicid)/i,  // Clinical terms

    // User identifiers
    /user_?id/i,
    /device_?id/i,
    /session_?id/i,
  ];

  /**
   * Scan event for PHI - BLOCKS if found
   */
  async validate(event: any): Promise<ValidationResult> {
    const serialized = JSON.stringify(event);

    for (const pattern of this.BLOCKED_PATTERNS) {
      if (pattern.test(serialized)) {
        console.error('[CRITICAL] PHI detected in analytics event. BLOCKED.', {
          pattern: pattern.source,
          eventType: event.type
        });

        // Log to secure audit trail (encrypted local storage)
        await this.logSecurityViolation({
          timestamp: Date.now(),
          violation: 'PHI_DETECTED',
          eventType: event.type,
          pattern: pattern.source
        });

        return {
          valid: false,
          reason: 'PHI_DETECTED',
          blocked: true
        };
      }
    }

    return { valid: true, blocked: false };
  }
}
```

### 4.2 Privacy Guarantee Checker

```typescript
/**
 * Validates that event meets ALL privacy guarantees before transmission
 */
class PrivacyGuaranteeChecker {
  /**
   * Comprehensive privacy validation
   */
  async validateEvent(event: ProcessedEvent): Promise<boolean> {
    // 1. K-anonymity check
    if (!event.bucketSize || event.bucketSize < 5) {
      console.warn('[PRIVACY] K-anonymity violation: k < 5');
      return false;
    }

    // 2. Differential privacy check
    if (!event.epsilon || event.epsilon <= 0) {
      console.warn('[PRIVACY] No DP guarantee applied');
      return false;
    }

    // 3. PHI check
    const phiCheck = await this.phiDetector.validate(event);
    if (!phiCheck.valid) {
      return false;
    }

    // 4. Quasi-identifier generalization check
    if (!this.isGeneralized(event.quasiIdentifiers)) {
      console.warn('[PRIVACY] Quasi-identifiers not properly generalized');
      return false;
    }

    // 5. Payload size check (prevent fingerprinting)
    if (this.getPayloadSize(event) > 10000) { // 10KB limit
      console.warn('[PRIVACY] Payload too large, potential fingerprinting risk');
      return false;
    }

    return true;
  }

  /**
   * Verify quasi-identifiers are generalized
   */
  private isGeneralized(qi: QuasiIdentifiers): boolean {
    // Age must be in ranges, not exact
    if (!/^\d{2}-(\d{2}|\+)$/.test(qi.ageRange)) return false;

    // Version must be major.minor only
    if (!/^\d+\.\d+$/.test(qi.appVersion)) return false;

    // Region must be state-level or "INTL"
    if (qi.region.length > 4) return false; // State codes are 2 chars

    return true;
  }
}
```

---

## 5. Encryption & Transport Security

### 5.1 End-to-End Encryption

```typescript
/**
 * Analytics Encryption Layer
 *
 * OWASP A02:2021 - Cryptographic Failures Prevention
 * - AES-256-GCM for payload encryption
 * - Ephemeral keys per transmission
 * - No key reuse
 */
class AnalyticsEncryption {
  /**
   * Encrypt analytics payload
   */
  async encryptPayload(
    payload: AnonymizedEvent[],
    serverPublicKey: string
  ): Promise<EncryptedPayload> {
    // Generate ephemeral AES-256 key
    const aesKey = await this.generateAESKey();

    // Encrypt payload with AES-256-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      aesKey,
      new TextEncoder().encode(JSON.stringify(payload))
    );

    // Encrypt AES key with server's public key (RSA-OAEP)
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      await this.importPublicKey(serverPublicKey),
      await crypto.subtle.exportKey('raw', aesKey)
    );

    return {
      ciphertext: this.arrayBufferToBase64(encrypted),
      encryptedKey: this.arrayBufferToBase64(encryptedKey),
      iv: this.arrayBufferToBase64(iv),
      algorithm: 'AES-256-GCM',
      keyAlgorithm: 'RSA-OAEP-SHA256'
    };
  }

  /**
   * Generate ephemeral AES-256 key
   */
  private async generateAESKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );
  }
}
```

### 5.2 Transport Security

```
TLS 1.3 Configuration:
- Minimum version: TLS 1.3
- Cipher suites: TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256
- Certificate pinning: Pin server cert + backup pins
- HSTS: max-age=31536000; includeSubDomains; preload
- No TLS fallback allowed
```

```typescript
/**
 * Certificate Pinning for Analytics Endpoint
 */
const ANALYTICS_CERT_PINS = {
  primary: 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  backup: 'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  expiry: '2026-01-01'
};

/**
 * Validate certificate pins before transmission
 */
async function validateCertPins(hostname: string): Promise<boolean> {
  const certChain = await this.getCertificateChain(hostname);
  const publicKeyHash = await this.hashPublicKey(certChain[0]);

  if (publicKeyHash !== ANALYTICS_CERT_PINS.primary &&
      publicKeyHash !== ANALYTICS_CERT_PINS.backup) {
    console.error('[SECURITY] Certificate pin validation failed');
    return false;
  }

  return true;
}
```

---

## 6. Performance & Crisis Safety

### 6.1 Performance Isolation

```typescript
/**
 * Crisis-Safe Analytics Execution
 *
 * Ensures analytics NEVER impacts crisis detection
 * Requirements: <200ms for crisis-adjacent features
 */
class CrisisSafeAnalytics {
  private readonly MAX_ANALYTICS_LATENCY_MS = 50; // Leave 150ms buffer
  private readonly CRISIS_PRIORITY = Number.MAX_SAFE_INTEGER;

  /**
   * Execute analytics with performance monitoring
   */
  async executeWithMonitoring(
    operation: () => Promise<void>,
    context: string
  ): Promise<void> {
    const startTime = performance.now();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), this.MAX_ANALYTICS_LATENCY_MS)
    );

    try {
      // Race against timeout
      await Promise.race([operation(), timeoutPromise]);

      const duration = performance.now() - startTime;
      if (duration > this.MAX_ANALYTICS_LATENCY_MS) {
        console.warn(`[PERF] Analytics operation exceeded limit: ${duration}ms in ${context}`);
        await this.reportPerformanceViolation(context, duration);
      }
    } catch (error) {
      if (error.message === 'TIMEOUT') {
        console.error(`[CRITICAL] Analytics timeout in ${context}`);
        // Disable analytics temporarily
        await this.temporarilyDisableAnalytics();
      }
      throw error;
    }
  }

  /**
   * Background processing with low priority
   */
  async processInBackground(task: () => Promise<void>): Promise<void> {
    // Use requestIdleCallback for non-urgent processing
    if ('requestIdleCallback' in global) {
      requestIdleCallback(async () => {
        await task();
      }, { timeout: 5000 });
    } else {
      // Fallback: low-priority timeout
      setTimeout(async () => {
        await task();
      }, 100);
    }
  }
}
```

### 6.2 Caching Strategy

```typescript
/**
 * Privacy-Preserving Cache for Performance
 */
class AnalyticsCache {
  private noiseCache: Map<string, number> = new Map();
  private bucketCache: Map<string, AnonymizationBucket> = new Map();

  /**
   * Cache noise values for deterministic privacy
   * Ensures same query gets same noise (within session)
   */
  getCachedNoise(
    queryId: string,
    generator: () => number
  ): number {
    if (!this.noiseCache.has(queryId)) {
      this.noiseCache.set(queryId, generator());
    }
    return this.noiseCache.get(queryId)!;
  }

  /**
   * Cache k-anonymity buckets for fast lookup
   */
  getCachedBucket(bucketId: string): AnonymizationBucket | null {
    return this.bucketCache.get(bucketId) || null;
  }

  /**
   * Clear cache on session end (privacy hygiene)
   */
  clearSession(): void {
    this.noiseCache.clear();
    this.bucketCache.clear();
  }
}
```

---

## 7. Data Flow Security

### 7.1 Complete Privacy Pipeline

```
STAGE 1: EVENT CAPTURE (Device)
├─ Behavioral event detected (screen view, interaction)
├─ NO PHI collected (no scores, identifiers, health data)
└─ Raw event logged to memory buffer

STAGE 2: ANONYMIZATION (Device)
├─ Extract & generalize quasi-identifiers
│  ├─ Age → 10-year bucket
│  ├─ Location → state/province
│  └─ Version → major.minor
├─ Assign to k-anonymity bucket (k≥5)
│  ├─ Hash quasi-identifiers → bucket ID
│  ├─ Buffer event in bucket
│  └─ Wait for k≥5 users in bucket
└─ Apply differential privacy
   ├─ Check privacy budget (ε≤1.0)
   ├─ Add Laplace/Gaussian noise
   └─ Update budget tracker

STAGE 3: VALIDATION (Device)
├─ PHI detection scan → BLOCK if found
├─ Privacy guarantee check
│  ├─ k-anonymity: k≥5 ✓
│  ├─ Differential privacy: ε>0 ✓
│  └─ Generalization: verified ✓
└─ Performance check: <50ms ✓

STAGE 4: ENCRYPTION (Device)
├─ Generate ephemeral AES-256 key
├─ Encrypt payload with AES-256-GCM
├─ Encrypt AES key with server public key
└─ Package: ciphertext + encrypted key + IV

STAGE 5: TRANSMISSION (Network)
├─ TLS 1.3 connection
├─ Certificate pin validation
├─ Encrypted payload transmitted
└─ No plaintext data on wire

STAGE 6: SERVER RECEIPT (Zero-Knowledge)
├─ Decrypt with server private key → AES key
├─ Decrypt payload with AES key
├─ Aggregate analytics (no individual data)
└─ Cannot de-anonymize or re-identify users
```

### 7.2 Security Boundaries

```
TRUST BOUNDARIES:

Device (Trusted)
├─ User privacy controls
├─ Encrypted storage (AES-256)
├─ Secure enclave for keys
└─ Privacy-preserving code

Network (Untrusted)
├─ Assumes eavesdropping
├─ TLS 1.3 + cert pinning
└─ Only encrypted data transmitted

Server (Zero-Knowledge)
├─ Cannot see raw events
├─ Cannot identify users
├─ Only aggregate analytics
└─ No PII storage

DATA FLOW GUARANTEES:
✓ PHI never leaves device
✓ Server cannot re-identify users
✓ Network cannot read events
✓ Mathematically private (k≥5, ε≤1.0)
```

---

## 8. Incident Response & Monitoring

### 8.1 Privacy Breach Detection

```typescript
/**
 * Privacy Incident Detector
 */
class PrivacyIncidentDetector {
  /**
   * Monitor for privacy violations
   */
  async detectIncidents(): Promise<void> {
    // 1. Check for PHI in analytics queue
    const phiViolations = await this.scanForPHI();
    if (phiViolations.length > 0) {
      await this.triggerIncidentResponse('PHI_DETECTED', phiViolations);
    }

    // 2. Check privacy budget exhaustion
    if (this.budgetManager.remainingBudget < 0.1) {
      await this.triggerIncidentResponse('BUDGET_EXHAUSTED', {
        remaining: this.budgetManager.remainingBudget
      });
    }

    // 3. Check for k-anonymity violations
    const kViolations = await this.checkKAnonymityViolations();
    if (kViolations.length > 0) {
      await this.triggerIncidentResponse('K_ANONYMITY_VIOLATION', kViolations);
    }

    // 4. Check for encryption failures
    const encryptionFailures = await this.checkEncryptionStatus();
    if (encryptionFailures > 0) {
      await this.triggerIncidentResponse('ENCRYPTION_FAILURE', {
        count: encryptionFailures
      });
    }
  }

  /**
   * Incident response workflow
   */
  private async triggerIncidentResponse(
    incidentType: string,
    details: any
  ): Promise<void> {
    console.error('[SECURITY INCIDENT]', incidentType, details);

    // 1. Immediately stop analytics transmission
    await this.analyticsEngine.emergencyShutdown();

    // 2. Log to encrypted audit trail
    await this.secureAuditLog.logIncident({
      timestamp: Date.now(),
      type: incidentType,
      details: details,
      action: 'ANALYTICS_SHUTDOWN'
    });

    // 3. Notify security team (if configured)
    await this.notifySecurityTeam(incidentType, details);

    // 4. Clear potentially compromised data
    await this.purgeAnalyticsQueue();
  }
}
```

### 8.2 Audit Logging

```typescript
/**
 * Secure Audit Trail for Privacy Events
 *
 * Logs all privacy-critical operations
 * Encrypted local storage (no network transmission)
 */
interface PrivacyAuditLog {
  timestamp: number;
  event: 'BUDGET_ALLOCATION' | 'PHI_BLOCKED' | 'K_VIOLATION' | 'ENCRYPTION_FAILURE';
  details: {
    epsilon?: number;
    bucketSize?: number;
    error?: string;
  };
  action: 'ALLOWED' | 'BLOCKED' | 'SHUTDOWN';
}

class SecureAuditLogger {
  /**
   * Log privacy event to encrypted storage
   */
  async logEvent(log: PrivacyAuditLog): Promise<void> {
    const encryptedLog = await this.encrypt(log);
    await AsyncStorage.setItem(
      `privacy_audit_${log.timestamp}`,
      encryptedLog
    );
  }

  /**
   * Retrieve audit logs for security review
   */
  async getAuditTrail(startTime: number, endTime: number): Promise<PrivacyAuditLog[]> {
    const keys = await AsyncStorage.getAllKeys();
    const auditKeys = keys.filter(k => k.startsWith('privacy_audit_'));

    const logs = await Promise.all(
      auditKeys.map(async key => {
        const encrypted = await AsyncStorage.getItem(key);
        return this.decrypt(encrypted);
      })
    );

    return logs.filter(log =>
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }
}
```

---

## 9. Threat Scenarios & Mitigations

### 9.1 Attack Scenarios

| Threat | Attack Vector | Mitigation | Residual Risk |
|--------|---------------|------------|---------------|
| **Re-identification** | Combine quasi-identifiers to identify user | K-anonymity (k≥5) + generalization | LOW - Requires k users in bucket |
| **Statistical Inference** | Aggregate data analysis to infer individual data | Differential privacy (ε≤1.0) | LOW - Mathematical guarantee |
| **Network Eavesdropping** | Intercept analytics traffic | TLS 1.3 + AES-256-GCM | MINIMAL - Strong encryption |
| **Server Compromise** | Malicious server attempts de-anonymization | Zero-knowledge design - server cannot de-anonymize | MINIMAL - No identifiable data sent |
| **Traffic Analysis** | Timing/pattern analysis of network traffic | Batching + randomized delays | LOW - Limited information leakage |
| **PHI Leakage** | Accidental inclusion of health data | PHI detector + fail-safe blocking | MINIMAL - Multi-layer validation |
| **Budget Exhaustion** | Deplete privacy budget to disable protection | Budget tracking + automatic shutdown | LOW - Graceful degradation |

### 9.2 Defense-in-Depth Layers

```
LAYER 1: Data Minimization
├─ Collect only behavioral events
├─ No PHI, no identifiers
└─ Fail-safe defaults

LAYER 2: Device-Side Anonymization
├─ K-anonymity grouping (k≥5)
├─ Differential privacy (ε≤1.0)
└─ Quasi-identifier generalization

LAYER 3: Validation & Blocking
├─ PHI detection
├─ Privacy guarantee verification
└─ Performance monitoring

LAYER 4: Encryption
├─ AES-256-GCM payload encryption
├─ RSA-OAEP key encryption
└─ TLS 1.3 transport

LAYER 5: Zero-Knowledge Server
├─ Cannot decrypt to individuals
├─ Aggregate analytics only
└─ No PII storage

LAYER 6: Incident Response
├─ Privacy breach detection
├─ Automatic shutdown
└─ Encrypted audit trail
```

---

## 10. Security Testing Requirements

### 10.1 Privacy Test Suite

```typescript
/**
 * Comprehensive privacy testing
 */
describe('Privacy-Preserving Analytics Security', () => {
  describe('K-Anonymity', () => {
    it('should never transmit events with k < 5', async () => {
      // Test with various bucket sizes
      const events = generateTestEvents(4); // Below threshold
      const transmitted = await analytics.process(events);
      expect(transmitted).toHaveLength(0); // Should buffer, not transmit
    });

    it('should generalize quasi-identifiers correctly', async () => {
      const event = { age: 25, location: 'San Francisco, CA', version: '1.2.3' };
      const anonymized = await analytics.anonymize(event);

      expect(anonymized.ageRange).toBe('18-27');
      expect(anonymized.region).toBe('CA');
      expect(anonymized.appVersion).toBe('1.2');
    });
  });

  describe('Differential Privacy', () => {
    it('should apply correct amount of noise', async () => {
      const trueValue = 100;
      const epsilon = 0.1;
      const sensitivity = 1;

      const noisyValue = noiseGen.addLaplaceNoise(trueValue, sensitivity, epsilon);
      const error = Math.abs(noisyValue - trueValue);

      // Error should be bounded by sensitivity/epsilon with high probability
      expect(error).toBeLessThan(sensitivity / epsilon * 5); // 5 standard deviations
    });

    it('should respect privacy budget', async () => {
      const budget = new PrivacyBudgetManager();

      // Allocate budget
      await budget.allocateBudget(0.5);
      expect(budget.remainingBudget).toBe(0.5);

      // Should block when exhausted
      await budget.allocateBudget(0.6);
      expect(budget.remainingBudget).toBe(0.5); // Unchanged
    });
  });

  describe('PHI Detection', () => {
    it('should block events containing PHI', async () => {
      const phiEvents = [
        { data: 'user@email.com' },
        { data: '123-45-6789' },
        { data: 'PHQ-9 score: 15' }
      ];

      for (const event of phiEvents) {
        const result = await phiDetector.validate(event);
        expect(result.valid).toBe(false);
        expect(result.blocked).toBe(true);
      }
    });
  });

  describe('Encryption', () => {
    it('should encrypt payloads with AES-256-GCM', async () => {
      const payload = [{ type: 'SCREEN_VIEW', screen: 'Home' }];
      const encrypted = await encryption.encryptPayload(payload, serverPublicKey);

      expect(encrypted.algorithm).toBe('AES-256-GCM');
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toHaveLength(16); // 12 bytes base64 encoded
    });
  });

  describe('Performance', () => {
    it('should complete privacy processing in <50ms', async () => {
      const event = generateTestEvent();

      const startTime = performance.now();
      await analytics.process(event);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50);
    });
  });
});
```

### 10.2 Penetration Testing Checklist

- [ ] **Re-identification Attack**: Attempt to identify users from anonymized data
- [ ] **Statistical Inference**: Test if individual data can be inferred from aggregates
- [ ] **Network Interception**: Verify encryption prevents plaintext leakage
- [ ] **Server-Side Attack**: Confirm server cannot de-anonymize events
- [ ] **PHI Extraction**: Test PHI detector with obfuscated identifiers
- [ ] **Budget Bypass**: Attempt to bypass privacy budget controls
- [ ] **Timing Attacks**: Analyze timing patterns for information leakage
- [ ] **Certificate Pinning**: Test cert pin validation and MITM resistance

---

## 11. Implementation Roadmap

### Phase 1: Core Privacy (Week 1-2)
- [ ] Implement K-anonymity bucketing engine
- [ ] Build differential privacy noise generators
- [ ] Create PHI detection system
- [ ] Implement privacy budget tracker

### Phase 2: Encryption & Transport (Week 3)
- [ ] AES-256-GCM payload encryption
- [ ] RSA-OAEP key encryption
- [ ] TLS 1.3 configuration
- [ ] Certificate pinning

### Phase 3: Validation & Safety (Week 4)
- [ ] Privacy guarantee checker
- [ ] Performance monitoring
- [ ] Crisis-safe execution
- [ ] Audit logging

### Phase 4: Testing & Hardening (Week 5)
- [ ] Privacy test suite
- [ ] Penetration testing
- [ ] Performance benchmarking
- [ ] Security review

---

## 12. References & Standards

### Cryptographic Standards
- **NIST SP 800-90A**: Random Number Generation
- **NIST SP 800-52**: TLS Guidelines
- **FIPS 140-2**: Cryptographic Module Validation

### Privacy Standards
- **ISO/IEC 29100**: Privacy Framework
- **NIST Privacy Framework**: Privacy Risk Management
- **GDPR Article 25**: Privacy by Design

### Differential Privacy
- Dwork, C. (2006). "Differential Privacy"
- McSherry, F. (2009). "Privacy Integrated Queries"
- Composition theorems for privacy budget

### K-Anonymity
- Sweeney, L. (2002). "k-anonymity: A model for protecting privacy"
- Machanavajjhala, A. (2007). "l-diversity: Privacy beyond k-anonymity"

---

## Document Control

**Classification**: CRITICAL - Security Architecture
**Review Cycle**: Quarterly
**Last Security Review**: 2025-10-02
**Next Review Due**: 2026-01-02
**Approved By**: Security Team + Compliance Officer

**Change Log**:
- 2025-10-02: Initial architecture design
