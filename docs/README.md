# Being Mobile App Documentation

This folder contains ALL documentation related to the Being mobile app.

## Contents

### Product & Design
- **`/product/`** - PRD, TRD, DRD, prioritization framework
- **`/product/stoic-mindfulness/`** - Complete Stoic Mindfulness framework documentation

### Architecture & Development
- **`/architecture/`** - System design, data models, technical patterns, Stoic architecture
- **`/development/`** - Implementation guides, coding standards, accessibility

### Compliance & Legal
- **`/compliance/`** - BAA-free design, consent framework, privacy requirements
- **`/legal/public/`** - Privacy policy, terms of service, medical disclaimer (source of truth for app + website)
- **`/security/`** - Encryption standards, key management, threat models

### Testing
- **`/testing/`** - Test strategies, clinical testing, QA protocols

## Quick Navigation

### Product
- [Product Requirements (PRD)](product/Being.%20PRD.md)
- [Technical Requirements (TRD)](product/Being.%20TRD.md)
- [Design Requirements (DRD)](product/Being.%20DRD.md)
- [Stoic Mindfulness Framework](product/stoic-mindfulness/INDEX.md)

### Architecture
- [Data Flow Diagrams](architecture/data-flow-diagrams.md)
- [Stoic Mindfulness Architecture](architecture/Stoic-Mindfulness-Architecture-v1.0.md)
- [Stoic Data Models](architecture/Stoic-Data-Models.md)

### Security
- [Security Architecture](security/security-architecture.md)
- [Encryption Standards](security/encryption-standards.md)
- [Key Management](security/key-management.md)
- [Privacy Implementation Guide](security/Privacy-Preserving-Implementation-Guide.md)

### Development
- [Implementation Guide](development/guides/IMPLEMENTATION_GUIDE.md)
- [TypeScript Safety Guide](development/guides/typescript-safety-guide.md)
- [Crisis Button Implementation](development/guides/crisis-button-implementation-guide.md)
- [Accessibility Testing Guide](development/guides/ACCESSIBILITY_TESTING_GUIDE.md)

### Testing
- [Clinical Testing](testing/clinical-testing-implementation.md)
- [Local Testing Guide](testing/LOCAL_TESTING_GUIDE.md)
- [QA Protocols](testing/quality-assurance-protocols.md)

### Legal (Source of Truth)
- [Privacy Policy](legal/public/privacy-policy.md)
- [Terms of Service](legal/public/terms-of-service.md)
- [Medical Disclaimer](legal/public/medical-disclaimer.md)

## Key Features

### Stoic Mindfulness Framework
- **5 core principles** across 4 developmental stages
- **Philosophical accuracy** validated against classical sources
- **PHQ-9/GAD-7 wellness monitoring** (not clinical diagnosis)

### Crisis Safety Standards
- **Crisis detection** at safety thresholds (PHQ>=15, PHQ>=20, GAD>=15)
- **<3 second** crisis button access from all screens
- **988 integration** for professional crisis support

### Technical Stack
- React Native + Expo + TypeScript
- Zustand for state management
- AES-256-GCM encryption with PBKDF2
- Privacy-first analytics (differential privacy)
- Offline-first architecture

### Privacy & Compliance
- **BAA-free design** - NO PHI transmitted to cloud
- **On-device encryption** for all wellness data
- CCPA, VCDPA, GDPR compliance

## Critical Safety Requirements

### Never Modify Without Validation
- **PHQ-9/GAD-7**: Exact clinical wording and scoring (100% accuracy)
- **Crisis thresholds**: PHQ-9 >=15 (support), >=20 (intervention), GAD-7 >=15
- **988 integration**: Must remain accessible
- **Stoic principles**: Philosophical accuracy required

### Agent Requirements
- Philosophical content: `philosopher` agent validation
- Crisis/safety features: `crisis` agent approval
- Privacy/compliance: `compliance` agent review
- UI accessibility: WCAG AA standards

---

**Being** is a mental wellness app based on Stoic Mindfulness, integrating ancient Stoic philosophy with modern mindfulness practices.
