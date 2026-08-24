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

/**
 * Strip block and line comments before matching (DEBUG-390).
 *
 * This codebase deliberately names anti-patterns in prose to warn the next
 * reader off them, so a bare identifier match would fail on a comment that
 * says "never call fetch here" — correct code, red test. The cost is that a
 * narrow regex over stripped source can silently match nothing at all, which
 * is why the matcher-still-fires spec below is not optional.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
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

/**
 * Outbound network egress from the journal feature.
 *
 * Patterns are non-global on purpose: `.test()` on a /g regex is stateful and
 * would alternate pass/fail across the files in the `it.each` loop.
 */
const NETWORK_EGRESS_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['fetch(', /\bfetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['axios', /\baxios\b/],
  ['anthropic', /anthropic/i],
  ['@anthropic-ai', /@anthropic-ai\//],
];

/**
 * Journal modules permitted to perform outbound network egress.
 *
 * EMPTY BY DESIGN, and that is the point. The existing scans above cover
 * PostHog and Supabase, so a client that talks to a third party directly
 * passes every one of them — the directory walk would see the new file and
 * have no rule to fail it on. Keeping the allow-list empty makes adding the
 * one permitted egress module a reviewable diff line here rather than an
 * invisible new file over there.
 *
 * FEAT-287 Slice B precondition. This holds whether or not that slice ever
 * ships: if third-party reflection is refused, this is the mechanical
 * enforcement of the refusal; if it is permitted, this is what forces the
 * permission to be explicit.
 */
const EGRESS_ALLOWED_FILES: readonly string[] = [];

describe('no journal source performs outbound network egress', () => {
  it.each(JOURNAL_SOURCES.map((f) => [f.split('/').pop() ?? f, f]))(
    '%s makes no outbound network call',
    (_label, file) => {
      const path = file as string;
      if (EGRESS_ALLOWED_FILES.some((allowed) => path.endsWith(allowed))) return;

      const stripped = stripComments(readFileSync(path, 'utf8'));
      // A stripper that ate the whole file would make every pattern below pass
      // vacuously — the same failure mode the directory-walk guard covers.
      expect(stripped.trim().length).toBeGreaterThan(0);

      const hits = NETWORK_EGRESS_PATTERNS.filter(([, pattern]) =>
        pattern.test(stripped)
      ).map(([label]) => label);

      expect(hits).toEqual([]);
    }
  );

  it('the egress matchers still fire against known-bad source', () => {
    // Without this, a typo in any pattern above turns its spec green forever.
    const knownBad = [
      "const r = await fetch('https://api.anthropic.com/v1/messages');",
      'const x = new XMLHttpRequest();',
      'axios.post(url, body);',
      "import Anthropic from '@anthropic-ai/sdk';",
    ].join('\n');

    for (const [label, pattern] of NETWORK_EGRESS_PATTERNS) {
      expect([label, pattern.test(knownBad)]).toEqual([label, true]);
    }
  });

  it('comment stripping hides prose but not real code', () => {
    const source = [
      '// Never call fetch( from this feature.',
      '/* axios and anthropic are both forbidden here. */',
      'const local = 1;',
    ].join('\n');

    const stripped = stripComments(source);
    expect(/\bfetch\s*\(/.test(stripped)).toBe(false);
    expect(/\baxios\b/.test(stripped)).toBe(false);
    expect(/\bfetch\s*\(/.test(`${stripped}\nawait fetch(url);`)).toBe(true);
  });
});

/**
 * Sentry — the sink this file claimed to cover and did not (FEAT-288).
 *
 * The scans above pin PostHog, Supabase and raw network egress. Sentry is none
 * of those: it is a first-party-configured monitoring SDK with a live production
 * DSN, imported elsewhere in the app as `import * as Sentry from
 * '@sentry/react-native'`. So until now this passed every check in this file,
 * from inside `features/journal`:
 *
 *     Sentry.addBreadcrumb({ message: `filter applied, ${results.length} results` })
 *
 * That is entry-derived data leaving the device on a feature whose defining
 * constraint is that none does. Breadcrumbs and tags are the dangerous shape
 * rather than an obvious one: they read as diagnostics, they are attached far
 * from the sink, and they ship with every subsequent error report.
 *
 * `captureException` is forbidden too, not just the deliberate-context calls. An
 * exception thrown while handling entry text can carry that text in its message,
 * and this feature has no error path important enough to buy that risk. The
 * allow-list stays EMPTY for the same reason the egress one does: adding a
 * permitted module should be a reviewable diff line here, not an invisible new
 * file over there.
 */
const SENTRY_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['@sentry/ import', /@sentry\//],
  ['Sentry.addBreadcrumb', /\bSentry\.addBreadcrumb\s*\(/],
  ['Sentry.setContext', /\bSentry\.setContext\s*\(/],
  ['Sentry.setTag(s)', /\bSentry\.setTags?\s*\(/],
  ['Sentry.setUser', /\bSentry\.setUser\s*\(/],
  ['Sentry.setExtra(s)', /\bSentry\.setExtras?\s*\(/],
  ['Sentry.captureMessage', /\bSentry\.captureMessage\s*\(/],
  ['Sentry.captureException', /\bSentry\.captureException\s*\(/],
  ['Sentry.startSpan', /\bSentry\.startSpan\s*\(/],
  ['Sentry.withScope', /\bSentry\.withScope\s*\(/],
];

/** Journal modules permitted to reach Sentry. EMPTY BY DESIGN — see above. */
const SENTRY_ALLOWED_FILES: readonly string[] = [];

describe('no journal source reaches Sentry', () => {
  it.each(JOURNAL_SOURCES.map((f) => [f.split('/').pop() ?? f, f]))(
    '%s sends nothing to Sentry',
    (_label, file) => {
      const path = file as string;
      if (SENTRY_ALLOWED_FILES.some((allowed) => path.endsWith(allowed))) return;

      const stripped = stripComments(readFileSync(path, 'utf8'));
      expect(stripped.trim().length).toBeGreaterThan(0);

      const hits = SENTRY_PATTERNS.filter(([, pattern]) => pattern.test(stripped)).map(
        ([label]) => label
      );

      expect(hits).toEqual([]);
    }
  );

  it('the Sentry matchers still fire against known-bad source', () => {
    const knownBad = [
      "import * as Sentry from '@sentry/react-native';",
      "Sentry.addBreadcrumb({ message: 'filter applied, 12 results' });",
      "Sentry.setContext('journal', { entries: 12 });",
      "Sentry.setTag('range', 'last30');",
      "Sentry.setTags({ range: 'last30' });",
      "Sentry.setUser({ id: 'anon' });",
      "Sentry.setExtra('preview', entry.text);",
      "Sentry.setExtras({ preview: entry.text });",
      "Sentry.captureMessage('journal filter used');",
      'Sentry.captureException(err);',
      "Sentry.startSpan({ name: 'journal.filter' }, run);",
      'Sentry.withScope((scope) => scope.setTag(\'a\', \'b\'));',
    ].join('\n');

    for (const [label, pattern] of SENTRY_PATTERNS) {
      expect([label, pattern.test(knownBad)]).toEqual([label, true]);
    }
  });

  it('prose naming Sentry does not trip the scan', () => {
    // This feature's modules warn readers off these calls by name, so the
    // stripper has to be doing real work here (DEBUG-390).
    const source = [
      '// Never call Sentry.addBreadcrumb from this feature.',
      '/* @sentry/react-native is forbidden here. */',
      'const local = 1;',
    ].join('\n');

    const stripped = stripComments(source);
    for (const [, pattern] of SENTRY_PATTERNS) {
      expect(pattern.test(stripped)).toBe(false);
    }
    expect(/\bSentry\.addBreadcrumb\s*\(/.test(`${stripped}\nSentry.addBreadcrumb({});`)).toBe(true);
  });
});

describe('no LLM client ships inside the app package', () => {
  /**
   * The directory scans above are rooted at the journal and speech trees, so
   * they answer "no" for a reflection service placed anywhere else — while that
   * service stays fully reachable from the journal. File placement routes
   * around a path-scoped scan; it cannot route around the dependency list.
   *
   * This holds under every design considered for FEAT-287 Slice B. Offline
   * shapes keep their tooling out of the app package by construction, and a
   * server-proxied shape puts the SDK in `supabase/functions/` (Deno) — never
   * here, because the key must never ship in the client.
   *
   * Related: a barrel re-export enlarges the eager module graph of every
   * importer (FEAT-376), so an SDK import in an unrouted module would still be
   * eagerly loaded on the crisis path even if nothing ever called it.
   */
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '../../package.json'), 'utf8')
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });

  it('declares dependencies at all (guards a reshaped package.json)', () => {
    expect(declared.length).toBeGreaterThan(10);
  });

  it.each([['@anthropic-ai/sdk'], ['@anthropic-ai/bedrock-sdk'], ['@anthropic-ai/vertex-sdk']])(
    'does not depend on %s',
    (name) => {
      expect(declared).not.toContain(name);
    }
  );

  it('depends on no @anthropic-ai package at all', () => {
    expect(declared.filter((d) => d.startsWith('@anthropic-ai/'))).toEqual([]);
  });
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

/**
 * Identifier names that carry journal plaintext.
 *
 * `transcript` was the only name Slice A could produce. The history surface
 * introduces the rest — a stored entry is read into `body`/`entry.text`, a row
 * label into `preview`, and the decrypted blob into `plaintext`/`decrypted`.
 * A scan that knows only `transcript` reports clean over every one of them,
 * which is the shape of a guard that quietly stops guarding.
 *
 * Safe to keep broad here specifically because the journal feature performs no
 * network egress (pinned above), so `body` cannot be a request body.
 */
const PLAINTEXT_IDENTIFIERS =
  'transcript|body|entryText|entry\\.text|plaintext|decrypted|preview';

const LOGS_PLAINTEXT = new RegExp(
  `(?:log\\w*|console\\.(?:log|warn|error|info|debug))\\([^)]*\\b(?:${PLAINTEXT_IDENTIFIERS})\\b`
);

describe('no journal source writes entry content to a log', () => {
  it.each(JOURNAL_SOURCES.map((f) => [f.split('/').pop() ?? f, f]))(
    '%s does not log a plaintext-carrying variable',
    (_label, file) => {
      // The logging scrubber matches known shapes (scores, ids, paths) and will
      // not redact arbitrary prose, so passing entry plaintext to it is a leak
      // and not a mitigation.
      const stripped = stripComments(readFileSync(file as string, 'utf8'));
      expect(stripped.trim().length).toBeGreaterThan(0);
      expect(stripped).not.toMatch(LOGS_PLAINTEXT);
    }
  );

  it('the plaintext-log matcher still fires against known-bad source', () => {
    // A widened alternation that matches nothing looks exactly like a clean
    // codebase. Each name is asserted separately so one typo cannot hide behind
    // another name's match.
    const cases = [
      "logSecurity('saved', { transcript });",
      'logInfo(`read ${body}`);',
      'console.warn("draft", entryText);',
      'logError("open failed", entry.text);',
      'logDebug({ plaintext });',
      'console.log(decrypted);',
      'logInfo("row", { preview });',
    ];

    for (const bad of cases) {
      expect([bad, LOGS_PLAINTEXT.test(bad)]).toEqual([bad, true]);
    }
  });

  it('does not fire on prose that merely names the anti-pattern', () => {
    const source = stripComments('// never log(transcript) from this feature\nconst x = 1;');
    expect(source).not.toMatch(LOGS_PLAINTEXT);
  });
});
