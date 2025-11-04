# Being Templates - Source of Truth

**Purpose**: Detailed workflow definitions for Being. Stoic Mindfulness development with domain authority validation and intelligent intern assessment

**Usage**: Claude reads these templates on-demand when executing workflows. CLAUDE.md contains quick reference only.

**CRITICAL**: This file includes the validation matrix which is mandatory for safety-critical work.

---

## Table of Contents

1. [Templates](#templates)
   - [B-CRISIS: Crisis/Safety Features](#b-crisis-crisissafety-features-life-safety-critical)
   - [B-HOTFIX: Safety Bug Hotfixes](#b-hotfix-safety-bug-hotfixes-emergency-response)
   - [B-DEV: Being Development](#b-dev-being-development-domain-aware)
   - [B-DEBUG: Being Debugging](#b-debug-being-debugging-domain-aware)
2. [Intern Assessment Framework](#intern-assessment-framework)
3. [Decision Trees](#decision-trees)
4. [Validation Matrix](#validation-matrix)

---

## Templates

### **B-CRISIS: Crisis/Safety Features** [LIFE-SAFETY CRITICAL]

**Pattern**:
```
[Optional: intern-discover (5-10min)] → (crisis+compliance)-plan → main → (crisis+compliance+accessibility+[ux if UI])-validate → Testing → Done (user runs /b-close)
```

**When to use**: Crisis detection, safety plans, emergency features, 988 integration, PHQ/GAD thresholds

**Non-negotiable requirements**:
- Crisis detection <200ms (measured)
- All crisis data encrypted at rest
- Audit log created for all events
- 988 accessible in <3 taps
- Screen reader compatible (WCAG AA minimum)
- No false negatives on thresholds

**Intern Decision Logic**:
```
Use intern-discover if:
  ✅ Multiple crisis files need location
  ✅ Safety protocol docs need review
  ✅ Current threshold implementation unclear
  ✅ Time savings >10min expected

Skip intern if:
  ❌ Emergency timeline (use B-HOTFIX instead)
  ❌ Context already clear (1-2 known files)
  ❌ Crisis specialist already has full context
```

**Intern Tasks** (if used, 5-10min):
1. **File location**: Find all crisis/assessment files matching patterns
2. **Documentation**: Read safety protocols, implementation guides
3. **Current state**: Locate existing thresholds, crisis button logic
4. **Dependencies**: Map related stores, utils, navigation
5. **Handoff**: L3-Complex summary to crisis+compliance agents

**Intern Handoff Format** (L3-Complex):
```
CRISIS DISCOVERY
Task: [feature name]
Files Located: [crisis files, stores, docs]
Current Implementation: [thresholds, detection logic with line numbers]
Dependencies: [stores, services]
Documentation: [safety protocols read]
FLAGS: ⚠️ [critical areas flagged]
ESCALATION: Crisis domain detected → hand to crisis+compliance
```

**Intern Safety Constraints**:
- ❌ Intern NEVER suggests threshold changes
- ❌ Intern NEVER modifies crisis detection logic
- ❌ Intern NEVER interprets PHQ-9/GAD-7 scoring
- ✅ Intern CAN locate files, read docs, map dependencies
- ✅ Automatic escalation on crisis content detection

**Workflow**:
1. **[Optional] Intern Discovery** (5-10min if needed)
   - Read-only context gathering
   - Structured handoff to domain specialists

2. **Domain Planning** (crisis+compliance in parallel, 20-40min)
   - crisis: Validate detection logic, thresholds, safety protocols
   - compliance: Review HIPAA, consent, audit logging
   - Output: Implementation plan with non-negotiables

3. **Implementation** (main, 30-90min)
   - Code per domain specifications
   - Enforce <200ms, encryption, accessibility constraints

4. **Validation** (crisis+compliance+accessibility+[ux], parallel, 15-30min)
   - crisis: Verify thresholds, timing, 988 access
   - compliance: Audit HIPAA compliance, encryption
   - accessibility: Screen reader, WCAG AA
   - ux (if UI): Interaction appropriateness

5. **Testing** (user verifies)
   - Real environment testing
   - User runs `/b-close [WORK_ITEM_ID]` → merges to development, updates to "Done"

**Examples**:
- "Update crisis button behavior" → [skip intern: known file] → (crisis+compliance) plan → main (<200ms) → (crisis+compliance+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Add new crisis threshold for GAD-7" → [intern discovers: GAD files, thresholds, docs] → (crisis+compliance) plan → main → (crisis+compliance+accessibility)-validate → Testing → user runs `/b-close`

---

### **B-HOTFIX: Safety Bug Hotfixes** [EMERGENCY RESPONSE]

**Pattern** (two paths):
```
Path A (True emergency): crisis-assess → main[rapid] → crisis-validate → deploy-immediately → user runs /b-close → Done
Path B (Urgent but can test): crisis-assess → main[rapid] → crisis-validate → Testing → quick-test → user runs /b-close → deploy
```

**When to use**: Emergency bugs affecting crisis/assessment/safety features

**Emergency constraints**:
- <30min time to fix
- Minimal, focused change (no refactoring)
- No scope creep
- Immediate deployment after validation (Path A) or quick test (Path B)

**Intern Decision**: **NEVER use intern in B-HOTFIX**

**Rationale for NO intern**:
- Emergency timeline (<30min) cannot tolerate ANY latency
- Crisis specialist is fastest at triage and context-gathering
- Intern adds coordination overhead (even 5min is too much)
- Risk of delaying life-safety response
- **Safety > efficiency** for emergency response

**Path decision**:
- **Path A**: User actively affected, system down, safety risk NOW → Skip "Testing", deploy immediately, then user runs `/b-close` to mark "Done"
- **Path B**: Urgent but not actively breaking, can do 2-min verification → Update to "Testing", quick test, then user runs `/b-close` → deploy

**Examples**:
- "Crisis button not responding NOW" → Path A: crisis → main (rapid) → crisis validates → deploy → user runs `/b-close`
- "Assessment scoring crash (no active users)" → Path B: crisis → main (rapid) → crisis validates → Testing → quick test → user runs `/b-close` → deploy

---

### **B-DEV: Being Development** [DOMAIN-AWARE]

**When to use**: Features, components, refactoring in Being context (everything except B-CRISIS and B-HOTFIX)

**Decision framework**:
```
Analyze work type, assess intern value, then route to appropriate path:

1. Therapeutic content (Stoic Mindfulness exercises, philosophical practices)?
   → [Optional: intern-discover (10-15min)] → philosopher-review → ux-design → main → (philosopher+ux+accessibility)-validate + [performance-validate if 60fps required]
   → Testing → user tests → user runs /b-close

   Examples: New breathing exercise, body scan, check-in flow updates
   Note: UX designs interaction, philosopher validates philosophical accuracy, accessibility validates WCAG, performance required for animations (60fps)

   Intern use: File/principle discovery, doc gathering (skip if philosopher already has context)

2. Assessment features (PHQ-9/GAD-7 scoring, UI, calculations)?
   → [Optional: intern-discover (10-15min)] → ux-design → main → (ux(interaction)+crisis(thresholds)+accessibility(UI))-validate
   → Testing → user tests → user runs /b-close

   Examples: Add GAD-7 follow-up questions, update severity labels
   Note: UX designs interaction, crisis validates thresholds, accessibility validates UI

   Intern use: File location, threshold flagging (skip if straightforward UI change)

3. Privacy/PHI features (data export, payment, HIPAA compliance)?
   → [Optional: intern-discover (10-15min)] → (compliance+security)-review → [ux-design if UI] → main → (compliance+security+[ux if UI]+[accessibility if UI])-validate
   → Testing → user tests → user runs /b-close

   Examples: Export user data, subscription flow, data retention
   Note: Compliance validates HIPAA/legal requirements, security validates encryption/secure storage, UX required if UI involved

   Intern use: Data flow mapping, storage location (skip if simple change)

4. General Being feature (progress charts, UI improvements, non-PHI)?
   UI features:
   → [Optional: intern-triage (5-10min)] →
      ├─ Simple? → [intern-scaffold] → main → (ux+accessibility)-validate
      └─ Complex? → ux-design → main → (ux+accessibility)-validate
   → Testing → user tests → user runs /b-close

   Backend-only:
   → [Optional: intern-assess (5-15min)] →
      ├─ Trivial? → [intern-fix] → main → Testing
      ├─ Simple? → main → Testing
      └─ Domain-sensitive? → [domain-review] → main → [domain-validate] → Testing
   → user tests → user runs /b-close

   Examples: Mood trends chart (UI), enhanced export (UI), analytics dashboard (UI), API improvements (backend-only)
   Note: UX+accessibility required for all UI features; optional domain review based on proximity to philosophical/crisis/PHI areas

   Intern use:
   - UI: Triage simple vs complex, scaffold if simple (skip if interaction redesign needed)
   - Backend: Assess trivial/simple/domain, fix trivial directly (skip if domain-sensitive from start)

5. Simple technical feature with no domain or UI concerns?
   → main → Testing → user tests → user runs /b-close

   Intern use: Skip intern (already simple, no discovery needed)
```

**Intern Decision Logic by Path**:

**Therapeutic Path**:
```
Use intern-discover if:
  ✅ Need to locate multiple principle files
  ✅ Need to map which of 5 principles are affected
  ✅ Need to gather classical source documentation
  ✅ Philosopher doesn't have immediate context

Skip intern if:
  ❌ Philosopher already knows which principles
  ❌ Simple edit to existing exercise
  ❌ Context is 1-2 well-known files
```

**Assessment Path**:
```
Use intern-discover if:
  ✅ Need to locate PHQ-9/GAD-7 UI components
  ✅ Need to map threshold locations
  ✅ Complex assessment feature touching multiple files

Skip intern if:
  ❌ Straightforward UI change (known component)
  ❌ UX already knows the assessment flow
  ❌ Simple scoring logic update
```

**Privacy Path**:
```
Use intern-discover if:
  ✅ Need to map data flows (input → storage → export)
  ✅ Need to locate encryption, AsyncStorage code
  ✅ Need to identify third-party integrations

Skip intern if:
  ❌ Simple consent UI update
  ❌ Compliance already knows data architecture
  ❌ Single-file change (known location)
```

**General UI Path**:
```
Use intern-triage if:
  ✅ Unclear if simple (CSS) or complex (interaction redesign)
  ✅ Component location unknown
  ✅ Need domain proximity check

Skip intern if:
  ❌ Obvious interaction redesign (go straight to UX)
  ❌ Known component, simple change
  ❌ CSS-only update (known file)
```

**Backend Path**:
```
Use intern-assess if:
  ✅ Unclear if trivial/simple/complex
  ✅ Need to check domain sensitivity
  ✅ Multiple files, unknown locations

Skip intern if:
  ❌ Obvious domain sensitivity (go straight to domain review)
  ❌ Single known file, simple change
  ❌ Already triaged as simple
```

**Examples by path**:

*Therapeutic path*:
- "Add gratitude exercise" → [intern: principle mapping, docs] → philosopher-review (Stoic principles?) → ux-design → main → (philosopher+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Fix typo in existing breathing exercise" → [skip intern: known file] → philosopher-review → main → (philosopher+ux+accessibility)-validate → Testing → user runs `/b-close`

*Assessment path*:
- "Update PHQ-9 severity labels" → [skip intern: straightforward UI] → ux-design → main → ux-validate + crisis-validate (thresholds) + accessibility-validate → Testing → user runs `/b-close`
- "Add new GAD-7 follow-up flow" → [intern: locate GAD files, flag thresholds] → ux-design → main → (ux+crisis+accessibility)-validate → Testing → user runs `/b-close`

*Privacy path*:
- "Export journal for therapist" → [intern: map data flows, check PHI] → (compliance(PHI? HIPAA?)+security) → ux-design → main (encrypt) → (compliance+security+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Update consent screen text" → [skip intern: known file] → compliance → ux-design → main → (compliance+ux+accessibility)-validate → Testing → user runs `/b-close`

*General UI path*:
- "Update button padding" → [intern-triage: simple CSS] → [intern-scaffold] → main → (ux+accessibility)-validate → Testing → user runs `/b-close`
- "Redesign mood input interaction" → [skip intern: obvious redesign] → ux-design → main → (ux+accessibility)-validate → Testing → user runs `/b-close`

*Backend path*:
- "Organize imports in utils/" → [intern-assess: trivial] → [intern-fix] → main → Testing → user runs `/b-close`
- "Update assessmentStore caching" → [skip intern: obvious domain sensitivity] → crisis-review → main → crisis-validate → Testing → user runs `/b-close`

---

### **B-DEBUG: Being Debugging** [DOMAIN-AWARE]

**When to use**: Non-emergency bugs in Being context

**Pattern**:
```
[Optional: intern-investigate (10-20min)] →
  ├─ Root cause clear + trivial? → [intern-fix] → Testing → /b-close
  ├─ Root cause clear + simple? → main → [domain-validate?] → Testing → /b-close
  └─ Root cause unclear? → specialist-investigate → main → [domain-validate] → Testing → /b-close
```

**Intern Decision Logic**:
```
Use intern-investigate if:
  ✅ Root cause unclear (need log analysis)
  ✅ Bug reproduction steps uncertain
  ✅ Multiple files potentially affected
  ✅ Time to gather context >10min

Skip intern if:
  ❌ Root cause immediately obvious
  ❌ Typo or formatting issue (trivial)
  ❌ Specialist already has full context
  ❌ Emergency (use B-HOTFIX instead)
```

**Intern Tasks** (if used, 10-20min):
1. **Reproduction**: Attempt to reproduce, document steps
2. **Log analysis**: Collect error logs, stack traces
3. **Recent changes**: Git log for affected files
4. **File location**: Find buggy components, related code
5. **Root cause hypothesis**: Best guess (not authoritative)
6. **Domain check**: Philosophical/crisis/PHI proximity?
7. **Triage**: Trivial/simple/complex? Domain-sensitive?
8. **Handoff or fix**: Either complete fix (trivial) OR structured summary

**Intern Handoff Formats**:

**L1-Simple (trivial fix completed)**:
```
BUG FIX (TRIVIAL - COMPLETED)
Bug: [description]
File: [path:line]
Fix: [what was changed]
Domain check: [No concerns]
Testing: [verification needed]
→ Ready for Testing
```

**L2-Standard (simple, root cause clear)**:
```
BUG INVESTIGATION (SIMPLE)
Bug: [description]
Reproduction: [steps]
Root Cause: [identified issue]
File: [path:lines]
Fix Strategy: [approach]
Domain Check: [any concerns]
→ Hand to main for fix, then [domain]-validate
```

**L3-Complex (unclear or domain-sensitive)**:
```
BUG INVESTIGATION (COMPLEX)
Bug: [description]
Reproduction: [steps and consistency]
Logs: [stack traces]
Recent Changes: [git log findings]
Files Located: [affected files]
Root Cause Hypothesis: [best guess, not confirmed]
Domain Check: [philosophical/crisis/PHI concerns]
Complexity: [why specialist needed]
→ Hand to [specialist]-investigate
```

**Intern Safety Constraints**:
- ❌ Intern NEVER makes domain-sensitive fixes (even if trivial)
- ❌ Intern NEVER validates philosophical/crisis/PHI correctness
- ✅ Intern CAN fix pure formatting/typos (non-domain)
- ✅ Intern CAN gather investigation context
- ✅ Automatic escalation on domain proximity

**Investigation Phase** (if root cause unclear):
```
Performance issue? → performance-investigate
Security concern? → security-investigate
Type confusion? → typescript-investigate
State bug? → state-investigate
General? → main investigates
```

**Domain Validation Phase** (after fix):
```
Bug affected therapeutic content/UX?
  → (philosopher+ux+accessibility)-validate fix → Testing → user verifies → user runs /b-close

Bug affected assessment features?
  → (crisis+ux+accessibility)-validate → Testing → user verifies → user runs /b-close

Bug affected privacy/data handling?
  → (compliance+[ux+accessibility if UI])-validate → Testing → user verifies → user runs /b-close

Bug affected UI/interactions?
  → (ux+accessibility)-validate → Testing → user verifies → user runs /b-close

Backend-only bug?
  → Optional domain check → Testing → user verifies → user runs /b-close
```

**Examples**:

*Trivial (intern completes)*:
- "Button text typo 'Submitt' → 'Submit'" → [intern-investigate: trivial typo] → [intern-fix] → Testing → user runs `/b-close`

*Simple (root cause clear)*:
- "Mood slider not responding on Android" → [intern-investigate: reproduces, identifies TouchableOpacity issue] → main (fix to Pressable) → (philosopher+ux+accessibility)-validate → Testing → user runs `/b-close`
- "Text alignment broken on small screens" → [skip intern: obvious CSS issue] → main (fix layout) → (ux+accessibility)-validate → Testing → user runs `/b-close`

*Complex (specialist needed)*:
- "Breathing animation stutters after 30s" → [intern-investigate: reproduces, collects logs, hypothesizes memory leak] → performance-investigate → main → (philosopher+ux+performance)-validate → Testing → user runs `/b-close`
- "GAD-7 score calculation incorrect" → [skip intern: domain-sensitive from start] → crisis-investigate → main → crisis-validate → Testing → user runs `/b-close`

**Difference from B-HOTFIX**:
- B-HOTFIX: URGENT (<30min), safety-critical, Path A skips "Testing" for true emergencies, NO INTERN
- B-DEBUG: Standard timeline, investigation allowed, always includes "Testing" status, OPTIONAL INTERN

---

## Intern Assessment Framework

### Intern Boundaries [CRITICAL]

**PROHIBIT** (NEVER intern):
- `clinical` - Clinical assessment interpretation, scoring logic
- `crisis` - Crisis detection, thresholds, 988 integration
- `compliance` - HIPAA, privacy law, consent flows
- `PHI` - Protected Health Information handling
- `PHQ-9`, `GAD-7` - Assessment instruments and scoring
- `Stoic philosophy` - Philosophical accuracy, virtue ethics
- `principles` - Stoic Mindfulness principles validation
- `virtue` - Virtue tracking, character development
- `AsyncStorage` - Data persistence (PHI implications)
- `security` - Encryption, secure storage, vulnerabilities

**ALLOW** (Intern-safe):
- `formatting` - Code style, linting, prettier
- `imports` - Import organization, unused import removal
- `scaffolding(non-philosophical)` - Basic component structure, file templates
- `file-org` - Directory structure, file naming
- `config(non-security)` - ESLint, prettier, basic build config
- `discovery` - File location, documentation reading
- `triage` - Complexity assessment, domain proximity check
- `investigation` - Bug reproduction, log analysis (read-only)

**ESCALATE** (Automatic handoff triggers):
- `healthcare-terms` - Depression, anxiety, mental health terminology
- `/assessment/` - Directory path indicates assessment code
- `/crisis/` - Directory path indicates crisis features
- `Stoic terminology` - Marcus Aurelius, Epictetus, virtue, dichotomy of control
- `/principles/` - Stoic principles directory
- `virtue practices` - Character development features
- When uncertain - Fail-safe escalation

### When to Use Intern (Decision Logic)

**✅ USE INTERN when**:
- Discovery/context-gathering needed (file location, documentation)
- Triage unclear (simple vs. complex, domain vs. non-domain)
- Trivial mechanical work (formatting, imports, obvious typos)
- Scaffolding non-domain code (basic structure)
- Log analysis and reproduction (read-only investigation)
- Time savings >10min expected

**❌ SKIP INTERN when**:
- Emergency timeline (<30min) - B-HOTFIX
- Root cause obvious and specialist expertise required
- Domain work from the start (philosophical review, crisis planning)
- Context already clear (1-2 known files, specialist has full context)
- Adding intern would introduce latency in critical path
- Simple task (direct action faster than coordination)

**⚠️ SPECIALIST OVERRIDE**:
- Any specialist can bypass intern assessment if faster
- Specialist judgment always supersedes intern decision
- No penalty for skipping intern when appropriate

### Single vs. Multiple Interns

**Single Intern** (default):
```
[intern-task] → [handoff] → specialist workflow
```
- Most common pattern
- Sequential context gathering
- Single handoff point
- 5-20min duration

**Multiple Interns in Parallel** (advanced, rare):
```
(intern-files + intern-logs + intern-docs) → [consolidated handoff] → specialist workflow
```
- Use when context is parallelizable
- Each intern has distinct, independent task
- Requires consolidation step (add 2-3min)
- Max 3 interns (cognitive load limit)
- Examples:
  - File discovery + log analysis + documentation reading
  - Frontend files + backend files + infrastructure config

**Decision Logic**:
```
Context gathering needs:
├─ Single domain (files in one area)? → Single intern
├─ Multiple independent tasks? → Multiple interns (max 3)
└─ Sequential dependencies? → Single intern (can't parallelize)
```

### Intern Handoff Protocols

**L1-Simple** (trivial tasks, clear next step):
- Key finding (1-2 sentences)
- Next focus (what specialist should do)
- Essential context only (3-5 bullet points)
- **Use for**: Trivial fixes, obvious bugs, simple scaffolding
- **Duration**: 2-5min intern work

**L2-Standard** (multi-step, coordination):
- Findings (structured summary)
- Constraints (what can't change)
- Steps (proposed approach)
- Integration (how it fits)
- **Use for**: Feature development, non-trivial bugs, UI work
- **Duration**: 10-15min intern work

**L3-Complex** (domain authorities, safety-critical):
- Domain requirements (philosophical/crisis/compliance)
- Technical context (implementation details)
- Validation needs (what must be checked)
- Non-negotiables (safety/legal/philosophical constraints)
- **Use for**: Crisis features, Stoic content, PHI handling
- **Duration**: 15-20min intern work

**Selection Logic**:
```
Safety-critical? → L3-Complex
Domain authority involved? → L3-Complex
Multi-step workflow? → L2-Standard
Trivial/obvious task? → L1-Simple
```

### Intern Escalation (Automatic)

**Path-based triggers**:
- `/crisis/`, `/assessment/`, `/safety/` → Escalate to crisis
- `/principles/`, `/exercises/`, `/content/` → Escalate to philosopher
- `/stores/userStore`, `/stores/assessmentStore`, `AsyncStorage` → Check for PHI

**Content-based triggers**:
- `PHQ-9`, `GAD-7`, `depression`, `anxiety`, `crisis`, `suicide` → Escalate to crisis
- `virtue`, `dichotomy of control`, `Marcus Aurelius`, `Epictetus` → Escalate to philosopher
- `HIPAA`, `PHI`, `consent`, `encryption`, `SecureStore` → Escalate to compliance+security

**Heuristic escalation**:
```
When in doubt → Escalate (fail-safe)
Better false positive (escalate unnecessarily) than false negative (intern makes domain error)
```

**Escalation timing**:
- **Immediate**: Detection during file discovery
- **During work**: If domain content encountered mid-task
- **Before completion**: If any uncertainty about domain sensitivity

---

## Decision Trees

### Which Being Template?

```
Is this safety-critical or urgent?
├─ Crisis detection/thresholds → B-CRISIS
│   └─ Need discovery? → [Optional: intern-discover]
│
└─ Emergency bug → B-HOTFIX
    └─ NO INTERN (safety > efficiency)

Is this building or fixing (non-emergency)?
├─ Building → B-DEV
│   ├─ Therapeutic content → therapeutic path [Optional: intern-discover]
│   ├─ Assessment features → assessment path [Optional: intern-discover]
│   ├─ Privacy/PHI → privacy path [Optional: intern-discover]
│   ├─ General UI → general path [Optional: intern-triage]
│   └─ Backend-only → backend path [Optional: intern-assess]
│
└─ Fixing → B-DEBUG
    └─ Root cause unclear? → [Optional: intern-investigate]
```

### Intern Decision Tree

```
Is this an emergency? (<30min timeline)
├─ YES → B-HOTFIX, NO INTERN
└─ NO → Proceed to assessment

Do you already have full context?
├─ YES → Skip intern, proceed to specialist/main
└─ NO → Proceed to assessment

Is this domain-sensitive work from the start?
├─ YES (philosophical/crisis/PHI planning) → Skip intern, go to domain specialist
└─ NO or UNCLEAR → Consider intern

Would intern save >10min?
├─ NO → Skip intern, proceed directly
└─ YES → Use intern

What type of intern work?
├─ Discovery/context → Use intern-discover (L2 or L3 handoff)
├─ Triage → Use intern-triage/assess (L1 or L2 handoff)
├─ Investigation → Use intern-investigate (L1, L2, or L3 handoff)
└─ Trivial fix → Use intern-fix directly (L1 handoff)
```

---

## Validation Matrix

### When Each Validator is Required

**Understanding the Matrix**:
- ✅ **Required** - Validator must check, failure blocks deployment
- 🟡 **Conditional** - Required only if specific conditions met
- ⚪ **Optional** - Beneficial but not required

| Work Type | Philosopher | UX | Crisis | Compliance | Security | Performance | Accessibility |
|-----------|-------------|-----|--------|------------|----------|-------------|---------------|
| **B-CRISIS features** | ⚪ optional | 🟡 if UI | ✅ required | ✅ required | ⚪ optional | 🟡 <200ms | ✅ required |
| **Assessment UI** | ⚪ optional | ✅ required | ✅ required (thresholds) | ⚪ optional | ⚪ optional | ⚪ optional | ✅ required |
| **Therapeutic content** | ✅ required (Stoic principles) | ✅ required | ⚪ optional | ⚪ optional | ⚪ optional | 🟡 if animation (60fps) | ✅ required |
| **Privacy/PHI features** | ⚪ optional | 🟡 if UI | ⚪ optional | ✅ required (HIPAA) | ✅ required (encryption) | ⚪ optional | 🟡 if UI |
| **General UI features** | ⚪ optional | ✅ required | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ✅ required |
| **Backend-only** | ⚪ optional | ⚪ not needed | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ optional | ⚪ not needed |

### Validator Responsibilities

**Philosopher** (Stoic Mindfulness accuracy):
- Validates Stoic philosophical accuracy
- Validates adherence to Stoic principles (dichotomy of control, virtue ethics)
- Validates philosophical UX appropriateness
- Validates classical source citations (Marcus Aurelius, Epictetus, Seneca)

**UX** (User experience design):
- Validates interaction patterns appropriate for philosophical context
- Validates user flows support mindfulness (not rushed/anxious)
- Validates design consistency with mental health best practices
- Validates touch targets, gestures, navigation for mobile
- Collaborates with philosopher on philosophical integrity

**Crisis** (Safety thresholds):
- Validates PHQ≥15, GAD≥15 thresholds
- Validates Q9>0 immediate intervention
- Validates 988 access (<3 taps)
- Validates crisis detection timing (<200ms)

**Compliance** (Legal/regulatory):
- Validates HIPAA compliance
- Validates consent management
- Validates data retention policies
- Validates PCI DSS (payment)

**Security** (Technical safety):
- Validates encryption strength (AES-256)
- Validates secure storage (SecureStore)
- Validates no data leaks
- Validates vulnerability prevention

**Performance** (Timing requirements):
- Crisis features: <200ms (always measured)
- Breathing/animations: 60fps (always measured)
- User interactive: <100ms (when specified)

**Accessibility** (Universal access):
- Screen reader compatibility (WCAG AA)
- Keyboard navigation
- Color contrast
- Focus management
- **CRITICAL**: Life-safety features must be accessible

---

## Key Principles

1. **Intern is OPTIONAL**: Every template supports skipping intern if faster or unnecessary
2. **Specialist override**: Any specialist can bypass intern assessment
3. **Safety first**: B-HOTFIX excludes intern entirely, emergency response takes priority
4. **Fail-safe escalation**: When uncertain, intern escalates (better false positive than false negative)
5. **Domain boundaries**: Intern NEVER touches clinical/crisis/philosophical content
6. **Time threshold**: Only use intern if time savings >10min expected
7. **Context-aware**: Skip intern when specialist already has full context

---

*Last updated: 2025-11-04*
*File location: ~/Development/active/being/.claude/templates/being-templates.md*
