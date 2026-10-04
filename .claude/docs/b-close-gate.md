# /b-close Phase 2.5 — gate steps (loaded on demand)

Read this file only when Step 2.5.1 printed `🔒 GATE REQUIRED`. It holds Steps 2.5.3,
2.5.4 and 2.5.5, moved verbatim from `/b-close` (INFRA-723) with their numbers unchanged;
every other step they name lives in `/Users/max/dev/being/.claude/commands/b-close.md`.

Order on an active gate: Step 2.5.3 here → Step 2.5.3a in `b-close.md` → Steps 2.5.4–2.5.5
here, unless 2.5.3a detached → Step 3.1 in `b-close.md`.

**Read `/Users/max/dev/being/.claude/docs/e2e-gotchas.md` before running or debugging anything below.** The build, provenance,
background-run and abort rules these steps assume live there (moved from `CLAUDE.md`,
INFRA-725); `CLAUDE.md` keeps only one line per rule.

---

### Step 2.5.3: Map changed paths to scoped flow(s)

Avoids running all 5 flows on every safety touch (~3-4 min full run trains
`--skip-e2e` reflex). Match changed paths to the minimal set of flows that
pin the surfaces affected.

```bash
# INFRA-483 — this holds FLOW NAMES, not npm script names, because Step 2.5.5 passes the
# whole set to ONE `e2e-safety.sh` invocation. The simulator lease is taken and released
# per PROCESS (e2e-safety.sh:266-267 acquire + trap), so a loop of `npm run` calls drops it
# between every flow, and a peer's gate build landing in one of those gaps installs over
# the target and fails the NEXT flow's pre-flight. The per-flow `e2e:safety:*` scripts stay
# in package.json for manual use; they must keep routing through `e2e-safety.sh`.
FLOWS=()
# Declared HERE, once. It used to be re-declared empty further down — AFTER the
# practices/dailyloop clause had already set it — which discarded DEBUG-465's carve-in, so
# a dailyloop-only change fell through to the crisis-button fail-safe instead of the full
# suite. A single declaration point is what makes the override order legible.
FULL_SUITE=""
# DEBUG-546 — safety-dynamic-type flows. Never merged into FLOWS: e2e-safety.sh runs the
# tagged suite at the DEFAULT content size, and these must run through e2e-dynamic-type.sh.
DYNAMIC_TYPE_FLOWS=()
# --- Classify: which safety changes are RENDER/BOOT-relevant vs SERVICE-LAYER-only? ---
# The sim flows drive the UI; they can ONLY validate render / boot / navigation surfaces.
# Pure service-layer code is jest-owned (precommit + CI's crisis/clinical/security/
# encryption suites + the CollapsibleCrisisButton render tests) and need not pull a sim
# build. Two carve-outs, both fail SAFE (a file leaves the sim-relevant
# set only when unambiguously non-UI).
# NOTE (INFRA-383, corrected INFRA-508): these carve-outs were originally sized against a
# 10-15 min EAS build, on the reasoning that charging one for a service-layer change trains
# the `--skip-e2e` reflex. This used to add that the build is "now ~1 min warm, so that cost
# argument no longer holds" and the carve-outs could be re-widened. **Do not act on that.**
# Measured over five instrumented runs: 1-4 min warm but 11-14 min whenever the native
# project regenerates, and before INFRA-508 any `app/package.json` move fired one. The cost
# argument still holds; re-widening needs a fresh measurement, not this sentence. Left as a
# recorded opportunity only:
#   1. features/crisis/services/**  — crisis BACKEND services (e.g. CrisisSecurityProtocol),
#      not the overlay / screens / components the crisis-button flow renders.
#   2. core/services/security/** EXCEPT EncryptionService / SecureStorageService /
#      DeepLinkValidationService — monitoring / metrics / network / protocol layer.
#      Encryption + SecureStorage ARE boot/render-critical (wellness data decrypts at
#      assessment render; encryption init gates app boot), and DeepLinkValidationService
#      decides deep-link delivery, 988 included (DEBUG-636), so all three STAY.
# If you ever wire a NEW security/crisis service into app boot or the crisis overlay's
# import graph, DROP it from the carve-out so its changes re-arm the smoke test.
RENDER_BOOT_RELEVANT=$(echo "$SAFETY_CHANGED" | awk '
  # DEBUG-596 (crisis ruling): crisisTapTrace.ts is NOT a backend service. It is tap-path
  # code in the crisis overlay import graph — CollapsibleCrisisButton.tsx:85/:322 and
  # CrisisKeyboardAccessory.tsx:67/:107 call beginCrisisTap() on the tap frame ahead of the
  # navigate, and CrisisResourcesScreen.tsx:290 / openCrisisUrl.ts:50,:82 close the mark.
  # The carve-out below names that exit condition itself. Keep this rule FIRST — awk takes
  # the first matching rule.
  /src\/features\/crisis\/services\/crisisTapTrace\.ts/ { print; next }
  /src\/features\/crisis\/services\// { next }
  # DEBUG-636 (crisis ruling): the enforcing allowlist decides whether being://crisis is
  # delivered — not monitoring. Keep this ahead of the security carve-out below.
  /src\/core\/services\/security\/DeepLinkValidationService\.ts/ { print; next }
  /src\/core\/services\/security\// {
    # Bare regex, NOT `$0 ~ …`: the harness substitutes $0 with the run’s arguments when
    # rendering this file, so a copied `$0` matches nothing and drops every security file
    # from the render-boot set — failing toward not gating. Bare regex matches $0 implicitly.
    # This has recurred twice. An extract-based harness CANNOT catch it: it reads this file on
    # disk, where $0 is still $0. Re-run any new check against a $0-substituted copy of the block.
    if (/EncryptionService|SecureStorageService/) { print }
    next
  }
  { print }
')
# Crisis UI dir touched (overlay/screens/components — services/ already carved out) OR the
# overlay re-hosted/edited anywhere (FEAT-212 content detection) → reachability flow.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/crisis/' || [ -n "$CRISIS_HOST_CHANGED" ]; then
  FLOWS+=("crisis-button-reachability")
fi
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/assessment/' && \
  FLOWS+=("q9-single-alert" "phq9-severe-completion" "gad7-severe")
# INFRA-416: features/consent hosts the PRE-consent 988 footer (CombinedLegalGateScreen),
# and LegalGate is in SUPPRESSED_ROUTES so the root overlay does not cover for it.
# deeplink-consent-gate.yaml is the flow that lands on that screen and asserts the
# affordance, so it is the correct scoped target — NOT the fail-safe crisis-button.
# INFRA-510 added reconsent-stale-ineligible: the dir hosts THREE gated screens and the
# ineligible one was mapped by nothing, so an edit to it was gated by flows that never
# render it. Its cohort is minors, on a screen whose route sets gestureEnabled: false and
# headerShown: false with ONE control and no in-screen crisis section — the root overlay is
# its only 988 affordance, and this flow is the only witness to it.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/consent/' && \
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible")
# DEBUG-559: App.tsx and PostHogProvider.tsx are ANCESTORS of every 988 affordance. A
# consent-driven element-type swap there destroyed the whole crisis subtree, and
# SafeAreaProvider (no initialMetrics) renders nothing until its native insets land — so the
# remount was a BLANK screen, not a FAB gap. These are the flows that drive the
# consent-granting surfaces, plus the reachability fail-safe.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE '^app/(App\.tsx|src/core/analytics/PostHogProvider\.tsx)$'; then
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible" "crisis-button-reachability")
  echo "🌳 Crisis-subtree ancestor changed. NECESSARY, NOT SUFFICIENT: the gate build seeds"
  echo "   past onboarding (EXPO_PUBLIC_E2E_SEED_ONBOARDED=true), so NO sim flow reaches the"
  echo "   onboarding privacy-step grant; and Maestro polls the hierarchy, so it can sample"
  echo "   the remount window but never bound it. A zero-frame window is jest's to pin and an"
  echo "   attended Release session's to measure (DEBUG-559)."
fi
# DEBUG-480: features/journal hosts scanOnSave — the app's only crisis scan of text a
# user typed or corrected — plus journal-crisis-banner and journal-crisis-call-988.
# journal-crisis-scan.yaml is the flow that drives that surface, so it is the scoped
# target. Without this clause a journal-only source change falls through to the
# crisis-button fail-safe, which gates the wrong contract.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/journal/' && \
  FLOWS+=("journal-crisis-scan")
# DEBUG-524: onDeviceSpeechGuard.ts admits the capture feeding scanOnSave and builds the
# options driving native audio setup. NECESSARY, NOT SUFFICIENT — journal-crisis-scan finishes
# inside the ~15s abort window, so it cannot witness the native crash; that verdict is
# `npm run e2e:safety:audio-liveness`, which dwells past the deadline and reads the app's pid.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/speech/' && \
  FLOWS+=("journal-crisis-scan")
# DEBUG-524: a patch alters native behaviour on a crisis path and the generated result is never
# reviewed in a diff. No sim flow can bound an arbitrary patched module, so the arm proves the
# surrounding crisis paths still render and the notice points at an attended device session.
echo "$RENDER_BOOT_RELEVANT" | grep -q '^app/patches/' && \
  FLOWS+=("crisis-button-reachability")
# INFRA-482: consentStore.ts is FILE-level, not the whole of src/core/stores/. It owns every
# consent-record write, `canPerformOperation`, the INFRA-377 forging seam, and the loadConsent
# branch order whose own comment says "THE ORDER OF THESE THREE CHECKS IS SAFETY-CRITICAL" —
# testing `revoked` after `version` re-prompts someone who deliberately withdrew (GDPR Art.
# 7(3)). Its only two siblings there (settingsStore, subscriptionStore) carry no safety surface,
# and gating the directory would charge a sim build for a subscription edit — the over-trigger
# that trains the --skip-e2e reflex. `assessmentStore.ts` is already covered via
# features/assessment/. Scoped to the two flows that exercise consent state end-to-end rather
# than the full suite: unlike e2eSeed.ts it does not author the launch state, it classifies a
# record that already exists.
# FEAT-664: loadConsent fires the legal-gate mirror hydration on the boot path; a hung read is jest-only (never-resolve pin).
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/stores/consentStore\.ts' && \
  FLOWS+=("deeplink-consent-gate" "reconsent-stale" "reconsent-stale-ineligible")
# DEBUG-636 (crisis ruling): DeepLinkValidationService's allowlist decides whether an
# external link — being://crisis included — is delivered, and holds the single-code
# invariant isRateLimitedCrisisIntent needs. These are the flows that open a deep link cold
# (crisis, then daily). NECESSARY, NOT SUFFICIENT: the blocked case is a pure-function
# contract no flow observes; deepLinkPathEnforcement.test.ts pins it.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/security/DeepLinkValidationService\.ts' && \
  FLOWS+=("deeplink-consent-gate" "daily-loop-deeplink")
# INFRA-568 (crisis ruling): SupabaseService.ts owns the ONLY writer of `crisis_detected`
# to analytics_events, and trackCrisisDetection runs inside the synchronous frame
# handleCrisisDetection awaits. These four are exactly INFRA-411's own enumeration of the
# flows that reach crisis DETECTION rather than merely the crisis button.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/services/supabase/SupabaseService\.ts'; then
  FLOWS+=("q9-single-alert" "phq9-severe-completion" "gad7-severe" "journal-crisis-scan")
  echo "📊 SupabaseService changed — it owns the crisis audit sink. NECESSARY, NOT SUFFICIENT:"
  echo "   the gate build SUPPRESSES egress (INFRA-411 returns before the insert when"
  echo "   EXPO_PUBLIC_E2E_SEED_ONBOARDED=true), and every flow launches with clearState, so"
  echo "   NO flow can observe delivery, rotation, or any cross-midnight/idle boundary. What"
  echo "   these four DO cover is the one gate-visible failure mode: new synchronous work in"
  echo "   the awaited frame shows up as the intervention failing to surface or a timeout."
  echo "   Delivery is INFRA-412's attended .env.production measurement."
fi
# DEBUG-525: four entries that CONSUME crisisButtonGeometry rather than owning crisis code.
# ThresholdEducationModal is an RN <Modal> DEBUG-406 conversion site — a zero-988-affordance
# render state whose own content tells the reader to seek help. crisis-button-reachability
# already TAPS THROUGH it (lines ~269-300: profile-assessment-info -> threshold-education-
# overlay -> crisis-button-root -> crisis-resources-screen), so this arm costs nothing new.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/components/ThresholdEducationModal\.tsx' && \
  FLOWS+=("crisis-button-reachability")
# DEBUG-547: CleanHomeScreen carries a CRISIS_BUTTON_EXCLUSION_RECT inset. The FAB's
# zIndex:9999 makes any overlap a wrong-DESTINATION tap into CrisisResources — a crisis
# false POSITIVE, not an unreachable affordance. crisis-button-reachability already starts
# on Home and renders both rows, so the arm costs no new flow. File-level, not
# features/home/: the rest of that directory carries no crisis surface.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/home/screens/CleanHomeScreen\.tsx' && \
  FLOWS+=("crisis-button-reachability")
# INFRA-531 (crisis ruling D): DeleteAccountScreen spreads crisisAccessoryProps() onto its
# confirmation TextInput. The keyboard is NECESSARILY up here — the user must type the
# confirmation word — and on iOS the input accessory is then the SOLE 988 affordance
# (DEBUG-431 ruled the occluded state a defect against <3 taps from any screen). Dropping
# that one prop spread is a silent keyboard-up 988 blackout on the surface where someone is
# irreversibly ending their relationship with the app. FILE-level, not features/profile/:
# the dir's other crisis-bearing files each have their own clause, and ProfileStackNavigator
# is already covered by CRISIS_HOST_CHANGED, so a directory clause would buy nothing and
# charge a sim build to every Profile edit. It also carries DEBUG-653's FAB clearance on
# delete-account-button and delete-confirm-input (the DEBUG-547 shape); its falsifier is
# the host's jest sweep.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/DeleteAccountScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "⌨️  DeleteAccountScreen changed — it consumes crisisInputAccessory, and its button"
  echo "   and confirm input carry DEBUG-653's FAB clearance. The flow arm is"
  echo "   NECESSARY BUT NOT SUFFICIENT: crisis-button-reachability reaches this screen and"
  echo "   taps through to CrisisResources, but never types into delete-confirm-input, so it"
  echo "   exercises the UNOCCLUDED overlay and cannot observe the accessory contract."
  echo "   The keyboard-up mechanism is pinned on the sim by crisis-keyboard-reachability"
  echo "   (one runtime site; this screen is covered by construction via CrisisTextInput)."
  echo "   It taps element CENTRES, so the clearance's falsifier is the jest every-y sweep."
fi
# DEBUG-577 (crisis ruling E): ExportDataScreen owns a registered full-screen presenter
# call — Sharing.shareAsync — MEASURED to remove every 988 affordance for as long as the
# share sheet is up (the hierarchy carries zero app-owned nodes, and a matched-pair
# coordinate tap reaches CrisisResources with the sheet down and not with it up). Same
# shape as ExternalErrorReporter, which is already gated, and INFRA-571 established this
# site is STRICTLY MORE REACHABLE: the JSON export path is always on and never flag-gated,
# where the Sentry path is bounded by bug_reporting being off in the public build.
# FILE-level, not features/profile/screens/: the dir's legal/settings/account/backup
# members carry no crisis surface, and those that do are listed individually. It also
# carries DEBUG-653's FAB clearance on export-data-button (the DEBUG-547 shape).
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/ExportDataScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "📤 ExportDataScreen changed — it calls Sharing.shareAsync, a measured zero-988"
  echo "   window. The flow arm is NECESSARY BUT NOT SUFFICIENT: crisis-button-reachability"
  echo "   walks to export-data-screen and taps crisis-button-root there, but NO sim flow in"
  echo "   the gate opens the share sheet, so it proves only that the route still renders the"
  echo "   overlay with the sheet DOWN. The occlusion window itself is verified by DEBUG-577's"
  echo "   measurement and by nothing in the suite. Re-measure with:"
  echo "   maestro test app/.maestro/export-share-sheet-occlusion.yaml (booted 375x667)"
  echo "   export-data-button also carries DEBUG-653's FAB clearance; the flow taps element"
  echo "   CENTRES, so that clearance's falsifier is the jest every-y sweep."
fi
# DEBUG-533: ProfileScreen hosts the second entry to showFeedbackForm(). It gets a real arm
# because crisis-button-reachability already walks the Profile tab and every subscreen
# depth, so it costs nothing and proves the overlay still renders there.
# ExternalErrorReporter is armed by the FEAT-570 block below. Since FEAT-570 the form is
# first-party, so a sim flow can open it; it is no longer a notice. It also carries
# DEBUG-653's FAB clearance on the Onboarding Setup footer link (the DEBUG-547 shape).
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'features/profile/screens/ProfileScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🪟 ProfileScreen changed — it hosts the second entry to showFeedbackForm(). The arm"
  echo "   is NECESSARY BUT NOT SUFFICIENT: the flow proves Profile still renders the root"
  echo "   overlay, but never opens the widget, so it cannot observe the occlusion itself."
  echo "   Its footer link also carries DEBUG-653's FAB clearance; the flow taps element"
  echo "   CENTRES, so that clearance's falsifier is the jest every-y sweep."
fi
# DEBUG-653: PrivacyDataScreen clears the FAB with a CRISIS_BUTTON_EXCLUSION_RECT margin on
# profile-card-delete, its last control at max scroll — the DEBUG-547 shape. The flow already
# walks Privacy & Data to that card, so the arm is free. FILE-level: the dir's other
# crisis-bearing files each have their own clause.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/profile/screens/PrivacyDataScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🛡️  PrivacyDataScreen changed — profile-card-delete carries DEBUG-653's FAB clearance."
  echo "   The arm is NECESSARY BUT NOT SUFFICIENT: Maestro taps element CENTRES, which never"
  echo "   enter the FAB's column, so the falsifier is the jest every-y sweep in"
  echo "   PrivacyDataScreen.accessibility.test.tsx."
fi
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'core/services/logging/ExternalErrorReporter\.ts|core/components/BugReportOverlay\.tsx|core/stores/bugReportStore\.ts'; then
  FLOWS+=("bug-report-crisis-reachability")
  FLOWS+=("bug-report-suppressed-route")
  echo "🪟 The bug-report surface changed. Since FEAT-570 this is a FIRST-PARTY form in"
  echo "   rootOverlaySlot, so a sim flow CAN open it — which is why these are arms and no"
  echo "   longer a notice. ⚠️ Neither flow may submit: the gate build resolves a live"
  echo "   production Sentry DSN and captureFeedback has no egress suppression."
  echo "   NECESSARY BUT NOT SUFFICIENT: the shake entry point is armed at the app root and"
  echo "   is NOT sim-drivable — Maestro 2.6.0 has no shake command. Its verdict is an"
  echo "   attended device session: shake on AssessmentFlow and on LegalGate, capture a"
  echo "   hierarchy dump, and confirm the 988 affordance survives."
fi
# core/hooks/ is gated as a DIRECTORY (3 of 5 files are crisis-critical; see CLAUDE.md).
# journal-crisis-scan is the only keyboard-up flow in the tagged suite and reaches
# useKeyboardFrameHeight through VoiceReflectionScreen, so it is the scoped target. The two
# hooks it CANNOT witness get instructions, not a full suite — same precedent as 988 below.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/hooks/'; then
  FLOWS+=("journal-crisis-scan")
  echo "⌨️  A core/hooks/ file changed — these decide crisis-affordance placement and"
  echo "   visibility. journal-crisis-scan covers the keyboard-up inset path. Two surfaces"
  echo "   it cannot witness, both outside the tagged suite:"
  echo "     npm run e2e:safety:keyboard-reachability (sim — the reachability pin on"
  echo "       useKeyboardOccludesCrisisButton; journal-crisis-scan above pins the same"
  echo "       predicate on the journal surface, INFRA-594). The device flow refuses,"
  echo "       exit 5 — DEBUG-589."
  echo "     npm run e2e:safety:xxxl                 (dynamic-type — DEBUG-507/516's pin"
  echo "       on the journal save inset)"
fi
# The two insights composers are DEBUG-406 conversion sites rendering into the root overlay
# slot. WeeklyReflectionComposer now has a real sim flow (INFRA-532): crisis-button-reachability
# taps through it, reachable because e2eSeed.ts seeds four non-'daily' check-ins past
# WeeklyReflectionCard's MIN_CHECK_INS_TO_SHOW gate. SessionNoteComposer stays notice-only —
# it is flag-dark in the gate build, and an arm that cannot be satisfied is the shape that
# trains --skip-e2e.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/insights/components/' && {
  FLOWS+=("crisis-button-reachability")
  echo "🪟 insights/components changed — WeeklyReflectionComposer is a DEBUG-406 conversion site. The Insights block"
  echo "   of crisis-button-reachability taps through it (occlusion arm + mis-tap arm)."
  echo "   NECESSARY, NOT SUFFICIENT: Maestro taps element CENTRES, which never enter the"
  echo "   crisis button's contested column, so a marginal action-row geometry regression is"
  echo "   invisible to it. CI-side pin: __tests__/safety/modalOcclusionConversions.test.tsx"
  echo "   NOT covered by any runnable flow: the keyboard-up path."
  echo "     crisis-keyboard-accessory does not reach it: DEBUG-574 re-pointed that device"
  echo "     flow to DailyLoop, and the device path cannot run anyway (DEBUG-589)."
}
# FEAT-669: InsightsScreen ends its scroll content in a CRISIS_BUTTON_EXCLUSION_RECT.top spacer
# (the DEBUG-620 shape). The flow already walks the Insights tab, so the arm is free.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/insights/screens/InsightsScreen\.tsx' && {
  FLOWS+=("crisis-button-reachability")
  echo "📐 InsightsScreen changed — its trailing spacer keeps every control clear of the crisis"
  echo "   FAB's band at maximum scroll. NECESSARY, NOT SUFFICIENT: Maestro taps element"
  echo "   CENTRES; the falsifier is the spacer pin in InsightsScreen.accessibility.test.tsx."
}
echo "$RENDER_BOOT_RELEVANT" | grep -q 'insights/components/SessionNoteComposer\.tsx' && {
  echo "🪟 SessionNoteComposer changed — the only site that occluded TWO 988 affordances,"
  echo "   entered by tapping a point on the reader's own PHQ-9/GAD-7 chart. NO sim flow"
  echo "   can reach it: eas.json's e2e-sim profile sets wellness_trend_notes:false, so it"
  echo "   is dark in the gate build. CI-side pin:"
  echo "   __tests__/safety/modalOcclusionConversions.test.tsx"
}
# FEAT-457: features/guidance now HAS a flow, closing the INFRA-416 coverage gap this
# clause used to log. guidanceGate.ts consumes the PHQ-9/GAD-7 thresholds to route a
# distressed reader to Stoic content vs crisis resources; guidance-suppressed-handoff
# drives Home entry → suppressed → notice → CrisisResources → 988 and asserts all four
# tier testIDs ABSENT. It replaces the crisis-button fail-safe, which pinned reachability
# of a different affordance and never exercised this routing at all.
# INFRA-420 adds the POSITIVE branch: guidance-gentle-tier-cap asserts a non-suppressed
# reader receives Tier 0/1 and that Tier 2/3 stay capped. Both arms are needed — the
# sibling alone stays green if the gate suppresses EVERYONE.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/guidance/' && \
  FLOWS+=("guidance-suppressed-handoff" "guidance-gentle-tier-cap")
# DEBUG-465: practices/dailyloop hosts SUPPORT_LINE (a crisis affordance) on a beat
# chosen by showsSupportLine(), pinned OUTSIDE the ScrollView. INFRA-509 narrowed this
# from the full suite: daily-loop-quick-depth IS the DEBUG-465 pin — above-the-fold at
# offset 0, tap-through to CrisisResources, does-not-scroll-away, the exactly-once
# negative, plus the DEBUG-403 resume-overlay occlusion test; daily-loop-deeplink adds
# the cold-start entry. No other tagged flow contains a daily-loop testID, so these two
# ARE the coverage the full suite was providing. Not a file-level split: config/tenseMode.ts
# is eager in CleanRootNavigator's graph (FEAT-376), but both flows launchApp, so a
# module-load break is red here too — and its three exported symbols are consumed only
# inside handleDailyLoopComplete, a DailyLoop-only callback. Route suppression is
# unreachable from here (SUPPRESSED_ROUTES/IMMERSIVE_ROUTES live in RootCrisisButton.tsx;
# the root route name lives in core/navigation) — both already mapped by their own clauses.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/practices/dailyloop' && \
  FLOWS+=("daily-loop-quick-depth" "daily-loop-deeplink")
# DEBUG-546: daily-loop-ax5-entry walks Home -> depth picker -> beat 1 -> Sphere Sovereignty
# -> CrisisResources at AX5 — including DEBUG-469's CRISIS_FAB_CLEARANCE and DEBUG-560's 988
# fold, which centre-tapping default-size flows cannot see. Run in Step 2.5.5, not printed.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/features/practices/dailyloop|src/features/home/screens/CleanHomeScreen\.tsx|src/features/crisis/screens/CrisisResourcesScreen\.tsx|\.maestro/daily-loop-ax5-entry\.yaml' && \
  DYNAMIC_TYPE_FLOWS+=("daily-loop-ax5-entry")
# DEBUG-629: daily-loop-ax5-virtuous carries on to beat 3, which NOTHING covered at an
# accessibility size — daily-loop-quick-depth reaches it only at the default size, and
# ax5-entry stops at Sphere Sovereignty. It also ends with the ✕ tap, the regression test
# for a MEASURED AX5 failure (the header's title cell hit-stole daily-loop-exit, so the
# loop's only exit on beat 1 could not be tapped). Same trigger set as ax5-entry: the
# header is shared by every beat, so a dailyloop change can move either flow.
#
# It does NOT fire on a `.maestro/daily-loop-ax5-entry.yaml`-only diff, and that is
# deliberate: an ax5-entry edit should not charge a second AX5 flow to a close that has
# nothing to do with beat 3. Each dynamic-type flow is armed by its own subject.
#
# FlowProgressIndicator.tsx is deliberately NOT a trigger, though it renders the counter
# whose cap holds the band. Its falsifier is the jest pin on the rendered
# maxFontSizeMultiplier, which runs in CI on every commit — Maestro cannot read a font
# multiplier at all, so an arm here would buy nothing and would charge an AX5 build to
# every unrelated practice's progress-bar edit. It would also be the first clause naming a
# path with no Protected Paths row, and check-safety-paths.sh only walks Step 2.5.1's grep,
# so nothing would have reconciled it.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/features/practices/dailyloop|\.maestro/daily-loop-ax5-virtuous\.yaml' && \
  DYNAMIC_TYPE_FLOWS+=("daily-loop-ax5-virtuous")
# DEBUG-586: the two centred-card overlays in practices/shared/components size their
# paddingBottom from CRISIS_BUTTON_RESERVED_BAND, so an under-reserved band puts their
# controls under a zIndex-9999 FAB — a crisis FALSE POSITIVE, the DEBUG-547 shape. They
# map to DIFFERENT flows, hence two clauses. Both are NECESSARY, NOT SUFFICIENT: no
# Maestro assertion can read a paddingBottom, and the flows tap element CENTRES. The
# falsifier for both is the jest style assertion pinned to the imported constant.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'practices/shared/components/ResumeSessionModal' && \
  FLOWS+=("daily-loop-quick-depth")
# DEBUG-587 (crisis ruling): shared/haptics/ routes BOTH the tactile and the paired-speech
# channels, and BreathingCircle speaks every breath phase through announceForAccessibility.
# Neither imports from features/crisis/, so INFRA-531's rule cannot see them, and practices/
# is exempt outside dailyloop/ — the hand-maintained row is the only control.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'practices/shared/haptics/|practices/shared/components/BreathingCircle\.tsx|practices/shared/useIsFocusedSafe\.tsx?'; then
  FLOWS+=("crisis-button-reachability")
  echo "🔇 A practice cue/breath surface changed — it decides whether practice output can"
  echo "   reach a crisis screen. NOTICE-ONLY by construction: eas.json's e2e-sim profile"
  echo "   sets practice_haptics:false, so schedulerNeeded is false in the gate build and NO"
  echo "   flow can render a cue. The arm proves only that the surrounding crisis paths still"
  echo "   reach CrisisResources. The falsifier is jest at the expo-haptics and"
  echo "   announceForAccessibility boundaries:"
  echo "     __tests__/unit/practices/haptics/crisisBlurGate.test.tsx"
fi
echo "$RENDER_BOOT_RELEVANT" | grep -q 'practices/shared/components/HapticsOptInPrompt' && {
  FLOWS+=("crisis-button-reachability")
  echo "ℹ️  DEBUG-586: HapticsOptInPrompt is FLAG-DARK in the gate build"
  echo "   (eas.json e2e-sim: practice_haptics:false; useHapticsOptIn gates on it)."
  echo "   No sim flow can render it. crisis-button-reachability proves only that the"
  echo "   surrounding crisis paths still reach CrisisResources. The band's oracle is"
  echo "   the jest style assertion in haptic-cues-accessibility.test.tsx."
}
# DEBUG-618/620/622, extended DEBUG-628/631: PracticeTimer, ReflectionTimer, BodyScan,
# GuidedBodyScan and PracticeLibrary clear the FAB with a CRISIS_BUTTON_EXCLUSION_RECT inset —
# the DEBUG-547 shape. PracticeToggleButton carries three of those insets through its style merge.
# PracticeCompletionScreen (DEBUG-678) clears Continue with a primaryButton right margin (DEBUG-682). NECESSARY, NOT SUFFICIENT: crisis-button-reachability renders none of
# them; the falsifier is jest.
if echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/features/learn/practices/(PracticeTimerScreen|ReflectionTimerScreen|BodyScanScreen|GuidedBodyScanScreen|SortingPracticeScreen|PracticeCompletionScreen|shared/PracticeToggleButton)\.tsx|src/features/practices/screens/PracticeLibraryScreen\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "ℹ️  DEBUG-618/620/622/628/631: a practice FAB-clearance surface changed."
  echo "   crisis-button-reachability renders none of these screens — it proves only the FAB mount."
  echo "   The falsifier is the jest geometry pin against intersectsCrisisButtonExclusion."
fi
# DEBUG-695 (crisis ruling): the completion path all five gated practice hosts share. It owns both
# "degrade, never throw" contracts on a timer callback no error boundary covers.
if echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/features/learn/practices/shared/usePracticeCompletion\.tsx'; then
  FLOWS+=("crisis-button-reachability")
  echo "🏁 usePracticeCompletion changed — the completion path shared by five gated practice hosts."
  echo "   NECESSARY, NOT SUFFICIENT: no sim flow completes a practice, so the flow proves only the"
  echo "   FAB mount. The falsifiers are the jest degrade contracts:"
  echo "     __tests__/unit/practices/practiceCompletionDegrade.contract.test.tsx"
  echo "     __tests__/unit/practices/practiceCompletionModuleId.contract.test.tsx"
fi
# INFRA-510: the FAB-clearance collision has no sim-suite owner and must not acquire one.
# Detected by CONTENT, not a path list, so a fifth screen adopting the constant inherits
# the notice instead of silently escaping it. NOTICE ONLY — see the decision table row.
CLEARANCE_TOUCHED=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *CollapsibleCrisisButton.tsx) CLEARANCE_TOUCHED=1 ;;
    *) [ -f "$f" ] && grep -q 'CRISIS_FAB_CLEARANCE' "$f" 2>/dev/null && CLEARANCE_TOUCHED=1 ;;
  esac
done <<< "$RENDER_BOOT_RELEVANT"
if [ -n "$CLEARANCE_TOUCHED" ]; then
  echo "📐 A CRISIS_FAB_CLEARANCE surface changed — the acknowledge/decline control's"
  echo "   corner shares screen space with the crisis FAB's touch band. The tagged suite"
  echo "   runs at 375x667, where the bottom safe-area inset is 0 and the two are disjoint"
  echo "   at EVERY clearance value, so it cannot falsify this. NOT added. Validate on a"
  echo "   booted 393x852 device: npm run e2e:safety:reconsent-ineligible-fab"
fi
# INFRA-184: app.json / Info.plist changes are caught by the precommit jest static-config
# test (lsApplicationQueriesSchemes.config.test.ts); no Maestro flow runs here. The device-
# only crisis-988-dial.yaml is tagged safety-device-only and not part of the sim suite.
#
# Boot/render-critical security service: EncryptionService / SecureStorageService survive
# the RENDER_BOOT_RELEVANT carve-out above (wellness data decrypts at assessment render;
# encryption init gates app boot) → crisis-button boot/render smoke. DeepLinkValidationService
# survives it too but has its own arm above, so this match names the two files. Every OTHER
# core/services/security change (monitoring / metrics / network / protocol) was stripped
# from RENDER_BOOT_RELEVANT and is jest-owned — see the MAINT-237 narrowing note above.
# TRADEOFF (unchanged): if such a change ALSO touches assessment persistence, run
# `npm run e2e:safety` (full suite) manually.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/services/security/(EncryptionService|SecureStorageService)' && \
  FLOWS+=("crisis-button-reachability")
# --- `.maestro/` flow edits + e2eSeed.ts: this gate's OWN contract surface ---
# An edited flow is validated by running that flow. Three cases the obvious mapping
# gets wrong, which is why this is a case statement and not a name transform:
#   • `_`-prefixed files are helper subflows, not flows. Their blast radius is their
#     transitive `runFlow:` caller set, computed below (INFRA-517) — NOT the whole suite.
#   • daily-loop-*.yaml have their own arms (INFRA-509). A scoped npm script is NOT what
#     makes a flow reachable — INFRA-483 made FLOWS hold FLOW NAMES, and e2e-safety.sh
#     accepts a bare basename, rejecting only `_*` and files that do not exist. ONE
#     exception: daily-loop-ax5-entry.yaml (DEBUG-469) is excluded for a DIFFERENT reason —
#     it is safety-dynamic-type, so the suite can neither select nor validly run it — and
#     it gets an instruction arm below, like 988's.
#   • crisis-988-dial.yaml is tagged safety-device-only and CANNOT pass in the sim:
#     canOpenURL returns false unconditionally there regardless of the array's
#     contents. Adding it would make every 988-flow edit an unfixable red gate, so it
#     is deliberately excluded and surfaced as a hardware instruction instead.
# --- INFRA-517: a helper subflow gates its CALLERS, not the whole suite ---
# Measured on the INFRA-494 close: a `_legal-and-onboarding.yaml` diff ran all 12 sim
# flows, and that helper is included by exactly two — both `safety-device-only` — so not
# one of the 12 could observe it. `runFlow:` is a static per-file include, not an ambient
# graph, so a helper's blast radius IS its transitive caller set. FEAT-376's barrel caveat
# does NOT transfer: a barrel enlarges every importer's graph implicitly, an include needs
# a line in the including flow. `crisis` cleared this on three preconditions, each of
# which fails to FULL_SUITE rather than to a narrow scope:
#   • no `app/.maestro/config.yaml` — its onFlowStart/onFlowComplete/flows: hooks reach
#     EVERY flow with no `runFlow:` line anywhere, which voids caller-derivation outright;
#   • the matcher provably still fires (DEBUG-390: a narrowed matcher that silently
#     matches nothing is indistinguishable from a clean answer);
#   • the anchored set reconciles against a loose substring set, so PARTIAL matcher death
#     — 3 callers found where 11 exist — cannot pass as a legitimately narrow scope. That
#     is the fail-safe that matters; a zero-callers floor only catches TOTAL death.
E2E_DIR="app/.maestro"
# Its onFlowStart/onFlowComplete/flows: hooks apply to every flow with no `runFlow:` line,
# so caller-derivation is invalid the moment this file exists. None exists today.
if [ -f "$E2E_DIR/config.yaml" ] || [ -f "$E2E_DIR/config.yml" ]; then
  echo "🛡️  $E2E_DIR/config.yaml exists — workspace hooks reach every flow without a"
  echo "    runFlow: line, so helper caller-scoping is not valid. Gating full suite."
  FULL_SUITE=1
fi
# Both `runFlow:` forms: scalar (`- runFlow: x.yaml`, optional ./, quotes, trailing
# comment) and the block form's `file:` key. Zero block-form `file:` keys exist in the
# suite today — every block-form runFlow uses inline `commands:` — so the `file:` half
# matches nothing YET. It is here because a flow written that way tomorrow is a new shape
# matching no existing pattern, the mechanism behind all six Protected-Path instances.
# Do NOT drop it for looking dead.
mflow_anchor() {
  printf '^[[:space:]]*(-[[:space:]]*runFlow:|file:)[[:space:]]*["'"'"']?(\./)?%s["'"'"']?[[:space:]]*(#.*)?$' \
    "$(printf '%s' "$1" | sed 's/[.[\*^$]/\\&/g')"
}
# DEBUG-390 pin: prove the matcher fires BEFORE it narrows anything. Two positives (the
# live crisis-button-reachability.yaml:69 trailing-comment shape, and the block form) and
# the live negative at reconsent-stale.yaml:60, which a bare substring grep miscounts.
mflow_matcher_ok() {
  local re; re="$(mflow_anchor "_seeded-home.yaml")"
  printf '%s\n' '- runFlow: _seeded-home.yaml # INFRA-217: e2e-sim seeds onboarding; start at home' | grep -qE "$re" || return 1
  printf '%s\n' '    file: _seeded-home.yaml' | grep -qE "$re" || return 1
  printf '%s\n' '# build. Deliberately NOT `runFlow: _seeded-home.yaml` — that helper waits on' | grep -qE "$re" && return 1
  return 0
}
# Unioned over MERGE_BASE and the working tree: head alone drops a flow on the very close
# that DELETES its last `runFlow:` line — the close most likely to have broken something.
mflow_callers() {
  local re; re="$(mflow_anchor "$1")"
  { grep -lE "$re" "$E2E_DIR"/*.yaml 2>/dev/null | sed 's|.*/||'
    [ -n "${MERGE_BASE:-}" ] && git grep -lE "$re" "$MERGE_BASE" -- "$E2E_DIR/*.yaml" 2>/dev/null | sed 's|.*/||'
  } | sort -u
}
# Superset reconciliation. A line naming the helper that is neither an anchored include
# nor inside a comment is residue the matcher could not classify — fail closed on it.
# Deliberately awk-FREE. awk cannot reference a whole record without `$0`, and the harness
# substitutes `$0` with this run's arguments when rendering the file — so an awk form here
# evaluates `INFRA-nnn` as arithmetic, returns 0 for every line, and this fail-safe silently
# never fires. Same trap as the RENDER_BOOT_RELEVANT note above; there it drops files from
# the gated set, here it disables the reconciliation. Both fail toward NOT gating.
mflow_residue() {
  local base="$1" re f n line stripped
  re="$(mflow_anchor "$base")"
  for f in "$E2E_DIR"/*.yaml; do
    [ -e "$f" ] || continue
    n=0
    while IFS= read -r line; do
      n=$((n + 1))
      case "$line" in *"$base"*) ;; *) continue ;; esac
      printf '%s\n' "$line" | grep -qE "$re" && continue
      stripped="${line%%#*}"
      case "$stripped" in *"$base"*) printf '%s:%d\n' "$f" "$n" ;; esac
    done < "$f"
  done
}
# Visited set + bounded depth. crisis-keyboard-accessory includes BOTH helpers today, and
# nothing prevents a helper including a helper. A blown cap prints __DEPTH__ and gates the
# suite; it never terminates silently.
mflow_closure() {
  local frontier="$1" visited="" depth=0 next item cal
  while [ -n "$frontier" ] && [ "$depth" -lt 10 ]; do
    next=""
    for item in $frontier; do
      case " $visited " in *" $item "*) continue ;; esac
      visited="$visited $item"
      for cal in $(mflow_callers "$item"); do
        case " $visited $next " in *" $cal "*) continue ;; esac
        next="$next $cal"
      done
    done
    frontier="$next"; depth=$((depth + 1))
  done
  [ -n "$frontier" ] && { echo "__DEPTH__"; return; }
  printf '%s\n' $visited
}
mflow_tag() { awk '/^tags:/{f=1;next} /^[^ -]/{f=0} f{gsub(/[ -]/,"");print;exit}' "$E2E_DIR/$1" 2>/dev/null; }
# Every flow carrying a NAMED case arm below — i.e. the ones the sim gate cannot run.
# `safety`-tagged flows are deliberately absent: they self-map through the tag check in
# the catch-all, so listing them here would be a second copy of the .maestro directory
# that has to be maintained by hand. That copy is what drifted — two safety flows were
# missing from it and silently cost a full suite each.
# Kept beside the case deliberately: BOTH drift directions stay loud — a name here with
# no arm falls to the catch-all, an arm with no name here is reported by the drift
# printer after the loop.
EXCLUDED_FLOWS="crisis-988-dial reconsent-stale-ineligible-fab-clearance daily-loop-ax5-entry
journal-record-liveness profile-voice-reflection-xxxl breathing-fps-budget
crisis-keyboard-accessory export-share-sheet-occlusion tab-label-dynamic-type-capture
daily-loop-ax5-virtuous"
MAESTRO_CHANGED="$(echo "$RENDER_BOOT_RELEVANT" | grep -E '\.maestro/.*\.yaml$' || true)"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$(basename "$f")" in
    _*.yaml)
      HELPER="$(basename "$f")"
      if ! mflow_matcher_ok; then
        echo "🛡️  $HELPER: the include matcher failed its own self-test — gating full suite."
        echo "    (DEBUG-390: a matcher that stops firing looks exactly like a clean scope.)"
        FULL_SUITE=1
      elif [ -n "$(mflow_residue "$HELPER")" ]; then
        echo "🛡️  $HELPER is named on non-comment lines the matcher did not classify:"
        mflow_residue "$HELPER" | sed 's/^/       /'
        echo "    The caller set cannot be proven complete — gating full suite."
        FULL_SUITE=1
      else
        HELPER_CLOSURE="$(mflow_closure "$HELPER")"
        case "$HELPER_CLOSURE" in
          *__DEPTH__*)
            echo "🛡️  $HELPER: include closure exceeded depth 10 (cycle?) — gating full suite."
            FULL_SUITE=1 ;;
          *)
            HELPER_SIM=""; HELPER_OTHER=""
            for c in $HELPER_CLOSURE; do
              case "$c" in _*) continue ;; esac
              if [ "$(mflow_tag "$c")" = "safety" ]; then HELPER_SIM="$HELPER_SIM ${c%.yaml}"
              else HELPER_OTHER="$HELPER_OTHER $c"; fi
            done
            if [ -z "$HELPER_SIM$HELPER_OTHER" ]; then
              echo "🛡️  $HELPER has no runFlow: caller in either tree — gating full suite."
              echo "    (A renamed or newly-added helper lands here by construction.)"
              FULL_SUITE=1
            else
              for s in $HELPER_SIM; do FLOWS+=("$s"); done
              if [ -n "$HELPER_OTHER" ]; then
                echo "📱 $HELPER is included by callers this gate CANNOT run:"
                for c in $HELPER_OTHER; do printf '      • %s (%s)\n' "$c" "$(mflow_tag "$c")"; done
                echo "   This close does NOT verify them. That is a recorded gap, not a pass."
              fi
              if [ -z "$HELPER_SIM" ]; then
                echo "   No sim flow includes $HELPER, so nothing here can observe this edit."
                case "$HELPER" in
                  _legal-and-onboarding.yaml)
                    echo "   ⚠️  Its Continue tap (INFRA-494) and four consent taps (INFRA-656) clear"
                    echo "       the 988 footer by DERIVATION only — re-read the helper's D0-D5"
                    echo "       before changing any tap, anchor or point:. No Maestro version can"
                    echo "       run its callers (DEBUG-589)." ;;
                esac
                echo "   The Step 2.5.3 net below still runs crisis-button-reachability."
              fi
            fi ;;
        esac
      fi ;;
    crisis-988-dial.yaml)
      echo "📱 crisis-988-dial.yaml changed — safety-device-only. The sim's canOpenURL"
      echo "   returns false unconditionally, so this flow cannot pass here and is NOT"
      echo "   added to the run set. Validate on real hardware before merging:"
      echo "   npm run e2e:safety:988-dial (with an iPhone connected)." ;;
    reconsent-stale-ineligible-fab-clearance.yaml)
      echo "📐 reconsent-stale-ineligible-fab-clearance.yaml changed — safety-bottom-inset."
      echo "   It declares 393x852 and the suite's target is 375x667, where the collision"
      echo "   it adjudicates cannot occur at any clearance value. NOT added, and NOT a"
      echo "   full-suite trigger. Validate it directly on a booted 393x852 device:"
      echo "   npm run e2e:safety:reconsent-ineligible-fab" ;;
    daily-loop-ax5-entry.yaml)
      # DEBUG-546: armed into DYNAMIC_TYPE_FLOWS by its own clause above; kept as an arm so
      # the EXCLUDED_FLOWS drift printer stays quiet and the catch-all never fires.
      echo "🔠 daily-loop-ax5-entry.yaml changed — safety-dynamic-type, so NOT in the tagged"
      echo "   suite. Step 2.5.5 runs it at AX5 through e2e-dynamic-type.sh." ;;
    daily-loop-ax5-virtuous.yaml)
      # DEBUG-629: same carve-out and same reason as ax5-entry above; armed into
      # DYNAMIC_TYPE_FLOWS by its own clause. It is the ONLY flow reaching VirtuousResponse
      # at an accessibility size, and the only one asserting the ✕ actually exits at AX5.
      echo "🔠 daily-loop-ax5-virtuous.yaml changed — safety-dynamic-type, so NOT in the"
      echo "   tagged suite. Step 2.5.5 runs it at AX5 through e2e-dynamic-type.sh." ;;
    journal-record-liveness.yaml)
      echo "🎙️  journal-record-liveness.yaml changed — safety-host-probe. It drives to"
      echo "   phase:'recording' and STOPS; the verdict is the host-side pid sample either"
      echo "   side of a MEASURED dwell, which no Maestro assertion can express. Running"
      echo "   this flow bare proves only that the record tap landed. NOT added to the run"
      echo "   set, and NOT a full-suite trigger. Validate it directly:"
      echo "   npm run e2e:safety:audio-liveness" ;;
    breathing-fps-budget.yaml)
      echo "📐 breathing-fps-budget.yaml changed — perf-device-only, and it CANNOT run:"
      echo "   DEBUG-589 established no Maestro version executes a flow on a physical"
      echo "   iPhone, so e2e-safety.sh refuses it up front (DEVICE_PATH_UNAVAILABLE,"
      echo "   exit 5). NOT added, and NOT a full-suite trigger — a sim run cannot"
      echo "   observe a device frame probe. It is dormant by design until DEBUG-589." ;;
    profile-voice-reflection-xxxl.yaml)
      echo "🔠 profile-voice-reflection-xxxl.yaml changed — safety-dynamic-type, same"
      echo "   carve-out as ax5 above. Note the SIZE differs: this one runs at"
      echo "   extra-extra-extra-large (largest NON-accessibility step) via"
      echo "   E2E_DYNAMIC_TYPE_SIZE, not the wrapper's AX5 default. Validate it directly:"
      echo "   npm run e2e:safety:xxxl" ;;
    tab-label-dynamic-type-capture.yaml)
      echo "🔠 tab-label-dynamic-type-capture.yaml changed — safety-dynamic-type, and a"
      echo "   CAPTURE HARNESS: Maestro asserts presence, not clipping, so running it can"
      echo "   prove nothing. NOT added. Size-agnostic by design — run both endpoints:"
      echo "   npm run e2e:capture:tabbar-ax1 && npm run e2e:capture:tabbar-ax5" ;;
    export-share-sheet-occlusion.yaml)
      echo "📤 export-share-sheet-occlusion.yaml changed — safety-occlusion-measurement."
      echo "   It PINS A DEBT STATE, not a contract: its load-bearing assertion is that the"
      echo "   988 affordance is UNREACHABLE behind the share sheet, so it stays green on the"
      echo "   day the debt is discharged. NOT added to the run set, and NOT a full-suite"
      echo "   trigger — it also leaves an open share sheet, state Maestro does not reliably"
      echo "   clear, which per DEBUG-422 reds LATER flows against a healthy app. Run it alone"
      echo "   on a booted 375x667 device, or delete it if the occlusion is ever remedied." ;;
    crisis-keyboard-accessory.yaml)
      # DEBUG-590 (crisis ruling): the reachability contract MIGRATED to a sim flow, so an
      # edit here runs that flow. The device path itself refuses with exit 5 (DEBUG-589).
      FLOWS+=("crisis-keyboard-reachability")
      echo "⌨️  crisis-keyboard-accessory.yaml changed — safety-device-only, and the device"
      echo "   path is unavailable (DEBUG-589). Running its migrated sim half instead:"
      echo "   crisis-keyboard-reachability. The hardware residual is INFRA-591's." ;;
    # Self-map on the TAG, not the filename — which is what the "not a name transform"
    # caveat above asks for: a FILENAME transform gets helpers, dynamic-type and
    # device-only flows wrong, and the tag is what distinguishes each. It is also what
    # e2e-safety.sh selects on, so this cannot disagree with the runner. One arm per
    # flow could: bug-report-crisis-reachability and bug-report-suppressed-route were
    # `safety`-tagged with no arm and gated the full suite instead of running.
    *)
      if [ "$(mflow_tag "$(basename "$f")")" = "safety" ]; then
        FLOWS+=("$(basename "$f" .yaml)")
      else
        # INFRA-517 / INFRA-428: neither `safety` nor a named arm is a shape nobody has
        # reasoned about — bias safe, but NAME it. Print the tag: dispatch keys on it, so
        # an unexpected tag IS the diagnosis.
        echo "🛡️  unmapped flow $(basename "$f") (tag: $(mflow_tag "$(basename "$f")")) —"
        echo "    neither \`safety\` nor a named arm. Gating full suite."
        echo "    Give it an arm (and add it to EXCLUDED_FLOWS) to scope it properly."
        FULL_SUITE=1
      fi ;;
  esac
done <<< "$MAESTRO_CHANGED"
# INFRA-517 drift printer. Runs whenever the loop ran at all, not only on a catch-all hit:
# an arm set that only reports drift for files someone happens to edit is not a check.
if [ -n "$MAESTRO_CHANGED" ]; then
  # Collapse the newlines out of EXCLUDED_FLOWS first: the membership test is
  # space-delimited, so a name sitting at a line break would never match itself.
  MAPPED_NORM=" $(echo $EXCLUDED_FLOWS) "
  for ff in "$E2E_DIR"/[!_]*.yaml; do
    [ -e "$ff" ] || continue
    nn="$(basename "$ff" .yaml)"
    # A `safety` flow needs no arm — it self-maps on its tag. Only a flow that is
    # neither `safety` nor named is unreasoned-about, and only that is drift now.
    [ "$(mflow_tag "$nn.yaml")" = "safety" ] && continue
    case "$MAPPED_NORM" in *" $nn "*) ;; *)
      echo "⚠️  arm-set drift: $nn.yaml carries tag \`$(mflow_tag "$nn.yaml")\` with no case arm (falls to full suite)." ;;
    esac
  done
  for nn in $EXCLUDED_FLOWS; do
    [ -e "$E2E_DIR/$nn.yaml" ] || echo "⚠️  arm-set drift: case arm \`$nn\` names no file in $E2E_DIR."
    # An excluded flow that becomes plain `safety` would now self-map, and its named arm
    # would shadow that silently — the arm wins, because a case matches in order.
    [ -e "$E2E_DIR/$nn.yaml" ] && [ "$(mflow_tag "$nn.yaml")" = "safety" ] && \
      echo "⚠️  arm-set drift: \`$nn\` is tagged \`safety\` but still has an exclusion arm shadowing it."
  done
fi
# e2eSeed sets the launch state EVERY flow starts from, so no narrower scope is valid.
echo "$RENDER_BOOT_RELEVANT" | grep -q 'src/core/config/e2eSeed\.ts' && FULL_SUITE=1

# core/navigation (incl. CleanRootNavigator) is genuinely cross-cutting UI/nav — a
# tab/stack re-point can break ANY flow's reachability. Keep the full suite, LAST so
# this replace-override wins over the += clauses above when combined.
echo "$RENDER_BOOT_RELEVANT" | grep -qE 'src/core/navigation/|CleanRootNavigator' && \
  FULL_SUITE=1  # full suite — cross-cutting change, override scope
# FULL_SUITE wins over every += above. Step 2.5.5 ignores FLOWS when it is set and runs
# `e2e-safety.sh` with NO arguments, which is how the tagged suite is selected.
[ -n "$FULL_SUITE" ] && FLOWS=()

# Safety net / clean-skip split: if nothing mapped, decide WHY via RENDER_BOOT_RELEVANT.
#  • render/boot-relevant change we failed to map → fail SAFE to crisis-button (never
#    enter the gate on a render/boot change and run zero flows).
#  • ONLY service-layer carve-outs changed → deliberate, LOGGED skip (no silent cap):
#    jest owns the surface; no sim build needed (this is the MAINT-237 narrowing payoff).
if [ ${#FLOWS[@]} -eq 0 ] && [ -z "$FULL_SUITE" ] && [ ${#DYNAMIC_TYPE_FLOWS[@]} -eq 0 ]; then
  if [ -n "$RENDER_BOOT_RELEVANT" ]; then
    # NAME the substitution, for the INFRA-517 reason one screen up: a silent cap reads
    # exactly like a deliberate scope. This arm is the fail-safe for a render/boot path
    # that reached Step 2.5.1's grep but matched no Step 2.5.3 clause — the shape a newly
    # added Protected Path takes before anyone writes it an arm. check-safety-paths.sh
    # cannot catch it: it reconciles the 2.5.1 grep and b-batch's copy, never the arm set,
    # and the drift printer above is flow-side (it only runs when .maestro files changed).
    # Unannounced, the operator sees an ordinary scoped run and the generic flow reads as
    # the mapped one.
    echo "🛡️  No Step 2.5.3 clause matched a render/boot-relevant change — falling back to"
    echo "    crisis-button-reachability. This is the fail-safe, NOT a scope: it proves 988"
    echo "    reachability only, and pins nothing specific to what changed:"
    echo "$RENDER_BOOT_RELEVANT" | sed 's/^/      /'
    echo "    Give these paths a Step 2.5.3 arm to scope them properly."
    FLOWS=("crisis-button-reachability")
  else
    echo "ℹ️  Safety-surface change is SERVICE-LAYER ONLY (MAINT-237 narrowing) — no sim flow:"
    echo "$SAFETY_CHANGED" | sed 's/^/      /'
    echo "    The sim flows only validate render/boot/nav; this change touches none. jest"
    echo "    crisis/clinical/security/encryption suites + CollapsibleCrisisButton render"
    echo "    tests (precommit + CI) own it. Proceeding to close with no sim build."
  fi
fi

# Dedupe (only when non-empty — a clean service-layer skip leaves FLOWS intentionally empty)
[ ${#FLOWS[@]} -gt 0 ] && FLOWS=($(printf "%s\n" "${FLOWS[@]}" | sort -u))
```

---

*Step 2.5.3a lives in `b-close.md`. Return here for Step 2.5.4 only if it kept the session attached.*

---

### Step 2.5.4: Verify simulator readiness

**The sync happened in Step 2.5.0.** Two consequences land here: it gets you INFRA-383's
fast build, since `e2e-sim-build.sh` is app code that arrives with the back-merge; and
`git merge` does not fire the pre-commit hook, so run `npm run precommit` against the
merged tree before spending a build on it.

If `development` advances again WHILE you gate, re-classify rather than re-gate
reflexively: re-run the flows only when the newly merged work touches a Step 2.5.1
safety path. Unrelated churn does not invalidate a passing gate, and re-gating on
every dev merge does not terminate on a busy day.

**That re-check has two shortcuts, and both fail toward NOT gating.** Diff
`$(git merge-base origin/development HEAD)..origin/development`, never
`HEAD origin/development` — the latter is symmetric and lists your own files as
incoming. And match with Step 2.5.1's grep verbatim; an abbreviated copy silently
drops entries and reports a clean incoming set.

**SECOND — is this worktree's build script the new one?** `.claude/` is shared across every
worktree (it lives on `_bare`), but `app/scripts/e2e-sim-build.sh` is **app code**, so it
arrives only when INFRA-383 is on *this branch*. Until a branch back-merges `development`,
the guidance below describes a build that worktree cannot produce. Detect it rather than
letting the operator discover it 12 minutes in:

```bash
# INFRA-483: FULL_SUITE means "run the tagged suite with no arguments", so an empty
# FLOWS[] does NOT mean "no flows" — check both or a cross-cutting change skips the
# readiness guards entirely and enters the gate with no simulator.
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ] || [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
  if ! grep -q 'INFRA-383' app/scripts/e2e-sim-build.sh 2>/dev/null; then
    echo "⚠️  This worktree still has the LEGACY EAS gate build (pre-INFRA-383)."
    echo "    'npm run e2e:safety:build' here = eas build --local: 10-15 min EVERY run,"
    echo "    and it additionally requires eas-cli logged in + fastlane + a clean tree."
    echo ""
    echo "    To get the 1-4 min incremental Release build, back-merge development first:"
    echo "      git merge origin/development"
    echo "    Then re-read app/scripts/e2e-sim-build.sh's header before building."
    echo ""
    echo "    If app/ios/Podfile.lock checksums shift in that merge, do the pod-deintegrate"
    echo "    sequence in CLAUDE.md 'Known Gotchas' or the sim build will fail with"
    echo "    [runtime not ready]: ReferenceError: Property 'MessageQueue' doesn't exist."
    echo ""
    echo "    Proceeding on the legacy path is FINE — it produces a valid gate target."
    echo "    This is a heads-up about time and prereqs, not a blocker."
  fi
fi
```

Not a hard stop, deliberately. The legacy EAS build still produces a correct, launcher-free
Release artifact — it is only slow and has more prereqs. Blocking a close over it would
convert a papercut into an outage. Delete this guard once every active branch carries
INFRA-383.


The gate requires a **Release** build on the sim, NOT `npm run ios` (Debug).
`npm run e2e:safety:build` produces and installs it — since INFRA-383 that is
`expo run:ios --configuration Release`: 1–4 min warm, but 11–14 min whenever the
native project regenerates (INFRA-508). Skipping it is still not justified; budget
for the regenerating tier rather than the warm one.

**Prefer `npm run e2e:safety:gate` (INFRA-436), and mind the ordering.** A plain
`e2e:safety:build` in *this* worktree pays a **cold** build — measured **21m31s**, not the
~14 min previously documented — because Xcode keys DerivedData by workspace path and
`/b-work` gives every item a fresh worktree. `e2e:safety:gate` builds the same artifact in
one shared, warm gate worktree (~90 s) and then verifies, from *this* worktree, that the
installed binary corresponds to *this* tree. Evidence semantics are unchanged: the
provenance marker is content-addressed, so the artifact is bound to the commit, not to the
directory it was built in.

The ordering is not optional and follows directly from the paragraph above:

```
git merge origin/development     # 1. back-merge HERE, in the item's worktree
npm run precommit                # 2. `git merge` does not fire the pre-commit hook
npm run e2e:safety:gate          # 3. gate worktree detaches at the RESULTING commit
```

**INFRA-483 — run step 3 from here and ROUTE ON ITS EXIT CODE.** This used to be prose
plus the example block above, so `e2e:safety:gate` was never actually invoked by this step
and INFRA-472's lease-contention exit code reached no decision point at all. Exit **4** is
the one that matters: it means a peer session holds the gate slot, which says nothing about
this item. Reporting it as a gate failure would park a healthy branch and, repeated, is
exactly the pressure that produces `--skip-e2e`.

```bash
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ] || [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
  npm run e2e:safety:gate
  GATE_RC=$?
  case "$GATE_RC" in
    0) : ;;   # artifact built and provenance-bound to this tree — continue to 2.5.5
    4) # INFRA-472: the pair lease (gate worktree + simulator) is held elsewhere. The
       # wrapper has already named the holding pid on stderr — surface it, do not
       # re-derive it, and NEVER identify the holder with pgrep -f (DEBUG-392).
       echo "⏸️  Gate slot busy (exit 4) — a peer session holds the gate worktree +"
       echo "    simulator lease. This is CONTENTION, not a regression and not a gate"
       echo "    failure: nothing has been learned about this branch either way."
       echo "    Wait for the holder named above and re-run /b-close. Do NOT --skip-e2e,"
       echo "    and do NOT record this as a red gate."
       exit 1 ;;
    *) echo "❌ e2e:safety:gate failed (exit $GATE_RC) — the gate artifact could not be"
       echo "   produced or does not correspond to this tree. Fix before closing."
       exit 1 ;;
  esac
fi
```

A caller that parks or tiers on close failures — `/b-batch` Phase 3.4 is the one in
tree — must read exit 4 as "retry later", never as a CI-red or a safety regression.

**Exit 0 here does not reserve the simulator for 2.5.5.** The lease spans the build only
(`e2e-gate.sh`), so a peer parked in `e2e_lock_acquire` takes the device the instant the
build releases and installs over the attested binary — 2.5.5 then refuses on provenance
`MISMATCH`. That refusal is correct; retry both steps when the machine is quiet. Holding
the pair in an outer shell does NOT work around it: `e2e-gate.sh` assigns rather than
appends to `E2E_LOCK_INHERITED`, so the build deadlocks on its own ancestor's lease.

Pointing the gate at a bare branch tip gates a tree that will never merge — the same
mistake this step's "sync FIRST" rule exists to prevent, just relocated. The wrapper
refuses a dirty worktree up front and names the offending files, and on any provenance
mismatch `e2e-provenance.js explain` now names the files responsible rather than emitting a
bare `MISMATCH` (INFRA-436).

**Corrected (INFRA-383).** This paragraph used to say a plain
`--configuration Release` build also ships the dev launcher and that only the EAS
`e2e-sim` profile removes it. That was false — Expo autolinking marks
`expo-dev-launcher` `debugOnly: true`, so no Release build links it, and EAS's
`developmentClient:false` only *defaults* `buildConfiguration`, which `e2e-sim`
already set to Release explicitly. Do not reinstate the claim.

**Provenance (INFRA-384) — this step no longer merely *guides*.** It used to say outright
that the `listapps` check "can't tell which build is installed, so this is guidance, not
enforcement", which meant a green gate proved only that *some* Being build was installed.
`e2e-sim-build.sh` now writes a marker inside the installed container binding it to the
tree it was built from, and `e2e-safety.sh` refuses every flow when that marker is absent
or stale — so the check below is a real gate on artifact LINEAGE, alongside INFRA-383's
existing asserts on artifact SHAPE.

The verify is **capability-gated** on the helper existing, mirroring the INFRA-383 grep
guard above and for the same reason: `.claude/` is shared by every worktree the instant it
is committed, but `app/scripts/` is app code that only arrives on branches that have
back-merged `development`. Without the guard, every open feature branch's close breaks.

```bash
# Only require a simulator when there are flows to run. A service-layer-only safety
# change (Step 2.5.3) resolves to zero flows and closes with no sim build at all.
if [ ${#FLOWS[@]} -gt 0 ] || [ -n "$FULL_SUITE" ] || [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
  if ! xcrun simctl list devices booted | grep -qE '\([A-F0-9-]+\) \(Booted\)'; then
    echo "❌ No iOS simulator booted."
    echo "   Run 'npm run e2e:safety:build' first (Release build, INFRA-383) to build +"
    echo "   install Being on a sim, then retry /b-close. Do NOT use 'npm run ios' (Debug → dev launcher → gate refuses)."
    exit 1
  fi
  # Bundle id is fyi.being.app (MAINT-161). It is NOT com.being.app — that target
  # was claimed by a third party and retired, and this guard used to grep for it,
  # so it failed closed on any machine without a stale pre-MAINT-161 build lying
  # around, and passed by accident on machines that had one. Keep this string in
  # sync with `appId:` in app/.maestro/*.yaml — they must name the same app or the
  # guard greenlights a suite that cannot launch anything.
  if ! xcrun simctl listapps booted 2>/dev/null | grep -q fyi.being.app; then
    echo "❌ fyi.being.app not installed on booted sim."
    echo "   Run 'npm run e2e:safety:build' first (Release build, INFRA-383), then retry /b-close."
    exit 1
  fi

  # INFRA-384 — is the installed binary actually built from THIS tree?
  # Capability-gated: branches that predate INFRA-384 have no helper and keep the old
  # behaviour rather than failing to close.
  # Resolve from the repo toplevel, NOT relative to $PWD: if the shell is already inside
  # app/ the relative form silently misses the helper, prints "predates INFRA-384", and
  # skips enforcement — a capability guard that fails OPEN.
  WT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo .)"
  if [ -f "$WT_ROOT/app/scripts/e2e-provenance.js" ]; then
    APP_CONTAINER="$(xcrun simctl get_app_container booted fyi.being.app 2>/dev/null || true)"
    VERDICT="$( cd "$WT_ROOT/app" && node scripts/e2e-provenance.js verify "$APP_CONTAINER" 2>/dev/null )" || true
    case "$VERDICT" in
      MATCH_CLEAN)
        echo "✓ provenance: gate target built from this exact tree, clean"
        ;;
      MATCH_DIRTY)
        # What merges is the COMMIT, so the binary must correspond to one. This is the
        # enforcement this step previously admitted it could not do.
        echo "❌ The gate target was built from a DIRTY tree — not merge evidence."
        echo "   Commit your changes and rebuild: npm run e2e:safety:build"
        exit 1
        ;;
      *)
        echo "❌ provenance ${VERDICT:-<no verdict>} — the installed binary was not built"
        echo "   from the current tree (or carries no marker). Rebuild: npm run e2e:safety:build"
        exit 1
        ;;
    esac
  else
    echo "ℹ️  This branch predates INFRA-384 — no provenance helper, so the installed"
    echo "    binary's lineage is unverified. Back-merge development, or rebuild before"
    echo "    trusting the gate."
  fi
fi
```

Do NOT auto-boot or auto-build — these are multi-minute detours mid-close. Defer
to the user.

### Step 2.5.5: Run the scoped flows

```bash
cd /Users/max/dev/being/[worktree-dir]/app
if [ ${#FLOWS[@]} -eq 0 ] && [ -z "$FULL_SUITE" ]; then
  [ ${#DYNAMIC_TYPE_FLOWS[@]} -eq 0 ] && \
    echo "✅ No sim flows required (service-layer-only safety change, Step 2.5.3) — proceeding to close."
else
  # INFRA-384 — a merge gate's evidence must correspond to the commit being merged, so
  # a dirty-tree marker is a FAILURE here even though it is only a banner for a human
  # iterating locally. AC3 and AC4 are opposite policies over one implementation; this
  # variable is the whole difference. Set here as well as checked in 2.5.4 because
  # e2e-safety.sh re-verifies at run time — the tree can move between the readiness
  # check and the flow.
  export E2E_REQUIRE_CLEAN_PROVENANCE=1

  # INFRA-510 — name the receipt so the certification verdict below reads THIS run's file.
  # The default is timestamped and PID-suffixed, so a reader would have to glob for it and
  # would race every peer gate on the machine. NEVER under the worktree: the provenance
  # fingerprint hashes untracked file contents repo-wide, so a receipt written there reads
  # as MISMATCH on the next verify and costs a rebuild.
  export E2E_RECEIPT_PATH="${TMPDIR:-/tmp}/being-close-receipt-$$.txt"

  # INFRA-483 — ONE invocation for the whole scoped set. This used to loop `npm run` per
  # flow; the simulator lease is acquired and released per PROCESS (e2e-safety.sh:266-267),
  # so N flows meant N-1 windows in which a peer's gate build could install over the target
  # and fail the next flow's pre-flight, discarding the flows that had already passed.
  # It also restores INFRA-434's mid-suite substitution watch, which re-reads the provenance
  # marker's bytes between flows WITHIN one invocation — one flow per process made every
  # flow a one-flow "suite" and left it nothing to watch.
  if [ -n "$FULL_SUITE" ]; then
    echo "🛡️  Running the full safety suite (cross-cutting change)"
    bash scripts/e2e-safety.sh
  else
    echo "🛡️  Running ${#FLOWS[@]} scoped flow(s): ${FLOWS[*]}"
    bash scripts/e2e-safety.sh "${FLOWS[@]}"
  fi
  E2E_RC=$?

  # Exit alphabet is e2e-safety.sh's, not this file's. Do not collapse these arms: 2 and 3
  # are NOT regressions, and reporting them as one trains a reflex to re-run or bypass.
  case "$E2E_RC" in
    0) echo "✅ All scoped Maestro safety flows passed" ;;
    1) echo "❌ A Maestro safety flow FAILED — this is a regression."
       echo "   Fix it, or — on a hotfix/* branch only — re-run with --skip-e2e."
       echo "   If it reproduces intermittently, attribute before fixing: re-run the SAME"
       echo "   binary for a rate, then the same flow on an origin/development control."
       echo "   A tree yielding both a high and a zero rate is not the variable; record the"
       echo "   rate and the untested window rather than reading a later green as proof."
       echo "   Debug a single flow with: maestro test .maestro/<flow>.yaml --debug"
       exit 1 ;;
    2) echo "❌ The gate harness could not complete (exit 2) — NOT a flow regression."
       echo "   No verdict was produced, so this is neither a pass nor a failure."
       echo "   READ THE MESSAGE before re-running: since DEBUG-505 this code also carries"
       echo "   invocation errors and pre-flight refusals, most of which are self-clearing"
       echo "   (an unbuilt target needs one build; a stale marker needs a rebuild). Only a"
       echo "   wedged simulator or an unresponsive machine needs diagnosis first."
       exit 1 ;;
    3) echo "❌ The gate TARGET WAS REPLACED mid-suite (exit 3, INFRA-434) — NOT a regression."
       echo "   A peer replaced the installed app, so completed flows are VOID, not PASS."
       echo "   Re-run the whole scoped set once the other session is done."
       exit 1 ;;
    *) echo "❌ e2e-safety.sh exited $E2E_RC — unrecognised. Treat as no verdict."
       exit 1 ;;
  esac

  # --- The SECOND axis of the same run (INFRA-493 AC 7, scoped by INFRA-510) -----------
  # Exit 0 above means every requested flow was GREEN. It does not mean the run is merge
  # evidence: a flow declaring 375x667 that ran on 402x874 reports UNCERTIFIED and still
  # exits 0, because the exit alphabet is frozen at 0/1/2/3 and expressing this as a new
  # status is the category error INFRA-478's AC 2(a) forbade. The verdict is in the receipt.
  #
  # SCOPED TO THE FLOWS THIS CLOSE REQUESTED, never the run-level `certification:` line.
  # The suite carries more than one certifying target and `e2e_resolve_sim_device` pins ONE
  # device, so no device yields a run-level CERTIFIED over everything; refusing on that line
  # would refuse every FULL_SUITE close, and the documented response to an unsatisfiable
  # gate is `--skip-e2e` habit. FULL_SUITE requests everything, so it passes no names and
  # the predicate intersects against the whole set.
  #
  # Resolved from the REPO ROOT, never $PWD: this block runs with the shell already inside
  # `app/`, and a capability guard written relative to $PWD fails OPEN there.
  CERT_HELPER="$(git rev-parse --show-toplevel)/app/scripts/b-close-verdict.sh"
  if [ ! -r "$CERT_HELPER" ]; then
    echo "ℹ️  This branch predates INFRA-510 — no certification verdict to read."
  else
    # shellcheck source=/dev/null
    . "$CERT_HELPER"
    if [ -n "$FULL_SUITE" ]; then
      CERT_WORD="$(b_close_certification_verdict "$E2E_RECEIPT_PATH")"
      CERT_FLOWS="$(b_close_uncertified_intersection "$E2E_RECEIPT_PATH")"
    else
      CERT_WORD="$(b_close_certification_verdict "$E2E_RECEIPT_PATH" "${FLOWS[@]}")"
      CERT_FLOWS="$(b_close_uncertified_intersection "$E2E_RECEIPT_PATH" "${FLOWS[@]}")"
    fi
    CERT_VERDICT="$(b_close_stage_verdict certification "$CERT_WORD")"
    CERT_RAN="$(sed -n 's/^device_viewport:[[:space:]]*//p' "$E2E_RECEIPT_PATH" 2>/dev/null | head -1)"
    CERT_UDID="$(sed -n 's/^device_udid:[[:space:]]*//p' "$E2E_RECEIPT_PATH" 2>/dev/null | head -1)"
    if b_close_mergeable "$CERT_VERDICT"; then
      echo "✅ Certification: every requested flow certified its declared viewport (ran ${CERT_RAN:-?})"
    else
      echo "❌ $CERT_VERDICT — this run is green but does NOT certify what it ran."
      case "$CERT_VERDICT" in
        UNCERTIFIED_FLOW)
          echo "   Did not certify on ${CERT_RAN:-an underivable viewport}: $CERT_FLOWS"
          echo "   Each flow's declared target is in the receipt's results: lines."
          echo "   Boot the declared device (a viewport is not bootable; a model is), then"
          echo "   shut this one down — the gate refuses at 2+ booted:"
          echo "     xcrun simctl shutdown ${CERT_UDID:-<current-udid>}"
          echo "     xcrun simctl boot 'iPhone SE (3rd generation)'   # 375x667" ;;
        CERT_VOID)
          echo "   The gate target moved mid-suite (INFRA-434), so no flow is vouched for." ;;
        CERT_NO_RECEIPT)
          echo "   No receipt at $E2E_RECEIPT_PATH. Absence of evidence is a refusal here." ;;
        *)
          echo "   Unrecognised certification token '$CERT_WORD' — treat as no verdict." ;;
      esac
      echo "   Do NOT add a bypass flag; --skip-e2e stays hotfix-only."
      echo "   Receipt: $E2E_RECEIPT_PATH"
      exit 1
    fi
  fi
fi

# DEBUG-546 — the safety-dynamic-type flows Step 2.5.3 armed, AFTER the suite so the suite
# keeps running at the default size. Its own invocation: the wrapper sets the content size,
# runs e2e-safety.sh on the named flows, and restores the size in a trap. Same exit alphabet.
if [ ${#DYNAMIC_TYPE_FLOWS[@]} -gt 0 ]; then
  export E2E_REQUIRE_CLEAN_PROVENANCE=1
  export E2E_RECEIPT_PATH="${TMPDIR:-/tmp}/being-close-receipt-dt-$$.txt"
  echo "🔠 Running ${#DYNAMIC_TYPE_FLOWS[@]} dynamic-type flow(s) at AX5: ${DYNAMIC_TYPE_FLOWS[*]}"
  bash scripts/e2e-dynamic-type.sh "${DYNAMIC_TYPE_FLOWS[@]}"
  DT_RC=$?
  case "$DT_RC" in
    0) echo "✅ Dynamic-type flows passed" ;;
    1) echo "❌ A dynamic-type flow FAILED. Its breath step taps Skip inside a 30s app timer:"
       echo "   check the receipt's host load before reading the red as the app, re-run once"
       echo "   on a quiet machine if it was contended, and never reach for --skip-e2e."
       echo "   Receipt: $E2E_RECEIPT_PATH"
       exit 1 ;;
    2|3|4) echo "❌ e2e-dynamic-type.sh exited $DT_RC — no verdict (2 harness, 3 target replaced,"
       echo "   4 peer holds the slot). Read it exactly as the suite arms above."
       exit 1 ;;
    *) echo "❌ e2e-dynamic-type.sh exited $DT_RC — unrecognised. Treat as no verdict."
       exit 1 ;;
  esac
  CERT_HELPER="$(git rev-parse --show-toplevel)/app/scripts/b-close-verdict.sh"
  if [ -r "$CERT_HELPER" ]; then
    # shellcheck source=/dev/null
    . "$CERT_HELPER"
    DT_CERT="$(b_close_stage_verdict certification \
      "$(b_close_certification_verdict "$E2E_RECEIPT_PATH" "${DYNAMIC_TYPE_FLOWS[@]}")")"
    b_close_mergeable "$DT_CERT" || {
      echo "❌ $DT_CERT for ${DYNAMIC_TYPE_FLOWS[*]} — green but not certified; the"
      echo "   certification arms above say what to boot. Receipt: $E2E_RECEIPT_PATH"
      exit 1
    }
  fi
fi
```

Proceed to Step 3.1 only on success.

**Use the wait.** The build (~7 min post-regen, 21 min cold) and the flow run are dead
time on the critical path, and everything downstream is already knowable: draft Step 3.3's
PR body and Step 4.2's Notion comment while they run, so both paste straight in when the
gate goes green. Draft in the scratchpad, never the worktree — an untracked file there
reads as MISMATCH on the next provenance verify and costs a rebuild (`e2e-gotchas.md`).

**`development` can advance while the gate runs.** After Phase 2.5 completes, re-check
`git rev-list --count HEAD..origin/development`. If the new commits leave your NET diff
free of runtime code, proceed and record that reasoning — re-gating would validate their
changes, not yours. If your net diff still carries runtime code, re-merge and re-gate.

**While `development` is moving, run CI and the gate on the same commit.** Push and open
the PR as a draft when the gate launches; mark it ready and merge only when both are green
on that commit.
