# Codebase Organization

Complete guide to the Being app's feature-based directory structure.

## Overview

The Being app uses a **feature-based architecture** where code is organized by domain feature rather than technical layer. This improves code discoverability, maintains clear boundaries, and supports domain authorities (crisis, compliance, philosopher).

## Directory Structure

The actual tree, as of MAINT-610:

```
src/
├── core/                    # Infrastructure & shared code
│   ├── analytics/           # Consent-gated product analytics, feature flags
│   ├── components/          # Shared UI (accessibility, settings, subscription, sync)
│   ├── config/              # Environment config, e2e seed
│   ├── constants/           # App constants
│   ├── hooks/               # Shared hooks (keyboard frame, overlay insets, bug-report shake)
│   ├── navigation/          # Root and tab navigators, deep linking
│   ├── services/            # Infrastructure services (security, privacy, supabase, logging, ...)
│   ├── stores/              # Shared Zustand stores (consent, settings, subscription, bug report)
│   ├── theme/               # Theme & styling
│   ├── types/               # Shared type definitions
│   └── utils/               # Shared utilities
│
└── features/                # Domain features (vertical slices)
    ├── assessment/          # !! WELLNESS SCREENING - Domain Authority (PHQ-9/GAD-7)
    ├── consent/             # Legal gate, consent and re-consent screens
    ├── crisis/              # !! CRITICAL - Domain Authority
    ├── data-export/         # Wellness data export
    ├── guidance/            # Stoic guidance tiers, gated on screening thresholds
    ├── home/                # Home dashboard
    ├── insights/            # Progress, wellness trends, weekly reflection
    ├── journal/             # Voice reflection journal
    ├── learn/               # Stoic Mindfulness education modules
    ├── library/             # Classical source passages
    ├── onboarding/          # User onboarding
    ├── practices/           # Practice library, daily loop, breathing
    └── profile/             # User profile & settings
```

Subscription lives in `core/`: `core/services/subscription/`, `core/stores/subscriptionStore.ts`, `core/components/subscription/`, `core/types/subscription/`.
Cloud backup and sync live in `core/`: `core/services/supabase/` (status UI in `core/components/sync/`).

## Core Principles

### 1. Feature-Based Organization

Each feature is a **vertical slice** containing all its layers:
- UI (components, screens)
- Logic (services)
- State (stores)
- Types

### 2. Clear Dependency Rules

```
✅ features/ → core/  (analytics: core/analytics, shared types: core/types, shared state: core/stores)
❌ core/ → features/
⚠️  features/ ↔ features/ (prefer route params, core/ hooks and stores, type-only imports)
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
- PHQ-9/GAD-7 wellness screening
- Wellness screening scoring (100% accuracy required)
- Crisis threshold detection
- Wellness data encrypted at rest (AES-256, `core/services/security/`)

**Critical Requirements:**
- 100% scoring accuracy (27 PHQ-9 + 21 GAD-7 combinations)
- Exact wellness screening question wording
- Crisis integration

### Daily Practices Feature
**Location:** `features/practices/`

**Responsibility:**
- Morning check-in flow
- Midday awareness practice
- Evening reflection
- Session state management

### Learning Feature (Domain Authority: philosopher)
**Location:** `features/learn/`

**Responsibility:**
- Stoic Mindfulness education modules
- Practice exercises (body scan, reflection, sorting)
- Educational content
- Progress tracking

## Migration Context

This structure resulted from a comprehensive reorganization (2025-11, commit `688ffd18`) from a mixed layer-based/feature-based structure.

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

That tree is history: `analytics/` moved into `core/analytics/` and `src/types/` was split between `core/types/` and the owning features in `688ffd18`; `src/compliance/` had no importers and was deleted in MAINT-236. The current tree is under [Directory Structure](#directory-structure).

**Benefits:**
- Crisis code unified (single location, easy audit)
- Assessment consolidated (scoring accuracy)
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
- Compliance-related? → `core/services/security/`, `core/services/privacy/`, `core/stores/consentStore.ts` (consent UI: `features/consent/`)

**Adding a type:**
- Used across features? → `core/types/`
- Feature-specific? → `features/[feature]/types/`
- Crisis types? → `features/crisis/types/`

**Adding a store:**
- Shared across features (consent, settings, subscription, bug report)? → `core/stores/`
- Feature-specific? → `features/[feature]/stores/`

**Adding analytics?**
→ `core/analytics/`

## Performance & Safety

### Critical Path Performance

- **Crisis detection:** <200ms (features/crisis/)
- **Assessment transitions:** <300ms (features/assessment/)
- **App launch:** <2s
- **Check-in flows:** <500ms

### Scoring Accuracy

- **PHQ-9 scoring:** 100% accuracy (27 combinations)
- **GAD-7 scoring:** 100% accuracy (21 combinations)
- **Crisis thresholds:** PHQ≥15, PHQ≥20, GAD≥15
- **Suicidal ideation:** Q9 > 0

### Safety Protocols

- Crisis code easily auditable (single location)
- Assessment scoring locked down (tested extensively)
- Wellness-data encryption and consent reviewed by the compliance domain authority
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
- Safety (crisis and wellness screening code easily audited)
