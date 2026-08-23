# INFRA-512 — Adversarial crisis-corpus review packet

**Date:** 2026-08-22 · **Status:** harness landed; corpus generation deferred
**Scope decision:** founder, at batch approval — land the harness, fixture schema and
generator; do **not** make the LLM call this run.

---

## 1. What landed, and what it is not

| Artifact | Path |
|---|---|
| Generator (offline, one-off, wired into nothing) | `scripts/generate-crisis-corpus.js` |
| Seed corpus fixture | `app/src/features/crisis/services/__tests__/fixtures/crisisTextCorpus.v1.json` |
| Measurement harness | `app/src/features/crisis/services/__tests__/textCrisisDetection.corpus.test.ts` |
| This record | `docs/development/audits/INFRA-512-corpus-review-packet-2026-08-22.md` |

**The seed corpus is not the baseline, and its numbers must not be quoted as one.** Every
item in it is drawn verbatim from strings already human-reviewed and committed in
`textCrisisDetection.unit.test.ts` — i.e. phrases the detector is *already known* to handle
correctly. Measured on the seed:

```
INFRA-512 corpus v1-seed
  MUST-FIRE recall:             12/12  100.0%
  MUST-NOT-FIRE false-positive:  0/4     0.0%
  STT-MANGLED recall:            2/2   100.0%
  KNOWN_OVER_FIRE (accepted):    1/1
  MUST-FIRE misses:             none
```

Those figures are a **self-test of the harness**, confirming it is wired to the real
detector and reports three separate rates. They say nothing about recall against
adversarial input. Section 3 is what the real baseline will look like.

## 2. Why generation was deferred

`ANTHROPIC_API_KEY` is not present in this environment (`printenv | grep -ci anthropic` → 0;
absent from `~/.zshenv`, `~/.zshrc`, `~/.profile`), and there is no root `package.json`, so
the SDK cannot be installed anywhere that would not break the FEAT-287 pin. The generator
therefore fails loudly on a missing key rather than degrading to an empty corpus — a
silently empty fixture is exactly what would make the harness report a meaningless 100%.

## 3. VERIFIED MUST-FIRE misses — first candidate batch, awaiting review

These are **not** in the fixture. They were derived and verified during the INFRA-512
planning pass by executing the six compiled patterns from `CRISIS_TEXT_PATTERN_SOURCES`
directly against each string. They are recorded here so the finding is not lost, and they
are the natural first batch to review into the corpus.

| Candidate text | Result | Why it misses |
|---|---|---|
| `i keep thinking about killing myself` | **MISS** | pattern is `kill\s*my\s*self`; the gerund puts `ing` where `my` must be |
| `i have been thinking about ending it all` | **MISS** | same morphology break on `end\s*it\s*all` |
| `i cant go on anymore` | **MISS** | the normalizer folds smart apostrophes but never expands contractions; pattern is `can\s*not\s*go\s*on` |
| `suicide` | **MISS** | only `suicidal` is a pattern |
| `i want to end my life` | **MISS** | no pattern covers this phrasing at all |
| `i wish i was dead` | **MISS** | no pattern covers this phrasing at all |

Controls run in the same pass, all **FIRE** as expected: `i can not go on`, `i feel
suicidal`, `i want to die`, `there is no point living`. The matcher was therefore live —
these are real negatives, not a broken harness.

### 3a. The module's stated guarantee is falsified by the first three rows

`textCrisisDetection.ts`'s header says:

> THE GUARANTEE IS SCOPED. Zero-false-negative holds over correctly-transcribed text.

Every string above is correctly-transcribed text expressing self-harm intent. The sentence
is not true as written. **Correcting it was deliberately excluded from this run** — the
founder chose the test-only option, and editing `textCrisisDetection.ts` (a non-test file
under `features/crisis/`) would re-tier the item to a human-attended simulator close.

**This is the single most important item to carry forward.** A repo that ships a
measurement contradicting an adjacent guarantee is worse than one that ships neither. The
follow-up should rewrite the header to a claim that is true — most of the misses are
*morphological variants of already-approved phrases*, which is a materially different
(and lower alarm-fatigue) remediation tier than adding new vocabulary — and qualify
`CLAUDE.md`'s unqualified "Crisis detection: zero false negatives" line, which currently
reads as covering this path.

## 4. Disposition enum for MUST-FIRE misses

Every miss triaged into the corpus takes exactly one:

- `detected` — no longer a miss.
- `accepted-miss-mitigated-elsewhere` — names the compensating control it rests on (the
  always-reachable root crisis affordance; the low-confidence-transcript support line).
- `pattern-candidate-deferred-to-crisis-pass` — a widening is plausible but needs its own
  item and a `crisis` ruling.
- `out-of-scope-stt-layer` — recognizer error, outside this module's stated contract.

**Widening `CRISIS_TEXT_PATTERN_SOURCES` is never the automatic remedy.** That constant
feeds `journalCrisisScanner.scan`, which fires `showCrisisAlert()` — widening it to move a
number buys alarm fatigue on a journaling surface, which degrades the response to true
positives. Any widening is a separate item with a crisis pass.

## 5. Merge protocol for reviewed items

1. `node scripts/generate-crisis-corpus.js --class <CLASS> --count N` — writes
   `verdict: "PENDING"` candidates to a path **outside** the repo (the script refuses a
   destination inside it).
2. Review every item by hand. The model drafts; the reviewer decides the label. Do not
   bulk-accept — §6 is proof the correct label is not self-evident.
3. Append accepted items to the fixture with `review.reviewer`, `review.reviewedOn` and
   `review.verdict` filled in. The harness fails on any item lacking a verdict.
4. Re-run `npm run test:crisis-detection` and record the three figures in a dated successor
   to this document.

## 6. Two traps for whoever reviews the corpus

**Do not label negations `MUST_NOT_FIRE`.** `textCrisisDetection.unit.test.ts` pins that
`"I don't want to die"` **must** trigger, as a deliberate Slice A decision: a recognizer
that drops the negation turns a negated sentence into a disclosure, so trusting negation
converts a transcription error into a missed crisis. Negated phrasing is the most obvious
"near-miss" a generator will produce, and mislabelling it would put standing pressure on a
crisis decision in order to improve a false-positive rate. That is what the
`KNOWN_OVER_FIRE` class exists to absorb — it is reported separately and excluded from the
false-positive denominator.

**`MUST_NOT_FIRE` items must be adversarially adjacent.** Each must name, in `refutes`, the
specific naive widening it rules out. Generic calm journaling contributes nothing to a
false-positive rate and lets the class be padded.

## 7. Open questions not decided this run

- **Should the harness gain a drift pin** — failing when measured rates diverge from a
  committed baseline? It would be explicit rather than silent (mirroring
  `performance-baselines.json` and `ci-uncovered-tests.json`), but it means an unrelated
  detector change turns CI red until the baseline is re-recorded. Not implemented; AC5 says
  "recorded, not enforced", and inventing an enforcement policy the founder did not choose
  would exceed the item.
- **STT-MANGLED has no ground truth in this repo.** Nothing captures real recognizer error
  distributions, and nothing can — transcripts are wellness data and the analytics boundary
  test exists to keep them out of every sink. The recognizer is Apple's on-device
  `SFSpeechRecognizer`, so "realistic" means "an LLM's guess at its error modes". Label the
  STT-MANGLED figure as indicative, never as a measurement of on-device behaviour.
- **`premeditationSafetyService.ts` keeps a private duplicate keyword array** that imports
  nothing from the shared constant. Any future widening must state whether premeditation is
  in scope, or the two vocabularies diverge further in the direction the parity guard does
  not cover.

## 8. What the harness enforces, and what it deliberately does not

**Hard-fails on:** a malformed or empty fixture; any item missing a review verdict; a
duplicate id; an `STT_MANGLED` item whose `sourceId` does not resolve; a `MUST_NOT_FIRE`
item that names no `refutes`; and the **anchor set** — one canonical bare phrase per shipped
pattern, which must all fire and must stay the same size as `CRISIS_TEXT_PATTERN_SOURCES`.

The anchor set is the anti-narrowing lock: it makes the harness impossible to "pass" by
shrinking the detector rather than improving it. It was verified by mutation on 2026-08-22
— removing the `no\s*point\s*living` pattern turned three assertions red
(`has exactly one anchor per shipped pattern`, `every anchor names a pattern that is still
shipped`, `anchor mf-no-point-living fires unconditionally`), and the mutation was reverted.

**Asserts no threshold on any of the three rates.** That is AC5. A threshold set before the
number is known either passes vacuously or blocks every PR.

**Note on CI selection:** this file *is* selected by CI. Every path under `features/crisis/`
matches `test:crisis-quick`'s `--testPathPattern="[Cc]risis"`, which CI runs via
`validate:crisis-authority` (`ci.yml:210`) with `--silent --testTimeout=5000`. Measured at
0.706s under those exact flags. Because `--silent` swallows console output, **the console
figures are not the record — this document is.**
