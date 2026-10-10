/**
 * Erasure survivor manifest (DEBUG-775, DEBUG-763 AC3).
 *
 * Privacy policy §7.4 and DeleteAccountScreen's PRESERVED_NOTE name exactly three
 * things that stay on the device after an account deletion. This suite proves it:
 *
 *   1. KEY UNIVERSE — every storage key the source can write or read, from an AST
 *      scan of app/src + App.tsx (comments are invisible to an AST, DEBUG-390).
 *      Literal keys and named constants resolve mechanically; a key the resolver
 *      cannot see (a parameter, a computed name) must be classified in
 *      `UNRESOLVED_SITES`, and the completeness guard fails on any it does not
 *      list. Reads count too: a key today's code only reads may have been written
 *      by a shipped build. `LEGACY_KEYS` adds constants with no reader or writer.
 *   2. REAL WIPE — every key is seeded into both stores, the real
 *      `deleteAccountAndWipe` runs (only the server delete, the analytics reset and
 *      the export sweep are faked), and what is left is the survivor set.
 *   3. survivors == manifest, in both directions.
 *
 * SecureStore has no enumerate API, so seeding BOTH stores with every key is what
 * makes a SecureStore survivor observable at all.
 *
 * `.privacy.` so the `Safety + privacy gates` CI job runs it (INFRA-368).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import * as ts from 'typescript';

const mockAsync = new Map<string, string>();
const mockSecure = new Map<string, string>();
/** SecureStore keys whose delete rejects, to model a Keychain fault. */
const mockFailDelete = new Set<string>();

jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (k: string) => mockAsync.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockAsync.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockAsync.delete(k);
    }),
    getAllKeys: jest.fn(async () => [...mockAsync.keys()]),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => mockAsync.delete(k));
    }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockSecure.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    if (mockFailDelete.has(k)) throw new Error('keychain fault');
    mockSecure.delete(k);
  }),
}));

jest.mock('react-native-aes-crypto', () => require('../helpers/mockEncryption').createAesCryptoMock());
jest.mock('expo-crypto', () => require('../helpers/mockEncryption').createExpoCryptoMock());
jest.mock('@/core/services/supabase/SupabaseService', () => ({
  __esModule: true,
  default: { deleteAccount: jest.fn(async () => true) },
}));
jest.mock('@/core/analytics/analyticsIdentityReset', () => ({ resetAnalyticsIdentity: jest.fn() }));
jest.mock('@/core/services/privacy/exportArtifactSweeper', () => ({ sweepExportArtifacts: jest.fn(() => 0) }));

import { deleteAccountAndWipe } from '@/core/services/privacy/AccountDeletionService';
import {
  ERASURE_SURVIVOR_CATEGORIES,
  ERASURE_SURVIVOR_MANIFEST,
} from '@/core/services/privacy/erasureSurvivorManifest';
import { SECURE_STORAGE_CONFIG } from '@/core/services/security/SecureStorageService';
import { ERASURE_PENDING_KEY } from '@/core/services/privacy/erasurePending';
import { supabaseAuthStorageKey } from '@/core/services/supabase/secureStoreSessionAdapter';
import { env } from '@/core/config/env';

const APP = join(__dirname, '../..');
const SRC = join(APP, 'src');
const WELLNESS_PREFIX = SECURE_STORAGE_CONFIG.WELLNESS_ASYNC_PREFIX;

// ── Scanner ────────────────────────────────────────────────────────────────

type Store = 'async' | 'secure';
/** An exact key, or a family (`prefix` + anything). */
type KeyRef = { store: Store; key: string } | { store: Store; prefix: string };

const ASYNC_METHODS = new Set(['setItem', 'getItem', 'removeItem', 'mergeItem', 'multiGet', 'multiSet', 'multiRemove', 'multiMerge']);
const SECURE_METHODS = new Set(['setItemAsync', 'getItemAsync', 'deleteItemAsync']);
/** SecureStorageService's blob API: the name it takes is stored under `wellness_async_`. */
const BLOB_METHODS = new Set(['storeWellnessBlob', 'retrieveWellnessBlob', 'deleteWellnessBlob']);

interface Site {
  /** `<file> :: <key argument source>` — line-independent. */
  id: string;
  store: Store;
  prefix: string;
  arg: ts.Expression;
  file: string;
}

function storeOf(call: ts.CallExpression): { store: Store; prefix: string } | null {
  const callee = call.expression;
  if (ts.isIdentifier(callee)) return SECURE_METHODS.has(callee.text) ? { store: 'secure', prefix: '' } : null;
  if (!ts.isPropertyAccessExpression(callee)) return null;
  const method = callee.name.text;
  if (SECURE_METHODS.has(method)) return { store: 'secure', prefix: '' };
  if (ASYNC_METHODS.has(method) && /AsyncStorage$/.test(callee.expression.getText())) return { store: 'async', prefix: '' };
  if (BLOB_METHODS.has(method)) return { store: 'async', prefix: WELLNESS_PREFIX };
  return null;
}

const parsed = new Map<string, ts.SourceFile>();
function parse(file: string): ts.SourceFile {
  let sf = parsed.get(file);
  if (!sf) {
    sf = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    parsed.set(file, sf);
  }
  return sf;
}

function sitesIn(file: string, sf: ts.SourceFile = parse(file)): Site[] {
  const sites: Site[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments[0]) {
      const target = storeOf(node);
      if (target) {
        const arg = node.arguments[0];
        sites.push({ ...target, arg, file, id: `${relative(APP, file)} :: ${arg.getText().replace(/\s+/g, ' ')}` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return sites;
}

/** Resolve an import specifier to a file, honouring the `@/` alias. */
function moduleFile(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? join(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/** The initializer bound to `name` in `file`: a const, a class field, or an import (followed). */
function declaration(file: string, name: string, depth = 0): { file: string; init: ts.Expression } | null {
  if (depth > 5) return null;
  const sf = parse(file);
  const found: ts.Expression[] = [];
  let imported: string | null = null;
  const visit = (node: ts.Node): void => {
    if ((ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) && node.name.getText() === name && node.initializer) {
      found.push(node.initializer);
    }
    if (ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
      for (const el of node.importClause.namedBindings.elements) {
        if (el.name.text === name) {
          const target = moduleFile(file, (node.moduleSpecifier as ts.StringLiteral).text);
          if (target) imported = target;
          if (el.propertyName) name = el.propertyName.text;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  // Several same-named locals (one per function) resolve only if they all agree.
  if (found.length > 0 && new Set(found.map((f) => f.getText())).size === 1) return { file, init: found[0]! };
  if (found.length === 0 && imported) return declaration(imported, name, depth + 1);
  return null;
}

const unwrap = (e: ts.Expression): ts.Expression =>
  ts.isAsExpression(e) || ts.isParenthesizedExpression(e) || ts.isSatisfiesExpression(e) ? unwrap(e.expression) : e;

/** Statically resolve a key expression to an exact key or a family prefix, or null. */
function resolveKey(file: string, expr: ts.Expression, depth = 0): { key: string } | { prefix: string } | null {
  if (depth > 6) return null;
  const e = unwrap(expr);
  if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { key: e.text };
  if (ts.isTemplateExpression(e)) return e.head.text ? { prefix: e.head.text } : null;
  if (ts.isIdentifier(e)) {
    const d = declaration(file, e.text);
    return d ? resolveKey(d.file, d.init, depth + 1) : null;
  }
  if (ts.isPropertyAccessExpression(e)) {
    const owner = unwrap(e.expression);
    if (owner.kind === ts.SyntaxKind.ThisKeyword) {
      const d = declaration(file, e.name.text);
      return d ? resolveKey(d.file, d.init, depth + 1) : null;
    }
    if (!ts.isIdentifier(owner)) return null;
    const d = declaration(file, owner.text);
    const obj = d && unwrap(d.init);
    if (!d || !obj || !ts.isObjectLiteralExpression(obj)) return null;
    const prop = obj.properties.find(
      (p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && p.name.getText() === e.name.text,
    );
    return prop ? resolveKey(d.file, prop.initializer, depth + 1) : null;
  }
  return null;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === '__mocks__') continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

// ── Classification of what the resolver cannot see ───────────────────────

/** A pass-through: the key is chosen by the caller, whose own site is scanned. */
const PASS_THROUGH = 'pass-through';
/** Library-owned: supabase-js chooses the session key (see ABSENT_ENFORCED_ELSEWHERE). */
const LIBRARY_OWNED = 'library-owned';

const SESSION_KEYS = ['stoic_session_morning', 'stoic_session_midday', 'stoic_session_evening', 'stoic_session_daily_loop'];

/**
 * Every site whose key the resolver cannot reach, keyed by `<file> :: <argument>`.
 * Either the concrete keys/families it can touch (seeded below), or why it adds none.
 */
type Classification = readonly KeyRef[] | typeof PASS_THROUGH | typeof LIBRARY_OWNED;
/** `[site count, classification]` — the count pins the site set, so a new unresolved call fails. */
const UNRESOLVED_SITES: Record<string, readonly [number, Classification]> = {
  'src/core/services/security/SecureStorageService.ts :: storageKey': [10, PASS_THROUGH],
  'src/core/services/security/SecureStorageService.ts :: asyncKey': [3, PASS_THROUGH],
  'src/core/services/security/SecureStorageService.ts :: legacySecureStoreKey': [3, PASS_THROUGH],
  'src/core/services/security/SecureStorageService.ts :: key': [2, PASS_THROUGH],
  'src/core/services/security/SecureStorageService.ts :: toRemove': [1, PASS_THROUGH],
  'src/core/services/security/SecureStorageService.ts :: this.migrationMarkerKey(legacySecureStoreKey)': [
    2,
    [{ store: 'async', prefix: SECURE_STORAGE_CONFIG.MIGRATION_MARKER_PREFIX }],
  ],
  'src/core/services/security/SecureStorageService.ts :: logKey': [
    1,
    [{ store: 'async', prefix: SECURE_STORAGE_CONFIG.AUDIT_LOG_PREFIX }],
  ],
  'src/core/services/security/legacyPlaintextRecordSweeper.ts :: toRemove': [1, PASS_THROUGH],
  'src/core/services/security/EncryptionService.ts :: `${keyId}_v2`': [
    1,
    [{ store: 'secure', key: 'mental_health_master_key_v2' }],
  ],
  // deleteMasterKey's rotated-key loop: `${MASTER_KEY_ID}_v2` plus in-memory metadata ids.
  'src/core/services/security/EncryptionService.ts :: id': [1, [{ store: 'secure', key: 'mental_health_master_key_v2' }]],
  'src/core/services/session/SessionStorageService.ts :: key': [
    4,
    SESSION_KEYS.map((key) => ({ store: 'secure' as const, key })),
  ],
  'src/core/services/privacy/DataExportService.ts :: key': [1, PASS_THROUGH],
  'src/core/services/resilience/CircuitBreakerService.ts :: this.fallbackConfig.cacheKey': [
    1,
    [
      { store: 'async', key: 'auth_cache' },
      { store: 'async', key: 'network_cache' },
      { store: 'async', key: 'assessment_cache' },
    ],
  ],
  'src/core/services/resilience/index.ts :: key': [1, [{ store: 'async', prefix: 'circuit_breaker_queue_' }]],
  'src/core/services/supabase/secureStoreSessionAdapter.ts :: key': [6, LIBRARY_OWNED],
  'src/core/services/supabase/secureStoreSessionAdapter.ts :: k': [2, LIBRARY_OWNED],
  'src/core/services/supabase/secureStoreSessionAdapter.ts :: chunkKey(key, i)': [5, LIBRARY_OWNED],
  'src/core/services/supabase/secureStoreSessionAdapter.ts :: chunkKey(k, i)': [1, LIBRARY_OWNED],
  'src/core/stores/consentStore.ts :: key': [2, PASS_THROUGH],
  'src/features/journal/services/journalEntryStore.ts :: entryKey(id)': [
    3,
    [{ store: 'async', prefix: `${WELLNESS_PREFIX}voice_journal_entry_` }],
  ],
  'src/features/journal/services/journalEntryStore.ts :: entryKey(meta.id)': [
    1,
    [{ store: 'async', prefix: `${WELLNESS_PREFIX}voice_journal_entry_` }],
  ],
};

/**
 * Keys no current code writes or reads, which a shipped build may have left:
 * dead constants with no reader. Seeded so a sweep regression on them is visible.
 */
const LEGACY_KEYS: readonly KeyRef[] = [
  { store: 'async', key: '@being/cloud_backup/stats' },
  { store: 'async', key: 'subscription_metadata_v1' },
];

/** Not in the manifest; removed by the wipe, with its own suite (DEBUG-763 step 6b). */
const ABSENT_ENFORCED_ELSEWHERE: readonly KeyRef[] = [
  { store: 'secure', key: supabaseAuthStorageKey(env.EXPO_PUBLIC_SUPABASE_URL ?? '') },
  // DEBUG-763's marker: cleared once the wipe resolves (interruptedErasureResume.privacy).
  { store: 'async', key: ERASURE_PENDING_KEY },
];

/**
 * Written and deleted inside one function, holding a constant: the capability probe
 * in `verifyStorageCapabilities`. Not seeded — it is never at rest.
 */
const TRANSIENT_KEYS = new Set(['storage_capability_test']);

// ── Build the universe ─────────────────────────────────────────────────────

const ALL_SITES = [...sourceFiles(SRC), join(APP, 'App.tsx')].flatMap((f) => sitesIn(f));
const resolvedRefs: KeyRef[] = [];
const unresolvedCounts = new Map<string, number>();
for (const site of ALL_SITES) {
  const r = resolveKey(site.file, site.arg);
  if (!r) {
    unresolvedCounts.set(site.id, (unresolvedCounts.get(site.id) ?? 0) + 1);
    continue;
  }
  resolvedRefs.push('key' in r
    ? { store: site.store, key: `${site.prefix}${r.key}` }
    : { store: site.store, prefix: `${site.prefix}${r.prefix}` });
}
const classifiedRefs = Object.values(UNRESOLVED_SITES).flatMap(([, v]) => (Array.isArray(v) ? v : []));
const UNIVERSE: KeyRef[] = [...resolvedRefs, ...classifiedRefs, ...LEGACY_KEYS].filter(
  (r) => !('key' in r && TRANSIENT_KEYS.has(r.key)),
);

const instance = (ref: KeyRef): string => ('key' in ref ? ref.key : `${ref.prefix}seeded`);
const tag = (store: Store, key: string) => `${store}:${key}`;

/**
 * A user's non-default values, so a surviving `app_settings_v1` would be visible as
 * theirs. Key material is seeded as a real 256-bit base64 key, or encryption init
 * fails before the wipe reaches the step under test.
 */
const KEY_MATERIAL = Buffer.alloc(32, 7).toString('base64');
const SEEDED_VALUE = (key: string) =>
  /master_key/.test(key) ? KEY_MATERIAL : JSON.stringify({ seededFor: key, analyticsEnabled: true });

function seed(refs: readonly KeyRef[]): void {
  for (const ref of refs) {
    const key = instance(ref);
    (ref.store === 'async' ? mockAsync : mockSecure).set(key, SEEDED_VALUE(key));
  }
}

function survivors(): Set<string> {
  return new Set([
    ...[...mockAsync.keys()].map((k) => tag('async', k)),
    ...[...mockSecure.keys()].map((k) => tag('secure', k)),
  ]);
}

const MANIFEST_TAGS = new Set(ERASURE_SURVIVOR_MANIFEST.map((s) => tag(s.store, s.key)));
const ALWAYS_KEPT = ERASURE_SURVIVOR_MANIFEST.filter((s) => s.retention === 'always');

beforeAll(() => {
  // Every store that registers an erasure reset, so the wipe runs with its real
  // registry. Required here, not imported: an import is hoisted above the mock
  // disks, and these stores read storage at module load.
  require('@/core/stores/settingsStore');
  require('@/core/stores/subscriptionStore');
  require('@/features/assessment/stores/assessmentStore');
  require('@/features/practices/stores/stoicPracticeStore');
  require('@/features/learn/stores/educationStore');
});

beforeEach(() => {
  mockAsync.clear();
  mockSecure.clear();
  mockFailDelete.clear();
});

// ── Specs ──────────────────────────────────────────────────────────────────

describe('the key universe', () => {


  it('resolves constants, imports, object members and template families (positive control)', () => {
    const file = join(SRC, '__fixture__.ts');
    const fixture = ts.createSourceFile(file, `
      const K = 'lit_key';
      const CFG = { A: 'obj_key' } as const;
      class S { private readonly F = 'field_key'; async a() { await AsyncStorage.setItem(this.F, v); } }
      async function b(id: string) {
        // await AsyncStorage.setItem('commented_out', v);
        await AsyncStorage.setItem(K, v);
        await SecureStore.setItemAsync(CFG.A, v);
        await AsyncStorage.getItem(\`family_\${id}\`);
        await SecureStorageService.storeWellnessBlob('blob', v, 'l');
        await AsyncStorage.setItem(dynamicKey(id), v);
      }
    `, ts.ScriptTarget.Latest, true);
    parsed.set(file, fixture);
    const found = sitesIn(file, fixture).map((s) => ({ store: s.store, prefix: s.prefix, r: resolveKey(file, s.arg) }));
    expect(found).toEqual([
      { store: 'async', prefix: '', r: { key: 'field_key' } },
      { store: 'async', prefix: '', r: { key: 'lit_key' } },
      { store: 'secure', prefix: '', r: { key: 'obj_key' } },
      { store: 'async', prefix: '', r: { prefix: 'family_' } },
      { store: 'async', prefix: WELLNESS_PREFIX, r: { key: 'blob' } },
      { store: 'async', prefix: '', r: null },
    ]);
  });

  it('follows an import across files (real tree)', () => {
    expect(resolvedRefs).toContainEqual({ store: 'async', key: '@being/cloud_backup/last_backup' });
    expect(resolvedRefs).toContainEqual({ store: 'async', key: '@being/analytics_has_launched_before' });
  });

  it('classifies every site the resolver cannot see, at its pinned count (completeness guard)', () => {
    const drift = [...unresolvedCounts]
      .filter(([id, n]) => UNRESOLVED_SITES[id]?.[0] !== n)
      .map(([id, n]) => `${id} — found ${n}, pinned ${UNRESOLVED_SITES[id]?.[0] ?? 'nothing'}`);
    expect(drift).toEqual([]);
  });

  it('has no classification the code no longer backs', () => {
    expect(Object.keys(UNRESOLVED_SITES).filter((id) => !unresolvedCounts.has(id)).sort()).toEqual([]);
  });

  it('fails on an unresolvable key at a new site (positive control)', () => {
    const file = join(SRC, '__fixture_new__.ts');
    const fixture = ts.createSourceFile(file, 'async function f(id) { await AsyncStorage.setItem(`${id}_x`, v); }',
      ts.ScriptTarget.Latest, true);
    parsed.set(file, fixture);
    const [site] = sitesIn(file, fixture);
    expect(resolveKey(file, site!.arg)).toBeNull();
    expect(site!.id in UNRESOLVED_SITES).toBe(false);
  });

  it('seeds wellness blobs under their wellness_async_ storage key', () => {
    expect(UNIVERSE).toContainEqual({ store: 'async', key: `${WELLNESS_PREFIX}assessment_store` });
    expect(UNIVERSE).not.toContainEqual({ store: 'async', key: 'assessment_store' });
  });

  it('covers every key the manifest names, so the manifest cannot list a key nothing writes', () => {
    const universeTags = new Set(UNIVERSE.filter((r) => 'key' in r).map((r) => tag(r.store, instance(r))));
    expect([...MANIFEST_TAGS].filter((t) => !universeTags.has(t))).toEqual([]);
  });
});

describe('a real account deletion', () => {
  async function wipeSeeded(extra: readonly KeyRef[] = []): Promise<Set<string>> {
    seed([...UNIVERSE, ...ABSENT_ENFORCED_ELSEWHERE, ...extra]);
    await expect(deleteAccountAndWipe({ posthog: null })).resolves.toEqual({ ok: true });
    return survivors();
  }

  it('leaves only what the manifest lists', async () => {
    const left = await wipeSeeded();
    expect([...left].filter((t) => !MANIFEST_TAGS.has(t)).sort()).toEqual([]);
  });

  it('keeps everything the manifest says is kept (the reverse direction)', async () => {
    const left = await wipeSeeded();
    expect(ALWAYS_KEPT.map((s) => tag(s.store, s.key)).filter((t) => !left.has(t))).toEqual([]);
  });

  it('never keeps a default-form-only key holding the deleted user\'s values', async () => {
    await wipeSeeded();
    for (const s of ERASURE_SURVIVOR_MANIFEST.filter((m) => m.retention === 'default-form-only')) {
      const left = (s.store === 'async' ? mockAsync : mockSecure).get(s.key);
      if (left !== undefined) expect(left).not.toBe(SEEDED_VALUE(s.key));
    }
  });

  it('removes the Supabase session key (absent, enforced elsewhere)', async () => {
    const left = await wipeSeeded();
    for (const ref of ABSENT_ENFORCED_ELSEWHERE) expect(left.has(tag(ref.store, instance(ref)))).toBe(false);
  });

  it('deletes the rotated master key before the master key', async () => {
    const SecureStore = require('expo-secure-store') as { deleteItemAsync: jest.Mock };
    SecureStore.deleteItemAsync.mockClear();
    await wipeSeeded();
    const order = SecureStore.deleteItemAsync.mock.calls.map(([k]) => k as string);
    expect(order.filter((k) => k.startsWith('mental_health_master_key'))).toEqual([
      'mental_health_master_key_v2',
      'mental_health_master_key',
    ]);
  });

  it('still completes the erasure when the rotated-key delete faults (best-effort)', async () => {
    mockFailDelete.add('mental_health_master_key_v2');
    const left = await wipeSeeded();
    expect(left.has('secure:mental_health_master_key')).toBe(false);
    expect(left.has(`async:${ERASURE_PENDING_KEY}`)).toBe(false);
  });

  it('reports an unknown key as a survivor (positive control)', async () => {
    const left = await wipeSeeded([
      { store: 'async', key: '@being/unknown_probe' },
      { store: 'secure', key: 'unknown_secure_probe' },
    ]);
    expect(left.has('async:@being/unknown_probe')).toBe(true);
    expect(left.has('secure:unknown_secure_probe')).toBe(true);
  });
});

describe('the disclosure', () => {
  const preservedNote = (() => {
    const file = join(SRC, 'features/profile/screens/DeleteAccountScreen.tsx');
    let text: string | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.name.getText() === 'PRESERVED_NOTE' && node.initializer) {
        const parts: string[] = [];
        const collect = (n: ts.Node): void => {
          if (ts.isStringLiteral(n)) parts.push(n.text);
          ts.forEachChild(n, collect);
        };
        collect(node.initializer);
        text = parts.join('');
      }
      ts.forEachChild(node, visit);
    };
    visit(parse(file));
    return text as string | null;
  })();
  const policy = readFileSync(join(APP, '../docs/legal/privacy-policy.md'), 'utf8');
  const section74 = policy.slice(policy.indexOf('### 7.4'), policy.indexOf('## 8.'));

  it('found PRESERVED_NOTE and §7.4 (non-vacuous)', () => {
    expect(preservedNote).toContain('Kept on this device');
    expect(section74).toContain('Your Right to Delete');
  });

  it.each(Object.entries(ERASURE_SURVIVOR_CATEGORIES))('%s appears in PRESERVED_NOTE and §7.4', (_, c) => {
    expect(preservedNote).toContain(c.preservedNote);
    expect(section74).toContain(c.policy);
  });

  it('gives every manifest row a disclosed category', () => {
    for (const s of ERASURE_SURVIVOR_MANIFEST) expect(Object.keys(ERASURE_SURVIVOR_CATEGORIES)).toContain(s.category);
  });
});
