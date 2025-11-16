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

### [Import Guidelines](./import-guidelines.md)
Best practices for imports, path aliases, and avoiding circular dependencies.

**Read this when:**
- Setting up imports in a new file
- Debugging circular dependency issues
- Understanding the approved import patterns

## Technical Patterns

### [Technical Patterns & Safety](./technical-patterns.md)
Provider architecture, error boundaries, crisis fallbacks, and safety-first patterns.

**Read this when:**
- Implementing clinical safety features
- Setting up new providers or contexts
- Understanding the initialization order
- Implementing error boundaries
- Building crisis-related features

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

## Contact

For architecture questions or clarifications, refer to these docs first. If you need to propose architectural changes, update the relevant documentation as part of your PR.
