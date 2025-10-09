# Encryption Audit Execution Guide - Being MBCT App

**Purpose**: Step-by-step guide for conducting the MAINT-17 encryption validation audit
**Timeline**: 1-2 weeks
**Deliverables**: 4 documentation files + validation report

---

## Overview

This guide provides the methodology for auditing encryption in Being, a React Native/Expo mental health app handling Protected Health Information (PHI). The audit validates HIPAA-compliant encryption at rest and in transit.

**Critical Context**: Being stores sensitive mental health data (PHQ-9/GAD-7 assessments, mood check-ins, crisis contacts). Missing or weak encryption = HIPAA violation + data breach liability.

---

## Phase 1: Discovery & Code Audit (Days 1-3)

### Step 1.1: Identify Encryption Libraries

```bash
# Check package.json for encryption dependencies
cat package.json | grep -E "(secure|encrypt|crypto|storage)"

# Expected libraries:
# - expo-secure-store OR react-native-encrypted-storage
# - @supabase/supabase-js (for HTTPS API)
# - react-native-get-random-values (for secure random)
```

### Step 1.2: Locate Storage Implementation

```bash
# Find all AsyncStorage usage
grep -r "AsyncStorage" app/src/ --include="*.ts" --include="*.tsx"

# Find encryption wrapper usage
grep -r -E "(SecureStore|EncryptedStorage)" app/src/

# Check for direct storage (potential gaps)
grep -r "setItem\|getItem" app/src/ | grep -v "SecureStore\|EncryptedStorage"
```

### Step 1.3: Audit Data Storage Points

**Critical files to review**:
- `app/src/store/` - Zustand stores (assessment, checkIn, crisis, user)
- `app/src/services/` - Data persistence services
- `app/src/utils/storage.ts` - Storage utilities (if exists)

**For each PHI storage location**:
1. Verify encryption wrapper is used
2. Confirm no plaintext fallback
3. Check encryption happens BEFORE storage
4. Validate decryption happens AFTER retrieval

### Step 1.4: Audit Network Implementation

```bash
# Find all API endpoints
grep -r -E "(fetch|axios|supabase)" app/src/ --include="*.ts" --include="*.tsx"

# Check for HTTP (should find NONE)
grep -r "http://" app/src/ --exclude-dir=node_modules

# Verify Supabase configuration
cat app/src/lib/supabase.ts
```

**Validation checklist**:
- [ ] All Supabase URLs use `https://`
- [ ] No HTTP fallback logic
- [ ] No disabled SSL validation
- [ ] No PHI in URL parameters

---

## Phase 2: Static Code Analysis (Days 4-5)

### Step 2.1: Search for Anti-Patterns

```bash
# CRITICAL: Hardcoded encryption keys
grep -r "const.*KEY\|SECRET.*=" app/src/ | grep -v "node_modules"

# CRITICAL: PHI in logs
grep -r "console.log" app/src/features/assessment/
grep -r "console.log" app/src/features/check-in/
grep -r "logger.*phq\|logger.*gad\|logger.*score" app/src/

# HIGH: Weak random generation
grep -r "Math.random" app/src/ | grep -v "node_modules\|__tests__"

# MEDIUM: Conditional encryption (dev vs prod)
grep -r "__DEV__.*encrypt\|if.*DEV.*encrypt" app/src/
```

### Step 2.2: Review Key Management

**Look for**:
1. Key generation logic (should use `Crypto.getRandomBytesAsync` or equivalent)
2. Key storage (should use SecureStore/Keychain, NOT AsyncStorage)
3. Key deletion on logout
4. No keys in environment variables or config files

```bash
# Find key generation
grep -r "generateKey\|randomBytes\|getRandomBytesAsync" app/src/

# Find key storage
grep -r "SecureStore.*setItem.*key" app/src/

# Check for keys in env files
grep -i "key\|secret" .env* app.json eas.json
```

---

## Phase 3: Dynamic Testing (Days 6-8)

### Step 3.1: iOS Storage Inspection

**Requirements**: Physical iOS device or Simulator, Xcode

```bash
# 1. Build and run app on iOS Simulator
npx expo run:ios

# 2. Complete PHQ-9 assessment (creates encrypted data)

# 3. Get app container path
xcrun simctl get_app_container booted [BUNDLE_ID] data

# 4. Inspect storage
cd "$(xcrun simctl get_app_container booted [BUNDLE_ID] data)"
cd Library/Preferences/

# 5. Check for plaintext PHI
plutil -p *.plist | grep -i "phq\|gad\|mood\|score"
# Expected: No readable PHI found

# 6. Verify Keychain usage (Simulator only)
# Real device requires jailbreak or Xcode debugger
```

### Step 3.2: Android Storage Inspection

**Requirements**: Android Emulator or physical device with USB debugging

```bash
# 1. Build and run app
npx expo run:android

# 2. Complete PHQ-9 assessment

# 3. Inspect app storage
adb shell
run-as [PACKAGE_NAME]
cd shared_prefs/
cat *.xml | grep -i "phq\|gad\|score\|mood"
# Expected: Encrypted or no PHI found

# 4. Check encrypted storage
cd ../files/
ls -la
# Look for: RNEncryptedStorage or similar encrypted file
strings RNEncryptedStorage | head -50
# Should NOT show readable PHI
```

### Step 3.3: Network Traffic Analysis

**Requirements**: Proxyman (macOS) or Charles Proxy

**Setup**:
1. Install Proxyman: `brew install --cask proxyman`
2. Open Proxyman → Certificate → Install on iOS Simulator
3. Enable SSL Proxying for `*.supabase.co`
4. Start recording

**Test scenarios**:

**Scenario 1: PHQ-9 Submission**
```
Action: Complete PHQ-9, tap Submit
Verify:
✅ URL: https://[project].supabase.co/rest/v1/assessments
✅ Method: POST
✅ Protocol: TLS 1.2 or 1.3
✅ Body: JSON with encrypted/tokenized data
❌ No PHI in URL query parameters
❌ No PHI in headers (except Authorization bearer token)
```

**Scenario 2: Mood Check-in**
```
Action: Save mood entry
Verify:
✅ HTTPS endpoint
✅ TLS 1.2+
✅ No analytics calls with PHI
```

**Scenario 3: Analytics/Error Tracking**
```
Action: Trigger app event or error
Verify:
❌ NO PHI in analytics payloads
❌ NO PHI in error messages
✅ Only non-identifiable events (e.g., "assessment_completed")
```

---

## Phase 4: Compliance Validation (Days 9-10)

### Step 4.1: Complete HIPAA Compliance Matrix

Use template in `hipaa-encryption-compliance.md`:

**For each data type**:
1. Document encryption method (AES-256, TLS 1.2+, etc.)
2. Verify algorithm meets HIPAA standards
3. Identify any gaps
4. Prioritize remediation (CRITICAL/HIGH/MEDIUM/LOW)

**Status options**:
- ✅ COMPLIANT: Meets HIPAA requirements
- ⚠️ GAP: Functional but needs improvement
- ❌ NON-COMPLIANT: Critical issue, deployment blocker

### Step 4.2: Gap Analysis

**Prioritization framework**:

**CRITICAL** (Fix immediately - deployment blocker):
- Unencrypted PHI storage
- HTTP endpoints for PHI
- Hardcoded encryption keys
- PHI in logs/analytics
- No encryption library

**HIGH** (Fix within 30 days):
- Weak encryption (AES-128 vs AES-256)
- TLS 1.0/1.1 support
- Keys not in hardware keychain
- No key rotation policy
- Third-party services without BAA

**MEDIUM** (Fix within 90 days):
- No certificate pinning
- Manual key rotation only
- No biometric key protection
- TLS 1.2 without pinning

**LOW** (Best practice - backlog):
- Incomplete documentation
- No automated security testing
- Missing data export encryption

---

## Deliverables Checklist

### 1. Encryption Inventory (`encryption-inventory.md`)
- [ ] Data classification table (PHI vs non-PHI)
- [ ] Encryption implementation details (library, algorithm, key management)
- [ ] Dependency audit (versions, vulnerabilities)
- [ ] Cryptographic standards validation
- [ ] Test results (storage inspection, network analysis)

### 2. Data Flow Diagram (`data-flow-encryption.md`)
- [ ] High-level architecture diagram
- [ ] Detailed data flows for each PHI type
- [ ] Trust boundaries identified
- [ ] Encryption points marked
- [ ] Unencrypted touchpoints documented
- [ ] Data lifecycle (creation → storage → deletion)

### 3. HIPAA Compliance Matrix (`hipaa-encryption-compliance.md`)
- [ ] §164.312 requirements mapped to implementation
- [ ] At-rest encryption compliance table
- [ ] In-transit encryption compliance table
- [ ] Key management compliance table
- [ ] Gap summary with remediation plan
- [ ] Addressable specification decisions documented

### 4. Key Management Documentation (`key-management.md`)
- [ ] Key generation process
- [ ] Key storage mechanism (Keychain/Keystore)
- [ ] Key access controls
- [ ] Key rotation policy
- [ ] Key deletion procedures
- [ ] Per-user vs app-level key strategy

---

## Success Criteria

**Audit is complete when**:

✅ **Founder can confidently answer**:
- "How is user data encrypted?" → Specific technical answer (AES-256 at rest, TLS 1.3 in transit)
- "Where are encryption keys stored?" → Platform keychain, hardware-backed, per-user
- "Are you HIPAA compliant?" → Yes, with documented compliance matrix
- "What happens if device is lost?" → PHI encrypted, inaccessible without auth
- "Do you have BAAs with vendors?" → Yes (or no PHI sent to vendors without BAAs)

✅ **Documentation exists**:
- `/docs/security/encryption-inventory.md` (complete)
- `/docs/security/data-flow-encryption.md` (complete)
- `/docs/security/hipaa-encryption-compliance.md` (complete)
- `/docs/security/key-management.md` (complete)

✅ **Validation complete**:
- Storage inspection (iOS + Android): No plaintext PHI
- Network analysis: All HTTPS, TLS 1.2+, no PHI in URLs
- Key management: Keys in Keychain/Keystore, deleted on logout
- Gap analysis: All gaps identified, prioritized, roadmap created

---

## Tools Required

### Required
- **Xcode** (iOS inspection, Simulator)
- **Android Studio** (Android inspection, Emulator)
- **Proxyman** or **Charles Proxy** (network traffic analysis)
- **VS Code** (code audit, grep searches)
- **Terminal** (bash commands, ADB)

### Optional
- **MobSF** (automated security scanning)
- **npm audit** (dependency vulnerabilities)
- **git-secrets** (prevent secret commits)

---

## Timeline

**Week 1**:
- Days 1-3: Discovery, code audit, library identification
- Days 4-5: Static analysis, anti-pattern detection

**Week 2**:
- Days 6-8: Dynamic testing (storage, network, keys)
- Days 9-10: Documentation, gap analysis, stakeholder review

**Total**: 10 business days (2 weeks)

---

## Escalation Paths

**Critical gaps found** → Immediately escalate to founder, block deployment
**HIPAA compliance questions** → Engage compliance agent or legal counsel
**Technical implementation questions** → Security agent review
**Remediation planning** → Architect agent for multi-week initiatives

---

## Next Steps After Audit

1. **Review findings** with founder and technical lead
2. **Prioritize gaps** using framework above
3. **Create remediation backlog** items in Notion
4. **Schedule re-audit** (annually or after major changes)
5. **Implement continuous monitoring** (CI/CD security checks)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Author**: Being Security Team (via MAINT-17)
