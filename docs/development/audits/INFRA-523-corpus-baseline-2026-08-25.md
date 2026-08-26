# INFRA-523 — Guarantee correction and first mixed-corpus figures

**Date:** 2026-08-25 · **Supersedes nothing; extends**
`INFRA-512-corpus-review-packet-2026-08-22.md` (the merge protocol, traps and disposition
enum still live there).
**Crisis pass:** performed this run; both rulings applied as given, including one that
overrode the brief it was sent.

---

## 1. What this run changed

Two things, in two repos-of-record, neither a substitute for the other:

| Change | Where |
|---|---|
| The falsified free-text guarantee, corrected in four locations | `chore/INFRA-523-*` → `development` |
| `Safety Facts` split by detection path | `.claude/CLAUDE.md`, direct on `_bare` (gitignored on `development`, so it cannot travel in a feature PR) |

**No detection behaviour changed. No user's safety posture improved.** This run makes the
documentation stop overstating a gap that remains live. Closing the gap is AC2/AC3, still
blocked.

### 1a. Two false claims were live, not one

The item was filed for the first. The crisis pass found the second and refused to let it
stand.

1. **Recall.** `textCrisisDetection.ts` claimed *"Zero-false-negative holds over
   correctly-transcribed text."* Re-derived 2026-08-25 by executing the six compiled
   patterns: `i keep thinking about killing myself`, `i have been thinking about ending it
   all`, `i cant go on anymore`, `suicide`, `i want to end my life`, `i wish i was dead` all
   MISS. Controls `i can not go on`, `i feel suicidal`, `i want to die`, `there is no point
   living` all FIRE, so the matcher was live.

2. **A compensating control that does not exist.** The same paragraph rested residual risk on
   *"a support line surfaced on low-confidence transcripts."* Verified: the only two
   occurrences of `low-confidence` under `app/src` were the two comments asserting it; there
   is no confidence signal in `features/journal` at all; the `SUPPORT_LINE` that exists
   belongs to `practices/dailyloop`. The journal's in-screen banner is `crisisActive ? … :
   null` — it renders only once the scan has **already** fired, so it compensates for
   nothing. Correcting the recall claim while re-asserting this one would have laundered the
   correction.

**Not touched, deliberately:** ~30 further zero-false-negative references covering the SCORE
path (`detectCrisis()` over PHQ-9/GAD-7 integers), where the contract is genuine and total.
A repo-wide sed of the phrase would weaken a contract that holds in order to fix one that
does not.

## 2. Measured figures (AC5 — recorded, not enforced)

```
INFRA-512 corpus v2-seed-plus-verified-misses
  MUST-FIRE recall:             12/18  66.7%
  MUST-NOT-FIRE false-positive:  0/4    0.0%
  STT-MANGLED recall:            2/2  100.0%
  MUST-FIRE misses:  mf-miss-killing-myself, mf-miss-ending-it-all, mf-miss-cant-go-on,
                     mf-miss-suicide, mf-miss-end-my-life, mf-miss-wish-i-was-dead
```

**66.7% IS NOT MEASURED RECALL, IN EITHER DIRECTION.** The corpus has two strata and the
blended figure describes neither: 12 MUST_FIRE items are seed strings the detector was
already known to HANDLE (they cannot fail), and 6 are misses it was already known to MISS
(they cannot pass). The rate is an arithmetic consequence of which known items are present.
It moves whenever an item is added, toward whichever stratum grew. **Do not quote it as
measured recall, do not compare it across corpus versions, and do not read a change in it as
detector drift.** Real recall still needs the adversarial corpus of AC2.

`corpusVersion` was set to `v2-seed-plus-verified-misses` so the caveat travels inside the
console line itself. The filename keeps `v1` — that is the FILE's identity, `corpusVersion`
is the CONTENT's, and they are meant to differ.

## 3. Dispositions (AC6) — six of six `pattern-candidate-deferred-to-crisis-pass`

The standard applied: `accepted-miss-mitigated-elsewhere` requires **both** that the
compensating control is on screen without user initiative in the state where the miss
occurs, **and** that no plausible bounded widening addresses the miss class. **(b) fails for
all six** — every one is reachable by a bounded, linear-time change. Accepting is for
residual risk deliberately *not* reduced; where a fix is available and merely unruled,
"accepted" launders a deferral into a decision. `out-of-scope-stt-layer` is unavailable
(every string is correctly transcribed by construction) and `detected` is unavailable (all
six re-verified as missing).

| Item | Named FP class the widening would introduce |
|---|---|
| `i keep thinking about killing myself` | Gerund of an approved phrase. `kill\w*\s*my\s*self` newly matches the idiom "killing myself" (at work / laughing / at the gym). Needs a paired `MUST_NOT_FIRE` item before shipping. |
| `i have been thinking about ending it all` | Same morphology break. "Ending it all" is near-exclusively the suicidal idiom — low FP delta, but still a widening. |
| `i cant go on anymore` | **A normalizer gap, not a vocabulary gap.** The expanded form already fires, so the FP profile is unchanged by construction. Deferred anyway because `normalizeForCrisisScan` feeds EVERY pattern — wider blast radius than any single pattern, the opposite of what "low risk" usually implies. |
| `suicide` | **Most contested.** A `suicid` prefix is trivial, but an app that shows 988 invites entries *about* the 988 line, about prevention, about articles read. |
| `i want to end my life` | New vocabulary; `end my life` is close to unambiguous — which is why it must not be slipped in ahead of the ruling that sets the bar for adding vocabulary at all. |
| `i wish i was dead` | New vocabulary; hyperbole class ("I wish I was dead, that was so embarrassing") the module's own KNOWN_OVER_FIRE reasoning would *likely* accept — but "likely" is a ruling, not an assumption. |

**Six identical dispositions is the finding, not a degenerate outcome.** The detector's known
gaps are all *fixable and unruled*; none are *accepted*. Two guards on reading that:

- **Not a mandate to widen.** It means a widening is plausible enough to require a ruling —
  and rows 1 and 4 may well be ruled *against*.
- **The follow-up must be at least TWO items.** Row 3 is a normalizer change; the rest are
  vocabulary. Bundling them puts the low-FP normalizer fix behind the contested `suicide`
  argument, which is how the safest of the six ends up shipping last.

## 4. Why founder-as-reviewer is sound here, and why it does not generalize

These six were **hand-derived** by executing the compiled patterns during the INFRA-512
planning pass, recorded in a packet merged via PR #423, and re-verified this run. They were
never model-drafted, and their labels require no judgement — each is an unambiguous
self-harm disclosure. Attestation is therefore proportionate to how they were produced.

**This does not generalize.** For model-generated items the packet's §5.2 stands in full —
the model drafts, the reviewer decides, item by item — and §6 is the proof the correct label
is not self-evident.

## 5. Decisions closed this run

- **Drift pin: CONSIDERED AND DECLINED**, 2026-08-25, by the founder, when offered
  alongside the corpus batch. AC5 stands: recorded, not enforced. Packet §7's open question
  is now closed; do not re-litigate it as still-open.
- **One integrity assertion WAS added** and is deliberately not the drift pin: every item
  with `provenance.source === "verified-miss"` must carry a non-empty `disposition`. It keys
  on provenance rather than detector behaviour (so a future widening cannot invert it) and
  thresholds no rate. Same family as the existing "every `MUST_NOT_FIRE` names what it
  refutes" hard-fail. Verified by mutation: removing one `disposition` reds that assertion
  alone (1 failed, 16 passed); reverted.

## 6. What a green `validate:crisis-authority` now means

**The corpus now contains items that are known-failing by design.** A PASS covers fixture
integrity and the anchor set. It says **nothing** about recall, and it never did — but a
reader who knows this file is CI-selected will otherwise infer more. `--silent` also swallows
the console figures, so this document remains the record.

Standing incentive risk: a CI-selected file reporting 66.7% creates pressure to move the
number, and there is a one-line way to do it. That is why each of the six carries its
disposition and named FP class *on the item itself* — a contributor edits the fixture, not
the header.

## 7. Carried forward

- **AC2/AC3 remain blocked.** No `ANTHROPIC_API_KEY` in this environment (re-verified
  2026-08-25), and AC3 requires hand review of every generated item.
- **`premeditationSafetyService.ts` is strictly worse than the path just measured, and is
  entirely unmeasured.** Its private `CRISIS_KEYWORDS` array is matched with plain
  `lowerText.includes(keyword)` against literal `'kill myself'`, so it misses all six of
  these **plus** `kill my self` and `killmyself`, which the shared module catches. The parity
  guard only pins that it stays a *subset* — it structurally cannot see this. Not this item's
  job; must not fall off the record.
- **The low-confidence support line does not exist and was NOT built here.** New crisis UI on
  a safety surface needs its own item, a crisis pass and a Maestro flow. File it; do not
  scope-creep into it.
- **DEBUG-506** leaves the root crisis button unreachable keyboard-up, which is the
  `scanOnSave` state — a user correcting a transcript. The control is *partial*, not absent:
  it is reachable at `scanOnFinalize` (keyboard down). Strong enough to matter, too weak to
  license an "accepted" disposition.
