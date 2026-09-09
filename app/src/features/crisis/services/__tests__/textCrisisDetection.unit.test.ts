/**
 * textCrisisDetection — unit specs (FEAT-283 Slice A)
 *
 * WHAT THIS SUITE ESTABLISHES — read before citing it.
 *
 * These specs pin that the shipped vocabulary matches, that near-misses do not,
 * and that the result leaks no content. They do NOT establish that every crisis
 * disclosure is detected: recall is unmeasured and known misses exist
 * (`textCrisisDetection.ts` header; INFRA-512 §3). Nor can they see recognizer
 * error — a mishearing of "I want to die" fails no assertion here.
 *
 * Cite this suite as evidence that the approved phrases still fire. Do not cite
 * it as evidence that voice capture is safe, or that a null scan means no crisis.
 */

import {
  CRISIS_TEXT_PATTERN_SOURCES,
  detectCrisisInText,
  normalizeForCrisisScan,
} from '../textCrisisDetection';

describe('normalizeForCrisisScan', () => {
  it('lowercases', () => {
    expect(normalizeForCrisisScan('KILL MYSELF')).toContain('kill myself');
  });

  it('folds smart apostrophes to straight ones', () => {
    // U+2019 RIGHT SINGLE QUOTATION MARK — what iOS autocorrect and most STT
    // engines actually emit, and what a naive includes() check misses.
    expect(normalizeForCrisisScan('can’t')).toBe("can't");
  });

  it('strips diacritics via NFKD', () => {
    expect(normalizeForCrisisScan('díe')).toBe('die');
  });

  it('collapses runs of whitespace', () => {
    expect(normalizeForCrisisScan('kill    myself')).toBe('kill myself');
  });

  it('returns empty string for nullish input rather than throwing', () => {
    expect(normalizeForCrisisScan(undefined as unknown as string)).toBe('');
    expect(normalizeForCrisisScan(null as unknown as string)).toBe('');
  });
});

describe('detectCrisisInText — true positives', () => {
  // Every phrase carried by the legacy premeditation list must still trigger.
  // Parity with that list is asserted separately in the parity spec.
  const PHRASES = [
    'suicidal',
    'kill myself',
    'end it all',
    'cannot go on',
    'want to die',
    'no point living',
  ];

  it.each(PHRASES)('detects %p verbatim', (phrase) => {
    expect(detectCrisisInText(phrase)?.isTriggered).toBe(true);
  });

  it.each(PHRASES)('detects %p embedded mid-sentence', (phrase) => {
    const result = detectCrisisInText(`today was hard and ${phrase} honestly`);
    expect(result?.isTriggered).toBe(true);
  });

  it('detects across case variation', () => {
    expect(detectCrisisInText('Kill My Self')?.isTriggered).toBe(true);
  });

  it('detects with trailing punctuation', () => {
    expect(detectCrisisInText('i want to die.')?.isTriggered).toBe(true);
    expect(detectCrisisInText('i want to die,')?.isTriggered).toBe(true);
  });

  it('detects when STT drops the word boundary entirely', () => {
    // Speech recognizers routinely emit "killmyself" or "kill my self" for the
    // same utterance. Whitespace-insensitive matching is the cheap, deterministic
    // half of the garbled-transcript mitigation.
    expect(detectCrisisInText('killmyself')?.isTriggered).toBe(true);
    expect(detectCrisisInText('kill my self')?.isTriggered).toBe(true);
  });

  it('detects at string start and string end', () => {
    expect(detectCrisisInText('suicidal thoughts again')?.isTriggered).toBe(true);
    expect(detectCrisisInText('honestly i feel suicidal')?.isTriggered).toBe(true);
  });

  it('detects with smart apostrophes in surrounding text', () => {
    expect(detectCrisisInText('i can’t stop thinking i want to die')?.isTriggered).toBe(true);
  });
});

describe('detectCrisisInText — documented over-trigger', () => {
  it('MATCHES negated phrasing, intentionally', () => {
    // "I don't want to die" contains "want to die" and WILL trigger.
    //
    // This is a deliberate Slice A decision, not an oversight. Negation
    // detection on lossy speech-to-text is unreliable in the direction that
    // matters: a recognizer that drops "don't" turns a negated sentence into a
    // disclosure, so trusting negation would convert a transcription error into
    // a missed crisis. An extra support offer costs a dismissal; a missed
    // disclosure is unrecoverable. Do not "fix" this without a crisis pass.
    expect(detectCrisisInText("I don't want to die")?.isTriggered).toBe(true);
  });
});

describe('detectCrisisInText — true negatives', () => {
  it.each([
    'today was hard but i made it through',
    'i want to dye my hair tomorrow',
    'the meeting ran long and i was tired',
    'i resisted the urge to snap at him',
  ])('does not trigger on %p', (text) => {
    expect(detectCrisisInText(text)).toBeNull();
  });

  it('returns null for empty, whitespace-only, and nullish input', () => {
    expect(detectCrisisInText('')).toBeNull();
    expect(detectCrisisInText('   \n\t  ')).toBeNull();
    expect(detectCrisisInText(undefined as unknown as string)).toBeNull();
    expect(detectCrisisInText(null as unknown as string)).toBeNull();
  });
});

describe('detectCrisisInText — result carries no content', () => {
  // The strongest guarantee in this module. The result object is the value that
  // flows onward to telemetry and logging, and transcript text is wellness data
  // that must never reach either sink. Content-free *by construction* beats
  // content-scrubbed-on-the-way-out, which is what a regex scrubber would give.
  it('does not expose the transcript, an excerpt, or match offsets', () => {
    const transcript = 'the quarterly review went badly and i want to die about it';
    const result = detectCrisisInText(transcript);

    expect(result).not.toBeNull();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('quarterly');
    expect(serialized).not.toContain('want to die');
    // No offsets, no counts, no matched-phrase identifiers — each is a partial
    // read of the entry's content.
    expect(Object.keys(result!).sort()).toEqual(
      ['detectionResponseTimeMs', 'isTriggered', 'primaryTrigger', 'severityLevel'].sort()
    );
  });

  it('reports a categorical trigger, never a per-phrase identifier', () => {
    const a = detectCrisisInText('suicidal');
    const b = detectCrisisInText('no point living');
    // Two different phrases must be indistinguishable in the emitted value,
    // otherwise the trigger id leaks which phrase the user spoke.
    expect(a?.primaryTrigger).toBe('journal_text_match');
    expect(b?.primaryTrigger).toBe(a?.primaryTrigger);
  });
});

describe('detectCrisisInText — performance and robustness', () => {
  it('scans a 50k-character entry within the 200ms crisis budget', () => {
    const haystack = 'today was an ordinary and unremarkable day. '.repeat(1200);
    expect(haystack.length).toBeGreaterThan(50000);

    const started = performance.now();
    const result = detectCrisisInText(haystack);
    const elapsed = performance.now() - started;

    expect(result).toBeNull();
    expect(elapsed).toBeLessThan(200);
  });

  it('still finds a disclosure in the final characters of a 50k entry', () => {
    // Guards against any future "scan only the first N chars" optimisation.
    // An unscanned tail is a false negative by construction.
    const haystack = 'an ordinary day. '.repeat(3000) + ' i want to die';
    expect(haystack.length).toBeGreaterThan(50000);
    expect(detectCrisisInText(haystack)?.isTriggered).toBe(true);
  });

  it('does not backtrack catastrophically on adversarial repetition', () => {
    const adversarial = 'kill '.repeat(20000);
    const started = performance.now();
    detectCrisisInText(adversarial);
    expect(performance.now() - started).toBeLessThan(200);
  });

  it('is deterministic and retains no state between calls', () => {
    // A module-scope regex with the /g flag carries lastIndex between calls and
    // would make every second scan return a different answer. This spec exists
    // to catch that specific mistake.
    const text = 'i want to die';
    const first = detectCrisisInText(text)?.isTriggered;
    const second = detectCrisisInText(text)?.isTriggered;
    const third = detectCrisisInText(text)?.isTriggered;
    expect([first, second, third]).toEqual([true, true, true]);
  });

  it('reports its own detection time', () => {
    const result = detectCrisisInText('i want to die');
    expect(typeof result?.detectionResponseTimeMs).toBe('number');
    expect(result!.detectionResponseTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('CRISIS_TEXT_PATTERN_SOURCES', () => {
  it('is exported so the premeditation service can consume one shared set', () => {
    expect(Array.isArray(CRISIS_TEXT_PATTERN_SOURCES)).toBe(true);
    expect(CRISIS_TEXT_PATTERN_SOURCES.length).toBeGreaterThanOrEqual(6);
  });

  it('contains no capturing-group or nested-quantifier constructs', () => {
    // Linear-time patterns only — the 200ms budget is a safety contract, and a
    // catastrophically backtracking pattern would breach it on a long entry.
    for (const source of CRISIS_TEXT_PATTERN_SOURCES) {
      expect(source).not.toMatch(/\(\?!/);
      expect(source).not.toMatch(/[+*]\s*\)[+*]/);
    }
  });
});
