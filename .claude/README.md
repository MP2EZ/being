# Being Project - Claude Code Configuration

**Last updated**: 2025-09-30
**System version**: Consolidated Template System v1.0

---

## Structure

```
.claude/
├── CLAUDE.md              # Quick reference (always loaded, ~1200 tokens)
├── templates/             # Detailed templates (on-demand)
│   └── being-templates.md # Source of truth for B-CRISIS/B-HOTFIX/B-DEV/B-DEBUG
├── commands/              # Slash commands (user-invoked)
│   ├── being-work.md      # Meta-command: Auto-classify from Notion
│   ├── being-crisis.md    # Life-safety critical features
│   └── being-hotfix.md    # Emergency rapid response
└── README.md              # This file
```

---

## Templates

See `templates/being-templates.md` for complete workflow definitions.

### Quick Overview

| Template | When to Use | Pattern |
|----------|-------------|---------|
| **B-CRISIS** | Crisis detection, thresholds, 988, safety plans | (crisis+compliance)→main→(crisis+compliance+accessibility) |
| **B-HOTFIX** | Emergency bugs affecting safety (<30min) | crisis→main[rapid]→crisis-validate→deploy |
| **B-DEV** | Features, therapeutic content, assessment UI | [domain-review?]→main→[domain-validate?] |
| **B-DEBUG** | Non-emergency bugs | [specialist-investigate?]→main→[domain-validate?] |

**B-DEV Paths**:
- Therapeutic: clinician-review → clinician+accessibility validation
- Assessment: clinician-review → clinician+crisis+accessibility validation
- Privacy: (compliance+security)-review → compliance+security validation
- General: Optional domain review based on proximity

---

## Commands

See `commands/` for executable slash command files.

### Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/being-work FEAT-26` | Auto-classify and execute Notion work item | Fetches from Notion, classifies, executes template |
| `/being-crisis "988 button"` | Life-safety critical feature workflow | Enforces non-negotiable safety checklist |
| `/being-hotfix "crisis button broken"` | Emergency rapid response (<30min) | Minimal fix, immediate deployment |

---

## Validation Matrix

Critical safety requirements are documented in `templates/being-templates.md`.

### Quick Reference

| Work Type | Required Validators |
|-----------|-------------------|
| **Crisis features** | crisis + compliance + accessibility |
| **Assessment UI** | clinician (DSM-5) + crisis (thresholds) + accessibility |
| **Therapeutic content** | clinician (MBCT) + accessibility + [performance if animation] |
| **Privacy/PHI** | compliance (HIPAA) + security (encryption) |

**Non-negotiable for B-CRISIS**:
- Crisis detection <200ms (measured)
- All crisis data encrypted at rest
- Audit log for all events
- 988 accessible in <3 taps
- Screen reader compatible (WCAG AA)
- No false negatives on thresholds

---

## Documentation

### Complete Documentation

- **Full template documentation**: `/Users/max/dtemp/consolidated-templates.md`
- **Slash command documentation**: `/Users/max/dtemp/slash-commands.md`
- **Implementation plan**: `/Users/max/dtemp/IMPLEMENTATION-PLAN.md`

### Project Documentation

- **Safety requirements**: `/CONTRIBUTING.md`
- **Crisis implementation**: `/docs/technical/Crisis-Button-Implementation-Guide.md`
- **TypeScript safety**: `/docs/technical/TypeScript-Safety-Guide.md`

---

## Global Integration

Being templates integrate with global templates (~/.claude/):

- **Domain content** (clinical, crisis, compliance) → Use B-CRISIS/B-HOTFIX/B-DEV/B-DEBUG
- **Technical-only** → Use global T-DEV/T-DEBUG/T-BATCH/T-MIGRATE
- **Mixed work** → Use B-template with domain validation

**Hierarchy**: crisis > compliance > clinician > technical

---

## Token Efficiency

**Architecture benefits**:
- **CLAUDE.md**: Quick reference only (~1200 tokens, always loaded)
- **Templates**: Detailed workflows (~2750 tokens, loaded on-demand)
- **Commands**: User-invoked (not always loaded)

**Result**: Template details loaded only when executing workflows, not during every conversation.

---

## Maintenance

### Updating Templates

1. Edit `templates/being-templates.md` (source of truth)
2. Optionally update quick reference in `CLAUDE.md`
3. Do NOT duplicate content between files (DRY principle)

### Adding Commands

1. Create new `.md` file in `commands/`
2. Point to template section: `Read ./.claude/templates/being-templates.md → "Section"`
3. Include only: classification logic, constraints, deliverables

---

## History

**2025-09-30**: Consolidated template system v1.0
- Consolidated 6 Being templates → 4 templates (33% reduction)
- Separated execution (commands) from documentation (templates)
- Moved detailed workflows to on-demand template files
- Added comprehensive validation matrix for safety compliance

---

*For questions or issues, see implementation plan in /dtemp/ or complete documentation in consolidated-templates.md*
