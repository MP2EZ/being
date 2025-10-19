  # Being. MBCT [requires: ~/.claude/CLAUDE.md]
  
  ## Requirement
  ~/.claude/CLAUDE.md

  ## Agents

  ### Domain Authorities
  | Agent | Pri | Function | Triggers | Override |
  |-------|-----|----------|----------|----------|
  | crisis | !! | safety protocols\|988\|emergency response\|intervention workflows | PHQ≥15\|PHQ≥20\|GAD≥15\|button\|risk | ALL |
  | compliance | ! | HIPAA compliance\|privacy law\|regulatory validation\|legal requirements | data\|encrypt\|consent\|network | technical |
  | philosopher | ! | Stoic Mindfulness validation\|philosophical accuracy\|principle integrity\|virtue ethics | Stoic principles\|Marcus Aurelius\|Epictetus\|dichotomy of control\|virtue | UX |

  Hierarchy: crisis>compliance>philosopher>technical

  ### Intern Boundaries
  PROHIBIT: clinical\|crisis\|compliance\|PHI\|PHQ-9\|GAD-7\|Stoic philosophy\|principles\|virtue\|AsyncStorage\|security
  ALLOW: formatting\|imports\|scaffolding(non-philosophical)\|file-org\|config(non-security)
  ESCALATE: healthcare-terms\|/assessment/\|/crisis/\|Stoic terminology\|/principles/\|virtue practices

  ### Auto-Triggers
  CRITICAL: PHQ≥15\|PHQ≥20\|GAD≥15\|crisis-button\|safety-risk\|emergency-features
  COMPLIANCE: data-encrypt\|storage\|consent\|network\|app-store
  PHILOSOPHICAL: Stoic principles\|virtue ethics\|Marcus Aurelius\|Epictetus\|dichotomy of control\|educational modules

  ### Templates
  Detailed templates: ./.claude/templates/

  **Quick Reference**:

  **Being Templates**:
  B-CRISIS: Crisis/safety → (crisis+compliance)→main→(crisis+compliance+accessibility)
    - Use for: crisis detection, PHQ/GAD thresholds, 988, safety protocols
  B-HOTFIX: Emergency bugs → crisis→main[rapid]→crisis-validate→deploy
    - Use for: urgent safety bugs, <30min rapid response
  B-DEV: Being development
    - Use for: features, Stoic Mindfulness content, assessment UI, privacy features
    - Paths: philosophical (philosopher), assessment (philosopher→crisis), privacy (compliance+security), general
  B-DEBUG: Being debugging
    - Use for: non-emergency bugs with Being domain awareness
    - Domain validation: philosophical (philosopher), assessment (philosopher+crisis), privacy (compliance)

  Read ./.claude/templates/being-templates.md when uncertain about pattern details.

  ### Conflicts
  Domain: crisis>compliance>philosopher (safety-first)
  Technical vs Domain: architect mediates, domain-veto-power
  Performance vs Safety: safety priority, architect finds solution

  ### Handoff Requirements
  Domain work: L3-Complex required | Technical-only: L1/L2 acceptable
  Crisis/Safety: Include validation checklist + non-negotiables
  Philosophical: Include accuracy requirements + philosophical integrity notes

  ### Global Integration
  Domain content (philosophical\|crisis\|compliance) → B-CRISIS/B-HOTFIX/B-DEV/B-DEBUG
  Technical-only → Global T-DEV/T-DEBUG/T-BATCH/T-MIGRATE | Mixed → B-template + domain validation
  Escalation: Single→Being.Template→Global+Domain→Architect

  ## Product [!!]
  
  ### Config
  RN/Expo/TS/Zustand

  ### Standards
  PHQ/GAD: exact-words\|100%-accuracy\|thresholds(PHQ≥15/≥20,GAD≥15)
    ↳ PHQ≥15=support, PHQ≥20=intervention
  Crisis: 988\|<3s-access\|auto-trigger | Breathing: 60s×3=180s-exact
  Storage: encrypt\|auto-save\|validate\|offline

  ### Performance
  Launch<2s | Crisis<200ms | Check-in<500ms | Breath@60fps | Assessment<300ms

  ### Testing
  Clinical: PHQ(27-combos)\|GAD(21-combos)\|scoring-100%
  Crisis: <3s-all-screens\|988-works\|contacts
  Platform: iOS=Android\|WCAG-AA\|offline-complete
  Therapeutic: 60s-exact\|mood-algorithms\|progress

  ### State [Zustand]
  user→profile\|prefs | checkIn→mood[encrypted] | assessment→PHQ/GAD[!!] | crisis→contacts[!!]

  ## Documentation

  ### Structure & Key Files
  Docs: /docs/{technical,philosophical,security,brand-legal}/ | /scripts/
  Guides: Crisis-Button-Implementation-Guide.md | TypeScript-Safety-Guide.md | Widget-Crisis-Button-Integration-Summary.md
  Agent Protocols: /CONTRIBUTING.md (safety requirements | handoff protocols | philosophical validation)
  PM: Notion 25da1108c2088077b24be0238a1ddf37

  ### Policies
  PROHIBIT: /app/*.md | duplicates | phase-reports
  DELETE: completed-work | old-validations (after-merge)

  ## Operations
  Branches: main(philosopher-validated)\|release(full-review)\|hotfix(crisis-expedited)
  Commands: validate:philosophy\|validate:accessibility\|perf:breathing\|perf:crisis
  Integration: global-standards + domain-requirements | Domain-veto-power