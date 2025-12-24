# Codebase Organization

Complete guide to the Being app's feature-based directory structure.

## Overview

The Being app uses a **feature-based architecture** where code is organized by domain feature rather than technical layer. This improves code discoverability, maintains clear boundaries, and supports domain authorities (crisis, compliance, philosopher).

## Directory Structure

```
src/
├── core/                    # Infrastructure & shared code
│   ├── components/          # Reusable UI primitives
│   ├── navigation/          # App navigation
│   ├── providers/           # Global context providers
│   ├── services/            # Infrastructure services
│   ├── theme/               # Theme & styling
│   ├── types/               # Core type definitions
│   ├── utils/               # Shared utilities
│   └── constants/           # App constants
│
├── features/                # Domain features (vertical slices)
│   ├── crisis/              # !! CRITICAL - Domain Authority
│   ├── assessment/          # !! CLINICAL - Domain Authority
│   ├── daily-practices/     # Morning/midday/evening check-ins
│   ├── learning/            # Stoic Mindfulness education
│   ├── profile/             # User profile & settings
│   ├── subscription/        # Monetization
│   ├── sync/                # Cloud sync & backup
│   ├── insights/            # Progress & analytics
│   ├── home/                # Home dashboard
│   └── onboarding/          # User onboarding
│
├── compliance/              # Cross-cutting HIPAA/regulatory
│   ├── services/
│   └── types/
│
├── analytics/               # Cross-cutting telemetry
│   └── services/
│
└── types/                   # Global shared types
    ├── errors/
    ├── performance/
    ├── security/
    └── ...
```

## Core Principles

### 1. Feature-Based Organization

Each feature is a **vertical slice** containing all its layers:
- UI (components, screens)
- Logic (services)
- State (stores)
- Types

### 2. Clear Dependency Rules

```
✅ features/ → core/
✅ features/ → compliance/
✅ features/ → analytics/
❌ core/ → features/
⚠️  features/ ↔ features/ (discouraged, use events)
```

### 3. Domain Authority Hierarchy

```
crisis > compliance > philosopher > ux > technical
```

Domain authorities can override technical decisions in their domain.

## Key Features

### Crisis Feature (Domain Authority: crisis)
**Location:** `features/crisis/`

**Responsibility:**
- Crisis detection (PHQ≥20, GAD≥15, Q9>0)
- 988 intervention workflow
- Crisis plan management
- Performance <200ms requirement

**Why Consolidated:**
Previously scattered across 100+ files in 7+ directories. Now unified for easy auditing and performance optimization.

### Assessment Feature (Domain Authority: philosopher + crisis)
**Location:** `features/assessment/`

**Responsibility:**
- PHQ-9/GAD-7 assessments
- Clinical scoring (100% accuracy required)
- Crisis threshold detection
- HIPAA-compliant data handling

**Critical Requirements:**
- 100% scoring accuracy (27 PHQ-9 + 21 GAD-7 combinations)
- Exact clinical wording
- Crisis integration

### Daily Practices Feature
**Location:** `features/daily-practices/`

**Responsibility:**
- Morning check-in flow
- Midday awareness practice
- Evening reflection
- Session state management

### Learning Feature (Domain Authority: philosopher)
**Location:** `features/learning/`

**Responsibility:**
- Stoic Mindfulness education modules
- Practice exercises (body scan, reflection, sorting)
- Educational content
- Progress tracking

## Migration Context

This structure resulted from a comprehensive reorganization (2025-01) from a mixed layer-based/feature-based structure.

### Before (Old Structure)
```
src/
├── components/      # Mixed: shared, crisis, assessment, settings, etc.
├── screens/         # Mixed: crisis, learn, home
├── services/        # Mixed: crisis, compliance, analytics, etc.
├── stores/          # Global stores only
└── flows/           # morning, midday, evening, assessment
```

**Problems:**
- Crisis code scattered (100+ files, 7+ directories)
- Assessment split between flows/ and components/
- Unclear where new code belongs
- Services importing from flows (wrong direction)

### After (New Structure)
```
src/
├── core/            # Infrastructure
├── features/        # Domain features
├── compliance/      # Cross-cutting
└── analytics/       # Cross-cutting
```

**Benefits:**
- Crisis code unified (single location, easy audit)
- Assessment consolidated (clinical accuracy)
- Clear ownership (each feature self-contained)
- Correct dependencies (features → core, not reverse)

## Code Discovery

### "Where Does My Code Go?" Decision Tree

**Adding a new feature?**
→ Create `features/[feature-name]/`

**Adding a component:**
- Used across multiple features? → `core/components/`
- Used in one feature? → `features/[feature]/components/`
- Crisis-related? → `features/crisis/components/`

**Adding a service:**
- Infrastructure (logging, monitoring)? → `core/services/`
- Feature-specific? → `features/[feature]/services/`
- Crisis-related? → `features/crisis/services/`
- Compliance-related? → `compliance/services/`

**Adding a type:**
- Used across features? → `types/`
- Feature-specific? → `features/[feature]/types/`
- Crisis types? → `features/crisis/types/`

**Adding a store:**
- Global app state? → Probably belongs in a feature
- Feature-specific? → `features/[feature]/stores/`

## Performance & Safety

### Critical Path Performance

- **Crisis detection:** <200ms (features/crisis/)
- **Assessment transitions:** <300ms (features/assessment/)
- **App launch:** <2s
- **Check-in flows:** <500ms

### Clinical Accuracy

- **PHQ-9 scoring:** 100% accuracy (27 combinations)
- **GAD-7 scoring:** 100% accuracy (21 combinations)
- **Crisis thresholds:** PHQ≥15, PHQ≥20, GAD≥15
- **Suicidal ideation:** Q9 > 0

### Safety Protocols

- Crisis code easily auditable (single location)
- Assessment scoring locked down (tested extensively)
- HIPAA compliance validated (compliance/)
- Error boundaries at feature level

## Related Documentation

- [Feature Structure Guidelines](./feature-structure.md) - How to build features
- [Import Guidelines](./import-guidelines.md) - Import patterns & dependencies
- [Technical Patterns](./technical-patterns.md) - Provider architecture, error boundaries

## Questions?

This structure supports:
- Easy code discovery ("where is crisis detection?" → features/crisis/services/)
- Clear ownership (crisis feature owned by crisis domain authority)
- Scalability (add new features without affecting existing)
- Maintainability (related code grouped together)
- Performance (critical paths clearly marked)
- Safety (clinical code easily audited)
