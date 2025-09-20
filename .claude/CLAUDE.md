# Being. MBCT App Configuration

## Project Context
Mobile app delivering clinical-grade MBCT practices
- Version: v1.7 prototype complete
- Target: App stores in 8 weeks
- Stack: React Native, Expo, TypeScript, Zustand

## Specialized Agent Configuration

### Domain-Specific Agents (USE PROACTIVELY)

**clinician**: Validates therapeutic content, check-in flows, and clinical language for MBCT compliance and effectiveness
- Trigger: Any changes to PHQ-9/GAD-7 content, therapeutic language, or assessment flows
- Validation: MBCT compliance, clinical terminology accuracy, therapeutic effectiveness
- Required for: Assessment screens, crisis detection, mood tracking language

**compliance**: Ensures regulatory compliance, privacy protection, and legal adherence for mental health data handling
- Trigger: Data collection features, privacy policies, user consent flows
- Validation: HIPAA compliance (where applicable), data protection, healthcare app regulations
- Required for: AsyncStorage data handling, user data collection, app store compliance

**crisis**: Validates crisis intervention protocols, safety detection mechanisms, and emergency response workflows
- Trigger: PHQ-9/GAD-7 crisis thresholds, emergency contact features, safety protocols
- Validation: Crisis detection accuracy, response time requirements, safety protocols
- Required for: Assessment scoring, crisis button functionality, emergency workflows

**accessibility**: Comprehensive accessibility assessment and inclusive design for mental health users
- Trigger: UI components, navigation flows, interactive elements
- Validation: WCAG AA compliance, screen reader compatibility, inclusive design
- Required for: All user-facing components, especially crisis and assessment flows

### When to Use Specialized Agents
- **Before implementing**: Any assessment, crisis, or therapeutic content
- **During development**: Regular validation of clinical accuracy and compliance
- **Before deployment**: Comprehensive accessibility and compliance review

### Intern Agent Boundaries
**PROHIBITED**: clinical|crisis|compliance|PHI|MBCT|PHQ-9|GAD-7|therapeutic|AsyncStorage|security
**ALLOWED**: formatting|imports|scaffolding(non-clinical)|file-org|config(non-security)
**AUTO-ESCALATE**: healthcare-terms|/assessment/|/crisis/|/clinical/|/therapeutic/
**VALIDATION**: domain-authority-review-required

## Domain Authority Coordination Framework

### Authority Hierarchy for Being.

**Level 1: Domain Authorities (Non-Negotiable)**
- **crisis**: Safety protocols and emergency response - highest priority for user safety
- **compliance**: HIPAA/privacy requirements - legal protection and regulatory adherence  
- **clinician**: MBCT therapeutic standards - clinical effectiveness and appropriateness

**Level 2: Strategic Coordinator**
- **architect**: Technical strategy that satisfies all domain authority requirements

**Level 3: Technical Implementation**
- All technical agents implement within domain authority constraints

### Domain Authority Integration Patterns

**Pattern 1: Safety-First Validation (Crisis-Led)**
```
crisis → (compliance + clinician) → architect → technical implementation
Use for: Crisis detection, emergency protocols, safety-critical features
```

**Pattern 2: Compliance-Constrained Development**
```
compliance → technical requirements → (crisis + clinician) validation → implementation  
Use for: Data handling, user consent, privacy features
```

**Pattern 3: Therapeutic Effectiveness Validation**
```
clinician → therapeutic requirements → (crisis + compliance) safety/legal check → implementation
Use for: Assessment content, check-in flows, MBCT practices
```

**Pattern 4: Parallel Domain Validation**
```
(clinician + crisis + compliance) parallel → architect synthesis → technical implementation
Use for: Major features affecting multiple domains
```

### Conflict Resolution Protocol

**Domain Authority Conflicts**:
1. **Crisis vs Compliance**: Crisis safety takes precedence, compliance finds legal path to safety
2. **Compliance vs Clinician**: Compliance sets legal boundaries, clinician optimizes within constraints  
3. **Crisis vs Clinician**: Safety protocols override therapeutic preferences, clinician guides recovery

**Technical vs Domain Conflicts**:
1. **Performance vs Safety**: architect mediates with safety as priority
2. **UX vs Compliance**: architect finds compliant UX solutions
3. **Feature Scope vs Domain Limits**: Domain authorities define non-negotiable boundaries

### Complex Handoff Protocol for Safety-Critical Work

**Required for all domain authority coordination**:
```
"[DOMAIN_AGENT] Critical Analysis:

DOMAIN REQUIREMENTS:
✓ [REQUIREMENT_1]: [SPECIFIC_COMPLIANCE/SAFETY/CLINICAL_DETAIL]
✓ [REQUIREMENT_2]: [NON_NEGOTIABLE_CONSTRAINT]

TECHNICAL CONTEXT:  
✓ [CONTEXT_1]: [IMPLEMENTATION_REQUIREMENT]
✓ [CONTEXT_2]: [INTEGRATION_CONSTRAINT]

HANDOFF VALIDATION:
"I understand [CRITICAL_ASPECT]: [CONFIRMATION_OF_DOMAIN_REQUIREMENT]
I have [DOMAIN_CONTEXT]: [ACKNOWLEDGMENT_OF_CONSTRAINTS]
I will ensure [COMPLIANCE_ASPECT]: [COMMITMENT_TO_DOMAIN_STANDARDS]"

[TARGET_AGENT] MUST ADDRESS:
- [CRITICAL_REQUIREMENT]: [NON_NEGOTIABLE_SAFETY/LEGAL/CLINICAL_ASPECT]
- [VALIDATION_PROTOCOL]: [HOW_DOMAIN_COMPLIANCE_WILL_BE_VERIFIED]"
```

### Domain-Specific Trigger Conditions

**Automatic Crisis Agent Involvement**:
- PHQ-9/GAD-7 scoring or threshold modifications
- Crisis button functionality or emergency contact features
- Assessment result handling that could affect crisis detection
- Any feature that could impact user safety during mental health crisis

**Automatic Compliance Agent Involvement**:
- Data storage, encryption, or AsyncStorage modifications
- User consent flows or privacy policy changes
- Network data transmission features (future phases)
- App store submission or regulatory documentation

**Automatic Clinician Agent Involvement**:
- Assessment content, scoring algorithms, or clinical language
- Therapeutic exercise content or MBCT practice modifications  
- Check-in flow logic or mood tracking features
- Any content that could affect therapeutic outcomes

## Being.-Specific Workflow Templates

### Template F1: Clinical Content Validation
**Use When**: Implementing therapeutic content, assessments, or MBCT practices  
**Duration**: 60-120 minutes | **Agents**: 4-5 | **Complexity**: High (clinical accuracy)

```
1. clinician: "Comprehensive MBCT compliance review of [THERAPEUTIC_CONTENT] for clinical appropriateness and effectiveness"

2. accessibility: "Review [THERAPEUTIC_CONTENT] for inclusive design and cognitive accessibility in mental health context"

3. react: "Implement therapeutic content presentation ensuring MBCT compliance and optimal user experience"

4. test: "Validate therapeutic content implementation including user journey and clinical accuracy"

5. [OPTIONAL] crisis: "Review content for crisis trigger potential and safety considerations"
```

### Template F2: Crisis Protocol Implementation
**Use When**: Implementing safety features, crisis detection, or emergency protocols  
**Duration**: 120-240 minutes | **Agents**: 7-8 | **Complexity**: Critical (safety-first)

```
1. crisis: "Design crisis detection and intervention protocols for [CRISIS_SCENARIO] with user safety prioritization"

2. [PARALLEL_DOMAIN_VALIDATION]:
   - clinician: "Validate crisis protocols maintain therapeutic appropriateness and MBCT compliance"
   - compliance: "Ensure crisis protocols meet legal requirements and privacy protection"

3. architect: "Design technical architecture for crisis protocol implementation with reliability and speed priority"

4. [PARALLEL_IMPLEMENTATION]:
   - react: "Implement crisis detection and intervention UI with clear, accessible emergency design"
   - typescript: "Create type-safe crisis protocol data structures and state management"
   - security: "Secure crisis data handling and emergency contact management"

5. accessibility: "Validate crisis interfaces are accessible under stress and emergency conditions"

6. test: "Create comprehensive crisis protocol testing including edge cases and failure scenarios"

7. deploy: "Implement emergency deployment procedures for crisis protocol updates"
```

### Template F3: Assessment Implementation  
**Use When**: Implementing PHQ-9/GAD-7 or other clinical assessments  
**Duration**: 90-150 minutes | **Agents**: 5-6 | **Complexity**: Critical (100% accuracy)

```
1. clinician: "Validate assessment content, scoring algorithms, and clinical thresholds for [ASSESSMENT_TYPE]"

2. [PARALLEL_TECHNICAL]:
   - typescript: "Implement type-safe assessment scoring with 100% accuracy validation"
   - state: "Design secure assessment data storage and retrieval patterns"

3. crisis: "Validate crisis thresholds and automatic intervention triggers for [ASSESSMENT_TYPE]"

4. react: "Implement assessment UI with therapeutic presentation and accessibility"

5. test: "Create exhaustive assessment testing including all possible score combinations and edge cases"

6. accessibility: "Ensure assessment is fully accessible and cognitive load appropriate for mental health users"
```

### Template F4: HIPAA Compliance Implementation  
**Use When**: Implementing data handling, storage, or privacy features  
**Duration**: 150-240 minutes | **Agents**: 6-7 | **Complexity**: Critical (regulatory)

```
1. compliance: "Comprehensive HIPAA compliance analysis for [FEATURE/SYSTEM] including data handling requirements"

2. [PARALLEL_IMPLEMENTATION]:
   - security: "Implement HIPAA-compliant data encryption, access controls, and audit logging"
   - api: "Design HIPAA-compliant API patterns with proper data minimization and protection"

3. architect: "Validate HIPAA implementation maintains system architecture and performance requirements"

4. [TECHNICAL_INTEGRATION]:
   - react: "Implement HIPAA-compliant user interfaces with proper consent and data handling"
   - state: "Implement secure state management with HIPAA-compliant data lifecycle"

5. test: "Create HIPAA compliance testing including data protection, access controls, and audit trails"

6. deploy: "Implement HIPAA-compliant deployment with proper environment security and monitoring"
```

### Template F5: Therapeutic Feature Development
**Use When**: Building MBCT exercises, check-in flows, or mood tracking  
**Duration**: 120-180 minutes | **Agents**: 6-7 | **Complexity**: High (therapeutic effectiveness)

```
1. clinician: "Design therapeutic approach for [FEATURE] ensuring MBCT compliance and clinical effectiveness"

2. architect: "Design technical architecture supporting therapeutic goals while maintaining performance"

3. [PARALLEL_IMPLEMENTATION]:
   - react: "Implement [FEATURE] with therapeutic-grade user experience and timing accuracy"
   - typescript: "Create type-safe interfaces for therapeutic data and state management"
   - state: "Implement mood tracking and therapeutic data patterns with proper persistence"

4. accessibility: "Ensure [FEATURE] is accessible and inclusive for diverse mental health needs"

5. test: "Create therapeutic feature testing including user journey validation and clinical accuracy"

6. performance: "Validate [FEATURE] meets mental health UX performance requirements (timing, responsiveness)"

7. review: "Final validation of therapeutic feature quality and MBCT compliance"
```

### Template F6: Emergency Response Workflow
**Use When**: Rapid response to critical bugs affecting user safety  
**Duration**: 30-90 minutes | **Agents**: 4-6 | **Complexity**: Critical (emergency speed)

```
1. crisis: "Immediate safety impact assessment of [EMERGENCY_ISSUE] and required protocols"

2. [PARALLEL_EMERGENCY_RESPONSE]:
   - compliance: "Legal and liability implications of [EMERGENCY_ISSUE]"
   - clinician: "Therapeutic impact and user safety considerations"

3. architect: "Emergency technical response strategy prioritizing user safety"

4. [RAPID_IMPLEMENTATION]:
   - [TECHNICAL_AGENTS]: "Implement emergency fix with safety validation"
   - security: "Validate security implications of emergency response"

5. test: "Rapid but comprehensive validation of emergency fix"

6. deploy: "Emergency deployment with monitoring for user safety impact"
```

### Being. Template Selection Guide

**Clinical Content** → Template F1: Clinical Content Validation  
**Safety Crisis** → Template F2: Crisis Protocol Implementation  
**Assessment Features** → Template F3: Assessment Implementation  
**Data Privacy** → Template F4: HIPAA Compliance Implementation  
**MBCT Features** → Template F5: Therapeutic Feature Development  
**Emergency Response** → Template F6: Emergency Response Workflow

### Integration with Global Agent Framework

**Global Framework Reference**: See `~/.claude/CLAUDE.md` for complete 14-agent coordination system

**Universal Templates** (Use for non-domain-specific work):
- **Component Development** → Global Template 5: Component Development  
- **Performance Issues** → Global Template 3: Performance Optimization
- **General Bug Fixes** → Global Template 2: Bug Resolution
- **Security Reviews** → Global Template 4: Security Review (+ compliance validation)

**Technical Agent Coordination**: All technical agents (react, typescript, performance, state, security, test, review, api, deploy, accessibility) follow global framework patterns but must integrate with Being. domain authorities.

**Context Management**: Use global handoff protocols (Simple/Standard/Complex) with Complex Protocol required for all safety-critical or regulatory work.

**Decision Framework**: 
1. **Single Agent** (90%) → Use global guidelines, add domain validation for safety-critical
2. **Core 6 Templates** (8%) → Use global templates, integrate Being. domain authorities  
3. **Being. Templates** (2%) → Use specialized templates F1-F6 for domain-specific work

**Escalation Path**: Single Agent → Being. Template → Global Template + Domain Coordination → Architect Coordination

### When to Use Being. vs Global Templates

**Use Being. Templates (F1-F6) when**:
- Clinical content, assessments, or MBCT practices involved
- Crisis detection, safety protocols, or emergency features
- HIPAA compliance or healthcare data handling required
- Therapeutic effectiveness or user safety considerations

**Use Global Templates (1-6) when**:
- General React Native development without clinical content
- Technical infrastructure, performance optimization
- Non-clinical UI components or standard app features  
- Development tooling, testing, or deployment workflows

**Integration Requirement**: All Being. work must satisfy both global technical standards and domain authority requirements.

## Critical Requirements

⚠️ NEVER MODIFY WITHOUT APPROVAL:
- PHQ-9/GAD-7 exact clinical wording
- Scoring algorithms (100% accuracy required)
- Crisis hotline: 988
- 3-minute breathing timing (exactly 60s per step)

### Clinical Accuracy Standards
- **Assessment Scoring**: Zero tolerance for calculation errors in PHQ-9/GAD-7
- **Crisis Detection**: Automatic triggering at clinical thresholds (PHQ-9 ≥20, GAD-7 ≥15)
- **Therapeutic Language**: MBCT-compliant terminology only, validated by clinician agent
- **Data Validation**: 100% accuracy on mood tracking algorithms and check-in flows
- **Response Times**: Crisis button accessible in <3 seconds from any screen

### Compliance & Privacy Standards
- **Data Encryption**: AsyncStorage must encrypt all sensitive mood and assessment data
- **Network Restrictions**: No personal/health data transmitted over network in Phase 1
- **User Consent**: Clear opt-in for all data collection with granular controls
- **Crisis Protocols**: Emergency contact integration without logging personal data
- **HIPAA Awareness**: Design patterns that support future HIPAA compliance

## Performance Baselines for Mental Health UX

### Critical Performance Requirements
- **Breathing Circle Animation**: Consistent 60fps during 3-minute sessions
- **Check-in Flow Transitions**: <500ms between steps to maintain therapeutic flow
- **Crisis Button Response**: <200ms from tap to crisis screen display
- **App Launch Time**: <2 seconds to home screen for immediate access
- **Assessment Loading**: <300ms to load PHQ-9/GAD-7 screens

### Memory & Storage
- **AsyncStorage Efficiency**: Optimized for frequent mood data writes
- **Bundle Size Awareness**: Monitor impact of therapeutic content on app size
- **Background Processing**: Maintain breathing timer accuracy during backgrounding

## Healthcare-Specific Testing Requirements

### Clinical Accuracy Testing (100% Coverage Required)
```yaml
Assessment Flows:
  - PHQ-9: All 27 possible score combinations validated
  - GAD-7: All 21 possible score combinations validated  
  - Crisis Detection: Automatic triggering at thresholds
  - Score Persistence: Accurate storage and retrieval from AsyncStorage

Crisis Management:
  - Emergency Button: <3 second access from every screen
  - Hotline Integration: 988 calling functionality
  - Crisis Plan: User-defined safety plan creation and access
  
Therapeutic Accuracy:
  - Breathing Timing: Exactly 60s per step (180s total)
  - Check-in Completeness: All required fields captured
  - Progress Tracking: Accurate mood trend calculations
```

### Cross-Platform Parity Testing
- **iOS/Android UX**: Identical user experience and therapeutic effectiveness
- **Device Compatibility**: Testing across screen sizes for accessibility
- **Performance Consistency**: Same response times across platforms

### Accessibility Compliance (WCAG AA)
- **Screen Reader**: Full compatibility with VoiceOver/TalkBack
- **Color Contrast**: 4.5:1 minimum for all therapeutic content
- **Touch Targets**: Minimum 44px for crisis and assessment interactions
- **Focus Management**: Logical tab order through all flows

## State Management Patterns (Zustand)

### Health Data Stores Organization
```typescript
// Separate stores for different data sensitivity levels
userStore: Profile, preferences, non-clinical settings
checkInStore: Daily mood data, check-in responses  
assessmentStore: PHQ-9/GAD-7 scores, clinical data
crisisStore: Emergency contacts, safety plans
```

### Data Persistence Patterns
- **Automatic Save**: All mood data persisted immediately after collection
- **Encryption**: Sensitive assessment data encrypted before AsyncStorage
- **Backup Strategy**: Local backup of critical crisis information
- **Data Integrity**: Validation on read/write operations

### Error Handling for Clinical Flows
- **Assessment Errors**: Graceful handling without data loss
- **Crisis Flow Errors**: Fallback to emergency protocols
- **Storage Errors**: User notification with retry mechanisms
- **Network Errors**: Full offline mode functionality

## App Store & Deployment Standards

### Healthcare App Compliance
- **App Store Guidelines**: Mental health app specific requirements
- **Medical Device Considerations**: Ensure app doesn't qualify as medical device
- **Age Restrictions**: Appropriate ratings for mental health content
- **Content Warnings**: Clear disclosure of mental health focus

### Beta Testing Protocols
- **TestFlight/Play Beta**: Gradual rollout with clinical oversight
- **Feedback Collection**: Structured feedback on therapeutic effectiveness
- **Crisis Testing**: Real-world validation of emergency protocols
- **User Research**: MBCT practitioners and mental health professionals

### Version Control for Clinical Accuracy
```yaml
Critical Changes Require:
  - Clinician agent validation
  - Compliance agent review  
  - Crisis agent testing
  - Full regression testing of assessment flows

Branch Protection:
  - Main branch: Requires clinical accuracy validation
  - Release branches: Full accessibility and compliance review
  - Hotfix branches: Expedited but still validated
```

## Component Themes
```typescript
themes: {
  morning: { primary: '#FF9F43', success: '#E8863A' },
  midday: { primary: '#40B5AD', success: '#2C8A82' },
  evening: { primary: '#4A7C59', success: '#2D5016' }
}
```

## Current Sprint Focus
- [ ] Port remaining components from Design Library v1.1
- [ ] Implement offline mode with AsyncStorage encryption
- [ ] Widget for quick morning check-in
- [ ] Crisis button accessibility improvements
- [ ] PHQ-9/GAD-7 scoring validation testing

## File References
- Prototype: Being. Design Prototype v1.7.html
- Design: Being. Design Library v1.1.tsx, Being. DRD v1.3.md
- Requirements: Being. PRD v1.2.md
- Technical: Being. TRD v2.0.md
- User Journeys: Being. User Journey Flows & Persona Analysis.md
- Feature Roadmap: Being. Product Roadmap - Prioritized - Based on v1.7.md

## Development Commands
```bash
# Clinical accuracy validation
npm run test:clinical          # Run assessment scoring tests
npm run validate:accessibility # Check WCAG compliance
npm run lint:clinical         # Validate therapeutic language

# Performance monitoring  
npm run perf:breathing        # Test breathing circle performance
npm run perf:crisis          # Validate crisis button response time
```