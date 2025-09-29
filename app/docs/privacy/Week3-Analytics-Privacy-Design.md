# Week 3 Analytics Privacy Design Document
**Version**: 1.0
**Date**: 2025-09-29
**Status**: Draft for Agent Validation
**Classification**: HIPAA Compliance Design

## Executive Summary

This document defines the privacy-preserving analytics architecture for Being MBCT Week 3 implementation. The system provides meaningful usage insights while maintaining zero PHI exposure through severity buckets, daily session rotation, and comprehensive sanitization.

## 1. PRIVACY COMPLIANCE FRAMEWORK

### 1.1 HIPAA Requirements
- **Zero PHI Storage**: No actual assessment scores, personal identifiers, or health information
- **Minimum Necessary Rule**: Only collect data essential for app improvement
- **Individual Rights**: Users retain control over analytics participation
- **Business Associate Agreement**: Analytics data remains within HIPAA boundaries
- **Breach Notification**: Privacy violations automatically detected and reported

### 1.2 Privacy Principles
1. **Data Minimization**: Collect only essential non-PHI metrics
2. **Anonymization**: All identifiers are hashed or bucketed
3. **Temporal Privacy**: Session IDs rotate daily to prevent tracking
4. **Aggregation Only**: Individual events combined into statistical insights
5. **Transparency**: Users informed of all data collection

## 2. ANALYTICS EVENT TAXONOMY

### 2.1 Permitted Event Categories

#### Clinical Events (Severity Buckets Only)
```typescript
assessment_completed: {
  assessment_type: "phq9" | "gad7",
  severity_bucket: "minimal" | "mild" | "moderate" | "moderate_severe" | "severe",
  completion_duration_bucket: "quick" | "normal" | "extended",
  session_id: string, // Daily-rotated
  timestamp: ISO8601 // Rounded to nearest hour
}

crisis_intervention_triggered: {
  trigger_type: "score_threshold" | "question_response" | "manual",
  severity_bucket: "low" | "medium" | "high" | "critical",
  response_time_bucket: "immediate" | "fast" | "slow",
  intervention_accessed: boolean,
  session_id: string
}

therapeutic_exercise_completed: {
  exercise_type: "breathing" | "mindfulness" | "reflection",
  completion_rate_bucket: "full" | "partial" | "abandoned",
  duration_bucket: "short" | "normal" | "extended",
  session_id: string
}
```

#### Technical Events (Performance Only)
```typescript
sync_operation_performed: {
  sync_type: "manual" | "auto" | "crisis_priority",
  duration_bucket: "fast" | "normal" | "slow",
  success: boolean,
  network_quality: "excellent" | "good" | "poor",
  data_size_bucket: "small" | "medium" | "large",
  session_id: string
}

app_lifecycle_event: {
  event_type: "launch" | "background" | "resume" | "terminate",
  duration_bucket: "instant" | "fast" | "slow",
  memory_usage_bucket: "low" | "normal" | "high",
  session_id: string
}

error_occurred: {
  error_category: "network" | "storage" | "sync" | "ui" | "unknown",
  severity_bucket: "info" | "warning" | "error" | "critical",
  recovery_successful: boolean,
  recovery_time_bucket: "immediate" | "fast" | "slow",
  session_id: string
}
```

### 2.2 Prohibited Data Elements
- **Actual Assessment Scores**: PHQ-9 and GAD-7 raw scores
- **Personal Identifiers**: Name, email, phone, device-specific IDs
- **Precise Timestamps**: Only hour-rounded timestamps allowed
- **Detailed Content**: Specific answers, text responses, or therapeutic content
- **Location Data**: GPS coordinates or location-based information
- **Biometric Data**: Any physiological or behavioral characteristics

## 3. SEVERITY BUCKET SPECIFICATIONS

### 3.1 Clinical Assessment Buckets

#### PHQ-9 Depression Severity Buckets
```typescript
PHQ9_SEVERITY_MAPPING = {
  minimal: [0, 4],        // No significant depression
  mild: [5, 9],           // Mild depression symptoms
  moderate: [10, 14],     // Moderate depression
  moderate_severe: [15, 19], // Moderately severe depression
  severe: [20, 27]        // Severe depression (crisis threshold)
}
```

#### GAD-7 Anxiety Severity Buckets
```typescript
GAD7_SEVERITY_MAPPING = {
  minimal: [0, 4],        // No significant anxiety
  mild: [5, 9],           // Mild anxiety symptoms
  moderate: [10, 14],     // Moderate anxiety
  severe: [15, 21]        // Severe anxiety (crisis threshold)
}
```

### 3.2 Performance Buckets

#### Duration Buckets
```typescript
DURATION_BUCKETS = {
  assessment_completion: {
    quick: [0, 300],      // Under 5 minutes
    normal: [300, 900],   // 5-15 minutes
    extended: [900, Infinity] // Over 15 minutes
  },
  sync_operations: {
    fast: [0, 2000],      // Under 2 seconds
    normal: [2000, 10000], // 2-10 seconds
    slow: [10000, Infinity] // Over 10 seconds
  }
}
```

#### Data Size Buckets
```typescript
DATA_SIZE_BUCKETS = {
  small: [0, 100],        // Under 100KB
  medium: [100, 1000],    // 100KB - 1MB
  large: [1000, Infinity] // Over 1MB
}
```

## 4. SESSION MANAGEMENT & ROTATION

### 4.1 Daily Session Rotation
```typescript
interface SessionPolicy {
  rotation_frequency: "daily",
  session_id_format: "session_YYYY-MM-DD_[random]",
  random_component_length: 9, // characters
  cross_day_linking: false, // No tracking across days
  session_persistence: "in_memory_only"
}

// Example session IDs:
// session_2025-09-29_x7k9m2p1q
// session_2025-09-30_a3f8h5n2r (new day = new session)
```

### 4.2 Session Privacy Guarantees
- **No Cross-Day Tracking**: Each day gets completely new session ID
- **No User Linking**: Sessions cannot be connected to specific users
- **Random Generation**: Cryptographically secure random components
- **Memory Only**: Session IDs never persisted to storage
- **Automatic Rotation**: Rotation happens at app launch if date changed

## 5. DATA RETENTION & AGGREGATION

### 5.1 Retention Policies
```typescript
RETENTION_POLICY = {
  raw_events: {
    retention_days: 90,
    purpose: "Immediate analytics and debugging"
  },
  aggregated_insights: {
    retention_days: 365,
    purpose: "Long-term trend analysis"
  },
  user_session_data: {
    retention_days: 1,
    purpose: "Daily session management only"
  }
}
```

### 5.2 Aggregation Strategy
```typescript
// Example aggregated insights (no individual data):
weekly_summary: {
  week_of: "2025-W39",
  total_assessments: 1247,
  severity_distribution: {
    minimal: 45%,
    mild: 30%,
    moderate: 15%,
    moderate_severe: 7%,
    severe: 3%
  },
  average_completion_time: "7.2_minutes",
  crisis_interventions: 12,
  sync_success_rate: 98.5%
}
```

## 6. SANITIZATION & VALIDATION

### 6.1 Automatic PHI Detection
```typescript
PHI_DETECTION_RULES = {
  numeric_scores: "Convert to severity buckets",
  personal_names: "Block completely",
  email_patterns: "Block completely",
  phone_patterns: "Block completely",
  precise_timestamps: "Round to nearest hour",
  device_identifiers: "Hash with daily salt",
  location_data: "Block completely"
}
```

### 6.2 Validation Pipeline
```typescript
interface ValidationSteps {
  step1: "Automatic PHI scanning",
  step2: "Severity bucket conversion",
  step3: "Timestamp rounding",
  step4: "Session ID validation",
  step5: "Data size limits",
  step6: "Schema compliance check"
}
```

## 7. USER CONSENT & TRANSPARENCY

### 7.1 Consent Requirements
- **Explicit Opt-In**: Users must actively consent to analytics
- **Granular Control**: Separate consent for clinical vs. technical analytics
- **Easy Withdrawal**: One-tap analytics disable in settings
- **Transparency**: Clear explanation of what data is collected

### 7.2 Data Subject Rights
```typescript
USER_RIGHTS = {
  access: "View aggregated insights about their usage patterns",
  portability: "Export their contribution to statistical insights",
  deletion: "Complete removal of their analytics data",
  rectification: "Correction of any incorrectly categorized events",
  restriction: "Pause analytics collection temporarily"
}
```

## 8. SECURITY MEASURES

### 8.1 Encryption & Protection
- **In-Transit**: TLS 1.3 for all analytics transmission
- **At-Rest**: AES-256-GCM encryption for analytics storage
- **Processing**: In-memory processing only, no disk caching
- **Access Control**: Role-based access to analytics systems

### 8.2 Audit & Monitoring
```typescript
AUDIT_REQUIREMENTS = {
  data_access_logging: "All analytics data access logged",
  privacy_breach_detection: "Automated PHI detection alerts",
  compliance_monitoring: "Daily HIPAA compliance verification",
  retention_enforcement: "Automatic data purging after retention period"
}
```

## 9. TECHNICAL IMPLEMENTATION

### 9.1 AnalyticsService Architecture
```typescript
class AnalyticsService {
  // Core responsibilities:
  private sanitizeEvent(rawEvent): SanitizedEvent
  private convertToSeverityBuckets(scores): BucketedData
  private validatePrivacyCompliance(event): boolean
  private rotateSessionIfNeeded(): void
  private batchAndFlushEvents(): void
}
```

### 9.2 Integration Points
- **Assessment Store**: Monitor completions, convert scores to buckets
- **Crisis Detection**: Track interventions with severity buckets only
- **Sync Coordinator**: Monitor sync performance and success rates
- **App Lifecycle**: Track usage patterns and performance metrics

## 10. COMPLIANCE VALIDATION CHECKPOINTS

### 10.1 Pre-Implementation Validation
- [ ] Compliance Agent: HIPAA compliance verification
- [ ] Security Agent: Encryption and access control validation
- [ ] Clinician Agent: Therapeutic data preservation verification

### 10.2 Implementation Validation
- [ ] Privacy-preserving event collection confirmed
- [ ] Severity bucket accuracy validated
- [ ] Session rotation functionality verified
- [ ] PHI sanitization tested with all event types

### 10.3 Post-Implementation Validation
- [ ] No PHI exposure in any analytics data
- [ ] User consent mechanisms functional
- [ ] Data retention policies enforced
- [ ] Audit trails complete and accessible

## 11. RISK ASSESSMENT

### 11.1 Privacy Risks
- **Low**: Severity bucket re-identification (mitigated by daily session rotation)
- **Medium**: Statistical correlation across sessions (mitigated by aggregation)
- **Critical**: Accidental PHI collection (mitigated by automatic sanitization)

### 11.2 Mitigation Strategies
- **Defense in Depth**: Multiple privacy protection layers
- **Fail-Safe Design**: System defaults to blocking data when uncertain
- **Regular Audits**: Weekly privacy compliance verification
- **Incident Response**: Automated PHI detection and breach response

## 12. SUCCESS METRICS

### 12.1 Privacy Compliance Metrics
- **Zero PHI Exposure**: 100% of events pass PHI detection
- **Sanitization Success**: 100% of scores converted to buckets
- **Session Rotation**: 100% daily rotation compliance
- **User Consent**: 100% explicit opt-in for analytics participation

### 12.2 Functional Metrics
- **Performance Impact**: <10ms per analytics event
- **Data Volume**: <1MB analytics data per user per month
- **Aggregation Accuracy**: Statistical insights within 95% confidence
- **User Experience**: No noticeable impact on app performance

---

**Document Status**: Ready for Agent Validation
**Next Steps**: Submit to compliance→security→clinician validation sequence
**Approval Required**: All three agents must approve before implementation begins
**Risk Level**: Low (comprehensive privacy protection measures)

This design ensures Week 3 analytics provide valuable insights while maintaining the highest standards of healthcare privacy compliance.