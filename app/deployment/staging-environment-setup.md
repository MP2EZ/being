# Staging Environment Setup Guide
## DRD-FLOW-005 Standalone Assessments - Clinical MBCT App

### Overview
This guide establishes a HIPAA-compliant staging environment that mirrors production for comprehensive testing of clinical features, crisis detection, and assessment accuracy.

## Prerequisites

### Infrastructure Requirements
- **Expo Application Services (EAS)** Build account with team access
- **Supabase Project** configured for HIPAA compliance
- **Sentry** error tracking for staging environment
- **Stripe** test environment for payment validation
- **iOS Developer Account** with TestFlight access
- **Google Play Console** with internal testing track

### Security Prerequisites
- HIPAA Business Associate Agreement (BAA) with all services
- Encrypted storage for all PHI and clinical data
- TLS 1.3 for all network communications
- API keys and secrets stored in secure vault (EAS Secrets)

## Environment Configuration

### 1. EAS Build Configuration

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to EAS
eas login

# Initialize EAS configuration (already exists in eas.json)
eas build:configure

# Set up staging secrets
eas secret:create --scope project --name SUPABASE_URL_STAGING --value "your-staging-supabase-url"
eas secret:create --scope project --name SUPABASE_ANON_KEY_STAGING --value "your-staging-anon-key"
eas secret:create --scope project --name SENTRY_DSN_STAGING --value "your-staging-sentry-dsn"
```

### 2. Supabase Staging Setup

```sql
-- Create staging database with HIPAA compliance
-- Row Level Security (RLS) enabled by default

-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Clinical data encrypted at application level
  clinical_data_encrypted TEXT,
  encryption_key_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own data
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Assessment data table
CREATE TABLE assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('PHQ9', 'GAD7')),
  encrypted_responses TEXT NOT NULL,
  calculated_score INTEGER NOT NULL,
  crisis_threshold_exceeded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Crisis detection audit log
CREATE TABLE crisis_detection_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trigger_type TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  intervention_provided BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE crisis_detection_logs ENABLE ROW LEVEL SECURITY;
```

### 3. Environment Variables Setup

Create staging environment file:

```bash
# Copy production template
cp .env.production .env.staging

# Update staging-specific values
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_API_URL=https://api-staging.being.app
EXPO_PUBLIC_SUPABASE_URL=https://staging-project-ref.supabase.co
EXPO_PUBLIC_CRISIS_HOTLINE=988
EXPO_PUBLIC_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_FEATURE_FLAGS="beta_features:true,performance_monitoring:true,debug_mode:true,cloud_sync:false"
```

## Staging Deployment Process

### 1. Pre-Deployment Validation

```bash
# Run comprehensive test suite
npm run validate:production-readiness

# Validate clinical accuracy
npm run validate:clinical-complete

# Validate crisis detection
npm run validate:crisis-authority

# Validate HIPAA compliance
npm run validate:compliance-authority

# Performance validation
npm run validate:new-arch-performance
```

### 2. Build and Deploy to Staging

```bash
# Build for iOS staging
eas build --platform ios --profile preview --non-interactive

# Build for Android staging
eas build --platform android --profile preview --non-interactive

# Submit to TestFlight (iOS) for internal testing
eas submit --platform ios --profile preview

# Deploy to Google Play Internal Testing (Android)
eas submit --platform android --profile preview
```

### 3. Post-Deployment Validation

#### Clinical Safety Verification
```bash
# Test crisis detection response time
npm run perf:crisis

# Validate PHQ-9/GAD-7 scoring accuracy
npm run test:clinical

# Test emergency contact functionality
npm run test:crisis-quick

# Validate 988 hotline integration
node scripts/validate-crisis-integration.js staging
```

#### Performance Validation
```bash
# App launch performance (<2s requirement)
npm run perf:launch

# Crisis button response (<200ms requirement)
npm run perf:crisis

# Assessment loading (<300ms requirement)
npm run test:performance
```

#### Security and Compliance Testing
```bash
# HIPAA compliance validation
npm run validate:compliance-hipaa

# Data encryption verification
npm run validate:encryption

# Authentication and authorization testing
npm run test:security
```

## Staging Environment Monitoring

### 1. Health Checks

Create automated health check script:

```javascript
// scripts/staging-health-check.js
const axios = require('axios');

const healthChecks = {
  api: 'https://api-staging.being.app/health',
  supabase: process.env.EXPO_PUBLIC_SUPABASE_URL + '/rest/v1/',
  sentry: 'Verify error tracking in Sentry dashboard',
  crisis: 'Test 988 hotline integration'
};

async function runHealthChecks() {
  for (const [service, endpoint] of Object.entries(healthChecks)) {
    try {
      if (endpoint.startsWith('http')) {
        const response = await axios.get(endpoint, { timeout: 5000 });
        console.log(`✅ ${service}: ${response.status}`);
      } else {
        console.log(`ℹ️  ${service}: ${endpoint}`);
      }
    } catch (error) {
      console.error(`❌ ${service}: ${error.message}`);
    }
  }
}

runHealthChecks();
```

### 2. Continuous Monitoring Setup

```bash
# Add to package.json scripts
"staging:health-check": "node scripts/staging-health-check.js",
"staging:monitor": "npm run staging:health-check && npm run test:crisis-quick",
"staging:performance-check": "npm run perf:crisis && npm run perf:launch"
```

## Testing Procedures

### 1. Clinical Accuracy Testing
- **PHQ-9 Scoring**: Test all 27 possible score combinations
- **GAD-7 Scoring**: Test all 21 possible score combinations  
- **Crisis Thresholds**: Verify PHQ-9 ≥20 and GAD-7 ≥15 trigger crisis protocols
- **Response Time**: Ensure crisis detection responds in <200ms

### 2. User Acceptance Testing
- **Healthcare Providers**: Clinical content accuracy and therapeutic flow validation
- **Beta Users**: Real-world usage patterns and accessibility testing
- **Crisis Counselors**: Emergency response workflow validation

### 3. Accessibility Testing
- **Screen Reader**: VoiceOver (iOS) and TalkBack (Android) compatibility
- **High Contrast**: Visual accessibility compliance
- **Voice Control**: Hands-free navigation testing
- **WCAG 2.1 AA**: Comprehensive accessibility audit

## Data Management

### 1. Test Data Creation
```javascript
// scripts/create-staging-test-data.js
const testUsers = [
  { role: 'clinician', email: 'clinician@staging.being.app' },
  { role: 'patient_low_risk', email: 'patient1@staging.being.app' },
  { role: 'patient_high_risk', email: 'patient2@staging.being.app' }
];

// Create test assessments with known scores
const testAssessments = [
  { type: 'PHQ9', score: 19, crisisRisk: false },
  { type: 'PHQ9', score: 21, crisisRisk: true },
  { type: 'GAD7', score: 14, crisisRisk: false },
  { type: 'GAD7', score: 16, crisisRisk: true }
];
```

### 2. Data Cleanup
```bash
# Automated cleanup of staging data
npm run staging:cleanup-test-data

# Manual reset for fresh testing
npm run staging:reset-environment
```

## Rollback Procedures

### 1. Immediate Rollback
```bash
# Revert to previous build
eas build:list --platform all --limit 10
eas submit --platform ios --build-id <previous-build-id>
```

### 2. Critical Issue Response
- **Crisis Detection Failure**: Immediate rollback + emergency notification
- **PHI Data Breach**: Stop all operations + incident response protocol
- **Authentication Issues**: Temporary offline mode activation

## Success Criteria

### Performance Benchmarks
- ✅ App launch: <2 seconds
- ✅ Crisis button response: <200ms  
- ✅ Assessment loading: <300ms
- ✅ Breathing exercise: 60fps consistent
- ✅ Check-in transitions: <500ms

### Clinical Accuracy Requirements
- ✅ PHQ-9 scoring: 100% accuracy across all combinations
- ✅ GAD-7 scoring: 100% accuracy across all combinations
- ✅ Crisis detection: 100% reliability at thresholds
- ✅ Emergency contacts: 100% accessibility

### Compliance Validation
- ✅ HIPAA compliance audit passed
- ✅ Data encryption validated (AES-256-GCM)
- ✅ User consent flows tested
- ✅ Audit logging operational

### User Experience Standards
- ✅ Accessibility: WCAG 2.1 AA compliance
- ✅ Cross-platform parity: iOS = Android functionality
- ✅ Offline functionality: Complete assessment capability
- ✅ Error handling: User-friendly messaging for all scenarios

## Next Steps

After successful staging validation:
1. **Production Deployment Preparation**: Security hardening and final configuration
2. **App Store Submission**: iOS App Store and Google Play Store preparation
3. **Monitoring Setup**: Production monitoring and alerting configuration
4. **Crisis Response Protocols**: Emergency procedures and escalation paths