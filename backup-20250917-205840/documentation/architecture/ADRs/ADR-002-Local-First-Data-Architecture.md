# ADR-002: Local-First Data Architecture for Mental Health Privacy

## Status
**Status**: Accepted  
**Date**: 2025-01-21  
**Deciders**: Architecture Team, Privacy Officer, Clinical Advisors  

## Context

FullMind handles sensitive mental health data including:
- PHQ-9/GAD-7 depression and anxiety assessment responses
- Daily mood tracking and therapeutic check-ins
- Crisis plans with emergency contacts and coping strategies
- MBCT practice data and progress tracking

Key requirements:
- **Maximum Privacy**: Mental health data requires highest protection
- **Regulatory Compliance**: HIPAA-ready, GDPR-compliant architecture
- **User Trust**: Complete user control over sensitive health information
- **Offline Functionality**: Therapeutic features must work without network
- **Fast Performance**: Immediate access to crisis and therapeutic features

Data architecture options: Local-first, Cloud-first, Hybrid synchronization.

## Decision

**We will implement a Local-First Data Architecture with optional cloud synchronization.**

### Phase 1: Pure Local Storage
- **Primary Storage**: AsyncStorage with AES-256 encryption
- **Data Location**: Device-only, no network transmission
- **User Control**: Complete ownership of all mental health data
- **Export Capability**: User-controlled PDF/CSV export for clinical sharing

### Phase 2: User-Controlled Cloud Sync (Optional)
- **Opt-in Model**: Explicit user consent required for cloud features
- **End-to-end Encryption**: Client-side encryption before any transmission
- **Zero-knowledge Architecture**: Service providers cannot access raw health data
- **Local Override**: All features continue to work purely locally

## Options Considered

### 1. Cloud-First Architecture
**Pros**: Easier sync, backup, analytics, therapist integration
**Cons**: Privacy risks, compliance complexity, user trust issues, network dependency
**Decision**: Rejected due to mental health privacy requirements and user trust

### 2. Hybrid Required Sync
**Pros**: Balance of local performance and cloud benefits
**Cons**: Forces cloud dependency, reduces user privacy control, compliance complexity
**Decision**: Rejected due to forced data sharing incompatible with mental health privacy

### 3. Local-First with Optional Sync (Chosen)
**Pros**: Maximum privacy, user control, offline functionality, trust building
**Cons**: More complex architecture, limited cross-device sync, backup challenges
**Decision**: Accepted as optimal for mental health data sensitivity

## Consequences

### Positive Privacy & Trust Benefits
- **Zero Data Exposure**: No mental health data leaves device without explicit user consent
- **Complete User Control**: Users own and control all their therapeutic data
- **Regulatory Compliance**: Simplified HIPAA/GDPR compliance with local-only processing
- **Offline Reliability**: All therapeutic features work without network connectivity
- **Trust Building**: Demonstrates commitment to mental health data protection

### Positive Technical Benefits
- **Performance**: Instant data access, no network latency for critical features
- **Simplicity**: Reduced architecture complexity in Phase 1
- **Cost Efficiency**: No cloud storage costs or data transfer expenses
- **Security**: Reduced attack surface with no network transmission layer

### Implementation Challenges
- **Cross-Device Sync**: Users must manually transfer data between devices
- **Backup Responsibility**: Users responsible for data backup through export
- **Analytics Limitations**: No usage analytics without user opt-in
- **Therapist Integration**: Requires manual export/import workflow initially

### Mitigation Strategies
- **Easy Export**: One-click PDF/CSV generation for backup and clinical sharing
- **Migration Path**: Clear architecture for Phase 2 optional cloud features
- **User Education**: Transparent communication about data location and control
- **Sync Planning**: Future opt-in cloud sync preserves local-first benefits

## Implementation Details

### Phase 1: Local Storage Architecture
```typescript
// Encrypted local storage layer
class SecureLocalStorage {
  private encryptionKey: string;
  
  async saveHealthData(data: HealthData): Promise<void> {
    const encrypted = await this.encrypt(JSON.stringify(data));
    await AsyncStorage.setItem(`health_${data.id}`, encrypted);
    await this.logAccess('WRITE', data.type, data.userId);
  }
  
  async getHealthData(id: string): Promise<HealthData | null> {
    const encrypted = await AsyncStorage.getItem(`health_${id}`);
    if (!encrypted) return null;
    
    await this.logAccess('read', 'health_data', this.getCurrentUser());
    const decrypted = await this.decrypt(encrypted);
    return JSON.parse(decrypted);
  }
}
```

### Data Organization Strategy
```yaml
storage_structure:
  user_profile: '@fullmind_user' # Non-health preferences, settings
  health_data: '@fullmind_health' # PHQ-9/GAD-7, mood data (encrypted)
  crisis_data: '@fullmind_crisis' # Crisis plans, emergency contacts (encrypted)
  usage_data: '@fullmind_usage' # Anonymous app usage (non-health)
  
encryption_strategy:
  health_data: AES-256 with device keychain storage
  crisis_data: AES-256 with additional biometric protection
  usage_data: Unencrypted (non-sensitive)
  
access_controls:
  health_data: Biometric + PIN authentication required
  crisis_data: Enhanced authentication for high-risk data
  export_functions: Additional confirmation for data sharing
```

### Performance Optimization
```typescript
// Efficient data access patterns
class PerformantHealthDataAccess {
  private cache = new Map<string, HealthData>();
  
  async getRecentAssessments(days: number = 30): Promise<Assessment[]> {
    // Use in-memory filtering for performance
    const allData = await this.getCachedHealthData();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return allData
      .filter(item => item.type === 'assessment')
      .filter(item => new Date(item.createdAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}
```

## Privacy Impact Assessment

### Data Minimization Compliance
```yaml
collected_data:
  necessary: PHQ-9/GAD-7 responses for clinical screening
  necessary: Mood data for therapeutic tracking
  necessary: Crisis plans for safety intervention
  unnecessary: Detailed personal history, social connections, location data
  
retention_policy:
  user_controlled: All retention periods configurable by user
  default_retention: 2 years with user extension options
  automatic_deletion: After user-defined periods with 30-day warning
```

### User Rights Implementation
```yaml
access_rights: Complete local data access through app interface
portability_rights: PDF/CSV export in standard formats
rectification_rights: Full editing capability for all user data
erasure_rights: Complete secure deletion with verification
restriction_rights: Granular data processing controls
```

## Phase 2: Optional Cloud Architecture (Future)

### User-Controlled Opt-in Model
```yaml
consent_requirements:
  explicit: Separate consent for each cloud feature
  granular: Individual control over data types shared
  revocable: One-click return to local-only mode
  transparent: Clear explanation of cloud processing
  
zero_knowledge_design:
  client_side_encryption: All encryption before transmission
  server_blind: Service providers cannot decrypt user data
  key_management: User-controlled encryption keys
  audit_trail: Complete access logging for user review
```

### Sync Strategy
```typescript
// Optional cloud sync preserving privacy
class PrivacyPreservingSync {
  async syncIfEnabled(data: HealthData): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user.cloudSyncEnabled) {
      return; // Respect local-only preference
    }
    
    // Client-side encryption before any network transmission
    const encrypted = await this.clientSideEncrypt(data, user.encryptionKey);
    const blindedData = this.removeIdentifiers(encrypted);
    
    await this.secureTransmit(blindedData);
    await this.logSyncActivity('data_synced', data.type, user.id);
  }
}
```

## Related Decisions
- ADR-001: React Native Architecture
- ADR-003: AsyncStorage to SQLite Migration Strategy
- ADR-004: Clinical Data Security Architecture
- ADR-005: User Data Export and Portability

## Review Date
**Next Review**: 2025-07-01 (6 months)  
**Trigger Events**:
- User feedback requesting cloud features
- Compliance requirement changes
- Performance issues with local storage
- Therapist integration requirements

## Clinical Impact Assessment

### Therapeutic Benefits
- **User Trust**: Complete privacy control increases willingness to share sensitive information
- **Data Integrity**: Local storage reduces data corruption risks from network issues
- **Therapeutic Continuity**: Offline functionality ensures uninterrupted MBCT practice
- **Crisis Reliability**: Emergency features work without network connectivity

### Safety Considerations
- **Crisis Access**: Local data ensures immediate access to crisis plans during emergencies
- **Data Loss Risk**: Users responsible for backup, but export functionality mitigates risk
- **Privacy Protection**: Maximized protection for vulnerable mental health populations
- **Compliance Simplification**: Reduced regulatory complexity builds user confidence

This local-first architecture prioritizes user privacy and trust while providing a clear path for optional cloud features when users choose to enable them. The approach respects the sensitive nature of mental health data and the vulnerable state of users seeking therapeutic support.