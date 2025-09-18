# Emergency Rollback Procedures: Being. → Fullmind

**Generated:** December 17, 2024  
**Classification:** CRITICAL - Mental Health Safety  
**Required Reading:** All team members involved in deployment

---

## 🚨 EMERGENCY CONTACT INFORMATION

### Immediate Response Team
- **Technical Lead:** [Contact Info] - Primary decision maker
- **Clinical Supervisor:** [Contact Info] - User safety authority  
- **DevOps Engineer:** [Contact Info] - Infrastructure rollback
- **Security Officer:** [Contact Info] - Data integrity validation

### Escalation Chain
1. **Level 1 (0-15 minutes):** Technical Lead + DevOps
2. **Level 2 (15-30 minutes):** + Clinical Supervisor + Security Officer
3. **Level 3 (30+ minutes):** + Management + Legal (if user data affected)

---

## 🚨 ROLLBACK TRIGGER CONDITIONS

### IMMEDIATE ROLLBACK REQUIRED
**Execute within 5 minutes of detection:**

1. **Crisis System Failure**
   - 988 hotline integration broken
   - Crisis button non-functional
   - Emergency contacts inaccessible
   - Crisis detection algorithms failing

2. **Assessment System Failure**
   - PHQ-9/GAD-7 scoring incorrect
   - Assessment data not saving
   - Clinical thresholds not triggering

3. **User Data Loss**
   - Users unable to access historical data
   - Assessment scores missing
   - Check-in data corrupted

4. **Authentication/Security Breach**
   - Unauthorized data access
   - Encryption failures
   - Storage key corruption

### PLANNED ROLLBACK SCENARIOS
**Execute within 30 minutes of decision:**

1. **Widespread User Issues**
   - >10% of users reporting problems
   - App crashes on launch
   - Core functionality broken

2. **Performance Degradation**
   - App response times >5 seconds
   - Memory leaks detected
   - Battery drain issues

3. **Clinical Accuracy Concerns**
   - Therapeutic content errors
   - Timing algorithms incorrect
   - MBCT compliance violations

---

## 📋 PRE-ROLLBACK CHECKLIST

### Immediate Assessment (2 minutes)
- [ ] Confirm issue is rollback-worthy (use trigger conditions above)
- [ ] Identify scope of impact (users affected, data integrity)
- [ ] Alert emergency response team
- [ ] Document issue and decision rationale

### Impact Assessment (5 minutes)
- [ ] Check user safety: Any users currently in crisis flows?
- [ ] Assess data integrity: Is user data corrupted or lost?
- [ ] Evaluate timing: Peak usage hours or acceptable maintenance window?
- [ ] Review alternatives: Can issue be hotfixed instead?

### Authorization (3 minutes)
- [ ] Technical Lead approval obtained
- [ ] Clinical Supervisor notified (if safety-related)
- [ ] Security Officer alerted (if data-related)
- [ ] Management notification sent

---

## 🔄 ROLLBACK PROCEDURES

### Phase 1: Immediate Safety Measures (0-5 minutes)

#### 1.1 Emergency App Store Actions
```bash
# If app is broken in production, request urgent takedown
# Contact Apple App Store Connect emergency support
# Contact Google Play Console emergency support
```

#### 1.2 Infrastructure Isolation
```bash
# Isolate affected services
kubectl scale deployment being-app --replicas=0
kubectl scale deployment being-api --replicas=0

# Enable maintenance mode if available
echo "MAINTENANCE_MODE=true" >> /etc/environment
```

#### 1.3 User Communication
```bash
# Activate emergency communication channels
# - Push notification: "Temporary maintenance for your safety"
# - Website banner: "Service briefly unavailable"
# - Crisis hotline backup: Ensure 988 still accessible
```

### Phase 2: Data Protection (5-10 minutes)

#### 2.1 Create Emergency Backup
```bash
cd /Users/max/Development/active/fullmind
./docs/scripts/migrate-user-data.js --emergency-backup
```

#### 2.2 Database State Capture
```bash
# Create snapshot of current database state
mongodump --out /backup/emergency-$(date +%Y%m%d-%H%M%S)
# Document current storage key mappings
node -e "console.log(JSON.stringify(require('./docs/scripts/migrate-user-data.js').STORAGE_KEY_MAPPINGS, null, 2))" > /backup/current-mappings.json
```

#### 2.3 User Session Preservation
```bash
# Capture active user sessions to restore later
# Implementation depends on session management system
```

### Phase 3: Code Rollback (10-20 minutes)

#### 3.1 Git Repository Rollback
```bash
cd /Users/max/Development/active/fullmind

# Identify last stable commit before renaming
git log --oneline --grep="renaming\|being" -n 10

# Create rollback branch
git checkout -b emergency-rollback-$(date +%Y%m%d-%H%M%S)

# Revert to last stable commit (replace COMMIT_HASH)
git reset --hard [LAST_STABLE_COMMIT_HASH]

# Force push if necessary (DANGEROUS - team coordination required)
git push origin main --force-with-lease
```

#### 3.2 Configuration Rollback
```bash
# Restore original configuration files
cp /backup/original-configs/app.json ./app/app.json
cp /backup/original-configs/eas.json ./app/eas.json

# Verify configuration integrity
./docs/scripts/validate-renaming.sh --rollback-mode
```

#### 3.3 Asset Rollback
```bash
# Restore original assets and branding
cp -r /backup/original-assets/* ./app/assets/
cp -r /backup/original-branding/* ./website/assets/
```

### Phase 4: Data Recovery (20-30 minutes)

#### 4.1 Storage Key Migration Rollback
```bash
# Use the rollback function in migration script
node ./docs/scripts/migrate-user-data.js --rollback --backup-key="@being_migration_backup_[TIMESTAMP]"
```

#### 4.2 Database Restoration
```bash
# If database corruption occurred
mongorestore /backup/pre-renaming-backup/

# Verify data integrity
node -e "require('./docs/scripts/validate-user-data.js').validateDataIntegrity()"
```

#### 4.3 User Data Validation
```bash
# Verify critical user data is intact
# Check assessment scores
# Verify crisis contact information
# Validate check-in history
```

### Phase 5: Service Restoration (30-45 minutes)

#### 5.1 Application Rebuild
```bash
cd ./app
npm install
npx expo prebuild --clean
npm run build
```

#### 5.2 Testing Critical Paths
```bash
# Automated testing of critical functions
npm run test:crisis
npm run test:clinical
npm run test:integration

# Manual validation of core user journeys
# - App launch and authentication
# - Crisis button functionality
# - Assessment completion
# - Check-in flow
```

#### 5.3 Deployment Restoration
```bash
# Deploy to staging first
eas build --platform all --profile preview
# Test staging thoroughly
# Deploy to production
eas build --platform all --profile production
eas submit --platform all
```

### Phase 6: Service Reactivation (45-60 minutes)

#### 6.1 Infrastructure Restart
```bash
# Restart application services
kubectl scale deployment fullmind-app --replicas=3
kubectl scale deployment fullmind-api --replicas=2

# Remove maintenance mode
unset MAINTENANCE_MODE
```

#### 6.2 Monitoring Activation
```bash
# Enable enhanced monitoring
# Monitor error rates
# Track user authentication success
# Watch crisis system health
# Monitor assessment completion rates
```

#### 6.3 Gradual User Re-engagement
```bash
# Phased user notification
# - Start with 10% of users
# - Monitor for 15 minutes
# - Gradually increase to 100%
```

---

## 🔍 POST-ROLLBACK VALIDATION

### Immediate Validation (0-30 minutes after rollback)

#### Critical Safety Systems
- [ ] Crisis button responds within 3 seconds
- [ ] 988 hotline integration functional
- [ ] Emergency contacts accessible
- [ ] Crisis detection thresholds working

#### Clinical Systems
- [ ] PHQ-9 scoring algorithm accurate (test all 27 combinations)
- [ ] GAD-7 scoring algorithm accurate (test all 21 combinations)
- [ ] Assessment data saving correctly
- [ ] Clinical thresholds triggering properly

#### User Data Integrity
- [ ] Historical assessment scores intact
- [ ] Check-in data preserved
- [ ] User preferences maintained
- [ ] Crisis plans accessible

#### Core Functionality
- [ ] App launches successfully
- [ ] User authentication working
- [ ] Navigation flows functional
- [ ] Widget integration operational

### Extended Validation (30 minutes - 2 hours after rollback)

#### Performance Monitoring
- [ ] Response times <2 seconds for all core functions
- [ ] Memory usage within normal ranges
- [ ] No memory leaks detected
- [ ] Battery usage acceptable

#### User Experience
- [ ] No user-reported issues for 1 hour
- [ ] Error rates below 1%
- [ ] Crash rates below 0.1%
- [ ] User satisfaction metrics stable

#### Security Validation
- [ ] Data encryption functioning
- [ ] Access controls working
- [ ] Audit logs capturing events
- [ ] No unauthorized access detected

---

## 📊 INCIDENT DOCUMENTATION

### Required Documentation
1. **Incident Timeline:** Minute-by-minute log of events
2. **Root Cause Analysis:** What caused the need for rollback
3. **Impact Assessment:** Users affected, data impact, safety concerns
4. **Response Effectiveness:** What worked, what didn't
5. **Prevention Measures:** How to avoid similar issues

### Post-Incident Review Meeting
- **Timing:** Within 24 hours of rollback completion
- **Attendees:** All emergency response team members
- **Duration:** 2 hours maximum
- **Outcome:** Updated procedures and prevention plan

### Regulatory Compliance
- **HIPAA Notification:** If user data was compromised
- **App Store Reporting:** If user safety was at risk
- **Clinical Documentation:** Impact on therapeutic outcomes
- **Legal Review:** If any liability concerns

---

## 🛠️ ROLLBACK TOOLS AND SCRIPTS

### Emergency Scripts Location
```
/Users/max/Development/active/fullmind/docs/scripts/
├── emergency-rollback.sh           # Master rollback script
├── migrate-user-data.js            # Data migration/rollback
├── validate-renaming.sh            # Validation script
└── emergency-health-check.sh       # System health validation
```

### Manual Rollback Commands
```bash
# Quick repository rollback
git checkout main
git reset --hard [LAST_GOOD_COMMIT]

# Quick config restoration
cp /backup/app.json ./app/app.json
cp /backup/eas.json ./app/eas.json

# Quick data rollback
node ./docs/scripts/migrate-user-data.js --emergency-rollback

# Quick validation
./docs/scripts/validate-renaming.sh --post-rollback
```

### Emergency Database Queries
```javascript
// Check for data corruption
db.assessments.find({}).count()
db.assessments.find({score: {$exists: false}}).count()

// Verify user data integrity
db.users.find({}).count()
db.checkIns.find({}).count()

// Check storage key consistency
db.sessions.find({key: /^@being_/}).count()
db.sessions.find({key: /^@fullmind_/}).count()
```

---

## 🚨 PREVENTION MEASURES

### Pre-Deployment Safeguards
1. **Comprehensive Testing:** Full regression suite on staging
2. **Gradual Rollout:** 5% → 25% → 50% → 100% user deployment
3. **Monitoring Setup:** Enhanced alerting during deployment window
4. **Rollback Rehearsal:** Practice rollback procedures quarterly

### Automated Safeguards
1. **Health Checks:** Automated crisis system validation
2. **Data Integrity Checks:** Continuous assessment data validation
3. **Performance Monitoring:** Automatic alerts for degradation
4. **User Feedback Monitoring:** Real-time issue detection

### Team Preparedness
1. **On-Call Rotation:** 24/7 technical coverage
2. **Cross-Training:** Multiple team members can execute rollback
3. **Communication Protocols:** Clear escalation procedures
4. **Regular Drills:** Monthly rollback simulations

---

## 📞 COMMUNICATION TEMPLATES

### Internal Alert Template
```
SUBJECT: EMERGENCY ROLLBACK INITIATED - Being. App

SITUATION: [Brief description of issue]
TRIGGER: [Specific trigger condition met]
IMPACT: [User safety/data/functionality impact]
ACTIONS: [Rollback phase currently executing]
ETA: [Expected resolution time]
NEXT UPDATE: [When next communication will be sent]

Emergency Response Team:
- Technical Lead: [Status]
- Clinical Supervisor: [Status]  
- DevOps: [Status]
- Security: [Status]
```

### User Communication Template
```
SUBJECT: Temporary Service Maintenance

We are performing urgent maintenance to ensure your safety and data security. The Being. app may be temporarily unavailable.

IMMEDIATE: If you are experiencing a mental health crisis, please call 988 (Suicide & Crisis Lifeline) immediately.

We expect service to be restored within [TIME ESTIMATE]. We will notify you as soon as the app is available again.

Your safety is our highest priority.

- The Being. Team
```

### Regulatory Notification Template
```
SUBJECT: Incident Report - Being. Mental Health Application

Date/Time: [INCIDENT TIMESTAMP]
Duration: [DOWNTIME DURATION]
User Impact: [NUMBER OF USERS AFFECTED]
Data Impact: [DESCRIPTION OF ANY DATA ISSUES]
Safety Impact: [ANY SAFETY CONCERNS]
Resolution: [ROLLBACK COMPLETED SUCCESSFULLY]
Prevention: [MEASURES IMPLEMENTED]

Full incident report attached.

Contact: [INCIDENT RESPONSE LEAD]
```

---

**Document Status:** ACTIVE  
**Last Updated:** December 17, 2024  
**Next Review:** Every 90 days or after any rollback execution  
**Distribution:** Emergency Response Team, Management, Legal, Clinical Staff