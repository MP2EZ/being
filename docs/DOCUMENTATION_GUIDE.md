# Documentation Placement Guide

## Core Principle: Co-location
Documentation lives with the code it documents.

## Placement Rules

### Goes in `/docs/` (Project-level)
✅ Legal documents (Privacy Policy, Terms of Service, GDPR compliance)
✅ Brand guidelines affecting both app and website
✅ Project-wide README and quickstart guides
✅ Historical/deprecated documentation (in `/docs/archive/`)

❌ NOT: Product specs, clinical docs, architecture, security, operations

### Goes in `/docs/`
✅ Product documentation (PRD, TRD, DRD, roadmap)
✅ Clinical/therapeutic documentation (MBCT compliance, safety protocols)
✅ App architecture and security
✅ App-specific operations (App Store, TestFlight, certificates)
✅ Development guides for mobile app
✅ Mobile testing strategies and reports
✅ Widget documentation (iOS/Android)

### Goes in `/website/docs/`
✅ Website implementation guides
✅ Website performance/accessibility reports
✅ Web hosting and deployment docs
✅ Website-specific architecture

### Goes in `/scripts/`
✅ Cross-module operational scripts (like project renaming)
✅ Emergency procedures affecting multiple modules

## Quick Decision Tree
1. **Does it affect BOTH app and website?** → `/docs/`
2. **Is it about technical implementation?** → `/docs/`
3. **Is it about the website?** → `/website/docs/`
4. **Is it a cross-module script?** → `/scripts/`
5. **When in doubt** → Put with the code it describes

## Folder Organization Within Each Module

### `/docs/` Structure
- `/product/` - PRD, TRD, DRD, roadmap
- `/clinical/` - MBCT compliance, safety protocols, therapeutic standards
- `/architecture/` - App architecture, data flow, system design
- `/security/` - Encryption, data protection, security protocols
- `/development/` - Development guides, component documentation
- `/testing/` - Test strategies, reports, QA procedures
- `/operations/` - App Store deployment, TestFlight, certificates
- `/widgets/` - iOS/Android widget implementation guides

### `/website/docs/` Structure
- `/implementation/` - Implementation guides, technical docs
- `/operations/` - Web hosting, deployment, CDN configuration
- `/reports/` - Performance reports, accessibility audits

### `/docs/` Structure (Minimal)
- `/legal/` - Privacy policy, terms of service, compliance docs
- `/brand/` - Brand guidelines (if needed)
- `/archive/` - Historical/deprecated documentation

## Migration from Old Structure

The old `/documentation/` folder has been reorganized following co-location principles:

- **Product docs** moved from `/documentation/mobile-app/` to `/docs/product/`
- **Clinical docs** moved from `/documentation/clinical/` to `/docs/clinical/`
- **Architecture** moved from `/documentation/architecture/` to `/docs/architecture/`
- **Security** moved from `/documentation/security/` to `/docs/security/`
- **Website docs** consolidated from multiple locations to `/website/docs/`
- **Legal/compliance** moved to `/brand-legal/legal/`
- **Legacy docs** archived to `/docs/archive/`

## Maintenance Guidelines

1. **Before creating documentation**: Use the decision tree above
2. **When adding new docs**: Update the relevant README.md index
3. **For cross-cutting concerns**: Evaluate if it truly affects multiple modules
4. **When in doubt**: Prefer module-specific over project-level
5. **Archive old docs**: Move to `/docs/archive/` with date stamp

## AI Assistant Instructions

Claude Code has been configured to follow these placement rules automatically. The `.claude/CLAUDE.md` file contains specific instructions for maintaining this structure.

---

*Last updated: September 2024*
*See individual README.md files in each docs folder for specific contents*