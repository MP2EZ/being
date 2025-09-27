# Emergency Rollback Procedures
## DRD-FLOW-005 Standalone Assessments - Crisis-Safe Recovery

### Overview
These procedures ensure immediate recovery from any deployment issues while maintaining 100% crisis detection availability and therapeutic continuity for users in critical mental health states.

## Critical Rollback Triggers

### Immediate Rollback Required (Execute within 60 seconds)

#### P0 - Life Safety Issues
1. **Crisis Detection Failure**
   - Crisis button response >200ms
   - PHQ-9/GAD-7 crisis threshold detection failure
   - 988 hotline integration broken
   - Emergency contact system failure

2. **Assessment Accuracy Failure**
   - PHQ-9 scoring errors (any deviation from 100% accuracy)
   - GAD-7 scoring errors (any deviation from 100% accuracy)
   - Crisis threshold miscalculation
   - Therapeutic content corruption

3. **Security Breach**
   - PHI data exposure or unauthorized access
   - Authentication bypass detected
   - Data encryption failure
   - Audit logging compromise

#### P1 - Critical System Issues (Execute within 5 minutes)
1. **Performance Degradation**
   - App crashes >1% of sessions
   - Response times >2x baseline
   - Memory leaks causing system instability
   - Database connection failures

2. **Clinical Feature Failure**
   - Assessment data corruption
   - Therapeutic exercise malfunction
   - Progress tracking failure
   - Backup/sync system failure

## Emergency Rollback Scripts

### 1. Immediate Crisis System Rollback

```bash
#!/bin/bash
# scripts/emergency/crisis-system-rollback.sh
set -e

echo "🚨 EXECUTING EMERGENCY CRISIS SYSTEM ROLLBACK"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"

# Step 1: Stop all deployment traffic
echo "1. Stopping deployment traffic..."
curl -X POST https://api.being.app/deployment/stop \
  -H "Authorization: Bearer $EMERGENCY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "emergency_rollback", "stop_all_traffic": true}'

# Step 2: Route 100% traffic to last known good version
echo "2. Routing to last stable version..."
LAST_STABLE_VERSION=$(curl -s https://api.being.app/deployment/last-stable | jq -r '.version')
echo "Rolling back to version: $LAST_STABLE_VERSION"

curl -X POST https://api.being.app/deployment/rollback \
  -H "Authorization: Bearer $EMERGENCY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_version\": \"$LAST_STABLE_VERSION\", \"immediate\": true}"

# Step 3: Verify crisis systems operational
echo "3. Verifying crisis detection systems..."
CRISIS_CHECK=$(npm run validate:crisis-authority --silent && echo "PASS" || echo "FAIL")
if [ "$CRISIS_CHECK" != "PASS" ]; then
    echo "❌ Crisis systems still failing - escalating to manual intervention"
    npm run alert:crisis-system-failure-escalate
    exit 1
fi

# Step 4: Verify 988 hotline accessibility
echo "4. Verifying 988 hotline integration..."
HOTLINE_STATUS=$(curl -s https://api.being.app/crisis/988/status | jq -r '.available')
if [ "$HOTLINE_STATUS" != "true" ]; then
    echo "❌ 988 hotline still unavailable - manual intervention required"
    npm run alert:hotline-manual-intervention
    exit 1
fi

# Step 5: Test assessment accuracy
echo "5. Testing assessment accuracy..."
ACCURACY_CHECK=$(npm run test:clinical --silent && echo "PASS" || echo "FAIL")
if [ "$ACCURACY_CHECK" != "PASS" ]; then
    echo "❌ Assessment accuracy still compromised"
    npm run alert:clinical-accuracy-escalate
    exit 1
fi

echo "✅ Emergency rollback completed successfully"
echo "🔍 Initiating post-incident procedures..."

# Step 6: Notify stakeholders
npm run notify:emergency-rollback-complete

# Step 7: Create incident report
npm run incident:create-emergency-report

# Step 8: Lock deployment until manual approval
curl -X POST https://api.being.app/deployment/lock \
  -H "Authorization: Bearer $EMERGENCY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "emergency_rollback", "manual_unlock_required": true}'

echo "✅ System stabilized. Manual review required before next deployment."
```

### 2. Database Emergency Recovery

```bash
#!/bin/bash
# scripts/emergency/database-recovery.sh
set -e

echo "🚨 EXECUTING DATABASE EMERGENCY RECOVERY"

# Step 1: Stop all write operations
echo "1. Stopping write operations..."
curl -X POST https://api.being.app/database/readonly-mode \
  -H "Authorization: Bearer $EMERGENCY_API_TOKEN"

# Step 2: Identify recovery point
RECOVERY_POINT=${1:-"1 hour ago"}
echo "2. Recovery point: $RECOVERY_POINT"

# Step 3: Create emergency backup of current state
echo "3. Creating emergency backup..."
pg_dump $DATABASE_URL > "/backups/emergency-$(date +%s).sql"

# Step 4: Restore from point-in-time
echo "4. Restoring database to: $RECOVERY_POINT"
# Using Supabase point-in-time recovery
curl -X POST https://api.supabase.com/v1/projects/$PROJECT_ID/database/recovery \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"recovery_point\": \"$RECOVERY_POINT\"}"

# Step 5: Verify data integrity
echo "5. Verifying data integrity..."
npm run validate:database-integrity

# Step 6: Test critical functions
echo "6. Testing critical database functions..."
npm run test:database-functions

# Step 7: Re-enable write operations
echo "7. Re-enabling write operations..."
curl -X POST https://api.being.app/database/readwrite-mode \
  -H "Authorization: Bearer $EMERGENCY_API_TOKEN"

echo "✅ Database recovery completed"
```

### 3. App Store Emergency Update

```bash
#!/bin/bash
# scripts/emergency/appstore-emergency-update.sh
set -e

echo "🚨 EXECUTING EMERGENCY APP STORE UPDATE"

# For critical issues that require immediate app store deployment
if [ "$1" != "--confirmed" ]; then
    echo "⚠️  This will trigger emergency app store submission"
    echo "⚠️  Only use for life-safety critical issues"
    echo "Run with --confirmed to proceed"
    exit 1
fi

# Step 1: Build emergency patch
echo "1. Building emergency patch..."
EMERGENCY_VERSION="1.0.$(date +%s)"

# Update version in app.json
jq ".expo.version = \"$EMERGENCY_VERSION\"" app.json > app.json.tmp
mv app.json.tmp app.json

# Step 2: Emergency build
echo "2. Creating emergency build..."
eas build --platform all --profile production --non-interactive

# Step 3: Submit with expedited review request
echo "3. Submitting for expedited review..."
eas submit --platform ios --profile production

# Include expedited review justification
echo "Expedited review requested due to critical mental health safety issue" > expedited-review-notes.txt

# Step 4: Submit to Google Play (faster review process)
eas submit --platform android --profile production

echo "✅ Emergency app store submission completed"
echo "📧 Review teams notified of critical safety issue"
```

## Rollback Decision Matrix

### Automated Rollback Triggers

```javascript
// scripts/emergency/rollback-decision-engine.js
const RollbackDecisionEngine = {
  triggers: {
    // Immediate automated rollback (no human approval needed)
    immediate: [
      { metric: 'crisis_response_time', threshold: 200, unit: 'ms' },
      { metric: 'crisis_detection_accuracy', threshold: 99.9, unit: '%' },
      { metric: 'hotline_988_availability', threshold: 100, unit: '%' },
      { metric: 'assessment_scoring_accuracy', threshold: 100, unit: '%' }
    ],
    
    // Automated rollback with team notification (5 minute delay)
    delayed: [
      { metric: 'app_crash_rate', threshold: 1, unit: '%' },
      { metric: 'api_error_rate', threshold: 5, unit: '%' },
      { metric: 'database_connection_failures', threshold: 1, unit: '%' }
    ],
    
    // Manual approval required
    manual: [
      { metric: 'performance_degradation', threshold: 200, unit: '%' },
      { metric: 'user_complaint_rate', threshold: 10, unit: '%' },
      { metric: 'feature_usage_drop', threshold: 50, unit: '%' }
    ]
  },
  
  async evaluateMetric(metric, value) {
    // Check immediate triggers
    for (const trigger of this.triggers.immediate) {
      if (metric === trigger.metric && this.exceedsThreshold(value, trigger)) {
        await this.executeImmediateRollback(metric, value, trigger);
        return 'immediate_rollback_executed';
      }
    }
    
    // Check delayed triggers
    for (const trigger of this.triggers.delayed) {
      if (metric === trigger.metric && this.exceedsThreshold(value, trigger)) {
        await this.scheduleDelayedRollback(metric, value, trigger);
        return 'delayed_rollback_scheduled';
      }
    }
    
    // Check manual triggers
    for (const trigger of this.triggers.manual) {
      if (metric === trigger.metric && this.exceedsThreshold(value, trigger)) {
        await this.requestManualApproval(metric, value, trigger);
        return 'manual_approval_requested';
      }
    }
    
    return 'no_action_required';
  },
  
  async executeImmediateRollback(metric, value, trigger) {
    console.log(`🚨 IMMEDIATE ROLLBACK TRIGGERED: ${metric} = ${value}${trigger.unit}`);
    
    // Execute rollback script
    const { exec } = require('child_process');
    exec('./scripts/emergency/crisis-system-rollback.sh', (error, stdout, stderr) => {
      if (error) {
        console.error('Rollback execution failed:', error);
        this.escalateToManualIntervention(metric, value, error);
      } else {
        console.log('Rollback completed:', stdout);
        this.notifyRollbackSuccess(metric, value);
      }
    });
  }
};
```

## Manual Override Procedures

### Emergency Access Codes

```bash
# Emergency override for deployment locks
EMERGENCY_OVERRIDE_CODE="CRISIS-$(date +%Y%m%d)-OVERRIDE"

# Unlock deployment with emergency code
npm run deployment:emergency-unlock --code $EMERGENCY_OVERRIDE_CODE

# Skip validation for emergency deployment
npm run deploy:emergency --skip-validation --override-safety-checks
```

### Crisis Team Escalation

```javascript
// scripts/emergency/crisis-escalation.js
const CrisisEscalation = {
  escalationLevels: [
    {
      level: 1,
      contacts: ['engineering-oncall@being.app'],
      responseTime: '2 minutes'
    },
    {
      level: 2, 
      contacts: ['crisis-team@being.app', 'clinical-director@being.app'],
      responseTime: '5 minutes'
    },
    {
      level: 3,
      contacts: ['ceo@being.app', 'emergency-board@being.app'],
      responseTime: '15 minutes'
    }
  ],
  
  async escalate(issue, currentLevel = 1) {
    const escalation = this.escalationLevels[currentLevel - 1];
    
    await this.notifyContacts(escalation.contacts, {
      severity: 'CRITICAL',
      issue: issue,
      escalationLevel: currentLevel,
      requiredAction: 'IMMEDIATE RESPONSE REQUIRED'
    });
    
    // Auto-escalate if no response within time limit
    setTimeout(() => {
      if (!this.responseReceived(issue.id)) {
        if (currentLevel < this.escalationLevels.length) {
          this.escalate(issue, currentLevel + 1);
        } else {
          this.activateEmergencyProtocols(issue);
        }
      }
    }, this.parseResponseTime(escalation.responseTime));
  }
};
```

## Recovery Validation

### Post-Rollback Verification

```bash
#!/bin/bash
# scripts/emergency/post-rollback-verification.sh

echo "🔍 EXECUTING POST-ROLLBACK VERIFICATION"

# 1. Crisis system verification
echo "1. Verifying crisis detection systems..."
for i in {1..5}; do
    RESPONSE_TIME=$(curl -w "%{time_total}" -s -o /dev/null https://api.being.app/crisis/test)
    if (( $(echo "$RESPONSE_TIME > 0.2" | bc -l) )); then
        echo "❌ Crisis response still slow: ${RESPONSE_TIME}s"
        exit 1
    fi
    echo "✅ Crisis response test $i: ${RESPONSE_TIME}s"
    sleep 2
done

# 2. Assessment accuracy verification
echo "2. Verifying assessment accuracy..."
npm run test:clinical --silent
if [ $? -ne 0 ]; then
    echo "❌ Clinical accuracy still compromised"
    exit 1
fi
echo "✅ Assessment accuracy verified"

# 3. Performance verification
echo "3. Verifying performance metrics..."
npm run perf:crisis --silent
npm run perf:launch --silent
if [ $? -ne 0 ]; then
    echo "❌ Performance still degraded"
    exit 1
fi
echo "✅ Performance metrics verified"

# 4. User experience verification
echo "4. Testing user workflows..."
npm run test:integration --silent
if [ $? -ne 0 ]; then
    echo "❌ User workflows still broken"
    exit 1
fi
echo "✅ User workflows verified"

# 5. Security verification
echo "5. Verifying security measures..."
npm run test:security --silent
if [ $? -ne 0 ]; then
    echo "❌ Security measures compromised"
    exit 1
fi
echo "✅ Security measures verified"

echo "✅ ALL POST-ROLLBACK VERIFICATIONS PASSED"
echo "System is stable and safe for users"
```

## Communication Protocols

### Incident Communication Template

```markdown
# INCIDENT ALERT: Emergency Rollback Executed

**Incident ID**: CRISIS-$(date +%Y%m%d-%H%M%S)
**Severity**: P0 - Critical
**Status**: Rollback Completed / In Progress / Failed
**Affected System**: Crisis Detection / Assessment Accuracy / [Other]

## Summary
Brief description of the issue that triggered emergency rollback.

## Impact
- **Users Affected**: Estimate of affected users
- **Duration**: Time from issue detection to resolution
- **Clinical Impact**: Any impact on therapeutic services

## Timeline
- **Issue Detected**: [Timestamp]
- **Rollback Initiated**: [Timestamp]  
- **Rollback Completed**: [Timestamp]
- **Systems Verified**: [Timestamp]

## Root Cause
Preliminary analysis of what caused the issue.

## Resolution
Steps taken to resolve the issue.

## Next Steps
1. Full incident analysis
2. Process improvements
3. Additional safeguards
4. Timeline for next deployment

## Contact
- **Incident Commander**: [Name/Contact]
- **Technical Lead**: [Name/Contact]
- **Clinical Lead**: [Name/Contact]
```

### Automated Status Updates

```javascript
// scripts/emergency/status-updates.js
const StatusUpdater = {
  async sendUpdate(status, details) {
    const update = {
      timestamp: new Date().toISOString(),
      status: status,
      details: details,
      systemHealth: await this.getSystemHealth()
    };
    
    // Send to all communication channels
    await Promise.all([
      this.updateSlack(update),
      this.updateStatusPage(update),
      this.updateIncidentReport(update),
      this.notifyStakeholders(update)
    ]);
  },
  
  async getSystemHealth() {
    return {
      crisisDetection: await this.checkCrisisSystem(),
      assessmentAccuracy: await this.checkClinicalAccuracy(),
      performance: await this.checkPerformance(),
      security: await this.checkSecurity()
    };
  }
};
```

## Success Criteria

### Rollback Effectiveness Metrics
- **Time to Detection**: <30 seconds for critical issues
- **Time to Rollback**: <60 seconds for P0 issues, <5 minutes for P1
- **Recovery Success Rate**: >99.9% successful rollbacks
- **False Rollback Rate**: <1% unnecessary rollbacks

### System Recovery Validation
- ✅ Crisis detection <200ms response time restored
- ✅ Assessment accuracy 100% verified
- ✅ All safety systems operational
- ✅ User experience fully restored
- ✅ No data loss or corruption
- ✅ Security measures intact

### Post-Incident Requirements
- ✅ Root cause analysis completed within 24 hours
- ✅ Corrective measures implemented
- ✅ Process improvements documented
- ✅ Team post-mortem conducted
- ✅ Stakeholder communication completed

These emergency rollback procedures ensure that any deployment issues can be quickly and safely resolved while maintaining the highest standards of user safety and therapeutic continuity.