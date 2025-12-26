  # Being. [requires: ~/.claude/CLAUDE.md]
  
  ## Requirement
  ~/.claude/CLAUDE.md

  ## Agents

  ### Domain Authorities
  | Agent | Pri | Function | Triggers | Override |
  |-------|-----|----------|----------|----------|
  | crisis | !! | safety protocols\|988\|emergency response\|intervention workflows | PHQ≥15\|PHQ≥20\|GAD≥15\|button\|risk | ALL |
  | compliance | ! | HIPAA compliance\|privacy law\|regulatory validation\|legal requirements | data\|encrypt\|consent\|network | technical |
  | philosopher | ! | Stoic Mindfulness validation\|philosophical accuracy\|principle integrity\|virtue ethics | Stoic principles\|Marcus Aurelius\|Epictetus\|dichotomy of control\|virtue | UX |

  Hierarchy: crisis>compliance>philosopher>ux>technical

  ### Intern Boundaries
  PROHIBIT: clinical\|crisis\|compliance\|PHI\|PHQ-9\|GAD-7\|Stoic philosophy\|principles\|virtue\|AsyncStorage\|security
  ALLOW: formatting\|imports\|scaffolding(non-philosophical)\|file-org\|config(non-security)
  ESCALATE: healthcare-terms\|/assessment/\|/crisis/\|Stoic terminology\|/principles/\|virtue practices

  ### Auto-Triggers
  CRITICAL: PHQ≥15\|PHQ≥20\|GAD≥15\|crisis-button\|safety-risk\|emergency-features
  COMPLIANCE: data-encrypt\|storage\|consent\|network\|app-store
  PHILOSOPHICAL: Stoic principles\|virtue ethics\|Marcus Aurelius\|Epictetus\|dichotomy of control\|educational modules
  UX: therapeutic user flows\|check-in interactions\|assessment UI design\|onboarding

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

  ## Design System [!]
  Theme: @/core/theme

  ### Exports
  colorSystem: themes(morning|midday|evening)|base|gray[100-700]|status|accessibility|navigation
  semantic: text(primary|secondary|muted|inverse)|background(primary|secondary)|border(default|strong)
  spacing: pixel-value keys (spacing[4]=4px, spacing[8]=8px... spacing[128]=128px)
  borderRadius: small|medium|large|xl|xxl
  typography: micro|caption|bodySmall|bodyRegular|bodyLarge|headline2-4|title|display + fontWeight.*
  getTheme(flowType): returns theme colors for morning|midday|evening

  ### Rules
  UI-work → import from @/core/theme
  PROHIBIT: hardcoded hex|magic-numbers|inline-fontSize
  Prefer: colorSystem.* (hierarchical) | semantic.* (intent-based)

  ## Documentation

  ### Structure
  Docs: /docs/{product,architecture,development,testing,security,legal}/
  Key: /docs/README.md (navigation) | /docs/architecture/README.md (codebase structure)
  PM, planning, backlog: Notion database (MCP) 277a1108-c208-805c-810b-000b0f0aae22

  ### Policies
  PROHIBIT: /app/*.md | duplicates | phase-reports
  DELETE: completed-work | old-validations (after-merge)

  ## Operations
  Branches: main(philosopher-validated)\|release(full-review)\|hotfix(crisis-expedited)
  Commands: validate:philosophy\|validate:accessibility\|perf:breathing\|perf:crisis
  Integration: global-standards + domain-requirements | Domain-veto-power