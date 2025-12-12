# Contributing to FullMind MBCT

> Mental health therapeutic app built with Claude Code agents | Safety-first development

## 🤖 Agent Safety Protocols

### Domain Authority Hierarchy (IMMUTABLE)
```
crisis >> compliance >> clinician >> technical agents
```

**Auto-Escalation Triggers:**
- PHQ-9 score ≥20 or GAD-7 ≥15 → `crisis` agent required
- Crisis button/emergency features → `crisis` agent required
- Data encryption/HIPAA → `compliance` agent required
- MBCT exercises/therapeutic content → `clinician` agent required

### Intern Agent Restrictions
❌ **PROHIBITED:** clinical | crisis | compliance | PHI | MBCT | PHQ-9 | GAD-7 | therapeutic | AsyncStorage | security
✅ **ALLOWED:** formatting | imports | scaffolding (non-clinical) | file organization | config (non-security)
🚨 **ESCALATE:** Any healthcare terms, `/assessment/`, `/crisis/`, `/clinical/`, `/therapeutic/` paths

## 📋 Development Standards

### Code Requirements
- **TypeScript**: Strict mode enforced (clinical accuracy requirement)
- **Performance**: Crisis <200ms | Launch <2s | Check-in <500ms | Breathing @60fps
- **Testing**: Run `npm run test:clinical` before ANY clinical changes
- **Git**: `feat/*` | `fix/*` | `chore/*` branches | Conventional commits | <400LOC

### Quality Gates
```bash
# Before clinical changes
npm run test:clinical
npm run validate:accessibility
npm run perf:crisis
npm run perf:breathing
```

## 🏗️ Agent Workflow Templates

### Clinical/Therapeutic Features (F1-F6)
| Template | Trigger | Flow |
|----------|---------|------|
| F1 | MBCT/Therapeutic | `clinician→accessibility→react→test→crisis?` |
| F2 | Crisis/Safety | `crisis→(clinician+compliance)→architect→(react+typescript+security)→accessibility→test→deploy` |
| F3 | PHQ-9/GAD-7 | `clinician→(typescript+state)→crisis→react→test→accessibility` |
| F4 | Data/Privacy | `compliance→(security+api)→architect→(react+state)→test→deploy` |
| F5 | Exercises/Mood | `clinician→architect→(react+typescript+state)→accessibility→test→performance→review` |
| F6 | Safety Bugs | `crisis→(compliance+clinician)→architect→[rapid]→test→deploy` |

### Standard Features (Global T1-T8)
- Non-clinical UI components → T5: `react→typescript→accessibility→test`
- Performance issues → T3: `performance→[react/state/api]→test`
- Security concerns → T4: `(security+compliance)→architect→[technical]→test`

### Handoff Requirements
| Safety Level | Required | Use Case |
|--------------|----------|----------|
| L1-Simple | key findings + next steps | Non-clinical fixes |
| L2-Standard | findings + constraints + integration | Standard features |
| L3-Complex | domain requirements + validation + non-negotiables | Clinical/Safety |
| L4-AI | model config + prompts + validation | AI features |

**Domain work requires L3-Complex handoffs**

## 🔒 Non-Negotiables

### Clinical Accuracy (100% Required)
- **PHQ-9/GAD-7**: Exact wording | 100% accuracy | Thresholds (≥20, ≥15)
- **Crisis Features**: 988 integration | <3s access | Auto-trigger
- **Breathing Exercises**: 60s×3=180s exact timing
- **Assessment Scoring**: 27 PHQ combos + 21 GAD combos tested

### Data Protection
- **Storage**: Encrypted | Auto-save | Validated | Offline capable
- **HIPAA Compliance**: All data handling must involve `compliance` agent
- **Network**: Secure transmission | Consent validation

### Performance Thresholds
```
Launch: <2s
Crisis Access: <200ms
Check-in Flow: <500ms
Breathing Circle: 60fps
Assessment: <300ms
```

## 📁 File Organization

### Source Architecture

Being uses **feature-based architecture** with clear separation between infrastructure and domain code:

```
app/src/
├── __tests__/      # Integration/regression tests (app-wide only)
├── core/           # Infrastructure (cross-cutting concerns)
│   ├── analytics/  # Privacy-preserving analytics
│   ├── services/   # Security, sync, session, logging
│   ├── stores/     # Subscription, settings
│   ├── types/      # Infrastructure types
│   └── ...
├── features/       # Domain features (business logic)
│   ├── learn/      # Educational modules
│   ├── practices/  # Morning/midday/evening practices
│   ├── crisis/     # Crisis intervention
│   └── ...
└── App.tsx         # Entry point
```

**Key Principles:**
- `core/` = Infrastructure (analytics, security, types used across features)
- `features/` = Domain features (business logic, feature-specific code)
- Types co-located with their consumers
- Path aliases (`@/core/*`, `@/features/*`) over relative imports

**📂 See [`app/src/README.md`](./app/src/README.md) for:**
- Complete directory structure rules
- "Where does this file go?" decision tree
- Import path conventions
- File placement examples
- Common mistakes & fixes

### Protected Paths (Domain Agent Required)
- `/app/src/features/assessment/` → `clinician` required
- `/app/src/features/crisis/` → `crisis` required
- `/app/src/core/services/security/` → `compliance` required
- `/app/src/core/types/compliance/` → `compliance` required

### Documentation Structure
- `/docs/` → Technical Documentation (Product | Clinical | Architecture | Security)
- `/brand-legal/` → Brand Guidelines | Legal | Compliance
- `/scripts/` → Cross-module operations
- `/app/src/README.md` → Source architecture guide

## 🧪 Testing Strategy

### Required Coverage
- **Clinical**: 100% PHQ/GAD combinations + scoring algorithms
- **Crisis**: <3s access from all screens + 988 integration
- **Platform**: iOS = Android + WCAG-AA + Offline complete
- **Therapeutic**: 60s exact timing + mood algorithms + progress tracking

### Test Commands
```bash
npm run test:clinical     # Before clinical changes
npm run test:crisis      # Before crisis features
npm run test:accessibility # Before UI changes
npm run test:platform    # Cross-platform validation
```

## ⚡ State Management (Zustand)

### Store Structure
```
user → profile | preferences
checkIn → mood [encrypted]
assessment → PHQ/GAD [critical]
crisis → contacts [critical]
```

**All clinical data must be encrypted at rest**

## 🚨 Emergency Protocols

### Crisis Feature Development
1. `crisis` agent validates safety requirements
2. `compliance` agent ensures HIPAA compliance
3. `architect` coordinates technical implementation
4. Full test suite including <3s access validation
5. Crisis contact integration testing

### Hotfix Process
- Branch: `hotfix/crisis-*` or `hotfix/safety-*`
- Expedited review for safety-critical issues
- Full clinical validation required even for hotfixes

## 📞 Support

**For Agents**: Follow domain hierarchy for escalation
**For PM**: All clinical/safety concerns require domain agent validation
**For Development**: Reference `/docs/architecture/` for technical details

---

**Remember**: In mental health software, user safety always takes precedence over development speed or technical preferences.