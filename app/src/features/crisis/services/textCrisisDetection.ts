/**
 * textCrisisDetection — free-text crisis scanning (FEAT-283 Slice A)
 *
 * Domain Authority: crisis (CRITICAL). Changes here require a crisis pass.
 *
 * WHAT THIS IS
 * Being's first free-text crisis scanner. Until this module, crisis detection
 * was score-shaped only: `detectCrisis()` in `../types/safety` takes a PHQ-9 or
 * GAD-7 result and reasons over integers. Free-text surfaces (session notes,
 * weekly reflections) were scanned by nothing at all. Voice journal entries are
 * the first free text routed through a real detector, so this is written as a
 * shared crisis-feature primitive rather than journal-local code.
 *
 * WHAT THIS IS NOT
 * It does not replace or widen `detectCrisis()`. That function's signature is
 * pinned by the clinical threshold suites and must stay integer-shaped.
 *
 * TWO INVARIANTS, both pinned by `__tests__/textCrisisDetection.unit.test.ts`:
 *
 *   1. CONTENT-FREE RESULT. `TextCrisisDetection` carries no transcript, no
 *      excerpt, no match offset, no match count, and no per-phrase trigger id.
 *      The result is the value that flows onward to telemetry and logging, and
 *      entry text is wellness data that must reach neither. Being content-free
 *      *by construction* is a stronger guarantee than being scrubbed on the way
 *      out — the logging scrubber matches known shapes (scores, ids, paths) and
 *      will not redact arbitrary prose.
 *
 *      This is also why the result deliberately does NOT reuse the richer
 *      `CrisisDetection` interface: its `context.triggeringAnswers` field is
 *      serialized to unencrypted AsyncStorage by the assessment store's
 *      intervention logger, so routing transcript-derived data through that
 *      shape would place journal content in plaintext on disk.
 *
 *   2. LINEAR-TIME SCANNING. Patterns are precompiled at module scope, carry no
 *      `/g` flag (which would retain `lastIndex` across calls and make results
 *      non-deterministic), and contain no nested quantifiers. Entry length is
 *      unbounded, unlike a nine-item questionnaire, so the <200ms crisis budget
 *      is only defensible if cost stays linear in input length.
 *
 * THE GUARANTEE IS PRECISION, NOT RECALL. What this module guarantees is that a
 * small, fixed, hand-approved vocabulary matches deterministically, in linear
 * time, without leaking content. It does NOT guarantee that every disclosure
 * matches. Recall is UNMEASURED, and three miss classes are verified
 * (INFRA-512 §3): morphological variants of approved phrases ("killing myself"
 * against `kill\s*my\s*self`), contractions the normalizer does not expand
 * ("cant" against `can\s*not`), and phrasings no pattern covers at all ("i wish
 * i was dead"). A null result is not evidence of no crisis.
 *
 * Recognizer error is a SEPARATE axis stacked on top of that: a mishearing
 * defeats any text scanner, and nothing in this module or its specs can see it.
 *
 * The residual risk rests on the root crisis button, which stays mounted here —
 * `VoiceReflection` is not in `RootCrisisButton.SUPPRESSED_ROUTES`. That is a
 * user-initiated affordance, not a detector, and DEBUG-506 leaves it
 * unreachable while the keyboard is up, which is the state a user is in while
 * correcting a transcript. The in-screen crisis banner compensates for nothing:
 * it renders only once this scan has already fired.
 *
 * Recall is RECORDED, not thresholded, by `__tests__/textCrisisDetection.corpus.test.ts`
 * against `docs/development/audits/INFRA-512-corpus-review-packet-2026-08-22.md`.
 * Widening the pattern set is NOT the remedy — see `CRISIS_TEXT_PATTERN_SOURCES`.
 */

/**
 * Categorical trigger emitted for every text match.
 *
 * Deliberately singular. A per-phrase trigger id would let a telemetry reader
 * infer which words the user spoke, which is a content leak wearing a category
 * label. Severity is uniform for the same reason.
 */
export type TextCrisisTrigger = 'journal_text_match';

export interface TextCrisisDetection {
  /** Always true when returned; the module returns null rather than a false result. */
  isTriggered: true;
  /** Categorical — never identifies which phrase matched. */
  primaryTrigger: TextCrisisTrigger;
  /** Uniform bucket. Varying this by phrase would leak content. */
  severityLevel: 'high';
  /** Measured scan duration, for the <200ms budget breach log. */
  detectionResponseTimeMs: number;
}

/**
 * Crisis phrase patterns, as regex source strings.
 *
 * `\s*` between tokens rather than `\s+` or a literal space: speech recognizers
 * segment words inconsistently, so "kill myself", "kill my self" and
 * "killmyself" are all plausible transcriptions of one utterance. Word
 * boundaries are precisely what cannot be trusted in STT output.
 *
 * This set is the single source of truth for free-text crisis vocabulary. The
 * legacy private list in `core/services/premeditationSafetyService.ts` is a
 * strict subset and should be refactored to consume this module; the parity
 * spec pins that no phrase is silently lost in the meantime.
 *
 * Deliberately NOT included: fuzzy/phonetic (Soundex, Levenshtein) matching.
 * It generates false positives on ordinary language ("dye" → "die"), its cost
 * is unbounded against the response budget, and on a journaling surface false
 * alarms train users to dismiss the crisis UI — which degrades the response to
 * true positives. That trade is net-negative for safety.
 */
export const CRISIS_TEXT_PATTERN_SOURCES: readonly string[] = [
  'suicidal',
  'kill\\s*my\\s*self',
  'end\\s*it\\s*all',
  'can\\s*not\\s*go\\s*on',
  'want\\s*to\\s*die',
  'no\\s*point\\s*living',
];

/** Precompiled once. No `/g` — see invariant 2. */
const CRISIS_TEXT_PATTERNS: readonly RegExp[] = CRISIS_TEXT_PATTERN_SOURCES.map(
  (source) => new RegExp(source, 'i')
);

/** U+2018/U+2019/U+02BC → U+0027, so "can't" and "can't" scan identically. */
const SMART_APOSTROPHES = /[‘’ʼ]/g;
/** Combining marks left behind by NFKD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;
const WHITESPACE_RUN = /\s+/g;

/**
 * Canonicalise text before scanning.
 *
 * Punctuation is intentionally preserved: patterns are unanchored substring
 * matches, so "i want to die." matches without needing punctuation stripped,
 * and stripping it would fuse adjacent words into spurious tokens.
 */
export function normalizeForCrisisScan(text: string): string {
  if (typeof text !== 'string' || text.length === 0) {
    return '';
  }

  return text
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(SMART_APOSTROPHES, "'")
    .toLowerCase()
    .replace(WHITESPACE_RUN, ' ')
    .trim();
}

/**
 * Scan free text for crisis disclosure.
 *
 * Pure and synchronous: no store reads, no decryption, no network, no awaits.
 * Callers scan the plaintext they already hold, before encryption, so the
 * measured window contains only the scan itself.
 *
 * Returns null when no pattern matches — never a `{ isTriggered: false }`
 * object, so a caller cannot accidentally treat a falsy result as a positive.
 *
 * The scan is never truncated for long input. Exceeding the budget is a logged
 * degradation the caller reports; an unscanned tail would add a miss on text the
 * pattern set would otherwise have caught, which is the one miss class this
 * module can eliminate outright.
 */
export function detectCrisisInText(text: string): TextCrisisDetection | null {
  const startedAt = performance.now();

  const normalized = normalizeForCrisisScan(text);
  if (normalized.length === 0) {
    return null;
  }

  let matched = false;
  for (const pattern of CRISIS_TEXT_PATTERNS) {
    if (pattern.test(normalized)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    return null;
  }

  return {
    isTriggered: true,
    primaryTrigger: 'journal_text_match',
    severityLevel: 'high',
    detectionResponseTimeMs: performance.now() - startedAt,
  };
}
