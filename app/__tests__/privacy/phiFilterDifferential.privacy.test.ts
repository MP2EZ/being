/**
 * PHIFilter differential contract (INFRA-535).
 *
 * Pins ONE relation between the live filter and the frozen `d14d6178` baseline:
 *
 *     validateV1(p) rejects  ⟹  PHIFilter.validate(p) rejects
 *
 * It is deliberately ONE-SIDED. The converse is NOT asserted, because INFRA-535
 * legitimately makes the filter reject payloads the baseline accepted — property
 * KEYS are now scanned, `containsPHI` now runs per property, and arrays are now
 * traversed (the baseline's step 4 excludes them, so `{tags:['grief']}` passed
 * intact). Asserting equivalence would forbid exactly the tightening this item
 * exists to deliver.
 *
 * Compliance framing: the filter may become NARROWER, never LOOSER. This suite is
 * the mechanical form of that ruling. A future change that lets any
 * baseline-rejected payload through fails here.
 *
 * DEBUG-390 discipline: a differential harness whose corpus contains no rejections
 * is vacuously green and stays green forever. Three guards below — corpus size,
 * a pinned minimum rejection count, and a live matcher check — exist so this suite
 * can still go red.
 *
 * ===========================================================================
 * AMENDING THE WHITELIST — the procedure (INFRA-558)
 * ===========================================================================
 *
 * WHAT THIS SUITE CAN AND CANNOT DETECT. Read this before relying on it.
 * The relation above is one-sided over a HAND-AUTHORED corpus, so it catches a
 * LOOSENING of the filter's scanning behaviour against payloads the corpus
 * happens to contain. It does NOT, on its own, notice a new event type being
 * added to the live whitelist: nothing in the corpus mentions that name, so
 * every assertion stays true and the suite stays green. The `WIDENED` ledger
 * below is what closes that gap, and it is the ONLY thing that does.
 *
 * The harness verifies that a widening was DECLARED. It cannot verify that a
 * widening was WARRANTED — no test can. Do not read a green run as review.
 *
 * THE FROZEN BASELINE IS NEVER AMENDED. `phiFilterBaselineV1.ts` is a fixed
 * reference to `d14d6178`; editing it to track live makes the suite compare the
 * implementation to itself. `BASELINE_SAFE_EVENT_TYPES.size` is an anti-tamper
 * pin on that file, not a count of the live whitelist — never bump it. What
 * gets amended is the DELTA, recorded here.
 *
 * TO ADD AN EVENT TYPE, in ONE pull request:
 *   1. Add the string to `SAFE_EVENT_TYPES` and the constant to
 *      `AnalyticsEvents` (both in `PHIFilter.ts`) — a name in one but not the
 *      other cannot transmit and fails silently.
 *   2. Add a `WIDENED` entry below naming the event, the work item, and why.
 *      Omit it and the enforcement test red-lines; that is the control.
 *   3. Add a per-event boundary suite in the FEAT-457 shape — see
 *      `guidanceAnalyticsBoundary.contract.test.ts`: whitelist/constant parity,
 *      the exact emitted payload, and an explicit non-vacuity case.
 *   4. Refresh the enumerated event list in
 *      `docs/architecture/analytics-architecture.md`.
 *   5. Get a `compliance` pass. On a solo-founder repo "approval" cannot mean a
 *      human gate that does not exist, so the durable artifact is the ledger
 *      entry plus the boundary suite — a review with no checkable output is
 *      indistinguishable afterwards from a review that never happened.
 *
 * DO NOT add a benign CORPUS case for a newly-whitelisted event type. It turns
 * this suite RED by construction: `validateV1` rejects the unknown name, live
 * accepts it, and the one-sided relation fires. The ledger is the exempted
 * channel for exactly that reason.
 *
 * KNOWN, UNRATIFIED: the corpus names four event types that are NOT in the
 * baseline whitelist — `voice_journal_started`, `journal_entry_saved`,
 * `reflection_transcribed`, `totally_new_event`. Whitelisting any of them WOULD
 * red-line the relation, so the corpus is a de-facto permanent negative list for
 * those four names. That is an unrecorded side effect, not a designed control.
 * A future item wanting to ship journal analytics must ratify or retire it
 * deliberately rather than discovering it as a mysterious red.
 */

import { PHIFilter } from '@/core/analytics/PHIFilter';
import { containsPHI } from '@/core/analytics/phiDetection';
import {
  validateV1,
  BASELINE_PHI_KEYWORDS,
  BASELINE_SAFE_EVENT_TYPES,
} from '../helpers/phiFilterBaselineV1';

import * as fs from 'fs';
import * as path from 'path';

interface Case {
  readonly label: string;
  readonly eventType: string;
  readonly data: Record<string, unknown>;
}

/**
 * The differential corpus.
 *
 * Grouped by what each group proves. `expectV1Reject` is not asserted directly —
 * it documents intent and feeds the pinned-count guard, so that a future edit that
 * accidentally neuters the corpus (e.g. renaming a keyword out of existence) is
 * caught by the count rather than passing silently.
 */
const CORPUS: ReadonlyArray<Case> = [
  // ---- Benign: must pass BOTH filters. These are the payloads real trackers send.
  { label: 'app_opened bare', eventType: 'app_opened', data: {} },
  { label: 'crisis_resources_viewed bare', eventType: 'crisis_resources_viewed', data: {} },
  { label: 'crisis_hotline_tapped bare', eventType: 'crisis_hotline_tapped', data: {} },
  { label: 'guidance_opened bare', eventType: 'guidance_opened', data: {} },
  { label: 'screen_viewed coarsened', eventType: 'screen_viewed', data: { screen_name: 'App' } },
  { label: 'screen_viewed Home', eventType: 'screen_viewed', data: { screen_name: 'Home' } },
  { label: 'check_in_completed duration', eventType: 'check_in_completed', data: { duration_ms: 5000 } },
  { label: 'learn_content_viewed module', eventType: 'learn_content_viewed', data: { module_id: 'm1' } },
  { label: 'learn_module_completed pair', eventType: 'learn_module_completed', data: { module_id: 'm1', duration_ms: 900 } },
  { label: 'onboarding_step_completed step', eventType: 'onboarding_step_completed', data: { step: 3 } },
  { label: 'error_occurred type', eventType: 'error_occurred', data: { error_type: 'network' } },
  { label: 'assessment_completed duration', eventType: 'assessment_completed', data: { duration_ms: 42000 } },
  { label: 'practice_completed duration', eventType: 'practice_completed', data: { duration_ms: 300000 } },
  { label: 'breathing_exercise_started bare', eventType: 'breathing_exercise_started', data: {} },
  { label: 'settings_opened bare', eventType: 'settings_opened', data: {} },
  { label: 'consent_changed bare', eventType: 'consent_changed', data: {} },

  // ---- V1 rejects: non-whitelisted event NAME.
  { label: 'unknown event', eventType: 'voice_journal_started', data: {} },
  { label: 'journal_entry_saved', eventType: 'journal_entry_saved', data: {} },
  { label: 'reflection_transcribed', eventType: 'reflection_transcribed', data: {} },
  { label: 'made-up event', eventType: 'totally_new_event', data: { step: 1 } },

  // ---- V1 rejects: PHI keyword in a string VALUE.
  { label: 'value grief', eventType: 'screen_viewed', data: { screen: 'grief' } },
  { label: 'value career', eventType: 'learn_content_viewed', data: { topic: 'career' } },
  { label: 'value conflict', eventType: 'app_opened', data: { detail: 'conflict at work' } },
  { label: 'value journal', eventType: 'app_opened', data: { detail: 'my journal from tonight' } },
  { label: 'value note', eventType: 'app_opened', data: { detail: 'a note to self' } },
  { label: 'value suicid stem', eventType: 'app_opened', data: { detail: 'suicidal thoughts' } },
  { label: 'value harm', eventType: 'app_opened', data: { detail: 'self harm' } },
  { label: 'value phq', eventType: 'assessment_completed', data: { label: 'phq total' } },
  { label: 'value mood', eventType: 'check_in_completed', data: { label: 'mood is low' } },
  { label: 'value email', eventType: 'settings_opened', data: { field: 'email address' } },

  // ---- V1 rejects: suspicious numeric in a non-safe key.
  { label: 'numeric score', eventType: 'assessment_completed', data: { total: 18 } },
  { label: 'numeric rating', eventType: 'check_in_completed', data: { rating: 4 } },
  { label: 'numeric q9', eventType: 'assessment_completed', data: { q9: 2 } },

  // ---- V1 rejects: nested object violation.
  { label: 'nested keyword value', eventType: 'app_opened', data: { meta: { detail: 'grief' } } },
  { label: 'nested numeric', eventType: 'app_opened', data: { meta: { total: 21 } } },

  // ---- V1 ACCEPTS these; INFRA-535 rejects them. The one-sided assertion says
  //      nothing about them, which is the point — but the `TIGHTENED` group below
  //      asserts the live filter does in fact catch them, so the tightening cannot
  //      silently disappear.
  { label: 'array of keyword strings', eventType: 'app_opened', data: { tags: ['grief'] } },
  { label: 'array nested deeper', eventType: 'app_opened', data: { tags: [['career']] } },
  { label: 'array inside object', eventType: 'app_opened', data: { meta: { tags: ['suicidal'] } } },
  { label: 'PHI keyword as KEY', eventType: 'check_in_completed', data: { mood: 'ok' } },
  { label: 'PHI keyword as key segment', eventType: 'assessment_completed', data: { phq_score: 'x' } },
  { label: 'journal key', eventType: 'app_opened', data: { journal_id: 'abc' } },
];

/** Payloads V1 accepts but the tightened filter must now reject. */
const TIGHTENED: ReadonlyArray<string> = [
  'array of keyword strings',
  'array nested deeper',
  'array inside object',
  'PHI keyword as KEY',
  'PHI keyword as key segment',
  'journal key',
];

/**
 * Pinned literal, equal to the corpus's exact baseline-rejection count today
 * (4 non-whitelisted names + 10 keyword values + 3 suspicious numerics + 2 nested).
 * Growth is fine; shrinkage is not. If a future edit trims the corpus or neuters
 * the keyword list, this goes red rather than the suite passing over nothing.
 */
const MIN_BASELINE_REJECTIONS = 19;

/**
 * The registered delta between the frozen baseline and the live whitelist
 * (INFRA-558). Every event type live-whitelisted after `d14d6178` must appear
 * here, in the same PR that adds it.
 *
 * SHIPPED EMPTY, and correctly so: live and baseline are both exactly the 25
 * names of `d14d6178`. `guidance_opened` is NOT a widening — FEAT-457 landed
 * `bb70cb87` on 2026-08-21, three days BEFORE the freeze, so it is inside the
 * snapshot. There is no post-freeze precedent; this ledger records the first.
 *
 * `sample` is a payload the event would really send, used to prove the widening
 * is name-scoped — i.e. the baseline rejects it for the NAME and not because it
 * smuggles wellness data past the keyword scan.
 */
interface Widening {
  readonly eventType: string;
  readonly workItem: string;
  readonly rationale: string;
  readonly sample: Record<string, unknown>;
}

const WIDENED: ReadonlyArray<Widening> = [];

/**
 * The other direction (INFRA-552). A name REMOVED from the live whitelist after
 * `d14d6178` must appear here, in the same PR that removes it.
 *
 * This ledger exists because the amendment procedure above had an add-path only:
 * `declared` was `baseline ∪ WIDENED`, the frozen baseline is never amended, and
 * `WIDENED` only grows — so a legitimate narrowing had no way to be recorded and
 * red-lined the removal assertion with no sanctioned resolution. The assertion's
 * own comment already said a removal "must be reflected here"; nothing implemented
 * that. This does.
 *
 * A narrowing is SAFER than the baseline (the filter transmits strictly less), so
 * unlike `WIDENED` there is no payload to vet — the check is that the removal was
 * declared, attributed, and reasoned, not that it is harmless.
 *
 * TO REMOVE AN EVENT TYPE, in ONE pull request:
 *   1. Delete the constant from `AnalyticsEvents` in `PHIFilter.ts`. Since
 *      INFRA-552 the whitelist is DERIVED from it, so there is no second list to
 *      edit — and no way to remove from one and not the other.
 *   2. Delete its tracker function and hook-return entry in `useAnalytics.ts`, and
 *      its `FIXTURES` entry in `analyticsTrackerContract.privacy.test.ts`. Deleting
 *      the constant alone breaks typecheck; deleting the tracker alone leaves a
 *      dead fixture that suite rejects.
 *   3. Add a `NARROWED` entry below naming the event, the work item, and why.
 *   4. Refresh the enumerated event list in
 *      `docs/architecture/analytics-architecture.md`.
 *
 * Do NOT remove a name because nothing emits it YET. "No production emitter" and
 * "no longer wanted" are different claims, and a sibling item mid-flight looks
 * exactly like the former — INFRA-542 wired `app_opened`/`app_backgrounded` while
 * this prune was being planned, which is why both are absent from this list.
 */
interface Narrowing {
  readonly eventType: string;
  readonly workItem: string;
  readonly rationale: string;
}

const NARROWED: ReadonlyArray<Narrowing> = [
  // Six remain of INFRA-552's original twelve. DEBUG-536 removed the other six
  // entries when it RESTORED those events with real call sites — a restoration of
  // frozen-baseline members, not a new grant, which is why no `WIDENED` entry was
  // added: deleting the entry returns the name to `declared` via the baseline it
  // never left. That is the re-add path the docblock above does not spell out.
  //
  // Each of the nine reversed the rationale "no production emitter", which was true
  // when written and is now false. The rule stated above — "'No production emitter'
  // and 'no longer wanted' are different claims, and a sibling item mid-flight looks
  // exactly like the former" — is exactly the case those nine were: DEBUG-536 was
  // filed and blocked when the prune ran, with no repo footprint to see.
  //
  // These six stay. error_occurred / session_started / session_ended are the genuine
  // "no longer wanted" cases. The breathing and learn_module_completed entries are a
  // different kind: DEBUG-536 could have restored them on the same evidence, and
  // deliberately did not — they answer no question anyone is asking, and restoring a
  // tracker whose only consumer is a dashboard nobody reads is how this set became
  // twelve orphans the first time. They come back with a Job, or not at all.
  { eventType: 'breathing_exercise_started', workItem: 'INFRA-552', rationale: 'No production emitter; tracker existed with zero call sites.' },
  { eventType: 'breathing_exercise_completed', workItem: 'INFRA-552', rationale: 'No production emitter; tracker existed with zero call sites.' },
  { eventType: 'learn_module_completed', workItem: 'INFRA-552', rationale: 'No production emitter; its siblings learn_module_started and learn_content_viewed do fire and are retained.' },
  { eventType: 'error_occurred', workItem: 'INFRA-552', rationale: 'No production emitter. Error reporting goes to Sentry, not to PostHog product analytics.' },
  { eventType: 'session_started', workItem: 'INFRA-552', rationale: 'Catalog fiction: no tracker function ever existed, so the contract test could not see it. No session-lifecycle concept exists in app/src.' },
  { eventType: 'session_ended', workItem: 'INFRA-552', rationale: 'Catalog fiction: no tracker function ever existed, so the contract test could not see it. No session-lifecycle concept exists in app/src.' },
];

describe('PHIFilter differential vs frozen d14d6178 baseline (INFRA-535)', () => {
  const baselineRejections = CORPUS.filter((c) => !validateV1(c.eventType, c.data).valid);

  describe('anti-vacuity guards (DEBUG-390)', () => {
    it('the corpus is non-empty and substantial', () => {
      expect(CORPUS.length).toBeGreaterThanOrEqual(35);
    });

    it('the baseline actually rejects a pinned minimum of the corpus', () => {
      // Without this, a corpus of only-benign payloads satisfies the one-sided
      // relation completely and goes green forever.
      expect(baselineRejections.length).toBeGreaterThanOrEqual(MIN_BASELINE_REJECTIONS);
    });

    it('the baseline still fires on a literal known-bad payload', () => {
      expect(validateV1('app_opened', { detail: 'grief' }).valid).toBe(false);
      expect(validateV1('not_a_real_event', {}).valid).toBe(false);
    });

    it('the baseline keyword list and whitelist are intact', () => {
      expect(BASELINE_PHI_KEYWORDS).toHaveLength(28);
      expect(BASELINE_SAFE_EVENT_TYPES.size).toBe(25);
    });

    it('containsPHI still fires on a literal known-bad string', () => {
      // Proves the detector this suite reasons about is live, not a stub.
      expect(containsPHI({ v: 'reach me at a@b.com' })).toBe(true);
      expect(containsPHI({ v: 'PHQ-9: 21' })).toBe(true);
      expect(containsPHI({ v: 'nothing sensitive here' })).toBe(false);
    });
  });

  /**
   * The live-side control (INFRA-558). Everything above compares BEHAVIOUR over a
   * fixed corpus; nothing above reads the live whitelist's MEMBERSHIP, so before
   * this group a new event type could be added with no test anywhere noticing.
   */
  describe('whitelist amendments are declared (INFRA-558)', () => {
    const live = new Set(PHIFilter.getWhitelistedEvents());
    const narrowed = new Set(NARROWED.map((n) => n.eventType));
    const declared = new Set<string>(
      [...BASELINE_SAFE_EVENT_TYPES, ...WIDENED.map((w) => w.eventType)].filter(
        (e) => !narrowed.has(e)
      )
    );

    it('every live event type is either in the frozen baseline or in the WIDENED ledger', () => {
      const undeclared = [...live].filter((e) => !declared.has(e)).sort();
      // Failing here means someone widened SAFE_EVENT_TYPES without recording it.
      // The fix is a WIDENED entry in that same PR — never an edit to the baseline.
      expect(undeclared).toEqual([]);
    });

    it('nothing declared has since been removed from the live whitelist', () => {
      // The other direction: a stale ledger entry, or a baseline name deleted live.
      // A removal is a legitimate NARROWING, but it must be reflected here rather
      // than left as a claim the code no longer supports.
      const missing = [...declared].filter((e) => !live.has(e)).sort();
      expect(missing).toEqual([]);
    });

    it('each ledger entry is a NAME-scoped widening, not smuggled wellness data', () => {
      // Vacuous while WIDENED is empty — the guard below is what keeps that honest.
      for (const w of WIDENED) {
        const before = validateV1(w.eventType, w.sample);
        expect(before.valid).toBe(false);
        expect(before.reason).toMatch(/not in whitelist/i);
        expect(PHIFilter.validate(w.eventType, w.sample).valid).toBe(true);
        expect(containsPHI(w.sample)).toBe(false);
        expect(w.workItem).toMatch(/^(FEAT|DEBUG|INFRA|MAINT|AGENT)-\d+$/);
        expect(w.rationale.length).toBeGreaterThan(20);
      }
    });

    it('each NARROWED entry names a baseline event that really is gone (INFRA-552)', () => {
      // The symmetric control to the widening check above. Two ways this ledger
      // could rot, both silent without this:
      //   - an entry naming something that was never in the baseline (a typo, or a
      //     name invented to satisfy the arithmetic), which would shrink `declared`
      //     without any real removal having happened;
      //   - a stale entry left behind after the event was RE-ADDED, which would
      //     hide it from the "every live event type is declared" check above.
      for (const n of NARROWED) {
        expect(BASELINE_SAFE_EVENT_TYPES.has(n.eventType)).toBe(true);
        expect(live.has(n.eventType)).toBe(false);
        expect(n.workItem).toMatch(/^(FEAT|DEBUG|INFRA|MAINT|AGENT)-\d+$/);
        expect(n.rationale.length).toBeGreaterThan(20);
      }
      // Non-vacuity: this suite shipped with WIDENED empty, and an empty NARROWED
      // would make the loop above pass over nothing in exactly the same way.
      expect(NARROWED.length).toBeGreaterThan(0);
    });

    it('the membership matcher still fires (DEBUG-390)', () => {
      // An empty ledger plus an unchanged whitelist makes the two tests above pass
      // over nothing. Prove the comparison can still detect an undeclared name, so
      // "green" means "checked" rather than "found nothing to check".
      //
      // Deliberately over SYNTHETIC sets, not over `live`: a control derived from
      // live state fails whenever the test it is controlling fails, which makes it
      // a second symptom rather than an independent check.
      const fakeDeclared = new Set(['a', 'b']);
      const fakeLive = new Set(['a', 'b', 'phantom_undeclared_event']);
      expect([...fakeLive].filter((e) => !fakeDeclared.has(e))).toEqual([
        'phantom_undeclared_event',
      ]);
      expect([...fakeDeclared].filter((e) => !fakeLive.has(e))).toEqual([]);

      // And that the real sets being compared are non-trivial, so the assertions
      // above are running against something.
      expect(live.size).toBeGreaterThanOrEqual(13);
      expect(declared.size).toBe(
        BASELINE_SAFE_EVENT_TYPES.size + WIDENED.length - NARROWED.length
      );
    });
  });

  describe('ONE-SIDED relation: anything the baseline rejected is still rejected', () => {
    it.each(CORPUS.map((c) => [c.label, c] as const))(
      '%s',
      (_label, c) => {
        const before = validateV1(c.eventType, c.data);
        const after = PHIFilter.validate(c.eventType, c.data);

        if (!before.valid) {
          expect(after.valid).toBe(false);
        }
        // Deliberately no assertion when `before.valid` is true: the live filter
        // is permitted to be stricter. See the TIGHTENED group.
      }
    );
  });

  describe('the tightening is real and did not silently disappear', () => {
    it.each(TIGHTENED.map((label) => [label] as const))(
      '%s: baseline accepts, live filter rejects',
      (label) => {
        const c = CORPUS.find((x) => x.label === label);
        expect(c).toBeDefined();
        expect(validateV1(c!.eventType, c!.data).valid).toBe(true);
        expect(PHIFilter.validate(c!.eventType, c!.data).valid).toBe(false);
      }
    );
  });

  describe('the frozen baseline is unreachable from app/src (FEAT-376)', () => {
    const SRC = path.resolve(__dirname, '../../src');

    const walk = (dir: string, acc: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, acc);
        else if (/\.(ts|tsx)$/.test(e.name)) acc.push(p);
      }
      return acc;
    };

    const files = walk(SRC);
    const NEEDLE = 'phiFilterBaselineV1';

    it('the scan actually found source files (anti-vacuity)', () => {
      expect(files.length).toBeGreaterThan(200);
    });

    it('the matcher fires against a literal known-bad string (anti-vacuity)', () => {
      expect(`import { validateV1 } from '../${NEEDLE}';`).toContain(NEEDLE);
    });

    it('no file under app/src references the frozen baseline', () => {
      const offenders = files.filter((f) => fs.readFileSync(f, 'utf8').includes(NEEDLE));
      expect(offenders).toEqual([]);
    });
  });
});
