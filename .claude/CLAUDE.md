  # FullMind MBCT [requires: ~/.claude/CLAUDE.md]

  ## Config
  v1.7→stores(8wks) | RN/Expo/TS/Zustand

  ## Symbols
  → sequential | + parallel | () mixed | ? optional | ! required | !! critical | > hierarchy

  ## Domain Authorities
  | Agent | Pri | Function | Triggers | Override |
  |-------|-----|----------|----------|----------|
  | crisis | !! | safety\|988\|emergency | PHQ≥20\|GAD≥15\|button\|risk | ALL |
  | compliance | ! | HIPAA\|privacy\|regulatory | data\|encrypt\|consent\|network | technical |
  | clinician | ! | MBCT\|therapeutic\|clinical | PHQ/GAD\|exercises\|mood | UX |
  | accessibility | - | WCAG-AA\|cognitive\|stress | all-UI\|crisis\|assessments | - |

  Hierarchy: crisis>compliance>clinician>technical

  ## Intern Boundaries [SAFETY]
  PROHIBIT: clinical\|crisis\|compliance\|PHI\|MBCT\|PHQ-9\|GAD-7\|therapeutic\|AsyncStorage\|security
  ALLOW: formatting\|imports\|scaffolding(non-clinical)\|file-org\|config(non-security)
  ESCALATE: healthcare-terms\|/assessment/\|/crisis/\|/clinical/\|/therapeutic/

  ## Auto-Triggers
  CRITICAL: PHQ≥20\|GAD≥15\|crisis-button\|safety-risk\|emergency-features
  COMPLIANCE: data-encrypt\|storage\|consent\|network\|app-store
  CLINICAL: assessment-content\|MBCT-exercises\|scoring\|therapeutic-language

  ## Templates
  | ID | When | Flow |
  |----|------|------|
  | F1 | Therapeutic/MBCT | clinician→accessibility→react→test→crisis? |
  | F2 | Crisis/safety |
  crisis→(clinician+compliance)→architect→(react+typescript+security)→accessibility→test→deploy |
  | F3 | PHQ-9/GAD-7 | clinician→(typescript+state)→crisis→react→test→accessibility |
  | F4 | Data/privacy | compliance→(security+api)→architect→(react+state)→test→deploy |
  | F5 | Exercises/mood |
  clinician→architect→(react+typescript+state)→accessibility→test→performance→review |
  | F6 | Safety-bugs | crisis→(compliance+clinician)→architect→[rapid]→test→deploy |

  Non-clinical→Global(T1-T6)

  ## Conflicts
  Domain: crisis>compliance>clinician (safety-first)
  Technical vs Domain: architect mediates, domain-veto-power
  Performance vs Safety: safety priority, architect finds solution

  ## Critical [IMMUTABLE]
  PHQ/GAD: exact-words\|100%-accuracy\|thresholds(≥20,≥15)
  Crisis: 988\|<3s-access\|auto-trigger | Breathing: 60s×3=180s-exact
  Storage: encrypt\|auto-save\|validate\|offline

  ## Performance
  Launch<2s | Crisis<200ms | Check-in<500ms | Breath@60fps | Assessment<300ms

  ## Testing [100% Required]
  Clinical: PHQ(27-combos)\|GAD(21-combos)\|scoring-100%
  Crisis: <3s-all-screens\|988-works\|contacts
  Platform: iOS=Android\|WCAG-AA\|offline-complete
  Therapeutic: 60s-exact\|mood-algorithms\|progress

  ## State [Zustand]
  user→profile\|prefs | checkIn→mood[encrypted] | assessment→PHQ/GAD[!!] | crisis→contacts[!!]

  ## Handoff Requirements
  Domain work: L3-Complex required | Technical-only: L1/L2 acceptable
  Crisis/Safety: Include validation checklist + non-negotiables
  Clinical: Include accuracy requirements + compliance notes

  ## Global Integration
  Domain content (clinical\|crisis\|compliance) → F1-F6
  Technical-only → Global T1-T6 | Mixed → F-template + domain validation
  Escalation: Single→Being.Template→Global+Domain→Architect

  ## Documentation
  /docs/ → technical\|architecture\|clinical\|security\|testing
  /brand-legal/ → brand\|legal\|compliance
  /scripts/ → cross-module operations
  /CONTRIBUTING.md → agent protocols\|safety requirements
  Placement: technical→/docs/ | brand/legal→/brand-legal/ | /app/docs/=DEPRECATED

  ## File References
  Technical: /docs/architecture.md\|Crisis-Button-Implementation-Guide.md\|TypeScript-Safety-Guide.md
  Clinical: /docs/clinical/\|/docs/testing/ (PHQ/GAD validation)
  Security: /docs/security/\|Widget-Crisis-Button-Integration-Summary.md
  Contributing: /CONTRIBUTING.md (agent protocols\|safety requirements)
  PM/Roadmap: Notion 25da1108c2088077b24be0238a1ddf37
  Brand/Legal: /brand-legal/

  ## Operations
  Branches: main(clinical-validated)\|release(full-review)\|hotfix(crisis-expedited)
  Commands: test:clinical\|validate:accessibility\|perf:breathing\|perf:crisis
  Integration: global-standards + domain-requirements | Domain-veto-power