# Architecture Documentation

This directory contains comprehensive architecture documentation for the Being app.

## Overview Documents

### [Codebase Organization](./codebase-organization.md)
Complete guide to the feature-based directory structure, dependency rules, and code organization principles.

**Read this when:**
- You're new to the project
- You need to understand where code belongs
- You're planning a major refactor
- You want to understand the migration from layer-based to feature-based architecture

### [Feature Structure Guidelines](./feature-structure.md)
Standards and patterns for building features in a consistent way.

**Read this when:**
- You're creating a new feature
- You need to understand feature boundaries
- You're deciding where to put new code
- You want to understand barrel exports and public APIs
- You're building crisis-related features or error boundaries (see Crisis-safe error boundaries)

### [Import Guidelines](./import-guidelines.md)
Best practices for imports, path aliases, and avoiding circular dependencies.

**Read this when:**
- Setting up imports in a new file
- Debugging circular dependency issues
- Understanding the approved import patterns

## Data & Privacy

### [Data Privacy Architecture](./data-privacy-architecture.md)
Being's core data philosophy: local-first, no PHI transmission.

**Read this when:**
- Designing any feature that touches user health data
- Considering cloud sync, backup, or sharing features
- Evaluating analytics or third-party integrations
- Understanding why Being doesn't need BAAs

---

## Architecture Principles

The Being app follows these core architectural principles:

1. **Feature-Based Organization**: Code is organized by domain feature, not by technical layer
2. **Domain Authority Hierarchy**: crisis > compliance > philosopher > ux > technical
3. **Safety First**: Clinical accuracy and crisis detection are never compromised
4. **Clear Dependencies**: Features depend on core, not vice versa
5. **Vertical Slicing**: Each feature contains all its layers (UI, logic, state, types)
6. **Explicit Shared Code**: Shared infrastructure lives in `core/`, not scattered

## Quick Reference

### Directory Structure
```
src/
├── core/              # Infrastructure (theme, nav, logging, security)
├── features/          # Domain features (crisis, assessment, learning, etc.)
├── compliance/        # Cross-cutting HIPAA/regulatory
├── analytics/         # Cross-cutting telemetry
└── types/             # Global shared types
```

### Dependency Rules
```
✅ features/ → core/
✅ features/ → compliance/
✅ features/ → analytics/
❌ core/ → features/
⚠️  features/ ↔ features/ (use events/hooks instead)
```

### Adding New Code Decision Tree

**New Feature?** → Create `features/[feature-name]/`

**New Component?**
- Used across multiple features? → `core/components/`
- Used in one feature? → `features/[feature]/components/`
- Crisis-related? → `features/crisis/components/`

**New Service?**
- Infrastructure (logging, monitoring)? → `core/services/`
- Feature-specific? → `features/[feature]/services/`
- Crisis-related? → `features/crisis/services/`
- Compliance-related? → `compliance/services/`

**New Type?**
- Used across features? → `types/`
- Feature-specific? → `features/[feature]/types/`
- Crisis types? → `features/crisis/types/`

## Documented Imports Are Checked (INFRA-601)

CI (`typecheck` job, `npm run check:doc-import-paths`) fails when a `@/` import quoted
in a fenced code block in this directory does not resolve under `app/tsconfig.json`
against the git index.

- **Paths only.** It does not check that the imported names are exported — a green run
  means every documented import *path* exists, not that the example compiles.
- **Out of scope:** prose, inline code spans, relative specifiers (`../x`), and docs
  outside `docs/architecture/`.
- **An example that must not resolve** (an anti-pattern naming a deleted module) carries
  a marker on the same line:
  `import { X } from '@/features/crisis'; // doc-import: unresolved-by-design - <reason>`.
  The check fails if a marked import starts resolving, or a marker has no reason.

## Contact

For architecture questions or clarifications, refer to these docs first. If you need to propose architectural changes, update the relevant documentation as part of your PR.
