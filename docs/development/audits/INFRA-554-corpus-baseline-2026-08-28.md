# INFRA-554 — Adversarial crisis-corpus baseline (2026-08-28)

Successor to `INFRA-523-corpus-baseline-2026-08-25.md`. Supersedes its figures; does not
supersede its reasoning, which still stands.

**The console figures are not the record — this document is.** The harness runs `--silent`
under `test:crisis-quick`.

## 1. What this measures, and what it does not

`detectCrisisInText` recall against **30 adversarial phrasings the detector had never seen**,
model-drafted blind and human-reviewed item by item.

It is **not** a measure of recall against real journal entries. The generator brief asked for
"hedged and indirect phrasings", so the batch is deliberately weighted toward the euphemistic
tail. Recall against a representative distribution remains **UNMEASURED**.

## 2. The figures

```
INFRA-512 corpus v3-seed-verified-misses-adversarial-batch-1

MUST-FIRE recall — per reachability stratum. NOT blended; strata are not commensurable.
  in-vocabulary                        12/12  100.0%
  morphological                          0/5    0.0%
  new-vocabulary                         0/10   0.0%
  out-of-reach-of-substring-matching     0/21   0.0%
      ^ not addressable by CRISIS_TEXT_PATTERN_SOURCES.
        A change to that constant cannot move this figure.

  addressable (morphological + new-vocabulary)  0/15  0.0%
      ^ the only figure a widening can move. 15 items, each with a named FP class.

MUST-NOT-FIRE false-positive:  0/4   0.0%
STT-MANGLED recall:            2/2 100.0%
KNOWN_OVER_FIRE (accepted):    1/1
```

**Which stratum each figure covers:**

| Stratum | n | Covers | Can a widening move it? |
|---|---|---|---|
| `in-vocabulary` | 12 | Repo-reviewed seed, drawn verbatim from strings already committed in `textCrisisDetection.unit.test.ts`. **Cannot fail by construction.** | n/a — already 100% |
| `morphological` | 5 | Bounded morphological/normalizer variants of approved phrases. | Yes |
| `new-vocabulary` | 10 | Distinct literal phrases a bounded new pattern would catch. | Yes |
| `out-of-reach-of-substring-matching` | 21 | Genuine disclosures whose signal is compositional or inferential, carried by no fixed literal. | **No.** This is a stated ceiling. |

**There is deliberately no blended MUST-FIRE figure.** The previous corpus reported
`12/18 66.7%`; adding 30 items would have made that `12/48 25.0%`. Both are artefacts of
corpus composition, not measurements — the numerator has been frozen at 12 since the seed
was committed. Read naively, "25%" suggests the detector catches a quarter of disclosures.
The truth is bimodal and the average describes neither half: **100% on phrasings already in
the repo, 0% on thirty it had never seen.**

## 3. The finding

**The vocabulary gap is real but bounded at 15 items. The architectural ceiling is 21 items
and is the larger finding.**

No addition to `CRISIS_TEXT_PATTERN_SOURCES` reaches
*"I've been giving away things I care about and I know why I'm doing it"* — it contains no
death, harm, or intent token anywhere. Nor
*"There's a plan forming and I'm not scared of it the way I should be"*, the highest-acuity
item in the corpus. That is what the fourth stratum records, and it is why a single blended
figure was refused: one number presents one deficit, and one deficit admits exactly one
remedy — widen the patterns. That remedy cannot reach 21 of the 30.

`CRISIS_TEXT_PATTERN_SOURCES` feeds `journalCrisisScanner.scan` → `showCrisisAlert()` on a
journaling surface, where a false alarm degrades the response to true positives. **No
widening is mandated by this document.**

## 4. Provenance — and a deviation from AC1 as written

AC1 specified generation via `node scripts/generate-crisis-corpus.js` with an
`ANTHROPIC_API_KEY`. **No key exists in this environment** (re-verified 2026-08-28; the
generator's fail-closed path was exercised and confirmed to exit rather than degrade to an
empty corpus).

Generation instead used `buildPrompt('MUST_FIRE', 40)` **rendered verbatim** and run in a
clean-room chat session with no repository access. The prompt is byte-identical to what the
script sends — the script builds a single user message with no system prompt, and that
prompt never references the pattern list. Only the transport differs. Every item records
this in `provenance.origin`.

What is preserved: prompt version `infra-512-v1`, generator blindness to the matcher, no
`@anthropic-ai/*` package anywhere near `app/package.json`, candidates written outside the
repo. What is lost: the API's `output_config: { effort: 'high' }`, which has no chat
equivalent.

## 5. Review

40 candidates → **30 accepted**, 2 rejected on label, 8 rejected on hygiene.
Reviewer `MP2EZ`, 2026-08-28. Two passes, labels locked between them.

- **Pass 1 (labels, pattern list closed).** `crisis` ruled per item; the reviewer held final
  say. 8 of 9 CONTENTIOUS rulings accepted. **One overruled**: `[34]` *"you don't have to
  keep doing this to yourself"* → DROP, on the ground that it reads equally as a
  self-compassion realisation — a reading this app's own practice content actively
  cultivates. `crisis` had flagged its own inverse bias on that row and nominated it as the
  most defensible overrule.
- **Pass 1 hygiene.** 8 near-duplicates collapsed to representatives. Note `[32]` survived
  labelling and exited on hygiene — it is genuine ground truth, but duplicates `[14]`'s
  construct, and keeping both would double-count one judgment call.
- **Pass 2 (reachability + disposition, pattern list open).** All 30 dispositioned, each
  with a per-item note naming either the FP class a widening would introduce or why no
  literal carries the signal.

### Contamination disclosures

Both are recorded because a review's value rests on the discipline of the process, not on
the outcome looking clean.

1. **Reviewer-side, by the operator.** Before Pass 1 was defined, the operator told the
   reviewer which phrases looked reachable (`ending it`, `hurt myself`, `hurting myself`)
   and anchored an expected rate. This violates the blind-label rule. Assessed as low
   impact — it touches 4 of 40 items, all independently ruled uncontentious — but it is a
   real deviation and is not excused by the outcome.
2. **Specialist-side, self-flagged.** `crisis` had read the pattern list before Pass 1 and
   flagged three rows where that knowledge pulled on a label: `[12]` and `[5]` toward
   SETTLED, `[34]` inversely toward DROP. It resisted all three and rated on text alone.

### Recorded concern

All seven accepted-contentious labels landed in the out-of-reach stratum, so that stratum is
14 settled + 7 contentious rather than 21 equally-firm items. The finding is unchanged at 14
— the ceiling still exceeds the addressable gap — but a future reviewer overturning any of
those labels will move the stratum, and that must not be read as detector drift. If a firmer
statement of the ceiling is wanted, `mf-adv-sure-longer-want` `[11]` is the first to
re-examine: its referent is wholly unbound.

## 6. Enforcement — a gap found and closed

The existing integrity assertion required a `disposition` only for
`provenance.source === 'verified-miss'`. The 30 new items carry `model-drafted`, so **AC5
would have been honour-system**. The script's own stamp (`anthropic-api`) would have hit the
identical gap, so this is not an artefact of the clean-room path.

Fixed with a **second** assertion rather than by renaming the provenance value, which would
have made the guard depend on a string any future generator run can change:

- **Arrival guard (new, behaviour-keyed).** Every `MUST_FIRE` item the detector misses must
  carry a non-empty `disposition`. Provenance-blind, so no source string dodges it.
- **Retention guard (existing, provenance-keyed, unchanged).** Protects a recorded
  disposition from removal once a widening turns a miss into a hit.

The pair is monotone: required on arrival by behaviour, never droppable once recorded. Plus
a `reachability`-required guard and a per-item `dispositionNote` guard.

**All three new guards were mutation-verified before landing:** each mutation reds exactly
one test (`1 failed, 19 passed`), and restore returns `20 passed`. Exactly-one is the point —
it proves the guards do not conflate mechanisms.

**Still no CI threshold.** AC5 of the grandparent stands, and packet §7's drift pin remains
DECLINED. None of the four assertions thresholds a rate.

## 7. Follow-ups this produces — none actioned here

1. **15 addressable items → pattern-candidate rulings.** Each carries a named FP class.
   `pattern-candidate-deferred-to-crisis-pass` means *a widening is plausible enough to
   require a ruling*, never *widen*. Group by vocabulary family, not per item:
   - `hurt my self` family — must be authored `hurt\w*\s*my\s*self`, not `hurt\s*my\s*self`,
     or `mf-adv-hurting-myself-only` misses again. This is the exact failure
     `mf-miss-killing-myself` already recorded. FP class: "I hurt myself at the gym."
   - `dead` family — covers `mf-adv-being-dead-sounds` and the deferred
     `mf-miss-wish-i-was-dead`. Rule once, not twice.
   - `tired of being alive` — cleanest candidate in the batch. Do **not** generalise to
     `tired of living`, which matches "tired of living in this apartment."
   - `end it` truncation — materially harder than `mf-miss-ending-it-all` and must not be
     bundled with it: dropping "all" removes the disambiguating token.
2. **Two items need a `philosopher` pass alongside the `crisis` ruling.**
   `mf-adv-idea-existing-started` ("not existing") and `mf-adv-kept-picturing-own` ("my own
   funeral") name phrasings that **Stoic mortality reflection actively cultivates in this
   app's own practice journal**. A widening ruled sound on crisis grounds alone would fire
   on the app's prescribed exercise.
3. **A `--class MUST_NOT_FIRE` run is owed.** This batch was MUST_FIRE-only and contributes
   nothing to the false-positive denominator, which remains 4 items. Every pattern candidate
   above needs a paired MUST_NOT_FIRE before shipping.
4. **Carried from INFRA-523, still open.** `premeditationSafetyService.ts`'s private
   `CRISIS_KEYWORDS` is matched with plain `includes()` against literal `'kill myself'` — it
   misses everything here plus `kill my self` and `killmyself`. Wholly unmeasured; the parity
   guard pins only subset-ness and structurally cannot see this.
5. **`accepted-miss-mitigated-elsewhere` remains unavailable for every item.** INFRA-523 §3
   set a two-part bar. Part (b) — no plausible bounded widening — now passes for the first
   time on the out-of-reach stratum. Part (a) still fails: DEBUG-506 leaves the root crisis
   button unreachable keyboard-up, which is the `scanOnSave` state. Half a bar is not the bar.
