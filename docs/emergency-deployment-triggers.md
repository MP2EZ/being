# Emergency Deployment Trigger Conditions

## Trigger Matrix: Emergency vs Regular Deployment

### **EMERGENCY DEPLOYMENT (4.5min) - Use emergency-deploy-optimized.yml**

#### **Level 1: CRISIS EMERGENCY**
**Trigger Conditions:**
- Crisis button response time >3 seconds
- 988 hotline integration failure
- PHQ-9/GAD-7 scoring errors affecting crisis detection
- Security breach affecting user safety data
- Mass app store crashes during crisis usage

**Authorization Required:**
- `crisis_override: true`
- Emergency reason documentation
- Healthcare stakeholder approval within 2 hours

**Validation Level:**
- Lightning crisis validation (45s)
- Basic safety verification
- Emergency monitoring activation

#### **Level 2: EXTREME EMERGENCY**
**Trigger Conditions:**
- Complete app failure during active crisis interventions
- 988 hotline completely down
- Data breach exposing mental health records
- Legal/regulatory immediate compliance requirement
- Patient safety incident requiring immediate patch

**Authorization Required:**
- `crisis_override: true`
- `skip_crisis_validation: true`
- C-suite or clinical director approval
- Post-deployment validation within 1 hour

**Validation Level:**
- NO validation (30s gate only)
- Immediate deployment
- Mandatory post-deployment validation

### **REGULAR DEPLOYMENT (42min) - Use deploy.yml**

#### **Standard Production**
**Trigger Conditions:**
- Feature releases
- Non-critical bug fixes
- Performance improvements
- UI/UX enhancements
- Routine maintenance

**Requirements:**
- Full healthcare validation gate (15min)
- Complete testing suite
- Clinical authority validation
- Compliance authority validation
- Crisis authority validation

#### **Expedited Production**
**Trigger Conditions:**
- Important bug fixes (non-crisis)
- Security improvements (non-breach)
- Performance fixes affecting user experience

**Requirements:**
- Healthcare validation gate
- Reduced testing (20min total)
- All authority validations required

## Decision Flow

```
Is it a crisis safety issue?
├─ YES: Is app completely broken?
│  ├─ YES: EXTREME EMERGENCY (skip validation)
│  └─ NO: CRISIS EMERGENCY (lightning validation)
└─ NO: Is it urgent non-crisis?
   ├─ YES: Expedited Regular (20min)
   └─ NO: Standard Regular (42min)
```

## Workflow Selection Commands

### **Emergency Deployments**
```bash
# Crisis Emergency (4.5min)
gh workflow run emergency-deploy-optimized.yml \
  --field crisis_override=true \
  --field emergency_reason="Crisis button >3s response time" \
  --field use_pre_built_artifacts=true

# Extreme Emergency (3.5min)
gh workflow run emergency-deploy-optimized.yml \
  --field crisis_override=true \
  --field emergency_reason="988 hotline integration failure" \
  --field skip_crisis_validation=true \
  --field use_pre_built_artifacts=true
```

### **Regular Deployments**
```bash
# Standard Production (42min)
gh workflow run deploy.yml \
  --field deployment_type=production

# Expedited Production (20min)
gh workflow run deploy.yml \
  --field deployment_type=production \
  --field skip_healthcare_validation=false
```

## Authority Override Matrix

| Emergency Level | Crisis Authority | Clinical Authority | Compliance Authority | Post-Deploy Required |
|----------------|------------------|-------------------|---------------------|-------------------|
| **Standard** | ✅ Required | ✅ Required | ✅ Required | ❌ No |
| **Crisis** | ⚡ Lightning (45s) | ❌ Skipped | ❌ Skipped | ✅ Within 4 hours |
| **Extreme** | ❌ Skipped | ❌ Skipped | ❌ Skipped | ✅ Within 1 hour |

## Emergency Infrastructure

### **Pre-Built Artifact Triggers**
Artifacts are automatically rebuilt on:
- Every push to `main` branch
- Every push to `release/*` branches
- Every push to `hotfix/*` branches
- Weekly scheduled rebuild (Sundays 2AM UTC)
- Manual trigger via `rebuild-emergency-artifacts.yml`

### **Cache Invalidation Triggers**
Emergency cache is invalidated when:
- `package.json` dependencies change
- Crisis-related code changes (`src/crisis/*`, `src/emergency/*`)
- Clinical code changes (`src/clinical/*`, `src/assessment/*`)
- Security code changes (`src/security/*`, `src/encryption/*`)
- Build configuration changes (`eas.json`, `app.json`)

## Emergency Monitoring

### **Automatic Alerts**
- Emergency deployment initiated: Slack + Email + SMS
- Emergency deployment failed: PagerDuty + Phone call
- Crisis systems down: Immediate escalation to on-call engineer
- Rollback triggered: All stakeholders notified immediately

### **Post-Emergency Validation**
Within specified timeframes:
1. **Crisis Authority**: Full crisis validation suite
2. **Clinical Authority**: Complete PHQ-9/GAD-7 accuracy testing
3. **Compliance Authority**: HIPAA and data privacy validation
4. **Security Authority**: Full security scan and penetration test

## Legal & Compliance

### **Emergency Audit Trail**
- All emergency deployments logged for 7 years
- Healthcare stakeholder approval documented
- Post-deployment validation results archived
- Incident reports generated automatically

### **Regulatory Reporting**
- FDA adverse event reporting (if applicable)
- HIPAA breach notification procedures
- State mental health authority notifications
- Insurance and liability documentation

## Emergency Contact Escalation

### **Crisis Emergency**
1. On-call engineer (immediate)
2. Clinical director (within 30 minutes)
3. Legal counsel (within 2 hours)
4. Executive team (within 4 hours)

### **Extreme Emergency**
1. All stakeholders (immediate)
2. Executive leadership (within 15 minutes)
3. Legal and compliance (within 30 minutes)
4. Clinical partners (within 1 hour)
5. Regulatory bodies (as required by law)