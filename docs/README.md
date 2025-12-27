# Being Mobile App Documentation

This folder contains ALL documentation related to the Being mobile app.

## Contents

### Product & Design
- **`/product/`** - PRD, TRD, DRD, prioritization framework
- **`/product/stoic-mindfulness/`** - Complete Stoic Mindfulness framework documentation

### Architecture & Development
- **`/architecture/`** - System design, data models, technical patterns, Stoic architecture
- **`/development/`** - Implementation guides, coding standards, accessibility

### Legal & Compliance
- **`/legal/`** - Privacy policy, terms of service, medical disclaimer (source of truth for app + website)
- **`/legal/regulatory-applicability.md`** - **COMPLIANCE SOURCE OF TRUTH** - Authoritative reference for what regulations apply (and don't)
- **`/security/`** - Privacy-first security architecture (Being is NOT HIPAA-covered)

### Testing
- **`/testing/`** - Test strategies, clinical testing, production testing

## Key Documents

### Product
- [Product Requirements (PRD)](product/Being.%20PRD.md) - Complete product specification
- [Stoic Mindfulness Framework](product/stoic-mindfulness/INDEX.md) - Philosophical foundation

### Architecture
- [Architecture Overview](architecture/README.md) - Start here for codebase structure
- [Data Privacy Architecture](architecture/data-privacy-architecture.md) - Local-first, no PHI transmission

### Security
- [Security Architecture](security/security-architecture.md) - Privacy-first security framework
- [Secret Management](security/secret-management.md) - Git security, .gitignore patterns, pre-commit hooks

### Development
- [TypeScript Safety Guide](development/typescript-safety-guide.md) - Clinical type safety patterns
- [BAA-Free Analytics Design](development/BAA-Free-Analytics-Design.md) - Why we don't need BAAs

### Testing
- [Local Testing Guide](testing/LOCAL_TESTING_GUIDE.md) - Quick validation workflows
- [Clinical Testing](testing/clinical-testing-implementation.md) - PHQ-9/GAD-7 accuracy testing

### Legal & Compliance (Source of Truth)
- [Regulatory Applicability](legal/regulatory-applicability.md) - **START HERE** for compliance decisions
- [Privacy Policy](legal/privacy-policy.md)
- [Terms of Service](legal/terms-of-service.md)
- [Medical Disclaimer](legal/medical-disclaimer.md)

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
- Privacy-first architecture (no PHI transmission)
- Offline-first architecture

### Privacy & Compliance
- **NOT a HIPAA-covered entity** - See [Regulatory Applicability](legal/regulatory-applicability.md)
- **BAA-free design** - NO PHI transmitted to cloud
- **On-device encryption** for all wellness data
- FTC, CCPA, VCDPA, GDPR compliance

## Critical Safety Requirements

### Never Modify Without Validation
- **PHQ-9/GAD-7**: Exact clinical wording and scoring (100% accuracy)
- **Crisis thresholds**: PHQ-9 >=15 (support), >=20 (intervention), GAD-7 >=15
- **988 integration**: Must remain accessible
- **Stoic principles**: Philosophical accuracy required

---

**Being** is a mental wellness app based on Stoic Mindfulness, integrating ancient Stoic philosophy with modern mindfulness practices.
