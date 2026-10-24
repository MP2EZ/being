/**
 * journalSearchIndex / journalSearchTerms — source-shape pins (FEAT-530 slice A)
 *
 * Properties that have no rendered output, only a shape in the source: where the
 * index may persist, what it may import, how the backfill loops, what its log
 * strings may say. DEBUG-390 rails: comments are stripped before matching, every
 * pattern is identifier- or call-shaped, and each matcher is proved to still fire
 * on a known-bad literal and the stripped source is proved non-trivial.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const SERVICES = join(__dirname, '..');
const INDEX = join(SERVICES, 'journalSearchIndex.ts');
const TERMS = join(SERVICES, 'journalSearchTerms.ts');
const MODULES = [
  ['journalSearchIndex.ts', INDEX],
  ['journalSearchTerms.ts', TERMS],
] as const;

function strip(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
const read = (path: string) => strip(readFileSync(path, 'utf8'));

/** The text of one top-level function, from its declaration to the next top-level declaration. */
function sliceFrom(source: string, anchor: RegExp): string {
  const start = source.search(anchor);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = source.slice(start + 1);
  const next = rest.search(/\n(?:export\s+)?(?:async\s+)?(?:function|const|let|type|interface)\s/);
  return next === -1 ? source.slice(start) : source.slice(start, start + 1 + next);
}

describe('the modules are real source (guards against a vacuous scan)', () => {
  it.each(MODULES)('%s survives comment stripping non-trivially', (_label, path) => {
    const raw = readFileSync(path, 'utf8');
    const stripped = strip(raw);
    expect(stripped.length).toBeGreaterThan(500);
    expect(stripped.length).toBeLessThan(raw.length);
  });
});

describe('persistence goes through SecureStorageService.storeWellnessBlob only (AC #3)', () => {
  const BANNED: ReadonlyArray<readonly [string, RegExp]> = [
    ['AsyncStorage import', /from\s+['"]@react-native-async-storage\/async-storage['"]/],
    ['expo-secure-store import', /from\s+['"]expo-secure-store['"]/],
    ['AsyncStorage use', /\bAsyncStorage\b/],
    ['SecureStore use', /\bSecureStore\b/],
    ['require of storage', /require\(\s*['"](?:@react-native-async-storage|expo-secure-store)/],
  ];

  describe.each(MODULES)('%s', (_label, path) => {
    it.each(BANNED)('does not contain %s', (_name, pattern) => {
      expect(read(path)).not.toMatch(pattern);
    });
  });

  it('writes through storeWellnessBlob, at exactly the two writer functions', () => {
    const source = read(INDEX);
    expect(source.match(/\.storeWellnessBlob\s*\(/g)).toHaveLength(2);
    expect(sliceFrom(source, /async function writeShardForAdd\(/)).toMatch(/\.storeWellnessBlob\s*\(/);
    expect(sliceFrom(source, /async function writeShardForRemoval\(/)).toMatch(/\.storeWellnessBlob\s*\(/);
  });

  it.each(['writeShardForAdd', 'writeShardForRemoval'])(
    '%s checks the epoch before the write and again after it settles',
    (name) => {
      const body = sliceFrom(read(INDEX), new RegExp(`async function ${name}\\(`));
      const guard = /epochAtQueue\s*!==\s*epoch/g;
      const write = body.search(/\.storeWellnessBlob\s*\(/);
      const positions = [...body.matchAll(guard)].map((m) => m.index ?? -1);
      expect(positions).toHaveLength(2);
      expect(positions[0]).toBeLessThan(write);
      expect(positions[1]).toBeGreaterThan(write);
      // ...and the late guard deletes the key.
      expect(body.slice(positions[1])).toMatch(/dropKey\(/);
    }
  );

  it('registers its erasure reset with the registry', () => {
    expect(read(INDEX)).toMatch(/registerErasureReset\(\s*'journalSearchIndex'\s*,/);
  });
});

describe('what the index modules may not import (AC #7)', () => {
  const IMPORTS: ReadonlyArray<readonly [string, RegExp]> = [
    ['journalCrisisScan', /journalCrisisScan/],
    ['textCrisisDetection', /textCrisisDetection/],
    ['the entry store (the index takes an injected source)', /journalEntryStore/],
    ['the crisis feature', /features\/crisis/],
  ];

  describe.each(MODULES)('%s', (_label, path) => {
    it.each(IMPORTS)('does not reference %s', (_name, pattern) => {
      expect(read(path)).not.toMatch(pattern);
    });
  });

  it('the matchers fire on known-bad source', () => {
    const bad = [
      "import { scan } from './journalCrisisScan';",
      "import { detect } from '@/core/services/crisis/textCrisisDetection';",
      "import AsyncStorage from '@react-native-async-storage/async-storage';",
      "import * as SecureStore from 'expo-secure-store';",
      "import { getEntry } from './journalEntryStore';",
    ].join('\n');
    expect(bad).toMatch(/journalCrisisScan/);
    expect(bad).toMatch(/textCrisisDetection/);
    expect(bad).toMatch(/from\s+['"]@react-native-async-storage\/async-storage['"]/);
    expect(bad).toMatch(/from\s+['"]expo-secure-store['"]/);
    expect(bad).toMatch(/journalEntryStore/);
  });
});

describe('the backfill is one entry at a time (AC #4)', () => {
  it('never fans out with Promise.all / allSettled / race / any', () => {
    for (const [, path] of MODULES) {
      expect(read(path)).not.toMatch(/\bPromise\.(?:all|allSettled|race|any)\s*\(/);
    }
    expect('await Promise.all(ids.map(index));').toMatch(/\bPromise\.(?:all|allSettled|race|any)\s*\(/);
  });

  it('loops over the missing ids with an await on each entry before the next', () => {
    const body = sliceFrom(read(INDEX), /async function backfill\(/);
    expect(body).toMatch(/for\s*\(\s*const\s+id\s+of\s+prepared\.missing\s*\)/);
    // Text is read, then the entry is indexed, both awaited inside the loop body.
    const loop = body.slice(body.search(/for\s*\(\s*const\s+id\s+of\s+prepared\.missing/));
    expect(loop).toMatch(/await\s+source\.readText\(/);
    expect(loop).toMatch(/await\s+indexOne\(/);
    expect(body).not.toMatch(/\.map\(\s*async/);
    expect(body).not.toMatch(/\.forEach\(/);
  });
});

describe('log and error strings carry no vocabulary of the index (FEAT-858 widens the scan)', () => {
  // FEAT-858 widens PLAINTEXT_IDENTIFIERS to these words; a log string that
  // contains one is a finding there, so keep them out of every string a log call
  // or an Error is built from.
  const BANNED_WORD = /\b(?:terms?|tokens?|quer(?:y|ies))\b/i;
  const CALLS = /(?:logFailure|logError|logSystem|logSecurity|new Error)\s*\(([^)]*)\)/g;

  it.each(MODULES)('%s', (_label, path) => {
    const calls = [...read(path).matchAll(CALLS)].map((m) => m[1]);
    for (const args of calls) expect(args).not.toMatch(BANNED_WORD);
  });

  it('finds the log calls it is guarding, and fires on a bad one', () => {
    const calls = [...read(INDEX).matchAll(CALLS)];
    expect(calls.length).toBeGreaterThanOrEqual(4);
    const bad = new RegExp(CALLS.source).exec("logFailure('could not read the query')");
    expect(bad?.[1]).toMatch(BANNED_WORD);
    expect('searched terms').toMatch(BANNED_WORD);
    expect('Journal search index write failed').not.toMatch(BANNED_WORD);
  });

  it('never forwards an Error object to the logger', () => {
    // The storage layer attaches payload sizes to its errors and shard key names
    // reveal the shard count: log a category and a fixed string only.
    expect(read(INDEX)).not.toMatch(/logError\([^)]*,[^)]*,/);
    expect(read(INDEX)).not.toMatch(/catch\s*\(\s*\w+\s*\)/);
  });
});

describe('no length/size template shape in the guarded files (count matchers are coming)', () => {
  const COUNT_TEMPLATE = /\$\{[^}]*\.(?:length|size)\b[^}]*\}/;

  it.each(MODULES)('%s', (_label, path) => {
    expect(read(path)).not.toMatch(COUNT_TEMPLATE);
  });

  it('the matcher fires', () => {
    expect('const m = `${rows.length} rows`;').toMatch(COUNT_TEMPLATE);
    expect('const m = `${set.size}`;').toMatch(COUNT_TEMPLATE);
  });
});
