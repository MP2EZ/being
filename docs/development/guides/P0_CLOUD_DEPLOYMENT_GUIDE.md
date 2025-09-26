# P0-CLOUD Phase 1 Deployment Guide

## Overview

This guide covers the complete deployment of P0-CLOUD Phase 1 for FullMind MBCT, implementing HIPAA-compliant Supabase cloud infrastructure with zero-knowledge encryption, progressive rollout capabilities, and comprehensive monitoring.

## 🎯 Deployment Objectives

- **HIPAA Compliance**: All cloud services meet healthcare data requirements
- **Zero-Knowledge Security**: Client-side encryption with no plaintext data in cloud
- **Progressive Rollout**: Cloud features default OFF, enabling gradual activation
- **Crisis Safety**: Maintain <200ms crisis response time requirement
- **Cost Control**: Comprehensive budget monitoring and alerts
- **Offline-First**: Preserve existing offline functionality

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Supabase       │    │   Monitoring    │
│   (React Native)│    │   (HIPAA)        │    │   Services      │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ • Offline First │    │ • US Regions     │    │ • Health Checks │
│ • Zero-Knowledge│◄──►│ • RLS Policies   │◄──►│ • Cost Tracking │
│ • Encryption    │    │ • Audit Logging  │    │ • Performance   │
│ • Feature Flags │    │ • Auto Backups   │    │ • Compliance    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### Required Tools
```bash
# Node.js (v18+)
node --version

# npm (latest)
npm --version

# EAS CLI (for builds)
npm install -g @expo/eas-cli
eas --version

# Git (for CI/CD)
git --version
```

### Required Accounts & Access
- [ ] Supabase account with HIPAA plan
- [ ] Expo account for EAS builds
- [ ] GitHub repository access
- [ ] Sentry account for error tracking (optional)
- [ ] Apple Developer account (for iOS)
- [ ] Google Play Console account (for Android)

### Environment Setup
- [ ] Development Supabase project
- [ ] Staging Supabase project
- [ ] Production Supabase project (HIPAA-compliant)

## 🔧 Configuration

### 1. Supabase Project Setup

#### Create Projects
```bash
# Development
supabase projects create fullmind-dev --region us-east-1

# Staging
supabase projects create fullmind-staging --region us-east-1

# Production (requires HIPAA plan)
supabase projects create fullmind-prod --region us-east-1 --plan pro
```

#### Configure HIPAA Compliance
```sql
-- Enable audit logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0;

-- Set data retention policies
CREATE POLICY data_retention_policy ON user_data
  USING (created_at > now() - interval '7 years');
```

### 2. Environment Variables

Each environment requires specific configuration:

#### Development (.env.development)
```bash
EXPO_PUBLIC_ENV=development
EXPO_PUBLIC_SUPABASE_URL=https://dev-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
EXPO_PUBLIC_CLOUD_FEATURES_ENABLED=false
EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE=development
```

#### Staging (.env.staging)
```bash
EXPO_PUBLIC_ENV=staging
EXPO_PUBLIC_SUPABASE_URL=https://staging-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
EXPO_PUBLIC_CLOUD_FEATURES_ENABLED=false
EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE=staging
```

#### Production (.env.production)
```bash
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_SUPABASE_URL=https://prod-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
EXPO_PUBLIC_CLOUD_FEATURES_ENABLED=false
EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE=production
```

### 3. GitHub Secrets

Configure the following secrets in your GitHub repository:

```bash
# Supabase Configuration
SUPABASE_URL_DEV=https://dev-project-ref.supabase.co
SUPABASE_ANON_KEY_DEV=your-dev-anon-key
SUPABASE_URL_STAGING=https://staging-project-ref.supabase.co
SUPABASE_ANON_KEY_STAGING=your-staging-anon-key
SUPABASE_URL_PRODUCTION=https://prod-project-ref.supabase.co
SUPABASE_ANON_KEY_PRODUCTION=your-production-anon-key

# EAS/Expo Configuration
EXPO_TOKEN=your-expo-token

# Error Tracking
SENTRY_DSN_STAGING=https://staging-dsn@sentry.io/project
SENTRY_DSN_PRODUCTION=https://production-dsn@sentry.io/project

# App Store Configuration
APPLE_ID=your-apple-id
ASC_APP_ID=your-app-store-connect-app-id
APPLE_TEAM_ID=your-apple-team-id
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=path-to-service-account-key
```

## 🚀 Deployment Process

### Option 1: Automated Script

Use the comprehensive deployment script:

```bash
# Validate configuration only
./scripts/deploy-p0-cloud.sh development --validate-only

# Deploy to development
./scripts/deploy-p0-cloud.sh development

# Deploy to staging with cloud features
./scripts/deploy-p0-cloud.sh staging --enable-cloud

# Production deployment (validate first!)
./scripts/deploy-p0-cloud.sh production --validate-only
./scripts/deploy-p0-cloud.sh production
```

### Option 2: Manual Steps

#### Step 1: Environment Validation
```bash
# Validate environment configuration
npm run validate:environment

# Check TypeScript compilation
npx tsc --noEmit

# Run linting
npm run lint

# Security audit
npm audit --audit-level moderate
```

#### Step 2: Database Schema Setup
```bash
# Run Supabase migrations
supabase db push

# Verify RLS policies
supabase db verify-rls

# Test connection
npm run test:supabase-connection
```

#### Step 3: Application Build
```bash
# Development build
eas build --platform all --profile development

# Staging build
eas build --platform all --profile preview

# Production build
eas build --platform all --profile production
```

#### Step 4: Monitoring Setup
```bash
# Configure health checks
npm run setup:monitoring

# Test alerting
npm run test:alerts

# Verify cost tracking
npm run validate:cost-monitoring
```

### Option 3: CI/CD Pipeline

The GitHub Actions workflow automatically handles deployment:

```yaml
# Triggered on:
- Push to main (staging deployment)
- Push to release/* (production deployment)
- Manual workflow dispatch

# Pipeline stages:
1. Environment validation
2. Security compliance check
3. Supabase configuration validation
4. Build and test
5. Monitoring setup
6. Deployment verification
```

## 🔍 Validation & Testing

### Pre-Deployment Validation

```bash
# Run comprehensive validation
npm run validate:deployment

# Check HIPAA compliance
npm run validate:hipaa

# Test crisis response times
npm run test:crisis-performance

# Validate encryption
npm run test:encryption
```

### Post-Deployment Testing

```bash
# Test Supabase connectivity
npm run test:supabase

# Verify authentication flows
npm run test:auth

# Test encrypted data storage
npm run test:encryption-e2e

# Performance benchmarks
npm run test:performance
```

### Health Checks

```bash
# Supabase connection test
curl -f "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Crisis response time test
npm run test:crisis-latency

# Feature flag validation
npm run validate:feature-flags
```

## 📊 Monitoring & Observability

### Key Metrics

#### Performance Metrics
- **Crisis Response Time**: < 200ms (critical)
- **App Launch Time**: < 2s production, < 3s staging
- **Assessment Load Time**: < 300ms
- **Breathing Animation**: 60 FPS minimum
- **Check-in Transitions**: < 500ms

#### Cost Metrics
- **Daily Budget**: $100 (production), $15 (staging), $5 (development)
- **Request Budget**: Based on user activity projections
- **Storage Budget**: Encrypted data storage limits
- **Alert Thresholds**: 75% warning, 85% critical, 100% exceeded

#### Compliance Metrics
- **Encryption Status**: All data encrypted before transmission
- **Region Compliance**: US-only regions for HIPAA
- **Audit Logging**: All operations logged for compliance
- **Session Security**: Proper timeout and refresh handling

### Alert Configuration

```javascript
// Health Check Alerts
{
  "crisisResponseTime": {
    "threshold": 200,
    "action": "immediate_alert"
  },
  "supabaseConnectivity": {
    "threshold": "5_consecutive_failures",
    "action": "escalate_to_team"
  }
}

// Cost Alerts
{
  "budgetUtilization": {
    "warning": 0.75,
    "critical": 0.85,
    "exceeded": 1.0
  }
}

// Compliance Alerts
{
  "encryptionFailure": {
    "action": "immediate_alert_and_disable"
  },
  "regionViolation": {
    "action": "block_request_and_alert"
  }
}
```

## 🔒 Security Considerations

### Zero-Knowledge Architecture
- All sensitive data encrypted client-side before Supabase transmission
- Encryption keys stored in device secure storage only
- No plaintext PHI data in cloud databases
- Client-side key derivation for user authentication

### HIPAA Compliance
- **Administrative Safeguards**: Access controls and audit procedures
- **Physical Safeguards**: US-only data centers with SOC 2 compliance
- **Technical Safeguards**: Encryption, access logging, automatic logoff

### Security Testing
```bash
# Encryption validation
npm run test:encryption-strength

# RLS policy testing
npm run test:rls-policies

# Authentication security
npm run test:auth-security

# Session management
npm run test:session-security
```

## 💰 Cost Management

### Budget Structure

| Environment | Daily | Weekly | Monthly | Notes |
|-------------|-------|--------|---------|-------|
| Development | $5 | $20 | $50 | Limited usage |
| Staging | $15 | $75 | $300 | Testing loads |
| Production | $100 | $500 | $2000 | Full user base |

### Cost Optimization Strategies

1. **Feature Flag Management**
   - Cloud features disabled by default
   - Gradual rollout to control usage
   - Automatic scaling based on demand

2. **Data Efficiency**
   - Client-side data compression
   - Efficient query patterns
   - Local caching strategies

3. **Usage Monitoring**
   - Real-time cost tracking
   - Predictive budget alerts
   - Automatic usage controls

## 🚨 Incident Response

### Automated Responses

```bash
# Budget exceeded
if [ "$BUDGET_UTILIZATION" -gt "100" ]; then
  disable_cloud_features
  alert_team "URGENT: Budget exceeded"
fi

# Crisis response degraded
if [ "$CRISIS_LATENCY" -gt "200" ]; then
  fallback_to_offline_mode
  alert_team "CRITICAL: Crisis response slow"
fi

# Security breach detected
if [ "$SECURITY_VIOLATION" == "true" ]; then
  disable_all_cloud_features
  alert_security_team "SECURITY: Breach detected"
fi
```

### Manual Response Procedures

1. **Performance Degradation**
   - Check Supabase status dashboard
   - Verify network connectivity
   - Review recent configuration changes
   - Enable offline-only mode if needed

2. **Cost Overrun**
   - Disable non-essential cloud features
   - Implement request rate limiting
   - Review usage patterns for anomalies
   - Contact Supabase support if needed

3. **Security Incident**
   - Immediately disable cloud features
   - Preserve audit logs
   - Contact HIPAA compliance team
   - Document incident for reporting

## 📈 Progressive Rollout Strategy

### Phase 1: Infrastructure (Current)
- ✅ Supabase HIPAA-compliant setup
- ✅ Zero-knowledge encryption
- ✅ RLS policies and audit logging
- ✅ Monitoring and cost controls
- ✅ Cloud features DISABLED by default

### Phase 2: Authentication (Next)
- [ ] Cloud user authentication
- [ ] Cross-device session sync
- [ ] Secure credential storage
- [ ] Biometric authentication

### Phase 3: Data Sync (Future)
- [ ] Encrypted check-in data sync
- [ ] Assessment result backup
- [ ] Crisis plan cloud storage
- [ ] Multi-device synchronization

### Phase 4: Advanced Features (Future)
- [ ] Real-time crisis monitoring
- [ ] Predictive analytics
- [ ] Collaborative care features
- [ ] Advanced reporting

## 🔧 Troubleshooting

### Common Issues

#### Connection Failures
```bash
# Test Supabase connectivity
curl -I "$SUPABASE_URL/rest/v1/"

# Check DNS resolution
nslookup your-project.supabase.co

# Verify API key
echo $SUPABASE_ANON_KEY | base64 -d
```

#### Authentication Problems
```bash
# Check token validity
npm run debug:auth-token

# Verify user permissions
npm run debug:user-permissions

# Test RLS policies
npm run debug:rls-policies
```

#### Performance Issues
```bash
# Measure actual latency
npm run benchmark:supabase-latency

# Check query performance
npm run debug:query-performance

# Analyze bundle size impact
npm run analyze:bundle-size
```

### Support Contacts

- **Technical Issues**: development-team@fullmind.app
- **Security Incidents**: security@fullmind.app
- **HIPAA Compliance**: compliance@fullmind.app
- **Supabase Support**: https://supabase.com/support

## 📚 Additional Resources

### Documentation
- [Supabase HIPAA Documentation](https://supabase.com/docs/guides/platform/hipaa)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
- [HIPAA Compliance Checklist](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html)

### Monitoring Tools
- [Supabase Dashboard](https://app.supabase.com/)
- [EAS Build Dashboard](https://expo.dev/)
- [Sentry Error Tracking](https://sentry.io/)

### Code References
- `src/services/cloud/SupabaseClient.ts` - Main Supabase client
- `src/services/cloud/SupabaseSchema.ts` - Database schema
- `src/services/cloud/CloudMonitoring.ts` - Health monitoring
- `src/services/cloud/CostMonitoring.ts` - Budget tracking
- `src/services/cloud/DeploymentValidator.ts` - Deployment validation

---

**Generated by P0-CLOUD Phase 1 Deployment**
**Last Updated**: $(date)
**Version**: 1.0.0