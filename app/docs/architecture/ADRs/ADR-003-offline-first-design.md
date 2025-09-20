# ADR-003: Offline-First Design Architecture

## Status
**ACCEPTED** - Core architecture implemented in v1.7, sync strategy planned for Phase 2

## Context

FullMind is a mental health MBCT companion app where network dependency creates unacceptable risks to user safety and therapeutic continuity. Based on our comprehensive project analysis and multi-agent coordination insights, the application must function completely offline while providing a pathway for optional future synchronization.

### Mental Health Context Requirements

**Critical Safety Imperatives:**
- **Crisis intervention cannot depend on network** - Emergency protocols must be instantly accessible
- **Therapeutic continuity** - MBCT practices must be available regardless of connectivity
- **Assessment integrity** - PHQ-9/GAD-7 scoring must work offline with 100% accuracy
- **User trust** - Mental health users require complete data control and privacy assurance

**User Experience Requirements:**
- **Seamless offline operation** - Users should not be aware of network status during core flows
- **Data persistence guarantee** - No mental health data loss under any network condition
- **Performance consistency** - Same response times online/offline for therapeutic flows
- **Privacy assurance** - Users control if/when any data leaves their device

### Technical Context (from TRD v2.0 Analysis)

**Current Implementation:**
- React Native + Expo SDK 50 platform
- AsyncStorage with AES-256 encryption (ADR-001)
- Crisis detection with evidence-based thresholds (ADR-002)
- 100% offline functionality in v1.7 production release

**Future Considerations:**
- Multi-device user scenarios emerging in Phase 2
- Therapist collaboration features requiring selective data sharing
- Advanced analytics requiring cloud processing capabilities
- Family crisis sharing features (emergency contacts across devices)

### Domain Authority Requirements

**Crisis Agent Priority:**
- Zero network dependency for any safety-critical functionality
- Emergency protocols must work in airplane mode, poor reception, or network outages
- Crisis data (plans, contacts) must be immediately accessible regardless of connectivity

**Clinician Agent Requirements:**
- Therapeutic data integrity maintained offline
- Clinical assessment accuracy preserved without network
- MBCT practice continuity unaffected by connectivity changes

**Compliance Agent Requirements:**
- User data control maintained (offline-first supports privacy)
- Audit trail capability for future sync (when user opts in)
- HIPAA-ready architecture that works offline-first

## Decision

**Implement a comprehensive offline-first architecture with optional, user-controlled synchronization capabilities in Phase 2.**

### Core Architecture Decision

```typescript
// Offline-First Architecture Principles
interface OfflineFirstArchitecture {
  core_principle: 'All functionality works offline by default';
  data_strategy: 'Local-first with optional sync';
  user_control: 'Explicit opt-in for any network data transmission';
  performance: 'Network availability does not affect app performance';
  crisis_safety: 'Emergency protocols independent of connectivity';
}

// Implementation Strategy
class OfflineFirstDataLayer {
  // Primary data always local
  private local_storage: AsyncStorageWithEncryption;
  
  // Optional sync layer (Phase 2)
  private sync_service?: OptionalSyncService;
  
  // Network status awareness without dependency
  private network_monitor: NetworkStatusMonitor;
  
  constructor() {
    // App works regardless of network_monitor status
    this.initializeOfflineCapabilities();
    
    // Sync only activated when user explicitly enables
    if (user.preferences.sync_enabled) {
      this.initializeOptionalSync();
    }
  }
}
```

### Offline-First Design Patterns

**1. Local-Primary Data Architecture**
```typescript
interface LocalPrimaryPattern {
  data_source: 'Local AsyncStorage (encrypted)';
  sync_direction: 'Local → Cloud (when enabled)';
  conflict_resolution: 'Local data authority';
  network_failure_behavior: 'Continue normal operation';
}

class LocalPrimaryDataService {
  // All operations work locally first
  async saveCheckIn(data: CheckInData): Promise<void> {
    // Save locally (always succeeds)
    await this.local_storage.save(data);
    
    // Optionally sync if enabled and network available
    if (this.shouldSync()) {
      this.queueForSync(data); // Non-blocking
    }
  }
  
  async getCheckIns(period: TimePeriod): Promise<CheckIn[]> {
    // Always return local data
    return await this.local_storage.getCheckIns(period);
  }
}
```

**2. Graceful Degradation Pattern**
```typescript
class GracefulDegradationService {
  // Enhanced features work offline with reduced functionality
  async getInsights(): Promise<UserInsights> {
    // Basic insights always available offline
    const local_insights = await this.generateLocalInsights();
    
    // Advanced insights only when network available (non-critical)
    if (this.network_available && this.user.advanced_features_enabled) {
      try {
        const cloud_insights = await this.getCloudInsights();
        return this.mergeInsights(local_insights, cloud_insights);
      } catch (network_error) {
        // Gracefully fallback to local insights
        return local_insights;
      }
    }
    
    return local_insights;
  }
}
```

**3. Optimistic Updates Pattern**
```typescript
class OptimisticUpdateService {
  // UI updates immediately, sync happens in background
  async saveAssessment(assessment: PHQ9 | GAD7): Promise<void> {
    // Update UI immediately with optimistic response
    this.ui_state.updateAssessmentScore(assessment);
    
    // Save locally (critical path - must succeed)
    await this.local_storage.saveAssessment(assessment);
    
    // Check for crisis (offline capability)
    const crisis_detection = await this.crisis_service.checkThresholds(assessment);
    if (crisis_detection.level !== 'STANDARD') {
      await this.activateCrisisProtocols(crisis_detection);
    }
    
    // Optional sync (non-critical path)
    this.backgroundSyncIfEnabled(assessment);
  }
}
```

### Phase 2 Synchronization Strategy

**User-Controlled Opt-In Sync**
```typescript
interface Phase2SyncArchitecture {
  trigger: 'User explicitly enables sync in settings';
  privacy_model: 'End-to-end encryption, zero-knowledge server';
  sync_granularity: 'User chooses what data to sync';
  multi_device: 'Primary device designates, others sync from';
  conflict_resolution: 'Primary device wins, with user notification';
}

class OptionalSyncService {
  async enableSync(user_preferences: SyncPreferences): Promise<void> {
    // User chooses data categories to sync
    const sync_categories = {
      basic_settings: user_preferences.sync_settings, // Theme, notifications
      check_in_data: user_preferences.sync_checkins, // Mood tracking
      assessment_data: user_preferences.sync_assessments, // Clinical data
      crisis_data: user_preferences.sync_crisis_plan // Emergency info
    };
    
    // Initialize end-to-end encryption
    const encryption_keys = await this.generateUserEncryptionKeys();
    
    // Setup selective sync based on user choices
    await this.configureSyncCategories(sync_categories);
  }
  
  // Conflict resolution favors local data
  async handleSyncConflict(
    local_data: any, 
    cloud_data: any
  ): Promise<ConflictResolution> {
    
    // Mental health data: local device is always authoritative
    if (this.isMentalHealthData(local_data)) {
      return {
        resolution: 'LOCAL_WINS',
        rationale: 'Mental health data prioritizes user device authority',
        action: 'Update cloud with local data'
      };
    }
    
    // Settings: present choice to user
    return {
      resolution: 'USER_CHOICE',
      options: [local_data, cloud_data],
      default: local_data
    };
  }
}
```

## Rationale

### Why Offline-First is Critical for Mental Health Apps

**1. Crisis Intervention Safety**
- **Network outages during crisis**: Users experiencing mental health crises may be in locations with poor connectivity
- **Emergency response reliability**: Crisis protocols must work in airplane mode, rural areas, or during natural disasters
- **User trust requirement**: Knowledge that help is always available increases user confidence in using the app

**2. Therapeutic Continuity**
- **Daily MBCT practices**: Morning/midday/evening practices must be available regardless of network status
- **Assessment reliability**: PHQ-9/GAD-7 assessments must work offline with 100% accuracy
- **Data integrity**: Therapeutic progress tracking cannot be interrupted by connectivity issues

**3. Mental Health Privacy Concerns**
- **User control**: Many mental health users prefer complete data control
- **Stigma reduction**: Offline-first eliminates concerns about corporate data mining
- **Trust building**: Users can begin using app without any data sharing concerns

### Alternative Architectures Considered

**Alternative 1: Cloud-First with Offline Caching**
- **Approach**: Primary data stored in cloud, local caching for offline access
- **Advantages**: Natural multi-device sync, centralized backup
- **Rejected because**:
  - Network dependency for primary functionality
  - Crisis intervention could fail during outages  
  - Mental health users lose data control
  - Violates core privacy requirements
  - Performance latency for critical mental health flows

**Alternative 2: Hybrid Online/Offline with Required Features Split**
- **Approach**: Basic features offline, advanced features require network
- **Advantages**: Simpler implementation, clear feature boundaries
- **Rejected because**:
  - Creates confusing user experience (some features work, others don't)
  - Advanced mental health insights should not depend on network
  - Violates mental health app usability principles
  - Users cannot predict app behavior based on connectivity

**Alternative 3: Progressive Web App (PWA)**
- **Approach**: Web-based with service worker offline capabilities
- **Advantages**: Cross-platform consistency, easy deployment
- **Rejected because** (from TRD v2.0 analysis):
  - Insufficient offline capabilities for complex mental health features
  - Performance limitations for therapeutic audio/haptic features
  - Reduced user trust for mental health apps (native apps preferred)
  - Limited access to native crisis intervention features

**Alternative 4: Complete Offline-Only (No Sync Path)**
- **Approach**: Pure local storage, no network features planned
- **Advantages**: Maximum privacy, simplest implementation
- **Rejected because**:
  - Limits future collaborative features (therapist integration)
  - No path for multi-device use cases
  - Prevents advanced analytics for personalized insights
  - Reduces long-term competitive positioning

### Decision Matrix Analysis

| Architecture | Crisis Safety | User Privacy | Performance | Future Features | Implementation |
|--------------|---------------|--------------|-------------|-----------------|----------------|
| **Offline-First + Optional Sync** | ✅ Excellent | ✅ User Control | ✅ Consistent | ✅ Flexible | ✅ Moderate |
| Cloud-First + Cache | ❌ Network Dependent | ❌ Reduced Control | ⚠️ Variable | ✅ Rich | ✅ Standard |
| Hybrid Split | ⚠️ Partial Safety | ⚠️ Partial Control | ❌ Inconsistent | ⚠️ Limited | ❌ Complex |
| PWA | ❌ Limited Offline | ⚠️ Browser Control | ❌ Performance Issues | ❌ Platform Limited | ✅ Simple |
| Offline-Only | ✅ Perfect Safety | ✅ Complete Privacy | ✅ Maximum | ❌ No Collaboration | ✅ Simple |

## Consequences

### Positive Consequences

**Immediate User Benefits:**
1. **Crisis safety guaranteed** - Emergency protocols work in airplane mode
2. **Therapeutic reliability** - MBCT practices never interrupted by connectivity
3. **Performance consistency** - Same response times regardless of network status
4. **Privacy assurance** - Users maintain complete control over mental health data
5. **Trust building** - Users can start using app without any data sharing

**Clinical Benefits:**
1. **Assessment continuity** - PHQ-9/GAD-7 scoring works offline with 100% accuracy
2. **Data integrity** - No mental health data loss due to network issues
3. **Therapeutic flow** - Mindfulness practices not disrupted by network calls
4. **Crisis intervention reliability** - Emergency features always available

**Technical Benefits:**
1. **Simplified architecture** - No complex network state management
2. **Performance optimization** - No network latency in critical paths
3. **Testing simplicity** - Offline behavior is predictable and testable
4. **Battery optimization** - Reduced network usage improves battery life

### Challenges and Mitigations

**Challenge 1: Multi-Device Use Cases**
- **Problem**: Users want to access data from multiple devices
- **Phase 1 Mitigation**: Export/import functionality for manual data transfer
- **Phase 2 Solution**: Optional end-to-end encrypted sync with user control
- **Timeline**: Q1 2025 sync capabilities based on user demand

**Challenge 2: Advanced Analytics Limitations**
- **Problem**: Complex pattern analysis may benefit from cloud processing
- **Mitigation**: Local analytics algorithms provide meaningful insights
- **Enhancement**: Cloud analytics as opt-in enhancement, not core dependency
- **Balance**: 80% of valuable insights available offline

**Challenge 3: Collaborative Features (Therapist Integration)**
- **Problem**: Sharing data with therapists requires network connectivity
- **Mitigation**: Comprehensive export functionality for clinical sharing
- **Phase 2 Enhancement**: Secure therapist portals with user-controlled sharing
- **Principle**: Collaboration features supplement, never replace offline core

**Challenge 4: Backup and Recovery**
- **Problem**: Single device storage creates backup responsibility for user
- **Immediate Mitigation**: Built-in export reminders and documentation backup
- **Enhanced Solution**: Local document backup to device file system
- **Phase 2**: Optional encrypted cloud backup with user keys

### Implementation Strategies

**Offline-First Development Patterns**

```typescript
// 1. Network-Agnostic Service Pattern
class NetworkAgnosticService {
  async performOperation(data: any): Promise<Result> {
    // Always complete core functionality
    const local_result = await this.executeLocally(data);
    
    // Optional enhancement if network available
    if (this.networkAvailable() && this.userOptedIn()) {
      this.enhanceWithNetworkData(local_result); // Non-blocking
    }
    
    return local_result; // Always return local result
  }
}

// 2. Graceful Network Enhancement Pattern  
class GracefulEnhancementService {
  async getTherapeuticInsights(): Promise<InsightData> {
    // Core insights always available
    const core_insights = await this.generateCoreInsights();
    
    // Enhanced insights when possible
    try {
      if (this.canUseNetwork()) {
        const enhanced = await Promise.race([
          this.getEnhancedInsights(),
          this.timeout(5000) // Don't wait too long
        ]);
        return this.mergeInsights(core_insights, enhanced);
      }
    } catch (network_error) {
      // Silently fallback to core insights
    }
    
    return core_insights;
  }
}

// 3. Optimistic Sync Pattern
class OptimisticSyncService {
  async saveUserData(data: UserData): Promise<void> {
    // Critical path: Save locally first
    await this.local_storage.save(data);
    
    // Non-critical path: Sync if enabled
    if (this.syncEnabled()) {
      this.backgroundSync(data).catch(error => {
        // Log error but don't affect user experience
        this.logger.info('Sync failed, data safe locally', error);
      });
    }
  }
}
```

### Phase 2 Sync Architecture Design

**End-to-End Encryption Sync Model**
```typescript
interface Phase2SyncModel {
  encryption: 'End-to-end, zero-knowledge server';
  key_management: 'User device generates and holds keys';
  server_role: 'Encrypted blob storage only';
  conflict_resolution: 'Local device authority';
  user_control: 'Granular sync category selection';
}

class SecureSyncArchitecture {
  // User generates encryption keys locally
  async initializeUserSync(): Promise<SyncConfiguration> {
    const user_keypair = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['encrypt', 'decrypt']
    );
    
    const sync_categories = {
      app_settings: true,     // Theme, notifications (low sensitivity)
      mood_data: false,       // User chooses (medium sensitivity)  
      assessments: false,     // User chooses (high sensitivity)
      crisis_plan: false      // User chooses (highest sensitivity)
    };
    
    return {
      encryption_keys: user_keypair,
      sync_categories: sync_categories,
      primary_device: this.device_id,
      sync_enabled: false // User must explicitly enable
    };
  }
  
  // Selective sync based on user preferences
  async syncUserData(categories: SyncCategory[]): Promise<SyncResult> {
    const results = [];
    
    for (const category of categories) {
      if (this.user_preferences.sync_categories[category]) {
        const local_data = await this.getLocalData(category);
        const encrypted_data = await this.encryptForSync(local_data);
        
        try {
          await this.uploadEncryptedData(category, encrypted_data);
          results.push({ category, status: 'SUCCESS' });
        } catch (sync_error) {
          results.push({ category, status: 'FAILED', error: sync_error });
          // Continue with other categories
        }
      }
    }
    
    return { results, local_data_intact: true };
  }
}
```

### User Experience Design

**Transparent Offline Operation**
```typescript
class TransparentOfflineUX {
  // Users shouldn't notice offline vs online
  renderNetworkStatus(): React.Component {
    // Only show network status for optional features
    if (this.user_has_sync_enabled && !this.network_available) {
      return <SubtleNotification>Sync will resume when online</SubtleNotification>;
    }
    
    // For core features, show nothing - they always work
    return null;
  }
  
  // Educational messaging about offline capabilities
  renderOfflineCapabilityInfo(): React.Component {
    return (
      <InfoSection>
        <Icon name="shield" />
        <Text>All core features work offline for your privacy and reliability</Text>
        <OptionalText>Enable sync in settings for multi-device access</OptionalText>
      </InfoSection>
    );
  }
}
```

## Validation Criteria

### Offline Functionality Validation

**Core Feature Validation:**
- ✅ **Morning MBCT practice**: Complete flow works in airplane mode
- ✅ **Crisis intervention**: Emergency protocols accessible without network
- ✅ **Assessment completion**: PHQ-9/GAD-7 scoring 100% accurate offline
- ✅ **Data persistence**: All user data survives app restart without network
- ✅ **Export functionality**: PDF/CSV generation works offline

**Performance Validation:**
- ✅ **Response time consistency**: Same performance online vs offline
- ✅ **Cold start time**: <3s startup without network dependency
- ✅ **Memory usage**: No network-related memory leaks or bloat
- ✅ **Battery life**: Offline operation extends battery vs network polling

**User Experience Validation:**
- ✅ **Transparent operation**: Users report not noticing network status
- ✅ **Crisis access**: <3 taps to emergency contacts from any screen
- ✅ **Data confidence**: Users trust their data is always available
- ✅ **Feature parity**: No feature degradation in offline mode

### Phase 2 Sync Validation Criteria

**Security Validation:**
- End-to-end encryption implementation verified by security audit
- Zero-knowledge server architecture confirmed (server cannot decrypt data)
- User key management tested across device loss scenarios
- Sync conflict resolution preserves local data authority

**User Control Validation:**  
- Granular sync category selection working as designed
- Opt-out from sync maintains full offline functionality
- Export/import remains available as sync alternative
- User data deletion removes both local and synced copies

**Performance Validation:**
- Sync operations don't affect offline performance
- Background sync doesn't impact battery life significantly
- Network failures don't interrupt core app functionality
- Large data sync completes reliably with progress indication

## Monitoring and Evolution

### Offline Functionality Monitoring

**Daily Monitoring:**
- Core feature usage patterns (offline vs online)
- Crisis intervention access times regardless of network status
- Data persistence success rates
- User satisfaction with offline capabilities

**Weekly Analysis:**
- Network dependency issues (should be zero for core features)
- Offline vs online performance comparison
- User requests for network-dependent features
- Export functionality usage patterns

**Monthly Review:**
- User feedback on offline experience quality
- Analysis of network-related support requests (should be minimal)
- Evaluation of Phase 2 sync demand signals
- Technical debt assessment of offline architecture

### Phase 2 Sync Evolution Triggers

**User Demand Triggers:**
- >30% of users request multi-device access
- >20% of users regularly use export/import for device switching  
- >40% of users express interest in therapist collaboration features
- Competitive pressure from sync-enabled mental health apps

**Technical Readiness Triggers:**  
- End-to-end encryption implementation completed and audited
- User authentication system designed and tested
- Conflict resolution algorithms validated
- Network reliability improved to support mental health app needs

**Business Model Triggers:**
- Revenue model supports sync infrastructure costs
- User willingness to pay for sync features validated
- Competitive differentiation requires enhanced collaboration features
- Strategic partnerships (healthcare providers) require data sharing capabilities

### Long-Term Architecture Evolution

**Phase 3: Advanced Collaboration (2026+)**
- Secure family crisis plan sharing
- Therapist portal integration with selective data sharing
- Anonymous research contribution with user consent
- Community features with privacy-preserving architecture

**Technology Evolution Monitoring:**
- Web3/blockchain opportunities for user-controlled health data
- Advanced local AI capabilities reducing cloud processing needs
- Improved mobile device capabilities enhancing offline features
- Mental health industry standards evolution affecting architecture decisions

## Related Documents

**Core Architecture Documents:**
- ADR-001: Local-First Storage Architecture (foundation for offline-first)
- ADR-002: Crisis Detection Thresholds (offline crisis capability requirements)
- TRD v2.0: React Native technical implementation details
- Performance Benchmarking Report: Offline vs online performance metrics

**Security and Privacy:**
- Security Implementation Guide: Encryption for offline and sync
- Privacy Impact Assessment: User data control analysis
- HIPAA Compliance Review: Offline-first privacy advantages

**User Experience:**
- User Research Report: Mental health user preferences for data control
- Usability Testing Results: Offline functionality user experience validation
- Crisis UX Design: Emergency feature accessibility design

**Future Planning:**
- Phase 2 Sync Architecture Plan: Technical specification for optional sync
- Therapist Integration Requirements: Clinical collaboration features
- Multi-Device Strategy: User experience across device ecosystem

---

*This ADR establishes the foundation for a mental health app that prioritizes user safety, privacy, and therapeutic continuity through comprehensive offline functionality, while providing a clear path for enhanced collaboration features when users choose to enable them.*