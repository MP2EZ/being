# FullMind MBCT App - Production Deployment Guide

## Overview

This guide provides comprehensive procedures for deploying the FullMind mental health app to production. All procedures have been designed with crisis-safe protocols and clinical accuracy validation to ensure user safety throughout the deployment process.

**Critical Safety Notice**: This application handles mental health data and provides crisis intervention features. All deployments must follow safety-first protocols and include clinical validation checkpoints.

## Table of Contents

1. [Pre-Deployment Requirements](#pre-deployment-requirements)
2. [Environment Setup](#environment-setup)
3. [EAS Build Process](#eas-build-process)
4. [App Store Submission](#app-store-submission)
5. [Production Monitoring Setup](#production-monitoring-setup)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Emergency Deployment Protocols](#emergency-deployment-protocols)

## Pre-Deployment Requirements

### 1. Clinical Validation Checklist

**MANDATORY**: All items must be verified before production deployment.

- [ ] **PHQ-9 Assessment Scoring**: 100% accuracy validation completed
- [ ] **GAD-7 Assessment Scoring**: 100% accuracy validation completed
- [ ] **Crisis Detection Thresholds**: Validated at PHQ-9 ≥20, GAD-7 ≥15
- [ ] **Crisis Hotline Integration**: 988 calling functionality tested
- [ ] **Breathing Timer Accuracy**: Exactly 60-second intervals validated
- [ ] **MBCT Content Review**: All therapeutic content reviewed by licensed clinician
- [ ] **Clinical Language Validation**: Terminology accuracy confirmed
- [ ] **Crisis Intervention Flows**: End-to-end testing completed

### 2. Legal and Compliance Requirements

- [ ] **Privacy Policy**: Current version published at https://fullmind.app/privacy
- [ ] **Terms of Service**: Current version published at https://fullmind.app/terms
- [ ] **HIPAA Readiness Assessment**: Data handling practices validated
- [ ] **App Store Legal Review**: Both iOS and Android compliance confirmed
- [ ] **Crisis Resources Documentation**: Emergency contact information verified
- [ ] **Data Retention Policies**: Implemented and documented
- [ ] **User Consent Flows**: GDPR and privacy compliance verified

### 3. Security Audit Requirements

- [ ] **Data Encryption**: AES-256 encryption for all sensitive data
- [ ] **Biometric Authentication**: iOS/Android implementation tested
- [ ] **Secure Storage**: AsyncStorage encryption verified
- [ ] **Network Security**: HTTPS enforcement and certificate validation
- [ ] **Code Signing**: iOS and Android signing certificates validated
- [ ] **Penetration Testing**: Third-party security audit completed
- [ ] **Vulnerability Scan**: No critical or high-severity issues remaining

### 4. Performance and Accessibility Validation

- [ ] **Crisis Button Response**: <200ms response time validated
- [ ] **App Launch Time**: <2 seconds to home screen confirmed
- [ ] **Breathing Animation**: Consistent 60fps during sessions
- [ ] **WCAG AA Compliance**: Screen reader and accessibility testing
- [ ] **Multi-Device Testing**: iOS and Android across screen sizes
- [ ] **Memory Usage**: Optimized for low-end devices
- [ ] **Battery Impact**: Minimal drain during background operation

## Environment Setup

### 1. Required Environment Variables

Copy and configure the production environment:

```bash
# Copy production environment template
cp app/.env.production app/.env.local

# Verify all required variables are set
npm run env:validate
```

### 2. Required Secrets Configuration

Set up the following secrets in your deployment environment:

```bash
# Apple Developer Configuration
export APPLE_ID="your-apple-developer-id"
export ASC_APP_ID="your-app-store-connect-app-id"
export APPLE_TEAM_ID="your-apple-team-id"

# Google Play Configuration  
export GOOGLE_SERVICE_ACCOUNT_KEY_PATH="/path/to/service-account.json"

# Monitoring and Analytics
export SENTRY_DSN_PRODUCTION="your-production-sentry-dsn"

# Code Signing Certificates
export IOS_DISTRIBUTION_CERTIFICATE="/path/to/ios-distribution.p12"
export ANDROID_KEYSTORE_PATH="/path/to/android-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="your-keystore-password"
export ANDROID_KEY_ALIAS="your-key-alias"
export ANDROID_KEY_PASSWORD="your-key-password"
```

### 3. EAS CLI Setup

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Initialize project
eas build:configure
```

## EAS Build Process

### 1. Pre-Build Validation

Run comprehensive validation before building:

```bash
# Clinical accuracy tests
npm run test:clinical

# Performance benchmarks
npm run test:performance

# Security validation
npm run test:security

# Accessibility compliance
npm run test:accessibility

# Complete test suite
npm run test:production
```

### 2. Production Build Commands

**iOS Production Build:**
```bash
# Build for App Store submission
eas build --platform ios --profile production-ios

# Monitor build progress
eas build:list --status in-progress
```

**Android Production Build:**
```bash
# Build for Google Play submission
eas build --platform android --profile production-android

# Check build status
eas build:view [BUILD_ID]
```

**Cross-Platform Build:**
```bash
# Build both platforms simultaneously
eas build --platform all --profile production

# Auto-submit after successful build
eas build --platform all --profile production --auto-submit
```

### 3. Build Artifact Validation

After successful builds:

```bash
# Download and validate iOS build
eas build:download --platform ios --profile production-ios

# Download and validate Android build
eas build:download --platform android --profile production-android

# Verify app signatures
npm run verify:signatures

# Test installation on physical devices
npm run test:device-installation
```

## App Store Submission

### 1. iOS App Store Connect Submission

**Automated Submission:**
```bash
# Submit to App Store Connect
eas submit --platform ios --profile production

# Monitor submission status
eas submit:list --status in-progress
```

**Manual Submission Steps:**

1. **Upload Build to App Store Connect**
   - Open App Store Connect
   - Navigate to your app
   - Go to TestFlight tab
   - Select the uploaded build
   - Add What's New notes
   - Submit for Beta App Review

2. **App Store Metadata**
   - App Name: "FullMind MBCT"
   - Subtitle: "Mindfulness-Based Cognitive Therapy"
   - Category: Medical
   - Secondary Category: Health & Fitness
   - Content Rating: 4+ (Medical/Treatment Information)
   - Price: Free

3. **App Store Description**
   ```
   FullMind delivers evidence-based mindfulness and cognitive therapy practices for mental wellness. Developed with licensed mental health professionals, the app provides:

   • Daily mindfulness check-ins with mood tracking
   • Clinically validated PHQ-9 and GAD-7 assessments
   • 3-minute breathing meditations with precise timing
   • Crisis intervention resources with 988 hotline access
   • MBCT (Mindfulness-Based Cognitive Therapy) exercises
   • Secure, encrypted data storage for privacy protection

   Features:
   ✓ Evidence-based therapeutic content
   ✓ Crisis detection and intervention protocols
   ✓ Accessibility-first design (WCAG AA compliant)
   ✓ No data sharing - your privacy is protected
   ✓ Offline functionality for all core features
   ✓ iOS widgets for quick morning check-ins

   Important: This app is not a substitute for professional mental health treatment. If you're experiencing a mental health crisis, please call 988 or contact emergency services.
   ```

4. **Keywords**
   ```
   mindfulness, meditation, anxiety, depression, mental health, therapy, MBCT, wellness, breathing, mood tracker, crisis, support
   ```

5. **App Privacy Information**
   - Data Not Collected: Analytics, crash data (anonymized only)
   - Data Not Linked to User: App usage, performance data
   - Data Linked to User: Health data (stored locally only)

### 2. Google Play Console Submission

**Automated Submission:**
```bash
# Submit to Google Play Console
eas submit --platform android --profile production

# Check submission status
eas submit:list --platform android
```

**Manual Submission Steps:**

1. **Upload to Google Play Console**
   - Open Google Play Console
   - Select your app
   - Go to Release → Production
   - Create new release
   - Upload AAB file
   - Add release notes

2. **Store Listing Information**
   - App Name: "FullMind MBCT"
   - Short Description: "Evidence-based mindfulness and cognitive therapy for mental wellness"
   - Full Description: (Same as iOS with Android-specific features)
   - Category: Medical
   - Content Rating: Everyone (Medical reference)

3. **Privacy Policy and Data Safety**
   - Privacy Policy URL: https://fullmind.app/privacy
   - Data Safety Section:
     - No data shared with third parties
     - No data collected (local storage only)
     - Security practices: Data encrypted in transit and at rest

### 3. Beta Testing Setup

**iOS TestFlight:**
```bash
# Submit for external testing
eas submit --platform ios --profile preview

# Invite beta testers
# (Manual process in App Store Connect)
```

**Android Internal Testing:**
```bash
# Submit to internal track
eas submit --platform android --profile preview --track internal
```

**Beta Testing Checklist:**
- [ ] Mental health professionals included in beta group
- [ ] Crisis intervention flows tested by safety team
- [ ] Accessibility tested with assistive technology users
- [ ] Performance validated across device range
- [ ] Clinical accuracy verified by independent reviewers

## Production Monitoring Setup

### 1. Error Tracking and Crash Reporting

**Sentry Configuration:**
```bash
# Configure Sentry for production
npx @sentry/wizard -i reactNative

# Test error reporting
npm run test:sentry-integration

# Set up alerts for critical errors
npm run setup:sentry-alerts
```

**Critical Alerts Configuration:**
- Crisis button failures
- Assessment scoring errors
- Authentication failures
- Data encryption failures
- Memory leaks or crashes

### 2. Performance Monitoring

**Real User Monitoring Setup:**
```javascript
// Performance thresholds for alerts
const PERFORMANCE_THRESHOLDS = {
  crisisButtonResponse: 200, // ms
  appLaunch: 2000, // ms
  assessmentLoad: 300, // ms
  breathingFPS: 60, // minimum fps
  checkInTransition: 500 // ms
};
```

**Analytics Configuration:**
- User journey tracking (anonymized)
- Feature usage analytics
- Performance metrics
- Crash reporting
- Therapeutic effectiveness metrics

### 3. Health Monitoring

**Automated Health Checks:**
```bash
# Set up monitoring endpoints
npm run setup:health-checks

# Configure uptime monitoring
npm run setup:uptime-monitoring

# Test monitoring alerts
npm run test:monitoring-alerts
```

**Health Check Endpoints:**
- Crisis hotline accessibility
- Assessment accuracy validation
- Data encryption verification
- Performance benchmark testing

## Post-Deployment Verification

### 1. Immediate Post-Deployment Checks (First 30 minutes)

```bash
# Automated verification suite
npm run verify:production-deployment

# Manual verification checklist
npm run checklist:post-deployment
```

**Critical Verification Steps:**
- [ ] App launches successfully on iOS and Android
- [ ] Crisis button responds within 200ms
- [ ] PHQ-9/GAD-7 assessments calculate correctly
- [ ] 988 hotline calling functionality works
- [ ] Breathing timer maintains exact 60-second intervals
- [ ] Data encryption is functioning
- [ ] Biometric authentication works
- [ ] No critical errors in monitoring systems

### 2. 24-Hour Monitoring Period

**Monitoring Dashboard Setup:**
- Real-time error tracking
- Performance metrics monitoring
- User feedback collection
- Crisis intervention usage tracking
- Assessment completion rates

**Review Schedule:**
- Hour 1: Critical functionality verification
- Hour 4: Performance metrics review
- Hour 12: User feedback assessment
- Hour 24: Comprehensive analytics review

### 3. 7-Day Stabilization Period

**Weekly Review Metrics:**
- App store reviews and ratings
- Crash-free user percentage (target: >99.5%)
- Crisis intervention effectiveness
- Assessment accuracy validation
- Performance benchmark compliance
- User retention and engagement

## Rollback Procedures

### 1. Emergency Rollback Triggers

**Immediate Rollback Required:**
- Crisis button functionality failure
- Incorrect assessment scoring
- Data encryption failures
- Critical security vulnerabilities
- User safety reports

### 2. Rollback Execution

**iOS Rollback:**
```bash
# Remove current version from sale
# (Manual process in App Store Connect)

# Promote previous version
eas submit --platform ios --profile production --release-version [PREVIOUS_VERSION]
```

**Android Rollback:**
```bash
# Rollback to previous version
# (Google Play Console - Release Management)

# Or deploy emergency patch
eas build --platform android --profile production
eas submit --platform android --profile production --track production --rollout 0.1
```

### 3. Post-Rollback Procedures

- [ ] Verify rollback success within 30 minutes
- [ ] Notify users of temporary service interruption
- [ ] Investigate root cause of deployment issue
- [ ] Implement fix and validate in staging
- [ ] Plan re-deployment with additional safeguards

## Emergency Deployment Protocols

### 1. Crisis-Safety Emergency Deployments

**Triggers for Emergency Deployment:**
- Crisis detection system failures
- Incorrect clinical content
- Security vulnerabilities affecting user data
- Legal compliance issues

**Emergency Deployment Process:**
```bash
# Skip normal validation for critical safety fixes
npm run deploy:emergency --skip-non-critical-tests

# Fast-track app store approval
# (Contact Apple/Google emergency review teams)

# Monitor deployment every 15 minutes
npm run monitor:emergency-deployment
```

### 2. Emergency Communication Protocol

**Internal Team Notification:**
- Development team: Immediate Slack alert
- Clinical team: Phone call notification
- Legal team: Email notification within 1 hour
- Executive team: Summary within 2 hours

**User Communication:**
- In-app notification for minor issues
- Push notification for service interruptions
- Email notification for security issues
- Crisis support team notification for safety issues

## Compliance and Documentation

### 1. Deployment Records

All deployments must include:
- Clinical validation sign-off
- Security audit completion certificate
- Performance benchmark results
- Accessibility compliance verification
- Legal review confirmation

### 2. Audit Trail Requirements

- Deployment timestamps and personnel
- Version control commits and reviews
- Test execution results
- Approval workflows and sign-offs
- Post-deployment monitoring results

### 3. Regulatory Documentation

- HIPAA readiness assessment
- App store compliance certificates
- Third-party security audit reports
- Clinical validation documentation
- User privacy protection verification

## Support and Escalation

### Emergency Contacts

**Technical Issues:**
- DevOps Team: +1-xxx-xxx-xxxx
- Development Lead: +1-xxx-xxx-xxxx

**Clinical/Safety Issues:**
- Clinical Director: +1-xxx-xxx-xxxx
- Crisis Team Lead: +1-xxx-xxx-xxxx

**Legal/Compliance Issues:**
- Legal Team: +1-xxx-xxx-xxxx
- Compliance Officer: +1-xxx-xxx-xxxx

### Escalation Matrix

1. **Level 1**: Development team (response: 15 minutes)
2. **Level 2**: Clinical team + DevOps (response: 30 minutes)
3. **Level 3**: Executive team + Legal (response: 1 hour)
4. **Level 4**: External crisis management (response: 2 hours)

---

**Document Version**: 1.0
**Last Updated**: [Current Date]
**Next Review**: [30 days from last update]
**Approved By**: Clinical Director, Technical Lead, Compliance Officer