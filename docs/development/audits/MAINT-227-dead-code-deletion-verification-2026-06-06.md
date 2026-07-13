# MAINT-227 — Dead-code Deletion Verification Pass (confirm zero-caller claims)

**Date:** 2026-06-06
**Ticket:** [MAINT-227 — Dead-code deletion verification pass (confirm zero-caller claims)](https://app.notion.com/p/377a1108c20881c08a08f4692c4e0374)
**Author:** `/b-work maint-227` — independent caller re-verification of the deletion claims raised by the 2026-06-06 audit's bloat agents. **Verification record only — no application code changes ship from this work item.**
**Scope:** Tranche **T0a** · risk rank **#2 (enabler)**. Gates the Phase-2 deletion tranches **T4, T5, T6, T7, T8, T9, T10**. Each was scoped by bloat-audit agents asserting "zero callers" at 88–98% confidence — a confidence score, not a guarantee. This pass re-confirms (or refutes) those claims before any code is deleted.
**Grounded in:** source on `development` as read on branch `chore/maint-227-dead-code-deletion-verification` (off `development` @ `9d313c2`). Every `file:line` below was re-verified against that branch. Method: searched `app/src` for alias imports (`@/core/*`, `@/features/*`), relative imports, barrel (`index.ts`) re-exports, and string / dynamic `import()` references, then **traced caller liveness transitively** — a level-1 importer that is itself dead does not keep a symbol alive.

---

## TL;DR

The pass earned its keep: **4 of 7 targets confirm clean GO; 3 are wrong or imprecise as written.** Following the T5 and T6 ACs verbatim — "delete the optimizer public API," "reduce CrisisSecurityProtocol to its metrics surface" — would have **broken `tsc`/the build**. T10's `FeatureGate` needs an owner disposition, and its `flows.ts`/`stoic.ts` targets are *live files* (only sub-blocks are dead).

| Tranche | Ticket | Target | Verdict |
|---|---|---|---|
| **T4** | MAINT-236 | `src/compliance/` (~7.2k LOC) | ✅ **GO** |
| **T7** | MAINT-246 | `core/types/` validation framework + commented tombstone | ✅ **GO** |
| **T8** | MAINT-240 | OnboardingScreen fake-HIPAA subsystem (~600 LOC) | ✅ **GO** |
| **T5** | MAINT-245 | `core/services/deployment/` | ✅ **GO** |
| **T5** | MAINT-245 | `performance/` optimizer "public API" | ⚠️ **GO — only as an atomic cluster** |
| **T6** | MAINT-237 | `CrisisSecurityProtocol` non-metrics surface | ⚠️ **NO-GO as written → GO with corrected scope** |
| **T9** | MAINT-238 | SecurityMonitoringService + NetworkSecurityService | ⚠️ **GO — and it unblocks full T6 deletion** |
| **T10** | MAINT-247 | `FeatureGate` + practice/type leftovers | ⚠️ **MIXED — partial GO + 1 disposition + scope correction** |

**Cross-tranche headline:** the security + monitoring + performance code forms three transitively-dead clusters whose *only* surviving anchors are themselves dead. The single most important catch: `SecurityMonitoringService` — the lone live consumer of `CrisisSecurityProtocol` — **is itself unreferenced** (its barrel comment claiming a live caller is stale). So once T9 removes it, T6 can delete `CrisisSecurityProtocol` outright rather than reducing it to a metrics shim.

---

## T4 — `src/compliance/` (MAINT-236) · ✅ GO

**Inventory.** `BreachResponseEngine.ts`, `ConsentManager.ts`, `DataMinimization.ts`, `DataProtectionEngine.ts`, `PrivacyAssessmentIntegration.ts`, `index.ts` (exports `DataProtectionService` singleton + `dataProtectionService`).

**Evidence.** Zero external importers of the directory or any of its exports. The only non-internal references are:
- `app/tsconfig.json:39` — the `@/compliance/*` path-alias definition (declaration, not usage).
- `app/src/core/types/validation/typescript-config.ts:48` — a config test that asserts the alias mapping exists.

The live consent path is `app/src/core/stores/consentStore.ts` (and `useConsentStore.canPerformOperation(...)`), entirely separate from this directory.

**Verdict: GO** — delete the whole directory. After deletion, also drop the now-dangling `@/compliance/*` alias and the `typescript-config.ts:48` assertion in the same PR so `tsc` stays green. `compliance` agent confirms no live obligation depends on it (per MAINT-236 AGENTS REQUIRED).

---

## T7 — `core/types/` validation framework (MAINT-246) · ✅ GO

**Inventory.** Seven framework-validation interfaces in `app/src/core/types/index.ts:293–351`, already inside a `/* … */` tombstone block (with an explanatory NOTE at `:269–291` from MAINT-79): `CrisisWorkflowTypeValidation`, `ComplianceTypeValidation`, `SecurityTypeValidation`, `PerformanceTypeValidation`, `ErrorTypeValidation`, `IntegrationTypeValidation`, `MasterTypeValidation`.

**Evidence.** Zero references to any of the seven names outside `index.ts`. The block is already commented out (dead). The framework sub-modules (`performance/validation/integration/compliance/security/errors`) under `core/types/` have no importers.

**Verdict: GO** — delete the commented block + the unused framework sub-modules + the framework barrel. **Keep `session.ts` and `subscription/`** — those have real importers (`core/types/index.ts` re-exports them and they are consumed). Finish with `tsc --noEmit` clean.

---

## T8 — OnboardingScreen fake-HIPAA subsystem (MAINT-240) · ✅ GO

**Location.** `app/src/features/onboarding/screens/OnboardingScreen.tsx`.

**Inventory (all component-local, none exported).** State: `hipaaConsents`, `consentScope`, `auditTrail`, `patientRightsRequests`, `dataMinimizationReport`, `businessAssociateActivities`, `breachIncidents`, `complianceMetrics`. Functions: `logAuditEvent`, `classifyPHI`, `validateDataMinimization`, `grantDataProtectionConsent`, `handlePatientRightsRequest`, `logBusinessAssociateActivity`, `detectPotentialBreach`, `calculateComplianceScore` — reachable only via the never-wired `handleConsentToggle`/`renderStateInspector`.

**Evidence.** Zero external importers of any symbol. Four functions (`classifyPHI`, `validateDataMinimization`, `handlePatientRightsRequest`, `detectPotentialBreach`) are never called even *internally* — dead code inside dead code. The component is rendered by `CleanRootNavigator.tsx:269`, but none of its HIPAA internals are reachable from outside.

**Verdict: GO** — delete the compliance interfaces, dead state hooks, the unreferenced functions, and `handleConsentToggle`/`renderStateInspector`. **Leave the live consent wiring intact** (`handleConsentPreferenceToggle`/`ConsentToggleCard` + the 5 render fns). `compliance` agent confirms terminology (per MAINT-240). Finish `typecheck` + suite green.

---

## T5 — `deployment/` + `performance/` (MAINT-245)

### `core/services/deployment/` · ✅ GO

**Inventory.** `DeploymentService.ts` (`DeploymentService`, `deploymentService`, `DeploymentStrategy`/`Environment`/`DeploymentStatus` enums) + `index.ts` (`DeploymentOrchestrator`, `deploymentOrchestrator`, readiness fns). Simulated server-deployment, irrelevant to an RN client.

**Evidence.** Zero importers anywhere outside the directory. String literals `'deployment_service'`/`'deployment_orchestrator'` are logging tags only.

**Verdict: GO** — delete the directory.

### `performance/` optimizer "public API" · ⚠️ GO — only as an atomic cluster

This is the pass's most important catch. A single-level importer grep reports the optimizer as **alive** — but every caller is itself transitively dead.

**The dead cluster (delete together):**
- `core/services/performance/CrisisPerformanceOptimizer.ts`
- `core/services/performance/index.ts` (`PerformanceSystem` / `performanceService`)
- `core/services/performance/PerformanceMonitor.ts`
- `core/services/performance/PerformanceValidator.ts`
- `core/services/performance/BundleOptimizer.ts`
- `features/assessment/hooks/useAssessmentPerformance.ts`
- `features/assessment/components/AssessmentIntegrationExample.tsx`

**Why it's all dead:**
- `CrisisPerformanceOptimizer` is called by `useAssessmentPerformance.ts:179,326,332,503`, `performance/index.ts:72,186,210,280`, `PerformanceMonitor.ts:529`, `PerformanceValidator.ts:88` — i.e. only by other members of this cluster + the assessment hook.
- The assessment hook's only consumer is `AssessmentIntegrationExample.tsx:87` (+ the `features/assessment/hooks/index.ts:6` barrel re-export + a dynamic `import()` in `BundleOptimizer.ts:110`, itself in-cluster).
- **`AssessmentIntegrationExample.tsx` has zero live importers** — it is a dead demo component. That collapses the whole chain.
- The performance subsystem's other external door, `performanceService` (default export of `performance/index.ts`), is imported only by `core/services/monitoring/CrisisMonitoringService.ts:21` — which is **itself dead** (only its own barrel `monitoring/index.ts:46,48,53` references it; the monitoring barrel has no importers).
- `triggerOptimizedEmergencyResponse()` (`CrisisPerformanceOptimizer.ts:303`) has **zero callers even within the cluster**.

**Verdict: GO** — but delete the cluster **atomically**. Deleting the optimizer alone (or any single member) breaks `tsc`. MAINT-245's AC "delete unused optimizer public methods, keep consumed pass-throughs" is moot once the demo entrypoint is removed: **nothing is consumed**, so the whole cluster (incl. `CrisisMonitoringService`) goes. Finish `typecheck` + suite green. `performance` agent confirms (per MAINT-245).

---

## T6 — `CrisisSecurityProtocol` non-metrics surface (MAINT-237) · ⚠️ NO-GO as written → GO with corrected scope

**Location.** `app/src/features/crisis/services/CrisisSecurityProtocol.ts`. **Crisis safety path — `crisis` + `security` sign-off required at delete-time (already in MAINT-237 AGENTS REQUIRED).**

**Surprise caller (refutes the claim).** `initialize()` is a *non-metrics* method and **is live**: `SecurityMonitoringService.ts:410` (`await this.crisisSecurityProtocol.initialize()`). The metrics method `getCrisisSecurityMetrics()` is also consumed (`SecurityMonitoringService.ts:1045,1507`). So "the metrics surface SecurityMonitoringService uses" is actually **`getInstance` + `initialize` + `getCrisisSecurityMetrics` (+ `destroy` lifecycle)** — not metrics alone.

**Genuinely-dead non-metrics methods (zero external callers):** `grantEmergencyAccess`, `protectCrisisData`, `validateProfessionalAccess`, `startCrisisSecurityMonitoring`, `detectSecurityViolation`, `performImmediateLockdown`, `getActiveCrisisAccess`, `getSecurityViolations`, `isMonitoringActive`.

**But it gets simpler — see T9.** The *only* consumer of the surviving surface is `SecurityMonitoringService`, which is **itself dead** (T9). Once T9 removes it, `CrisisSecurityProtocol` has zero consumers and can be **deleted in full**, not reduced to a shim.

**Verdict:**
- **If T6 runs before T9:** keep `getInstance`/`initialize`/`getCrisisSecurityMetrics`/`destroy`; delete the 9 dead methods + emergency-override/professional-access/multi-tier-encryption code + empty monitor stubs. (Do **not** interpret the AC as "metrics-only" — that deletes `initialize()` and breaks `SecurityMonitoringService.ts:410`.)
- **If T9 runs first (recommended):** delete `CrisisSecurityProtocol.ts` entirely.
- Either way, the second of {T6, T9} **must re-run the seam grep** (`rg "crisisSecurityProtocol\.|CrisisSecurityProtocol" src`) before deleting, with `crisis` sign-off.

---

## T9 — SecurityMonitoringService + NetworkSecurityService (MAINT-238) · ⚠️ GO — and it unblocks full T6 deletion

**Finding.** `SecurityMonitoringService` has **zero runtime importers**. Only its own barrel re-exports it (`core/services/security/index.ts:24,89`); the only other hits are a *type* of the same name (`core/types/security/encryption.ts:688`, `core/types/index.ts:124`) and a leaf-module comment (`wellnessDataPatterns.ts:4`). The barrel's prose at `security/index.ts:7` — *"AnalyticsService imports SecurityMonitoringService directly"* — is **stale/false**: no file imports the `SecurityMonitoringService` class at runtime (grep for `import … SecurityMonitoringService` outside the barrel returns nothing). The security barrel itself is imported only for unrelated symbols (e.g. `EncryptionService`, `src/README.md:93`), which does not instantiate the monitoring service.

**Verdict: GO** — `SecurityMonitoringService` is fully deletable. **Sequencing recommendation: run T9 before T6** (or merge them) so T6 collapses to a whole-file deletion of `CrisisSecurityProtocol`. (`NetworkSecurityService.secureRequest` mock layer not separately traced here; ticket-scoped — confirm its callers at delete-time.) `security` agent sign-off (per MAINT-238). Finish `typecheck` + suite green.

---

## T10 — FeatureGate + practice/type leftovers (MAINT-247) · ⚠️ MIXED

| Item | Verdict | Evidence |
|---|---|---|
| `GratitudeInputSection` | ✅ **GO** | Only the `features/practices/shared/components/index.ts:32–33` barrel re-export; no JSX/consumer found. Drop the barrel entries too. |
| `shared/constants/principles.ts` | ✅ **GO** | Zero importers anywhere. |
| `FeatureGate` / `withFeatureGate` / `useFeatureAccess` | ⚠️ **NO-GO — owner disposition** | Prod-dead (DEBUG-189 unwired it; only a comment remains at `core/navigation/CleanTabNavigator.tsx:167`), **but `core/components/subscription/__tests__/FeatureGate.test.tsx` exercises all three exports**. Not a pure-grep call: delete the component **and its test together** (the test verifies nothing that ships), or keep both. **Name-collision caution:** a *different* `useFeatureAccess` exists at `core/stores/subscriptionStore.ts:622` (a Zustand selector) — do **not** delete it. |
| `FlowProgress` "stub" + `types/flows.ts` + `types/stoic.ts` "dead blocks" | ⚠️ **CAUTION — files are LIVE, scope to sub-blocks only** | `features/practices/types/flows.ts` is heavily live (`FlowProgress` interface used at `flows.ts:159`; imported by Evening/Midday/Morning navigators + many screens). `types/stoic.ts` is live (`StoicPrinciple`, `CardinalVirtue` used by live screens + `README.md:99`). `FlowProgressIndicator` (component) is live (Evening/Midday/Morning navigators). Only specific dead *blocks within* these files are removable — **do not delete the files.** Identify the exact dead blocks during implementation and `tsc` after. |

**Path correction:** MAINT-247's Technical Notes cite `features/learn/types/*`, but the actual `flows.ts`/`stoic.ts` live under **`features/practices/types/`**. Update the AC path before deleting.

**Verdict: MIXED** — `GratitudeInputSection` + `principles.ts` are clean GO; `FeatureGate` needs an owner decision (delete-with-test vs. keep); `flows.ts`/`stoic.ts` require within-file scoping (the files stay).

---

## Cross-tranche coupling & recommended order

1. **T9 before T6** — deleting `SecurityMonitoringService` (T9) turns T6 into a whole-file deletion of `CrisisSecurityProtocol`. Running T6 first forces the more error-prone "keep the consumed lifecycle surface" surgery. Whichever runs second re-verifies the seam with `crisis` sign-off.
2. **T5 performance is one atomic PR** — the 7-file cluster (+ `CrisisMonitoringService`) deletes together or `tsc` breaks.
3. **T6/T9 are on the crisis safety path** — `crisis` + `security` planning passes at delete-time are mandatory (already in those tickets' AGENTS REQUIRED), plus a green `npm run test:crisis-detection` before merge.

## Sign-off

| Tranche | Target | Verdict | Action for the deletion tranche |
|---|---|---|---|
| T4 | `compliance/` | ✅ GO | Delete dir + drop dangling alias/test |
| T7 | `core/types/` framework | ✅ GO | Delete framework subset; keep `session`/`subscription` |
| T8 | Onboarding fake-HIPAA | ✅ GO | Delete dead subsystem; keep live consent wiring |
| T5 | `deployment/` | ✅ GO | Delete dir |
| T5 | `performance/` cluster | ⚠️ GO (atomic) | Delete the 7-file cluster + `CrisisMonitoringService` together |
| T6 | `CrisisSecurityProtocol` | ⚠️ GO (corrected) | Keep `initialize`/metrics/lifecycle **unless** T9 ran first → delete whole file |
| T9 | `SecurityMonitoringService` | ⚠️ GO | Delete (barrel caller-claim is stale); run before T6 |
| T10 | FeatureGate + leftovers | ⚠️ MIXED | GO on `GratitudeInputSection`/`principles.ts`; disposition on `FeatureGate`; sub-block-only on `flows.ts`/`stoic.ts` (fix path) |

**No application code changes ship from MAINT-227.** The corrected scopes above are mirrored as comments on the affected downstream tickets (T5/T6/T9/T10).
