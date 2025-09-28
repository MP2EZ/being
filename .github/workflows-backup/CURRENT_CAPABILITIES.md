# Current Deployment Capabilities Documentation

## Current Structure (Single Workflow)
**File**: `production-deployment.yml`
**Total Jobs**: 11
**Critical Capabilities Identified**:

### Emergency Deployment Capabilities
- **Crisis Override**: `crisis_override` boolean input for emergency situations
- **Emergency Build Profile**: Uses `production-emergency` profile with cache clearing
- **Rollback Capability**: Dedicated `emergency-rollback` job with <30 second target
- **Emergency Flow**: Crisis → Build → Rollback (if needed)

### Healthcare Authority Validation (CRITICAL - FIRST JOB)
- **Crisis Authority Validation**: <10 second timeout, immediate failure stops pipeline
- **Clinical Authority Validation**: PHQ-9/GAD-7 100% accuracy validation  
- **Compliance Authority Validation**: HIPAA & data privacy validation
- **Healthcare Outputs**: crisis-status, clinical-status, compliance-status

### Deployment Types Supported
1. **staging**: Standard staging deployment
2. **production**: Full production deployment with app store submission
3. **emergency**: Crisis override with fast-path deployment
4. **rollback**: Emergency rollback procedure

### Performance & Architecture Validation
- **New Architecture**: TurboModule performance validation
- **TouchableOpacity Migration**: Migration benefits validation
- **Performance Baselines**: 30%+ improvement validation
- **Security & Accessibility**: WCAG AA+ compliance validation

### Monitoring & Post-Deployment
- **Healthcare Monitoring**: Crisis response <50ms, clinical accuracy 100%
- **Real-time Monitoring**: Production health monitoring
- **Emergency Procedures**: <30 second rollback, crisis service verification
- **Deployment Reports**: Comprehensive deployment success metrics

### Critical Timing Requirements
- **Crisis Response**: <50ms monitoring
- **Emergency Deployment**: <5 minutes end-to-end
- **Rollback**: <30 seconds
- **Healthcare Validation**: <15 minutes total

### Platform Support
- **iOS**: App Store submission via EAS
- **Android**: Google Play submission via EAS
- **Cross-platform**: Matrix strategy for parallel builds

### Artifact Management
- **Healthcare Reports**: 30-day retention
- **Build Artifacts**: 90-day retention
- **Deployment Reports**: 365-day retention

## Critical Requirements for Consolidation

### MUST PRESERVE:
1. **Crisis Authority as FIRST JOB** - Non-negotiable
2. **Emergency deployment <5min** capability
3. **Rollback <30 seconds** capability
4. **Healthcare validation gates** - Crisis veto power
5. **Monitoring every 5 minutes** for crisis systems
6. **Zero therapeutic downtime** validation

### HEALTHCARE HIERARCHY:
- Crisis > Compliance > Clinical > Technical
- Domain authorities have veto power
- Emergency procedures override all other processes