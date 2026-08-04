/**
 * Voice journal analytics boundary — contract (FEAT-283 Slice A, AC #5)
 *
 * "No entry text, audio, or derived content reaches any analytics sink."
 *
 * Modelled on `feedbackScrub.contract.test.ts` and
 * `crisisTelemetryFields.regression.test.ts`. Where those pin one payload, this
 * pins the whole surface: the boundary is only meaningful if it holds for every
 * journal code path, including ones added later. So the source-scan specs walk
 * the feature directory rather than naming files, and a new file is covered the
 * day it lands.
 *
 * WHY THE CRISIS TELEMETRY IS NOT A CONTRADICTION
 *
 * A crisis-positive entry DOES emit `crisis_detected` to Supabase. That is not
 * an exception to this AC — the AC is about the transcript never reaching an
 * analytics sink, and the crisis event carries only categorical fields (that a
 * scan fired, at what severity bucket, whether support was surfaced, on which
 * surface). It is the same vital-interest sink and the same four-field
 * allow-list the PHQ-9 path already uses (INFRA-214), and is separately DPIA'd.
 * Consented product analytics (PostHog) and vital-interest crisis telemetry
 * (Supabase) are different legal bases and different sinks.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { PHIFilter } from '@/core/analytics/PHIFilter';

const JOURNAL_FEATURE_DIR = join(__dirname, '../../src/features/journal');
const SPEECH_SERVICE_DIR = join(__dirname, '../../src/core/services/speech');

/** Every non-test source file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const JOURNAL_SOURCES = [
  ...sourceFiles(JOURNAL_FEATURE_DIR),
  ...sourceFiles(SPEECH_SERVICE_DIR),
];

describe('journal source files are actually being scanned', () => {
  it('finds the feature and speech sources (guards against a broken path)', () => {
    // Without this, a renamed directory would make every scan below pass
    // vacuously — the failure mode where a contract test silently stops
    // guarding anything.
    expect(JOURNAL_SOURCES.length).toBeGreaterThanOrEqual(4);
    expect(JOURNAL_SOURCES.some((f) => f.endsWith('journalCrisisScan.ts'))).toBe(true);
    expect(JOURNAL_SOURCES.some((f) => f.endsWith('journalEntryStore.ts'))).toBe(true);
  });
});

describe('no journal source calls a product-analytics sink', () => {
  it.each(JOURNAL_SOURCES.map((f) => [f.split('/features/').pop() ?? f, f]))(
    '%s does not touch PostHog',
    (_label, file) => {
      const source = readFileSync(file as string, 'utf8');

      // PostHog is the consented product-analytics sink. Nothing in the journal
      // feature may reach it: a transcript-adjacent property added to a product
      // event is precisely the leak this AC forbids, and it would be
      // consent-gated rather than blocked.
      expect(source).not.toMatch(/posthog/i);
      expect(source).not.toMatch(/usePostHog|captureEvent|\btrack\(/);
    }
  );

  it.each(JOURNAL_SOURCES.map((f) => [f.split('/').pop() ?? f, f]))(
    '%s emits no Supabase telemetry other than the crisis event',
    (_label, file) => {
      const source = readFileSync(file as string, 'utf8');
      const supabaseCalls = source.match(/supabaseService\.\w+|SupabaseService\.\w+/gi) ?? [];

      for (const call of supabaseCalls) {
        expect(call.toLowerCase()).toContain('trackcrisisdetection');
      }
    }
  );
});

describe('PHIFilter is a deny-by-default backstop for journal events', () => {
  /**
   * Worth being precise about what this filter is and is not, because the
   * distinction decides which control is actually load-bearing.
   *
   * It BLOCKS whole events; it does not redact fields. And it is
   * whitelist-first: an event type absent from SAFE_EVENT_TYPES is rejected
   * before its payload is even inspected. That deny-by-default behaviour — not
   * the keyword scan — is the real guarantee for this feature.
   *
   * The keyword scan is a secondary net with a genuine limit: it matches values
   * CONTAINING a PHI keyword, so a transcript that happens to say none of them
   * ("the meeting ran long and i was short with him") would pass it. That is
   * precisely why the primary control is that nothing in the journal feature
   * calls PostHog at all — pinned by the source scans above — rather than
   * relying on the filter to clean up after a leak.
   */

  it.each([
    'voice_journal_started',
    'voice_journal_completed',
    'journal_entry_saved',
    'reflection_transcribed',
  ])('blocks the un-whitelisted journal event %s outright', (eventType) => {
    const result = PHIFilter.validate(eventType, {});

    // Deny-by-default: a new journal event cannot reach PostHog by being added
    // in feature code alone — it takes a deliberate, reviewable allow-list edit.
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/whitelist/i);
  });

  it.each(['journal', 'entry', 'reflection', 'note', 'thought'])(
    'blocks an otherwise-safe event whose payload mentions %s',
    (keyword) => {
      // Secondary net: even on a whitelisted event type, keyword-bearing
      // content is rejected rather than sent.
      const result = PHIFilter.validate('app_opened', {
        detail: `my ${keyword} from tonight`,
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toContain(keyword);
    }
  );

  it('documents the keyword scan limit rather than overclaiming it', () => {
    // Keyword-free prose passes the VALUE scan. This is not a defect to fix
    // here — it is the reason the source-level "no PostHog in the journal
    // feature" pin above is the control that matters. If this ever starts
    // failing, someone has broadened the keyword list and the comment above
    // should be revisited.
    const result = PHIFilter.validate('app_opened', {
      detail: 'the meeting ran long and i was short with him',
    });

    expect(result.valid).toBe(true);
  });
});

describe('crisis telemetry payload stays categorical', () => {
  it('the journal trigger type identifies the surface, never the phrase', () => {
    const source = readFileSync(
      join(JOURNAL_FEATURE_DIR, 'services/journalCrisisScan.ts'),
      'utf8'
    );

    // A per-phrase trigger id would leak what was said under a category label.
    expect(source).toMatch(/TRIGGER_TYPE\s*=\s*'journal_text_match'/);
    expect(source).not.toMatch(/trigger_type:\s*`/); // no template interpolation
  });

  it('never spreads the detection object into telemetry', () => {
    const source = readFileSync(
      join(JOURNAL_FEATURE_DIR, 'services/journalCrisisScan.ts'),
      'utf8'
    );

    // The same rule SupabaseService states for the assessment path: spreading
    // the detection carries its raw trigger value along with it.
    expect(source).not.toMatch(/trackCrisisDetection\(\s*\{\s*\.\.\./);
  });
});

describe('no journal source writes entry content to a log', () => {
  it.each(JOURNAL_SOURCES.map((f) => [f.split('/').pop() ?? f, f]))(
    '%s does not log a transcript variable',
    (_label, file) => {
      const source = readFileSync(file as string, 'utf8');

      // The logging scrubber matches known shapes (scores, ids, paths) and will
      // not redact arbitrary prose, so passing a transcript to it is a leak and
      // not a mitigation.
      expect(source).not.toMatch(/log\w*\([^)]*\btranscript\b/);
      expect(source).not.toMatch(/console\.(log|warn|error)\([^)]*\btranscript\b/);
    }
  );
});
