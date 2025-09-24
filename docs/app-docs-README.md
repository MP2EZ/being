# Being Mobile App Documentation

This folder contains ALL documentation related to the Being mobile app - the primary product.

## 📁 Contents

- **`/product/`** - Product requirements, technical specs, design docs, roadmaps
- **`/clinical/`** - MBCT compliance, therapeutic standards, safety protocols
- **`/architecture/`** - App architecture, system design, data flow
- **`/security/`** - Encryption, data protection, security protocols
- **`/development/`** - Development guides, component documentation
- **`/testing/`** - Test strategies, reports, QA procedures
- **`/operations/`** - App Store deployment, TestFlight, certificates
- **`/widgets/`** - iOS/Android widget implementation guides

## 📖 Quick Navigation

### Product Documentation
- [Product Requirements (PRD)](product/Being.%20PRD%20v2.0.md)
- [Technical Requirements (TRD)](product/Being.%20TRD%20v2.0.md)
- [Design Requirements (DRD)](product/Being.%20DRD%20v1.3.md)
- [Product Roadmap](product/Being.%20Product%20Roadmap%20-%20Prioritized%20-%20Based%20on%20v1.7.md)
- [User Journey & Personas](product/Being.%20User%20Journey%20Flows%20&%20Persona%20Analysis.md)

### Clinical & Therapeutic
- [MBCT Compliance Verification](clinical/mbct-compliance-verification.md)
- [Crisis Safety Implementation](clinical/crisis-safety-implementation-report.md)
- [Therapeutic Content Validation](clinical/safety-protocols/therapeutic-content-validation.md)
- [PHQ-9/GAD-7 Accuracy Reports](clinical/validation-reports/)

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

### Clinical-Grade Standards
- **100% accurate** PHQ-9/GAD-7 assessment scoring
- **Crisis detection** with automatic intervention at clinical thresholds
- **MBCT compliance** for all therapeutic content
- **Emergency response** with <3 second crisis button access

### Technical Excellence
- **React Native + Expo** with TypeScript
- **Zustand** for state management
- **AsyncStorage** with encryption for sensitive data
- **60fps** performance for therapeutic animations

### Healthcare Compliance
- **HIPAA-aware** design patterns
- **No network transmission** of personal health data (Phase 1)
- **Encrypted local storage** for all clinical data
- **App Store compliance** for mental health apps

## 🚨 Critical Safety Requirements

### Never Modify Without Clinical Validation
- PHQ-9/GAD-7 exact clinical wording and scoring algorithms
- Crisis detection thresholds (PHQ-9 ≥20, GAD-7 ≥15)
- 988 crisis hotline integration
- 3-minute breathing exercise timing (exactly 60s per step)

### Development Guidelines
- All clinical content requires `clinician` agent validation
- All safety features require `crisis` agent approval
- All data handling requires `compliance` agent review
- All UI must meet `accessibility` standards (WCAG AA)

## 📱 App Overview

**Being** is a clinical-grade mobile app delivering evidence-based Mindfulness-Based Cognitive Therapy (MBCT) practices for depression and anxiety management. The app provides:

- **Daily check-ins** with mood tracking
- **Clinical assessments** (PHQ-9/GAD-7) with crisis detection
- **Guided MBCT practices** including breathing exercises
- **Progress tracking** with therapeutic insights
- **Crisis support** with emergency protocols

---

*For overall project documentation structure, see [/docs/DOCUMENTATION_GUIDE.md](../docs/DOCUMENTATION_GUIDE.md)*