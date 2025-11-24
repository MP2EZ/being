# Being Mobile App Documentation

This folder contains ALL documentation related to the Being mobile app - the primary product.

## 📁 Contents

### Product & Design
- **`/product/`** - Product requirements, technical specs, design docs, roadmaps
- **`/architecture/`** - App architecture, system design, data flow
- **`/technical/`** - Technical architecture and implementation details
- **`/development/`** - Development guides, component documentation

### Philosophical Framework
- **`/philosophical/`** - Stoic Mindfulness framework, principles, classical sources validation (Note: Folder may be named differently; check actual structure)

### Compliance & Legal
- **`/compliance/`** - HIPAA, CCPA, VCDPA, GDPR compliance, user consent frameworks
- **`/brand-legal/`** - Legal documentation, privacy policy, terms of service, data retention
- **`/security/`** - Encryption, data protection, security protocols, threat models

### Operations & Testing
- **`/testing/`** - Test strategies, reports, QA procedures, clinical accuracy validation
- **`/operations/`** - App Store deployment, TestFlight, certificates, CI/CD
- **`/performance/`** - Performance documentation, optimization strategies, benchmarks
- **`/widgets/`** - iOS/Android widget implementation guides

### Business
- **`/business/`** - Cost analysis, financial planning, business strategy

## 📖 Quick Navigation

### Product Documentation
- [Product Requirements (PRD)](product/Being.%20PRD%20v2.0.md)
- [Technical Requirements (TRD)](product/Being.%20TRD%20v2.0.md)
- [Design Requirements (DRD)](product/Being.%20DRD%20v1.3.md)
- [Product Roadmap](product/Being.%20Product%20Roadmap%20-%20Prioritized%20-%20Based%20on%20v1.7.md)
- [User Journey & Personas](product/Being.%20User%20Journey%20Flows%20&%20Persona%20Analysis.md)

### Philosophical Framework & Wellness
- Stoic Mindfulness framework documentation
- Crisis safety protocols (PHQ-9/GAD-7 wellness monitoring)
- Philosophical accuracy validation

### Architecture & Security
- [System Design](architecture/system-design.md)
- [Data Flow Diagrams](architecture/data-flow-diagrams.md)
- [Security Architecture](security/security-architecture.md)
- [Encryption Standards](security/)

### Development
- [Design Library](development/Being.%20Design%20Library%20v1.1.tsx)
- [Implementation Status](development/Being.%20Implementation%20Status%20v3.0.md)
- [Component Guides](development/guides/)

### Testing & QA
- [Testing Strategy](testing/TESTING_STRATEGY.md)
- [Accessibility Reports](testing/)
- [Performance Benchmarks](testing/performance-benchmarks.md)
- [Clinical Testing Implementation](testing/clinical-testing-implementation.md)

## 🎯 Key Features

### Stoic Mindfulness Framework
- **5 core principles** across 4 developmental stages
- **Philosophical accuracy** validated against classical sources (Marcus Aurelius, Epictetus, Seneca)
- **Character development** through virtue ethics and practical wisdom
- **100% accurate** PHQ-9/GAD-7 wellness monitoring (not clinical diagnosis)

### Crisis Safety Standards
- **Crisis detection** with automatic intervention at safety thresholds (PHQ≥15, PHQ≥20, GAD≥15)
- **Emergency response** with <3 second crisis button access from all screens
- **988 integration** for professional crisis support
- **Breathing exercises** with precisely timed 60-second intervals

### Technical Excellence
- **React Native + Expo** with TypeScript
- **Zustand** for state management
- **AES-256-GCM encryption** with PBKDF2 key derivation
- **Privacy-first analytics** (differential privacy ε=0.1, k-anonymity k≥5)
- **60fps** performance for breathing animations
- **Offline-first** architecture for complete functionality without network

### Privacy & Compliance
- **BAA-free design** - NO PHI transmitted to cloud
- **On-device encryption only** for all wellness data
- **CCPA, VCDPA, GDPR compliance** for user privacy rights
- **App Store privacy compliance** (Privacy Nutrition Label, Data Safety Section)

## 🚨 Critical Safety Requirements

### Never Modify Without Validation
- **PHQ-9/GAD-7**: Exact clinical wording and scoring algorithms (100% accuracy required)
- **Crisis thresholds**: PHQ-9 ≥15 (support), ≥20 (intervention), GAD-7 ≥15, PHQ-9 Q9 >0
- **988 integration**: Crisis hotline must remain accessible
- **Breathing timing**: Exactly 60 seconds per phase (180 seconds total)
- **Stoic principles**: Philosophical accuracy against classical sources

### Development Guidelines
- **Philosophical content**: Requires `philosopher` agent validation for Stoic accuracy
- **Crisis/safety features**: Requires `crisis` agent approval
- **Privacy/compliance**: Requires `compliance` agent review
- **UI accessibility**: Must meet WCAG AA standards (`accessibility` agent)

## 📱 App Overview

**Being** is a mental wellness app based on the Stoic Mindfulness framework, integrating ancient Stoic philosophy with modern mindfulness practices for character development and emotional resilience. The app provides:

- **Daily check-ins** across three times of day (morning, midday, evening)
- **5 core Stoic principles** with progressive practices
- **Wellness monitoring** (PHQ-9/GAD-7) with crisis safety protocols
- **Educational modules** on Stoic philosophy and practical application
- **Progress tracking** through 4 developmental stages (Fragmented → Effortful → Fluid → Integrated)
- **Crisis support** with 988 integration and emergency resources

---

*For overall project documentation structure, see [/docs/DOCUMENTATION_GUIDE.md](../docs/DOCUMENTATION_GUIDE.md)*